import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useClientData } from '../Client/ClientContext';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createNotification } from '../../lib/notifications';

interface Props {
    sitterId: string;
    className?: string; // Allow custom styling
    label?: string; // Custom label
}

export default function ContactSitterButton({ sitterId, className, label = "Contactar" }: Props) {
    const { userId } = useClientData();
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

    return (
        <button
            onClick={handleContact}
            disabled={loading}
            className={className || "flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-70 shadow-sm shadow-emerald-900/10"}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
                <MessageSquare size={18} />
            )}
            {label}
        </button>
    );
}
