-- ============================================================================
-- Sprint 4 Fase 3 / Commit A — Filtro por `inclusiones` en buscar_servicios
-- ============================================================================
-- Agrega un nuevo parámetro `p_inclusiones text[]` a la RPC `buscar_servicios`
-- y un índice GIN sobre `(detalles -> 'inclusiones')` para soportarlo.
--
-- Semántica: AND. El servicio debe contener TODOS los slugs marcados por el
-- cliente. Se implementa con el operador `?&` (has-all-keys) sobre el array
-- jsonb almacenado en `detalles.inclusiones`. NULL o array vacío = no filtra.
--
-- Backwards-compat: el param tiene DEFAULT NULL. Toda llamada actual a
-- buscar_servicios (sin pasar p_inclusiones) se comporta idéntica.
--
-- Patrón heredado de 20260510_favoritos_polimorficos.sql: cualquier cambio
-- de shape requiere DROP FUNCTION explícito de la firma anterior antes del
-- CREATE OR REPLACE, porque PostgreSQL no permite OR REPLACE con shape
-- distinto.
-- ============================================================================

-- 1. Drop de la firma anterior (10 args, sin p_inclusiones).
DROP FUNCTION IF EXISTS public.buscar_servicios(
    text, text[], text, integer, integer, text, numeric, numeric, text, text
);

