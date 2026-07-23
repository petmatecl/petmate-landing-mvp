// e2e/specs/f2-2b/s1-editor-visible.spec.ts
// ---------------------------------------------------------------------------
// S1 — Sección "Bloqueos" visible en cuidado con F2 ON, con hints correctos.
// Valida que el editor F2-2B se renderiza detrás del toggle + con la copy
// acordada (semántica invertida, ejemplos chilenos, pie sobre estadías
// confirmadas).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoEfimero,
    borrarServicioResiliente,
    cleanupHuerfanos,
    ServicioEfimero,
} from '../../fixtures/servicio-efimero';
import { abrirEditorServicio, activarF2 } from '../../fixtures/panel-proveedor';

test.describe.serial('S1 — Editor de bloqueos visible con F2 ON', () => {
    let servicio: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S1 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoEfimero(supabase, proveedorId);
        console.log(`[S1 beforeAll] Servicio creado: ${servicio.titulo} (${servicio.id})`);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('con F2 OFF no aparece la sección de bloqueos', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        // Sin activar F2, la sección "Bloqueos" NO existe (está detrás del
        // toggle usaAgendaEstadia).
        await expect(page.getByText('Bloqueos', { exact: true })).not.toBeVisible();
        await expect(page.getByRole('button', { name: '+ Agregar bloqueo' })).not.toBeVisible();
    });

    test('con F2 ON aparece la sección con hints correctos y estado vacío', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);

        // Sección "Bloqueos" visible con botón agregar
        await expect(page.getByText('Bloqueos', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: '+ Agregar bloqueo' })).toBeVisible();

        // Empty state con referente chileno (Pucón)
        await expect(page.getByText(/Sin bloqueos.*Pucón/i)).toBeVisible();

        // Pie sobre estadías ya confirmadas
        await expect(
            page.getByText(/Estas fechas quedan bloqueadas para nuevas reservas.*ya confirmadas/i)
        ).toBeVisible();

        // Hint principal del toggle F2 (semántica invertida + reemplazo del legacy)
        await expect(
            page.getByText(/Al activarla, todas las fechas futuras quedan disponibles.*Se reemplaza el bloque/i)
        ).toBeVisible();

        // Hint modalidad sin jerga interna
        await expect(
            page.getByText(/La agenda por noches aplica a estadías.*casa del cuidador/i)
        ).toBeVisible();
    });
});
