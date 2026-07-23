// e2e/specs/f2-2b/s3-round-trip.spec.ts
// ---------------------------------------------------------------------------
// S3 — Round-trip por UI: crear 2 bloqueos, guardar, cerrar+reabrir el
// editor, verificar que persisten con fechas + motivo intactos.
//
// El check SQL del diff quirúrgico (mismo id en UPDATE vs INSERT+DELETE)
// queda como S4 manual — este test solo afirma persistencia visible desde
// la UI, que es lo que el proveedor realmente ve.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoEfimero,
    borrarServicioResiliente,
    cleanupHuerfanos,
    ServicioEfimero,
} from '../../fixtures/servicio-efimero';
import { abrirEditorServicio, activarF2, clickGuardar } from '../../fixtures/panel-proveedor';

function ymdEnFuturo(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

test.describe('S3 — Round-trip de bloqueos (persistencia por UI)', () => {
    let servicio: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S3 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoEfimero(supabase, proveedorId);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('crear 2 bloqueos, guardar, reabrir → ambos persisten', async ({ page }) => {
        const fechaA = ymdEnFuturo(10);
        const finA = ymdEnFuturo(17);       // 7 noches
        const motivoA = 'Vacaciones en Pucón';

        const fechaB = ymdEnFuturo(60);
        const finB = ymdEnFuturo(63);       // 3 noches
        // Blackout B sin motivo

        // === CREACIÓN + GUARDADO =============================================
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);

        // Bloqueo 1: con motivo
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();
        const fila0 = page.locator('#blackout-row-0');
        const [f0Desde, f0Hasta] = await fila0.locator('input[type="date"]').all();
        await f0Desde.fill(fechaA);
        await f0Hasta.fill(finA);
        await fila0.getByPlaceholder(/Motivo/i).fill(motivoA);
        await expect(fila0.getByText('(7 noches)')).toBeVisible();

        // Bloqueo 2: sin motivo
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();
        const fila1 = page.locator('#blackout-row-1');
        const [f1Desde, f1Hasta] = await fila1.locator('input[type="date"]').all();
        await f1Desde.fill(fechaB);
        await f1Hasta.fill(finB);
        await expect(fila1.getByText('(3 noches)')).toBeVisible();

        await clickGuardar(page);

        // Toast de éxito (sonner) y modal cerrado. Sonner renderiza el toast
        // dos veces en el DOM (probablemente para reader accessibility fuera
        // del viewport), por eso .first() — no importa cuál instancia
        // matchee, solo que el texto esté ahí.
        await expect(
            page.locator('li[data-sonner-toast]').getByText(/actualizado correctamente/i).first()
        ).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('#servicio-titulo')).not.toBeVisible({ timeout: 10_000 });

        // === REAPERTURA + VERIFICACIÓN =====================================
        await abrirEditorServicio(page, servicio.titulo);

        // F2 debe seguir ON (persistencia del toggle también)
        const toggleF2 = page.locator('label', {
            has: page.getByText('Aceptar reservas por rango de noches'),
        }).locator('input[type="checkbox"]');
        await expect(toggleF2).toBeChecked();

        // Dos filas de bloqueos, con las fechas guardadas
        const filasBlk = page.locator('[id^="blackout-row-"]');
        await expect(filasBlk).toHaveCount(2);

        // Fila 0 = fecha más temprana (order: ascending en fetch)
        const rf0 = page.locator('#blackout-row-0');
        const [rf0Desde, rf0Hasta] = await rf0.locator('input[type="date"]').all();
        await expect(rf0Desde).toHaveValue(fechaA);
        await expect(rf0Hasta).toHaveValue(finA);
        await expect(rf0.getByPlaceholder(/Motivo/i)).toHaveValue(motivoA);
        await expect(rf0.getByText('(7 noches)')).toBeVisible();

        // Fila 1 = fecha más tardía
        const rf1 = page.locator('#blackout-row-1');
        const [rf1Desde, rf1Hasta] = await rf1.locator('input[type="date"]').all();
        await expect(rf1Desde).toHaveValue(fechaB);
        await expect(rf1Hasta).toHaveValue(finB);
        // Sin motivo — input vacío
        await expect(rf1.getByPlaceholder(/Motivo/i)).toHaveValue('');
        await expect(rf1.getByText('(3 noches)')).toBeVisible();
    });
});
