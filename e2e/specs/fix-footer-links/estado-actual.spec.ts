// e2e/specs/fix-footer-links/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Sprint fix-footer-links (2026-11-20) — spec structural que verifica que
// los links `/explorar?categoria=X` del Footer NO referencian slugs obsoletos.
//
// Slugs obsoletos en el fix: `hospedaje`, `domicilio`, `etologia` (verificado
// en prod via MCP supabase-prod-ro — tabla `categorias_servicio` solo tiene
// 9 slugs activos al 2026-11-20).
//
// Rol-agnóstico: fs.readFile sobre el source, cero navegación.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

// Allow-list de slugs activos en `categorias_servicio` prod 2026-11-20.
// Si la categoría se agrega/renombra en prod, actualizar este array.
const SLUGS_ACTIVOS = new Set([
    'adiestramiento',
    'cuidado',
    'fotografia',
    'guarderia',
    'paseos',
    'peluqueria',
    'retratos',
    'traslado',
    'veterinario',
]);

// Slugs explícitamente obsoletos — zero tolerancia en el Footer.
const SLUGS_OBSOLETOS = ['hospedaje', 'domicilio', 'etologia'];

test.describe('[fix-footer-links] Footer sin slugs de categoría obsoletos', () => {
    test('Footer.tsx no referencia hospedaje | domicilio | etologia', async () => {
        const footerPath = path.join(REPO_ROOT, 'components', 'Footer.tsx');
        const source = await readFile(footerPath, 'utf8');

        for (const obsoleto of SLUGS_OBSOLETOS) {
            const pattern = new RegExp(`categoria=${obsoleto}\\b`, 'g');
            const matches = source.match(pattern);
            expect.soft(
                matches,
                `Footer.tsx contiene categoria=${obsoleto} (obsoleto, no existe en categorias_servicio prod 2026-11-20). Matches: ${matches ? matches.length : 0}`,
            ).toBeNull();
        }
    });

    test('Todos los categoria=X del Footer.tsx usan slugs del allow-list activo', async () => {
        const footerPath = path.join(REPO_ROOT, 'components', 'Footer.tsx');
        const source = await readFile(footerPath, 'utf8');

        // Grep todos los `categoria=<slug>` en el source (con & o fin de string).
        const pattern = /categoria=([a-z]+)(?:[&"]|$)/gm;
        const slugsEncontrados = new Set<string>();
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(source)) !== null) {
            slugsEncontrados.add(match[1]);
        }

        // Cada slug encontrado debe estar en SLUGS_ACTIVOS.
        const slugsActivosArr = Array.from(SLUGS_ACTIVOS);
        const slugsEncontradosArr = Array.from(slugsEncontrados);
        for (const slug of slugsEncontradosArr) {
            expect.soft(
                SLUGS_ACTIVOS.has(slug),
                `Footer.tsx referencia categoria=${slug} pero no está en el allow-list activo. Slugs activos: ${slugsActivosArr.join(', ')}. Si la categoría se agregó recientemente, actualizar SLUGS_ACTIVOS en esta spec.`,
            ).toBe(true);
        }

        // Sanity: se encontró al menos 1 slug (spec no está vacía).
        expect(slugsEncontrados.size).toBeGreaterThan(0);
    });
});
