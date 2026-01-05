import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    BarChart3, Users, Trophy, TrendingUp, TrendingDown, Download,
    Calendar, Clock, Target, Shield, Activity, Medal, RefreshCw
} from 'lucide-react';

interface AnalyticsData {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalMatches: number;
    liveMatches: number;
    completedMatches: number;
    scheduledMatches: number;
    totalTournaments: number;
    activeTournaments: number;
    completedTournaments: number;
    totalPlayers: number;
    totalTeams: number;
    avgMatchDuration: number;
    totalRaidPoints: number;
    totalTacklePoints: number;
    totalMatchEvents: number;
}

interface DailyStats {
    date: string;
    matches: number;
    users: number;
}

const Analytics = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('7d');
    const [data, setData] = useState<AnalyticsData>({
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        totalMatches: 0,
        liveMatches: 0,
        completedMatches: 0,
        scheduledMatches: 0,
        totalTournaments: 0,
        activeTournaments: 0,
        completedTournaments: 0,
        totalPlayers: 0,
        totalTeams: 0,
        avgMatchDuration: 0,
        totalRaidPoints: 0,
        totalTacklePoints: 0,
        totalMatchEvents: 0,
    });

    const [topPlayers, setTopPlayers] = useState<any[]>([]);
    const [recentMatches, setRecentMatches] = useState<any[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [topTeams, setTopTeams] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const getDateRange = () => {
        const now = new Date();
        let startDate: Date;
        switch (timeRange) {
            case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
            case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
            default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        return { startDate, now };
    };

    const fetchAnalytics = async () => {
        try {
            const { startDate, now } = getDateRange();

            // Fetch all counts in parallel with individual error handling
            const totalUsersResult = await Promise.resolve(supabase.from('profiles').select('*', { count: 'exact', head: true })).then(r => r).catch(() => ({ count: 0 }));
            const newUsersResult = await Promise.resolve(supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString())).then(r => r).catch(() => ({ count: 0 }));
            const totalMatchesResult = await Promise.resolve(supabase.from('matches').select('*', { count: 'exact', head: true })).then(r => r).catch(() => ({ count: 0 }));
            const liveMatchesResult = await Promise.resolve(supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'live')).then(r => r).catch(() => ({ count: 0 }));
            const completedMatchesResult = await Promise.resolve(supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed')).then(r => r).catch(() => ({ count: 0 }));
            const scheduledMatchesResult = await Promise.resolve(supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'scheduled')).then(r => r).catch(() => ({ count: 0 }));
            const totalTournamentsResult = await Promise.resolve(supabase.from('tournaments').select('*', { count: 'exact', head: true })).then(r => r).catch(() => ({ count: 0 }));
            const activeTournamentsResult = await Promise.resolve(supabase.from('tournaments').select('*', { count: 'exact', head: true }).in('status', ['Active', 'upcoming', 'in_progress'])).then(r => r).catch(() => ({ count: 0 }));
            const completedTournamentsResult = await Promise.resolve(supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'completed')).then(r => r).catch(() => ({ count: 0 }));
            const totalPlayersResult = await Promise.resolve(supabase.from('players').select('*', { count: 'exact', head: true })).then(r => r).catch(() => ({ count: 0 }));
            const totalTeamsResult = await Promise.resolve(supabase.from('teams').select('*', { count: 'exact', head: true })).then(r => r).catch(() => ({ count: 0 }));
            const matchEventsResult = await Promise.resolve(supabase.from('match_events').select('*', { count: 'exact', head: true })).then(r => r).catch(() => ({ count: 0 }));

            // Fetch top players by XP with detailed stats
            const { data: playersData } = await Promise.resolve(supabase
                .from('players')
                .select('id, name, total_xp, current_level, raid_points, tackle_points, matches_played')
                .order('total_xp', { ascending: false })
                .limit(10))
                .then(r => r)
                .catch(() => ({ data: [] }));

            // Fetch top teams by wins
            const { data: teamsData } = await Promise.resolve(supabase
                .from('teams')
                .select('id, name, wins, losses, logo_url')
                .order('wins', { ascending: false })
                .limit(5))
                .then(r => r)
                .catch(() => ({ data: [] }));

            // Fetch recent matches with team info
            const { data: matchesData } = await Promise.resolve(supabase
                .from('matches')
                .select(`id, team_a_score, team_b_score, status, created_at, match_date, team_a:team_a_id(name), team_b:team_b_id(name)`)
                .order('created_at', { ascending: false })
                .limit(10))
                .then(r => r)
                .catch(() => ({ data: [] }));

            // Fetch matches in the time range for daily stats
            const { data: rangeMatchesData } = await Promise.resolve(supabase
                .from('matches')
                .select('id, created_at, status')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true }))
                .then(r => r)
                .catch(() => ({ data: [] }));

            // Fetch users in the time range for daily stats
            const { data: rangeUsersData } = await Promise.resolve(supabase
                .from('profiles')
                .select('id, created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true }))
                .then(r => r)
                .catch(() => ({ data: [] }));

            // Calculate daily stats
            const dailyStatsMap = new Map<string, { matches: number; users: number }>();
            const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

            for (let i = 0; i < days; i++) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const dateStr = date.toISOString().split('T')[0];
                dailyStatsMap.set(dateStr, { matches: 0, users: 0 });
            }

            (rangeMatchesData || []).forEach(m => {
                const dateStr = new Date(m.created_at).toISOString().split('T')[0];
                if (dailyStatsMap.has(dateStr)) {
                    dailyStatsMap.get(dateStr)!.matches++;
                }
            });

            (rangeUsersData || []).forEach(u => {
                const dateStr = new Date(u.created_at).toISOString().split('T')[0];
                if (dailyStatsMap.has(dateStr)) {
                    dailyStatsMap.get(dateStr)!.users++;
                }
            });

            const dailyStatsArray = Array.from(dailyStatsMap.entries())
                .map(([date, stats]) => ({ date, ...stats }))
                .reverse();

            setDailyStats(dailyStatsArray);

            // Calculate total raid and tackle points
            const totalRaidPoints = (playersData || []).reduce((sum, p) => sum + (p.raid_points || 0), 0);
            const totalTacklePoints = (playersData || []).reduce((sum, p) => sum + (p.tackle_points || 0), 0);

            // Estimate active users (users who played matches recently)
            const uniquePlayerIds = new Set<string>();
            (rangeMatchesData || []).forEach(() => {
                // In a real scenario, you'd track player participation
                // For now, estimate based on match count
            });

            // Estimate active users as ratio of completed matches to total
            const completedCount = completedMatchesResult.count || 0;
            const totalCount = totalUsersResult.count || 0;
            const activeUserEstimate = Math.min(totalCount, Math.floor(completedCount * 14) + Math.floor(totalCount * 0.3));

            setData({
                totalUsers: totalUsersResult.count || 0,
                activeUsers: activeUserEstimate,
                newUsers: newUsersResult.count || 0,
                totalMatches: totalMatchesResult.count || 0,
                liveMatches: liveMatchesResult.count || 0,
                completedMatches: completedMatchesResult.count || 0,
                scheduledMatches: scheduledMatchesResult.count || 0,
                totalTournaments: totalTournamentsResult.count || 0,
                activeTournaments: activeTournamentsResult.count || 0,
                completedTournaments: completedTournamentsResult.count || 0,
                totalPlayers: totalPlayersResult.count || 0,
                totalTeams: totalTeamsResult.count || 0,
                avgMatchDuration: 45, // This would need match duration tracking
                totalRaidPoints,
                totalTacklePoints,
                totalMatchEvents: matchEventsResult.count || 0,
            });

            setTopPlayers(playersData || []);
            setTopTeams(teamsData || []);
            setRecentMatches((matchesData || []).map((m: any) => ({
                ...m,
                team_a_name: m.team_a?.name || 'Team A',
                team_b_name: m.team_b?.name || 'Team B',
            })));

        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch analytics data. Some tables may not exist yet.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAnalytics();
    };

    const handleExport = () => {
        const reportData = {
            generatedAt: new Date().toISOString(),
            timeRange,
            summary: data,
            topPlayers: topPlayers.map(p => ({
                name: p.name,
                xp: p.total_xp,
                level: p.current_level,
                raidPoints: p.raid_points,
                tacklePoints: p.tackle_points,
            })),
            topTeams: topTeams.map(t => ({
                name: t.name,
                wins: t.wins,
                losses: t.losses,
            })),
            dailyStats,
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Report Exported', description: 'Analytics report downloaded successfully' });
    };

    const getGrowthIndicator = (current: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((current / total) * 100);
    };

    if (loading) {
        return (
            <AdminLayout title="Analytics">
                <div className="p-8 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-slate-500">Loading analytics...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Analytics Dashboard">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-between items-center mb-6">
                    <TabsList className="bg-white border">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="matches">Matches</TabsTrigger>
                        <TabsTrigger value="engagement">Engagement</TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-32 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="24h">Last 24h</SelectItem>
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                                <SelectItem value="90d">Last 90 Days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" /> Export
                        </Button>
                    </div>
                </div>

                <TabsContent value="overview" className="mt-0">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">Total Users</p>
                                        <p className="text-3xl font-bold text-slate-800">{data.totalUsers.toLocaleString()}</p>
                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> +{data.newUsers} new ({timeRange})
                                        </p>
                                    </div>
                                    <Users className="w-10 h-10 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">Total Matches</p>
                                        <p className="text-3xl font-bold text-slate-800">{data.totalMatches.toLocaleString()}</p>
                                        <p className="text-xs text-green-600">{data.liveMatches} live now</p>
                                    </div>
                                    <Trophy className="w-10 h-10 text-amber-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">Active Tournaments</p>
                                        <p className="text-3xl font-bold text-slate-800">{data.activeTournaments}</p>
                                        <p className="text-xs text-slate-500">of {data.totalTournaments} total</p>
                                    </div>
                                    <Medal className="w-10 h-10 text-purple-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">Total Players</p>
                                        <p className="text-3xl font-bold text-slate-800">{data.totalPlayers.toLocaleString()}</p>
                                        <p className="text-xs text-slate-500">{data.totalTeams} teams</p>
                                    </div>
                                    <Activity className="w-10 h-10 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Top Players */}
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Medal className="w-5 h-5 text-amber-500" /> Top Players by XP
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {topPlayers.slice(0, 5).map((player, index) => (
                                        <div key={player.id} className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                                index === 1 ? 'bg-slate-200 text-slate-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">{player.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    Level {player.current_level || 1} • {player.matches_played || 0} matches
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-blue-600">{(player.total_xp || 0).toLocaleString()} XP</p>
                                                <p className="text-xs text-slate-500">
                                                    R:{player.raid_points || 0} T:{player.tackle_points || 0}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {topPlayers.length === 0 && <p className="text-center text-slate-400 py-4">No player data</p>}
                            </CardContent>
                        </Card>

                        {/* Recent Matches */}
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-green-500" /> Recent Matches
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {recentMatches.slice(0, 5).map(match => (
                                        <div key={match.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                            <div className="flex-1 text-right">
                                                <p className="font-medium text-slate-800">{match.team_a_name}</p>
                                            </div>
                                            <div className="px-3 py-1 bg-white rounded-lg font-bold">
                                                {match.team_a_score} - {match.team_b_score}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">{match.team_b_name}</p>
                                            </div>
                                            <Badge className={
                                                match.status === 'live' ? 'bg-red-100 text-red-700' :
                                                    match.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        'bg-amber-100 text-amber-700'
                                            }>
                                                {match.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                                {recentMatches.length === 0 && <p className="text-center text-slate-400 py-4">No match data</p>}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Teams */}
                    <Card className="bg-white border-none shadow-sm mt-6">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-500" /> Top Teams by Wins
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-5 gap-4">
                                {topTeams.map((team, index) => (
                                    <div key={team.id} className="text-center p-4 bg-slate-50 rounded-lg">
                                        <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {team.name?.charAt(0) || 'T'}
                                        </div>
                                        <p className="font-medium text-slate-800 truncate">{team.name}</p>
                                        <p className="text-sm text-green-600">{team.wins || 0} W</p>
                                        <p className="text-xs text-slate-500">{team.losses || 0} L</p>
                                    </div>
                                ))}
                                {topTeams.length === 0 && (
                                    <div className="col-span-5 text-center text-slate-400 py-4">No team data</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="mt-0">
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-slate-800">{data.totalUsers.toLocaleString()}</p>
                                <p className="text-sm text-slate-500">Total Users</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-green-600">{data.activeUsers.toLocaleString()}</p>
                                <p className="text-sm text-slate-500">Active Users (Est.)</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-blue-600">{data.newUsers.toLocaleString()}</p>
                                <p className="text-sm text-slate-500">New Users ({timeRange})</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-purple-600">{getGrowthIndicator(data.activeUsers, data.totalUsers)}%</p>
                                <p className="text-sm text-slate-500">Activity Rate</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Daily User Growth Chart */}
                    <Card className="bg-white border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">New Users Over Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-1 h-32">
                                {dailyStats.slice(-14).map((day, i) => {
                                    const maxUsers = Math.max(...dailyStats.map(d => d.users), 1);
                                    const height = (day.users / maxUsers) * 100;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div
                                                className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t min-h-[4px]"
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                                title={`${day.date}: ${day.users} users`}
                                            />
                                            <span className="text-[8px] text-slate-400 rotate-45 origin-left">
                                                {new Date(day.date).getDate()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="matches" className="mt-0">
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-slate-800">{data.totalMatches.toLocaleString()}</p>
                                <p className="text-sm text-slate-500">Total Matches</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-red-600">{data.liveMatches}</p>
                                <p className="text-sm text-slate-500">Live Now</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-green-600">{data.completedMatches}</p>
                                <p className="text-sm text-slate-500">Completed</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-amber-600">{data.scheduledMatches}</p>
                                <p className="text-sm text-slate-500">Scheduled</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-6 text-center">
                                <Target className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                                <p className="text-4xl font-bold text-amber-600">{data.totalRaidPoints.toLocaleString()}</p>
                                <p className="text-slate-500">Total Raid Points</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-6 text-center">
                                <Shield className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                                <p className="text-4xl font-bold text-blue-600">{data.totalTacklePoints.toLocaleString()}</p>
                                <p className="text-slate-500">Total Tackle Points</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Daily Matches Chart */}
                    <Card className="bg-white border-none shadow-sm mt-6">
                        <CardHeader>
                            <CardTitle className="text-base">Matches Over Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-1 h-32">
                                {dailyStats.slice(-14).map((day, i) => {
                                    const maxMatches = Math.max(...dailyStats.map(d => d.matches), 1);
                                    const height = (day.matches / maxMatches) * 100;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div
                                                className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t min-h-[4px]"
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                                title={`${day.date}: ${day.matches} matches`}
                                            />
                                            <span className="text-[8px] text-slate-400 rotate-45 origin-left">
                                                {new Date(day.date).getDate()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="engagement" className="mt-0">
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader><CardTitle className="text-base">Engagement Metrics</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Active Users (Est.)</span>
                                        <span className="font-bold">{data.activeUsers.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">New Users ({timeRange})</span>
                                        <span className="font-bold">{data.newUsers.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Total Match Events</span>
                                        <span className="font-bold">{data.totalMatchEvents.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Activity Rate</span>
                                        <span className="font-bold">{getGrowthIndicator(data.activeUsers, data.totalUsers)}%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader><CardTitle className="text-base">Content Activity</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Matches Completed</span>
                                        <span className="font-bold">{data.completedMatches}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Tournaments Active</span>
                                        <span className="font-bold">{data.activeTournaments}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Players Registered</span>
                                        <span className="font-bold">{data.totalPlayers}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Avg Points Per Match</span>
                                        <span className="font-bold">
                                            {data.completedMatches > 0
                                                ? Math.floor((data.totalRaidPoints + data.totalTacklePoints) / data.completedMatches)
                                                : 0}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tournament Stats */}
                    <Card className="bg-white border-none shadow-sm mt-6">
                        <CardHeader><CardTitle className="text-base">Tournament Overview</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <p className="text-3xl font-bold text-green-600">{data.activeTournaments}</p>
                                    <p className="text-sm text-slate-500">Active</p>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <p className="text-3xl font-bold text-blue-600">{data.completedTournaments}</p>
                                    <p className="text-sm text-slate-500">Completed</p>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <p className="text-3xl font-bold text-purple-600">{data.totalTournaments}</p>
                                    <p className="text-sm text-slate-500">Total</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AdminLayout>
    );
};

export default Analytics;
