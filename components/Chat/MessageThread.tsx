import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Message } from '../../types/chat';
import { Send, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
    conversationId: string;
    userId: string | null;
}

export default function MessageThread({ conversationId, userId }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [otherUser, setOtherUser] = useState<{ nombre: string; apellido_p?: string; foto_perfil?: string } | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationId && userId) {
            fetchConversationDetails();
            fetchMessages();
            const unsubscribe = subscribeToMessages();
            return () => {
                unsubscribe();
            };
        }
    }, [conversationId, userId]);

    async function fetchConversationDetails() {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    client_id,
                    sitter_id,
                    client:registro_petmate!client_id(nombre, apellido_p, foto_perfil),
                    sitter:registro_petmate!sitter_id(nombre, apellido_p, foto_perfil)
                `)
                .eq('id', conversationId)
                .single();

            if (error) throw error;

            const isClient = data.client_id === userId;
            // Supabase sometimes returns arrays for relations depending on schema, safe check
            const clientData = Array.isArray(data.client) ? data.client[0] : data.client;
            const sitterData = Array.isArray(data.sitter) ? data.sitter[0] : data.sitter;

            setOtherUser(isClient ? sitterData : clientData);
        } catch (error) {
            console.error('Error fetching conversation details:', error);
        }
    }

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
        } catch (err) {
            console.error('Error fetching messages:', err);
            toast.error('Error al cargar mensajes');
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
                    // Avoid duplicates if we already added it optimally (check by ID or content/timestamp if ID is temp)
                    // Since optimistic ID is random, and real ID is UUID from DB, they won't match.
                    // We need a way to replace the optimistic one or just ignore the real time event if it matches our optimistic one?
                    // Simpler: Just append. Optimistic UI usually replaces the temp one. 
                    // For now, let's just append the REAL one and filter out the optimistic one if we can identify it, 
                    // OR simpler: don't do full optimistic ID replacement complexity yet, just fast fetch or just append.

                    // Check if message with this ID already exists
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
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
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                <span>Cargando...</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            {otherUser && (
                <div className="p-3 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm z-10">
                    <div className="relative">
                        {otherUser.foto_perfil ? (
                            <img
                                src={otherUser.foto_perfil}
                                alt={otherUser.nombre}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                                <UserIcon size={20} />
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            {otherUser.nombre} {otherUser.apellido_p}
                        </h3>
                    </div>
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
                                <div className="text-center text-[10px] text-slate-400 my-4 uppercase tracking-wider font-bold">
                                    {format(new Date(msg.created_at), 'EEEE d MMMM', { locale: es })}
                                </div>
                            )}
                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm ${isMe
                                        ? 'bg-emerald-600 text-white rounded-tr-none'
                                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                        } ${isTemp ? 'opacity-70' : ''}`}
                                >
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
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

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSend} className="flex gap-2 relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 rounded-full border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-emerald-600 text-white p-3 rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center shrink-0"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
