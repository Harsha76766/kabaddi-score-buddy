import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Phone, Link as LinkIcon, MessageCircle, QrCode, Camera } from "lucide-react";
import { z } from "zod";
import { QRScanner } from "@/components/QRScanner";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

const playerSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
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
  const [showScanner, setShowScanner] = useState(false);
  const [qrInviteLink, setQrInviteLink] = useState("");

  const handlePhoneChange = async (value: string) => {
    setPlayerPhone(value);
    setPlayerName(""); // Clear name when phone changes
    
    // Auto-fetch player if phone is 10 digits or more
    if (value.length >= 10) {
      setIsFetchingPlayer(true);
      try {
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('name, id')
          .eq('phone', value)
          .maybeSingle();

        if (existingPlayer) {
          setPlayerName(existingPlayer.name);
        } else {
          toast({
            variant: "destructive",
            title: "Player not registered",
            description: "This phone number is not registered in the system",
          });
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
    
    if (!playerName) {
      toast({
        variant: "destructive",
        title: "Player not found",
        description: "Please enter a registered phone number",
      });
      return;
    }
    
    try {
      const validated = playerSchema.parse({ 
        phone: playerPhone,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined
      });
      setLoading(true);

      // Check if player exists by phone number
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("*")
        .eq("phone", playerPhone)
        .maybeSingle();

      if (!existingPlayer) {
        toast({
          variant: "destructive",
          title: "Player not registered",
          description: "Only registered players can be added to teams",
        });
        setLoading(false);
        return;
      }

      // Player exists, update team_id and jersey number
      const updateData: any = { team_id: teamId };
      if (validated.jerseyNumber) {
        updateData.jersey_number = validated.jerseyNumber;
      }

      const { error } = await supabase
        .from("players")
        .update(updateData)
        .eq("id", existingPlayer.id);

      if (error) throw error;

      toast({
        title: "Player Added!",
        description: `${existingPlayer.name} has been added to the team`,
      });

      setPlayerName("");
      setPlayerPhone("");
      setJerseyNumber("");
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

  const handleQRScan = async (data: string) => {
    try {
      // Extract phone number from QR code data
      // QR code should contain just the phone number
      const phone = data.trim();
      setShowScanner(false);
      await handlePhoneChange(phone);
      setPlayerPhone(phone);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid QR Code",
        description: "Please scan a valid player registration QR code",
      });
    }
  };

  const generateQRInvite = () => {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteLink = `${window.location.origin}/join-team?code=${inviteCode}&team=${teamId}`;
    setQrInviteLink(inviteLink);
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
            <p className="text-sm text-muted-foreground">Add registered player by phone number</p>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="player-phone">Phone Number</Label>
                <Input
                  id="player-phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={playerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={isFetchingPlayer}
                  required
                />
                {isFetchingPlayer && <p className="text-xs text-muted-foreground">Checking for registered player...</p>}
              </div>
              {playerName && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">Player Found:</p>
                  <p className="text-lg font-bold text-primary">{playerName}</p>
                </div>
              )}
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
            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scan">
                  <Camera className="h-4 w-4 mr-2" />
                  Scan QR
                </TabsTrigger>
                <TabsTrigger value="generate">
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground text-center">
                  Scan a player's registration QR code to add them instantly
                </p>
                {showScanner ? (
                  <QRScanner 
                    onScan={handleQRScan}
                    onError={(error) => {
                      toast({
                        variant: "destructive",
                        title: "Scanner Error",
                        description: error,
                      });
                    }}
                  />
                ) : (
                  <Button onClick={() => setShowScanner(true)} className="w-full gap-2">
                    <Camera className="h-4 w-4" />
                    Open Camera Scanner
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="generate" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground text-center">
                  Generate a QR code for players to scan and join your team
                </p>
                {qrInviteLink ? (
                  <QRCodeDisplay value={qrInviteLink} />
                ) : (
                  <Button onClick={generateQRInvite} className="w-full gap-2">
                    <QrCode className="h-4 w-4" />
                    Generate Team Invite QR
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AddPlayerDialog;
