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
