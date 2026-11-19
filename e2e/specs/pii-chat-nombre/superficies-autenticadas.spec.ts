// e2e/specs/pii-chat-nombre/superficies-autenticadas.spec.ts
// ---------------------------------------------------------------------------
// Sprint pii-chat-nombre (2026-11-19) — spec P8 guardia de PII sobre las
// superficies AUTENTICADAS (con sesión) que exponían apellido completo.
//
// Complementa `pii-nombre-publico/superficies-publicas.spec.ts` (superficies
// anónimas). Las superficies cubiertas acá requieren login:
//   1. /mensajes?id=<conv> como TUTOR — lista + header del hilo.
//   2. /favoritos tab Proveedores como TUTOR — card del proveedor favorito.
//   3. /mensajes?id=<conv> como PROVEEDOR — el otherId es un tutor que
//      técnicamente está en `proveedores` con `estado='aprobado'`
//      (patrón real de prod: tutoras reales se registraron allí; ver
//      conv prod 42440eaf con anllely letelier). El helper resuelve
//      por la rama proveedores_publicos y pre-fix emitía apellido crudo.
//
// Hallazgo original (smoke PO 2026-11-19 post-#119): tutor logueado ve
// apellido completo del proveedor en la lista + header del chat.
// Hallazgo adicional confirmado empíricamente contra prod-ro: el leak es
// EL MISMO vector en ambas direcciones (tutor→prov + prov→tutor-en-
// proveedores), porque el único path de datos es `getParticipantProfile`
// (rama 1 proveedores_publicos). La vista tiene `security_invoker=false`
// → bypassa RLS → cualquier authenticated ve apellidos.
//
// El caso "tutor que solo está en usuarios_buscadores" (ej. Allison Mendel
// Ruminot en conv bf28a69a) NO entra como test: la RLS `Owner full access`
// de `usuarios_buscadores` filtra la fila al proveedor que consulta por
// cualquier auth_user_id ≠ el suyo propio → `getParticipantProfile` cae
// en rama 2, obtiene `[]`, retorna null → render muestra fallback
// "Participante". No hay vector observable que pueda fallar pre-fix. El
// helper cubre ese caso por defense-in-depth (precompute display_name
// también en la rama usuarios_buscadores), pero sin assertion posible.
//
// Cada test arma 2 guardias P8 (positivo conocido 10ª + negativo):
//   - **Negativa**: el HTML renderizado NO contiene el apellido completo.
//   - **Positiva**: el HTML renderizado SÍ contiene el nombre de pila.
// Sin positiva, el spec pasa cuando el preview sirve login/404/render con
// fallback genérico "Participante".
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';
import { getSupabaseAdmin } from '../../fixtures/supabaseAdmin';

interface SmokeTargets {
    tutorAuthId: string;
    aldoProvAuthId: string;
    provAId: string;
    provAAuthId: string;
    provBId: string;
    provBAuthId: string;
    conv1Id: string;   // tutor Camila ↔ provA (AUTH-PII-01)
    favId: string;     // favorito provA del tutor (AUTH-PII-02)
    conv2Id: string;   // provB (tutor-semantico, en proveedores) ↔ aldo prov (AUTH-PII-03)
    nombrePilaA: string;
    apellidoLegalA: string;
    nombrePilaB: string;
    apellidoLegalB: string;
}

let targets: SmokeTargets | null = null;

function withBypass(pathname: string): string {
    const bypass = process.env.PLAYWRIGHT_BYPASS ?? '';
    if (!bypass || bypass === 'cambiame') return pathname;
    const sep = pathname.includes('?') ? '&' : '?';
    return `${pathname}${sep}x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=samesitenone`;
}

