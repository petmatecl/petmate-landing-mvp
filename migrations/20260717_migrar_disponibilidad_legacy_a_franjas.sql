-- ============================================================================
-- migrations/20260717_migrar_disponibilidad_legacy_a_franjas.sql
--
-- F1 agenda — INCREMENTO 5 (ULTIMO): migracion one-shot del JSONB text
-- legacy `servicios_publicados.disponibilidad` → filas en
-- `disponibilidad_semanal`. Precarga la semana tipo para que el proveedor
-- solo tenga que activar el toggle desde el editor cuando quiera.
--
-- Contexto: el editor tiene un boton "Importar mi horario actual" (Commit B
-- del Incremento 2) que hace lo mismo pero requiere que el proveedor lo
-- clickee. Con esta migracion los servicios de categorias F1 con horario
-- legacy quedan listos para opt-in sin friccion.
--
-- CRITERIO estricto:
--   1. Solo servicios de categorias F1 (paseos, peluqueria, adiestramiento,
--      veterinario, traslado). Cuidado/guarderia quedan fuera (F2/F3).
--   2. Solo servicios que YA tienen `disponibilidad` text no vacio.
--   3. Solo servicios SIN franjas en disponibilidad_semanal (NOT EXISTS) —
--      evita clobber si el proveedor ya configuro su semana manual desde
--      el editor.
--   4. Solo dias con `activo=true` y horas coherentes (hasta > desde) se
--      convierten en franjas. Dias inactivos o mal formados se saltean.
--   5. NO se activa la agenda automaticamente. `duracion_slot_min` queda
--      NULL — el proveedor decide cuando activarla (decision de producto
--      #14: agendamiento_habilitado sigue gateando, y duracion_slot_min
--      NULL = opt-out del sistema nuevo, se mantiene flujo viejo).
--   6. Fallback silencioso: si el parse del JSONB falla, se saltea el
--      servicio con RAISE NOTICE (decision de producto #13: migracion con
--      fallback a opt-out).
--
-- IDEMPOTENTE: el filtro NOT EXISTS + INSERT ... ON CONFLICT DO NOTHING
-- garantiza que re-correr es no-op para servicios ya migrados o con
-- franjas manuales.
--
-- DECISION DE VEHICULO: SQL puro (DO block PL/pgSQL) vs script Node.
--   - SQL puro: menos superficie, sin dependencias externas, corre en el
--     SQL Editor de Supabase como cualquier otra migration. Parse defensivo
--     con `disponibilidad::jsonb` dentro de un BEGIN/EXCEPTION block.
--   - Script Node: mas flexible pero requiere setear creds del service_role
--     localmente. Overkill para una migration one-shot.
-- Elegido: SQL puro.
--
-- APLICAR: staging (jmtadvdkicyylcwjcmcl) primero, verificar los RAISE
-- NOTICE del final, luego prod (ouezpeeiwjwawauidrqq) en el merge de
-- Fase 1.
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    parsed JSONB;
    dia_data JSONB;
    dia_iso INT;
    dia_key TEXT;
    hora_desde TEXT;
    hora_hasta TEXT;
    activo BOOLEAN;
    dias_map CONSTANT TEXT[] := ARRAY[
        'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
    ];
    dias_iso CONSTANT INT[] := ARRAY[1, 2, 3, 4, 5, 6, 7];
    i INT;
    stats_procesados INT := 0;
    stats_franjas_insertadas INT := 0;
    stats_skip_parse INT := 0;
    stats_skip_sin_activos INT := 0;
