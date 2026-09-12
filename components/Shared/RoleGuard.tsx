import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { useUser } from "../../contexts/UserContext";
import { supabase } from '../../lib/supabaseClient';

interface RoleGuardProps {
    children: React.ReactNode;
    requiredRole: "usuario" | "proveedor" | "admin";
}

// Sprint error-audit Cases 2 + 1 (2026-09-08) — distinguir "error de red al
// verificar el rol" de "sin rol para acceder". Antes, ambos casos caían al
// mismo `router.push('/login')`: un fallo transitorio de red expulsaba a
// admins/proveedores reales igual que a un tutor que legítimamente no tiene
// el rol. Ahora:
//   - error truthy en la query de rol → estado 'error' con "Reintentar",
//     sin redirect + Sentry.captureMessage con contexto (ruta, rol, código).
//   - sin error y sin fila (o rol/estado que no cumple) → 'unauthorized' con
//     redirect (comportamiento previo intacto).
// El branch requiredRole="proveedor" no tiene caller vivo hoy (grep 0), se
// aplica la misma corrección estructural por consistencia del archivo:
// dejar la mitad arreglada es peor que arreglarlo entero.
//
// P10: verifyAccess corre dentro de un useEffect y llama a supabase.from(...)
// directo. NO se ejecuta dentro de onAuthStateChange callback ni dentro del
// lock interno del SDK Auth. La sesión llega via useUser() context, que
// expone state ya hidratado. Cero riesgo de deadlock.
//
// Sprint admin-redirect (2026-09-08 hotfix post-error-audit) — los 4 sitios
// que mandan a /login ahora incluyen `?redirect=<router.asPath>` (object form
// del router API, auto-encode). Motivación: el wrap del hub /admin en
// RoleGuard (Case 3) eliminó el login form embebido; sin redirect, admin sin
// sesión aterriza en /login y post-auth pierde el destino de origen (login.tsx
// lo despacha por rol → cae en /proveedor si tiene rol proveedor). login.tsx
// YA honra ?redirect= con validación estricta anti-open-redirect
// (safeRedirectFromQuery via new URL() + check de origin + rechazo de //).
// Cero cambio a login.tsx.
//
// Sprint conviene REDIRECT-403 (2026-09-12) — cerrado el caveat previo:
// user autenticado SIN el rol requerido (ej. Camila en /admin/*) ya no cae
// en el loop `/login?redirect=X → login acepta sesión existente → redirect
// gana → gate deniega → /login → loop`. Ahora redirige a `/explorar` con
// toast informativo "No tienes acceso a esta sección". La distinción clave
// es:
//   - NO autenticado                         → /login?redirect=X (legítimo).
//   - autenticado + sin rol / rol distinto   → /explorar + toast.error.
//   - autenticado + query rol reventó (red)  → estado 'error' con Reintentar
//                                             (comportamiento previo intacto).
// El diagnostic PASO 0 conviene (PR #26 run 34643649379) confirmó el bug
// con user tutor navegando a /admin: URL final = `/login?redirect=%2Fadmin`,
// loop-prone. Post-fix el test asserta URL final = /explorar + toast visible.
export default function RoleGuard({ children, requiredRole }: RoleGuardProps) {
    const router = useRouter();
    const { isAuthenticated, isLoading, user, providerStatus, roles } = useUser();
    const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized' | 'error'>('loading');
    const [retryTrigger, setRetryTrigger] = useState(0);

    useEffect(() => {
        const verifyAccess = async () => {
            if (isLoading) return;

            if (!isAuthenticated || !user) {
                setAuthState('unauthorized');
                router.replace({ pathname: '/login', query: { redirect: router.asPath } });
                return;
            }

            if (requiredRole === 'usuario') {
                // If it's pure client dashboard, everyone authenticated has access essentially
                setAuthState('authorized');
                return;
            }

            if (requiredRole === 'proveedor') {
                if (providerStatus === 'aprobado' || roles?.includes('admin')) {
                    setAuthState('authorized');
                    return;
                }

                // Fallback check in DB just in case context is lagging
                const { data, error } = await supabase
                    .from('proveedores')
                    .select('estado')
                    .eq('auth_user_id', user.id)
                    .maybeSingle();

                if (error) {
                    Sentry.captureMessage('roleguard_verify_failed', {
                        level: 'warning',
                        tags: {
                            subsystem: 'roleguard',
                            route: router.pathname,
                            requiredRole,
                            errorCode: error.code || 'unknown',
                        },
                        extra: {
                            errorMessage: error.message,
                            errorDetails: error.details,
                            errorHint: error.hint,
                        },
                    });
                    setAuthState('error');
                    return;
                }

                if (!data) {
                    // Sprint conviene REDIRECT-403 — user autenticado sin fila
                    // de proveedor NO va a /login (loop-prone). Va a /explorar
                    // con toast. Ver docstring al tope del archivo.
                    setAuthState('unauthorized');
                    toast.error('No tienes acceso a esta sección');
                    router.push('/explorar');
                    return;
                }

                if (data.estado === 'aprobado') {
                    setAuthState('authorized');
                } else {
                    setAuthState('unauthorized');
                    toast.error('No tienes acceso a esta sección');
                    router.push('/explorar');
                }
                return;
            }

            if (requiredRole === 'admin') {
                const { data, error } = await supabase
                    .from('proveedores')
                    .select('roles, estado')
                    .eq('auth_user_id', user.id)
                    .maybeSingle();

                if (error) {
                    Sentry.captureMessage('roleguard_verify_failed', {
                        level: 'warning',
                        tags: {
                            subsystem: 'roleguard',
                            route: router.pathname,
                            requiredRole,
                            errorCode: error.code || 'unknown',
                        },
                        extra: {
                            errorMessage: error.message,
                            errorDetails: error.details,
                            errorHint: error.hint,
                        },
                    });
                    setAuthState('error');
                    return;
                }

                if (data?.roles && Array.isArray(data.roles) && data.roles.includes('admin') && data.estado === 'aprobado') {
                    setAuthState('authorized');
                } else {
                    // Sprint conviene REDIRECT-403 — user autenticado sin rol
                    // admin NO va a /login (loop-prone). Va a /explorar con
                    // toast. Ver docstring al tope del archivo.
                    setAuthState('unauthorized');
                    toast.error('No tienes acceso a esta sección');
                    router.push('/explorar');
                }
                return;
            }
        };

        verifyAccess();
    }, [isLoading, isAuthenticated, requiredRole, user, providerStatus, roles, router, retryTrigger]);

    const handleRetry = () => {
        setAuthState('loading');
        setRetryTrigger(prev => prev + 1);
    };

    if (authState === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-accent-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm animate-pulse">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    if (authState === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
                    <div>
                        <p className="text-slate-900 font-semibold text-sm">No pudimos verificar tu acceso</p>
                        <p className="text-slate-500 text-xs mt-1">Revisa tu conexión y vuelve a intentar.</p>
                    </div>
                    <button
                        onClick={handleRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (authState === 'unauthorized') {
        return null;
    }

    return <>{children}</>;
}
