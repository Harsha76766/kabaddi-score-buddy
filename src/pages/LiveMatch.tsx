import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Scoreboard } from "@/components/live-scoring/Scoreboard";
import { Team } from "@/components/live-scoring/types";
import { ArrowLeft, Timer, Users, Activity, Trophy, Shield, Zap, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { handleShare } from "@/lib/share-utils";

const LiveMatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data State
  const [match, setMatch] = useState<any>(null);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [playersA, setPlayersA] = useState<any[]>([]);
  const [playersB, setPlayersB] = useState<any[]>([]);
  const [lastRaids, setLastRaids] = useState<string[]>([]);
  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A");
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    teamA: { raids: 0, tackles: 0, bonus: 0, technical: 0, allOuts: 0 },
    teamB: { raids: 0, tackles: 0, bonus: 0, technical: 0, allOuts: 0 }
  });

  useEffect(() => {
    if (id) {
      fetchMatchData();
      const channel = subscribeToMatch();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const fetchMatchData = async () => {
    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", id)
        .single();

      if (matchError) throw matchError;
      setMatch(matchData);
      if (matchData.active_team) setActiveTeam(matchData.active_team as "A" | "B");

      const [tA, tB, pA, pB, evts] = await Promise.all([
        supabase.from("teams").select("*").eq("id", matchData.team_a_id).single(),
        supabase.from("teams").select("*").eq("id", matchData.team_b_id).single(),
        supabase.from("players").select("*").eq("team_id", matchData.team_a_id),
        supabase.from("players").select("*").eq("team_id", matchData.team_b_id),
        supabase.from("match_events").select("*").eq("match_id", matchData.id).order('created_at', { ascending: true })
      ]);

      setTeamA(tA.data);
      setTeamB(tB.data);
      setPlayersA(pA.data || []);
      setPlayersB(pB.data || []);

      if (evts.data) {
        processAllEvents(evts.data, matchData.team_a_id, matchData.team_b_id);
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error loading match", description: error.message });
    }
  };

  const [topRaider, setTopRaider] = useState<any>(null);
  const [topDefender, setTopDefender] = useState<any>(null);

  const processAllEvents = (events: any[], teamAId: string, teamBId: string) => {
    const newStats = {
      teamA: { raids: 0, tackles: 0, bonus: 0, technical: 0, allOuts: 0 },
      teamB: { raids: 0, tackles: 0, bonus: 0, technical: 0, allOuts: 0 }
    };

    const playerPoints = new Map<string, { raid: number, tackle: number }>();

    const latestEvents = [...events].reverse().slice(0, 10);
    setRecentEvents(latestEvents);
    setLastRaids(events.slice(-5).reverse().map(e => e.points_awarded?.toString() || '0'));

    events.forEach(e => {
      const targetTeam = e.team_id === teamAId ? 'teamA' : 'teamB';
      const pid = e.player_id;

      if (!playerPoints.has(pid)) {
        playerPoints.set(pid, { raid: 0, tackle: 0 });
      }
      const pStats = playerPoints.get(pid)!;

      if (e.event_type === 'raid') {
        newStats[targetTeam].raids += (e.event_data?.touchPoints || 0);
        newStats[targetTeam].bonus += (e.event_data?.bonusPoints || 0);
        pStats.raid += e.points_awarded || 0;
      } else if (e.event_type === 'tackle') {
        newStats[targetTeam].tackles += e.points_awarded || 0;
        pStats.tackle += e.points_awarded || 0;
      } else if (e.event_type === 'all_out') {
        newStats[targetTeam].allOuts += 1;
      }
    });

    setStats(newStats);

    // Find top performers
    let bestRaiderId = null;
    let maxRaidPts = -1;
    let bestDefenderId = null;
    let maxTacklePts = -1;

    playerPoints.forEach((pts, id) => {
      if (pts.raid > maxRaidPts) {
        maxRaidPts = pts.raid;
        bestRaiderId = id;
      }
      if (pts.tackle > maxTacklePts) {
        maxTacklePts = pts.tackle;
        bestDefenderId = id;
      }
    });

    const allPlayers = [...playersA, ...playersB];
    if (bestRaiderId) setTopRaider({ ...allPlayers.find(p => p.id === bestRaiderId), points: maxRaidPts });
    if (bestDefenderId) setTopDefender({ ...allPlayers.find(p => p.id === bestDefenderId), points: maxTacklePts });
  };



  const subscribeToMatch = () => {
    const channel = supabase
      .channel('live-match')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
        (payload) => {
          setMatch((prev: any) => ({ ...prev, ...payload.new }));
          if (payload.new.active_team) setActiveTeam(payload.new.active_team as "A" | "B");
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_events', filter: `match_id=eq.${id}` },
        () => {
          // Refresh everything on new event
          fetchMatchData();
        }
      )
      .subscribe();

    return channel;
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isPlayerOut = (playerId: string) => {
    return match?.out_player_ids?.includes(playerId);
  };

  const [activeTab, setActiveTab] = useState("timeline");
  const [matchComments, setMatchComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [reactionCount, setReactionCount] = useState(0);

  useEffect(() => {
    if (!id) return;

    // Fetch comments
    const fetchComments = async () => {
      const { data } = await supabase
        .from('match_comments')
        .select('*, profiles(name)')
        .eq('match_id', id)
        .order('created_at', { ascending: false });
      if (data) setMatchComments(data);
    };

    // Fetch reaction count
    const fetchReactions = async () => {
      const { count } = await supabase
        .from('match_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', id);
      if (count !== null) setReactionCount(count);
    };

    fetchComments();
    fetchReactions();

    // Subscribe to comments
    const commentSub = supabase
      .channel(`match_comments_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_comments', filter: `match_id=eq.${id}` }, () => {
        fetchComments();
      })
      .subscribe();

    // Subscribe to reactions
    const reactionSub = supabase
      .channel(`match_reactions_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_reactions', filter: `match_id=eq.${id}` }, () => {
        setReactionCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      commentSub.unsubscribe();
      reactionSub.unsubscribe();
    };
  }, [id]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Login Required", description: "Please login to comment", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('match_comments')
      .insert({ match_id: id, user_id: user.id, content: newComment });

    if (error) {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    } else {
      setNewComment("");
    }
  };

  const handlePostReaction = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Login Required", description: "Please login to react", variant: "destructive" });
      return;
    }

    await supabase
      .from('match_reactions')
      .insert({ match_id: id, user_id: user.id, type: 'heart' });
  };

  if (!match || !teamA || !teamB) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4 font-rajdhani">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-bold tracking-[0.3em] uppercase animate-pulse">Loading Broadcast...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white flex flex-col overflow-hidden text-slate-900 font-sans">
      {/* 3. TOP BAR (Fixed Header) */}
      <div className="h-[60px] border-b border-slate-200 flex items-center justify-between px-4 bg-white z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[150px]">
              {match.tournament_name || "College Cup 2024"}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">Semi-Final</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-full border border-red-100">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
            <span className="text-[10px] font-black tracking-widest text-red-600 uppercase">LIVE</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Users className="w-4 h-4" />
            <span className="text-[11px] font-bold">{match.viewer_count || 247}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
        {/* 4. LIVE SCOREBOARD SECTION */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-4 shrink-0">
          <div className="flex items-center justify-center gap-3">
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
              HALF {match.current_half || 1}
            </span>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
              <Timer className={`w-4 h-4 ${match.current_timer < 300 ? 'text-red-500' : 'text-slate-700'}`} />
              <span className={`text-sm font-mono font-bold ${match.current_timer < 300 ? 'text-red-500' : 'text-slate-700'}`}>
                {formatTime(match.current_timer || 1200)}
              </span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-orange-500" />
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-700">
                {activeTeam === 'A' ? teamA.name : teamB.name} Raiding
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Team A Card */}
            <div className={`flex-1 rounded-2xl p-3 flex flex-col items-center gap-2 transition-all duration-500 ${activeTeam === 'A' ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest text-center px-2 truncate w-full ${activeTeam === 'A' ? 'text-white/80' : 'text-slate-500'}`}>
                {teamA.name}
              </span>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white/20">
                <Users className={`w-6 h-6 ${activeTeam === 'A' ? 'text-white/40' : 'text-slate-400'}`} />
              </div>
              <div className={`text-4xl font-black transition-all ${activeTeam === 'A' ? 'text-white scale-110' : 'text-slate-900'}`}>
                {match.team_a_score}
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${activeTeam === 'A' ? 'bg-white/20 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                {activeTeam === 'A' ? '▲ Raiding' : '🛡 Defending'}
              </div>
            </div>

            {/* VS Divider */}
            <div className="flex flex-col items-center gap-1 px-2">
              <div className="text-xl font-black text-slate-300 tracking-tighter italic">VS</div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                {recentEvents.length} RAIDS
              </div>
            </div>

            {/* Team B Card */}
            <div className={`flex-1 rounded-2xl p-3 flex flex-col items-center gap-2 transition-all duration-500 ${activeTeam === 'B' ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest text-center px-2 truncate w-full ${activeTeam === 'B' ? 'text-white/80' : 'text-slate-500'}`}>
                {teamB.name}
              </span>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white/20">
                <Users className={`w-6 h-6 ${activeTeam === 'B' ? 'text-white/40' : 'text-slate-400'}`} />
              </div>
              <div className={`text-4xl font-black transition-all ${activeTeam === 'B' ? 'text-white scale-110' : 'text-slate-900'}`}>
                {match.team_b_score}
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${activeTeam === 'B' ? 'bg-white/20 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                {activeTeam === 'B' ? '▲ Raiding' : '🛡 Defending'}
              </div>
            </div>
          </div>

          {/* Last Raid Info */}
          <div className={`rounded-xl p-2.5 flex items-center justify-between transition-colors ${recentEvents[0]?.points_awarded > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">LAST RAID</span>
              <p className="text-xs font-bold text-slate-700">
                {recentEvents[0]?.points_awarded > 0 ? `+${recentEvents[0]?.points_awarded}` : 'OUT'} •
                <span className="text-slate-500 ml-1">
                  {[...playersA, ...playersB].find(p => p.id === recentEvents[0]?.player_id)?.name || 'Raider'}
                </span>
              </p>
            </div>
            {recentEvents[0]?.event_data && (
              <div className="flex gap-1.5">
                {recentEvents[0].event_data.touchPoints > 0 && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-[8px] font-black h-5 uppercase">Touch {recentEvents[0].event_data.touchPoints}</Badge>}
                {recentEvents[0].event_data.bonusPoints > 0 && <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-[8px] font-black h-5 uppercase">Bonus +1</Badge>}
              </div>
            )}
          </div>
        </div>

        {/* 5. TAB NAVIGATION */}
        <div className="sticky top-0 bg-white z-40 border-b border-slate-100 shadow-sm flex items-center justify-between px-2 h-12 shrink-0">
          {["Timeline", "Stats", "Lineups", "Info"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`flex-1 h-full flex flex-col items-center justify-center transition-all relative ${activeTab === tab.toLowerCase() ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <span className={`text-xs font-bold uppercase tracking-widest ${activeTab === tab.toLowerCase() ? 'scale-105' : 'scale-100'}`}>
                {tab}
              </span>
              {activeTab === tab.toLowerCase() && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full mx-4" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-slate-50/50">
          {activeTab === 'timeline' && (
            <div className="p-4 space-y-4">
              {/* Ongoing Raid Card (Placeholder logic) */}
              {match.is_timer_running && (
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl overflow-hidden border-2 border-red-500 shadow-lg shadow-red-500/20">
                  <div className="bg-white/10 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">ONGOING RAID</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/70"># {recentEvents.length + 1}</span>
                  </div>
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-black uppercase text-sm tracking-tight"> {activeTeam === 'A' ? teamA.name : teamB.name} Raiding</h4>
                      <p className="text-white/70 text-xs font-bold animate-pulse">Raider is on court...</p>
                    </div>
                  </div>
                </div>
              )}

              {recentEvents.map((event, idx) => (
                <div key={event.id} className="relative pl-6 pb-6 last:pb-0">
                  {/* Timeline Line */}
                  {idx !== recentEvents.length - 1 && (
                    <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-200" />
                  )}
                  {/* Timeline Dot */}
                  <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white z-10 ${event.points_awarded > 0 ? 'bg-green-500' : 'bg-red-500'}`} />

                  <div className={`rounded-2xl p-4 transition-all shadow-sm border border-slate-200 ${event.points_awarded > 0 ? 'bg-white hover:border-green-300' : 'bg-white hover:border-red-300'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RAID #{recentEvents.length - idx}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${event.team_id === teamA.id ? 'text-orange-600' : 'text-blue-600'}`}>
                          {event.team_id === teamA.id ? teamA.name : teamB.name}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Half {match.current_half || 1}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${event.points_awarded > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        {event.event_type === 'raid' ? <Zap className={`w-5 h-5 ${event.points_awarded > 0 ? 'text-green-600' : 'text-red-600'}`} /> : <Shield className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 leading-tight">
                          <span className="font-black">
                            {[...playersA, ...playersB].find(p => p.id === event.player_id)?.name || 'Player'}
                          </span>
                          {" "}
                          {event.points_awarded > 0 ? (
                            <span className="text-green-600 uppercase tracking-tight ml-1 font-black">SUCCESSFUL (+{event.points_awarded})</span>
                          ) : (
                            <span className="text-red-600 uppercase tracking-tight ml-1 font-black">RAIDER OUT</span>
                          )}
                        </p>
                        {event.event_data && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {event.event_data.touchPoints > 0 && <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">• {event.event_data.touchPoints} touch points</span>}
                            {event.event_data.bonusPoints > 0 && <span className="text-[10px] font-bold text-orange-600 px-2 py-0.5 bg-orange-50 rounded-full">• Bonus point</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'lineups' && (
            <div className="p-4 space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500" /> Lineups Control
                  </h3>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button className="px-3 py-1 text-[10px] font-bold bg-white rounded shadow-sm text-slate-900">{teamA.name}</button>
                    <button className="px-3 py-1 text-[10px] font-bold text-slate-500">{teamB.name}</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2">On Court (7)</p>
                  {playersA.slice(0, 7).map(p => (
                    <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isPlayerOut(p.id) ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isPlayerOut(p.id) ? 'bg-slate-200 text-slate-400' : 'bg-orange-100 text-orange-600'}`}>
                          {p.jersey_number || '0'}
                        </div>
                        <div>
                          <p className={`text-xs font-black uppercase tracking-tight ${isPlayerOut(p.id) ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{p.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.position || 'Player'}</p>
                        </div>
                      </div>
                      {isPlayerOut(p.id) ? (
                        <div className="bg-red-50 text-red-600 p-1.5 rounded-lg border border-red-100">
                          <Info className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="bg-green-50 text-green-600 p-1.5 rounded-lg border border-green-100">
                          <Activity className="w-3 h-3 shadow-green-500/20" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-4 space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Team Comparison
                </h4>

                <div className="space-y-6">
                  {[
                    { label: 'Total Raids', a: recentEvents.filter(e => e.team_id === teamA.id && e.event_type === 'raid').length, b: recentEvents.filter(e => e.team_id === teamB.id && e.event_type === 'raid').length, color: 'bg-orange-500' },
                    { label: 'Successful Raids', a: stats.teamA.raids, b: stats.teamB.raids, color: 'bg-green-500' },
                    { label: 'Touch Points', a: stats.teamA.raids, b: stats.teamB.raids, color: 'bg-blue-500' },
                    { label: 'Bonus Points', a: stats.teamA.bonus, b: stats.teamB.bonus, color: 'bg-yellow-500' },
                    { label: 'Tackle Points', a: stats.teamA.tackles, b: stats.teamB.tackles, color: 'bg-purple-500' },
                    { label: 'All-Outs', a: stats.teamA.allOuts, b: stats.teamB.allOuts, color: 'bg-red-500' }
                  ].map((row, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-orange-600">{row.a}</span>
                        <span className="text-slate-400">{row.label}</span>
                        <span className="text-blue-600">{row.b}</span>
                      </div>
                      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
                        <div
                          className={`${row.color} h-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
                          style={{ width: `${(row.a / (row.a + row.b || 1)) * 100}%` }}
                        />
                        <div
                          className={`${row.color} h-full transition-all duration-1000 opacity-40`}
                          style={{ width: `${(row.b / (row.a + row.b || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {topRaider && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 border-l-4 border-l-orange-500">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Raider</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 truncate">{topRaider.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-black text-orange-600">{topRaider.points}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">Points</span>
                    </div>
                  </div>
                )}
                {topDefender && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Defender</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 truncate">{topDefender.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-black text-blue-600">{topDefender.points}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">Points</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="p-4 space-y-4">
              {[
                { title: "Tournament", content: match.tournament_name || "College Cup 2024", sub: "Semi-Final", icon: <Trophy className="w-4 h-4" /> },
                { title: "Date & Time", content: new Date(match.match_date).toLocaleDateString(), sub: "2:30 PM IST", icon: <Timer className="w-4 h-4" /> },
                { title: "Venue", content: match.venue || "College Sports Ground", sub: "Pune, Maharashtra", icon: <Info className="w-4 h-4" /> },
                { title: "Officials", content: "Scorer: Rahul Sharma", sub: "Referee: TBD", icon: <Users className="w-4 h-4" /> },
                { title: "Rules", content: "2 Halves • 20 min each", sub: "Super Tackle: Enabled", icon: <Shield className="w-4 h-4" /> },
                { title: "Toss", content: `Won by: ${match.toss_winner_id === teamA.id ? teamA.name : teamB.name}`, sub: `Elected to: ${match.toss_choice || 'Raid first'}`, icon: <Zap className="w-4 h-4" /> }
              ].map((card, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    {card.icon}
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</h5>
                    <p className="text-sm font-black text-slate-800">{card.content}</p>
                    <p className="text-[10px] font-bold text-slate-500">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 10. BOTTOM ACTION BAR */}
      <div className="h-[60px] border-t border-slate-200 bg-white flex items-center justify-around px-4 shrink-0 z-50">
        <button
          onClick={() => {
            handleShare({
              title: `${match.match_name} - LIVE`,
              text: `${teamA.name} ${match.team_a_score} - ${match.team_b_score} ${teamB.name} (LIVE) - Watch on Kabaddi Score Buddy`,
              url: `/matches/${id}/spectate`
            });
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <Activity className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-orange-600">Share</span>
        </button>

        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] font-black px-1 rounded-full border-2 border-white">
                {matchComments.length}
              </div>
              <Activity className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-orange-600">Comment</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-[32px] p-0 flex flex-col font-sans border-0 shadow-2xl">
            <div className="h-1 bg-slate-200 w-12 rounded-full mx-auto my-3 shrink-0" />
            <div className="px-6 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Comments ({matchComments.length})</h3>
              <div className="flex bg-slate-50 p-1 rounded-lg">
                <button className="px-3 py-1 text-[10px] font-black bg-white rounded shadow-sm text-slate-900 border border-slate-200">Latest</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {matchComments.map((comment: any) => (
                <div key={comment.id} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-orange-500/20">
                    {comment.profiles?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{comment.profiles?.full_name || 'Anonymous'}</p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-sm text-slate-700 leading-relaxed">
                      {comment.content}
                    </div>
                  </div>
                </div>
              ))}
              {matchComments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <Activity className="w-12 h-12 text-slate-200" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No comments yet. Be the first!</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 shrink-0 mb-4 px-6">
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:border-orange-500 transition-all shadow-inner">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-transparent border-0 focus:ring-0 text-sm font-medium px-2 py-1 placeholder:text-slate-400"
                  onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                />
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim()}
                  className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white hover:bg-orange-700 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-orange-500/30"
                >
                  <Activity className="w-4 h-4 rotate-90" />
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <button
          onClick={handlePostReaction}
          className="flex flex-col items-center gap-1 group relative"
        >
          <div className="absolute -top-1 -right-1 text-[10px] animate-bounce">❤️</div>
          <Activity className="w-5 h-5 text-orange-600 transition-colors" />
          <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">{reactionCount}</span>
        </button>
      </div>
    </div>
  );

};

export default LiveMatch;
