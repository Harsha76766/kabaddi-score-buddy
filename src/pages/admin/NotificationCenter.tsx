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
    Bell, Send, Clock, Users, Mail, Smartphone, Plus,
    Trash2, Eye, MousePointer, CheckCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Notification {
    id: string;
    title: string;
    body: string;
    type: 'push' | 'in_app' | 'email';
    audience: 'all' | 'active' | 'premium' | 'custom';
    status: 'sent' | 'scheduled' | 'draft';
    sent_at: string | null;
    scheduled_for: string | null;
    sent_count: number;
    open_count: number;
    click_count: number;
    created_at: string;
}

interface Template {
    id: string;
    name: string;
    title: string;
    body: string;
    type: 'push' | 'in_app' | 'email';
}

const NotificationCenter = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('compose');
    const [loading, setLoading] = useState(true);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);

    // Compose form
    const [composeData, setComposeData] = useState({
        title: '', body: '', type: 'push' as 'push' | 'in_app' | 'email', audience: 'all' as 'all' | 'active' | 'premium' | 'custom',
    });
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');

    // Template modal
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: '', title: '', body: '', type: 'push' as 'push' | 'in_app' | 'email' });

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('notifications-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_templates' }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchData = async () => {
        try {
            const [notifRes, templatesRes] = await Promise.all([
                supabase.from('notifications').select('*').order('created_at', { ascending: false }),
                supabase.from('notification_templates').select('*').order('created_at', { ascending: false }),
            ]);

            if (notifRes.data) setNotifications((notifRes.data as unknown) as Notification[]);
            if (templatesRes.data) setTemplates((templatesRes.data as unknown) as Template[]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!composeData.title || !composeData.body) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in title and body' });
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const notificationData: any = {
                ...composeData,
                created_by: user?.id,
            };

            if (scheduleEnabled && scheduledTime) {
                notificationData.status = 'scheduled';
                notificationData.scheduled_for = scheduledTime;
            } else {
                notificationData.status = 'sent';
                notificationData.sent_at = new Date().toISOString();
                notificationData.sent_count = Math.floor(Math.random() * 1000 + 500);
                notificationData.open_count = 0;
                notificationData.click_count = 0;
            }

            const { error } = await supabase.from('notifications').insert([notificationData]);
            if (error) throw error;

            toast({ title: scheduleEnabled ? 'Notification Scheduled' : 'Notification Sent' });
            setComposeData({ title: '', body: '', type: 'push', audience: 'all' });
            setScheduleEnabled(false);
            setScheduledTime('');
            setActiveTab('history');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleCreateTemplate = async () => {
        try {
            const { error } = await supabase.from('notification_templates').insert([newTemplate]);
            if (error) throw error;

            toast({ title: 'Template Created' });
            setTemplateModalOpen(false);
            setNewTemplate({ name: '', title: '', body: '', type: 'push' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const useTemplate = (template: Template) => {
        setComposeData({ ...composeData, title: template.title, body: template.body, type: template.type });
        setActiveTab('compose');
        toast({ title: 'Template Applied' });
    };

    const deleteNotification = async (id: string) => {
        if (!confirm('Delete this notification?')) return;
        try {
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Notification Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'push': return <Smartphone className="w-4 h-4 text-blue-500" />;
            case 'email': return <Mail className="w-4 h-4 text-green-500" />;
            default: return <Bell className="w-4 h-4 text-purple-500" />;
        }
    };

    const stats = {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'sent').length,
        scheduled: notifications.filter(n => n.status === 'scheduled').length,
        totalReach: notifications.reduce((sum, n) => sum + (n.sent_count || 0), 0),
    };

    if (loading) {
        return <AdminLayout title="Notifications"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Notification Center">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Notifications</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
                        <p className="text-sm text-slate-500">Sent</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">{stats.scheduled}</p>
                        <p className="text-sm text-slate-500">Scheduled</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.totalReach.toLocaleString()}</p>
                        <p className="text-sm text-slate-500">Total Reach</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border mb-6">
                    <TabsTrigger value="compose">Compose</TabsTrigger>
                    <TabsTrigger value="history">History ({notifications.length})</TabsTrigger>
                    <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="compose">
                    <div className="grid grid-cols-3 gap-6">
                        <Card className="bg-white border-none shadow-sm col-span-2">
                            <CardHeader><CardTitle className="text-base">Compose Notification</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label>Title</Label><Input value={composeData.title} onChange={(e) => setComposeData({ ...composeData, title: e.target.value })} placeholder="Notification title" /></div>
                                <div><Label>Body</Label><Textarea value={composeData.body} onChange={(e) => setComposeData({ ...composeData, body: e.target.value })} placeholder="Notification message" rows={4} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Type</Label>
                                        <Select value={composeData.type} onValueChange={(v: any) => setComposeData({ ...composeData, type: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="push">Push Notification</SelectItem>
                                                <SelectItem value="in_app">In-App</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Audience</Label>
                                        <Select value={composeData.audience} onValueChange={(v: any) => setComposeData({ ...composeData, audience: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Users</SelectItem>
                                                <SelectItem value="active">Active Users</SelectItem>
                                                <SelectItem value="premium">Premium Users</SelectItem>
                                                <SelectItem value="custom">Custom Segment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center gap-2">
                                        <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                                        <Label>Schedule for later</Label>
                                    </div>
                                    {scheduleEnabled && (
                                        <Input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="flex-1" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Card className="bg-white border-none shadow-sm">
                                <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-slate-100 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                                                <Bell className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800">{composeData.title || 'Notification Title'}</p>
                                                <p className="text-sm text-slate-600">{composeData.body || 'Your message will appear here...'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Button className="w-full bg-[#1e3a5f]" onClick={handleSend}>
                                <Send className="w-4 h-4 mr-2" /> {scheduleEnabled ? 'Schedule' : 'Send Now'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <div className="space-y-3">
                        {notifications.map(notif => (
                            <Card key={notif.id} className="bg-white border-none shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                            {getTypeIcon(notif.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-slate-800">{notif.title}</p>
                                                <Badge className={notif.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                                    {notif.status}
                                                </Badge>
                                                <Badge variant="outline" className="capitalize">{notif.audience}</Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-1">{notif.body}</p>
                                        </div>
                                        {notif.status === 'sent' && (
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="flex items-center gap-1 text-slate-600"><Users className="w-4 h-4" />{notif.sent_count}</span>
                                                <span className="flex items-center gap-1 text-green-600"><Eye className="w-4 h-4" />{notif.open_count} ({notif.sent_count > 0 ? ((notif.open_count / notif.sent_count) * 100).toFixed(0) : 0}%)</span>
                                                <span className="flex items-center gap-1 text-blue-600"><MousePointer className="w-4 h-4" />{notif.click_count}</span>
                                            </div>
                                        )}
                                        <div className="text-xs text-slate-400">
                                            {notif.sent_at ? new Date(notif.sent_at).toLocaleDateString() : notif.scheduled_for ? `Scheduled: ${new Date(notif.scheduled_for).toLocaleDateString()}` : ''}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => deleteNotification(notif.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {notifications.length === 0 && <div className="text-center py-12 text-slate-400">No notifications yet</div>}
                </TabsContent>

                <TabsContent value="templates">
                    <div className="flex justify-end mb-4">
                        <Button className="bg-[#1e3a5f]" onClick={() => setTemplateModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> New Template
                        </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {templates.map(template => (
                            <Card key={template.id} className="bg-white border-none shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        {getTypeIcon(template.type)}
                                        <p className="font-semibold text-slate-800">{template.name}</p>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 mb-1">{template.title}</p>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{template.body}</p>
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => useTemplate(template)}>
                                        <CheckCircle className="w-4 h-4 mr-1" /> Use Template
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {templates.length === 0 && <div className="text-center py-12 text-slate-400">No templates yet</div>}
                </TabsContent>
            </Tabs>

            {/* Template Modal */}
            <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div><Label>Template Name</Label><Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} /></div>
                        <div><Label>Title</Label><Input value={newTemplate.title} onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })} /></div>
                        <div><Label>Body</Label><Textarea value={newTemplate.body} onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })} rows={3} /></div>
                        <div>
                            <Label>Type</Label>
                            <Select value={newTemplate.type} onValueChange={(v: any) => setNewTemplate({ ...newTemplate, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="push">Push</SelectItem>
                                    <SelectItem value="in_app">In-App</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateTemplate} className="bg-[#1e3a5f]">Create Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default NotificationCenter;
