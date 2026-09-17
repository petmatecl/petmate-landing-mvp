// e2e/specs/visits-doble/idempotencia-24h.spec.ts
// ---------------------------------------------------------------------------
// Sprint vistas-doble (2026-09-17) — verifica que abrir la misma ficha de
// servicio 2 veces en el mismo browser context (mismo visitor_hash) suma
// exactamente +1 al contador visitas_total, NO +2.
//
// El bug pre-fix: components/Servicio/ServiceDetailView.tsx:251 llamaba
// `supabase.rpc('incrementar_vistas', {...})` sin idempotencia además del
// hook useTrackVisit → registrar_visita (que sí es idempotente por
// (visitor_hash, día)). Consecuencia: cada mount de la ficha sumaba 1 al
// contador sin importar si el visitante ya la había visto.
//
// Fix aplicado en este mismo PR: quitar la línea 251 legacy. El único
// incrementador queda registrar_visita, idempotente por diseño.
//
// Este spec bloquea la regresión — si alguien reintroduce un incrementador
// sin idempotencia, dos opens dan +2 y el test falla.
//
// Nota: el spec corre en el project `visits-doble` con storageState
// proveedor por default, pero cada test overridea a storageState vacío
// para simular visitante anónimo (caso más común del catálogo público).
// La lectura del contador va con service_role via el patrón fixtures/
// supabase.ts.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con anon key (mismo que la app usa desde el cliente).
// Suficiente para SELECT del contador (público en la vista/tabla) sin
// necesidad de service_role.
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) {
    throw new Error('[visits-doble] Faltan E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY en e2e/.env.test');
}
const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Servicio semilla en staging. Fijo para no depender de fixtures pesados.
 * Verificado 2026-09-17: activo, no es del proveedor autenticado, tiene
 * contador positivo (evita el edge case de proveedor viendo su propia
 * ficha, que useTrackVisit no cuenta).
 */
const SERVICIO_SEMILLA = 'c1000001-0000-4000-8000-000000000006';

async function leerContador(): Promise<number> {
    const { data, error } = await supabase
        .from('servicios_publicados')
        .select('visitas_total')
        .eq('id', SERVICIO_SEMILLA)
        .single();
    if (error || !data) throw new Error(`Failed to read visitas_total: ${error?.message}`);
    return data.visitas_total as number;
}

test.describe('vistas-doble idempotencia 24h', () => {
    // Storage vacío = visitante anónimo (caso más común del catálogo).
    // Overridea el default del project (proveedor.json).
    test.use({ storageState: { cookies: [], origins: [] } });

    test('dos opens consecutivos de la misma ficha suman +1, no +2', async ({ page }) => {
        // Snapshot inicial ANTES de cualquier navegación.
        const inicial = await leerContador();

        // Primera apertura de la ficha.
        await page.goto(`/servicio/${SERVICIO_SEMILLA}`);
        // Espera al fire-and-forget del hook useTrackVisit (POST a
        // /api/visitor-hash + RPC registrar_visita). 3s es el mismo
        // buffer usado por el smoke manual del sprint.
        await page.waitForTimeout(3000);

        // Segunda apertura de la MISMA ficha con el MISMO context (mismo
        // IP + UA → mismo visitor_hash generado server-side).
        await page.goto(`/servicio/${SERVICIO_SEMILLA}`);
        await page.waitForTimeout(3000);

        // Snapshot final.
        const final = await leerContador();
        const delta = final - inicial;

        // Assertion: exactamente +1. Si algún incrementador sin idempotencia
        // se cuela de vuelta, delta será >= 2 y el test falla.
        expect(delta, `esperaba delta=1 (inicial=${inicial}, final=${final})`).toBe(1);
    });
});
