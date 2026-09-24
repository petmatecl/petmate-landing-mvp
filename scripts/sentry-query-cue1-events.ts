/**
 * scripts/sentry-query-cue1-events.ts
 *
 * Sprint J-4 CUE-1 evidencia real (2026-09-25) — bajar events de los 2 issues
 * que el PO identificó como señal real del degrade de UserContext:
 *   - JAVASCRIPT-NEXTJS-5 `[UserContext] hydrate exhausted` (/proveedor, 4 events, últ ~3d)
 *   - JAVASCRIPT-NEXTJS-8 `login_role_lookup_failed` (/login, hace ~3 días)
 *
 * También trae events con `message:security_logout` para comparar timestamps
 * (el PO mencionó "coinciden con los 5 de /security-logout").
 *
 * Por cada issue: baja events con tags relevantes (browser, os, url, release,
 * environment), breadcrumbs (últimos 5), y extra fields del captureMessage
 * (level, contexts, error si aplica). Cero exposición del token, cero PII.
 */
import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('[sentry-cue1-events] .env.local no existe.');
    process.exit(2);
}
loadEnv({ path: envPath });

const TOKEN = process.env.SENTRY_AUTH_TOKEN;
if (!TOKEN) {
    console.error('[sentry-cue1-events] SENTRY_AUTH_TOKEN no seteado.');
    process.exit(2);
}

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
type IssueRow = { id: string; shortId: string; title: string; count: string; userCount: number; firstSeen: string; lastSeen: string; culprit: string };
type EventRow = {
    id: string;
    eventID?: string;
    dateCreated: string;
    tags: Array<{ key: string; value: string }>;
    entries?: Array<{ type: string; data: unknown }>;
    contexts?: Record<string, unknown>;
    message?: string;
};

function truncate(s: string | undefined, n = 180): string {
    if (!s) return '?';
    return s.length > n ? s.slice(0, n) + '…' : s;
}

