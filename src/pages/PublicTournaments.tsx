import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    Trophy,
    Zap,
    MapPin,
    Calendar,
    ChevronRight,
    Circle
} from "lucide-react";
import { format, isAfter, isBefore, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface Tournament {
    id: string;
    name: string;
    city: string;
    ground: string;
    start_date: string;
    end_date: string;
    category: string;
    logo_url: string | null;
    status: string;
    matches?: { status: string }[];
}

const PublicTournaments = () => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<{
        live: Tournament[];
        upcoming: Tournament[];
        completed: Tournament[];
    }>({ live: [], upcoming: [], completed: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("live");

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select(`*, matches(status)`)
                .order('start_date', { ascending: false });

            if (error) throw error;

            const now = new Date();
            const categorized = (data || []).reduce((acc: any, t: any) => {
                const startDate = new Date(t.start_date);
                const endDate = new Date(t.end_date);
                const hasLiveMatches = t.matches?.some((m: any) => m.status === 'live');
                const isCurrentlyRunning = (isBefore(startDate, now) || isSameDay(startDate, now)) &&
                    (isAfter(endDate, now) || isSameDay(endDate, now));

                if (hasLiveMatches || (t.status === 'Active' && isCurrentlyRunning)) {
                    acc.live.push(t);
                } else if (isAfter(startDate, now) && t.status !== 'Completed') {
                    acc.upcoming.push(t);
                } else if (isBefore(endDate, now) || t.status === 'Completed') {
                    acc.completed.push(t);
                }
                return acc;
            }, { live: [], upcoming: [], completed: [] });

            setTournaments(categorized);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderTournamentCard = (t: Tournament, isLive: boolean) => (
        <div
            key={t.id}
            onClick={() => navigate(`/tournaments/${t.id}`)}
            className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-500/30 hover:bg-slate-800/50 transition-all group"
        >
            {/* Logo / Header */}
            <div className="h-32 bg-gradient-to-br from-white/5 to-white/0 flex items-center justify-center relative">
                {t.logo_url ? (
                    <img src={t.logo_url} className="w-full h-full object-cover" alt={t.name} />
                ) : (
                    <Trophy className="w-12 h-12 text-slate-700" />
                )}
                <Badge className={cn(
                    "absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest border-0",
                    isLive ? "bg-red-600/80 text-white" : "bg-amber-600/80 text-white"
                )}>
                    {isLive ? (
                        <span className="flex items-center gap-1.5">
                            <Circle className="w-1.5 h-1.5 fill-current animate-pulse" />
                            Live
                        </span>
                    ) : 'Upcoming'}
                </Badge>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="text-base font-black uppercase tracking-tight truncate mb-3 group-hover:text-orange-500 transition-colors">
                    {t.name}
                </h3>
                <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-widest truncate">{t.city}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 mb-4">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">
                        {format(new Date(t.start_date), 'd MMM')} - {format(new Date(t.end_date), 'd MMM yyyy')}
                    </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest text-slate-400 border-slate-700">
                        {t.category || 'Open'}
                    </Badge>
                    <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest flex items-center gap-1 group-hover:underline">
                        View <ChevronRight className="w-3 h-3" />
                    </span>
                </div>
            </div>
        </div>
    );

    const renderEmptyState = (message: string) => (
        <div className="bg-white/5 rounded-3xl p-16 text-center border border-white/5 col-span-full">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-6" />
            <h2 className="text-xl font-black uppercase tracking-tight mb-2">{message}</h2>
            <p className="text-slate-500 text-sm">Check back later!</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-orange-500" />
                            <span className="text-lg font-black uppercase tracking-tight">Tournaments</span>
                        </div>
                    </div>
                    <Button
                        onClick={() => navigate('/auth')}
                        variant="ghost"
                        className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white"
                    >
                        Login
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex w-full max-w-md mx-auto bg-white/5 p-1.5 rounded-2xl h-14 border border-white/10 mb-8">
                        <TabsTrigger value="live" className="flex-1 rounded-xl text-[11px] font-black uppercase tracking-tight data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all border-0 ring-0">
                            <Circle className="w-2 h-2 fill-current mr-2 animate-pulse" />
                            Live
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="flex-1 rounded-xl text-[11px] font-black uppercase tracking-tight data-[state=active]:bg-amber-600 data-[state=active]:text-white transition-all border-0 ring-0">
                            Upcoming
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="flex-1 rounded-xl text-[11px] font-black uppercase tracking-tight data-[state=active]:bg-slate-700 data-[state=active]:text-white transition-all border-0 ring-0">
                            Past
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="live" className="mt-0">
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white/5 rounded-2xl p-6 animate-pulse h-64" />
                                ))}
                            </div>
                        ) : tournaments.live.length === 0 ? (
                            renderEmptyState("No Live Tournaments")
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tournaments.live.map(t => renderTournamentCard(t, true))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="upcoming" className="mt-0">
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white/5 rounded-2xl p-6 animate-pulse h-64" />
                                ))}
                            </div>
                        ) : tournaments.upcoming.length === 0 ? (
                            renderEmptyState("No Upcoming Tournaments")
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tournaments.upcoming.map(t => renderTournamentCard(t, false))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="mt-0">
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white/5 rounded-2xl p-6 animate-pulse h-64" />
                                ))}
                            </div>
                        ) : tournaments.completed.length === 0 ? (
                            renderEmptyState("No Completed Tournaments")
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tournaments.completed.map(t => renderTournamentCard(t, false))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Footer */}
            <footer className="py-8 border-t border-white/5 text-center mt-auto">
                <div className="flex items-center justify-center gap-2 opacity-50">
                    <Zap className="w-4 h-4" />
                    <span className="font-black uppercase tracking-widest text-xs">RaidBook</span>
                </div>
            </footer>
        </div>
    );
};

export default PublicTournaments;
