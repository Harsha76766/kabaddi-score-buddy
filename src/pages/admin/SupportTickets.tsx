import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Ticket } from 'lucide-react';

const SupportTickets = () => {
    return (
        <AdminLayout title="Support Tickets">
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-12 text-center">
                    <Ticket className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Support Tickets</h2>
                    <p className="text-slate-500">Coming Soon - Manage user support requests</p>
                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default SupportTickets;
