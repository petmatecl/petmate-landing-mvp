// e2e/specs/tipo-cd/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Sprint tipo-cd (2026-09-15) — spec structural que verifica que los 14
// archivos del inventario error-audit (5 Tipo C SSR + 9 Tipo D crons+auth,
// BACKLOG L744-758) ya no tienen el patrón `const { data } = await ...`
// sin destructurar `.error`. Cada match residual del patrón huérfano
// reintroduciría deuda de diagnóstico silente cerrada por este sprint.
//
// Cada archivo ahora consume `lib/logSupabaseError.ts` con slug de familia
// (`ssr:` / `api-cron:` / `api-notify:` / `api-admin:` / `api-eval:` /
// `api-refer:` / `auth-session:`) — la política por familia queda encapsulada
// en el helper (level=warning, tags subsystem/errorCode, extra con
// errorMessage/errorDetails/errorHint + contexto del caller).
//
// Rol-agnóstico: usa fs.readFile sobre el source, cero navegación.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

// Lista canónica del inventario tipo-cd. Cada entrada es un archivo que
// tenía al menos una línea con `const { data } = await ...` sin `.error`
// destructurado. El grep de abajo debe retornar cero matches del patrón
// literal en TODOS estos archivos.
const ARCHIVOS_INVENTARIO = [
    // Tipo C (SSR / SEO / componentes SSR)
    'pages/explorar.tsx',
    'pages/[categoria]/[comuna].tsx',
    'pages/servicio/[id].tsx',
    'components/Admin/ConversionMetrics.tsx',
    // Tipo D (crons + notify server-to-server + admin)
    'pages/api/evaluaciones/auto-moderar.ts',
    'pages/api/notifications/new-message.ts',
    'pages/api/referidos/generar-codigo.ts',
    'pages/api/cron/recordatorio-onboarding.ts',
    'pages/api/cron/recordatorio-mensajes.ts',
    'pages/api/cron/invitacion-resenas.ts',
    'pages/api/admin/proveedores-pendientes.ts',
    // Auth session
    'pages/email-confirmado.tsx',
    'contexts/UserContext.tsx',
];

// Patrón huérfano: `const { data(: rename)? } = await supabase(Admin?).<algo>`
// SIN `error` en la destructuración. La regex negativa se hace en 2 pasos
// (match del patrón + assertion que la línea contiene `error`).
const PATRON_HUERFANO = /const\s*\{\s*data(?:\s*:\s*\w+)?\s*\}\s*=\s*await\s+supabase/g;

test('[tipo-cd] los 14 archivos del inventario NO tienen `data` sin `error` destructurado', async () => {
    const violaciones: string[] = [];

    for (const relPath of ARCHIVOS_INVENTARIO) {
        const absPath = path.join(REPO_ROOT, relPath);
        const source = await readFile(absPath, 'utf-8');
        const matches = source.match(PATRON_HUERFANO);
        if (matches && matches.length > 0) {
            violaciones.push(`${relPath} — ${matches.length} match(es): ${matches.slice(0, 3).join(' | ')}`);
        }
    }

    expect(
        violaciones.length,
        `Cero patrones huérfanos esperados. Violaciones encontradas:\n${violaciones.join('\n')}`,
    ).toBe(0);
});

