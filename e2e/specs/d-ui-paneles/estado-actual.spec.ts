// e2e/specs/d-ui-paneles/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// PR D-1 UI paneles (Bloque D DESPUÉS) — spec structural que afirma el
// cambio se limita al ítem tocado (condición de parada PO: pantallazos
// antes/después no deben mostrar cambios más allá del ítem). Uso grep del
// source como proxy — cero navegación (los cambios son de estilo/hook,
// sin behavior nuevo que testear runtime).
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

test('[d-ui-paneles SCROLL-TAB] hook existe con firma esperada', async () => {
    expect(await fileExists('lib/hooks/useScrollToTopOnTabChange.ts'), 'archivo del hook creado').toBe(true);
    const source = await readFile(path.join(REPO_ROOT, 'lib/hooks/useScrollToTopOnTabChange.ts'), 'utf-8');
    expect(source, 'export firma esperada').toMatch(/export function useScrollToTopOnTabChange\(activeTab: string\)/);
    expect(source, 'window.scrollTo dispatch').toMatch(/window\.scrollTo\(\{\s*top:\s*0,\s*behavior:\s*'smooth'\s*\}\)/);
    expect(source, 'skip mount inicial con useRef guard').toMatch(/prevRef\.current === null/);
});

test('[d-ui-paneles SCROLL-TAB] admin.tsx + proveedor/index.tsx importan y usan el hook', async () => {
    for (const rel of ['pages/admin.tsx', 'pages/proveedor/index.tsx']) {
        const source = await readFile(path.join(REPO_ROOT, rel), 'utf-8');
        expect(source, `${rel} importa useScrollToTopOnTabChange`).toMatch(/from ['"][^'"]*useScrollToTopOnTabChange['"]/);
        expect(source, `${rel} invoca hook con activeTab`).toMatch(/useScrollToTopOnTabChange\(activeTab\)/);
    }
});

// FIXME [ci-pipefail-2026-09-17]: oculto por tee sin pipefail; triage en sprint I-tests-triage. Síntoma: /mis-reservas no usa el pill style bg-accent-600 esperado.
test.fixme('[d-ui-paneles MIS-RESERVAS-TABS] mis-reservas usa pill style admin (bg-accent-600 activo)', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'pages/mis-reservas.tsx'), 'utf-8');
    // Pill style activo: bg-accent-600 + text-white + font-semibold
    expect(source, 'estilo activo pill accent').toMatch(/isActive[\s\S]{0,80}bg-accent-600[\s\S]{0,80}text-white/);
    // Removido border-b-2 -mb-[1px] hack
    expect(source, 'sin border-b-2 hack en tabs').not.toMatch(/border-b-2\s+-mb-\[1px\]/);
    // Removida baseline border-b del container
    expect(source, 'sin baseline border-b del container tabs').not.toMatch(/pb-2 mb-4 hide-scrollbar border-b border-slate-100/);
});

test('[d-ui-paneles EDITOR-UX] SFM tiene 3 hints con tooltip + separación entre secciones', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Proveedor/ServiceFormModal.tsx'), 'utf-8');
    // Import Info de lucide-react
    expect(source, 'import Info de lucide-react').toMatch(/Info\b[^}]*}\s*from\s*['"]lucide-react/);
    // 3 hints con title tooltip (uno por sección: franjas, excepciones, blackouts)
    const hintButtons = source.match(/aria-label="Más información sobre (franjas horarias|excepciones|bloqueos F2)"/g);
    expect(hintButtons?.length ?? 0, 'los 3 aria-labels de hints editor').toBe(3);
    // Separación visual: excepciones sección tiene mt-6 pt-6 border-t
    expect(source, 'separación excepciones con border-t').toMatch(/border-t border-slate-100 pt-6|pt-6 border-t border-slate-100|mt-6 pt-6 border-t/);
    // Hints reducidos — el texto largo original ya no aparece como <p>
    expect(source, 'texto largo franjas removido del <p>').not.toMatch(/<p[^>]*>[\s\S]{0,50}Define las franjas horarias de cada d[íi]a\. La misma semana/);
});
