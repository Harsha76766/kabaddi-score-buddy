import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, PlayCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

const Matches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      await fetchMatches();
    };
    init();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading matches",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Smart detection: Check if match should be considered finished
  const isMatchEffectivelyFinished = (match: any) => {
    if (match.status === 'completed') return true;
    if (match.current_half === 2 && match.current_timer === 0) return true;
    if (match.ended_at) return true;
    return false;
  };

  // Get display status
  const getDisplayStatus = (match: any) => {
    if (match.status === 'completed') return 'completed';
    if (isMatchEffectivelyFinished(match)) return 'finished';
    return match.status;
  };

  // Handle ending a match manually
  const handleEndMatch = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();

    if (!window.confirm("Mark this match as completed? This will finalize the scores.")) return;

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          is_timer_running: false
        })
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "Match Completed",
        description: "Match has been marked as completed.",
      });

      fetchMatches();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white pb-20">
      <div className="bg-[#050508] border-b border-white/5 p-6">
        <h1 className="text-2xl font-bold mb-2">My Matches</h1>
        <p className="text-white/60">View your match history</p>
      </div>

      <div className="p-4 -mt-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/[0.03] border border-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <Card className="bg-white/[0.03] border border-white/10">
            <CardContent className="pt-6 text-center">
              <p className="text-white/40">No matches found</p>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => {
            const displayStatus = getDisplayStatus(match);
            const isFinished = displayStatus === 'completed' || displayStatus === 'finished';
            const showEndButton = !match.status?.includes('completed') && match.created_by === currentUserId && isMatchEffectivelyFinished(match);

            return (
              <Card
                key={match.id}
                className="bg-white/[0.03] border border-white/10 hover:border-orange-500/30 transition-all cursor-pointer"
                onClick={() => {
                  if (isFinished) {
                    navigate(`/match-summary/${match.id}`);
                  } else {
                    navigate(`/matches/${match.id}/spectate`);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 text-white">{match.match_name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(match.match_date), 'PPP')}</span>
                      </div>
                      {match.venue && (
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <MapPin className="h-4 w-4" />
                          <span>{match.venue}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant={isFinished ? 'default' : displayStatus === 'live' ? 'destructive' : 'secondary'}>
                      {isFinished ? 'completed' : displayStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-white">
                      Score: <span className="text-orange-500">{match.team_a_score}</span> - <span className="text-blue-400">{match.team_b_score}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {showEndButton && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleEndMatch(e, match.id)}
                          className="gap-2 border-green-500/50 text-green-400 hover:bg-green-500/10"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          End Match
                        </Button>
                      )}
                      {!isFinished && match.created_by === currentUserId && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/matches/${match.id}/score`);
                          }}
                          className="gap-2 bg-primary hover:bg-primary/90"
                        >
                          <PlayCircle className="h-4 w-4" />
                          {match.status === 'live' ? 'Continue' : 'Start'} Scoring
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Matches;
