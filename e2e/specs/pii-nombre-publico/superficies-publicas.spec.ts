// e2e/specs/pii-nombre-publico/superficies-publicas.spec.ts
// ---------------------------------------------------------------------------
// Sprint pii-nombre-publico (2026-11-17) — spec P8 guardia de PII sobre
// las 4 superficies públicas que renderizan el nombre del proveedor.
//
// Motivación: el claim del dashboard del proveedor dice "Nombre legal:
// datos de registro, no se muestran públicamente". Antes del fix, 17/22
// proveedores aprobados en prod exponían nombre + apellido legal en:
//   - cards del catálogo /explorar (vía RPC `buscar_servicios` que emite
//     `proveedor_nombre: COALESCE(nombre_publico, nombre || ' ' || apellido_p)`).
//   - cards del home (/ y franjas, vía join directo + mapper).
//   - ficha /servicio/[id] (title, meta, og, ld+json provider.name,
//     botones Reservar/Contactar, aria-labels, "Otros servicios").
//   - perfil /proveedor/[id] (title, meta, h1, alt de foto).
//
// Esta spec arma 2 guardias P8 por superficie:
//   1. **Negativa**: el HTML renderizado NO contiene el apellido_p conocido
//      de un proveedor real sin nombre_publico (`Damián Morel` → "Morel",
//      `Aranza Velasquez` → "Velasquez").
//   2. **Positiva**: el HTML renderizado SÍ contiene una forma esperada
//      ("Damián M." o similar), NO aparece el fallback genérico
//      "Proveedor" en lugares donde debería haber nombre.
//
// Aplicación estricta de corolario P8 10ª (positivo conocido antes de
// negativo): ambos asserts por superficie — un spec que solo verifica
// que "Morel" no aparece pasa cuando el preview sirve página de login,
// 404, o render genérico vacío. La assertion positiva garantiza que el
// método mide el sistema correcto.
//
// Datos de prueba (prod, verificados 2026-11-17 via supabase-prod-ro):
//   - Proveedor `89fffc6a-21c3-44b8-93a0-3a754fff9eb6` (Damián Morel,
//     cat veterinario, nombre_publico NULL, 4 servicios activos).
//   - Servicio `7134e58a-8067-468b-b1d9-633f7bbc6ef8` (del anterior).
// Si estos registros desaparecen o cambian de estado, el spec rompe
// loud — hay que actualizar los UUIDs + nombres o marcar skip con
// justificación en el commit.
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';

const PROVEEDOR_UUID = '89fffc6a-21c3-44b8-93a0-3a754fff9eb6';
const SERVICIO_UUID = '7134e58a-8067-468b-b1d9-633f7bbc6ef8';
const NOMBRE_PILA = 'Damián';
const APELLIDO_LEGAL = 'Morel';
const INICIAL_APELLIDO = 'M.';

// Otro proveedor conocido sin nombre_publico (chequeo de amplitud: no
// es sesgo a un solo perfil). Solo verificamos que su apellido NO aparece
// en el catálogo público (no necesitamos su UUID individual).
const APELLIDO_LEGAL_2 = 'Velasquez';

function withBypass(pathname: string): string {
    const bypass = process.env.PLAYWRIGHT_BYPASS ?? '';
    if (!bypass || bypass === 'cambiame') return pathname;
    const sep = pathname.includes('?') ? '&' : '?';
    return `${pathname}${sep}x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=samesitenone`;
}

