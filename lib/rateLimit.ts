// lib/rateLimit.ts
// ----------------------------------------------------------------------------
// Sprint A4 Ola 1 (2026-08-14) — rate limiter con Upstash Redis para prod.
//
// PROBLEMA que resuelve el sprint:
//   El implementación anterior era un Map<string,{count,resetAt}> in-memory.
//   Vercel serverless: cada invocación (Fluid Compute o no) puede aterrizar en
//   un contenedor distinto. El contador nunca persiste entre invocaciones →
//   el limit era no-op en prod. Documentado como deuda P1 en
//   staging-setup/MASTER_AUDIT_REPORT.md #15 (referencia CLAUDE.md > Auth
//   flow > "Caveat del rate limit").
//
// DECISIONES ARQUITECTÓNICAS (Aldo, GO A4):
//   - Provider: Upstash Redis Global (region us-east-1) via REST API sobre
//     HTTPS con @upstash/redis. NO el endpoint TCP `redis://` — ese requiere
//     conexión persistente que no juega bien con serverless por invocación.
//   - Eviction: activada en la instancia. Contadores de rate limit son
//     efímeros con TTL corto, preferimos degradación con gracia (descartar
//     lo más viejo) antes que rechazar escrituras bajo carga.
//   - Free tier: 500k comandos/mes, 256 MB storage. Pre-launch estimado
//     <10k requests/día → holgura ~50×.
//
// FAIL-OPEN INTENCIONAL:
//   Si Upstash no responde (timeout, red down, credenciales rotas, quota
//   excedida), el limiter deja pasar la request y loguea a Sentry el
//   incidente. Criterio Aldo: "un rate limiter caído no debe tumbar el
//   registro de proveedores durante una campaña". Trade-off aceptado:
//   ventana chica donde un attacker podría abusar del signup, mitigado por
//   (a) Supabase Auth ya tiene su propio rate limit plataforma-side, (b) el
//   servicio Upstash es 99.99% SLA en free tier, (c) el evento aparece en
//   Sentry Issues para detección rápida.
//
// FALLBACK IN-MEMORY — silencioso solo en dev, RUIDOSO en prod/preview:
//   Si UPSTASH_REDIS_REST_URL no está seteado:
//   - En `npm run dev` local (VERCEL_ENV undefined | 'development'): fallback
//     in-memory silencioso. Es el diseño esperado.
//   - En VERCEL_ENV=production|preview: fallback in-memory ADEMÁS de emitir
//     Sentry.captureMessage con level=error, tags:{subsystem:'rate-limit',
//     reason:'missing-credentials'} en el primer uso. Motivo (fix PO
//     2026-08-14 sobre versión inicial del sprint A4): un limiter que "hace
//     algo" pero sin persistencia entre invocaciones aparenta protección
//     y no la da. Es exactamente el 6º patrón "output correcto, efecto
//     ausente" del CLAUDE.md corolario P8 — el silencio previo era el bug.
//     Mejor gritar y que el operador vea la alerta que ocultar la
//     degradación tras un fallback fantasma.
//
//   Cuando Redis SÍ está inicializado pero una request específica falla
//   (timeout, quota), es fail-open + Sentry con reason:'upstash-error'. Nunca
//   se mezcla: en ese caso no cae al fallback in-memory (eso ocultaría la
//   degradación del propio Redis, y con Redis vivo en el resto de las
//   requests, mezclar sería peor).
//
// FIRMA ASYNC:
//   La superficie pública cambia de `(req, res) => boolean` a
//   `(req, res) => Promise<boolean>`. Los 21 call sites se actualizaron en
//   este mismo commit a `await`. Sync no era viable porque Upstash REST
//   API es HTTP y no hay forma sensata de bloquear el event loop.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import * as Sentry from '@sentry/nextjs';

// ---------------------------------------------------------------------------
// Fallback in-memory (solo dev/preview sin env vars — NO se usa en prod)
// ---------------------------------------------------------------------------
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 min (solo relevante en dev)
setInterval(() => {
  const now = Date.now();
  memStore.forEach((entry, key) => {
    if (now > entry.resetAt) memStore.delete(key);
  });
}, 5 * 60 * 1000);

