import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";

const LiveMatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<any>(null);
  const [teamA, setTeamA] = useState<any>(null);
  const [teamB, setTeamB] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
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

  const updateScore = async (team: "a" | "b", points: number) => {
    if (!match) return;

    const scoreField = team === "a" ? "team_a_score" : "team_b_score";
    const newScore = match[scoreField] + points;

    try {
      const { error } = await supabase
        .from("matches")
        .update({ [scoreField]: newScore })
        .eq("id", id);

      if (error) throw error;

      setMatch({ ...match, [scoreField]: newScore });

      toast({
        title: `+${points} points`,
        description: `${team === "a" ? teamA?.name : teamB?.name} scored!`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating score",
        description: error.message,
      });
    }
  };

  const endMatch = async () => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Match ended",
        description: "Redirecting to summary...",
      });

      navigate(`/match/${id}/summary`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error ending match",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            onClick={endMatch}
          >
            End Match
          </Button>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-center text-white text-2xl">
              {match?.match_name}
            </CardTitle>
            <p className="text-center text-white/80 text-sm">{match?.venue}</p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <h3 className="text-white font-bold text-xl mb-2">{teamA?.name}</h3>
                <div className="text-6xl font-bold text-team-red">{match?.team_a_score}</div>
              </div>

              <div className="text-center text-white text-3xl font-bold">VS</div>

              <div className="text-center">
                <h3 className="text-white font-bold text-xl mb-2">{teamB?.name}</h3>
                <div className="text-6xl font-bold text-team-blue">{match?.team_b_score}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-team-red/20 border-team-red">
                <CardHeader>
                  <CardTitle className="text-center text-white">
                    {teamA?.name} Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => updateScore("a", 1)}
                    className="h-16 text-lg bg-white text-team-red hover:bg-white/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Raid +1
                  </Button>
                  <Button
                    onClick={() => updateScore("a", 1)}
                    className="h-16 text-lg bg-white text-team-red hover:bg-white/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Tackle +1
                  </Button>
                  <Button
                    onClick={() => updateScore("a", 1)}
                    className="h-16 text-lg bg-white text-team-red hover:bg-white/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Bonus +1
                  </Button>
                  <Button
                    onClick={() => updateScore("a", 2)}
                    className="h-16 text-lg bg-white text-team-red hover:bg-white/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Super +2
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-team-blue/20 border-team-blue">
                <CardHeader>
                  <CardTitle className="text-center text-white">
                    {teamB?.name} Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => updateScore("b", 1)}
                    className="h-16 text-lg bg-white text-team-blue hover:bg-white/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Raid +1
                  </Button>
                  <Button
                    onClick={() => updateScore("b", 1)}
                    className="h-16 text-lg bg-white text-team-blue hover:bg-white/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Tackle +1
                  </Button>
                  <Button
                    onClick={() => updateScore("b", 1)}
                    className="h-16 text-lg bg-white text-team-blue hover:bg-white/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Bonus +1
                  </Button>
                  <Button
                    onClick={() => updateScore("b", 2)}
                    className="h-16 text-lg bg-white text-team-blue hover:bg-white/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Super +2
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveMatch;
