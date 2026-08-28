// pages/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════
// SPRINT CUELGUE-DIAG (2026-08-28) — INSTRUMENTACIÓN TEMPORAL
// Discriminador H2 (singleton corrupto / múltiples instancias).
// Cada vez que este módulo se evalúa, incrementa un contador global.
// Si el contador es > 1 en un snapshot, hay múltiples instancias del
// módulo → hipótesis H2 confirmada como al menos plausible. NO merge a
// main. Ver lib/cuelgueTelemetry.ts para el sprint completo.
// ═══════════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
    (window as any).__supabaseClientEvalCount = ((window as any).__supabaseClientEvalCount ?? 0) + 1;
    // eslint-disable-next-line no-console
    console.log(`[cuelgue] supabaseClient.ts eval #${(window as any).__supabaseClientEvalCount}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn("WARNING: NEXT_PUBLIC_SUPABASE_URL is missing. Supabase client will fail.");
}

// Proxy Logic: Keep original URL on server, use absolute proxy URL on client to bypass AdBlock
const isBrowser = typeof window !== 'undefined';
let clientUrl = supabaseUrl;

if (isBrowser) {
    // supabase-js requires an absolute URL. We construct it from the current location.
    // This allows it to work on localhost, vercel, or custom domain dynamically.
    // const origin = window.location.origin;
    // clientUrl = `${origin}/supabase-proxy`;
}

// Workaround para issue supabase-js#2111: el Web Locks API (default del SDK)
// queda orphaned tras unmount/refresh/bfcache, colgando getSession()
// indefinidamente. Reemplazamos con un lock no-op que ejecuta directo.
// Tradeoff: sin protección contra concurrent auth ops entre tabs (aceptable
// en pre-launch). Plan B: lock custom con timeout explícito si aparecen
// regresiones multi-tab.
const noOpLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    return await fn();
};

export const supabase = createClient(clientUrl, supabaseAnonKey, {
    auth: { lock: noOpLock },
});

// ═══════════════════════════════════════════════════════════════════════
// SPRINT CUELGUE-DIAG (2026-08-28) — INSTRUMENTACIÓN TEMPORAL
// Discriminador H2 vs H4 (pedido explícito PO).
//
// 1. Expose `supabase` en window para poder consultarlo desde consola
//    durante un cuelgue activo:
//        await window.__pawnectaSupabase.from('categorias_servicio').select('id').limit(1)
//    Si responde → cliente sano, cuelgue está en el componente → H4.
//    Si cuelga también → cliente muerto → H2.
//
// 2. Monkey-patch `onAuthStateChange` para contar subscribers activos.
//    Cada mount de UserContext + OnlineStatusProvider suma; cada
//    unsubscribe resta. Acumulación monotónica (crece sin decrecer al
//    unmount) → subscribers orphan → H2.
//
// NO merge a main. Cero cambio a comportamiento (los wrappers delegan
// al método original 100%). Ver lib/cuelgueTelemetry.ts para el sprint.
// ═══════════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
    (window as any).__pawnectaSupabase = supabase;

    (window as any).__pawnectaAuthSubscriberCount = 0;
    const _origOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);
    supabase.auth.onAuthStateChange = ((cb: any) => {
        (window as any).__pawnectaAuthSubscriberCount += 1;
        // eslint-disable-next-line no-console
        console.log(`[cuelgue] onAuthStateChange +1 → count=${(window as any).__pawnectaAuthSubscriberCount}`);
        const result = _origOnAuthStateChange(cb);
        const _origUnsub = result.data.subscription.unsubscribe.bind(result.data.subscription);
        result.data.subscription.unsubscribe = () => {
            (window as any).__pawnectaAuthSubscriberCount -= 1;
            // eslint-disable-next-line no-console
            console.log(`[cuelgue] onAuthStateChange -1 → count=${(window as any).__pawnectaAuthSubscriberCount}`);
            return _origUnsub();
        };
        return result;
    }) as typeof supabase.auth.onAuthStateChange;
}
