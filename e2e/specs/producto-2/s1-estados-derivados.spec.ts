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
    // Vencida: F1 pendiente, fecha_preferida 24h pasado.
    const vencida = await insertarAgendamientoTest(supaTutor, {
        servicioId: svc.id,
        proveedorId,
        tutorId,
        familia: 'F1',
        fechaPreferidaIso: new Date(Date.now() - 24 * 3_600_000).toISOString(),
        duracionMin: 60,
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

        // El tutor_nombre "[TEST-cron-*]" NO se renderea en /mis-solicitudes
        // (es el propio nombre del tutor logueado). Ancla por título del
        // servicio (único por corrida: e2e-f2-3-{timestamp}) + estado derivado.
        // Todas las 3 cards del beforeAll comparten título — distinguimos por
        // badge.
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

    test('Vencida: badge VENCIDA visible, CTA "Volver a solicitar", cero botones Cancelar', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        const cardsDelServicio = page.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(cardsDelServicio.first()).toBeVisible({ timeout: 15_000 });

        const card = cardsDelServicio.filter({
            has: page.locator('text=/Vencida/i'),
        }).first();
        await expect(card).toBeVisible();

        // PD4: CTA "Volver a solicitar" presente y linkea a la ficha del servicio.
        const cta = card.getByRole('link', { name: /Volver a solicitar/i });
        await expect(cta).toBeVisible();
        const href = await cta.getAttribute('href');
        expect(href).toBe(`/servicio/${ctx.servicioId}`);

        // Contra-test: cero botones "Cancelar solicitud" / "Cancelar reserva".
        const btnSolicitud = card.getByRole('button', { name: /Cancelar solicitud/i });
        const btnReserva = card.getByRole('button', { name: /Cancelar reserva/i });
        await expect(btnSolicitud).toHaveCount(0);
        await expect(btnReserva).toHaveCount(0);
    });

    test('Confirmada futura (control): badge CONFIRMADA, botón "Cancelar reserva" habilitado', async ({ page }) => {
        await page.goto('/mis-solicitudes');

        const cardsDelServicio = page.locator('article').filter({
            hasText: new RegExp(ctx.servicioTitulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(cardsDelServicio.first()).toBeVisible({ timeout: 15_000 });

        // La card confirmada futura tiene badge "Confirmada" (no "Realizada").
        const confirmadaCard = cardsDelServicio.filter({
            has: page.locator('text=/^Confirmada$/i'),
        }).first();
        await expect(confirmadaCard).toBeVisible();

        // Botón "Cancelar reserva" debe existir (control — sigue disponible).
        const btnCancelar = confirmadaCard.getByRole('button', { name: /Cancelar reserva/i });
        await expect(btnCancelar).toBeVisible();
    });
});
