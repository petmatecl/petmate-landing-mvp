-- ============================================================================
-- migrations/20260718_agenda_estadia_schema.sql
--
-- FASE 2 del roadmap "agenda con disponibilidad real" — Incremento F2-1:
-- SCHEMA para cuidado por rango de noches (mundo Airbnb).
--
-- Decisiones cerradas (Aldo, tras el paquete de 14):
--   - V2 (casa_cuidador/recinto) y V4a (casa_tutor noches) juntas en F2.
--   - Blackouts extienden `excepciones_disponibilidad` con `fecha_fin`
--     (no tabla propia). Discriminador implicito: fecha_fin NULL = F1
--     (horaria o dia completo); fecha_fin NOT NULL = F2 (rango de noches).
--   - Capacidad simultanea desde F2-1: capacidad_estadia en servicios,
--     capacidad_snapshot_estadia denormalizada en agendamientos. EXCLUDE
--     aplica solo cap=1; grupales van por advisory lock en el endpoint.
--   - Picker calendario mensual con react-day-picker (ya en deps).
--   - Anticipacion PROPIA (min_dias / max_dias_estadia), no reusa la de F1.
--   - min_noches default 1 + max_noches NULL (sin tope).
--   - Ventana anti-abuso: cancelacion_min_horas_antes default 48h — primera
--     restriccion preventiva justificada por asimetria economica de las
--     estadias (bloqueo de calendar por dias, sin tiempo de re-vender).
--   - cancelada_proveedor identico a F1.
--   - check_in_hora / check_out_hora opcionales — si NULL, hint "coordinar
--     por chat" en la UI.
--   - Instant-book primero (request-to-book queda F2.5 condicional).
--   - Templates de email reusan branching por fecha_fin.
--
-- DEFAULTS elegidos y justificados:
--   - anticipacion_min_dias = 3: para estadias, 24h es muy poco (el proveedor
--     necesita organizar espacio, comida, veterinario si aplica). 3 dias
--     es el estandar Booking/Airbnb para "reasonable notice". Rango 0-30.
--   - anticipacion_max_dias_estadia = 180: 6 meses. Cubre planificacion de
--     vacaciones (verano austral, viajes de fin de año) sin ser especulativo.
--     Airbnb usa 12 meses; aca conservador. Rango 1-730.
--   - cancelacion_min_horas_antes = 48: dos dias. Cancelacion 24h antes de
--     una estadia de una semana deja al cuidador con calendar bloqueado y
--     cero tiempo de re-vender — distinto de un paseo de 60 min. 48h es
--     compromiso justo. Rango 0-168 (una semana).
--   - min_noches = 1: default sin friccion. El proveedor sube el minimo si
--     su modelo lo requiere (hotel canino tipico pide 2-3 noches minimo).
--
-- IDEMPOTENTE: CREATE OR REPLACE FUNCTION, DO $$ IF NOT EXISTS lookup,
-- ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF EXISTS + ADD. Re-correr
-- es no-op.
--
-- DISJUNTEZ con F1: el EXCLUDE de F1 (`agendamientos_no_solape_confirmadas`)
-- filtra `fecha_fin IS NULL`. El de F2 (nuevo) filtra `fecha_fin IS NOT
-- NULL`. Ninguna fila puede activar ambos — scopes perfectamente disjuntos.
--
-- APLICAR: staging (jmtadvdkicyylcwjcmcl) primero, correr las V1-V8 al pie,
-- luego prod (ouezpeeiwjwawauidrqq) en el merge final de F2.
-- ============================================================================


-- ============================================================================
-- (a) excepciones_disponibilidad — agregar fecha_fin + CHECK trilogia.
--
-- Shapes validos post-migracion:
--   F1a (dia completo):  fecha_fin NULL,     hora_desde NULL,     hora_hasta NULL
--   F1b (franja horaria):fecha_fin NULL,     hora_desde NOT NULL, hora_hasta NOT NULL, hora_hasta > hora_desde
--   F2  (rango noches):  fecha_fin NOT NULL, fecha_fin > fecha,   hora_desde NULL,     hora_hasta NULL
--
-- fecha_fin > fecha (estricto): un blackout F2 tiene siempre >=1 noche.
-- Bloqueos de UN dia solo se hacen con F1a (fecha_fin NULL). Esto tambien
-- garantiza que daterange(_start, _end, '[)') nunca sea vacio en el
-- EXCLUDE.
-- ============================================================================

ALTER TABLE public.excepciones_disponibilidad
    ADD COLUMN IF NOT EXISTS fecha_fin date NULL;

