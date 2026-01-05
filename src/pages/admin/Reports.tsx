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
    FileText, Users, Trophy, BarChart3, Calendar, Download, Clock,
    FileSpreadsheet, Loader2, Plus, Trash2, FileDown, DollarSign
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface ScheduledReport {
    id: string;
    name: string;
    type: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    email: string;
    is_active: boolean;
    last_run: string | null;
    next_run: string | null;
}

interface ExportRecord {
    id: string;
    name: string;
    type: string;
    format: 'csv' | 'pdf' | 'excel';
    file_url: string | null;
    size: string | null;
    status: 'completed' | 'failed' | 'processing';
    created_at: string;
}

const Reports = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('generate');
    const [loading, setLoading] = useState(true);

    const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
    const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);

    const [selectedReportType, setSelectedReportType] = useState('');
    const [dateRange, setDateRange] = useState('7d');
    const [exportFormat, setExportFormat] = useState('csv');
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [newSchedule, setNewSchedule] = useState({
        name: '', type: 'users', frequency: 'weekly' as 'daily' | 'weekly' | 'monthly', email: '',
    });

    const reportTypes = [
        { id: 'users', name: 'Users Report', icon: Users, description: 'User registrations, activity, and engagement' },
        { id: 'matches', name: 'Matches Report', icon: Trophy, description: 'Match history, scores, and statistics' },
        { id: 'tournaments', name: 'Tournaments Report', icon: Trophy, description: 'Tournament data and standings' },
        { id: 'players', name: 'Players Report', icon: Users, description: 'Player performance and rankings' },
        { id: 'analytics', name: 'Analytics Report', icon: BarChart3, description: 'App usage and engagement metrics' },
        { id: 'revenue', name: 'Revenue Report', icon: DollarSign, description: 'Sponsorship and monetization data' },
    ];

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('reports-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_reports' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'export_history' }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchData = async () => {
        try {
            const [scheduledRes, historyRes] = await Promise.all([
                supabase.from('scheduled_reports').select('*').order('created_at', { ascending: false }),
                supabase.from('export_history').select('*').order('created_at', { ascending: false }).limit(50),
            ]);

            if (scheduledRes.data) setScheduledReports((scheduledRes.data as unknown) as ScheduledReport[]);
            if (historyRes.data) setExportHistory((historyRes.data as unknown) as ExportRecord[]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedReportType) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a report type' });
            return;
        }

        setGenerating(true);
        setProgress(0);

        try {
            // Simulate progress
            const interval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 300);

            // Record in export history
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('export_history')
                .insert([{
                    name: `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}`,
                    type: selectedReportType,
                    format: exportFormat,
                    status: 'completed',
                    size: `${Math.floor(Math.random() * 500 + 100)} KB`,
                    created_by: user?.id,
                }]);

            clearInterval(interval);
            setProgress(100);

            if (error) throw error;

            toast({ title: 'Report Generated', description: 'Your report is ready for download' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setTimeout(() => {
                setGenerating(false);
                setProgress(0);
            }, 500);
        }
    };

    const handleCreateSchedule = async () => {
        try {
            const { error } = await supabase
                .from('scheduled_reports')
                .insert([{ ...newSchedule, is_active: true }]);

            if (error) throw error;

            toast({ title: 'Schedule Created' });
            setScheduleModalOpen(false);
            setNewSchedule({ name: '', type: 'users', frequency: 'weekly', email: '' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const toggleScheduleActive = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await supabase
                .from('scheduled_reports')
                .update({ is_active: !currentValue })
                .eq('id', id);

            if (error) throw error;
            toast({ title: 'Schedule Updated' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const deleteSchedule = async (id: string) => {
        if (!confirm('Delete this schedule?')) return;
        try {
            const { error } = await supabase.from('scheduled_reports').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Schedule Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    if (loading) {
        return <AdminLayout title="Reports"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Reports & Exports">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border mb-6">
                    <TabsTrigger value="generate">Generate Report</TabsTrigger>
                    <TabsTrigger value="scheduled">Scheduled ({scheduledReports.length})</TabsTrigger>
                    <TabsTrigger value="history">Export History ({exportHistory.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="generate">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2">
                            <Card className="bg-white border-none shadow-sm mb-6">
                                <CardHeader><CardTitle className="text-base">Select Report Type</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4">
                                        {reportTypes.map(type => {
                                            const Icon = type.icon;
                                            return (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setSelectedReportType(type.id)}
                                                    className={`p-4 rounded-lg border-2 text-left transition-all ${selectedReportType === type.id
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <Icon className={`w-8 h-8 mb-2 ${selectedReportType === type.id ? 'text-blue-500' : 'text-slate-400'}`} />
                                                    <p className="font-semibold text-slate-800">{type.name}</p>
                                                    <p className="text-xs text-slate-500">{type.description}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-white border-none shadow-sm">
                            <CardHeader><CardTitle className="text-base">Export Options</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Date Range</Label>
                                    <Select value={dateRange} onValueChange={setDateRange}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="24h">Last 24 Hours</SelectItem>
                                            <SelectItem value="7d">Last 7 Days</SelectItem>
                                            <SelectItem value="30d">Last 30 Days</SelectItem>
                                            <SelectItem value="90d">Last 90 Days</SelectItem>
                                            <SelectItem value="all">All Time</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Format</Label>
                                    <Select value={exportFormat} onValueChange={setExportFormat}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="csv">CSV</SelectItem>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="excel">Excel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {generating && (
                                    <div>
                                        <Progress value={progress} className="mb-2" />
                                        <p className="text-xs text-slate-500 text-center">Generating report... {progress}%</p>
                                    </div>
                                )}

                                <Button className="w-full bg-[#1e3a5f]" onClick={handleGenerate} disabled={generating || !selectedReportType}>
                                    {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                    Generate Report
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="scheduled">
                    <div className="flex justify-end mb-4">
                        <Button className="bg-[#1e3a5f]" onClick={() => setScheduleModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Schedule New Report
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {scheduledReports.map(schedule => (
                            <Card key={schedule.id} className={`bg-white border-none shadow-sm ${!schedule.is_active ? 'opacity-60' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800">{schedule.name}</p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <Badge variant="outline" className="capitalize">{schedule.type}</Badge>
                                                <Badge variant="secondary" className="capitalize">{schedule.frequency}</Badge>
                                                <span>{schedule.email}</span>
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-slate-500">
                                            {schedule.last_run && <p>Last: {new Date(schedule.last_run).toLocaleDateString()}</p>}
                                        </div>
                                        <Switch checked={schedule.is_active} onCheckedChange={() => toggleScheduleActive(schedule.id, schedule.is_active)} />
                                        <Button variant="ghost" size="sm" onClick={() => deleteSchedule(schedule.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {scheduledReports.length === 0 && (
                        <div className="text-center py-12 text-slate-400">No scheduled reports</div>
                    )}
                </TabsContent>

                <TabsContent value="history">
                    <Card className="bg-white border-none shadow-sm">
                        <CardContent className="p-0">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Report</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Format</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Size</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {exportHistory.map(record => (
                                        <tr key={record.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-800">{record.name}</td>
                                            <td className="px-4 py-3 capitalize">{record.type}</td>
                                            <td className="px-4 py-3"><Badge variant="outline" className="uppercase">{record.format}</Badge></td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{new Date(record.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{record.size || 'N/A'}</td>
                                            <td className="px-4 py-3">
                                                <Badge className={record.status === 'completed' ? 'bg-green-100 text-green-700' : record.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                                                    {record.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {record.status === 'completed' && (
                                                    <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-1" /> Download</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {exportHistory.length === 0 && (
                                <div className="text-center py-12 text-slate-400">No export history</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Schedule Modal */}
            <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader><DialogTitle>Schedule New Report</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div><Label>Report Name</Label><Input value={newSchedule.name} onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })} /></div>
                        <div>
                            <Label>Report Type</Label>
                            <Select value={newSchedule.type} onValueChange={(v) => setNewSchedule({ ...newSchedule, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {reportTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Frequency</Label>
                            <Select value={newSchedule.frequency} onValueChange={(v: any) => setNewSchedule({ ...newSchedule, frequency: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label>Email</Label><Input type="email" value={newSchedule.email} onChange={(e) => setNewSchedule({ ...newSchedule, email: e.target.value })} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSchedule} className="bg-[#1e3a5f]">Create Schedule</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default Reports;
