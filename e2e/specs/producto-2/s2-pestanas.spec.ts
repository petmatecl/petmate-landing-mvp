// e2e/specs/producto-2/s2-pestanas.spec.ts
// ---------------------------------------------------------------------------
// PD2 sprint PRODUCTO-2 — pestañas Próximas / Pendientes / Historial en
// /mis-solicitudes. Verifica:
//   * Los 3 tabs con contadores derivados de estadoDerivado.
//   * Default = Próximas (aria-selected="true").
//   * Al cliquear una pestaña, el aria-selected cambia y el panel muestra
//     solo las cards de ese grupo.
//   * Los contadores reflejan la data real de este servicio de test.
//
// Reusa las 3 fixtures del spec s1-estados-derivados (Realizada + Vencida
// + Confirmada futura). Cada test se anota a su propia partición
// esperada: Confirmada futura va en "Próximas" (1), no hay pendientes
// vigentes creadas por s2 → cuenta 0, Historial trae 2 (Realizada +
// Vencida).
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
    // 3 fixtures — mismo shape que s1 pero contexto propio (aislado).
    realizadaId: string;
    vencidaId: string;
    confirmadaFuturaId: string;
    pendienteFuturaId: string;   // extra para poblar contador "Pendientes"
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

    const realizada = await insertarAgendamientoTest(supaTutor, {
        servicioId: svc.id,
        proveedorId,
        tutorId,
        familia: 'F2',
        fechaPreferidaIso: new Date(Date.now() - 72 * 3_600_000).toISOString(),
        fechaFinIso: new Date(Date.now() - 24 * 3_600_000).toISOString(),
        capacidadSnapshotEstadia: 1,
        estado: 'confirmada',
    });
    const vencida = await insertarAgendamientoTest(supaTutor, {
        servicioId: svc.id,
        proveedorId,
        tutorId,
        familia: 'F1',
        fechaPreferidaIso: new Date(Date.now() - 24 * 3_600_000).toISOString(),
        duracionMin: 60,
        estado: 'pendiente',
    });
    const confirmadaFutura = await insertarAgendamientoTest(supaTutor, {
        servicioId: svc.id,
        proveedorId,
        tutorId,
        familia: 'F2',
        fechaPreferidaIso: new Date(Date.now() + 96 * 3_600_000).toISOString(),
        fechaFinIso: new Date(Date.now() + 144 * 3_600_000).toISOString(),
        capacidadSnapshotEstadia: 1,
        estado: 'confirmada',
    });
    // Pendiente futura — para contador Pendientes.
    const pendienteFutura = await insertarAgendamientoTest(supaTutor, {
        servicioId: svc.id,
        proveedorId,
        tutorId,
        familia: 'F1',
        fechaPreferidaIso: new Date(Date.now() + 48 * 3_600_000).toISOString(),
        duracionMin: 60,
        estado: 'pendiente',
    });

    ctx = {
        servicioId: svc.id,
        servicioTitulo: svc.titulo,
        proveedorId,
        tutorId,
        realizadaId: realizada,
        vencidaId: vencida,
        confirmadaFuturaId: confirmadaFutura,
        pendienteFuturaId: pendienteFutura,
    };

    console.log('[s2-pestanas beforeAll]', {
        titulo: svc.titulo,
        counts: 'proximas=1 pendientes=1 historial=2',
    });
});

test.afterAll(async () => {
    if (!ctx) return;
    const supaTutor = getSupabaseAsTutor();
    const supaProv = getSupabaseAsProveedor();
    await cleanupAgendamientosDeTest(supaTutor, ctx.servicioId);
    await borrarServicioResiliente(supaProv, ctx.servicioId);
});

