import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
    ArrowLeft,
    Users,
    Trophy,
    Zap,
    Shield,
    UserPlus,
    UserCheck,
    Share2,
    Star,
    Flame,
    Award,
    Swords,
    ChevronRight,
    Video
} from "lucide-react";

import { useBackNavigation } from "@/hooks/useBackNavigation";

interface Player {
    id: string;
    name: string;
    phone?: string;
    position?: string;
    jersey_number?: number;
    team_id?: string;
    user_id?: string;
    photo_url?: string;
}

interface Team {
    id: string;
    name: string;
    logo_url?: string;
}

const PlayerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const handleBack = useBackNavigation();
    const { toast } = useToast();
    const [player, setPlayer] = useState<Player | null>(null);
    const [team, setTeam] = useState<Team | null>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followLoading, setFollowLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [mainTab, setMainTab] = useState("stats");
    const [statsTab, setStatsTab] = useState("overview");

    // Stats - same structure as Profile.tsx
    const [stats, setStats] = useState({
        followersCount: 0,
        followingCount: 0,
        raidPoints: 0,
        touchPoints: 0,
        bonusPoints: 0,
        superRaids: 0,
        raidsAttempted: 0,
        successfulRaids: 0,
        tacklePoints: 0,
        successfulTackles: 0,
        superTackles: 0,
        totalMatches: 0,
    });

    useEffect(() => {
        fetchPlayerProfile();
        checkFollowStatus();
    }, [id]);

    const fetchPlayerProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);

            // Get the player by ID
            const { data: playerData, error: playerError } = await supabase
                .from("players")
                .select("*")
                .eq("id", id)
                .single();

            if (playerError) throw playerError;
            setPlayer(playerData);

            // Get player's team
            if (playerData?.team_id) {
                const { data: teamData } = await supabase
                    .from("teams")
                    .select("id, name, logo_url")
                    .eq("id", playerData.team_id)
                    .single();
                setTeam(teamData);
            }

            // Get all player records by phone (like Profile.tsx does)
            // This finds ALL teams/records for this person across the app
            const playerPhone = (playerData as any)?.phone;
            let allPlayerIds: string[] = [id!]; // At minimum, include this player ID
            let allTeamIds: string[] = playerData?.team_id ? [playerData.team_id] : [];

            if (playerPhone) {
                // @ts-ignore - casting to avoid deep type instantiation error
                const { data: playersByPhone } = await (supabase.from('players') as any)
                    .select('id, team_id')
                    .eq('phone', playerPhone);

                if (playersByPhone) {
                    allPlayerIds = playersByPhone.map((p: any) => p.id);
                    allTeamIds = [...new Set(playersByPhone.map((p: any) => p.team_id).filter(Boolean))] as string[];
                }
            }

            // Fetch detailed match stats from player_match_stats (like Profile.tsx)
            if (allPlayerIds.length > 0) {
                const { data: matchStats } = await supabase
                    .from('player_match_stats')
                    .select(`
            match_id, raid_points, tackle_points, bonus_points,
            touch_points, raids_attempted, successful_raids, super_raids,
            successful_tackles, super_tackles,
            matches(*, tournaments(name))
          `)
                    .in('player_id', allPlayerIds);

                if (matchStats) {
                    const matchesPlayed = matchStats.map((ms: any) => ms.matches).filter(Boolean);
                    const uniqueMatches = Array.from(new Map(matchesPlayed.map(m => [m.id, m])).values());
                    setMatches(uniqueMatches);

                    // Calculate all stats (like Profile.tsx)
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
                    }));
                }
            }

            // Get teams this player is on
            if (allTeamIds.length > 0) {
                const { data: teamsData } = await supabase.from('teams').select('*').in('id', allTeamIds);
                setTeams(teamsData || []);
            }

            // Get tournaments participated
            if (allTeamIds.length > 0) {
                const { data: tournamentTeams } = await supabase
                    .from('tournament_teams')
                    .select('tournament_id, tournaments(*)')
                    .in('team_id', allTeamIds);
                if (tournamentTeams) {
                    const tournamentsMap = tournamentTeams
                        .filter((tt: any) => tt.tournaments?.id)
                        .map((tt: any) => tt.tournaments);
                    const uniqueTournaments = Array.from(new Map(tournamentsMap.map((t: any) => [t.id, t])).values());
                    setTournaments(uniqueTournaments);
                }
            }

            // Count followers
            const follows = JSON.parse(localStorage.getItem('player_follows') || '{}');
            const playerFollowers = Object.values(follows).filter((f: any) => f === id).length;
            setFollowersCount(playerFollowers);
            setStats(prev => ({ ...prev, followersCount: playerFollowers }));

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const checkFollowStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const follows = JSON.parse(localStorage.getItem('player_follows') || '{}');
        setIsFollowing(follows[user.id] === id);
    };

    const handleFollow = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast({ variant: "destructive", title: "Login required", description: "Please login to follow players" });
            return;
        }
        setFollowLoading(true);
        const follows = JSON.parse(localStorage.getItem('player_follows') || '{}');
        if (isFollowing) {
            delete follows[user.id];
            setFollowersCount(prev => Math.max(0, prev - 1));
            setStats(prev => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }));
            toast({ title: "Unfollowed" });
        } else {
            follows[user.id] = id;
            setFollowersCount(prev => prev + 1);
            setStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
            toast({ title: "Following!", description: `You are now following ${player?.name}` });
        }
        localStorage.setItem('player_follows', JSON.stringify(follows));
        setIsFollowing(!isFollowing);
        setFollowLoading(false);
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/#/players/${id}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: `${player?.name} - Profile`, url: shareUrl });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast({ title: "Link Copied!" });
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    // Calculate derived stats (like Profile.tsx)
    const raidStrikeRate = stats.raidsAttempted > 0 ? Math.round((stats.successfulRaids / stats.raidsAttempted) * 100) : 0;
    const tackleSuccessRate = (stats.successfulTackles + stats.superTackles) > 0 ? Math.round((stats.successfulTackles / (stats.successfulTackles + stats.superTackles)) * 100) : 0;
    const totalPoints = stats.raidPoints + stats.tacklePoints;
    const allRounderScore = Math.round((stats.raidPoints + stats.tacklePoints) / Math.max(stats.totalMatches, 1));

    // Level system (like Profile.tsx)
    const calculateLevel = (xp: number) => {
        const levels = [
            { level: 1, title: "Noob", minXP: 0, color: "text-gray-400" },
            { level: 2, title: "Semi-Pro", minXP: 50, color: "text-green-400" },
            { level: 3, title: "Pro", minXP: 150, color: "text-blue-400" },
            { level: 4, title: "Elite", minXP: 400, color: "text-purple-400" },
            { level: 5, title: "PKL Eligible", minXP: 800, color: "text-orange-400" },
            { level: 6, title: "PKL Prospect", minXP: 1500, color: "text-pink-400" },
            { level: 7, title: "PKL Player", minXP: 3000, color: "text-yellow-400" },
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
        return { ...currentLevel, progress: Math.round(progress) };
    };

    const playerLevel = calculateLevel(totalPoints);
    const isOwnProfile = currentUserId === player?.user_id;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center gap-4">
                <Users className="w-16 h-16 text-slate-300" />
                <p className="text-white/40 font-medium">Player not found</p>
                <Button onClick={() => handleBack()} variant="outline">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 overflow-x-hidden">
            {/* Header Bar */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between z-50">
                <button onClick={() => handleBack()} className="p-2 -ml-2">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-black italic tracking-tighter text-slate-900">{player?.name || "PROFILE"}</h1>
                <button onClick={handleShare} className="p-2 -mr-2">
                    <Share2 className="w-5 h-5 text-slate-600" />
                </button>
            </div>

            {/* DYNAMIC SPORTS HEADER (like Profile.tsx) */}
            <div className="relative pt-16 pb-12 px-6 overflow-hidden">
                <div
                    className="absolute top-0 left-0 w-full h-[90%] bg-white/5 -z-10 origin-top-left -skew-y-6 translate-y-[-10%] border-b-8 border-white/10/50"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.03) 1px, transparent 0)`,
                        backgroundSize: '16px 16px'
                    }}
                ></div>
                <div className="absolute top-10 right-[-20px] opacity-[0.03] rotate-12 -z-10">
                    <Trophy className="w-48 h-48 text-slate-900" />
                </div>
                <div className="absolute bottom-10 left-[-30px] opacity-[0.03] -rotate-12 -z-10">
                    <Zap className="w-40 h-40 text-slate-900" />
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -mr-32 -mt-32 -z-10"></div>

                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Avatar with Level Ring */}
                    <div className="relative group">
                        <svg className="w-36 h-36 -rotate-90">
                            <circle cx="72" cy="72" r="68" fill="transparent" stroke="currentColor" strokeWidth="2" className="text-slate-200" />
                            <circle cx="72" cy="72" r="68" fill="transparent" stroke="currentColor" strokeWidth="6"
                                strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * (1 - playerLevel.progress / 100)}
                                strokeLinecap="round" className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-28 h-28 rounded-[36px] bg-white p-1.5 shadow-2xl relative overflow-hidden ring-4 ring-slate-50">
                                <Avatar className="w-full h-full rounded-[30px] border-0">
                                    <AvatarImage src={player?.photo_url} className="object-cover" />
                                    <AvatarFallback className="bg-white/5 text-white/40 text-3xl font-black italic">
                                        {player?.name?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-500 text-white px-4 py-1.5 rounded-xl text-[11px] font-black italic uppercase tracking-tighter shadow-xl shadow-amber-500/20 border-2 border-white">
                            <Trophy className="w-3 h-3 fill-current" />
                            LVL {playerLevel.level}
                        </div>
                    </div>

                    {/* Name + Badge */}
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center justify-center gap-2 drop-shadow-sm">
                            {player?.name}
                            <Badge className="bg-slate-900 text-amber-400 hover:bg-slate-800 border-0 text-[10px] h-5 px-2.5 font-black italic tracking-widest shadow-lg">PRO</Badge>
                        </h2>
                        <div className="inline-block px-5 py-1.5 bg-slate-900 rounded-xl shadow-lg border-b-2 border-slate-800">
                            <p className="text-[10px] font-black italic uppercase tracking-[0.4em] text-amber-400">{playerLevel.title}</p>
                        </div>
                    </div>

                    {/* XP / Battles */}
                    <div className="flex items-center gap-10 pt-2">
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-black italic text-slate-900 leading-none tracking-tight">{totalPoints}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1.5">TOTAL XP</span>
                        </div>
                        <div className="w-px h-10 bg-slate-200 rotate-12"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-black italic text-slate-900 leading-none tracking-tight">{stats.totalMatches}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1.5">BATTLES</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid (Followers, Rating, Tourneys) */}
            <div className="px-6 -mt-6 relative z-30">
                <div className="bg-white border-2 border-white/10 rounded-[32px] p-2 shadow-2xl shadow-slate-900/5">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center py-6 rounded-[28px] bg-white/5/50 hover:bg-blue-50 transition-all group">
                            <Users className="w-5 h-5 text-blue-600 mb-1.5" />
                            <span className="text-xl font-black italic text-slate-900 leading-none">{stats.followersCount}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/40 mt-1.5">Followers</span>
                        </div>
                        <div className="flex flex-col items-center py-6 rounded-[28px] bg-white/5/50 hover:bg-orange-50 transition-all group">
                            <Flame className="w-5 h-5 text-orange-600 mb-1.5 animate-pulse" />
                            <span className="text-xl font-black italic text-slate-900 leading-none">{allRounderScore}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/40 mt-1.5">Rating</span>
                        </div>
                        <div className="flex flex-col items-center py-6 rounded-[28px] bg-white/5/50 hover:bg-amber-50 transition-all group">
                            <Trophy className="w-5 h-5 text-amber-500 mb-1.5" />
                            <span className="text-xl font-black italic text-slate-900 leading-none">{tournaments.length}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/40 mt-1.5">Tourneys</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Follow / Edit Button */}
            <div className="px-6 mt-4">
                {isOwnProfile ? (
                    <Button onClick={() => navigate('/profile')} className="w-full rounded-2xl h-12 bg-slate-900 hover:bg-slate-800 text-white font-black italic uppercase tracking-wider">
                        Edit Profile
                    </Button>
                ) : (
                    <Button onClick={handleFollow} disabled={followLoading} className={`w-full rounded-2xl h-12 gap-2 font-black italic uppercase tracking-wider ${isFollowing ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}>
                        {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                    </Button>
                )}
            </div>

            {/* TABS */}
            <Tabs defaultValue="stats" className="w-full mt-8" onValueChange={setMainTab}>
                <div className="px-6 mb-6">
                    <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200 h-auto w-full">
                        <TabsTrigger value="stats" className="flex-1 rounded-xl px-8 py-2.5 text-[11px] font-black italic uppercase tracking-tighter data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all border-0">Stats</TabsTrigger>
                        <TabsTrigger value="posts" className="flex-1 rounded-xl px-8 py-2.5 text-[11px] font-black italic uppercase tracking-tighter data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all border-0">Posts</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="stats" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="px-6">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="bg-transparent gap-6 h-auto p-0 mb-6 overflow-x-auto no-scrollbar justify-start border-0">
                                {['overview', 'matches', 'teams', 'tourneys', 'clips'].map((tab) => (
                                    <TabsTrigger key={tab} value={tab}
                                        className="p-0 text-[11px] font-black italic uppercase tracking-widest text-white/40 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent relative after:absolute after:bottom-0 after:left-0 after:w-0 data-[state=active]:after:w-[80%] after:h-1.5 after:bg-amber-500 after:transition-all after:duration-300 pb-3 border-0">
                                        {tab === 'tourneys' ? 'Tourneys' : tab === 'clips' ? 'Clips' : tab}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* OVERVIEW TAB */}
                            <TabsContent value="overview" className="mt-0 space-y-8">
                                {/* Raider Performance */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[11px] font-black italic uppercase tracking-widest text-white/40 flex items-center gap-2">
                                            <Zap className="w-3 h-3 text-red-600" /> Raider Performance
                                        </h3>
                                        <Badge variant="outline" className="text-[10px] font-black italic border-red-600/20 text-red-600 bg-red-50 px-3">SR: {raidStrikeRate}%</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white border-2 border-white/10 p-5 rounded-[32px] shadow-sm">
                                            <div className="flex justify-between items-end mb-3">
                                                <span className="text-[9px] font-black italic uppercase text-white/40">Raid Points</span>
                                                <span className="text-2xl font-black italic text-slate-900 leading-none">{stats.raidPoints}</span>
                                            </div>
                                            <Progress value={(stats.raidPoints / 500) * 100} className="h-2 bg-slate-100" />
                                        </div>
                                        <div className="bg-white border-2 border-white/10 p-5 rounded-[32px] shadow-sm">
                                            <div className="flex justify-between items-end mb-3">
                                                <span className="text-[9px] font-black italic uppercase text-white/40">Success Rate</span>
                                                <span className="text-2xl font-black italic text-slate-900 leading-none">{raidStrikeRate}%</span>
                                            </div>
                                            <Progress value={raidStrikeRate} className="h-2 bg-slate-100" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[{ l: 'Touch', v: stats.touchPoints }, { l: 'Bonus', v: stats.bonusPoints }, { l: 'S. Raid', v: stats.superRaids }].map((s, i) => (
                                            <div key={i} className="bg-white p-4 rounded-2xl border-2 border-white/10 text-center shadow-sm">
                                                <p className="text-[8px] font-black italic uppercase text-white/40 mb-1">{s.l}</p>
                                                <p className="text-xl font-black italic text-slate-900">{s.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Defender Performance */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[11px] font-black italic uppercase tracking-widest text-white/40 flex items-center gap-2">
                                            <Award className="w-3 h-3 text-blue-600" /> Defender Performance
                                        </h3>
                                        <Badge variant="outline" className="text-[10px] font-black italic border-blue-600/20 text-blue-600 bg-blue-50 px-3">ACC: {tackleSuccessRate}%</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white border-2 border-white/10 p-5 rounded-[32px] shadow-sm">
                                            <div className="flex justify-between items-end mb-3">
                                                <span className="text-[9px] font-black italic uppercase text-white/40">Tackle Points</span>
                                                <span className="text-2xl font-black italic text-slate-900 leading-none">{stats.tacklePoints}</span>
                                            </div>
                                            <Progress value={(stats.tacklePoints / 250) * 100} className="h-2 bg-slate-100" />
                                        </div>
                                        <div className="bg-white border-2 border-white/10 p-5 rounded-[32px] shadow-sm">
                                            <div className="flex justify-between items-end mb-3">
                                                <span className="text-[9px] font-black italic uppercase text-white/40">Success Rate</span>
                                                <span className="text-2xl font-black italic text-slate-900 leading-none">{tackleSuccessRate}%</span>
                                            </div>
                                            <Progress value={tackleSuccessRate} className="h-2 bg-slate-100" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[{ l: 'Tackles', v: stats.successfulTackles }, { l: 'S. Tackle', v: stats.superTackles }, { l: 'Success', v: tackleSuccessRate + '%' }].map((s, i) => (
                                            <div key={i} className="bg-white p-4 rounded-2xl border-2 border-white/10 text-center shadow-sm">
                                                <p className="text-[8px] font-black italic uppercase text-white/40 mb-1">{s.l}</p>
                                                <p className="text-xl font-black italic text-slate-900">{s.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Season XP & Battles Cards */}
                                <div className="grid grid-cols-2 gap-4 pb-8">
                                    <Card className="bg-white border-2 border-white/10 rounded-[32px] overflow-hidden shadow-sm">
                                        <CardContent className="p-6 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black italic uppercase tracking-widest text-white/40">Season XP</span>
                                                <p className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">{totalPoints}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Zap className="w-6 h-6 fill-current" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white border-2 border-white/10 rounded-[32px] overflow-hidden shadow-sm">
                                        <CardContent className="p-6 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black italic uppercase tracking-widest text-white/40">Battles</span>
                                                <p className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">{stats.totalMatches}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                                <Award className="w-6 h-6 fill-current" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* MATCHES TAB */}
                            <TabsContent value="matches" className="mt-0 space-y-4">
                                {matches.length === 0 ? (
                                    <div className="py-20 text-center text-slate-300 bg-white rounded-[32px] border-2 border-white/10 shadow-sm">
                                        <Swords className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                        <p className="text-xs font-black italic uppercase tracking-widest">No matches yet</p>
                                    </div>
                                ) : (
                                    matches.map((match: any) => (
                                        <Card key={match.id} className="bg-white border-2 border-white/10 rounded-[32px] overflow-hidden cursor-pointer hover:border-amber-500/20 transition-all shadow-sm">
                                            <CardContent className="p-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border-2 border-white/10">
                                                            <Swords className="w-6 h-6 text-white/40" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black italic uppercase text-slate-900 tracking-tight">{match.match_name}</p>
                                                            <p className="text-[10px] font-black italic text-white/40 uppercase tracking-widest mt-1">
                                                                {match.tournaments?.name || 'Friendly'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </TabsContent>

                            {/* TEAMS TAB */}
                            <TabsContent value="teams" className="mt-0 space-y-4">
                                {teams.length === 0 ? (
                                    <div className="py-20 text-center text-slate-300 bg-white rounded-[32px] border-2 border-white/10 shadow-sm">
                                        <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                        <p className="text-xs font-black italic uppercase tracking-widest">No teams yet</p>
                                    </div>
                                ) : (
                                    teams.map((t: any) => (
                                        <Card key={t.id} onClick={() => navigate(`/teams/${t.id}`)} className="bg-white border-2 border-white/10 rounded-[32px] overflow-hidden cursor-pointer hover:border-blue-500/20 transition-all shadow-sm">
                                            <CardContent className="p-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <Avatar className="w-14 h-14 rounded-2xl border-4 border-white/10 shadow-sm">
                                                            <AvatarImage src={t.logo_url} />
                                                            <AvatarFallback className="bg-white/5 text-white/40 text-xs font-black italic">{t.name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <p className="text-sm font-black italic uppercase text-slate-900 tracking-tight">{t.name}</p>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </TabsContent>

                            {/* TOURNEYS TAB */}
                            <TabsContent value="tourneys" className="mt-0 space-y-4">
                                {tournaments.length === 0 ? (
                                    <div className="py-20 text-center text-slate-300 bg-white rounded-[32px] border-2 border-white/10 shadow-sm">
                                        <Trophy className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                        <p className="text-xs font-black italic uppercase tracking-widest">No tournaments yet</p>
                                    </div>
                                ) : (
                                    tournaments.map((t: any) => (
                                        <Card key={t.id} onClick={() => navigate(`/tournaments/${t.id}`)} className="bg-white border-2 border-white/10 rounded-[32px] overflow-hidden cursor-pointer hover:border-amber-500/20 transition-all shadow-sm">
                                            <CardContent className="p-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <Avatar className="w-14 h-14 rounded-2xl border-4 border-white/10 shadow-sm">
                                                            <AvatarImage src={t.logo_url} />
                                                            <AvatarFallback className="bg-white/5 text-white/40 text-xs font-black italic">{t.name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <p className="text-sm font-black italic uppercase text-slate-900 tracking-tight">{t.name}</p>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </TabsContent>

                            {/* CLIPS TAB */}
                            <TabsContent value="clips" className="mt-0">
                                <div className="py-24 text-center text-slate-300 bg-white rounded-[32px] border-2 border-white/10 shadow-sm">
                                    <Video className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                    <p className="text-xs font-black italic uppercase tracking-widest">Clips coming soon...</p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </TabsContent>

                <TabsContent value="posts" className="mt-0 px-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
                    <div className="py-24 text-center text-slate-300 bg-white rounded-[32px] border-2 border-white/10 shadow-sm">
                        <Star className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="text-xs font-black italic uppercase tracking-widest">No posts yet</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PlayerProfile;

