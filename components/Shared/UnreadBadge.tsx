import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Props {
    userId: string;
    className?: string; // To position it manually if needed, or we enclose it
}

export default function UnreadBadge({ userId, className }: Props) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!userId) return;

        fetchUnreadCount();
        const unsubscribe = subscribeToMessages();

        return () => {
            unsubscribe();
        };
    }, [userId]);

    async function fetchUnreadCount() {
        try {
            const { count: unreadCount, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('read', false)
                .neq('sender_id', userId);

            if (error) throw error;
            setCount(unreadCount || 0);

        } catch (error) {
            console.error('Error fetching unread messages:', error);
        }
    }

    function subscribeToMessages() {
        // Listen for new messages (INSERT) and read status updates (UPDATE)
        const channel = supabase
            .channel(`public:messages:unread:${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                // We could try to be smart and increment/decrement, but fetching count is safer and fast enough for simple badge
                // Optimization: Only refetch if the message involves me (RLS usually handles what we receive, but let's be safe)
                // Actually, if we rely on RLS, we receive events for visible rows.
                fetchUnreadCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }

    if (count === 0) return null;

    return (
        <span className={`bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full border-2 border-white ${className || ''}`}>
            {count > 99 ? '99+' : count}
        </span>
    );
}
