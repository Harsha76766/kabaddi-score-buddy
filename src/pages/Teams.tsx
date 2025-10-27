import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { z } from "zod";

const teamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  captain_name: z.string().min(2, "Captain name must be at least 2 characters"),
});

const Teams = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    captain_name: "",
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading teams",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = teamSchema.parse(formData);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("teams").insert({
        name: validated.name,
        captain_name: validated.captain_name,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Team created!",
        description: `${validated.name} has been added successfully.`,
      });

      setFormData({ name: "", captain_name: "" });
      setOpen(false);
      fetchTeams();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating team",
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
              <h1 className="text-3xl font-bold text-white">Teams</h1>
              <p className="text-white/80">Manage your Kabaddi teams</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-primary hover:bg-white/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Warriors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="captain">Captain Name</Label>
                  <Input
                    id="captain"
                    value={formData.captain_name}
                    onChange={(e) => setFormData({ ...formData, captain_name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Team
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No teams yet. Create your first team to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    {team.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Captain: <span className="font-medium text-foreground">{team.captain_name}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
