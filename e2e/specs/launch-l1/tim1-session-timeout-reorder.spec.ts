// e2e/specs/launch-l1/tim1-session-timeout-reorder.spec.ts
// ---------------------------------------------------------------------------
// L1-3 · TIM-1 · Regresión "SessionTimeout expulsa tras inactividad".
//
// Bug preexistente descubierto por PO 2026-08-27 (BACKLOG L221):
// el path "F5 tras inactividad de 10+ min expulsa a /security-logout"
// NUNCA funcionó porque los event listeners de interacción se
// registraban ANTES del check async, y cualquier mousemove disparado
// durante la ventana [mount → check completion] pisaba el marker antes
// de que checkInactivityOnMount lo leyera.
//
// Fix (L1-3): reorden de listeners — registro DENTRO de init(),
// DESPUÉS del check async. Cero race con mousemove pre-check.
//
// Alcance de este spec — decisión operativa 2026-09-11 (2ª iteración
// tras dos fallos idénticos en CI del `mouse.move` previo):
//
//   El fix es una defensa contra un race condition de ~200ms entre
//   mount de mount 2 (post-reload) y completion de checkInactivityOnMount.
//   Reproducir ese race en Playwright requeriría inyectar un mousemove
//   EXACTAMENTE dentro de esa ventana en mount 2, sin trigger en
//   mount 1 — no hay API que garantice ese timing (page.mouse.move
//   antes de page.reload dispara sobre los listeners ya activos de
//   mount 1, pisando el marker ANTES del test — resultado: falso
//   negativo repetible que ambos runs de PR #17 mostraron).
//
//   Este spec verifica el path OBSERVABLE que un usuario final ejerce:
//   "vuelvo a la app tras 10+ min de inactividad, F5 me expulsa a
//   /security-logout". Con marker viejo colocado directamente en
//   localStorage y reload sin interferencia, ambas versiones del código
//   (pre-fix y post-fix) deberían expulsar — el race del fix no es
//   observable en este test, pero el comportamiento visible sí lo es,
//   y esa señal se mantiene viva.
//
//   Si el bug del race vuelve a manifestarse (F5 con mouse en movimiento
//   sobre la ventana no expulsa), se detectará por reporte del PO, no
//   por esta suite — es limitación aceptada del testing e2e. Corolario
//   P8 aplicado: no dejamos verificación instrumental que no valida lo
//   que declara (mouse.move sobre mount 1 no valida reorder de mount 2).
//
// Corre bajo project `chromium` (Aldo proveedor). Sin browser-side
// clock mock — usamos setItem con un timestamp real de 20 min atrás,
// que es el mecanismo real que el guard evalúa (Date.now() -
// lastActivity).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'pawnecta_last_activity';

test.describe('L1-3 · TIM-1 · SessionTimeout expulsa tras inactividad', () => {
    test('marker 20 min atrás + F5 → expulsa a /security-logout', async ({ page }) => {
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

        // 3. F5 — dispara SessionTimeout useEffect en el mount fresh.
        //    init() corre checkInactivityOnMount() PRIMERO, detecta
        //    marker viejo (>10 min), llama handleLogout(), redirige a
        //    /security-logout, cero listeners registrados en mount 2.
        //    NO simulamos mousemove pre-reload — dispararía los listeners
        //    de mount 1 (que ya completaron init) y pisaría el marker
        //    antes del reload, falseando el test (ver comentario superior).
        await page.reload();

        // 4. Verifico expulsión.
        await page.waitForURL(/\/security-logout/, { timeout: 15_000 });
        expect(page.url()).toContain('/security-logout');

        // 5. Verifico que handleLogout limpió el marker (línea 98 del
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
