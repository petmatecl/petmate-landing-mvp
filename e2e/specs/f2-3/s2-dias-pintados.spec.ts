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
import { getSupabaseAdmin } from '../../fixtures/supabaseAdmin';
import {
    crearServicioCuidadoConF2,
    cleanupHuerfanosF23,
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import { abrirModalReservaEstadia, locatorDiaPicker } from '../../fixtures/panel-tutor';

function ymd(d: Date): string {
    return d.toISOString().slice(0, 10);
}

// Sprint f2-fix-drift (2026-11-19) — fechas del blackout ancladas al PRÓXIMO
// mes (día 10 desde, día 12 hasta). Garantiza que ambos días caen en un único
// mes visible del picker, sin cruzar límite de mes, sin importar el día actual.
// El bug anterior usaba offsets +10/+12 desde hoy: cerca de fin de mes (ej.
// hoy 19-Nov), hasta caía en el mes siguiente y el locator `.rdp-day` matcheaba
// un día "outside" del siguiente mes, siempre disabled → fail.
function fechasBlackoutProximoMes(): { desde: string; hasta: string } {
    const hoy = new Date();
    const mesSig = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
    const desde = new Date(mesSig.getFullYear(), mesSig.getMonth(), 10);
    const hasta = new Date(mesSig.getFullYear(), mesSig.getMonth(), 12);
    return { desde: ymd(desde), hasta: ymd(hasta) };
}

test.describe.serial('S2 — Días pintados: blackout + semi-abierto check-out libre', () => {
    let servicio: ServicioCuidadoListo;
    // Rango del blackout en el próximo mes: día 10 bloqueado + día 11 bloqueado;
    // día 12 libre (check-out, semi-abierto [10, 12)).
    const { desde: blackoutDesde, hasta: blackoutHasta } = fechasBlackoutProximoMes();

    test.beforeAll(async () => {
        const supabase = await getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        // Sprint F2-RESERVAS-CLEANUP (2026-09-23): cleanup con admin — ver s6.
        const admin = await getSupabaseAdmin();
        const cleanup = await cleanupHuerfanosF23(admin, proveedorId);
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
        // Sprint F2-RESERVAS-CLEANUP (2026-09-23): admin (service_role).
        const admin = await getSupabaseAdmin();
        await borrarServicioResiliente(admin, servicio.id);
    });

    test('días del blackout aparecen disabled, día de check-out libre', async ({ page }) => {
        await abrirModalReservaEstadia(page, servicio.id);
        await expect(page.locator('.rdp')).toBeVisible();

        // Las fechas están en el próximo mes por diseño (ver
        // fechasBlackoutProximoMes arriba); navegamos siempre al próximo mes.
        const [yDesde, mDesde, dDesde] = blackoutDesde.split('-').map(Number);
        const [yHasta, mHasta, dHasta] = blackoutHasta.split('-').map(Number);
        const fechaDesde = new Date(yDesde, mDesde - 1, dDesde);
        const fechaHasta = new Date(yHasta, mHasta - 1, dHasta);

        const nextBtn = page.getByRole('button', { name: /Go to the Next Month|next month|Ir al mes siguiente|Mes siguiente/i }).first();
        if (await nextBtn.isVisible().catch(() => false)) {
            await nextBtn.click();
        }

        // Sprint F2-FIXTURE-DRIFT — firma Date del helper desambigua cuando
        // hay 2 meses visibles. El día del blackout debe estar disabled.
        const diaDesde = locatorDiaPicker(page, fechaDesde);
        await expect(diaDesde).toBeVisible();
        // react-day-picker v8 marca disabled días con `aria-disabled="true"` o
        // atributo `disabled`. Chequeamos ambos por robustez.
        const isDisabled = await diaDesde.evaluate((el) =>
            el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('rdp-day_disabled')
        );
        expect(isDisabled, `día ${dDesde} del blackout debería estar disabled`).toBe(true);

        // El día de check-out (semi-abierto) NO debe estar disabled — es el día
        // en que la mascota se va, libre para nueva estadía.
        const diaHasta = locatorDiaPicker(page, fechaHasta);
        await expect(diaHasta).toBeVisible();
        const hastaIsDisabled = await diaHasta.evaluate((el) =>
            el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('rdp-day_disabled')
        );
        expect(hastaIsDisabled, `día ${dHasta} (check-out del blackout) debería estar LIBRE, no disabled`).toBe(false);
    });
});
