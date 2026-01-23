import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SearchSheet } from "@/components/SearchSheet";
import { NotificationSheet } from "@/components/NotificationSheet";
import BottomNav from "@/components/BottomNav";
import { Feed } from "@/components/social/Feed";
import { Search, Bell, Activity, Zap, Trophy, Swords, Users, Plus, Star, MapPin, Clock, ChevronRight, MessageSquare, Heart, Share2, Award, Flame, ShoppingBag, LayoutGrid, Menu, Settings, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [nearbyTournaments, setNearbyTournaments] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("player");
  const [userName, setUserName] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const navigate = useNavigate();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Ready to score";
    if (hour < 22) return "Evening";
    return "Up late scoring";
  }, []);

  useEffect(() => {
    fetchInitialData();

    // REAL-TIME: Matches Subscription
    const matchChannel = supabase
      .channel('home_matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    // REAL-TIME: Activity Subscription (Mock for MVP, can use match_events)
    const eventChannel = supabase
      .channel('home_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, (payload) => {
        handleNewEvent(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(eventChannel);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUserData(),
      fetchMatches(),
      fetchTournaments(),
      fetchActivity()
    ]);
    setLoading(false);
  };

  const handleNewEvent = (event: any) => {
    // Logic to add to activity list if relevant
    setActivities(prev => [{
      id: Math.random().toString(),
      type: 'MATCH_EVENT',
      title: 'Action Update',
      message: `${event.player_name || 'Player'} scored!`,
      time: 'Just now',
      icon: zapIcon
    }, ...prev.slice(0, 4)]);
  };

  const zapIcon = <Zap className="w-4 h-4 text-orange-500" />;

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || "User");

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setUserRole(profileData.role || 'player');

      // Fetch Stats if they are a player
      if (profileData.phone) {
        // Get player records
        const { data: playerRecords } = await (supabase
          .from('players') as any)
          .select('id, team_id, matches_played, total_raid_points, total_tackle_points')
          .eq('phone', profileData.phone);

        if (playerRecords && playerRecords.length > 0) {
          const totalMatches = playerRecords.reduce((acc, curr) => acc + (curr.matches_played || 0), 0);
          const totalPoints = playerRecords.reduce((acc, curr) => acc + (curr.total_raid_points || 0) + (curr.total_tackle_points || 0), 0);
          // Calculate actual win rate from matches
          const { data: matchStats } = await supabase
            .from('player_match_stats')
            .select('match_id, matches(status, winner_team_id)')
            .in('player_id', playerRecords.map(p => p.id));

          let wins = 0;
          if (matchStats) {
            const completedMatches = matchStats.filter((ms: any) => ms.matches?.status === 'completed');
            wins = completedMatches.filter((ms: any) => {
              const playerTeamId = playerRecords.find(p => p.id === ms.player_id)?.team_id;
              return ms.matches?.winner_team_id === playerTeamId;
            }).length;
          }
          const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

          setUserStats({
            matches: totalMatches,
            points: totalPoints,
            avg: totalMatches > 0 ? (totalPoints / totalMatches).toFixed(1) : 0,
            winRate
          });

          // Fetch Teams with win/loss stats
          const teamIds = playerRecords.map(p => p.team_id).filter(Boolean);
          if (teamIds.length > 0) {
            const { data: teams } = await supabase
              .from('teams')
              .select('*')
              .in('id', teamIds);

            // Calculate wins/losses for each team
            if (teams) {
              const { data: allMatches } = await (supabase as any)
                .from('matches')
                .select('team_a_id, team_b_id, team_a_score, team_b_score, status')
                .eq('status', 'completed')
                .or(`team_a_id.in.(${teamIds.join(',')}),team_b_id.in.(${teamIds.join(',')})`);

              const teamsWithStats = teams.map((team: any) => {
                const teamMatches = (allMatches || []).filter((m: any) =>
                  m.team_a_id === team.id || m.team_b_id === team.id
                );
                let wins = 0, losses = 0;
                teamMatches.forEach((m: any) => {
                  const isTeamA = m.team_a_id === team.id;
                  const won = isTeamA ? m.team_a_score > m.team_b_score : m.team_b_score > m.team_a_score;
                  if (won) wins++;
                  else losses++;
                });
                return { ...team, wins, losses };
              });
              setUserTeams(teamsWithStats);
            }
          }
        }
      }
    }
  };

  const fetchMatches = async () => {
    const { data: matches } = await (supabase
      .from('matches') as any)
      .select('*, team_a:team_a_id(name, logo_url), team_b:team_b_id(name, logo_url), tournaments(name, venue)')
      .order('match_date', { ascending: true });

    if (matches) {
      setLiveMatches(matches.filter(m => m.status === 'live'));
      setUpcomingMatches(matches.filter(m => m.status === 'scheduled').slice(0, 5));
    }
  };

  const fetchTournaments = async () => {
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('*')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);
    if (tournaments) setNearbyTournaments(tournaments);
  };

  const fetchActivity = async () => {
    try {
      // Fetch recent completed matches
      const { data: recentMatches } = await (supabase as any)
        .from('matches')
        .select('id, team_a_score, team_b_score, status, created_at, team_a:team_a_id(name), team_b:team_b_id(name)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentMatches && recentMatches.length > 0) {
        const activityItems = recentMatches.map((match: any, idx: number) => {
          const winner = match.team_a_score > match.team_b_score ? match.team_a?.name : match.team_b?.name;
          const scoreDiff = Math.abs(match.team_a_score - match.team_b_score);
          const timeAgo = getTimeAgo(new Date(match.created_at));
          return {
            id: match.id,
            type: 'MATCH_COMPLETED',
            title: 'Match Finished',
            message: `${winner} won by ${scoreDiff} points`,
            time: timeAgo,
            icon: <Trophy className="w-4 h-4 text-yellow-500" />
          };
        });
        setActivities(activityItems);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      setActivities([]);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] pb-24">
        <div className="p-6 space-y-8">
          <Skeleton className="h-40 w-full rounded-[32px] bg-white/5" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-40 bg-white/5" />
            <div className="flex gap-4 overflow-hidden">
              <Skeleton className="h-40 w-60 shrink-0 rounded-3xl bg-white/5" />
              <Skeleton className="h-40 w-60 shrink-0 rounded-3xl bg-white/5" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 bg-white/5" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-48 rounded-[32px] bg-white/5" />
              <Skeleton className="h-48 rounded-[32px] bg-white/5" />
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] pb-32 font-sans selection:bg-orange-500/30">
      {/* 1. TOP BAR */}
      <header className="sticky top-0 z-50 bg-[#050508]/95 backdrop-blur-xl border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 border border-white/5">
                <Menu className="w-5 h-5 text-white" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-[#050508] border-white/5 p-0 text-white shadow-2xl">
              <div className="p-8 space-y-8">
                <SheetHeader className="text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
                      <Zap className="w-6 h-6 text-white fill-current" />
                    </div>
                    <SheetTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">RaidBook</SheetTitle>
                  </div>
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest pl-1">Professional Kabaddi Hub</p>
                </SheetHeader>

                <nav className="space-y-2">
                  {[
                    { label: 'My Matches', icon: Swords, path: '/matches' },
                    { label: 'My Teams', icon: Users, path: '/teams' },
                    { label: 'Tournaments', icon: Trophy, path: '/tournaments' },
                    { label: 'Player Rankings', icon: Award, path: '/leaderboard' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group text-left"
                    >
                      <item.icon className="w-5 h-5 text-neutral-500 group-hover:text-orange-500 transition-colors" />
                      <span className="text-xs font-black uppercase tracking-widest text-neutral-400 group-hover:text-white">{item.label}</span>
                    </button>
                  ))}
                  <Separator className="bg-white/5 my-4 mx-4 w-auto" />
                  {[
                    { label: 'Settings', icon: Settings, path: '/profile' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group text-left"
                    >
                      <item.icon className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                      <span className="text-xs font-black uppercase tracking-widest text-neutral-400 group-hover:text-white">{item.label}</span>
                    </button>
                  ))}
                </nav>

                <div className="absolute bottom-8 left-8 right-8">
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-4">Account Tier</p>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-orange-500 text-white h-6 px-3 text-[10px] font-black uppercase">PRO Player</Badge>
                      <span className="text-[10px] font-black text-white italic">LVL 24</span>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black uppercase tracking-tighter text-white">RaidBook</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-500">Home hub</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SearchSheet trigger={
            <button className="p-2.5 hover:bg-white/5 rounded-full transition-all text-neutral-400 active:scale-90">
              <Search className="w-5 h-5" />
            </button>
          } />

          <NotificationSheet trigger={
            <button className="p-2.5 hover:bg-white/5 rounded-full transition-all text-neutral-400 relative active:scale-90 group">
              <Bell className="w-5 h-5 group-hover:animate-[bell-shake_0.5s_ease-in-out_infinite]" />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050508] animate-pulse" />
            </button>
          } />
        </div>
      </header>

      <main className="max-w-lg mx-auto overflow-x-hidden">
        {/* 2. GREETING & STATS CARD */}
        <section className="px-6 py-6">
          <div className="relative group overflow-hidden bg-slate-950 rounded-[40px] p-8 text-white shadow-2xl shadow-slate-950/20">
            {/* Branded Background Silhouettes */}
            <div className="absolute -top-10 -right-10 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
              <Trophy className="w-64 h-64" />
            </div>
            <div className="absolute -bottom-10 -left-10 opacity-[0.03] -rotate-12">
              <Swords className="w-64 h-64" />
            </div>

            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">{greeting}</h2>
                  <p className="text-3xl font-black uppercase tracking-tight italic leading-none">{userName}!</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <Flame className="w-6 h-6 text-orange-500 animate-bounce" />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Matches', val: userStats?.matches || 0, color: 'text-orange-500' },
                  { label: 'Points', val: userStats?.points || 0, color: 'text-blue-400' },
                  { label: 'Avg/M', val: userStats?.avg || 0, color: 'text-green-400' },
                  { label: 'Win %', val: userStats?.winRate || '0', color: 'text-purple-400' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white/5 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center border border-white/5 group-hover:bg-white/10 transition-colors">
                    <span className={cn("text-lg font-black tracking-tight", s.color)}>{s.val}</span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-white/40 mt-1">{s.label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/profile')}
                className="w-full h-12 bg-white rounded-2xl text-slate-950 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
              >
                View Full Analytics <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>

        {/* 3. LIVE & UPCOMING SECTION */}
        <section className="space-y-4 py-4">
          <div className="px-6 flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-neutral-500 flex items-center gap-3">
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </div>
              Live & Upcoming
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:opacity-70 transition-opacity" onClick={() => navigate('/matches')}>View All</button>
          </div>

          <div className="flex overflow-x-auto gap-4 px-6 no-scrollbar pb-4 snap-x">
            {liveMatches.map((m) => (
              <div
                key={`live-${m.id}`}
                className="shrink-0 w-[300px] snap-center bg-white/5 rounded-[32px] border border-white/10 p-6 shadow-sm hover:border-orange-500/20 hover:shadow-xl hover:shadow-orange-900/5 transition-all group cursor-pointer"
                onClick={() => navigate(`/matches/${m.id}/spectate`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest h-6 px-3">Live • Half {m.current_half || 1}</Badge>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-neutral-600" />
                    <span className="text-[10px] font-bold text-neutral-500">{m.viewer_count || 124}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {m.team_a?.logo_url ? <img src={m.team_a.logo_url} className="w-5 h-5 rounded-full" /> : <Users className="w-4 h-4 text-slate-300" />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-tight text-white truncate">{m.team_a?.name || "Team A"}</span>
                    </div>
                    <span className="text-2xl font-black text-white group-hover:text-orange-500 transition-colors">{m.team_a_score}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-slate-100" />
                    <span className="text-[9px] font-black italic text-slate-300">VS</span>
                    <div className="h-[1px] flex-1 bg-slate-100" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {m.team_b?.logo_url ? <img src={m.team_b.logo_url} className="w-5 h-5 rounded-full" /> : <Users className="w-4 h-4 text-neutral-600" />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-tight text-white truncate">{m.team_b?.name || "Team B"}</span>
                    </div>
                    <span className="text-2xl font-black text-white group-hover:text-orange-500 transition-colors">{m.team_b_score}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[10px] font-bold truncate max-w-[120px]">{m.tournaments?.venue || "Main Court"}</span>
                  </div>
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Watch Live →</span>
                </div>
              </div>
            ))}

            {upcomingMatches.map((m) => (
              <div
                key={`upcoming-${m.id}`}
                className="shrink-0 w-[240px] snap-center bg-white/5 rounded-[32px] p-6 border border-white/5 hover:border-blue-500/20 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px] font-bold uppercase tracking-widest">{new Date(m.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Badge>
                  <Clock className="w-4 h-4 text-slate-300" />
                </div>
                <div className="mt-6 space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[80px]">{m.team_a?.name || "Team A"}</span>
                    <span className="text-[10px] font-bold text-slate-300 italic">VS</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[80px]">{m.team_b?.name || "Team B"}</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 truncate opacity-60 uppercase">{m.tournaments?.name}</p>
                </div>
                <button className="mt-6 w-full py-2.5 rounded-2xl border-2 border-slate-200 text-[9px] font-black opacity-60 uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all">Remind Me</button>
              </div>
            ))}

            {liveMatches.length === 0 && upcomingMatches.length === 0 && (
              <div className="w-full bg-slate-50 rounded-[32px] p-8 flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed border-slate-100">
                <Swords className="w-8 h-8 text-slate-200" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active matches</p>
                <button onClick={() => navigate('/matches/create')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b-2 border-orange-600 pb-0.5">Start one now</button>
              </div>
            )}
          </div>
        </section>

        {/* 4. TOURNAMENTS NEAR YOU */}
        <section className="space-y-4 py-4">
          <div className="px-6 flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-neutral-500 flex items-center gap-2">
              <Trophy className="w-3 h-3 text-orange-500" />
              Tournaments Near You
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-orange-500" onClick={() => navigate('/tournaments')}>View All</button>
          </div>

          <div className="flex overflow-x-auto gap-4 px-6 no-scrollbar pb-4 snap-x">
            {nearbyTournaments.map((t) => (
              <div
                key={`tourney-${t.id}`}
                className="shrink-0 w-[260px] snap-center bg-white/5 rounded-[32px] border border-white/5 overflow-hidden shadow-sm hover:border-orange-500/20 hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => navigate(`/tournaments/${t.id}`)}
              >
                <div className="h-28 bg-white/5 relative overflow-hidden">
                  {t.image_url ? (
                    <img src={t.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={t.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                      <Trophy className="w-10 h-10 text-white/10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge className={cn(
                      "text-[8px] font-black uppercase tracking-tighter px-2 h-5 border-0",
                      t.status === 'registering' ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                    )}>
                      {t.status === 'registering' ? 'Reg Open' : 'Upcoming'}
                    </Badge>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <h4 className="text-sm font-black uppercase tracking-tight text-white line-clamp-1 italic">{t.name}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <MapPin className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{t.venue?.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{new Date(t.start_date || t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button className="w-full py-2.5 rounded-2xl bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all">
                    {t.status === 'registering' ? 'Register Now →' : 'View Details →'}
                  </button>
                </div>
              </div>
            ))}
            {nearbyTournaments.length === 0 && (
              <div className="w-full bg-slate-50 rounded-[32px] p-8 flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed border-slate-100">
                <Trophy className="w-8 h-8 text-slate-200" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No tournaments nearby</p>
              </div>
            )}
          </div>
        </section>

        {/* 5. MY TEAMS SECTION */}
        <section className="px-6 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-neutral-500">My Teams</h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-orange-500" onClick={() => navigate('/teams')}>Manage all</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {userTeams.length > 0 ? userTeams.slice(0, 2).map((team) => (
              <div
                key={`team-${team.id}`}
                className="bg-white/5 rounded-[32px] p-6 border border-white/10 shadow-sm hover:border-orange-500/20 transition-all cursor-pointer group flex flex-col items-center text-center"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                  {team.logo_url ? <img src={team.logo_url} className="w-10 h-10 rounded-xl" /> : <Users className="w-8 h-8 text-neutral-800" />}
                </div>
                <h4 className="text-sm font-black uppercase tracking-tight text-white line-clamp-1">{team.name}</h4>
                <div className="mt-4 flex flex-col gap-1.5 w-full">
                  <div className="bg-white/5 rounded-xl py-1.5 px-3 flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Wins</span>
                    <span className="text-[10px] font-black text-green-500">{team.wins || 0}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl py-1.5 px-3 flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Loss</span>
                    <span className="text-[10px] font-black text-red-500">{team.losses || 0}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-2 bg-white/5 rounded-[32px] p-10 flex flex-col items-center gap-4 text-center border-2 border-dashed border-white/10 opacity-60">
                <Users className="w-10 h-10 text-neutral-800" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">No teams joined</p>
                  <p className="text-[9px] font-bold text-neutral-500">Build your squad to start playing</p>
                </div>
                <button
                  onClick={() => navigate('/teams')}
                  className="bg-white px-6 py-3 rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest shadow-sm hover:translate-y-px transition-transform text-black"
                >
                  Find a Team
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 6. ARENA FEED INTEGRATION */}
        <section className="space-y-6 pt-4">
          <div className="px-6 flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-neutral-500 flex items-center gap-2">
              <LayoutGrid className="w-3 h-3 text-orange-500" />
              Arena Feed
            </h3>
            <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
              <Activity className="w-2.5 h-2.5 text-orange-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-orange-500">Live</span>
            </div>
          </div>

          <div className="px-2">
            <Feed />
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
