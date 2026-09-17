/* eslint-disable no-console */
// scripts/cleanup-staging-e2e.ts
// ---------------------------------------------------------------------------
// Sprint estab-e2e-i (2026-09-17) — cleanup nocturno de residuo fixture en
// staging para evitar que el DB acumule agendamientos, notifications y
// servicios de corridas e2e abortadas o legítimamente terminadas. Corre a
// diario vía .github/workflows/cleanup-staging-e2e.yml (schedule 07:00 UTC =
// 04:00 Chile CLT) o manualmente via workflow_dispatch.
//
// Regla: cualquier fila creada por fixtures (prefijo tag o pertenece a
// servicios-fixture del proveedor de prueba) con `created_at` > 24 horas.
// Filas más nuevas se dejan (pueden ser de corridas activas concurrentes).
//
// Uso local:
//   SUPABASE_STAGING_URL=https://jmtadvdkicyylcwjcmcl.supabase.co \
//   SUPABASE_STAGING_SERVICE_ROLE_KEY=<key> \
//   npx tsx scripts/cleanup-staging-e2e.ts             # dry-run
//   npx tsx scripts/cleanup-staging-e2e.ts --apply     # real DELETE
//
// GUARD ANTI-PROD: aborta duro si la URL no incluye el ref del proyecto
// staging (`jmtadvdkicyylcwjcmcl`). Cero riesgo de disparar contra prod
// aunque alguien pase la env var de prod por error.
// ---------------------------------------------------------------------------
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STAGING_PROJECT_REF = 'jmtadvdkicyylcwjcmcl';

// IDs cache-side de las cuentas de prueba (verificados 2026-09-17).
// Aldo (proveedor + admin) y Camila (tutor puro).
const ALDO_PROVEEDOR_ID = 'a61c09ca-8fcf-4be8-b84e-543f41bb6994';
const ALDO_AUTH_ID = '63c223b7-c0d2-453a-bd01-fbc6ee793a02';
const CAMILA_AUTH_ID = '5b30be99-3e11-47c7-b373-e3d8e4b86be0';

// Prefijos que el suite e2e usa. Deben mantenerse en sync con:
//   - E2E_TITULO_PREFIX de e2e/fixtures/servicio-efimero.ts
//   - E2E_F2_3_TITULO_PREFIX de e2e/fixtures/servicio-cuidado-listo.ts
//   - TAG_TUTOR_NOMBRE_PREFIX de e2e/fixtures/cron-recordatorio.ts
//   - 'e2e-fixture' literal usado por preInsertarReservaConfirmada.
const PREFIX_SVC_F2_2B = 'Servicio F2-2B (test e2e) —';
const PREFIX_SVC_F2_3 = 'Cuidado de mascota (test F2-3) —';
const PREFIX_TUTOR_NOMBRE_CRON = '[TEST-cron-';
const TUTOR_NOMBRE_E2E_FIXTURE = 'e2e-fixture';

type CountRow = { tabla: string; n: number };

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v || v.trim().length === 0) {
        console.error(`[cleanup-staging-e2e] Falta env var ${name}`);
        process.exit(2);
    }
    return v;
}

function assertStagingUrl(url: string): void {
    if (!url.includes(STAGING_PROJECT_REF)) {
        console.error(
            `[cleanup-staging-e2e] GUARD ANTI-PROD: URL no incluye ref '${STAGING_PROJECT_REF}'. ` +
            `URL recibida: ${url}. Abortando.`,
        );
        process.exit(3);
    }
}

async function countsBefore(client: SupabaseClient): Promise<CountRow[]> {
    // Sub-query "svc fixture" — usado como base para el resto de conteos.
    // Query simple via rpc no — usamos SQL crudo vía service_role sobre PostgREST
    // no soporta CTEs multi-tabla, así que hacemos varias queries.
    const rows: CountRow[] = [];

    // servicios fixture > 24h
    const { count: svcCount, error: svcErr } = await client
        .from('servicios_publicados')
        .select('id', { count: 'exact', head: true })
        .eq('proveedor_id', ALDO_PROVEEDOR_ID)
        .or(`titulo.like.${PREFIX_SVC_F2_2B}%,titulo.like.${PREFIX_SVC_F2_3}%`)
        .lt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    if (svcErr) throw new Error(`SELECT servicios fixture: ${svcErr.message}`);
    rows.push({ tabla: 'servicios_publicados_fixture_gt24h', n: svcCount ?? 0 });

    // agendamientos con tutor_nombre tagged
    const { count: agTagCount, error: agTagErr } = await client
        .from('agendamientos')
        .select('id', { count: 'exact', head: true })
        .or(`tutor_nombre.like.${PREFIX_TUTOR_NOMBRE_CRON}%,tutor_nombre.eq.${TUTOR_NOMBRE_E2E_FIXTURE}`)
        .lt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    if (agTagErr) throw new Error(`SELECT agend tagged: ${agTagErr.message}`);
    rows.push({ tabla: 'agendamientos_tagged_gt24h', n: agTagCount ?? 0 });

    return rows;
}

