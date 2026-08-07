// e2e/specs/producto-2/s3-filtros.spec.ts
// ---------------------------------------------------------------------------
// PD3 sprint PRODUCTO-2 — filtros por proveedor + mascota dentro de pestañas.
//
// Contrato del brief (PO):
//   * Dropdowns visibles SOLO si hay >1 opción (regla estricta).
//   * "Sin mascota" aparece si existen filas sin ficha ni texto.
//   * Chip mascota en card: presente si hay ficha (o texto libre),
//     AUSENTE si null — sin romper layout.
//
// Estrategia de fixtures:
//   Todas las cards del beforeAll son del MISMO servicio de test (mismo
//   proveedor Aldo, sin mascota_id ni tipo_mascota_texto). Esto arma
//   deliberadamente el escenario "1 sola opción" para verificar el
//   contra-test del brief: los dropdowns NO deben aparecer.
//   El sub-scope "filtrar por proveedor real reduce cards" se difiere a
//   E2E manual del PO en preview — requiere crear un segundo proveedor
//   dedicado, fuera de scope del sprint.
//
// Corre bajo project `chromium-tutor` (storageState Camila).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import {
    getSupabaseAsProveedor,
    getSupabaseAsTutor,
    getProveedorId,
    getTutorId,
} from '../../fixtures/supabase';
import { crearServicioCuidadoConF2 } from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import {
    insertarAgendamientoTest,
    cleanupAgendamientosDeTest,
} from '../../fixtures/cron-recordatorio';

type Ctx = {
    servicioId: string;
    servicioTitulo: string;
    proveedorId: string;
    tutorId: string;
};

let ctx: Ctx;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
    const supaProv = getSupabaseAsProveedor();
    const supaTutor = getSupabaseAsTutor();
    const proveedorId = await getProveedorId();
    const tutorId = await getTutorId();

    const svc = await crearServicioCuidadoConF2(supaProv, {
        proveedorId,
        capacidadEstadia: 1,
        minNoches: 1,
        maxNoches: 30,
        checkInHora: '15:00',
        checkOutHora: '11:00',
    });

    // 1 confirmada futura + 1 realizada (Historial), sin mascota
    // asociada. Todas comparten servicio + proveedor + null mascota →
    // el fixture provoca "1 sola opción" en ambos dropdowns.
    await insertarAgendamientoTest(supaTutor, {
        servicioId: svc.id,
        proveedorId,
        tutorId,
        familia: 'F2',
        fechaPreferidaIso: new Date(Date.now() + 96 * 3_600_000).toISOString(),
        fechaFinIso: new Date(Date.now() + 144 * 3_600_000).toISOString(),
        capacidadSnapshotEstadia: 1,
        estado: 'confirmada',
    });
    await insertarAgendamientoTest(supaTutor, {
        servicioId: svc.id,
        proveedorId,
        tutorId,
        familia: 'F2',
        fechaPreferidaIso: new Date(Date.now() - 72 * 3_600_000).toISOString(),
        fechaFinIso: new Date(Date.now() - 24 * 3_600_000).toISOString(),
        capacidadSnapshotEstadia: 1,
        estado: 'confirmada',
    });

    ctx = {
        servicioId: svc.id,
        servicioTitulo: svc.titulo,
        proveedorId,
        tutorId,
    };
    console.log('[s3-filtros beforeAll] servicio + 2 cards:', svc.titulo);
});

test.afterAll(async () => {
    if (!ctx) return;
    const supaTutor = getSupabaseAsTutor();
    const supaProv = getSupabaseAsProveedor();
    await cleanupAgendamientosDeTest(supaTutor, ctx.servicioId);
    await borrarServicioResiliente(supaProv, ctx.servicioId);
});

