/** @type {import('next').NextConfig} */
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
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://ouezpeeiwjwawauidrqq.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://ui-avatars.com https://ouezpeeiwjwawauidrqq.supabase.co https://pwhplhjkmmbgnphcoibh.supabase.co https://images.pexels.com https://images.unsplash.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://ouezpeeiwjwawauidrqq.supabase.co wss://ouezpeeiwjwawauidrqq.supabase.co; frame-ancestors 'none';"
          }
        ]
      }
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

module.exports = nextConfig;