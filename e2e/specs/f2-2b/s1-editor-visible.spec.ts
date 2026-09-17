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
        const supabase = await getSupabaseAsProveedor();
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
        const supabase = await getSupabaseAsProveedor();
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

        // Sprint estab-e2e-i (2026-09-17) — refactor sprint d-ui-paneles
        // (commit a9b56a7, EDITOR-UX) reformateó los hints del editor F2:
        // el copy largo sobre "Estas fechas quedan bloqueadas para nuevas
        // reservas ... ya confirmadas" pasó de `<p>` visible a `title=`
        // attribute (tooltip) de un `<Info>` button. `getByText` no matchea
        // HTML attributes, así que el spec quedó desactualizado (roto).
        // Fix: (a) verificar el texto corto visible que quedó como resumen
        // en el `<p>`, (b) validar que el botón hint existe con su aria-label,
        // (c) verificar el copy largo en el title attribute via getAttribute.
        // Sirve al mismo espíritu del test original — comprobar que el hint
        // sigue transmitiendo la política sobre reservas confirmadas — sin
        // depender del DOM structural exacto pre-refactor.

        // (a) Copy corto visible directo en el `<p>` (sprint d-ui-paneles).
        await expect(page.getByText('Fechas bloqueadas para nuevas reservas.', { exact: true })).toBeVisible();

        // (b) Botón hint del tooltip con aria-label estable.
        const hintBloqueos = page.getByRole('button', { name: 'Más información sobre bloqueos F2' });
        await expect(hintBloqueos).toBeVisible();

        // (c) title attribute contiene el copy sobre estadías confirmadas.
        const title = await hintBloqueos.getAttribute('title');
        expect(title, 'title del hint incluye "ya confirmadas"').toMatch(/ya confirmadas/i);
        expect(title, 'title del hint incluye "coordinar con el tutor por chat"').toMatch(/coordinar con el tutor/i);

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
