// e2e/specs/e-notif-toasts/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Sprint E-5 notif + toasts — Paso 0 diagnostic + regresión estructural.
//
// Items del PR:
//   1. TOASTS-HOMOL: verificar que el Toaster global usa tokens Pawnecta
//      (success/info/warning/error), no `richColors`. Ya aterrizado en
//      Ola 2 B4, esta spec solo bloquea regresión.
//   2. F2-NOTIF-0000: `formatFechaRelativa` acepta `sinHora?: boolean`;
//      NotificationBell lo pasa true cuando el agendamiento es F2
//      (duracion_min == null && fecha_fin != null).
//   3. NOTIF-CONTRASTE: notif card no-leída tiene `border-l-2 border-accent-500`.
//   4. AV-TUTOR-TRIGGER: ClientLayout ya no renderea el `<label
//      htmlFor="avatar-upload">` clickeable (opción A, ocultar).
//   5. ICON-STETHO: verificar que `especies_atendidas: Stethoscope` YA
//      no está en el icon map (removido en c-higiene ICO-HUER 2026-09-15).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

test('[e-notif-toasts TOASTS-HOMOL] Toaster global usa classNames Pawnecta y sin richColors', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'pages/_app.tsx'), 'utf-8');
    // El Toaster tiene toastOptions.classNames con paleta success/info/warning/error.
    expect(source, 'toastOptions.classNames declarado').toMatch(/classNames:\s*\{/);
    expect(source, 'success mapea a bg-success-50').toMatch(/success:\s*'bg-success-50/);
    expect(source, 'warning mapea a bg-warning-50').toMatch(/warning:\s*'bg-warning-50/);
    expect(source, 'error mapea a bg-danger-50').toMatch(/error:\s*'bg-danger-50/);
    expect(source, 'info mapea a bg-info-50').toMatch(/info:\s*'bg-info-50/);
    // Cero prop richColors activo.
    const active = source.match(/<Toaster[\s\S]*?\/>/);
    expect(active, 'Toaster block encontrado').not.toBeNull();
    if (active) {
        expect(active[0], 'sin prop richColors activa en el Toaster').not.toMatch(/richColors(?!\s*=\s*\{false)/);
    }
});

test('[e-notif-toasts F2-NOTIF-0000] formatFechaRelativa acepta sinHora', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'lib/dateRelative.ts'), 'utf-8');
    // sinHora en FormatOpts.
    expect(source, 'sinHora?: boolean en FormatOpts').toMatch(/sinHora\?:\s*boolean/);
    // Modo evento: 5 variantes con sinHora branching.
    expect(source, '"Hoy" sinHora branch').toMatch(/dayDelta === 0[\s\S]{0,200}sinHora\s*\?\s*'Hoy'/);
    expect(source, '"Mañana" sinHora branch').toMatch(/dayDelta === 1[\s\S]{0,200}sinHora\s*\?\s*'Mañana'/);
    expect(source, '"Fue ayer" sinHora branch').toMatch(/dayDelta === -1[\s\S]{0,200}sinHora\s*\?\s*'Fue ayer'/);
});

test('[e-notif-toasts F2-NOTIF-0000] NotificationBell pasa sinHora=true en F2', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Shared/NotificationBell.tsx'), 'utf-8');
    // La heurística esF2 = duracion_min == null && fecha_fin != null.
    expect(source, 'esF2 = duracion_min == null && fecha_fin != null').toMatch(
        /esF2\s*=\s*info\.duracion_min\s*==\s*null\s*&&\s*info\.fecha_fin\s*!=\s*null/,
    );
    // Pass a formatFechaRelativa.
    expect(source, 'formatFechaRelativa con modo evento + sinHora esF2').toMatch(
        /formatFechaRelativa\(info\.fecha_preferida,\s*\{\s*modo:\s*'evento',\s*sinHora:\s*esF2\s*\}\)/,
    );
});

test('[e-notif-toasts NOTIF-CONTRASTE] no-leída con border-l accent-500', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Shared/NotificationBell.tsx'), 'utf-8');
    expect(source, 'no-leída con border-l-2 border-accent-500').toMatch(
        /!n\.read\s*\?\s*'bg-accent-50\/30 border-l-2 border-accent-500'/,
    );
});

test('[e-notif-toasts AV-TUTOR-TRIGGER] ClientLayout sin label avatar-upload', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Client/ClientLayout.tsx'), 'utf-8');
    // Cero <label htmlFor="avatar-upload"> clickeable.
    expect(source, 'sin <label htmlFor="avatar-upload">').not.toMatch(
        /<label[\s\S]{0,200}htmlFor="avatar-upload"/,
    );
    // Cero <input id="avatar-upload">.
    expect(source, 'sin <input id="avatar-upload">').not.toMatch(
        /<input[\s\S]{0,80}id="avatar-upload"/,
    );
});

test('[e-notif-toasts ICON-STETHO] icon map sin entry especies_atendidas', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'lib/camposPorCategoria.ts'), 'utf-8');
    // Cero declaración (comentarios con la string OK, solo la asignación activa
    // no debe existir).
    const asignaciones = source.match(/^\s+especies_atendidas:\s*[A-Z]\w+/gm);
    expect(asignaciones, 'cero asignación activa de especies_atendidas en icon map').toBeNull();
});
