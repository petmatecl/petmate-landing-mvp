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
// Iter 6 (2026-11-17): UUIDs resueltos DINÁMICAMENTE en beforeAll vía la
// REST API de Supabase (anon). Antes estaban hardcodeados a prod
// (`Damián Morel`), pero el preview Vercel del PR apunta a Supabase
// STAGING por defecto — los UUIDs de prod no existen en staging →
// getServerSideProps devuelve notFound → spec fallaba falsamente. El
// beforeAll consulta `proveedores_publicos` filtrando por
// `nombre_publico IS NULL + apellido_p NOT NULL + nombre NOT NULL`
// y toma el primer proveedor + servicio activo. Si el entorno no tiene
// ningún proveedor así, los tests se skipean con mensaje explícito.
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';

interface SmokeTargets {
    proveedorUuid: string;
    servicioUuid: string;
    nombrePila: string;
    apellidoLegal: string;
    inicialApellido: string;
    categoriaSlug: string;
}

let targets: SmokeTargets | null = null;

// APELLIDO_LEGAL_2 opcional — chequeo de amplitud: segundo proveedor
// sin nombre_publico, solo verifica que su apellido NO aparece en
// catálogo (no necesita UUID individual). Si el entorno tiene solo 1
// proveedor sin nombre_publico, salteamos el chequeo de amplitud.
let apellidoLegal2: string | null = null;

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
    // Sprint PII-SSR-STRIP (2026-11-18): el spec AHORA valida el HTML
    // COMPLETO, incluyendo `<script id="__NEXT_DATA__">`. Antes (iter 4
    // de pii-nombre-publico) excluíamos ese script porque el payload
    // SSR serializado seguía con `nombre`/`apellido_p` crudos — deuda
    // consolidada en este sprint. Si el apellido reaparece en el
    // payload JSON inicial (reintroducción de un spread crudo en gSSP/
    // gSP), el test falla loud. Único trade-off: falso positivo si el
    // apellido aparece orgánicamente en el texto público (reseña, bio,
    // título de servicio). El beforeAll acota el target con filtros
    // suficientemente estrictos (apellido ≥ 3 chars, proveedor sin
    // nombre_publico) para hacer el falso positivo improbable; en ese
    // raro caso el fix es cambiar el candidato del beforeAll.
    return await page.content();
}

