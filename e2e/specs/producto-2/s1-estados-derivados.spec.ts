// e2e/specs/producto-2/s1-estados-derivados.spec.ts
// ---------------------------------------------------------------------------
// PD1 sprint PRODUCTO-2 — estados DERIVADOS en /mis-solicitudes.
//
// Cubre las 2 reglas del helper + los contra-tests de acciones imposibles:
//   1. Confirmada + fin efectivo pasado → badge REALIZADA + card NO ofrece
//      "Cancelar reserva".
//   2. Pendiente + fecha_preferida pasada → badge VENCIDA + card NO ofrece
//      "Cancelar solicitud" + card ofrece "Volver a solicitar" (PD4).
//
// Fixtures: usa `insertarAgendamientoTest` de cron-recordatorio.ts con
// fechas RELATIVAS pasadas (fechaPreferidaIso en negativo) — mismo INSERT
// que la suite R6, mismo cleanup por prefix TAG_TUTOR_NOMBRE_PREFIX.
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
    agendamientoRealizadaId: string;
    agendamientoVencidaId: string;
    agendamientoConfirmadaFuturaId: string;
};

let ctx: Ctx;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
    // Servicio F2 creado por proveedor (Aldo). El tutor (Camila) crea las
    // reservas contra él. Las 3 fixtures cubren los 3 caminos del helper.
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

    // Realizada: F2 confirmada, fecha_fin 24h pasado.
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
    // Vencida: legacy V1 pendiente, fecha_preferida 24h pasado. Legacy
    // (no F1/F2) para evitar colisión con `agendamientos_unique_pendiente_
    // por_tutor_servicio` si otro spec crea F1 pendiente contra el mismo
    // servicio. El helper estadoDerivado trata igual pendiente-con-fecha-
    // pasada independiente de la familia.
    const vencida = await insertarAgendamientoTest(supaTutor, {
        servicioId: svc.id,
        proveedorId,
        tutorId,
        familia: 'legacy',
        fechaPreferidaIso: new Date(Date.now() - 24 * 3_600_000).toISOString(),
        estado: 'pendiente',
    });
    // Confirmada futura (control): F2 confirmada, futuro. Debe seguir
    // ofreciendo "Cancelar reserva" — no debe cambiar por PD1.
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

    ctx = {
        servicioId: svc.id,
        servicioTitulo: svc.titulo,
        proveedorId,
        tutorId,
        agendamientoRealizadaId: realizada,
        agendamientoVencidaId: vencida,
        agendamientoConfirmadaFuturaId: confirmadaFutura,
    };

    console.log('[s1-estados-derivados beforeAll] fixtures creadas:', {
        servicioId: svc.id,
        titulo: svc.titulo,
        realizada,
        vencida,
        confirmadaFutura,
    });
});

test.afterAll(async () => {
    if (!ctx) return;
    const supaTutor = getSupabaseAsTutor();
    const supaProv = getSupabaseAsProveedor();
    await cleanupAgendamientosDeTest(supaTutor, ctx.servicioId);
    await borrarServicioResiliente(supaProv, ctx.servicioId);
});

