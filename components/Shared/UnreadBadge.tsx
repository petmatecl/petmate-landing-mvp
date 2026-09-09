import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { runReadQuery, runCountQuery } from '../../lib/supabaseReadQuery';

interface Props {
    userId: string;
    className?: string; // To position it manually
}

export default function UnreadBadge({ userId, className }: Props) {
    const [count, setCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return;
        // Sprint tipo-b lote 5 (2026-09-09) — silent + log Sentry via
        // runReadQuery / runCountQuery. UnreadBadge es icono monocromo
        // (círculo con "3") en el header sin espacio para banner ni
        // compacto "—" — ademas devolver null en fallo mantiene el
        // count previo (no lo pisamos a 0 si la query falló). Cuando
        // count = 0 el componente renderiza null (guard L82) → no
        // afirma ausencia visualmente ("no tienes mensajes" no se
        // muestra; simplemente el badge no aparece).
        const convsResult = await runReadQuery<any[]>(
            () => supabase
                .from('conversations')
                .select('id')
                .or(`client_id.eq.${userId},proveedor_auth_id.eq.${userId}`),
            { subsystem: 'unread_badge', table: 'conversations' },
        );
        if (convsResult.error) return; // preserva count previo, log ya emitido
        const convs = convsResult.data ?? [];
        if (convs.length === 0) {
            setCount(0);
            return;
        }
        const convIds = convs.map((c: any) => c.id);

        // 2. Contar mensajes no leidos en esas conversaciones, enviados por otros
        const unreadResult = await runCountQuery(
            () => supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .in('conversation_id', convIds)
                .eq('read', false)
                .neq('sender_id', userId),
            { subsystem: 'unread_badge', table: 'messages' },
        );
        if (unreadResult.error) return;
        setCount(unreadResult.count ?? 0);
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

    // danger token por unificación de paleta del rojo de UI. Semánticamente
    // es indicador de NO-LEÍDO (notificación), no error/peligro. Si a futuro
    // se quiere separar, crear token 'notification' en tailwind.config.js.
    return (
        <span className={`bg-danger-500 text-white text-[10px] font-semibold flex items-center justify-center rounded-full ${className || ''}`}>
            {count > 9 ? '9+' : count}
        </span>
    );
}
