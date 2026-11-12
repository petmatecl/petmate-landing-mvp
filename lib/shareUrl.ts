// lib/shareUrl.ts
// ---------------------------------------------------------------------------
// Sprint share-prov (2026-11-12) — helpers compartidos para OG image y URL
// absoluta canónica, usados por el meta tag <meta property="og:image"> de
// las fichas públicas (/servicio/[id] y /proveedor/[id]).
//
// Alcance aprobado PO 2026-11-11:
//   - og:image NO usa la foto original (966 KB – 2 MB JPEG) porque los
//     crawlers de WhatsApp/Facebook suelen no mostrar previews pesadas.
//     Usa la versión optimizada vía `/_next/image?url=<encoded>&w=1200`.
//   - URL absoluta base siempre `https://www.pawnecta.com` (no depender
//     de VERCEL_URL que varía por preview).
//   - Declara og:image:width=1200 + og:image:height=630 (ratio 1.9:1
//     esperado por WhatsApp/Twitter). Las fotos source son ~4:3 — el
//     crawler recorta por default; la declaración orienta el ratio.
// ---------------------------------------------------------------------------

/** Base canónica de prod. */
export const CANONICAL_HOST = 'https://www.pawnecta.com';

/**
 * Transforma una URL source absoluta (Supabase Storage, etc.) en una URL
 * de /_next/image absoluta (prod) que sirve la imagen optimizada.
 *
 * Fallback: si `src` es null/undefined, devuelve el og:image estático
 * del sitio (/og-image.jpg).
 *
 * El output siempre apunta a `https://www.pawnecta.com/_next/image?url=...`
 * (host prod canónico), no al preview. En preview Vercel el meta tag
 * existe correctamente pero el crawler externo no puede acceder (el
 * preview tiene deployment protection). Esto es intencional: el OG real
 * se verifica contra prod, no contra preview.
 *
 * @param src URL source absoluta (ej. Supabase Storage).
 * @param w Ancho máximo del output (default 1200, ratio 1.9:1 con h=630).
 */
export function getOgImageUrl(src: string | null | undefined, w = 1200): string {
    if (!src) {
        return `${CANONICAL_HOST}/og-image.jpg`;
    }
    const encoded = encodeURIComponent(src);
    return `${CANONICAL_HOST}/_next/image?url=${encoded}&w=${w}&q=75`;
}

/**
 * URL absoluta canónica de una ruta interna, usada para `og:url` y
 * para los shares (clipboard, WhatsApp, share nativo).
 *
 * @param path Ruta interna ej. "/servicio/<uuid>" (con leading slash).
 */
export function getCanonicalUrl(path: string): string {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${CANONICAL_HOST}${clean}`;
}
