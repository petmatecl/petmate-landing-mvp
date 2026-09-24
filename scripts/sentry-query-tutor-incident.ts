/**
 * scripts/sentry-query-tutor-incident.ts
 *
 * Incidente 2026-09-25 · chat-back-boundary — cuenta tutor user.id
 * `aff2a90d-*` reportó "Algo salió mal" (error boundary) al volver
 * desde chat a /usuario en Chrome Windows incógnito.
 *
 * Query Sentry para localizar events del user en las últimas 24h + 7d
 * como respaldo. Sigue mismo patrón que sentry-query-cue1.ts (cero
 * exposición del token, cero print de PII).
 */
import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('[sentry-query-tutor] .env.local no existe.');
    process.exit(2);
}
loadEnv({ path: envPath });

const TOKEN = process.env.SENTRY_AUTH_TOKEN;
if (!TOKEN) {
    console.error('[sentry-query-tutor] SENTRY_AUTH_TOKEN no seteado.');
    process.exit(2);
}

const USER_ID_PREFIX = 'aff2a90d';
const AUTH_HEADER = { Authorization: `Bearer ${TOKEN}` };

async function api<T = unknown>(pathAndQuery: string): Promise<T> {
    const url = `https://sentry.io/api/0${pathAndQuery}`;
    const resp = await fetch(url, { headers: AUTH_HEADER });
    if (!resp.ok) {
        const body = await resp.text().catch(() => '<no body>');
        throw new Error(`Sentry API ${resp.status} on ${pathAndQuery}: ${body.slice(0, 300)}`);
    }
    return (await resp.json()) as T;
}

type OrgRow = { slug: string };
type ProjectRow = { slug: string; name: string };
type IssueRow = {
    id: string;
    shortId: string;
    culprit: string;
    title: string;
    level?: string;
    type?: string;
    count: string;
    userCount: number;
    firstSeen: string;
    lastSeen: string;
    metadata?: { type?: string; value?: string; filename?: string; function?: string };
};

async function main() {
    const orgs = await api<OrgRow[]>('/organizations/');
    const org = orgs.find(o => /pawnecta/i.test(o.slug));
    if (!org) {
        console.error('[sentry-query-tutor] Cero org pawnecta encontrado.');
        process.exit(1);
    }
    const projects = await api<ProjectRow[]>(`/organizations/${org.slug}/projects/`);
    const project = projects.find(p => /javascript-nextjs|pawnecta|petmate/i.test(p.slug));
    if (!project) {
        console.error('[sentry-query-tutor] Cero project match.');
        process.exit(1);
    }
    console.log(`[sentry-query-tutor] org=${org.slug} project=${project.slug}`);

    // Query 1: user.id prefix en últimas 24h (queremos el evento del incidente).
    // Sentry search syntax: user.id:aff2a90d-* (glob) o user.id:aff2a90d* (prefijo).
    // NOTA API: statsPeriod solo acepta '', '24h', '14d' (verificado 400 en '7d').
    for (const period of ['24h', '14d']) {
        const query = encodeURIComponent(`user.id:${USER_ID_PREFIX}*`);
        const issuesPath = `/projects/${org.slug}/${project.slug}/issues/?query=${query}&statsPeriod=${period}&limit=50`;
        const issues = await api<IssueRow[]>(issuesPath);
        console.log(`\n=== Issues con user.id:${USER_ID_PREFIX}* en últimas ${period} ===`);
        console.log(`Total issues: ${issues.length}`);
        if (issues.length === 0) {
            console.log(`  (cero)`);
            continue;
        }
        for (const i of issues) {
            console.log(`  ${i.shortId} | level=${i.level ?? '?'} | count=${i.count} | users=${i.userCount} | first=${i.firstSeen} | last=${i.lastSeen}`);
            console.log(`    title: ${i.title.slice(0, 120)}`);
            console.log(`    culprit: ${i.culprit ?? '?'}`);
            if (i.metadata) {
                console.log(`    metadata.type: ${i.metadata.type ?? '?'}`);
                console.log(`    metadata.value: ${(i.metadata.value ?? '?').slice(0, 200)}`);
                console.log(`    metadata.filename: ${i.metadata.filename ?? '?'}`);
                console.log(`    metadata.function: ${i.metadata.function ?? '?'}`);
            }
            // Deep dive: primer event del issue con stack + tags relevantes.
            try {
                const events = await api<Array<{ id: string; dateCreated: string; tags: Array<{ key: string; value: string }>; entries?: Array<{ type: string; data: unknown }> }>>(`/issues/${i.id}/events/latest/`);
                const ev = events as unknown as { id: string; dateCreated: string; tags: Array<{ key: string; value: string }>; entries?: Array<{ type: string; data: unknown }> };
                if (ev.dateCreated) {
                    console.log(`    latest event: ${ev.dateCreated}`);
                    const t = new Map(ev.tags.map(x => [x.key, x.value]));
                    const interesting = ['url', 'transaction', 'browser', 'os', 'device', 'user_id', 'user.id', 'release', 'environment'];
                    for (const k of interesting) {
                        const v = t.get(k);
                        if (v) console.log(`      ${k}: ${v.slice(0, 120)}`);
                    }
                    // Buscar entry de exception con stack.
                    const excEntry = ev.entries?.find(e => e.type === 'exception');
                    if (excEntry) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const data = excEntry.data as any;
                        const excValues = data?.values ?? [];
                        for (const exc of excValues) {
                            console.log(`      exception.type: ${exc.type ?? '?'}`);
                            console.log(`      exception.value: ${(exc.value ?? '?').slice(0, 200)}`);
                            const frames = exc.stacktrace?.frames ?? [];
                            const topFrames = frames.slice(-5).reverse();
                            for (const f of topFrames) {
                                console.log(`        at ${f.function ?? '?'} (${f.filename ?? '?'}:${f.lineno ?? '?'})`);
                            }
                        }
                    }
                }
            } catch (err) {
                console.log(`    latest event fetch failed: ${(err as Error).message.slice(0, 120)}`);
            }
        }
    }

    // Query 2: solo error boundary / React error / user.id no filtrado — buscar por título.
    for (const term of ['Something went wrong', 'Algo salió mal', 'react.error', 'ErrorBoundary', 'chat', 'conversations']) {
        const query = encodeURIComponent(term);
        const issuesPath = `/projects/${org.slug}/${project.slug}/issues/?query=${query}&statsPeriod=24h&limit=10`;
        const issues = await api<IssueRow[]>(issuesPath);
        if (issues.length === 0) continue;
        console.log(`\n=== Issues coincidiendo "${term}" en últimas 24h ===`);
        for (const i of issues) {
            console.log(`  ${i.shortId} | ${i.title.slice(0, 120)} | count=${i.count} users=${i.userCount}`);
        }
    }
}

main().catch(err => {
    console.error('[fatal]', err instanceof Error ? err.message : err);
    process.exit(1);
});
