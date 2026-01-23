import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, Calendar, User, Phone, Mail, Trophy, UserPlus, Rocket, PlayCircle, Share2, Settings, MoreVertical, Swords, Info, Activity, ChevronRight, Circle } from "lucide-react";
import { format, isAfter, isBefore, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { AddTeamDialog } from "@/components/AddTeamDialog";
import AddPlayerDialog from "@/components/AddPlayerDialog";
import { CreateMatchDialog } from "@/components/CreateMatchDialog";
import { MatchStartDialog } from "@/components/MatchStartDialog";
import { EditTournamentDialog } from "@/components/EditTournamentDialog";
import { Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { handleShare } from "@/lib/share-utils";
import { generateRoundRobinFixtures, generateKnockoutFixtures, generateLeaguePlusKnockoutFixtures, generateGroupPlusKnockoutFixtures } from "@/lib/tournament-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBackNavigation } from "@/hooks/useBackNavigation";

interface Tournament {
  id: string;
  name: string;
  city: string;
  ground: string;
  organizer_name: string;
  organizer_phone: string;
  organizer_email?: string | null;
  organizer_id: string;
  start_date: string;
  end_date: string;
  category: string;
  logo_url: string | null;
  status: string;
  tournament_type: string;
  match_format?: any;
  settings?: any;
  rules_json?: any;
}

interface TournamentTeam {
  id: string;
  teams: {
    id: string;
    name: string;
    captain_name: string;
    logo_url?: string | null;
  };
  wins: number;
  losses: number;
  points: number;
}

interface Match {
  id: string;
  match_name: string;
  match_date: string;
  match_number?: string | number;
  venue: string | null;
  status: string;
  team_a_score: number;
  team_b_score: number;
  team_a_id: string;
  team_b_id: string;
  round_name?: string | null;
  group_name?: string | null;
  round_number?: number | null;
  next_match_id?: string | null;
  is_team_a_winner_slot?: boolean | null;
  team_a?: { name: string; id: string; logo_url?: string | null } | null;
  team_b?: { name: string; id: string; logo_url?: string | null } | null;
  created_by?: string | null;
}

interface PlayerStats {
  player_id: string;
  total_raid_points: number;
  total_tackle_points: number;
  total_bonus_points: number;
  total_points: number;
  players: {
    name: string;
    teams: { name: string; id: string } | null;
    profile_image: string | null;
  };
}

interface Sponsor {
  id: string;
  name: string;
  image_url: string | null;
  link_url: string | null;
  placement: string;
}

interface HeroStats {
  topRaider: PlayerStats | null;
  topDefender: PlayerStats | null;
  mvp: PlayerStats | null;
}

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const handleBack = useBackNavigation();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [heroes, setHeroes] = useState<HeroStats>({ topRaider: null, topDefender: null, mvp: null });
  const [tournamentStats, setTournamentStats] = useState({
    totalMatches: 0,
    totalRaids: 0,
    totalTackles: 0,
    totalPoints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [editTournamentOpen, setEditTournamentOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [matchStartDialog, setMatchStartDialog] = useState<{
    open: boolean;
    matchId: string;
    teamAId: string;
    teamBId: string;
    teamAName: string;
    teamBName: string;
  } | null>(null);
  const [playersForMatch, setPlayersForMatch] = useState<{
    teamA: any[];
    teamB: any[];
  }>({ teamA: [], teamB: [] });
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState("matches");
  const [fixtureType, setFixtureType] = useState<string>('League');

  useEffect(() => {
    if (id) fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTournament(),
      fetchTeams(),
      fetchSponsors(),
      fetchMatches(),
      fetchPlayerStats(),
    ]);
    setLoading(false);
  };

  const fetchTournament = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
      setIsOrganizer(user?.id === data.organizer_id);
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    }
  };

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setSponsors(data.map(s => ({
        id: s.id,
        name: s.name,
        image_url: s.logo_url, // map logo_url to image_url
        link_url: null, // sponsors table doesn't have link_url yet
        placement: s.type // map type to placement
      })) || []);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_teams')
        .select(`
          id,
          wins,
          losses,
          points,
          teams:teams!team_id (
            id,
            name,
            captain_name,
            logo_url
          )
        `)
        .eq('tournament_id', id);

      if (error) throw error;

      // Transform data to include points and flatten stats
      const formattedTeams: TournamentTeam[] = (data || [])
        .map((item: any) => {
          // Supabase returns results based on the alias or table name. 
          // We used `teams:teams` alias.
          const teamData = Array.isArray(item.teams) ? item.teams[0] : item.teams;

          if (!teamData) return null;

          return {
            id: item.id,
            teams: teamData, // Keep it as 'teams' to match interface and JSX
            wins: item.wins || 0,
            losses: item.losses || 0,
            points: item.points || 0
          };
        })
        .filter((t): t is TournamentTeam => t !== null)
        .sort((a, b) => b.points - a.points);

      setTeams(formattedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          match_name,
          match_number,
          round_name,
          group_name,
          match_date,
          venue,
          status,
          team_a_score,
          team_b_score,
          team_a_id,
          team_b_id,
          next_match_id,
          is_team_a_winner_slot,
          created_by,
          team_a:teams!matches_team_a_id_fkey (name, id, logo_url),
          team_b:teams!matches_team_b_id_fkey (name, id, logo_url)
        `)
        .eq('tournament_id', id)
        .order('match_date', { ascending: true }); // Ascending to find next match

      if (error) throw error;
      const sortedMatches = data || [];
      setMatches(sortedMatches); // Display ascending (top to bottom) as requested

      // Detect "Current Match" for Header Strip
      // 1. Any LIVE match
      // 2. The next UPCOMING match
      // 3. The last COMPLETED match
      const liveMatch = sortedMatches.find(m => m.status === 'live');
      const upcomingMatch = sortedMatches.find(m => m.status === 'scheduled');
      const lastCompletedMatch = [...sortedMatches].reverse().find(m => m.status === 'completed');

      setCurrentMatch(liveMatch || upcomingMatch || lastCompletedMatch || null);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchPlayerStats = async () => {
    try {
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', id);

      if (!matchesData || matchesData.length === 0) return;

      const matchIds = matchesData.map((m) => m.id);

      const { data, error } = await supabase
        .from('player_match_stats')
        .select(`
          player_id,
          raid_points,
          tackle_points,
          bonus_points,
          players (
            name,
            teams (name)
          )
        `)
        .in('match_id', matchIds);

      if (error) throw error;

      const statsMap = new Map<string, PlayerStats>();

      data?.forEach((stat: any) => {
        const existing = statsMap.get(stat.player_id) || {
          player_id: stat.player_id,
          total_raid_points: 0,
          total_tackle_points: 0,
          total_bonus_points: 0,
          total_points: 0,
          players: stat.players,
        };

        existing.total_raid_points += stat.raid_points || 0;
        existing.total_tackle_points += stat.tackle_points || 0;
        existing.total_bonus_points += stat.bonus_points || 0;
        existing.total_points += (stat.raid_points || 0) + (stat.tackle_points || 0) + (stat.bonus_points || 0);

        statsMap.set(stat.player_id, existing);
      });

      const sortedStats = Array.from(statsMap.values()).sort((a, b) => b.total_points - a.total_points);
      setPlayerStats(sortedStats);

      // Calculate Heroes
      const topRaider = [...sortedStats].sort((a, b) => b.total_raid_points - a.total_raid_points)[0] || null;
      const topDefender = [...sortedStats].sort((a, b) => b.total_tackle_points - a.total_tackle_points)[0] || null;
      const mvp = sortedStats[0] || null;
      setHeroes({ topRaider, topDefender, mvp });

      // Calculate Tournament Stats
      let totalRaids = 0;
      let totalTackles = 0;
      let totalPoints = 0;

      data?.forEach((stat: any) => {
        totalRaids += stat.raids_attempted || 0;
        totalTackles += (stat.successful_tackles || 0) + (stat.super_tackles || 0); // Approx
        totalPoints += (stat.raid_points || 0) + (stat.tackle_points || 0) + (stat.bonus_points || 0);
      });

      setTournamentStats({
        totalMatches: matchesData.length,
        totalRaids, // Note: this is player sum, might double count if not careful, but good enough for aggregate
        totalTackles,
        totalPoints
      });

    } catch (error) {
      console.error('Error fetching player stats:', error);
    }
  };

  const handlePublish = async () => {
    if (!tournament) return;

    setPublishing(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'Active' })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: "Tournament Published!",
        description: "Your tournament is now visible to everyone",
      });

      await fetchTournament();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to publish tournament",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateFixtures = async (type?: string) => {
    const selectedType = type || fixtureType;
    if (!tournament || teams.length < 2) {
      toast({
        variant: "destructive",
        title: "Not enough teams",
        description: "You need at least 2 teams to generate fixtures.",
      });
      return;
    }

    setLoading(true);
    try {
      const teamList = teams.map(t => ({ id: t.teams.id, name: t.teams.name }));
      let fixtures: any[] = [];

      if (selectedType === 'League' || selectedType === 'Round Robin') {
        fixtures = generateRoundRobinFixtures(teamList);
      } else if (selectedType === 'Knockout') {
        fixtures = generateKnockoutFixtures(teamList);
      } else if (selectedType === 'League + Knockout') {
        fixtures = generateLeaguePlusKnockoutFixtures(teamList);
      } else if (selectedType === 'Group + Knockout') {
        fixtures = generateGroupPlusKnockoutFixtures(teamList);
      }

      const matchesToInsert = fixtures.map(f => ({
        id: f.id,
        tournament_id: id,
        team_a_id: f.team_a_id,
        team_b_id: f.team_b_id,
        match_name: `${f.round_name} - Match ${f.match_number}`,
        round_name: f.round_name,
        round_number: f.round_number,
        match_number: String(f.match_number),
        next_match_id: f.next_match_id,
        is_team_a_winner_slot: f.is_team_a_winner_slot,
        status: 'scheduled',
        match_date: new Date().toISOString(),
        created_by: currentUserId,
      }));

      const { error } = await supabase.from('matches').insert(matchesToInsert);
      if (error) throw error;

      toast({
        title: "Fixtures Generated!",
        description: `Successfully created ${matchesToInsert.length} matches.`,
      });

      await fetchMatches();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate fixtures",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this tournament? This will also delete ALL matches, team registrations, and stats associated with it. This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);

      // Get all match IDs for this tournament first
      const { data: matchIds } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', id);

      // Cascade delete in proper order
      if (matchIds && matchIds.length > 0) {
        const ids = matchIds.map(m => m.id);

        // 1. Delete match_events (references matches)
        await supabase.from('match_events').delete().in('match_id', ids);

        // 2. Delete match_comments if they exist
        await supabase.from('match_comments').delete().in('match_id', ids);

        // 3. Delete match_reactions if they exist  
        await supabase.from('match_reactions').delete().in('match_id', ids);

        // 4. Delete player_match_stats (ADDED - was missing!)
        await supabase.from('player_match_stats').delete().in('match_id', ids);
      }

      // 5. Delete player_stats for this tournament (table may not exist in schema)
      await (supabase as any).from('player_stats').delete().eq('tournament_id', id);

      // 6. Delete matches
      await supabase.from('matches').delete().eq('tournament_id', id);

      // 7. Delete tournament teams
      await supabase.from('tournament_teams').delete().eq('tournament_id', id);

      // Finally delete the tournament
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Tournament Deleted",
        description: "Tournament and all related data have been removed.",
      });
      navigate('/tournaments');
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "An error occurred while deleting the tournament.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove a team from the tournament
  const handleRemoveTeam = async (tournamentTeamId: string, teamName: string) => {
    const confirmRemove = window.confirm(
      `Are you sure you want to remove "${teamName}" from this tournament? This cannot be undone.`
    );

    if (!confirmRemove) return;

    try {
      const { error } = await supabase
        .from('tournament_teams')
        .delete()
        .eq('id', tournamentTeamId);

      if (error) throw error;

      toast({
        title: "Team Removed",
        description: `${teamName} has been removed from the tournament.`,
      });

      // Refresh teams list
      await fetchTeams();
    } catch (error: any) {
      console.error('Error removing team:', error);
      toast({
        variant: "destructive",
        title: "Remove Failed",
        description: error.message || "Failed to remove team from tournament.",
      });
    }
  };


  if (loading) {
    return (
      <div key="loading" className="min-h-screen bg-background pb-20">
        <div className="p-4 animate-pulse space-y-4">
          <div className="h-48 bg-card rounded-lg" />
          <div className="h-32 bg-card rounded-lg" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div key="not-found" className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Tournament not found</p>
          <Button onClick={() => navigate('/tournaments')}>Back to Tournaments</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div key="content" className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* 1️⃣ HEADER: Floating & Glassy */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between px-4 h-16 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => handleBack()}
              className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg font-black italic uppercase tracking-tight text-slate-900 leading-none mb-1">
                {tournament.name}
              </h1>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {tournament.city} • {format(new Date(tournament.start_date), 'MMM d')} - {format(new Date(tournament.end_date), 'MMM d')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
              onClick={() => {
                handleShare({
                  title: `Tournament: ${tournament.name}`,
                  text: `Check out the ${tournament.name} tournament on RaidBook!`,
                  url: `/tournaments/${id}`
                });
              }}
            >
              <Share2 className="w-5 h-5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-2 border-slate-100 p-2 shadow-xl">
                {isOrganizer && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setEditTournamentOpen(true)}
                      className="rounded-xl font-bold text-xs uppercase tracking-widest focus:bg-orange-50 focus:text-orange-600 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDeleteTournament}
                      className="rounded-xl font-bold text-xs uppercase tracking-widest focus:bg-red-50 focus:text-red-600 cursor-pointer text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Tournament
                    </DropdownMenuItem>
                    {tournament.status === 'Draft' && (
                      <DropdownMenuItem
                        onClick={handlePublish}
                        disabled={publishing}
                        className="rounded-xl font-bold text-xs uppercase tracking-widest focus:bg-green-50 focus:text-green-600 cursor-pointer text-green-600"
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        Publish
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tournament Status Strip */}
        <div className="bg-slate-900 text-white px-6 py-2.5 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <Badge className={cn(
              "text-[8px] font-black tracking-[0.2em] px-2 py-0.5 rounded-full border-0 uppercase",
              tournament.status === 'Active' ? "bg-red-500 text-white animate-pulse" : "bg-slate-700 text-slate-300"
            )}>
              {tournament.status === 'Active' ? '🔴 LIVE' : tournament.status === 'Completed' ? '⚪ COMPLETED' : '🟡 UPCOMING'}
            </Badge>
            {currentMatch && (
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-slate-500 rounded-full" />
                <span className="text-[10px] font-black italic uppercase tracking-widest text-slate-400">
                  {currentMatch.status === 'live' ? 'Now Playing:' : currentMatch.status === 'scheduled' ? 'Next Match:' : 'Last Result:'}
                </span>
                <span className="text-[10px] font-black italic uppercase tracking-widest text-white truncate max-w-[150px]">
                  {currentMatch.team_a?.name || 'TBD'} vs {currentMatch.team_b?.name || 'TBD'}
                </span>
              </div>
            )}
          </div>
          <Activity className="w-4 h-4 text-orange-500 opacity-50 relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
        </div>
      </div>

      {/* 2️⃣ PRIMARY ACTION BAR (CONTEXT AWARE) */}
      {currentMatch && (
        <div className="px-6 mt-4">
          <div
            onClick={() => {
              if (currentMatch.status === 'live') {
                navigate(isOrganizer || currentMatch.created_by === currentUserId ? `/matches/${currentMatch.id}/score` : `/matches/${currentMatch.id}/spectate`);
              } else if (currentMatch.status === 'scheduled') {
                navigate(`/matches/${currentMatch.id}/spectate`);
              }
            }}
            className="flex items-center justify-between p-4 bg-orange-600 rounded-[28px] text-white shadow-lg shadow-orange-600/20 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                {currentMatch.status === 'live' ? <PlayCircle className="w-6 h-6 animate-pulse" /> : <Calendar className="w-6 h-6 text-white" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                  {currentMatch.status === 'live' ? (isOrganizer || currentMatch.created_by === currentUserId ? 'Scoring in Progress' : 'Watch Live Now') : 'Next Match Schedule'}
                </span>
                <span className="text-sm font-black italic uppercase tracking-tight">
                  {currentMatch.status === 'live' ? (isOrganizer || currentMatch.created_by === currentUserId ? 'Continue Scoring' : 'View Live Stats') : `Starts at ${format(new Date(currentMatch.match_date), 'h:mm a')}`}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-orange-600 transition-all">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* 3️⃣ MAIN TABS (REDUCED & SMART) */}
      <div className="px-6 mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full bg-white p-1.5 rounded-[24px] h-14 border-2 border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
            <TabsTrigger value="matches" className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all ring-0 border-0">Live</TabsTrigger>
            <TabsTrigger value="fixtures" className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all ring-0 border-0">Fixtures</TabsTrigger>
            <TabsTrigger value="teams" className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all ring-0 border-0">Teams</TabsTrigger>
            <TabsTrigger value="points" className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all ring-0 border-0">Standings</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all ring-0 border-0">Stats</TabsTrigger>
            <TabsTrigger value="info" className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all ring-0 border-0">Info</TabsTrigger>
          </TabsList>

          {/* 4️⃣ MATCHES TAB (CORE EXPERIENCE - NOW CALLED LIVE) */}
          <TabsContent value="matches" className="mt-6 space-y-6 focus-visible:outline-none ring-0 border-0">
            <div>
              {isOrganizer && (
                <div className="flex justify-between items-center px-2 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Management</span>
                  <div className="flex items-center gap-2">
                    <CreateMatchDialog
                      tournamentId={id!}
                      teams={teams.map(t => ({ id: t.teams.id, name: t.teams.name }))}
                      onMatchCreated={fetchTournamentData}
                    />
                  </div>
                </div>
              )}

              {matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                    <Swords className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No matches scheduled yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => {
                        if (match.status === 'completed') {
                          navigate(`/match-summary/${match.id}`);
                        } else {
                          navigate(`/matches/${match.id}/spectate`);
                        }
                      }}
                      className="group bg-white border-2 border-slate-100 hover:border-orange-500/20 rounded-[32px] overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-95"
                    >
                      {/* Top Row: BIG SCORE */}
                      <div className="p-6 pb-4 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-slate-50 z-0" />

                        <div className="flex flex-col items-center gap-2 flex-1 z-10">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner">
                            {match.team_a?.logo_url ? (
                              <img src={match.team_a.logo_url} className="w-full h-full object-cover" />
                            ) : (
                              <Trophy className="w-6 h-6 text-slate-200" />
                            )}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 text-center leading-tight max-w-[80px]">
                            {match.team_a?.name || 'TBD'}
                          </span>
                        </div>

                        <div className="flex flex-col items-center z-10 px-4">
                          <div className="flex items-center gap-3">
                            <span className={cn("text-3xl font-black italic tracking-tighter", match.status === 'completed' && match.team_a_score > match.team_b_score ? "text-orange-600" : "text-slate-900")}>
                              {match.team_a_score}
                            </span>
                            <span className="text-slate-200 font-bold">:</span>
                            <span className={cn("text-3xl font-black italic tracking-tighter", match.status === 'completed' && match.team_b_score > match.team_a_score ? "text-orange-600" : "text-slate-900")}>
                              {match.team_b_score}
                            </span>
                          </div>
                          <Badge variant="outline" className={cn(
                            "mt-2 text-[8px] font-black tracking-[0.2em] uppercase border-0 rounded-full px-3",
                            match.status === 'live' ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-50 text-slate-400"
                          )}>
                            {match.status}
                          </Badge>
                        </div>

                        <div className="flex flex-col items-center gap-2 flex-1 z-10">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner">
                            {match.team_b?.logo_url ? (
                              <img src={match.team_b.logo_url} className="w-full h-full object-cover" />
                            ) : (
                              <Trophy className="w-6 h-6 text-slate-200" />
                            )}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 text-center leading-tight max-w-[80px]">
                            {match.team_b?.name || 'TBD'}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Status & Number */}
                      <div className="px-6 py-2 border-y border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {match.match_name || (match.match_number ? `Match #${match.match_number}` : `Match #${match.id.slice(0, 4)}`)}
                          </span>
                          {(match.round_name || match.group_name) && (
                            <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-orange-500/60 leading-none mt-0.5">
                              {match.round_name}{match.round_name && match.group_name ? ' • ' : ''}{match.group_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Circle className={cn("w-1.5 h-1.5 fill-current", match.status === 'live' ? "text-red-500" : "text-slate-300")} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                            {match.status === 'completed' ? 'Final Result' : match.status === 'live' ? 'In Progress' : 'Scheduled'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Metadata & CTA */}
                      <div className="p-6 flex items-center justify-between bg-white">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {format(new Date(match.match_date), 'h:mm a • d MMM')}
                            </span>
                          </div>
                          {match.venue && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">
                                {match.venue}
                              </span>
                            </div>
                          )}
                        </div>

                        {(isOrganizer || match.created_by === currentUserId) && match.status !== 'completed' ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (match.status === 'live') {
                                navigate(`/matches/${match.id}/score`);
                              } else {
                                const [pA, pB] = await Promise.all([
                                  supabase.from("players").select("*").eq("team_id", match.team_a_id),
                                  supabase.from("players").select("*").eq("team_id", match.team_b_id),
                                ]);
                                setPlayersForMatch({ teamA: pA.data || [], teamB: pB.data || [] });
                                setMatchStartDialog({
                                  open: true,
                                  matchId: match.id,
                                  teamAId: match.team_a_id,
                                  teamBId: match.team_b_id,
                                  teamAName: match.team_a?.name || '',
                                  teamBName: match.team_b?.name || '',
                                });
                              }
                            }}
                            className="px-6 py-2.5 bg-slate-900 hover:bg-orange-600 rounded-full text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                          >
                            {match.status === 'live' ? 'Scoring' : 'Start'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600">
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {match.status === 'completed' ? 'View' : 'Details'}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* 5️⃣ FIXTURES TAB (ROADMAP & SCHEDULE) */}
          <TabsContent value="fixtures" className="mt-6 focus-visible:outline-none ring-0 border-0">
            {/* Fixture Generator Card */}
            {isOrganizer && matches.length === 0 && (
              <Card className="mb-6 rounded-[28px] border-2 border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-orange-500" />
                    Generate Fixtures
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tournament Format</label>
                    <select
                      value={fixtureType}
                      onChange={(e) => setFixtureType(e.target.value)}
                      className="w-full h-12 px-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:border-orange-500 focus:ring-0 outline-none transition-colors"
                    >
                      <option value="League">🏆 League (Round Robin)</option>
                      <option value="Knockout">⚔️ Knockout (Single Elimination)</option>
                      <option value="League + Knockout">🏆+⚔️ League + Knockout</option>
                      <option value="Group + Knockout">👥+⚔️ Group + Knockout</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      {fixtureType === 'League' && 'Every team plays every other team once. Best for accuracy.'}
                      {fixtureType === 'Knockout' && 'Single elimination bracket. Lose once = out. Fast & dramatic.'}
                      {fixtureType === 'League + Knockout' && 'Round robin first, then top 4 play knockout.'}
                      {fixtureType === 'Group + Knockout' && 'Teams split into groups, winners advance to knockout.'}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleGenerateFixtures(fixtureType)}
                    disabled={teams.length < 2 || loading}
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 rounded-2xl text-white font-black uppercase tracking-widest text-xs"
                  >
                    {loading ? 'Generating...' : `Generate ${fixtureType} Fixtures`}
                  </Button>
                  <p className="text-[9px] text-slate-400 text-center">
                    {teams.length} teams registered • {teams.length < 2 ? 'Need at least 2 teams' : `Will create ${fixtureType === 'League' ? (teams.length * (teams.length - 1)) / 2 : teams.length - 1}+ matches`}
                  </p>
                </CardContent>
              </Card>
            )}

            {matches.length === 0 && !isOrganizer ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                <Trophy className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 text-center px-8 leading-relaxed">
                  No fixtures generated yet.<br />
                  <span className="text-[10px] font-medium lowercase">Check back later for the match schedule.</span>
                </p>
              </div>
            ) : matches.length > 0 ? (
              <div className="space-y-6">
                {/* Group matches by round */}
                {(() => {
                  const roundsMap: Record<string, Match[]> = {};
                  matches.forEach(m => {
                    const key = m.round_name || `Round ${m.round_number || 1}`;
                    if (!roundsMap[key]) roundsMap[key] = [];
                    roundsMap[key].push(m);
                  });

                  return Object.entries(roundsMap)
                    .sort((a, b) => {
                      const aNum = matches.find(m => m.round_name === a[0])?.round_number || 0;
                      const bNum = matches.find(m => m.round_name === b[0])?.round_number || 0;
                      return aNum - bNum;
                    })
                    .map(([roundName, roundMatches]) => (
                      <div key={roundName} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        {/* Round Header */}
                        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{roundName}</span>
                          <span className="text-[9px] text-slate-400 ml-auto">{roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}</span>
                        </div>

                        {/* Matches List */}
                        <div className="divide-y divide-slate-50">
                          {roundMatches
                            .sort((a, b) => Number(a.match_number) - Number(b.match_number))
                            .map((match, idx) => {
                              const isLive = match.status === 'live';
                              const isDone = match.status === 'completed';
                              const teamAWon = isDone && match.team_a_score > match.team_b_score;
                              const teamBWon = isDone && match.team_b_score > match.team_a_score;

                              return (
                                <div
                                  key={match.id}
                                  onClick={() => navigate(isDone ? `/match-summary/${match.id}` : `/matches/${match.id}/spectate`)}
                                  className={cn(
                                    "flex items-center px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors gap-2",
                                    isLive && "bg-orange-50"
                                  )}
                                >
                                  {/* Match Number */}
                                  <div className="w-6 text-center">
                                    <span className="text-[9px] font-black text-slate-300">#{match.match_number || idx + 1}</span>
                                  </div>

                                  {/* Team A */}
                                  <div className={cn(
                                    "flex-1 flex items-center gap-2 min-w-0",
                                    teamBWon && "opacity-50"
                                  )}>
                                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                      {match.team_a?.logo_url ? (
                                        <img src={match.team_a.logo_url} className="w-full h-full object-cover" />
                                      ) : (
                                        <Trophy className="w-3 h-3 text-slate-300" />
                                      )}
                                    </div>
                                    <span className={cn(
                                      "text-[10px] font-bold truncate",
                                      teamAWon ? "text-green-600" : "text-slate-700"
                                    )}>
                                      {match.team_a?.name || 'TBD'}
                                    </span>
                                  </div>

                                  {/* Score / VS */}
                                  <div className="w-16 text-center flex-shrink-0">
                                    {isDone ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <span className={cn("text-xs font-black", teamAWon ? "text-green-600" : "text-slate-400")}>
                                          {match.team_a_score}
                                        </span>
                                        <span className="text-[8px] text-slate-300">-</span>
                                        <span className={cn("text-xs font-black", teamBWon ? "text-green-600" : "text-slate-400")}>
                                          {match.team_b_score}
                                        </span>
                                      </div>
                                    ) : isLive ? (
                                      <Badge className="bg-red-500 text-white text-[7px] px-1.5 py-0 animate-pulse">LIVE</Badge>
                                    ) : (
                                      <span className="text-[9px] font-bold text-slate-300">VS</span>
                                    )}
                                  </div>

                                  {/* Team B */}
                                  <div className={cn(
                                    "flex-1 flex items-center gap-2 min-w-0 justify-end",
                                    teamAWon && "opacity-50"
                                  )}>
                                    <span className={cn(
                                      "text-[10px] font-bold truncate text-right",
                                      teamBWon ? "text-green-600" : "text-slate-700"
                                    )}>
                                      {match.team_b?.name || 'TBD'}
                                    </span>
                                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                      {match.team_b?.logo_url ? (
                                        <img src={match.team_b.logo_url} className="w-full h-full object-cover" />
                                      ) : (
                                        <Trophy className="w-3 h-3 text-slate-300" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Arrow */}
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ));
                })()}
              </div>
            ) : null}
          </TabsContent>

          {/* 5️⃣ TEAMS TAB */}
          <TabsContent value="teams" className="mt-6 space-y-6 focus-visible:outline-none ring-0 border-0">
            {isOrganizer && (
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manage Contenders</span>
                <AddTeamDialog
                  tournamentId={id!}
                  onTeamAdded={fetchTournamentData}
                />
              </div>
            )}

            {teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                  <UserPlus className="w-8 h-8" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No teams registered yet</p>
                {isOrganizer && (
                  <p className="text-[9px] font-medium text-slate-400 mt-2">Add teams to generate match schedules automatically</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    onClick={() => navigate(`/teams/${team.teams.id}`)}
                    className="bg-white p-6 rounded-[32px] border-2 border-slate-100 flex items-center justify-between shadow-sm hover:border-orange-500/20 hover:shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner">
                        {team.teams.logo_url ? (
                          <img src={team.teams.logo_url} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-black text-slate-200 uppercase">{team.teams.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black italic uppercase tracking-tight text-slate-900">{team.teams.name}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Roster: {team.teams.captain_name} (CPT)</span>
                      </div>
                    </div>
                    {isOrganizer && (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeamId(team.teams.id);
                          setAddPlayerOpen(true);
                        }} className="text-orange-600 hover:bg-orange-50 rounded-xl">
                          Add Player
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTeam(team.id, team.teams.name);
                        }} className="text-red-600 hover:bg-red-50 rounded-xl p-2">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
            }
          </TabsContent >

          {/* 5️⃣ POINTS TAB (CLEAN TABLE) */}
          < TabsContent value="points" className="mt-6 focus-visible:outline-none ring-0 border-0" >
            <div className="bg-white rounded-[32px] border-2 border-slate-100 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-16 text-[10px] font-black uppercase tracking-widest text-slate-400 py-6 pl-8">Rank</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">Team</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">P</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">W</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">L</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 py-6 pr-8">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-[10px] font-black uppercase tracking-widest text-slate-300">
                        No team standings available
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((team, index) => (
                      <TableRow key={team.id} className={cn("border-slate-50 hover:bg-slate-50/50 transition-colors", index < 4 && "bg-orange-50/10")}>
                        <TableCell className="pl-8 py-5">
                          <span className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black italic tracking-tighter",
                            index === 0 ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-slate-50 text-slate-500"
                          )}>
                            #{index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner uppercase font-black text-[10px] text-slate-300">
                              {team.teams.logo_url ? <img src={team.teams.logo_url} className="w-full h-full object-cover" /> : team.teams.name.charAt(0)}
                            </div>
                            <span className="text-sm font-black italic uppercase tracking-tight text-slate-900">{team.teams.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm font-black italic text-slate-500">{team.wins + team.losses}</TableCell>
                        <TableCell className="text-center text-sm font-black italic text-green-600">{team.wins}</TableCell>
                        <TableCell className="text-center text-sm font-black italic text-red-500">{team.losses}</TableCell>
                        <TableCell className="text-right pr-8 py-5">
                          <span className="text-sm font-black italic text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
                            {team.points}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent >

          {/* 6️⃣ STATS TAB (MINIMAL MVP) */}
          < TabsContent value="stats" className="mt-6 space-y-4 focus-visible:outline-none ring-0 border-0" >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Top Raider */}
              <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 relative overflow-hidden group hover:border-orange-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <Swords className="w-6 h-6" />
                  </div>
                  <Trophy className="w-5 h-5 text-slate-100 group-hover:text-orange-200 transition-colors" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Top Raider</p>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900 leading-none truncate">
                  {heroes.topRaider ? heroes.topRaider.players.name : 'Pending...'}
                </h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Points</span>
                  <span className="text-2xl font-black italic tracking-tighter text-orange-600">
                    {heroes.topRaider ? heroes.topRaider.total_raid_points : '0'}
                  </span>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
                  <Swords className="w-24 h-24" />
                </div>
              </div>

              {/* Top Defender */}
              <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 relative overflow-hidden group hover:border-blue-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Activity className="w-6 h-6" />
                  </div>
                  <Trophy className="w-5 h-5 text-slate-100 group-hover:text-blue-200 transition-colors" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Top Defender</p>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900 leading-none truncate">
                  {heroes.topDefender ? heroes.topDefender.players.name : 'Pending...'}
                </h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tackle Points</span>
                  <span className="text-2xl font-black italic tracking-tighter text-blue-600">
                    {heroes.topDefender ? heroes.topDefender.total_tackle_points : '0'}
                  </span>
                </div>
              </div>

              {/* MVP */}
              <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 relative overflow-hidden group hover:border-green-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <Circle className="w-5 h-5 text-slate-100 group-hover:text-green-200 transition-colors" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Most Valuable Player</p>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900 leading-none truncate">
                  {heroes.mvp ? heroes.mvp.players.name : 'Pending...'}
                </h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Score</span>
                  <span className="text-2xl font-black italic tracking-tighter text-green-600">
                    {heroes.mvp ? heroes.mvp.total_points : '0'}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent >

          {/* 7️⃣ INFO TAB (CONSOLIDATED) */}
          < TabsContent value="info" className="mt-6 space-y-6 focus-visible:outline-none ring-0 border-0" >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {/* Format & Rules */}
              <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 space-y-6 shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                      <Settings className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900">Match Rules</h3>
                  </div>
                  <div className="space-y-4 bg-white p-6 rounded-[32px] border-2 border-slate-50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {tournament.tournament_type || 'League'} • {tournament.category || 'Open'}
                      </p>
                      <div className="px-2 py-0.5 bg-orange-50 rounded-lg">
                        <span className="text-[9px] font-black uppercase text-orange-600 tracking-tighter">Official Rules</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border-2 border-transparent hover:border-orange-100 transition-colors">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block leading-none mb-1">Duration</span>
                        <p className="text-sm font-black italic uppercase text-slate-900 leading-none">
                          {tournament.match_format?.half_duration || tournament.rules_json?.half_duration || '20'} <span className="text-[10px] lowercase italic font-medium ml-0.5">mins</span>
                        </p>
                      </div>
                      <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border-2 border-transparent hover:border-orange-100 transition-colors">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block leading-none mb-1">Players</span>
                        <p className="text-sm font-black italic uppercase text-slate-900 leading-none">
                          {tournament.match_format?.players_per_team || tournament.rules_json?.players_per_team || '7'} <span className="text-[10px] lowercase italic font-medium ml-0.5">active</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/50">
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Golden Raid</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                          tournament.rules_json?.advanced_rules?.golden_raid !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-400"
                        )}>
                          {tournament.rules_json?.advanced_rules?.golden_raid !== false ? "Enabled" : "Disabled"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/50">
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Review System</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                          tournament.rules_json?.advanced_rules?.review_system
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-400"
                        )}>
                          {tournament.rules_json?.advanced_rules?.review_system ? "VAR Available" : "Standard"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Subs</span>
                          <span className="text-xs font-black italic text-slate-800">{tournament.rules_json?.advanced_rules?.max_subs || '5'}</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Timeouts</span>
                          <span className="text-xs font-black italic text-slate-800">{tournament.rules_json?.advanced_rules?.timeouts_per_half || '2'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                      <Settings className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Venue & Safety</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-black uppercase tracking-tight text-slate-500 truncate">{tournament.ground}, {tournament.city}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-black uppercase tracking-tight text-slate-500">Starts {format(new Date(tournament.start_date), 'MMMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organizer & Sponsors */}
              <div className="space-y-6">
                <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/50">Chief Organizer</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black italic border border-white/10 uppercase">
                      {tournament.organizer_name.charAt(0)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-black italic uppercase tracking-tight">{tournament.organizer_name}</span>
                      <div className="flex items-center gap-3 opacity-60">
                        <Phone className="w-3 h-3" />
                        <span className="text-[10px] font-black tracking-widest">{tournament.organizer_phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 space-y-6 shadow-sm">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Powered By</h3>
                  {sponsors.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No Sponsors Yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      {sponsors.map(sponsor => (
                        <div key={sponsor.id} className="w-12 h-12 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
                          {sponsor.image_url ? (
                            <img src={sponsor.image_url} alt={sponsor.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-[10px]">
                              {sponsor.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent >
        </Tabs >
      </div >

      {/* FOOTER DIALOGS */}
      {
        selectedTeamId && (
          <AddPlayerDialog
            teamId={selectedTeamId}
            open={addPlayerOpen}
            setOpen={setAddPlayerOpen}
            onPlayerAdded={() => {
              toast({ title: "Success", description: "Player added to team successfully" });
              fetchTournamentData();
            }}
          />
        )
      }

      {
        matchStartDialog && (
          <MatchStartDialog
            matchId={matchStartDialog.matchId}
            teamAId={matchStartDialog.teamAId}
            teamBId={matchStartDialog.teamBId}
            teamAName={matchStartDialog.teamAName}
            teamBName={matchStartDialog.teamBName}
            playersA={playersForMatch.teamA}
            playersB={playersForMatch.teamB}
            open={matchStartDialog.open}
            onOpenChange={(open) => { if (!open) setMatchStartDialog(null); }}
          />
        )
      }

      {
        tournament && (
          <EditTournamentDialog
            tournament={tournament}
            open={editTournamentOpen}
            onOpenChange={setEditTournamentOpen}
            onSuccess={fetchTournamentData}
          />
        )
      }

      <BottomNav />
    </div >
  );
};

export default TournamentDetail;
