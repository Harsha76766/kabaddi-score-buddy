import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const RBAC = () => {
    return (
        <AdminLayout title="Role-Based Access Control">
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-12 text-center">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Role-Based Access Control</h2>
                    <p className="text-slate-500">Coming Soon - Manage roles and permissions</p>
                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default RBAC;
