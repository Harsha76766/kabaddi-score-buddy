import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Search, Download, Clock, Shield, Target, Star } from 'lucide-react';

const MatchEventLog = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('match_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;
            setEvents(data || []);
        } catch (error: any) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (type: string) => {
        if (type.includes('raid')) return <Target className="w-4 h-4 text-amber-500" />;
        if (type.includes('tackle')) return <Shield className="w-4 h-4 text-blue-500" />;
        return <Star className="w-4 h-4 text-slate-500" />;
    };

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.event_type?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || event.event_type === typeFilter;
        return matchesSearch && matchesType;
    });

    if (loading) {
        return <AdminLayout title="Event Log"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Match Event Log">
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{events.length}</p>
                        <p className="text-sm text-slate-500">Total Events</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">
                            {events.filter(e => e.event_type?.includes('raid')).length}
                        </p>
                        <p className="text-sm text-slate-500">Raid Events</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">
                            {events.filter(e => e.event_type?.includes('tackle')).length}
                        </p>
                        <p className="text-sm text-slate-500">Tackle Events</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">
                            {events.reduce((sum, e) => sum + (e.points_awarded || 0), 0)}
                        </p>
                        <p className="text-sm text-slate-500">Total Points</p>
                    </CardContent>
                </Card>
            </div>

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
                        <SelectItem value="bonus">Bonus</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Event</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Match ID</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Points</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEvents.map(event => (
                                <tr key={event.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {getEventIcon(event.event_type)}
                                            <Badge variant="secondary">{event.event_type}</Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                                        {event.match_id?.slice(0, 8)}...
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-lg">
                                        {event.points_awarded > 0 && '+'}{event.points_awarded}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(event.created_at).toLocaleTimeString()}
                                        </div>
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
        </AdminLayout>
    );
};

export default MatchEventLog;
