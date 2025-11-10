import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Trophy, Target, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editJersey, setEditJersey] = useState("");
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleEditPlayer = (player: any) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditJersey(player.jersey_number?.toString() || "");
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer) return;
    
    setSaving(true);
    try {
      const updateData: any = { name: editName };
      if (editJersey) {
        updateData.jersey_number = parseInt(editJersey);
      }

      const { error } = await supabase
        .from("players")
        .update(updateData)
        .eq("id", editingPlayer.id);

      if (error) throw error;

      toast({
        title: "Player Updated!",
        description: "Player information has been updated successfully",
      });

      setEditingPlayer(null);
      fetchTeamDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update player",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!deletePlayerId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({ team_id: null, jersey_number: null })
        .eq("id", deletePlayerId);

      if (error) throw error;

      toast({
        title: "Player Removed!",
        description: "Player has been removed from the team",
      });

      setDeletePlayerId(null);
      fetchTeamDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to remove player",
        description: error.message,
      });
    } finally {
      setSaving(false);
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{player.name}</p>
                          {player.jersey_number && (
                            <Badge variant="secondary" className="text-xs">
                              #{player.jersey_number}
                            </Badge>
                          )}
                        </div>
                        {player.phone && (
                          <p className="text-sm text-muted-foreground">{player.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <Badge variant="outline">
                          {player.matches_played || 0} matches
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(player.total_raid_points || 0) + 
                           (player.total_tackle_points || 0) + 
                           (player.total_bonus_points || 0)} pts
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPlayer(player)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletePlayerId(player.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Player Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-jersey">Jersey Number</Label>
              <Input
                id="edit-jersey"
                type="number"
                min="1"
                max="99"
                value={editJersey}
                onChange={(e) => setEditJersey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlayer(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePlayerId} onOpenChange={() => setDeletePlayerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player from Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the player from this team. The player will still exist in the system and can be added to teams again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlayer} disabled={saving}>
              {saving ? "Removing..." : "Remove Player"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamDetail;