test.describe('pii-nombre-publico — superficies públicas', () => {

    test.beforeAll(async ({ request }) => {
        // Resolver dinámicamente: proveedor sin nombre_publico + 1 servicio
        // activo. Funciona contra cualquier entorno (prod / staging / dev).
        const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.E2E_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.E2E_SUPABASE_ANON_KEY;
        if (!supaUrl || !anonKey) {
            test.skip(true, '[pii-nombre-publico] Sin NEXT_PUBLIC_SUPABASE_URL o ANON_KEY, se skipea el spec.');
            return;
        }
        const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

        // Buscar 2 proveedores (uno principal + uno amplitud) sin
        // nombre_publico, con nombre + apellido_p ≥ 3 chars (apellido
        // trivial-free), estado=aprobado, orden por created_at desc para
        // tomar los más recientes = probable más estables.
        const provResp = await request.get(
            `${supaUrl}/rest/v1/proveedores_publicos` +
            `?select=id,nombre,apellido_p,nombre_publico` +
            `&nombre_publico=is.null` +
            `&apellido_p=not.is.null` +
            `&nombre=not.is.null` +
            `&order=created_at.desc&limit=5`,
            { headers },
        );
        if (!provResp.ok()) {
            test.skip(true, `[pii-nombre-publico] fetch proveedores_publicos fail (${provResp.status()}) — skip spec.`);
            return;
        }
        const provs = (await provResp.json()) as Array<{ id: string; nombre: string; apellido_p: string }>;
        const valid = provs.filter(p => (p.apellido_p || '').trim().length >= 3 && (p.nombre || '').trim().length >= 2);
        if (valid.length === 0) {
            test.skip(true, '[pii-nombre-publico] No hay proveedores con nombre+apellido sin nombre_publico en este entorno — skip.');
            return;
        }

        // Para cada proveedor candidato, buscar 1 servicio activo y
        // elegir el primero que matchee.
        for (const p of valid) {
            const svcResp = await request.get(
                `${supaUrl}/rest/v1/servicios_publicados` +
                `?select=id,categoria_id,categorias_servicio(slug)` +
                `&proveedor_id=eq.${p.id}&activo=eq.true&limit=1`,
                { headers },
            );
            if (!svcResp.ok()) continue;
            const svcs = (await svcResp.json()) as Array<{ id: string; categorias_servicio?: { slug: string } }>;
            if (svcs.length === 0) continue;
            const svc = svcs[0];
            const nombrePila = p.nombre.trim().split(/\s+/)[0];
            targets = {
                proveedorUuid: p.id,
                servicioUuid: svc.id,
                nombrePila,
                apellidoLegal: p.apellido_p.trim(),
                inicialApellido: p.apellido_p.trim().charAt(0).toUpperCase() + '.',
                categoriaSlug: svc.categorias_servicio?.slug ?? 'cuidado',
            };
            break;
        }

        if (!targets) {
            test.skip(true, '[pii-nombre-publico] Ningún proveedor sin nombre_publico tiene servicio activo — skip.');
            return;
        }

        // Amplitud: segundo apellido conocido (del segundo candidato).
        const secondary = valid.find(p => p.id !== targets!.proveedorUuid);
        apellidoLegal2 = secondary?.apellido_p.trim() ?? null;

        // Log del target elegido — queda en el log del CI para auditar
        // sobre qué proveedor se verificó. Cero log del nombre completo
        // en producción del spec (solo durante ejecución del CI).
        // eslint-disable-next-line no-console
        console.log(`[pii-nombre-publico] target: ${targets.nombrePila} ${targets.inicialApellido} ` +
            `(prov=${targets.proveedorUuid.slice(0, 8)}… svc=${targets.servicioUuid.slice(0, 8)}… cat=${targets.categoriaSlug})` +
            (apellidoLegal2 ? ` + amplitud "${apellidoLegal2.charAt(0)}…"` : ''));
    });

    test('[PII-01] /servicio/[id] — ficha oculta apellido legal y muestra "Nombre I."', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no resueltos');
        const t = targets!;
        const html = await getFullHtml(page, `/servicio/${t.servicioUuid}`);

        expect(
            html,
            `Apellido legal "${t.apellidoLegal}" visible en /servicio/${t.servicioUuid} (title/meta/og/ld+json/aria).`,
        ).not.toContain(t.apellidoLegal);

        expect(
            html,
            `No se encontró "${t.nombrePila}" en /servicio/${t.servicioUuid}. El fix puede estar rinderando fallback genérico "Proveedor".`,
        ).toContain(t.nombrePila);
    });

    test('[PII-02] /proveedor/[id] — perfil oculta apellido legal y muestra "Nombre I."', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no resueltos');
        const t = targets!;
        const html = await getFullHtml(page, `/proveedor/${t.proveedorUuid}`);

        expect(
            html,
            `Apellido legal "${t.apellidoLegal}" visible en /proveedor/${t.proveedorUuid} (title/meta/h1/alt).`,
        ).not.toContain(t.apellidoLegal);

        expect(
            html,
            `No se encontró "${t.nombrePila}" en /proveedor/${t.proveedorUuid}. Posible fallback "Proveedor".`,
        ).toContain(t.nombrePila);
    });

    test('[PII-03] /explorar — cards del catálogo no exponen apellido legal', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no resueltos');
        const t = targets!;
        const html = await getFullHtml(page, `/explorar?categoria=${t.categoriaSlug}`);

        expect(
            html,
            `Apellido legal "${t.apellidoLegal}" visible en card de /explorar?categoria=${t.categoriaSlug} — enrich no corrió o falló.`,
        ).not.toContain(t.apellidoLegal);

        if (apellidoLegal2) {
            expect(
                html,
                `Apellido legal "${apellidoLegal2}" visible en /explorar — bug sistémico.`,
            ).not.toContain(apellidoLegal2);
        }

        expect(
            html,
            `No se encontró "${t.nombrePila}" en /explorar?categoria=${t.categoriaSlug} — el proveedor no aparece o se renderiza como "Proveedor".`,
        ).toContain(t.nombrePila);
    });

    test('[PII-04] / (home) — cards de franjas no exponen apellido legal', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no resueltos');
        const t = targets!;
        const html = await getFullHtml(page, `/`);

        expect(
            html,
            `Apellido legal "${t.apellidoLegal}" visible en cards del home (franjas) — join + mapJoin no aplicó displayName.`,
        ).not.toContain(t.apellidoLegal);

        if (apellidoLegal2) {
            expect(
                html,
                `Apellido legal "${apellidoLegal2}" visible en cards del home — bug sistémico.`,
            ).not.toContain(apellidoLegal2);
        }
        // Positiva: el home puede no tener al proveedor en franjas según
        // scoring. La verificación positiva del home queda cubierta por
        // PII-03 de /explorar (misma fuente de cards).
    });
});
