import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Post, PostCard } from "./PostCard";
import { Loader2, Activity, Swords, Trophy, Users, MapPin, Clock, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Sample posts data
const dummyPosts: Post[] = [
    {
        id: "promo-1",
        type: "live_promo",
        content: "Team A vs Team B is LIVE",
        match_id: "dummy-match",
        match_data: {
            team_a_name: "Puneri Paltan",
            team_b_name: "Dabang Delhi"
        },
        created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        user_id: "system",
        profiles: { name: "RaidBook Live", avatar_url: undefined },
        likes_count: 850,
        has_liked: false
    },
    {
        id: "clip-1",
        type: "clip",
        content: "Unbelievable escape by the raider! 🚀 #KabaddiHighlights",
        video_url: "https://v1.cdnpk.net/videvo_files/video/free/2013-08/small_watermarked/hd0544_preview.mp4",
        image_url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=800&fit=crop",
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        user_id: "dummy-1",
        profiles: { name: "Kabaddi King", avatar_url: undefined },
        likes_count: 1240,
        has_liked: true
    },
    {
        id: "result-1",
        type: "match_result",
        content: "Final score from the Championship Match!",
        match_id: "dummy-result",
        match_data: {
            team_a_name: "Bengal Warriors",
            team_b_name: "U Mumba",
            team_a_score: 42,
            team_b_score: 38,
            mvp_name: "Maninder Singh"
        },
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        user_id: "dummy-2",
        profiles: { name: "Match Updates", avatar_url: undefined },
        likes_count: 560,
        has_liked: false
    },
    {
        id: "tourney-1",
        type: "tournament",
        content: "Register now for the Summer Kabaddi League!",
        tournament_id: "dummy-tourney",
        tournament_data: {
            name: "Mumbai Summer Kabaddi League",
            location: "Dharavi Stadium",
            prize_pool: "₹1,00,000"
        },
        image_url: "https://images.unsplash.com/photo-1526676037777-05a232554f77?w=800&h=450&fit=crop",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        user_id: "dummy-3",
        profiles: { name: "Tournament Board", avatar_url: undefined },
        likes_count: 2100,
        has_liked: false
    }
];

interface InterleavedFeedProps {
    liveMatches: any[];
    upcomingMatches: any[];
    nearbyTournaments: any[];
    userTeams: any[];
    activities: any[];
}

export const InterleavedFeed = ({
    liveMatches,
    upcomingMatches,
    nearbyTournaments,
    userTeams,
    activities
}: InterleavedFeedProps) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchPosts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await (supabase as any)
                .from('posts')
                .select(`*, profiles:user_id (name, avatar_url), likes:post_likes (user_id)`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedPosts: Post[] = data.map((post: any) => ({
                    ...post,
                    likes_count: post.likes?.length || 0,
                    has_liked: user ? post.likes?.some((like: any) => like.user_id === user.id) : false
                }));
                setPosts([...formattedPosts, ...dummyPosts]);
            } else {
                setPosts(dummyPosts);
            }
        } catch (error) {
            console.error("Error fetching posts:", error);
            setPosts(dummyPosts);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();

        // Real-time subscription
        const postsChannel = supabase
            .channel('interleaved_posts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                fetchPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(postsChannel);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    // Build interleaved feed items
    const feedItems: { type: string; data: any; index: number }[] = [];
    let postIndex = 0;

    // Add first 2 posts
    if (posts[postIndex]) feedItems.push({ type: 'post', data: posts[postIndex++], index: postIndex });
    if (posts[postIndex]) feedItems.push({ type: 'post', data: posts[postIndex++], index: postIndex });

    // Always add Live & Upcoming Matches section
    feedItems.push({ type: 'matches', data: { liveMatches, upcomingMatches }, index: 0 });

    // Add more posts
    if (posts[postIndex]) feedItems.push({ type: 'post', data: posts[postIndex++], index: postIndex });
    if (posts[postIndex]) feedItems.push({ type: 'post', data: posts[postIndex++], index: postIndex });

    // Always add Tournaments section
    feedItems.push({ type: 'tournaments', data: nearbyTournaments, index: 0 });

    // Add more posts
    if (posts[postIndex]) feedItems.push({ type: 'post', data: posts[postIndex++], index: postIndex });

    // Always add My Teams section
    feedItems.push({ type: 'teams', data: userTeams, index: 0 });

    // Add remaining posts
    while (postIndex < posts.length) {
        feedItems.push({ type: 'post', data: posts[postIndex++], index: postIndex });
    }

    // Always add Smart Activity at the end
    feedItems.push({ type: 'activity', data: activities, index: 0 });

    const renderMatchesSection = (data: { liveMatches: any[]; upcomingMatches: any[] }) => (
        <section className="space-y-4 py-4 bg-slate-50 -mx-4 px-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-3">
                    <div className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </div>
                    Live & Upcoming
                </h3>
                <button className="text-[10px] font-black uppercase tracking-widest text-orange-600" onClick={() => navigate('/matches')}>View All</button>
            </div>
            {(data.liveMatches.length === 0 && data.upcomingMatches.length === 0) ? (
                <div className="bg-white rounded-[24px] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center gap-3">
                    <Swords className="w-10 h-10 text-slate-200" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active matches</p>
                    <button onClick={() => navigate('/matches/create')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b-2 border-orange-600 pb-0.5">Start one now</button>
                </div>
            ) : (
                <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2 snap-x">
                    {data.liveMatches.map((m) => (
                        <div key={m.id} className="shrink-0 w-[260px] snap-center bg-white rounded-[24px] border border-slate-100 p-4 shadow-sm cursor-pointer" onClick={() => navigate(`/matches/${m.id}/spectate`)}>
                            <div className="flex items-center justify-between mb-3">
                                <Badge className="bg-red-50 text-red-600 border-0 text-[9px] font-black uppercase">Live</Badge>
                                <Activity className="w-3 h-3 text-slate-300" />
                            </div>
                            <div className="flex items-center justify-between text-sm font-black">
                                <span className="truncate max-w-[80px]">{m.team_a?.name || "Team A"}</span>
                                <span className="text-orange-600">{m.team_a_score} - {m.team_b_score}</span>
                                <span className="truncate max-w-[80px]">{m.team_b?.name || "Team B"}</span>
                            </div>
                        </div>
                    ))}
                    {data.upcomingMatches.slice(0, 3).map((m) => (
                        <div key={m.id} className="shrink-0 w-[200px] snap-center bg-slate-100 rounded-[24px] p-4">
                            <Badge className="bg-blue-50 text-blue-600 border-0 text-[9px] font-bold uppercase mb-2">
                                {new Date(m.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Badge>
                            <div className="text-[10px] font-black uppercase text-center">
                                {m.team_a?.name || "TBD"} vs {m.team_b?.name || "TBD"}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );

    const renderTournamentsSection = (tournaments: any[]) => (
        <section className="space-y-4 py-4 bg-slate-50 -mx-4 px-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
                    <Trophy className="w-3 h-3" /> Tournaments
                </h3>
                <button className="text-[10px] font-black uppercase tracking-widest text-orange-600" onClick={() => navigate('/tournaments')}>View All</button>
            </div>
            {tournaments.length === 0 ? (
                <div className="bg-white rounded-[24px] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center gap-3">
                    <Trophy className="w-10 h-10 text-slate-200" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No tournaments nearby</p>
                    <button onClick={() => navigate('/tournaments')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b-2 border-orange-600 pb-0.5">Explore</button>
                </div>
            ) : (
                <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2 snap-x">
                    {tournaments.slice(0, 3).map((t) => (
                        <div key={t.id} className="shrink-0 w-[220px] snap-center bg-white rounded-[24px] border border-slate-100 overflow-hidden cursor-pointer" onClick={() => navigate(`/tournaments/${t.id}`)}>
                            <div className="h-20 bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                                <Trophy className="w-8 h-8 text-white/30" />
                            </div>
                            <div className="p-4">
                                <h4 className="text-xs font-black uppercase truncate">{t.name}</h4>
                                <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                                    <MapPin className="w-2 h-2" /> {t.city || t.ground || "TBD"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );

    const renderTeamsSection = (teams: any[]) => (
        <section className="space-y-4 py-4 bg-slate-50 -mx-4 px-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">My Teams</h3>
                <button className="text-[10px] font-black uppercase tracking-widest text-orange-600" onClick={() => navigate('/teams')}>Manage</button>
            </div>
            {teams.length === 0 ? (
                <div className="bg-white rounded-[24px] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center gap-3">
                    <Users className="w-10 h-10 text-slate-200" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No teams joined yet</p>
                    <button onClick={() => navigate('/teams')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b-2 border-orange-600 pb-0.5">Find a Team</button>
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    {teams.slice(0, 3).map((team) => (
                        <div key={team.id} className="shrink-0 w-[140px] bg-white rounded-[24px] p-4 border border-slate-100 text-center cursor-pointer" onClick={() => navigate(`/teams/${team.id}`)}>
                            <div className="w-12 h-12 rounded-xl bg-slate-50 mx-auto mb-2 flex items-center justify-center">
                                {team.logo_url ? <img src={team.logo_url} className="w-8 h-8 rounded-lg" /> : <Users className="w-6 h-6 text-slate-300" />}
                            </div>
                            <h4 className="text-[10px] font-black uppercase truncate">{team.name}</h4>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );

    const renderActivitySection = (activityList: any[]) => (
        <section className="space-y-4 py-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Recent Activity</h3>
            <div className="space-y-3">
                {activityList.slice(0, 3).map((act) => (
                    <div key={act.id} className={cn("bg-white rounded-[20px] p-4 border border-slate-100 flex items-start gap-3", act.type === 'ACHIEVEMENT' && "bg-orange-50/50 border-orange-100")}>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", act.type === 'ACHIEVEMENT' ? "bg-orange-500" : "bg-slate-100")}>
                            {act.type === 'ACHIEVEMENT' ? <Star className="w-4 h-4 text-white fill-current" /> : act.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase text-slate-600 truncate">{act.title}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{act.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );

    return (
        <div className="space-y-4">
            {feedItems.map((item, idx) => (
                <div key={`${item.type}-${idx}`}>
                    {item.type === 'post' && <PostCard post={item.data} />}
                    {item.type === 'matches' && renderMatchesSection(item.data)}
                    {item.type === 'tournaments' && renderTournamentsSection(item.data)}
                    {item.type === 'teams' && renderTeamsSection(item.data)}
                    {item.type === 'activity' && renderActivitySection(item.data)}
                </div>
            ))}

            {/* End of Feed */}
            <div className="py-16 px-6 text-center space-y-4">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <Activity className="w-6 h-6 text-slate-300" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-slate-900 font-black uppercase tracking-tight text-sm">You're all caught up!</h4>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Follow more teams for updates</p>
                </div>
            </div>
        </div>
    );
};
