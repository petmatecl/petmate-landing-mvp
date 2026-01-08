import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { markNotificationAsRead } from '../../lib/notifications';
import Link from 'next/link';

type Notification = {
    id: string;
    created_at: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    read: boolean;
};

export default function NotificationBell() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // 1. Fetch initial state & subscribe
    useEffect(() => {
        let channel: any;

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            // Fetch existing
            await fetchNotifications(user.id);

            // Subscription
            channel = supabase
                .channel('public:notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newNotif = payload.new as Notification;
                        setNotifications((prev) => [newNotif, ...prev]);
                        setUnreadCount((prev) => prev + 1);
                        // Optional: Play sound or show toast
                    }
                )
                .subscribe();
        };

        init();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const fetchNotifications = async (uid: string) => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.read).length);
        }
    };

    const handleMarkRead = async (id: string) => {
        // Optimistic ID update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        await markNotificationAsRead(id);
    };

    const handleMarkAllRead = async () => {
        const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);

        // Batch update? RLS policy is usually one by one or filter. 
        // Supabase allows update with 'in'.
        await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);
    };

    const handleNotificationClick = async (n: Notification) => {
        if (!n.read) {
            await handleMarkRead(n.id);
        }
        setIsOpen(false);
        if (n.link) {
            router.push(n.link);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop to close */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-900">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                >
                                    <Check size={14} /> Marcar todas leídas
                                </button>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    <p>No tienes notificaciones.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!n.read ? 'bg-emerald-50/30' : ''}`}
                                        >
                                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-emerald-500' : 'bg-transparent'}`} />
                                            <div className="flex-1">
                                                <p className={`text-sm ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-2">
                                                    {new Date(n.created_at).toLocaleString('es-CL')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
                            <Link href="/notificaciones" className="text-xs font-bold text-slate-600 hover:text-emerald-600">
                                Ver todas
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
