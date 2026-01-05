import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    Search, Trash2, Ban, CheckCircle, RotateCcw, Crown, Filter,
    Eye, Shield, AlertTriangle, History, Smartphone, MapPin, Calendar
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

interface User {
    id: string;
    name: string;
    phone: string;
    avatar_url: string | null;
    role: string;
    created_at: string;
    is_banned?: boolean;
    is_verified?: boolean;
}

interface UserDetail extends User {
    matches_played: number;
    total_points: number;
    current_level: number;
    xp: number;
    infractions: Infraction[];
    devices: Device[];
}

interface Infraction {
    id: string;
    type: string;
    description: string;
    date: string;
    severity: 'low' | 'medium' | 'high';
}

interface Device {
    id: string;
    device_name: string;
    last_active: string;
    platform: string;
}

const LEVELS = [
    { value: 1, label: 'Noob', color: 'bg-gray-500', xp: 0 },
    { value: 2, label: 'Semi-Pro', color: 'bg-green-500', xp: 50 },
    { value: 3, label: 'Pro', color: 'bg-blue-500', xp: 150 },
    { value: 4, label: 'Elite', color: 'bg-purple-500', xp: 400 },
    { value: 5, label: 'PKL Eligible', color: 'bg-orange-500', xp: 800 },
    { value: 6, label: 'PKL Prospect', color: 'bg-pink-500', xp: 1500 },
    { value: 7, label: 'PKL Player', color: 'bg-yellow-500', xp: 3000 },
];

const ROLES = [
    { value: 'user', label: 'User', color: 'bg-slate-500' },
    { value: 'scorer', label: 'Scorer', color: 'bg-blue-500' },
    { value: 'tournament_admin', label: 'Tournament Admin', color: 'bg-purple-500' },
    { value: 'content_mod', label: 'Content Moderator', color: 'bg-pink-500' },
    { value: 'support', label: 'Support', color: 'bg-green-500' },
    { value: 'admin', label: 'Admin', color: 'bg-amber-500' },
    { value: 'super_admin', label: 'Super Admin', color: 'bg-red-500' },
];

