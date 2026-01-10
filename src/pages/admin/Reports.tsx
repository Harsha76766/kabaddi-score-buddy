import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const Reports = () => {
    return (
        <AdminLayout title="Reports & Exports">
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Reports & Exports</h2>
                    <p className="text-slate-500">Coming Soon - Generate and schedule reports</p>
                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default Reports;
