import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Award } from 'lucide-react';

const RankEngine = () => {
    return (
        <AdminLayout title="Rank Engine">
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-12 text-center">
                    <Award className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Rank Engine</h2>
                    <p className="text-slate-500">Coming Soon - Configure XP values and player rankings</p>
                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default RankEngine;
