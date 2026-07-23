// e2e/specs/f2-3/s7-cancelacion-fuera-ventana.spec.ts
// ---------------------------------------------------------------------------
// S7 — Cancelación F2 confirmada FUERA de ventana.
// Fixture: cancelacion_min_horas_antes=48 + reserva check-in a +1 día (~24h).
// Como 24h < 48h → ventana cerrada. Verificamos:
//   (a) botón "Cancelar reserva" aparece disabled con tooltip;
//   (b) llamada directa al endpoint con JWT del tutor → 403 reason=ventana_cerrada.
//
// Nota: la constraint `servicios_publicados_cancelacion_min_horas_check`
// (0 <= horas <= 168) prohíbe valores altísimos. Usamos 48h + reserva
// cercana para forzar el rechazo dentro del rango válido.
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
import { irAMisSolicitudes } from '../../fixtures/panel-tutor';

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
    const chileWallMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return new Date(guessUtcMs - (chileWallMs - guessUtcMs)).toISOString();
}

function ymdEnFuturo(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

test.describe.serial('S7 — Cancelación fuera de ventana rechazada', () => {
    let servicio: ServicioCuidadoListo;
    let reservaId: string;

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        const tutorId = await getTutorId();
        await cleanupHuerfanosF23(supabaseProv, proveedorId);

        servicio = await crearServicioCuidadoConF2(supabaseProv, {
            proveedorId,
            cancelacionMinHoras: 48,   // ventana amplia
        });

        // Reserva a +1 día (~24h) → 24h < 48h → ventana cerrada.
        // INSERT como Camila (RLS obliga tutor_id ∈ auth.uid()).
        const desdeYmd = ymdEnFuturo(1);
        const hastaYmd = ymdEnFuturo(3);
        reservaId = await preInsertarReservaConfirmada(supabaseTutor, {
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

    test('botón Cancelar disabled + endpoint retorna 403 con copy ventana cerrada', async ({ page, request }) => {
        await irAMisSolicitudes(page);

        const card = page.locator('article').filter({ hasText: servicio.titulo }).first();
        await expect(card).toBeVisible({ timeout: 15_000 });

        // Botón "Cancelar reserva" debe estar disabled (client refleja el
        // enforcement server-side).
        const btn = card.getByRole('button', { name: /Cancelar reserva/i });
        await expect(btn).toBeDisabled();

        // Verificación server directa: llamar el endpoint con JWT del tutor
        // extraído del localStorage del browser.
        const token = await page.evaluate(() => {
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i)!;
                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    try {
                        const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
                        return parsed.access_token as string;
                    } catch { /* ignore */ }
                }
            }
            return null;
        });
        expect(token).toBeTruthy();

        const baseURL = page.url().split('/mis-solicitudes')[0];
        const resp = await request.post(`${baseURL}/api/agendamientos/cancelar`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            data: { agendamientoId: reservaId },
        });
        expect(resp.status()).toBe(403);
        const body = await resp.json();
        expect(body.error).toMatch(/quedan menos de.*horas/i);
        expect(body.reason).toBe('ventana_cerrada');

        // BD: la reserva sigue confirmada.
        const supabaseCheck = getSupabaseAsTutor();
        const { data: r } = await supabaseCheck
            .from('agendamientos')
            .select('estado')
            .eq('id', reservaId)
            .single();
        expect(r?.estado).toBe('confirmada');
    });
});
