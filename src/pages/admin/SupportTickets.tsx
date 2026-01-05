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
    Ticket, Search, Clock, CheckCircle, AlertCircle, MessageSquare,
    User, Calendar, Tag, Send, X, RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SupportTicket {
    id: string;
    ticket_number: string;
    subject: string;
    description: string;
    user_id: string;
    category: 'bug' | 'feature' | 'account' | 'payment' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
    assigned_to: string;
    created_at: string;
    updated_at: string;
    user?: { username: string; email: string };
    messages?: TicketMessage[];
}

interface TicketMessage {
    id: string;
    ticket_id: string;
    content: string;
    sender_type: 'user' | 'admin';
    sender_id: string;
    created_at: string;
    sender?: { username: string };
}

const SupportTickets = () => {
    const { toast } = useToast();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);

    useEffect(() => {
        fetchTickets();

        const channel = supabase
            .channel('tickets-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchTickets)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchTickets = async () => {
        try {
            // @ts-ignore - table exists but types not regenerated
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`*, user:user_id(username, email)`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets((data as unknown) as SupportTicket[] || []);
        } catch (error: any) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const openTicket = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setDetailModalOpen(true);

        // Fetch messages for this ticket
        // @ts-ignore - table exists but types not regenerated
        const { data: messages } = await supabase
            .from('ticket_messages')
            .select(`*, sender:sender_id(username)`)
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });

        setTicketMessages((messages as unknown) as TicketMessage[] || []);
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyMessage.trim()) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase
                .from('ticket_messages')
                .insert([{
                    ticket_id: selectedTicket.id,
                    content: replyMessage,
                    sender_type: 'admin',
                    sender_id: user?.id,
                }]);

            if (error) throw error;

            // Update ticket updated_at
            // @ts-ignore - table exists but types not regenerated
            await supabase
                .from('support_tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedTicket.id);

            toast({ title: 'Reply Sent' });
            setReplyMessage('');
            openTicket(selectedTicket); // Refresh messages
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const updateStatus = async (ticketId: string, status: SupportTicket['status']) => {
        try {
            // @ts-ignore - table exists but types not regenerated
            const { error } = await supabase
                .from('support_tickets')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            if (error) throw error;

            toast({ title: 'Status Updated', description: `Ticket marked as ${status}` });
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket({ ...selectedTicket, status });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700';
            case 'high': return 'bg-orange-100 text-orange-700';
            case 'medium': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-700';
            case 'in_progress': return 'bg-purple-100 text-purple-700';
            case 'waiting': return 'bg-amber-100 text-amber-700';
            case 'resolved': return 'bg-green-100 text-green-700';
            case 'closed': return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'bug': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'feature': return <Tag className="w-4 h-4 text-blue-500" />;
            case 'account': return <User className="w-4 h-4 text-purple-500" />;
            case 'payment': return <Ticket className="w-4 h-4 text-green-500" />;
            default: return <MessageSquare className="w-4 h-4 text-slate-500" />;
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
    });

    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
    };

    if (loading) {
        return <AdminLayout title="Support Tickets"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Support Tickets">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Tickets</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.open}</p>
                        <p className="text-sm text-slate-500">Open</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-purple-600">{stats.inProgress}</p>
                        <p className="text-sm text-slate-500">In Progress</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
                        <p className="text-sm text-slate-500">Resolved</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search tickets..."
                        className="pl-10 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="waiting">Waiting</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-32 bg-white"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tickets List */}
            <div className="space-y-3">
                {filteredTickets.map(ticket => (
                    <Card key={ticket.id} className={`bg-white border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer ${ticket.priority === 'urgent' ? 'ring-2 ring-red-200' : ''}`} onClick={() => openTicket(ticket)}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                    {getCategoryIcon(ticket.category)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-slate-400">{ticket.ticket_number}</span>
                                        <p className="font-semibold text-slate-800">{ticket.subject}</p>
                                        <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                                        <Badge className={getStatusColor(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticket.user?.username || 'Unknown'}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ticket.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {ticket.status === 'open' && <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredTickets.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No tickets found</p>
                </div>
            )}

            {/* Ticket Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="bg-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    {selectedTicket && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <DialogTitle className="flex items-center gap-2">
                                        <span className="text-slate-400">{selectedTicket.ticket_number}</span>
                                        {selectedTicket.subject}
                                    </DialogTitle>
                                </div>
                            </DialogHeader>

                            <div className="flex items-center gap-2 mb-4">
                                <Badge className={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge>
                                <Badge className={getStatusColor(selectedTicket.status)}>{selectedTicket.status.replace('_', ' ')}</Badge>
                                <Badge variant="outline" className="capitalize">{selectedTicket.category}</Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 pb-4 border-b">
                                <span><User className="w-4 h-4 inline mr-1" />{selectedTicket.user?.username || 'Unknown'}</span>
                                <span>{selectedTicket.user?.email}</span>
                                <span><Clock className="w-4 h-4 inline mr-1" />{new Date(selectedTicket.created_at).toLocaleString()}</span>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-64">
                                {ticketMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender_type === 'admin' ? 'bg-blue-500 text-white' : 'bg-slate-100'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarFallback className={msg.sender_type === 'admin' ? 'bg-blue-700 text-white text-xs' : 'bg-slate-300 text-xs'}>
                                                        {msg.sender_type === 'admin' ? 'A' : 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium">{msg.sender_type === 'admin' ? 'Admin' : (msg.sender?.username || 'User')}</span>
                                                <span className={`text-xs ${msg.sender_type === 'admin' ? 'text-blue-200' : 'text-slate-400'}`}>
                                                    {new Date(msg.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {ticketMessages.length === 0 && (
                                    <div className="text-center py-4 text-slate-400">
                                        <p className="text-sm">No messages yet</p>
                                        {selectedTicket.description && (
                                            <div className="mt-2 bg-slate-50 p-3 rounded-lg text-left">
                                                <p className="text-xs text-slate-500 mb-1">Original Description:</p>
                                                <p className="text-sm text-slate-700">{selectedTicket.description}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Reply */}
                            <div className="flex gap-2">
                                <Textarea
                                    placeholder="Type your reply..."
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    rows={2}
                                    className="flex-1"
                                />
                                <Button onClick={handleReply} className="bg-[#1e3a5f]">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Button variant="outline" size="sm" onClick={() => updateStatus(selectedTicket.id, 'in_progress')}>
                                    <RefreshCw className="w-4 h-4 mr-1" /> In Progress
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => updateStatus(selectedTicket.id, 'waiting')}>
                                    <Clock className="w-4 h-4 mr-1" /> Waiting
                                </Button>
                                <Button variant="outline" size="sm" className="text-green-600" onClick={() => updateStatus(selectedTicket.id, 'resolved')}>
                                    <CheckCircle className="w-4 h-4 mr-1" /> Resolve
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => updateStatus(selectedTicket.id, 'closed')}>
                                    <X className="w-4 h-4 mr-1" /> Close
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default SupportTickets;
