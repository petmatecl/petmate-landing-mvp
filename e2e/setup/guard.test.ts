// e2e/setup/guard.test.ts
// ---------------------------------------------------------------------------
// Test unitario del guard `assertBaseUrlIsNotProd` (PR0 sprint PRODUCTO-1).
// Correr con: `npx tsx e2e/setup/guard.test.ts`.
//
// Convención de la casa: no hay framework de tests unitarios instalado;
// usamos scripts `tsx` con asserts simples (mismo patrón que
// lib/formatFecha.test.ts, lib/nochesAgenda.test.ts, etc.). El test corre
// standalone, imprime pass/fail por caso, exit 1 si algún caso falla.
// ---------------------------------------------------------------------------
import { assertBaseUrlIsNotProd } from './guard';

let pass = 0;
let fail = 0;

function expectThrows(label: string, url: string, expectedMessageSubstring: string): void {
    try {
        assertBaseUrlIsNotProd(url);
        console.log(`✗ ${label} — esperaba throw pero pasó silenciosamente`);
        fail++;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes(expectedMessageSubstring)) {
            console.log(`✓ ${label} — throw con mensaje esperado`);
            pass++;
        } else {
            console.log(`✗ ${label} — throw pero mensaje no matchea. Esperado incluir "${expectedMessageSubstring}", got: ${msg}`);
            fail++;
        }
    }
}

function expectPasses(label: string, url: string): void {
    try {
        assertBaseUrlIsNotProd(url);
        console.log(`✓ ${label} — pasa sin throw`);
        pass++;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`✗ ${label} — throw inesperado: ${msg}`);
        fail++;
    }
}

// ── Casos DENY: hosts prod deben rechazar ─────────────────────────────
expectThrows(
    'DENY prod custom www.pawnecta.com',
    'https://www.pawnecta.com',
    'apunta a producción (www.pawnecta.com)',
);
expectThrows(
    'DENY prod custom pawnecta.com (sin www)',
    'https://pawnecta.com/explorar',
    'apunta a producción (pawnecta.com)',
);
expectThrows(
    'DENY prod alias root Vercel pawnecta-landing-mvp.vercel.app',
    'https://pawnecta-landing-mvp.vercel.app',
    'apunta a producción (pawnecta-landing-mvp.vercel.app)',
);

// ── Casos PASS: previews del team deben aceptar ───────────────────────
expectPasses(
    'PASS preview staging',
    'https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app',
);
expectPasses(
    'PASS preview de rama tren N15 (histórico)',
    'https://pawnecta-landing-mvp-git-next15-petmatecls-projects.vercel.app',
);
expectPasses(
    'PASS preview de rama producto-1 (sprint actual)',
    'https://pawnecta-landing-mvp-git-producto-1-petmatecls-projects.vercel.app',
);
expectPasses(
    'PASS preview de rama arbitraria futura',
    'https://pawnecta-landing-mvp-git-feature-xyz-petmatecls-projects.vercel.app',
);

// ── Casos DENY: hosts externos no permitidos ──────────────────────────
expectThrows(
    'DENY host externo cualquiera (google.com)',
    'https://google.com',
    'no matchea el patrón de preview del team Vercel',
);
expectThrows(
    'DENY preview de OTRO team Vercel (no petmatecls)',
    'https://pawnecta-landing-mvp-git-x-otro-team.vercel.app',
    'no matchea el patrón de preview del team Vercel',
);
expectThrows(
    'DENY localhost',
    'http://localhost:3000',
    'no matchea el patrón de preview del team Vercel',
);

// ── Caso DENY: URL malformada ─────────────────────────────────────────
expectThrows(
    'DENY URL inválida',
    'no-es-una-url',
    'baseURL inválida',
);

// ── Resumen ───────────────────────────────────────────────────────────
console.log('');
console.log(`─── ${pass} pass · ${fail} fail ───`);
if (fail > 0) {
    process.exit(1);
}
