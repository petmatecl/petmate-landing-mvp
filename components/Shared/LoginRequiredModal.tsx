import React from 'react';
import { useRouter } from 'next/router';

interface LoginRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

export default function LoginRequiredModal({
    isOpen,
    onClose,
    title = "Inicia sesión para continuar",
    message = "Necesitas una cuenta para enviar mensajes o dejar una evaluación."
}: LoginRequiredModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>

                <h2 className="text-xl font-bold text-center text-slate-900 mb-2">
                    {title}
                </h2>

                <p className="text-slate-600 text-center mb-6">
                    {message}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => router.push('/ingresar')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                    >
                        Ingresar a mi cuenta
                    </button>
                    <button
                        onClick={() => router.push('/register')}
                        className="w-full bg-white hover:bg-slate-50 text-emerald-700 border-2 border-emerald-600 font-bold py-3 px-4 rounded-xl transition-colors"
                    >
                        Registrarme gratis
                    </button>
                </div>
            </div>
        </div>
    );
}
