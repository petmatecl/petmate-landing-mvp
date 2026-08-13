/** @type {import('next').NextConfig} */
// PWA activo SOLO en prod real. En preview/staging Vercel y build local
// sin VERCEL_ENV, el SW se desactiva y `scripts/write-sw-demolisher.js`
// (hook prebuild en package.json) escribe un sw.js auto-destructivo que
// reemplaza a cualquier SW previo en el próximo update-check del browser.
// Ver CLAUDE.md > PWA / Service Worker para detalles.
//
// N3 tren N15 (2026-07-30): swap `next-pwa@5.6.0` → `@ducanh2912/next-pwa@10.2.9`
// (fork mantenido, drop-in). Ajustes de API entre 5.x y 10.x:
//   - Import cambia: `require('next-pwa')` → `require('@ducanh2912/next-pwa').default`.
//   - `skipWaiting` no es top-level en v10.x — se mueve a `workboxOptions.skipWaiting`.
//   - `dest`, `disable`, `register`, `fallbacks` sin cambio (misma semántica).
// Doc: https://ducanh-next-pwa.vercel.app/docs/next-pwa/getting-started
const IS_PROD = process.env.NEXT_PUBLIC_APP_ENV === 'production'
             || process.env.VERCEL_ENV === 'production';
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' || !IS_PROD,
  register: true,
  workboxOptions: {
    skipWaiting: true,
  },
  fallbacks: {
    document: '/_offline',
  },
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    // N2 tren N15 (2026-07-30): migrado de `images.domains` (deprecado en
    // Next 15) a `images.remotePatterns`. Doc: https://nextjs.org/docs/app/api-reference/components/image#remotepatterns
    // Cada entry acota host + protocolo; `pathname: '/**'` mantiene la
    // permisividad del array `domains` viejo (cualquier ruta dentro del host).
    remotePatterns: [
      { protocol: 'https', hostname: 'ui-avatars.com', pathname: '/**' },
      { protocol: 'https', hostname: 'vubmjguwzpesxcgenkxo.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: 'pwhplhjkmmbgnphcoibh.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.pexels.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Content Security Policy — fix #15 del audit 1bc1897. El CSP
          // original (commit 1bc1897) fue removido en 5c05b22/e135d1e por
          // bloquear cross-origin images. Esta version reintroduce el
          // header con whitelist precisa de orígenes que la app
          // efectivamente usa (mapas Leaflet, Supabase storage, blog
          // images, Google Fonts, GA, Nominatim). Ver CLAUDE.md §
          // "Content Security Policy" para el procedimiento de agregar
          // nuevos orígenes cuando se integre un CDN/API.
          //
          // 'unsafe-inline' + 'unsafe-eval' en script-src se mantienen
          // por simplicidad operacional (Next.js bootstrap + react-leaflet).
          // Migracion a nonces queda como mejora futura (requiere
          // middleware Next).
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://images.pexels.com https://ui-avatars.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://cdnjs.cloudflare.com https://firebasestorage.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              // connect-src cubre fetch/XHR/WebSocket/beacon — Y los fetch() que
              // el service worker (next-pwa workbox) hace internamente cuando
              // intercepta requests para cachearlos. Por eso debe espejar las
              // origenes de img-src/font-src/script-src para no romper el SW
              // runtime caching ni las llamadas internas de gtag.js.
              // Bug latente desde bfc6b31 — refresh del SW en el deploy de
              // hoy invalido cache y expuso el problema a todos los users.
              [
                "connect-src 'self'",
                // Supabase REST + Realtime
                "https://*.supabase.co",
                "wss://*.supabase.co",
                // Geocoding
                "https://nominatim.openstreetmap.org",
                // Analytics — explicito + wildcard regional GA4 + dominio analytics
                "https://www.googletagmanager.com",
                "https://*.google-analytics.com",
                "https://analytics.google.com",
                // Imagenes (mirror de img-src para que el SW pueda cachear)
                "https://images.unsplash.com",
                "https://images.pexels.com",
                "https://ui-avatars.com",
                "https://*.basemaps.cartocdn.com",
                "https://*.tile.openstreetmap.org",
                "https://cdnjs.cloudflare.com",
                "https://firebasestorage.googleapis.com",
                // Fuentes (preventivo — si el SW cachea via fetch())
                "https://fonts.gstatic.com",
                "https://fonts.googleapis.com",
                // Sentry ingest — R3 SENTRY-1 hotfix CSP (2026-08-11). El SDK
                // client envia envelope POST a
                // https://o<orgId>.ingest.us.sentry.io/api/<projectId>/envelope
                // via fetch() desde el main thread del navegador (Sentry v10 NO
                // usa Web Workers para el envio; por eso worker-src no requiere
                // cambio). Wildcard *.ingest.us.sentry.io acotado a la region
                // US (nuestra org es US, decidido en el setup R3 por consistencia
                // con Vercel/Supabase/Resend). Sin este entry, TODOS los errores
                // client-side eran cortados por CSP antes de salir — sintoma
                // observado en /admin post-merge sentry-1-prod-20260811.
                "https://*.ingest.us.sentry.io",
              ].join(' '),
              "media-src 'self'",
              "worker-src 'self'",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; ')
          },
        ]
      },
      // Cache-busting del Service Worker. Vercel por default cachea statics
      // agresivamente; sin no-cache aca, /sw.js puede quedar pegado en la
      // CDN o en el browser y los users nunca detectan un deploy nuevo
      // aunque skipWaiting + NetworkFirst estén bien configurados.
      // /sw.js es URL estable (no content-hashed): siempre revalidar.
      // /workbox-:hash.js es content-hashed (cambia con next-pwa version),
      // pero aplicamos la misma policy como cinturon de seguridad.
      // Ver CLAUDE.md > PWA / Service Worker.
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/workbox-:hash',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ]
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.pawnecta.cl',
          },
        ],
        destination: 'https://www.pawnecta.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'pawnecta.cl',
          },
        ],
        destination: 'https://www.pawnecta.com/:path*',
        permanent: true,
      },
      {
        source: '/usuario',
        destination: '/explorar',
        permanent: false,
      },
      // Sprint Categorias: legacy SEO landing pages de `hospedaje` y
      // `visita-domicilio` se unificaron en `cuidado`. 301 (permanent)
      // para que Google traslade el ranking de las paginas legacy a la
      // nueva canonica. Defensivo: tambien atrapamos `/domicilio` por
      // si algun enlace externo usa el slug interno de DB en vez del
      // SEO slug.
      { source: '/hospedaje', destination: '/cuidado', permanent: true },
      { source: '/hospedaje/:comuna', destination: '/cuidado/:comuna', permanent: true },
      { source: '/visita-domicilio', destination: '/cuidado', permanent: true },
      { source: '/visita-domicilio/:comuna', destination: '/cuidado/:comuna', permanent: true },
      { source: '/domicilio', destination: '/cuidado', permanent: true },
      { source: '/domicilio/:comuna', destination: '/cuidado/:comuna', permanent: true },
      // Batch REMATE-1 R2b (2026-08-11) — Rename ruta /mis-solicitudes → /mis-reservas.
      // Cierre limpio de la taxonomía RESERVA que se aplicó en heading/title/nav
      // durante sweep #3 (2026-08-04). El 301 permanente preserva bookmarks +
      // deep links históricos + emails ya enviados + indexación Google. La query
      // string se preserva por default en Next.js redirects.
      { source: '/mis-solicitudes', destination: '/mis-reservas', permanent: true },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/supabase-proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'}/:path*`,
      },
    ]
  },
};

