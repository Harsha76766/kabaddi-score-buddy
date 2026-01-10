import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';

const Achievements = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Achievements</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Achievements feature coming soon. Database tables need to be created first.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Achievements;
