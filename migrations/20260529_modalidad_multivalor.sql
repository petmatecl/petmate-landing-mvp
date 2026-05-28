-- ============================================================================
-- Sprint voice-neutral / Multi-valor de modalidad
-- ============================================================================
-- Dos cambios atomicos en transaccion:
--
-- 1. DATA: convertir `detalles.<campo>` de string escalar a array jsonb en
--    los servicios donde el campo es de los recien promovidos a multiselect.
--    Campos afectados:
--      cuidado.modalidad         (3 vals: casa_tutor / casa_cuidador / recinto)
--      peluqueria.modalidad      (vals: local_propio→'local' / domicilio /
--                                 ambos→[local, domicilio])
--      adiestramiento.formato    (vals: individual / grupal /
--                                 ambas→[individual, grupal])
--      adiestramiento.modalidad  (vals: domicilio / online / academia)
--      guarderia.tipo_guarderia  (vals: diurna / nocturna /
--                                 ambas→[diurna, nocturna])
--      fotografia.tipo_sesion    (vals: exterior / estudio / domicilio /
--                                 todas→[exterior, estudio, domicilio])
--    Slugs renombrados: peluqueria.modalidad 'local_propio' -> 'local'.
--    "ambas"/"todas" se expanden a sus componentes concretos. Servicios con
--    el campo ya como array (idempotencia / re-aplicado) no se tocan.
--
-- 2. RPC: el WHERE para `p_modalidad` pasa de
--      (s.detalles->>'modalidad') = ANY(p_modalidad)
--    a
--      (s.detalles -> 'modalidad') ?| p_modalidad
--    `?|` (jsonb has-any-keys) matchea si el array jsonb contiene cualquiera
--    de los slugs del filtro. Sobre un escalar string da false, asi que
--    servicios con data legacy escalar dejarian de matchear — por eso la
--    migracion de DATA va PRIMERO en el mismo bloque transaccional.
--
-- Backwards-compat de la firma RPC: idem migrations/20260528 — los args y
-- el RETURNS TABLE no cambian, solo el cuerpo.
--
-- ORDEN OPERACIONAL: aplicar este archivo COMPLETO en Supabase SQL Editor
-- ANTES del deploy del cliente nuevo (commits del lado TS). Si el cliente
-- nuevo llega primero, el form va a mandar `modalidad: ['casa_tutor']` y
-- la RPC vieja con `->>` lo va a leer como NULL — falsos negativos en el
-- filtro. El BEGIN/COMMIT mantiene atomicidad de DATA + RPC.
-- ============================================================================

BEGIN;

-- ── 1. DATA: escalar → array ───────────────────────────────────────────────
--
-- Patron generico (servicios cuya categoria define el campo afectado y cuyo
-- valor actual NO es array). Una pasada por par (categoria, campo). Servicios
-- ya array, sin la key, o con value NULL, se descartan en el WHERE.
--
-- Para vals especiales (ambas/todas/local_propio), `CASE` expande/renombra.

-- 1.A — cuidado.modalidad
UPDATE public.servicios_publicados s
SET detalles = jsonb_set(
    s.detalles,
    '{modalidad}',
    to_jsonb(ARRAY[s.detalles->>'modalidad'])
)
FROM public.categorias_servicio c
WHERE c.id = s.categoria_id
  AND c.slug = 'cuidado'
  AND jsonb_typeof(s.detalles -> 'modalidad') = 'string';

-- 1.B — peluqueria.modalidad (con slug rename local_propio → local + expand ambos)
UPDATE public.servicios_publicados s
SET detalles = jsonb_set(
    s.detalles,
    '{modalidad}',
    CASE s.detalles->>'modalidad'
        WHEN 'ambos'        THEN '["local","domicilio"]'::jsonb
        WHEN 'local_propio' THEN '["local"]'::jsonb
        WHEN 'domicilio'    THEN '["domicilio"]'::jsonb
        ELSE to_jsonb(ARRAY[s.detalles->>'modalidad'])
    END
)
FROM public.categorias_servicio c
WHERE c.id = s.categoria_id
  AND c.slug = 'peluqueria'
  AND jsonb_typeof(s.detalles -> 'modalidad') = 'string';

