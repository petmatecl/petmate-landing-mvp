import Head from 'next/head';
import ChatLayout from '../components/Chat/ChatLayout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import Link from 'next/link';
import { MessageSquare, Loader2, ArrowLeft } from 'lucide-react';

export default function MensajesPage() {
    const router = useRouter();
    const { hasSeekerProfile, providerStatus } = useUser();
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const returnTo = router.query.returnTo as string;

    // "Volver al Panel" / "Volver a mis reservas" destino consciente del rol
    // REAL del usuario (no del toggle removido). Reglas:
    //   - returnTo query param SIEMPRE gana (uso legitimo desde otras paginas
    //     que ya saben a donde volver).
    //   - Proveedor puro (aprobado y SIN perfil tutor) -> /proveedor +
    //     copy "Volver al Panel".
    //   - Cualquier otro caso (tutor puro o dual) -> /mis-reservas + copy
    //     "Volver a mis reservas". El dual tipicamente llega a /mensajes
    //     desde el flujo de tutor (contactar un servicio); el proveedor
    //     cuando revisa una conversacion normalmente entra desde su panel
    //     y ya trae returnTo=/proveedor.
    //
    // Sprint incidente-usuario-fix (2026-09-24): el destino tutor antes era
    // `/usuario`, ruta con redirect 307 server-side en next.config.js pero
    // que en SPA navigation cliente-side (via <Link>) NO respeta el redirect
    // — matchea el dynamic route `pages/[categoria]/index.tsx` con
    // `categoria='usuario'`, getStaticProps devuelve notFound y el hydrate
    // client renderiza CategoryPage con `categoria=undefined` → TypeError
    // sobre `.nombre` (Sentry JAVASCRIPT-NEXTJS-9, release 6774fbd). El
    // tutor NO tiene una "página propia panel" (grep "Mi Panel" solo
    // aparece en pages/proveedor/index.tsx:1382); la ruta más semántica
    // desde chat es /mis-reservas (típicamente el chat arranca de una
    // reserva). Item BACKLOG TUTOR-HOME para el rediseño post-launch del
    // home del tutor.
    const isProveedorPuro = providerStatus === 'aprobado' && !hasSeekerProfile;
    const defaultReturn = isProveedorPuro ? '/proveedor' : '/mis-reservas';
    const returnHref = returnTo || defaultReturn;
    const returnLabel = isProveedorPuro ? 'Volver al Panel' : 'Volver a mis reservas';

    useEffect(() => {
        const checkUser = async () => {
            try {
                const timeout = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT')), 5000)
                );
                const { data: { session } } = await Promise.race([
                    supabase.auth.getSession(),
                    timeout,
                ]) as { data: { session: any } };
                if (session?.user) {
                    setUserId(session.user.id);
                } else {
                    router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
                }
            } catch {
                router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
            } finally {
                setLoading(false);
            }
        };
        checkUser();
    }, [router]);


    if (loading) {
        return (
            <>
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
                </div>
            </>
        );
    }

    if (!userId) return null; // Redirecting

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
            <Head>
                <title>Tus Mensajes — Pawnecta</title>
                <meta name="description" content="Comunícate directamente con proveedores o clientes en Pawnecta." />
            </Head>

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
                <div className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <MessageSquare className="text-accent-600" size={32} />
                            Mensajes
                        </h1>
                        <p className="text-slate-600 mt-2">
                            Comunícate directamente con proveedores o clientes.
                        </p>
                    </div>
                    <div>
                        <Link
                            href={returnHref}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300 rounded-lg text-slate-600 font-medium hover:text-accent-600 hover:border-accent-600 transition-colors shadow-sm"
                        >
                            <ArrowLeft size={18} />
                            {returnLabel}
                        </Link>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <ChatLayout
                        userId={userId}
                        initialConversationId={router.query.id as string}
                        returnTo={returnTo}
                    />
                </div>
            </div>
        </div>
    );
}
