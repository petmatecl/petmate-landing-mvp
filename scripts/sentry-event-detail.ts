/**
 * scripts/sentry-event-detail.ts
 * Fetch de un event por ID individual — trae contexts + breadcrumbs completos
 * que el endpoint /issues/:id/events/ no incluye (según observado 2026-09-25).
 */
import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
const TOKEN = process.env.SENTRY_AUTH_TOKEN!;
if (!TOKEN) { console.error('cero token'); process.exit(2); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(p: string): Promise<any> {
    const r = await fetch(`https://sentry.io/api/0${p}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error(`${r.status} on ${p}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
}

function tr(s: string | undefined, n = 200) { if (!s) return '?'; return s.length > n ? s.slice(0, n) + '…' : s; }

// Events a inspeccionar (ordenados cronológicamente).
const eventIds = [
    { id: '02613ef44ad047fc8aa8867c1caf5fc8', label: '2026-09-08 17:00:31 /admin (hydrate-5)' },
    { id: '37d0a78cdeaa4a4cbeb8d99a325379cf', label: '2026-09-08 17:06:11 /login (hydrate-5)' },
    { id: '95dee051650749d0b56fe95665f2e7fe', label: '2026-09-21 21:13:06 /login (role_lookup_failed-8)' },
    { id: 'ba3cc7e4b24c4ceb9672d533f49313b6', label: '2026-09-21 21:13:18 /explorar (hydrate-5)' },
    { id: '0c4d572e01e4426f93e4f3da56350b36', label: '2026-09-21 21:13:35 /proveedor (hydrate-5)' },
];

async function main() {
    for (const { id, label } of eventIds) {
        console.log(`\n${'='.repeat(60)}\nEVENT ${id}\n${label}\n${'='.repeat(60)}`);
        try {
            const ev = await api(`/projects/pawnecta/javascript-nextjs/events/${id}/`);
            console.log(`message: ${tr(ev.message, 200)}`);
            console.log(`title: ${tr(ev.title, 200)}`);

            // Contexts (custom del captureMessage).
            console.log('\nCONTEXTS:');
            for (const [k, v] of Object.entries(ev.contexts ?? {})) {
                if (['runtime', 'device', 'os', 'browser', 'trace', 'app', 'culture', 'response'].includes(k)) continue;
                try { console.log(`  ${k}: ${tr(JSON.stringify(v), 300)}`); } catch { /* */ }
            }

            // Tags (extra).
            console.log('\nTAGS (custom):');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tags: Array<{ key: string; value: string }> = ev.tags ?? [];
            const skipTags = new Set(['browser', 'browser.name', 'os', 'os.name', 'runtime', 'runtime.name', 'device', 'device.family', 'url', 'transaction', 'transaction.op', 'release', 'environment', 'level', 'server_name', 'user', 'sentry.origin']);
            for (const t of tags) {
                if (skipTags.has(t.key)) continue;
                console.log(`  ${t.key}: ${tr(t.value, 150)}`);
            }

            // Extra field del captureMessage.
            if (ev.extra) {
                console.log('\nEXTRA:');
                for (const [k, v] of Object.entries(ev.extra)) {
                    try { console.log(`  ${k}: ${tr(JSON.stringify(v), 300)}`); } catch { /* */ }
                }
            }

            // Breadcrumbs — últimos 12.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bcEntry = (ev.entries ?? []).find((e: any) => e.type === 'breadcrumbs');
            if (bcEntry) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bcs = (bcEntry.data?.values ?? []) as Array<any>;
                console.log(`\nBREADCRUMBS (last 12 of ${bcs.length}):`);
                for (const b of bcs.slice(-12)) {
                    const ts = typeof b.timestamp === 'number' ? new Date(b.timestamp * 1000).toISOString() : '?';
                    const bit = `${b.category ?? '?'}${b.type ? '/' + b.type : ''}`;
                    const dataStr = b.data ? ` data=${tr(JSON.stringify(b.data), 200)}` : '';
                    console.log(`  ${ts} [${bit}] ${b.level ?? '?'} :: ${tr(b.message, 180)}${dataStr}`);
                }
            } else {
                console.log('\nBREADCRUMBS: (cero)');
            }

            // Exception (por si aparece).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const excEntry = (ev.entries ?? []).find((e: any) => e.type === 'exception');
            if (excEntry) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                for (const exc of (excEntry.data?.values ?? [])) {
                    console.log(`\nEXCEPTION: ${exc.type} :: ${tr(exc.value, 200)}`);
                }
            }
        } catch (err) {
            console.log(`  FETCH FAILED: ${(err as Error).message.slice(0, 200)}`);
        }
    }
}

main().catch(e => { console.error('[fatal]', e); process.exit(1); });
