import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Camera, LogOut, Trophy, Users, Target, Video, Settings, BarChart3, Grid3X3, Shield, Zap, TrendingUp, Award, Flame, Star, ChevronRight, Edit3, Heart, Swords } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { profileSchema } from "@/lib/validation";
import { z } from "zod";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    // Raider Stats
    raidPoints: 0,
    touchPoints: 0,
    bonusPoints: 0,
    superRaids: 0,
    raidsAttempted: 0,
    successfulRaids: 0,
    // Defender Stats
    tacklePoints: 0,
    successfulTackles: 0,
    superTackles: 0,
    // Overall
    totalMatches: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayedLevel, setDisplayedLevel] = useState(1);
  const [activeTab, setActiveTab] = useState("stats");

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      // @ts-ignore - bio column exists but not in generated types
      if (profileData) { setProfile(profileData); setEditBio((profileData as any).bio || ""); }

      // Get user's posts
      // @ts-ignore - posts table exists but not in generated types
      const { data: postsData } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setPosts(postsData || []);

      // Get followers/following count
      // @ts-ignore - follows table exists but not in generated types
      const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
      // @ts-ignore
      const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);

      // Get MY player records by PHONE NUMBER
      const myPhone = profileData?.phone;
      let myPlayerRecords: any[] = [];
      if (myPhone) {
        // @ts-ignore - casting to any to avoid deep type instantiation error
        const { data: playersByPhone } = await (supabase.from('players') as any).select('id, team_id').eq('phone', myPhone);
        myPlayerRecords = playersByPhone || [];
      }

      const myPlayerIds = myPlayerRecords.map(p => p.id);
      const myTeamIds = [...new Set(myPlayerRecords.map(p => p.team_id).filter(Boolean))];

      // Fetch detailed match stats
      if (myPlayerIds.length > 0) {
        const { data: matchStats } = await supabase
          .from('player_match_stats')
          .select(`
            match_id, raid_points, tackle_points, bonus_points,
            touch_points, raids_attempted, successful_raids, super_raids,
            successful_tackles, super_tackles,
            matches(*, tournaments(name))
          `)
          .in('player_id', myPlayerIds);

        if (matchStats) {
          const matchesPlayed = matchStats.map((ms: any) => ms.matches).filter(Boolean);
          const uniqueMatches = Array.from(new Map(matchesPlayed.map(m => [m.id, m])).values());
          setMatches(uniqueMatches);

          // Calculate all stats
          let totalStats = {
            raidPoints: 0, touchPoints: 0, bonusPoints: 0, superRaids: 0,
            raidsAttempted: 0, successfulRaids: 0,
            tacklePoints: 0, successfulTackles: 0, superTackles: 0,
          };

          matchStats.forEach((s: any) => {
            totalStats.raidPoints += s.raid_points || 0;
            totalStats.touchPoints += s.touch_points || 0;
            totalStats.bonusPoints += s.bonus_points || 0;
            totalStats.superRaids += s.super_raids || 0;
            totalStats.raidsAttempted += s.raids_attempted || 0;
            totalStats.successfulRaids += s.successful_raids || 0;
            totalStats.tacklePoints += s.tackle_points || 0;
            totalStats.successfulTackles += s.successful_tackles || 0;
            totalStats.superTackles += s.super_tackles || 0;
          });

          setStats(prev => ({
            ...prev,
            ...totalStats,
            totalMatches: uniqueMatches.length,
            postsCount: postsData?.length || 0,
            followersCount: followersCount || 0,
            followingCount: followingCount || 0,
          }));
        }
      } else {
        setStats(prev => ({
          ...prev,
          postsCount: postsData?.length || 0,
          followersCount: followersCount || 0,
          followingCount: followingCount || 0,
        }));
      }

      // Teams I'm a member of
      if (myTeamIds.length > 0) {
        const { data: teamsData } = await supabase.from('teams').select('*').in('id', myTeamIds);
        setTeams(teamsData || []);
      }

      // Tournaments I participated in
      if (myTeamIds.length > 0) {
        const { data: tournamentTeams } = await supabase.from('tournament_teams').select('tournament_id, tournaments(*)').in('team_id', myTeamIds);
        if (tournamentTeams) {
          const tournamentsMap = tournamentTeams
            .filter((tt: any) => tt.tournaments?.id)
            .map((tt: any) => tt.tournaments);
          const uniqueTournaments = Array.from(new Map(tournamentsMap.map((t: any) => [t.id, t])).values());
          setTournaments(uniqueTournaments);
        }
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate derived stats
  const raidStrikeRate = stats.raidsAttempted > 0 ? Math.round((stats.successfulRaids / stats.raidsAttempted) * 100) : 0;
  const tackleSuccessRate = (stats.successfulTackles + stats.superTackles) > 0 ? Math.round((stats.successfulTackles / (stats.successfulTackles + stats.superTackles)) * 100) : 0;
  const totalPoints = stats.raidPoints + stats.tacklePoints;
  const allRounderScore = Math.round((stats.raidPoints + stats.tacklePoints) / Math.max(stats.totalMatches, 1));

  // PUBG-Style Level System
  const calculateLevel = (xp: number) => {
    const levels = [
      { level: 1, title: "Noob", minXP: 0, color: "text-gray-400", barColor: "bg-gray-500" },
      { level: 2, title: "Semi-Pro", minXP: 50, color: "text-green-400", barColor: "bg-green-500" },
      { level: 3, title: "Pro", minXP: 150, color: "text-blue-400", barColor: "bg-blue-500" },
      { level: 4, title: "Elite", minXP: 400, color: "text-purple-400", barColor: "bg-purple-500" },
      { level: 5, title: "PKL Eligible", minXP: 800, color: "text-orange-400", barColor: "bg-orange-500" },
      { level: 6, title: "PKL Prospect", minXP: 1500, color: "text-pink-400", barColor: "bg-pink-500" },
      { level: 7, title: "PKL Player", minXP: 3000, color: "text-yellow-400", barColor: "bg-gradient-to-r from-yellow-500 to-amber-500" },
    ];

    let currentLevel = levels[0];
    let nextLevel = levels[1];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (xp >= levels[i].minXP) {
        currentLevel = levels[i];
        nextLevel = levels[i + 1] || null;
        break;
      }
    }

    const xpInCurrentLevel = xp - currentLevel.minXP;
    const xpNeededForNext = nextLevel ? nextLevel.minXP - currentLevel.minXP : 0;
    const progress = nextLevel ? Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100) : 100;
    const xpToNext = nextLevel ? nextLevel.minXP - xp : 0;

    return {
      ...currentLevel,
      nextTitle: nextLevel?.title || null,
      progress: Math.round(progress),
      xpToNext
    };
  };

  const playerLevel = calculateLevel(totalPoints);

  const handleSaveBio = async () => {
    try {
      // Validate bio
      profileSchema.pick({ bio: true }).parse({ bio: editBio });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // @ts-ignore - bio column exists but not in generated types
      await supabase.from('profiles').update({ bio: editBio } as any).eq('id', user.id);
      setProfile({ ...profile, bio: editBio });
      setIsEditing(false);
      toast({ title: "Bio updated!" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: error.errors[0].message, variant: "destructive" });
      } else {
        console.error(error);
        toast({ title: "Failed to update bio", variant: "destructive" });
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fileName = `${user.id}/avatar.${file.name.split('.').pop()}`;
      await supabase.storage.from('profile-photos').upload(fileName, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile({ ...profile, avatar_url: publicUrl });
      toast({ title: "Photo updated!" });
    } catch (error) { toast({ variant: "destructive", title: "Upload failed" }); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/auth'); };

  if (loading) {
    return <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white pb-20 overflow-x-hidden selection:bg-orange-500/30">
      {/* Header Bar */}
      <div className="sticky top-0 bg-[#050508]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between z-50">
        <h1 className="text-lg font-black italic tracking-tighter text-white">{profile?.name || "PROFILE"}</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/settings')} className="p-2 text-neutral-400 hover:text-white transition-colors"><Settings className="w-5 h-5" /></button>
          <button onClick={handleLogout} className="p-2 text-red-500 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      {/* DYNAMIC SPORTS HEADER WITH BRANDING ELEMENTS */}
      <div className="relative pt-16 pb-12 px-6 overflow-hidden">
        {/* Slanted Action Area with Jersey Mesh - Dark variant */}
        <div
          className="absolute top-0 left-0 w-full h-[90%] bg-white/5 -z-10 origin-top-left -skew-y-6 translate-y-[-10%] border-b border-white/5"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)`,
            backgroundSize: '16px 16px'
          }}
        ></div>

        {/* HOME PAGE STYLE BACKGROUND ELEMENTS */}
        <div className="absolute top-10 right-[-20px] opacity-[0.03] rotate-12 -z-10">
          <Trophy className="w-48 h-48 text-white" />
        </div>
        <div className="absolute bottom-10 left-[-30px] opacity-[0.03] -rotate-12 -z-10">
          <Zap className="w-40 h-40 text-white" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.01] -z-10">
          <Swords className="w-64 h-64 text-white" />
        </div>

        {/* Glow Accents - Refined for Light Mode */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -mr-32 -mt-32 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full -ml-24 -mb-24 -z-10"></div>

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Centralized Avatar with Orbit */}
          <div className="relative group">
            {/* Level Progress Circle (SVG) */}
            <svg className="w-36 h-36 -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="68"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/10"
              />
              <circle
                cx="72"
                cy="72"
                r="68"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 68}
                strokeDashoffset={2 * Math.PI * 68 * (1 - playerLevel.progress / 100)}
                strokeLinecap="round"
                className="text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]"
              />
            </svg>

            {/* Main Avatar Container */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-[36px] bg-[#050508] p-1.5 shadow-2xl relative overflow-hidden ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-500">
                <Avatar className="w-full h-full rounded-[30px] border-0">
                  <AvatarImage src={profile?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-neutral-900 text-neutral-500 text-3xl font-black italic">
                    {profile?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Camera Overlay */}
                <button
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
            </div>

            {/* Level Badge Hooked to Orbit */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-orange-500 text-white px-4 py-1.5 rounded-xl text-[11px] font-black italic uppercase tracking-tighter shadow-xl shadow-orange-500/20 border-2 border-[#050508]">
              <Trophy className="w-3 h-3 fill-current" />
              LVL {playerLevel.level}
            </div>
          </div>

          {/* User Identity Info */}
          <div className="space-y-1">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center justify-center gap-2">
              {profile?.name}
              <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 text-[10px] h-5 px-2.5 font-black italic tracking-widest shadow-lg shadow-orange-600/20">PRO</Badge>
            </h2>
            <div className="inline-block px-5 py-1.5 bg-white/5 rounded-xl border border-white/10">
              <p className="text-[10px] font-black italic uppercase tracking-[0.4em] text-orange-500">{playerLevel.title}</p>
            </div>
          </div>

          {/* Action Stats / XP Info */}
          <div className="flex items-center gap-10 pt-2">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black italic text-white leading-none tracking-tight">{totalPoints}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mt-1.5">TOTAL XP</span>
            </div>
            <div className="w-px h-10 bg-white/5 rotate-12"></div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black italic text-white leading-none tracking-tight">{stats.totalMatches}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mt-1.5">BATTLES</span>
            </div>
          </div>
        </div>
      </div>

      {/* ATHLETIC STATS GRID */}
      <div className="px-6 -mt-6 relative z-30">
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] p-2 shadow-2xl">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center py-6 rounded-[28px] bg-white/5 hover:bg-orange-500/10 transition-all group overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Users className="w-5 h-5 text-neutral-400 mb-1.5" />
              <span className="text-xl font-black italic text-white leading-none">{stats.followersCount}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mt-1.5">Followers</span>
            </div>
            <div className="flex flex-col items-center py-6 rounded-[28px] bg-white/5 hover:bg-orange-500/10 transition-all group overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Flame className="w-5 h-5 text-orange-500 mb-1.5 animate-pulse" />
              <span className="text-xl font-black italic text-white leading-none">{allRounderScore}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mt-1.5">Rating</span>
            </div>
            <div className="flex flex-col items-center py-6 rounded-[28px] bg-white/5 hover:bg-orange-500/10 transition-all group overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Trophy className="w-5 h-5 text-neutral-400 mb-1.5" />
              <span className="text-xl font-black italic text-white leading-none">{tournaments.length}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mt-1.5">Tourneys</span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <Tabs defaultValue="stats" className="w-full mt-8" onValueChange={setActiveTab}>
        <div className="px-6 flex items-center justify-between mb-6">
          <TabsList className="bg-white/5 p-1 rounded-2xl border border-white/10 h-auto">
            <TabsTrigger value="stats" className="rounded-xl px-8 py-2.5 text-[11px] font-black italic uppercase tracking-tighter data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all border-0">Stats</TabsTrigger>
            <TabsTrigger value="posts" className="rounded-xl px-8 py-2.5 text-[11px] font-black italic uppercase tracking-tighter data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all border-0">Posts</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-2xl text-neutral-500 hover:text-white hover:bg-white/5">
            <Edit3 className="w-4 h-4" />
          </Button>
        </div>

        <TabsContent value="stats" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="px-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-transparent gap-6 h-auto p-0 mb-6 overflow-x-auto no-scrollbar justify-start border-0">
                {['overview', 'matches', 'teams', 'tournaments', 'highlights'].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="p-0 text-[11px] font-black italic uppercase tracking-widest text-neutral-500 data-[state=active]:text-white data-[state=active]:bg-transparent relative after:absolute after:bottom-0 after:left-0 after:w-0 data-[state=active]:after:w-[80%] after:h-1.5 after:bg-orange-500 after:transition-all after:duration-300 pb-3 border-0"
                  >
                    {tab === 'tournaments' ? 'Tourneys' : tab === 'highlights' ? 'Clips' : tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-8">
                {/* 🎯 RAIDER PERFORMANCE GAUGES */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black italic uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-orange-500" />
                      Raider Performance
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-black italic border-orange-500/20 text-orange-500 bg-orange-500/10 px-3">SR: {raidStrikeRate}%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 p-5 rounded-[32px] group hover:border-orange-500/20 transition-all shadow-sm">
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-[9px] font-black italic uppercase text-neutral-500">Raid Points</span>
                        <span className="text-2xl font-black italic text-white leading-none">{stats.raidPoints}</span>
                      </div>
                      <Progress value={(stats.raidPoints / 500) * 100} className="h-2 bg-white/5" indicatorClassName="bg-orange-600 rounded-full" />
                    </div>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-[32px] group hover:border-orange-500/20 transition-all shadow-sm">
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-[9px] font-black italic uppercase text-neutral-500">Success Rate</span>
                        <span className="text-2xl font-black italic text-white leading-none">{raidStrikeRate}%</span>
                      </div>
                      <Progress value={raidStrikeRate} className="h-2 bg-white/5" indicatorClassName="bg-orange-500 rounded-full" />
                    </div>
                  </div>

                  {/* RAIDER GRID */}
                  <div className="grid grid-cols-3 gap-3">
                    {[{ l: 'Touch', v: stats.touchPoints }, { l: 'Bonus', v: stats.bonusPoints }, { l: 'S. Raid', v: stats.superRaids }].map((s, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center hover:bg-orange-500/10 transition-colors shadow-sm">
                        <p className="text-[8px] font-black italic uppercase text-neutral-500 mb-1">{s.l}</p>
                        <p className="text-xl font-black italic text-white">{s.v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🛡️ DEFENDER PERFORMANCE GAUGES */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black italic uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                      <Award className="w-3 h-3 text-blue-500" />
                      Defender Performance
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-black italic border-blue-500/10 text-blue-500 bg-blue-500/10 px-3">ACC: {tackleSuccessRate}%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 p-5 rounded-[32px] group hover:border-blue-500/20 transition-all shadow-sm">
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-[9px] font-black italic uppercase text-neutral-500">Tackle Points</span>
                        <span className="text-2xl font-black italic text-white leading-none">{stats.tacklePoints}</span>
                      </div>
                      <Progress value={(stats.tacklePoints / 250) * 100} className="h-2 bg-white/5" indicatorClassName="bg-blue-600 rounded-full" />
                    </div>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-[32px] group hover:border-blue-500/20 transition-all shadow-sm">
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-[9px] font-black italic uppercase text-neutral-500">Success Rate</span>
                        <span className="text-2xl font-black italic text-white leading-none">{tackleSuccessRate}%</span>
                      </div>
                      <Progress value={tackleSuccessRate} className="h-2 bg-white/5" indicatorClassName="bg-cyan-500 rounded-full" />
                    </div>
                  </div>

                  {/* DEFENDER GRID */}
                  <div className="grid grid-cols-3 gap-3">
                    {[{ l: 'Tackles', v: stats.successfulTackles }, { l: 'S. Tackle', v: stats.superTackles }, { l: 'Success', v: tackleSuccessRate + '%' }].map((s, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center hover:bg-blue-500/10 transition-colors shadow-sm">
                        <p className="text-[8px] font-black italic uppercase text-neutral-500 mb-1">{s.l}</p>
                        <p className="text-xl font-black italic text-white">{s.v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OVERALL IMPACT CARDS */}
                <div className="grid grid-cols-2 gap-4 pb-8">
                  <Card className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden group hover:border-orange-500/20 transition-all shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black italic uppercase tracking-widest text-neutral-500">Season XP</span>
                        <p className="text-3xl font-black italic text-white tracking-tighter leading-none">{totalPoints}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 group-hover:rotate-12 transition-all">
                        <Zap className="w-6 h-6 fill-current" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden group hover:border-blue-500/20 transition-all shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black italic uppercase tracking-widest text-neutral-500">Battles</span>
                        <p className="text-3xl font-black italic text-white tracking-tighter leading-none">{stats.totalMatches}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:-rotate-12 transition-all">
                        <Award className="w-6 h-6 fill-current" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Matches Sub-Tab */}
              <TabsContent value="matches" className="mt-0 space-y-4">
                {matches.length === 0 ? (
                  <div className="py-20 text-center text-neutral-700 bg-white/5 rounded-[32px] border border-white/10 shadow-sm relative overflow-hidden">
                    <Swords className="w-32 h-32 absolute -right-4 -bottom-4 opacity-[0.02] rotate-12" />
                    <Swords className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black italic uppercase tracking-widest text-neutral-500">Awaiting Battle...</p>
                  </div>
                ) : (
                  matches.map((match: any) => (
                    <Card key={`match-${match.id}`} className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden group cursor-pointer hover:border-orange-500/20 hover:scale-[1.02] transition-all shadow-sm relative">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:rotate-12 transition-all text-white">
                        <Swords className="w-20 h-20" />
                      </div>
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-orange-500/10 transition-colors">
                              <Swords className="w-6 h-6 text-neutral-600 group-hover:text-orange-500 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-black italic uppercase text-white tracking-tight">{match.match_name}</p>
                              <p className="text-[10px] font-black italic text-neutral-500 uppercase tracking-widest mt-1">
                                <Trophy className="w-2 h-2 inline mr-1 mb-0.5" />
                                {match.tournaments?.name || 'Friendly Arena'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className={`${match.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'} border-0 text-[10px] font-black italic uppercase px-3 py-1`}>
                              {match.status}
                            </Badge>
                            <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Teams Sub-Tab */}
              <TabsContent value="teams" className="mt-0 space-y-4">
                {teams.length === 0 ? (
                  <div className="py-20 text-center text-neutral-700 bg-white/5 rounded-[32px] border border-white/10 shadow-sm relative overflow-hidden">
                    <Users className="w-32 h-32 absolute -right-4 -bottom-4 opacity-[0.02] -rotate-12" />
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black italic uppercase tracking-widest text-neutral-500">Build Your Squad</p>
                  </div>
                ) : (
                  teams.map((team: any) => (
                    <Card key={`team-sub-${team.id}`} className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden group cursor-pointer hover:border-orange-500/20 hover:scale-[1.02] transition-all shadow-sm relative">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-all text-white">
                        <Users className="w-20 h-20 -rotate-12" />
                      </div>
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <Avatar className="w-14 h-14 rounded-2xl border-2 border-white/10 group-hover:border-orange-500/20 transition-colors shadow-sm">
                              <AvatarImage src={team.logo_url} />
                              <AvatarFallback className="bg-neutral-900 text-neutral-500 text-xs font-black italic">{team.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-black italic uppercase text-white tracking-tight">{team.name}</p>
                              <p className="text-[10px] font-black italic text-neutral-500 uppercase tracking-widest mt-1">
                                <Users className="w-2 h-2 inline mr-1 mb-0.5" />
                                {team.captain_name || 'LEADER'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-white transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Tournaments Sub-Tab */}
              <TabsContent value="tournaments" className="mt-0 space-y-4">
                {tournaments.length === 0 ? (
                  <div className="py-20 text-center text-neutral-700 bg-white/5 rounded-[32px] border border-white/10 shadow-sm relative overflow-hidden">
                    <Trophy className="w-32 h-32 absolute -right-4 -bottom-4 opacity-[0.02] rotate-12" />
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black italic uppercase tracking-widest text-neutral-500">Champion Wanted</p>
                  </div>
                ) : (
                  tournaments.map((t: any) => (
                    <Card key={`tourney-sub-${t.id}`} className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden group cursor-pointer hover:border-orange-500/20 hover:scale-[1.02] transition-all shadow-sm relative">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-all text-white">
                        <Trophy className="w-20 h-20 rotate-12" />
                      </div>
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <Avatar className="w-14 h-14 rounded-2xl border-2 border-white/10 group-hover:border-orange-500/20 transition-colors shadow-sm">
                              <AvatarImage src={t.logo_url} />
                              <AvatarFallback className="bg-neutral-900 text-neutral-500 text-xs font-black italic">{t.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-black italic uppercase text-white tracking-tight">{t.name}</p>
                              <p className="text-[10px] font-black italic text-neutral-500 uppercase tracking-widest mt-1">
                                <Trophy className="w-2 h-2 inline mr-1 mb-0.5 text-orange-500" />
                                {t.city || 'VENUE'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-white transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Highlights Sub-Tab */}
              <TabsContent value="highlights" className="mt-0">
                <div className="py-24 text-center text-neutral-700 bg-white/5 rounded-[32px] border border-white/10 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors"></div>
                  <Video className="w-48 h-48 absolute -left-10 -bottom-10 opacity-[0.02] -rotate-12" />
                  <Video className="w-16 h-16 mx-auto mb-4 text-neutral-800 group-hover:text-orange-500/40 transition-colors" />
                  <p className="text-xs font-black italic uppercase tracking-widest text-neutral-500">Action clips coming...</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="mt-0 px-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
          {posts.length === 0 ? (
            <div className="py-24 text-center text-neutral-700 bg-white/5 rounded-[32px] border border-white/10 shadow-sm relative overflow-hidden">
              <Grid3X3 className="w-32 h-32 absolute -right-8 -bottom-8 opacity-[0.02] rotate-45" />
              <Grid3X3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-xs font-black italic uppercase tracking-widest text-neutral-500">Ready for the Gram?</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {posts.map(post => (
                <div key={`post-grid-${post.id}`} className="aspect-[4/5] bg-white/5 rounded-[32px] overflow-hidden border border-white/10 relative group cursor-pointer active:scale-95 transition-all shadow-md hover:shadow-orange-900/10 hover:-translate-y-1">
                  {post.image_url ? (
                    <img src={post.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white/5 relative">
                      <Grid3X3 className="w-24 h-24 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] group-hover:scale-110 transition-transform text-white" />
                      <p className="text-[10px] font-black italic text-neutral-500 line-clamp-5 uppercase leading-relaxed tracking-tight relative z-10">{post.content}</p>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-orange-500/90 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-white/10 transform translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <Heart className="w-4 h-4 text-white fill-current" />
                  </div>
                  <div className="absolute bottom-5 left-5">
                    <div className="bg-[#050508]/80 backdrop-blur-xl px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/10 shadow-2xl">
                      <Heart className="w-3 h-3 text-orange-500 fill-current" />
                      <span className="text-[10px] font-black italic text-white tracking-tighter">{post.likes_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Profile;

