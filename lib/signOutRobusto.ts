// lib/signOutRobusto.ts
// ---------------------------------------------------------------------------
// Sprint hf-logout-403 (2026-11-17) — logout robusto que garantiza cleanup
// del storage local aunque el server devuelva 403 session_not_found o el
// SDK v2.84 falle silente.
//
// Causa raíz confirmada empíricamente (ver auth_logs user 06d3b475 2026-11-17):
//   - User A tiene sesión activa (ej. OTP magic-link en tab-1 www.pawnecta.com).
//   - User A inicia 2ª sesión paralela (signInWithPassword en tab-2
//     pawnecta.com sin www — origins distintos, cada uno con su localStorage).
//   - User A hace logout global desde tab-1 → server revoca TODAS las
//     sesiones del user via `auth.sessions`, incluyendo la de tab-2.
//   - tab-2 queda con JWT criptográficamente válido pero session_id ya
//     borrada → logout en tab-2 → 403 session_not_found.
//   - Patrón natural que afecta: registra en desktop, confirma email en
//     celular (crea sesión OTP), vuelve a desktop → SessionTimeout 10 min
//     scope global revoca celular → celular zombi.
//
// Fix:
//   (a) Helper que SIEMPRE limpia `localStorage sb-*-auth-token` aunque el
//       signOut tire. Cinturón sobre el cleanup del SDK v2.84 (que teóricamente
//       ya ignora 403/401/404 pero ante error no-AuthApiError o timing raro
//       puede dejar storage sucio).
//   (b) El caller controla el SCOPE:
//       - 'global' → botón manual "Cerrar sesión" (intención explícita del
//         user de cerrar en todos los dispositivos).
//       - 'local'  → SessionTimeout por inactividad (la inactividad de UNA
//         tab NO debe cerrar sesiones del user en otros dispositivos).
//
// Nota: NO limpia estado React del UserContext. Eso lo hace el caller
// (softReset lo limpia antes de llamar al helper).
// ---------------------------------------------------------------------------
import { supabase } from './supabaseClient';
import * as Sentry from '@sentry/nextjs';

export type SignOutScope = 'global' | 'local';

export interface SignOutRobustoResult {
    ok: boolean;
    errorStatus?: number;
    errorMessage?: string;
}

/**
 * Hace `supabase.auth.signOut({ scope })` y SIEMPRE limpia el storage local
 * (`localStorage sb-*-auth-token`) aunque el server devuelva 403.
 *
 * Retorna `{ ok: true }` si el server respondió OK, `{ ok: false, errorStatus }`
 * si hubo error (en cualquier caso el storage queda limpio).
 */
export async function signOutRobusto(
    scope: SignOutScope = 'global',
): Promise<SignOutRobustoResult> {
    let serverOk = true;
    let errorStatus: number | undefined;
    let errorMessage: string | undefined;

    try {
        const { error } = await supabase.auth.signOut({ scope });
        if (error) {
            serverOk = false;
            errorStatus = (error as unknown as { status?: number }).status;
            errorMessage = error.message;
            Sentry.captureMessage('[signOutRobusto] supabase.auth.signOut returned error', {
                level: 'warning',
                tags: { subsystem: 'hf-logout-403', phase: 'signOut-response' },
                extra: { scope, errorStatus, errorMessage },
            });
        }
    } catch (err) {
        serverOk = false;
        errorMessage = (err as Error)?.message ?? String(err);
        Sentry.captureException(err, {
            tags: { subsystem: 'hf-logout-403', phase: 'signOut-throw' },
            extra: { scope },
        });
    }

    // SIEMPRE limpiar storage local. Guard defensivo: cross-origin iframe,
    // SSR y modos privados pueden tirar — cero lo importante, el storage
    // ya no sirve en esos casos.
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const keysToRemove: string[] = [];
            for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (k && /^sb-.*-auth-token/.test(k)) keysToRemove.push(k);
            }
            for (const k of keysToRemove) window.localStorage.removeItem(k);
        }
    } catch {
        // noop
    }

    return serverOk ? { ok: true } : { ok: false, errorStatus, errorMessage };
}
