// e2e/specs/d-explorar-mapa/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Bloque D · PR D-2 explorar+mapa — Paso 0 diagnostic + regresión estructural.
//
// Verifica los 3 items del PR:
//   1. MAP-5: foto del popup en CaregiverMap usa `object-top` (fix
//      "sujeto descentrado" reportado por PO 2026-09-04). Ver
//      BACKLOG.md L89-93.
//   2. EXP-MOBILE: barra de controles interna de /explorar usa
//      `flex-wrap` para que Toggle Lista/Mapa + selector orden no se
//      solapen en anchos 348-390px.
//   3. 404-SEED-FIX: next.config.js redirect 301 para `/proveedor/b1000001-*`
//      → `/explorar` (ver BACKLOG.md L376-381).
//
// Tests structural via fs.readFile — rol-agnóstico, cero navegación,
// cero fixture de datos.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

test('[d-explorar-mapa MAP-5] CaregiverMap popup img usa object-top', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/Explore/CaregiverMap.tsx'),
        'utf-8',
    );
    // La <img> del popup (dentro del Popup con className="custom-popup").
    // Debe llevar object-top explícito para preservar la cabeza/rostro
    // del sujeto en lugar del crop center default.
    expect(source, 'img del popup con object-top').toMatch(
        /className=["'`][^"'`]*object-top[^"'`]*["'`]/,
    );
    // Y sigue con object-cover + h-32 (no revertidos).
    expect(source, 'img preserva h-32 object-cover').toMatch(
        /className=["'`][^"'`]*w-full h-32 object-cover object-top["'`]/,
    );
});

test('[d-explorar-mapa EXP-MOBILE] barra de controles /explorar usa flex-wrap', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'pages/explorar.tsx'),
        'utf-8',
    );
    // El div interno que agrupa Toggle Lista/Mapa + label + select debe
    // llevar flex-wrap para que en anchos 348-390px el selector "Mejor
    // coincidencia" baje debajo del toggle en vez de superponerse.
    expect(
        source,
        'div interno de controles con flex-wrap',
    ).toMatch(
        /className=["'`]flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto["'`]/,
    );
});

test('[d-explorar-mapa 404-SEED-FIX] next.config.js redirect 301 seed proveedores', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'next.config.js'), 'utf-8');
    // Redirect 301 desde /proveedor/b1000001-* (los 9 seeds del
    // migrations/20260506_seed_demos_y_es_ejemplo.sql).
    expect(
        source,
        'redirect /proveedor/b1000001-* → /explorar permanent',
    ).toMatch(
        /source:\s*['"`]\/proveedor\/:id\(b1000001-\.\*\)['"`][\s\S]{0,120}destination:\s*['"`]\/explorar['"`][\s\S]{0,60}permanent:\s*true/,
    );
});