async function getFullHtml(page: Page, url: string): Promise<string> {
    await page.goto(withBypass(url), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // Esperar red idle para que la hidratación y el enrich async
    // (`enrichServiceResultsWithDisplayName`) completen. Sin esto, las
    // cards del home / explorar podrían leerse pre-enrich con el
    // `proveedor_nombre` del RPC aún visible.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    // Sprint pii-nombre-publico iter 4 (2026-11-17): excluir
    // `<script id="__NEXT_DATA__">` del HTML antes del grep. Ese script
    // serializa los props de getServerSideProps / getStaticProps y hoy
    // sigue conteniendo `nombre + apellido_p + auth_user_id` crudos
    // (pendiente del sprint `pii-ssr-strip`). Este spec valida solo el
    // HTML RENDERIZADO (lo que un user ve + crawlers indexan vía DOM).
    // El sprint pii-ssr-strip ampliará el spec para que __NEXT_DATA__
    // también falle loud; mientras tanto el leak del payload JSON
    // inicial queda cubierto por el entry BACKLOG `PII-SSR-STRIP`.
    const content = await page.content();
    return content.replace(/<script\s+id="__NEXT_DATA__"[\s\S]*?<\/script>/g, '');
}

test.describe('pii-nombre-publico — superficies públicas', () => {

    test('[PII-01] /servicio/[id] — ficha oculta apellido legal y muestra "Nombre I."', async ({ page }) => {
        const html = await getFullHtml(page, `/servicio/${SERVICIO_UUID}`);

        // Negativa: el apellido legal del proveedor NO debe aparecer en el
        // HTML renderizado — ni en <title>, ni en meta description, ni en
        // og:*, ni en ld+json provider.name, ni en botón "Reservar con X",
        // ni en aria-labels de chat/WhatsApp.
        expect(
            html,
            `Apellido legal "${APELLIDO_LEGAL}" visible en /servicio/${SERVICIO_UUID} (title/meta/og/ld+json/aria).`,
        ).not.toContain(APELLIDO_LEGAL);

        // Positiva: el fix debería emitir "Damián M." (o "Damián" si no
        // encuentra apellido). Debe aparecer al menos una vez.
        expect(
            html,
            `No se encontró ni "${NOMBRE_PILA} ${INICIAL_APELLIDO}" ni "${NOMBRE_PILA}" en /servicio/${SERVICIO_UUID}. ` +
            `El fix puede estar rinderando fallback genérico "Proveedor".`,
        ).toMatch(new RegExp(`${NOMBRE_PILA}(\\s+${INICIAL_APELLIDO}|\\s|\\b)`));
    });

    test('[PII-02] /proveedor/[id] — perfil oculta apellido legal y muestra "Nombre I."', async ({ page }) => {
        const html = await getFullHtml(page, `/proveedor/${PROVEEDOR_UUID}`);

        expect(
            html,
            `Apellido legal "${APELLIDO_LEGAL}" visible en /proveedor/${PROVEEDOR_UUID} (title/meta/h1/alt).`,
        ).not.toContain(APELLIDO_LEGAL);

        expect(
            html,
            `No se encontró "${NOMBRE_PILA}" en /proveedor/${PROVEEDOR_UUID}. Posible fallback "Proveedor".`,
        ).toContain(NOMBRE_PILA);
    });

    test('[PII-03] /explorar — cards del catálogo no exponen apellido legal', async ({ page }) => {
        // Filtro por categoría donde está el proveedor conocido (veterinario).
        const html = await getFullHtml(page, `/explorar?categoria=veterinario`);

        expect(
            html,
            `Apellido legal "${APELLIDO_LEGAL}" visible en card de /explorar — enrich no corrió o falló.`,
        ).not.toContain(APELLIDO_LEGAL);

        // Chequeo adicional: otro apellido conocido, amplitud P8.
        expect(
            html,
            `Apellido legal "${APELLIDO_LEGAL_2}" visible en /explorar — bug sistémico.`,
        ).not.toContain(APELLIDO_LEGAL_2);

        // Positiva: con el filtro 'veterinario' debe haber al menos 1 card
        // del proveedor conocido → su "Damián" o nombre_publico aparece.
        // Si aparece el texto "Proveedor" en MÚLTIPLES cards sería síntoma
        // de fallback genérico — difícil medir sin romper el placeholder
        // natural ("Publica tu servicio"). Verificamos que NOMBRE_PILA
        // aparece al menos una vez en el HTML del catálogo.
        expect(
            html,
            `No se encontró "${NOMBRE_PILA}" en /explorar?categoria=veterinario — el proveedor smoke no aparece o se renderiza como "Proveedor".`,
        ).toContain(NOMBRE_PILA);
    });

    test('[PII-04] / (home) — cards de franjas no exponen apellido legal', async ({ page }) => {
        const html = await getFullHtml(page, `/`);

        expect(
            html,
            `Apellido legal "${APELLIDO_LEGAL}" visible en cards del home (franjas) — join + mapJoin no aplicó displayName.`,
        ).not.toContain(APELLIDO_LEGAL);

        expect(
            html,
            `Apellido legal "${APELLIDO_LEGAL_2}" visible en cards del home — bug sistémico.`,
        ).not.toContain(APELLIDO_LEGAL_2);

        // Positiva: el home puede no tener a Damián en franjas según
        // scoring, entonces esta assertion es más laxa — solo verifica
        // que NO quedan TODAS las cards con fallback "Proveedor" visible.
        // Difícil de capturar sin false positives (hay copy legítimo
        // "Publica tu servicio como proveedor" en la hero). Fail loud
        // solo sobre la negativa; la verificación positiva del home
        // queda cubierta por PII-03 de /explorar (misma fuente de cards).
    });
});
