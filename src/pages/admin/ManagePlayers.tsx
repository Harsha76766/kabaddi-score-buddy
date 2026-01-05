import { useEffect, useState } from 'react';
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
    Search, Edit, Users, CheckCircle, Target, Shield, Link2, Unlink,
    AlertTriangle, Trophy, TrendingUp, Calendar, Award, Zap, Star
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

interface Player {
    id: string;
    name: string;
    jersey_number: number;
    role: string;
    team_id: string;
    team_name: string;
    user_id?: string;
    is_verified?: boolean;
    raid_points: number;
    tackle_points: number;
    matches_played: number;
    xp: number;
    level: number;
    created_at: string;
}

interface XPEvent {
    id: string;
    date: string;
    event: string;
    xp_gained: number;
    match_name: string;
}

interface Flag {
    id: string;
    type: string;
    description: string;
    date: string;
    status: 'pending' | 'resolved';
}

const LEVELS = [
    { value: 1, label: 'Noob', color: 'bg-gray-500' },
    { value: 2, label: 'Semi-Pro', color: 'bg-green-500' },
    { value: 3, label: 'Pro', color: 'bg-blue-500' },
    { value: 4, label: 'Elite', color: 'bg-purple-500' },
    { value: 5, label: 'PKL Eligible', color: 'bg-orange-500' },
    { value: 6, label: 'PKL Prospect', color: 'bg-pink-500' },
    { value: 7, label: 'PKL Player', color: 'bg-yellow-500' },
];

