// e2e/specs/f2-2b/s6-inline-min-max.spec.ts
// ---------------------------------------------------------------------------
// S6 — Inline error + scroll para min/max noches. Valida el mecanismo
// showFieldError → requestAnimationFrame → scrollIntoView del fix F2-2B-B.
//
// Caso principal: max < min → error inline en el campo max + border rojo,
// toast en paralelo, error se limpia al tipear en el campo.
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

test.describe.serial('S6 — Inline error en max noches < min noches', () => {
    let servicio: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S6 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoEfimero(supabase, proveedorId);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('min=10 max=5 → error inline bajo max + border rojo + toast', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);

        const minInput = page.locator('#estadia-min-noches');
        const maxInput = page.locator('#estadia-max-noches');

        await minInput.fill('10');
        await maxInput.fill('5');

        await clickGuardar(page);

        // Error inline bajo el campo max
        const maxWrap = maxInput.locator('..');
        await expect(maxWrap.getByText(/máximo de noches no puede ser menor al mínimo/i)).toBeVisible();

        // Border rojo aplicado
        await expect(maxInput).toHaveClass(/border-danger-400/);

        // Toast (sonner) también visible
        await expect(page.getByText(/máximo de noches no puede ser menor al mínimo/i).first()).toBeVisible();
    });

    test('tipear en max limpia el error inline y el border', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);

        const minInput = page.locator('#estadia-min-noches');
        const maxInput = page.locator('#estadia-max-noches');

        await minInput.fill('10');
        await maxInput.fill('5');
        await clickGuardar(page);

        // Aparece el error
        const maxWrap = maxInput.locator('..');
        await expect(maxWrap.getByText(/no puede ser menor al mínimo/i)).toBeVisible();

        // Corregir max
        await maxInput.fill('15');

        // Error inline desaparece y border vuelve a normal
        await expect(maxWrap.getByText(/no puede ser menor al mínimo/i)).not.toBeVisible();
        await expect(maxInput).not.toHaveClass(/border-danger-400/);
        // Hint gris vuelve a mostrarse (el que dice "Estadía más larga...")
        await expect(maxWrap.getByText(/Estadía más larga/i)).toBeVisible();
    });

    test('el input max con error queda en viewport tras el submit (scroll)', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);

        // Scrollear el modal a arriba para que max quede fuera de viewport inicial
        await page.locator('#servicio-titulo').scrollIntoViewIfNeeded();

        const minInput = page.locator('#estadia-min-noches');
        const maxInput = page.locator('#estadia-max-noches');
        await minInput.fill('20');
        await maxInput.fill('3');

        await clickGuardar(page);

        // Tras el scroll automático, max debe estar en viewport.
        await expect(maxInput).toBeInViewport({ ratio: 0.5 });
    });
});
