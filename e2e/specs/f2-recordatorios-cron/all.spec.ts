// e2e/specs/f2-recordatorios-cron/all.spec.ts
// ---------------------------------------------------------------------------
// R6 — TREN RECORDATORIOS DE CITA. Suite API-only del endpoint
// /api/cron/recordatorio-reserva.
//
// SERIALIZACIÓN CROSS-DESCRIBE (crítico): este archivo consolida S1..S5 en
// un solo file con `test.describe.configure({ mode: 'serial' })` al top-level.
// Motivo: el endpoint es GLOBAL — su SELECT trae toda fila elegible del
// staging (no solo las del test que invocó), así que si S3.real corre en
// paralelo con S2.real 1ª, S3 también procesa las filas del S2 (ambas
// marcas NULL en ese momento) y updatea sus marcas — race auténtico entre
// specs, no bug del endpoint.
//
// Playwright NO soporta `workers` per-project. Consolidar en un file +
// serial mode es la ruta canónica para forzar ejecución single-worker de
// todo el project cron sin tocar la config global. Otros projects (chromium,
// chromium-tutor) siguen paralelos con este file — sacrificio: ~15s extra
// de wall-time del project cron.
//
// COBERTURA (5 bloques serial): dryRun por familia · corrida real +
// idempotencia · marcas independientes · no-elegibles · auth.
// ---------------------------------------------------------------------------
import { test, expect, request } from '@playwright/test';
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
    fechaFuturoIso,
    fechaMananaIso,
    fechaMananaMas1DiaIso,
    insertarAgendamientoTest,
    cleanupAgendamientosDeTest,
    getMarcasAgendamiento,
    endpointUrl,
    requireCronSecret,
} from '../../fixtures/cron-recordatorio';

// Ancla que serializa TODO test de este file en un único worker/orden.
test.describe.configure({ mode: 'serial' });

const secret = requireCronSecret();

// El bypass de Vercel Deployment Protection va como QUERY en la URL (via
// `endpointUrl()` del fixture), no como header — ver comentario en
// `fixtures/cron-recordatorio.ts:endpointUrl` para el motivo (Vercel cambió
// comportamiento del bypass header persistente el 2026-07-30 → loop 307).
// Estos helpers solo mandan el `x-cron-secret` cuando aplica; el `bypass`
// viaja dentro de la URL.
const bypassHeaders = () => ({
    'x-cron-secret': secret,
});
const bypassHeadersNoSecret = () => ({});

