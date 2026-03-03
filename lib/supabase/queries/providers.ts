import { supabase } from '../../supabaseClient';

export interface ProviderResult {
    id: string;
    nombre: string;
    apellido_p?: string;
    foto_perfil?: string;
    comuna: string;
    rating_promedio: number;
    total_evaluaciones: number;
    servicios: string[];
    verificado: boolean;
}

/**
 * Obtiene proveedores aprobados, opcionalmente filtrados por comuna.
 * Los servicios se concatenan como array de nombres de categoría.
 */
export async function getProvidersByLocation(
    location?: string,
    limit = 12
): Promise<ProviderResult[]> {
    let query = supabase
        .from('proveedores')
        .select(`
            id,
            nombre,
            apellido_p,
            foto_perfil,
            comuna,
            servicios_publicados!inner(
                activo,
                categorias_servicio(nombre)
            ),
            evaluaciones(rating)
        `)
        .eq('estado', 'aprobado')
        .eq('servicios_publicados.activo', true)
        .limit(limit);

    if (location) {
        query = query.ilike('comuna', `%${location}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[getProvidersByLocation] Error:', error.message);
        return [];
    }

    return (data || []).map((p: any) => {
        const evals: { rating: number }[] = p.evaluaciones || [];
        const totalEvals = evals.length;
        const avgRating = totalEvals > 0
            ? evals.reduce((sum, e) => sum + e.rating, 0) / totalEvals
            : 0;

        // Unique service names
        const servicios = Array.from(new Set(
            (p.servicios_publicados || [])
                .map((s: any) => {
                    const cat = Array.isArray(s.categorias_servicio)
                        ? s.categorias_servicio[0]
                        : s.categorias_servicio;
                    return cat?.nombre as string | undefined;
                })
                .filter(Boolean)
        )) as string[];

        const verificado = !!(p.foto_perfil && avgRating > 0);

        return {
            id: p.id,
            nombre: p.nombre || 'Proveedor',
            apellido_p: p.apellido_p,
            foto_perfil: p.foto_perfil,
            comuna: p.comuna || '',
            rating_promedio: Number(avgRating.toFixed(1)),
            total_evaluaciones: totalEvals,
            servicios,
            verificado,
        };
    });
}