async function fetchTargetIds(client: SupabaseClient): Promise<{
    svcIds: string[];
    agendIds: string[];
}> {
    const cutoffIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    // 1. servicios fixture > 24h.
    const { data: svc, error: svcErr } = await client
        .from('servicios_publicados')
        .select('id')
        .eq('proveedor_id', ALDO_PROVEEDOR_ID)
        .or(`titulo.like.${PREFIX_SVC_F2_2B}%,titulo.like.${PREFIX_SVC_F2_3}%`)
        .lt('created_at', cutoffIso);
    if (svcErr) throw new Error(`SELECT svc target: ${svcErr.message}`);
    const svcIds = (svc as Array<{ id: string }> | null)?.map(r => r.id) ?? [];

    // 2. agendamientos: unión de (a) tagged, (b) sobre svc fixture. Ambos > 24h.
    const agendIds: string[] = [];

    // (a) tagged
    const { data: agTag, error: agTagErr } = await client
        .from('agendamientos')
        .select('id')
        .or(`tutor_nombre.like.${PREFIX_TUTOR_NOMBRE_CRON}%,tutor_nombre.eq.${TUTOR_NOMBRE_E2E_FIXTURE}`)
        .lt('created_at', cutoffIso);
    if (agTagErr) throw new Error(`SELECT agend tagged target: ${agTagErr.message}`);
    for (const r of (agTag as Array<{ id: string }> | null) ?? []) agendIds.push(r.id);

    // (b) sobre svc fixture (independiente de tutor_nombre). Puede overlappear.
    if (svcIds.length > 0) {
        // Chunk to avoid URL length limits on .in() with many UUIDs.
        for (let i = 0; i < svcIds.length; i += 100) {
            const chunk = svcIds.slice(i, i + 100);
            const { data: agSvc, error: agSvcErr } = await client
                .from('agendamientos')
                .select('id')
                .in('servicio_id', chunk)
                .lt('created_at', cutoffIso);
            if (agSvcErr) throw new Error(`SELECT agend by svc: ${agSvcErr.message}`);
            for (const r of (agSvc as Array<{ id: string }> | null) ?? []) agendIds.push(r.id);
        }
    }

    // Dedup.
    const uniqAgend = Array.from(new Set(agendIds));
    return { svcIds, agendIds: uniqAgend };
}

async function applyDeletes(
    client: SupabaseClient,
    svcIds: string[],
    agendIds: string[],
): Promise<{ notifs: number; agend: number; svc: number }> {
    let notifs = 0;
    let agend = 0;
    let svc = 0;

    // 1) notifications con metadata->>agendamiento_id en el set.
    if (agendIds.length > 0) {
        for (let i = 0; i < agendIds.length; i += 100) {
            const chunk = agendIds.slice(i, i + 100);
            const inList = `(${chunk.join(',')})`;
            const { data, error } = await client
                .from('notifications')
                .delete()
                .filter('metadata->>agendamiento_id', 'in', inList)
                .select('id');
            if (error) throw new Error(`DELETE notifs chunk: ${error.message}`);
            notifs += (data as Array<unknown> | null)?.length ?? 0;
        }
    }
    // Notifs de recordatorios test que no matchean por metadata (títulos "Recordatorio:" > 24h)
    // — barrido complementario user-scoped para Aldo/Camila.
    const cutoffIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    for (const uid of [ALDO_AUTH_ID, CAMILA_AUTH_ID]) {
        const { data, error } = await client
            .from('notifications')
            .delete()
            .eq('user_id', uid)
            .like('title', 'Recordatorio:%')
            .lt('created_at', cutoffIso)
            .select('id');
        if (error) throw new Error(`DELETE notifs recordatorio user=${uid}: ${error.message}`);
        notifs += (data as Array<unknown> | null)?.length ?? 0;
    }

    // 2) agendamientos.
    if (agendIds.length > 0) {
        for (let i = 0; i < agendIds.length; i += 100) {
            const chunk = agendIds.slice(i, i + 100);
            const { data, error } = await client
                .from('agendamientos')
                .delete()
                .in('id', chunk)
                .select('id');
            if (error) throw new Error(`DELETE agend chunk: ${error.message}`);
            agend += (data as Array<unknown> | null)?.length ?? 0;
        }
    }

    // 3) servicios (hijos ya limpios: agend arriba, excepciones/franjas 0 típico).
    if (svcIds.length > 0) {
        for (let i = 0; i < svcIds.length; i += 100) {
            const chunk = svcIds.slice(i, i + 100);
            const { data, error } = await client
                .from('servicios_publicados')
                .delete()
                .in('id', chunk)
                .select('id');
            if (error) throw new Error(`DELETE svc chunk: ${error.message}`);
            svc += (data as Array<unknown> | null)?.length ?? 0;
        }
    }

    return { notifs, agend, svc };
}

async function main() {
    const url = requireEnv('SUPABASE_STAGING_URL');
    const key = requireEnv('SUPABASE_STAGING_SERVICE_ROLE_KEY');
    assertStagingUrl(url);

    const apply = process.argv.includes('--apply');
    const mode = apply ? 'APPLY' : 'DRY-RUN';
    console.log(`[cleanup-staging-e2e] mode=${mode} url=${url}`);

    const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Conteos base (informativos).
    const before = await countsBefore(client);
    console.log('[cleanup-staging-e2e] counts BEFORE:');
    for (const row of before) console.log(`  ${row.tabla}: ${row.n}`);

    // IDs target.
    const { svcIds, agendIds } = await fetchTargetIds(client);
    console.log(`[cleanup-staging-e2e] target set: svc=${svcIds.length} agend=${agendIds.length}`);

    if (!apply) {
        console.log('[cleanup-staging-e2e] DRY-RUN: cero DELETE. Repite con --apply para borrar.');
        process.exit(0);
    }

    const deleted = await applyDeletes(client, svcIds, agendIds);
    console.log(`[cleanup-staging-e2e] DELETED: notifs=${deleted.notifs} agend=${deleted.agend} svc=${deleted.svc}`);

    // Conteos after.
    const after = await countsBefore(client);
    console.log('[cleanup-staging-e2e] counts AFTER:');
    for (const row of after) console.log(`  ${row.tabla}: ${row.n}`);
}

main().catch((err) => {
    console.error('[cleanup-staging-e2e] fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
});
