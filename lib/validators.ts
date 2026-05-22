// lib/validators.ts
// ----------------------------------------------------------------------------
// Validators / normalizers reutilizables para campos de perfil de proveedor.
// Centralizan logica que antes vivia inline en formularios (con asimetrias
// entre registro y edicion). Ver Sprint 2 commit b.
// ----------------------------------------------------------------------------

/**
 * Normaliza una URL: agrega https:// si falta protocolo, valida con
 * new URL(). Retorna null si invalida.
 *
 * Ejemplos:
 *   "midominio.cl"             -> "https://midominio.cl"
 *   "http://midominio.cl"      -> "http://midominio.cl"
 *   "https://midominio.cl/p"   -> "https://midominio.cl/p"
 *   "lookatme"                 -> null (sin TLD)
 *   ""                         -> null
 */
export function normalizeUrl(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(withProtocol);
        // Filtrar URLs sin punto en el host (ej. "https://lookatme") que
        // pasan new URL() pero no son dominios reales.
        if (!url.hostname.includes('.')) return null;
        return url.href.replace(/\/$/, '');
    } catch {
        return null;
    }
}

/**
 * Normaliza un telefono chileno a formato canonico +569XXXXXXXX.
 * Acepta: +569XXXXXXXX, 569XXXXXXXX, 9XXXXXXXX, con/sin separadores.
 * Retorna null si invalido.
 *
 * Ejemplos:
 *   "+56912345678"   -> "+56912345678"
 *   "56912345678"    -> "+56912345678"
 *   "912345678"      -> "+56912345678"
 *   "9 1234 5678"    -> "+56912345678"
 *   "+56 9 1234-5678"-> "+56912345678"
 *   "abc"            -> null
 *   ""               -> null
 */
export function normalizeChileanPhone(input: string | null | undefined): string | null {
    if (!input) return null;
    const digits = input.replace(/\D/g, '');
    if (digits.length === 9 && digits.startsWith('9')) return `+56${digits}`;
    if (digits.length === 11 && digits.startsWith('569')) return `+${digits}`;
    if (digits.length === 12 && digits.startsWith('569')) return `+${digits}`;
    return null;
}

/**
 * Normaliza un input de Instagram a URL canonico https://instagram.com/{user}.
 * Acepta: @usuario, instagram.com/usuario, URL completa, solo usuario.
 * Retorna null si el username no matchea formato valido.
 *
 * Ejemplos:
 *   "@mi_cuenta"                          -> "https://instagram.com/mi_cuenta"
 *   "instagram.com/mi_cuenta"             -> "https://instagram.com/mi_cuenta"
 *   "https://www.instagram.com/mi_cuenta/" -> "https://instagram.com/mi_cuenta"
 *   "mi_cuenta"                           -> "https://instagram.com/mi_cuenta"
 *   "user with spaces"                    -> null
 *   ""                                    -> null
 */
