-- ============================================================================
-- migrations/20260717_migrar_disponibilidad_legacy_a_franjas.sql
--
-- F1 agenda — INCREMENTO 5 (ULTIMO): migracion one-shot del JSONB text
-- legacy `servicios_publicados.disponibilidad` → filas en
-- `disponibilidad_semanal`. Precarga la semana tipo para que el proveedor
-- solo tenga que activar el toggle desde el editor cuando quiera.
--
-- Version 2 (2026-07-17): reescrito declarativo tras bug en v1 que insertaba
-- 0 franjas silenciosamente. La v1 usaba DO block con EXCEPTION handlers
-- anidados — sin logs visibles en el SQL Editor de Supabase (limitacion
-- conocida de RAISE NOTICE), imposible diagnosticar. La v2 es una CTE +
-- INSERT ... RETURNING que muestra las filas insertadas directo en el
-- panel de resultados; si algo se sigue rompiendo, cada CTE es una query
-- independiente para desplegar el pipeline paso a paso.
--
-- CRITERIO estricto (idem v1):
--   1. Solo categorias F1 (paseos, peluqueria, adiestramiento,
--      veterinario, traslado).
--   2. Solo servicios con `disponibilidad` no vacio.
--   3. Solo servicios SIN franjas en disponibilidad_semanal (NOT EXISTS) —
--      no clobber si el proveedor ya configuro manual desde el editor.
--   4. Solo dias con `activo=true` y horas coherentes (hasta > desde).
--   5. `duracion_slot_min` queda NULL — proveedor opta manual.
--   6. Fallback silencioso: parse invalido → skip (helper try_jsonb).
--
-- IDEMPOTENTE: NOT EXISTS + ON CONFLICT DO NOTHING. Re-correr es no-op
-- para servicios ya migrados.
--
-- APLICAR: staging primero (jmtadvdkicyylcwjcmcl), verificar que el
-- RETURNING muestra las filas esperadas de los servicios demo, luego prod
-- (ouezpeeiwjwawauidrqq) en el merge de Fase 1.
-- ============================================================================