test.describe('PD2 S2 — pestañas Próximas/Pendientes/Historial', () => {
    test('Default = Próximas + los 3 tabs presentes con role=tab', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        // Esperar a que el tablist renderee (implica que los agendamientos
        // cargaron).
        const tablist = page.getByRole('tablist', { name: /Filtro de reservas/i });
        await expect(tablist).toBeVisible({ timeout: 15_000 });

        const tabProximas = tablist.getByRole('tab', { name: /Próximas/i });
        const tabPendientes = tablist.getByRole('tab', { name: /Pendientes/i });
        const tabHistorial = tablist.getByRole('tab', { name: /Historial/i });

        await expect(tabProximas).toBeVisible();
        await expect(tabPendientes).toBeVisible();
        await expect(tabHistorial).toBeVisible();

        // Default: Próximas active.
        await expect(tabProximas).toHaveAttribute('aria-selected', 'true');
        await expect(tabPendientes).toHaveAttribute('aria-selected', 'false');
        await expect(tabHistorial).toHaveAttribute('aria-selected', 'false');
    });

    test('Panel Próximas: solo confirmadas futuras del servicio de test', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        // Sin cliquear nada — default Próximas activo.
        const panel = page.locator('#mis-reservas-panel-proximas');
        await expect(panel).toBeVisible({ timeout: 15_000 });

        // Cards del servicio en el panel activo — solo debería haber la
        // confirmada futura, no la vencida ni la realizada.
        const cardsPanel = panel.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        // Exactamente 1: la confirmada futura.
        await expect(cardsPanel).toHaveCount(1);

        // Contra-test: la card visible NO tiene badge Realizada ni Vencida.
        const card = cardsPanel.first();
        await expect(card.locator('text=/Realizada/i')).toHaveCount(0);
        await expect(card.locator('text=/Vencida/i')).toHaveCount(0);
    });

    test('Panel Pendientes: solo pendientes vigentes (fecha futura)', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        await page.getByRole('tab', { name: /Pendientes/i }).click();

        const panel = page.locator('#mis-reservas-panel-pendientes');
        await expect(panel).toBeVisible();

        // La pendiente futura del beforeAll está acá. La vencida NO (fue a
        // Historial).
        const cardsPanel = panel.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(cardsPanel).toHaveCount(1);
        // La card no debe tener badge Vencida (esa está en Historial).
        await expect(cardsPanel.first().locator('text=/Vencida/i')).toHaveCount(0);
    });

    test('Panel Historial: realizadas + vencidas + terminales de este servicio', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        await page.getByRole('tab', { name: /Historial/i }).click();

        const panel = page.locator('#mis-reservas-panel-historial');
        await expect(panel).toBeVisible();

        // Realizada + Vencida = 2 cards del servicio en Historial.
        const cardsPanel = panel.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(cardsPanel).toHaveCount(2);

        // Deben aparecer AMBOS badges (Realizada y Vencida) en el panel.
        await expect(panel.locator('text=/Realizada/i').first()).toBeVisible();
        await expect(panel.locator('text=/Vencida/i').first()).toBeVisible();
    });

    test('Contadores en tabs reflejan las cuentas del servicio (piso ≥ fixture)', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        // Los contadores son GLOBALES del tutor (todas sus reservas, no solo
        // las de este test). Camila puede tener otras reservas históricas en
        // staging. Verificamos que las cuentas son al menos las del fixture
        // (piso, no exacto).
        const tabProximas = page.getByRole('tab', { name: /Próximas/i });
        const tabPendientes = page.getByRole('tab', { name: /Pendientes/i });
        const tabHistorial = page.getByRole('tab', { name: /Historial/i });

        // Extract count del span dentro del button.
        const parseCount = async (tab: typeof tabProximas): Promise<number> => {
            const spans = tab.locator('span');
            const count = await spans.last().textContent();
            return parseInt(count?.trim() || '0', 10);
        };

        const cProximas = await parseCount(tabProximas);
        const cPendientes = await parseCount(tabPendientes);
        const cHistorial = await parseCount(tabHistorial);

        // Piso por fixtures del beforeAll:
        //   proximas >= 1 (confirmada futura),
        //   pendientes >= 1 (pendiente futura),
        //   historial >= 2 (realizada + vencida).
        expect(cProximas).toBeGreaterThanOrEqual(1);
        expect(cPendientes).toBeGreaterThanOrEqual(1);
        expect(cHistorial).toBeGreaterThanOrEqual(2);
    });
});
