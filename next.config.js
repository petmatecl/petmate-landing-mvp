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