test.describe('PD1 S1 — estados derivados en /mis-solicitudes', () => {
    test('Realizada: badge REALIZADA visible, card no ofrece "Cancelar reserva"', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        // PD2 sprint PRODUCTO-2 cambió el default a "Próximas" (confirmadas
        // futuras). Las realizadas viven en "Historial" — click en el tab.
        await page.getByRole('tab', { name: /Historial/i }).click();

        // El tutor_nombre "[TEST-cron-*]" NO se renderea en /mis-solicitudes
        // (es el propio nombre del tutor logueado). Ancla por título del
        // servicio (único por corrida: e2e-f2-3-{timestamp}) + estado derivado.
        const cardsDelServicio = page.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(cardsDelServicio.first()).toBeVisible({ timeout: 15_000 });

        // Sub-filter: la card con badge REALIZADA.
        const card = cardsDelServicio.filter({
            has: page.locator('text=/Realizada/i'),
        }).first();
        await expect(card).toBeVisible();

        // Contra-test: NO debe haber botón "Cancelar reserva" en esta card.
        const btnCancelarReserva = card.getByRole('button', { name: /Cancelar reserva/i });
        await expect(btnCancelarReserva).toHaveCount(0);
        // Contra-test: NO debe haber botón "Cancelar solicitud" tampoco.
        const btnCancelarSolicitud = card.getByRole('button', { name: /Cancelar solicitud/i });
        await expect(btnCancelarSolicitud).toHaveCount(0);
    });

    test('Vencida: badge VENCIDA visible, CTA "Volver a solicitar" (button), cero botones Cancelar', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        // Vencidas viven en "Historial" (default PD2 = Próximas).
        await page.getByRole('tab', { name: /Historial/i }).click();

        const cardsDelServicio = page.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(cardsDelServicio.first()).toBeVisible({ timeout: 15_000 });

        const card = cardsDelServicio.filter({
            has: page.locator('text=/Vencida/i'),
        }).first();
        await expect(card).toBeVisible();

        // PD4-bis (2026-08-04): CTA es <button> (antes era <Link>) porque
        // cancel-then-navigate requiere handler para el UPDATE previo.
        const cta = card.getByRole('button', { name: /Volver a solicitar/i });
        await expect(cta).toBeVisible();
        await expect(cta).toBeEnabled();

        // Contra-test: cero botones "Cancelar solicitud" / "Cancelar reserva".
        const btnSolicitud = card.getByRole('button', { name: /Cancelar solicitud/i });
        const btnReserva = card.getByRole('button', { name: /Cancelar reserva/i });
        await expect(btnSolicitud).toHaveCount(0);
        await expect(btnReserva).toHaveCount(0);
    });

    test('PD4-bis contra-test oro: click "Volver a solicitar" libera constraint unique_pendiente', async ({ page }) => {
        // Cubre el bug descubierto por colisión de fixture 2026-08-04:
        // la vencida es estado='pendiente' en BD; navegar directo a
        // /servicio/{id} para crear nueva solicitud violaba
        // agendamientos_unique_pendiente_por_tutor_servicio. El fix PD4-bis
        // (opción A) hace cancel-then-navigate — la vencida queda cancelada
        // ANTES de la navegación, liberando la constraint.

        const supaTutor = getSupabaseAsTutor();

        // PRE-contra-test: INSERT pending sobre el mismo servicio DEBE fallar
        // (23505 = unique_violation). Prueba el bug antes del fix.
        let preFailErr: any = null;
        try {
            await insertarAgendamientoTest(supaTutor, {
                servicioId: ctx.servicioId,
                proveedorId: ctx.proveedorId,
                tutorId: ctx.tutorId,
                familia: 'legacy',
                fechaPreferidaIso: new Date(Date.now() + 200 * 3_600_000).toISOString(),
                estado: 'pendiente',
            });
        } catch (err: any) {
            preFailErr = err;
        }
        expect(preFailErr, 'PRE: INSERT pending debe fallar por constraint unique_pendiente antes de cancelar la vencida').not.toBeNull();
        expect(String(preFailErr?.message || '')).toMatch(/23505|unique_pendiente|duplicate/i);

        // Ahora click en "Volver a solicitar" desde la vencida.
        await page.goto('/mis-solicitudes');
        await page.getByRole('tab', { name: /Historial/i }).click();

        const cardsDelServicio = page.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        const cardVencida = cardsDelServicio.filter({
            has: page.locator('text=/Vencida/i'),
        }).first();
        await expect(cardVencida).toBeVisible({ timeout: 15_000 });

        // Wait para la navegación después del UPDATE.
        await Promise.all([
            page.waitForURL(new RegExp(`/servicio/${ctx.servicioId}`), { timeout: 15_000 }),
            cardVencida.getByRole('button', { name: /Volver a solicitar/i }).click(),
        ]);

        // POST-contra-test ORO: ahora el INSERT pending debe pasar sin 23505,
        // porque la vencida fue movida a estado='cancelada' antes de navegar.
        const nuevoId = await insertarAgendamientoTest(supaTutor, {
            servicioId: ctx.servicioId,
            proveedorId: ctx.proveedorId,
            tutorId: ctx.tutorId,
            familia: 'legacy',
            fechaPreferidaIso: new Date(Date.now() + 200 * 3_600_000).toISOString(),
            estado: 'pendiente',
        });
        expect(nuevoId, 'POST: INSERT pending debe pasar tras cancel-then-navigate').toBeTruthy();

        // Cleanup del extra queda a cargo del afterAll (borra por servicio_id).
    });

    test('Confirmada futura (control): badge CONFIRMADA, botón "Cancelar reserva" habilitado', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        const cardsDelServicio = page.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(cardsDelServicio.first()).toBeVisible({ timeout: 15_000 });

        // La card confirmada futura es la única de las 3 del servicio que
        // NO tiene badge Realizada ni Vencida. No usamos anchors sobre
        // "Confirmada" porque Playwright concatena el badge con la fecha
        // renderada al lado ("Confirmada Del sábado..."), y "confirmada"
        // también aparece en el copy "Reserva confirmada al instante".
        const confirmadaCard = cardsDelServicio
            .filter({ hasNotText: /Realizada/ })
            .filter({ hasNotText: /Vencida/ })
            .first();
        await expect(confirmadaCard).toBeVisible();

        // Botón "Cancelar reserva" debe existir (control — sigue disponible).
        const btnCancelar = confirmadaCard.getByRole('button', { name: /Cancelar reserva/i });
        await expect(btnCancelar).toBeVisible();
    });
});
