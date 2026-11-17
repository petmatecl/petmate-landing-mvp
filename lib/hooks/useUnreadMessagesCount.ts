// lib/hooks/useUnreadMessagesCount.ts
// Hook que mantiene el contador de mensajes de chat no leídos del user actual.
//
// Diseño:
//   - Una sola instancia en Header (montado una vez en _app.tsx L108).
//     Desktop dropdown y mobile menu renderean el mismo count — cero
//     duplicación de query ni de Realtime channel.
//   - Filter `client_id OR sitter_id` (RLS-correcto de conversations).
//     NO usa `proveedor_auth_id` como el componente legacy UnreadBadge
//     (borrado en el mismo sprint) — esa columna tiene 2 filas legacy
//     NULL en prod que escapaban del contador. Ver BACKLOG
//     CHAT-SITTER-PROVEEDOR-UNIFICAR para unificación estructural post-launch.
//   - Realtime subscribe INSERT/UPDATE messages: INSERT incrementa count
//     si sender != self; UPDATE recalcula (típicamente cuando el user
//     entra a /mensajes y marca mensajes como leídos).
//   - Listener a evento `messages-read` (window event emitido desde el
//     chat cuando el user abre una conv) resetea count a 0. Mantiene el
//     contrato del legacy UnreadBadge.
//   - userId null/undefined: count queda en 0 (sin query, sin subscribe).

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { runReadQuery, runCountQuery } from '../supabaseReadQuery';

export function useUnreadMessagesCount(userId: string | null | undefined): { count: number } {
    const [count, setCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return;
        const convsResult = await runReadQuery<Array<{ id: string }>>(
            () => supabase
                .from('conversations')
                .select('id')
                .or(`client_id.eq.${userId},sitter_id.eq.${userId}`),
            { subsystem: 'unread_messages_hook', table: 'conversations' },
        );
        if (convsResult.error) return; // preserva count previo
        const convs = convsResult.data ?? [];
        if (convs.length === 0) {
            setCount(0);
            return;
        }
        const convIds = convs.map((c) => c.id);

        const unreadResult = await runCountQuery(
            () => supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .in('conversation_id', convIds)
                .eq('read', false)
                .neq('sender_id', userId),
            { subsystem: 'unread_messages_hook', table: 'messages' },
        );
        if (unreadResult.error) return;
        setCount(unreadResult.count ?? 0);
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setCount(0);
            return;
        }

        fetchUnreadCount();

        const channel = supabase
            .channel(`unread-messages-${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload: { new?: { sender_id?: string } }) => {
                    if (payload.new?.sender_id !== userId) {
                        setCount((prev) => prev + 1);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages' },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        const handleMessagesRead = () => setCount(0);
        window.addEventListener('messages-read', handleMessagesRead);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('messages-read', handleMessagesRead);
        };
    }, [userId, fetchUnreadCount]);

    return { count };
}