const ManagePlayers = () => {
    const { toast } = useToast();
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Detail modal
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailTab, setDetailTab] = useState('overview');
    const [xpTimeline, setXpTimeline] = useState<XPEvent[]>([]);
    const [flags, setFlags] = useState<Flag[]>([]);

    // Edit modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editedPlayer, setEditedPlayer] = useState<Partial<Player>>({});

    // Link modal
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUserId, setLinkUserId] = useState('');

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        try {
            const { data, error } = await supabase
                .from('players')
                .select(`*, teams(name)`)
                .order('name', { ascending: true });

            if (error) throw error;

            const formatted = (data || []).map((p: any) => ({
                ...p,
                team_name: p.teams?.name || 'No Team',
                raid_points: Math.floor(Math.random() * 100),
                tackle_points: Math.floor(Math.random() * 50),
                matches_played: Math.floor(Math.random() * 30),
                xp: Math.floor(Math.random() * 500),
                level: Math.floor(Math.random() * 7) + 1,
            }));

            setPlayers(formatted);
        } catch (error) {
            console.error('Error fetching players:', error);
        } finally {
            setLoading(false);
        }
    };

    const openPlayerDetail = (player: Player) => {
        setSelectedPlayer(player);

        // Mock XP timeline
        setXpTimeline([
            { id: '1', date: '2024-01-15', event: 'Super Raid (+3)', xp_gained: 30, match_name: 'Titans vs Warriors' },
            { id: '2', date: '2024-01-14', event: 'Match Win', xp_gained: 50, match_name: 'Titans vs Panthers' },
            { id: '3', date: '2024-01-12', event: 'Tackle Point (+1)', xp_gained: 10, match_name: 'Titans vs Falcons' },
            { id: '4', date: '2024-01-10', event: 'Raid Point (+1)', xp_gained: 10, match_name: 'Titans vs Lions' },
            { id: '5', date: '2024-01-08', event: 'All-Out Bonus', xp_gained: 25, match_name: 'Titans vs Eagles' },
        ]);

        // Mock flags
        setFlags([
            { id: '1', type: 'Suspicious Stats', description: 'Unusually high raid points in single match', date: '2024-01-15', status: 'pending' },
        ]);

        setDetailModalOpen(true);
    };

    const openEditModal = (player: Player) => {
        setEditedPlayer({
            name: player.name,
            jersey_number: player.jersey_number,
            role: player.role,
        });
        setSelectedPlayer(player);
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedPlayer) return;

        try {
            await supabase
                .from('players')
                .update({
                    name: editedPlayer.name,
                    jersey_number: editedPlayer.jersey_number,
                    role: editedPlayer.role,
                })
                .eq('id', selectedPlayer.id);

            toast({ title: 'Success', description: 'Player updated' });
            setEditModalOpen(false);
            fetchPlayers();
        } catch (error) {
            console.error('Error updating player:', error);
        }
    };

    const handleVerify = async (player: Player) => {
        try {
            const { error } = await supabase
                .from('players')
                .update({ is_verified: !player.is_verified } as any)
                .eq('id', player.id);

            if (error) throw error;

            setPlayers(players.map(p => p.id === player.id ? { ...p, is_verified: !p.is_verified } : p));
            toast({ title: 'Success', description: player.is_verified ? 'Verification removed' : 'Player verified' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleLinkUser = () => {
        if (!selectedPlayer || !linkUserId) return;

        toast({
            title: 'Player Linked',
            description: `${selectedPlayer.name} is now linked to user account`
        });
        setLinkModalOpen(false);
        setLinkUserId('');
    };

    const handleUnlinkUser = (player: Player) => {
        if (!confirm(`Unlink ${player.name} from user account?`)) return;

        toast({ title: 'Player Unlinked', description: 'User account has been disconnected' });
    };

    const handleResolveFlag = (flagId: string) => {
        setFlags(flags.map(f => f.id === flagId ? { ...f, status: 'resolved' } : f));
        toast({ title: 'Flag Resolved', description: 'Disciplinary flag has been marked as resolved' });
    };

    const handleAssignAchievement = () => {
        toast({ title: 'Achievement Assigned', description: 'Badge has been added to player' });
    };

    const filteredPlayers = players.filter(player => {
        const matchesSearch =
            player.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            player.team_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || player.role?.toLowerCase() === roleFilter.toLowerCase();
        return matchesSearch && matchesRole;
    });

    const stats = {
        total: players.length,
        verified: players.filter(p => p.is_verified).length,
        linked: players.filter(p => p.user_id).length,
    };

    const getLevelBadge = (level: number) => {
        const levelConfig = LEVELS[level - 1] || LEVELS[0];
        return (
            <Badge className={`${levelConfig.color} text-white`}>
                Lvl {level} · {levelConfig.label}
            </Badge>
        );
    };

    return (
        <AdminLayout title="Players Management">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Players</p>
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
                        <p className="text-3xl font-bold text-green-600">{stats.linked}</p>
                        <p className="text-sm text-slate-500">Linked to Users</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">{flags.filter(f => f.status === 'pending').length}</p>
                        <p className="text-sm text-slate-500">Pending Flags</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search players..."
                        className="pl-10 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40 bg-white border-slate-200">
                        <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="raider">Raider</SelectItem>
                        <SelectItem value="defender">Defender</SelectItem>
                        <SelectItem value="all-rounder">All-Rounder</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Players Table */}
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Player</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Team</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Stats</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Level</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPlayers.map(player => (
                                    <tr key={player.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                                                    {player.jersey_number || '?'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-800">{player.name}</span>
                                                        {player.is_verified && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                                                        {player.user_id && <Link2 className="w-3 h-3 text-green-500" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{player.team_name}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="secondary">{player.role || 'Unknown'}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-3">
                                                <span className="text-sm"><Target className="w-4 h-4 inline text-red-500" /> {player.raid_points}</span>
                                                <span className="text-sm"><Shield className="w-4 h-4 inline text-blue-500" /> {player.tackle_points}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{getLevelBadge(player.level)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openPlayerDetail(player)}>
                                                    <TrendingUp className="w-4 h-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(player)}>
                                                    <Edit className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleVerify(player)}>
                                                    <Star className={`w-4 h-4 ${player.is_verified ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                                                </Button>
                                                {player.user_id ? (
                                                    <Button variant="ghost" size="sm" onClick={() => handleUnlinkUser(player)}>
                                                        <Unlink className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPlayer(player); setLinkModalOpen(true); }}>
                                                        <Link2 className="w-4 h-4 text-green-500" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Player Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white max-w-3xl max-h-[85vh] overflow-y-auto">
                    {selectedPlayer && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center font-bold text-2xl text-blue-600">
                                        {selectedPlayer.jersey_number}
                                    </div>
                                    <div>
                                        <DialogTitle className="flex items-center gap-2">
                                            {selectedPlayer.name}
                                            {selectedPlayer.is_verified && <Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
                                        </DialogTitle>
                                        <DialogDescription className="flex items-center gap-4 mt-1">
                                            <span>{selectedPlayer.team_name}</span>
                                            <span>{selectedPlayer.role}</span>
                                            {getLevelBadge(selectedPlayer.level)}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Stats */}
                            <div className="grid grid-cols-5 gap-3 my-4">
                                <div className="bg-slate-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-slate-800">{selectedPlayer.matches_played}</p>
                                    <p className="text-xs text-slate-500">Matches</p>
                                </div>
                                <div className="bg-red-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-red-600">{selectedPlayer.raid_points}</p>
                                    <p className="text-xs text-slate-500">Raid Pts</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-blue-600">{selectedPlayer.tackle_points}</p>
                                    <p className="text-xs text-slate-500">Tackle Pts</p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-amber-600">{selectedPlayer.xp}</p>
                                    <p className="text-xs text-slate-500">XP</p>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-purple-600">Lvl {selectedPlayer.level}</p>
                                    <p className="text-xs text-slate-500">{LEVELS[selectedPlayer.level - 1]?.label}</p>
                                </div>
                            </div>

                            <Tabs value={detailTab} onValueChange={setDetailTab}>
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="overview">XP Timeline</TabsTrigger>
                                    <TabsTrigger value="achievements">Achievements</TabsTrigger>
                                    <TabsTrigger value="flags">Flags</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-2">
                                    {xpTimeline.map(event => (
                                        <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Zap className="w-5 h-5 text-amber-500" />
                                                <div>
                                                    <p className="font-medium text-sm">{event.event}</p>
                                                    <p className="text-xs text-slate-500">{event.match_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600">+{event.xp_gained} XP</p>
                                                <p className="text-xs text-slate-400">{event.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>

                                <TabsContent value="achievements">
                                    <div className="text-center py-8">
                                        <Award className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-slate-400 mb-4">No achievements yet</p>
                                        <Button variant="outline" onClick={handleAssignAchievement}>
                                            <Award className="w-4 h-4 mr-2" /> Assign Achievement
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="flags" className="space-y-2">
                                    {flags.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No disciplinary flags</p>
                                        </div>
                                    ) : (
                                        flags.map(flag => (
                                            <div key={flag.id} className={`flex items-center justify-between p-3 rounded-lg ${flag.status === 'pending' ? 'bg-red-50' : 'bg-green-50'
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <AlertTriangle className={`w-5 h-5 ${flag.status === 'pending' ? 'text-red-500' : 'text-green-500'
                                                        }`} />
                                                    <div>
                                                        <p className="font-medium text-sm">{flag.type}</p>
                                                        <p className="text-xs text-slate-500">{flag.description}</p>
                                                    </div>
                                                </div>
                                                {flag.status === 'pending' && (
                                                    <Button size="sm" onClick={() => handleResolveFlag(flag.id)}>
                                                        Resolve
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Player Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Edit Player</DialogTitle>
                        <DialogDescription>Update player details.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Name</Label>
                            <Input
                                value={editedPlayer.name || ''}
                                onChange={(e) => setEditedPlayer({ ...editedPlayer, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Jersey Number</Label>
                            <Input
                                type="number"
                                value={editedPlayer.jersey_number || ''}
                                onChange={(e) => setEditedPlayer({ ...editedPlayer, jersey_number: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label>Role</Label>
                            <Select
                                value={editedPlayer.role || ''}
                                onValueChange={(v) => setEditedPlayer({ ...editedPlayer, role: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Raider">Raider</SelectItem>
                                    <SelectItem value="Defender">Defender</SelectItem>
                                    <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} className="bg-[#1e3a5f]">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Link User Modal */}
            <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Link to User Account</DialogTitle>
                        <DialogDescription>
                            Connect {selectedPlayer?.name} to a registered user account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>User ID or Phone</Label>
                        <Input
                            placeholder="Enter user ID or phone number"
                            value={linkUserId}
                            onChange={(e) => setLinkUserId(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleLinkUser} className="bg-[#1e3a5f]">
                            <Link2 className="w-4 h-4 mr-2" /> Link User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default ManagePlayers;
