import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Conversation } from '../../types/chat';
import { User, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
    selectedId: string | null;
    onSelect: (id: string) => void;
    userId: string | null;
    targetUserId?: string | null | undefined;
}

export default function ConversationList({ selectedId, onSelect, userId, targetUserId }: Props) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) fetchConversations();
    }, [userId]);

    // Realtime subscription for conversation updates
    useEffect(() => {
        if (!userId) return;

        const channel = supabase.channel('public:conversations');

        // Listen as Client
        channel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `client_id=eq.${userId}`
        }, () => fetchConversations());

        // Listen as Sitter
        channel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `sitter_id=eq.${userId}`
        }, () => fetchConversations());

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);


    async function fetchConversations() {
        try {
            setLoading(true);
            // 1. Fetch Conversations without join (to avoid FK issues)
            const { data: conversationsData, error } = await supabase
                .from('conversations')
                .select(`
                    id,
                    client_id,
                    sitter_id,
                    updated_at
                `)
                .or(`client_id.eq.${userId},sitter_id.eq.${userId}`)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            // 2. Gather all unique user IDs involved (excluding self)
            const otherUserIds = Array.from(new Set(conversationsData.map((c: any) => {
                return c.client_id === userId ? c.sitter_id : c.client_id;
            })));

            // 3. Fetch Profiles for these users
            const { data: profiles, error: profilesError } = await supabase
                .from('registro_petmate')
                .select('auth_user_id, nombre, apellido_p, foto_perfil')
                .in('auth_user_id', otherUserIds);

            if (profilesError) throw profilesError;

            // 4. Create a map for easy lookup
            const profilesMap = new Map();
            profiles?.forEach((p: any) => profilesMap.set(p.auth_user_id, p));

            // 5. Merge data
            const formatted = conversationsData.map((c: any) => {
                const isClient = c.client_id === userId;
                const otherId = isClient ? c.sitter_id : c.client_id;
                const otherProfile = profilesMap.get(otherId) || {};

                return {
                    ...c,
                    // Mock structure expected by render
                    client: isClient ? {} : otherProfile,
                    sitter: isClient ? otherProfile : {},
                    otherUser: otherProfile
                };
            });

            setConversations(formatted);

            // Auto-select if targetUserId is present
            if (targetUserId) {
                const targetConv = formatted.find((c: any) =>
                    c.otherUser?.auth_user_id === targetUserId
                );
                if (targetConv) {
                    onSelect(targetConv.id);
                } else {
                    // Optional: If conversation doesn't exist, we might want to create it or signal "New Chat".
                    // For now, let's just leave it unselected or implementation-dependent.
                    // Ideally, we start a new thread if not found, but that requires more logic.
                    console.log("Conversation not found for target user", targetUserId);
                }
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-12 h-12 bg-slate-100 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-100 w-3/4 rounded" />
                            <div className="h-3 bg-slate-100 w-1/2 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle size={24} className="text-slate-300" />
                </div>
                <p className="text-sm">No tienes mensajes aún.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {conversations.map((conv: any) => {
                const other = conv.otherUser;
                const date = new Date(conv.updated_at);
                const isActive = selectedId === conv.id;

                return (
                    <button
                        key={conv.id}
                        onClick={() => onSelect(conv.id)}
                        className={`flex items-center gap-3 p-4 border-b border-slate-50 transition-colors text-left hover:bg-slate-50 ${isActive ? 'bg-emerald-50/50 border-emerald-100' : ''}`}
                    >
                        {/* Avatar */}
                        <div className="relative">
                            {other?.foto_perfil ? (
                                <img
                                    src={other.foto_perfil}
                                    alt={other.nombre}
                                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                                    <User size={20} />
                                </div>
                            )}
                            {/* Online Status (Mock for now) */}
                            {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div> */}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className={`text-sm font-bold truncate ${isActive ? 'text-emerald-900' : 'text-slate-900'}`}>
                                    {other?.nombre} {other?.apellido_p}
                                </h4>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                    {format(date, 'dd MMM', { locale: es })}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                                {/* Last message preview could go here if we fetched it */}
                                Ver conversación...
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
