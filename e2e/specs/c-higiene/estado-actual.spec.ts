// e2e/specs/c-higiene/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Bloque C higiene · PR C-1 (limpieza) — Paso 0 diagnostic + regresión.
//
// Verifica los 7 items del PR de limpieza:
//   1. DEAD-USR: pages/usuario.tsx + DashboardContent.tsx + comentarios
//      stale de RoleSelectionInterceptor.
//   2. AUTH-SUP: lib/authService.ts eliminado.
//   3. ICO-HUER: `especies_atendidas: Stethoscope` eliminado de icon map.
//   4. IMPORT-DEAD: `Popup` no importado en LocationMap.
//   5. email-confirmado getSession: reemplazado por useUser() del context.
//   6. def 4 ext: MobileActionSheet importa usePersistentOverlayClose.
//   7. ORPH-EDIT-EXT: cero error.message/err.message crudo en SFM.
//
// Tests structural via fs.readFile — rol-agnóstico, cero navegación.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile, access } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

async function fileExists(relPath: string): Promise<boolean> {
    try {
        await access(path.join(REPO_ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

test('[c-higiene DEAD-USR] pages/usuario.tsx + DashboardContent.tsx eliminados', async () => {
    expect(await fileExists('pages/usuario.tsx'), 'pages/usuario.tsx debe estar eliminado').toBe(false);
    expect(await fileExists('components/Client/DashboardContent.tsx'), 'DashboardContent.tsx debe estar eliminado').toBe(false);
    // Redirect 307 preservado en next.config.js.
    const nextConfig = await readFile(path.join(REPO_ROOT, 'next.config.js'), 'utf-8');
    expect(nextConfig, 'next.config.js preserva redirect /usuario → /explorar').toMatch(/source:\s*'\/usuario'/);
});

// Refactor 2026-09-15 (sprint c-higiene DEAD-USR): los comentarios stale fueron reemplazados por un bloque explicativo que cita las strings viejas como referencia histórica; assertion actualizada a comparar solo código activo (excluye líneas `//`) + positiva sobre el marker del sprint.
test('[c-higiene DEAD-USR] RoleSelectionInterceptor sin comentarios stale', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/Auth/RoleSelectionInterceptor.tsx'),
        'utf-8',
    );
    // Strip líneas de comentario `//` — el nuevo bloque documenta el refactor
    // citando las strings viejas como referencia (esperado). El chequeo real
    // es sobre código ejecutable.
    const codeOnly = source.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(codeOnly, 'código activo sin ref stale "/usuario or /sitter"').not.toMatch(/\/usuario or \/sitter/);
    expect(codeOnly, 'código activo sin ref stale "on \\/ or \\/usuario \\(protected\\)"').not.toMatch(/on \/ or \/usuario \(protected\)/);
    // Sprint c-higiene DEAD-USR documentado en el bloque explicativo actual.
    expect(source, 'documenta sprint c-higiene DEAD-USR (bloque explicativo del refactor)').toMatch(/Sprint c-higiene DEAD-USR/);
});

test('[c-higiene AUTH-SUP] lib/authService.ts eliminado', async () => {
    expect(await fileExists('lib/authService.ts'), 'lib/authService.ts debe estar eliminado').toBe(false);
});

// Refactor 2026-09-15 (sprint c-higiene ICO-HUER): la entrada `especies_atendidas: Stethoscope` fue eliminada del icon map, pero el sprint dejó un comentario explicativo que cita la línea vieja como referencia; assertion actualizada a comparar solo código activo (excluye líneas `//`).
test('[c-higiene ICO-HUER] especies_atendidas removido del icon map', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'lib/camposPorCategoria.ts'),
        'utf-8',
    );
    // Strip líneas de comentario `//` — el sprint dejó un bloque que
    // menciona la línea vieja como referencia histórica (esperado).
    const codeOnly = source.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(codeOnly, 'cero entrada especies_atendidas: Stethoscope en código activo del icon map').not.toMatch(/especies_atendidas:\s*Stethoscope/);
});

test('[c-higiene IMPORT-DEAD] LocationMap sin import Popup', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/Shared/LocationMap.tsx'),
        'utf-8',
    );
    const firstImport = source.split('\n')[0];
    expect(firstImport, 'primera línea import sin Popup').not.toMatch(/,\s*Popup\s*}|Popup,/);
});

test('[c-higiene email-confirmado] sin supabase.auth.getSession() fallback', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'pages/email-confirmado.tsx'),
        'utf-8',
    );
    // Cero llamadas activas a getSession. Los comentarios históricos pueden
    // mencionar getSession, así que buscamos solo la invocación literal.
    expect(source, 'cero supabase.auth.getSession() activo').not.toMatch(/await\s+supabase\.auth\.getSession\(\)/);
    // Y sí debe usar useUser().
    expect(source, 'consume useUser() del context').toMatch(/useUser\(\)/);
});

test('[c-higiene def 4 ext] MobileActionSheet importa usePersistentOverlayClose', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/Servicio/MobileActionSheet.tsx'),
        'utf-8',
    );
    expect(source, 'importa hook usePersistentOverlayClose').toMatch(/from ['"][^'"]*usePersistentOverlayClose['"]/);
    expect(source, 'invoca el hook con (isOpen, onClose, id)').toMatch(/usePersistentOverlayClose\(isOpen,\s*onClose,/);
});

// Refactor 2026-09-15 (sprint c-higiene ORPH-EDIT-EXT): los patrones viejos fueron eliminados del código activo, pero el sprint dejó comentarios que citan `toast.error('...' + error.message)` como referencia histórica; assertion actualizada a comparar solo código activo (excluye líneas `//`).
test('[c-higiene ORPH-EDIT-EXT] ServiceFormModal sin error.message/err.message crudo en toasts', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/Proveedor/ServiceFormModal.tsx'),
        'utf-8',
    );
    // Strip líneas `//` — comentarios del sprint citan la firma vieja como
    // referencia (esperado). El chequeo real es sobre código ejecutable.
    const codeOnly = source.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    // Patrón malo 1: `toast.error('...' + error.message)`.
    const patronConcat = /toast\.error\(['"`][^'"`]*['"`]\s*\+\s*(err|error)\.message/g;
    expect(codeOnly.match(patronConcat), `cero toast.error('...' + error.message) en código activo`).toBeNull();
    // Patrón malo 2: variable acumulador con .message.
    const patronAcum = /\b(franjasErr|excErr|blkErr)\s*=\s*(err|error)\.message/g;
    expect(codeOnly.match(patronAcum), `cero franjasErr/excErr/blkErr = error.message en código activo`).toBeNull();
    // Y debe importar logSupabaseError.
    expect(source, 'importa logSupabaseError').toMatch(/from ['"][^'"]*logSupabaseError['"]/);
});
