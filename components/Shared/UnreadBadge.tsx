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
            // 1. Obtener las conversaciones del usuario (como cliente o proveedor)
            const { data: convs } = await supabase
                .from('conversations')
                .select('id')
                .or(`client_id.eq.${userId},proveedor_auth_id.eq.${userId}`);

            if (!convs || convs.length === 0) {
                setCount(0);
                return;
            }

            const convIds = convs.map((c: any) => c.id);

            // 2. Contar mensajes no leidos en esas conversaciones, enviados por otros
            const { count: unreadCount, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .in('conversation_id', convIds)
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

        // Realtime: escuchar INSERT de nuevos mensajes
        const channel = supabase
            .channel(`unread-messages-${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload: any) => {
                    // Solo incrementar si el sender no es el usuario actual
                    if (payload.new?.sender_id !== userId) {
                        setCount((prev) => prev + 1);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages' },
                () => {
                    // Al marcar como leidos, recalcular
                    fetchUnreadCount();
                }
            )
            .subscribe();

        // Resetear al navegar a /mensajes
        const handleMessagesRead = () => setCount(0);
        window.addEventListener('messages-read', handleMessagesRead);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('messages-read', handleMessagesRead);
        };
    }, [userId, fetchUnreadCount]);

    if (count === 0) return null;

    return (
        <span className={`bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ${className || ''}`}>
            {count > 9 ? '9+' : count}
        </span>
    );
}
