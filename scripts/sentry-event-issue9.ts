import * as fs from 'fs'; import * as path from 'path'; import { config as loadEnv } from 'dotenv';
loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
const T = process.env.SENTRY_AUTH_TOKEN!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(p: string): Promise<any> { const r = await fetch(`https://sentry.io/api/0${p}`, { headers: { Authorization: `Bearer ${T}` } }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); }
function tr(s: string | undefined, n = 220) { if (!s) return '?'; return s.length > n ? s.slice(0, n) + '…' : s; }
async function main() {
    const issues = await api(`/projects/pawnecta/javascript-nextjs/issues/?query=${encodeURIComponent('issue:JAVASCRIPT-NEXTJS-9')}&statsPeriod=24h&limit=1`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issue = (issues as any[])[0];
    console.log('ISSUE', issue.shortId, '|', issue.title, '| culprit=', issue.culprit, '| count=', issue.count, '| lastSeen=', issue.lastSeen);
    const events = await api(`/issues/${issue.id}/events/?limit=5`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const ev of events as any[]) {
        console.log('\n=== event', ev.eventID || ev.id, 'when', ev.dateCreated, '===');
        console.log('message:', tr(ev.message));
        console.log('title:', tr(ev.title));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detail = await api(`/projects/pawnecta/javascript-nextjs/events/${ev.eventID || ev.id}/`);
        console.log('\nCONTEXTS:');
        for (const [k, v] of Object.entries(detail.contexts ?? {})) {
            if (['runtime', 'device', 'os', 'browser', 'trace', 'app', 'culture', 'response'].includes(k)) continue;
            try { console.log(`  ${k}: ${tr(JSON.stringify(v), 320)}`); } catch { /* */ }
        }
        console.log('\nTAGS relevantes:');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const t of detail.tags ?? []) {
            if (['url', 'transaction', 'browser', 'os', 'release', 'environment', 'level', 'user_id', 'user.id', 'sentry.origin', 'subsystem', 'route'].includes(t.key)) {
                console.log(`  ${t.key}: ${tr(t.value, 200)}`);
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const excEntry = (detail.entries ?? []).find((e: any) => e.type === 'exception');
        if (excEntry) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const exc of (excEntry.data?.values ?? [])) {
                console.log(`\nEXCEPTION: ${exc.type} :: ${tr(exc.value, 300)}`);
                const frames = (exc.stacktrace?.frames ?? []).slice(-15).reverse();
                for (const f of frames) {
                    console.log(`  at ${f.function ?? '?'} (${f.filename ?? '?'}:${f.lineno ?? '?'}:${f.colNo ?? '?'})${f.inApp ? ' [app]' : ''}`);
                }
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bcEntry = (detail.entries ?? []).find((e: any) => e.type === 'breadcrumbs');
        if (bcEntry) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bcs = (bcEntry.data?.values ?? []) as any[];
            console.log(`\nBREADCRUMBS (last 15 of ${bcs.length}):`);
            for (const b of bcs.slice(-15)) {
                const ts = typeof b.timestamp === 'number' ? new Date(b.timestamp * 1000).toISOString() : '?';
                const bit = `${b.category ?? '?'}${b.type ? '/' + b.type : ''}`;
                const dataStr = b.data ? ` data=${tr(JSON.stringify(b.data), 220)}` : '';
                console.log(`  ${ts} [${bit}] ${b.level ?? '?'} :: ${tr(b.message, 200)}${dataStr}`);
            }
        }
    }
}
main().catch(e => { console.error('[fatal]', e); process.exit(1); });
