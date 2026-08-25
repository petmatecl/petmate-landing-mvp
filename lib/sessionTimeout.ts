/**
 * Marker de inactividad de sesión — helper compartido para resetearlo
 * desde puntos de intención inequívoca del usuario (submit login,
 * submit register, click en link de confirmación de correo, submit
 * complete-registration).
 *
 * Sprint email-landing session-timeout fix-de-fix (2026-08-25) —
 * ver `components/SessionTimeout.tsx` para la lógica del guard y
 * `CLAUDE.md > "No construir lógica de sesión sobre eventos del SDK
 * cuya semántica no esté garantizada por contrato"` para la regla
 * que motivó este diseño.
 *
 * HISTORIA
 *   El "fix 2" original agregó un `onAuthStateChange` subscribe en
 *   `SessionTimeout` que reseteaba el marker en `SIGNED_IN`. La
 *   hipótesis era que solo login genuino disparaba SIGNED_IN — pero
 *   Supabase JS v2.84 también dispara SIGNED_IN en cada F5 con sesión
 *   activa (refresh silente al mount). Consecuencia: cada carga de
 *   página reseteaba el marker, y el timeout de inactividad quedó
 *   desactivado en toda la app (silent kill).
 *
 *   El PO detectó el bug con un smoke específico (positivo conocido
 *   del timeout: marker viejo + F5 debe expulsar). Sin ese smoke
 *   habríamos aterrizado en prod con timeout muerto.
 *
 * MECANISMO NUEVO — INTENCIÓN EXPLÍCITA DEL USUARIO
 *   Cada acción de autenticación intencional resetea el marker
 *   llamando a `resetInactivityTimer()` desde el path de éxito.
 *   Cero dependencia de events del SDK. La semántica es honesta:
 *   "el user acaba de autenticarse activamente".
 *
 * CALL SITES (4 en total, todos en path de éxito del flow):
 *   - `pages/login.tsx` post-signInWithPassword exitoso.
 *   - `pages/register.tsx` post-signup exitoso.
 *   - `pages/email-confirmado.tsx` cuando user cambia de null a
 *     poblado Y hay token fresh en URL (hash access_token o query
 *     code). Doble guard para evitar disparar por re-hidratación
 *     de sesión existente (bug que motivó el revert del fix 2).
 *   - `pages/completar-registro.tsx` post-fetch exitoso.
 *
 * SAFETY
 *   - No-op en SSR (`typeof window` check).
 *   - No-op silencioso si localStorage lanza (safari privado, etc).
 */
export function resetInactivityTimer(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem('pawnecta_last_activity', String(Date.now()));
    } catch {
        // safari privado, quota exceeded, u otras razones raras.
        // No es bloqueante: si el marker no se puede escribir, el
        // guard de SessionTimeout va a evaluar sin él (marker null →
        // no expira, resetTimer normal cuando el user interactúe).
    }
}

/**
 * Storage key del marker. Exportado para que quien necesite leer el
 * marker directamente (por diagnóstico o smoke) use la misma
 * referencia canónica.
 */
export const SESSION_ACTIVITY_KEY = 'pawnecta_last_activity';
