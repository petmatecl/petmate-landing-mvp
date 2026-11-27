// lib/unsubscribeToken.ts
// ---------------------------------------------------------------------------
// Sprint PROVEEDOR-PERFIL-NUDGE-7D Sprint A PR 4 (nudge-unsub). Helper
// compartido entre el cron (que genera el token para el unsubscribe link
// del email) y el endpoint /api/unsubscribe (que lo verifica).
//
// Reusable para futuros flows de email con unsubscribe link (deuda
// EMAILS-UNSUBSCRIBE-UNIFIED cubre centralización completa).
//
// Patrón: HMAC-SHA256 del auth_user_id con secret UNSUBSCRIBE_SECRET.
// Token = hex 64 chars. Timing-safe comparison en verify.
// ---------------------------------------------------------------------------
import { createHmac, timingSafeEqual } from 'crypto';

/** HMAC-SHA256 del auth_user_id con el secret. Hex string de 64 chars. */
export function signUnsubscribeToken(authUserId: string, secret: string): string {
    return createHmac('sha256', secret).update(authUserId).digest('hex');
}

/** Verify timing-safe. Returns true si token coincide. */
export function verifyUnsubscribeToken(
    authUserId: string,
    token: string,
    secret: string,
): boolean {
    const expected = signUnsubscribeToken(authUserId, secret);
    if (expected.length !== token.length) return false;
    try {
        return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
    } catch {
        return false;
    }
}