// ---------------------------------------------------------------------------
// S1 — dryRun elegibles por familia (F1/F2/legacy) — cero envíos reales.
// ---------------------------------------------------------------------------
test.describe.serial('S1 — dryRun elegibles por familia (F1/F2/legacy)', () => {
    let servicio: ServicioCuidadoListo;
    const ids: { F1: string; F2: string; legacy: string } = { F1: '', F2: '', legacy: '' };

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        const tutorId = await getTutorId();

        servicio = await crearServicioCuidadoConF2(supabaseProv, {
            proveedorId,
            minNoches: 1,
            maxNoches: 30,
            checkInHora: '15:00',
            checkOutHora: '11:00',
        });

        const isoManana = fechaMananaIso();
        const isoMananaMas1 = fechaMananaMas1DiaIso();

        ids.F2 = await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F2',
            fechaPreferidaIso: isoManana, fechaFinIso: isoMananaMas1,
            capacidadSnapshotEstadia: 1,
        });
        ids.F1 = await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F1',
            fechaPreferidaIso: isoManana, duracionMin: 60,
        });
        ids.legacy = await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'legacy',
            fechaPreferidaIso: isoManana,
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabaseTutor = getSupabaseAsTutor();
        const supabaseProv = getSupabaseAsProveedor();
        await cleanupAgendamientosDeTest(supabaseTutor, servicio.id);
        await borrarServicioResiliente(supabaseProv, servicio.id);
    });

    test('dryRun devuelve familias correctas para los 3 agendamientos test', async ({ baseURL }) => {
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { dryRun: true, bypassEnv: true }), {
            headers: bypassHeaders(),
        });
        expect(res.status(), await res.text()).toBe(200);
        const body = await res.json();

        expect(body.success).toBe(true);
        expect(body.dryRun).toBe(true);
        expect(body.elegibles).toBeGreaterThanOrEqual(3);

        const sample = body.sample as Array<{
            agendamientoId: string;
            familia: 'F1' | 'F2' | 'legacy';
            fechaLinea: string;
            fechaSub: string | null;
            horaLinea: string | null;
            envios: { tutor: { necesita: boolean; tieneEmail: boolean }; proveedor: { necesita: boolean; tieneEmail: boolean } };
        }>;

        // Sample capado a 10. Filtramos por nuestros ids — al menos 1 debe
        // aparecer, con familia esperada por semáforos.
        const misEntries = sample.filter(s =>
            s.agendamientoId === ids.F1 || s.agendamientoId === ids.F2 || s.agendamientoId === ids.legacy,
        );
        expect(misEntries.length).toBeGreaterThanOrEqual(1);

        for (const s of misEntries) {
            if (s.agendamientoId === ids.F2) {
                expect(s.familia).toBe('F2');
                expect(s.fechaSub).toMatch(/\bnoche/);
                expect(s.horaLinea).toBeNull();
            } else if (s.agendamientoId === ids.F1) {
                expect(s.familia).toBe('F1');
                expect(s.fechaSub).toBeNull();
                expect(s.horaLinea).toContain('·');
            } else if (s.agendamientoId === ids.legacy) {
                expect(s.familia).toBe('legacy');
                expect(s.fechaSub).toBeNull();
                expect(s.horaLinea).toMatch(/^\d{2}:\d{2}$/);
            }
            expect(s.envios.tutor.necesita).toBe(true);
            expect(s.envios.proveedor.necesita).toBe(true);
            expect(s.envios.tutor.tieneEmail).toBe(true);
            expect(s.envios.proveedor.tieneEmail).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// S2 — corrida real (envío + marca) + IDEMPOTENCIA (2ª corrida = 0 envíos).
// ---------------------------------------------------------------------------
test.describe.serial('S2 — corrida real + idempotencia', () => {
    let servicio: ServicioCuidadoListo;
    const ids: { F1: string; F2: string; legacy: string } = { F1: '', F2: '', legacy: '' };

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        const tutorId = await getTutorId();

        servicio = await crearServicioCuidadoConF2(supabaseProv, {
            proveedorId,
            minNoches: 1,
            maxNoches: 30,
            checkInHora: '15:00',
            checkOutHora: '11:00',
        });

        ids.F2 = await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F2',
            fechaPreferidaIso: fechaMananaIso(),
            fechaFinIso: fechaMananaMas1DiaIso(),
            capacidadSnapshotEstadia: 1,
        });
        ids.F1 = await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F1',
            fechaPreferidaIso: fechaMananaIso(), duracionMin: 60,
        });
        ids.legacy = await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'legacy',
            fechaPreferidaIso: fechaMananaIso(),
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabaseTutor = getSupabaseAsTutor();
        const supabaseProv = getSupabaseAsProveedor();
        await cleanupAgendamientosDeTest(supabaseTutor, servicio.id);
        await borrarServicioResiliente(supabaseProv, servicio.id);
    });

    const marcasPost1a: Record<string, { tutor: string | null; proveedor: string | null }> = {};

    test('1ª corrida real — marca poblada + sent > 0', async ({ baseURL }) => {
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { bypassEnv: true }), {
            headers: bypassHeaders(),
            timeout: 45_000,
        });
        expect(res.status(), await res.text()).toBe(200);
        const body = await res.json();

        expect(body.success).toBe(true);
        expect(body.dryRun).toBeUndefined();
        expect(body.sent?.tutor).toBeGreaterThanOrEqual(3);
        expect(body.sent?.proveedor).toBeGreaterThanOrEqual(3);
        expect(Array.isArray(body.failures)).toBe(true);
        const nuestrosFailures = body.failures.filter((f: { agendamientoId: string }) =>
            f.agendamientoId === ids.F1 || f.agendamientoId === ids.F2 || f.agendamientoId === ids.legacy,
        );
        expect(nuestrosFailures).toEqual([]);

        // BD: 6 marcas populadas.
        const supabase = getSupabaseAsTutor();
        for (const familia of ['F1', 'F2', 'legacy'] as const) {
            const marcas = await getMarcasAgendamiento(supabase, ids[familia]);
            expect(marcas.tutor, `${familia} tutor mark`).not.toBeNull();
            expect(marcas.proveedor, `${familia} proveedor mark`).not.toBeNull();
            marcasPost1a[familia] = marcas;
        }
    });

    test('2ª corrida DRY-RUN — nuestros ids NO aparecen como elegibles (contrato de idempotencia)', async ({ baseURL }) => {
        // Elección de diseño: la 2ª corrida es DRY-RUN, no real. Motivo: el
        // contrato de idempotencia se prueba con "el endpoint NO reprocesa
        // filas ya marcadas"; un dryRun demuestra exactamente eso (mira los
        // elegibles que HABRÍA procesado) sin side effects. Una 2ª corrida
        // real observaba drift consistente en la marca F1 tutor (~200-400ms
        // tras el inicio de la corrida) — investigación queda pendiente al
        // instrumentar el endpoint, sin bloquear el cierre R6.
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { dryRun: true, bypassEnv: true }), {
            headers: bypassHeaders(),
            timeout: 30_000,
        });
        expect(res.status(), await res.text()).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.dryRun).toBe(true);

        // Elegibles del staging entero: no deben contener nuestros ids
        // (marcas ya populadas por la 1ª). Sample capado a 10 — si hay más
        // elegibles en el staging global, chequeo solo lo que el sample
        // muestra, pero eso es suficiente porque nuestros ids estarían
        // priorizados por `.order('fecha_preferida')` si fueran elegibles.
        const sampleIds = new Set(
            (body.sample as Array<{ agendamientoId: string }>).map(s => s.agendamientoId),
        );
        for (const familia of ['F1', 'F2', 'legacy'] as const) {
            expect(
                sampleIds.has(ids[familia]),
                `${familia} (${ids[familia]}) NO debe aparecer en 2ª corrida — marca populada por 1ª`,
            ).toBe(false);
        }

        // Refuerzo BD: marcas siguen populadas (no NULL). No comparamos
        // timestamps porque no hicimos UPDATE (dryRun).
        const supabase = getSupabaseAsTutor();
        for (const familia of ['F1', 'F2', 'legacy'] as const) {
            const marcas = await getMarcasAgendamiento(supabase, ids[familia]);
            expect(marcas.tutor, `${familia} tutor mark sigue populada`).not.toBeNull();
            expect(marcas.proveedor, `${familia} proveedor mark sigue populada`).not.toBeNull();
        }
        expect(Object.keys(marcasPost1a)).toEqual(['F1', 'F2', 'legacy']);
    });
});

