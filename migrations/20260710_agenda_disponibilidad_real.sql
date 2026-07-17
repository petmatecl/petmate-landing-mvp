-- ============================================================================
-- migrations/20260710_agenda_disponibilidad_real.sql
--
-- FASE 1 del roadmap "agenda con disponibilidad real". Incremento 1: SCHEMA.
--
-- Decisiones cerradas (2026-07-10):
--   - Faseo: F1 = bloque horario (5 categorias: paseos, peluqueria,
--     adiestramiento, veterinario, traslado). F2 = cuidado rango-noches.
--     F3 = guarderia.
--   - Picker RIGIDO (solo slots libres, sin escape hatch).
--   - Convivencia opt-in: duracion_slot_min NULL = flujo viejo.
--   - Recurrencia POR SERVICIO (no por proveedor).
--   - Duracion FIJA por servicio (V4b param queda F1.5).
--   - capacidad_slot para grupales (default 1).
--   - anticipacion_min_horas default 24, anticipacion_max_dias default 60.
--   - Excepciones dia completo Y franja.
--   - TZ America/Santiago hardcodeada en la app (schema es TZ-agnostico).
--   - Liberacion inmediata al cancelar.
--   - Proveedor SI puede rechazar confirmada-automatica → nuevo estado
--     cancelada_proveedor con nota OBLIGATORIA.
--   - dia_semana ISO (1=lunes, 7=domingo — matchea date_part('isodow', ...)).
--   - Migracion one-shot del legacy con fallback a opt-out (Incremento 5).
--   - agendamiento_habilitado sigue gateando el CTA "Solicitar".
--
-- IDEMPOTENTE: CREATE ... IF NOT EXISTS, DROP CONSTRAINT IF EXISTS, DO $$
-- + IF NOT EXISTS lookup en pg_constraint. Re-correr es no-op.
--
-- APLICADA Y VERIFICADA: 2026-07-10 en staging (jmtadvdkicyylcwjcmcl).
-- Las 9 verificaciones al final dieron OK. Pendiente aplicar en prod
-- (ouezpeeiwjwawauidrqq) en el merge del incremento final del roadmap.
-- ============================================================================


