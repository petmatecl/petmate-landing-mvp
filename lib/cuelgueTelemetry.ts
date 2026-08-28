// ============================================================================
// Sprint cuelgue-diag (2026-08-28) — INSTRUMENTACIÓN TEMPORAL
// ============================================================================
// Cero impacto productivo — solo `console.log` con prefijo `[cuelgue +Xms]` +
// dos handles globales sobre `window`. NO merge a main. Vive solo en la rama
// `cuelgue-diag` hasta que el sprint cierre.
//
// Hipótesis vivas post-tests-consola del PO 2026-08-28:
//   H2 — Singleton cliente Supabase corrupto / múltiples instancias / subscribers orphans.
//   H4 — `useEffect` de mount que se pierde y nunca vuelve a correr
//        (unmount rápido, StrictMode, bfcache, navegación).
//
// Muertas (por Tests 1-2 del PO): H1 (auth ready), H3 (main thread), H5 (SW
// intercepta), H6 (tercero monkey-patchea fetch).
//
// Discriminador clave H2 vs H4 (pedido explícito PO):
//   1. `window.__pawnectaSupabase = supabase` — permite hacer llamadas al
//      cliente desde consola durante el cuelgue. Si el cliente responde y el
//      componente no → H4. Si el cliente también cuelga → H2.
//   2. Contador `window.__supabaseClientEvalCount` — cuántas veces se
//      evaluó el módulo `lib/supabaseClient.ts`. > 1 = múltiples instancias
//      = H2.
//   3. Contador `window.__pawnectaAuthSubscriberCount` — subscribers activos
//      de `onAuthStateChange`. Crece con cada mount, decrece con cada
//      unsubscribe. Acumulación monotónica = H2.
//   4. Mount/unmount separados por componente, con timestamp y si el effect
//      llegó a disparar el fetch. H4 predice: montó, disparó, se desmontó
//      antes del fetch, y al re-montar el efecto no volvió a correr.
//
// Timeouts subidos de 3s → 20s (pedido PO) para no confundir "colgó" con
// "solo lento". El cuelgue observado dura >26 min; 20s es más que suficiente
// para atrapar operaciones normales sin falso positivo.
// ============================================================================

const T0 = typeof performance !== 'undefined' ? performance.now() : 0;
const now = (): string => (typeof performance !== 'undefined' ? performance.now() - T0 : 0).toFixed(0);

let lastLogAt = 0;

/**
 * Log a consola con prefijo `[cuelgue +Xms]` para grep fácil. Actualiza el
 * timestamp del último log emitido — el snapshot lee `silenceSinceMs` para
 * saber cuánto lleva la app sin loguear nada, señal de dónde se estancó.
 */
export function cx(tag: string, extra?: unknown): void {
    const t = now();
    lastLogAt = Number(t);
    if (extra !== undefined) {
        // eslint-disable-next-line no-console
        console.log(`[cuelgue +${t}ms] ${tag}`, extra);
    } else {
        // eslint-disable-next-line no-console
        console.log(`[cuelgue +${t}ms] ${tag}`);
    }
}

/**
 * Envuelve una promise con un timeout de 20s (default) para loguear si
 * cuelga o resuelve. Loguea `tag:start` cuando comienza, `tag:resolved`
 * si resolvió, `tag:REJECTED_OR_TIMEOUT` si tiró o timeouteó.
 */
