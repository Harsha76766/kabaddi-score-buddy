import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Link2, QrCode, Users } from "lucide-react";

interface AddTeamDialogProps {
  tournamentId: string;
  onTeamAdded: () => void;
}

export const AddTeamDialog = ({ tournamentId, onTeamAdded }: AddTeamDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCaptain, setNewTeamCaptain] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const { toast } = useToast();

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      await fetchMyTeams();
    }
  };

  const fetchMyTeams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("created_by", user.id);
    
    setMyTeams(data || []);
  };

  const handleCreateNewTeam = async () => {
    if (!newTeamName || !newTeamCaptain || !captainPhone) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let logoUrl = null;
    
    // Upload logo if provided
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('team-logos')
        .upload(fileName, logoFile);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('team-logos')
          .getPublicUrl(fileName);
        logoUrl = publicUrl;
      }
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ 
        name: newTeamName, 
        captain_name: newTeamCaptain,
        captain_phone: captainPhone,
        logo_url: logoUrl,
        created_by: user.id 
      })
      .select()
      .single();

    if (teamError || !team) {
      toast({ title: "Failed to create team", variant: "destructive" });
      setLoading(false);
      return;
    }

    await addTeamToTournament(team.id);
  };

  const handleAddExistingTeam = async (teamId: string) => {
    await addTeamToTournament(teamId);
  };

  const addTeamToTournament = async (teamId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("tournament_teams")
      .insert({ tournament_id: tournamentId, team_id: teamId });

    setLoading(false);

    if (error) {
      toast({ title: "Failed to add team", variant: "destructive" });
    } else {
      toast({ title: "Team added successfully!" });
      setOpen(false);
      setNewTeamName("");
      setNewTeamCaptain("");
      onTeamAdded();
    }
  };

  const handleGenerateInviteLink = async () => {
    const inviteCode = Math.random().toString(36).substring(2, 15);
    const link = `${window.location.origin}/join-tournament/${tournamentId}?code=${inviteCode}`;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("team_join_requests").insert({
      team_id: tournamentId,
      tournament_id: tournamentId,
      invite_code: inviteCode,
      created_by: user.id,
    });

    setInviteLink(link);
    navigator.clipboard.writeText(link);
    toast({ title: "Invite link copied to clipboard!" });
  };

  const handleShareWhatsApp = () => {
    if (!inviteLink) return;
    const message = `Join our tournament! ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Team to Tournament</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="new">New Team</TabsTrigger>
            <TabsTrigger value="my-teams">My Teams</TabsTrigger>
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            <div>
              <Label>Team Name</Label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div>
              <Label>Captain Name</Label>
              <Input
                value={newTeamCaptain}
                onChange={(e) => setNewTeamCaptain(e.target.value)}
                placeholder="Enter captain name"
              />
            </div>
            <div>
              <Label>Captain Phone Number</Label>
              <Input
                value={captainPhone}
                onChange={(e) => setCaptainPhone(e.target.value)}
                placeholder="Enter phone number"
                type="tel"
              />
            </div>
            <div>
              <Label>Team Logo (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handleCreateNewTeam} disabled={loading} className="w-full">
              Create & Add Team
            </Button>
          </TabsContent>

          <TabsContent value="my-teams" className="space-y-4">
            {myTeams.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No teams found</p>
            ) : (
              <div className="space-y-2">
                {myTeams.map((team) => (
                  <Card key={team.id} className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{team.name}</h4>
                      <p className="text-sm text-muted-foreground">Captain: {team.captain_name}</p>
                    </div>
                    <Button onClick={() => handleAddExistingTeam(team.id)} disabled={loading}>
                      Add
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <div className="space-y-4">
              <Button onClick={handleGenerateInviteLink} className="w-full gap-2">
                <Link2 className="h-4 w-4" />
                Generate Invite Link
              </Button>
              {inviteLink && (
                <>
                  <div className="p-3 bg-muted rounded-md break-all text-sm">
                    {inviteLink}
                  </div>
                  <Button onClick={handleShareWhatsApp} variant="outline" className="w-full gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Share via WhatsApp
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <QrCode className="h-32 w-32 text-muted-foreground" />
              <p className="text-muted-foreground">QR Code functionality coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
