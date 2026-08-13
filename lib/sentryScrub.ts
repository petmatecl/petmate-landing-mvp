// lib/sentryScrub.ts
// ----------------------------------------------------------------------------
// Sprint R3 SENTRY-1 — hook beforeSend compartido entre client/server/edge.
//
// Reglas de scrubbing (alcance PO 2026-08-11):
//   - Cero emails de tutores/proveedores (address@domain — patrón email
//     completo). Reemplazo por [email-redacted].
//   - Cero tokens de sesión Supabase (Bearer JWT o cookies sb-*-auth-token).
//   - Cero cookies en general (los headers `cookie` / `set-cookie` ya son
//     removidos por Sentry cuando sendDefaultPii es false, pero blindamos
//     por si aparecen en messages/breadcrumbs/extras).
//   - RUT chileno (formato NN.NNN.NNN-K) — dato personal, redactar.
//
// Se aplica RECURSIVAMENTE sobre message, breadcrumbs, extras, contexts,
// tags, request.url y request.data. NO tocamos exception.type ni exception.
// value.stack (stacks minificados/no-minificados NO llevan PII por diseño).
// ----------------------------------------------------------------------------
import type { ErrorEvent, EventHint } from '@sentry/nextjs';

// Patrones a redactar. Ordenados de más específico a más genérico.
const PATTERNS: Array<[RegExp, string]> = [
    // JWT bearer token (encabezado Authorization o body). eyJ<base64>.<base64>.<base64>
    [/eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}/g, '[jwt-redacted]'],
    // Supabase auth cookie name (sb-<projectref>-auth-token)
    [/sb-[a-z0-9]{20}-auth-token(-[a-z0-9]+)?=[^;\s]+/g, 'sb-*-auth-token=[redacted]'],
    // Email address genérico. Conservador — puede tener falsos positivos con
    // URLs tipo user@host, pero preferimos over-scrub que leak PII.
    [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email-redacted]'],
    // RUT chileno con puntos y guión: NN.NNN.NNN-K o N.NNN.NNN-K
    [/\b\d{1,2}\.\d{3}\.\d{3}-[0-9kK]\b/g, '[rut-redacted]'],
    // RUT chileno sin puntos: NNNNNNNN-K (7-8 dígitos + dv)
    [/\b\d{7,8}-[0-9kK]\b/g, '[rut-redacted]'],
];

/**
 * Aplica los patrones de scrub sobre un string. Devuelve el string modificado.
 */
function scrubString(input: string): string {
    let out = input;
    for (const [pattern, replacement] of PATTERNS) {
        out = out.replace(pattern, replacement);
    }
    return out;
}

/**
 * Walker recursivo — aplica scrubString a strings, mantiene números/booleans
 * intactos, desciende en arrays y objetos. Corta a profundidad 8 para evitar
 * loops en referencias circulares (poco común en payloads Sentry pero
 * defensivo).
 */
function scrubDeep(value: unknown, depth = 0): unknown {
    if (depth > 8 || value == null) return value;
    if (typeof value === 'string') return scrubString(value);
    if (typeof value !== 'object') return value;

    if (Array.isArray(value)) {
        return value.map((v) => scrubDeep(v, depth + 1));
    }

    // Objeto plano — recurse sobre valores. Preservamos las keys tal cual
    // (no scrub porque suelen ser identificadores estáticos: 'user_id', 'email',
    // no contenido de usuario). El VALOR de la key 'email' es lo que scrub captura.
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
        out[k] = scrubDeep(v, depth + 1);
    }
    return out;
}

/**
 * Hook beforeSend de Sentry. Aplica scrubbing sobre las superficies del evento
 * que aceptan strings arbitrarios. Retorna null solo si algo grave —
 * por ahora nunca dropeamos.
 */
export function scrubSentryEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
    if (event.message) event.message = scrubString(event.message);

    if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
            ...b,
            message: b.message ? scrubString(b.message) : b.message,
            data: b.data ? (scrubDeep(b.data) as Record<string, unknown>) : b.data,
        }));
    }

    if (event.extra) event.extra = scrubDeep(event.extra) as Record<string, unknown>;
    if (event.contexts) event.contexts = scrubDeep(event.contexts) as typeof event.contexts;
    if (event.tags) event.tags = scrubDeep(event.tags) as typeof event.tags;

    if (event.request) {
        if (event.request.url) event.request.url = scrubString(event.request.url);
        if (event.request.data) event.request.data = scrubDeep(event.request.data);
        // Cookies y headers ya vienen filtrados por sendDefaultPii=false — pero
        // si aparecieran, los borramos duro.
        if (event.request.cookies) delete event.request.cookies;
        if (event.request.headers) {
            const headers = event.request.headers as Record<string, string>;
            for (const key of Object.keys(headers)) {
                if (/^(cookie|set-cookie|authorization|x-.*token)$/i.test(key)) {
                    headers[key] = '[header-redacted]';
                }
            }
        }
    }

    return event;
}