-- 2. Re-crear con la firma nueva (11 args, p_inclusiones al final).
CREATE OR REPLACE FUNCTION public.buscar_servicios(
    p_categoria_slug text DEFAULT NULL::text,
    p_categorias     text[] DEFAULT NULL::text[],
    p_comuna         text DEFAULT NULL::text,
    p_limit          integer DEFAULT 12,
    p_offset         integer DEFAULT 0,
    p_mascota        text DEFAULT 'any'::text,
    p_precio_min     numeric DEFAULT NULL::numeric,
    p_precio_max     numeric DEFAULT NULL::numeric,
    p_orden          text DEFAULT 'relevancia'::text,
    p_texto          text DEFAULT NULL::text,
    p_inclusiones    text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
    servicio_id               uuid,
    titulo                    text,
    descripcion               text,
    precio_desde              integer,
    precio_hasta              integer,
    unidad_precio             text,
    fotos                     text[],
    categoria_nombre          text,
    categoria_slug            text,
    categoria_icono           text,
    proveedor_id              uuid,
    proveedor_nombre          text,
    proveedor_foto            text,
    proveedor_comuna          text,
    destacado                 boolean,
    rating_promedio           numeric,
    total_evaluaciones        bigint,
    acepta_perros             boolean,
    acepta_gatos              boolean,
    acepta_otras              boolean,
    proveedor_updated_at      timestamp with time zone,
    comunas_cobertura         text[],
    detalles                  jsonb,
    total_count               bigint,
    proveedor_verificado      boolean,
    proveedor_primera_ayuda   boolean,
    proveedor_perfil_completo boolean,
    proveedor_es_ejemplo      boolean,
    visitas_total             integer,
    visitas_mes               integer,
    favoritos_total           integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH base AS (
        SELECT
            s.id              AS servicio_id,
            s.titulo,
            s.descripcion,
            s.precio_desde::integer,
            s.precio_hasta::integer,
            s.unidad_precio,
            s.fotos,
            c.nombre          AS categoria_nombre,
            c.slug            AS categoria_slug,
            c.icono           AS categoria_icono,
            p.id              AS proveedor_id,
            COALESCE(p.nombre_publico, p.nombre || ' ' || p.apellido_p) AS proveedor_nombre,
            p.foto_perfil     AS proveedor_foto,
            p.comuna          AS proveedor_comuna,
            s.destacado,
            COALESCE(AVG(e.rating), 0)::numeric AS rating_promedio,
            COUNT(e.id)                          AS total_evaluaciones,
            s.acepta_perros,
            s.acepta_gatos,
            s.acepta_otras,
            p.updated_at      AS proveedor_updated_at,
            s.comunas_cobertura,
            s.detalles,
            COALESCE(p.rut_verificado, false)  AS proveedor_verificado,
            COALESCE(p.primera_ayuda, false)   AS proveedor_primera_ayuda,
            COALESCE(p.perfil_completo, false) AS proveedor_perfil_completo,
            COALESCE(p.es_ejemplo, false)      AS proveedor_es_ejemplo,
            s.visitas_total,
            s.visitas_mes,
            s.favoritos_total
        FROM servicios_publicados s
        JOIN categorias_servicio c ON c.id = s.categoria_id
        JOIN proveedores p         ON p.id = s.proveedor_id
        LEFT JOIN evaluaciones e   ON e.servicio_id = s.id AND e.estado = 'aprobado'
        WHERE
            s.activo = true
            AND p.estado = 'aprobado'
            AND (
                p_categorias IS NOT NULL AND c.slug = ANY(p_categorias)
                OR p_categorias IS NULL AND (p_categoria_slug IS NULL OR c.slug = p_categoria_slug)
            )
            AND (
                p_comuna IS NULL OR p_comuna = ''
                OR lower(p.comuna) = lower(p_comuna)
                OR lower(p_comuna) = ANY(SELECT lower(x) FROM unnest(s.comunas_cobertura) AS x)
            )
            AND (p_mascota IS NULL OR p_mascota = 'any'
                OR (p_mascota = 'perro' AND s.acepta_perros = true)
                OR (p_mascota = 'gato'  AND s.acepta_gatos  = true)
                OR (p_mascota = 'otro'  AND s.acepta_otras  = true)
            )
            AND (p_precio_min IS NULL OR s.precio_desde >= p_precio_min)
            AND (p_precio_max IS NULL OR s.precio_hasta <= p_precio_max)
            -- Sprint 4 Fase 3: filtro por inclusiones (AND semantics).
            -- `?&` exige que TODOS los slugs del array `p_inclusiones` estén
            -- presentes en `detalles->'inclusiones'`. NULL/[] pasa todo.
            -- Servicios sin la key o con array vacío se excluyen cuando hay
            -- filtro activo (NULL ?& array[...] = NULL = FALSE en WHERE).
            AND (
                p_inclusiones IS NULL
                OR cardinality(p_inclusiones) = 0
                OR (s.detalles -> 'inclusiones') ?& p_inclusiones
            )
            AND (
                p_texto IS NULL
                OR s.titulo ILIKE '%' || p_texto || '%'
                OR s.descripcion ILIKE '%' || p_texto || '%'
                OR p.nombre ILIKE '%' || p_texto || '%'
                OR p.nombre_publico ILIKE '%' || p_texto || '%'
                OR p.apellido_p ILIKE '%' || p_texto || '%'
            )
        GROUP BY s.id, c.id, p.id
    )
    SELECT
        b.servicio_id, b.titulo, b.descripcion, b.precio_desde, b.precio_hasta,
        b.unidad_precio, b.fotos, b.categoria_nombre, b.categoria_slug, b.categoria_icono,
        b.proveedor_id, b.proveedor_nombre, b.proveedor_foto, b.proveedor_comuna,
        b.destacado, b.rating_promedio, b.total_evaluaciones,
        b.acepta_perros, b.acepta_gatos, b.acepta_otras,
        b.proveedor_updated_at, b.comunas_cobertura, b.detalles,
        COUNT(*) OVER()::bigint AS total_count,
        b.proveedor_verificado, b.proveedor_primera_ayuda,
        b.proveedor_perfil_completo, b.proveedor_es_ejemplo,
        b.visitas_total, b.visitas_mes, b.favoritos_total
    FROM base b
    ORDER BY
        CASE WHEN p_orden = 'rating'      THEN b.rating_promedio END DESC NULLS LAST,
        CASE WHEN p_orden = 'precio_asc'  THEN b.precio_desde::numeric END ASC  NULLS LAST,
        CASE WHEN p_orden = 'precio_desc' THEN b.precio_desde::numeric END DESC NULLS LAST,
        b.destacado DESC,
        b.rating_promedio DESC,
        b.total_evaluaciones DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$function$;

-- 3. Índice GIN sobre la sub-key `inclusiones`. Cubre `?&`, `?|`, `?`, `@>`.
-- Más selectivo que indexar el jsonb completo. IF NOT EXISTS por idempotencia
-- al re-aplicar la migration (común durante smoke + rollback).
CREATE INDEX IF NOT EXISTS idx_servicios_detalles_inclusiones
    ON servicios_publicados
    USING GIN ((detalles -> 'inclusiones'));

-- 4. Forzar reload del schema cache de PostgREST para que reconozca la nueva
-- firma de la función inmediatamente, sin esperar al refresh periódico.
-- Patrón heredado de migrations/60_fix_social_schema.sql.
NOTIFY pgrst, 'reload schema';
