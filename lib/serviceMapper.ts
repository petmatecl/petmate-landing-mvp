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

    // RPC buscar_servicios returns:
    //   servicio_id, proveedor_nombre (pre-computed), proveedor_foto, proveedor_comuna
    // These differ from the join-query shape used by mapJoinToServiceResult.
    return {
        servicio_id: item.servicio_id ?? item.id, // RPC uses servicio_id; fallback to id for compat
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio_desde: Number(item.precio_desde ?? 0),
        precio_hasta: item.precio_hasta ?? null,
        unidad_precio: item.unidad_precio ?? 'por sesión',
        fotos: item.fotos ?? [],
        categoria_nombre: catNombre,
        categoria_slug: slug,
        categoria_icono: item.categoria_icono ?? '',
        proveedor_id: item.proveedor_id ?? '',
        // RPC pre-computes the full name in proveedor_nombre; fallback for join shapes
        proveedor_nombre: item.proveedor_nombre ?? `${item.nombre ?? ''} ${item.apellido_p ?? ''}`.trim(),
        // RPC uses proveedor_foto; join shapes use foto_perfil
        proveedor_foto: item.proveedor_foto ?? item.foto_perfil ?? null,
        // RPC uses proveedor_comuna; join shapes use comuna
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
    };
}

/**
 * Maps a raw row from the servicios_publicados join query (index.tsx) to ServiceResult.
 * Join shape: item.proveedor.{nombre, apellido_p, foto_perfil, comuna}
 *             item.categoria.{nombre, icono, slug}
 */
export function mapJoinToServiceResult(item: any): ServiceResult {
    const slug = item.categoria?.slug ?? '';
    return {
        servicio_id: item.id,
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio_desde: Number(item.precio_desde ?? 0),
        precio_hasta: item.precio_hasta ?? null,
        unidad_precio: item.unidad_precio ?? 'por sesión',
        fotos: item.fotos ?? [],
        categoria_nombre: item.categoria?.nombre ?? CAT_NAMES[slug] ?? slug,
        categoria_slug: slug,
        categoria_icono: item.categoria?.icono ?? '',
        proveedor_id: item.proveedor_id ?? '',
        proveedor_nombre: `${item.proveedor?.nombre ?? ''} ${item.proveedor?.apellido_p ?? ''}`.trim(),
        proveedor_foto: item.proveedor?.foto_perfil ?? null,
        proveedor_comuna: item.proveedor?.comuna ?? '',
        destacado: item.destacado ?? false,
        rating_promedio: Number(item.rating_promedio ?? 0),
        total_evaluaciones: Number(item.total_evaluaciones ?? 0),
        acepta_perros: item.acepta_perros ?? true,
        acepta_gatos: item.acepta_gatos ?? true,
        acepta_otras: item.acepta_otras ?? false,
    };
}