function memoryCheck(
  key: string,
  limit: number,
  windowSeconds: number,
  now: number
): { success: boolean; remaining: number; resetAt: number } {
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowSeconds * 1000;
    memStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }
  entry.count++;
  if (entry.count > limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// Upstash singleton — inicializado lazy la primera vez que hace falta
// ---------------------------------------------------------------------------
let redisSingleton: Redis | null = null;
let redisInitAttempted = false;
let missingCredsReported = false; // solo reporta 1 vez por lifetime del contenedor
let lastRuntimeError: { at: number; message: string } | null = null; // último fallo runtime de Upstash (para admin badge)

// Detectar si estamos en un entorno "productivo" (prod real o preview de
// Vercel — ambos deberían tener credenciales reales). Mismo espíritu que
// `IS_PROD` de next.config.js / lib/cronGuard.ts / lib/resend.ts, pero
// ampliado a preview también porque el fallback silente en preview
// también fue causa histórica del anti-patrón "componente que aparenta
// funcionar y no lo hace" (P8 6ª instancia — sesión 2026-08-14).
//
// La regla: si el entorno tiene VERCEL_ENV seteado (production|preview),
// asumimos que las env vars deben estar. Si no están, es config error
// operacional y debe gritar. Solo `undefined` (npm run dev local) o
// `development` se toman como "dev" y usan fallback silente.
function isServerlessEnv(): boolean {
  const env = process.env.VERCEL_ENV;
  return env === 'production' || env === 'preview';
}

function getRedis(): Redis | null {
  if (redisInitAttempted) return redisSingleton;
  redisInitAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // En prod/preview esto es un config error operacional. El silence del
    // limiter es peor que no tener limiter, porque nadie lo revisa y el
    // sistema aparenta protección. Reportamos a Sentry con severity=error
    // en el primer uso post-init para que aparezca en Issues rápido.
    // El fallback in-memory igual actúa (para no tumbar signup por config
    // error), pero Sentry alerta que en este contenedor el rate limit
    // NO está protegido por Redis compartido.
    //
    // Dev local (VERCEL_ENV undefined | 'development'): silencioso — es
    // lo esperado, ese caso es diseño del fallback.
    if (isServerlessEnv() && !missingCredsReported) {
      missingCredsReported = true;
      const msg = `[rate-limit] UPSTASH credentials missing in VERCEL_ENV=${process.env.VERCEL_ENV}. Falling back to in-memory limiter (NO cross-invocation persistence). Rate limit is effectively no-op in serverless.`;
      // Doble canal para observabilidad:
      // 1. Sentry — solo activa en production (gate del proyecto). Alerta persistente.
      // 2. console.error — visible en Vercel Runtime Logs en production Y preview.
      //    Sin este canal el fix era invisible en preview (gate Sentry lo silenciaba)
      //    — hueco detectado por PO al smoke A4 con 8ª instancia del meta-patrón:
      //    "una señal intermedia (dashboard vacío / Sentry vacío) llevó a
      //    conclusión sobre el sistema sin haber probado el efecto".
      console.error(msg);
      Sentry.captureMessage(msg, {
        level: 'error',
        tags: {
          subsystem: 'rate-limit',
          reason: 'missing-credentials',
          vercel_env: process.env.VERCEL_ENV || 'unknown',
        },
      });
      // No await flush acá — la primera request no debe pagar el costo del
      // flush ni bloquear. La cola drena en el próximo await de Sentry
      // (los endpoints que ya usan flushSentryEvents lo harán). Peor caso:
      // el mensaje se pierde en el primer container si termina antes de
      // drenar. En el segundo container (post cold-start) missingCredsReported
      // se resetea a false → vuelve a intentar → eventual visibilidad
      // garantizada.
    }
    return null;
  }
  try {
    redisSingleton = new Redis({ url, token });
  } catch (err) {
    const msg = `[rate-limit] Redis client construction failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg, err);
    Sentry.captureException(err, {
      level: 'error',
      tags: { subsystem: 'rate-limit', reason: 'redis-init-failed' },
    });
    redisSingleton = null;
  }
  return redisSingleton;
}

// ---------------------------------------------------------------------------
// Estado del backend para el badge /admin — cero mutación del limiter,
// solo introspección de qué path atendería si llegara una request AHORA.
// El endpoint /api/admin/rate-limit-status usa esto + un PING opcional.
// ---------------------------------------------------------------------------
export interface RateLimitBackendStatus {
  /**
   * Path que se está usando efectivamente:
   * - 'upstash': Upstash cliente construido, listo para servir requests.
   * - 'memory': Sin credenciales (dev local o config error) — fallback in-memory activo.
   * - 'memory-fallback': Upstash construido pero última request runtime reventó
   *   (fail-open activo hasta próxima recuperación del servicio).
   */
  backend: 'upstash' | 'memory' | 'memory-fallback';
  /**
   * true si VERCEL_ENV=='production'|'preview' y backend != 'upstash'
   * (situación anómala que debe llamar la atención del operador).
   */
  degraded: boolean;
  /** VERCEL_ENV del contenedor que respondió, para diagnóstico. */
  vercelEnv: string | null;
  /** Timestamp ISO del último error runtime de Upstash (si hubo). */
  lastRuntimeErrorAt: string | null;
  /** Mensaje del último error runtime, truncado a 200 chars. */
  lastRuntimeErrorMessage: string | null;
}

export function getBackendStatus(): RateLimitBackendStatus {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasCredentials = !!(url && token);
  const inServerless = isServerlessEnv();

  let backend: RateLimitBackendStatus['backend'];
  if (!hasCredentials) {
    backend = 'memory';
  } else if (lastRuntimeError && Date.now() - lastRuntimeError.at < 60_000) {
    // Consideramos "memory-fallback" si hubo error runtime en el último minuto.
    // Fuera de esa ventana asumimos recuperación (Upstash puede haber vuelto).
    backend = 'memory-fallback';
  } else {
    backend = 'upstash';
  }

  return {
    backend,
    degraded: inServerless && backend !== 'upstash',
    vercelEnv: process.env.VERCEL_ENV || null,
    lastRuntimeErrorAt: lastRuntimeError ? new Date(lastRuntimeError.at).toISOString() : null,
    lastRuntimeErrorMessage: lastRuntimeError
      ? lastRuntimeError.message.slice(0, 200)
      : null,
  };
}

/**
 * Ping activo a Upstash — usado por el endpoint /api/admin/rate-limit-status
 * para chequear salud del servicio en tiempo real (no solo estado cacheado).
 * Cuesta 1 comando Upstash. Devuelve `null` si no hay cliente construido.
 */
export async function pingRedis(): Promise<{ ok: boolean; latencyMs: number | null; error: string | null }> {
  const redis = getRedis();
  if (!redis) return { ok: false, latencyMs: null, error: 'redis-not-initialized' };
  const start = Date.now();
  try {
    await redis.ping();
    return { ok: true, latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Cache de Ratelimit instances por (limit, windowSeconds, prefix) — reutilizar
// la misma instancia para requests del mismo tipo evita re-crear la ventana.
const ratelimitCache = new Map<string, Ratelimit>();

function getRatelimit(prefix: string, limit: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${prefix}:${limit}:${windowSeconds}`;
  let rl = ratelimitCache.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      // Fixed window: contador simple por ventana. Alternativa sliding window
      // consume más comandos (2× por check) y no aporta valor en nuestros
      // tamaños de ventana (30-60s).
      limiter: Ratelimit.fixedWindow(limit, `${windowSeconds} s`),
      prefix: `pawnecta:${prefix}`,
      analytics: false, // ahorrar comandos del free tier (500k/mes)
    });
    ratelimitCache.set(key, rl);
  }
  return rl;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
