import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Props {
    userId: string;
    className?: string; // To position it manually
}

export default function UnreadBadge({ userId, className }: Props) {
    const [count, setCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return;
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
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        fetchUnreadCount();

        // Listen for new messages (INSERT) and read status updates (UPDATE)
        const channel = supabase
            .channel(`public:messages:unread:${userId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        window.addEventListener('messages-read', fetchUnreadCount);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('messages-read', fetchUnreadCount);
        };
    }, [userId, fetchUnreadCount]);

    if (count === 0) return null;

    return (
        <span className={`bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ${className || ''}`}>
            {count > 9 ? '9+' : count}
        </span>
    );
}
