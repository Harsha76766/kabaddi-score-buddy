import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

const matchSchema = z.object({
  match_name: z.string().min(2, "Match name must be at least 2 characters"),
  team_a_id: z.string().uuid("Please select Team A"),
  team_b_id: z.string().uuid("Please select Team B"),
  venue: z.string().min(2, "Venue must be at least 2 characters"),
  match_type: z.enum(["friendly", "tournament"]),
  match_date: z.string(),
}).refine((data) => data.team_a_id !== data.team_b_id, {
  message: "Teams must be different",
  path: ["team_b_id"],
});

const CreateMatch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    match_name: "",
    team_a_id: "",
    team_b_id: "",
    venue: "",
    match_type: "friendly",
    match_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading teams",
        description: error.message,
      });
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = matchSchema.parse(formData);
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("matches")
        .insert([{
          match_name: validated.match_name,
          team_a_id: validated.team_a_id,
          team_b_id: validated.team_b_id,
          venue: validated.venue,
          match_type: validated.match_type,
          match_date: validated.match_date,
          status: "live",
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Match created!",
        description: "Redirecting to live scoring...",
      });

      navigate(`/match/${data.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating match",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Create Match</h1>
            <p className="text-white/80">Set up a new Kabaddi match</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Match Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="match_name">Match Name</Label>
                <Input
                  id="match_name"
                  value={formData.match_name}
                  onChange={(e) => setFormData({ ...formData, match_name: e.target.value })}
                  placeholder="Warriors vs Titans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team_a">Team A</Label>
                  <Select
                    value={formData.team_a_id}
                    onValueChange={(value) => setFormData({ ...formData, team_a_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team A" />
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

                <div className="space-y-2">
                  <Label htmlFor="team_b">Team B</Label>
                  <Select
                    value={formData.team_b_id}
                    onValueChange={(value) => setFormData({ ...formData, team_b_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team B" />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Stadium name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="match_type">Match Type</Label>
                  <Select
                    value={formData.match_type}
                    onValueChange={(value: any) => setFormData({ ...formData, match_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="tournament">Tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match_date">Date</Label>
                  <Input
                    id="match_date"
                    type="date"
                    value={formData.match_date}
                    onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Start Match"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateMatch;
