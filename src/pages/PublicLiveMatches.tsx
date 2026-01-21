import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Trophy,
    Swords,
    Activity,
    Circle,
    Shield,
    Zap,
    MapPin,
    Calendar
} from "lucide-react";
import { format } from "date-fns";

interface LiveMatch {
    id: string;
    match_name: string;
    status: string;
    team_a_score: number;
    team_b_score: number;
    team_a: { name: string; logo_url?: string } | null;
    team_b: { name: string; logo_url?: string } | null;
    tournaments: { name: string } | null;
    match_date: string;
    venue: string | null;
}

const PublicLiveMatches = () => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<LiveMatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLiveMatches();
        // Set up realtime subscription
        const channel = supabase
            .channel('public_live_matches')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchLiveMatches();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchLiveMatches = async () => {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select(`
                    id, match_name, status, team_a_score, team_b_score, match_date, venue,
                    team_a:teams!matches_team_a_id_fkey(name, logo_url),
                    team_b:teams!matches_team_b_id_fkey(name, logo_url),
                    tournaments(name)
                `)
                .eq('status', 'live')
                .order('match_date', { ascending: false });

            if (error) throw error;
            setMatches(data || []);
        } catch (error) {
            console.error('Error fetching live matches:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-red-500 animate-pulse" />
                            <span className="text-lg font-black uppercase tracking-tight">Live Matches</span>
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
            <div className="max-w-4xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white/5 rounded-2xl p-6 animate-pulse h-40" />
                        ))}
                    </div>
                ) : matches.length === 0 ? (
                    <div className="bg-white/5 rounded-3xl p-16 text-center border border-white/5">
                        <Swords className="w-16 h-16 text-slate-600 mx-auto mb-6" />
                        <h2 className="text-xl font-black uppercase tracking-tight mb-2">No Live Matches</h2>
                        <p className="text-slate-500 text-sm mb-8">Check back later for live action!</p>
                        <Button
                            onClick={() => navigate('/')}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-xl"
                        >
                            Back to Home
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {matches.map(match => (
                            <div
                                key={match.id}
                                onClick={() => navigate(`/matches/${match.id}/spectate`)}
                                className="bg-slate-900 border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-orange-500/30 hover:bg-slate-800/50 transition-all group"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                                        <Badge className="bg-red-600/20 text-red-400 border-0 text-[9px] font-black uppercase tracking-widest">Live</Badge>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[200px]">
                                        {match.tournaments?.name || 'Friendly Match'}
                                    </span>
                                </div>

                                {/* Score */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                            {match.team_a?.logo_url ?
                                                <img src={match.team_a.logo_url} className="w-full h-full object-cover rounded-2xl" /> :
                                                <Trophy className="w-6 h-6 text-slate-500" />
                                            }
                                        </div>
                                        <span className="text-sm font-black uppercase truncate">{match.team_a?.name || 'Team A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-6">
                                        <span className="text-3xl font-black text-orange-500">{match.team_a_score}</span>
                                        <span className="text-slate-500 text-xl">-</span>
                                        <span className="text-3xl font-black text-orange-500">{match.team_b_score}</span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-1 min-w-0 justify-end">
                                        <span className="text-sm font-black uppercase truncate text-right">{match.team_b?.name || 'Team B'}</span>
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                            {match.team_b?.logo_url ?
                                                <img src={match.team_b.logo_url} className="w-full h-full object-cover rounded-2xl" /> :
                                                <Shield className="w-6 h-6 text-slate-500" />
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-4 text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{match.venue || 'Venue TBD'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                                {format(new Date(match.match_date), 'h:mm a')}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest group-hover:underline">
                                        Watch Live →
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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

export default PublicLiveMatches;
