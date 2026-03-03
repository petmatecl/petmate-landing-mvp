/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://www.pawnecta.com',
    generateRobotsTxt: true,
    exclude: [
        '/docs/*',
        '/styleguide',
        '/api/*',
        '/admin*',
        '/usuario*',
        '/sitter',
        '/sitter/explorar',
        '/sitter/reviews',
        '/email-confirmado',
        '/registro-exitoso',
        '/reset-password',
        '/forgot-password',
        '/security-logout',
        '/login',
        '/register',
        '/proveedor', // dashboard privado
        '/mensajes',
    ],
    additionalPaths: async (config) => {
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            const { data: servicios } = await supabase
                .from('servicios_publicados')
                .select('id, updated_at')
                .eq('activo', true);

            return (servicios || []).map((s) => ({
                loc: '/servicio/' + s.id,
                changefreq: 'weekly',
                priority: 0.8,
                lastmod: s.updated_at,
            }));
        } catch (err) {
            console.error('[next-sitemap] Error fetching servicios:', err);
            return [];
        }
    },
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/usuario', '/proveedor', '/mensajes', '/sitter', '/login', '/register', '/api/*'],
            },
        ],
    },
};
