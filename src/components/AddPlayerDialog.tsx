import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Phone, Link as LinkIcon, MessageCircle, QrCode } from "lucide-react";
import { z } from "zod";

const playerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  jerseyNumber: z.number().int().positive().optional(),
});

interface AddPlayerDialogProps {
  teamId: string;
  onPlayerAdded: () => void;
}

export const AddPlayerDialog = ({ teamId, onPlayerAdded }: AddPlayerDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [isFetchingPlayer, setIsFetchingPlayer] = useState(false);

  const handlePhoneChange = async (value: string) => {
    setPlayerPhone(value);
    
    // Auto-fetch player if phone is 10 digits or more
    if (value.length >= 10) {
      setIsFetchingPlayer(true);
      try {
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('name')
          .eq('phone', value)
          .maybeSingle();

        if (existingPlayer) {
          setPlayerName(existingPlayer.name);
        }
      } catch (error) {
        console.error('Error fetching player:', error);
      } finally {
        setIsFetchingPlayer(false);
      }
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = playerSchema.parse({ 
        name: playerName, 
        phone: playerPhone,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined
      });
      setLoading(true);

      // Check if player already exists by phone number
      if (playerPhone) {
        const { data: existingPlayer } = await supabase
          .from("players")
          .select("*")
          .eq("phone", playerPhone)
          .maybeSingle();

        if (existingPlayer) {
          // Player exists, just update team_id
          const { error } = await supabase
            .from("players")
            .update({ team_id: teamId })
            .eq("id", existingPlayer.id);

          if (error) throw error;

          toast({
            title: "Player Added!",
            description: `${existingPlayer.name} has been added to the team`,
          });

          setPlayerName("");
          setPlayerPhone("");
          onPlayerAdded();
          setOpen(false);
          setLoading(false);
          return;
        }
      }

      // Create new player
      const { error } = await supabase.from('players').insert({
        name: validated.name,
        phone: playerPhone || null,
        jersey_number: validated.jerseyNumber || null,
        team_id: teamId,
      });

      if (error) throw error;

      toast({
        title: "Player Added!",
        description: `${validated.name} has been added to the team`,
      });

      setPlayerName("");
      setPlayerPhone("");
      onPlayerAdded();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add player",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteLink = `${window.location.origin}/join-team?code=${inviteCode}&team=${teamId}`;
      
      await navigator.clipboard.writeText(inviteLink);
      
      toast({
        title: "Invite Link Copied!",
        description: "Share this link with players to join the team",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to generate link",
        description: "Please try again",
      });
    }
  };

  const shareViaWhatsApp = () => {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteLink = `${window.location.origin}/join-team?code=${inviteCode}&team=${teamId}`;
    const message = `Join my Kabaddi team on RaidBook! Click here: ${inviteLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Phone className="h-4 w-4" />
        Add Player
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Players to Team</DialogTitle>
          </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual">
              <Phone className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="link">
              <LinkIcon className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <p className="text-sm text-muted-foreground">Add player by entering their details</p>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="player-name">Player Name</Label>
                <Input
                  id="player-name"
                  placeholder="Enter player name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-phone">Phone Number (Optional)</Label>
                <Input
                  id="player-phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={playerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={isFetchingPlayer}
                />
                {isFetchingPlayer && <p className="text-xs text-muted-foreground">Checking for existing player...</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="jersey-number">Jersey Number (Optional)</Label>
                <Input
                  id="jersey-number"
                  type="number"
                  placeholder="7"
                  min="1"
                  max="99"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Player"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <p className="text-sm text-muted-foreground">Generate an invite link to share with players</p>
            <Button onClick={generateInviteLink} className="w-full">
              <LinkIcon className="h-4 w-4 mr-2" />
              Generate & Copy Invite Link
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <p className="text-sm text-muted-foreground">Share team invite via WhatsApp</p>
            <Button onClick={shareViaWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              Share on WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="h-24 w-24 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                QR Code feature coming soon!<br />Players will be able to scan to join instantly.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AddPlayerDialog;
