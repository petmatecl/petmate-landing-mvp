import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ChatLayout from '../components/Chat/ChatLayout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MessageSquare, Loader2 } from 'lucide-react';

export default function MensajesPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const returnTo = router.query.returnTo as string;

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            } else {
                router.push('/login?redirect=/mensajes');
            }
            setLoading(false);
        };
        checkUser();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    if (!userId) return null; // Redirecting

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Head>
                <title>Mensajes | Pawnecta</title>
            </Head>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-64px-64px)] flex flex-col">
                <div className="mb-6 shrink-0">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <MessageSquare className="text-emerald-600" size={32} />
                        Mensajes
                    </h1>
                    <p className="text-slate-600 mt-2">
                        Comunícate directamente con tus sitters o clientes.
                    </p>
                </div>

                <div className="flex-1 min-h-0">
                    <ChatLayout
                        userId={userId}
                        initialConversationId={router.query.id as string}
                        returnTo={returnTo}
                    />
                </div>
            </main>
        </div>
    );
}
