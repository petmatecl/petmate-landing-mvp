// e2e/setup/guard.ts
// ---------------------------------------------------------------------------
// Guarda anti-prod para Playwright — patrón DENY-LIST (PR0 sprint PRODUCTO-1).
//
// Actualizado en Sweep #1 (2026-08-07) tras auditoría #2 finding B1: la
// versión previa dejaba pasar los aliases team-scoped que Vercel genera
// automáticamente para el branch main y para el project-alias raíz del team.
// Como todos ellos terminan en `-petmatecls-projects.vercel.app` (mismo
// sufijo que los previews de rama), la validación de sufijo pura les
// daba pass. Un dev que pegara `pawnecta-landing-mvp-git-main-...` del
// dashboard Vercel a PLAYWRIGHT_BASE_URL corría la suite contra prod
// sin fricción — trap door defensiva anulada. Fix: (a) enumerar
// explícitamente los aliases prod conocidos en PROD_HOSTS_BLOCKED,
// (b) bloquear cualquier hash-alias con regex, (c) exigir el infijo
// `-git-<branch>-` en el subdominio (que es lo que caracteriza a un
// preview de rama vs un alias de deployment de prod).
//
// Aceptado (pass):
//   - Cualquier `*-git-<branch>-petmatecls-projects.vercel.app` con
//     <branch> DISTINTO de `main` (main branch alias es prod y va en la
//     deny-list explícita).
//
// Rechazado (throw):
//   - `www.pawnecta.com` / `pawnecta.com` — dominio custom prod.
//   - `pawnecta-landing-mvp.vercel.app` — alias root prod de Vercel (sin team).
//   - `pawnecta-landing-mvp-petmatecls-projects.vercel.app` — team-scoped
//     project alias raíz (Vercel lo apunta al deployment prod actual).
//   - `pawnecta-landing-mvp-git-main-petmatecls-projects.vercel.app` —
//     branch alias `main` (que es la rama de producción).
//   - `pawnecta-landing-mvp-<hash>-petmatecls-projects.vercel.app` —
//     hash-alias de un deployment específico. Vercel los emite por cada
//     build y algunos apuntan a prod. Bloqueados por regex — el patrón
//     canónico para probar un preview es SIEMPRE el `-git-<branch>-`
//     alias, no el hash.
//   - Cualquier host sin el infijo `-git-<branch>-` en el subdominio.
//   - Cualquier host que no termine en el sufijo del team.
//   - URLs mal formadas.
// ---------------------------------------------------------------------------

const PROD_HOSTS_BLOCKED = [
    // Dominios custom.
    'www.pawnecta.com',
    'pawnecta.com',
    // Alias root del proyecto sin team scope.
    'pawnecta-landing-mvp.vercel.app',
    // Team-scoped project alias raíz — Vercel lo enruta al deployment
    // prod actual del proyecto.
    'pawnecta-landing-mvp-petmatecls-projects.vercel.app',
    // Alias del branch main (= producción).
    'pawnecta-landing-mvp-git-main-petmatecls-projects.vercel.app',
];

const TEAM_PREVIEW_SUFFIX = '-petmatecls-projects.vercel.app';

// Los hash-aliases de deployment Vercel siguen el patrón
// `<project>-<hash>-<team>.vercel.app` donde <hash> es alfanumérico corto
// (típicamente 9 chars). Como el mismo shape lo usan tanto prod-deploys
// como preview-deploys, no podemos distinguirlos por regex sin API —
// aproximación conservadora: bloquear todos y forzar el uso del alias
// `-git-<branch>-` canónico para probar un preview.
const PROD_HASH_ALIAS_REGEX = /^pawnecta-landing-mvp-[a-z0-9]{6,}-petmatecls-projects\.vercel\.app$/;

/**
 * Verifica que la URL NO apunte a producción. Throwea con mensaje claro si
 * el host cae en la deny-list o si no matchea el patrón esperado.
 *
 * Exportada para reuse desde `playwright.config.ts` (guarda al arranque) y
 * desde el test unitario (`guard.test.ts`).
 */
export function assertBaseUrlIsNotProd(url: string): void {
    let host: string;
    try {
        host = new URL(url).hostname;
    } catch {
        throw new Error(`[e2e/guard] baseURL inválida: "${url}"`);
    }

    // 1. Deny-list explícita de hosts prod conocidos.
    if (PROD_HOSTS_BLOCKED.includes(host)) {
        throw new Error(
            `[e2e/guard] baseURL apunta a producción (${host}). ` +
            `Los tests e2e SOLO corren contra staging o previews de rama. ` +
            `Ajusta PLAYWRIGHT_BASE_URL a una URL con patrón ` +
            `"pawnecta-landing-mvp-git-<branch>-petmatecls-projects.vercel.app" ` +
            `(staging o preview de rama, distinto de main).`,
        );
    }

    // 2. Deny hash-aliases de deployment (patrón conservador —
    //    forzamos el uso del alias `-git-<branch>-` para previews).
    if (PROD_HASH_ALIAS_REGEX.test(host)) {
        throw new Error(
            `[e2e/guard] baseURL "${host}" parece ser un hash-alias de ` +
            `deployment Vercel (patrón <project>-<hash>-<team>.vercel.app). ` +
            `Estos aliases pueden apuntar a prod y no son distinguibles ` +
            `por hostname. Usa el alias canónico ` +
            `"pawnecta-landing-mvp-git-<branch>-petmatecls-projects.vercel.app" ` +
            `de la rama que quieres probar.`,
        );
    }

    // 3. Whitelist de forma: solo aceptamos previews del team Vercel
    //    (`<project>-git-<branch>-<team>.vercel.app`). Cualquier otro host
    //    externo (aunque no esté en la deny-list literal) se rechaza por
    //    precaución.
    if (!host.endsWith(TEAM_PREVIEW_SUFFIX)) {
        throw new Error(
            `[e2e/guard] baseURL "${host}" no matchea el patrón de preview ` +
            `del team Vercel (${TEAM_PREVIEW_SUFFIX}). ` +
            `Los tests e2e solo aceptan hosts del team petmatecls-projects. ` +
            `Ajusta PLAYWRIGHT_BASE_URL.`,
        );
    }

    // 4. Exigir el infijo `-git-<branch>-` en el subdominio, que es lo
    //    que distingue un preview de rama de un alias de deployment o
    //    del alias raíz del team. Esto captura casos que la deny-list
    //    explícita no enumeró (aliases nuevos que Vercel podría agregar
    //    en el futuro).
    if (!host.includes('-git-')) {
        throw new Error(
            `[e2e/guard] baseURL "${host}" no matchea el patrón de preview ` +
            `de RAMA (requiere infijo "-git-<branch>-" en el subdominio). ` +
            `Los aliases sin ese infijo pueden apuntar a producción — usa ` +
            `el URL de rama del dashboard Vercel, no el hash-alias ni el ` +
            `team-project-alias raíz.`,
        );
    }
}
