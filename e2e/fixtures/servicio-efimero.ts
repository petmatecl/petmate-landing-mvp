// e2e/fixtures/servicio-efimero.ts
// ---------------------------------------------------------------------------
// Crea/borra servicios efímeros para tests de F2-2B. Cada corrida crea uno
// con prefijo e2e-f2-2b-{timestamp} y lo borra en afterAll. La limpieza es
// resiliente a tests reventados a mitad — beforeAll llama cleanupHuerfanos()
// para barrer los que quedaron de corridas abortadas.
//
// Todas las ops respetan RLS — usan el JWT del proveedor autenticado, no
// service role. Un proveedor solo puede crear/borrar sus propios servicios.
// ---------------------------------------------------------------------------
import { SupabaseClient } from '@supabase/supabase-js';

export const E2E_TITULO_PREFIX = 'e2e-f2-2b-';

export type ServicioEfimero = {
    id: string;
    titulo: string;
};

const cachedCategoriaIds = new Map<string, string>();

async function resolverCategoriaIdPorSlug(
    supabase: SupabaseClient,
    slug: string,
): Promise<string> {
    const cached = cachedCategoriaIds.get(slug);
    if (cached) return cached;
    const { data, error } = await supabase
        .from('categorias_servicio')
        .select('id')
        .eq('slug', slug)
        .single();
    if (error || !data) {
        throw new Error(`[servicio-efimero] No pude resolver categoría '${slug}': ${error?.message ?? 'sin data'}`);
    }
    cachedCategoriaIds.set(slug, data.id as string);
    return data.id as string;
}

/**
 * Crea un servicio de cuidado con datos mínimos válidos. Titulo incluye
 * timestamp para colisión-cero entre corridas paralelas.
 *
 * Fotos: array con 1 URL de Unsplash (whitelistada en la CSP del proyecto).
 * Necesaria para que el modal pueda submitear cambios (validación
 * client "al menos 1 foto"); sin ella, el proveedor no puede guardar.
 */
export async function crearServicioCuidadoEfimero(
    supabase: SupabaseClient,
    proveedorId: string,
): Promise<ServicioEfimero> {
    return crearServicioEfimero(supabase, proveedorId, {
        slug: 'cuidado',
        unidadPrecio: 'por noche',
    });
}

export async function crearServicioPaseosEfimero(
    supabase: SupabaseClient,
    proveedorId: string,
): Promise<ServicioEfimero> {
    return crearServicioEfimero(supabase, proveedorId, {
        slug: 'paseos',
        unidadPrecio: 'por paseo',
    });
}

/**
 * Crea un servicio del prefijo e2e-f2-2b-{ts} con la categoría dada.
 * Interno — usar los wrappers específicos por categoría.
 */
async function crearServicioEfimero(
    supabase: SupabaseClient,
    proveedorId: string,
    opts: { slug: string; unidadPrecio: string },
): Promise<ServicioEfimero> {
    const categoriaId = await resolverCategoriaIdPorSlug(supabase, opts.slug);
    const titulo = `${E2E_TITULO_PREFIX}${Date.now()}`;
    const { data, error } = await supabase
        .from('servicios_publicados')
        .insert({
            proveedor_id: proveedorId,
            categoria_id: categoriaId,
            titulo,
            descripcion: 'Servicio efímero de e2e — se elimina automáticamente.',
            precio_desde: 15000,
            unidad_precio: opts.unidadPrecio,
            acepta_perros: true,
            acepta_gatos: false,
            acepta_otras: false,
            tamanos_aceptados: ['pequeño', 'mediano'],
            // Placeholder Unsplash (dominio whitelisteado en CSP del proyecto).
            fotos: ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'],
            comunas_cobertura: ['Providencia'],
            activo: true,
            agendamiento_habilitado: true,
        })
        .select('id, titulo')
        .single();
    if (error || !data) {
        throw new Error(`[servicio-efimero] INSERT (${opts.slug}) falló: ${error?.message ?? 'sin data'}`);
    }
    return { id: data.id as string, titulo: data.titulo as string };
}

/**
 * Borra un servicio + sus dependencias (franjas, excepciones/blackouts).
 * NO throwea si falla — solo logea. Los `afterAll` deben ser resilientes:
 * un test que reventó a mitad puede haber dejado el modal abierto o el
 * cliente en estado raro. Lo importante es no perder el intento de limpieza.
 */
export async function borrarServicioResiliente(
    supabase: SupabaseClient,
    id: string,
): Promise<void> {
    try {
        await supabase.from('disponibilidad_semanal').delete().eq('servicio_id', id);
    } catch (err) {
        console.warn(`[servicio-efimero] delete disponibilidad_semanal ${id} falló:`, err);
    }
    try {
        await supabase.from('excepciones_disponibilidad').delete().eq('servicio_id', id);
    } catch (err) {
        console.warn(`[servicio-efimero] delete excepciones_disponibilidad ${id} falló:`, err);
    }
    try {
        const { error } = await supabase.from('servicios_publicados').delete().eq('id', id);
        if (error) console.warn(`[servicio-efimero] DELETE servicios_publicados ${id} error:`, error.message);
    } catch (err) {
        console.warn(`[servicio-efimero] delete servicios_publicados ${id} falló:`, err);
    }
}

/**
 * Barre huérfanos e2e-f2-2b-* del proveedor. Corre en beforeAll para
 * dejar el terreno limpio si una corrida anterior reventó a mitad y
 * afterAll no llegó a limpiar. Resiliente: reporta borrados/errores sin
 * throw — la suite arranca aunque uno falle.
 *
 * IMPORTANTE — filtro por edad: solo borra servicios con `created_at`
 * más viejos que `olderThanMinutes` (default 30 min). Sin este filtro,
 * cuando dos specs corren en paralelo (workers > 1), el cleanupHuerfanos
 * del spec A borraría el servicio recién creado del spec B por matchear
 * el prefijo. El umbral por edad garantiza que solo residuos de corridas
 * anteriores (que abortaron y dejaron el servicio sin borrar) se toquen.
 */
export async function cleanupHuerfanos(
    supabase: SupabaseClient,
    proveedorId: string,
    opts?: { olderThanMinutes?: number },
): Promise<{ borrados: number; errores: number; titulos: string[] }> {
    const olderThanMinutes = opts?.olderThanMinutes ?? 30;
    const cutoffIso = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
    const { data, error } = await supabase
        .from('servicios_publicados')
        .select('id, titulo')
        .eq('proveedor_id', proveedorId)
        .like('titulo', `${E2E_TITULO_PREFIX}%`)
        .lt('created_at', cutoffIso);
    if (error) {
        console.warn('[servicio-efimero] cleanupHuerfanos SELECT falló:', error.message);
        return { borrados: 0, errores: 1, titulos: [] };
    }
    if (!data || data.length === 0) return { borrados: 0, errores: 0, titulos: [] };

    let borrados = 0;
    let errores = 0;
    const titulos: string[] = [];
    for (const s of data as Array<{ id: string; titulo: string }>) {
        titulos.push(s.titulo);
        try {
            await borrarServicioResiliente(supabase, s.id);
            borrados++;
        } catch {
            errores++;
        }
    }
    return { borrados, errores, titulos };
}