BEGIN
    FOR r IN
        SELECT s.id, s.disponibilidad
        FROM public.servicios_publicados s
        JOIN public.categorias_servicio c ON c.id = s.categoria_id
        WHERE c.slug IN ('paseos', 'peluqueria', 'adiestramiento', 'veterinario', 'traslado')
          AND s.disponibilidad IS NOT NULL
          AND trim(s.disponibilidad) <> ''
          AND NOT EXISTS (
              SELECT 1 FROM public.disponibilidad_semanal ds
              WHERE ds.servicio_id = s.id
          )
    LOOP
        stats_procesados := stats_procesados + 1;

        -- Parse defensivo. Si `disponibilidad` no es JSON valido (ej. texto
        -- declarativo "Lunes a viernes 9-18" de la epoca pre-editor), la
        -- excepcion se atrapa y el servicio se saltea. Decision 13:
        -- fallback silencioso a opt-out.
        BEGIN
            parsed := r.disponibilidad::jsonb;
        EXCEPTION WHEN OTHERS THEN
            stats_skip_parse := stats_skip_parse + 1;
            RAISE NOTICE 'skip parse: servicio_id=% (disponibilidad no es JSON valido)', r.id;
            CONTINUE;
        END;

        -- Si el parse dio JSON pero no es un objeto (ej. array o valor
        -- primitivo), tambien skip.
        IF jsonb_typeof(parsed) <> 'object' THEN
            stats_skip_parse := stats_skip_parse + 1;
            RAISE NOTICE 'skip shape: servicio_id=% (JSON no es objeto)', r.id;
            CONTINUE;
        END IF;

        -- Iterar los 7 dias del mapa. Cada dia con activo=true + horas
        -- coherentes → 1 franja. Multi-franja NO aplica (el shape legacy
        -- soporta solo un rango por dia).
        FOR i IN 1..7 LOOP
            dia_key := dias_map[i];
            dia_iso := dias_iso[i];
            dia_data := parsed -> dia_key;

            -- Dia no presente en el JSON o no es objeto → skip dia.
            CONTINUE WHEN dia_data IS NULL OR jsonb_typeof(dia_data) <> 'object';

            -- activo=false o ausente → skip dia.
            BEGIN
                activo := (dia_data ->> 'activo')::BOOLEAN;
            EXCEPTION WHEN OTHERS THEN
                CONTINUE;
            END;
            CONTINUE WHEN NOT activo;

            -- Horas: normalizar a HH:MM (input type=time frontend usa 5
            -- chars; algunos historicos pueden tener HH:MM:SS).
            hora_desde := substring(coalesce(dia_data ->> 'desde', '') FROM 1 FOR 5);
            hora_hasta := substring(coalesce(dia_data ->> 'hasta', '') FROM 1 FOR 5);

            -- Skip si horas invalidas o rango invertido / cero.
            CONTINUE WHEN hora_desde = '' OR hora_hasta = '' OR hora_hasta <= hora_desde;

            -- Insert con ON CONFLICT para hacer el UPDATE idempotente si el
            -- proveedor tocó desde el editor entre corridas del script.
            BEGIN
                INSERT INTO public.disponibilidad_semanal
                    (servicio_id, dia_semana, hora_desde, hora_hasta)
                VALUES (r.id, dia_iso, hora_desde::TIME, hora_hasta::TIME)
                ON CONFLICT (servicio_id, dia_semana, hora_desde) DO NOTHING;

                stats_franjas_insertadas := stats_franjas_insertadas + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'skip insert: servicio_id=% dia=% (%: %)',
                    r.id, dia_key, SQLSTATE, SQLERRM;
            END;
        END LOOP;
    END LOOP;

    RAISE NOTICE '─── Resumen migracion legacy → franjas ───';
    RAISE NOTICE 'Servicios F1 procesados: %', stats_procesados;
    RAISE NOTICE 'Franjas insertadas:      %', stats_franjas_insertadas;
    RAISE NOTICE 'Skip por parse invalido: %', stats_skip_parse;
END $$;

-- ============================================================================
-- Verificacion (correr como statement separado):
--
-- 1) Cuantos servicios F1 quedaron con franjas post-migracion:
--
--   SELECT count(DISTINCT s.id) AS servicios_con_franjas
--     FROM public.servicios_publicados s
--     JOIN public.categorias_servicio c ON c.id = s.categoria_id
--     JOIN public.disponibilidad_semanal ds ON ds.servicio_id = s.id
--    WHERE c.slug IN ('paseos', 'peluqueria', 'adiestramiento',
--                     'veterinario', 'traslado');
--
-- 2) Cuantos servicios F1 quedaron sin franjas (parse fallido o legacy
--    vacio):
--
--   SELECT count(*) AS servicios_sin_franjas
--     FROM public.servicios_publicados s
--     JOIN public.categorias_servicio c ON c.id = s.categoria_id
--    WHERE c.slug IN ('paseos', 'peluqueria', 'adiestramiento',
--                     'veterinario', 'traslado')
--      AND NOT EXISTS (
--          SELECT 1 FROM public.disponibilidad_semanal ds
--          WHERE ds.servicio_id = s.id
--      );
--
-- 3) Muestra: primeras 5 franjas insertadas para revision visual.
--
--   SELECT s.titulo, ds.dia_semana, ds.hora_desde, ds.hora_hasta
--     FROM public.disponibilidad_semanal ds
--     JOIN public.servicios_publicados s ON s.id = ds.servicio_id
--    ORDER BY ds.created_at DESC
--    LIMIT 15;
--
-- 4) Ningun servicio quedo con duracion_slot_min activada por accidente
--    (decision: opt-in manual):
--
--   SELECT count(*) AS con_agenda_activa
--     FROM public.servicios_publicados
--    WHERE duracion_slot_min IS NOT NULL;
--
--   Esperado: 0 mas los servicios que Aldo activo manual en staging.
-- ============================================================================
