import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Award, Medal, Trophy } from "lucide-react";

const Leaderboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*, teams(name)")
        .order("total_raid_points", { ascending: false })
        .limit(10);

      if (error) throw error;

      const playersWithTotal = (data || []).map((player) => ({
        ...player,
        total_points:
          player.total_raid_points + player.total_tackle_points + player.total_bonus_points,
      }));

      playersWithTotal.sort((a, b) => b.total_points - a.total_points);
      setPlayers(playersWithTotal);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading leaderboard",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
            <p className="text-white/80">Top performing players</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : players.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Award className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No player stats yet. Play some matches to see the leaderboard!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Top 10 Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    index < 3
                      ? "bg-primary/5 border-2 border-primary/20"
                      : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 flex justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{player.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.teams?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-2xl font-bold text-primary">
                      {player.total_points}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>R: {player.total_raid_points}</span>
                      <span>T: {player.total_tackle_points}</span>
                      <span>B: {player.total_bonus_points}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
