import React, { useState } from 'react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
    userId: string | null;
    initialConversationId?: string;
    returnTo?: string;
    onBack?: () => void;
    initialClientUserId?: string | null;
}

export default function ChatLayout({ userId, initialConversationId, returnTo, onBack, initialClientUserId }: Props) {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId || null);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    React.useEffect(() => {
        if (initialConversationId) {
            setSelectedConversationId(initialConversationId);
        }
    }, [initialConversationId]);

    const handleBack = () => {
        setSelectedConversationId(null);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex h-[600px] max-h-[80vh]">

            {/* Sidebar List */}
            <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare size={18} className="text-emerald-600" />
                        Mensajes
                    </h2>
                    {(onBack || returnTo) && (
                        onBack ? (
                            <button onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1">
                                <ArrowLeft size={14} /> Volver
                            </button>
                        ) : (
                            <Link href={returnTo!} className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1">
                                <ArrowLeft size={14} /> Volver
                            </Link>
                        )
                    )}
                </div>
                <ConversationList
                    selectedId={selectedConversationId}
                    onSelect={setSelectedConversationId}
                    userId={userId}
                    targetUserId={initialClientUserId}
                />
            </div>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                {selectedConversationId ? (
                    <>
                        {/* Mobile Header */}
                        <div className="md:hidden p-3 border-b border-slate-100 flex items-center gap-2 bg-white">
                            <button onClick={handleBack} className="text-slate-500 hover:text-slate-900 p-1">
                                ← Volver
                            </button>
                        </div>
                        <MessageThread conversationId={selectedConversationId} userId={userId} />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 p-8 text-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 animate-bounce-slow">
                            <MessageSquare size={40} className="text-emerald-200" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Tus Mensajes</h3>
                        <p className="max-w-xs mx-auto">Selecciona una conversación de la izquierda para ver los mensajes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
