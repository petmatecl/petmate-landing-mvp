// e2e/setup/guard.ts
// ---------------------------------------------------------------------------
// Guarda anti-prod para Playwright — patrón DENY-LIST (PR0 sprint PRODUCTO-1).
//
// Reemplaza la vieja `assertBaseUrlIsStaging` que era whitelist de hosts
// (`git-staging`, `staging`, temporalmente `git-next15`). El patrón viejo
// requería mantenimiento cada vez que un tren nuevo necesitaba probar contra
// su preview de rama; también dependía de que el nombre de la rama
// contuviera "staging" para pasar. Deny-list invertido: negar explícitamente
// los hosts de PROD y aceptar cualquier otro *.vercel.app del team
// petmatecls. Cero mantenimiento por-rama; misma protección estricta.
//
// Aceptado (pass):
//   - Cualquier `*-petmatecls-projects.vercel.app` que sea preview (contiene
//     `-git-<rama>-` en el subdominio, patrón determinístico de Vercel).
//
// Rechazado (throw):
//   - `www.pawnecta.com` / `pawnecta.com` — dominio custom prod.
//   - `pawnecta-landing-mvp.vercel.app` — alias root prod de Vercel.
//   - Cualquier host que no matchee el patrón de preview del team.
//   - URLs mal formadas.
// ---------------------------------------------------------------------------

const PROD_HOSTS_BLOCKED = [
    'www.pawnecta.com',
    'pawnecta.com',
    'pawnecta-landing-mvp.vercel.app',
];

const TEAM_PREVIEW_SUFFIX = '-petmatecls-projects.vercel.app';

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

    // 1. Deny-list explícita de hosts prod.
    if (PROD_HOSTS_BLOCKED.includes(host)) {
        throw new Error(
            `[e2e/guard] baseURL apunta a producción (${host}). ` +
            `Los tests e2e SOLO corren contra staging o previews de rama. ` +
            `Ajusta PLAYWRIGHT_BASE_URL a una URL con sufijo ` +
            `"${TEAM_PREVIEW_SUFFIX}" (staging o preview de rama).`,
        );
    }

    // 2. Whitelist de forma: solo aceptamos previews/staging del team Vercel
    //    (patrón determinístico `<project>-git-<branch>-<team>.vercel.app` o
    //    `<project>-<team>.vercel.app` de staging). Cualquier otro host
    //    externo (aunque no esté en la deny-list literal) se rechaza por
    //    precaución — no queremos correr contra un dominio arbitrario.
    if (!host.endsWith(TEAM_PREVIEW_SUFFIX)) {
        throw new Error(
            `[e2e/guard] baseURL "${host}" no matchea el patrón de preview ` +
            `del team Vercel (${TEAM_PREVIEW_SUFFIX}). ` +
            `Los tests e2e solo aceptan hosts del team petmatecls-projects. ` +
            `Ajusta PLAYWRIGHT_BASE_URL.`,
        );
    }
}
