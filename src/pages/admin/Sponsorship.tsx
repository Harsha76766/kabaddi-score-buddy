import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    Plus, Trash2, Edit, Eye, Image, Link2, Calendar, DollarSign,
    Target, BarChart3
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface Sponsor {
    id: string;
    name: string;
    logo_url: string;
    type: 'title' | 'associate' | 'powered_by';
    is_active: boolean;
    start_date: string;
    end_date: string;
    impressions: number;
    clicks: number;
}

interface Banner {
    id: string;
    name: string;
    image_url: string;
    placement: 'home' | 'match' | 'leaderboard' | 'profile' | 'popup';
    link_url: string;
    is_active: boolean;
    impressions: number;
    clicks: number;
    start_date: string;
    end_date: string;
}

const Sponsorship = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('sponsors');
    const [loading, setLoading] = useState(true);

    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);

    const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
    const [bannerModalOpen, setBannerModalOpen] = useState(false);

    const [newSponsor, setNewSponsor] = useState({
        name: '', logo_url: '', type: 'associate' as 'title' | 'associate' | 'powered_by',
        start_date: '', end_date: '',
    });

    const [newBanner, setNewBanner] = useState({
        name: '', image_url: '', placement: 'home' as 'home' | 'match' | 'leaderboard' | 'profile' | 'popup',
        link_url: '', start_date: '', end_date: '',
    });

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('sponsorship-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsors' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchData = async () => {
        try {
            const [sponsorsRes, bannersRes] = await Promise.all([
                // @ts-ignore - table exists but types not regenerated
                supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
                // @ts-ignore - table exists but types not regenerated
                supabase.from('banners').select('*').order('created_at', { ascending: false }),
            ]);

            if (sponsorsRes.error) throw sponsorsRes.error;
            if (bannersRes.error) throw bannersRes.error;

            setSponsors((sponsorsRes.data as Sponsor[]) || []);
            setBanners((bannersRes.data as Banner[]) || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSponsor = async () => {
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase.from('sponsors').insert([{ ...newSponsor, is_active: true, impressions: 0, clicks: 0 }]);
            if (error) throw error;
            toast({ title: 'Sponsor Added' });
            setSponsorModalOpen(false);
            setNewSponsor({ name: '', logo_url: '', type: 'associate', start_date: '', end_date: '' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleCreateBanner = async () => {
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase.from('banners').insert([{ ...newBanner, is_active: true, impressions: 0, clicks: 0 }]);
            if (error) throw error;
            toast({ title: 'Banner Created' });
            setBannerModalOpen(false);
            setNewBanner({ name: '', image_url: '', placement: 'home', link_url: '', start_date: '', end_date: '' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const toggleSponsorActive = async (id: string, currentValue: boolean) => {
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase.from('sponsors').update({ is_active: !currentValue }).eq('id', id);
            if (error) throw error;
            toast({ title: 'Status Updated' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const toggleBannerActive = async (id: string, currentValue: boolean) => {
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase.from('banners').update({ is_active: !currentValue }).eq('id', id);
            if (error) throw error;
            toast({ title: 'Status Updated' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const deleteSponsor = async (id: string) => {
        if (!confirm('Delete this sponsor?')) return;
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase.from('sponsors').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Sponsor Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const deleteBanner = async (id: string) => {
        if (!confirm('Delete this banner?')) return;
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase.from('banners').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Banner Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'title': return 'bg-amber-100 text-amber-700';
            case 'powered_by': return 'bg-blue-100 text-blue-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getPlacementColor = (placement: string) => {
        switch (placement) {
            case 'home': return 'bg-blue-100 text-blue-700';
            case 'match': return 'bg-green-100 text-green-700';
            case 'popup': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const totalImpressions = [...sponsors, ...banners].reduce((sum, item) => sum + item.impressions, 0);
    const totalClicks = [...sponsors, ...banners].reduce((sum, item) => sum + item.clicks, 0);

    if (loading) {
        return <AdminLayout title="Sponsorship"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Sponsorship & Banners">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{sponsors.length}</p>
                        <p className="text-sm text-slate-500">Total Sponsors</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{banners.length}</p>
                        <p className="text-sm text-slate-500">Active Banners</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{(totalImpressions / 1000).toFixed(0)}K</p>
                        <p className="text-sm text-slate-500">Total Impressions</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-purple-600">{totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0}%</p>
                        <p className="text-sm text-slate-500">Avg CTR</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-between items-center mb-4">
                    <TabsList className="bg-white border">
                        <TabsTrigger value="sponsors">Sponsors ({sponsors.length})</TabsTrigger>
                        <TabsTrigger value="banners">Banners ({banners.length})</TabsTrigger>
                    </TabsList>
                    <Button className="bg-[#1e3a5f]" onClick={() => activeTab === 'sponsors' ? setSponsorModalOpen(true) : setBannerModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Add {activeTab === 'sponsors' ? 'Sponsor' : 'Banner'}
                    </Button>
                </div>

                <TabsContent value="sponsors">
                    <div className="grid grid-cols-2 gap-4">
                        {sponsors.map(sponsor => (
                            <Card key={sponsor.id} className={`bg-white border-none shadow-sm ${!sponsor.is_active ? 'opacity-60' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                                            {sponsor.logo_url ? (
                                                <img src={sponsor.logo_url} alt={sponsor.name} className="w-full h-full object-contain rounded-lg" />
                                            ) : (
                                                <DollarSign className="w-8 h-8 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-slate-800">{sponsor.name}</p>
                                                <Badge className={getTypeColor(sponsor.type)}>{sponsor.type.replace('_', ' ')}</Badge>
                                                {sponsor.is_active && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {sponsor.start_date || 'N/A'} - {sponsor.end_date || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span><Eye className="w-4 h-4 inline mr-1" />{sponsor.impressions.toLocaleString()}</span>
                                                <span><Target className="w-4 h-4 inline mr-1" />{sponsor.clicks.toLocaleString()}</span>
                                                <span className="text-green-600">{sponsor.impressions > 0 ? ((sponsor.clicks / sponsor.impressions) * 100).toFixed(2) : 0}% CTR</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Switch checked={sponsor.is_active} onCheckedChange={() => toggleSponsorActive(sponsor.id, sponsor.is_active)} />
                                            <Button variant="ghost" size="sm" onClick={() => deleteSponsor(sponsor.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {sponsors.length === 0 && <div className="text-center py-12 text-slate-400">No sponsors yet</div>}
                </TabsContent>

                <TabsContent value="banners">
                    <div className="space-y-4">
                        {banners.map(banner => (
                            <Card key={banner.id} className={`bg-white border-none shadow-sm ${!banner.is_active ? 'opacity-60' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-32 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                                            {banner.image_url ? (
                                                <img src={banner.image_url} alt={banner.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Image className="w-8 h-8 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-slate-800">{banner.name}</p>
                                                <Badge className={getPlacementColor(banner.placement)}>{banner.placement}</Badge>
                                                {banner.is_active && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                                <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> {banner.link_url || 'No link'}</span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div><p className="text-xs text-slate-500">Impressions</p><p className="font-bold">{banner.impressions.toLocaleString()}</p></div>
                                                <div><p className="text-xs text-slate-500">Clicks</p><p className="font-bold">{banner.clicks.toLocaleString()}</p></div>
                                                <div><p className="text-xs text-slate-500">CTR</p><p className="font-bold text-green-600">{banner.impressions > 0 ? ((banner.clicks / banner.impressions) * 100).toFixed(2) : 0}%</p></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Switch checked={banner.is_active} onCheckedChange={() => toggleBannerActive(banner.id, banner.is_active)} />
                                            <Button variant="ghost" size="sm" onClick={() => deleteBanner(banner.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {banners.length === 0 && <div className="text-center py-12 text-slate-400">No banners yet</div>}
                </TabsContent>
            </Tabs>

            {/* Add Sponsor Modal */}
            <Dialog open={sponsorModalOpen} onOpenChange={setSponsorModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader><DialogTitle>Add Sponsor</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div><Label>Sponsor Name</Label><Input value={newSponsor.name} onChange={(e) => setNewSponsor({ ...newSponsor, name: e.target.value })} /></div>
                        <div><Label>Logo URL</Label><Input value={newSponsor.logo_url} onChange={(e) => setNewSponsor({ ...newSponsor, logo_url: e.target.value })} /></div>
                        <div>
                            <Label>Type</Label>
                            <Select value={newSponsor.type} onValueChange={(v: any) => setNewSponsor({ ...newSponsor, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="title">Title Sponsor</SelectItem>
                                    <SelectItem value="powered_by">Powered By</SelectItem>
                                    <SelectItem value="associate">Associate Sponsor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Start Date</Label><Input type="date" value={newSponsor.start_date} onChange={(e) => setNewSponsor({ ...newSponsor, start_date: e.target.value })} /></div>
                            <div><Label>End Date</Label><Input type="date" value={newSponsor.end_date} onChange={(e) => setNewSponsor({ ...newSponsor, end_date: e.target.value })} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSponsorModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSponsor} className="bg-[#1e3a5f]">Add Sponsor</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Banner Modal */}
            <Dialog open={bannerModalOpen} onOpenChange={setBannerModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader><DialogTitle>Add Banner</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div><Label>Banner Name</Label><Input value={newBanner.name} onChange={(e) => setNewBanner({ ...newBanner, name: e.target.value })} /></div>
                        <div><Label>Image URL</Label><Input value={newBanner.image_url} onChange={(e) => setNewBanner({ ...newBanner, image_url: e.target.value })} /></div>
                        <div><Label>Click URL</Label><Input value={newBanner.link_url} onChange={(e) => setNewBanner({ ...newBanner, link_url: e.target.value })} /></div>
                        <div>
                            <Label>Placement</Label>
                            <Select value={newBanner.placement} onValueChange={(v: any) => setNewBanner({ ...newBanner, placement: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="home">Home Page</SelectItem>
                                    <SelectItem value="match">Match Page</SelectItem>
                                    <SelectItem value="leaderboard">Leaderboard</SelectItem>
                                    <SelectItem value="profile">Profile</SelectItem>
                                    <SelectItem value="popup">Popup</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Start Date</Label><Input type="date" value={newBanner.start_date} onChange={(e) => setNewBanner({ ...newBanner, start_date: e.target.value })} /></div>
                            <div><Label>End Date</Label><Input type="date" value={newBanner.end_date} onChange={(e) => setNewBanner({ ...newBanner, end_date: e.target.value })} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBannerModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateBanner} className="bg-[#1e3a5f]">Add Banner</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default Sponsorship;
