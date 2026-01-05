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
import { AddTeamDialog } from "@/components/AddTeamDialog";

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
          status: "upcoming",
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Match created!",
        description: "Setting up players and toss...",
      });

      // Navigate to the tournament detail or same page with setup open
      // For individual matches, we'll redirect to a setup flow
      navigate(`/matches/${data.id}/score`, { state: { setup: true } });
    } catch (error: any) {
      let errorMessage = error.message;
      if (error instanceof z.ZodError) {
        errorMessage = error.errors[0].message;
      }
      toast({
        variant: "destructive",
        title: "Error creating match",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FF5722] p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center justify-center relative w-full mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="absolute left-0 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight">Create Match</h1>
            <p className="text-white/90 text-sm mt-1">Set up a new Kabaddi match</p>
          </div>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-white pb-2 pt-8 px-8">
            <CardTitle className="text-2xl font-bold text-slate-800">Match Details</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <form onSubmit={handleCreateMatch} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="match_name" className="text-slate-600 font-semibold ml-1 text-sm uppercase tracking-wider">Match Name</Label>
                <Input
                  id="match_name"
                  value={formData.match_name}
                  onChange={(e) => setFormData({ ...formData, match_name: e.target.value })}
                  placeholder="Warriors vs Titans"
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-lg font-medium rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="team_a" className="text-slate-600 font-semibold text-sm uppercase tracking-wider">Team A</Label>
                    <AddTeamDialog tournamentId="" onTeamAdded={fetchTeams} />
                  </div>
                  <Select
                    value={formData.team_a_id}
                    onValueChange={(value) => setFormData({ ...formData, team_a_id: value })}
                  >
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium">
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
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="team_b" className="text-slate-600 font-semibold text-sm uppercase tracking-wider">Team B</Label>
                    <AddTeamDialog tournamentId="" onTeamAdded={fetchTeams} />
                  </div>
                  <Select
                    value={formData.team_b_id}
                    onValueChange={(value) => setFormData({ ...formData, team_b_id: value })}
                  >
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium">
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
                <Label htmlFor="venue" className="text-slate-600 font-semibold ml-1 text-sm uppercase tracking-wider">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Stadium name"
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="match_type" className="text-slate-600 font-semibold ml-1 text-sm uppercase tracking-wider">Match Type</Label>
                  <Select
                    value={formData.match_type}
                    onValueChange={(value: any) => setFormData({ ...formData, match_type: value })}
                  >
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="tournament">Tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match_date" className="text-slate-600 font-semibold ml-1 text-sm uppercase tracking-wider">Date</Label>
                  <Input
                    id="match_date"
                    type="date"
                    value={formData.match_date}
                    onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-14 bg-[#FF5722] hover:bg-[#F4511E] text-white text-lg font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95" disabled={loading}>
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
