import * as Sentry from '@sentry/nextjs';
import { supabase } from './supabaseClient';

/**
 * Cache module-level del catálogo de categorías de servicio.
 *
 * Sprint panel-prov-fixes (2026-08-27) — creado para eliminar el race
 * del select de Categoría en `components/Proveedor/ServiceFormModal.tsx`:
 * el fetch disparaba al abrir el modal, el select renderizaba con
 * `categorias=[]`, primera apertura mostraba dropdown vacío hasta que
 * la query resolviera. Un proveedor nuevo abriendo "Publicar servicio"
 * por primera vez veía un select vacío y concluía que la plataforma
 * estaba rota — el momento exacto donde el producto necesita funcionar.
 *
 * DISEÑO DEL CACHE (con corrección PO 2026-08-27):
 *
 * El primer draft del helper hacía `cache = data ?? []` — si el fetch
 * fallaba o retornaba vacío, el array vacío quedaba cacheado como si
 * fuera válido y toda la sesión veía el select vacío sin reintento ni
 * error visible. Exactamente el patrón "código que corre, no falla, no
 * hace lo que declara" que este sprint viene a eliminar. Corrección:
 *
 *   (a) Solo cachear si el fetch trajo resultados (data.length > 0).
 *       Array vacío o error NO se cachea; el próximo llamado reintenta.
 *   (b) `getCategoriasCached()` retorna `{ data, error }` — el caller
 *       distingue OK vs fallo y renderiza estado apropiado.
 *   (c) La ausencia de cache post-fallo es intencional: cada apertura
 *       del select tras un error re-intenta transparentemente. Si
 *       persiste el fallo, el user ve el error kind visible con CTA
 *       "Reintentar" que dispara re-fetch manual.
 *
 * TRADE-OFF ACEPTADO POR PO 2026-08-27: si se agrega/quita una
 * categoría en BD, una sesión ya cargada sigue viendo la lista vieja
 * hasta que el user recargue. Aceptable porque las categorías cambian
 * cada varios meses (últimas fueron `retratos`, `etologia`,
 * `fotografia` post-launch — cero cambios en más de 1 mes). Un reload
 * manual resuelve. No agregamos invalidación de cache basada en
 * tiempo/version para no complicar el helper sin necesidad real.
 */

export type Categoria = {
    id: string;
    nombre: string;
    icono: string | null;
    slug: string;
};

let cache: Categoria[] | null = null;

/**
 * Fetch de categorías con cache module-level.
 *
 * Retorna `{ data, error }`:
 *  - Éxito con resultados: `data = [...]`, `error = null`, `cache`
 *    poblado para futuros llamados.
 *  - Éxito pero vacío (query OK, cero filas): `data = []`, `error = null`,
 *    cache NO se puebla (permite reintento si el vacío era transitorio o
 *    si se agregaron categorías después).
 *  - Fallo de red / query error: `data = []`, `error = <mensaje>`, cache
 *    NO se puebla, próximo llamado reintenta.
 *
 * Callers deben renderizar:
 *  - Loading state mientras la promesa no resuelve.
 *  - Error state con CTA "Reintentar" si `error !== null`.
 *  - Vacío como caso raro (o "Cargando…" persistente si viene con retry
 *    manual). Este último es esquina — cero categorías en `categorias_servicio`
 *    es un incidente de datos, no de UX; pero el helper NO lo trata como
 *    error para no engañar al caller sobre el tipo de fallo.
 */
export async function getCategoriasCached(): Promise<{ data: Categoria[]; error: string | null }> {
    if (cache) {
        return { data: cache, error: null };
    }

    try {
        const { data, error } = await supabase
            .from('categorias_servicio')
            .select('id, nombre, icono, slug')
            .order('nombre');

        if (error) {
            // Sprint panel-prov-fixes hotfix (2026-08-27) — captureException
            // del error real de Supabase para diagnóstico, pero NO propagar
            // el mensaje crudo al caller. El caller decide qué copy mostrar
            // al usuario (típicamente causa-neutral en español). Ver
            // CLAUDE.md > "Pantalla de estado no debe afirmar una causa
            // que no verificó" — corolario aplicado al error UX: el error
            // crudo de JavaScript en inglés no le dice nada útil al user.
            Sentry.captureException(error, {
                tags: { component: 'getCategoriasCached', phase: 'supabase-query' },
            });
            return { data: [], error: 'supabase-query-error' };
        }

        const rows = data as Categoria[] | null;
        if (!rows || rows.length === 0) {
            // Vacío: NO cachear. Puede ser transitorio (query OK pero
            // tabla vacía por algún error de setup, o categorías siendo
            // migradas). Reintentar en próximo llamado.
            return { data: [], error: null };
        }

        cache = rows;
        return { data: rows, error: null };
    } catch (err: any) {
        // captureException con el error original (TypeError, network fail,
        // lo que sea) → Sentry tiene el detalle técnico para diagnóstico.
        // Al caller le devolvemos un sentinel string que solo indica
        // "hubo error", no el mensaje crudo — evita filtrar 'TypeError:
        // Failed to fetch' u otros mensajes en inglés a la UI del user.
        Sentry.captureException(err, {
            tags: { component: 'getCategoriasCached', phase: 'network-or-throw' },
        });
        return { data: [], error: 'network-error' };
    }
}

/**
 * Prefetch fire-and-forget para llamar al mount del panel proveedor.
 * Cero retorno — el propósito es poblar el cache mientras el user aún
 * no abrió el modal. Cuando lo abra, `getCategoriasCached()` devuelve
 * instantáneo.
 *
 * Si el prefetch falla, cero problema: el fetch retry ocurre cuando el
 * user abre el modal (que también llama a `getCategoriasCached()`).
 */
export function prefetchCategorias(): void {
    // Fire-and-forget. Cero await, cero throw propagado.
    void getCategoriasCached();
}

/**
 * Invalidación manual del cache. Útil si en algún momento se agrega un
 * flow admin que crea categorías nuevas — post-INSERT, llamar
 * `invalidateCategoriasCache()` para que el próximo `getCategoriasCached`
 * re-fetche fresh. Hoy no hay caller — exportado para futuro.
 */
export function invalidateCategoriasCache(): void {
    cache = null;
}
