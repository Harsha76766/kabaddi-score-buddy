
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Trophy, User, Phone } from "lucide-react";

interface EditTournamentDialogProps {
    tournament: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const EditTournamentDialog = ({ tournament, open, onOpenChange, onSuccess }: EditTournamentDialogProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        city: "",
        ground: "",
        start_date: "",
        end_date: "",
        organizer_name: "",
        organizer_phone: "",
        category: "",
        tournament_type: "",
    });

    useEffect(() => {
        if (tournament) {
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
                    updated_at: new Date().toISOString(),
                })
                .eq('id', tournament.id);

            if (error) throw error;

            toast({
                title: "Tournament Updated",
                description: "Tournament details have been successfully updated.",
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
            <DialogContent className="sm:max-w-[500px] rounded-[32px] border-2 border-slate-100 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-slate-900 flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-orange-600" />
                        Edit Tournament
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament name</Label>
                            <div className="relative">
                                <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter tournament name"
                                    className="pl-12 rounded-2xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-orange-500/20"
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
                                        placeholder="City"
                                        className="pl-12 rounded-2xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-orange-500/20"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ground</Label>
                                <Input
                                    value={formData.ground}
                                    onChange={(e) => setFormData({ ...formData, ground: e.target.value })}
                                    placeholder="Ground name"
                                    className="rounded-2xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-orange-500/20"
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
                                    className="rounded-2xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-orange-500/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</Label>
                                <Input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="rounded-2xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-orange-500/20"
                                    required
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
                                    placeholder="Enter organizer name"
                                    className="pl-12 rounded-2xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-orange-500/20"
                                    required
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
                                    placeholder="Enter phone number"
                                    className="pl-12 rounded-2xl bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-orange-500/20"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
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