-- Reemplazar el CHECK viejo (que asumia fecha_fin no existente) por uno
-- que cubra los 3 shapes.
ALTER TABLE public.excepciones_disponibilidad
    DROP CONSTRAINT IF EXISTS excepciones_disponibilidad_horas_check;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'excepciones_disponibilidad_shape_check') THEN
        ALTER TABLE public.excepciones_disponibilidad
            ADD CONSTRAINT excepciones_disponibilidad_shape_check
            CHECK (
                -- F1a: dia completo
                (fecha_fin IS NULL AND hora_desde IS NULL AND hora_hasta IS NULL)
                -- F1b: franja horaria
                OR (fecha_fin IS NULL AND hora_desde IS NOT NULL AND hora_hasta IS NOT NULL AND hora_hasta > hora_desde)
                -- F2: rango de noches
                OR (fecha_fin IS NOT NULL AND fecha_fin > fecha AND hora_desde IS NULL AND hora_hasta IS NULL)
            );
    END IF;
END $$;

COMMENT ON COLUMN public.excepciones_disponibilidad.fecha_fin IS
    'F2 agenda estadia — cuando NOT NULL, la fila es un blackout de rango '
    '(check-out del blackout, semi-abierto [fecha, fecha_fin)). Cuando NULL, '
    'la fila es una excepcion F1 (dia completo si hora_desde/hasta tambien '
    'NULL; franja horaria si populadas). El shape se garantiza por el '
    'CHECK excepciones_disponibilidad_shape_check.';


-- ============================================================================
-- (b) COLUMNAS nuevas en servicios_publicados para F2
-- ============================================================================

