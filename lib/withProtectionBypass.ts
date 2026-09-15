// lib/withProtectionBypass.ts
// ---------------------------------------------------------------------------
// Sprint bloque-g G-2 (2026-09-15) — SELF-CALLS-PREVIEW opción B.
//
// Helper que retorna el header `x-vercel-protection-bypass` para self-calls
// server-side desde una Vercel Function a otra dentro del mismo deploy.
//
// PROBLEMA: en Vercel Preview con Deployment Protection habilitada, un
// fetch de una Function a otra (ej. signup → welcome) sin header de bypass
// aterriza en el gate de Protection y devuelve 401 sin llegar al handler.
// El caller sigue con éxito (fire-and-forget catch silencioso), pero la
// notificación / email jamás se envía en preview. En prod real, el
// Deployment Protection no aplica (Production deployments son públicos),
// entonces cero problema.
//
// FIX: agregar el header `x-vercel-protection-bypass:
// ${VERCEL_AUTOMATION_BYPASS_SECRET}` en el request cuando estamos en
// preview y la env var está seteada. Vercel bypasa el gate y el handler
// destinatario recibe el request normal.
//
// GATE POR ENV: solo agregamos el header cuando `VERCEL_ENV === 'preview'`.
// En production el header no aplica (no hay Protection sobre production);
// en development local `VERCEL_ENV` es undefined y self-fetch corre sin
// Protection. En cualquier caso, si la env var `VERCEL_AUTOMATION_BYPASS_SECRET`
// no está, retornamos `{}` (helper no-op) — el fetch seguirá su comportamiento
// previo.
//
// CONSECUENCIA DE SEGURIDAD: el secret llega al handler destino en el
// header. Los handlers destino son server-side (nuestros propios endpoints
// dentro del mismo deploy), así que el secret no leakea al cliente. El
// header solo se emite en preview, entonces cero riesgo en prod real.
//
// CONFIG VERCEL: la env var `VERCEL_AUTOMATION_BYPASS_SECRET` se setea en
// Vercel Dashboard → Project → Settings → Deployment Protection → sección
// "Protection Bypass for Automation" → mostrar/copiar el token. Scope debe
// ser SOLO "Preview" (checkbox Preview activo, Production+Development
// desactivados). En production `process.env.VERCEL_AUTOMATION_BYPASS_SECRET`
// queda undefined → helper retorna `{}` incluso si el env accidentalmente
// se propagara.
// ---------------------------------------------------------------------------

/**
 * Retorna el objeto de headers HTTP para agregar al fetch de un self-call
 * server-side. En preview con la env var seteada, retorna
 * `{ 'x-vercel-protection-bypass': <secret> }`. En cualquier otro caso
 * (production, development, env var faltante), retorna objeto vacío `{}`.
 *
 * Uso canónico (spread en headers):
 * ```ts
 * await fetch(url, {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...buildProtectionBypassHeaders(),
 *   },
 *   body: JSON.stringify(payload),
 * });
 * ```
 */
export function buildProtectionBypassHeaders(): Record<string, string> {
    if (process.env.VERCEL_ENV !== 'preview') return {};
    const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (!secret) return {};
    return { 'x-vercel-protection-bypass': secret };
}