-- 1.C — adiestramiento.formato (expand ambas)
UPDATE public.servicios_publicados s
SET detalles = jsonb_set(
    s.detalles,
    '{formato}',
    CASE s.detalles->>'formato'
        WHEN 'ambas' THEN '["individual","grupal"]'::jsonb
        ELSE to_jsonb(ARRAY[s.detalles->>'formato'])
    END
)
FROM public.categorias_servicio c
WHERE c.id = s.categoria_id
  AND c.slug = 'adiestramiento'
  AND jsonb_typeof(s.detalles -> 'formato') = 'string';

-- 1.D — adiestramiento.modalidad (sin valor compuesto pero igual hay que envolver)
UPDATE public.servicios_publicados s
SET detalles = jsonb_set(
    s.detalles,
    '{modalidad}',
    to_jsonb(ARRAY[s.detalles->>'modalidad'])
)
FROM public.categorias_servicio c
WHERE c.id = s.categoria_id
  AND c.slug = 'adiestramiento'
  AND jsonb_typeof(s.detalles -> 'modalidad') = 'string';

-- 1.E — guarderia.tipo_guarderia (expand ambas)
UPDATE public.servicios_publicados s
SET detalles = jsonb_set(
    s.detalles,
    '{tipo_guarderia}',
    CASE s.detalles->>'tipo_guarderia'
        WHEN 'ambas' THEN '["diurna","nocturna"]'::jsonb
        ELSE to_jsonb(ARRAY[s.detalles->>'tipo_guarderia'])
    END
)
FROM public.categorias_servicio c
WHERE c.id = s.categoria_id
  AND c.slug = 'guarderia'
  AND jsonb_typeof(s.detalles -> 'tipo_guarderia') = 'string';

-- 1.F — fotografia.tipo_sesion (expand todas)
UPDATE public.servicios_publicados s
SET detalles = jsonb_set(
    s.detalles,
    '{tipo_sesion}',
    CASE s.detalles->>'tipo_sesion'
        WHEN 'todas' THEN '["exterior","estudio","domicilio"]'::jsonb
        ELSE to_jsonb(ARRAY[s.detalles->>'tipo_sesion'])
    END
)
FROM public.categorias_servicio c
WHERE c.id = s.categoria_id
  AND c.slug = 'fotografia'
  AND jsonb_typeof(s.detalles -> 'tipo_sesion') = 'string';


