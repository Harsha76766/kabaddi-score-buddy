import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy } from "lucide-react";

const MatchSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<any>(null);
  const [teamA, setTeamA] = useState<any>(null);
  const [teamB, setTeamB] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchData();
  }, [id]);

  const fetchMatchData = async () => {
    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", id)
        .single();

      if (matchError) throw matchError;
      setMatch(matchData);

      const [teamARes, teamBRes] = await Promise.all([
        supabase.from("teams").select("*").eq("id", matchData.team_a_id).single(),
        supabase.from("teams").select("*").eq("id", matchData.team_b_id).single(),
      ]);

      if (teamARes.error) throw teamARes.error;
      if (teamBRes.error) throw teamBRes.error;

      setTeamA(teamARes.data);
      setTeamB(teamBRes.data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading match",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const winner =
    match?.team_a_score > match?.team_b_score
      ? teamA
      : match?.team_a_score < match?.team_b_score
      ? teamB
      : null;

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
            <h1 className="text-3xl font-bold text-white">Match Summary</h1>
            <p className="text-white/80">Final Results</p>
          </div>
        </div>

        {winner && (
          <Card className="bg-accent/20 border-accent backdrop-blur-sm">
            <CardContent className="flex items-center justify-center py-6">
              <Trophy className="w-8 h-8 text-accent mr-3" />
              <p className="text-2xl font-bold text-white">
                {winner.name} Wins!
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-center text-white text-2xl">
              {match?.match_name}
            </CardTitle>
            <p className="text-center text-white/80 text-sm">
              {match?.venue} • {new Date(match?.match_date).toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <h3 className="text-white font-bold text-xl mb-2">{teamA?.name}</h3>
                <div className="text-6xl font-bold text-team-red">{match?.team_a_score}</div>
              </div>

              <div className="text-center text-white text-2xl font-bold">Final</div>

              <div className="text-center">
                <h3 className="text-white font-bold text-xl mb-2">{teamB?.name}</h3>
                <div className="text-6xl font-bold text-team-blue">{match?.team_b_score}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/matches")}
            className="flex-1 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            View All Matches
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="flex-1 bg-white text-primary hover:bg-white/90"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MatchSummary;
