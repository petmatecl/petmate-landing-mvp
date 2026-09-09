// e2e/specs/f2-2b/s7-guard-descripcion-corta.spec.ts
// ---------------------------------------------------------------------------
// S7 — Guard descripción-100 emite señal visible (inline + focus + toast).
//
// Contexto: sprint panel-prov-fixes (2026-08-27, sha ab82c86) agregó el guard
// `descripcion.trim().length < 100 -> return toast.error(...)` en
// components/Proveedor/ServiceFormModal.tsx:625. Sin este spec, la única
// evidencia de que la señal funciona era el toast — canal frágil (sonner
// default ~4s) que en la sesión MCP del diagnóstico se perdió (wait > 4s).
//
// Sprint f2-ci-fix (2026-09-09) extendió el guard al patrón F2-2B-B ya
// probado (inline + scroll + focus + toast). Este spec fija ese contrato:
// tras click en Guardar con descripción < 100 chars, el proveedor recibe
// (a) mensaje inline persistente bajo el textarea, (b) foco en el textarea
// listo para editar, (c) CERO request de escritura a servicios_publicados
// (fail-close: el save no ocurre hasta que la descripción cumple el mínimo).
//
// Setup: crea servicio normal (fixture con descripción 213 chars — post
// sprint f2-ci-fix fixtures fix). Luego UPDATE directo a la BD con desc
// corta ("Descripción legacy corta." — 25 chars) para simular servicios
// pre-guard existentes en prod. Abre el editor → click Guardar → assert.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoEfimero,
    borrarServicioResiliente,
    cleanupHuerfanos,
    ServicioEfimero,
} from '../../fixtures/servicio-efimero';
import { abrirEditorServicio, clickGuardar } from '../../fixtures/panel-proveedor';

test.describe.serial('S7 — Guard descripción-100 con señal visible', () => {
    let servicio: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S7 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoEfimero(supabase, proveedorId);

        // Simular caso legacy: UPDATE directo con descripción corta (25 chars).
        // Sortea el guard client-side (que solo dispara en el editor UI) y
        // deja la fila en un estado que el usuario habría creado antes del
        // sprint panel-prov-fixes.
        const { error } = await supabase
            .from('servicios_publicados')
            .update({ descripcion: 'Descripción legacy corta.' })
            .eq('id', servicio.id);
        if (error) throw new Error(`[S7 beforeAll] UPDATE desc corta falló: ${error.message}`);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('descripción corta + Guardar → inline error visible, foco en textarea, cero PATCH', async ({ page }) => {
        // Interceptar PATCH/POST a servicios_publicados para el assert
        // "cero request de escritura". Un guard bien puesto NO debe dejar
        // pasar el save. Uso una lista de URLs matcheadas por el request
        // handler; al final verificamos que quedó vacía.
        const writeRequests: string[] = [];
        await page.route('**/rest/v1/servicios_publicados*', async (route) => {
            const method = route.request().method();
            if (method === 'PATCH' || method === 'POST' || method === 'PUT') {
                writeRequests.push(`${method} ${route.request().url()}`);
            }
            await route.continue();
        });

        await abrirEditorServicio(page, servicio.titulo);

        // Sanity: el textarea trae la descripción corta cargada.
        const textarea = page.locator('#servicio-descripcion');
        await expect(textarea).toBeVisible();
        const contenido = await textarea.inputValue();
        expect(contenido.length).toBeLessThan(100);

        await clickGuardar(page);

        // 1) Mensaje inline persistente bajo el textarea con el copy exacto.
        //    role="alert" para lectores de pantalla; text-danger-600 visible.
        const inlineError = page.locator('#servicio-descripcion-error');
        await expect(inlineError).toBeVisible({ timeout: 5_000 });
        await expect(inlineError).toHaveText(
            'La descripción debe tener al menos 100 caracteres. Cuenta con qué incluye y cómo lo haces.',
        );

        // 2) Foco en el textarea (para que el cursor caiga listo a editar).
        //    toBeFocused re-evalua hasta timeout: cubre el requestAnimationFrame
        //    del guard (focus + scroll suave posterior).
        await expect(textarea).toBeFocused({ timeout: 3_000 });

        // 3) aria-invalid=true (contrato de accesibilidad).
        await expect(textarea).toHaveAttribute('aria-invalid', 'true');

        // 4) Cero request PATCH/POST/PUT: el guard cortó antes del save.
        expect(writeRequests).toEqual([]);

        // 5) Modal SIGUE abierto (no cerró, el user debe corregir).
        await expect(page.locator('#servicio-titulo')).toBeVisible();
    });

    test('typear en el textarea limpia el error inline', async ({ page }) => {
        // Cada test tiene su propio browser context (page) — recreamos el
        // estado desde 0: abrir editor + disparar error + verificar limpieza
        // al primer typeo. test.describe.serial garantiza el ORDEN de ejecución
        // (para que el afterAll no borre el servicio antes de terminar) pero
        // no comparte page state.
        await abrirEditorServicio(page, servicio.titulo);
        await clickGuardar(page);

        const inlineError = page.locator('#servicio-descripcion-error');
        await expect(inlineError).toBeVisible({ timeout: 5_000 });

        // Un solo keystroke debería limpiar el error (limpieza en onChange).
        const textarea = page.locator('#servicio-descripcion');
        await textarea.focus();
        await page.keyboard.type(' ');

        await expect(inlineError).not.toBeVisible({ timeout: 2_000 });
    });
});
