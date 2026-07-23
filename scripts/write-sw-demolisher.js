// scripts/write-sw-demolisher.js
// ---------------------------------------------------------------------------
// Corre como `prebuild` (hook npm). Escribe un Service Worker DEMOLEDOR en
// public/sw.js SOLO cuando el build es no-prod (staging/preview Vercel, o
// build local sin VERCEL_ENV). En prod real, no toca nada — next-pwa se
// encarga de generar el sw.js real durante `next build` (workbox), que
// sobreescribe cualquier archivo previo.
//
// Motivo: la Opción A del audit del SW desactiva next-pwa en no-prod, pero
// eso deja huérfanos a los browsers que ya tienen un SW previo registrado
// de un build anterior — su next update-check pega en 404, y algunos
// browsers mantienen el SW viejo indefinidamente sirviendo precache stale.
// El demoledor se instala en su lugar en el próximo update-check, ejecuta
// unregister + purga de caches + navega la tab una vez, y queda todo
// limpio para siempre.
//
// La ruta /sw.js sigue con Cache-Control: max-age=0, must-revalidate
// (next.config.js:headers) — el browser SIEMPRE re-chequea, así que el
// reemplazo por el demoledor es rápido (siguiente navigation real o
// visibilitychange).
//
// Idempotente: correr N veces produce el mismo archivo. En Vercel, cada
// build parte de filesystem limpio, así que este script es el único que
// puede escribir sw.js en no-prod builds. En local, si el usuario tenía
// un sw.js viejo de un `npm run build` prod previo, lo sobreescribe.
// ---------------------------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');

const IS_DEV = process.env.NODE_ENV === 'development';
// Mismo patrón que lib/cronGuard.ts + lib/resend.ts para "estoy en prod?".
const IS_PROD = process.env.NEXT_PUBLIC_APP_ENV === 'production'
             || process.env.VERCEL_ENV === 'production';

if (IS_DEV) {
    console.log('[write-sw-demolisher] Skipping (dev environment).');
    process.exit(0);
}

if (IS_PROD) {
    console.log('[write-sw-demolisher] Skipping (prod build — next-pwa emits real sw.js).');
    process.exit(0);
}

// Build no-prod (staging/preview Vercel, o local sin VERCEL_ENV).
// Escribimos el demoledor + limpiamos workbox-*.js legacy.
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
    console.warn('[write-sw-demolisher] public/ no existe, saltando.');
    process.exit(0);
}

const demolisherSource = `// AUTO-GENERADO por scripts/write-sw-demolisher.js — NO EDITAR.
//
// SW demoledor para builds no-prod (staging/preview). Cuando el browser
// re-chequea /sw.js y encuentra este archivo, lo instala en lugar del SW
// workbox previo. En 'activate' purga todos los caches y unregister la
// propia registration; luego navega cada tab abierta para que la próxima
// carga sea sin SW registrado.
//
// Post-instalación, cualquier tab bootea con SPA puro sin cache runtime
// de SW — los deploys se ven al toque via router.push, sin hard-refresh.
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {
            // Best-effort — si falla la purga, seguimos con unregister.
        }
        try {
            await self.registration.unregister();
        } catch (e) {
            // idem
        }
        try {
            const clientList = await self.clients.matchAll({ type: 'window' });
            for (const client of clientList) {
                // Refresh de la tab abierta para arrancar sin SW registrado
                // ni cache runtime. Sin esto, la tab actual sigue con el
                // estado pre-demoledor hasta que el user recarge manual.
                client.navigate(client.url);
            }
        } catch (e) {
            // idem
        }
    })());
});

self.addEventListener('fetch', () => {
    // No-op: el demoledor no intercepta requests. Todo va a network.
});
`;

const swPath = path.join(publicDir, 'sw.js');
fs.writeFileSync(swPath, demolisherSource, 'utf8');
console.log(`[write-sw-demolisher] wrote ${swPath} (${demolisherSource.length} bytes).`);

// Limpiar workbox-*.js legacy que pueden haber quedado de un build previo.
let cleaned = 0;
for (const entry of fs.readdirSync(publicDir)) {
    if (/^workbox-.*\.js$/.test(entry) || /^worker-.*\.js$/.test(entry) || /^fallback-.*\.js$/.test(entry)) {
        try {
            fs.unlinkSync(path.join(publicDir, entry));
            cleaned++;
        } catch (e) {
            console.warn(`[write-sw-demolisher] no pude borrar ${entry}:`, e.message);
        }
    }
}
if (cleaned > 0) {
    console.log(`[write-sw-demolisher] purged ${cleaned} legacy workbox/worker/fallback files.`);
}
