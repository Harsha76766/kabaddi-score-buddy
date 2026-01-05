import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Users, Trophy, Swords, Shield, Settings, BarChart3,
    Activity, FileText, LogOut, LayoutDashboard, Award, Eye, UserCircle, Medal, ClipboardList,
    DollarSign, FileDown, Bell, Ticket, History, ShieldCheck, Code
} from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
}

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: Shield, label: 'Teams', path: '/admin/teams' },
        { icon: UserCircle, label: 'Players', path: '/admin/players' },
        { icon: Trophy, label: 'Tournaments', path: '/admin/tournaments' },
        { icon: Swords, label: 'Matches', path: '/admin/matches' },
        { icon: Activity, label: 'Live Monitor', path: '/admin/live' },
        { icon: ClipboardList, label: 'Event Log', path: '/admin/event-log' },
        { icon: FileText, label: 'Content', path: '/admin/content' },
        { icon: Award, label: 'Rank Engine', path: '/admin/ranks' },
        { icon: Medal, label: 'Achievements', path: '/admin/achievements' },
        { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
        { icon: DollarSign, label: 'Sponsorship', path: '/admin/sponsorship' },
        { icon: FileDown, label: 'Reports', path: '/admin/reports' },
        { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
        { icon: Ticket, label: 'Support', path: '/admin/support' },
        { icon: History, label: 'Audit Logs', path: '/admin/audit-logs' },
        { icon: ShieldCheck, label: 'RBAC', path: '/admin/rbac' },
        { icon: Code, label: 'Developer', path: '/admin/developer' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col fixed h-full">
                {/* Logo */}
                <div className="p-4 flex items-center gap-3 border-b border-white/10">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">KABADDI</h1>
                        <p className="text-xs text-white/60">ADMIN PANEL</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-4 text-sm text-white/70 hover:bg-white/10 hover:text-white border-t border-white/10"
                >
                    <LogOut className="w-5 h-5" />
                    Log Out
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 overflow-auto">
                {/* Top Header */}
                <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-slate-800">{title || 'Admin Panel'}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 hover:bg-slate-100 rounded-full">
                            <Eye className="w-5 h-5 text-slate-600" />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-full relative">
                            <Activity className="w-5 h-5 text-slate-600" />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">3</span>
                        </button>
                        <Avatar className="w-10 h-10 border-2 border-amber-500">
                            <AvatarFallback className="bg-amber-500 text-white">A</AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
