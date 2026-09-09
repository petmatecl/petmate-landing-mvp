// e2e/specs/launch-l1/case6-notify-degraded.spec.ts
// ---------------------------------------------------------------------------
// L1-2 · CASE-6 · Contract test del endpoint /api/admin/notify-nueva-solicitud
// en su nuevo modo DEGRADADO.
//
// Contexto: sprint L1-2 (2026-09-09) modificó signup.ts para destructurar
// `.error` del lookup de providerId + Sentry + fallback path. Cuando el
// lookup falla, signup ahora manda al endpoint payload `{ fallback:
// { email, nombre, apellido_p, rut, comuna } }` sin providerId. El endpoint
// debe aceptar ese modo, enviar el email al admin con prefijo "[DEGRADADO]",
// y responder `{ ok: true, mode: 'degraded' }`.
//
// Este spec verifica el CONTRATO del endpoint (los 3 modos: normal / degradado
// / body inválido), no la orquestación end-to-end de signup → endpoint. La
// orquestación queda cubierta por el smoke manual de signup en prod que hace
// el PO periódicamente.
//
// El endpoint requiere `verifyInternalSecret` — pasamos el header
// `x-internal-secret` con el valor del env (defaultean a 'pawnecta-internal'
// si no está seteado, mismo default que usa signup.ts).
//
// Corre bajo project `chromium` (no requiere UI). Cero login del user, cero
// storageState — solo request HTTP directo al preview.
//
// **NO valida el envío real del email a Resend** — eso requiere probar
// el inbox del admin y no es determinístico. Se valida que el endpoint
// clasifica correctamente el request y responde en el shape esperado.
// El envío real sigue cubierto por el skipped:true del propio endpoint
// cuando Resend rechaza.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

// No requiere login — endpoint server-to-server con internal secret.
test.use({ storageState: { cookies: [], origins: [] } });

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'pawnecta-internal';

test.describe('L1-2 · CASE-6 · notify-nueva-solicitud modo degradado', () => {
    test('POST con fallback (sin proveedorId) → 200 + mode:degraded', async ({ request, baseURL }) => {
        const res = await request.post(`${baseURL}/api/admin/notify-nueva-solicitud?x-vercel-protection-bypass=${encodeURIComponent(process.env.PLAYWRIGHT_BYPASS ?? '')}`, {
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': INTERNAL_SECRET,
            },
            data: {
                fallback: {
                    email: 'test-l1-case6-degradado@ejemplo.cl',
                    nombre: 'Test',
                    apellido_p: 'CASE6',
                    // rut y comuna opcionales — omito para probar el path mínimo.
                },
            },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        // El endpoint devuelve `mode: 'degraded'` en el envelope response
        // sea success (ok:true) o skipped (Resend rate limit, dominio caído).
        // Ambos son válidos para el contract test — lo que verificamos es
        // que el modo se identificó correctamente.
        expect(body).toHaveProperty('mode', 'degraded');
    });

    test('POST con proveedorId (modo normal) NO trae `mode` en el response', async ({ request, baseURL }) => {
        // Uso un UUID inexistente para forzar el path "proveedor no
        // encontrado" (200 skipped). El endpoint acepta y responde sin
        // el prop `mode` (que es exclusivo del degradado).
        const res = await request.post(`${baseURL}/api/admin/notify-nueva-solicitud?x-vercel-protection-bypass=${encodeURIComponent(process.env.PLAYWRIGHT_BYPASS ?? '')}`, {
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': INTERNAL_SECRET,
            },
            data: {
                proveedorId: '00000000-0000-0000-0000-000000000000',
            },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        // Modo NORMAL nunca setea `mode`. Cualquier valor de body es OK
        // mientras no venga `mode: 'degraded'`.
        expect(body.mode).toBeUndefined();
    });

    test('POST vacío (ni proveedorId ni fallback) → 400', async ({ request, baseURL }) => {
        const res = await request.post(`${baseURL}/api/admin/notify-nueva-solicitud?x-vercel-protection-bypass=${encodeURIComponent(process.env.PLAYWRIGHT_BYPASS ?? '')}`, {
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': INTERNAL_SECRET,
            },
            data: {},
        });
        expect(res.status()).toBe(400);
    });

    test('POST fallback incompleto (sin email) → 400', async ({ request, baseURL }) => {
        // El endpoint requiere al menos email + nombre en el fallback.
        // Sin email cae al `if (!proveedorId ...)` → 400.
        const res = await request.post(`${baseURL}/api/admin/notify-nueva-solicitud?x-vercel-protection-bypass=${encodeURIComponent(process.env.PLAYWRIGHT_BYPASS ?? '')}`, {
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': INTERNAL_SECRET,
            },
            data: {
                fallback: {
                    nombre: 'Sin email',
                    apellido_p: 'Test',
                },
            },
        });
        expect(res.status()).toBe(400);
    });

    test('POST sin `x-internal-secret` → 403', async ({ request, baseURL }) => {
        const res = await request.post(`${baseURL}/api/admin/notify-nueva-solicitud?x-vercel-protection-bypass=${encodeURIComponent(process.env.PLAYWRIGHT_BYPASS ?? '')}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                fallback: {
                    email: 'x@x.cl',
                    nombre: 'X',
                },
            },
        });
        expect(res.status()).toBe(403);
    });
});
