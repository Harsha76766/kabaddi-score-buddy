import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    Search, Download, Clock, User, Shield, Edit, Trash2,
    Eye, LogIn, Settings, Database, AlertCircle, CheckCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AuditLog {
    id: string;
    action: string;
    category: 'auth' | 'user' | 'match' | 'tournament' | 'content' | 'settings' | 'system';
    actor_id: string;
    actor_name: string;
    actor_role: string;
    target_type?: string;
    target_id?: string;
    details: string;
    ip_address: string;
    created_at: string;
    status: 'success' | 'failed' | 'warning';
}

const AuditLogs = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('7d');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    useEffect(() => {
        fetchLogs();

        const channel = supabase
            .channel('audit-logs-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [dateFilter]);

    const fetchLogs = async () => {
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            // Apply date filter
            const now = new Date();
            let startDate: Date | null = null;
            switch (dateFilter) {
                case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
                case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
                case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
                case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
            }
            if (startDate) {
                query = query.gte('created_at', startDate.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;
            setLogs((data as unknown) as AuditLog[] || []);
        } catch (error: any) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'auth': return <LogIn className="w-4 h-4 text-blue-500" />;
            case 'user': return <User className="w-4 h-4 text-purple-500" />;
            case 'match': return <Edit className="w-4 h-4 text-green-500" />;
            case 'tournament': return <Shield className="w-4 h-4 text-amber-500" />;
            case 'content': return <Trash2 className="w-4 h-4 text-red-500" />;
            case 'settings': return <Settings className="w-4 h-4 text-slate-500" />;
            case 'system': return <Database className="w-4 h-4 text-blue-500" />;
            default: return <Eye className="w-4 h-4 text-slate-500" />;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
            default: return null;
        }
    };

    const handleExport = () => {
        const csv = [
            ['ID', 'Action', 'Category', 'Actor', 'Role', 'Details', 'IP', 'Timestamp', 'Status'],
            ...filteredLogs.map(l => [l.id, l.action, l.category, l.actor_name, l.actor_role, l.details, l.ip_address, l.created_at, l.status])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast({ title: 'Export Started' });
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.actor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const stats = {
        total: logs.length,
        success: logs.filter(l => l.status === 'success').length,
        failed: logs.filter(l => l.status === 'failed').length,
        warning: logs.filter(l => l.status === 'warning').length,
    };

    if (loading) {
        return <AdminLayout title="Audit Logs"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Audit Logs">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Events</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.success}</p>
                        <p className="text-sm text-slate-500">Successful</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
                        <p className="text-sm text-slate-500">Failed</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">{stats.warning}</p>
                        <p className="text-sm text-slate-500">Warnings</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search actions, actors, details..."
                        className="pl-10 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="auth">Authentication</SelectItem>
                        <SelectItem value="user">User Management</SelectItem>
                        <SelectItem value="match">Match</SelectItem>
                        <SelectItem value="tournament">Tournament</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="settings">Settings</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-32 bg-white"><SelectValue placeholder="Date" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="24h">Last 24h</SelectItem>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                        <SelectItem value="90d">Last 90 Days</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" /> Export
                </Button>
            </div>

            {/* Logs Table */}
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Details</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.map(log => (
                                <tr
                                    key={log.id}
                                    className={`hover:bg-slate-50 cursor-pointer ${log.status === 'failed' ? 'bg-red-50' : log.status === 'warning' ? 'bg-amber-50' : ''}`}
                                    onClick={() => { setSelectedLog(log); setDetailModalOpen(true); }}
                                >
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{log.action}</td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="text-sm text-slate-800">{log.actor_name || 'System'}</p>
                                            <p className="text-xs text-slate-400">{log.actor_role || 'system'}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {getCategoryIcon(log.category)}
                                            <span className="text-sm capitalize">{log.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{log.details}</td>
                                    <td className="px-4 py-3 text-center">{getStatusIcon(log.status)}</td>
                                    <td className="px-4 py-3 text-right text-xs text-slate-500 font-mono">{log.ip_address || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-12 text-slate-400">No audit logs found</div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white">
                    {selectedLog && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {getCategoryIcon(selectedLog.category)}
                                    {selectedLog.action}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500">Actor</p>
                                        <p className="font-medium">{selectedLog.actor_name || 'System'}</p>
                                        <p className="text-xs text-slate-400">{selectedLog.actor_role || 'system'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Timestamp</p>
                                        <p className="font-medium">{new Date(selectedLog.created_at).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">IP Address</p>
                                        <p className="font-mono text-sm">{selectedLog.ip_address || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Status</p>
                                        <div className="flex items-center gap-1">
                                            {getStatusIcon(selectedLog.status)}
                                            <span className="capitalize">{selectedLog.status}</span>
                                        </div>
                                    </div>
                                    {selectedLog.target_type && (
                                        <div>
                                            <p className="text-xs text-slate-500">Target</p>
                                            <p className="font-medium">{selectedLog.target_type}: {selectedLog.target_id}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 mb-1">Details</p>
                                    <p className="text-sm">{selectedLog.details}</p>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default AuditLogs;
