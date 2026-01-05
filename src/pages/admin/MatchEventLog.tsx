import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    ClipboardList, Search, Download, Clock, Shield, Zap,
    CheckCircle, XCircle, RotateCcw, Eye, Target, Star
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MatchEvent {
    id: string;
    match_id: string;
    event_type: 'raid' | 'tackle' | 'super_raid' | 'super_tackle' | 'bonus' | 'all_out' | 'timeout' | 'substitution';
    team: 'team_a' | 'team_b';
    player_id: string | null;
    player_name: string | null;
    points: number;
    is_valid: boolean;
    invalidation_reason: string | null;
    created_at: string;
    match?: { team_a_name: string; team_b_name: string };
}

const MatchEventLog = () => {
    const { toast } = useToast();
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [invalidationReason, setInvalidationReason] = useState('');

    useEffect(() => {
        fetchEvents();

        const channel = supabase
            .channel('match-events-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events' }, fetchEvents)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('match_events')
                .select(`*, match:match_id(team_a:team_a_id(name), team_b:team_b_id(name))`)
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;

            const formatted = (data || []).map((e: any) => ({
                ...e,
                match: {
                    team_a_name: e.match?.team_a?.name || 'Team A',
                    team_b_name: e.match?.team_b?.name || 'Team B',
                }
            }));

            setEvents(formatted);
        } catch (error: any) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvalidate = async (eventId: string) => {
        try {
            const { error } = await supabase
                .from('match_events')
                .update({ is_valid: false, invalidation_reason: invalidationReason || 'Invalidated by admin' })
                .eq('id', eventId);

            if (error) throw error;

            toast({ title: 'Event Invalidated' });
            setDetailModalOpen(false);
            setInvalidationReason('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleRevalidate = async (eventId: string) => {
        try {
            const { error } = await supabase
                .from('match_events')
                .update({ is_valid: true, invalidation_reason: null })
                .eq('id', eventId);

            if (error) throw error;

            toast({ title: 'Event Revalidated' });
            setDetailModalOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleExport = () => {
        const csv = [
            ['ID', 'Match', 'Type', 'Team', 'Player', 'Points', 'Valid', 'Timestamp'],
            ...filteredEvents.map(e => [
                e.id, `${e.match?.team_a_name} vs ${e.match?.team_b_name}`, e.event_type, e.team, e.player_name || 'N/A', e.points, e.is_valid ? 'Yes' : 'No', e.created_at
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `match_events_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast({ title: 'Export Started' });
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'raid': return <Target className="w-4 h-4 text-amber-500" />;
            case 'tackle': return <Shield className="w-4 h-4 text-blue-500" />;
            case 'super_raid': return <Zap className="w-4 h-4 text-red-500" />;
            case 'super_tackle': return <Star className="w-4 h-4 text-purple-500" />;
            case 'all_out': return <Zap className="w-4 h-4 text-green-500" />;
            default: return <ClipboardList className="w-4 h-4 text-slate-500" />;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'raid': return 'bg-amber-100 text-amber-700';
            case 'tackle': return 'bg-blue-100 text-blue-700';
            case 'super_raid': return 'bg-red-100 text-red-700';
            case 'super_tackle': return 'bg-purple-100 text-purple-700';
            case 'all_out': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const filteredEvents = events.filter(event => {
        const matchesSearch = (event.player_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.event_type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || event.event_type === typeFilter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'valid' && event.is_valid) ||
            (statusFilter === 'invalid' && !event.is_valid);
        return matchesSearch && matchesType && matchesStatus;
    });

    const stats = {
        total: events.length,
        raids: events.filter(e => e.event_type === 'raid').length,
        tackles: events.filter(e => e.event_type === 'tackle').length,
        invalid: events.filter(e => !e.is_valid).length,
    };

    if (loading) {
        return <AdminLayout title="Event Log"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Match Event Log">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Events</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">{stats.raids}</p>
                        <p className="text-sm text-slate-500">Raid Points</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.tackles}</p>
                        <p className="text-sm text-slate-500">Tackle Points</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{stats.invalid}</p>
                        <p className="text-sm text-slate-500">Invalid Events</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search events..."
                        className="pl-10 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="raid">Raid</SelectItem>
                        <SelectItem value="tackle">Tackle</SelectItem>
                        <SelectItem value="super_raid">Super Raid</SelectItem>
                        <SelectItem value="super_tackle">Super Tackle</SelectItem>
                        <SelectItem value="bonus">Bonus</SelectItem>
                        <SelectItem value="all_out">All Out</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="valid">Valid</SelectItem>
                        <SelectItem value="invalid">Invalid</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
            </div>

            {/* Events Table */}
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Event</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Match</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Team</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Player</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Points</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEvents.map(event => (
                                <tr key={event.id} className={`hover:bg-slate-50 ${!event.is_valid ? 'bg-red-50 opacity-70' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {getEventIcon(event.event_type)}
                                            <Badge className={getEventColor(event.event_type)}>{event.event_type.replace('_', ' ')}</Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {event.match?.team_a_name} vs {event.match?.team_b_name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline">{event.team === 'team_a' ? 'Team A' : 'Team B'}</Badge>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{event.player_name || 'N/A'}</td>
                                    <td className="px-4 py-3 text-center font-bold text-lg">{event.points > 0 && '+'}{event.points}</td>
                                    <td className="px-4 py-3 text-center">
                                        {event.is_valid ? (
                                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(event.created_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedEvent(event); setDetailModalOpen(true); }}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredEvents.length === 0 && (
                        <div className="text-center py-12 text-slate-400">No events found</div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white">
                    {selectedEvent && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {getEventIcon(selectedEvent.event_type)}
                                    {selectedEvent.event_type.replace('_', ' ')} Event
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500">Match</p>
                                        <p className="font-medium">{selectedEvent.match?.team_a_name} vs {selectedEvent.match?.team_b_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Team</p>
                                        <p className="font-medium">{selectedEvent.team === 'team_a' ? 'Team A' : 'Team B'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Player</p>
                                        <p className="font-medium">{selectedEvent.player_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Points</p>
                                        <p className="font-bold text-lg">{selectedEvent.points > 0 && '+'}{selectedEvent.points}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Status</p>
                                        <Badge className={selectedEvent.is_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                            {selectedEvent.is_valid ? 'Valid' : 'Invalid'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Time</p>
                                        <p className="font-medium">{new Date(selectedEvent.created_at).toLocaleString()}</p>
                                    </div>
                                </div>

                                {!selectedEvent.is_valid && selectedEvent.invalidation_reason && (
                                    <div className="bg-red-50 p-3 rounded-lg">
                                        <p className="text-xs text-red-500 mb-1">Invalidation Reason</p>
                                        <p className="text-sm text-red-700">{selectedEvent.invalidation_reason}</p>
                                    </div>
                                )}

                                {selectedEvent.is_valid && (
                                    <div>
                                        <Label>Invalidation Reason</Label>
                                        <Textarea
                                            value={invalidationReason}
                                            onChange={(e) => setInvalidationReason(e.target.value)}
                                            placeholder="Reason for invalidation..."
                                            rows={2}
                                        />
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                {selectedEvent.is_valid ? (
                                    <Button variant="destructive" onClick={() => handleInvalidate(selectedEvent.id)}>
                                        <XCircle className="w-4 h-4 mr-2" /> Invalidate Event
                                    </Button>
                                ) : (
                                    <Button onClick={() => handleRevalidate(selectedEvent.id)} className="bg-green-600">
                                        <RotateCcw className="w-4 h-4 mr-2" /> Revalidate Event
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default MatchEventLog;
