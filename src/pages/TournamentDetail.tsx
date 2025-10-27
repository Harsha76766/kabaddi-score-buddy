import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, Calendar, User, Phone, Mail, Trophy, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { AddTeamDialog } from "@/components/AddTeamDialog";
import AddPlayerDialog from "@/components/AddPlayerDialog";

interface Tournament {
  id: string;
  name: string;
  city: string;
  ground: string;
  organizer_name: string;
  organizer_phone: string;
  organizer_email: string | null;
  organizer_id: string;
  start_date: string;
  end_date: string;
  category: string;
  logo_url: string | null;
}

interface TournamentTeam {
  id: string;
  points: number;
  wins: number;
  losses: number;
  teams: {
    id: string;
    name: string;
    captain_name: string;
  };
}

interface Match {
  id: string;
  match_name: string;
  match_date: string;
  venue: string | null;
  status: string;
  team_a_score: number;
  team_b_score: number;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
}

interface PlayerStats {
  player_id: string;
  total_raid_points: number;
  total_tackle_points: number;
  total_bonus_points: number;
  total_points: number;
  players: {
    name: string;
    teams: { name: string } | null;
  };
}

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTournament(),
      fetchTeams(),
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
    } catch (error) {
      console.error('Error fetching tournament:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_teams')
        .select(`
          id,
          points,
          wins,
          losses,
          teams (
            id,
            name,
            captain_name
          )
        `)
        .eq('tournament_id', id)
        .order('points', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
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
          match_date,
          venue,
          status,
          team_a_score,
          team_b_score,
          team_a:teams!matches_team_a_id_fkey (name),
          team_b:teams!matches_team_b_id_fkey (name)
        `)
        .eq('tournament_id', id)
        .order('match_date', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
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
    } catch (error) {
      console.error('Error fetching player stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
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
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Tournament not found</p>
          <Button onClick={() => navigate('/tournaments')}>Back to Tournaments</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-hero p-6 text-white">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 mb-4"
          onClick={() => navigate('/tournaments')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-start gap-4">
          {tournament.logo_url && (
            <img
              src={tournament.logo_url}
              alt={tournament.name}
              className="w-20 h-20 rounded-lg object-cover border-2 border-white/20"
            />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              {tournament.category}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tournament Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{tournament.city} • {tournament.ground}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(tournament.start_date), 'MMM d, yyyy')} - {format(new Date(tournament.end_date), 'MMM d, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organizer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{tournament.organizer_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{tournament.organizer_phone}</span>
            </div>
            {tournament.organizer_email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{tournament.organizer_email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams" className="mt-4 space-y-4">
            {isOrganizer && (
              <div className="flex justify-end">
                <AddTeamDialog tournamentId={id!} onTeamAdded={fetchTournamentData} />
              </div>
            )}
            
            {teams.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No teams registered yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <Card key={team.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{team.teams.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Captain: {team.teams.captain_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary">{team.points} pts</div>
                            <div className="text-xs text-muted-foreground">
                              {team.wins}W - {team.losses}L
                            </div>
                          </div>
                          {isOrganizer && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTeamId(team.teams.id);
                                setAddPlayerOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add Player
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="matches" className="mt-4">
            {matches.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No matches scheduled yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{match.match_name}</h3>
                        <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                          {match.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{match.team_a?.name || 'TBD'}</span>
                        <span className="font-bold text-lg">
                          {match.team_a_score} - {match.team_b_score}
                        </span>
                        <span className="text-sm">{match.team_b?.name || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(match.match_date), 'MMM dd, yyyy')}
                        </div>
                        {match.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {match.venue}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="leaderboard" className="mt-4">
            {playerStats.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Leaderboard will be available after matches
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Raid</TableHead>
                      <TableHead className="text-right">Tackle</TableHead>
                      <TableHead className="text-right">Bonus</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerStats.map((stat, index) => (
                      <TableRow key={stat.player_id}>
                        <TableCell className="font-medium">
                          {index === 0 && <Trophy className="h-4 w-4 text-yellow-500 inline mr-1" />}
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{stat.players.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {stat.players.teams?.name || 'No Team'}
                        </TableCell>
                        <TableCell className="text-right">{stat.total_raid_points}</TableCell>
                        <TableCell className="text-right">{stat.total_tackle_points}</TableCell>
                        <TableCell className="text-right">{stat.total_bonus_points}</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {stat.total_points}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedTeamId && (
        <AddPlayerDialog
          open={addPlayerOpen}
          onOpenChange={setAddPlayerOpen}
          teamId={selectedTeamId}
          onPlayerAdded={() => {
            toast({
              title: "Success",
              description: "Player added to team successfully",
            });
            setAddPlayerOpen(false);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default TournamentDetail;
