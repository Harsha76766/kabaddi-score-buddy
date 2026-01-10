import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Search, Trash2, Eye, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ManageTeams = () => {
    const { toast } = useToast();
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTeams(data || []);
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this team and remove all players?')) return;

        try {
            await supabase.from('players').delete().eq('team_id', id);
            const { error } = await supabase.from('teams').delete().eq('id', id);
            if (error) throw error;

            setTeams(teams.filter(t => t.id !== id));
            toast({ title: 'Success', description: 'Team deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const filteredTeams = teams.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.captain_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="Team Management">
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{teams.length}</p>
                        <p className="text-sm text-slate-500">Total Teams</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{teams.length}</p>
                        <p className="text-sm text-slate-500">Active</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search teams by name or captain..."
                        className="pl-10 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-3 flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    filteredTeams.map(team => (
                        <Card key={team.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={team.logo_url || ''} />
                                            <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                                                {team.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-slate-800">{team.name}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                    <Users className="w-4 h-4" />
                                    <span>Captain: {team.captain_name}</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1">
                                        <Eye className="w-4 h-4 mr-1" /> View
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(team.id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </AdminLayout>
    );
};

export default ManageTeams;
