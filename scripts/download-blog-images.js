// scripts/download-blog-images.js
// Descarga + optimiza las 9 imágenes Unsplash a public/blog/<slug>.jpg
// Uso: node scripts/download-blog-images.js
//
// La captura de pantalla de "como-publicar-en-pawnecta.jpg" se hace aparte
// (Playwright MCP) porque requiere browser.

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

// URLs del PO, con w=500 → reemplazar por w=1600
const IMAGES = [
    { slug: 'como-elegir-paseador',       url: 'https://images.unsplash.com/photo-1494947665470-20322015e3a8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
    { slug: 'que-buscar-guarderia',       url: 'https://images.unsplash.com/photo-1787152467585-3b6a11777ebd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
    { slug: 'hoteles-para-mascota',       url: 'https://images.unsplash.com/photo-1516222338250-863216ce01ea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
    { slug: 'viajas',                     url: 'https://images.unsplash.com/photo-1581553738617-14ac063e3ba5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
    { slug: 'mas-que-compania',           url: 'https://plus.unsplash.com/premium_photo-1661962407604-711dda73e4d1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
    { slug: 'registro-nacional-mascotas', url: 'https://plus.unsplash.com/premium_photo-1683134006899-50a97a0330cc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
    { slug: 'mitos-y-verdades',           url: 'https://images.unsplash.com/photo-1610705975766-fd3e537bb782?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
    { slug: 'golpe-de-calor',             url: 'https://images.unsplash.com/photo-1787305282659-dc2ad5871147?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
    { slug: 'cuidados-esenciales',        url: 'https://plus.unsplash.com/premium_photo-1661916447474-235409b19e16?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D' },
];

const OUT_DIR = path.join(__dirname, '..', 'public', 'blog');

function fetchBuffer(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'pawnecta-blog-downloader' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchBuffer(res.headers.location));
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(30_000, () => { req.destroy(new Error('timeout')); });
    });
}

async function main() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    const results = [];

    for (const { slug, url } of IMAGES) {
        const hiresUrl = url.replace(/([?&])w=500(&|$)/, '$1w=1600$2');
        process.stdout.write(`[${slug}] fetching ${hiresUrl.slice(0, 80)}…\n`);
        try {
            const buf = await fetchBuffer(hiresUrl);
            const outPath = path.join(OUT_DIR, `${slug}.jpg`);
            const info = await sharp(buf)
                .resize(1600, null, { withoutEnlargement: true })
                .jpeg({ quality: 82, progressive: true, mozjpeg: true })
                .toFile(outPath);
            const kb = Math.round(info.size / 1024);
            results.push({ slug, ok: true, size_kb: kb, w: info.width, h: info.height });
            process.stdout.write(`[${slug}] ✓ ${info.width}x${info.height} · ${kb}KB\n`);
        } catch (err) {
            results.push({ slug, ok: false, err: err.message });
            process.stdout.write(`[${slug}] ✗ ${err.message}\n`);
        }
    }

    console.log('\n=== Summary ===');
    console.log(JSON.stringify(results, null, 2));
    const failed = results.filter((r) => !r.ok);
    process.exit(failed.length ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(2); });
