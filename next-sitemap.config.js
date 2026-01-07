/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://www.pawnecta.cl',
    generateRobotsTxt: true,
    // Exclude private and auth pages
    exclude: [
        '/admin*',
        '/cliente*',
        '/sitter',
        '/sitter/explorar',
        '/sitter/reviews',
        '/email-confirmado',
        '/registro-exitoso',
        '/reset-password',
        '/forgot-password',
        '/security-logout'
    ],
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/cliente', '/sitter', '/sitter/explorar', '/api/*']
            }
        ]
    }
}
