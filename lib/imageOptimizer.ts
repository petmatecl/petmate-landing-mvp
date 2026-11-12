// lib/imageOptimizer.ts
// ---------------------------------------------------------------------------
// Sprint perf-ficha (2026-11-12) — detectar hosts que YA entregan imágenes
// optimizadas (Unsplash + Pexels + similares). Para esos hosts conviene
// pasar `unoptimized` a next/image para evitar DOUBLE ENCODING:
//
//   Default next/image (en server Node):
//     fetch(src) → recibe JPEG baseline (porque Node no envía
//     Accept: image/webp)
//     → re-encode a WebP q=75 → sirve al browser.
//
//   Con unoptimized=true:
//     browser pide src directo → Unsplash/Pexels decide por Accept del
//     browser (image/webp, image/avif, etc) → sirve el formato óptimo
//     de UNA sola compresión.
//
// Observado en Lighthouse + smoke PO 2026-11-12: el avatar Unsplash
// `?w=400` de Eduardo C. se veía pixelado con double-encoding, nítido
// con unoptimized=true. Las fotos Unsplash con `?w=1200` también se
// benefician (menor overhead, mejor calidad perceptual).
//
// Supabase Storage NO está en la lista: nuestras fotos uploaded por
// proveedores son full-res (1-2 MB JPEG) y SÍ se benefician del
// optimizer de next/image (WebP + srcset responsive). Esto es el caso
// típico en prod — la whitelist de hosts es para los pocos casos
// Unsplash/Pexels remanentes.
// ---------------------------------------------------------------------------

/** Hosts que ya entregan imágenes optimizadas (WebP/AVIF, resize dinámico
 *  por query params). Para estos, pasa `unoptimized` a next/image para
 *  evitar doble compresión. */
const PRE_OPTIMIZED_HOSTS: ReadonlyArray<string> = [
    'images.unsplash.com',
    'images.pexels.com',
];

/** True si la URL source es de un host que ya entrega imágenes
 *  optimizadas. Robusto contra URLs mal formadas (no-URL → false). */
export function isPreOptimizedHost(src: string | null | undefined): boolean {
    if (!src || typeof src !== 'string') return false;
    try {
        const u = new URL(src);
        return PRE_OPTIMIZED_HOSTS.includes(u.hostname);
    } catch {
        return false;
    }
}
