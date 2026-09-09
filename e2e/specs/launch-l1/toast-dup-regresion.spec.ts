// e2e/specs/launch-l1/toast-dup-regresion.spec.ts
// ---------------------------------------------------------------------------
// L1-1 · Regresión "Toast duplicado en TODA la app" — BACKLOG L1097.
//
// Causa raíz verificada 2026-09-09 con grep sobre code actual: cero
// <Toaster> local. El sprint toast-fix (`450ba46`, 2026-09-04) removió
// los 5 Toasters locales que causaban doble render (uno global paleta
// Pawnecta + local richColors default). Único <Toaster> vivo en
// pages/_app.tsx:80. El reporte post-fix del PO (BACKLOG L1097
// actualización 2026-09-04) es residuo del patrón "estado obsoleto en
// BACKLOG" que la cláusula de fidelidad de PDPO ya reconoce.
//
// Este spec es la RED DE SEGURIDAD contra reintroducción. Falla si:
//   (a) Aparece más de un `[data-sonner-toaster]` en el DOM
//       (indicador estructural de <Toaster> montado más de una vez).
//   (b) Una acción real dispara más de un `li[data-sonner-toast]`
//       simultáneamente con el mismo texto (indicador de efecto
//       observable — cada Toaster renderiza el toast disparado, así
//       que 2 Toasters = 2 toasts idénticos).
//
// Cobertura: acción disparada desde DENTRO de un modal (donde vivía
// el Toaster local histórico del ServiceFormModal). Reusa el guard
// descripción-100 aterrizado en f2-ci-fix — `clickGuardar` con desc
// corta emite exactamente 1 toast.error. Si en algún futuro alguien
// vuelve a montar un Toaster local (por copy-paste del patrón viejo,
// por inclusión accidental desde un ejemplo de sonner), este spec
// captura la regresión en el próximo PR.
//
// Corre bajo project `chromium` (Aldo proveedor, storageState default).
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

test.describe.serial('L1-1 · Toast duplicado — regresión estructural', () => {
    let servicio: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[L1-1 beforeAll] Limpié ${cleanup.borrados} huérfano(s)`);
        }
        servicio = await crearServicioCuidadoEfimero(supabase, proveedorId);
        // Forzar descripción corta para que el guard `descripcion.trim().
        // length < 100` corte y emita el toast.error controlado. Usamos
        // ese guard como "acción real desde dentro de un modal" porque
        // (a) es determinístico (mismo texto cada vez), (b) su emisor
        // vive dentro del ServiceFormModal — el modal histórico que
        // duplicaba Toaster hasta `450ba46`, (c) el fix f2-ci-fix ya
        // hizo el toast único y persistente vía inline, entonces
        // tenemos el ancla del "1 solo toast por click".
        const { error } = await supabase
            .from('servicios_publicados')
            .update({ descripcion: 'Descripción legacy corta.' })
            .eq('id', servicio.id);
        if (error) throw new Error(`[L1-1 beforeAll] UPDATE desc corta falló: ${error.message}`);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('acción desde modal dispara UN solo Toaster + UN solo toast (guard descripción)', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        const textarea = page.locator('#servicio-descripcion');
        await expect(textarea).toBeVisible();
        const contenido = await textarea.inputValue();
        expect(contenido.length).toBeLessThan(100);

        // Click Guardar — el guard 100 chars dispara EXACTAMENTE 1
        // toast.error. Si hubiera un Toaster duplicado montado, sonner
        // renderiza el toast en AMBOS viewports → 2 <li data-sonner-toast>
        // simultáneos con el mismo texto. Este assert lo captura.
        await clickGuardar(page);

        // (a) Filtro por texto único de este toast para no colisionar con
        //     cualquier otro toast pendiente. Este assert es el efecto
        //     observable directo del bug: 2 Toasters montados ⇒ 2 toasts
        //     con este mismo texto simultáneamente.
        const toastsMatching = page.locator('li[data-sonner-toast]', {
            hasText: /al menos 100 caracteres/i,
        });
        await expect(toastsMatching).toHaveCount(1, { timeout: 5_000 });

        // (b) Assert estructural: aunque sonner monta el viewport
        //     <ol data-sonner-toaster> perezoso al primer toast, ya
        //     disparamos uno arriba entonces debe existir exactamente 1.
        //     Segundo canal defensivo por si algún futuro monta un
        //     segundo Toaster que se mantiene "silencioso" (mismo texto
        //     matchado por el (a) igual — pero acá cubre incluso el
        //     caso donde el segundo Toaster está en otra rama del DOM).
        await expect(page.locator('[data-sonner-toaster]')).toHaveCount(1);
    });
});
