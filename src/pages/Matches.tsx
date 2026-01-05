import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, PlayCircle } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-hero p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">My Matches</h1>
        <p className="text-white/80">View your match history</p>
      </div>

      <div className="p-4 -mt-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No matches found</p>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => (
            <Card
              key={match.id}
              className="hover:shadow-lg transition-all cursor-pointer border-slate-200"
              onClick={() => {
                if (match.status === 'completed') {
                  navigate(`/match-summary/${match.id}`);
                } else {
                  navigate(`/matches/${match.id}/spectate`);
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{match.match_name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(match.match_date), 'PPP')}</span>
                    </div>
                    {match.venue && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{match.venue}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={match.status === 'completed' ? 'default' : match.status === 'live' ? 'destructive' : 'secondary'}>
                    {match.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold">
                    Score: <span className="text-primary">{match.team_a_score}</span> - <span className="text-secondary">{match.team_b_score}</span>
                  </div>
                  {match.status !== 'completed' && match.created_by === currentUserId && (
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
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Matches;