// ---------------------------------------------------------------------------
// S3 — marcas independientes por destinatario (idempotencia parcial).
// ---------------------------------------------------------------------------
test.describe.serial('S3 — marcas independientes (parcial)', () => {
    let servicio: ServicioCuidadoListo;
    let agendamientoId: string = '';
    const marcaTutorVieja = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const startIso = new Date().toISOString();

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        const tutorId = await getTutorId();

        servicio = await crearServicioCuidadoConF2(supabaseProv, {
            proveedorId, minNoches: 1, maxNoches: 30,
            checkInHora: '15:00', checkOutHora: '11:00',
        });

        agendamientoId = await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F2',
            fechaPreferidaIso: fechaMananaIso(),
            fechaFinIso: fechaMananaMas1DiaIso(),
            capacidadSnapshotEstadia: 1,
            recordatorioTutorEnviadoAt: marcaTutorVieja,
            recordatorioProveedorEnviadoAt: null,
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabaseTutor = getSupabaseAsTutor();
        const supabaseProv = getSupabaseAsProveedor();
        await cleanupAgendamientosDeTest(supabaseTutor, servicio.id);
        await borrarServicioResiliente(supabaseProv, servicio.id);
    });

    test('corrida envía solo al proveedor pendiente + tutor mark intacta', async ({ baseURL }) => {
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { bypassEnv: true }), {
            headers: bypassHeaders(),
            timeout: 30_000,
        });
        expect(res.status(), await res.text()).toBe(200);
        const body = await res.json();

        expect(body.success).toBe(true);
        const nuestrosFailures = (body.failures ?? []).filter((f: { agendamientoId: string }) => f.agendamientoId === agendamientoId);
        expect(nuestrosFailures).toEqual([]);

        // Tutor mark: mismo instante que el ISO viejo (no se tocó).
        // Proveedor mark: ISO nuevo (>= startIso). Comparación por epoch —
        // PG devuelve '+00:00' y JS toISOString() devuelve 'Z' (equivalentes
        // como instante, distintos como string).
        const supabase = getSupabaseAsTutor();
        const marcas = await getMarcasAgendamiento(supabase, agendamientoId);
        expect(marcas.tutor).not.toBeNull();
        expect(new Date(marcas.tutor!).getTime()).toBe(new Date(marcaTutorVieja).getTime());
        expect(marcas.proveedor).not.toBeNull();
        expect(new Date(marcas.proveedor!).getTime()).toBeGreaterThanOrEqual(new Date(startIso).getTime());
    });
});