// PromiseLike en vez de Promise para aceptar thenables de supabase-js
// (PostgrestFilterBuilder implementa `.then()` pero no es `Promise`).
export async function cxTrack<T>(tag: string, p: PromiseLike<T>, timeoutMs = 20000): Promise<T> {
    cx(`${tag}:start`);
    const timeout = new Promise<never>((_, rej) => {
        setTimeout(() => rej(new Error(`[cuelgue] ${tag} timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
        const result = await Promise.race([p, timeout]);
        cx(`${tag}:resolved`);
        return result as T;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        cx(`${tag}:REJECTED_OR_TIMEOUT`, msg);
        throw err;
    }
}

/**
 * Helper para tracking mount/unmount de componentes. Devuelve la unmount fn
 * ready para usar como return del useEffect.
 *
 * Uso:
 *   useEffect(() => {
 *       const unmount = cxMount('pml');
 *       fetchProveedores();
 *       return unmount;
 *   }, []);
 *
 * H4 predice: si el fetch se llama antes del unmount pero el fetch nunca
 * completa Y al re-montar (deps=[]) el useEffect no vuelve a correr → el
 * componente muestra el spinner del state stale con cero request en vuelo.
 * El snapshot cruzado con los logs revela la secuencia.
 */
export function cxMount(compName: string): () => void {
    const id = Math.random().toString(36).slice(2, 8);
    cx(`mount:${compName}[${id}]`);
    return () => cx(`unmount:${compName}[${id}]`);
}

/**
 * Snapshot on-demand. Llamar desde consola durante un cuelgue activo:
 *   await __cuelgueDx()
 *
 * Recorte pedido por PO 2026-08-28: sacar tickTest, navigator.locks,
 * navigator.serviceWorker.getRegistrations() (ya respondidos por Tests 1-2
 * de consola). Focus 100% en H2 vs H4.
 *
 * Campos:
 *   uptimeMs             — cuánto lleva la app viva desde el primer import.
 *   lastLogAtMs          — timestamp del último log emitido con `cx()`.
 *   silenceSinceMs       — uptime - lastLog. Cuánto lleva sin loguear.
 *   supabaseClientEvals  — cuántas veces se evaluó lib/supabaseClient.
 *                          > 1 → múltiples instancias del módulo → H2.
 *   authSubscribers      — subscribers activos de onAuthStateChange.
 *                          Acumulación monotónica → H2.
 *   getSessionTest       — el cliente responde a getSession en <20s?
 *                          Timeout → H2 (cliente colgado).
 *                          Ok → discrimina hacia H4 (cliente sano pero
 *                          componente no llegó a llamarlo).
 *   dataFetchTest        — el cliente responde a un select anon-friendly
 *                          en <20s? categorias_servicio es SELECT público
 *                          (no requiere auth), distingue "colgó" de
 *                          "rechazó". rowCount > 0 = cliente OK end-to-end.
 *                          error con status distingue permisos vs cuelgue.
 */
if (typeof window !== 'undefined') {
    (window as any).__cuelgueDx = async (): Promise<Record<string, any>> => {
        const uptime = now();
        const snap: Record<string, any> = {
            uptimeMs: uptime,
            lastLogAtMs: lastLogAt,
            silenceSinceMs: Number(uptime) - lastLogAt,
            supabaseClientEvals: (window as any).__supabaseClientEvalCount ?? 'not-set',
            authSubscribers: (window as any).__pawnectaAuthSubscriberCount ?? 'not-set',
        };

        const supabase = (window as any).__pawnectaSupabase;

        // getSessionTest — 20s timeout, discrimina H2 (cliente colgado)
        if (!supabase) {
            snap.getSessionTest = 'supabase-not-exposed-yet';
        } else {
            try {
                snap.getSessionTest = await Promise.race([
                    supabase.auth.getSession().then((r: any) => ({
                        ok: true,
                        hasSession: !!r?.data?.session,
                        error: r?.error?.message ?? null,
                    })),
                    new Promise((resolve) =>
                        setTimeout(() => resolve({ ok: false, reason: 'timeout 20s' }), 20000)
                    ),
                ]);
            } catch (e) {
                snap.getSessionTest = { threw: e instanceof Error ? e.message : String(e) };
            }
        }

        // dataFetchTest — anon-friendly select, distingue "colgó" de "rechazó".
        // categorias_servicio es SELECT público (política vía RLS o grant a anon);
        // un cliente sano debería retornar filas o un error de auth explícito.
        if (!supabase) {
            snap.dataFetchTest = 'supabase-not-exposed-yet';
        } else {
            try {
                snap.dataFetchTest = await Promise.race([
                    supabase
                        .from('categorias_servicio')
                        .select('id')
                        .limit(1)
                        .then((r: any) => ({
                            ok: true,
                            rowCount: r?.data?.length ?? 0,
                            error: r?.error?.message ?? null,
                            status: r?.status ?? null,
                        })),
                    new Promise((resolve) =>
                        setTimeout(() => resolve({ ok: false, reason: 'timeout 20s' }), 20000)
                    ),
                ]);
            } catch (e) {
                snap.dataFetchTest = { threw: e instanceof Error ? e.message : String(e) };
            }
        }

        // eslint-disable-next-line no-console
        console.log('=== __cuelgueDx snapshot ===');
        // eslint-disable-next-line no-console
        console.log(snap);
        return snap;
    };
}
