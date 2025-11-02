import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Clock, 
  Undo2, Redo2, Flag, Users
} from "lucide-react";

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
      const eventData = {
        match_id: match.id,
        event_type: eventType,
        raider_id: selectedRaider,
        team_id: raidingTeam.id,
        points_awarded: points,
        raid_time: raidTimer,
        is_do_or_die: isDoOrDie,
        is_all_out: isAllOut,
        event_data: {
          defenders: selectedDefenders,
          half: halfNumber,
        }
      };

      const { data, error } = await supabase
        .from("match_events")
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

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

  const resetRaid = () => {
    setRaidTimer(0);
    setIsRaidRunning(false);
    setSelectedRaider(null);
    setSelectedDefenders([]);
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
    <div className="min-h-screen bg-slate-950 text-white pb-6">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500">
              {halfNumber === 1 ? "1st Half" : "2nd Half"}
            </Badge>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-lg">{formatTime(matchTimer)}</span>
            </div>
            <Button
              size="sm"
              variant={isMatchRunning ? "destructive" : "default"}
              onClick={() => setIsMatchRunning(!isMatchRunning)}
            >
              {isMatchRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/matches`)}
            className="gap-2"
          >
            <Flag className="h-4 w-4" />
            End Match
          </Button>
        </div>

        {/* Teams Score */}
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <div className="text-sm text-slate-400 mb-1">{teamA.name}</div>
            <div className="text-4xl font-bold text-orange-400">{match.team_a_score}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500">VS</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-400 mb-1">{teamB.name}</div>
            <div className="text-4xl font-bold text-blue-400">{match.team_b_score}</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Active Team Switcher */}
        <Card className="p-3 bg-slate-900 border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Raiding Team:</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeTeam === "A" ? "default" : "outline"}
                onClick={() => setActiveTeam("A")}
                className={activeTeam === "A" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                {teamA.name}
              </Button>
              <Button
                size="sm"
                variant={activeTeam === "B" ? "default" : "outline"}
                onClick={() => setActiveTeam("B")}
                className={activeTeam === "B" ? "bg-blue-500 hover:bg-blue-600" : ""}
              >
                {teamB.name}
              </Button>
            </div>
          </div>
        </Card>

        {/* Do or Die Warning */}
        {isDoOrDieActive && (
          <Card className="p-3 bg-orange-500/20 border-orange-500 animate-pulse">
            <div className="text-center font-bold text-orange-400">
              ⚠️ DO OR DIE RAID ⚠️
            </div>
          </Card>
        )}

        {/* Raiding Players Selection */}
        <Card className="p-4 bg-slate-900 border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-orange-400" />
            <h3 className="font-semibold">Select Raider</h3>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {raidingPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedRaider(player.id === selectedRaider ? null : player.id)}
                className={`
                  aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                  transition-all hover:scale-105
                  ${selectedRaider === player.id 
                    ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/50' 
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-orange-400'
                  }
                  ${outPlayers.includes(player.id) ? 'opacity-40' : ''}
                `}
              >
                <div className="text-xl font-bold">
                  {player.jersey_number || '?'}
                </div>
                <div className="text-[8px] truncate w-full text-center px-1">
                  {player.name.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Defending Players Selection */}
        <Card className="p-4 bg-slate-900 border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold">Select Defenders (Optional)</h3>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {defendingPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => {
                  if (selectedDefenders.includes(player.id)) {
                    setSelectedDefenders(prev => prev.filter(id => id !== player.id));
                  } else {
                    setSelectedDefenders(prev => [...prev, player.id]);
                  }
                }}
                className={`
                  aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                  transition-all hover:scale-105
                  ${selectedDefenders.includes(player.id)
                    ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-400'
                  }
                  ${outPlayers.includes(player.id) ? 'opacity-40' : ''}
                `}
              >
                <div className="text-xl font-bold">
                  {player.jersey_number || '?'}
                </div>
                <div className="text-[8px] truncate w-full text-center px-1">
                  {player.name.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Raid Timer */}
        <Card className="p-4 bg-slate-900 border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-400" />
              <span className="font-mono text-2xl font-bold text-yellow-400">
                {formatTime(raidTimer)}
              </span>
              <span className="text-xs text-slate-400">Raid Timer</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isRaidRunning ? "destructive" : "default"}
                onClick={() => setIsRaidRunning(!isRaidRunning)}
                className="bg-yellow-500 hover:bg-yellow-600"
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
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <Button
            onClick={() => recordEvent("raid", 0, isDoOrDieActive)}
            className="h-20 flex flex-col gap-1 bg-gray-600 hover:bg-gray-700"
          >
            <div className="text-2xl font-bold">0</div>
            <div className="text-xs">Empty</div>
          </Button>
          <Button
            onClick={() => recordEvent("raid", 1, isDoOrDieActive)}
            className="h-20 flex flex-col gap-1 bg-green-600 hover:bg-green-700"
          >
            <div className="text-2xl font-bold">1</div>
            <div className="text-xs">Point</div>
          </Button>
          <Button
            onClick={() => recordEvent("raid", 2, isDoOrDieActive)}
            className="h-20 flex flex-col gap-1 bg-green-600 hover:bg-green-700"
          >
            <div className="text-2xl font-bold">2</div>
            <div className="text-xs">Points</div>
          </Button>
          <Button
            onClick={() => recordEvent("raid", 3, isDoOrDieActive)}
            className="h-20 flex flex-col gap-1 bg-green-600 hover:bg-green-700"
          >
            <div className="text-2xl font-bold">3</div>
            <div className="text-xs">Points</div>
          </Button>
          
          <Button
            onClick={() => recordEvent("bonus", 1)}
            className="h-20 flex flex-col gap-1 bg-blue-600 hover:bg-blue-700"
          >
            <div className="text-2xl font-bold">B</div>
            <div className="text-xs">Bonus</div>
          </Button>
          <Button
            onClick={() => recordEvent("tackle", 1)}
            className="h-20 flex flex-col gap-1 bg-red-600 hover:bg-red-700"
          >
            <div className="text-2xl font-bold">T</div>
            <div className="text-xs">Tackle</div>
          </Button>
          <Button
            onClick={() => togglePlayerOut(selectedRaider || '', activeTeam)}
            disabled={!selectedRaider}
            className="h-20 flex flex-col gap-1 bg-red-700 hover:bg-red-800"
          >
            <div className="text-2xl font-bold">OUT</div>
            <div className="text-xs">Player</div>
          </Button>
          <Button
            onClick={handleAllOut}
            className="h-20 flex flex-col gap-1 bg-yellow-600 hover:bg-yellow-700"
          >
            <div className="text-2xl font-bold">AO</div>
            <div className="text-xs">All-Out</div>
          </Button>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-3">
          <Button
            onClick={handleUndo}
            disabled={events.length === 0}
            variant="outline"
            className="flex-1 h-12"
          >
            <Undo2 className="h-5 w-5 mr-2" />
            Undo
          </Button>
          <Button
            disabled
            variant="outline"
            className="flex-1 h-12"
          >
            <Redo2 className="h-5 w-5 mr-2" />
            Redo
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-orange-500/10 border-orange-500/30">
            <h4 className="font-semibold mb-3 text-orange-400">{teamA.name}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Raid Points:</span>
                <span className="font-bold">{teamAStats.raid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tackle Points:</span>
                <span className="font-bold">{teamAStats.tackle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bonus Points:</span>
                <span className="font-bold">{teamAStats.bonus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">All-Out Points:</span>
                <span className="font-bold">{teamAStats.allOut}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-blue-500/10 border-blue-500/30">
            <h4 className="font-semibold mb-3 text-blue-400">{teamB.name}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Raid Points:</span>
                <span className="font-bold">{teamBStats.raid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tackle Points:</span>
                <span className="font-bold">{teamBStats.tackle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bonus Points:</span>
                <span className="font-bold">{teamBStats.bonus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">All-Out Points:</span>
                <span className="font-bold">{teamBStats.allOut}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveScoring;