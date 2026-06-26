-- ============================================================================
-- migrations/20260626_agendamientos_columnas_para_rango_fechas.sql
--
-- FASE 0 del feature "rango de fechas multi-dia segun categoria" en agendamiento.
-- Agrega 5 columnas a `agendamientos` que las Fases 1-3 del codigo (commits
-- separados posteriores) van a empezar a poblar:
--
--   Fase 1 (rango noches V2):   fecha_fin
--   Fase 2 (cuidado a domicilio V4a/V4b):  modalidad_elegida + modo_tarifa
--                                          + duracion_horas + direccion_servicio
--   Fase 3 (guarderia V3):     usa fecha_fin (no agrega columnas, fecha_fin es generica)
--
-- TODAS NULLABLE — el INSERT actual del SolicitarAgendamientoModal.tsx
-- (`{servicio_id, proveedor_id, tutor_id, fecha_preferida, mensaje}`) no envia
-- ninguna de estas columnas. Las filas existentes quedan con NULL en todas.
-- Postgres acepta el INSERT sin tocar columnas nullable. Cero regresion en
-- comportamiento actual.
--
-- NO afecta:
--   - UNIQUE parcial agendamientos_unique_pendiente_por_tutor_servicio: indexa
--     (tutor_id, servicio_id) WHERE estado='pendiente'. Las nuevas columnas no
--     estan en ningun lado del index. Sigue funcionando identico.
--   - Trigger set_respondido_at_on_response: solo lee NEW.estado y OLD.estado.
--   - Policies RLS: solo validan ownership + estado.
--   - Schema baseline 20260625_agendamientos_baseline.sql: no se modifica.
--
-- IDEMPOTENTE: `ADD COLUMN IF NOT EXISTS` (PG 9.6+) + nombres de constraint
-- explicitos con `DO $$` + `IF NOT EXISTS` lookup en pg_constraint. Re-correr
-- es no-op.
--
-- APLICADA Y VERIFICADA: 2026-06-26 en staging (jmtadvdkicyylcwjcmcl) y prod
-- (ouezpeeiwjwawauidrqq). Las 4 verificaciones del bloque final dieron OK en
-- ambos. Este archivo queda en el repo para versionado/recovery — no se
-- re-ejecuta porque ya esta aplicada (igual es idempotente si se necesita).
-- ============================================================================


-- ============================================================================
-- COLUMNA 1 — fecha_fin
-- Usada por V2 (cuidado rango noches sin direccion), V3 (guarderia dia[s] con
-- horario), V4a (cuidado a domicilio rango noches). Para V2/V4a representa la
-- fecha de check-out (sin hora); para V3 representa el ultimo dia de
-- recurrencia (sin hora). Para V1 (puntual) y V4b (cuidado a domicilio por
-- hora) queda NULL.
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS fecha_fin timestamptz NULL;

-- CHECK fecha_fin > fecha_preferida cuando aplica. Defensa BD del invariante
-- que el modal valida client-side. NULL es OK (V1, V4b no lo usan).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_fecha_fin_posterior_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_fecha_fin_posterior_check
            CHECK (fecha_fin IS NULL OR fecha_fin > fecha_preferida);
    END IF;
END $$;


-- ============================================================================
-- COLUMNA 2 — modalidad_elegida
-- Solo se popula cuando el servicio es de categoria 'cuidado' y el proveedor
-- ofrece >=1 modalidad. El tutor elige cual de las modalidades disponibles
-- esta solicitando. Para servicios donde la modalidad esta implicita (otras
-- categorias) o el servicio solo ofrece una modalidad, queda NULL.
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS modalidad_elegida text NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_modalidad_elegida_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_modalidad_elegida_check
            CHECK (
                modalidad_elegida IS NULL
                OR modalidad_elegida IN ('casa_tutor', 'casa_cuidador', 'recinto')
            );
    END IF;
END $$;


-- ============================================================================
-- COLUMNA 3 — modo_tarifa
-- Distingue V4a (rango de noches en casa del tutor) de V4b (servicio puntual
-- a domicilio por hora) cuando la modalidad elegida es casa_tutor. Para el
-- resto de las variantes queda NULL (se infiere por la presencia/ausencia de
-- fecha_fin y duracion_horas, pero persistirlo es explicito + defensivo).
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS modo_tarifa text NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_modo_tarifa_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_modo_tarifa_check
            CHECK (
                modo_tarifa IS NULL
                OR modo_tarifa IN ('noches', 'horas')
            );
    END IF;
END $$;


-- ============================================================================
-- COLUMNA 4 — duracion_horas
-- Solo V4b (cuidado a domicilio por hora). Cuantas horas dura la visita
-- puntual. Para el resto queda NULL. Bounds 1-12 razonables — si en el
-- futuro hace falta mas (ej. 24h), ajustar.
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS duracion_horas integer NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_duracion_horas_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_duracion_horas_check
            CHECK (
                duracion_horas IS NULL
                OR (duracion_horas >= 1 AND duracion_horas <= 12)
            );
    END IF;
END $$;


-- ============================================================================
-- COLUMNA 5 — direccion_servicio
-- Texto libre (no estructurado — no es sprint de geocoding). Solo V4a y V4b
-- (cuidado a domicilio) lo populan, porque el proveedor necesita saber a
-- donde ir. Para el resto queda NULL.
-- Max 500 chars defensivo contra payloads grandes; sino el text es unbounded.
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS direccion_servicio text NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_direccion_servicio_max_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_direccion_servicio_max_check
            CHECK (
                direccion_servicio IS NULL
                OR length(direccion_servicio) <= 500
            );
    END IF;
END $$;


-- ============================================================================
-- CHECK COMPUESTO — direccion_servicio solo aplica cuando modalidad=casa_tutor
-- Defensa de BD vs payload manipulado que mande direccion sin la modalidad
-- correspondiente. Si la app evoluciona y necesita direccion en otra
-- modalidad, ajustar este CHECK (no es invariante fundacional).
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_direccion_solo_casa_tutor_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_direccion_solo_casa_tutor_check
            CHECK (
                direccion_servicio IS NULL
                OR modalidad_elegida = 'casa_tutor'
            );
    END IF;
END $$;


-- ============================================================================
-- COMENTARIOS sobre las columnas (visibles en \d+ agendamientos y en
-- dashboards Supabase — utiles para el proximo dev/sesion que mire la tabla
-- sin contexto)
-- ============================================================================

COMMENT ON COLUMN public.agendamientos.fecha_fin IS
    'Fecha de fin del servicio multi-dia (V2 cuidado rango noches, V3 guarderia '
    'dia[s] con horario, V4a cuidado a domicilio rango noches). NULL para '
    'servicios puntuales (V1) y por-hora (V4b).';

COMMENT ON COLUMN public.agendamientos.modalidad_elegida IS
    'Cuando el servicio es de categoria cuidado y ofrece >=1 modalidad, el '
    'tutor elige cual solicita. Valores: casa_tutor | casa_cuidador | recinto. '
    'NULL para otras categorias o cuando solo hay 1 modalidad disponible.';

COMMENT ON COLUMN public.agendamientos.modo_tarifa IS
    'Solo cuando modalidad_elegida=casa_tutor: distingue noches (V4a rango) de '
    'horas (V4b puntual). NULL en otras variantes.';

COMMENT ON COLUMN public.agendamientos.duracion_horas IS
    'Solo V4b (cuidado a domicilio por hora). Cuantas horas dura la visita. '
    'Bounds 1-12.';

COMMENT ON COLUMN public.agendamientos.direccion_servicio IS
    'Direccion del tutor donde se presta el servicio. Solo V4a y V4b (cuando '
    'modalidad_elegida=casa_tutor). Texto libre, max 500 chars.';


-- ============================================================================
-- VERIFICACIONES post-apply (correr y revisar antes de cerrar la ventana)
-- ============================================================================

-- V1: las 5 columnas nuevas existen, todas nullable
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'agendamientos'
--   AND column_name IN ('fecha_fin', 'modalidad_elegida', 'modo_tarifa',
--                       'duracion_horas', 'direccion_servicio')
-- ORDER BY column_name;

-- V2: los 6 constraints nuevos existen
-- SELECT conname, pg_get_constraintdef(oid) AS definicion
-- FROM pg_constraint
-- WHERE conrelid = 'public.agendamientos'::regclass
--   AND conname IN (
--       'agendamientos_fecha_fin_posterior_check',
--       'agendamientos_modalidad_elegida_check',
--       'agendamientos_modo_tarifa_check',
--       'agendamientos_duracion_horas_check',
--       'agendamientos_direccion_servicio_max_check',
--       'agendamientos_direccion_solo_casa_tutor_check'
--   )
-- ORDER BY conname;

-- V3: el UNIQUE parcial anti-duplicados sigue intacto
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'agendamientos'
--   AND indexname = 'agendamientos_unique_pendiente_por_tutor_servicio';

-- V4: los registros existentes quedan validos (todas las nuevas en NULL)
-- SELECT
--     count(*) AS total,
--     count(*) FILTER (WHERE fecha_fin IS NULL) AS sin_fecha_fin,
--     count(*) FILTER (WHERE modalidad_elegida IS NULL) AS sin_modalidad,
--     count(*) FILTER (WHERE modo_tarifa IS NULL) AS sin_modo,
--     count(*) FILTER (WHERE duracion_horas IS NULL) AS sin_duracion,
--     count(*) FILTER (WHERE direccion_servicio IS NULL) AS sin_direccion
-- FROM public.agendamientos;
