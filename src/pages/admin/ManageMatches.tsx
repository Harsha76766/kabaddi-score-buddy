import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Search, Trash2, Eye, Lock, Pause, Play, Download, Edit,
    UserPlus, History, Undo2, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

interface Match {
    id: string;
    match_name: string;
    status: string;
    team_a_score: number;
    team_b_score: number;
    match_date: string;
    venue: string;
    team_a: { name: string } | null;
    team_b: { name: string } | null;
    current_half: number;
    raid_count: number;
}

interface MatchEvent {
    id: string;
    type: string;
    points: number;
    team: 'A' | 'B';
    player_name: string;
    timestamp: string;
    is_valid: boolean;
}

const ManageMatches = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Detail modal
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
    const [detailTab, setDetailTab] = useState('overview');

    // Scorer assignment
    const [scorerModalOpen, setScorerModalOpen] = useState(false);

    // Score edit
    const [editScoreModalOpen, setEditScoreModalOpen] = useState(false);
    const [editedScoreA, setEditedScoreA] = useState(0);
    const [editedScoreB, setEditedScoreB] = useState(0);

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select(`*, team_a:team_a_id(name), team_b:team_b_id(name)`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMatches((data || []) as any);
        } catch (error) {
            console.error('Error fetching matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const openMatchDetail = (match: Match) => {
        setSelectedMatch(match);
        setEditedScoreA(match.team_a_score);
        setEditedScoreB(match.team_b_score);

        // Mock events
        setMatchEvents([
            { id: '1', type: 'Raid Point', points: 1, team: 'A', player_name: 'Player 1', timestamp: '00:02:15', is_valid: true },
            { id: '2', type: 'Tackle Point', points: 1, team: 'B', player_name: 'Player 5', timestamp: '00:03:45', is_valid: true },
            { id: '3', type: 'Super Raid', points: 3, team: 'A', player_name: 'Player 2', timestamp: '00:05:20', is_valid: true },
            { id: '4', type: 'Bonus Point', points: 1, team: 'A', player_name: 'Player 1', timestamp: '00:07:10', is_valid: false },
            { id: '5', type: 'ALL OUT', points: 2, team: 'B', player_name: 'Team', timestamp: '00:10:00', is_valid: true },
        ]);

        setDetailModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this match?')) return;

        try {
            const { error } = await supabase.from('matches').delete().eq('id', id);
            if (error) throw error;

            setMatches(matches.filter(m => m.id !== id));
            toast({ title: 'Success', description: 'Match deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleForceStop = async (matchId: string) => {
        if (!confirm('Force stop this match? It will be marked as completed.')) return;

        try {
            await supabase.from('matches').update({ status: 'completed' }).eq('id', matchId);
            toast({ title: 'Success', description: 'Match stopped' });
            fetchMatches();
            setDetailModalOpen(false);
        } catch (error) {
            console.error('Error stopping match:', error);
        }
    };

    const handleLockMatch = async (matchId: string) => {
        if (!confirm('Lock this match? No more edits will be allowed.')) return;

        try {
            await supabase.from('matches').update({ status: 'locked' }).eq('id', matchId);
            toast({ title: 'Success', description: 'Match locked' });
            fetchMatches();
        } catch (error) {
            console.error('Error locking match:', error);
        }
    };

    const handleReopenMatch = async (matchId: string) => {
        if (!confirm('Reopen this match for editing? (Super Admin only)')) return;

        try {
            await supabase.from('matches').update({ status: 'live' }).eq('id', matchId);
            toast({ title: 'Success', description: 'Match reopened' });
            fetchMatches();
        } catch (error) {
            console.error('Error reopening match:', error);
        }
    };

    const handleSaveScore = async () => {
        if (!selectedMatch) return;

        try {
            await supabase
                .from('matches')
                .update({
                    team_a_score: editedScoreA,
                    team_b_score: editedScoreB
                })
                .eq('id', selectedMatch.id);

            toast({ title: 'Success', description: 'Score updated' });
            setEditScoreModalOpen(false);
            fetchMatches();
        } catch (error) {
            console.error('Error updating score:', error);
        }
    };

    const handleInvalidateEvent = (eventId: string) => {
        setMatchEvents(matchEvents.map(e =>
            e.id === eventId ? { ...e, is_valid: !e.is_valid } : e
        ));
        toast({ title: 'Event Updated', description: 'Event validity toggled' });
    };

    const handleDownloadEvents = () => {
        const csv = matchEvents.map(e =>
            `${e.timestamp},${e.type},${e.team},${e.player_name},${e.points},${e.is_valid}`
        ).join('\n');

        const blob = new Blob([`Timestamp,Type,Team,Player,Points,Valid\n${csv}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `match_${selectedMatch?.id}_events.csv`;
        a.click();

        toast({ title: 'Downloaded', description: 'Match events exported to CSV' });
    };

    const filteredMatches = matches.filter(m => {
        const matchesSearch =
            m.match_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.team_a?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.team_b?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'live': return <Badge className="bg-red-500 text-white animate-pulse">Live</Badge>;
            case 'completed': return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
            case 'scheduled': return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
            case 'locked': return <Badge className="bg-slate-100 text-slate-700">Locked</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const stats = {
        total: matches.length,
        live: matches.filter(m => m.status === 'live').length,
        completed: matches.filter(m => m.status === 'completed').length,
        scheduled: matches.filter(m => m.status === 'scheduled').length,
    };

    return (
        <AdminLayout title="Match Management">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Matches</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{stats.live}</p>
                        <p className="text-sm text-slate-500">Live Now</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                        <p className="text-sm text-slate-500">Completed</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.scheduled}</p>
                        <p className="text-sm text-slate-500">Scheduled</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search matches..."
                        className="pl-10 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 bg-white border-slate-200">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="locked">Locked</SelectItem>
                    </SelectContent>
                </Select>
                <Button className="bg-[#1e3a5f]" onClick={() => navigate('/matches/create')}>
                    + Create Match
                </Button>
            </div>

            {/* Matches Table */}
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Match</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Score</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMatches.map(match => (
                                    <tr key={match.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-slate-800">{match.match_name || 'Untitled Match'}</p>
                                                <p className="text-sm text-slate-500">
                                                    {match.team_a?.name || 'Team A'} vs {match.team_b?.name || 'Team B'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-2xl font-bold text-slate-800">{match.team_a_score} - {match.team_b_score}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{match.match_date}</td>
                                        <td className="px-4 py-3">{getStatusBadge(match.status)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openMatchDetail(match)}>
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                </Button>
                                                {match.status === 'live' && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleForceStop(match.id)}>
                                                        <Pause className="w-4 h-4 text-amber-500" />
                                                    </Button>
                                                )}
                                                {match.status !== 'locked' && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleLockMatch(match.id)}>
                                                        <Lock className="w-4 h-4 text-slate-500" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(match.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Match Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white max-w-3xl max-h-[85vh] overflow-y-auto">
                    {selectedMatch && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {selectedMatch.match_name || 'Match Details'}
                                    {getStatusBadge(selectedMatch.status)}
                                </DialogTitle>
                                <DialogDescription>
                                    {selectedMatch.team_a?.name} vs {selectedMatch.team_b?.name} · {selectedMatch.match_date}
                                </DialogDescription>
                            </DialogHeader>

                            {/* Score Display */}
                            <div className="bg-[#1e3a5f] rounded-lg p-6 text-white text-center">
                                <div className="flex items-center justify-center gap-8">
                                    <div>
                                        <p className="text-sm opacity-70 mb-1">{selectedMatch.team_a?.name || 'Team A'}</p>
                                        <p className="text-5xl font-bold">{selectedMatch.team_a_score}</p>
                                    </div>
                                    <span className="text-2xl opacity-50">VS</span>
                                    <div>
                                        <p className="text-sm opacity-70 mb-1">{selectedMatch.team_b?.name || 'Team B'}</p>
                                        <p className="text-5xl font-bold">{selectedMatch.team_b_score}</p>
                                    </div>
                                </div>
                                <div className="flex justify-center gap-2 mt-4">
                                    <Badge className="bg-white/20">Half {selectedMatch.current_half || 1}</Badge>
                                    <Badge className="bg-white/20">Raids: {selectedMatch.raid_count || 0}</Badge>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setEditScoreModalOpen(true)}>
                                    <Edit className="w-4 h-4 mr-2" /> Edit Score
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={() => setScorerModalOpen(true)}>
                                    <UserPlus className="w-4 h-4 mr-2" /> Assign Scorer
                                </Button>
                                <Button variant="outline" onClick={handleDownloadEvents}>
                                    <Download className="w-4 h-4" />
                                </Button>
                                {selectedMatch.status === 'completed' && (
                                    <Button variant="outline" onClick={() => handleReopenMatch(selectedMatch.id)}>
                                        <Undo2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Event Log */}
                            <Card className="border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <History className="w-4 h-4" /> Event Log ({matchEvents.length} events)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="max-h-60 overflow-y-auto space-y-2">
                                    {matchEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg ${event.is_valid ? 'bg-slate-50' : 'bg-red-50 opacity-60'
                                                }`}
                                        >
                                            <span className="text-xs text-slate-400 w-16">{event.timestamp}</span>
                                            <Badge className={event.team === 'A' ? 'bg-blue-500' : 'bg-amber-500'}>
                                                Team {event.team}
                                            </Badge>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{event.type}</p>
                                                <p className="text-xs text-slate-500">{event.player_name}</p>
                                            </div>
                                            <span className="font-bold text-green-600">+{event.points}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleInvalidateEvent(event.id)}
                                            >
                                                {event.is_valid ? (
                                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Bottom Actions */}
                            <DialogFooter className="gap-2">
                                {selectedMatch.status === 'live' && (
                                    <>
                                        <Button variant="outline" onClick={() => handleLockMatch(selectedMatch.id)}>
                                            <Lock className="w-4 h-4 mr-2" /> Lock Match
                                        </Button>
                                        <Button variant="destructive" onClick={() => handleForceStop(selectedMatch.id)}>
                                            <Pause className="w-4 h-4 mr-2" /> Force Stop
                                        </Button>
                                    </>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Score Modal */}
            <Dialog open={editScoreModalOpen} onOpenChange={setEditScoreModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Edit Match Score</DialogTitle>
                        <DialogDescription>Manually adjust the score for this match.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-4">
                        <div className="text-center">
                            <p className="text-sm text-slate-500 mb-2">{selectedMatch?.team_a?.name || 'Team A'}</p>
                            <Input
                                type="number"
                                value={editedScoreA}
                                onChange={(e) => setEditedScoreA(parseInt(e.target.value) || 0)}
                                className="text-center text-3xl h-16 font-bold"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-slate-500 mb-2">{selectedMatch?.team_b?.name || 'Team B'}</p>
                            <Input
                                type="number"
                                value={editedScoreB}
                                onChange={(e) => setEditedScoreB(parseInt(e.target.value) || 0)}
                                className="text-center text-3xl h-16 font-bold"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditScoreModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveScore} className="bg-[#1e3a5f]">Save Score</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Scorer Assignment Modal */}
            <Dialog open={scorerModalOpen} onOpenChange={setScorerModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Assign Scorer</DialogTitle>
                        <DialogDescription>Select a user to be the scorer for this match.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input placeholder="Search users..." className="mb-4" />
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {['John Doe', 'Jane Smith', 'Mike Wilson'].map((name, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                    <Avatar className="w-10 h-10">
                                        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-medium">{name}</p>
                                        <p className="text-sm text-slate-500">Scorer</p>
                                    </div>
                                    <Button size="sm">Assign</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default ManageMatches;
