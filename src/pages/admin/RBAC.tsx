import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    Shield, Plus, Trash2, Edit, Users, Key, Save
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    is_system: boolean;
    user_count?: number;
}

interface Permission {
    id: string;
    name: string;
    description: string;
    category: string;
}

const permissions: Permission[] = [
    { id: 'dashboard.view', name: 'View Dashboard', description: 'Access admin dashboard', category: 'Dashboard' },
    { id: 'users.view', name: 'View Users', description: 'View user list and profiles', category: 'Users' },
    { id: 'users.edit', name: 'Edit Users', description: 'Modify user details', category: 'Users' },
    { id: 'users.delete', name: 'Delete Users', description: 'Remove user accounts', category: 'Users' },
    { id: 'users.ban', name: 'Ban Users', description: 'Ban/unban users', category: 'Users' },
    { id: 'matches.view', name: 'View Matches', description: 'View match list', category: 'Matches' },
    { id: 'matches.score', name: 'Score Matches', description: 'Live scoring access', category: 'Matches' },
    { id: 'matches.edit', name: 'Edit Matches', description: 'Modify match details', category: 'Matches' },
    { id: 'matches.delete', name: 'Delete Matches', description: 'Remove matches', category: 'Matches' },
    { id: 'tournaments.view', name: 'View Tournaments', description: 'View tournament list', category: 'Tournaments' },
    { id: 'tournaments.create', name: 'Create Tournaments', description: 'Create new tournaments', category: 'Tournaments' },
    { id: 'tournaments.edit', name: 'Edit Tournaments', description: 'Modify tournament details', category: 'Tournaments' },
    { id: 'content.view', name: 'View Content', description: 'View posts and comments', category: 'Content' },
    { id: 'content.edit', name: 'Edit Content', description: 'Modify posts', category: 'Content' },
    { id: 'content.delete', name: 'Delete Content', description: 'Remove posts', category: 'Content' },
    { id: 'analytics.view', name: 'View Analytics', description: 'Access analytics dashboard', category: 'Analytics' },
    { id: 'settings.view', name: 'View Settings', description: 'View system settings', category: 'Settings' },
    { id: 'settings.edit', name: 'Edit Settings', description: 'Modify system settings', category: 'Settings' },
];

