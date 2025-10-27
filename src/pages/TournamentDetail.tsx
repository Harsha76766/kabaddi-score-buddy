import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Calendar, User, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

interface Tournament {
  id: string;
  name: string;
  city: string;
  ground: string;
  organizer_name: string;
  organizer_phone: string;
  organizer_email: string | null;
  start_date: string;
  end_date: string;
  category: string;
  logo_url: string | null;
}

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 animate-pulse space-y-4">
          <div className="h-48 bg-card rounded-lg" />
          <div className="h-32 bg-card rounded-lg" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Tournament not found</p>
          <Button onClick={() => navigate('/tournaments')}>Back to Tournaments</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-hero p-6 text-white">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 mb-4"
          onClick={() => navigate('/tournaments')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-start gap-4">
          {tournament.logo_url && (
            <img
              src={tournament.logo_url}
              alt={tournament.name}
              className="w-20 h-20 rounded-lg object-cover border-2 border-white/20"
            />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              {tournament.category}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tournament Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{tournament.city} • {tournament.ground}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(tournament.start_date), 'MMM d, yyyy')} - {format(new Date(tournament.end_date), 'MMM d, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organizer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{tournament.organizer_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{tournament.organizer_phone}</span>
            </div>
            {tournament.organizer_email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{tournament.organizer_email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams" className="mt-4">
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No teams registered yet
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="matches" className="mt-4">
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No matches scheduled yet
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Leaderboard will be available after matches
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default TournamentDetail;
