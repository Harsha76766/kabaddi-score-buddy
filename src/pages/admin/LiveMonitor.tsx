import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
    RefreshCw, Activity, Eye, Lock, Pause, Play, Users, Zap,
    AlertTriangle, Shield, Target, Clock, Undo2, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LiveMatch {
    id: string;
    match_name: string;
    team_a_score: number;
    team_b_score: number;
    raid_count: number;
    current_half: number;
    status: string;
    team_a: { name: string } | null;
    team_b: { name: string } | null;
    team_a_players: number;
    team_b_players: number;
}

interface RaidEvent {
    id: string;
    type: 'raid' | 'tackle' | 'bonus' | 'super_raid' | 'all_out' | 'timeout';
    team: 'A' | 'B';
    player: string;
    points: number;
    timestamp: string;
    is_anomaly: boolean;
    anomaly_reason?: string;
}

interface Anomaly {
    id: string;
    match_id: string;
    match_name: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
}

const LiveMonitor = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);
    const [raidTimeline, setRaidTimeline] = useState<RaidEvent[]>([]);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

    useEffect(() => {
        fetchLiveMatches();

        const channel = supabase
            .channel('admin-live-monitor')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchLiveMatches();
            })
            .subscribe();

        const interval = setInterval(fetchLiveMatches, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    const fetchLiveMatches = async () => {
        try {
            const { data } = await supabase
                .from('matches')
                .select(`*, team_a:team_a_id(name), team_b:team_b_id(name)`)
                .eq('status', 'live')
                .order('created_at', { ascending: false });

            const formatted = (data || []).map((m: any) => ({
                ...m,
                team_a_players: 7,
                team_b_players: 7,
            }));

            setLiveMatches(formatted as any);

            // If we had a selected match, update it
            if (selectedMatch) {
                const updated = formatted.find((m: any) => m.id === selectedMatch.id);
                if (updated) {
                    setSelectedMatch(updated as any);
                }
            }

            // Mock anomalies
            setAnomalies([
                { id: '1', match_id: '123', match_name: 'Titans vs Warriors', type: 'Rapid Scoring', description: '8 points in 30 seconds', severity: 'high', timestamp: '2 min ago' },
                { id: '2', match_id: '456', match_name: 'Falcons vs Panthers', type: 'Invalid Super Tackle', description: 'Super tackle with >4 players', severity: 'medium', timestamp: '5 min ago' },
            ]);
        } catch (error) {
            console.error('Error fetching live matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectMatch = (match: LiveMatch) => {
        setSelectedMatch(match);

        // Mock raid timeline
        setRaidTimeline([
            { id: '1', type: 'raid', team: 'A', player: 'Player 1', points: 1, timestamp: '00:02:15', is_anomaly: false },
            { id: '2', type: 'tackle', team: 'B', player: 'Player 5', points: 1, timestamp: '00:03:45', is_anomaly: false },
            { id: '3', type: 'super_raid', team: 'A', player: 'Player 2', points: 3, timestamp: '00:05:20', is_anomaly: true, anomaly_reason: 'Unusual raid duration' },
            { id: '4', type: 'bonus', team: 'A', player: 'Player 1', points: 1, timestamp: '00:07:10', is_anomaly: false },
            { id: '5', type: 'all_out', team: 'B', player: 'Team', points: 2, timestamp: '00:10:00', is_anomaly: false },
            { id: '6', type: 'tackle', team: 'A', player: 'Player 3', points: 1, timestamp: '00:11:30', is_anomaly: false },
            { id: '7', type: 'timeout', team: 'A', player: '', points: 0, timestamp: '00:12:00', is_anomaly: false },
        ]);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchLiveMatches();
        setRefreshing(false);
    };

    const handleForceStop = async (matchId: string) => {
        if (!confirm('Force stop this match?')) return;
        await supabase.from('matches').update({ status: 'completed' }).eq('id', matchId);
        toast({ title: 'Match Stopped', description: 'Match has been force-ended' });
        fetchLiveMatches();
        setSelectedMatch(null);
    };

    const handleLockMatch = async (matchId: string) => {
        if (!confirm('Lock this match (read-only)?')) return;
        await supabase.from('matches').update({ status: 'locked' }).eq('id', matchId);
        toast({ title: 'Match Locked', description: 'No more edits allowed' });
        fetchLiveMatches();
    };

    const handleResetRaid = () => {
        toast({ title: 'Raid Reset', description: 'Current raid has been reset' });
    };

    const handleUndoLastEvent = () => {
        if (raidTimeline.length > 0) {
            setRaidTimeline(raidTimeline.slice(0, -1));
            toast({ title: 'Event Undone', description: 'Last event has been removed' });
        }
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'raid': return <Zap className="w-4 h-4 text-amber-500" />;
            case 'tackle': return <Shield className="w-4 h-4 text-blue-500" />;
            case 'super_raid': return <Zap className="w-4 h-4 text-red-500" />;
            case 'bonus': return <Target className="w-4 h-4 text-green-500" />;
            case 'all_out': return <AlertTriangle className="w-4 h-4 text-purple-500" />;
            case 'timeout': return <Clock className="w-4 h-4 text-slate-500" />;
            default: return <Activity className="w-4 h-4 text-slate-500" />;
        }
    };

    return (
        <AdminLayout title="Live Match Monitor">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="font-medium text-slate-700">{liveMatches.length} matches live</span>
                    </div>
                    {anomalies.length > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {anomalies.length} Anomalies
                        </Badge>
                    )}
                </div>
                <Button variant="outline" onClick={handleRefresh}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-6">
                    {/* Left: Match List */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-600 uppercase">Live Matches</h3>

                        {liveMatches.length === 0 ? (
                            <Card className="bg-white border-none shadow-sm">
                                <CardContent className="py-12 text-center">
                                    <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p className="text-slate-400">No live matches</p>
                                </CardContent>
                            </Card>
                        ) : (
                            liveMatches.map(match => (
                                <Card
                                    key={match.id}
                                    className={`bg-white border-none shadow-sm cursor-pointer transition-all ${selectedMatch?.id === match.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                                        }`}
                                    onClick={() => selectMatch(match)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                                            <span className="text-xs text-slate-500">Half {match.current_half || 1}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-center flex-1">
                                                <p className="text-xs text-slate-500 truncate">{match.team_a?.name || 'Team A'}</p>
                                                <p className="text-2xl font-bold text-slate-800">{match.team_a_score}</p>
                                            </div>
                                            <span className="text-slate-300 mx-2">vs</span>
                                            <div className="text-center flex-1">
                                                <p className="text-xs text-slate-500 truncate">{match.team_b?.name || 'Team B'}</p>
                                                <p className="text-2xl font-bold text-slate-800">{match.team_b_score}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                                    </CardContent>
                                </Card>
                            ))
                        )}

                        {/* Anomaly Alerts */}
                        {anomalies.length > 0 && (
                            <>
                                <h3 className="text-sm font-semibold text-slate-600 uppercase mt-6">Anomaly Alerts</h3>
                                {anomalies.map(anomaly => (
                                    <Card key={anomaly.id} className="bg-red-50 border border-red-200 shadow-sm">
                                        <CardContent className="p-3">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className={`w-4 h-4 mt-0.5 ${anomaly.severity === 'high' ? 'text-red-500' :
                                                    anomaly.severity === 'medium' ? 'text-amber-500' : 'text-green-500'
                                                    }`} />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-800">{anomaly.type}</p>
                                                    <p className="text-xs text-slate-600">{anomaly.description}</p>
                                                    <p className="text-xs text-slate-400 mt-1">{anomaly.match_name} · {anomaly.timestamp}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Right: Selected Match Detail */}
                    <div className="col-span-2">
                        {selectedMatch ? (
                            <div className="space-y-4">
                                {/* Scoreboard */}
                                <Card className="bg-[#1e3a5f] text-white border-none shadow-lg overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                                            <span className="text-sm opacity-70">{selectedMatch.match_name}</span>
                                            <Badge className="bg-white/20">Half {selectedMatch.current_half || 1}</Badge>
                                        </div>

                                        <div className="flex items-center justify-center gap-8">
                                            <div className="text-center flex-1">
                                                <Avatar className="w-16 h-16 mx-auto bg-blue-400 mb-2">
                                                    <AvatarFallback className="text-2xl">{selectedMatch.team_a?.name?.charAt(0) || 'A'}</AvatarFallback>
                                                </Avatar>
                                                <p className="font-medium">{selectedMatch.team_a?.name || 'Team A'}</p>
                                                <p className="text-5xl font-bold mt-2">{selectedMatch.team_a_score}</p>
                                                <div className="flex justify-center gap-1 mt-2">
                                                    {Array.from({ length: selectedMatch.team_a_players || 7 }).map((_, i) => (
                                                        <div key={i} className="w-2 h-2 bg-green-400 rounded-full" />
                                                    ))}
                                                </div>
                                                <p className="text-xs opacity-50 mt-1">{selectedMatch.team_a_players} on field</p>
                                            </div>

                                            <div className="text-center">
                                                <p className="text-3xl font-light opacity-50">VS</p>
                                                <div className="mt-2 bg-white/10 rounded px-3 py-1">
                                                    <p className="text-xs opacity-70">Raids</p>
                                                    <p className="font-bold">{selectedMatch.raid_count || 0}</p>
                                                </div>
                                            </div>

                                            <div className="text-center flex-1">
                                                <Avatar className="w-16 h-16 mx-auto bg-amber-400 mb-2">
                                                    <AvatarFallback className="text-2xl">{selectedMatch.team_b?.name?.charAt(0) || 'B'}</AvatarFallback>
                                                </Avatar>
                                                <p className="font-medium">{selectedMatch.team_b?.name || 'Team B'}</p>
                                                <p className="text-5xl font-bold mt-2">{selectedMatch.team_b_score}</p>
                                                <div className="flex justify-center gap-1 mt-2">
                                                    {Array.from({ length: selectedMatch.team_b_players || 7 }).map((_, i) => (
                                                        <div key={i} className="w-2 h-2 bg-green-400 rounded-full" />
                                                    ))}
                                                </div>
                                                <p className="text-xs opacity-50 mt-1">{selectedMatch.team_b_players} on field</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Admin Actions */}
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => navigate(`/matches/${selectedMatch.id}/spectate`)}>
                                        <Eye className="w-4 h-4 mr-2" /> Watch
                                    </Button>
                                    <Button variant="outline" onClick={handleUndoLastEvent}>
                                        <Undo2 className="w-4 h-4 mr-2" /> Undo Last
                                    </Button>
                                    <Button variant="outline" onClick={handleResetRaid}>
                                        <RefreshCw className="w-4 h-4 mr-2" /> Reset Raid
                                    </Button>
                                    <Button variant="outline" onClick={() => handleLockMatch(selectedMatch.id)}>
                                        <Lock className="w-4 h-4 mr-2" /> Lock
                                    </Button>
                                    <Button variant="destructive" onClick={() => handleForceStop(selectedMatch.id)}>
                                        <Pause className="w-4 h-4 mr-2" /> Stop
                                    </Button>
                                </div>

                                {/* Raid Timeline */}
                                <Card className="bg-white border-none shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-blue-500" /> Raid-by-Raid Timeline
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="max-h-80 overflow-y-auto">
                                        <div className="relative">
                                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                                            <div className="space-y-3">
                                                {raidTimeline.map((event, idx) => (
                                                    <div
                                                        key={event.id}
                                                        className={`relative pl-10 flex items-center gap-3 p-2 rounded-lg ${event.is_anomaly ? 'bg-red-50 ring-1 ring-red-200' : 'hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className={`absolute left-2 w-4 h-4 rounded-full flex items-center justify-center ${event.team === 'A' ? 'bg-blue-500' : 'bg-amber-500'
                                                            }`}>
                                                            <div className="w-2 h-2 bg-white rounded-full" />
                                                        </div>

                                                        <span className="text-xs text-slate-400 w-14">{event.timestamp}</span>
                                                        {getEventIcon(event.type)}
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium capitalize">{event.type.replace('_', ' ')}</p>
                                                            {event.player && <p className="text-xs text-slate-500">{event.player}</p>}
                                                        </div>
                                                        <Badge className={event.team === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                                                            Team {event.team}
                                                        </Badge>
                                                        {event.points > 0 && (
                                                            <span className="font-bold text-green-600">+{event.points}</span>
                                                        )}
                                                        {event.is_anomaly && (
                                                            <div className="flex items-center gap-1 text-red-500">
                                                                <AlertTriangle className="w-4 h-4" />
                                                                <span className="text-xs">{event.anomaly_reason}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <Card className="bg-white border-none shadow-sm h-full flex items-center justify-center">
                                <CardContent className="text-center py-20">
                                    <Eye className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                    <p className="text-lg font-medium text-slate-400">Select a match to monitor</p>
                                    <p className="text-sm text-slate-400 mt-1">Click on any live match from the left panel</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default LiveMonitor;