const RBAC = () => {
    const { toast } = useToast();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('roles');

    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [newRole, setNewRole] = useState({
        name: '',
        description: '',
        permissions: [] as string[],
    });

    useEffect(() => {
        fetchRoles();

        const channel = supabase
            .channel('roles-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, fetchRoles)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchRoles = async () => {
        try {
            const { data: rolesData, error } = await supabase
                .from('roles')
                .select('*')
                .order('is_system', { ascending: false });

            if (error) throw error;

            // Get user counts per role
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select('role_id');

            const countMap: Record<string, number> = {};
            userRoles?.forEach(ur => {
                countMap[ur.role_id] = (countMap[ur.role_id] || 0) + 1;
            });

            const enriched = (rolesData || []).map(r => ({
                ...r,
                user_count: countMap[r.id] || 0,
            }));

            setRoles((enriched as unknown) as Role[]);
        } catch (error: any) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async () => {
        try {
            const { error } = await supabase
                .from('roles')
                .insert([{ ...newRole, is_system: false }]);

            if (error) throw error;

            toast({ title: 'Role Created', description: newRole.name });
            setRoleModalOpen(false);
            resetForm();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleUpdateRole = async () => {
        if (!editingRole) return;
        try {
            const { error } = await supabase
                .from('roles')
                .update({ name: newRole.name, description: newRole.description, permissions: newRole.permissions })
                .eq('id', editingRole.id);

            if (error) throw error;

            toast({ title: 'Role Updated' });
            setRoleModalOpen(false);
            resetForm();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleDeleteRole = async (id: string) => {
        const role = roles.find(r => r.id === id);
        if (role?.is_system) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete system roles' });
            return;
        }
        if (!confirm('Delete this role?')) return;

        try {
            const { error } = await supabase.from('roles').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Role Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const openEditRole = (role: Role) => {
        setEditingRole(role);
        setNewRole({
            name: role.name,
            description: role.description || '',
            permissions: role.permissions || [],
        });
        setRoleModalOpen(true);
    };

    const togglePermission = (permId: string) => {
        if (newRole.permissions.includes(permId)) {
            setNewRole({ ...newRole, permissions: newRole.permissions.filter(p => p !== permId) });
        } else {
            setNewRole({ ...newRole, permissions: [...newRole.permissions, permId] });
        }
    };

    const resetForm = () => {
        setEditingRole(null);
        setNewRole({ name: '', description: '', permissions: [] });
    };

    const permissionCategories = [...new Set(permissions.map(p => p.category))];

    if (loading) {
        return <AdminLayout title="RBAC"><div className="p-8 text-center">Loading...</div></AdminLayout>;
    }

    return (
        <AdminLayout title="Role-Based Access Control">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-between items-center mb-6">
                    <TabsList className="bg-white border">
                        <TabsTrigger value="roles">Roles ({roles.length})</TabsTrigger>
                        <TabsTrigger value="permissions">Permissions ({permissions.length})</TabsTrigger>
                    </TabsList>
                    <Button className="bg-[#1e3a5f]" onClick={() => { resetForm(); setRoleModalOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" /> Create Role
                    </Button>
                </div>

                <TabsContent value="roles">
                    <div className="grid grid-cols-2 gap-4">
                        {roles.map(role => (
                            <Card key={role.id} className="bg-white border-none shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.name === 'Super Admin' ? 'bg-red-100' :
                                                role.name === 'Admin' ? 'bg-blue-100' :
                                                    role.name === 'Moderator' ? 'bg-purple-100' : 'bg-slate-100'
                                                }`}>
                                                <Shield className={`w-5 h-5 ${role.name === 'Super Admin' ? 'text-red-600' :
                                                    role.name === 'Admin' ? 'text-blue-600' :
                                                        role.name === 'Moderator' ? 'text-purple-600' : 'text-slate-600'
                                                    }`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-slate-800">{role.name}</p>
                                                    {role.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                                                </div>
                                                <p className="text-sm text-slate-500">{role.description}</p>
                                            </div>
                                        </div>
                                        {!role.is_system && (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openEditRole(role)}>
                                                    <Edit className="w-4 h-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm mb-3">
                                        <span className="flex items-center gap-1 text-slate-500">
                                            <Users className="w-4 h-4" /> {role.user_count || 0} users
                                        </span>
                                        <span className="flex items-center gap-1 text-slate-500">
                                            <Key className="w-4 h-4" /> {role.permissions?.includes('all') ? 'All' : (role.permissions?.length || 0)} permissions
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions?.includes('all') ? (
                                            <Badge className="bg-red-100 text-red-700">All Permissions</Badge>
                                        ) : (
                                            role.permissions?.slice(0, 4).map(perm => (
                                                <Badge key={perm} variant="secondary" className="text-xs">{perm.split('.')[0]}</Badge>
                                            ))
                                        )}
                                        {role.permissions && role.permissions.length > 4 && !role.permissions.includes('all') && (
                                            <Badge variant="outline" className="text-xs">+{role.permissions.length - 4} more</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {roles.length === 0 && (
                        <div className="text-center py-12 text-slate-400">No roles found</div>
                    )}
                </TabsContent>

                <TabsContent value="permissions">
                    <div className="space-y-6">
                        {permissionCategories.map(category => (
                            <Card key={category} className="bg-white border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-slate-800">{category}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        {permissions.filter(p => p.category === category).map(perm => (
                                            <div key={perm.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div>
                                                    <p className="font-medium text-sm text-slate-800">{perm.name}</p>
                                                    <p className="text-xs text-slate-500">{perm.description}</p>
                                                </div>
                                                <Badge variant="outline" className="font-mono text-xs">{perm.id}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Role Modal */}
            <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
                <DialogContent className="bg-white max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Role Name</Label>
                            <Input
                                value={newRole.name}
                                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                placeholder="e.g. Tournament Manager"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Input
                                value={newRole.description}
                                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                placeholder="Brief description of this role"
                            />
                        </div>

                        <div>
                            <Label className="mb-3 block">Permissions</Label>
                            <div className="space-y-4 max-h-60 overflow-y-auto">
                                {permissionCategories.map(category => (
                                    <div key={category}>
                                        <p className="text-sm font-medium text-slate-700 mb-2">{category}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {permissions.filter(p => p.category === category).map(perm => (
                                                <label key={perm.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                                    <Checkbox
                                                        checked={newRole.permissions.includes(perm.id)}
                                                        onCheckedChange={() => togglePermission(perm.id)}
                                                    />
                                                    <span className="text-sm">{perm.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRoleModalOpen(false); resetForm(); }}>Cancel</Button>
                        <Button onClick={editingRole ? handleUpdateRole : handleCreateRole} className="bg-[#1e3a5f]">
                            <Save className="w-4 h-4 mr-2" /> {editingRole ? 'Update' : 'Create'} Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default RBAC;
