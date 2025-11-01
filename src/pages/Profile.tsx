import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Camera, LogOut, Save, Trophy, Users, Target, Video } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    team_name: "",
    avatar_url: "",
  });
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMatches: 0,
    raidPoints: 0,
    tacklePoints: 0,
    bonusPoints: 0,
  });

  useEffect(() => {
    fetchProfile();
    fetchPlayerData();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          team_name: data.team_name || '',
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPlayerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (!profileData?.phone) return;

      // Get player record
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('phone', profileData.phone)
        .maybeSingle();

      if (!playerData) return;

      // Get player stats
      setStats({
        totalMatches: playerData.matches_played || 0,
        raidPoints: playerData.total_raid_points || 0,
        tacklePoints: playerData.total_tackle_points || 0,
        bonusPoints: playerData.total_bonus_points || 0,
      });

      // Get matches
      const { data: matchStats } = await supabase
        .from('player_match_stats')
        .select('match_id, matches(*, tournaments(name))')
        .eq('player_id', playerData.id);
      
      setMatches(matchStats?.map(m => m.matches) || []);

      // Get teams
      const { data: teamsData } = await supabase
        .from('players')
        .select('team_id, teams(*)')
        .eq('phone', profileData.phone);
      
      setTeams(teamsData?.map(t => t.teams).filter(Boolean) || []);

      // Get tournaments through teams
      if (playerData.team_id) {
        const { data: tournamentsData } = await supabase
          .from('tournament_teams')
          .select('tournaments(*)')
          .eq('team_id', playerData.team_id);
        
        setTournaments(tournamentsData?.map(t => t.tournaments).filter(Boolean) || []);
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      setProfile({ ...profile, avatar_url: publicUrl });
      
      toast({
        title: "Avatar updated",
        description: "Your profile photo has been updated",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          team_name: profile.team_name,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-hero p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Profile</h1>
        <p className="text-white/80">Manage your account</p>
      </div>

      <div className="p-4 -mt-4 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {profile.name.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  disabled
                  className="bg-muted"
                />
              </div>

              {profile.email && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="team">Team Name</Label>
                <Input
                  id="team"
                  placeholder="Your team name"
                  value={profile.team_name}
                  onChange={(e) => setProfile({ ...profile, team_name: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-3 mt-4">
            {matches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No matches played yet
                </CardContent>
              </Card>
            ) : (
              matches.map((match) => (
                <Card key={match.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{match.match_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {match.tournaments?.name || 'Friendly Match'}
                        </p>
                      </div>
                      <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                        {match.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-3 mt-4">
            {tournaments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Not part of any tournaments yet
                </CardContent>
              </Card>
            ) : (
              tournaments.map((tournament) => (
                <Card key={tournament.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/tournaments/${tournament.id}`)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {tournament.logo_url && (
                        <Avatar>
                          <AvatarImage src={tournament.logo_url} />
                          <AvatarFallback>{tournament.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <p className="font-medium">{tournament.name}</p>
                        <p className="text-sm text-muted-foreground">{tournament.city}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="teams" className="space-y-3 mt-4">
            {teams.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Not part of any teams yet
                </CardContent>
              </Card>
            ) : (
              teams.map((team) => (
                <Card key={team.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/teams/${team.id}`)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {team.logo_url && (
                        <Avatar>
                          <AvatarImage src={team.logo_url} />
                          <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Captain: {team.captain_name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stats.totalMatches}</div>
                  <div className="text-sm text-muted-foreground">Total Matches</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold">{stats.raidPoints}</div>
                  <div className="text-sm text-muted-foreground">Raid Points</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{stats.tacklePoints}</div>
                  <div className="text-sm text-muted-foreground">Tackle Points</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold">{stats.bonusPoints}</div>
                  <div className="text-sm text-muted-foreground">Bonus Points</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="highlights" className="space-y-3 mt-4">
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Highlights feature coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 mt-6">
          <Button
            onClick={handleSave}
            className="w-full"
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Profile"}
          </Button>

          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
