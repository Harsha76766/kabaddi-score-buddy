import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Post, PostCard } from "./PostCard";
import { Loader2, Activity } from "lucide-react";

// Rich dummy data to showcase the new Engagement Engine
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
        video_url: "https://v1.cdnpk.net/videvo_files/video/free/2013-08/small_watermarked/hd0544_preview.mp4", // Sample video
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

export const Feed = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'latest' | 'nearby'>('latest');

    const fetchPosts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Fetch from posts table with expanded fields
            const { data, error } = await (supabase as any)
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (name, avatar_url),
                    likes:post_likes (user_id)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedPosts: Post[] = data.map((post: any) => ({
                    ...post,
                    likes_count: post.likes?.length || 0,
                    has_liked: user ? post.likes?.some((like: any) => like.user_id === user.id) : false
                }));
                // Merge real posts with showcase dummies
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
    }, []);

    return (
        <div className="max-w-lg mx-auto bg-slate-50 min-h-screen">
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {posts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))}

                    {/* Empty State / End of Feed */}
                    <div className="py-20 px-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <Activity className="w-8 h-8 text-slate-300" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-slate-900 font-black uppercase tracking-tight">You're all caught up!</h4>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Follow more teams to see their highlights</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
