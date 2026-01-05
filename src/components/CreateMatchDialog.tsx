import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { matchSchema } from "@/lib/validation";
import { z } from "zod";

interface CreateMatchDialogProps {
  tournamentId: string;
  teams: Array<{ id: string; name: string }>;
  onMatchCreated: () => void;
}

export const CreateMatchDialog = ({ tournamentId, teams, onMatchCreated }: CreateMatchDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    match_name: "",
    match_number: "",
    team_a_id: "",
    team_b_id: "",
    match_date: "",
    match_time: "",
    venue: "",
    round_name: "",
    group_name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate with Zod
      matchSchema.parse(formData);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('matches').insert({
        tournament_id: tournamentId,
        match_name: formData.match_name,
        match_number: formData.match_number || null,
        team_a_id: formData.team_a_id,
        team_b_id: formData.team_b_id,
        match_date: formData.match_date,
        match_time: formData.match_time || null,
        venue: formData.venue || null,
        round_name: formData.round_name || null,
        group_name: formData.group_name || null,
        status: 'upcoming',
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Match created successfully",
      });

      setOpen(false);
      setFormData({
        match_name: "",
        match_number: "",
        team_a_id: "",
        team_b_id: "",
        match_date: "",
        match_time: "",
        venue: "",
        round_name: "",
        group_name: "",
      });
      onMatchCreated();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to create match",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Create Match
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Match</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="match_name">Match Name</Label>
            <Input
              id="match_name"
              placeholder="Match 1 / Quarter Final"
              value={formData.match_name}
              onChange={(e) => setFormData({ ...formData, match_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="match_number">Match Number (Optional)</Label>
              <Input
                id="match_number"
                type="number"
                placeholder="1"
                value={formData.match_number}
                onChange={(e) => setFormData({ ...formData, match_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="round_name">Round (e.g. Semi Final)</Label>
              <Input
                id="round_name"
                placeholder="Final"
                value={formData.round_name}
                onChange={(e) => setFormData({ ...formData, round_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group_name">Group Name (Optional)</Label>
            <Input
              id="group_name"
              placeholder="Group A"
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="match_time">Time</Label>
              <Input
                id="match_time"
                type="time"
                value={formData.match_time}
                onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue (Optional)</Label>
            <Input
              id="venue"
              placeholder="Stadium Name"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Match"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};