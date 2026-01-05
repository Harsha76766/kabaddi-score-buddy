import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, Trophy, Swords, Share2, Activity, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export interface Post {
    id: string;
    content: string;
    image_url?: string;
    video_url?: string;
    type?: 'photo' | 'clip' | 'match_result' | 'live_promo' | 'tournament';
    match_id?: string;
    tournament_id?: string;
    created_at: string;
    user_id: string;
    profiles: {
        name: string;
        avatar_url?: string;
    };
    likes_count: number;
    has_liked: boolean;
    match_data?: any;
    tournament_data?: any;
}

interface PostCardProps {
    post: Post;
}

export const PostCard = ({ post }: PostCardProps) => {
    const [liked, setLiked] = useState(post.has_liked);
    const [likesCount, setLikesCount] = useState(post.likes_count);
    const navigate = useNavigate();

    const profileName = post.profiles?.name || "User";
    const profileAvatar = post.profiles?.avatar_url;

    const handleLike = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        // @ts-ignore
        if (newLiked) {
            // @ts-ignore
            await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
        } else {
            // @ts-ignore
            await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        }
    };

    const renderContent = () => {
        switch (post.type) {
            case 'clip':
                return (
                    <div className="relative aspect-[4/5] bg-slate-900 overflow-hidden group">
                        {post.video_url ? (
                            <video src={post.video_url} className="w-full h-full object-cover" loop muted autoPlay />
                        ) : (
                            <img src={post.image_url} alt="Clip fallback" className="w-full h-full object-cover opacity-50" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                <Play className="w-8 h-8 text-white fill-current" />
                            </div>
                        </div>
                        <div className="absolute top-4 right-4">
                            <Badge className="bg-red-600 text-white border-0 font-black uppercase tracking-widest text-[10px]">Highlight</Badge>
                        </div>
                    </div>
                );
            case 'match_result':
                return (
                    <div className="bg-white border-y border-slate-100 p-8 flex flex-col items-center gap-6 relative overflow-hidden group cursor-pointer" onClick={() => navigate(`/match-summary/${post.match_id}`)}>
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                            <Trophy className="w-48 h-48 rotate-12" />
                        </div>
                        <Badge className="bg-slate-900 text-white rounded-full px-4 h-7 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Final Result</Badge>
                        <div className="flex items-center justify-between w-full max-w-[320px] gap-8">
                            <div className="flex flex-col items-center gap-4 flex-1">
                                <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl font-black text-slate-400">{post.match_data?.team_a_name?.charAt(0) || "A"}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">{post.match_data?.team_a_name || "Team A"}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl font-black text-slate-900">{post.match_data?.team_a_score || 0}</span>
                                    <span className="text-xl font-black text-slate-200">/</span>
                                    <span className="text-4xl font-black text-slate-900">{post.match_data?.team_b_score || 0}</span>
                                </div>
                                <div className="text-[9px] font-black text-orange-600 uppercase tracking-[0.3em]">Full Time</div>
                            </div>
                            <div className="flex flex-col items-center gap-4 flex-1">
                                <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl font-black text-slate-400">{post.match_data?.team_b_name?.charAt(0) || "B"}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">{post.match_data?.team_b_name || "Team B"}</span>
                            </div>
                        </div>
                        {post.match_data?.mvp_name && (
                            <div className="bg-orange-50 px-4 py-2 rounded-2xl flex items-center gap-3 border border-orange-100">
                                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                    <Star className="w-3 h-3 text-white fill-current" />
                                </div>
                                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">MVP: {post.match_data.mvp_name}</span>
                            </div>
                        )}
                    </div>
                );
            case 'live_promo':
                return (
                    <div className="bg-orange-600 p-8 flex flex-col items-center gap-4 text-white cursor-pointer" onClick={() => navigate(`/matches/${post.match_id}/spectate`)}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Happening Now</span>
                        </div>
                        <h4 className="text-2xl font-black uppercase tracking-tight text-center">
                            {post.match_data?.team_a_name} <span className="text-white/40 italic">VS</span> {post.match_data?.team_b_name}
                        </h4>
                        <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-4">Watch the live battle unfold!</p>
                        <button className="bg-white text-orange-600 h-10 px-6 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-950/20 active:scale-95 transition-all">
                            Jump to Match Center
                        </button>
                    </div>
                );
            case 'tournament':
                return (
                    <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden group cursor-pointer" onClick={() => navigate(`/tournaments/${post.tournament_id}`)}>
                        <img src={post.image_url} alt="Tournament" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6 space-y-2">
                            <Badge className="bg-yellow-500 text-slate-950 border-0 font-black uppercase tracking-widest text-[9px]">Tournament Alert</Badge>
                            <h4 className="text-xl font-black uppercase tracking-tight text-white">{post.tournament_data?.name || "KPL Season 5"}</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-white/60">
                                    <Activity className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{post.tournament_data?.location || "Sangli, MH"}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-white/60">
                                    <Trophy className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">₹50K Pool</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return post.image_url ? (
                    <div className="w-full aspect-square bg-slate-50">
                        <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                    </div>
                ) : null;
        }
    };

    return (
        <div className="bg-white border-b border-slate-100 last:border-0 group">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 p-0.5 border border-slate-100 shadow-sm overflow-hidden group-hover:rotate-6 transition-transform">
                        <Avatar className="w-full h-full rounded-[14px]">
                            <AvatarImage src={profileAvatar} />
                            <AvatarFallback className="bg-slate-100 text-slate-400 text-[10px] font-black">
                                {profileName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{profileName}</span>
                            {post.type === 'tournament' && (
                                <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase text-orange-600 border-orange-200 bg-orange-50">Organizer</Badge>
                            )}
                        </div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: false })} ago
                        </span>
                    </div>
                </div>
                <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-300">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content Area */}
            {renderContent()}

            {/* Interaction Layer */}
            <div className="px-6 py-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 transition-all active:scale-125 ${liked ? 'text-red-500' : 'text-slate-900 hover:text-slate-400'}`}
                        >
                            <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
                            <span className="text-xs font-black font-mono tracking-tighter">{likesCount}</span>
                        </button>
                        <button className="flex items-center gap-2 text-slate-900 hover:text-slate-400">
                            <MessageCircle className="w-6 h-6" />
                            <span className="text-xs font-black font-mono tracking-tighter">24</span>
                        </button>
                        <button className="text-slate-900 hover:text-slate-400">
                            <Share2 className="w-6 h-6" />
                        </button>
                    </div>
                    <button className="text-slate-900 hover:text-slate-400">
                        <Bookmark className="w-6 h-6" />
                    </button>
                </div>

                {/* Caption (only for photos/clips) */}
                {(post.type === 'photo' || post.type === 'clip' || !post.type) && post.content && (
                    <div className="text-sm leading-relaxed text-slate-600">
                        <span className="font-black text-slate-900 uppercase tracking-tight mr-2">{profileName}</span>
                        {post.content}
                    </div>
                )}
            </div>
        </div>
    );
};
