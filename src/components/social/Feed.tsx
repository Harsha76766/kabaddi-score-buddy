import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Post, PostCard } from "./PostCard";
import { Loader2, Activity } from "lucide-react";

export const Feed = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

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
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (data && data.length > 0) {
                const formattedPosts: Post[] = data.map((post: any) => ({
                    ...post,
                    likes_count: post.likes?.length || 0,
                    has_liked: user ? post.likes?.some((like: any) => like.user_id === user.id) : false
                }));
                setPosts(formattedPosts);
            } else {
                // Show a single placeholder if no posts
                setPosts([]);
            }
        } catch (error) {
            console.error("Error fetching posts:", error);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();

        // Real-time subscription for new posts
        const postsChannel = supabase
            .channel('realtime_posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                const newPost = {
                    ...payload.new,
                    profiles: { name: 'New User', avatar_url: undefined },
                    likes_count: 0,
                    has_liked: false
                } as Post;
                setPosts(prev => [newPost, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, () => {
                fetchPosts();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
                setPosts(prev => prev.filter(p => p.id !== (payload.old as any).id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(postsChannel);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-12 px-6 text-center space-y-4">
                <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <Activity className="w-6 h-6 text-neutral-600" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-white font-bold text-sm">No posts yet</h4>
                    <p className="text-neutral-500 text-xs">Follow teams and players to see updates</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-8">
            {posts.map(post => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
};
