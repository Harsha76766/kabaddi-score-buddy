import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowRight, Loader2, Trophy, Users, Swords, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type SearchCategory = 'all' | 'matches' | 'teams' | 'tournaments' | 'players';

interface SearchResult {
    id: string;
    type: SearchCategory;
    name: string;
    subtitle?: string;
}

interface SearchSheetProps {
    trigger: React.ReactNode;
}

export const SearchSheet = ({ trigger }: SearchSheetProps) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<SearchCategory>('all');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const categories: { id: SearchCategory; label: string; icon: React.ReactNode }[] = [
        { id: 'all', label: 'All', icon: <Search className="w-3 h-3" /> },
        { id: 'matches', label: 'Matches', icon: <Swords className="w-3 h-3" /> },
        { id: 'teams', label: 'Teams', icon: <Users className="w-3 h-3" /> },
        { id: 'tournaments', label: 'Tournaments', icon: <Trophy className="w-3 h-3" /> },
        { id: 'players', label: 'Players', icon: <User className="w-3 h-3" /> },
    ];

    const handleSearch = async (searchQuery: string) => {
        setQuery(searchQuery);
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        const allResults: SearchResult[] = [];

        try {
            // Search Matches
            if (category === 'all' || category === 'matches') {
                const { data: matches } = await supabase
                    .from('matches')
                    .select('id, match_name, venue')
                    .ilike('match_name', `%${searchQuery}%`)
                    .limit(5);
                if (matches) {
                    allResults.push(...matches.map(m => ({
                        id: m.id,
                        type: 'matches' as SearchCategory,
                        name: m.match_name || 'Unnamed Match',
                        subtitle: m.venue || undefined
                    })));
                }
            }

            // Search Teams
            if (category === 'all' || category === 'teams') {
                const { data: teams } = await supabase
                    .from('teams')
                    .select('id, name, city')
                    .ilike('name', `%${searchQuery}%`)
                    .limit(5);
                if (teams) {
                    allResults.push(...teams.map(t => ({
                        id: t.id,
                        type: 'teams' as SearchCategory,
                        name: t.name,
                        subtitle: t.city || undefined
                    })));
                }
            }

            // Search Tournaments
            if (category === 'all' || category === 'tournaments') {
                const { data: tournaments } = await supabase
                    .from('tournaments')
                    .select('id, name, city')
                    .ilike('name', `%${searchQuery}%`)
                    .limit(5);
                if (tournaments) {
                    allResults.push(...tournaments.map(t => ({
                        id: t.id,
                        type: 'tournaments' as SearchCategory,
                        name: t.name,
                        subtitle: t.city || undefined
                    })));
                }
            }

            // Search Players
            if (category === 'all' || category === 'players') {
                console.log('[Search] Searching players for:', searchQuery);

                const { data: players, error: playerError } = await supabase
                    .from('players')
                    .select('*')
                    .ilike('name', `%${searchQuery}%`)
                    .limit(10);

                console.log('[Search] Players result:', players, 'Error:', playerError);

                if (playerError) {
                    console.error('[Search] Player search error:', playerError);
                }

                if (players && players.length > 0) {
                    allResults.push(...players.map(p => ({
                        id: p.id,
                        type: 'players' as SearchCategory,
                        name: p.name || 'Unknown Player',
                        subtitle: [p.position, p.jersey_number ? `#${p.jersey_number}` : null].filter(Boolean).join(' • ') || 'Player'
                    })));
                }
            }

            setResults(allResults);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = (result: SearchResult) => {
        setOpen(false);
        switch (result.type) {
            case 'matches':
                navigate(`/matches/${result.id}/spectate`);
                break;
            case 'teams':
                navigate(`/teams/${result.id}`);
                break;
            case 'tournaments':
                navigate(`/tournaments/${result.id}`);
                break;
            case 'players':
                navigate(`/players/${result.id}`);
                break;
        }
    };

    const getIcon = (type: SearchCategory) => {
        switch (type) {
            case 'matches': return <Swords className="w-4 h-4 text-orange-500" />;
            case 'teams': return <Users className="w-4 h-4 text-blue-500" />;
            case 'tournaments': return <Trophy className="w-4 h-4 text-yellow-500" />;
            case 'players': return <User className="w-4 h-4 text-green-500" />;
            default: return <Search className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[32px] p-0">
                <SheetHeader className="p-6 pb-4 border-b border-slate-100">
                    <SheetTitle className="text-left text-lg font-black uppercase tracking-tight">
                        Search RaidBook
                    </SheetTitle>
                    <div className="relative mt-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            placeholder="Search matches, teams, players..."
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-12 h-14 rounded-2xl bg-slate-50 border-0 text-sm font-bold placeholder:text-slate-400"
                            autoFocus
                        />
                    </div>
                    {/* Category Pills */}
                    <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setCategory(cat.id); handleSearch(query); }}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                    category === cat.id
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                )}
                            >
                                {cat.icon}
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </SheetHeader>

                <div className="p-6 space-y-3 overflow-y-auto max-h-[calc(85vh-220px)]">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        </div>
                    ) : results.length > 0 ? (
                        results.map(result => (
                            <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result)}
                                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-orange-500/30 hover:shadow-lg transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                                    {getIcon(result.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black uppercase tracking-tight text-slate-800 truncate">{result.name}</p>
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0",
                                            result.type === 'matches' && "bg-orange-100 text-orange-600",
                                            result.type === 'teams' && "bg-blue-100 text-blue-600",
                                            result.type === 'tournaments' && "bg-yellow-100 text-yellow-700",
                                            result.type === 'players' && "bg-green-100 text-green-600"
                                        )}>
                                            {result.type === 'matches' ? 'Match' :
                                                result.type === 'teams' ? 'Team' :
                                                    result.type === 'tournaments' ? 'Tournament' : 'Player'}
                                        </span>
                                    </div>
                                    {result.subtitle && (
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{result.subtitle}</p>
                                    )}
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                            </button>
                        ))
                    ) : query.length >= 2 ? (
                        <div className="text-center py-12">
                            <p className="text-sm font-black uppercase text-slate-400">No results found</p>
                            <p className="text-[10px] text-slate-400 mt-1">Try a different search term</p>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-sm font-black uppercase text-slate-400">Start typing to search</p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
