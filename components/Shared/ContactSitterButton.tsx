import React, { useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import ClientContext from '../Client/ClientContext'; // Import Context directly
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createNotification } from '../../lib/notifications';

interface Props {
    sitterId: string;
    className?: string; // Allow custom styling
    label?: React.ReactNode; // Custom label (string or element)
    currentUserId?: string | null; // Optional prop to override/provide context
}

export default function ContactSitterButton({ sitterId, className, label = "Contactar", currentUserId }: Props) {
    const clientContext = useContext(ClientContext);
    // Use prop if provided, otherwise fallback to context (safely)
    const userId = currentUserId ?? clientContext?.userId ?? null;

    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleContact = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent parent clicks (e.g. card)

        if (!userId) {
            router.push(`/login?redirect=${router.asPath}`);
            return;
        }

        try {
            setLoading(true);

            // 1. Check if conversation conversation exists
            // We assume 'me' is client and 'sitterId' is sitter for this specific button.
            // But we should also check if flipped exists just in case?
            // For now, consistent logic: If I click "Contact Sitter", I am acting as client.

            // Check existing
            const { data: existing, error: fetchError } = await supabase
                .from('conversations')
                .select('id')
                .eq('client_id', userId)
                .eq('sitter_id', sitterId)
                .single(); // Should satisfy unique constraint

            if (existing) {
                router.push(`/mensajes?id=${existing.id}&returnTo=/usuario`);
                return;
            }

            // 2. If not exists, create
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    client_id: userId,
                    sitter_id: sitterId
                })
                .select()
                .single();

            if (createError) {
                // If unique violation race condition, try fetching again
                if (createError.code === '23505') { // Unique violation
                    const { data: retry } = await supabase
                        .from('conversations')
                        .select('id')
                        .eq('client_id', userId)
                        .eq('sitter_id', sitterId)
                        .single();
                    if (retry) {
                        router.push(`/mensajes?id=${retry.id}&returnTo=/usuario`);
                        return;
                    }
                }
                throw createError;
            }

            if (newConv) {
                // [NEW] Notification
                await createNotification({
                    userId: sitterId, // Assuming sitterId is target
                    type: 'message',
                    title: 'Nuevo Mensaje',
                    message: 'Un usuario ha iniciado una conversación contigo.',
                    link: `/mensajes?id=${newConv.id}` // Link to chat
                });

                router.push(`/mensajes?id=${newConv.id}&returnTo=/usuario`);
            }

        } catch (error) {
            console.error('Error initiating chat:', error);
            toast.error('No pudimos iniciar el chat. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    // Unread Count Logic
    const [unreadCount, setUnreadCount] = useState(0);

    React.useEffect(() => {
        if (!userId || !sitterId) return;

        fetchUnreadCount();

        // Subscribe to changes
        const channel = supabase
            .channel(`public:messages:unread:${userId}:${sitterId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}` // Optimization: only if received
            }, () => {
                fetchUnreadCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, sitterId]);

    const fetchUnreadCount = async () => {
        try {
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('read', false)
                .eq('receiver_id', userId)
                .eq('sender_id', sitterId);

            if (!error) {
                setUnreadCount(count || 0);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <button
            onClick={handleContact}
            disabled={loading}
            className={`relative ${className || "flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-lg font-bold hover:bg-emerald-100 transition-colors disabled:opacity-70"}`}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
                <MessageSquare size={18} />
            )}
            {label}

            {/* Badge */}
            {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
}