-- ============================================================================
-- (a) EXTENSION btree_gist — requerida por el EXCLUDE constraint que combina
-- `servicio_id WITH =` (btree op) y `tstzrange WITH &&` (gist op) en el mismo
-- indice. Sin esta, la creacion del constraint falla.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ============================================================================
-- (b1) TABLA disponibilidad_semanal
-- Recurrencia semanal por SERVICIO. dia_semana ISO 8601: 1=lunes, 7=domingo.
-- Multi-franjas por dia permitidas (ej. 9-12 y 15-18 el lunes) — UNIQUE por
-- (servicio, dia, hora_desde).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.disponibilidad_semanal (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio_id  uuid        NOT NULL REFERENCES public.servicios_publicados(id) ON DELETE CASCADE,
    dia_semana   smallint    NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_desde   time        NOT NULL,
    hora_hasta   time        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT disponibilidad_semanal_horas_check CHECK (hora_hasta > hora_desde),
    CONSTRAINT disponibilidad_semanal_unique_franja UNIQUE (servicio_id, dia_semana, hora_desde)
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_semanal_servicio
    ON public.disponibilidad_semanal (servicio_id, dia_semana);


-- ============================================================================
-- (b2) TABLA excepciones_disponibilidad
-- Bloqueos ad-hoc (vacaciones, dia libre, franja tapada). Dia completo
-- (hora_desde y hora_hasta NULL) o franja (ambas populadas).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.excepciones_disponibilidad (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio_id  uuid        NOT NULL REFERENCES public.servicios_publicados(id) ON DELETE CASCADE,
    fecha        date        NOT NULL,
    hora_desde   time        NULL,
    hora_hasta   time        NULL,
    motivo       text        NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT excepciones_disponibilidad_horas_check CHECK (
        (hora_desde IS NULL AND hora_hasta IS NULL)
        OR (hora_desde IS NOT NULL AND hora_hasta IS NOT NULL AND hora_hasta > hora_desde)
    ),
    CONSTRAINT excepciones_disponibilidad_motivo_max_check CHECK (
        motivo IS NULL OR length(motivo) <= 200
    ),
    CONSTRAINT excepciones_disponibilidad_unique UNIQUE (servicio_id, fecha, hora_desde)
);

CREATE INDEX IF NOT EXISTS idx_excepciones_disponibilidad_servicio_fecha
    ON public.excepciones_disponibilidad (servicio_id, fecha);


-- ============================================================================
-- (c) COLUMNAS nuevas en servicios_publicados
-- duracion_slot_min NULL = servicio opt-out de la agenda (flujo viejo).
-- Al activar agenda desde el editor, el proveedor popula este campo.
-- ============================================================================

ALTER TABLE public.servicios_publicados
    ADD COLUMN IF NOT EXISTS duracion_slot_min integer NULL,
    ADD COLUMN IF NOT EXISTS capacidad_slot integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS anticipacion_min_horas integer NOT NULL DEFAULT 24,
    ADD COLUMN IF NOT EXISTS anticipacion_max_dias integer NOT NULL DEFAULT 60;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_duracion_slot_min_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_duracion_slot_min_check
            CHECK (duracion_slot_min IS NULL OR (duracion_slot_min BETWEEN 5 AND 480));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_capacidad_slot_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_capacidad_slot_check
            CHECK (capacidad_slot >= 1 AND capacidad_slot <= 20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_anticipacion_min_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_anticipacion_min_check
            CHECK (anticipacion_min_horas >= 0 AND anticipacion_min_horas <= 168);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicios_publicados_anticipacion_max_check') THEN
        ALTER TABLE public.servicios_publicados
            ADD CONSTRAINT servicios_publicados_anticipacion_max_check
            CHECK (anticipacion_max_dias >= 1 AND anticipacion_max_dias <= 365);
    END IF;
END $$;

COMMENT ON COLUMN public.servicios_publicados.duracion_slot_min IS
    'Duracion del slot en minutos. NULL = servicio NO usa agenda con '
    'disponibilidad real (flujo viejo). Valores 5-480 (8h) cubren paseo, '
    'peluqueria, etc. F1: solo bloque horario.';

COMMENT ON COLUMN public.servicios_publicados.capacidad_slot IS
    'Cuantas mascotas caben en un slot. 1 = individual (default). >1 = grupal. '
    'Rango 1-20. La regla de cupo la enforza el endpoint de reserva con '
    'advisory lock; el EXCLUDE anti-solape solo aplica a capacidad=1.';

COMMENT ON COLUMN public.servicios_publicados.anticipacion_min_horas IS
    'Horas de anticipacion minima para reservar. Default 24h.';

COMMENT ON COLUMN public.servicios_publicados.anticipacion_max_dias IS
    'Dias hacia adelante que el tutor puede reservar. Default 60 (2 meses).';


-- ============================================================================
-- (d1) COLUMNAS denormalizadas en agendamientos — required by EXCLUDE
-- El EXCLUDE constraint necesita `duracion_min` y `capacidad_snapshot` de
-- la fila misma (Postgres no permite JOIN en index predicates). El endpoint
-- de reserva los popula al INSERT desde el servicio. Servicios sin agenda
-- (flujo viejo) dejan ambas NULL — no participan del EXCLUDE.
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS duracion_min integer NULL,
    ADD COLUMN IF NOT EXISTS capacidad_snapshot integer NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamientos_duracion_min_check') THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_duracion_min_check
            CHECK (duracion_min IS NULL OR (duracion_min BETWEEN 5 AND 480));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamientos_capacidad_snapshot_check') THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_capacidad_snapshot_check
            CHECK (capacidad_snapshot IS NULL OR (capacidad_snapshot >= 1 AND capacidad_snapshot <= 20));
    END IF;
END $$;

COMMENT ON COLUMN public.agendamientos.duracion_min IS
    'Duracion efectiva del slot en minutos. Poblada por el endpoint de reserva '
    'desde servicios_publicados.duracion_slot_min. NULL para flujo viejo. '
    'Alimenta el tstzrange del EXCLUDE anti-solape.';

COMMENT ON COLUMN public.agendamientos.capacidad_snapshot IS
    'Snapshot de servicios_publicados.capacidad_slot al momento de reservar. '
    'El EXCLUDE aplica solo cuando =1; grupales (>1) se defienden con '
    'advisory lock en la app.';


-- ============================================================================
-- (d2a) Wrapper IMMUTABLE para el EXCLUDE
-- Postgres marca "timestamptz + interval" y "text::interval" como STABLE por
-- si el interval trae componentes mes/dia (dependen de TZ). Para minutos
-- puros el resultado es deterministico — declarar IMMUTABLE es correcto y es
-- el patron canonico documentado.
-- NO reutilizar con intervals que traigan mes/dia.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agend_slot_range(
    _start timestamptz,
    _duracion_min integer
) RETURNS tstzrange
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
    SELECT tstzrange(
        _start,
        _start + make_interval(mins => _duracion_min),
        '[)'
    );
$$;

COMMENT ON FUNCTION public.agend_slot_range(timestamptz, integer) IS
    'Wrapper IMMUTABLE requerido por el EXCLUDE constraint '
    'agendamientos_no_solape_confirmadas. Postgres marca "timestamptz + '
    'interval" y "text::interval" como STABLE por si el interval trae '
    'componentes mes/dia (dependen de TZ). Para minutos puros el resultado '
    'es deterministico. NO reutilizar con intervals que traigan mes/dia.';


-- ============================================================================
-- (d2b) EXCLUDE constraint no_solape_confirmadas
-- Red de proteccion contra doble-booking. Filtro (WHERE) acota el scope:
--   - estado='confirmada'      : pendientes/canceladas no bloquean
--   - fecha_fin IS NULL        : solo bloque horario (V2/V4a se manejan en F2)
--   - duracion_min IS NOT NULL : solo servicios con agenda (opt-in)
--   - capacidad_snapshot = 1   : grupales quedan fuera (los cuida la app)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamientos_no_solape_confirmadas') THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_no_solape_confirmadas
            EXCLUDE USING gist (
                servicio_id WITH =,
                public.agend_slot_range(fecha_preferida, duracion_min) WITH &&
            )
            WHERE (
                estado = 'confirmada'
                AND fecha_fin IS NULL
                AND duracion_min IS NOT NULL
                AND capacidad_snapshot = 1
            );
    END IF;
END $$;


-- ============================================================================
-- (e1) Nuevo estado cancelada_proveedor
-- ============================================================================

ALTER TABLE public.agendamientos DROP CONSTRAINT IF EXISTS agendamientos_estado_check;
ALTER TABLE public.agendamientos
    ADD CONSTRAINT agendamientos_estado_check
    CHECK (estado IN ('pendiente', 'confirmada', 'rechazada', 'cancelada', 'cancelada_proveedor'));


-- ============================================================================
-- (e2) Nota obligatoria cuando estado=cancelada_proveedor
-- Defensa BD del requisito de producto ("motivo obligatorio para transparencia").
-- Los otros estados no tocan este CHECK — nota_proveedor sigue nullable en
-- confirmada/rechazada/cancelada.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamientos_cancelada_proveedor_nota_check') THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_cancelada_proveedor_nota_check
            CHECK (
                estado <> 'cancelada_proveedor'
                OR (nota_proveedor IS NOT NULL AND length(trim(nota_proveedor)) > 0)
            );
    END IF;
END $$;


-- ============================================================================
-- (e3) RLS del UPDATE del proveedor — sumar cancelada_proveedor como NEW
-- valido y acotar los OLD permitidos a los no-terminales (pendiente/confirmada).
-- Sin esto, la policy actual permitiria rechazada → cancelada_proveedor.
--
-- Trigger set_respondido_at NO se dispara aca (OLD='confirmada' no matchea
-- su condicion) — respondido_at se preserva del momento de la confirmacion
-- original.
-- ============================================================================

DROP POLICY IF EXISTS agendamientos_proveedor_respond ON public.agendamientos;
CREATE POLICY agendamientos_proveedor_respond ON public.agendamientos
    FOR UPDATE
    TO public
    USING (
        proveedor_id IN (
            SELECT id FROM public.proveedores
            WHERE auth_user_id = auth.uid()
        )
        AND estado IN ('pendiente', 'confirmada')
    )
    WITH CHECK (
        proveedor_id IN (
            SELECT id FROM public.proveedores
            WHERE auth_user_id = auth.uid()
        )
        AND estado IN ('confirmada', 'rechazada', 'cancelada_proveedor')
    );


-- ============================================================================
-- (f) RLS de las tablas nuevas
-- Proveedor CRUD sobre las filas de sus servicios. Publico NO lee estas
-- tablas — el endpoint /api/servicios/[id]/slots corre server-side con
-- service_role (bypass RLS).
-- ============================================================================

ALTER TABLE public.disponibilidad_semanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excepciones_disponibilidad ENABLE ROW LEVEL SECURITY;

-- disponibilidad_semanal — CRUD del proveedor dueño del servicio
DROP POLICY IF EXISTS disponibilidad_semanal_proveedor_select ON public.disponibilidad_semanal;
CREATE POLICY disponibilidad_semanal_proveedor_select ON public.disponibilidad_semanal
    FOR SELECT TO public
    USING (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS disponibilidad_semanal_proveedor_insert ON public.disponibilidad_semanal;
CREATE POLICY disponibilidad_semanal_proveedor_insert ON public.disponibilidad_semanal
    FOR INSERT TO public
    WITH CHECK (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS disponibilidad_semanal_proveedor_update ON public.disponibilidad_semanal;
CREATE POLICY disponibilidad_semanal_proveedor_update ON public.disponibilidad_semanal
    FOR UPDATE TO public
    USING (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS disponibilidad_semanal_proveedor_delete ON public.disponibilidad_semanal;
CREATE POLICY disponibilidad_semanal_proveedor_delete ON public.disponibilidad_semanal
    FOR DELETE TO public
    USING (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    );

-- excepciones_disponibilidad — mismo patron
DROP POLICY IF EXISTS excepciones_disponibilidad_proveedor_select ON public.excepciones_disponibilidad;
CREATE POLICY excepciones_disponibilidad_proveedor_select ON public.excepciones_disponibilidad
    FOR SELECT TO public
    USING (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS excepciones_disponibilidad_proveedor_insert ON public.excepciones_disponibilidad;
CREATE POLICY excepciones_disponibilidad_proveedor_insert ON public.excepciones_disponibilidad
    FOR INSERT TO public
    WITH CHECK (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS excepciones_disponibilidad_proveedor_update ON public.excepciones_disponibilidad;
CREATE POLICY excepciones_disponibilidad_proveedor_update ON public.excepciones_disponibilidad
    FOR UPDATE TO public
    USING (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS excepciones_disponibilidad_proveedor_delete ON public.excepciones_disponibilidad;
CREATE POLICY excepciones_disponibilidad_proveedor_delete ON public.excepciones_disponibilidad
    FOR DELETE TO public
    USING (
        servicio_id IN (
            SELECT s.id FROM public.servicios_publicados s
            JOIN public.proveedores p ON p.id = s.proveedor_id
            WHERE p.auth_user_id = auth.uid()
        )
    );


-- ============================================================================
-- Trigger updated_at para disponibilidad_semanal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at_disponibilidad_semanal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disponibilidad_semanal_updated_at ON public.disponibilidad_semanal;
CREATE TRIGGER trg_disponibilidad_semanal_updated_at
    BEFORE UPDATE ON public.disponibilidad_semanal
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_disponibilidad_semanal();


-- ============================================================================
-- VERIFICACIONES (correr como statements separados despues del bloque)
-- ============================================================================

-- V1: SELECT extname, extversion FROM pg_extension WHERE extname = 'btree_gist';
-- V2: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('disponibilidad_semanal','excepciones_disponibilidad');
-- V3: SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='servicios_publicados' AND column_name IN ('duracion_slot_min','capacidad_slot','anticipacion_min_horas','anticipacion_max_dias');
-- V4: SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='agendamientos' AND column_name IN ('duracion_min','capacidad_snapshot');
-- V5: SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.agendamientos'::regclass AND conname='agendamientos_estado_check';
-- V6: SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.agendamientos'::regclass AND conname='agendamientos_no_solape_confirmadas';
-- V7: SELECT tablename,policyname,cmd FROM pg_policies WHERE schemaname='public' AND (tablename IN ('disponibilidad_semanal','excepciones_disponibilidad') OR (tablename='agendamientos' AND policyname='agendamientos_proveedor_respond'));
-- V8: SELECT count(*), count(*) FILTER (WHERE duracion_min IS NULL), count(*) FILTER (WHERE capacidad_snapshot IS NULL) FROM public.agendamientos;
-- V9: SELECT count(*), count(*) FILTER (WHERE duracion_slot_min IS NULL), count(*) FILTER (WHERE capacidad_slot=1), count(*) FILTER (WHERE anticipacion_min_horas=24), count(*) FILTER (WHERE anticipacion_max_dias=60) FROM public.servicios_publicados;