-- ── 2. RPC: ?| en vez de = ANY sobre ->> ──────────────────────────────────
DROP FUNCTION IF EXISTS public.buscar_servicios(
    text, text[], text, integer, integer, text, numeric, numeric, text, text, text[], text[]
);

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
    p_inclusiones    text[] DEFAULT NULL::text[],
    p_modalidad      text[] DEFAULT NULL::text[]
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
            AND (
                p_inclusiones IS NULL
                OR cardinality(p_inclusiones) = 0
                OR (s.detalles -> 'inclusiones') ?& p_inclusiones
            )
            -- Sprint voice-neutral / multi-valor: modalidad ahora es array
            -- jsonb. `?|` matchea si el array contiene cualquiera de los
            -- slugs del filtro (OR semantics, identica a la anterior).
            -- Servicios cuyo detalles.modalidad no es array (no deberia
            -- haber post-migration de data, pero por defensa) no matchean.
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

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================================
-- VERIFICACION POST-APPLY (read-only, corre estas queries despues del COMMIT)
-- ============================================================================
--
-- V.1 — Ningun servicio quedo con escalar string en los campos migrados.
-- Esperado: 0 filas.
--
-- SELECT s.id, c.slug AS categoria, key, jsonb_typeof(s.detalles -> key) AS tipo
-- FROM public.servicios_publicados s
-- JOIN public.categorias_servicio c ON c.id = s.categoria_id
-- CROSS JOIN LATERAL (VALUES
--     ('cuidado',        'modalidad'),
--     ('peluqueria',     'modalidad'),
--     ('adiestramiento', 'formato'),
--     ('adiestramiento', 'modalidad'),
--     ('guarderia',      'tipo_guarderia'),
--     ('fotografia',     'tipo_sesion')
-- ) AS pares(slug, key)
-- WHERE c.slug = pares.slug
--   AND jsonb_typeof(s.detalles -> pares.key) = 'string';
--
-- V.2 — Ningun servicio quedo con valor 'ambas' o 'todas' dentro del array.
-- Esperado: 0 filas.
--
-- SELECT s.id, c.slug, s.detalles -> 'modalidad' AS m, s.detalles -> 'formato' AS f,
--        s.detalles -> 'tipo_guarderia' AS tg, s.detalles -> 'tipo_sesion' AS ts
-- FROM public.servicios_publicados s
-- JOIN public.categorias_servicio c ON c.id = s.categoria_id
-- WHERE (s.detalles -> 'modalidad') @> '"ambas"'::jsonb
--    OR (s.detalles -> 'modalidad') @> '"ambos"'::jsonb
--    OR (s.detalles -> 'formato')   @> '"ambas"'::jsonb
--    OR (s.detalles -> 'tipo_guarderia') @> '"ambas"'::jsonb
--    OR (s.detalles -> 'tipo_sesion') @> '"todas"'::jsonb;
--
-- V.3 — Ningun peluqueria.modalidad quedo con el slug viejo 'local_propio'.
-- Esperado: 0 filas.
--
-- SELECT s.id FROM public.servicios_publicados s
-- JOIN public.categorias_servicio c ON c.id = s.categoria_id
-- WHERE c.slug = 'peluqueria' AND (s.detalles -> 'modalidad') @> '"local_propio"'::jsonb;
--
-- V.4 — Smoke del filtro: la RPC responde sin error con p_modalidad sobre
-- el nuevo schema.
--
-- SELECT COUNT(*) AS n FROM buscar_servicios(
--     p_categoria_slug => 'cuidado',
--     p_modalidad      => ARRAY['casa_cuidador','casa_tutor']
-- );
-- Esperado: entero >= 0 sin error.


-- ============================================================================
-- ROLLBACK (correr SOLO si el deploy del cliente nuevo todavia no llego a
-- Vercel; con el cliente nuevo en produccion el revert deja la app rota
-- porque mandaria arrays pero la RPC vieja espera escalares en BD).
-- ============================================================================
--
-- BEGIN;
--
-- -- A. RPC: volver a la firma con `(s.detalles->>'modalidad') = ANY(...)`.
-- --    Copiar el cuerpo de migrations/20260528_buscar_servicios_modalidad.sql
-- --    (todo desde DROP FUNCTION en adelante).
--
-- -- B. DATA: convertir array → escalar (toma el primer elemento del array).
-- --    Si el array tiene >1 valor (ej. ambas opciones), informacion se pierde.
-- --    Patron por campo afectado:
-- --
-- -- UPDATE public.servicios_publicados s
-- -- SET detalles = jsonb_set(
-- --     s.detalles,
-- --     '{modalidad}',
-- --     to_jsonb((s.detalles -> 'modalidad') ->> 0)
-- -- )
-- -- FROM public.categorias_servicio c
-- -- WHERE c.id = s.categoria_id
-- --   AND c.slug = 'cuidado'
-- --   AND jsonb_typeof(s.detalles -> 'modalidad') = 'array';
-- --
-- -- (repetir para peluqueria.modalidad, adiestramiento.formato/modalidad,
-- --  guarderia.tipo_guarderia, fotografia.tipo_sesion)
--
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
-- ============================================================================
