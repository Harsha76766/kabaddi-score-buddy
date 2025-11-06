import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Coins } from "lucide-react";

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
}

interface MatchStartDialogProps {
  matchId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  playersA: Player[];
  playersB: Player[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MatchStartDialog = ({
  matchId,
  teamAId,
  teamBId,
  teamAName,
  teamBName,
  playersA,
  playersB,
  open,
  onOpenChange,
}: MatchStartDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"playing7" | "toss">("playing7");
  const [selectedPlayersA, setSelectedPlayersA] = useState<string[]>([]);
  const [selectedPlayersB, setSelectedPlayersB] = useState<string[]>([]);
  const [tossWinner, setTossWinner] = useState<"A" | "B" | null>(null);
  const [tossChoice, setTossChoice] = useState<"raid" | "defend" | null>(null);
  const [loading, setLoading] = useState(false);

  const togglePlayerA = (playerId: string) => {
    setSelectedPlayersA((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length < 7) {
        return [...prev, playerId];
      }
      return prev;
    });
  };

  const togglePlayerB = (playerId: string) => {
    setSelectedPlayersB((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length < 7) {
        return [...prev, playerId];
      }
      return prev;
    });
  };

  const handleContinueToToss = () => {
    if (selectedPlayersA.length !== 7 || selectedPlayersB.length !== 7) {
      toast({
        variant: "destructive",
        title: "Invalid Selection",
        description: "Please select exactly 7 players for each team",
      });
      return;
    }
    setStep("toss");
  };

  const handleStartMatch = async () => {
    if (!tossWinner || !tossChoice) {
      toast({
        variant: "destructive",
        title: "Incomplete Setup",
        description: "Please complete the toss setup",
      });
      return;
    }

    setLoading(true);
    try {
      // Update match status to live
      const { error } = await supabase
        .from("matches")
        .update({ status: "live" })
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "Match Started!",
        description: "The match is now live",
      });

      // Navigate to live scoring with toss data
      navigate(`/matches/${matchId}/score`, {
        state: {
          playing7A: selectedPlayersA,
          playing7B: selectedPlayersB,
          tossWinner: tossWinner === "A" ? teamAId : teamBId,
          tossChoice,
        },
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to start match",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "playing7" ? "Select Playing 7" : "Toss"}
          </DialogTitle>
        </DialogHeader>

        {step === "playing7" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3 flex items-center justify-between">
                  <span>{teamAName}</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedPlayersA.length}/7 selected
                  </span>
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {playersA.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => togglePlayerA(player.id)}
                      className={`
                        p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all
                        ${
                          selectedPlayersA.includes(player.id)
                            ? "bg-primary/20 border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        }
                      `}
                    >
                      {selectedPlayersA.includes(player.id) ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="text-lg font-bold">
                        {player.jersey_number || "?"}
                      </div>
                      <div className="text-xs text-center truncate w-full">
                        {player.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center justify-between">
                  <span>{teamBName}</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedPlayersB.length}/7 selected
                  </span>
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {playersB.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => togglePlayerB(player.id)}
                      className={`
                        p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all
                        ${
                          selectedPlayersB.includes(player.id)
                            ? "bg-primary/20 border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        }
                      `}
                    >
                      {selectedPlayersB.includes(player.id) ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="text-lg font-bold">
                        {player.jersey_number || "?"}
                      </div>
                      <div className="text-xs text-center truncate w-full">
                        {player.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleContinueToToss}
              className="w-full"
              disabled={selectedPlayersA.length !== 7 || selectedPlayersB.length !== 7}
            >
              Continue to Toss
            </Button>
          </div>
        )}

        {step === "toss" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">Toss Winner</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className={`p-4 cursor-pointer transition-all ${
                      tossWinner === "A"
                        ? "bg-primary/20 border-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setTossWinner("A")}
                  >
                    <div className="flex items-center gap-3">
                      {tossWinner === "A" ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-semibold">{teamAName}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedPlayersA.length} players selected
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card
                    className={`p-4 cursor-pointer transition-all ${
                      tossWinner === "B"
                        ? "bg-primary/20 border-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setTossWinner("B")}
                  >
                    <div className="flex items-center gap-3">
                      {tossWinner === "B" ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-semibold">{teamBName}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedPlayersB.length} players selected
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {tossWinner && (
                <div>
                  <Label className="mb-3 block">Toss Choice</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        tossChoice === "raid"
                          ? "bg-primary/20 border-primary"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setTossChoice("raid")}
                    >
                      <div className="flex items-center gap-3">
                        {tossChoice === "raid" ? (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-semibold">Raid First</div>
                          <div className="text-xs text-muted-foreground">
                            Choose to raid first
                          </div>
                        </div>
                      </div>
                    </Card>
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        tossChoice === "defend"
                          ? "bg-primary/20 border-primary"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setTossChoice("defend")}
                    >
                      <div className="flex items-center gap-3">
                        {tossChoice === "defend" ? (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-semibold">Defend First</div>
                          <div className="text-xs text-muted-foreground">
                            Choose to defend first
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("playing7")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleStartMatch}
                className="flex-1"
                disabled={!tossWinner || !tossChoice || loading}
              >
                {loading ? "Starting..." : "Start Match"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
