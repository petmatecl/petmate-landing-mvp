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
