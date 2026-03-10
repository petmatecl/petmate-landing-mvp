-- P03: Búsqueda full-text con índice GIN (pg_trgm)

-- 1. Habilitar la extensión pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Crear índices GIN para optimizar búsquedas con ILIKE
CREATE INDEX IF NOT EXISTS idx_servicios_titulo_trgm ON servicios_publicados USING GIN (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_servicios_desc_trgm ON servicios_publicados USING GIN (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre_trgm ON proveedores USING GIN (nombre gin_trgm_ops);

-- 3. Actualizar la función buscar_servicios para usar p_texto y los índices

-- Primero eliminamos las firmas anteriores para evitar conflictos
DROP FUNCTION IF EXISTS public.buscar_servicios(text, text[], text, int, int, text, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.buscar_servicios(text, text, text, text, integer, integer, integer, integer, text);
DROP FUNCTION IF EXISTS public.buscar_servicios(text, text, text, text, int, int, int, int, text);

CREATE OR REPLACE FUNCTION public.buscar_servicios(
    p_categoria_slug text DEFAULT NULL,
    p_categorias     text[] DEFAULT NULL,
    p_comuna         text DEFAULT '',
    p_limit          int  DEFAULT 12,
    p_offset         int  DEFAULT 0,
    p_mascota        text DEFAULT 'any',
    p_precio_min     numeric DEFAULT NULL,
    p_precio_max     numeric DEFAULT NULL,
    p_orden          text DEFAULT 'relevancia',
    p_texto          text DEFAULT NULL
)
RETURNS TABLE (
    servicio_id          uuid,
    titulo               text,
    descripcion          text,
    precio_desde         numeric,
    precio_hasta         numeric,
    unidad_precio        text,
    fotos                text[],
    categoria_nombre     text,
    categoria_slug       text,
    categoria_icono      text,
    proveedor_id         uuid,
    proveedor_nombre     text,
    proveedor_foto       text,
    proveedor_comuna     text,
    destacado            boolean,
    rating_promedio      numeric,
    total_evaluaciones   bigint,
    acepta_perros        boolean,
    acepta_gatos         boolean,
    acepta_otras         boolean,
    proveedor_updated_at timestamptz,
    total_count          bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH base AS (
        SELECT
            s.id              AS servicio_id,
            s.titulo,
            s.descripcion,
            s.precio_desde,
            s.precio_hasta,
            s.unidad_precio,
            s.fotos,
            c.nombre          AS categoria_nombre,
            c.slug            AS categoria_slug,
            c.icono           AS categoria_icono,
            p.id              AS proveedor_id,
            p.nombre          AS proveedor_nombre,
            p.foto_perfil     AS proveedor_foto,
            p.comuna          AS proveedor_comuna,
            s.destacado,
            COALESCE(AVG(e.rating), 0)::numeric AS rating_promedio,
            COUNT(e.id)                          AS total_evaluaciones,
            s.acepta_perros,
            s.acepta_gatos,
            s.acepta_otras,
            p.updated_at      AS proveedor_updated_at
        FROM servicios_publicados s
        JOIN categorias_servicio c ON c.id = s.categoria_id
        JOIN proveedores p         ON p.id = s.proveedor_id
        LEFT JOIN evaluaciones e   ON e.servicio_id = s.id AND e.estado = 'aprobado'
        WHERE
            s.activo = true
            AND p.estado = 'aprobado'
            -- Filtro de categoría: p_categorias tiene prioridad sobre p_categoria_slug
            AND (
                p_categorias IS NOT NULL
                    AND c.slug = ANY(p_categorias)
                OR p_categorias IS NULL
                    AND (p_categoria_slug IS NULL OR c.slug = p_categoria_slug)
            )
            AND (p_comuna = '' OR lower(p.comuna) = lower(p_comuna))
            AND (p_mascota = 'any'
                OR (p_mascota = 'perro' AND s.acepta_perros = true)
                OR (p_mascota = 'gato'  AND s.acepta_gatos  = true)
                OR (p_mascota = 'otro'  AND s.acepta_otras  = true)
            )
            AND (p_precio_min IS NULL OR s.precio_desde >= p_precio_min)
            AND (p_precio_max IS NULL OR s.precio_hasta <= p_precio_max)
            -- Filtro de Texto (pg_trgm optimizado usando ILIKE)
            AND (
                p_texto IS NULL 
                OR s.titulo ILIKE '%' || p_texto || '%'
                OR s.descripcion ILIKE '%' || p_texto || '%'
                OR p.nombre ILIKE '%' || p_texto || '%'
            )
        GROUP BY s.id, c.id, p.id
    )
    SELECT
        b.*,
        COUNT(*) OVER() AS total_count
    FROM base b
    ORDER BY
        CASE WHEN p_orden = 'rating'       THEN b.rating_promedio       END DESC NULLS LAST,
        CASE WHEN p_orden = 'precio_asc'   THEN b.precio_desde          END ASC  NULLS LAST,
        CASE WHEN p_orden = 'precio_desc'  THEN b.precio_desde          END DESC NULLS LAST,
        b.destacado DESC,
        b.rating_promedio DESC,
        b.total_evaluaciones DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$;
