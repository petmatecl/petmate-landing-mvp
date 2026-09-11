// e2e/specs/f2-3/s2-dias-pintados.spec.ts
// ---------------------------------------------------------------------------
// S2 — Días pintados según razón del endpoint disponibilidad:
//   * Blackout — disabled en el picker.
//   * Check-out del blackout (día Y de [X, Y)) — LIBRE, verifica semi-abierto.
//   * Sin anticipación mínima (fixture con anticipacion_min_dias=0) — hoy es
//     clickeable en principio, pero el test se enfoca en la lógica de
//     blackout/semi-abierto que es el diferencial F2 vs F1.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoConF2,
    cleanupHuerfanosF23,
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import { abrirModalReservaEstadia, locatorDiaPicker } from '../../fixtures/panel-tutor';

function ymdEnFuturo(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

test.describe.serial('S2 — Días pintados: blackout + semi-abierto check-out libre', () => {
    let servicio: ServicioCuidadoListo;
    // Rango del blackout: 10 y 11 días desde hoy bloqueados; día 12 libre (check-out).
    const blackoutDesde = ymdEnFuturo(10);
    const blackoutHasta = ymdEnFuturo(12);   // check-out (día 12 = LIBRE)

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanosF23(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S2 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoConF2(supabase, {
            proveedorId,
            blackouts: [
                { fecha: blackoutDesde, fecha_fin: blackoutHasta, motivo: 'e2e s2 blackout' },
            ],
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('días del blackout aparecen disabled, día de check-out libre', async ({ page }) => {
        await abrirModalReservaEstadia(page, servicio.id);
        await expect(page.locator('.rdp')).toBeVisible();

        // Extraer números de día para blackoutDesde, blackoutHasta.
        const desdeDay = parseInt(blackoutDesde.split('-')[2], 10);
        const hastaDay = parseInt(blackoutHasta.split('-')[2], 10);
        const desdeMonth = parseInt(blackoutDesde.split('-')[1], 10);
        const hoyMonth = new Date().getMonth() + 1;

        // Si el blackout está en el mes siguiente, navegar al picker.
        if (desdeMonth !== hoyMonth) {
            const nextBtn = page.getByRole('button', { name: /Go to the Next Month|next month|Ir al mes siguiente|Mes siguiente/i }).first();
            if (await nextBtn.isVisible().catch(() => false)) {
                await nextBtn.click();
            }
        }

        // El día `desdeDay` (dentro del blackout) debe estar disabled.
        const diaDesde = locatorDiaPicker(page, desdeDay);
        await expect(diaDesde).toBeVisible();
        // react-day-picker v8 marca disabled días con `aria-disabled="true"` o
        // atributo `disabled`. Chequeamos ambos por robustez.
        const isDisabled = await diaDesde.evaluate((el) =>
            el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('rdp-day_disabled')
        );
        expect(isDisabled, `día ${desdeDay} del blackout debería estar disabled`).toBe(true);

        // El día `hastaDay` (check-out del blackout, semi-abierto) NO debe estar
        // disabled — es el día en que la mascota se va, libre para nueva estadía.
        const diaHasta = locatorDiaPicker(page, hastaDay);
        await expect(diaHasta).toBeVisible();
        const hastaIsDisabled = await diaHasta.evaluate((el) =>
            el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('rdp-day_disabled')
        );
        expect(hastaIsDisabled, `día ${hastaDay} (check-out del blackout) debería estar LIBRE, no disabled`).toBe(false);
    });
});
