import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, Trophy, Swords, Star, Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'match' | 'tournament' | 'achievement' | 'team';
    is_read: boolean;
    created_at: string;
    link?: string;
}

interface NotificationSheetProps {
    trigger: React.ReactNode;
}

export const NotificationSheet = ({ trigger }: NotificationSheetProps) => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // No user - show empty
                setNotifications([]);
                return;
            }

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('target_audience', 'all')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (data && data.length > 0) {
                setNotifications(data.map(n => ({
                    id: n.id,
                    title: n.title,
                    message: n.message || n.body,
                    type: n.type as Notification['type'],
                    is_read: n.status === 'read',
                    created_at: n.created_at,
                })));
            } else {
                // No notifications - show empty state (no mock data)
                setNotifications([]);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const getMockNotifications = (): Notification[] => [
        {
            id: '1',
            title: 'Match Started!',
            message: 'Warriors vs Eagles is now LIVE. Watch now!',
            type: 'match',
            is_read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            link: '/matches'
        },
        {
            id: '2',
            title: 'New Achievement',
            message: 'You unlocked "First Super Raid" badge! 🏅',
            type: 'achievement',
            is_read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            link: '/profile'
        },
        {
            id: '3',
            title: 'Tournament Registration',
            message: 'Mumbai Summer League registration closes in 2 days.',
            type: 'tournament',
            is_read: true,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            link: '/tournaments'
        },
        {
            id: '4',
            title: 'Team Invite',
            message: 'You have been invited to join "Thunder Squad"',
            type: 'team',
            is_read: true,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            link: '/teams'
        }
    ];

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'match': return <Swords className="w-4 h-4 text-orange-500" />;
            case 'tournament': return <Trophy className="w-4 h-4 text-yellow-500" />;
            case 'achievement': return <Star className="w-4 h-4 text-purple-500 fill-current" />;
            case 'team': return <Users className="w-4 h-4 text-blue-500" />;
            default: return <Bell className="w-4 h-4 text-slate-400" />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        setOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] p-0">
                <SheetHeader className="p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-left text-lg font-black uppercase tracking-tight flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-black rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </SheetTitle>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:opacity-70 transition-opacity flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>
                </SheetHeader>

                <div className="overflow-y-auto max-h-[calc(100vh-100px)]">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {notifications.map(notification => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        "w-full flex items-start gap-4 p-5 text-left transition-all hover:bg-slate-50",
                                        !notification.is_read && "bg-orange-50/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                                        !notification.is_read ? "bg-orange-100" : "bg-slate-100"
                                    )}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn(
                                                "text-xs uppercase tracking-tight truncate",
                                                !notification.is_read ? "font-black text-slate-900" : "font-bold text-slate-600"
                                            )}>
                                                {notification.title}
                                            </p>
                                            {!notification.is_read && (
                                                <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-2">{notification.message}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 px-6">
                            <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-sm font-black uppercase text-slate-400">No notifications</p>
                            <p className="text-[10px] text-slate-400 mt-1">You're all caught up!</p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
