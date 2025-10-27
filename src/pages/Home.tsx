import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Shield, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Home = () => {
  const [stats, setStats] = useState({
    totalMatches: 0,
    raidPoints: 0,
    tacklePoints: 0,
    winRatio: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayerStats();
  }, []);

  const fetchPlayerStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get player data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get player's match stats
      const { data: matchStats } = await supabase
        .from('player_match_stats')
        .select('raid_points, tackle_points, bonus_points')
        .eq('player_id', user.id);

      if (matchStats) {
        const totalRaid = matchStats.reduce((sum, stat) => sum + (stat.raid_points || 0), 0);
        const totalTackle = matchStats.reduce((sum, stat) => sum + (stat.tackle_points || 0), 0);
        
        setStats({
          totalMatches: matchStats.length,
          raidPoints: totalRaid,
          tacklePoints: totalTackle,
          winRatio: 0, // TODO: Calculate based on match results
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Matches",
      value: stats.totalMatches,
      icon: Trophy,
      gradient: "from-primary to-primary/80",
    },
    {
      title: "Raid Points",
      value: stats.raidPoints,
      icon: Target,
      gradient: "from-accent to-accent/80",
    },
    {
      title: "Tackle Points",
      value: stats.tacklePoints,
      icon: Shield,
      gradient: "from-secondary to-secondary/80",
    },
    {
      title: "Win Ratio",
      value: `${stats.winRatio}%`,
      icon: TrendingUp,
      gradient: "from-success to-success/80",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
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
        <h1 className="text-2xl font-bold mb-2">Player Dashboard</h1>
        <p className="text-white/80">Track your performance</p>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${stat.gradient} text-white pb-3`}>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stat.title}</span>
                  <Icon className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-4xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