-- ============================================================================
-- (1) Helper: try_jsonb(text) → jsonb NULL si el parse falla.
--
-- Existe porque el cast puro `text::jsonb` en un WHERE/CTE aborta la query
-- ENTERA si UNA sola fila tiene JSON invalido. Esta funcion atrapa el
-- error por fila y devuelve NULL — los CTEs pueden filtrar `IS NOT NULL`.
--
-- IMMUTABLE es honesto: mismo input → mismo output (el parse es
-- deterministico). PARALLEL SAFE para poder usarse en queries paralelas.
-- Queda en el schema public como utility — es una funcion generica util
-- para cualquier otra migracion que necesite parseo defensivo. Si se
-- quiere limpiar despues, DROP FUNCTION public.try_jsonb(text).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.try_jsonb(txt TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE PARALLEL SAFE
AS $$
BEGIN
    IF txt IS NULL OR trim(txt) = '' THEN
        RETURN NULL;
    END IF;
    RETURN txt::jsonb;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END $$;

COMMENT ON FUNCTION public.try_jsonb(text) IS
    'Parseo defensivo de texto a JSONB. Devuelve NULL si el input no es '
    'JSON valido o si el input esta vacio/NULL. Util en migraciones/CTEs '
    'donde el cast puro abortaria la query entera por una sola fila mala.';


-- ============================================================================
-- (2) Diagnostico opcional — desplegar el pipeline SIN insertar.
--
-- Descomentar y correr ANTES del INSERT si el INSERT devuelve 0 filas
-- inesperadamente. Cada CTE es un stage; la ultima query muestra que
-- llega a `franjas_validas` y por que se filtran las demas.
-- ============================================================================

/*
WITH candidatos AS (
    SELECT s.id AS sid, s.disponibilidad AS raw, s.titulo
    FROM public.servicios_publicados s
    JOIN public.categorias_servicio c ON c.id = s.categoria_id
    WHERE c.slug IN ('paseos', 'peluqueria', 'adiestramiento', 'veterinario', 'traslado')
      AND s.disponibilidad IS NOT NULL
      AND trim(s.disponibilidad) <> ''
      AND NOT EXISTS (
          SELECT 1 FROM public.disponibilidad_semanal ds WHERE ds.servicio_id = s.id
      )
),
parseados AS (
    SELECT sid, titulo, public.try_jsonb(raw) AS jdata
    FROM candidatos
)
SELECT
    sid, titulo,
    jdata IS NOT NULL AS parseo_ok,
    CASE WHEN jdata IS NOT NULL THEN jsonb_typeof(jdata) ELSE NULL END AS shape,
    jsonb_object_keys(jdata) AS claves
FROM parseados
WHERE jdata IS NOT NULL AND jsonb_typeof(jdata) = 'object';
*/


-- ============================================================================
-- (3) MIGRACION principal — CTE + INSERT ... RETURNING.
--
-- El RETURNING devuelve las filas insertadas directo al panel del SQL
-- Editor. Cero necesidad de RAISE NOTICE. Si retorna 0 filas y esperabas
-- N, corre el DIAGNOSTICO opcional de arriba para ver donde muere el
-- pipeline (parseo, shape, dia no matcheado, activo false, horas
-- invalidas, ON CONFLICT).
-- ============================================================================

WITH candidatos AS (
    -- Servicios F1 con disponibilidad no vacia y sin franjas ya cargadas.
    SELECT
        s.id AS sid,
        public.try_jsonb(s.disponibilidad) AS jdata
    FROM public.servicios_publicados s
    JOIN public.categorias_servicio c ON c.id = s.categoria_id
    WHERE c.slug IN ('paseos', 'peluqueria', 'adiestramiento', 'veterinario', 'traslado')
      AND s.disponibilidad IS NOT NULL
      AND trim(s.disponibilidad) <> ''
      AND NOT EXISTS (
          SELECT 1 FROM public.disponibilidad_semanal ds
          WHERE ds.servicio_id = s.id
      )
),
parseables AS (
    -- Solo los que parsean a objeto JSONB. Los que fallaron parse (o son
    -- array / valor primitivo) quedan afuera.
    SELECT sid, jdata FROM candidatos
    WHERE jdata IS NOT NULL AND jsonb_typeof(jdata) = 'object'
),
dias AS (
    -- Mapeo ES → ISO. Claves del legacy con tildes en Miercoles/Sabado
    -- (asi lo escribe el editor). Si algun seed las tiene sin tilde, esa
    -- fila no matchea y ese dia se saltea — el resto de dias se procesa
    -- OK. Cero franjas totales NO puede explicarse por tildes solo.
    SELECT * FROM (VALUES
        ('Lunes', 1),
        ('Martes', 2),
        ('Miércoles', 3),
        ('Jueves', 4),
        ('Viernes', 5),
        ('Sábado', 6),
        ('Domingo', 7)
    ) AS t(dkey, diso)
),
franjas_raw AS (
    -- Producto cartesiano servicio × 7 dias. Filtra los pares donde el
    -- JSON no tiene la clave del dia (o no es objeto).
    SELECT
        p.sid,
        d.diso,
        p.jdata -> d.dkey AS dia_obj
    FROM parseables p
    CROSS JOIN dias d
    WHERE (p.jdata -> d.dkey) IS NOT NULL
      AND jsonb_typeof(p.jdata -> d.dkey) = 'object'
),
franjas_validas AS (
    -- Extrae desde/hasta, filtra activo=true y horas coherentes.
    -- `(dia_obj ->> 'activo')::BOOLEAN = true` — si el valor es boolean
    -- JSON `true`, ->>` devuelve string `'true'`, castea OK. Si es
    -- `"true"` string (defensa por si algun seed lo guardo string),
    -- tambien castea. `false` / null → filtra fuera.
    SELECT
        sid,
        diso,
        substring(dia_obj ->> 'desde' FROM 1 FOR 5) AS hd,
        substring(dia_obj ->> 'hasta' FROM 1 FOR 5) AS hh
    FROM franjas_raw
    WHERE coalesce((dia_obj ->> 'activo')::BOOLEAN, false) = true
      AND (dia_obj ->> 'desde') IS NOT NULL
      AND (dia_obj ->> 'hasta') IS NOT NULL
      AND substring(dia_obj ->> 'desde' FROM 1 FOR 5) <> ''
      AND substring(dia_obj ->> 'hasta' FROM 1 FOR 5) <> ''
      AND substring(dia_obj ->> 'hasta' FROM 1 FOR 5) > substring(dia_obj ->> 'desde' FROM 1 FOR 5)
)
INSERT INTO public.disponibilidad_semanal (servicio_id, dia_semana, hora_desde, hora_hasta)
SELECT sid, diso, hd::TIME, hh::TIME
FROM franjas_validas
ON CONFLICT (servicio_id, dia_semana, hora_desde) DO NOTHING
RETURNING servicio_id, dia_semana, hora_desde, hora_hasta;


-- ============================================================================
-- Verificacion post-migracion (correr como statements separados):
--
-- 1) Total de franjas en la tabla:
--   SELECT count(*) FROM public.disponibilidad_semanal;
--
-- 2) Servicios F1 que quedaron con franjas:
--   SELECT count(DISTINCT s.id) AS servicios_con_franjas
--     FROM public.servicios_publicados s
--     JOIN public.categorias_servicio c ON c.id = s.categoria_id
--     JOIN public.disponibilidad_semanal ds ON ds.servicio_id = s.id
--    WHERE c.slug IN ('paseos', 'peluqueria', 'adiestramiento',
--                     'veterinario', 'traslado');
--
-- 3) Servicios F1 que quedaron sin franjas (legacy vacio o parse fallido):
--   SELECT s.id, s.titulo, left(s.disponibilidad, 80) AS disponibilidad_preview
--     FROM public.servicios_publicados s
--     JOIN public.categorias_servicio c ON c.id = s.categoria_id
--    WHERE c.slug IN ('paseos', 'peluqueria', 'adiestramiento',
--                     'veterinario', 'traslado')
--      AND NOT EXISTS (
--          SELECT 1 FROM public.disponibilidad_semanal ds
--          WHERE ds.servicio_id = s.id
--      );
--
-- 4) Confirmar que NADIE quedo con agenda activa por accidente:
--   SELECT count(*) FROM public.servicios_publicados
--    WHERE duracion_slot_min IS NOT NULL;
--   Esperado: 0 + los que Aldo activo manual en staging.
-- ============================================================================
