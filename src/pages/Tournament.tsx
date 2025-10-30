import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

interface Tournament {
  id: string;
  name: string;
  city: string;
  ground: string;
  start_date: string;
  end_date: string;
  category: string;
  logo_url: string | null;
  status: string;
  organizer_id: string;
}

const Tournament = () => {
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [exploreTournaments, setExploreTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Fetch my tournaments (created by me)
      const { data: myData, error: myError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_id', user?.id)
        .order('created_at', { ascending: false });

      if (myError) throw myError;
      setMyTournaments(myData || []);

      // Fetch active public tournaments
      const { data: exploreData, error: exploreError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'Active')
        .order('start_date', { ascending: false });

      if (exploreError) throw exploreError;
      setExploreTournaments(exploreData || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTournamentCard = (tournament: Tournament) => (
    <Card
      key={tournament.id}
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/tournaments/${tournament.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {tournament.logo_url && (
            <img
              src={tournament.logo_url}
              alt={tournament.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-lg">{tournament.name}</CardTitle>
              <Badge variant={tournament.status === 'Active' ? 'default' : 'secondary'}>
                {tournament.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                {tournament.category}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{tournament.city} • {tournament.ground}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(tournament.start_date), 'MMM d')} - {format(new Date(tournament.end_date), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card rounded-lg" />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-hero p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <Button
            size="sm"
            className="bg-white text-primary hover:bg-white/90"
            onClick={() => navigate('/tournaments/create')}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
        <p className="text-white/80">Browse and manage tournaments</p>
      </div>

      <div className="p-4 -mt-4">
        <Tabs defaultValue="my" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="my">My Tournaments</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my" className="space-y-4 mt-0">
            {myTournaments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">No tournaments created yet</p>
                  <Button onClick={() => navigate('/tournaments/create')}>
                    Create Your First Tournament
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myTournaments.map((tournament) => renderTournamentCard(tournament))
            )}
          </TabsContent>

          <TabsContent value="explore" className="space-y-4 mt-0">
            {exploreTournaments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No active tournaments to explore</p>
                </CardContent>
              </Card>
            ) : (
              exploreTournaments.map((tournament) => renderTournamentCard(tournament))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Tournament;
