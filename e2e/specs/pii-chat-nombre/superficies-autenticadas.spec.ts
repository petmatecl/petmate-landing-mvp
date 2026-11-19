// e2e/specs/pii-chat-nombre/superficies-autenticadas.spec.ts
// ---------------------------------------------------------------------------
// Sprint pii-chat-nombre (2026-11-19) — spec P8 guardia de PII sobre las
// superficies AUTENTICADAS (con sesión) que exponían apellido completo.
//
// Complementa `pii-nombre-publico/superficies-publicas.spec.ts` (superficies
// anónimas). Las 3 superficies cubiertas acá requieren login tutor:
//   1. /mensajes?id=<conv> — lista + header del hilo
//     (ConversationList L203, MessageThread L351).
//   2. /favoritos tab Proveedores — card del proveedor favorito
//     (favoritos.tsx L145 fallback de `nombre_publico`).
//
// Hallazgo que motivó el sprint (smoke PO 2026-11-19 post-#119):
// cualquier tutor registrado que pulse "Contactar" en una ficha ve el
// apellido completo del proveedor en la lista + header del chat.
//
// Hallazgo adicional durante diagnóstico (empírico prod-ro 2026-11-19):
// en `usuarios_buscadores.nombre`, 7/9 tutores tienen nombre + apellidos
// concatenados en una sola columna. El leak es BIDIRECCIONAL — proveedor
// también ve apellido completo del tutor en el chat. El fix aplica
// `displayName()` en ambos sentidos vía `getParticipantProfile` →
// descubre apellido embutido como 2° token.
//
// El spec arma 2 guardias P8 por test (positivo conocido 10ª + negativo):
//   - **Negativa**: el HTML renderizado NO contiene el apellido completo.
//   - **Positiva**: el HTML renderizado SÍ contiene el nombre de pila
//     (o "Nombre I." formato resuelto por el helper).
//
// La positiva es CRÍTICA — sin ella, un spec que solo verifica ausencia
// del apellido pasa cuando el preview sirve página de login, 404, o
// render con fallback genérico "Participante".
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';
import { getSupabaseAdmin } from '../../fixtures/supabaseAdmin';

interface SmokeTargets {
    tutorAuthId: string;
    provAuthId: string;
    provId: string;
    convId: string;
    favId: string;
    nombrePila: string;
    apellidoLegal: string;
}

let targets: SmokeTargets | null = null;

