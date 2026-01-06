import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, Activity, Shield, Users, Timer, Info, Star, CheckCircle2, MapPin, Calendar, Share2, Download, Home, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import * as htmlToImage from "html-to-image";
import { handleShare } from "@/lib/share-utils";

const MatchSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [match, setMatch] = useState<any>(null);
  const [teamA, setTeamA] = useState<any>(null);
  const [teamB, setTeamB] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [playersA, setPlayersA] = useState<any[]>([]);
  const [playersB, setPlayersB] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchDuration, setMatchDuration] = useState<string>("20:00");
  const [matchDate, setMatchDate] = useState<string>("");
  const [stats, setStats] = useState({
    teamA: { raids: 0, successfulRaids: 0, touchPoints: 0, bonusPoints: 0, tacklePoints: 0, allOuts: 0, emptyRaids: 0, outs: 0 },
    teamB: { raids: 0, successfulRaids: 0, touchPoints: 0, bonusPoints: 0, tacklePoints: 0, allOuts: 0, emptyRaids: 0, outs: 0 },
    half1: { teamA: 0, teamB: 0 },
    half2: { teamA: 0, teamB: 0 }
  });
  const [bestRaider, setBestRaider] = useState<any>(null);
  const [bestDefender, setBestDefender] = useState<any>(null);
  const [mvp, setMvp] = useState<any>(null);

  useEffect(() => {
    fetchMatchData();
  }, [id]);

  const handleDownload = async () => {
    if (!summaryRef.current) return;

    try {
      toast({
        title: "Generating Scorecard",
        description: "Please wait while we prepare your image...",
      });

      // Capture the content as a PNG
      const dataUrl = await htmlToImage.toPng(summaryRef.current, {
        cacheBust: true,
        backgroundColor: '#f8fafc', // match bg-slate-50
        style: {
          borderRadius: '0px'
        }
      });

      // Create a link and trigger download
      const link = document.createElement('a');
      link.download = `kabaddi-scorecard-${match?.match_name || 'match'}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Success",
        description: "Scorecard downloaded successfully!",
      });
    } catch (err) {
      console.error('Error generating image:', err);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not generate the scorecard image.",
      });
    }
  };

  const fetchMatchData = async () => {
    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*, tournament:tournaments(*)")
        .eq("id", id)
        .single();

      if (matchError) throw matchError;
      setMatch(matchData);
      setTournament(matchData.tournament);

      // Handle Match Date
      if (matchData.match_date) {
        setMatchDate(new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(matchData.match_date)));
      } else {
        setMatchDate(new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(matchData.created_at)));
      }

      // Handle Duration
      if (matchData.ended_at && matchData.created_at) {
        const start = new Date(matchData.created_at).getTime();
        const end = new Date(matchData.ended_at).getTime();
        const diffInMinutes = Math.floor((end - start) / (1000 * 60));
        setMatchDuration(`${diffInMinutes} Minutes`);
      } else {
        setMatchDuration("20 Minutes");
      }

      const [teamARes, teamBRes, pARes, pBRes, eventsRes] = await Promise.all([
        supabase.from("teams").select("*").eq("id", matchData.team_a_id).single(),
        supabase.from("teams").select("*").eq("id", matchData.team_b_id).single(),
        supabase.from("players").select("*").eq("team_id", matchData.team_a_id),
        supabase.from("players").select("*").eq("team_id", matchData.team_b_id),
        supabase.from("match_events").select("*").eq("match_id", id).order('created_at', { ascending: true })
      ]);

      if (teamARes.error) throw teamARes.error;
      if (teamBRes.error) throw teamBRes.error;

      setTeamA(teamARes.data);
      setTeamB(teamBRes.data);
      setPlayersA(pARes.data || []);
      setPlayersB(pBRes.data || []);
      setEvents(eventsRes.data || []);

      calculateDetailedStats(eventsRes.data || [], [...(pARes.data || []), ...(pBRes.data || [])], matchData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading match",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDetailedStats = (matchEvents: any[], allPlayers: any[], matchData: any) => {
    const s = {
      teamA: { raids: 0, successfulRaids: 0, touchPoints: 0, bonusPoints: 0, tacklePoints: 0, allOuts: 0, emptyRaids: 0, outs: 0 },
      teamB: { raids: 0, successfulRaids: 0, touchPoints: 0, bonusPoints: 0, tacklePoints: 0, allOuts: 0, emptyRaids: 0, outs: 0 },
      half1: { teamA: 0, teamB: 0 },
      half2: { teamA: 0, teamB: 0 }
    };

    const playerStats = new Map<string, { raidPts: number, tacklePts: number, successfulRaids: number, raids: number, successfulTackles: number, tackleAttempts: number, bonus: number, touch: number }>();

    let currentHalf = 1;

    matchEvents.forEach(e => {
      if (e.event_type === 'half_end') {
        currentHalf = 2;
        return;
      }

      const isTeamA = e.team_id === matchData.team_a_id;
      const target = isTeamA ? s.teamA : s.teamB;
      const pid = e.player_id;

      if (pid && !playerStats.has(pid)) {
        playerStats.set(pid, { raidPts: 0, tacklePts: 0, successfulRaids: 0, raids: 0, successfulTackles: 0, tackleAttempts: 0, bonus: 0, touch: 0 });
      }
      const ps = pid ? playerStats.get(pid)! : null;

      // Half-wise score
      if (currentHalf === 1) {
        if (isTeamA) s.half1.teamA += e.points_awarded;
        else s.half1.teamB += e.points_awarded;
      } else {
        if (isTeamA) s.half2.teamA += e.points_awarded;
        else s.half2.teamB += e.points_awarded;
      }

      if (e.event_type === 'raid') {
        target.raids += 1;
        if (ps) ps.raids += 1;

        if (e.points_awarded > 0 || (e.event_data?.bonusPoints > 0)) {
          target.successfulRaids += 1;
          target.touchPoints += (e.event_data?.touchPoints || 0);
          target.bonusPoints += (e.event_data?.bonusPoints || 0);
          if (ps) {
            ps.raidPts += e.points_awarded;
            ps.successfulRaids += 1;
            ps.touch += (e.event_data?.touchPoints || 0);
            ps.bonus += (e.event_data?.bonusPoints || 0);
          }
        } else if (e.event_data?.isOut) {
          s[isTeamA ? 'teamB' : 'teamA'].tacklePoints += 1;
          target.outs += 1;
        } else {
          target.emptyRaids += 1;
        }
      } else if (e.event_type === 'tackle') {
        target.tacklePoints += e.points_awarded;
        if (ps) {
          ps.tacklePts += e.points_awarded;
          ps.successfulTackles += 1;
          ps.tackleAttempts += 1;
        }
      } else if (e.event_type === 'all_out') {
        target.allOuts += 1;
      }
    });

    // Fallback if no halves were explicitly ended
    if (s.half1.teamA === 0 && s.half1.teamB === 0 && matchEvents.length > 0) {
      s.half1.teamA = matchData.team_a_score;
      s.half1.teamB = matchData.team_b_score;
    }

    setStats(s);

    // Find Best Raider, Defender, and MVP
    let bestR = null;
    let bestD = null;
    let bestMVP = null;
    let maxRPts = -1;
    let maxTPts = -1;
    let maxTotal = -1;

    playerStats.forEach((pts, id) => {
      const p = allPlayers.find(p => p.id === id);
      if (!p) return;

      const total = pts.raidPts + pts.tacklePts;

      if (pts.raidPts > maxRPts) {
        maxRPts = pts.raidPts;
        bestR = { ...p, ...pts };
      }
      if (pts.tacklePts > maxTPts) {
        maxTPts = pts.tacklePts;
        bestD = { ...p, ...pts };
      }
      if (total > maxTotal) {
        maxTotal = total;
        bestMVP = { ...p, ...pts, totalPoints: total };
      }
    });

    setBestRaider(bestR);
    setBestDefender(bestD);
    setMvp(bestMVP);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const isWinnerA = match?.team_a_score > match?.team_b_score;
  const isWinnerB = match?.team_b_score > match?.team_a_score;
  const winner = isWinnerA ? teamA : isWinnerB ? teamB : null;
  const winnerScore = isWinnerA ? match?.team_a_score : match?.team_b_score;
  const loserScore = isWinnerA ? match?.team_b_score : match?.team_a_score;

  return (
    <div ref={summaryRef} className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <div className="max-w-xl mx-auto">

        {/* HEADER SECTION */}
        <div className="bg-white p-6 pb-12 rounded-b-[48px] shadow-sm border-b border-slate-100 flex flex-col items-center text-center gap-6">
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[11px] font-black uppercase tracking-[0.2em] px-4 h-7 gap-2">
            <CheckCircle2 className="w-3 h-3" /> Match Completed
          </Badge>

          <div className="flex items-center justify-between w-full px-4 gap-4">
            {/* Team A */}
            <div className={`flex flex-col items-center gap-3 p-6 rounded-[32px] flex-1 transition-all ${isWinnerA ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/20 scale-105' : 'bg-slate-50 text-slate-400'}`}>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                <span className="text-2xl font-black">{teamA?.name?.charAt(0)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{teamA?.name}</span>
                <span className="text-5xl font-black tracking-tighter">{match?.team_a_score}</span>
                {isWinnerA && <Badge className="bg-white/20 text-white border-0 text-[8px] mt-2 font-black uppercase h-5">🏆 Winner</Badge>}
              </div>
            </div>

            <div className="text-2xl font-black text-slate-200 italic">VS</div>

            {/* Team B */}
            <div className={`flex flex-col items-center gap-3 p-6 rounded-[32px] flex-1 transition-all ${isWinnerB ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/20 scale-105' : 'bg-slate-50 text-slate-400'}`}>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                <span className="text-2xl font-black">{teamB?.name?.charAt(0)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{teamB?.name}</span>
                <span className="text-5xl font-black tracking-tighter">{match?.team_b_score}</span>
                {isWinnerB && <Badge className="bg-white/20 text-white border-0 text-[8px] mt-2 font-black uppercase h-5">🏆 Winner</Badge>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-orange-600 flex items-center gap-2 justify-center">
              <Trophy className="w-6 h-6" /> {winner ? `${winner.name} won by ${winnerScore - loserScore} pts` : "Match Tied"}
            </h2>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{matchDate}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Timer className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{matchDuration}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{match?.venue || tournament?.ground || "Main Arena"}{tournament?.city ? `, ${tournament.city}` : ""}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE CARDS */}
        <div className="px-6 py-8 space-y-6">
          {mvp && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] -ml-32 -mb-32" />

              <div className="relative z-10 flex flex-col items-center text-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-orange-600 text-white border-0 px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-orange-900/40">
                    🌟 Player of the Match
                  </Badge>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{mvp.name}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{mvp.team_id === teamA?.id ? teamA?.name : teamB?.name}</span>
                </div>

                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-orange-500 to-orange-400 p-1 shadow-2xl relative group-hover:scale-110 transition-transform duration-500">
                  <div className="w-full h-full rounded-[28px] bg-slate-900 flex items-center justify-center overflow-hidden border border-white/10">
                    <User className="w-12 h-12 text-white/20" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                    <Trophy className="w-5 h-5 text-orange-600" />
                  </div>
                </div>

                <div className="grid grid-cols-3 w-full gap-4 pt-4 border-t border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-black text-white">{mvp.totalPoints}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Total Pts</span>
                  </div>
                  <div className="flex flex-col gap-1 border-x border-white/5">
                    <span className="text-2xl font-black text-orange-500">{mvp.raidPts}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Raid</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-black text-blue-500">{mvp.tacklePts}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Tackle</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Match Highlights</h3>

          <div className="grid grid-cols-1 gap-4">
            {bestRaider && (
              <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:rotate-12 transition-transform">
                  <Activity className="w-40 h-40" />
                </div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <Badge className="bg-orange-50 text-orange-600 border-0 mb-1 font-black uppercase text-[8px] tracking-widest h-5">🏃 Best Raider</Badge>
                      <h4 className="text-lg font-black uppercase tracking-tight">{bestRaider.name}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bestRaider.team_id === teamA?.id ? teamA?.name : teamB?.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-orange-600 tracking-tighter">{bestRaider.raidPts}</div>
                    <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">RAID Pts</div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Success Rate</span>
                      <span className="text-slate-900">{Math.round((bestRaider.successfulRaids / (bestRaider.raids || 1)) * 100)}%</span>
                    </div>
                    <Progress value={(bestRaider.successfulRaids / (bestRaider.raids || 1)) * 100} className="h-1.5 bg-slate-100" indicatorClassName="bg-orange-500" />
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="text-xs font-black text-slate-900">{bestRaider.touch}</div>
                      <div className="text-[7px] font-black uppercase tracking-widest text-slate-400">Touch</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-black text-slate-900">{bestRaider.bonus}</div>
                      <div className="text-[7px] font-black uppercase tracking-widest text-slate-400">Bonus</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {bestDefender && (
              <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:-rotate-12 transition-transform">
                  <Shield className="w-40 h-40 text-blue-900" />
                </div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <Badge className="bg-blue-50 text-blue-600 border-0 mb-1 font-black uppercase text-[8px] tracking-widest h-5">🛡️ Best Defender</Badge>
                      <h4 className="text-lg font-black uppercase tracking-tight">{bestDefender.name}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bestDefender.team_id === teamA?.id ? teamA?.name : teamB?.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-blue-600 tracking-tighter">{bestDefender.tacklePts}</div>
                    <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">TACKLE Pts</div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Tackle Accuracy</span>
                      <span className="text-slate-900">{Math.round((bestDefender.successfulTackles / (bestDefender.tackleAttempts || 1)) * 100)}%</span>
                    </div>
                    <Progress value={(bestDefender.successfulTackles / (bestDefender.tackleAttempts || 1)) * 100} className="h-1.5 bg-slate-100" indicatorClassName="bg-blue-600" />
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="text-xs font-black text-slate-900">{bestDefender.successfulTackles}</div>
                      <div className="text-[7px] font-black uppercase tracking-widest text-slate-400">Success</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-black text-slate-900">{bestDefender.tackleAttempts}</div>
                      <div className="text-[7px] font-black uppercase tracking-widest text-slate-400">Attempts</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-4">
          <Tabs defaultValue="scorecard" className="w-full">
            <div className="overflow-x-auto no-scrollbar mb-6 px-2">
              <TabsList className="bg-white border border-slate-100 p-1 h-12 rounded-2xl shadow-sm flex min-w-max">
                <TabsTrigger value="scorecard" className="px-6 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Scorecard</TabsTrigger>
                <TabsTrigger value="raiders" className="px-6 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Raiders</TabsTrigger>
                <TabsTrigger value="defenders" className="px-6 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Defenders</TabsTrigger>
                <TabsTrigger value="timeline" className="px-6 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Timeline</TabsTrigger>
                <TabsTrigger value="stats" className="px-6 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Stats</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="scorecard" className="space-y-4 px-2">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Match Scorecard
                  </h4>

                  {/* Half 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-tight text-slate-900">1st Half</span>
                      <Badge variant="outline" className="border-slate-100 text-[9px] font-bold text-slate-400">COMPLETED</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-50/50 p-4 rounded-2xl border border-red-50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-red-400 uppercase">{teamA?.name}</span>
                          <span className="text-xl font-black text-red-600">{stats.half1.teamA}</span>
                        </div>
                        <div className="h-1 bg-red-100 rounded-full w-full overflow-hidden">
                          <div className="h-full bg-red-400" style={{ width: `${(stats.half1.teamA / (stats.half1.teamA + stats.half1.teamB || 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-blue-400 uppercase">{teamB?.name}</span>
                          <span className="text-xl font-black text-blue-600">{stats.half1.teamB}</span>
                        </div>
                        <div className="h-1 bg-blue-100 rounded-full w-full overflow-hidden">
                          <div className="h-full bg-blue-400" style={{ width: `${(stats.half1.teamB / (stats.half1.teamA + stats.half1.teamB || 1)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Half 2 (Only if stats present) */}
                  {(stats.half2.teamA > 0 || stats.half2.teamB > 0) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-tight text-slate-900">2nd Half</span>
                        <Badge variant="outline" className="border-slate-100 text-[9px] font-bold text-slate-400">COMPLETED</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase">{teamA?.name}</span>
                            <span className="text-xl font-black text-red-600">{stats.half2.teamA}</span>
                          </div>
                          <div className="h-1 bg-red-100 rounded-full w-full overflow-hidden">
                            <div className="h-full bg-red-400" style={{ width: `${(stats.half2.teamA / (stats.half2.teamA + stats.half2.teamB || 1)) * 100}%` }} />
                          </div>
                        </div>
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-blue-400 uppercase">{teamB?.name}</span>
                            <span className="text-xl font-black text-blue-600">{stats.half2.teamB}</span>
                          </div>
                          <div className="h-1 bg-blue-100 rounded-full w-full overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${(stats.half2.teamB / (stats.half2.teamA + stats.half2.teamB || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Point Distribution */}
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{teamA?.name}</span>
                        <div className="space-y-2">
                          {[
                            { label: "Touch", pts: stats.teamA.touchPoints },
                            { label: "Bonus", pts: stats.teamA.bonusPoints },
                            { label: "Tackle", pts: stats.teamA.tacklePoints },
                            { label: "All Out", pts: stats.teamA.allOuts * 2 },
                          ].map(i => (
                            <div key={i.label} className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500">{i.label}</span>
                              <span className="text-xs font-black text-slate-900">{i.pts}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{teamB?.name}</span>
                        <div className="space-y-2">
                          {[
                            { label: "Touch", pts: stats.teamB.touchPoints },
                            { label: "Bonus", pts: stats.teamB.bonusPoints },
                            { label: "Tackle", pts: stats.teamB.tacklePoints },
                            { label: "All Out", pts: stats.teamB.allOuts * 2 },
                          ].map(i => (
                            <div key={i.label} className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500">{i.label}</span>
                              <span className="text-xs font-black text-slate-900">{i.pts}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[28px] p-6 text-white text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Final Score</span>
                  <div className="text-3xl font-black py-2">
                    {match?.team_a_score} <span className="text-white/20 px-4">-</span> {match?.team_b_score}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                    {winner ? `${winner.name} won by ${winnerScore - loserScore} points` : "Match Tied"}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="raiders" className="space-y-4 px-2">
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raider Performance</h4>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-50 hover:bg-transparent">
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10">Player</TableHead>
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10 text-right">Pts</TableHead>
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10 text-right">T/B</TableHead>
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10 text-right">Raid</TableHead>
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10 text-right">SR%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...playersA, ...playersB]
                      .map(p => {
                        const pEvents = events.filter(e => e.player_id === p.id && e.event_type === 'raid');
                        const touch = pEvents.reduce((sum, e) => sum + (e.event_data?.touchPoints || 0), 0);
                        const bonus = pEvents.reduce((sum, e) => sum + (e.event_data?.bonusPoints || 0), 0);
                        const successful = pEvents.filter(e => e.points_awarded > 0 || (e.event_data?.bonusPoints > 0)).length;
                        const total = pEvents.length;
                        return { ...p, pts: touch + bonus, touch, bonus, successful, total, sr: total > 0 ? Math.round((successful / total) * 100) : 0 };
                      })
                      .sort((a, b) => b.pts - a.pts)
                      .filter(p => p.total > 0)
                      .map((p, idx) => (
                        <TableRow key={idx} className="border-slate-50 transition-colors hover:bg-slate-50/50">
                          <TableCell className="px-4 py-3 flex items-center gap-2">
                            <div className={`w-1 h-6 rounded-full ${p.team_id === teamA?.id ? 'bg-red-400' : 'bg-blue-400'}`} />
                            <span className="text-xs font-black uppercase tracking-tighter truncate max-w-[80px]">{p.name}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-xs font-black text-orange-600">{p.pts}</TableCell>
                          <TableCell className="px-4 py-3 text-right text-[10px] font-bold text-slate-400">{p.touch}/{p.bonus}</TableCell>
                          <TableCell className="px-4 py-3 text-right text-[10px] font-bold text-slate-400">{p.successful}/{p.total}</TableCell>
                          <TableCell className="px-4 py-3 text-right text-xs font-black">{p.sr}%</TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="defenders" className="space-y-4 px-2">
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Defender Performance</h4>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-50 hover:bg-transparent">
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10">Player</TableHead>
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10 text-right">Pts</TableHead>
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10 text-right">Succ</TableHead>
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10 text-right">Atts</TableHead>
                      <TableHead className="text-[9px] font-black uppercase px-4 h-10 text-right">TR%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...playersA, ...playersB]
                      .map(p => {
                        const pEvents = events.filter(e => e.player_id === p.id && e.event_type === 'tackle');
                        const pts = pEvents.reduce((sum, e) => sum + (e.points_awarded || 0), 0);
                        const successful = pEvents.filter(e => e.points_awarded > 0).length;
                        const total = pEvents.length;
                        return { ...p, pts, successful, total, tr: total > 0 ? Math.round((successful / total) * 100) : 0 };
                      })
                      .sort((a, b) => b.pts - a.pts)
                      .filter(p => p.total > 0)
                      .map((p, idx) => (
                        <TableRow key={idx} className="border-slate-50 transition-colors hover:bg-slate-50/50">
                          <TableCell className="px-4 py-3 flex items-center gap-2">
                            <div className={`w-1 h-6 rounded-full ${p.team_id === teamA?.id ? 'bg-red-400' : 'bg-blue-400'}`} />
                            <span className="text-xs font-black uppercase tracking-tighter truncate max-w-[80px]">{p.name}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-xs font-black text-blue-600">{p.pts}</TableCell>
                          <TableCell className="px-4 py-3 text-right text-[10px] font-bold text-slate-400">{p.successful}</TableCell>
                          <TableCell className="px-4 py-3 text-right text-[10px] font-bold text-slate-400">{p.total}</TableCell>
                          <TableCell className="px-4 py-3 text-right text-xs font-black">{p.tr}%</TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4 px-2">
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-50">
                {events.slice().reverse().map((event, idx) => {
                  const player = [...playersA, ...playersB].find(p => p.id === event.player_id);
                  const isRaid = event.event_type === 'raid';
                  const isSuccess = event.points_awarded > 0 || (event.event_data?.bonusPoints > 0);

                  return (
                    <div key={idx} className="p-5 flex gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col items-center shrink-0 w-10">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isSuccess ? 'bg-green-500 shadow-green-100' : 'bg-red-500 shadow-red-100'} shadow-lg`}>
                          {isRaid ? <Activity className="w-5 h-5 text-white" /> : <Shield className="w-5 h-5 text-white" />}
                        </div>
                        <span className="text-[8px] font-mono font-bold text-slate-300 mt-1.5">{idx + 1}</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                          <span className={event.team_id === teamA?.id ? 'text-red-400' : 'text-blue-400'}>{event.team_id === teamA?.id ? teamA?.name : teamB?.name}</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded-full">{event.score_at_time_a}-{event.score_at_time_b}</span>
                        </div>
                        <p className="text-xs font-bold leading-tight">
                          <span className="font-black uppercase tracking-tighter mr-1">{player?.name || "System"}</span>
                          {isRaid ? `performed a ${event.points_awarded > 1 ? 'Super Raid' : 'Raid'}` : 'executed a tackle'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className={`${isSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} border-0 text-[8px] font-black uppercase h-5`}>
                            {isSuccess ? `+${event.points_awarded} Points` : isRaid ? 'Unsuccessful' : 'Failed Attempt'}
                          </Badge>
                          {event.event_data?.bonusPoints > 0 && <Badge className="bg-yellow-50 text-yellow-600 border-0 text-[8px] font-black h-5">+Bonus</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4 px-2">
              <Card className="bg-white border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/30">
                  <CardTitle className="text-slate-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" /> Team Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  {[
                    { label: "Total Raids", a: stats.teamA.raids, b: stats.teamB.raids, color: "bg-orange-500" },
                    { label: "Successful Raids", a: stats.teamA.successfulRaids, b: stats.teamB.successfulRaids, color: "bg-green-500" },
                    { label: "Tackle Points", a: stats.teamA.tacklePoints, b: stats.teamB.tacklePoints, color: "bg-blue-600" },
                    { label: "Empty Raids", a: stats.teamA.emptyRaids, b: stats.teamB.emptyRaids, color: "bg-slate-300" },
                    { label: "All Outs Inflicted", a: stats.teamA.allOuts, b: stats.teamB.allOuts, color: "bg-purple-600" },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                        <span className="text-red-400">{item.a}</span>
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-blue-400">{item.b}</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                        <div className={`${item.color} transition-all duration-1000 border-r border-white/20`} style={{ width: `${(item.a / (item.a + item.b || 1)) * 100}%` }} />
                        <div className={`${item.color} opacity-30 transition-all duration-1000`} style={{ width: `${(item.b / (item.a + item.b || 1)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex gap-4 z-50">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl h-12 border-slate-100 bg-white text-[10px] font-black uppercase tracking-widest gap-2"
            onClick={() => {
              handleShare({
                title: `Match Result: ${teamA?.name} vs ${teamB?.name}`,
                text: `Final Score: ${match?.team_a_score} - ${match?.team_b_score}. ${winner ? winner.name + ' won!' : 'It was a tie!'}`,
                url: `/match-summary/${id}`
              });
            }}
          >
            <Share2 className="w-4 h-4 text-orange-600" /> Share
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            className="w-12 h-12 rounded-2xl border-slate-100 bg-white flex items-center justify-center p-0 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4 text-orange-600" />
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="flex-1 rounded-2xl h-12 bg-slate-900 border-0 text-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl shadow-slate-900/20"
          >
            <Home className="w-4 h-4" /> Home
          </Button>
        </div>

      </div>
    </div>
  );
};

export default MatchSummary;