export function normalizeInstagram(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim().replace(/^@/, '');
    if (!trimmed) return null;
    const urlMatch = trimmed.match(/instagram\.com\/([^/?#]+)/i);
    const username = (urlMatch ? urlMatch[1] : trimmed).replace(/\/$/, '');
    if (!/^[a-zA-Z0-9._]+$/.test(username)) return null;
    return `https://instagram.com/${username}`;
}

/**
 * Normaliza un input de Facebook a URL canonica https://facebook.com/{handle}.
 * Acepta: handle, facebook.com/handle, URL completa con o sin www. Vacio -> null.
 *
 * Ejemplos:
 *   "mi.pagina"                                 -> "https://facebook.com/mi.pagina"
 *   "facebook.com/mi.pagina"                    -> "https://facebook.com/mi.pagina"
 *   "https://www.facebook.com/mi.pagina/"       -> "https://facebook.com/mi.pagina"
 *   "user with spaces"                          -> null
 *   ""                                          -> null
 */
export function normalizeFacebook(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim().replace(/^@/, '');
    if (!trimmed) return null;
    const urlMatch = trimmed.match(/facebook\.com\/([^/?#]+)/i);
    const handle = (urlMatch ? urlMatch[1] : trimmed).replace(/\/$/, '');
    if (!/^[a-zA-Z0-9.\-_]+$/.test(handle)) return null;
    return `https://facebook.com/${handle}`;
}

/**
 * Normaliza un input de TikTok a URL canonica https://tiktok.com/@{handle}.
 * Acepta: @usuario, usuario, tiktok.com/@usuario, URL completa. Vacio -> null.
 *
 * Ejemplos:
 *   "@mi_cuenta"                       -> "https://tiktok.com/@mi_cuenta"
 *   "mi_cuenta"                        -> "https://tiktok.com/@mi_cuenta"
 *   "https://tiktok.com/@mi_cuenta/"   -> "https://tiktok.com/@mi_cuenta"
 *   "user with spaces"                 -> null
 *   ""                                 -> null
 */
export function normalizeTiktok(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim().replace(/^@/, '');
    if (!trimmed) return null;
    const urlMatch = trimmed.match(/tiktok\.com\/@?([^/?#]+)/i);
    const handle = (urlMatch ? urlMatch[1] : trimmed).replace(/^@/, '').replace(/\/$/, '');
    if (!/^[a-zA-Z0-9._]+$/.test(handle)) return null;
    return `https://tiktok.com/@${handle}`;
}

/**
 * Normaliza un input de YouTube. Acepta handles modernos (@channel) y URLs
 * de canal (/c/, /channel/, /user/, /@). Vacio -> null.
 *
 * Ejemplos:
 *   "@micanal"                                  -> "https://youtube.com/@micanal"
 *   "youtube.com/@micanal"                      -> "https://youtube.com/@micanal"
 *   "https://www.youtube.com/@micanal/videos"   -> "https://youtube.com/@micanal"
 *   "https://youtube.com/channel/UC123"         -> "https://youtube.com/channel/UC123"
 *   "https://youtube.com/c/MiCanal"             -> "https://youtube.com/c/MiCanal"
 *   "user with spaces"                          -> null
 *   ""                                          -> null
 */
export function normalizeYoutube(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    // URLs de canal (channel/user/c) las preservamos tal cual, sin colapsar a @.
    const canonical = trimmed.match(/youtube\.com\/(channel|user|c)\/([^/?#]+)/i);
    if (canonical) {
        const seg = canonical[2].replace(/\/$/, '');
        if (/^[a-zA-Z0-9._\-]+$/.test(seg)) {
            return `https://youtube.com/${canonical[1].toLowerCase()}/${seg}`;
        }
        return null;
    }

    // Handle moderno @user (con o sin URL).
    const noAt = trimmed.replace(/^@/, '');
    const handleMatch = noAt.match(/youtube\.com\/@?([^/?#]+)/i);
    const handle = (handleMatch ? handleMatch[1] : noAt).replace(/^@/, '').replace(/\/$/, '');
    if (!/^[a-zA-Z0-9._\-]+$/.test(handle)) return null;
    return `https://youtube.com/@${handle}`;
}

/**
 * Extrae el username de una URL de Instagram para mostrar como @usuario
 * en la ficha publica. Retorna null si no hay match.
 *
 * Ejemplo:
 *   "https://instagram.com/mi_cuenta" -> "mi_cuenta"
 *   "mi_cuenta"                       -> "mi_cuenta" (fallback)
 *   null                              -> null
 */
export function instagramUsernameFromUrl(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim().replace(/^@/, '');
    if (!trimmed) return null;
    const urlMatch = trimmed.match(/instagram\.com\/([^/?#]+)/i);
    const username = (urlMatch ? urlMatch[1] : trimmed).replace(/\/$/, '');
    return /^[a-zA-Z0-9._]+$/.test(username) ? username : null;
}
