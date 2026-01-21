
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Trophy, User, Phone, Settings, Users2, Swords } from "lucide-react";

interface EditTournamentDialogProps {
    tournament: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const EditTournamentDialog = ({ tournament, open, onOpenChange, onSuccess }: EditTournamentDialogProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("details");
    const [formData, setFormData] = useState({
        // Basic Details
        name: "",
        city: "",
        ground: "",
        start_date: "",
        end_date: "",
        organizer_name: "",
        organizer_phone: "",
        category: "",
        tournament_type: "",

        // Team Configuration
        max_teams: "16",
        min_teams: "4",
        players_per_team: "12",
        on_court_players: "7",
        substitutes: "5",
        foreign_players_allowed: false,
        max_foreign_players: "0",

        // Match Rules
        match_duration: "40",
        halves: "2",
        half_duration: "20",
        break_duration: "5",
        raid_timer: "30",
        timeouts_per_half: "2",
        timeout_duration: "30",
        all_out_points: "2",

        // Points System
        points_win: "2",
        points_tie: "1",
        points_loss: "0",

        // Advanced Rules
        bonus_line_enabled: true,
        super_tackle_enabled: true,
        do_or_die_raid: true,
        golden_raid: false,
        review_system: false,
        video_referee: false,

        // Officials
        tournament_admin: "",
        referees: "",
        scorers: "",
        timekeepers: "",
    });

    useEffect(() => {
        if (tournament) {
            const settings = tournament.settings || {};
            const teamConfig = settings.team_config || {};
            const officials = settings.officials || {};
            const matchFormat = tournament.match_format || {};
            const rulesJson = tournament.rules_json || {};
            const advancedRules = rulesJson.advanced_rules || {};
            const pointsSystem = rulesJson.points_system || {};

            setFormData({
                name: tournament.name || "",
                city: tournament.city || "",
                ground: tournament.ground || "",
                start_date: tournament.start_date || "",
                end_date: tournament.end_date || "",
                organizer_name: tournament.organizer_name || "",
                organizer_phone: tournament.organizer_phone || "",
                category: tournament.category || "",
                tournament_type: tournament.tournament_type || "",

                max_teams: String(teamConfig.max_teams || 16),
                min_teams: String(teamConfig.min_teams || 4),
                players_per_team: String(teamConfig.players_per_team || 12),
                on_court_players: String(teamConfig.on_court_players || 7),
                substitutes: String(teamConfig.substitutes || 5),
                foreign_players_allowed: teamConfig.foreign_players_allowed || false,
                max_foreign_players: String(teamConfig.max_foreign_players || 0),

                match_duration: String(matchFormat.match_duration || 40),
                halves: String(matchFormat.halves || 2),
                half_duration: String(matchFormat.half_duration || 20),
                break_duration: String(matchFormat.break_duration || 5),
                raid_timer: String(matchFormat.raid_timer || 30),
                timeouts_per_half: String(rulesJson.timeouts_per_half || 2),
                timeout_duration: String(matchFormat.timeout_duration || 30),
                all_out_points: String(matchFormat.all_out_points || 2),

                points_win: String(pointsSystem.win || 2),
                points_tie: String(pointsSystem.tie || 1),
                points_loss: String(pointsSystem.loss || 0),

                bonus_line_enabled: advancedRules.bonus_line_enabled ?? true,
                super_tackle_enabled: advancedRules.super_tackle_enabled ?? true,
                do_or_die_raid: advancedRules.do_or_die_raid ?? true,
                golden_raid: advancedRules.golden_raid ?? false,
                review_system: advancedRules.review_system ?? false,
                video_referee: advancedRules.video_referee ?? false,

                tournament_admin: officials.tournament_admin || "",
                referees: Array.isArray(officials.referees) ? officials.referees.join(", ") : "",
                scorers: Array.isArray(officials.scorers) ? officials.scorers.join(", ") : "",
                timekeepers: Array.isArray(officials.timekeepers) ? officials.timekeepers.join(", ") : "",
            });
        }
    }, [tournament]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('tournaments')
                .update({
                    name: formData.name,
                    city: formData.city,
                    ground: formData.ground,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    organizer_name: formData.organizer_name,
                    organizer_phone: formData.organizer_phone,
                    category: formData.category,
                    tournament_type: formData.tournament_type,
                    match_format: {
                        match_duration: parseInt(formData.match_duration),
                        halves: parseInt(formData.halves),
                        half_duration: parseInt(formData.half_duration),
                        break_duration: parseInt(formData.break_duration),
                        raid_timer: parseInt(formData.raid_timer),
                        timeout_duration: parseInt(formData.timeout_duration),
                        all_out_points: parseInt(formData.all_out_points),
                    },
                    settings: {
                        team_config: {
                            max_teams: parseInt(formData.max_teams),
                            min_teams: parseInt(formData.min_teams),
                            players_per_team: parseInt(formData.players_per_team),
                            on_court_players: parseInt(formData.on_court_players),
                            substitutes: parseInt(formData.substitutes),
                            foreign_players_allowed: formData.foreign_players_allowed,
                            max_foreign_players: parseInt(formData.max_foreign_players),
                        },
                        officials: {
                            tournament_admin: formData.tournament_admin || null,
                            referees: formData.referees ? formData.referees.split(',').map(s => s.trim()).filter(Boolean) : [],
                            scorers: formData.scorers ? formData.scorers.split(',').map(s => s.trim()).filter(Boolean) : [],
                            timekeepers: formData.timekeepers ? formData.timekeepers.split(',').map(s => s.trim()).filter(Boolean) : [],
                        },
                    },
                    rules_json: {
                        points_system: {
                            win: parseInt(formData.points_win),
                            tie: parseInt(formData.points_tie),
                            loss: parseInt(formData.points_loss),
                        },
                        timeouts_per_half: parseInt(formData.timeouts_per_half),
                        advanced_rules: {
                            bonus_line_enabled: formData.bonus_line_enabled,
                            super_tackle_enabled: formData.super_tackle_enabled,
                            do_or_die_raid: formData.do_or_die_raid,
                            golden_raid: formData.golden_raid,
                            review_system: formData.review_system,
                            video_referee: formData.video_referee,
                        }
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', tournament.id);

            if (error) throw error;

            toast({
                title: "Tournament Updated",
                description: "All tournament settings have been successfully updated.",
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to update tournament",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] rounded-[32px] border-2 border-slate-100 p-0 shadow-2xl overflow-hidden max-h-[90vh]">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-slate-900 flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-orange-600" />
                        Edit Tournament Settings
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="px-6">
                            <TabsList className="grid grid-cols-4 bg-slate-100 rounded-xl p-1 h-auto">
                                <TabsTrigger value="details" className="text-[9px] font-black uppercase py-2 data-[state=active]:bg-white rounded-lg">Details</TabsTrigger>
                                <TabsTrigger value="team" className="text-[9px] font-black uppercase py-2 data-[state=active]:bg-white rounded-lg">Team</TabsTrigger>
                                <TabsTrigger value="rules" className="text-[9px] font-black uppercase py-2 data-[state=active]:bg-white rounded-lg">Rules</TabsTrigger>
                                <TabsTrigger value="officials" className="text-[9px] font-black uppercase py-2 data-[state=active]:bg-white rounded-lg">Officials</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[50vh]">
                            {/* DETAILS TAB */}
                            <TabsContent value="details" className="mt-0 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament name</Label>
                                    <div className="relative">
                                        <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="pl-12 rounded-2xl bg-slate-50 border-0"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="pl-12 rounded-2xl bg-slate-50 border-0"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ground</Label>
                                        <Input
                                            value={formData.ground}
                                            onChange={(e) => setFormData({ ...formData, ground: e.target.value })}
                                            className="rounded-2xl bg-slate-50 border-0"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            className="rounded-2xl bg-slate-50 border-0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                            className="rounded-2xl bg-slate-50 border-0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organizer Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            value={formData.organizer_name}
                                            onChange={(e) => setFormData({ ...formData, organizer_name: e.target.value })}
                                            className="pl-12 rounded-2xl bg-slate-50 border-0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            value={formData.organizer_phone}
                                            onChange={(e) => setFormData({ ...formData, organizer_phone: e.target.value })}
                                            className="pl-12 rounded-2xl bg-slate-50 border-0"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TEAM CONFIG TAB */}
                            <TabsContent value="team" className="mt-0 space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users2 className="w-5 h-5 text-orange-600" />
                                    <span className="text-sm font-black uppercase text-slate-600">Team Configuration</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Teams</Label>
                                        <Input
                                            type="number"
                                            value={formData.max_teams}
                                            onChange={(e) => setFormData({ ...formData, max_teams: e.target.value })}
                                            className="rounded-2xl bg-slate-50 border-0 text-center font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Min Teams</Label>
                                        <Input
                                            type="number"
                                            value={formData.min_teams}
                                            onChange={(e) => setFormData({ ...formData, min_teams: e.target.value })}
                                            className="rounded-2xl bg-slate-50 border-0 text-center font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 bg-blue-50 rounded-2xl text-center">
                                        <Label className="text-[8px] font-black uppercase text-blue-600 block mb-2">Squad Size</Label>
                                        <Input
                                            type="number"
                                            value={formData.players_per_team}
                                            onChange={(e) => setFormData({ ...formData, players_per_team: e.target.value })}
                                            className="border-0 bg-transparent text-center text-xl font-black h-auto p-0"
                                        />
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-2xl text-center">
                                        <Label className="text-[8px] font-black uppercase text-green-600 block mb-2">On-Court</Label>
                                        <Input
                                            type="number"
                                            value={formData.on_court_players}
                                            onChange={(e) => setFormData({ ...formData, on_court_players: e.target.value })}
                                            className="border-0 bg-transparent text-center text-xl font-black h-auto p-0"
                                        />
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-2xl text-center">
                                        <Label className="text-[8px] font-black uppercase text-purple-600 block mb-2">Substitutes</Label>
                                        <Input
                                            type="number"
                                            value={formData.substitutes}
                                            onChange={(e) => setFormData({ ...formData, substitutes: e.target.value })}
                                            className="border-0 bg-transparent text-center text-xl font-black h-auto p-0"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                                    <div>
                                        <Label className="text-xs font-black text-slate-700">Foreign Players</Label>
                                        <p className="text-[10px] text-slate-400">For international events</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {formData.foreign_players_allowed && (
                                            <Input
                                                type="number"
                                                value={formData.max_foreign_players}
                                                onChange={(e) => setFormData({ ...formData, max_foreign_players: e.target.value })}
                                                className="w-14 h-8 rounded-xl border text-center text-sm font-bold"
                                            />
                                        )}
                                        <Switch
                                            checked={formData.foreign_players_allowed}
                                            onCheckedChange={(val) => setFormData({ ...formData, foreign_players_allowed: val })}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* RULES TAB */}
                            <TabsContent value="rules" className="mt-0 space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="w-5 h-5 text-red-600" />
                                    <span className="text-sm font-black uppercase text-slate-600">Match Rules</span>
                                </div>

                                {/* Duration Settings */}
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="p-2 bg-slate-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-slate-400 block mb-1">Match</Label>
                                        <Input type="number" value={formData.match_duration} onChange={(e) => setFormData({ ...formData, match_duration: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-slate-400 block mb-1">Halves</Label>
                                        <Input type="number" value={formData.halves} onChange={(e) => setFormData({ ...formData, halves: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-slate-400 block mb-1">Half</Label>
                                        <Input type="number" value={formData.half_duration} onChange={(e) => setFormData({ ...formData, half_duration: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-slate-400 block mb-1">Break</Label>
                                        <Input type="number" value={formData.break_duration} onChange={(e) => setFormData({ ...formData, break_duration: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                </div>

                                {/* Timer Settings */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="p-2 bg-orange-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-orange-600 block mb-1">Raid Timer</Label>
                                        <Input type="number" value={formData.raid_timer} onChange={(e) => setFormData({ ...formData, raid_timer: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                    <div className="p-2 bg-blue-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-blue-600 block mb-1">Timeouts/Half</Label>
                                        <Input type="number" value={formData.timeouts_per_half} onChange={(e) => setFormData({ ...formData, timeouts_per_half: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                    <div className="p-2 bg-red-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-red-600 block mb-1">All-Out Pts</Label>
                                        <Input type="number" value={formData.all_out_points} onChange={(e) => setFormData({ ...formData, all_out_points: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                </div>

                                {/* Points System */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="p-2 bg-green-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-green-600 block mb-1">Win Pts</Label>
                                        <Input type="number" value={formData.points_win} onChange={(e) => setFormData({ ...formData, points_win: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                    <div className="p-2 bg-amber-50 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-amber-600 block mb-1">Tie Pts</Label>
                                        <Input type="number" value={formData.points_tie} onChange={(e) => setFormData({ ...formData, points_tie: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                    <div className="p-2 bg-slate-100 rounded-xl text-center">
                                        <Label className="text-[7px] font-black uppercase text-slate-500 block mb-1">Loss Pts</Label>
                                        <Input type="number" value={formData.points_loss} onChange={(e) => setFormData({ ...formData, points_loss: e.target.value })} className="border-0 bg-transparent text-center font-black h-auto p-0" />
                                    </div>
                                </div>

                                {/* Advanced Rules */}
                                <div className="flex items-center gap-2 mt-4 mb-2">
                                    <Swords className="w-4 h-4 text-purple-600" />
                                    <span className="text-xs font-black uppercase text-slate-500">Advanced Rules</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'bonus_line_enabled', label: 'Bonus Line', color: 'green' },
                                        { key: 'super_tackle_enabled', label: 'Super Tackle', color: 'blue' },
                                        { key: 'do_or_die_raid', label: 'Do-or-Die', color: 'orange' },
                                        { key: 'golden_raid', label: 'Golden Raid', color: 'amber' },
                                        { key: 'review_system', label: 'Review', color: 'purple' },
                                        { key: 'video_referee', label: 'VAR', color: 'slate' },
                                    ].map(rule => (
                                        <div key={rule.key} className={`flex items-center justify-between p-2 rounded-xl bg-${rule.color}-50`}>
                                            <Label className={`text-[9px] font-black uppercase text-${rule.color}-600`}>{rule.label}</Label>
                                            <Switch
                                                checked={(formData as any)[rule.key]}
                                                onCheckedChange={(val) => setFormData({ ...formData, [rule.key]: val })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* OFFICIALS TAB */}
                            <TabsContent value="officials" className="mt-0 space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users2 className="w-5 h-5 text-indigo-600" />
                                    <span className="text-sm font-black uppercase text-slate-600">Officials & Roles</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Admin</Label>
                                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50">
                                            <Settings className="w-4 h-4 text-indigo-600" />
                                            <Input
                                                placeholder="admin@email.com"
                                                value={formData.tournament_admin}
                                                onChange={(e) => setFormData({ ...formData, tournament_admin: e.target.value })}
                                                className="flex-1 border-0 bg-transparent text-sm font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referees (comma-separated)</Label>
                                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-green-50">
                                            <Swords className="w-4 h-4 text-green-600" />
                                            <Input
                                                placeholder="ref1@email.com, ref2@email.com"
                                                value={formData.referees}
                                                onChange={(e) => setFormData({ ...formData, referees: e.target.value })}
                                                className="flex-1 border-0 bg-transparent text-sm font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scorers (comma-separated)</Label>
                                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-orange-50">
                                            <Trophy className="w-4 h-4 text-orange-600" />
                                            <Input
                                                placeholder="scorer1@email.com, scorer2@email.com"
                                                value={formData.scorers}
                                                onChange={(e) => setFormData({ ...formData, scorers: e.target.value })}
                                                className="flex-1 border-0 bg-transparent text-sm font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timekeepers (comma-separated)</Label>
                                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-purple-50">
                                            <Calendar className="w-4 h-4 text-purple-600" />
                                            <Input
                                                placeholder="tk1@email.com, tk2@email.com"
                                                value={formData.timekeepers}
                                                onChange={(e) => setFormData({ ...formData, timekeepers: e.target.value })}
                                                className="flex-1 border-0 bg-transparent text-sm font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    <div className="flex gap-4 p-6 pt-0 border-t border-slate-100 mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 rounded-2xl border-2 border-slate-100 font-black uppercase tracking-widest text-xs h-12"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-2xl bg-slate-900 border-0 font-black uppercase tracking-widest text-xs h-12 hover:bg-orange-600 transition-all text-white"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
