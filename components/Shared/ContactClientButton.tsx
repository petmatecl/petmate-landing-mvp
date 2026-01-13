import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createNotification } from '../../lib/notifications';

interface Props {
    clientId: string;
    clientName?: string;
    className?: string; // Allow custom styling
    label?: string; // Custom label
}

export default function ContactClientButton({ clientId, clientName, className, label = "Contactar" }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleContact = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push(`/login?redirect=${router.asPath}`);
                return;
            }

            // 1. Check if conversation exists
            // Here 'me' is sitter, target is clientId
            const { data: existing, error: fetchError } = await supabase
                .from('conversations')
                .select('id')
                .eq('sitter_id', user.id) // Me
                .eq('client_id', clientId) // Them
                .single();

            if (existing) {
                router.push(`/mensajes?id=${existing.id}&returnTo=/sitter`);
                return;
            }

            // 2. If not exists, create
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    client_id: clientId,
                    sitter_id: user.id
                })
                .select()
                .single();

            if (createError) {
                if (createError.code === '23505') { // Unique violation retry
                    const { data: retry } = await supabase
                        .from('conversations')
                        .select('id')
                        .eq('sitter_id', user.id)
                        .eq('client_id', clientId)
                        .single();
                    if (retry) {
                        router.push(`/mensajes?id=${retry.id}&returnTo=/sitter`);
                        return;
                    }
                }
                throw createError;
            }

            if (newConv) {
                // [NEW] Notification
                await createNotification({
                    userId: clientId,
                    type: 'message',
                    title: 'Nuevo Mensaje',
                    message: 'Un sitter te ha enviado un mensaje.',
                    link: `/mensajes?id=${newConv.id}`
                });
                router.push(`/mensajes?id=${newConv.id}&returnTo=/sitter`);
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
            className={className || "flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-70 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5"}
            title={clientName ? `Enviar mensaje a ${clientName}` : 'Enviar mensaje'}
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
