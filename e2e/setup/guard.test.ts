// e2e/setup/guard.test.ts
// ---------------------------------------------------------------------------
// Test unitario del guard `assertBaseUrlIsNotProd` (PR0 sprint PRODUCTO-1).
// Ampliado en Sweep #1 (2026-08-07) tras auditoría #2 finding B1: agrega
// un caso DENY por cada alias prod conocido + hash-alias regex + shape
// check `-git-<branch>-`. Correr con: `npx tsx e2e/setup/guard.test.ts`.
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

// ── Casos DENY: dominios custom prod ──────────────────────────────────
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

// ── Casos DENY: aliases team-scoped de Vercel de PROD ─────────────────
expectThrows(
    'DENY prod alias root Vercel pawnecta-landing-mvp.vercel.app',
    'https://pawnecta-landing-mvp.vercel.app',
    'apunta a producción (pawnecta-landing-mvp.vercel.app)',
);
expectThrows(
    'DENY prod team-project-alias raíz (Sweep #1 finding B1)',
    'https://pawnecta-landing-mvp-petmatecls-projects.vercel.app',
    'apunta a producción (pawnecta-landing-mvp-petmatecls-projects.vercel.app)',
);
expectThrows(
    'DENY prod git-main-team alias (Sweep #1 finding B1 — trap door principal)',
    'https://pawnecta-landing-mvp-git-main-petmatecls-projects.vercel.app',
    'apunta a producción (pawnecta-landing-mvp-git-main-petmatecls-projects.vercel.app)',
);

// ── Casos DENY: hash-aliases de deployment (Sweep #1 finding B1) ──────
// Vercel emite estos aliases por cada build; algunos apuntan a prod y
// no son distinguibles por hostname → bloqueados por precaución.
expectThrows(
    'DENY hash-alias 9 chars alfanumérico',
    'https://pawnecta-landing-mvp-abc123def-petmatecls-projects.vercel.app',
    'parece ser un hash-alias de deployment Vercel',
);
expectThrows(
    'DENY hash-alias longer hex',
    'https://pawnecta-landing-mvp-a1b2c3d4e5f6-petmatecls-projects.vercel.app',
    'parece ser un hash-alias de deployment Vercel',
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

// ── Caso DENY: hosts sin infijo `-git-<branch>-` ──────────────────────
// Aunque terminen en el sufijo del team, si no tienen el infijo canónico
// pueden ser aliases que Vercel enrute a prod (Sweep #1 finding B1).
// Este URL matchea el regex de hash-alias primero (`preview` es alfanum
// ≥6 chars) — mensaje esperado es el del hash-alias check. Comportamiento
// correcto: cualquier host `pawnecta-landing-mvp-<slug>-petmatecls-...`
// que no sea uno de los enumerados en PROD_HOSTS_BLOCKED entra al bucket
// de hash-aliases y se bloquea igual. Defensa en profundidad.
expectThrows(
    'DENY host con team suffix pero sin -git- (hipotético alias raíz futuro)',
    'https://pawnecta-landing-mvp-preview-petmatecls-projects.vercel.app',
    'parece ser un hash-alias de deployment Vercel',
);

// ── Casos PASS: previews de rama del team (SÍ deben aceptar) ──────────
expectPasses(
    'PASS preview staging (git-staging)',
    'https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app',
);
expectPasses(
    'PASS preview de rama tren N15 (histórico)',
    'https://pawnecta-landing-mvp-git-next15-petmatecls-projects.vercel.app',
);
expectPasses(
    'PASS preview de rama producto-1 (sprint)',
    'https://pawnecta-landing-mvp-git-producto-1-petmatecls-projects.vercel.app',
);
expectPasses(
    'PASS preview de rama arbitraria futura',
    'https://pawnecta-landing-mvp-git-feature-xyz-petmatecls-projects.vercel.app',
);
expectPasses(
    'PASS preview de rama sweep-1 (rama actual del fix)',
    'https://pawnecta-landing-mvp-git-sweep-1-petmatecls-projects.vercel.app',
);
expectPasses(
    'PASS preview de rama prelaunch-1 (histórico)',
    'https://pawnecta-landing-mvp-git-prelaunch-1-petmatecls-projects.vercel.app',
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
