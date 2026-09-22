/**
 * scripts/sentry-query-cue1.ts
 *
 * Sprint J-4 cue-1 (2026-09-22) — script puntual OFF-APP para consultar
 * eventos `user_context_stuck` en el proyecto Sentry de prod desde
 * 2026-09-15 (fecha kickoff sprint prelaunch CUE-1 que aterrizó el
 * watchdog en `contexts/UserContext.tsx:807-824`).
 *
 * Reglas operativas (declaración explícita del PO 2026-09-22):
 *   - El token nunca aparece en logs, commits ni chat.
 *   - Las respuestas de la API van SIN el header Authorization.
 *   - Carga token desde `.env.local` (ignorado por git via `.env*`).
 *
 * Uso:
 *   npx tsx scripts/sentry-query-cue1.ts
 *
 * Salida esperada:
 *   - Org slug + Project slug derivados via GET /api/0/organizations/
 *     (usa el token — cero exposure en salida).
 *   - Eventos `user_context_stuck` desde 2026-09-15: count + agrupación
 *     por tag `stuck_reason`.
 *   - Cero print del token.
 */
import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

// Cargar .env.local — cero output del contenido.
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('[sentry-query] .env.local no existe en la raíz del repo.');
    process.exit(2);
}
loadEnv({ path: envPath });

const TOKEN = process.env.SENTRY_AUTH_TOKEN;
if (!TOKEN) {
    console.error('[sentry-query] SENTRY_AUTH_TOKEN no seteado tras cargar .env.local.');
    process.exit(2);
}

// Fecha kickoff del sprint prelaunch CUE-1 (watchdog aterrizado).
const SINCE = '2026-09-15T00:00:00Z';

// Header canónico Sentry. Cero print de este header.
const AUTH_HEADER = { Authorization: `Bearer ${TOKEN}` };

async function api<T = unknown>(pathAndQuery: string): Promise<T> {
    const url = `https://sentry.io/api/0${pathAndQuery}`;
    const resp = await fetch(url, { headers: AUTH_HEADER });
    if (!resp.ok) {
        // Emitir status + body pero NO el header (que llevaba el token).
        const body = await resp.text().catch(() => '<no body>');
        throw new Error(`Sentry API ${resp.status} on ${pathAndQuery}: ${body.slice(0, 300)}`);
    }
    return (await resp.json()) as T;
}

type OrgRow = { slug: string; name: string };
type ProjectRow = { slug: string; name: string; platform: string };
type IssueRow = {
    id: string;
    shortId: string;
    culprit: string;
    title: string;
    count: string;
    userCount: number;
    firstSeen: string;
    lastSeen: string;
    tags?: Array<{ key: string; value: string }>;
};

