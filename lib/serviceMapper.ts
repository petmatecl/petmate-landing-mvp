// lib/serviceMapper.ts
// Central mapping between Supabase RPC / join-query shapes and ServiceCard's ServiceResult interface.

import { ServiceResult } from '../components/Explore/ServiceCard';

/** Slug → human-readable name (mirror of STATIC_CATEGORIES in explorar.tsx) */
const CAT_NAMES: Record<string, string> = {
    hospedaje: 'Hospedaje',
    guarderia: 'Guardería Diurna',
    paseos: 'Paseo de Perros',
    peluqueria: 'Peluquería',
    traslado: 'Traslado',
    veterinario: 'Veterinario a Domicilio',
    adiestramiento: 'Adiestramiento',
    domicilio: 'Cuidado a Domicilio',
};

/**
 * Convierte una ruta de Supabase Storage a URL pública completa.
 * Si ya es una URL completa (http/https), la devuelve sin cambios.
 *
 * Buckets:
 *  - avatars        → fotos de perfil de proveedores
 *  - servicios-fotos → fotos de servicios publicados
 *
 * Las rutas guardadas en la DB pueden empezar con el bucket o sin él:
 *   "avatars/uuid/foto.jpg"    → ya incluye bucket → usar directo
 *   "uuid/foto.jpg"            → sin bucket → defaults a servicios-fotos para fotos[] de servicio
 */
function toPublicUrl(path: string | null | undefined, defaultBucket = 'servicios-fotos'): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path; // ya es URL completa
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    if (!base) return null;
    // Si la ruta empieza con un nombre de bucket conocido, usarlo directo
    const KNOWN_BUCKETS = ['avatars', 'servicios-fotos', 'documents'];
    const bucket = KNOWN_BUCKETS.find(b => path.startsWith(b + '/'));
    if (bucket) {
        const filePath = path.slice(bucket.length + 1); // quitar "bucket/"
        return `${base}/storage/v1/object/public/${bucket}/${filePath}`;
    }
    // Sin prefijo de bucket → usar defaultBucket
    return `${base}/storage/v1/object/public/${defaultBucket}/${path}`;
}

function toPublicUrls(fotos: string[] | null | undefined): string[] {
    if (!fotos || fotos.length === 0) return [];
    return fotos.map(f => toPublicUrl(f, 'servicios-fotos')).filter(Boolean) as string[];
}

/**
 * Maps a raw row from the buscar_servicios RPC to ServiceResult.
 * RPC returns: id, nombre, apellido_p, foto_perfil, comuna, categoria_slug, ...
 */
export function mapRpcToServiceResult(item: any): ServiceResult {
    // Defensive swap: some DB overloads return nombre/slug in wrong columns
    let rawSlug: string = item.categoria_slug ?? '';
    let rawNombre: string = item.categoria_nombre ?? '';

    // If slug looks like a price unit and nombre looks like a real category name,
    // they are swapped — correct immediately.
    const PRICE_PATTERN = /^por /i;
    if (PRICE_PATTERN.test(rawSlug) && !PRICE_PATTERN.test(rawNombre)) {
        [rawSlug, rawNombre] = [rawNombre, rawSlug]; // swap back
    }

    // Normalise slug to a known key (CAT_NAMES uses lowercase slugs)
    const slug = (CAT_NAMES[rawSlug] ? rawSlug : rawSlug.toLowerCase().replace(/\s+/g, '-')).replace(/ /g, '-');
    const catNombre = (PRICE_PATTERN.test(rawNombre) ? null : rawNombre) ?? CAT_NAMES[slug] ?? slug;

    return {
        servicio_id: item.servicio_id ?? item.id,
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio_desde: Number(item.precio_desde ?? 0),
        precio_hasta: item.precio_hasta ?? null,
        unidad_precio: item.unidad_precio ?? 'por sesión',
        fotos: toPublicUrls(item.fotos),
        categoria_nombre: catNombre,
        categoria_slug: slug,
        categoria_icono: item.categoria_icono ?? '',
        proveedor_id: item.proveedor_id ?? '',
        proveedor_nombre: item.proveedor_nombre ?? `${item.nombre ?? ''} ${item.apellido_p ?? ''}`.trim(),
        proveedor_foto: toPublicUrl(item.proveedor_foto ?? item.foto_perfil, 'avatars') ?? '',
        proveedor_comuna: item.proveedor_comuna ?? item.comuna ?? '',
        destacado: item.destacado ?? false,
        rating_promedio: Number(item.rating_promedio ?? 0),
        total_evaluaciones: Number(item.total_evaluaciones ?? 0),
        acepta_perros: item.acepta_perros ?? true,
        acepta_gatos: item.acepta_gatos ?? true,
        acepta_otras: item.acepta_otras ?? false,
        proveedor_updated_at: item.proveedor_updated_at ?? undefined,
        proveedor_lat: item.proveedor_lat != null ? Number(item.proveedor_lat) : null,
        proveedor_lng: item.proveedor_lng != null ? Number(item.proveedor_lng) : null,
        proveedor_verificado: item.proveedor_verificado ?? false,
        proveedor_primera_ayuda: item.proveedor_primera_ayuda ?? false,
        proveedor_perfil_completo: item.proveedor_perfil_completo ?? false,
    };
}

/**
 * Maps a raw row from the servicios_publicados join query (index.tsx) to ServiceResult.
 * Join shape: item.proveedor.{nombre, apellido_p, foto_perfil, comuna}
 *             item.categoria.{nombre, icono, slug}
 */
export function mapJoinToServiceResult(item: any): ServiceResult {
    const slug = item.categoria?.slug ?? item.categoria_slug ?? '';
    return {
        servicio_id: item.id,
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio_desde: Number(item.precio_desde ?? 0),
        precio_hasta: item.precio_hasta ?? null,
        unidad_precio: item.unidad_precio ?? 'por sesión',
        fotos: toPublicUrls(item.fotos),
        categoria_nombre: item.categoria?.nombre ?? CAT_NAMES[slug] ?? slug,
        categoria_slug: slug,
        categoria_icono: item.categoria?.icono ?? '',
        proveedor_id: item.proveedor_id ?? '',
        proveedor_nombre: `${item.proveedor?.nombre ?? ''} ${item.proveedor?.apellido_p ?? ''}`.trim(),
        proveedor_foto: toPublicUrl(item.proveedor?.foto_perfil, 'avatars') ?? '',
        proveedor_comuna: item.proveedor?.comuna ?? '',
        destacado: item.destacado ?? false,
        rating_promedio: Number(item.rating_promedio ?? 0),
        total_evaluaciones: Number(item.total_evaluaciones ?? 0),
        acepta_perros: item.acepta_perros ?? true,
        acepta_gatos: item.acepta_gatos ?? true,
        acepta_otras: item.acepta_otras ?? false,
        proveedor_perfil_completo: item.proveedor?.perfil_completo ?? false,
    };
}
