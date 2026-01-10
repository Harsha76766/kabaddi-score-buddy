import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

const Sponsorship = () => {
    return (
        <AdminLayout title="Sponsorship & Banners">
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-12 text-center">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Sponsorship & Banners</h2>
                    <p className="text-slate-500">Coming Soon - Manage sponsors and banner ads</p>
                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default Sponsorship;
