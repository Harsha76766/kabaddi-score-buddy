import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Clock, 
  Undo2, Redo2, Flag, Settings, ChevronDown, StopCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
  team_id: string;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Match {
  id: string;
  team_a_id: string;
  team_b_id: string;
  team_a_score: number;
  team_b_score: number;
  match_name: string;
}

interface MatchEvent {
  id: string;
  event_type: string;
  raider_id: string | null;
  team_id: string;
  points_awarded: number;
  is_do_or_die: boolean;
  is_all_out: boolean;
  raid_time: number | null;
}

const LiveScoring = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [playersA, setPlayersA] = useState<Player[]>([]);
  const [playersB, setPlayersB] = useState<Player[]>([]);
  
  const [selectedRaider, setSelectedRaider] = useState<string | null>(null);
  const [selectedDefenders, setSelectedDefenders] = useState<string[]>([]);
  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A");
  
  const [matchTimer, setMatchTimer] = useState(0);
  const [isMatchRunning, setIsMatchRunning] = useState(false);
  const [raidTimer, setRaidTimer] = useState(0);
  const [isRaidRunning, setIsRaidRunning] = useState(false);
  
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [undoneEvents, setUndoneEvents] = useState<MatchEvent[]>([]);
  const [halfNumber, setHalfNumber] = useState(1);
  const [raidCount, setRaidCount] = useState(0);
  const [showPlayerSelectDialog, setShowPlayerSelectDialog] = useState(false);
  const [showBonusDropdown, setShowBonusDropdown] = useState(false);
  
  const [teamAStats, setTeamAStats] = useState({
    raid: 0, tackle: 0, bonus: 0, allOut: 0
  });
  const [teamBStats, setTeamBStats] = useState({
    raid: 0, tackle: 0, bonus: 0, allOut: 0
  });
  
  const [outPlayersA, setOutPlayersA] = useState<string[]>([]);
  const [outPlayersB, setOutPlayersB] = useState<string[]>([]);
  const [consecutiveZeroRaids, setConsecutiveZeroRaids] = useState(0);

  useEffect(() => {
    if (id) fetchMatchData();
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMatchRunning) {
      interval = setInterval(() => {
        setMatchTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMatchRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRaidRunning) {
      interval = setInterval(() => {
        setRaidTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRaidRunning]);

  const fetchMatchData = async () => {
    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", id)
        .single();

      if (matchError) throw matchError;
      setMatch(matchData);

      const [teamAData, teamBData] = await Promise.all([
        supabase.from("teams").select("*").eq("id", matchData.team_a_id).single(),
        supabase.from("teams").select("*").eq("id", matchData.team_b_id).single(),
      ]);

      if (teamAData.data) setTeamA(teamAData.data);
      if (teamBData.data) setTeamB(teamBData.data);

      const [playersAData, playersBData] = await Promise.all([
        supabase.from("players").select("*").eq("team_id", matchData.team_a_id),
        supabase.from("players").select("*").eq("team_id", matchData.team_b_id),
      ]);

      setPlayersA(playersAData.data || []);
      setPlayersB(playersBData.data || []);

      const { data: eventsData } = await supabase
        .from("match_events")
        .select("*")
        .eq("match_id", id)
        .order("created_at", { ascending: true });
      
      if (eventsData) {
        setEvents(eventsData);
        recalculateStats(eventsData);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading match",
        description: error.message,
      });
    }
  };

  const recalculateStats = (eventsList: MatchEvent[]) => {
    const statsA = { raid: 0, tackle: 0, bonus: 0, allOut: 0 };
    const statsB = { raid: 0, tackle: 0, bonus: 0, allOut: 0 };
    
    eventsList.forEach(event => {
      const isTeamA = event.team_id === match?.team_a_id;
      const stats = isTeamA ? statsA : statsB;
      
      if (event.event_type === "raid") stats.raid += event.points_awarded;
      else if (event.event_type === "tackle") stats.tackle += event.points_awarded;
      else if (event.event_type === "bonus") stats.bonus += event.points_awarded;
      else if (event.event_type === "all_out") stats.allOut += event.points_awarded;
    });
    
    setTeamAStats(statsA);
    setTeamBStats(statsB);
  };

  const recordEvent = async (eventType: string, points: number, isDoOrDie = false, isAllOut = false) => {
    if (!match) return;

    const raidingTeam = activeTeam === "A" ? teamA : teamB;
    const defendingTeam = activeTeam === "A" ? teamB : teamA;
    
    if (!raidingTeam) return;

    try {
      // Use the secure server-side validated function
      const { data: eventId, error } = await supabase.rpc('insert_match_event', {
        p_match_id: match.id,
        p_event_type: eventType,
        p_raider_id: selectedRaider,
        p_defender_ids: selectedDefenders,
        p_team_id: raidingTeam.id,
        p_points_awarded: points,
        p_raid_time: raidTimer,
        p_is_do_or_die: isDoOrDie,
        p_is_all_out: isAllOut,
        p_event_data: {
          half: halfNumber,
        }
      });

      if (error) throw error;

      // Fetch the newly created event
      const { data, error: fetchError } = await supabase
        .from("match_events")
        .select()
        .eq("id", eventId)
        .single();

      if (fetchError) throw fetchError;

      const newScore = activeTeam === "A" 
        ? match.team_a_score + points 
        : match.team_b_score + points;

      await supabase
        .from("matches")
        .update(
          activeTeam === "A" 
            ? { team_a_score: newScore }
            : { team_b_score: newScore }
        )
        .eq("id", match.id);

      setMatch(prev => prev ? {
        ...prev,
        team_a_score: activeTeam === "A" ? newScore : prev.team_a_score,
        team_b_score: activeTeam === "B" ? newScore : prev.team_b_score,
      } : null);

      setEvents(prev => [...prev, data]);
      recalculateStats([...events, data]);
      
      if (points === 0) {
        setConsecutiveZeroRaids(prev => prev + 1);
      } else {
        setConsecutiveZeroRaids(0);
      }

      if (eventType === "raid" || eventType === "tackle") {
        setRaidCount(prev => prev + 1);
      }

      resetRaid();
      setUndoneEvents([]);

      toast({
        title: "Point Recorded",
        description: `${points} point${points !== 1 ? 's' : ''} added to ${raidingTeam.name}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error recording event",
        description: error.message,
      });
    }
  };

  const handleUndo = async () => {
    if (events.length === 0) return;
    
    const lastEvent = events[events.length - 1];
    
    try {
      await supabase
        .from("match_events")
        .delete()
        .eq("id", lastEvent.id);

      const newScore = lastEvent.team_id === match?.team_a_id
        ? match.team_a_score - lastEvent.points_awarded
        : match.team_b_score - lastEvent.points_awarded;

      await supabase
        .from("matches")
        .update(
          lastEvent.team_id === match?.team_a_id
            ? { team_a_score: newScore }
            : { team_b_score: newScore }
        )
        .eq("id", match!.id);

      setMatch(prev => prev ? {
        ...prev,
        team_a_score: lastEvent.team_id === match?.team_a_id ? newScore : prev.team_a_score,
        team_b_score: lastEvent.team_id === match?.team_b_id ? newScore : prev.team_b_score,
      } : null);

      const newEvents = events.slice(0, -1);
      setEvents(newEvents);
      setUndoneEvents([...undoneEvents, lastEvent]);
      recalculateStats(newEvents);

      toast({ title: "Action undone" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error undoing action",
        description: error.message,
      });
    }
  };

  const handleRedo = async () => {
    if (undoneEvents.length === 0 || !match) return;
    
    const eventToRedo = undoneEvents[undoneEvents.length - 1];
    
    try {
      const { data, error } = await supabase
        .from("match_events")
        .insert({
          match_id: match.id,
          event_type: eventToRedo.event_type,
          raider_id: eventToRedo.raider_id,
          team_id: eventToRedo.team_id,
          points_awarded: eventToRedo.points_awarded,
          raid_time: eventToRedo.raid_time,
          is_do_or_die: eventToRedo.is_do_or_die,
          is_all_out: eventToRedo.is_all_out,
        })
        .select()
        .single();

      if (error) throw error;

      const newScore = eventToRedo.team_id === match.team_a_id
        ? match.team_a_score + eventToRedo.points_awarded
        : match.team_b_score + eventToRedo.points_awarded;

      await supabase
        .from("matches")
        .update(
          eventToRedo.team_id === match.team_a_id
            ? { team_a_score: newScore }
            : { team_b_score: newScore }
        )
        .eq("id", match.id);

      setMatch(prev => prev ? {
        ...prev,
        team_a_score: eventToRedo.team_id === match.team_a_id ? newScore : prev.team_a_score,
        team_b_score: eventToRedo.team_id === match.team_b_id ? newScore : prev.team_b_score,
      } : null);

      const newEvents = [...events, data];
      setEvents(newEvents);
      setUndoneEvents(undoneEvents.slice(0, -1));
      recalculateStats(newEvents);

      toast({ title: "Action redone" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error redoing action",
        description: error.message,
      });
    }
  };

  const resetRaid = () => {
    setRaidTimer(0);
    setIsRaidRunning(false);
    setSelectedRaider(null);
    setSelectedDefenders([]);
  };

  const handleStopRaid = () => {
    setIsRaidRunning(false);
    setRaidTimer(0);
    toast({ title: "Raid stopped" });
  };

  const handleNextRaid = () => {
    setActiveTeam(prev => prev === "A" ? "B" : "A");
    resetRaid();
    setShowPlayerSelectDialog(true);
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedRaider(playerId);
    setShowPlayerSelectDialog(false);
    setRaidTimer(30);
    setIsRaidRunning(true);
  };

  const handleNextHalf = () => {
    setHalfNumber(prev => prev + 1);
    setMatchTimer(0);
    setRaidCount(0);
    resetRaid();
    toast({ title: `Starting ${halfNumber + 1}${halfNumber === 1 ? 'nd' : 'rd'} Half` });
  };

  const togglePlayerOut = (playerId: string, team: "A" | "B") => {
    if (team === "A") {
      setOutPlayersA(prev => 
        prev.includes(playerId) 
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      );
    } else {
      setOutPlayersB(prev => 
        prev.includes(playerId) 
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      );
    }
  };

  const handleAllOut = async () => {
    await recordEvent("all_out", 2, false, true);
    
    if (activeTeam === "A") {
      setOutPlayersB([]);
    } else {
      setOutPlayersA([]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!match || !teamA || !teamB) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isDoOrDieActive = consecutiveZeroRaids >= 2;
  const raidingPlayers = activeTeam === "A" ? playersA : playersB;
  const defendingPlayers = activeTeam === "A" ? playersB : playersA;
  const outPlayers = activeTeam === "A" ? outPlayersB : outPlayersA;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
      {/* Top Header Bar - Fixed */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 px-6 py-3 shadow-2xl sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>

          {/* Center Section */}
          <div className="flex items-center gap-6">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500 text-sm px-4 py-1">
              {halfNumber === 1 ? "1st Half" : halfNumber === 2 ? "2nd Half" : `${halfNumber}rd Half`}
            </Badge>
            
            <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur px-6 py-2 rounded-lg border border-slate-700">
              <Clock className="h-5 w-5 text-yellow-400" />
              <span className="font-mono text-2xl font-bold tracking-wider text-yellow-400">
                {formatTime(matchTimer)}
              </span>
              <Button
                size="sm"
                variant={isMatchRunning ? "destructive" : "default"}
                onClick={() => setIsMatchRunning(!isMatchRunning)}
                className="ml-2"
              >
                {isMatchRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleNextHalf}
              className="border-slate-600 hover:bg-slate-800"
            >
              Next Half
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/matches`)}
              className="gap-2 border-red-600 text-red-400 hover:bg-red-950"
            >
              <Flag className="h-4 w-4" />
              End Match
            </Button>
          </div>

          {/* Right Section */}
          <Badge className={`${isMatchRunning ? 'bg-green-500/20 text-green-400 border-green-500 animate-pulse' : 'bg-slate-700/20 text-slate-400 border-slate-600'} text-sm px-4 py-1`}>
            {isMatchRunning ? "● LIVE" : "PAUSED"}
          </Badge>
        </div>
      </div>

      {/* Scoreboard Section */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="max-w-[1920px] mx-auto grid grid-cols-5 gap-8 items-center">
          {/* Team A */}
          <div className="col-span-2 text-right">
            <div className="text-xl font-bold text-red-400 mb-2">{teamA.name}</div>
            <div className="text-7xl font-mono font-bold text-red-500 tracking-wider drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              {match.team_a_score.toString().padStart(2, '0')}
            </div>
          </div>

          {/* VS */}
          <div className="col-span-1 text-center">
            <div className="text-4xl font-bold text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">
              VS
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Raid #{raidCount}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {activeTeam === "A" ? teamA.name : teamB.name} Raid
            </div>
          </div>

          {/* Team B */}
          <div className="col-span-2 text-left">
            <div className="text-xl font-bold text-blue-400 mb-2">{teamB.name}</div>
            <div className="text-7xl font-mono font-bold text-blue-500 tracking-wider drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              {match.team_b_score.toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* Players & Timer Section */}
      <div className="px-6 py-6 border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-[1920px] mx-auto grid grid-cols-12 gap-6 items-center">
          {/* Team A Players */}
          <div className="col-span-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-12 bg-red-500 rounded"></div>
              <span className="text-sm font-semibold text-red-400">Team A Players</span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {playersA.slice(0, 8).map((player) => {
                const isOut = outPlayersA.includes(player.id);
                const isActive = selectedRaider === player.id && activeTeam === "A";
                return (
                  <button
                    key={player.id}
                    onClick={() => activeTeam === "A" && setSelectedRaider(player.id === selectedRaider ? null : player.id)}
                    className={`
                      aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                      transition-all duration-300
                      ${isActive
                        ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/50 scale-110 ring-4 ring-red-500/30 animate-pulse'
                        : isOut
                        ? 'bg-slate-800/30 border-slate-700 text-slate-600 opacity-40'
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-red-400 hover:scale-105'
                      }
                    `}
                  >
                    <div className="text-lg font-bold">
                      {player.jersey_number || '?'}
                    </div>
                    <div className="text-[7px] truncate w-full text-center px-1">
                      {player.name.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Raid Timer (Center) */}
          <div className="col-span-2">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 border-2 border-yellow-500/30 shadow-2xl">
              <div className="text-center mb-3">
                <div className="text-xs text-yellow-400 mb-2">RAID TIMER</div>
                <div className={`font-mono text-5xl font-bold tracking-wider ${raidTimer > 20 ? 'text-red-500 animate-pulse' : 'text-yellow-400'} drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]`}>
                  {(30 - raidTimer).toString().padStart(2, '0')}
                </div>
              </div>
              <div className="flex gap-2 justify-center mt-4">
                <Button
                  size="sm"
                  variant={isRaidRunning ? "destructive" : "default"}
                  onClick={() => setIsRaidRunning(!isRaidRunning)}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {isRaidRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRaidTimer(0)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Team B Players */}
          <div className="col-span-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-12 bg-blue-500 rounded"></div>
              <span className="text-sm font-semibold text-blue-400">Team B Players</span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {playersB.slice(0, 8).map((player) => {
                const isOut = outPlayersB.includes(player.id);
                const isActive = selectedRaider === player.id && activeTeam === "B";
                return (
                  <button
                    key={player.id}
                    onClick={() => activeTeam === "B" && setSelectedRaider(player.id === selectedRaider ? null : player.id)}
                    className={`
                      aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                      transition-all duration-300
                      ${isActive
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50 scale-110 ring-4 ring-blue-500/30 animate-pulse'
                        : isOut
                        ? 'bg-slate-800/30 border-slate-700 text-slate-600 opacity-40'
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-400 hover:scale-105'
                      }
                    `}
                  >
                    <div className="text-lg font-bold">
                      {player.jersey_number || '?'}
                    </div>
                    <div className="text-[7px] truncate w-full text-center px-1">
                      {player.name.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Do or Die Warning */}
      {isDoOrDieActive && (
        <div className="px-6 py-3 bg-orange-500/20 border-y border-orange-500 animate-pulse">
          <div className="text-center font-bold text-orange-400 text-lg">
            ⚠️ DO OR DIE RAID ⚠️
          </div>
        </div>
      )}

      {/* Scoring Section - Dynamic Based on Raiding Team */}
      <div className="px-6 py-6">
        <div className="max-w-[1920px] mx-auto">
          {/* Raider Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-2 w-16 ${activeTeam === "A" ? 'bg-red-500' : 'bg-blue-500'} rounded`}></div>
              <h3 className={`text-lg font-bold ${activeTeam === "A" ? 'text-red-400' : 'text-blue-400'}`}>
                RAIDER SECTION - {activeTeam === "A" ? teamA.name : teamB.name}
              </h3>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => recordEvent("raid", 0, isDoOrDieActive)}
                className="h-16 px-8 flex items-center gap-3 bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600"
              >
                <div className="text-3xl font-bold">0</div>
                <div className="text-sm">Empty</div>
              </Button>

              <Button
                onClick={() => recordEvent("raid", 1, isDoOrDieActive)}
                className="h-16 px-8 flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white border-2 border-green-500"
              >
                <div className="text-3xl font-bold">1</div>
                <div className="text-sm">Point</div>
              </Button>

              <Button
                onClick={() => recordEvent("raid", 2, isDoOrDieActive)}
                className="h-16 px-8 flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white border-2 border-green-500"
              >
                <div className="text-3xl font-bold">2</div>
                <div className="text-sm">Points</div>
              </Button>

              <Button
                onClick={() => recordEvent("raid", 3, isDoOrDieActive)}
                className="h-16 px-8 flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white border-2 border-green-500"
              >
                <div className="text-3xl font-bold">3</div>
                <div className="text-sm">Points</div>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-16 px-8 flex items-center gap-3 bg-orange-600 hover:bg-orange-700 text-white border-2 border-orange-500">
                    <div className="text-3xl font-bold">B</div>
                    <div className="text-sm">Bonus</div>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-slate-700">
                  {[1, 2, 3, 4, 5, 6, 7].map((bonus) => (
                    <DropdownMenuItem
                      key={bonus}
                      onClick={() => recordEvent("bonus", bonus)}
                      className="text-white hover:bg-orange-600 cursor-pointer"
                    >
                      Bonus +{bonus}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={() => recordEvent("raid", 0, isDoOrDieActive)}
                className="h-16 px-8 flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white border-2 border-red-500"
              >
                <div className="text-sm">Out of Bound</div>
              </Button>

              <Button
                onClick={() => toast({ title: "Timeout called" })}
                className="h-16 px-8 flex items-center gap-3 bg-blue-700 hover:bg-blue-800 text-white border-2 border-blue-600"
              >
                <div className="text-sm">Timeout</div>
              </Button>
            </div>
          </div>

          {/* Defense Section */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-2 w-16 ${activeTeam === "A" ? 'bg-blue-500' : 'bg-red-500'} rounded`}></div>
              <h3 className={`text-lg font-bold ${activeTeam === "A" ? 'text-blue-400' : 'text-red-400'}`}>
                DEFENSE SECTION - {activeTeam === "A" ? teamB.name : teamA.name}
              </h3>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => recordEvent("tackle", 1)}
                className="h-16 px-8 flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-500"
              >
                <div className="text-sm">Tackle (+1)</div>
              </Button>

              <Button
                onClick={() => recordEvent("tackle", 2)}
                className="h-16 px-8 flex items-center gap-3 bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-600"
              >
                <div className="text-sm">Super Tackle (+2)</div>
              </Button>

              <Button
                onClick={() => recordEvent("tackle", 1)}
                className="h-16 px-8 flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white border-2 border-red-500"
              >
                <div className="text-sm">Defender Out of Bound</div>
              </Button>

              <Button
                onClick={() => toast({ title: "Defense timeout called" })}
                className="h-16 px-8 flex items-center gap-3 bg-blue-700 hover:bg-blue-800 text-white border-2 border-blue-600"
              >
                <div className="text-sm">Timeout</div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800 px-6 py-4 shadow-2xl z-50">
        <div className="max-w-[1920px] mx-auto flex gap-4">
          <Button
            onClick={handleUndo}
            disabled={events.length === 0}
            variant="outline"
            className="flex-1 h-14 text-lg border-slate-600 hover:bg-slate-800"
          >
            <Undo2 className="h-5 w-5 mr-2" />
            Undo
          </Button>

          <Button
            onClick={handleRedo}
            disabled={undoneEvents.length === 0}
            variant="outline"
            className="flex-1 h-14 text-lg border-slate-600 hover:bg-slate-800"
          >
            <Redo2 className="h-5 w-5 mr-2" />
            Redo
          </Button>

          <Button
            onClick={handleStopRaid}
            variant="outline"
            className="flex-1 h-14 text-lg border-red-600 text-red-400 hover:bg-red-950"
          >
            <StopCircle className="h-5 w-5 mr-2" />
            Stop Raid
          </Button>

          <Button
            onClick={handleNextRaid}
            className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
          >
            Next Raid →
          </Button>
        </div>
      </div>

      {/* Player Select Dialog */}
      <Dialog open={showPlayerSelectDialog} onOpenChange={setShowPlayerSelectDialog}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">
              Select Next Raider - {activeTeam === "A" ? teamA.name : teamB.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-6">
            {(activeTeam === "A" ? playersA : playersB).slice(0, 8).map((player) => {
              const outPlayers = activeTeam === "A" ? outPlayersA : outPlayersB;
              const isOut = outPlayers.includes(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => !isOut && handlePlayerSelect(player.id)}
                  disabled={isOut}
                  className={`
                    aspect-square rounded-xl border-2 flex flex-col items-center justify-center
                    transition-all duration-300 hover:scale-110
                    ${isOut
                      ? 'bg-slate-800/30 border-slate-700 text-slate-600 opacity-40 cursor-not-allowed'
                      : activeTeam === "A"
                      ? 'bg-red-600 border-red-400 text-white hover:bg-red-700 shadow-lg hover:shadow-red-500/50'
                      : 'bg-blue-600 border-blue-400 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/50'
                    }
                  `}
                >
                  <div className="text-3xl font-bold mb-1">
                    {player.jersey_number || '?'}
                  </div>
                  <div className="text-xs truncate w-full text-center px-2">
                    {player.name}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveScoring;