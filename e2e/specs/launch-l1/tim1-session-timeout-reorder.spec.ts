// e2e/specs/launch-l1/tim1-session-timeout-reorder.spec.ts
// ---------------------------------------------------------------------------
// L1-3 · TIM-1 · Regresión "SessionTimeout roto desde primer commit".
//
// Bug preexistente descubierto por PO 2026-08-27 (BACKLOG L221):
// el path "F5 tras inactividad de 10+ min expulsa a /security-logout"
// NUNCA funcionó porque los event listeners de interacción se
// registraban ANTES del check async, y cualquier mousemove post-F5
// pisaba el marker antes de que checkInactivityOnMount lo leyera.
// El smoke positivo-conocido del PO: seteo marker 20 min atrás, F5
// en /proveedor debe expulsar → no expulsaba, marker se pisó a NOW.
//
// Fix (L1-3): reorden de listeners — registro DENTRO de init(),
// DESPUÉS del check async. Cero race con mousemove pre-check.
//
// Este spec fija el contrato con Playwright:
//   1. Login como Aldo (setup default proveedor).
//   2. Navego a /proveedor.
//   3. Seteo marker de last_activity a 20 min atrás vía page.evaluate.
//   4. Simulo mousemove (equivalente al gesto real que provocaba el
//      race — el user movió el mouse para presionar F5). Con el fix
//      correcto, el mousemove NO puede pisar el marker porque el
//      handler todavía NO está registrado hasta que el check corra.
//   5. F5 (page.reload).
//   6. Verifico expulsión a /security-logout.
//   7. Verifico marker limpio (handleLogout hace removeItem L98).
//
// Corre bajo project `chromium` (Aldo proveedor). Sin browser-side
// clock mock — usamos setItem con un timestamp real de 20 min atrás,
// que es el mecanismo real que el guard evalúa (Date.now() -
// lastActivity).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'pawnecta_last_activity';
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;

test.describe('L1-3 · TIM-1 · SessionTimeout expulsa tras inactividad', () => {
    test('marker 20 min atrás + F5 con mousemove previo → expulsa a /security-logout', async ({ page }) => {
        // 1. Arranco en /proveedor con la sesión de Aldo del storageState.
        await page.goto('/proveedor');
        await expect(page.getByRole('button', { name: /Mis Servicios/i }).first())
            .toBeVisible({ timeout: 15_000 });

        // 2. Seteo el marker de última actividad a 20 min atrás. Simulo
        //    el estado "el user cerró la tab hace rato y ahora volvió".
        //    Usamos localStorage.setItem directamente — es el mismo
        //    mecanismo que el guard de SessionTimeout evalúa.
        const veinte_min_atras = Date.now() - 20 * 60 * 1000;
        await page.evaluate(([key, ts]) => {
            localStorage.setItem(key as string, String(ts));
        }, [STORAGE_KEY, veinte_min_atras]);

        // Sanity: el marker viejo quedó.
        const markerAntes = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
        expect(markerAntes).toBe(String(veinte_min_atras));

        // 3. Simulo mousemove ANTES del reload — mismo gesto que hacía
        //    el user al mover el mouse para presionar F5. Con el bug
        //    preexistente, el listener sync pisaría el marker antes del
        //    check. Con el fix, el listener no está montado todavía en
        //    ese instante (se registra dentro de init() post-check).
        await page.mouse.move(100, 100);
        await page.mouse.move(200, 200);
        await page.mouse.move(300, 300);

        // 4. F5 — dispara SessionTimeout useEffect en el mount fresh.
        //    Con el fix: init() corre checkInactivityOnMount() PRIMERO,
        //    detecta marker viejo (>10 min), llama handleLogout(),
        //    redirige a /security-logout, cero listeners registrados.
        await page.reload();

        // 5. Verifico expulsión.
        await page.waitForURL(/\/security-logout/, { timeout: 15_000 });
        expect(page.url()).toContain('/security-logout');

        // 6. Verifico que handleLogout limpió el marker (línea 98 del
        //    componente: localStorage.removeItem(STORAGE_KEY)).
        const markerDespues = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
        expect(markerDespues).toBeNull();
    });

    test('marker fresco (justo activo) + F5 → NO expulsa, sigue en /proveedor', async ({ page }) => {
        // Regresión: el fix NO debe expulsar cuando el marker es fresco.
        // Un user activo hace F5 y debe seguir en la misma página.
        await page.goto('/proveedor');
        await expect(page.getByRole('button', { name: /Mis Servicios/i }).first())
            .toBeVisible({ timeout: 15_000 });

        // Marker de "hace 1 minuto" — bien dentro del INACTIVITY_LIMIT.
        const un_min_atras = Date.now() - 60 * 1000;
        await page.evaluate(([key, ts]) => {
            localStorage.setItem(key as string, String(ts));
        }, [STORAGE_KEY, un_min_atras]);

        await page.reload();
        // Sigo en /proveedor (no /security-logout).
        await expect(page.getByRole('button', { name: /Mis Servicios/i }).first())
            .toBeVisible({ timeout: 15_000 });
        expect(page.url()).not.toContain('/security-logout');
    });
});
