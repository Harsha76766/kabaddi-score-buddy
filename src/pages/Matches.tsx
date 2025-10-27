import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

const Matches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
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
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/match/${match.id}/summary`)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{match.match_name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(match.match_date), 'PPP')}</span>
                </div>
                {match.venue && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{match.venue}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Status:</span>{" "}
                    <span className={`capitalize ${
                      match.status === 'completed' ? 'text-success' : 
                      match.status === 'live' ? 'text-primary' : 
                      'text-muted-foreground'
                    }`}>
                      {match.status}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Score:</span> {match.team_a_score} - {match.team_b_score}
                  </div>
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
