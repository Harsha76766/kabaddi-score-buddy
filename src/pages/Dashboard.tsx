import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, UserPlus, Play, Award, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    } else {
      navigate("/auth");
    }
  };

  const menuItems = [
    {
      title: "Start Match",
      description: "Begin a new Kabaddi match",
      icon: Play,
      color: "bg-gradient-action",
      action: () => navigate("/create-match"),
    },
    {
      title: "Teams",
      description: "Manage your teams",
      icon: Users,
      color: "bg-secondary",
      action: () => navigate("/teams"),
    },
    {
      title: "Players",
      description: "View all players",
      icon: UserPlus,
      color: "bg-accent",
      action: () => navigate("/players"),
    },
    {
      title: "Matches",
      description: "View match history",
      icon: Trophy,
      color: "bg-team-red",
      action: () => navigate("/matches"),
    },
    {
      title: "Leaderboard",
      description: "Top performers",
      icon: Award,
      color: "bg-team-blue",
      action: () => navigate("/leaderboard"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">RaidBook</h1>
            <p className="text-white/80">Kabaddi Match Tracking</p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={item.action}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
