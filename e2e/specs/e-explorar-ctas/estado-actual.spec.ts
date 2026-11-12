// e2e/specs/e-explorar-ctas/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Sprint E-2 explorar y CTAs — Paso 0 diagnostic + regresión estructural.
//
// Items del PR (walkthrough #1 IDs):
//   1. UX-1 + EMPTY-STATES: cap 2 fillers, solo si <3 servicios reales,
//      copy "Aún hay pocos proveedores en esta categoría".
//   2. UX-2: cero CTA `/register?rol=proveedor` dentro de pages/explorar.tsx
//      (queda solo en Header + Footer). ServicePlaceholderCard sin Link CTA.
//   3. UX-3: copy del ExampleCTAModal cambia "con un proveedor" → "a un
//      proveedor real, regístrate en Pawnecta".
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

test('[e-explorar-ctas UX-1] filler cards cap 2 + condición <3 real', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'pages/explorar.tsx'),
        'utf-8',
    );
    // Nueva condición: services.length < 3 (antes era totalCount < 12).
    expect(source, 'condición filler usa services.length < 3').toMatch(
        /pagina\s*===\s*1\s*&&\s*services\.length\s*>\s*0\s*&&\s*services\.length\s*<\s*3/,
    );
    // Cap de fillers: Math.min(2, ...).
    expect(source, 'cap fillers Math.min(2, ...)').toMatch(
        /Math\.min\(2,\s*3\s*-\s*services\.length\)/,
    );
    // Ya no queda condición totalCount < 12.
    expect(
        source,
        'cero condición vieja totalCount < 12 para fillers',
    ).not.toMatch(/totalCount\s*<\s*12/);
});

test('[e-explorar-ctas EMPTY-STATES] copy explicativo arriba del grid cuando aplica', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'pages/explorar.tsx'),
        'utf-8',
    );
    expect(source, 'copy "Aún hay pocos proveedores"').toMatch(
        /Aún hay pocos proveedores en esta categoría/,
    );
});

test('[e-explorar-ctas UX-2] cero CTA /register?rol=proveedor dentro de pages/explorar.tsx', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'pages/explorar.tsx'),
        'utf-8',
    );
    const links = source.match(/href=["']\/register\?rol=proveedor["']/g);
    expect(
        links,
        'cero apariciones de /register?rol=proveedor en el archivo',
    ).toBeNull();
});

// Refactor 2026-09-15 (sprint E-2 UX-2): ServicePlaceholderCard variant='full'
// (usado en /explorar) sin Link CTA para no duplicar los 12 CTAs de registro
// que /explorar tenía.
// Update 2026-11-12 (sprint home-carrusel punto 3): variant='compact' (usado
// en el carrusel del home) vuelve a ser clickable hacia /register — densidad
// del home es baja y la captación de proveedores tiene sentido. El spec
// ahora valida la POLÍTICA DIFERENCIADA: full sin link, compact con link.
test('[e-explorar-ctas UX-2 updated 2026-11-12] ServicePlaceholderCard: Link CTA solo en variant=compact (home), full (explorar) sin Link', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/Explore/ServicePlaceholderCard.tsx'),
        'utf-8',
    );
    // Split el source en 2 bloques por el `if (variant === 'compact')`.
    // El anchor del compact es ese if; todo lo que sigue hasta el último
    // `return (` del archivo (que es el full) es el bloque compact.
    const compactIdx = source.indexOf("if (variant === 'compact')");
    const fullReturnIdx = source.lastIndexOf('return (');
    expect(compactIdx, 'bloque compact debe existir').toBeGreaterThan(-1);
    expect(fullReturnIdx, 'bloque full return debe existir').toBeGreaterThan(compactIdx);
    const compactBlock = source.slice(compactIdx, fullReturnIdx);
    const fullBlock = source.slice(fullReturnIdx);

    // Compact (home carrusel): SÍ tiene <Link> + "Publica gratis" + /register.
    expect(compactBlock, 'compact SÍ debe tener <Link>').toMatch(/<Link[\s>]/);
    expect(compactBlock, 'compact SÍ debe tener "Publica gratis"').toMatch(/Publica gratis/);
    expect(compactBlock, 'compact SÍ debe linkear a /register?rol=proveedor').toMatch(/\/register\?rol=proveedor/);

    // Full (explorar): sigue SIN <Link> ni "Publica gratis" (política E-2 UX-2).
    expect(fullBlock, 'full NO debe tener <Link>').not.toMatch(/<Link[\s>]/);
    expect(fullBlock, 'full NO debe tener "Publica gratis"').not.toMatch(/Publica gratis/);
});

test('[e-explorar-ctas UX-3] ExampleCTAModal copy "a un proveedor real, regístrate"', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/Servicio/ExampleCTAModal.tsx'),
        'utf-8',
    );
    // Nuevo copy con "a un proveedor".
    expect(source, 'copy nuevo: "a un proveedor real, regístrate"').toMatch(
        /Para \{actionText\} a un proveedor real, regístrate en Pawnecta/,
    );
    // Cero "con un proveedor" viejo.
    expect(source, 'sin "con un proveedor" viejo').not.toMatch(
        /con un proveedor/,
    );
});