// Storage state tutor (Camila) para ambos tests del archivo.
test.use({ storageState: 'e2e/.auth/tutor.json' });

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

        // 1) Resolver auth_user_id del tutor E2E (Camila staging).
        const tutorEmail = process.env.E2E_STAGING_TUTOR_EMAIL;
        if (!tutorEmail) {
            test.skip(true, '[pii-chat-nombre] E2E_STAGING_TUTOR_EMAIL no seteado — skip.');
            return;
        }
        // listUsers del admin API no permite filter por email directo,
        // pero una página de hasta ~50 users es suficiente para staging.
        const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
        if (listErr) {
            test.skip(true, `[pii-chat-nombre] listUsers falló: ${listErr.message} — skip.`);
            return;
        }
        const tutorUser = usersPage.users.find(u => u.email?.toLowerCase() === tutorEmail.toLowerCase());
        if (!tutorUser) {
            test.skip(true, `[pii-chat-nombre] tutor ${tutorEmail} no encontrado en auth.users — skip.`);
            return;
        }
        const tutorAuthId = tutorUser.id;

        // 2) Resolver proveedor candidato: sin nombre_publico, apellido ≥ 3
        //    chars, nombre ≥ 2 chars, estado aprobado. Consultamos la tabla
        //    base `proveedores` (no la vista) para asegurar lectura de los
        //    campos crudos que todavía existen pre-PII-VIEW-TIGHT.
        const { data: provs, error: provErr } = await admin
            .from('proveedores')
            .select('id, auth_user_id, nombre, apellido_p, nombre_publico, estado')
            .is('nombre_publico', null)
            .not('apellido_p', 'is', null)
            .not('nombre', 'is', null)
            .eq('estado', 'aprobado')
            .order('created_at', { ascending: false })
            .limit(10);
        if (provErr) {
            test.skip(true, `[pii-chat-nombre] proveedores fetch falló: ${provErr.message} — skip.`);
            return;
        }
        const prov = (provs ?? []).find(p =>
            (p.apellido_p || '').trim().length >= 3 &&
            (p.nombre || '').trim().length >= 2 &&
            p.auth_user_id &&
            p.auth_user_id !== tutorAuthId,
        );
        if (!prov) {
            test.skip(true, '[pii-chat-nombre] Sin proveedor candidato (apellido ≥3 chars, sin nombre_publico, aprobado) — skip.');
            return;
        }
        const nombrePila = prov.nombre.trim().split(/\s+/)[0];
        const apellidoLegal = prov.apellido_p.trim();

        // 3) Limpiar residuo previo del mismo par (por si una corrida anterior
        //    dejó la conv sin borrar) y crear conv fresh.
        await admin.from('conversations')
            .delete()
            .eq('client_id', tutorAuthId)
            .eq('sitter_id', prov.auth_user_id);

        const { data: conv, error: convErr } = await admin.from('conversations')
            .insert({
                client_id: tutorAuthId,
                sitter_id: prov.auth_user_id,
                proveedor_auth_id: prov.auth_user_id,
            })
            .select('id')
            .single();
        if (convErr || !conv) {
            test.skip(true, `[pii-chat-nombre] INSERT conversations falló: ${convErr?.message ?? 'empty'} — skip.`);
            return;
        }

        // 4) Limpiar residuo de favorito + INSERT fresh.
        await admin.from('favoritos')
            .delete()
            .eq('user_id', tutorAuthId)
            .eq('entidad_id', prov.id)
            .eq('entidad_tipo', 'proveedor');

        const { data: fav, error: favErr } = await admin.from('favoritos')
            .insert({
                user_id: tutorAuthId,
                entidad_id: prov.id,
                entidad_tipo: 'proveedor',
            })
            .select('id')
            .single();
        if (favErr || !fav) {
            // Cleanup conv aunque el favorito falle.
            await admin.from('conversations').delete().eq('id', conv.id);
            test.skip(true, `[pii-chat-nombre] INSERT favoritos falló: ${favErr?.message ?? 'empty'} — skip.`);
            return;
        }

        targets = {
            tutorAuthId,
            provAuthId: prov.auth_user_id,
            provId: prov.id,
            convId: conv.id,
            favId: fav.id,
            nombrePila,
            apellidoLegal,
        };

        // Log del target elegido — queda en el CI log para auditar. Solo
        // iniciales del apellido para no filtrar el dato en el log público.
        // eslint-disable-next-line no-console
        console.log(`[pii-chat-nombre] target: ${nombrePila} ${apellidoLegal.charAt(0)}. ` +
            `(prov=${prov.id.slice(0, 8)}… conv=${conv.id.slice(0, 8)}…)`);
    });

    test.afterAll(async () => {
        if (!targets) return;
        const admin = await getSupabaseAdmin();
        await admin.from('favoritos').delete().eq('id', targets.favId);
        await admin.from('conversations').delete().eq('id', targets.convId);
    });

    test('[AUTH-PII-01] /mensajes?id=<conv> — chat oculta apellido legal del proveedor y muestra nombre pila', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no resueltos');
        const t = targets!;
        const html = await getFullHtml(page, `/mensajes?id=${t.convId}`);

        expect(
            html,
            `Apellido legal "${t.apellidoLegal}" visible en /mensajes (lista ConversationList o header MessageThread).`,
        ).not.toContain(t.apellidoLegal);

        expect(
            html,
            `No se encontró "${t.nombrePila}" en /mensajes — ¿el chat renderiza fallback "Participante"? ` +
            `El getParticipantProfile podría estar devolviendo null o el storageState no autentica.`,
        ).toContain(t.nombrePila);
    });

    test('[AUTH-PII-02] /favoritos tab Proveedores — card oculta apellido legal y muestra nombre resuelto', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no resueltos');
        const t = targets!;
        // pages/favoritos.tsx:39 lee `router.query.tipo === 'proveedor'`
        // (key `tipo`, valor singular). La UI tiene 2 tabs: Servicios /
        // Proveedores, pero el query param es `tipo=proveedor`.
        const html = await getFullHtml(page, `/favoritos?tipo=proveedor`);

        expect(
            html,
            `Apellido legal "${t.apellidoLegal}" visible en /favoritos tab Proveedores — fallback de nombre_publico ` +
            `en favoritos.tsx L145 estaría exponiendo \`${'${nombre} ${apellido_p}'}\`.`,
        ).not.toContain(t.apellidoLegal);

        expect(
            html,
            `No se encontró "${t.nombrePila}" en /favoritos tab Proveedores. ` +
            `Posible fallback "Proveedor" o favorito no cargó.`,
        ).toContain(t.nombrePila);
    });
});
