// e2e/specs/pan-1/def7-recordatorio-title.spec.ts
// ---------------------------------------------------------------------------
// PAN-1 · Def 7 — regresión del fix "quitar 'Mañana:' del title in-app del
// generador recordatorio-reserva".
//
// Fondo (diagnóstico PR #19 run 34624549600):
//   `pages/api/cron/recordatorio-reserva.ts:561-563` emitía
//   `subject = "Mañana: tu reserva con X"` (o "Mañana: reserva de Y") y
//   lo usaba tanto para el email (correcto — llega el día antes) como
//   para el `notifications.title` (incorrecto — se lee días después y
//   "Mañana" queda congelado). Diagnóstico observó 52/52 notifs canónicas
//   con antigüedad >48h teniendo "Mañana:" en title.
//
// Fix (commit de este sprint):
//   Separar `emailSubject` (mantiene "Mañana:") de `notifTitle` (usa
//   "Recordatorio:"). Panel bell renderiza fecha relativa dinámica desde
//   metadata.tipo='recordatorio_dia_anterior' + agendamientos.fecha_preferida
//   via formatFechaRelativa modo='evento' — cero backfill BD del title.
//
// Spec: correr el endpoint cron con dryRun=false sobre un agendamiento
// controlado (F1, fecha_preferida = mañana). Verificar que:
//   (a) la fila notifications insertada tiene title empezando con
//       "Recordatorio:" (no "Mañana:").
//   (b) el message sigue con el patrón `${servicioTitulo} — ${fechaLinea}`.
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
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import {
    fechaMananaIso,
    insertarAgendamientoTest,
    cleanupAgendamientosDeTest,
    endpointUrl,
    requireCronSecret,
} from '../../fixtures/cron-recordatorio';

// Serial dentro del describe para que el cleanup afterAll no compita con
// otros tests del mismo project chromium-cron.
test.describe.configure({ mode: 'serial' });

const secret = requireCronSecret();

test.describe('PAN-1 def 7 · notif title sin "Mañana:" congelado', () => {
    let servicio: ServicioCuidadoListo;
    let agendamientoId: string;
    let tutorAuthId: string;
    let proveedorAuthId: string;

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        const tutorId = await getTutorId();

        // Cache los auth_user_id para verificar contra notifications.user_id
        // después de la corrida del cron.
        const { data: userProv } = await supabaseProv.auth.getUser();
        const { data: userTut } = await supabaseTutor.auth.getUser();
        proveedorAuthId = userProv!.user!.id;
        tutorAuthId = userTut!.user!.id;

        // Servicio F2-listo — cancelacionMinHoras 48 (irrelevante para este
        // test), reusable de la suite F2-3-E existente.
        servicio = await crearServicioCuidadoConF2(supabaseProv, {
            proveedorId,
            cancelacionMinHoras: 48,
        });

        // F1 confirmada mañana — dispara elegibilidad del cron.
        agendamientoId = await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id,
            proveedorId,
            tutorId,
            fechaPreferidaIso: fechaMananaIso(),
            familia: 'F1',
            duracionMin: 60,
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        // Limpiar notifications creadas por la corrida (por agendamiento_id
        // en metadata jsonb). Cero deja rastro en staging.
        await supabase.from('notifications')
            .delete()
            .filter('metadata->>agendamiento_id', 'eq', agendamientoId);
        await cleanupAgendamientosDeTest(supabase, servicio.id);
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('corrida real cron → notif title empieza con "Recordatorio:", NO "Mañana:"', async ({ request, baseURL }) => {
        // 1. Hit cron con dryRun=false para insertar notifs reales.
        //
        // Sprint conviene Paso 0 (2026-09-12) — cambio `fetch()` global → `request`.
        // El `fetch()` global de Node NO tiene cookie jar entre hops. Vercel
        // Deployment Protection valida el bypass en query en el primer request,
        // emite `Set-Cookie: _vercel_jwt=...` + redirect 307 a URL limpia; el
        // segundo hop llega sin cookie y Vercel devuelve HTML del auth prompt,
        // reventando `resp.json()` con `SyntaxError: Unexpected token '<'`.
        // El `request` fixture de Playwright respeta cookies entre hops via su
        // contexto, así el bypass persiste al 307. Fix consistente con el
        // patrón usado por `e2e/specs/f2-recordatorios-cron/all.spec.ts`.
        const url = endpointUrl(baseURL!, { dryRun: false });
        const resp = await request.get(url, {
            headers: { 'x-cron-secret': secret },
        });
        expect(resp.status(), `cron respondió ${resp.status()}`).toBe(200);
        const body = await resp.json();
        // El cron es GLOBAL — filtra sobre staging entero, no solo nuestro
        // agendamiento. `sent >= 2` (nuestros tutor+proveedor) es criterio
        // mínimo, no exacto (otros tests pueden agregar). Verificamos
        // específicamente nuestras notifs abajo con filter por agendamiento_id.
        //
        // Sprint conviene Paso 0 v2 (2026-09-12) — body.sent es objeto
        // desglosado `{tutor: N, proveedor: N}`, NO int. El fix del fetch
        // (v1 → request.get) destapó este schema real que estaba oculto
        // por el `SyntaxError` previo. Compat con ambos formatos por
        // seguridad si el endpoint vuelve al schema viejo en un futuro.
        const totalSent = typeof body.sent === 'object' && body.sent !== null
            ? (body.sent.tutor ?? 0) + (body.sent.proveedor ?? 0)
            : (body.sent ?? 0);
        expect(totalSent, `sent total (tutor+proveedor) desde body=${JSON.stringify(body.sent)}`)
            .toBeGreaterThanOrEqual(2);

        // 2. Query las notifs creadas para NUESTRO agendamiento.
        const supabase = getSupabaseAsProveedor();
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('user_id, title, message, metadata')
            .filter('metadata->>agendamiento_id', 'eq', agendamientoId);
        expect(error).toBeNull();
        expect(notifs, 'esperado ≥2 notifs (tutor + proveedor)').toBeTruthy();
        expect(notifs!.length).toBeGreaterThanOrEqual(2);

        // 3. Assert defensivo — cada notif del cron canónico debe:
        //    (a) title empezar con "Recordatorio:" (fix def 7),
        //    (b) NO empezar con "Mañana:",
        //    (c) message contener el título del servicio + " — " + fecha.
        for (const n of notifs!) {
            expect(
                n.title,
                `notif ${n.user_id} tiene title="${n.title}" — def 7 vivo si empieza con "Mañana:"`
            ).toMatch(/^Recordatorio:/);
            expect(
                n.title.startsWith('Mañana:'),
                `notif ${n.user_id} title CONGELADO "Mañana:" (def 7 vivo)`
            ).toBe(false);
            expect(
                n.message,
                `notif ${n.user_id} message="${n.message}" — esperado servicioTitulo + " — " + fecha`
            ).toContain(servicio.titulo);
            expect(n.message).toContain(' — ');
        }
    });
});
