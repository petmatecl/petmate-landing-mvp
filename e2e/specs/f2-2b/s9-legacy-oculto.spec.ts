// e2e/specs/f2-2b/s9-legacy-oculto.spec.ts
// ---------------------------------------------------------------------------
// S9 — Bloque legacy "Disponibilidad" (7 días Lun-Dom del JSONB) debe:
//   * Ocultarse cuando F2 (usaAgendaEstadia) está ON en cuidado.
//   * Reaparecer cuando F2 se apaga.
//   * Ocultarse sin regresión cuando F1 (usaAgendaReal) está ON en paseos.
//
// Fix F2-2B-C: gate ampliado a `!usaAgendaReal && !usaAgendaEstadia`.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoEfimero,
    crearServicioPaseosEfimero,
    borrarServicioResiliente,
    cleanupHuerfanos,
    ServicioEfimero,
} from '../../fixtures/servicio-efimero';
import { abrirEditorServicio, activarF2, desactivarF2 } from '../../fixtures/panel-proveedor';

/** El bloque legacy tiene un botón "Lun" único que solo aparece en él. */
function legacyDiaLunes(page: import('@playwright/test').Page) {
    return page.getByRole('button', { name: 'Lun', exact: true });
}

/** El label del F1 toggle — para servicios de paseos. */
async function activarF1(page: import('@playwright/test').Page) {
    const label = page.getByText('Usar agenda con disponibilidad real');
    await expect(label).toBeVisible({ timeout: 5_000 });
    const parent = label.locator('xpath=ancestor::label[1]');
    const checkbox = parent.locator('input[type="checkbox"]');
    if (!(await checkbox.isChecked())) {
        await parent.click();
    }
    await expect(checkbox).toBeChecked();
}

test.describe.serial('S9 — Bloque legacy oculto/reaparece según toggle', () => {
    let servicioCuidado: ServicioEfimero;
    let servicioPaseos: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S9 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicioCuidado = await crearServicioCuidadoEfimero(supabase, proveedorId);
        servicioPaseos = await crearServicioPaseosEfimero(supabase, proveedorId);
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAsProveedor();
        if (servicioCuidado) await borrarServicioResiliente(supabase, servicioCuidado.id);
        if (servicioPaseos) await borrarServicioResiliente(supabase, servicioPaseos.id);
    });

    test('cuidado con F2 OFF → bloque legacy visible', async ({ page }) => {
        await abrirEditorServicio(page, servicioCuidado.titulo);
        await expect(legacyDiaLunes(page)).toBeVisible();
    });

    test('cuidado con F2 ON → bloque legacy oculto', async ({ page }) => {
        await abrirEditorServicio(page, servicioCuidado.titulo);
        await activarF2(page);
        await expect(legacyDiaLunes(page)).not.toBeVisible();
    });

    test('cuidado apagar F2 → bloque legacy reaparece', async ({ page }) => {
        await abrirEditorServicio(page, servicioCuidado.titulo);
        await activarF2(page);
        await expect(legacyDiaLunes(page)).not.toBeVisible();
        await desactivarF2(page);
        await expect(legacyDiaLunes(page)).toBeVisible();
    });

    test('paseos con F1 OFF → bloque legacy visible (sin regresión)', async ({ page }) => {
        await abrirEditorServicio(page, servicioPaseos.titulo);
        await expect(legacyDiaLunes(page)).toBeVisible();
    });

    test('paseos con F1 ON → bloque legacy oculto (sin regresión F1)', async ({ page }) => {
        await abrirEditorServicio(page, servicioPaseos.titulo);
        await activarF1(page);
        await expect(legacyDiaLunes(page)).not.toBeVisible();
    });
});
