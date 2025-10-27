import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy } from "lucide-react";

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
        .select(`
          *,
          team_a:teams!matches_team_a_id_fkey(name),
          team_b:teams!matches_team_b_id_fkey(name)
        `)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-accent">Live</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Matches</h1>
            <p className="text-white/80">Match history and results</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No matches yet. Create your first match to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match) => (
              <Card
                key={match.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  if (match.status === "live") {
                    navigate(`/match/${match.id}`);
                  } else if (match.status === "completed") {
                    navigate(`/match/${match.id}/summary`);
                  }
                }}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{match.match_name}</CardTitle>
                    {getStatusBadge(match.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {match.venue} • {new Date(match.match_date).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <p className="text-sm font-medium">{match.team_a?.name}</p>
                      <p className="text-3xl font-bold text-team-red">{match.team_a_score}</p>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">VS</div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{match.team_b?.name}</p>
                      <p className="text-3xl font-bold text-team-blue">{match.team_b_score}</p>
                    </div>
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

export default Matches;
