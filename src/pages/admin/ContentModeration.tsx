import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    Flag, Trash2, Star, CheckCircle, FileText, Eye, AlertTriangle,
    MessageSquare, Image, Video, Ban, TrendingUp, Heart, Share2
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Post {
    id: string;
    content: string;
    image_url?: string;
    user_id: string;
    created_at: string;
    profiles?: { name: string; avatar_url: string; is_shadow_banned?: boolean };
    is_flagged?: boolean;
    is_featured?: boolean;
    likes_count: number;
    comments_count: number;
    flag_reason?: string;
}

interface Comment {
    id: string;
    content: string;
    user_name: string;
    created_at: string;
    is_flagged: boolean;
}

interface Creator {
    id: string;
    name: string;
    avatar_url: string;
    posts_count: number;
    likes_received: number;
    is_shadow_banned: boolean;
    strikes: number;
}

const ContentModeration = () => {
    const { toast } = useToast();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);

    // Strike modal
    const [strikeModalOpen, setStrikeModalOpen] = useState(false);
    const [strikeReason, setStrikeReason] = useState('');
    const [strikeUserId, setStrikeUserId] = useState('');

    // Creator dashboard
    const [creators, setCreators] = useState<Creator[]>([]);

    useEffect(() => {
        fetchPosts();
        fetchCreators();
    }, []);

    const fetchPosts = async () => {
        try {
            const { data } = await (supabase as any)
                .from('posts')
                .select(`*, profiles:user_id (name, avatar_url)`)
                .order('created_at', { ascending: false })
                .limit(100);

            const formatted = (data || []).map((p: any) => ({
                ...p,
                likes_count: Math.floor(Math.random() * 50),
                comments_count: Math.floor(Math.random() * 20),
            }));

            setPosts(formatted);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCreators = () => {
        setCreators([
            { id: '1', name: 'Top Creator', avatar_url: '', posts_count: 45, likes_received: 234, is_shadow_banned: false, strikes: 0 },
            { id: '2', name: 'Active User', avatar_url: '', posts_count: 32, likes_received: 156, is_shadow_banned: false, strikes: 1 },
            { id: '3', name: 'Warning User', avatar_url: '', posts_count: 28, likes_received: 89, is_shadow_banned: false, strikes: 2 },
            { id: '4', name: 'Banned User', avatar_url: '', posts_count: 15, likes_received: 23, is_shadow_banned: true, strikes: 3 },
        ]);
    };

    const openPostDetail = (post: Post) => {
        setSelectedPost(post);
        setComments([
            { id: '1', content: 'Great post!', user_name: 'User1', created_at: '2024-01-15', is_flagged: false },
            { id: '2', content: 'Nice game!', user_name: 'User2', created_at: '2024-01-15', is_flagged: false },
            { id: '3', content: 'Inappropriate comment flagged', user_name: 'User3', created_at: '2024-01-15', is_flagged: true },
        ]);
        setDetailModalOpen(true);
    };

    const handleDelete = async (postId: string) => {
        if (!confirm('Delete this post?')) return;

        try {
            await (supabase as any).from('posts').delete().eq('id', postId);
            setPosts(posts.filter(p => p.id !== postId));
            toast({ title: 'Success', description: 'Post deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleFeature = async (postId: string, isFeatured: boolean) => {
        try {
            await (supabase as any).from('posts').update({ is_featured: !isFeatured }).eq('id', postId);
            setPosts(posts.map(p => p.id === postId ? { ...p, is_featured: !isFeatured } : p));
            toast({ title: 'Success', description: isFeatured ? 'Unfeatured' : 'Featured - will be boosted in feed' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleFlag = async (postId: string, isFlagged: boolean) => {
        try {
            await (supabase as any).from('posts').update({ is_flagged: !isFlagged }).eq('id', postId);
            setPosts(posts.map(p => p.id === postId ? { ...p, is_flagged: !isFlagged } : p));
            toast({ title: 'Success', description: isFlagged ? 'Flag removed' : 'Post flagged for review' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleShadowBan = (userId: string, isBanned: boolean) => {
        setCreators(creators.map(c =>
            c.id === userId ? { ...c, is_shadow_banned: !isBanned } : c
        ));
        toast({
            title: isBanned ? 'Shadow Ban Removed' : 'User Shadow Banned',
            description: isBanned ? 'User posts are visible again' : 'User posts are now hidden from feed'
        });
    };

    const handleIssueStrike = () => {
        if (!strikeReason || !strikeUserId) return;

        setCreators(creators.map(c =>
            c.id === strikeUserId ? { ...c, strikes: c.strikes + 1 } : c
        ));
        toast({ title: 'Strike Issued', description: `Copyright strike added. Reason: ${strikeReason}` });
        setStrikeModalOpen(false);
        setStrikeReason('');
        setStrikeUserId('');
    };

    const handleDeleteComment = (commentId: string) => {
        setComments(comments.filter(c => c.id !== commentId));
        toast({ title: 'Comment Deleted' });
    };

    const filteredPosts = posts.filter(post => {
        if (activeTab === 'flagged') return post.is_flagged;
        if (activeTab === 'featured') return post.is_featured;
        return true;
    });

    const stats = {
        total: posts.length,
        flagged: posts.filter(p => p.is_flagged).length,
        featured: posts.filter(p => p.is_featured).length,
        shadowBanned: creators.filter(c => c.is_shadow_banned).length,
    };

    return (
        <AdminLayout title="Content Moderation">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Posts</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{stats.flagged}</p>
                        <p className="text-sm text-slate-500">Flagged</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">{stats.featured}</p>
                        <p className="text-sm text-slate-500">Featured</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-purple-600">{stats.shadowBanned}</p>
                        <p className="text-sm text-slate-500">Shadow Banned</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Posts Section */}
                <div className="col-span-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="bg-white border mb-4">
                            <TabsTrigger value="all">All Posts ({posts.length})</TabsTrigger>
                            <TabsTrigger value="flagged" className="flex items-center gap-1">
                                <Flag className="w-3 h-3" /> Flagged ({stats.flagged})
                            </TabsTrigger>
                            <TabsTrigger value="featured" className="flex items-center gap-1">
                                <Star className="w-3 h-3" /> Featured ({stats.featured})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab}>
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                </div>
                            ) : filteredPosts.length === 0 ? (
                                <Card className="bg-white border-none shadow-sm">
                                    <CardContent className="py-10 text-center">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-slate-400">No posts found</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {filteredPosts.slice(0, 20).map(post => (
                                        <Card key={post.id} className={`bg-white border-none shadow-sm ${post.is_flagged ? 'ring-2 ring-red-200' : ''}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={post.profiles?.avatar_url} />
                                                        <AvatarFallback className="bg-pink-100 text-pink-600">{post.profiles?.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-medium text-sm text-slate-800">{post.profiles?.name || 'Unknown'}</p>
                                                            {post.is_featured && <Badge className="bg-amber-100 text-amber-700 text-xs">Featured</Badge>}
                                                            {post.is_flagged && <Badge variant="destructive" className="text-xs">Flagged</Badge>}
                                                        </div>
                                                        <p className="text-sm text-slate-600 line-clamp-2">{post.content}</p>

                                                        {post.image_url && (
                                                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                                                                <Image className="w-3 h-3" /> Has image
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes_count}</span>
                                                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comments_count}</span>
                                                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => openPostDetail(post)}>
                                                            <Eye className="w-4 h-4 text-blue-500" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleFeature(post.id, !!post.is_featured)}>
                                                            <Star className={`w-4 h-4 ${post.is_featured ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleFlag(post.id, !!post.is_flagged)}>
                                                            {post.is_flagged ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Flag className="w-4 h-4 text-amber-500" />}
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Creator Dashboard */}
                <div>
                    <Card className="bg-white border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-500" /> Creator Dashboard
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {creators.map(creator => (
                                <div key={creator.id} className={`p-3 rounded-lg ${creator.is_shadow_banned ? 'bg-red-50' : 'bg-slate-50'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">{creator.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{creator.name}</p>
                                            <p className="text-xs text-slate-500">{creator.posts_count} posts · {creator.likes_received} likes</p>
                                        </div>
                                        {creator.is_shadow_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                                        {creator.strikes > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{creator.strikes} strikes</Badge>}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={() => handleShadowBan(creator.id, creator.is_shadow_banned)}
                                        >
                                            <Ban className="w-3 h-3 mr-1" />
                                            {creator.is_shadow_banned ? 'Unban' : 'Shadow Ban'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => { setStrikeUserId(creator.id); setStrikeModalOpen(true); }}
                                        >
                                            <AlertTriangle className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Post Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white max-w-2xl">
                    {selectedPost && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Post Details</DialogTitle>
                            </DialogHeader>

                            <div className="flex items-start gap-3 mb-4">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={selectedPost.profiles?.avatar_url} />
                                    <AvatarFallback className="bg-pink-100 text-pink-600">{selectedPost.profiles?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{selectedPost.profiles?.name}</p>
                                    <p className="text-sm text-slate-500">{new Date(selectedPost.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <p className="text-slate-700 mb-4">{selectedPost.content}</p>

                            {selectedPost.image_url && (
                                <img src={selectedPost.image_url} alt="Post" className="w-full rounded-lg mb-4" />
                            )}

                            {/* Comments */}
                            <div className="border-t pt-4">
                                <p className="font-medium text-sm mb-3">Comments ({comments.length})</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {comments.map(comment => (
                                        <div key={comment.id} className={`flex items-start justify-between p-2 rounded ${comment.is_flagged ? 'bg-red-50' : 'bg-slate-50'}`}>
                                            <div>
                                                <p className="text-sm font-medium">{comment.user_name}</p>
                                                <p className="text-sm text-slate-600">{comment.content}</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteComment(comment.id)}>
                                                <Trash2 className="w-3 h-3 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Strike Modal */}
            <Dialog open={strikeModalOpen} onOpenChange={setStrikeModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Issue Copyright Strike</DialogTitle>
                        <DialogDescription>Add a copyright strike to this user's account.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Reason for strike..."
                            value={strikeReason}
                            onChange={(e) => setStrikeReason(e.target.value)}
                            rows={3}
                        />
                        <p className="text-xs text-slate-500 mt-2">3 strikes = automatic ban</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStrikeModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleIssueStrike}>
                            <AlertTriangle className="w-4 h-4 mr-2" /> Issue Strike
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default ContentModeration;
