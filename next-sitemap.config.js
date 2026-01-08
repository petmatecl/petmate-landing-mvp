/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://www.pawnecta.com',
    generateRobotsTxt: true,
    // Exclude private and auth pages
    exclude: [
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
        '/register'
    ],
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/usuario', '/sitter', '/sitter/explorar', '/login', '/register', '/api/*']
            }
        ]
    }
}
