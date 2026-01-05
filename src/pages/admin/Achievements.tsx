import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    Award, Plus, Trash2, Edit, Target, Shield, Trophy, Star,
    Zap, Crown, Medal, Users
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'raid' | 'defense' | 'match' | 'special' | 'seasonal';
    type: 'auto' | 'manual';
    threshold: number;
    is_seasonal: boolean;
    earned_count?: number;
}

const iconMap: Record<string, any> = {
    Award, Target, Shield, Trophy, Star, Zap, Crown, Medal
};

const Achievements = () => {
    const { toast } = useToast();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

    const [newAchievement, setNewAchievement] = useState({
        name: '',
        description: '',
        icon: 'Award',
        category: 'special' as 'raid' | 'defense' | 'match' | 'special' | 'seasonal',
        type: 'auto' as 'auto' | 'manual',
        threshold: 0,
        is_seasonal: false,
    });

    const [assignPlayerId, setAssignPlayerId] = useState('');

    useEffect(() => {
        fetchAchievements();

        // Real-time subscription
        const channel = supabase
            .channel('achievements-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'achievements' }, () => {
                fetchAchievements();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchAchievements = async () => {
        try {
            // @ts-ignore - table exists but types not regenerated
            const { data: achievementsData, error } = await supabase
                .from('achievements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get earned counts
            // @ts-ignore - table exists but types not regenerated
            const { data: earnedCounts } = await supabase
                .from('user_achievements')
                .select('achievement_id');

            const countsMap: Record<string, number> = {};
            earnedCounts?.forEach(e => {
                countsMap[e.achievement_id] = (countsMap[e.achievement_id] || 0) + 1;
            });

            const enriched = (achievementsData || []).map(a => ({
                ...a,
                earned_count: countsMap[a.id] || 0,
            }));

            setAchievements((enriched as unknown) as Achievement[]);
        } catch (error) {
            console.error('Error fetching achievements:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch achievements' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase
                .from('achievements')
                .insert([newAchievement]);

            if (error) throw error;

            toast({ title: 'Achievement Created' });
            setCreateModalOpen(false);
            resetForm();
            fetchAchievements();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleUpdate = async () => {
        if (!editingAchievement) return;
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase
                .from('achievements')
                .update(newAchievement)
                .eq('id', editingAchievement.id);

            if (error) throw error;

            toast({ title: 'Achievement Updated' });
            setCreateModalOpen(false);
            resetForm();
            fetchAchievements();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this achievement?')) return;
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase.from('achievements').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Achievement Deleted' });
            fetchAchievements();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleAssign = async () => {
        if (!selectedAchievement || !assignPlayerId) return;
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase
                .from('user_achievements')
                .insert([{ user_id: assignPlayerId, achievement_id: selectedAchievement.id }]);

            if (error) throw error;

            toast({ title: 'Badge Assigned' });
            setAssignModalOpen(false);
            setAssignPlayerId('');
            fetchAchievements();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const openEdit = (achievement: Achievement) => {
        setEditingAchievement(achievement);
        setNewAchievement({
            name: achievement.name,
            description: achievement.description || '',
            icon: achievement.icon,
            category: achievement.category,
            type: achievement.type,
            threshold: achievement.threshold,
            is_seasonal: achievement.is_seasonal,
        });
        setCreateModalOpen(true);
    };

    const resetForm = () => {
        setEditingAchievement(null);
        setNewAchievement({ name: '', description: '', icon: 'Award', category: 'special', type: 'auto', threshold: 0, is_seasonal: false });
    };

    const filteredAchievements = achievements.filter(a =>
        activeTab === 'all' || a.category === activeTab
    );

    const stats = {
        total: achievements.length,
        raid: achievements.filter(a => a.category === 'raid').length,
        defense: achievements.filter(a => a.category === 'defense').length,
        totalEarned: achievements.reduce((sum, a) => sum + (a.earned_count || 0), 0),
    };

    const IconComponent = (iconName: string) => {
        const Icon = iconMap[iconName] || Award;
        return <Icon className="w-6 h-6" />;
    };

    if (loading) {
        return <AdminLayout title="Achievements"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Achievements System">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Badges</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">{stats.raid}</p>
                        <p className="text-sm text-slate-500">Raid Badges</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.defense}</p>
                        <p className="text-sm text-slate-500">Defense Badges</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.totalEarned}</p>
                        <p className="text-sm text-slate-500">Total Earned</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs & Actions */}
            <div className="flex justify-between items-center mb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-white border">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="raid">Raid</TabsTrigger>
                        <TabsTrigger value="defense">Defense</TabsTrigger>
                        <TabsTrigger value="match">Match</TabsTrigger>
                        <TabsTrigger value="special">Special</TabsTrigger>
                        <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button className="bg-[#1e3a5f]" onClick={() => { resetForm(); setCreateModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Create Badge
                </Button>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-3 gap-4">
                {filteredAchievements.map(achievement => (
                    <Card key={achievement.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${achievement.category === 'raid' ? 'bg-amber-100 text-amber-600' :
                                    achievement.category === 'defense' ? 'bg-blue-100 text-blue-600' :
                                        achievement.category === 'match' ? 'bg-green-100 text-green-600' :
                                            'bg-purple-100 text-purple-600'
                                    }`}>
                                    {IconComponent(achievement.icon)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-slate-800">{achievement.name}</p>
                                        {achievement.is_seasonal && <Badge className="bg-pink-100 text-pink-700 text-xs">Seasonal</Badge>}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-2">{achievement.description}</p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="capitalize">{achievement.type}</Badge>
                                        <Badge variant="secondary" className="capitalize">{achievement.category}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {achievement.earned_count || 0} earned
                                        </span>
                                        {achievement.type === 'auto' && achievement.threshold > 0 && (
                                            <span className="text-xs text-slate-400">Threshold: {achievement.threshold}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedAchievement(achievement); setAssignModalOpen(true); }}>
                                    Assign
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEdit(achievement)}>
                                    <Edit className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(achievement.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No achievements found</p>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>{editingAchievement ? 'Edit' : 'Create'} Achievement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={newAchievement.name} onChange={(e) => setNewAchievement({ ...newAchievement, name: e.target.value })} />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea value={newAchievement.description} onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Icon</Label>
                                <Select value={newAchievement.icon} onValueChange={(v) => setNewAchievement({ ...newAchievement, icon: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(iconMap).map(icon => (
                                            <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select value={newAchievement.category} onValueChange={(v: any) => setNewAchievement({ ...newAchievement, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="raid">Raid</SelectItem>
                                        <SelectItem value="defense">Defense</SelectItem>
                                        <SelectItem value="match">Match</SelectItem>
                                        <SelectItem value="special">Special</SelectItem>
                                        <SelectItem value="seasonal">Seasonal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Type</Label>
                                <Select value={newAchievement.type} onValueChange={(v: any) => setNewAchievement({ ...newAchievement, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto (Threshold)</SelectItem>
                                        <SelectItem value="manual">Manual Assign</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {newAchievement.type === 'auto' && (
                                <div>
                                    <Label>Threshold</Label>
                                    <Input type="number" value={newAchievement.threshold} onChange={(e) => setNewAchievement({ ...newAchievement, threshold: parseInt(e.target.value) || 0 })} />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={newAchievement.is_seasonal} onCheckedChange={(v) => setNewAchievement({ ...newAchievement, is_seasonal: v })} />
                            <Label>Seasonal Badge</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={editingAchievement ? handleUpdate : handleCreate} className="bg-[#1e3a5f]">
                            {editingAchievement ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Modal */}
            <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Assign Badge: {selectedAchievement?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>User ID</Label>
                        <Input value={assignPlayerId} onChange={(e) => setAssignPlayerId(e.target.value)} placeholder="Enter user UUID" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssign} className="bg-[#1e3a5f]">Assign Badge</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default Achievements;
