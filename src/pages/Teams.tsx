import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Users, Trophy, Target, ChevronRight, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
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
        .select(`
          *,
          players:players(count)
        `)
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

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.captain_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white pb-24">
      {/* Header */}
      <div className="bg-[#050508] border-b border-white/5 p-6 pb-16 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 p-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tight">My Teams</h1>
              <p className="text-white/70 text-sm">{teams.length} teams registered</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 -mt-8">
        {/* Create Team Button */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-14 bg-white/[0.03] rounded-2xl border border-dashed border-orange-500/30 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all mb-6">
              <Plus className="w-5 h-5 mr-2" />
              <span className="font-black uppercase tracking-widest text-xs">Create New Team</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[32px] border-0 shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-600" />
                Create Team
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Team Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Thunder Warriors"
                  className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Captain Name</Label>
                <Input
                  value={formData.captain_name}
                  onChange={(e) => setFormData({ ...formData, captain_name: e.target.value })}
                  placeholder="Rahul Chaudhari"
                  className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-14 bg-orange-600 hover:bg-orange-700 rounded-2xl text-xs font-black uppercase tracking-widest">
                Create Team
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Teams List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-600 border-t-transparent"></div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <Card className="rounded-3xl border border-white/10 bg-white/[0.03] shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-white/30" />
              </div>
              <p className="text-white/40 text-center font-medium">
                {searchQuery ? "No teams found" : "No teams yet. Create your first team!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTeams.map((team) => (
              <Card
                key={team.id}
                className="rounded-3xl border border-white/10 bg-white/[0.03] shadow-md hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    {/* Team Logo/Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg shadow-orange-500/20">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-full h-full rounded-2xl object-cover" />
                      ) : (
                        getInitials(team.name)
                      )}
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 ml-4 min-w-0">
                      <h3 className="font-black text-white text-lg truncate group-hover:text-orange-600 transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-sm text-white/40 truncate">
                        Captain: <span className="font-semibold text-white/60">{team.captain_name}</span>
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-bold text-white/50">{team.players?.[0]?.count || 0} players</span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
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

export default Teams;