// Sprint R3 SENTRY-1 (2026-08-11) — wrapper Sentry alrededor de PWA.
//
// Orden importa: PWA envuelve nextConfig primero, Sentry envuelve todo por
// fuera. Así Sentry ve el config resuelto post-PWA y puede inyectar sus
// hooks de webpack para instrumentación + upload de sourcemaps sin
// interferir con la generación del service worker por next-pwa.
//
// Opciones del wrapper — todas conservadoras:
//   - silent: true   → no ensuciar los logs del build local con mensajes
//                      Sentry (los errores reales de config sí se muestran).
//   - authToken      → solo si está seteado en el env. Sin él, el upload de
//                      sourcemaps se skippea silente (stacktraces se ven
//                      minificados en Sentry pero el build no falla).
//   - hideSourceMaps → true evita que los .map se sirvan al público desde
//                      /_next/static/*.js.map (privacidad — evita que un
//                      atacante lea el source completo de la app).
//   - disableLogger  → true para que el bundle no incluya el logger console
//                      de Sentry (~2 kB menos + no polluir DevTools de users).
//   - widenClientFileUpload → true para asegurar que el server bundle
//                      también suba sourcemaps (necesario para stacktraces
//                      server-side legibles).
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(withPWA(nextConfig), {
  org: 'pawnecta',
  project: 'javascript-nextjs',

  silent: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
  disableLogger: true,
  widenClientFileUpload: true,

  // Tunnel deshabilitado — usar el endpoint directo de Sentry. Si en el
  // futuro un ad-blocker rompe los eventos client-side, habilitar `tunnelRoute`
  // como '/monitoring' y Sentry generará un proxy en pages/api/monitoring.
});