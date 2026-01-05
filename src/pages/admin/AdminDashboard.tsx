import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Users, Trophy, Swords, Shield, Settings, BarChart3,
    Activity, AlertTriangle, Eye, Clock, TrendingUp,
    FileText, ChevronRight, LogOut, LayoutDashboard,
    Search, Ban, Flag, Award, Edit, Lock, UserPlus,
    DollarSign, CheckCircle, Zap, Server, Wifi, Database,
    Play, Pause, RefreshCw, Bell, AlertCircle, UserCircle,
    Medal, ClipboardList, FileDown, Ticket, History, ShieldCheck, Code
} from 'lucide-react';

interface Stats {
    totalUsers: number;
    liveMatches: number;
    upcomingMatches: number;
    completedToday: number;
    activeTournaments: number;
    pendingReports: number;
    totalPlayers: number;
    totalTeams: number;
}

interface LiveMatch {
    id: string;
    team_a_name: string;
    team_b_name: string;
    team_a_score: number;
    team_b_score: number;
    status: string;
    current_half: number;
}

interface RecentEvent {
    id: string;
    type: string;
    description: string;
    match_name: string;
    timestamp: string;
}

interface SupportTicketRow {
    id: string;
    subject: string;
    status: string;
    priority: string;
    user_id: string;
    created_at: string;
}