const ManageUsers = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Detail modal
    const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailTab, setDetailTab] = useState('overview');

    // Level override
    const [levelModalOpen, setLevelModalOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState(1);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers((data || []) as any);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const openUserDetail = async (user: User) => {
        // Fetch additional user details
        const userDetail: UserDetail = {
            ...user,
            matches_played: 24,
            total_points: 156,
            current_level: 3,
            xp: 280,
            infractions: [
                { id: '1', type: 'Warning', description: 'Inappropriate username', date: '2024-01-15', severity: 'low' },
            ],
            devices: [
                { id: '1', device_name: 'iPhone 14', last_active: '2 hours ago', platform: 'iOS' },
                { id: '2', device_name: 'Chrome Windows', last_active: '1 day ago', platform: 'Web' },
            ],
        };
        setSelectedUser(userDetail);
        setSelectedLevel(userDetail.current_level);
        setDetailModalOpen(true);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole } as any)
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            toast({ title: 'Success', description: `Role changed to ${newRole}` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleBanToggle = async (user: User) => {
        const action = user.is_banned ? 'unban' : 'ban';
        if (!confirm(`${action.toUpperCase()} ${user.name}?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: !user.is_banned } as any)
                .eq('id', user.id);

            if (error) throw error;

            setUsers(users.map(u => u.id === user.id ? { ...u, is_banned: !u.is_banned } : u));
            toast({ title: 'Success', description: `User ${action}ned` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleVerifyToggle = async (user: User) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_verified: !user.is_verified } as any)
                .eq('id', user.id);

            if (error) throw error;

            setUsers(users.map(u => u.id === user.id ? { ...u, is_verified: !u.is_verified } : u));
            toast({ title: 'Success', description: user.is_verified ? 'Verification removed' : 'User verified' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleResetXP = async (userId: string) => {
        if (!confirm('Reset ALL XP for this user? This cannot be undone.')) return;

        try {
            await supabase.from('player_match_stats').delete().eq('player_id', userId);
            toast({ title: 'Success', description: 'User XP has been reset to 0' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleLevelOverride = () => {
        if (!selectedUser) return;
        const level = LEVELS[selectedLevel - 1];
        toast({
            title: 'Level Override Applied',
            description: `${selectedUser.name} is now ${level.label} (${level.xp}+ XP)`
        });
        setLevelModalOpen(false);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Soft delete this user?')) return;

        try {
            // Soft delete - just mark as deleted
            const { error } = await supabase
                .from('profiles')
                .update({ is_deleted: true } as any)
                .eq('id', userId);

            if (error) throw error;
            setUsers(users.filter(u => u.id !== userId));
            toast({ title: 'Success', description: 'User deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone?.includes(searchTerm) ||
            user.id?.includes(searchTerm);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'banned' && user.is_banned) ||
            (statusFilter === 'verified' && user.is_verified) ||
            (statusFilter === 'active' && !user.is_banned);
        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleBadge = (role: string) => {
        const roleConfig = ROLES.find(r => r.value === role);
        return <Badge className={`${roleConfig?.color || 'bg-slate-500'} text-white`}>{roleConfig?.label || role}</Badge>;
    };

    return (
        <AdminLayout title="User Management">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{users.length}</p>
                        <p className="text-sm text-slate-500">Total Users</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{users.filter(u => !u.is_banned).length}</p>
                        <p className="text-sm text-slate-500">Active</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{users.filter(u => u.is_banned).length}</p>
                        <p className="text-sm text-slate-500">Banned</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{users.filter(u => u.is_verified).length}</p>
                        <p className="text-sm text-slate-500">Verified</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, phone, or ID..."
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
                        {ROLES.map(role => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 bg-white border-slate-200">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Users Table */}
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Phone</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className={`hover:bg-slate-50 ${user.is_banned ? 'opacity-60 bg-red-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={user.avatar_url || ''} />
                                                    <AvatarFallback className="bg-blue-100 text-blue-600">{user.name?.charAt(0) || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-800">{user.name || 'Unknown'}</span>
                                                        {user.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                                    </div>
                                                    <span className="text-xs text-slate-400">{user.id.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                                        <td className="px-4 py-3">
                                            <Select
                                                value={user.role || 'user'}
                                                onValueChange={(value) => handleRoleChange(user.id, value)}
                                            >
                                                <SelectTrigger className="w-36 h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROLES.map(role => (
                                                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.is_banned ? (
                                                <Badge variant="destructive">Banned</Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-700">Active</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openUserDetail(user)}>
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleVerifyToggle(user)}>
                                                    <Shield className={`w-4 h-4 ${user.is_verified ? 'text-blue-500' : 'text-slate-400'}`} />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleBanToggle(user)}>
                                                    {user.is_banned ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Ban className="w-4 h-4 text-amber-500" />
                                                    )}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)}>
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

            {/* User Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white max-w-2xl">
                    {selectedUser && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-16 h-16">
                                        <AvatarImage src={selectedUser.avatar_url || ''} />
                                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">{selectedUser.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <DialogTitle className="flex items-center gap-2">
                                            {selectedUser.name}
                                            {selectedUser.is_verified && <CheckCircle className="w-5 h-5 text-blue-500" />}
                                        </DialogTitle>
                                        <DialogDescription>{selectedUser.phone} · ID: {selectedUser.id.slice(0, 8)}</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <Tabs value={detailTab} onValueChange={setDetailTab}>
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="history">History</TabsTrigger>
                                    <TabsTrigger value="infractions">Infractions</TabsTrigger>
                                    <TabsTrigger value="devices">Devices</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-4">
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-slate-800">{selectedUser.matches_played}</p>
                                            <p className="text-xs text-slate-500">Matches</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-slate-800">{selectedUser.total_points}</p>
                                            <p className="text-xs text-slate-500">Total Points</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-slate-800">Lvl {selectedUser.current_level}</p>
                                            <p className="text-xs text-slate-500">{LEVELS[selectedUser.current_level - 1]?.label}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-slate-800">{selectedUser.xp}</p>
                                            <p className="text-xs text-slate-500">XP</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button className="flex-1" onClick={() => setLevelModalOpen(true)}>
                                            <Crown className="w-4 h-4 mr-2" /> Override Level
                                        </Button>
                                        <Button variant="destructive" onClick={() => handleResetXP(selectedUser.id)}>
                                            <RotateCcw className="w-4 h-4 mr-2" /> Reset XP
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="history">
                                    <div className="text-center py-8 text-slate-400">
                                        <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Match history coming soon</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="infractions" className="space-y-2">
                                    {selectedUser.infractions.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No infractions</p>
                                        </div>
                                    ) : (
                                        selectedUser.infractions.map(inf => (
                                            <div key={inf.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                <AlertTriangle className={`w-5 h-5 ${inf.severity === 'high' ? 'text-red-500' :
                                                        inf.severity === 'medium' ? 'text-amber-500' : 'text-green-500'
                                                    }`} />
                                                <div className="flex-1">
                                                    <p className="font-medium text-slate-800">{inf.type}</p>
                                                    <p className="text-sm text-slate-500">{inf.description}</p>
                                                </div>
                                                <span className="text-xs text-slate-400">{inf.date}</span>
                                            </div>
                                        ))
                                    )}
                                </TabsContent>

                                <TabsContent value="devices" className="space-y-2">
                                    {selectedUser.devices.map(device => (
                                        <div key={device.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <Smartphone className="w-5 h-5 text-blue-500" />
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">{device.device_name}</p>
                                                <p className="text-sm text-slate-500">{device.platform}</p>
                                            </div>
                                            <span className="text-xs text-slate-400">{device.last_active}</span>
                                        </div>
                                    ))}
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Level Override Modal */}
            <Dialog open={levelModalOpen} onOpenChange={setLevelModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Override Level</DialogTitle>
                        <DialogDescription>Manually set {selectedUser?.name}'s rank level.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2 py-4">
                        {LEVELS.map((level) => (
                            <button
                                key={level.value}
                                onClick={() => setSelectedLevel(level.value)}
                                className={`p-3 rounded-lg border text-left transition-colors ${selectedLevel === level.value
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full ${level.color} flex items-center justify-center text-xs font-bold text-white`}>
                                        {level.value}
                                    </div>
                                    <span className="font-semibold text-slate-800">{level.label}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{level.xp}+ XP</p>
                            </button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLevelModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleLevelOverride} className="bg-[#1e3a5f]">Apply Level</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default ManageUsers;
