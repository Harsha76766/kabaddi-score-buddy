import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

const AuditLogs = () => {
    return (
        <AdminLayout title="Audit Logs">
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-12 text-center">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Audit Logs</h2>
                    <p className="text-slate-500">Coming Soon - Track all admin actions and system events</p>
                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default AuditLogs;
