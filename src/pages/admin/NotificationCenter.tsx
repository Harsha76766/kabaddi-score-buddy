import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Bell } from 'lucide-react';

const NotificationCenter = () => {
    return (
        <AdminLayout title="Notification Center">
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-12 text-center">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Notification Center</h2>
                    <p className="text-slate-500">Coming Soon - Send push notifications and manage templates</p>
                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default NotificationCenter;
