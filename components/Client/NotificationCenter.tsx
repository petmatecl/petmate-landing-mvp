import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Bell, Check, Trash2, X } from 'lucide-react';

type Notification = {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
};

type Props = {
    userId: string;
};

export default function NotificationCenter({ userId }: Props) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error fetching notifications:', error);
        } else {
            setNotifications(data || []);
        }
        setLoading(false);
    };

    // Derived state for unread count
    useEffect(() => {
        setUnreadCount(notifications.filter(n => !n.read).length);
    }, [notifications]);

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) {
            // Revert if error (optional, but good practice)
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);

        if (error) console.error(error);
    };

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) console.error(error);
    };

    useEffect(() => {
        if (userId) {
            fetchNotifications();

            // Realtime subscription
            const subscription = supabase
                .channel('notifications_channel')
                .on('postgres_changes', {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newNotif = payload.new as Notification;
                        setNotifications(prev => [newNotif, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedNotif = payload.new as Notification;
                        setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id; // Usually only id is available in old for DELETE
                        setNotifications(prev => prev.filter(n => n.id !== deletedId));
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [userId]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white"></span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border-2 border-slate-300 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-slate-300 flex justify-between items-center bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                                    <Check size={12} /> Marcar todo
                                </button>
                            )}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-xs text-slate-400">Cargando...</div>
                            ) : notifications.length > 0 ? (
                                <ul>
                                    {notifications.map(notif => (
                                        <li
                                            key={notif.id}
                                            className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group flex gap-3 ${!notif.read ? 'bg-emerald-50/50' : ''}`}
                                            onClick={() => markAsRead(notif.id)}
                                        >
                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.read ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                                            <div className="flex-1">
                                                <p className={`text-xs ${!notif.read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                                                    {notif.message}
                                                </p>
                                                <span className="text-[10px] text-slate-400 block mt-1">
                                                    {new Date(notif.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => deleteNotification(notif.id, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-8 text-center">
                                    <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs text-slate-500">No tienes notificaciones nuevas.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
