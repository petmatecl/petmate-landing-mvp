// e2e/specs/f2-2b/s5-validaciones-blackouts.spec.ts
// ---------------------------------------------------------------------------
// S5 — Validaciones inline de bloqueos:
//   * fecha_fin <= fecha (mismo día / invertido)
//   * duplicado exacto (mismo par fecha/fecha_fin)
//   * motivo > 200 chars
//   * error se limpia cuando el usuario tipea en un campo de la fila
//   * scroll al primer error tras submit inválido
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

test.describe.serial('S5 — Validaciones inline de bloqueos', () => {
    let servicio: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S5 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoEfimero(supabase, proveedorId);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('fecha_fin igual a fecha → error inline "mínimo 1 noche" + estilo rojo', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();

        const fila = page.locator('#blackout-row-0');
        const [inputFecha, inputFin] = await fila.locator('input[type="date"]').all();
        const misma = ymdEnFuturo(10);
        await inputFecha.fill(misma);
        await inputFin.fill(misma);

        await clickGuardar(page);

        // Error inline con texto sobre "mínimo 1 noche"
        await expect(fila.getByText(/mínimo 1 noche|posterior a la de inicio/i)).toBeVisible();
        // Toast agregador
        await expect(page.getByText(/Revisa los bloqueos marcados en rojo/i).first()).toBeVisible();

        // Fila con fondo de error (bg-danger-50 / border-danger-300)
        await expect(fila).toHaveClass(/danger/);
    });

    test('editar el campo con error limpia el mensaje y el estilo', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();

        const fila = page.locator('#blackout-row-0');
        const [inputFecha, inputFin] = await fila.locator('input[type="date"]').all();
        const misma = ymdEnFuturo(20);
        await inputFecha.fill(misma);
        await inputFin.fill(misma);
        await clickGuardar(page);

        // Aparece el error
        await expect(fila.getByText(/posterior|mínimo 1 noche/i)).toBeVisible();

        // Ampliar fecha_fin → error desaparece
        await inputFin.fill(ymdEnFuturo(23));
        await expect(fila.getByText(/posterior|mínimo 1 noche/i)).not.toBeVisible();
        // Y la clase de danger sale del wrapper
        await expect(fila).not.toHaveClass(/danger/);
    });

    test('dos bloqueos con mismo (fecha, fecha_fin) → segundo marcado como duplicado', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);

        const desde = ymdEnFuturo(30);
        const hasta = ymdEnFuturo(33);

        // Bloqueo 1
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();
        const fila0 = page.locator('#blackout-row-0');
        const [f0d, f0h] = await fila0.locator('input[type="date"]').all();
        await f0d.fill(desde);
        await f0h.fill(hasta);

        // Bloqueo 2 duplicado exacto
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();
        const fila1 = page.locator('#blackout-row-1');
        const [f1d, f1h] = await fila1.locator('input[type="date"]').all();
        await f1d.fill(desde);
        await f1h.fill(hasta);

        await clickGuardar(page);

        // Fila 0 sin error (limpia por diseño), fila 1 con error de duplicado
        await expect(fila1.getByText(/Duplicado/i)).toBeVisible();
        await expect(fila1).toHaveClass(/danger/);
        await expect(fila0).not.toHaveClass(/danger/);
    });

    test('motivo > 200 chars → error inline (maxLength lo previene, defensa server)', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();

        const fila = page.locator('#blackout-row-0');
        const [inputFecha, inputFin] = await fila.locator('input[type="date"]').all();
        await inputFecha.fill(ymdEnFuturo(10));
        await inputFin.fill(ymdEnFuturo(14));

        // El input tiene maxLength=200 — verificar que trunca al escribir 250
        const motivoInput = fila.getByPlaceholder(/Motivo/i);
        const cadena250 = 'x'.repeat(250);
        await motivoInput.fill(cadena250);
        // maxLength del input trunca a 200 caracteres
        await expect(motivoInput).toHaveValue('x'.repeat(200));
    });
});
