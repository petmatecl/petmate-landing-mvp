/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/_offline',
  },
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["ui-avatars.com", "vubmjguwzpesxcgenkxo.supabase.co", "pwhplhjkmmbgnphcoibh.supabase.co", "images.pexels.com", "images.unsplash.com"],
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
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://www.google-analytics.com",
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

module.exports = withPWA(nextConfig);