import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Check 6 de 6.
 *
 * API catálogo — POST al RPC Supabase `buscar_servicios` del proyecto
 * prod, status 200 + array no vacío.
 *
 * El "API del catálogo" de Pawnecta NO es un endpoint REST propio bajo
 * /api/. El catálogo se consulta directamente al RPC de Supabase desde
 * el cliente (ver pages/explorar.tsx:386 `supabase.rpc('buscar_servicios')`).
 * Este smoke replica ese call con las claves públicas del proyecto
 * (anon key — valor público ya expuesto en el bundle del cliente de prod,
 * seguro de hardcodear acá).
 *
 * Si la RPC rompe, /explorar queda vacío → impacto directo en funnel
 * tutor. Este check es la señal server-side del backend del catálogo.
 */

// URL del proyecto Supabase prod (público).
const SUPABASE_URL = 'https://ouezpeeiwjwawauidrqq.supabase.co';
// Anon key del proyecto prod — públicamente expuesta en el bundle del cliente
// (ver next.config.js + NEXT_PUBLIC_SUPABASE_ANON_KEY). Hardcodearla acá es
// seguro: sin service_role, es la misma key que cualquier visitante anónimo
// de la web ya tiene en el bundle JS. RLS enforce acceso igual que al
// cliente real.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZXpwZWVpd2p3YXdhdWlkcnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MjAzODksImV4cCI6MjA3NTA5NjM4OX0.QaCigP-dAdh8nCuHOhTlI69VkJM704HAA_N_LG0Jz2A';

test('RPC buscar_servicios responde 200 con array no vacío', async ({ request }) => {
    const resp = await request.post(`${SUPABASE_URL}/rest/v1/rpc/buscar_servicios`, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        data: {
            // Mismos parámetros que un hit anónimo a /explorar sin filtros:
            // cero filter de categoría, cero comuna, limit 10.
            p_categoria_slug: null,
            p_comuna: null,
            p_precio_max: null,
            p_precio_min: null,
            p_texto: null,
            p_limit: 10,
            p_offset: 0,
            p_inclusiones: null,
            p_modalidad: null,
            p_orden: null,
        },
    });

    expect(resp.status(), 'RPC debe responder 200').toBe(200);

    const body = await resp.json();
    expect(Array.isArray(body), 'RPC debe retornar array').toBe(true);
    expect(body.length, 'array debe tener al menos 1 fila').toBeGreaterThan(0);
});