interface SystemHealth {
    database: 'healthy' | 'warning' | 'error';
    realtime: 'connected' | 'disconnected';
    latency: number;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        liveMatches: 0,
        upcomingMatches: 0,
        completedToday: 0,
        activeTournaments: 0,
        pendingReports: 0,
        totalPlayers: 0,
        totalTeams: 0,
    });
    const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
    const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
    const [pendingTickets, setPendingTickets] = useState<SupportTicketRow[]>([]);
    const [todayActivity, setTodayActivity] = useState({
        activeUsers: 0,
        newUsersToday: 0,
        matchesPlayedToday: 0,
        weeklyData: [] as number[],
    });
    const [systemHealth, setSystemHealth] = useState<SystemHealth>({
        database: 'healthy',
        realtime: 'connected',
        latency: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: Shield, label: 'Teams', path: '/admin/teams' },
        { icon: UserCircle, label: 'Players', path: '/admin/players' },
        { icon: Trophy, label: 'Tournaments', path: '/admin/tournaments' },
        { icon: Swords, label: 'Matches', path: '/admin/matches' },
        { icon: Activity, label: 'Live Monitor', path: '/admin/live' },
        { icon: ClipboardList, label: 'Event Log', path: '/admin/event-log' },
        { icon: FileText, label: 'Content', path: '/admin/content' },
        { icon: Award, label: 'Rank Engine', path: '/admin/ranks' },
        { icon: Medal, label: 'Achievements', path: '/admin/achievements' },
        { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
        { icon: DollarSign, label: 'Sponsorship', path: '/admin/sponsorship' },
        { icon: FileDown, label: 'Reports', path: '/admin/reports' },
        { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
        { icon: Ticket, label: 'Support', path: '/admin/support' },
        { icon: History, label: 'Audit Logs', path: '/admin/audit-logs' },
        { icon: ShieldCheck, label: 'RBAC', path: '/admin/rbac' },
        { icon: Code, label: 'Developer', path: '/admin/developer' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    useEffect(() => {
        fetchDashboardData();
        checkSystemHealth();

        // Real-time subscription for matches
        const matchesChannel = supabase
            .channel('admin-dashboard-matches')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        // Real-time subscription for match events
        const eventsChannel = supabase
            .channel('admin-dashboard-events')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, (payload) => {
                fetchRecentEvents();
            })
            .subscribe();

        // Real-time subscription for support tickets
        const ticketsChannel = supabase
            .channel('admin-dashboard-tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                fetchPendingTickets();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(matchesChannel);
            supabase.removeChannel(eventsChannel);
            supabase.removeChannel(ticketsChannel);
        };
    }, []);

    const checkSystemHealth = async () => {
        const startTime = Date.now();
        try {
            // Simple query to check database health
            const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            const latency = Date.now() - startTime;

            setSystemHealth({
                database: error ? 'error' : 'healthy',
                realtime: 'connected',
                latency,
            });
        } catch {
            setSystemHealth({
                database: 'error',
                realtime: 'disconnected',
                latency: 0,
            });
        }
    };

    const fetchRecentEvents = async () => {
        try {
            const { data } = await supabase
                .from('match_events')
                .select(`
                    id, event_type, points, created_at,
                    match:match_id(id, team_a:team_a_id(name), team_b:team_b_id(name)),
                    player:player_id(name)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                const formattedEvents = data.map((e: any) => {
                    const matchName = e.match ?
                        `${e.match.team_a?.name || 'Team A'} vs ${e.match.team_b?.name || 'Team B'}` :
                        'Unknown Match';
                    const timestamp = getRelativeTime(new Date(e.created_at));
                    const description = formatEventDescription(e.event_type, e.points, e.player?.name);

                    return {
                        id: e.id,
                        type: e.event_type,
                        description,
                        match_name: matchName,
                        timestamp,
                    };
                });
                setRecentEvents(formattedEvents);
            }
        } catch (error) {
            console.error('Error fetching recent events:', error);
        }
    };

    const fetchPendingTickets = async () => {
        try {
            const { data } = await supabase
                .from('support_tickets')
                .select('*')
                .in('status', ['open', 'pending'])
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) {
                setPendingTickets(data);
            }
        } catch (error) {
            console.error('Error fetching pending tickets:', error);
        }
    };

    const formatEventDescription = (type: string, points: number, playerName?: string) => {
        const prefix = playerName ? `${playerName}: ` : '';
        switch (type) {
            case 'raid_point': return `${prefix}Raid Point (+${points || 1})`;
            case 'tackle_point': return `${prefix}Tackle Point (+${points || 1})`;
            case 'super_raid': return `${prefix}Super Raid (+${points || 3})`;
            case 'super_tackle': return `${prefix}Super Tackle (+${points || 2})`;
            case 'all_out': return `${prefix}ALL OUT! (+${points || 2})`;
            case 'timeout': return `${prefix}Timeout Called`;
            case 'bonus_point': return `${prefix}Bonus Point (+${points || 1})`;
            default: return `${prefix}${type.replace('_', ' ')} (+${points || 0})`;
        }
    };

    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        return `${diffDays} days ago`;
    };

    const fetchDashboardData = async () => {
        try {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            const [
                users,
                live,
                upcoming,
                completed,
                tournaments,
                players,
                teams,
                newUsersToday,
                matchesToday,
            ] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }),
                supabase.from('matches').select('*, team_a:team_a_id(name), team_b:team_b_id(name)').eq('status', 'live'),
                supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
                supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('match_date', todayStr),
                supabase.from('tournaments').select('id', { count: 'exact', head: true }).in('status', ['Active', 'upcoming', 'in_progress']),
                supabase.from('players').select('id', { count: 'exact', head: true }),
                supabase.from('teams').select('id', { count: 'exact', head: true }),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
                supabase.from('matches').select('id, created_at').gte('created_at', weekAgo.toISOString()),
            ]);

            // Fetch pending support tickets count
            const { count: pendingTicketsCount } = await supabase
                .from('support_tickets')
                .select('id', { count: 'exact', head: true })
                .in('status', ['open', 'pending']);

            setStats({
                totalUsers: users.count || 0,
                liveMatches: live.data?.length || 0,
                upcomingMatches: upcoming.count || 0,
                completedToday: completed.count || 0,
                activeTournaments: tournaments.count || 0,
                pendingReports: pendingTicketsCount || 0,
                totalPlayers: players.count || 0,
                totalTeams: teams.count || 0,
            });

            // Calculate weekly activity data
            const weeklyData = calculateWeeklyActivity(matchesToday.data || []);

            // Calculate approximate active users (users who have matches or recent activity)
            const activeUserEstimate = Math.floor((users.count || 0) * 0.6);

            setTodayActivity({
                activeUsers: activeUserEstimate,
                newUsersToday: newUsersToday.count || 0,
                matchesPlayedToday: completed.count || 0,
                weeklyData,
            });

            // Format live matches
            if (live.data) {
                const formatted = live.data.map((m: any) => ({
                    id: m.id,
                    team_a_name: m.team_a?.name || 'Team A',
                    team_b_name: m.team_b?.name || 'Team B',
                    team_a_score: m.team_a_score || 0,
                    team_b_score: m.team_b_score || 0,
                    status: 'live',
                    current_half: m.current_half || 1,
                }));
                setLiveMatches(formatted);
            }

            // Fetch recent events and pending tickets
            await Promise.all([
                fetchRecentEvents(),
                fetchPendingTickets(),
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateWeeklyActivity = (matches: any[]) => {
        const days = [0, 0, 0, 0, 0, 0, 0];
        const today = new Date();

        matches.forEach(m => {
            const matchDate = new Date(m.created_at);
            const dayDiff = Math.floor((today.getTime() - matchDate.getTime()) / 86400000);
            if (dayDiff >= 0 && dayDiff < 7) {
                days[6 - dayDiff]++;
            }
        });

        // Normalize to percentages (max 100)
        const maxMatches = Math.max(...days, 1);
        return days.map(d => Math.round((d / maxMatches) * 100));
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchDashboardData(),
            checkSystemHealth(),
        ]);
        setRefreshing(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    const handleQuickAction = (action: string, matchId?: string) => {
        console.log(`Quick action: ${action}`, matchId);
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'raid_point':
            case 'raid': return <Zap className="w-4 h-4 text-amber-500" />;
            case 'tackle_point':
            case 'tackle': return <Shield className="w-4 h-4 text-blue-500" />;
            case 'super_raid': return <Zap className="w-4 h-4 text-red-500" />;
            case 'super_tackle': return <Shield className="w-4 h-4 text-purple-500" />;
            case 'all_out': return <AlertCircle className="w-4 h-4 text-green-500" />;
            default: return <Activity className="w-4 h-4 text-slate-500" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-amber-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-slate-400';
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col fixed h-full">
                <div className="p-4 flex items-center gap-3 border-b border-white/10">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">KABADDI</h1>
                        <p className="text-xs text-white/60">ADMIN PANEL</p>
                    </div>
                </div>

                <nav className="flex-1 py-4 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-4 text-sm text-white/70 hover:bg-white/10 hover:text-white border-t border-white/10"
                >
                    <LogOut className="w-5 h-5" />
                    Log Out
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 overflow-auto">
                {/* Header */}
                <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-slate-800">Control Center</h2>
                        <Badge className={systemHealth.database === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {systemHealth.database === 'healthy' ? 'System Online' : 'System Issues'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={handleRefresh}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <button className="p-2 hover:bg-slate-100 rounded-full relative" onClick={() => navigate('/admin/support')}>
                            <Bell className="w-5 h-5 text-slate-600" />
                            {stats.pendingReports > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                    {stats.pendingReports > 9 ? '9+' : stats.pendingReports}
                                </span>
                            )}
                        </button>
                        <Avatar className="w-10 h-10 border-2 border-amber-500">
                            <AvatarFallback className="bg-amber-500 text-white">A</AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="p-6 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-6 gap-4">
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalUsers.toLocaleString()}</p>
                                        <p className="text-xs text-slate-500">Total Users</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center relative">
                                        <Play className="w-5 h-5 text-red-600" />
                                        {stats.liveMatches > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.liveMatches}</p>
                                        <p className="text-xs text-slate-500">Live Now</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.upcomingMatches}</p>
                                        <p className="text-xs text-slate-500">Upcoming</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.completedToday}</p>
                                        <p className="text-xs text-slate-500">Completed Today</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <Trophy className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.activeTournaments}</p>
                                        <p className="text-xs text-slate-500">Tournaments</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Ticket className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.pendingReports}</p>
                                        <p className="text-xs text-slate-500">Open Tickets</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* System Health */}
                    <Card className="bg-white border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <Server className="w-4 h-4 text-blue-500" /> System Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <Database className={`w-5 h-5 ${systemHealth.database === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
                                    <span className="text-sm text-slate-600">Database:</span>
                                    <Badge className={systemHealth.database === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                        {systemHealth.database}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Wifi className={`w-5 h-5 ${systemHealth.realtime === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
                                    <span className="text-sm text-slate-600">Realtime:</span>
                                    <Badge className={systemHealth.realtime === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                        {systemHealth.realtime}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm text-slate-600">Latency:</span>
                                    <Badge className={systemHealth.latency < 100 ? 'bg-green-100 text-green-700' : systemHealth.latency < 500 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                                        {systemHealth.latency}ms
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-purple-500" />
                                    <span className="text-sm text-slate-600">Players:</span>
                                    <Badge className="bg-purple-100 text-purple-700">{stats.totalPlayers}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-amber-500" />
                                    <span className="text-sm text-slate-600">Teams:</span>
                                    <Badge className="bg-amber-100 text-amber-700">{stats.totalTeams}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Grid */}
                    <div className="grid grid-cols-3 gap-6">
                        {/* Live Matches */}
                        <Card className="bg-white border-none shadow-sm col-span-2">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    Live Matches ({liveMatches.length})
                                </CardTitle>
                                <Button variant="link" size="sm" className="text-blue-600" onClick={() => navigate('/admin/live')}>
                                    View All
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {liveMatches.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <Swords className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No live matches</p>
                                    </div>
                                ) : (
                                    liveMatches.map(match => (
                                        <div key={match.id} className="bg-[#1e3a5f] rounded-lg p-4 text-white">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                                                <span className="text-xs opacity-70">Half {match.current_half}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-10 h-10 bg-blue-400">
                                                        <AvatarFallback>{match.team_a_name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{match.team_a_name}</span>
                                                </div>
                                                <div className="text-2xl font-bold">
                                                    {match.team_a_score} - {match.team_b_score}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium">{match.team_b_name}</span>
                                                    <Avatar className="w-10 h-10 bg-amber-400">
                                                        <AvatarFallback>{match.team_b_name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <Button size="sm" variant="secondary" className="flex-1" onClick={() => navigate(`/matches/${match.id}/spectate`)}>
                                                    <Eye className="w-4 h-4 mr-1" /> Watch
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => handleQuickAction('lock', match.id)}>
                                                    <Lock className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleQuickAction('stop', match.id)}>
                                                    <Pause className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Events Feed */}
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" /> Live Event Feed
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                                {recentEvents.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No recent events</p>
                                    </div>
                                ) : (
                                    recentEvents.map(event => (
                                        <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                            {getEventIcon(event.type)}
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-800">{event.description}</p>
                                                <p className="text-xs text-slate-500">{event.match_name}</p>
                                            </div>
                                            <span className="text-xs text-slate-400">{event.timestamp}</span>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-slate-800">User Management</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {[
                                    { icon: Search, label: 'Search Users', path: '/admin/users' },
                                    { icon: Award, label: 'Manage Levels', path: '/admin/users' },
                                    { icon: Ban, label: 'Ban Account', path: '/admin/users' },
                                    { icon: Flag, label: 'User Reports', path: '/admin/users' },
                                ].map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(item.path)}
                                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <item.icon className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm text-slate-700">{item.label}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-slate-800">Tournament Control</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {[
                                    { icon: Trophy, label: 'Create Tournament', path: '/tournaments/create' },
                                    { icon: Zap, label: 'Manage Brackets', path: '/admin/tournaments' },
                                    { icon: CheckCircle, label: 'Approve Results', path: '/admin/tournaments' },
                                    { icon: DollarSign, label: 'View Payments', path: '/admin/tournaments' },
                                ].map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(item.path)}
                                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <item.icon className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm text-slate-700">{item.label}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-slate-800">Match Management</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {[
                                    { icon: Edit, label: 'Live Score Editor', path: '/admin/live' },
                                    { icon: FileText, label: 'Edit Match Results', path: '/admin/matches' },
                                    { icon: UserPlus, label: 'Assign Scorers', path: '/admin/matches' },
                                    { icon: Lock, label: 'Lock Match', path: '/admin/matches' },
                                ].map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(item.path)}
                                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <item.icon className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm text-slate-700">{item.label}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Pending Support Tickets */}
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <Ticket className="w-4 h-4 text-amber-500" /> Open Support Tickets
                                </CardTitle>
                                <Button variant="link" size="sm" className="text-blue-600" onClick={() => navigate('/admin/support')}>
                                    View All
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {pendingTickets.length === 0 ? (
                                    <div className="text-center py-4 text-slate-400">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                                        <p className="text-sm">No pending tickets</p>
                                    </div>
                                ) : (
                                    pendingTickets.map((ticket) => (
                                        <div key={ticket.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`} />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{ticket.subject}</p>
                                                    <p className="text-xs text-slate-500">{getRelativeTime(new Date(ticket.created_at))}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={ticket.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                                                    {ticket.status}
                                                </Badge>
                                                <Button variant="outline" size="sm" onClick={() => navigate('/admin/support')}>Review</Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* App Analytics Preview */}
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-500" /> Today's Activity
                                </CardTitle>
                                <Button variant="link" size="sm" className="text-blue-600" onClick={() => navigate('/admin/analytics')}>
                                    View Details
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">Active Users (Est.)</p>
                                        <p className="text-3xl font-bold text-slate-800">{loading ? '...' : todayActivity.activeUsers.toLocaleString()}</p>
                                        <p className="text-xs text-green-500">+{todayActivity.newUsersToday} new today</p>
                                    </div>
                                    <div className="flex items-end gap-1 h-16">
                                        {todayActivity.weeklyData.length > 0 ? (
                                            todayActivity.weeklyData.map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="w-6 bg-gradient-to-t from-green-500 to-green-300 rounded-t"
                                                    style={{ height: `${Math.max(h, 10)}%` }}
                                                    title={`Day ${i + 1}: ${h}%`}
                                                />
                                            ))
                                        ) : (
                                            [20, 30, 25, 40, 35, 50, 45].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="w-6 bg-gradient-to-t from-slate-300 to-slate-200 rounded-t"
                                                    style={{ height: `${h}%` }}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500">Matches Today</p>
                                        <p className="text-lg font-bold text-slate-800">{todayActivity.matchesPlayedToday}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Total Players</p>
                                        <p className="text-lg font-bold text-slate-800">{stats.totalPlayers}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
