-- ============================================================================
-- migrations/20260731_buscar_servicios_agenda_activa.sql
--
-- SPRINT PRODUCTO-1 PR1 — badge "Reserva online" en cards del explorador.
--
-- Agrega columna `tiene_agenda_activa boolean` al RETURNS TABLE del RPC
-- `buscar_servicios`. Calculada en el SELECT con los semáforos canónicos
-- F2-3-B extendidos a F1:
--
--   F1 activa: agendamiento_habilitado=true AND duracion_min IS NOT NULL
--   F2 activa: agendamiento_habilitado=true
--              AND capacidad_estadia IS NOT NULL
--              AND min_noches IS NOT NULL
--
--   tiene_agenda_activa := (F1 activa) OR (F2 activa)
--
-- CAMBIO ADITIVO: agregar 1 columna al final del RETURNS TABLE. Los callers
-- de supabase-js (mapRpcToServiceResult en lib/serviceMapper.ts + explorar.tsx)
-- toleran columnas extras sin romper — solo empiezan a leer el nuevo campo
-- después del deploy de código que lo consume. Aplicar esta migration ANTES
-- del merge del código NO rompe el staging deploy actual; aplicarla DESPUÉS
-- del merge deja el badge sin data hasta que corra este SQL.
--
-- OTROS CALLERS auditados: cero. Solo `mapRpcToServiceResult` (grep global).
--
-- IDEMPOTENTE: CREATE OR REPLACE. Re-correr = no-op funcional (misma firma
-- exacta post-primera aplicación).
-- TRANSACCIONAL: BEGIN/COMMIT explícito por Caveat B post-F2.
--
-- APLICAR: staging (jmtadvdkicyylcwjcmcl) — cambio de función, no de tabla,
-- no requiere backup. Prod queda para el checklist de merge PRODUCTO-1
-- (no existe todavía; N15 tiene prioridad hasta llegar a main).
--
-- ROLLBACK: re-aplicar la versión anterior desde `pg_get_functiondef` snapshot
-- (guardar el output de la query previa antes de aplicar esta).
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.buscar_servicios(
    text, text[], text, integer, integer, text, numeric, numeric, text, text, text[], text[]
);

CREATE OR REPLACE FUNCTION public.buscar_servicios(
    p_categoria_slug text DEFAULT NULL::text,
    p_categorias text[] DEFAULT NULL::text[],
    p_comuna text DEFAULT NULL::text,
    p_limit integer DEFAULT 12,
    p_offset integer DEFAULT 0,
    p_mascota text DEFAULT 'any'::text,
    p_precio_min numeric DEFAULT NULL::numeric,
    p_precio_max numeric DEFAULT NULL::numeric,
    p_orden text DEFAULT 'relevancia'::text,
    p_texto text DEFAULT NULL::text,
    p_inclusiones text[] DEFAULT NULL::text[],
    p_modalidad text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
    servicio_id uuid, titulo text, descripcion text,
    precio_desde integer, precio_hasta integer, unidad_precio text, fotos text[],
    categoria_nombre text, categoria_slug text, categoria_icono text,
    proveedor_id uuid, proveedor_nombre text, proveedor_foto text, proveedor_comuna text,
    destacado boolean, rating_promedio numeric, total_evaluaciones bigint,
    acepta_perros boolean, acepta_gatos boolean, acepta_otras boolean,
    proveedor_updated_at timestamp with time zone,
    comunas_cobertura text[], detalles jsonb, total_count bigint,
    proveedor_verificado boolean, proveedor_primera_ayuda boolean,
    proveedor_perfil_completo boolean, proveedor_es_ejemplo boolean,
    visitas_total integer, visitas_mes integer, favoritos_total integer,
    -- PR1 sprint PRODUCTO-1 (2026-07-31): flag "reserva online" — servicio
    -- con F1 (duracion_min) o F2 (capacidad_estadia + min_noches) activa.
    tiene_agenda_activa boolean
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
            s.favoritos_total,
            -- NUEVO PR1 — semáforo agenda activa (F1 O F2).
            (
                s.agendamiento_habilitado = true
                AND (
                    s.duracion_min IS NOT NULL
                    OR (s.capacidad_estadia IS NOT NULL AND s.min_noches IS NOT NULL)
                )
            ) AS tiene_agenda_activa
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
                p_inclusiones IS NULL
                OR cardinality(p_inclusiones) = 0
                OR (s.detalles -> 'inclusiones') ?& p_inclusiones
            )
            AND (
                p_modalidad IS NULL
                OR cardinality(p_modalidad) = 0
                OR (s.detalles -> 'modalidad') ?| p_modalidad
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
        b.visitas_total, b.visitas_mes, b.favoritos_total,
        b.tiene_agenda_activa
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

COMMIT;

-- ============================================================================
-- VERIFICACIONES (correr como statements separados post-commit)
-- ============================================================================

-- V1: RETURNS TABLE ahora incluye tiene_agenda_activa
--   SELECT pg_get_function_result(p.oid) FROM pg_proc p
--    JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.proname='buscar_servicios';
--   Esperado: string que contenga "tiene_agenda_activa boolean" al final.

-- V2: al menos algún servicio del staging retorna flag = true
--   SELECT servicio_id, titulo, tiene_agenda_activa
--     FROM buscar_servicios(p_limit := 50)
--    WHERE tiene_agenda_activa = true
--    LIMIT 5;
--   Esperado: 0+ filas según data real. Si sale 0, verificar que existan
--   servicios con agendamiento_habilitado=true + (duracion_min IS NOT NULL
--   OR (capacidad_estadia IS NOT NULL AND min_noches IS NOT NULL)).

-- V3: contra-check — un servicio SIN agenda debe retornar false, no NULL
--   SELECT tiene_agenda_activa
--     FROM buscar_servicios(p_limit := 100)
--    WHERE tiene_agenda_activa IS NULL;
--   Esperado: 0 filas.
-- ============================================================================
