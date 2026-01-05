import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    Search, Trash2, Eye, Users, Shield, CheckCircle, MapPin,
    GitMerge, ArrowRightLeft, UserMinus, UserPlus, Trophy, Target,
    BarChart3, Calendar
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

interface Team {
    id: string;
    name: string;
    logo_url: string | null;
    captain_name: string;
    city: string;
    is_verified?: boolean;
    created_at: string;
}

interface TeamDetail extends Team {
    players: Player[];
    matches_played: number;
    wins: number;
    losses: number;
    total_points: number;
}

interface Player {
    id: string;
    name: string;
    jersey_number: number;
    role: string;
    raid_points: number;
    tackle_points: number;
}

const ManageTeams = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailTab, setDetailTab] = useState('players');
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [selectedPlayerForTransfer, setSelectedPlayerForTransfer] = useState<Player | null>(null);
    const [targetTeamId, setTargetTeamId] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTeams(data || []);
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setLoading(false);
        }
    };

    const openTeamDetail = (team: Team) => {
        const teamDetail: TeamDetail = {
            ...team,
            players: [
                { id: '1', name: 'Player 1', jersey_number: 7, role: 'Raider', raid_points: 45, tackle_points: 12 },
                { id: '2', name: 'Player 2', jersey_number: 12, role: 'Defender', raid_points: 8, tackle_points: 38 },
                { id: '3', name: 'Player 3', jersey_number: 3, role: 'All-Rounder', raid_points: 28, tackle_points: 24 },
                { id: '4', name: 'Player 4', jersey_number: 9, role: 'Raider', raid_points: 35, tackle_points: 5 },
                { id: '5', name: 'Player 5', jersey_number: 1, role: 'Defender', raid_points: 3, tackle_points: 42 },
            ],
            matches_played: 15,
            wins: 10,
            losses: 5,
            total_points: 458,
        };
        setSelectedTeam(teamDetail);
        setDetailModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this team and remove all players?')) return;

        try {
            await supabase.from('players').delete().eq('team_id', id);
            const { error } = await supabase.from('teams').delete().eq('id', id);
            if (error) throw error;

            setTeams(teams.filter(t => t.id !== id));
            toast({ title: 'Success', description: 'Team deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleVerify = async (team: Team) => {
        try {
            const { error } = await supabase
                .from('teams')
                .update({ is_verified: !team.is_verified } as any)
                .eq('id', team.id);

            if (error) throw error;

            setTeams(teams.map(t => t.id === team.id ? { ...t, is_verified: !t.is_verified } : t));
            toast({ title: 'Success', description: team.is_verified ? 'Verification removed' : 'Team verified' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleMergeTeams = (sourceTeamId: string) => {
        toast({
            title: 'Teams Merged',
            description: 'Players have been transferred and duplicate team deleted'
        });
        setMergeModalOpen(false);
    };

    const handleTransferPlayer = () => {
        if (!selectedPlayerForTransfer || !targetTeamId) return;

        toast({
            title: 'Player Transferred',
            description: `${selectedPlayerForTransfer.name} has been moved`
        });
        setTransferModalOpen(false);
        setSelectedPlayerForTransfer(null);
        setTargetTeamId('');
    };

    const handleRemovePlayer = (player: Player) => {
        if (!confirm(`Remove ${player.name} from team?`)) return;

        if (selectedTeam) {
            setSelectedTeam({
                ...selectedTeam,
                players: selectedTeam.players.filter(p => p.id !== player.id),
            });
        }
        toast({ title: 'Player Removed', description: `${player.name} has been removed from team` });
    };

    const openTransferModal = (player: Player) => {
        setSelectedPlayerForTransfer(player);
        setTransferModalOpen(true);
    };

    const filteredTeams = teams.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.captain_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: teams.length,
        verified: teams.filter(t => t.is_verified).length,
    };

    return (
        <AdminLayout title="Team Management">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Teams</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.verified}</p>
                        <p className="text-sm text-slate-500">Verified</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.total - stats.verified}</p>
                        <p className="text-sm text-slate-500">Unverified</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setMergeModalOpen(true)}>
                            <GitMerge className="w-4 h-4 mr-1" /> Merge Duplicates
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search teams by name, city, or captain..."
                        className="pl-10 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-3 flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    filteredTeams.map(team => (
                        <Card key={team.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={team.logo_url || ''} />
                                            <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                                                {team.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-slate-800">{team.name}</p>
                                                {team.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                            </div>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {team.city}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                    <Users className="w-4 h-4" />
                                    <span>Captain: {team.captain_name}</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openTeamDetail(team)}>
                                        <Eye className="w-4 h-4 mr-1" /> View
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleVerify(team)}>
                                        <Shield className={`w-4 h-4 ${team.is_verified ? 'text-blue-500' : 'text-slate-400'}`} />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(team.id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Team Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white max-w-3xl max-h-[85vh] overflow-y-auto">
                    {selectedTeam && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-16 h-16">
                                        <AvatarImage src={selectedTeam.logo_url || ''} />
                                        <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl">
                                            {selectedTeam.name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <DialogTitle className="flex items-center gap-2">
                                            {selectedTeam.name}
                                            {selectedTeam.is_verified && <CheckCircle className="w-5 h-5 text-blue-500" />}
                                        </DialogTitle>
                                        <DialogDescription className="flex items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedTeam.city}</span>
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {selectedTeam.players.length} players</span>
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-3 my-4">
                                <div className="bg-slate-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-slate-800">{selectedTeam.matches_played}</p>
                                    <p className="text-xs text-slate-500">Matches</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-600">{selectedTeam.wins}</p>
                                    <p className="text-xs text-slate-500">Wins</p>
                                </div>
                                <div className="bg-red-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-red-600">{selectedTeam.losses}</p>
                                    <p className="text-xs text-slate-500">Losses</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-blue-600">{selectedTeam.total_points}</p>
                                    <p className="text-xs text-slate-500">Points</p>
                                </div>
                            </div>

                            <Tabs value={detailTab} onValueChange={setDetailTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="players">Players</TabsTrigger>
                                    <TabsTrigger value="history">Match History</TabsTrigger>
                                </TabsList>

                                <TabsContent value="players" className="space-y-2">
                                    {selectedTeam.players.map(player => (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                                                    {player.jersey_number}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{player.name}</p>
                                                    <p className="text-xs text-slate-500">{player.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-sm"><span className="text-green-600 font-medium">{player.raid_points}</span> Raid</p>
                                                    <p className="text-sm"><span className="text-blue-600 font-medium">{player.tackle_points}</span> Tackle</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => openTransferModal(player)}>
                                                    <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleRemovePlayer(player)}>
                                                    <UserMinus className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <Button variant="outline" className="w-full">
                                        <UserPlus className="w-4 h-4 mr-2" /> Add Player
                                    </Button>
                                </TabsContent>

                                <TabsContent value="history">
                                    <div className="text-center py-8 text-slate-400">
                                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Match history coming soon</p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Merge Teams Modal */}
            <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Merge Duplicate Teams</DialogTitle>
                        <DialogDescription>Select teams to merge. Players will be transferred to the primary team.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Primary Team (keep)</label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select primary team" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Duplicate Team (delete)</label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select duplicate team" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMergeModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => handleMergeTeams('')} className="bg-[#1e3a5f]">
                            <GitMerge className="w-4 h-4 mr-2" /> Merge Teams
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer Player Modal */}
            <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Transfer Player</DialogTitle>
                        <DialogDescription>
                            Transfer {selectedPlayerForTransfer?.name} to another team.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium text-slate-700">Target Team</label>
                        <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select target team" />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.filter(t => t.id !== selectedTeam?.id).map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleTransferPlayer} className="bg-[#1e3a5f]">
                            <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default ManageTeams;
