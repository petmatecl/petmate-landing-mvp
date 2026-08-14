// lib/carnetUrl.ts
// ----------------------------------------------------------------------------
// Sprint Ola-1 A1 (2026-08-14) — helper para resolver la URL de carnet en el
// panel admin. Fix del bug documentado en CLAUDE.md > Bugs conocidos:
//   El bucket `documents` es privado (verificado por probe). Antes se guardaba
//   `getPublicUrl()` en BD que genera URLs cosméticamente "públicas" pero
//   inválidas para bucket privado → admin ve <img> roto al aprobar proveedor
//   → verificación de identidad rota.
//
// Fix con backward-compat: extraer el path del valor guardado en BD (sea URL
// vieja o path directo del formato nuevo) y generar signed URL de corta
// duración. Signed URLs válidas hasta 5 min es suficiente para el admin —
// no se comparten, expiran, no quedan en caches CDN.
//
// El upload nuevo (a partir de este sprint) guardará solo el PATH en BD, no
// la URL. Los proveedores ya registrados con URL antigua siguen funcionando
// vía el extractor de path del pattern `/storage/v1/object/public/documents/`.
// ----------------------------------------------------------------------------
import { supabase } from './supabaseClient';

const BUCKET = 'documents';
const SIGNED_URL_TTL_SECONDS = 300; // 5 min — suficiente para admin mirando

/**
 * Extrae el path relativo al bucket `documents` desde un valor guardado en
 * BD. Handleja 3 formatos:
 *   1. URL pública vieja: `https://<ref>.supabase.co/storage/v1/object/public/documents/<path>`
 *   2. URL firmada vieja (posible): `https://<ref>.supabase.co/storage/v1/object/sign/documents/<path>?token=...`
 *   3. Path directo nuevo: `carnets/<user_id>/carnet.jpg`
 *
 * Retorna null si no matchea ninguno (input inválido).
 */
export function extractCarnetPath(value: string | null | undefined): string | null {
    if (!value) return null;
    // Formato 3: path directo (no empieza con http)
    if (!value.startsWith('http')) return value;
    // Formato 1 o 2: URL con `/documents/` en el path
    const match = value.match(/\/(?:public|sign)\/documents\/([^?]+)/);
    return match ? match[1] : null;
}

/**
 * Genera signed URL de corta duración para renderizar en el panel admin.
 * Retorna null si el value es inválido o si Supabase rechaza (ej. archivo
 * no existe en storage). El caller debe mostrar fallback en null.
 */
export async function getCarnetSignedUrl(value: string | null | undefined): Promise<string | null> {
    const path = extractCarnetPath(value);
    if (!path) return null;
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
}