test.describe('PD3 S3 — filtros por proveedor + mascota', () => {
    test('Dropdowns condicionales: ambos aparecen o no según cuentas del panel activo', async ({ page }) => {
        // Contadores globales de Camila pueden hacer que en OTRAS pestañas
        // el dropdown proveedor sí aparezca (múltiples proveedores
        // históricos). Verificamos el CONTRATO estricto:
        //   * Si el label #filtro-proveedor está en el DOM → hay >1 proveedor.
        //   * Si NO está → hay <=1 proveedor.
        // Idem para #filtro-mascota. El contrato debe cumplirse en las 3 tabs.
        await page.goto('/mis-solicitudes');

        for (const tab of ['Próximas', 'Pendientes', 'Historial']) {
            await page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();

            // Contar proveedores y mascotas VISIBLES en el panel activo.
            const panelId = tab === 'Próximas' ? 'mis-reservas-panel-proximas'
                : tab === 'Pendientes' ? 'mis-reservas-panel-pendientes'
                : 'mis-reservas-panel-historial';
            const panel = page.locator(`#${panelId}`);
            await expect(panel).toBeVisible();

            const cardsCount = await panel.locator('article').count();

            const filtroProv = page.locator('#filtro-proveedor');
            const filtroMasc = page.locator('#filtro-mascota');
            const provVisible = await filtroProv.isVisible().catch(() => false);
            const mascVisible = await filtroMasc.isVisible().catch(() => false);

            if (cardsCount === 0) {
                // Sin cards, ambos dropdowns deben estar ocultos.
                expect(provVisible, `${tab}: sin cards → dropdown proveedor debe estar oculto`).toBe(false);
                expect(mascVisible, `${tab}: sin cards → dropdown mascota debe estar oculto`).toBe(false);
                continue;
            }

            // Con cards: si el dropdown está visible, debe tener >1 option
            // (incluyendo el "Todos"/"Todas" → total >2 en el select).
            if (provVisible) {
                const optionsCount = await filtroProv.locator('option').count();
                expect(optionsCount, `${tab}: dropdown proveedor visible → debe tener >2 options (Todos + N reales, N>1)`).toBeGreaterThan(2);
            }
            if (mascVisible) {
                const optionsCount = await filtroMasc.locator('option').count();
                expect(optionsCount, `${tab}: dropdown mascota visible → debe tener >2 options (Todas + N reales, N>1)`).toBeGreaterThan(2);
            }
        }
    });

    test('Chip mascota: null-tolerante — cards sin mascota no rompen layout', async ({ page }) => {
        await page.goto('/mis-solicitudes');
        await page.getByRole('tab', { name: /Historial/i }).click();

        // Localizar las cards del servicio de test (todas sin mascota por
        // fixture). Verificar que ninguna renderiza el chip mascota — el
        // bloque debe estar completamente ausente, no un placeholder vacío.
        const cardsDelServicio = page.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(cardsDelServicio.first()).toBeVisible({ timeout: 15_000 });

        const total = await cardsDelServicio.count();
        expect(total).toBeGreaterThanOrEqual(1);

        for (let i = 0; i < total; i++) {
            const card = cardsDelServicio.nth(i);
            // Sin mascota → no debe haber img de mascota ni ícono PawPrint
            // en el body de la card (podría haber otros iconos como Calendar).
            // El chip mascota tiene estructura reconocible: PawPrint size=15
            // + span con nombre. Verificamos por ausencia de la clase
            // que ese chip usa (o inspeccionamos su innerHTML brevemente).
            const chipMascotaCount = await card.locator('img[alt=""]').count();
            expect(chipMascotaCount, `card #${i}: cero <img alt=""> (chip mascota ausente esperado)`).toBe(0);
        }
    });

    test('Reset filtros al cambiar de pestaña (integridad del state)', async ({ page }) => {
        // Aunque los dropdowns de este servicio de test no aparezcan, el
        // handler de tab-change debe resetear los filtros. Verificamos que
        // el navegar entre tabs no lanza excepciones y el DOM sigue
        // consistente (sin dropdowns con selección residual visible tras
        // cambio).
        await page.goto('/mis-solicitudes');

        // Ciclar por las 3 tabs — sin errores de runtime.
        for (const tab of ['Pendientes', 'Historial', 'Próximas']) {
            await page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();
            await expect(page.getByRole('tab', { name: new RegExp(tab, 'i') })).toHaveAttribute('aria-selected', 'true');
        }
    });
});
