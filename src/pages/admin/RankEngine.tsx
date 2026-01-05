import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    Award, Save, RefreshCw, Target, Shield, Zap, Trophy,
    Calculator, Users, Lock, Unlock, Star
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface XPConfig {
    id: string;
    action_type: string;
    xp_value: number;
}

interface XPMultiplier {
    id: string;
    category: string;
    multiplier: number;
}

interface LevelThreshold {
    id: string;
    level: number;
    name: string;
    min_xp: number;
}

interface FrozenPlayer {
    id: string;
    player_id: string;
    reason: string;
    frozen_at: string;
    player?: { name: string };
}

const RankEngine = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('config');
    const [saving, setSaving] = useState(false);

    const [xpConfig, setXpConfig] = useState<XPConfig[]>([]);
    const [multipliers, setMultipliers] = useState<XPMultiplier[]>([]);
    const [levels, setLevels] = useState<LevelThreshold[]>([]);
    const [frozenPlayers, setFrozenPlayers] = useState<FrozenPlayer[]>([]);

    // Calculator
    const [calcAction, setCalcAction] = useState('raid_point');
    const [calcCategory, setCalcCategory] = useState('casual');
    const [calcCount, setCalcCount] = useState(1);

    // Recalculation
    const [recalculating, setRecalculating] = useState(false);
    const [recalcProgress, setRecalcProgress] = useState(0);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('rank-engine-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'xp_config' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'xp_multipliers' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'level_thresholds' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'frozen_players' }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchData = async () => {
        try {
            const [configRes, multipliersRes, levelsRes, frozenRes] = await Promise.all([
                supabase.from('xp_config').select('*').order('action_type'),
                supabase.from('xp_multipliers').select('*').order('multiplier'),
                supabase.from('level_thresholds').select('*').order('level'),
                supabase.from('frozen_players').select(`*, player:player_id(name)`).order('frozen_at', { ascending: false }),
            ]);

            if (configRes.data) setXpConfig(configRes.data);
            if (multipliersRes.data) setMultipliers((multipliersRes.data as unknown) as XPMultiplier[]);
            if (levelsRes.data) setLevels((levelsRes.data as unknown) as LevelThreshold[]);
            if (frozenRes.data) setFrozenPlayers((frozenRes.data as unknown) as FrozenPlayer[]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateXPValue = async (id: string, newValue: number) => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('xp_config')
                .update({ xp_value: newValue, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            toast({ title: 'XP Value Updated' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const updateMultiplier = async (id: string, newValue: number) => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('xp_multipliers')
                .update({ multiplier: newValue, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            toast({ title: 'Multiplier Updated' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const unfreezePlayer = async (id: string) => {
        try {
            const { error } = await supabase.from('frozen_players').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Player Unfrozen' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleMassRecalculation = async () => {
        if (!confirm('This will recalculate XP for all players. Continue?')) return;

        setRecalculating(true);
        setRecalcProgress(0);

        // Simulate recalculation
        const interval = setInterval(() => {
            setRecalcProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setRecalculating(false);
                    toast({ title: 'Recalculation Complete', description: 'All player XP has been recalculated' });
                    return 100;
                }
                return prev + 10;
            });
        }, 500);
    };

    const calculateXP = () => {
        const baseXP = xpConfig.find(c => c.action_type === calcAction)?.xp_value || 0;
        const mult = multipliers.find(m => m.category === calcCategory)?.multiplier || 1;
        return Math.floor(baseXP * mult * calcCount);
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'raid_point': return <Target className="w-4 h-4 text-amber-500" />;
            case 'tackle_point': return <Shield className="w-4 h-4 text-blue-500" />;
            case 'super_raid': case 'super_tackle': return <Zap className="w-4 h-4 text-purple-500" />;
            case 'match_win': return <Trophy className="w-4 h-4 text-green-500" />;
            default: return <Star className="w-4 h-4 text-slate-500" />;
        }
    };

    if (loading) {
        return <AdminLayout title="Rank Engine"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Rank Engine">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border mb-6">
                    <TabsTrigger value="config">XP Configuration</TabsTrigger>
                    <TabsTrigger value="levels">Level Thresholds</TabsTrigger>
                    <TabsTrigger value="preview">XP Calculator</TabsTrigger>
                    <TabsTrigger value="frozen">Frozen Players ({frozenPlayers.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="config">
                    <div className="grid grid-cols-2 gap-6">
                        {/* XP Per Action */}
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Award className="w-5 h-5" /> XP Per Action
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {xpConfig.filter(c => c.action_type !== 'daily_cap').map(config => (
                                        <div key={config.id} className="flex items-center gap-4">
                                            {getActionIcon(config.action_type)}
                                            <div className="flex-1">
                                                <Label className="capitalize">{config.action_type.replace(/_/g, ' ')}</Label>
                                            </div>
                                            <Input
                                                type="number"
                                                value={config.xp_value}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    setXpConfig(xpConfig.map(c => c.id === config.id ? { ...c, xp_value: val } : c));
                                                }}
                                                onBlur={() => updateXPValue(config.id, config.xp_value)}
                                                className="w-24 text-right"
                                            />
                                            <span className="text-sm text-slate-500">XP</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Category Multipliers */}
                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Zap className="w-5 h-5" /> Category Multipliers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {multipliers.map(mult => (
                                        <div key={mult.id} className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <Label className="capitalize">{mult.category}</Label>
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={mult.multiplier}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 1;
                                                    setMultipliers(multipliers.map(m => m.id === mult.id ? { ...m, multiplier: val } : m));
                                                }}
                                                onBlur={() => updateMultiplier(mult.id, mult.multiplier)}
                                                className="w-24 text-right"
                                            />
                                            <span className="text-sm text-slate-500">×</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-white border-none shadow-sm mt-6">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-slate-800">Mass Recalculation</p>
                                    <p className="text-sm text-slate-500">Recalculate XP for all players based on current configuration</p>
                                </div>
                                {recalculating ? (
                                    <div className="w-48">
                                        <Progress value={recalcProgress} className="mb-1" />
                                        <p className="text-xs text-center text-slate-500">{recalcProgress}%</p>
                                    </div>
                                ) : (
                                    <Button onClick={handleMassRecalculation} className="bg-[#1e3a5f]">
                                        <RefreshCw className="w-4 h-4 mr-2" /> Recalculate All
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="levels">
                    <Card className="bg-white border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Level Thresholds</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {levels.map((level, index) => (
                                    <div key={level.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl ${level.level === 1 ? 'bg-slate-200 text-slate-700' :
                                            level.level <= 3 ? 'bg-green-100 text-green-700' :
                                                level.level <= 5 ? 'bg-blue-100 text-blue-700' :
                                                    'bg-purple-100 text-purple-700'
                                            }`}>
                                            {level.level}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800">{level.name}</p>
                                            <p className="text-sm text-slate-500">Required: {level.min_xp.toLocaleString()} XP</p>
                                        </div>
                                        {index < levels.length - 1 && (
                                            <div className="text-right">
                                                <p className="text-sm text-slate-500">Next Level</p>
                                                <p className="font-medium">{(levels[index + 1]?.min_xp - level.min_xp).toLocaleString()} XP</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {levels.length === 0 && <p className="text-center text-slate-400 py-4">No level thresholds defined</p>}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preview">
                    <Card className="bg-white border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calculator className="w-5 h-5" /> XP Calculator
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div>
                                    <Label>Action</Label>
                                    <Select value={calcAction} onValueChange={setCalcAction}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {xpConfig.filter(c => c.action_type !== 'daily_cap').map(c => (
                                                <SelectItem key={c.action_type} value={c.action_type} className="capitalize">
                                                    {c.action_type.replace(/_/g, ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Category</Label>
                                    <Select value={calcCategory} onValueChange={setCalcCategory}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {multipliers.map(m => (
                                                <SelectItem key={m.category} value={m.category} className="capitalize">{m.category}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Count</Label>
                                    <Input type="number" value={calcCount} onChange={(e) => setCalcCount(parseInt(e.target.value) || 1)} />
                                </div>
                                <div>
                                    <Label>Result</Label>
                                    <div className="h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl font-bold text-green-700">{calculateXP()} XP</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm text-slate-600">
                                    <strong>Formula:</strong> Base XP ({xpConfig.find(c => c.action_type === calcAction)?.xp_value || 0}) ×
                                    Category Multiplier ({multipliers.find(m => m.category === calcCategory)?.multiplier || 1}×) ×
                                    Count ({calcCount}) = <strong className="text-green-600">{calculateXP()} XP</strong>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="frozen">
                    <Card className="bg-white border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Lock className="w-5 h-5" /> Frozen Players
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {frozenPlayers.map(fp => (
                                    <div key={fp.id} className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
                                        <Lock className="w-5 h-5 text-red-500" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800">{fp.player?.name || 'Unknown Player'}</p>
                                            <p className="text-sm text-slate-500">{fp.reason}</p>
                                        </div>
                                        <div className="text-right text-xs text-slate-500">
                                            Frozen: {new Date(fp.frozen_at).toLocaleDateString()}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => unfreezePlayer(fp.id)}>
                                            <Unlock className="w-4 h-4 mr-1" /> Unfreeze
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            {frozenPlayers.length === 0 && <p className="text-center text-slate-400 py-8">No frozen players</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AdminLayout>
    );
};

export default RankEngine;
