-- Migration: 200_add_texto_to_buscar_servicios.sql
-- Fecha: 2026-03-02
-- Propósito: Agregar parámetro p_texto al RPC buscar_servicios para filtrar
--            por título o descripción en el servidor, evitando traer 10000 filas
--            al cliente cuando hay búsqueda de texto activa.
--
-- INSTRUCCIONES: Ejecutar en Supabase → SQL Editor.
-- NOTA: Este CREATE OR REPLACE reemplaza la función existente manteniendo
--       todos los parámetros anteriores + el nuevo p_texto DEFAULT NULL.
--       Los callers que no pasen p_texto no se rompen.

CREATE OR REPLACE FUNCTION buscar_servicios(
    p_categoria_slug   text    DEFAULT NULL,
    p_comuna           text    DEFAULT NULL,
    p_tipo_mascota     text    DEFAULT NULL,
    p_tamano           text    DEFAULT NULL,
    p_precio_max       integer DEFAULT NULL,
    p_precio_min       integer DEFAULT NULL,
    p_limit            integer DEFAULT 20,
    p_offset           integer DEFAULT 0,
    p_texto            text    DEFAULT NULL   -- NUEVO: filtro de texto en titulo/descripcion
)
RETURNS TABLE (
    -- Columnas retornadas por la función original.
    -- Ajustar si la función real retorna columnas adicionales o con nombres distintos.
    id                  uuid,
    titulo              text,
    descripcion         text,
    precio_desde        numeric,
    tipo_mascota        text,
    tamano_mascota      text,
    comuna              text,
    foto_perfil         text,
    nombre              text,
    apellido_p          text,
    rating_promedio     numeric,
    total_evaluaciones  bigint,
    destacado           boolean,
    categoria_slug      text,
    total_count         bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.id,
        sp.titulo,
        sp.descripcion,
        sp.precio_desde,
        sp.tipo_mascota,
        sp.tamano_mascota,
        p.comuna,
        p.foto_perfil,
        p.nombre,
        p.apellido_p,
        COALESCE(AVG(e.calificacion), 0)::numeric    AS rating_promedio,
        COUNT(e.id)                                   AS total_evaluaciones,
        COALESCE(sp.destacado, false)                 AS destacado,
        c.slug                                        AS categoria_slug,
        COUNT(*) OVER ()                              AS total_count
    FROM servicios_publicados sp
    JOIN proveedores p
        ON sp.proveedor_id = p.id
    JOIN categorias c
        ON sp.categoria_id = c.id
    LEFT JOIN evaluaciones e
        ON e.sitter_id = sp.proveedor_id
        AND e.estado = 'aprobado'
    WHERE
        sp.estado = 'publicado'
        AND p.estado = 'aprobado'

        -- Filtro categoría
        AND (p_categoria_slug IS NULL OR c.slug = p_categoria_slug)

        -- Filtro comuna
        AND (p_comuna IS NULL OR p.comuna ILIKE p_comuna)

        -- Filtro tipo de mascota
        AND (p_tipo_mascota IS NULL
             OR sp.tipo_mascota = p_tipo_mascota
             OR sp.tipo_mascota = 'ambos')

        -- Filtro tamaño
        AND (p_tamano IS NULL OR sp.tamano_mascota = p_tamano)

        -- Filtro precio máximo
        AND (p_precio_max IS NULL OR sp.precio_desde <= p_precio_max)

        -- Filtro precio mínimo
        AND (p_precio_min IS NULL OR sp.precio_desde >= p_precio_min)

        -- NUEVO: Filtro de texto en título o descripción
        AND (
            p_texto IS NULL
            OR sp.titulo      ILIKE '%' || p_texto || '%'
            OR sp.descripcion ILIKE '%' || p_texto || '%'
        )

    GROUP BY
        sp.id, sp.titulo, sp.descripcion, sp.precio_desde,
        sp.tipo_mascota, sp.tamano_mascota, sp.destacado,
        p.comuna, p.foto_perfil, p.nombre, p.apellido_p,
        c.slug

    ORDER BY
        COALESCE(sp.destacado, false) DESC,
        rating_promedio DESC,
        total_evaluaciones DESC

    LIMIT  p_limit
    OFFSET p_offset;
END;
$$;

-- Asegurarse de que la función es accesible para usuarios anónimos (anon) y autenticados
GRANT EXECUTE ON FUNCTION buscar_servicios(
    text, text, text, text, integer, integer, integer, integer, text
) TO anon, authenticated;
