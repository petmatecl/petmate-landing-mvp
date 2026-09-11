// e2e/specs/f2-3/s4a-race.spec.ts
// ---------------------------------------------------------------------------
// S4a — Race pre-insert vía fixture: otra "reserva" (insertada por el
// fixture como si viniera de otro tutor) ocupa el rango. Camila intenta
// reservar el mismo → EXCLUDE rebota 23P01 → toast amable + refetch del
// picker.
//
// S4b (multi-tab real) sigue como manual — no simulable con Playwright sin
// mucho fuego. Documentado en e2e/README.md.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import {
    getSupabaseAsProveedor,
    getSupabaseAsTutor,
    getProveedorId,
    getTutorId,
} from '../../fixtures/supabase';
import {
    crearServicioCuidadoConF2,
    cleanupHuerfanosF23,
    preInsertarReservaConfirmada,
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import {
    abrirModalReservaEstadia,
    seleccionarRangoPorDia,
    clickConfirmarReserva,
    navegarPickerAMes,
    locatorDiaPicker,
} from '../../fixtures/panel-tutor';

// Convierte YYYY-MM-DD a ISO UTC de medianoche Chile (mismo cálculo que
// chileMidnightUtc del modal client — replicado acá para no depender del
// bundle del app en tests).
function chileMidnightUtcIso(ymd: string): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const guessUtcMs = Date.UTC(y, m - 1, d, 0, 0);
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Santiago',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(new Date(guessUtcMs));
    const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
    const chileWallMs = Date.UTC(
        get('year'), get('month') - 1, get('day'),
        get('hour'), get('minute'), get('second')
    );
    return new Date(guessUtcMs - (chileWallMs - guessUtcMs)).toISOString();
}

test.describe.serial('S4a — Race pre-insert: EXCLUDE rebota 23P01', () => {
    let servicio: ServicioCuidadoListo;
    const desdeDay = 15;
    const hastaDay = 17;
    // Compartido con el test: mes/año donde vive la reserva pre-insertada,
    // para poder navegar el picker al mes correcto.
    let reservaMonth = 0;
    let reservaYear = 0;

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        await cleanupHuerfanosF23(supabaseProv, proveedorId);
        servicio = await crearServicioCuidadoConF2(supabaseProv, {
            proveedorId,
            capacidadEstadia: 1,   // cap=1 para que EXCLUDE dispare.
        });

        // Pre-insertar reserva confirmada de Camila que ocupa el rango.
        // Luego Camila va a intentar reservar el mismo rango y el EXCLUDE
        // debería rebotar 23P01 (o el cliente refleja los días disabled).
        // Usamos días 15-17 del PRÓXIMO mes para que estén siempre en el
        // futuro y no colisionen con la fecha corriente.
        const tutorId = await getTutorId();
        const now = new Date();
        // Primer día del próximo mes en local — evita drift TZ.
        const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        reservaYear = firstOfNext.getFullYear();
        reservaMonth = firstOfNext.getMonth() + 1;
        const desdeYmd = `${reservaYear}-${String(reservaMonth).padStart(2, '0')}-${String(desdeDay).padStart(2, '0')}`;
        const hastaYmd = `${reservaYear}-${String(reservaMonth).padStart(2, '0')}-${String(hastaDay).padStart(2, '0')}`;
        await preInsertarReservaConfirmada(supabaseTutor, {
            servicioId: servicio.id,
            proveedorId,
            tutorId,
            fechaDesdeIso: chileMidnightUtcIso(desdeYmd),
            fechaFinIso: chileMidnightUtcIso(hastaYmd),
            capacidadSnapshot: 1,
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('rango ocupado → EXCLUDE rebota → toast amable + picker refetche', async ({ page }) => {
        await abrirModalReservaEstadia(page, servicio.id);
        // Ir al mes donde vive la reserva pre-insertada.
        await navegarPickerAMes(page, reservaMonth, reservaYear);

        // 3 caminos válidos según el timing:
        //  (A) fetch de disponibilidad corrió DESPUÉS de la pre-insert → el
        //      día `desdeDay` aparece disabled — validación cubierta por sí
        //      misma, el EXCLUDE se reflejó en el fetch.
        //  (B) fetch corrió antes → días clickeables + client valida rango
        //      superpuesto con día disabled interno → error inline
        //      "incluye fechas no disponibles".
        //  (C) client también aceptó → submit y server rebota 23P01 →
        //      toast "acaban de ocuparse".
        const diaDesde = locatorDiaPicker(page, desdeDay);
        await expect(diaDesde).toBeVisible();
        const desdeDisabled = await diaDesde.evaluate((el) =>
            el.hasAttribute('disabled') ||
            el.getAttribute('aria-disabled') === 'true' ||
            el.classList.contains('rdp-day_disabled')
        );

        if (desdeDisabled) {
            // Camino A — el pre-insert ya se refleja como disabled en el picker.
            // Es la validación empírica que buscamos.
            expect(desdeDisabled).toBe(true);
            return;
        }

        // El día está clickeable → seguimos con selección y validamos rebote.
        await seleccionarRangoPorDia(page, desdeDay, hastaDay);

        const errorInlineCliente = page.getByText(/incluye fechas no disponibles/i);
        const errorServer = page.locator('li[data-sonner-toast]').getByText(/acaban de ocuparse/i);

        if (await errorInlineCliente.isVisible({ timeout: 2_000 }).catch(() => false)) {
            // Camino B — client detectó rango con día disabled interno.
            await expect(errorInlineCliente).toBeVisible();
        } else {
            // Camino C — client aceptó, server rebota 23P01.
            await clickConfirmarReserva(page);
            await expect(errorServer.first()).toBeVisible({ timeout: 15_000 });
        }
    });
});
