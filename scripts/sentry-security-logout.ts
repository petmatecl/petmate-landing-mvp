import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
const TOKEN = process.env.SENTRY_AUTH_TOKEN!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(p: string): Promise<any> {
    const r = await fetch(`https://sentry.io/api/0${p}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error(`${r.status} on ${p}`);
    return r.json();
}
async function main() {
    // Sentry issues con url o transaction que incluya 'security-logout'
    for (const term of ['transaction:*security-logout*', 'transaction:/security-logout', 'url:*security-logout*', '"security-logout"', 'message:*security_logout*']) {
        const q = encodeURIComponent(term);
        try {
            const rows = await api(`/projects/pawnecta/javascript-nextjs/issues/?query=${q}&statsPeriod=14d&limit=15`);
            console.log(`\n[${term}] → ${rows.length} issues`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const i of rows as any[]) {
                console.log(`  ${i.shortId} | ${i.title.slice(0,80)} | ${i.culprit} | count=${i.count} users=${i.userCount} last=${i.lastSeen}`);
            }
        } catch (e) { console.log(`  [error] ${(e as Error).message.slice(0,120)}`); }
    }
}
main().catch(e => { console.error('[fatal]', e); process.exit(1); });