async function getFullHtml(page: Page, url: string): Promise<string> {
    await page.goto(withBypass(url), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // Esperar network idle para que el fetch client-side de conversaciones
    // + perfiles (`getParticipantProfile`) hidrate la UI del chat antes
    // del content().
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    return await page.content();
}

test.describe('pii-chat-nombre — superficies autenticadas', () => {

    test.beforeAll(async () => {
        const admin = await getSupabaseAdmin();

        // 1) Resolver auth_user_id del tutor E2E (Camila) + proveedor E2E (Aldo).
        const tutorEmail = process.env.E2E_STAGING_TUTOR_EMAIL;
        const aldoEmail = process.env.E2E_STAGING_EMAIL;
        if (!tutorEmail || !aldoEmail) {
            test.skip(true, '[pii-chat-nombre] E2E_STAGING_TUTOR_EMAIL o E2E_STAGING_EMAIL no seteados — skip.');
            return;
        }
        const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
        if (listErr) {
            test.skip(true, `[pii-chat-nombre] listUsers falló: ${listErr.message} — skip.`);
            return;
        }
        const tutorUser = usersPage.users.find(u => u.email?.toLowerCase() === tutorEmail.toLowerCase());
        const aldoUser = usersPage.users.find(u => u.email?.toLowerCase() === aldoEmail.toLowerCase());
        if (!tutorUser) {
            test.skip(true, `[pii-chat-nombre] tutor ${tutorEmail} no encontrado — skip.`);
            return;
        }
        if (!aldoUser) {
            test.skip(true, `[pii-chat-nombre] proveedor Aldo ${aldoEmail} no encontrado — skip.`);
            return;
        }
        const tutorAuthId = tutorUser.id;
        const aldoProvAuthId = aldoUser.id;

        // 2) Resolver 2 proveedores candidatos (A + B) distintos de Aldo y Camila:
        //    - sin nombre_publico
        //    - apellido_p ≥3 chars
        //    - nombre ≥2 chars
        //    - estado=aprobado
        //    A → "proveedor real" visible al tutor (AUTH-PII-01 + 02).
        //    B → "tutor semánticamente pero en proveedores" visible al proveedor Aldo
        //        (AUTH-PII-03, reproduce patrón prod 42440eaf anllely letelier).
        const { data: provs, error: provErr } = await admin
            .from('proveedores')
            .select('id, auth_user_id, nombre, apellido_p, nombre_publico, estado')
            .is('nombre_publico', null)
            .not('apellido_p', 'is', null)
            .not('nombre', 'is', null)
            .eq('estado', 'aprobado')
            .order('created_at', { ascending: false })
            .limit(20);
        if (provErr) {
            test.skip(true, `[pii-chat-nombre] fetch proveedores falló: ${provErr.message} — skip.`);
            return;
        }
        const candidatos = (provs ?? []).filter(p =>
            (p.apellido_p || '').trim().length >= 3 &&
            (p.nombre || '').trim().length >= 2 &&
            p.auth_user_id &&
            p.auth_user_id !== tutorAuthId &&
            p.auth_user_id !== aldoProvAuthId,
        );
        if (candidatos.length < 2) {
            test.skip(true, `[pii-chat-nombre] Se necesitan ≥2 candidatos; encontrados ${candidatos.length} — skip.`);
            return;
        }
        const provA = candidatos[0];
        const provB = candidatos[1];

        const nombrePilaA = provA.nombre.trim().split(/\s+/)[0];
        const apellidoLegalA = provA.apellido_p.trim();
        const nombrePilaB = provB.nombre.trim().split(/\s+/)[0];
        const apellidoLegalB = provB.apellido_p.trim();

        // 3) Limpiar residuo previo (por si una corrida anterior dejó convs sin borrar).
        //    conv1: tutor Camila (client) ↔ provA (sitter). Patrón flow "Contactar" normal.
        await admin.from('conversations')
            .delete()
            .eq('client_id', tutorAuthId)
            .eq('sitter_id', provA.auth_user_id);
        //    conv2: provB (client, tutor-registrado-en-proveedores) ↔ Aldo (sitter, prov logueado).
        //    Reproduce patrón de prod 42440eaf: anllely contactó, Aldo es el proveedor logueado.
        await admin.from('conversations')
            .delete()
            .eq('client_id', provB.auth_user_id)
            .eq('sitter_id', aldoProvAuthId);

        // 4) Crear conv1 fresh.
        const { data: conv1, error: conv1Err } = await admin.from('conversations')
            .insert({
                client_id: tutorAuthId,
                sitter_id: provA.auth_user_id,
                proveedor_auth_id: provA.auth_user_id,
            })
            .select('id')
            .single();
        if (conv1Err || !conv1) {
            test.skip(true, `[pii-chat-nombre] INSERT conv1 falló: ${conv1Err?.message ?? 'empty'} — skip.`);
            return;
        }

        // 5) Crear conv2 fresh (provB como client, Aldo como sitter).
        const { data: conv2, error: conv2Err } = await admin.from('conversations')
            .insert({
                client_id: provB.auth_user_id,
                sitter_id: aldoProvAuthId,
                proveedor_auth_id: aldoProvAuthId,
            })
            .select('id')
            .single();
        if (conv2Err || !conv2) {
            await admin.from('conversations').delete().eq('id', conv1.id);
            test.skip(true, `[pii-chat-nombre] INSERT conv2 falló: ${conv2Err?.message ?? 'empty'} — skip.`);
            return;
        }

        // 6) Favorito tutor → provA (AUTH-PII-02).
        await admin.from('favoritos')
            .delete()
            .eq('user_id', tutorAuthId)
            .eq('entidad_id', provA.id)
            .eq('entidad_tipo', 'proveedor');
        const { data: fav, error: favErr } = await admin.from('favoritos')
            .insert({
                user_id: tutorAuthId,
                entidad_id: provA.id,
                entidad_tipo: 'proveedor',
            })
            .select('id')
            .single();
        if (favErr || !fav) {
            await admin.from('conversations').delete().eq('id', conv1.id);
            await admin.from('conversations').delete().eq('id', conv2.id);
            test.skip(true, `[pii-chat-nombre] INSERT favorito falló: ${favErr?.message ?? 'empty'} — skip.`);
            return;
        }

        targets = {
            tutorAuthId,
            aldoProvAuthId,
            provAId: provA.id,
            provAAuthId: provA.auth_user_id,
            provBId: provB.id,
            provBAuthId: provB.auth_user_id,
            conv1Id: conv1.id,
            favId: fav.id,
            conv2Id: conv2.id,
            nombrePilaA,
            apellidoLegalA,
            nombrePilaB,
            apellidoLegalB,
        };

        // Log de targets — solo iniciales del apellido para no filtrar en CI.
        // eslint-disable-next-line no-console
        console.log(`[pii-chat-nombre] targets: A=${nombrePilaA} ${apellidoLegalA.charAt(0)}. (prov=${provA.id.slice(0, 8)}… conv1=${conv1.id.slice(0, 8)}…) | ` +
            `B=${nombrePilaB} ${apellidoLegalB.charAt(0)}. (prov=${provB.id.slice(0, 8)}… conv2=${conv2.id.slice(0, 8)}…)`);
    });

    test.afterAll(async () => {
        if (!targets) return;
        const admin = await getSupabaseAdmin();
        await admin.from('favoritos').delete().eq('id', targets.favId);
        await admin.from('conversations').delete().eq('id', targets.conv1Id);
        await admin.from('conversations').delete().eq('id', targets.conv2Id);
    });

    test.describe('tutor view', () => {
        test.use({ storageState: 'e2e/.auth/tutor.json' });

        test('[AUTH-PII-01] /mensajes?id=<conv1> — tutor ve proveedor sin apellido (Nombre pila presente)', async ({ page }) => {
            if (!targets) test.skip(true, 'targets no resueltos');
            const t = targets!;
            const html = await getFullHtml(page, `/mensajes?id=${t.conv1Id}`);

            expect(
                html,
                `Apellido legal "${t.apellidoLegalA}" visible en /mensajes (lista ConversationList o header MessageThread).`,
            ).not.toContain(t.apellidoLegalA);

            expect(
                html,
                `No se encontró "${t.nombrePilaA}" en /mensajes — ¿el chat renderiza fallback "Participante"?`,
            ).toContain(t.nombrePilaA);
        });

        test('[AUTH-PII-02] /favoritos?tipo=proveedor — card del proveedor sin apellido', async ({ page }) => {
            if (!targets) test.skip(true, 'targets no resueltos');
            const t = targets!;
            // pages/favoritos.tsx:39 lee router.query.tipo === 'proveedor' (singular).
            const html = await getFullHtml(page, `/favoritos?tipo=proveedor`);

            expect(
                html,
                `Apellido legal "${t.apellidoLegalA}" visible en /favoritos tab Proveedores.`,
            ).not.toContain(t.apellidoLegalA);

            expect(
                html,
                `No se encontró "${t.nombrePilaA}" en /favoritos tab Proveedores. Posible fallback o favorito no cargó.`,
            ).toContain(t.nombrePilaA);
        });
    });

    test.describe('proveedor view', () => {
        test.use({ storageState: 'e2e/.auth/proveedor.json' });

        test('[AUTH-PII-03] /mensajes?id=<conv2> — proveedor ve "tutor registrado en proveedores" sin apellido', async ({ page }) => {
            if (!targets) test.skip(true, 'targets no resueltos');
            const t = targets!;
            // Patrón: provB es client (semánticamente tutor), Aldo es sitter (prov logueado).
            // Reproduce el caso real de prod donde tutoras reales están técnicamente en
            // `proveedores` con `estado='aprobado'`. getParticipantProfile(provBAuthId)
            // cae en rama 1 (`proveedores_publicos`) → encuentra fila → pre-fix render
            // apellido crudo. Post-fix: `displayName({nombre, apellido_p, nombre_publico:null})`
            // → "Nombre I." (precedencia 3 del helper).
            const html = await getFullHtml(page, `/mensajes?id=${t.conv2Id}`);

            expect(
                html,
                `Apellido legal "${t.apellidoLegalB}" visible en /mensajes (proveedor Aldo viendo client tutor-en-proveedores).`,
            ).not.toContain(t.apellidoLegalB);

            expect(
                html,
                `No se encontró "${t.nombrePilaB}" en /mensajes como proveedor. ¿Fallback "Participante"? ¿storageState no autentica?`,
            ).toContain(t.nombrePilaB);
        });
    });
});
