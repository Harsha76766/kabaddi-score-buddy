import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/components/live-scoring/types";
import { ArrowLeft, Timer, Users, Activity, Trophy, Shield, Zap, Info, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { handleShare } from "@/lib/share-utils";
import { TeamStatsComparison } from "@/components/match/TeamStatsComparison";
import { TeamLineups } from "@/components/match/TeamLineups";
import { useBackNavigation } from "@/hooks/useBackNavigation";

const LiveMatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const handleBack = useBackNavigation();
  const { toast } = useToast();

  // Data State
  const [match, setMatch] = useState<any>(null);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [playersA, setPlayersA] = useState<any[]>([]);
  const [playersB, setPlayersB] = useState<any[]>([]);
  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A");
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    teamA: { raids: 0, tackles: 0, bonus: 0, technical: 0, allOuts: 0, totalRaids: 0, successRaids: 0, touchPoints: 0, totalTackles: 0, successTackles: 0, superTackles: 0 },
    teamB: { raids: 0, tackles: 0, bonus: 0, technical: 0, allOuts: 0, totalRaids: 0, successRaids: 0, touchPoints: 0, totalTackles: 0, successTackles: 0, superTackles: 0 }
  });
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [tournament, setTournament] = useState<any>(null);

  // Raid Timer State (for spectator sync)
  const [raidTimer, setRaidTimer] = useState(0);
  const [isRaidActive, setIsRaidActive] = useState(false);

  // Raid Timer Countdown Effect
  useEffect(() => {
    if (!isRaidActive || raidTimer <= 0) return;

    const interval = setInterval(() => {
      setRaidTimer(prev => {
        if (prev <= 1) {
          setIsRaidActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRaidActive, raidTimer]);

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
      const { data: { user } } = await supabase.auth.getUser();

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", id)
        .single();

      if (matchError) throw matchError;
      setMatch(matchData);
      setActiveTeam("A");
      setIsOrganizer(user?.id === matchData.created_by);

      // Fetch tournament details if available
      if (matchData.tournament_id) {
        const { data: tournamentData } = await supabase
          .from("tournaments")
          .select("name, venue, status")
          .eq("id", matchData.tournament_id)
          .single();
        setTournament(tournamentData);
      }

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
      teamA: { raids: 0, tackles: 0, bonus: 0, technical: 0, allOuts: 0, totalRaids: 0, successRaids: 0, touchPoints: 0, totalTackles: 0, successTackles: 0, superTackles: 0 },
      teamB: { raids: 0, tackles: 0, bonus: 0, technical: 0, allOuts: 0, totalRaids: 0, successRaids: 0, touchPoints: 0, totalTackles: 0, successTackles: 0, superTackles: 0 }
    };

    const playerPoints = new Map<string, { raid: number, tackle: number }>();

    // Filter out raid_start events for display purposes
    const displayEvents = events.filter(e => e.event_type !== 'raid_start');
    const latestEvents = [...displayEvents].reverse().slice(0, 15);
    setRecentEvents(latestEvents);
    setAllEvents(displayEvents);

    // Check for active raid (latest raid_start without a subsequent scoring event)
    const raidStartEvents = events.filter(e => e.event_type === 'raid_start');
    const scoringEvents = events.filter(e => ['raid', 'tackle', 'all_out', 'technical'].includes(e.event_type));
    if (raidStartEvents.length > 0) {
      const lastRaidStart = raidStartEvents[raidStartEvents.length - 1];
      const lastScoring = scoringEvents.length > 0 ? scoringEvents[scoringEvents.length - 1] : null;

      // If raid_start is more recent than last scoring, raid is active
      if (!lastScoring || new Date(lastRaidStart.created_at) > new Date(lastScoring.created_at)) {
        const elapsedSec = Math.floor((Date.now() - new Date(lastRaidStart.created_at).getTime()) / 1000);
        const raidDuration = lastRaidStart.event_data?.raidDuration || 30;
        const remaining = Math.max(0, raidDuration - elapsedSec);
        setRaidTimer(remaining);
        setIsRaidActive(remaining > 0);
      } else {
        setRaidTimer(0);
        setIsRaidActive(false);
      }
    }

    events.forEach(e => {
      if (e.event_type === 'raid_start') return; // Skip raid_start for stats

      const targetTeam = e.team_id === teamAId ? 'teamA' : 'teamB';
      const pid = e.player_id;

      if (pid && !playerPoints.has(pid)) {
        playerPoints.set(pid, { raid: 0, tackle: 0 });
      }
      const pStats = pid ? playerPoints.get(pid)! : null;

      if (e.event_type === 'raid') {
        newStats[targetTeam].totalRaids += 1;
        const touchPts = e.event_data?.touchPoints || e.event_data?.action?.touchPoints || 0;
        const bonusPts = e.event_data?.bonusPoints || (e.event_data?.action?.bonusPoint ? 1 : 0);
        newStats[targetTeam].touchPoints += touchPts;
        newStats[targetTeam].bonus += bonusPts;
        newStats[targetTeam].raids += touchPts; // For backward compat
        if ((e.points_awarded || 0) > 0) {
          newStats[targetTeam].successRaids += 1;
        }
        if (pStats) pStats.raid += e.points_awarded || 0;
      } else if (e.event_type === 'tackle') {
        newStats[targetTeam].totalTackles += 1;
        const pts = e.points_awarded || 0;
        newStats[targetTeam].tackles += pts;
        if (pts > 0) {
          newStats[targetTeam].successTackles += 1;
        }
        if (pts >= 2) {
          newStats[targetTeam].superTackles += 1;
        }
        if (pStats) pStats.tackle += pts;
      } else if (e.event_type === 'all_out') {
        newStats[targetTeam].allOuts += 1;
      } else if (e.event_type === 'technical') {
        newStats[targetTeam].technical += 1;
      }
    });

    setStats(newStats);

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
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_events', filter: `match_id=eq.${id}` },
        () => {
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

  // Helper function to get readable event label
  const getEventLabel = (event: any) => {
    const action = event.event_data?.action || event.event_data;
    const touchPoints = action?.touchPoints || event.event_data?.touchPoints || 0;
    const hasBonus = action?.bonusPoint || event.event_data?.bonusPoints > 0;
    const isAllOut = event.p_is_all_out || event.is_all_out || action?.isAllOut;
    const points = event.points_awarded || 0;
    const isDOD = event.is_do_or_die || event.p_is_do_or_die;
    const isSelfOut = action?.isSelfOut || event.event_data?.isSelfOut;

    if (event.event_type === 'tackle') {
      if (points >= 2) return "Super Tackle";
      return "Successful Tackle";
    }

    if (event.event_type === 'all_out') {
      return "All Out (+2)";
    }

    if (event.event_type === 'technical') {
      return "Technical Point";
    }

    if (event.event_type === 'raid') {
      if (isSelfOut) return "Raider Self-Out";
      if (points === 0) return isDOD ? "DOD Raid Failure" : "Empty Raid";

      // Super Raid logic (3 or more total points )
      if (points >= 3) {
        let parts = [];
        if (touchPoints > 0) parts.push(`${touchPoints} Touch`);
        if (hasBonus) parts.push(`Bonus`);
        return `Super Raid (${parts.join(' + ')})`;
      }

      if (touchPoints > 0 && hasBonus) return `${touchPoints} Touch + Bonus${isAllOut ? ' + All Out' : ''}`;
      if (touchPoints > 0) return `${touchPoints} Touch Point${touchPoints > 1 ? 's' : ''}${isAllOut ? ' + All Out' : ''}`;
      if (hasBonus) return `Bonus Point${isAllOut ? ' + All Out' : ''}`;

      if (isAllOut) return "All Out (+2)";

      return `+${points} Points`;
    }

    return event.event_type?.replace(/_/g, ' ').toUpperCase() || "Event";
  };

  const isMatchCompleted = match?.status?.toLowerCase() === 'completed' || match?.status?.toLowerCase() === 'finished';

  // Calculate scores for halves
  const getHalfScores = () => {
    if (!allEvents.length) return { half1: { teamA: 0, teamB: 0 }, half2: { teamA: 0, teamB: 0 } };

    let h1A = 0, h1B = 0, h2A = 0, h2B = 0;

    allEvents.forEach(e => {
      const half = e.event_data?.half || e.event_data?.action?.half || 1;
      const targetTeam = e.team_id === teamA?.id ? 'A' : 'B';
      const pts = e.points_awarded || 0;

      if (half === 1) {
        if (targetTeam === 'A') h1A += pts;
        else h1B += pts;
      } else {
        if (targetTeam === 'A') h2A += pts;
        else h2B += pts;
      }
    });

    return {
      half1: { teamA: h1A, teamB: h1B },
      half2: { teamA: h2A, teamB: h2B }
    };
  };

  const halfScores = getHalfScores();

  if (!match || !teamA || !teamB) {
    return (
      <div className="h-screen bg-[#050508] flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-bold tracking-[0.3em] uppercase animate-pulse">Loading Match...</p>
      </div>
    );
  }

  const isFullTime = !isMatchCompleted && match.current_half === 2 && match.current_timer === 0;

  return (
    <div className="h-screen w-screen bg-[#050508] flex flex-col overflow-hidden text-white">
      {/* Completed Match Banner */}
      {isMatchCompleted && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 flex items-center justify-center gap-2 shrink-0 animate-in slide-in-from-top duration-500">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Match Completed • Final Score Recorded</span>
        </div>
      )}

      {/* TOP BAR */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#0a0a0f] z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => handleBack(isOrganizer ? '/home' : '/')} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-neutral-400" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white leading-tight truncate max-w-[150px]">
              {tournament?.name || match.tournament_name || "Friendly Match"}
            </h1>
            <p className="text-[10px] text-neutral-500 font-medium">{tournament?.venue || match.venue || "Local Match"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isMatchCompleted ? (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isFullTime ? 'bg-orange-500/20 border-orange-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
              <div className={`w-2 h-2 rounded-full ${isFullTime ? 'bg-orange-500' : 'bg-red-500 animate-pulse'}`} />
              <span className={`text-[10px] font-black tracking-widest uppercase ${isFullTime ? 'text-orange-400' : 'text-red-400'}`}>
                {isFullTime ? 'Full Time' : 'LIVE'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-green-500/20 px-2.5 py-1 rounded-full border border-green-500/30">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-black tracking-widest text-green-400 uppercase">Final</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
        {/* SCOREBOARD SECTION */}
        <div className="bg-[#0a0a0f] border-b border-white/10 p-4 space-y-4 shrink-0">
          {!isMatchCompleted && (
            <div className="flex items-center justify-center gap-3">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                HALF {match.current_half || 1}
              </span>
              <span className="text-neutral-600">•</span>
              <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
                <Timer className={`w-4 h-4 ${match.current_timer < 300 ? 'text-red-500' : 'text-neutral-400'}`} />
                <span className={`text-sm font-mono font-bold ${match.current_timer < 300 ? 'text-red-500' : 'text-neutral-400'}`}>
                  {isFullTime ? '00:00' : formatTime(match.current_timer || 1200)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {/* Team A Card */}
            <div className={`flex-1 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${activeTeam === 'A' && !isMatchCompleted
              ? 'bg-gradient-to-br from-orange-600/30 to-orange-600/10 border border-orange-500/30'
              : 'bg-white/5 border border-white/10'
              }`}>
              <span className="text-[10px] font-black uppercase tracking-widest text-center px-2 truncate w-full text-neutral-400">
                {teamA.name}
              </span>
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-white/10">
                {(teamA as any).logo_url ? (
                  <img src={(teamA as any).logo_url} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-6 h-6 text-neutral-600" />
                )}
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-white leading-none">
                  {match.team_a_score}
                </div>
                {/* Score breakdown could go here if stats were available in real-time summary */}
              </div>
              {!isMatchCompleted ? (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${activeTeam === 'A' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-neutral-600'
                  }`}>
                  {activeTeam === 'A' ? '⚡ Raiding' : '🛡 Defending'}
                </div>
              ) : (
                <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                  {match.team_a_score > match.team_b_score ? 'Winner' : 'Runner Up'}
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="flex flex-col items-center gap-1 px-2">
              <div className="text-xl font-black text-neutral-600 tracking-tighter italic">VS</div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">
                {allEvents.length} EVENTS
              </div>
            </div>

            {/* Team B Card */}
            <div className={`flex-1 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${activeTeam === 'B' && !isMatchCompleted
              ? 'bg-gradient-to-br from-blue-600/30 to-blue-600/10 border border-blue-500/30'
              : 'bg-white/5 border border-white/10'
              }`}>
              <span className="text-[10px] font-black uppercase tracking-widest text-center px-2 truncate w-full text-neutral-400">
                {teamB.name}
              </span>
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-white/10">
                {(teamB as any).logo_url ? (
                  <img src={(teamB as any).logo_url} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-6 h-6 text-neutral-600" />
                )}
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-white leading-none">
                  {match.team_b_score}
                </div>
              </div>
              {!isMatchCompleted ? (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${activeTeam === 'B' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-neutral-600'
                  }`}>
                  {activeTeam === 'B' ? '⚡ Raiding' : '🛡 Defending'}
                </div>
              ) : (
                <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                  {match.team_b_score > match.team_a_score ? 'Winner' : 'Runner Up'}
                </div>
              )}
            </div>
          </div>

          {/* Winner Banner for completed matches */}
          {isMatchCompleted && (
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-3 border border-orange-500/30 flex items-center justify-center gap-2 animate-in zoom-in duration-500">
              <Trophy className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-black uppercase tracking-wider text-white">
                {match.team_a_score > match.team_b_score ? teamA.name : match.team_a_score < match.team_b_score ? teamB.name : 'Match Tie'} Wins!
              </span>
            </div>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div className="sticky top-0 bg-[#0a0a0f] z-40 border-b border-white/10 flex items-center justify-between px-2 h-12 shrink-0">
          {["Timeline", "Stats", "Lineups", "Info"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`flex-1 h-full flex flex-col items-center justify-center transition-all relative ${activeTab === tab.toLowerCase() ? 'text-orange-500' : 'text-neutral-500 hover:text-neutral-300'
                }`}
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                {tab}
              </span>
              {activeTab === tab.toLowerCase() && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full mx-4" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-[#050508]">
          {activeTab === 'timeline' && (
            <div className="p-4 space-y-3">
              {recentEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-neutral-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-neutral-400">No events yet</p>
                    <p className="text-xs text-neutral-600">Match events will appear here</p>
                  </div>
                </div>
              ) : (
                recentEvents.map((event, idx) => {
                  const allPlayers = [...playersA, ...playersB];
                  const eventAction = event.event_data?.action || event.event_data;
                  const tacklerId = eventAction?.tacklerId || event.event_data?.tacklerId;

                  const raider = allPlayers.find(p => p.id === event.raider_id || p.id === event.player_id);
                  const tackler = tacklerId ? allPlayers.find(p => p.id === tacklerId) : null;

                  const eventLabel = getEventLabel(event);
                  const isPositive = event.points_awarded > 0;
                  const isTackle = event.event_type === 'tackle';

                  return (
                    <div key={event.id} className="relative pl-6 pb-1">
                      {/* Timeline Line */}
                      {idx !== recentEvents.length - 1 && (
                        <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-white/10" />
                      )}
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-[#050508] z-10 ${isTackle ? 'bg-blue-500' : isPositive ? 'bg-green-500' : 'bg-red-500'
                        }`} />

                      <div className={`rounded-xl p-3 transition-all border ${isTackle
                        ? 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40'
                        : isPositive
                          ? 'bg-green-500/10 border-green-500/20 hover:border-green-500/40'
                          : 'bg-red-500/10 border-red-500/20 hover:border-red-500/40'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-neutral-500">#{allEvents.length - idx}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${event.team_id === teamA.id ? 'text-orange-500' : 'text-blue-500'
                              }`}>
                              {event.team_id === teamA.id ? teamA.name : teamB.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-600">
                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isTackle ? 'bg-blue-500/20' : isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
                              }`}>
                              {event.event_type === 'raid' ? (
                                <Zap className={`w-4 h-4 ${isPositive ? 'text-green-400' : 'text-red-400'}`} />
                              ) : (
                                <Shield className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {isTackle && tackler
                                  ? `${tackler.name} (Tackle)`
                                  : raider?.name || 'Player'}
                              </p>
                              <p className={`text-xs font-bold ${isTackle ? 'text-blue-400' : isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {eventLabel}
                              </p>
                            </div>
                          </div>
                          <div className={`text-xl font-black ${isTackle ? 'text-blue-400' : isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? `+${event.points_awarded}` : '0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'lineups' && (
            <div className="p-4">
              <TeamLineups
                teamA={{ id: teamA.id, name: teamA.name, logo_url: (teamA as any).logo_url }}
                teamB={{ id: teamB.id, name: teamB.name, logo_url: (teamB as any).logo_url }}
                playersA={playersA.map(p => ({
                  ...p,
                  isOut: isPlayerOut(p.id),
                  isCaptain: p.is_captain
                }))}
                playersB={playersB.map(p => ({
                  ...p,
                  isOut: isPlayerOut(p.id),
                  isCaptain: p.is_captain
                }))}
                events={recentEvents}
                startersSelectedA={recentEvents.length > 0 && playersA.length >= 7}
                startersSelectedB={recentEvents.length > 0 && playersB.length >= 7}
                selectedStarterIdsA={playersA.slice(0, 7).map(p => p.id)}
                selectedStarterIdsB={playersB.slice(0, 7).map(p => p.id)}
              />
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-4">
              <TeamStatsComparison
                teamA={{ name: teamA.name || 'Team A', logo_url: (teamA as any).logo_url }}
                teamB={{ name: teamB.name || 'Team B', logo_url: (teamB as any).logo_url }}
                stats={{
                  teamA: {
                    raids: allEvents.filter(e => e.team_id === teamA.id && e.event_type === 'raid').length,
                    successfulRaids: allEvents.filter(e => e.team_id === teamA.id && e.event_type === 'raid' && e.points_awarded > 0).length,
                    touchPoints: stats.teamA.raids,
                    bonusPoints: stats.teamA.bonus,
                    tacklePoints: stats.teamA.tackles,
                    allOuts: stats.teamA.allOuts,
                  },
                  teamB: {
                    raids: allEvents.filter(e => e.team_id === teamB.id && e.event_type === 'raid').length,
                    successfulRaids: allEvents.filter(e => e.team_id === teamB.id && e.event_type === 'raid' && e.points_awarded > 0).length,
                    touchPoints: stats.teamB.raids,
                    bonusPoints: stats.teamB.bonus,
                    tacklePoints: stats.teamB.tackles,
                    allOuts: stats.teamB.allOuts,
                  },
                  half1: halfScores.half1,
                  half2: halfScores.half2
                }}
                totalScoreA={match.team_a_score || 0}
                totalScoreB={match.team_b_score || 0}
              />

              {/* Top Performers */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {topRaider && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 border-l-4 border-l-orange-500">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Top Raider</span>
                    </div>
                    <p className="text-sm font-black text-white truncate">{topRaider.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-black text-orange-500">{topRaider.points}</span>
                      <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest pt-1">Pts</span>
                    </div>
                  </div>
                )}
                {topDefender && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Top Defender</span>
                    </div>
                    <p className="text-sm font-black text-white truncate">{topDefender.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-black text-blue-500">{topDefender.points}</span>
                      <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest pt-1">Pts</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="p-4 space-y-3">
              {[
                { title: "Tournament", content: tournament?.name || match.tournament_name || "Friendly Match", sub: tournament?.venue || "Local", icon: <Trophy className="w-4 h-4" /> },
                { title: "Date & Time", content: new Date(match.match_date || match.created_at).toLocaleDateString(), sub: new Date(match.match_date || match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), icon: <Timer className="w-4 h-4" /> },
                { title: "Venue", content: match.venue || tournament?.venue || "Not specified", sub: "", icon: <Info className="w-4 h-4" /> },
                { title: "Status", content: isMatchCompleted ? "Completed" : match.status === 'live' ? "Live" : "Scheduled", sub: isMatchCompleted ? `Winner: ${match.team_a_score > match.team_b_score ? teamA.name : teamB.name}` : "", icon: isMatchCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" /> },
              ].map((card, idx) => (
                <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500 shrink-0">
                    {card.icon}
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">{card.title}</h5>
                    <p className="text-sm font-bold text-white">{card.content}</p>
                    {card.sub && <p className="text-[10px] font-bold text-neutral-500">{card.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="h-14 border-t border-white/10 bg-[#0a0a0f] flex items-center justify-around px-4 shrink-0 z-50">
        <button
          onClick={() => {
            handleShare({
              title: `${teamA.name} vs ${teamB.name}`,
              text: `${teamA.name} ${match.team_a_score} - ${match.team_b_score} ${teamB.name} ${isMatchCompleted ? '(Final)' : '(LIVE)'} - Watch on RaidBook`,
              url: `/matches/${id}/spectate`
            });
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <Activity className="w-5 h-5 text-neutral-500 group-hover:text-orange-500 transition-colors" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-orange-500">Share</span>
        </button>

        {isMatchCompleted ? (
          <button
            onClick={() => navigate(`/match-summary/${id}`)}
            className="flex flex-col items-center gap-1 group"
          >
            <Trophy className="w-5 h-5 text-orange-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">Summary</span>
          </button>
        ) : (
          isOrganizer && (
            <button
              onClick={() => navigate(`/matches/${id}/score`)}
              className="flex flex-col items-center gap-1 group"
            >
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">Score</span>
            </button>
          )
        )}
      </div>
    </div>
  );

};

export default LiveMatch;