async function main() {
    // Paso 1: descubrir orgs accesibles con el token.
    const orgs = await api<OrgRow[]>('/organizations/');
    console.log(`[sentry-query] Orgs accesibles: ${orgs.length}`);
    for (const o of orgs) console.log(`  - ${o.slug} (${o.name})`);

    if (orgs.length === 0) {
        console.error('[sentry-query] Cero orgs. El token puede tener scope insuficiente.');
        process.exit(1);
    }

    // Paso 2: por cada org, listar projects — heurística Pawnecta (nombre o slug).
    let targetOrg: OrgRow | null = null;
    let targetProject: ProjectRow | null = null;
    for (const org of orgs) {
        const projects = await api<ProjectRow[]>(`/organizations/${org.slug}/projects/`);
        for (const p of projects) {
            if (/pawnecta|petmate|javascript-nextjs/i.test(p.slug) || /pawnecta|petmate|javascript-nextjs/i.test(p.name)) {
                targetOrg = org;
                targetProject = p;
                console.log(`[sentry-query] Match: org=${org.slug} project=${p.slug} (${p.name}, ${p.platform})`);
                break;
            }
        }
        if (targetProject) break;
    }
    if (!targetOrg || !targetProject) {
        console.error('[sentry-query] Cero project match pawnecta/petmate. Listo todos:');
        for (const org of orgs) {
            const projects = await api<ProjectRow[]>(`/organizations/${org.slug}/projects/`);
            for (const p of projects) console.log(`  - ${org.slug}/${p.slug} (${p.name})`);
        }
        process.exit(1);
    }

    // Paso 3: query issues con message:user_context_stuck desde 2026-09-15.
    // Sentry issues API acepta statsPeriod solo en '', '24h' o '14d'.
    // 14d cubre desde ~2026-09-08 → excede la fecha kickoff CUE-1 (2026-09-15).
    const query = encodeURIComponent(`message:user_context_stuck`);
    const issuesPath = `/projects/${targetOrg.slug}/${targetProject.slug}/issues/?query=${query}&statsPeriod=14d&limit=100`;
    const issues = await api<IssueRow[]>(issuesPath);
    console.log('');
    console.log(`[sentry-query] Issues 'user_context_stuck' últimos 14 días (desde 2026-09-08 aprox):`);
    console.log(`  Total issues: ${issues.length}`);

    // Total events sumando el count de cada issue.
    const totalEvents = issues.reduce((sum, i) => sum + parseInt(i.count || '0', 10), 0);
    const totalUsers = issues.reduce((sum, i) => sum + (i.userCount || 0), 0);
    console.log(`  Total events (suma count por issue): ${totalEvents}`);
    console.log(`  Total users afectados (suma userCount por issue): ${totalUsers}`);

    // Agrupar por stuck_reason (viene en tags).
    const byReason = new Map<string, number>();
    for (const issue of issues) {
        const reasonTag = issue.tags?.find(t => t.key === 'stuck_reason');
        const reason = reasonTag?.value ?? '<sin_tag>';
        byReason.set(reason, (byReason.get(reason) ?? 0) + parseInt(issue.count || '0', 10));
    }
    console.log('');
    console.log('  Agrupación por stuck_reason:');
    if (byReason.size === 0) {
        console.log('    (cero events)');
    } else {
        for (const [reason, count] of Array.from(byReason.entries()).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${reason}: ${count} events`);
        }
    }

    // Detalle de los top 5 issues (id + first/last seen + count).
    if (issues.length > 0) {
        console.log('');
        console.log('  Top 5 issues por count:');
        const top = [...issues].sort((a, b) => parseInt(b.count, 10) - parseInt(a.count, 10)).slice(0, 5);
        for (const i of top) {
            const reasonTag = i.tags?.find(t => t.key === 'stuck_reason');
            console.log(`    - ${i.shortId} count=${i.count} users=${i.userCount} reason=${reasonTag?.value ?? '<sin_tag>'} first=${i.firstSeen} last=${i.lastSeen}`);
        }

        // Deep dive: para el issue top, listar los tags reales agrupados y
        // el último evento con sus tags completos.
        const topIssue = top[0];
        console.log('');
        console.log(`  Deep dive issue ${topIssue.shortId}:`);
        try {
            const tags = await api<Array<{ key: string; name: string; totalValues: number; topValues: Array<{ value: string; count: number }> }>>(`/issues/${topIssue.id}/tags/`);
            console.log(`    Tags disponibles: ${tags.map(t => t.key).join(', ')}`);
            const interesting = ['stuck_reason', 'subsystem', 'sw_controlling', 'has_storage_session', 'hydration_state', 'environment', 'browser'];
            for (const key of interesting) {
                const t = tags.find(x => x.key === key);
                if (t) {
                    const top3 = t.topValues.slice(0, 5).map(v => `${v.value}(${v.count})`).join(', ');
                    console.log(`    ${key}: ${top3}`);
                }
            }
        } catch (err) {
            console.log(`    tags fetch fail: ${err instanceof Error ? err.message : err}`);
        }

        // Último evento del issue — full detail para ver la ruta + contexto.
        try {
            const events = await api<Array<{ id: string; dateCreated: string; tags: Array<{ key: string; value: string }>; contexts?: Record<string, unknown> }>>(`/issues/${topIssue.id}/events/?limit=1`);
            if (events.length > 0) {
                const ev = events[0];
                console.log('');
                console.log(`    Último evento (${ev.id}, ${ev.dateCreated}):`);
                console.log(`      Tags: ${ev.tags.map(t => `${t.key}=${t.value}`).join(', ')}`);
            }
        } catch (err) {
            console.log(`    events fetch fail: ${err instanceof Error ? err.message : err}`);
        }
    } else {
        console.log('');
        console.log('  Cero issues encontrados. Confirmar en dashboard:');
        console.log(`    https://sentry.io/organizations/${targetOrg.slug}/issues/?project=&query=message%3Auser_context_stuck&statsPeriod=30d`);
    }
}

main().catch(err => {
    console.error('[sentry-query] FATAL:', err instanceof Error ? err.message : err);
    process.exit(1);
});