interface RateLimitOptions {
  /** Max requests per window */
  limit?: number;
  /** Window duration in seconds */
  windowSeconds?: number;
  /** Prefix opcional para segregar buckets (default: 'api') */
  prefix?: string;
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limiter factory. Retorna un checker async que, dado (req, res),
 * incrementa el contador Redis y responde con 429 + Retry-After si se
 * excede el umbral.
 *
 * Comportamiento ante fallo de Upstash: FAIL-OPEN (deja pasar) + captura
 * a Sentry con tag `subsystem: 'rate-limit'`, `reason: 'upstash-error'`.
 * Motivo: preferimos exposición chica a bloquear el signup durante campaña.
 *
 * @returns Promise<boolean> — true si la request pasa, false si fue bloqueada
 *                             (res.status(429) ya fue enviado en ese caso).
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const { limit = 30, windowSeconds = 60, prefix = 'api' } = options;

  return async function checkRateLimit(
    req: NextApiRequest,
    res: NextApiResponse
  ): Promise<boolean> {
    const ip = getClientIp(req);
    // La clave incluye url para separar buckets por endpoint. Sin esto, un
    // usuario que hace login gastaría el bucket del signup en la misma IP.
    const key = `${req.url || ''}:${ip}`;

    const rl = getRatelimit(prefix, limit, windowSeconds);

    if (!rl) {
      // Sin Upstash disponible → fallback in-memory (dev local, o config
      // error en prod/preview). El header X-RateLimit-Backend permite al
      // operador ver este estado con un simple `curl -I` sin depender de
      // Sentry (que puede estar gate-ado). Introducido a raíz del sprint
      // A4 smoke — el PO detectó que el retry-after 55s del fallback lo
      // haría notorio, pero un smoke automatizado necesitaba una señal
      // directa y no una deducción por firma de comportamiento.
      res.setHeader('X-RateLimit-Backend', 'memory');
      const now = Date.now();
      const result = memoryCheck(key, limit, windowSeconds, now);
      if (!result.success) {
        const retryAfter = Math.ceil((result.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({ error: 'Too many requests. Try again later.' });
        return false;
      }
      return true;
    }

    try {
      const result = await rl.limit(key);
      // Path Upstash ejecutó sin excepción → limpiar marca de error runtime
      // si estaba activa (recuperación observada). El badge admin verá esto.
      if (lastRuntimeError) lastRuntimeError = null;
      res.setHeader('X-RateLimit-Backend', 'upstash');
      if (!result.success) {
        const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(result.limit));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));
        res.status(429).json({ error: 'Too many requests. Try again later.' });
        return false;
      }
      // Headers informativos para clientes que quieran ajustar cadencia.
      res.setHeader('X-RateLimit-Limit', String(result.limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      return true;
    } catch (err) {
      // FAIL-OPEN: Upstash reventó en runtime (timeout, quota, TLS, etc.) →
      // dejamos pasar la request + registramos por 3 canales:
      //   1. console.error para Vercel Runtime Logs (visible en preview + prod).
      //   2. Sentry.captureException (solo activa en prod por gate global).
      //   3. lastRuntimeError module-level → expuesto por getBackendStatus()
      //      para que el badge admin muestre 'memory-fallback' hasta ~60s post-error.
      const msg = err instanceof Error ? err.message : String(err);
      lastRuntimeError = { at: Date.now(), message: msg };
      res.setHeader('X-RateLimit-Backend', 'memory-fallback');
      console.error(`[rate-limit] Upstash runtime error (fail-open): ${msg}`);
      Sentry.captureException(err, {
        level: 'warning',
        tags: {
          subsystem: 'rate-limit',
          reason: 'upstash-error',
          prefix,
        },
        extra: {
          endpoint: req.url,
          ip: ip.replace(/\d+$/, 'X'), // scrub último octeto (PII lite)
        },
      });
      return true; // fail-open
    }
  };
}

// ---------------------------------------------------------------------------
// Limiters pre-configurados — umbrales sprint A4 (justificados en CLAUDE.md).
//
// Contexto de tráfico esperado (Aldo, campaña pagada 25-30 proveedores):
//   - Signup real: 1 vez por proveedor. 30 en la campaña total = 1 c/día
//     como promedio, con picos de 3-5 en un mismo día. Nunca 5 del mismo IP
//     salvo error del usuario reintentando.
//   - Login: 1-3 c/día por proveedor activo cuando ya está registrado.
//   - Emails transaccionales (welcome, confirm, notify): 1 por evento
//     legítimo. Un tutor solicitando 10 reservas en 1 min es plausible en
//     un evento de descubrimiento, 20 en 1 min no.
//
// Los umbrales son POR IP + POR endpoint (no globales). Un attacker que
// rota IP (VPN, botnet) sortea; ese vector se cubre en un sprint futuro
// con captcha o BotID. A4 cierra la vulnerabilidad in-memory reportada.
// ---------------------------------------------------------------------------

/**
 * apiLimiter — endpoints públicos generales (contactos/track, slots,
 * disponibilidad, notifications, log-consent, etc). 30 req/60s por IP.
 * Un tutor navegando activamente puede hacer 5-10 requests en un burst;
 * 30 tolera burst amplio sin bloquear UX legítima.
 */
export const apiLimiter = rateLimit({ limit: 30, windowSeconds: 60, prefix: 'api' });

/**
 * authLimiter — signup / login / reset password. 5 intentos por 60s por IP.
 * Un usuario legítimo típicamente NO hace >2 intentos en 1 min (typo en
 * password → 1 corrección). 5 tolera error humano + doble submit accidental.
 * Un attacker credential stuffing quiere miles por minuto — 5 lo mata.
 * Complementa el rate limit propio de Supabase Auth (plataforma-side).
 */
export const authLimiter = rateLimit({ limit: 5, windowSeconds: 60, prefix: 'auth' });

/**
 * emailLimiter — endpoints que disparan emails transaccionales (welcome,
 * notify-*). 3 emails por 60s por IP. Emails son costosos (Resend cuota +
 * reputación de dominio) y un flood es visible al recipient. 3 tolera un
 * "burst legítimo raro" (ej. proveedor confirmando 3 reservas seguidas)
 * sin permitir spam. Cada endpoint email también valida ownership
 * server-side (patrón id-only del CLAUDE.md > Auth para endpoints
 * internos), así que el rate limit es defensa en profundidad, no primera
 * línea.
 */
export const emailLimiter = rateLimit({ limit: 3, windowSeconds: 60, prefix: 'email' });
