import React, { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { Loader2, Search, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { COMUNAS_CHILE, filtrarComunasPorTermino } from '../lib/comunas';
import { resetInactivityTimer } from '../lib/sessionTimeout';

/**
 * Sprint orphan-fix (2026-08-18) — página de rescate para cuentas que
 * quedaron con `auth.users` sin perfil (`proveedores` o `usuarios_buscadores`).
 *
 * Casos que aterrizan acá (vía guard en UserContext o CTA directo):
 * - Usuarios que entraron por Google OAuth pre-4-mar-2026 y el INSERT
 *   del perfil en `email-confirmado.tsx` falló silente (rollback con
 *   signOut() no borra auth.users — bug estructural).
 * - Usuarios post-4-mar que entraron por link OAuth Google directo
 *   (bookmark, cache SW viejo) aunque el botón ya no esté en UI.
 * - Cuentas de la Auth API pública `POST /auth/v1/signup` que Supabase
 *   expone y bots consumen sin pasar por `/api/auth/signup`.
 * - Cualquier vía futura (magic link, OAuth adicional) que cree
 *   `auth.users` sin crear perfil.
 *
 * Comportamiento:
 * - Sin sesión → redirige a /login.
 * - Sesión + ya tiene perfil → redirige a destino según rol (guard-safe:
 *   evita loop si el guard rebota acá por error).
 * - Sesión + huérfano → formulario minimalista. Prellena nombre/apellido
 *   desde `user_metadata.full_name`/`given_name`/`family_name` (Google).
 * - Post-submit → POST /api/auth/complete-registration con Bearer JWT.
 *   Éxito → refresca UserContext y redirige.
 */
export default function CompletarRegistroPage() {
    const router = useRouter();
    const { user, isLoading: userLoading, proveedorRow, hasSeekerProfile } = useUser();

    const [rol, setRol] = useState<'usuario' | 'proveedor' | null>(null);
    const [nombre, setNombre] = useState('');
    const [apellidoP, setApellidoP] = useState('');
    const [apellidoM, setApellidoM] = useState('');
    const [comunaQuery, setComunaQuery] = useState('');
    const [showComunaList, setShowComunaList] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Prellenar desde metadata de OAuth (Google guarda full_name/given_name/
    // family_name). Solo corre una vez al aterrizar con user disponible.
    useEffect(() => {
        if (!user) return;
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || '';
        const parts = fullName.trim().split(/\s+/);
        const firstFromFull = parts[0] || '';
        const restFromFull = parts.slice(1).join(' ');
        setNombre(prev => prev || meta.given_name || firstFromFull);
        setApellidoP(prev => prev || meta.family_name || restFromFull);
    }, [user]);

    // Redirect si no hay sesión activa (post-hidrate).
    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            router.replace('/login?redirect=/completar-registro');
        }
    }, [user, userLoading, router]);

    // Redirect si el user YA tiene perfil (evita que el guard nos rebote
    // acá en loop — o que alguien navegue por curiosidad).
    useEffect(() => {
        if (userLoading || !user) return;
        if (proveedorRow) {
            router.replace('/proveedor');
        } else if (hasSeekerProfile) {
            router.replace('/explorar');
        }
    }, [userLoading, user, proveedorRow, hasSeekerProfile, router]);

    const filteredComunas = useMemo(() => {
        if (!comunaQuery.trim()) return [];
        return filtrarComunasPorTermino(comunaQuery, COMUNAS_CHILE).slice(0, 8);
    }, [comunaQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!rol) {
            setError('Elige si buscas cuidado (tutor) o quieres ofrecer servicios (proveedor).');
            return;
        }
        if (!nombre.trim()) {
            setError('Ingresa tu nombre.');
            return;
        }
        if (rol === 'proveedor' && !apellidoP.trim()) {
            setError('Ingresa tu apellido paterno.');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setError('Tu sesión expiró. Vuelve a iniciar sesión.');
                setSubmitting(false);
                return;
            }

            const payload: any = { rol, nombre: nombre.trim() };
            if (rol === 'proveedor') {
                payload.apellido_p = apellidoP.trim();
                if (apellidoM.trim()) payload.apellido_m = apellidoM.trim();
                if (comunaQuery.trim()) payload.comuna = comunaQuery.trim();
            } else if (apellidoP.trim()) {
                payload.apellido_p = apellidoP.trim();
                if (apellidoM.trim()) payload.apellido_m = apellidoM.trim();
            }

            const res = await fetch('/api/auth/complete-registration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setError(body.error || 'No pudimos completar tu registro. Intenta de nuevo.');
                setSubmitting(false);
                return;
            }

            // Sprint session-timeout fix-de-fix (2026-08-25) — reset
            // del marker de inactividad post-completar-registro exitoso.
            // Intención explícita del user (submit del form de rescate
            // huérfano con rol elegido). Cero dependencia de events del
            // SDK. Ver `lib/sessionTimeout.ts`.
            resetInactivityTimer();

            toast.success('¡Registro completo! Bienvenido a Pawnecta.');
            // Full navigation en vez de router.replace() + refreshProfile().
            // Detectado en smoke H3 (Aldo, 2026-08-18): sin full-nav, dos
            // redirects concurrentes competían — el `useEffect` de esta
            // página que dispara al detectar `proveedorRow` recién
            // poblado, y el `router.replace` del handleSubmit — y Next
            // Pages dedupaba/dejaba uno colgado. El user quedaba trabado
            // y necesitaba Ctrl+Shift+R para desatorar. Un guard-de-rescate
            // que requiere hard-refresh no rescata a nadie: es el mismo
            // patrón "mecanismo existe, se ejecuta, usuario no llega al
            // otro lado" que perseguimos toda la semana. window.location
            // hace full page load → UserContext se re-monta → hydrateFromSession
            // ve el perfil recién creado desde el primer render → aterriza
            // directo en el dashboard. Mismo patrón que logout() en
            // UserContext ya usa (window.location.href = '/').
            window.location.assign(rol === 'proveedor' ? '/proveedor' : '/explorar');
        } catch (err: any) {
            console.error('complete-registration submit error:', err);
            setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
            setSubmitting(false);
        }
    };

    // Loading state — mientras UserContext hidrata sesión.
    if (userLoading || !user) {
        return (
            <>
                <Head>
                    <title>Completar registro — Pawnecta</title>
                </Head>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-accent-600" size={40} />
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Completar registro — Pawnecta</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
                        Falta un paso para activar tu cuenta
                    </h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Detectamos que tienes cuenta pero no completaste tu perfil. Elige tu rol
                        y confirma tus datos para empezar.
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                        {/* Rol */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                ¿Qué buscas hacer?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRol('usuario')}
                                    className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${rol === 'usuario'
                                        ? 'border-accent-600 bg-accent-50'
                                        : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <Search size={22} className={rol === 'usuario' ? 'text-accent-700' : 'text-slate-500'} />
                                    <span className={`text-sm font-semibold ${rol === 'usuario' ? 'text-accent-900' : 'text-slate-800'}`}>
                                        Busco cuidado
                                    </span>
                                    <span className="text-[11px] text-slate-500 text-center leading-tight">
                                        Para mi mascota
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRol('proveedor')}
                                    className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${rol === 'proveedor'
                                        ? 'border-accent-600 bg-accent-50'
                                        : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <Briefcase size={22} className={rol === 'proveedor' ? 'text-accent-700' : 'text-slate-500'} />
                                    <span className={`text-sm font-semibold ${rol === 'proveedor' ? 'text-accent-900' : 'text-slate-800'}`}>
                                        Ofrezco servicios
                                    </span>
                                    <span className="text-[11px] text-slate-500 text-center leading-tight">
                                        Cuido mascotas de otros
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label htmlFor="nombre" className="text-sm font-medium text-slate-700 mb-1 block">
                                Nombre
                            </label>
                            <input
                                id="nombre"
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                maxLength={100}
                                className="w-full h-11 px-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
                                placeholder="Tu nombre"
                            />
                        </div>

                        {/* Apellidos (obligatorio si proveedor, opcional si tutor) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="apellido_p" className="text-sm font-medium text-slate-700 mb-1 block">
                                    Apellido paterno {rol === 'usuario' && <span className="text-slate-400 text-xs font-normal">(opcional)</span>}
                                </label>
                                <input
                                    id="apellido_p"
                                    type="text"
                                    value={apellidoP}
                                    onChange={(e) => setApellidoP(e.target.value)}
                                    required={rol === 'proveedor'}
                                    maxLength={100}
                                    className="w-full h-11 px-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="apellido_m" className="text-sm font-medium text-slate-700 mb-1 block">
                                    Apellido materno <span className="text-slate-400 text-xs font-normal">(opcional)</span>
                                </label>
                                <input
                                    id="apellido_m"
                                    type="text"
                                    value={apellidoM}
                                    onChange={(e) => setApellidoM(e.target.value)}
                                    maxLength={100}
                                    className="w-full h-11 px-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
                                />
                            </div>
                        </div>

                        {/* Comuna (solo proveedor) */}
                        {rol === 'proveedor' && (
                            <div className="relative">
                                <label htmlFor="comuna" className="text-sm font-medium text-slate-700 mb-1 block">
                                    Comuna donde ofreces servicio <span className="text-slate-400 text-xs font-normal">(opcional, puedes agregar más después)</span>
                                </label>
                                <input
                                    id="comuna"
                                    type="text"
                                    value={comunaQuery}
                                    onChange={(e) => { setComunaQuery(e.target.value); setShowComunaList(true); }}
                                    onFocus={() => setShowComunaList(true)}
                                    onBlur={() => setTimeout(() => setShowComunaList(false), 150)}
                                    maxLength={100}
                                    autoComplete="off"
                                    className="w-full h-11 px-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
                                    placeholder="Ej. Providencia"
                                />
                                {showComunaList && filteredComunas.length > 0 && (
                                    <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                        {filteredComunas.map((c) => (
                                            <li key={c}>
                                                <button
                                                    type="button"
                                                    onMouseDown={() => { setComunaQuery(c); setShowComunaList(false); }}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent-50 hover:text-accent-800"
                                                >
                                                    {c}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {error && (
                            <p role="alert" aria-live="polite" className="text-sm text-danger-600 -mt-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || !rol}
                            className="w-full h-12 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {submitting && <Loader2 size={18} className="animate-spin" />}
                            {submitting ? 'Creando tu perfil...' : 'Completar registro'}
                        </button>

                        <p className="text-xs text-slate-500 text-center mt-1">
                            Al continuar aceptas los <Link href="/terminos" className="text-accent-700 hover:underline">Términos</Link> y la <Link href="/privacidad" className="text-accent-700 hover:underline">Política de Privacidad</Link>.
                        </p>
                    </form>
                </div>
            </div>
            {/* Sprint toast-fix (2026-09-04) — Toaster local removido.
                Sonner es global: los toast() de este archivo se enrutan
                al <Toaster/> canonico de pages/_app.tsx:80 con paleta
                pawnecta. Ver ACTA_TOAST_FIX.md. NO REAGREGAR — sumar
                otro Toaster crea duplicado (bug reportado por PO en
                sprint z-index-maps, cerrado con este sprint). */}
        </>
    );
}