ALTER TABLE public.servicios_publicados
    ADD COLUMN IF NOT EXISTS capacidad_estadia integer NULL,
    ADD COLUMN IF NOT EXISTS anticipacion_min_dias integer NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS anticipacion_max_dias_estadia integer NOT NULL DEFAULT 180,
    ADD COLUMN IF NOT EXISTS min_noches integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS max_noches integer NULL,
    ADD COLUMN IF NOT EXISTS cancelacion_min_horas_antes integer NOT NULL DEFAULT 48,
    ADD COLUMN IF NOT EXISTS check_in_hora time NULL,
    ADD COLUMN IF NOT EXISTS check_out_hora time NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_capacidad_estadia_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_capacidad_estadia_check
            CHECK (capacidad_estadia IS NULL OR (capacidad_estadia BETWEEN 1 AND 20));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_anticipacion_min_dias_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_anticipacion_min_dias_check
            CHECK (anticipacion_min_dias >= 0 AND anticipacion_min_dias <= 30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_anticipacion_max_dias_estadia_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_anticipacion_max_dias_estadia_check
            CHECK (anticipacion_max_dias_estadia >= 1 AND anticipacion_max_dias_estadia <= 730);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_min_noches_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_min_noches_check
            CHECK (min_noches >= 1 AND min_noches <= 90);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_max_noches_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_max_noches_check
            CHECK (max_noches IS NULL OR (max_noches >= 1 AND max_noches <= 365));
    END IF;
    -- Cross-column: si max_noches populado, tiene que ser >= min_noches.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_noches_consistencia_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_noches_consistencia_check
            CHECK (max_noches IS NULL OR max_noches >= min_noches);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_cancelacion_min_horas_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_cancelacion_min_horas_check
            CHECK (cancelacion_min_horas_antes >= 0 AND cancelacion_min_horas_antes <= 168);
    END IF;
END $$;

COMMENT ON COLUMN public.servicios_publicados.capacidad_estadia IS
    'F2 agenda estadia — cuantas estadias simultaneas puede tener el '
    'servicio. NULL = opt-out del sistema nuevo (sigue flujo viejo V2/V4a '
    'sin picker calendario ni EXCLUDE). 1 = individual (default al activar). '
    '>1 = grupal (hotel felino, cuidador con jardin). Rango 1-20. La regla '
    'de cupo grupal la enforza el endpoint con advisory lock; el EXCLUDE '
    'anti-solape solo aplica a capacidad=1.';

COMMENT ON COLUMN public.servicios_publicados.anticipacion_min_dias IS
    'F2 — dias de anticipacion minima para reservar una estadia. Default 3. '
    'Distinto de anticipacion_min_horas de F1 porque el mental model del '
    'cuidador de estadia es "dias" (organizar espacio, comida), no "horas".';

COMMENT ON COLUMN public.servicios_publicados.anticipacion_max_dias_estadia IS
    'F2 — dias hacia adelante que el tutor puede reservar. Default 180 '
    '(6 meses). Cubre planificacion de vacaciones sin ser especulativo.';

COMMENT ON COLUMN public.servicios_publicados.min_noches IS
    'F2 — longitud minima de estadia (noches). Default 1 (sin friccion). '
    'Hotel canino tipico pide 2-3 noches; algunos cuidadores exigen '
    'semanas completas.';

COMMENT ON COLUMN public.servicios_publicados.max_noches IS
    'F2 — longitud maxima de estadia (noches). NULL = sin tope (default). '
    'Cuando populado, debe ser >= min_noches.';

COMMENT ON COLUMN public.servicios_publicados.cancelacion_min_horas_antes IS
    'F2 — horas antes del check-in bajo las cuales el tutor NO puede '
    'cancelar (primera restriccion preventiva de cancelacion, justificada '
    'por asimetria economica de las estadias: calendar bloqueado por dias '
    'sin tiempo de re-vender). Default 48h. Rango 0-168 (una semana). '
    'Distinto de F1 donde no hay ventana anti-abuso (paseo de 60 min '
    'cancelado 25h antes tiene bajo costo).';

COMMENT ON COLUMN public.servicios_publicados.check_in_hora IS
    'F2 — hora sugerida de check-in (ej. 15:00). NULL = "coordinar por '
    'chat" en la UI. Solo se renderiza en ficha publica y emails si el '
    'proveedor la define.';

COMMENT ON COLUMN public.servicios_publicados.check_out_hora IS
    'F2 — hora sugerida de check-out (ej. 11:00). Idem check_in_hora.';


-- ============================================================================
-- (c) capacidad_snapshot_estadia en agendamientos — denormalizacion
-- requerida por el EXCLUDE de F2 (Postgres no permite JOIN en index
-- predicates). El endpoint de reserva la popula al INSERT desde el
-- servicio. Filas viejas y del flujo viejo V2/V4a dejan NULL — no
-- participan del EXCLUDE.
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS capacidad_snapshot_estadia integer NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamientos_capacidad_snapshot_estadia_check') THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_capacidad_snapshot_estadia_check
            CHECK (capacidad_snapshot_estadia IS NULL OR (capacidad_snapshot_estadia BETWEEN 1 AND 20));
    END IF;
END $$;

COMMENT ON COLUMN public.agendamientos.capacidad_snapshot_estadia IS
    'F2 — snapshot de servicios_publicados.capacidad_estadia al momento '
    'de reservar. El EXCLUDE agendamientos_no_solape_estadias aplica solo '
    'cuando =1; grupales (>1) se defienden con advisory lock en la app.';


-- ============================================================================
-- (d1) Wrapper IMMUTABLE agend_estadia_range(timestamptz, timestamptz)
--
-- Convierte los timestamptz de fecha_preferida/fecha_fin (que en V2/V4a
-- representan medianoche local Chile del check-in/check-out) a un daterange
-- con semi-abierto [fecha_in, fecha_out). Semi-abierto: check-out del dia
-- X NO colisiona con check-in del dia X (una salida y una entrada el mismo
-- dia son compatibles).
--
-- IMMUTABLE es correcto: `AT TIME ZONE 'America/Santiago'` con text
-- constante es IMMUTABLE (una version distinta a `AT TIME ZONE variable`).
-- El cast a `::date` sobre timestamp (sin TZ) tambien es IMMUTABLE.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agend_estadia_range(
    _start timestamptz,
    _end timestamptz
) RETURNS daterange
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
    SELECT daterange(
        (_start AT TIME ZONE 'America/Santiago')::date,
        (_end AT TIME ZONE 'America/Santiago')::date,
        '[)'
    );
$$;

COMMENT ON FUNCTION public.agend_estadia_range(timestamptz, timestamptz) IS
    'F2 — wrapper IMMUTABLE para el EXCLUDE agendamientos_no_solape_estadias. '
    'Convierte timestamptz (check-in / check-out) a daterange con [) '
    'semi-abierto en TZ America/Santiago. El mismo dia X puede ser check-out '
    'de una estadia y check-in de otra sin colisionar. Espejo del patron '
    'agend_slot_range(timestamptz, integer) de F1.';


-- ============================================================================
-- (d2) EXCLUDE constraint agendamientos_no_solape_estadias
--
-- DISJUNTO del EXCLUDE de F1 (`agendamientos_no_solape_confirmadas`) por
-- el filtro `fecha_fin IS NULL` vs `fecha_fin IS NOT NULL`. Ninguna fila
-- puede activar ambos simultaneamente.
--
-- Grupales (cap>1) quedan fuera — el endpoint de reserva usa
-- pg_advisory_xact_lock(hashtext(servicio_id::text || '|' || fecha_iso))
-- para serializar concurrencia en cap>1 (F2-3 va a implementarlo).
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamientos_no_solape_estadias') THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_no_solape_estadias
            EXCLUDE USING gist (
                servicio_id WITH =,
                public.agend_estadia_range(fecha_preferida, fecha_fin) WITH &&
            )
            WHERE (
                estado = 'confirmada'
                AND fecha_fin IS NOT NULL
                AND capacidad_snapshot_estadia = 1
            );
    END IF;
END $$;


-- ============================================================================
-- VERIFICACIONES (correr como statements separados despues del bloque)
-- ============================================================================

-- V1: fecha_fin agregado a excepciones + CHECK trilogia activo
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='excepciones_disponibilidad'
--      AND column_name='fecha_fin';
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid='public.excepciones_disponibilidad'::regclass
--      AND conname='excepciones_disponibilidad_shape_check';

-- V2: 8 columnas nuevas en servicios_publicados con defaults correctos
--   SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='servicios_publicados'
--      AND column_name IN ('capacidad_estadia','anticipacion_min_dias',
--                          'anticipacion_max_dias_estadia','min_noches',
--                          'max_noches','cancelacion_min_horas_antes',
--                          'check_in_hora','check_out_hora')
--    ORDER BY column_name;
--   Esperado: capacidad_estadia y max_noches NULL nullable sin default;
--   check_in_hora y check_out_hora NULL nullable; resto NOT NULL con
--   defaults 3 / 180 / 1 / 48.

-- V3: 7 CHECK constraints nuevos en servicios_publicados
--   SELECT conname FROM pg_constraint
--    WHERE conrelid='public.servicios_publicados'::regclass
--      AND conname IN (
--          'servicios_publicados_capacidad_estadia_check',
--          'servicios_publicados_anticipacion_min_dias_check',
--          'servicios_publicados_anticipacion_max_dias_estadia_check',
--          'servicios_publicados_min_noches_check',
--          'servicios_publicados_max_noches_check',
--          'servicios_publicados_noches_consistencia_check',
--          'servicios_publicados_cancelacion_min_horas_check'
--      )
--    ORDER BY conname;
--   Esperado: 7 filas.

-- V4: capacidad_snapshot_estadia agregada en agendamientos
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='agendamientos'
--      AND column_name='capacidad_snapshot_estadia';

-- V5: helper agend_estadia_range existe y es IMMUTABLE
--   SELECT proname, provolatile FROM pg_proc
--    WHERE proname='agend_estadia_range' AND pronargs=2;
--   Esperado: 1 fila, provolatile='i' (IMMUTABLE).

-- V6: EXCLUDE F2 existe y es disjunto del EXCLUDE F1
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid='public.agendamientos'::regclass
--      AND conname IN (
--          'agendamientos_no_solape_confirmadas',
--          'agendamientos_no_solape_estadias'
--      )
--    ORDER BY conname;
--   Esperado: 2 filas. El WHERE de F1 tiene "fecha_fin IS NULL"; el de F2
--   tiene "fecha_fin IS NOT NULL". Disjuntos por construccion.

-- V7: servicios existentes con defaults poblados
--   SELECT
--       count(*) AS total,
--       count(*) FILTER (WHERE capacidad_estadia IS NULL) AS opt_out_estadia,
--       count(*) FILTER (WHERE anticipacion_min_dias = 3) AS antic_min_default,
--       count(*) FILTER (WHERE anticipacion_max_dias_estadia = 180) AS antic_max_default,
--       count(*) FILTER (WHERE min_noches = 1) AS min_noches_default,
--       count(*) FILTER (WHERE max_noches IS NULL) AS sin_max_noches,
--       count(*) FILTER (WHERE cancelacion_min_horas_antes = 48) AS cancel_default
--     FROM public.servicios_publicados;
--   Esperado: opt_out_estadia = total (nadie activo aun); defaults poblados
--   en todos.

-- V8: agendamientos existentes intactos — capacidad_snapshot_estadia todas NULL
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE capacidad_snapshot_estadia IS NULL) AS sin_snapshot
--     FROM public.agendamientos;
--   Esperado: sin_snapshot = total.

-- ============================================================================
-- FIN F2-1 SCHEMA. Siguiente: F2-2 (editor de blackouts) — arranca cuando
-- Aldo confirme que las 8 verificaciones dan OK en staging.
-- ============================================================================