async function dumpIssueEvents(orgSlug: string, projectSlug: string, shortId: string, label: string) {
    console.log(`\n============================================================`);
    console.log(`ISSUE ${shortId}  —  ${label}`);
    console.log(`============================================================`);

    // Buscar el issue por shortId.
    const query = encodeURIComponent(`issue:${shortId}`);
    const issuesPath = `/projects/${orgSlug}/${projectSlug}/issues/?query=${query}&statsPeriod=14d&limit=5`;
    const issues = await api<IssueRow[]>(issuesPath);
    if (issues.length === 0) {
        console.log(`  (no encontrado en 14d)`);
        return;
    }
    const issue = issues[0];
    console.log(`  title: ${issue.title}`);
    console.log(`  culprit: ${issue.culprit}`);
    console.log(`  count: ${issue.count} | users: ${issue.userCount}`);
    console.log(`  first: ${issue.firstSeen}`);
    console.log(`  last: ${issue.lastSeen}`);

    // Bajar TODOS los events del issue (limit 20 debería alcanzar para 4-8 eventos).
    const eventsPath = `/issues/${issue.id}/events/?limit=20`;
    const events = await api<EventRow[]>(eventsPath);
    console.log(`\n  Total events fetched: ${events.length}`);

    events.forEach((ev, idx) => {
        console.log(`\n  --- event ${idx + 1}/${events.length} ---`);
        console.log(`  id: ${ev.eventID ?? ev.id}`);
        console.log(`  when: ${ev.dateCreated}`);
        if (ev.message) console.log(`  message: ${truncate(ev.message, 200)}`);

        // Tags relevantes.
        const t = new Map(ev.tags.map(x => [x.key, x.value]));
        const interesting = ['url', 'transaction', 'browser.name', 'browser', 'os.name', 'os', 'user.id', 'user_id', 'release', 'environment', 'level'];
        for (const k of interesting) {
            const v = t.get(k);
            if (v) console.log(`    ${k}: ${truncate(v, 120)}`);
        }

        // Contexts: buscar contexts.state / contexts.reason que el UserContext incluye.
        const contexts = ev.contexts ?? {};
        for (const [k, v] of Object.entries(contexts)) {
            // Skippear runtime / device (browser/os ya vistos).
            if (['runtime', 'device', 'os', 'browser', 'trace', 'app', 'culture'].includes(k)) continue;
            try {
                const s = JSON.stringify(v);
                console.log(`    context.${k}: ${truncate(s, 240)}`);
            } catch { /* ignore */ }
        }

        // Breadcrumbs — últimos 6 antes del event.
        const bcEntry = ev.entries?.find(e => e.type === 'breadcrumbs');
        if (bcEntry) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bcs = (bcEntry.data as any)?.values as Array<{ timestamp: number; category?: string; type?: string; message?: string; level?: string; data?: Record<string, unknown> }> ?? [];
            const last = bcs.slice(-6);
            console.log(`    breadcrumbs (last ${last.length}):`);
            for (const b of last) {
                const ts = typeof b.timestamp === 'number' ? new Date(b.timestamp * 1000).toISOString() : '?';
                const bit = `${b.category ?? '?'}${b.type ? '/' + b.type : ''}`;
                console.log(`      ${ts} [${bit}] ${truncate(b.message, 140)}`);
            }
        }

        // Exception (si aplica — hydrate exhausted podría ser message, no exception).
        const excEntry = ev.entries?.find(e => e.type === 'exception');
        if (excEntry) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const excValues = (excEntry.data as any)?.values ?? [];
            for (const exc of excValues) {
                console.log(`    exception.type: ${exc.type ?? '?'}`);
                console.log(`    exception.value: ${truncate(exc.value, 200)}`);
                const frames = exc.stacktrace?.frames ?? [];
                const topFrames = frames.slice(-4).reverse();
                for (const f of topFrames) {
                    console.log(`      at ${f.function ?? '?'} (${f.filename ?? '?'}:${f.lineno ?? '?'})`);
                }
            }
        }
    });
}

async function main() {
    const orgs = await api<OrgRow[]>('/organizations/');
    const org = orgs.find(o => /pawnecta/i.test(o.slug));
    if (!org) { console.error('cero org pawnecta'); process.exit(1); }
    const projects = await api<ProjectRow[]>(`/organizations/${org.slug}/projects/`);
    const project = projects.find(p => /javascript-nextjs|pawnecta|petmate/i.test(p.slug));
    if (!project) { console.error('cero project match'); process.exit(1); }
    console.log(`[sentry-cue1-events] org=${org.slug} project=${project.slug}`);

    await dumpIssueEvents(org.slug, project.slug, 'JAVASCRIPT-NEXTJS-5', '[UserContext] hydrate exhausted, user stays degraded until manual reload');
    await dumpIssueEvents(org.slug, project.slug, 'JAVASCRIPT-NEXTJS-8', 'login_role_lookup_failed');

    // Query 3: /security-logout events para cross-check timestamps.
    console.log(`\n============================================================`);
    console.log(`QUERY 3 — issues con url:/security-logout o transaction:/security-logout en 14d`);
    console.log(`============================================================`);
    const q3 = encodeURIComponent('url:*security-logout*');
    const issuesPath3 = `/projects/${org.slug}/${project.slug}/issues/?query=${q3}&statsPeriod=14d&limit=10`;
    const issues3 = await api<IssueRow[]>(issuesPath3);
    console.log(`Total issues: ${issues3.length}`);
    for (const i of issues3) {
        console.log(`  ${i.shortId} | ${i.title.slice(0, 100)} | count=${i.count} users=${i.userCount} first=${i.firstSeen} last=${i.lastSeen}`);
    }
}

main().catch(err => {
    console.error('[fatal]', err instanceof Error ? err.message : err);
    process.exit(1);
});
