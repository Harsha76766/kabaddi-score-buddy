import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Trophy, Target } from "lucide-react";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    matches: 0,
    wins: 0,
    losses: 0,
    points: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamDetails();
  }, [id]);

  const fetchTeamDetails = async () => {
    try {
      // Fetch team info
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch players
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", id);
      setPlayers(playersData || []);

      // Fetch stats from tournament_teams
      const { data: statsData } = await supabase
        .from("tournament_teams")
        .select("wins, losses, points")
        .eq("team_id", id);

      if (statsData && statsData.length > 0) {
        const totalStats = statsData.reduce(
          (acc, curr) => ({
            wins: acc.wins + (curr.wins || 0),
            losses: acc.losses + (curr.losses || 0),
            points: acc.points + (curr.points || 0),
          }),
          { wins: 0, losses: 0, points: 0 }
        );
        setStats({
          matches: totalStats.wins + totalStats.losses,
          wins: totalStats.wins,
          losses: totalStats.losses,
          points: totalStats.points,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading team details",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Team not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-hero p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4 flex-1">
            {team.logo_url && (
              <Avatar className="h-16 w-16">
                <AvatarImage src={team.logo_url} alt={team.name} />
                <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-white/80">Captain: {team.captain_name}</p>
              {team.captain_phone && (
                <p className="text-white/70 text-sm">{team.captain_phone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.matches}</div>
              <div className="text-sm text-muted-foreground">Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats.wins}</div>
              <div className="text-sm text-muted-foreground">Wins</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold">{stats.losses}</div>
              <div className="text-sm text-muted-foreground">Losses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.points}</div>
              <div className="text-sm text-muted-foreground">Points</div>
            </CardContent>
          </Card>
        </div>

        {/* Players Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Players ({players.length})
              </CardTitle>
              <AddPlayerDialog teamId={id!} onPlayerAdded={fetchTeamDetails} />
            </div>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No players added yet
              </p>
            ) : (
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        {player.phone && (
                          <p className="text-sm text-muted-foreground">{player.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {player.matches_played || 0} matches
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(player.total_raid_points || 0) + 
                         (player.total_tackle_points || 0) + 
                         (player.total_bonus_points || 0)} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDetail;