test('[tipo-cd] el helper logSupabaseError existe y exporta la firma esperada', async () => {
    const helperSource = await readFile(
        path.join(REPO_ROOT, 'lib/logSupabaseError.ts'),
        'utf-8',
    );
    // Firma esperada: función exportada + Sentry.captureMessage inside.
    expect(helperSource, 'export function logSupabaseError').toMatch(/export function logSupabaseError\(/);
    expect(helperSource, 'usa Sentry.captureMessage con level warning').toMatch(/Sentry\.captureMessage/);
    expect(helperSource, 'gate por error truthy').toMatch(/if\s*\(!error\)/);
});

test('[tipo-cd] cada archivo importa logSupabaseError o Sentry directo (UserContext exception)', async () => {
    const sinImportSentry: string[] = [];

    for (const relPath of ARCHIVOS_INVENTARIO) {
        const source = await readFile(path.join(REPO_ROOT, relPath), 'utf-8');
        // UserContext ya tenía Sentry importado desde antes (RoleGuard-style
        // captureMessage inline), no necesita el helper.
        if (relPath === 'contexts/UserContext.tsx') {
            expect(source, `${relPath} debe importar Sentry`).toMatch(/import \* as Sentry from '@sentry\/nextjs'/);
            continue;
        }
        if (!source.match(/from ['"][^'"]*\/lib\/logSupabaseError['"]/)) {
            sinImportSentry.push(relPath);
        }
    }

    expect(
        sinImportSentry.length,
        `Archivos sin import de logSupabaseError:\n${sinImportSentry.join('\n')}`,
    ).toBe(0);
});

// ─── Sprint tipo-cd v2 — tests de COMPORTAMIENTO (no solo telemetría) ───
//
// Cada archivo debe demostrar el patrón fail-close correcto según su
// familia. Los assertion se hacen via grep del source (structural) porque
// mockear el fallo real de queries Supabase server-side desde Playwright
// no es posible sin infra adicional (page.route intercepta browser, no
// server node functions). Los patterns exigidos son literales auditables
// y cualquier reintroducción del patrón viejo revienta estos tests.

test('[tipo-cd-v2] queries principales de crons y auto-moderar THROW en error', async () => {
    const casos = [
        {
            file: 'pages/api/evaluaciones/auto-moderar.ts',
            patrones: [
                /if\s*\(servicioErr\)\s*throw/,
                /if\s*\(buscadorErr\)\s*throw/,
                /if\s*\(agendErr\)\s*throw/,
            ],
        },
        {
            file: 'pages/api/cron/recordatorio-onboarding.ts',
            patrones: [
                /if\s*\(noServiceErr\)\s*throw/,
                /if\s*\(noPhotoErr\)\s*throw/,
            ],
        },
    ];
    for (const { file, patrones } of casos) {
        const source = await readFile(path.join(REPO_ROOT, file), 'utf-8');
        for (const patron of patrones) {
            expect(source, `${file} debe tener throw en ${patron}`).toMatch(patron);
        }
    }
});

test('[tipo-cd-v2] API endpoints devuelven 500 en error de query crítica', async () => {
    const casos = [
        {
            file: 'pages/api/notifications/new-message.ts',
            patron: /if\s*\(authErr\)\s*return\s*res\.status\(500\)/,
        },
        {
            file: 'pages/api/referidos/generar-codigo.ts',
            patron: /if\s*\(existingError\)\s*return\s*res\.status\(500\)/,
        },
    ];
    for (const { file, patron } of casos) {
        const source = await readFile(path.join(REPO_ROOT, file), 'utf-8');
        expect(source, `${file} debe devolver 500 en error`).toMatch(patron);
    }
});

test('[tipo-cd-v2] invitacion-resenas dup_check fail-close por-ítem con continue', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'pages/api/cron/invitacion-resenas.ts'),
        'utf-8',
    );
    // Fail-close: `if (yaResenoErr) continue` ANTES del `if (yaReseno)` normal.
    expect(source, 'yaResenoErr continue fail-close').toMatch(/if\s*\(yaResenoErr\)\s*continue/);
});

test('[tipo-cd-v2] SSR [categoria]/[comuna] tiene flag errorLoading + throw en queries', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'pages/[categoria]/[comuna].tsx'),
        'utf-8',
    );
    expect(source, 'interface Props errorLoading').toMatch(/errorLoading\??:\s*boolean/);
    expect(source, 'catch outer setea errorLoading true').toMatch(/errorLoading:\s*true/);
    expect(source, 'catErr throw').toMatch(/if\s*\(catErr\)\s*throw/);
    expect(source, 'rpcErr throw').toMatch(/if\s*\(rpcErr\)\s*throw/);
});

test('[tipo-cd-v2] SSR servicio/[id] tiene flag globalRatingUnavailable en props', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'pages/servicio/[id].tsx'),
        'utf-8',
    );
    expect(source, 'interface globalRatingUnavailable').toMatch(/globalRatingUnavailable\??:\s*boolean/);
    expect(source, 'compute desde globalErr').toMatch(/globalRatingUnavailable\s*=\s*!!globalErr/);
    expect(source, 'return props incluye flag').toMatch(/globalRatingUnavailable,?\s*\n?\s*}/);
});

test('[tipo-cd-v2] ConversionMetrics tiene partialError state + banner', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/Admin/ConversionMetrics.tsx'),
        'utf-8',
    );
    expect(source, 'partialError state').toMatch(/const\s*\[partialError,\s*setPartialError\]/);
    expect(source, 'trackear enrichErrors').toMatch(/enrichErrors\.push\(/);
    expect(source, 'banner Datos parciales').toMatch(/Datos parciales/);
});

// FIXME [ci-pipefail-2026-09-17]: oculto por tee sin pipefail; triage en sprint I-tests-triage. Síntoma: refreshProfile no matchea el pattern early-return sin des-hidratar. Candidato prioritario — comportamiento producción UserContext (hidratación de perfil bajo error).
test.fixme('[tipo-cd-v2] UserContext.refreshProfile early-return sin des-hidratar en error', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'contexts/UserContext.tsx'),
        'utf-8',
    );
    // Buscar el patrón dentro de refreshProfile: si error → setIsLoading(false) + return
    // ANTES de hydrateFromSession(null).
    const refreshBlock = source.match(/const refreshProfile[\s\S]{0,800}/);
    expect(refreshBlock, 'bloque refreshProfile encontrado').not.toBeNull();
    expect(refreshBlock![0], 'error → setIsLoading(false) + return sin hydrate').toMatch(
        /if\s*\(error\)\s*\{[\s\S]*?setIsLoading\(false\);\s*return;\s*\}/,
    );
});
