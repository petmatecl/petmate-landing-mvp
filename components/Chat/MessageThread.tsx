import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Message } from '../../types/chat';
import { createNotification } from '../../lib/notifications';
import { getParticipantProfile } from '../../lib/profileUtils';
import { Send, User as UserIcon, PawPrint } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useOnlineStatus } from '../../components/Shared/OnlineStatusProvider';
import { getProxyImageUrl } from '../../lib/utils';

interface Props {
    conversationId: string;
    userId: string | null;
}

export default function MessageThread({ conversationId, userId }: Props) {
    const { onlineUsers } = useOnlineStatus();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [otherUser, setOtherUser] = useState<{ auth_user_id: string; nombre: string; apellido_p?: string; foto_perfil?: string; email?: string } | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const [myUser, setMyUser] = useState<{ nombre: string } | null>(null);
    const [fetchError, setFetchError] = useState(false);
    // Vinculo chat-agendamiento (modelo b): si la conv esta linkeada a un
    // agendamiento y ese agendamiento tiene mascota_id, mostramos chip
    // compacto con nombre+tipo+foto (contexto de la solicitud, valor
    // principalmente para el proveedor).
    const [mascotaChip, setMascotaChip] = useState<{ nombre: string; tipo: string; foto_mascota: string | null } | null>(null);

    useEffect(() => {
        if (conversationId && userId) {
            fetchConversationDetails();
            fetchMessages();
            const unsubscribe = subscribeToMessages();
            return () => {
                unsubscribe();
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, userId]);

    async function fetchConversationDetails() {
        try {
            // Join extendido: agendamiento vinculado + su mascota (si hay).
            // El chip solo aparece si ambos IDs estan set — cero ruido si el
            // vinculo no existe o el agendamiento no tenia mascota.
            // RLS coverage:
            //   - Tutor: agendamientos_tutor_select le da acceso a su
            //     agendamiento; Mascotas Visibility a su mascota.
            //   - Proveedor: agendamientos_proveedor_select le da acceso al
            //     agendamiento que va a sus servicios; la policy
            //     "proveedor_select_mascotas_de_solicitudes" (en prod) /
            //     "Mascotas Proveedor via Agendamientos" (en staging) le da
            //     acceso a la mascota via el join.
            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    client_id, sitter_id,
                    agendamiento:agendamientos!conversations_agendamiento_id_fkey(
                        id,
                        mascota:mascotas!agendamientos_mascota_id_fkey(nombre, tipo, foto_mascota)
                    )
                `)
                .eq('id', conversationId)
                .single();

            if (error) throw error;

            const clientProfile = await getParticipantProfile(data.client_id);
            const sitterProfile = await getParticipantProfile(data.sitter_id);

            if (data.client_id === userId) {
                setOtherUser(sitterProfile);
                setMyUser(clientProfile);
            } else {
                setOtherUser(clientProfile);
                setMyUser(sitterProfile);
            }

            // El join devuelve un objeto (o array segun Supabase) para relaciones
            // 1-a-1. Defensivo: aceptamos ambos shapes.
            const agend: any = Array.isArray((data as any).agendamiento)
                ? (data as any).agendamiento[0]
                : (data as any).agendamiento;
            const mascota: any = agend?.mascota
                ? (Array.isArray(agend.mascota) ? agend.mascota[0] : agend.mascota)
                : null;
            if (mascota?.nombre && mascota?.tipo) {
                setMascotaChip({
                    nombre: mascota.nombre,
                    tipo: mascota.tipo,
                    foto_mascota: mascota.foto_mascota ?? null,
                });
            } else {
                setMascotaChip(null);
            }
        } catch (error) {
            console.error('Error fetching conversation details:', error);
        }
    }

    // Scroll to bottom on new messages.
    // `block: 'nearest'` es CLAVE: sin ese hint el default 'start' hace que el
    // browser scrollee la PAGINA para alinear el target al top del viewport,
    // arrastrando el panel entero hasta el footer cuando el chat esta embebido
    // (bug reportado en /proveedor tab Mensajes). Con 'nearest' solo se
    // scrollea el container interno que efectivamente tiene overflow, sin
    // propagar al viewport. En /mensajes standalone tambien funciona: el chat
    // ocupa la vista y el nearest scroll interno hace lo mismo que hacia el
    // default.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages]);

    const markAsRead = async () => {
        if (!userId || !conversationId) return;

        const { error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId)
            .eq('read', false);

        if (!error) {
            window.dispatchEvent(new Event('messages-read'));
        } else {
            console.error('Error marking messages as read:', error);
        }
    };

    async function fetchMessages() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data as Message[]);

            // Mark unread messages as read
            if (userId && data) {
                const hasUnread = (data as Message[]).some(m => !m.read && m.sender_id !== userId);
                if (hasUnread) {
                    markAsRead();
                }

                // [NEW] Also Mark related Notification as read
                // We use the link as a unique identifier for the conversation notification
                supabase.from('notifications')
                    .update({ read: true })
                    .eq('user_id', userId)
                    .eq('link', `/mensajes?id=${conversationId}`)
                    .then(({ error }) => {
                        if (error) console.error("Error clearing notifications:", error);
                    });
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }

    function subscribeToMessages() {
        const channel = supabase
            .channel(`public:messages:${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                const newMsg = payload.new as Message;
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });

                // Mark as read if it's from the other person
                if (userId && newMsg.sender_id !== userId && !newMsg.read) {
                    markAsRead();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !userId) return;

        const content = newMessage.trim();
        setNewMessage(''); // Clear input immediately

        // Optimistic Update
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: conversationId,
            sender_id: userId,
            content,
            created_at: new Date().toISOString(),
            read: false
        };

        // Add temp message
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: userId,
                    content
                })
                .select()
                .single();

            if (error) throw error;

            if (error) throw error;

            // [REMOVED] Manual Notification (Handled by DB Trigger now)
            // if (otherUser) {
            //     createNotification({...})
            // }

            // [NEW] Send Email Notification to Recipient
            // Check if user is offline or just send always? For MVP send always or if we had online status.
            // Using onlineUsers from context:
            const isRecipientOnline = otherUser && onlineUsers.has(otherUser.auth_user_id);

            // Sweep 1bc1897: payload pasa a id-only. El server resuelve
            // recipient, sender_name y content desde BD. Bearer del user
            // logueado para verifySession + ownership check (sender ===
            // caller).
            if (otherUser?.auth_user_id && !isRecipientOnline && data?.id) {
                (async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.access_token) return;
                    fetch('/api/notifications/new-message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ messageId: data.id }),
                    }).catch(console.error);
                })();
            }

            // Notificacion interna para el destinatario
            if (otherUser?.auth_user_id) {
                createNotification({
                    userId: otherUser.auth_user_id,
                    type: 'message',
                    title: 'Nuevo mensaje',
                    message: `${myUser?.nombre || 'Un usuario'} te envió un mensaje`,
                    link: `/mensajes?id=${conversationId}`,
                }).catch(console.error);

                // Sweep #2 finding [86]: el fetch a /api/push/send fue
                // removido. El endpoint valida verifyInternalSecret (S2S) y
                // siempre respondia 403 desde browser — feature muerta que
                // solo ensuciaba Vercel logs con 403s. La activacion real de
                // push notifications requiere migrar push/send al patron
                // id-only (bearer + resolver recipient via relacion). Ver
                // CLAUDE.md > backlog > "Migrar /api/push/send al patron
                // id-only al activar NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS".
            }

            // Replace optimistic message with real one
            if (data) {
                setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
            }

        } catch (err) {
            console.error('Error sending message:', err);
            toast.error('No se pudo enviar el mensaje.');
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setNewMessage(content); // Restore text
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="flex flex-col items-center gap-2">
                <span className="w-4 h-4 border-2 border-accent-600 border-t-transparent rounded-full animate-spin"></span>
                <span>Cargando...</span>
            </div>
        </div>
    );

    if (fetchError) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <p className="text-slate-500 text-sm mb-3">No se pudieron cargar los mensajes.</p>
                <button
                    onClick={() => { setFetchError(false); fetchMessages(); }}
                    className="text-sm text-accent-700 font-medium hover:underline"
                >
                    Reintentar
                </button>
            </div>
        </div>
    );

    const isOnline = otherUser && onlineUsers.has(otherUser.auth_user_id);

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            {otherUser && (
                <div className="p-3 bg-white border-b border-slate-300 flex items-center gap-3 shadow-sm z-10">
                    <div className="relative">
                        {otherUser.foto_perfil ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={getProxyImageUrl(otherUser.foto_perfil) || ''}
                                alt={otherUser.nombre}
                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-300"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-300 text-slate-400">
                                <UserIcon size={20} />
                            </div>
                        )}
                        {/* Online Indicator Dot — token success (presencia positiva de
                            disponibilidad). Reunido con el resto de indicadores de presencia
                            del chat (texto abajo + dot footer L381) en el mismo token para
                            que "online" use una sola familia en toda la vista. */}
                        {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 border-2 border-white rounded-full"></div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm">
                            {otherUser.nombre} {otherUser.apellido_p}
                        </h3>
                        {/* Par PRESENCIA (online-success / offline-slate) — online es estado
                            positivo de disponibilidad (facilita la conversacion); offline es
                            slate porque "sin color activo", no es negativo. */}
                        {isOnline ? (
                            <span className="text-[10px] font-medium text-success-700 animate-pulse">
                                ● En línea
                            </span>
                        ) : (
                            <span className="text-[10px] text-slate-400">
                                Desconectado
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Chip de mascota vinculada (modelo b, punto 3).
                Solo aparece si la conv tiene agendamiento_id Y ese agendamiento
                tiene mascota_id — cero ruido para chats sin vinculo. Valor
                principal para el proveedor: contexto de que mascota es la
                solicitud, sin abrir el panel. Layout: banda compacta bajo el
                header, mini-foto + nombre + tipo. Estatico (no clickeable).
                Si el proveedor quiere mas contexto (raza, edad, condiciones,
                galeria) abre la ficha en su panel de solicitudes. */}
            {mascotaChip && (
                <div className="px-3 py-2 bg-accent-50/60 border-b border-accent-100 flex items-center gap-2 text-xs">
                    {mascotaChip.foto_mascota ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={mascotaChip.foto_mascota}
                            alt={mascotaChip.nombre}
                            className="w-6 h-6 rounded-lg object-cover shrink-0"
                        />
                    ) : (
                        <span className="w-6 h-6 rounded-lg bg-accent-100 flex items-center justify-center text-accent-700 shrink-0">
                            <PawPrint size={12} />
                        </span>
                    )}
                    <span className="font-medium text-accent-800 truncate">{mascotaChip.nombre}</span>
                    <span className="text-slate-500">
                        · {mascotaChip.tipo.charAt(0).toUpperCase() + mascotaChip.tipo.slice(1)}
                    </span>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === userId;
                    const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString();
                    const isTemp = msg.id.startsWith('temp-');

                    return (
                        <div key={msg.id}>
                            {showDate && (
                                <div className="text-center text-[10px] text-slate-400 my-4 uppercase tracking-widest font-medium">
                                    {format(new Date(msg.created_at), 'EEEE d MMMM', { locale: es })}
                                </div>
                            )}
                            {/* Par IDENTIDAD de mensaje (mio-accent / otros-slate). NO es semantica
                                de estado — es identidad de emisor: "mi color" en la conversacion. Por
                                eso va a accent (marca de la app en tanto yo soy el actor autenticado),
                                NO a success (una burbuja mia no es un estado positivo). Slate del otro
                                = neutro, "sin color de identidad". Timestamp interior tambien pareja
                                (accent-200 dentro burbuja dark vs slate-400 sobre blanca).

                                CAMBIO VISUAL menor confirmado en el sprint: emerald-700 (#047857) →
                                accent-700 (#15803D) — hex distinto, mismo rol semantico de identidad. */}
                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm ${isMe
                                        ? 'bg-accent-700 text-white rounded-tr-none'
                                        : 'bg-white text-slate-700 rounded-tl-none border-2 border-slate-300'
                                        } ${isTemp ? 'opacity-70' : ''}`}
                                >
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isMe ? 'text-accent-200' : 'text-slate-400'}`}>
                                        {format(new Date(msg.created_at), 'HH:mm')}
                                        {isTemp && <span className="animate-pulse">...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-50">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <Send size={24} className="ml-1" />
                        </div>
                        <p className="text-sm">Envía un mensaje para iniciar la conversación.</p>
                    </div>
                )}
            </div>

            {/* Typing / Online indicator */}
            {/* Par PRESENCIA (online-success / offline-slate) — dot + texto siempre visibles
                segun onlineUsers.has(). Este dot es DIFERENTE del dot del avatar (L299): aquel
                queda solo cuando isOnline, este par tiene contraparte offline visible. Ambos
                reunidos en la familia success para que "online" use una sola familia en todo
                el chat. */}
            {otherUser && (
              <div className="px-4 py-1.5 text-xs text-slate-400 bg-white border-t border-slate-100">
                {onlineUsers.has(otherUser.auth_user_id) ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success-500 inline-block" />
                    {otherUser.nombre} en línea
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                    {otherUser.nombre} desconectado
                  </span>
                )}
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-300">
                <form onSubmit={handleSend} className="flex gap-2 relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 rounded-full border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:ring-accent-600 focus:border-accent-600 transition-shadow outline-none"
                        maxLength={1000}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-accent-600 text-white p-3 rounded-full hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-600/20 active:scale-95 flex items-center justify-center shrink-0"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
