import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    Search, Trash2, Eye, Plus, Copy, Download, Users, Trophy,
    Calendar, MapPin, Clock, Settings, CheckCircle, XCircle,
    Zap, Target, Shield, BarChart3, FileText, DollarSign
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

interface Tournament {
    id: string;
    name: string;
    city: string;
    status: string;
    start_date: string;
    end_date: string;
    category: string;
    teams_count?: number;
    matches_count?: number;
}

interface TournamentRules {
    format: 'knockout' | 'league' | 'group_stage';
    halves_duration: number;
    timeout_per_half: number;
    super_tackle_limit: number;
    points_per_win: number;
    points_per_draw: number;
}

const ManageTournaments = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailTab, setDetailTab] = useState('overview');
    const [rulesModalOpen, setRulesModalOpen] = useState(false);
    const [fixturesModalOpen, setFixturesModalOpen] = useState(false);

    // Rules config
    const [rules, setRules] = useState<TournamentRules>({
        format: 'knockout',
        halves_duration: 20,
        timeout_per_half: 2,
        super_tackle_limit: 1,
        points_per_win: 3,
        points_per_draw: 1,
    });

    // Mock data
    const [teams, setTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [standings, setStandings] = useState<any[]>([]);

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTournaments(data || []);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const openTournamentDetail = (tournament: Tournament) => {
        setSelectedTournament(tournament);

        // Mock data
        setTeams([
            { id: '1', name: 'Titans', players: 12, wins: 5, losses: 1 },
            { id: '2', name: 'Warriors', players: 10, wins: 4, losses: 2 },
            { id: '3', name: 'Panthers', players: 11, wins: 3, losses: 3 },
            { id: '4', name: 'Falcons', players: 10, wins: 2, losses: 4 },
        ]);

        setMatches([
            { id: '1', team_a: 'Titans', team_b: 'Warriors', score: '35-28', status: 'completed' },
            { id: '2', team_a: 'Panthers', team_b: 'Falcons', score: '42-38', status: 'completed' },
            { id: '3', team_a: 'Titans', team_b: 'Panthers', score: '-', status: 'scheduled' },
        ]);

        setStandings([
            { rank: 1, team: 'Titans', played: 6, won: 5, lost: 1, points: 15 },
            { rank: 2, team: 'Warriors', played: 6, won: 4, lost: 2, points: 12 },
            { rank: 3, team: 'Panthers', played: 6, won: 3, lost: 3, points: 9 },
            { rank: 4, team: 'Falcons', played: 6, won: 2, lost: 4, points: 6 },
        ]);

        setDetailModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this tournament and all related data?')) return;

        try {
            const { error } = await supabase.from('tournaments').delete().eq('id', id);
            if (error) throw error;

            setTournaments(tournaments.filter(t => t.id !== id));
            toast({ title: 'Success', description: 'Tournament deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleClone = (tournament: Tournament) => {
        toast({ title: 'Tournament Cloned', description: `${tournament.name} (Copy) created` });
    };

    const handleApprove = async (id: string) => {
        try {
            await supabase.from('tournaments').update({ status: 'Active' }).eq('id', id);
            toast({ title: 'Approved', description: 'Tournament is now active' });
            fetchTournaments();
        } catch (error) {
            console.error('Error approving tournament:', error);
        }
    };

    const handleGenerateFixtures = () => {
        toast({ title: 'Fixtures Generated', description: `${teams.length * (teams.length - 1) / 2} matches created` });
        setFixturesModalOpen(false);
    };

    const handleSaveRules = () => {
        toast({ title: 'Rules Saved', description: 'Tournament rules updated' });
        setRulesModalOpen(false);
    };

    const handleExportFixtures = (format: 'pdf' | 'excel') => {
        toast({ title: 'Exporting', description: `Fixtures exported to ${format.toUpperCase()}` });
    };

    const filteredTournaments = tournaments.filter(t => {
        const matchesSearch =
            t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.city?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active': return <Badge className="bg-green-100 text-green-700">Active</Badge>;
            case 'Draft': return <Badge className="bg-amber-100 text-amber-700">Draft</Badge>;
            case 'Completed': return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
            case 'Pending': return <Badge className="bg-purple-100 text-purple-700">Pending Approval</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const stats = {
        total: tournaments.length,
        active: tournaments.filter(t => t.status === 'Active').length,
        pending: tournaments.filter(t => t.status === 'Pending' || t.status === 'Draft').length,
        completed: tournaments.filter(t => t.status === 'Completed').length,
    };

    return (
        <AdminLayout title="Tournament Management">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Tournaments</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                        <p className="text-sm text-slate-500">Active</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                        <p className="text-sm text-slate-500">Pending</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.completed}</p>
                        <p className="text-sm text-slate-500">Completed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search tournaments..."
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
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
                <Button className="bg-[#1e3a5f]" onClick={() => navigate('/tournaments/create')}>
                    <Plus className="w-4 h-4 mr-2" /> Create Tournament
                </Button>
            </div>

            {/* Tournaments Table */}
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tournament</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Location</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Dates</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTournaments.map(tournament => (
                                    <tr key={tournament.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                    <Trophy className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{tournament.name}</p>
                                                    <p className="text-xs text-slate-500">{tournament.teams_count || 0} teams</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 text-slate-600">
                                                <MapPin className="w-4 h-4" />
                                                {tournament.city}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{tournament.category}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {tournament.start_date} - {tournament.end_date}
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(tournament.status)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openTournamentDetail(tournament)}>
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                </Button>
                                                {tournament.status === 'Pending' && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleApprove(tournament.id)}>
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => handleClone(tournament)}>
                                                    <Copy className="w-4 h-4 text-purple-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(tournament.id)}>
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

            {/* Tournament Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
                    {selectedTournament && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <Trophy className="w-7 h-7 text-purple-600" />
                                    </div>
                                    <div>
                                        <DialogTitle className="flex items-center gap-2">
                                            {selectedTournament.name}
                                            {getStatusBadge(selectedTournament.status)}
                                        </DialogTitle>
                                        <DialogDescription className="flex items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedTournament.city}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedTournament.start_date}</span>
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Quick Actions */}
                            <div className="flex gap-2 my-4">
                                <Button variant="outline" onClick={() => setRulesModalOpen(true)}>
                                    <Settings className="w-4 h-4 mr-2" /> Rules
                                </Button>
                                <Button variant="outline" onClick={() => setFixturesModalOpen(true)}>
                                    <Zap className="w-4 h-4 mr-2" /> Generate Fixtures
                                </Button>
                                <Button variant="outline" onClick={() => handleExportFixtures('pdf')}>
                                    <Download className="w-4 h-4 mr-2" /> Export PDF
                                </Button>
                                <Button variant="outline" onClick={() => handleExportFixtures('excel')}>
                                    <FileText className="w-4 h-4 mr-2" /> Export Excel
                                </Button>
                            </div>

                            <Tabs value={detailTab} onValueChange={setDetailTab}>
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="teams">Teams</TabsTrigger>
                                    <TabsTrigger value="matches">Matches</TabsTrigger>
                                    <TabsTrigger value="standings">Standings</TabsTrigger>
                                    <TabsTrigger value="stats">Stats</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-4">
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                                            <Users className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                                            <p className="text-2xl font-bold">{teams.length}</p>
                                            <p className="text-xs text-slate-500">Teams</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                                            <Target className="w-6 h-6 mx-auto text-green-500 mb-2" />
                                            <p className="text-2xl font-bold">{matches.length}</p>
                                            <p className="text-xs text-slate-500">Matches</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                                            <Clock className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                                            <p className="text-2xl font-bold">20</p>
                                            <p className="text-xs text-slate-500">Min/Half</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                                            <Trophy className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                                            <p className="text-2xl font-bold">Knockout</p>
                                            <p className="text-xs text-slate-500">Format</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="teams">
                                    <div className="space-y-2">
                                        {teams.map(team => (
                                            <div key={team.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-10 h-10 bg-blue-100">
                                                        <AvatarFallback className="text-blue-600">{team.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{team.name}</p>
                                                        <p className="text-xs text-slate-500">{team.players} players</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-green-600">{team.wins}W</span>
                                                    <span className="text-sm text-red-600">{team.losses}L</span>
                                                    <Button variant="outline" size="sm">Manage</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="matches">
                                    <div className="space-y-2">
                                        {matches.map(match => (
                                            <div key={match.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <span className="font-medium">{match.team_a}</span>
                                                    <span className="text-slate-400">vs</span>
                                                    <span className="font-medium">{match.team_b}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-lg font-bold">{match.score}</span>
                                                    <Badge className={match.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                                                        {match.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="standings">
                                    <table className="w-full">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">#</th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Team</th>
                                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">P</th>
                                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">W</th>
                                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">L</th>
                                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Pts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.map(row => (
                                                <tr key={row.rank} className={row.rank === 1 ? 'bg-amber-50' : ''}>
                                                    <td className="px-4 py-2 font-bold">{row.rank}</td>
                                                    <td className="px-4 py-2 font-medium">{row.team}</td>
                                                    <td className="px-4 py-2 text-center">{row.played}</td>
                                                    <td className="px-4 py-2 text-center text-green-600">{row.won}</td>
                                                    <td className="px-4 py-2 text-center text-red-600">{row.lost}</td>
                                                    <td className="px-4 py-2 text-center font-bold">{row.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </TabsContent>

                                <TabsContent value="stats">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Card className="border-slate-200">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <Target className="w-4 h-4 text-red-500" /> Top Raiders
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {['Player A - 45 pts', 'Player B - 38 pts', 'Player C - 32 pts'].map((p, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm">
                                                        <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                                        {p}
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                        <Card className="border-slate-200">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-blue-500" /> Top Defenders
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {['Player X - 28 pts', 'Player Y - 24 pts', 'Player Z - 21 pts'].map((p, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm">
                                                        <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                                        {p}
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Rules Modal */}
            <Dialog open={rulesModalOpen} onOpenChange={setRulesModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Tournament Rules</DialogTitle>
                        <DialogDescription>Configure match format and scoring rules.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Format</Label>
                                <Select value={rules.format} onValueChange={(v: any) => setRules({ ...rules, format: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="knockout">Knockout</SelectItem>
                                        <SelectItem value="league">League</SelectItem>
                                        <SelectItem value="group_stage">Group Stage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Half Duration (min)</Label>
                                <Input
                                    type="number"
                                    value={rules.halves_duration}
                                    onChange={(e) => setRules({ ...rules, halves_duration: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label>Timeouts per Half</Label>
                                <Input
                                    type="number"
                                    value={rules.timeout_per_half}
                                    onChange={(e) => setRules({ ...rules, timeout_per_half: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label>Super Tackle Limit</Label>
                                <Input
                                    type="number"
                                    value={rules.super_tackle_limit}
                                    onChange={(e) => setRules({ ...rules, super_tackle_limit: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label>Points per Win</Label>
                                <Input
                                    type="number"
                                    value={rules.points_per_win}
                                    onChange={(e) => setRules({ ...rules, points_per_win: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label>Points per Draw</Label>
                                <Input
                                    type="number"
                                    value={rules.points_per_draw}
                                    onChange={(e) => setRules({ ...rules, points_per_draw: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRulesModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveRules} className="bg-[#1e3a5f]">Save Rules</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate Fixtures Modal */}
            <Dialog open={fixturesModalOpen} onOpenChange={setFixturesModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Auto-Generate Fixtures</DialogTitle>
                        <DialogDescription>Automatically create match schedule based on format.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-2">Based on current settings:</p>
                            <ul className="text-sm space-y-1">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    {teams.length} teams registered
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    {rules.format.replace('_', ' ')} format
                                </li>
                                <li className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    {teams.length * (teams.length - 1) / 2} matches will be created
                                </li>
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFixturesModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleGenerateFixtures} className="bg-[#1e3a5f]">
                            <Zap className="w-4 h-4 mr-2" /> Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default ManageTournaments;
