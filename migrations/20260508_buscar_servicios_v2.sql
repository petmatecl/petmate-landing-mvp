-- ============================================================================
-- Sprint F — Contador de visitas (4/6): RPC buscar_servicios + visitas
-- ============================================================================
-- Patch quirúrgico al RPC en producción: agrega visitas_total y visitas_mes
-- al RETURNS TABLE, al WITH base SELECT, y al SELECT final.
--
-- Todo lo demás IDÉNTICO al RPC actual: filtros, joins, GROUP BY, ORDER BY,
-- COALESCE de proveedor_*, cast de precio_desde/hasta a integer, etc.
--
-- DROP necesario: el shape de RETURNS TABLE cambia (28 → 30 cols), entonces
-- CREATE OR REPLACE solo no alcanza (PG rechazaría).
-- Firma exacta a dropear: (text, text[], text, integer, integer, text,
-- numeric, numeric, text, text).
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. DROP versión actual (28 cols)
-- ──────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.buscar_servicios(
    text, text[], text, integer, integer, text, numeric, numeric, text, text
);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. CREATE versión con visitas (30 cols)
-- ──────────────────────────────────────────────────────────────────────────
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
    p_texto          text DEFAULT NULL::text
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
    visitas_mes               integer
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
            s.visitas_mes
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
        b.visitas_total, b.visitas_mes
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