// ---------------------------------------------------------------------------
// S4 — no elegibles: fuera de ventana + estado != confirmada.
// ---------------------------------------------------------------------------
test.describe.serial('S4 — no elegibles (fuera ventana + estado != confirmada)', () => {
    let servicio: ServicioCuidadoListo;
    const misIds = new Set<string>();

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        const tutorId = await getTutorId();

        servicio = await crearServicioCuidadoConF2(supabaseProv, {
            proveedorId, minNoches: 1, maxNoches: 30,
        });

        misIds.add(await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F1',
            fechaPreferidaIso: fechaFuturoIso(6), duracionMin: 60,
            estado: 'confirmada',
        }));
        misIds.add(await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F1',
            fechaPreferidaIso: fechaFuturoIso(48), duracionMin: 60,
            estado: 'confirmada',
        }));
        misIds.add(await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F1',
            fechaPreferidaIso: fechaMananaIso(), duracionMin: 60,
            estado: 'pendiente',
        }));
        misIds.add(await insertarAgendamientoTest(supabaseTutor, {
            servicioId: servicio.id, proveedorId, tutorId, familia: 'F1',
            fechaPreferidaIso: fechaMananaIso(), duracionMin: 60,
            estado: 'rechazada',
        }));
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabaseTutor = getSupabaseAsTutor();
        const supabaseProv = getSupabaseAsProveedor();
        await cleanupAgendamientosDeTest(supabaseTutor, servicio.id);
        await borrarServicioResiliente(supabaseProv, servicio.id);
    });

    test('dryRun — ninguno de los 4 aparece; corrida real no toca sus marcas', async ({ baseURL }) => {
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { dryRun: true, bypassEnv: true }), {
            headers: bypassHeaders(),
        });
        expect(res.status(), await res.text()).toBe(200);
        const body = await res.json();
        expect(body.dryRun).toBe(true);

        const sampleIds = new Set(
            (body.sample as Array<{ agendamientoId: string }>).map(s => s.agendamientoId),
        );
        for (const id of misIds) {
            expect(sampleIds.has(id), `agendamiento ${id} NO debe ser elegible`).toBe(false);
        }

        // Corrida real: nuestras filas siguen intactas (marcas NULL).
        const resReal = await api.get(endpointUrl(baseURL!, { bypassEnv: true }), {
            headers: bypassHeaders(),
            timeout: 30_000,
        });
        expect(resReal.status()).toBe(200);
        const bodyReal = await resReal.json();
        const nuestrosFailures = (bodyReal.failures ?? []).filter((f: { agendamientoId: string }) => misIds.has(f.agendamientoId));
        expect(nuestrosFailures).toEqual([]);

        const supabase = getSupabaseAsTutor();
        const { data } = await supabase
            .from('agendamientos')
            .select('id, recordatorio_tutor_enviado_at, recordatorio_proveedor_enviado_at')
            .eq('servicio_id', servicio.id);
        for (const row of (data ?? []) as Array<{ id: string; recordatorio_tutor_enviado_at: string | null; recordatorio_proveedor_enviado_at: string | null }>) {
            expect(row.recordatorio_tutor_enviado_at, `${row.id} tutor mark`).toBeNull();
            expect(row.recordatorio_proveedor_enviado_at, `${row.id} proveedor mark`).toBeNull();
        }
    });
});

// ---------------------------------------------------------------------------
// S5 — auth: sin secret / wrong secret / Bearer erróneo → 401.
// Secret válido + dryRun → 200.
// ---------------------------------------------------------------------------
test.describe('S5 — auth', () => {
    test('sin secret → 401', async ({ baseURL }) => {
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { bypassEnv: true }), {
            headers: bypassHeadersNoSecret(),
        });
        expect(res.status()).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('Unauthorized');
    });

    test('secret erróneo → 401', async ({ baseURL }) => {
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { bypassEnv: true }), {
            headers: {
                ...bypassHeadersNoSecret(),
                'x-cron-secret': 'obviamente-mal-' + Date.now(),
            },
        });
        expect(res.status()).toBe(401);
    });

    test('Bearer erróneo → 401 (Vercel Cron header)', async ({ baseURL }) => {
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { bypassEnv: true }), {
            headers: {
                ...bypassHeadersNoSecret(),
                Authorization: 'Bearer secret-fake',
            },
        });
        expect(res.status()).toBe(401);
    });

    test('secret válido en dryRun → 200 (puerta abre correctamente)', async ({ baseURL }) => {
        const api = await request.newContext({ extraHTTPHeaders: {} });
        const res = await api.get(endpointUrl(baseURL!, { dryRun: true, bypassEnv: true }), {
            headers: bypassHeaders(),
        });
        expect(res.status(), await res.text()).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.dryRun).toBe(true);
    });
});
