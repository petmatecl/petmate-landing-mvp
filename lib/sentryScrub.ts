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
 * Sprint sentry-bot-noise (2026-09-08) — dropea eventos de bots crawlers para
 * no ensuciar el dashboard. Google-Read-Aloud, Googlebot, bingbot y variantes
 * disparan rejections al intentar registrar el service worker de la PWA
 * (workbox-window en entorno bot falla, promise no atrapada). Verificado en
 * issue JAVASCRIPT-NEXTJS-3 (Error · Rejected, unhandled, /explorar):
 * exception.mechanism='onunhandledrejection', stack en
 * node_modules/workbox-window/build/workbox-window.prod.es5.mjs, User-Agent
 * "Google-Read-Aloud". Cero impacto en usuarios reales.
 */
const BOT_UA_RE = /bot|crawler|spider|Google-Read-Aloud|facebookexternalhit|LinkedInBot|Twitterbot/i;

/**
 * Sprint sentry-bot-noise (2026-09-08) — dropea el SW register rejection
 * independiente del UA (navegadores reales sin soporte SW, entornos
 * restringidos, extensiones que bloquean workers). Cross-check por stack
 * frames del evento: si el rejection viene del workbox-window auto-register
 * de next-pwa, es ruido no accionable. Defensa complementaria al listener
 * global de instrumentation-client.ts.
 */
function isSwRegisterRejection(event: ErrorEvent): boolean {
    const values = event.exception?.values;
    if (!values || values.length === 0) return false;
    const first = values[0];
    if (first.value !== 'Rejected') return false;
    const frames = first.stacktrace?.frames ?? [];
    for (const f of frames) {
        const filename = f.filename ?? '';
        const fn = f.function ?? '';
        if (filename.includes('workbox-window') || fn.includes('serviceWorker.register')) {
            return true;
        }
    }
    return false;
}

/**
 * Hook beforeSend de Sentry. Aplica scrubbing sobre las superficies del evento
 * que aceptan strings arbitrarios. Retorna null cuando el evento es ruido de
 * bots crawlers o rejection del SW register auto-inyectado por next-pwa
 * (sprint sentry-bot-noise 2026-09-08).
 */
export function scrubSentryEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
    // Drop antes de scrubbing — cero costo si el evento no va a enviarse.
    const headers = event.request?.headers as Record<string, string> | undefined;
    const ua = headers?.['User-Agent'] || headers?.['user-agent'];
    if (typeof ua === 'string' && BOT_UA_RE.test(ua)) {
        return null;
    }
    if (isSwRegisterRejection(event)) {
        return null;
    }

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
