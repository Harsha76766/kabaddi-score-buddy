import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, UserPlus } from "lucide-react";
import { z } from "zod";

const playerSchema = z.object({
  name: z.string().min(2, "Player name must be at least 2 characters"),
  team_id: z.string().uuid("Please select a team"),
});

const Players = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    team_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playersRes, teamsRes] = await Promise.all([
        supabase.from("players").select("*, teams(name)").order("total_raid_points", { ascending: false }),
        supabase.from("teams").select("*"),
      ]);

      if (playersRes.error) throw playersRes.error;
      if (teamsRes.error) throw teamsRes.error;

      setPlayers(playersRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = playerSchema.parse(formData);

      const { error } = await supabase.from("players").insert({
        name: validated.name,
        team_id: validated.team_id,
      });

      if (error) throw error;

      toast({
        title: "Player added!",
        description: `${validated.name} has been added successfully.`,
      });

      setFormData({ name: "", team_id: "" });
      setOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding player",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Players</h1>
              <p className="text-white/80">All registered players</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-primary hover:bg-white/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Player</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePlayer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Player Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Player name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Add Player
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : players.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No players yet. Add your first player to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => (
              <Card key={player.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{player.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{player.teams?.name}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Raids:</span>
                    <span className="font-medium text-primary">{player.total_raid_points}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tackles:</span>
                    <span className="font-medium text-secondary">{player.total_tackle_points}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bonus:</span>
                    <span className="font-medium text-accent">{player.total_bonus_points}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Matches:</span>
                    <span className="font-medium">{player.matches_played}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Players;
