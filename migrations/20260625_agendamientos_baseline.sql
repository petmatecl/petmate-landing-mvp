-- ============================================================================
-- migrations/20260625_agendamientos_baseline.sql
--
-- BASELINE de la tabla `agendamientos` capturado del estado real en prod
-- (ouezpeeiwjwawauidrqq) el 2026-06-25. NO es un cambio nuevo — recupera
-- el drift entre lo aplicado via Management API durante el sprint de
-- agendamiento (Sprints 1-4) y lo versionado en este repo (estaba en cero).
--
-- Sirve para:
--   - Reproducir el schema en un proyecto Supabase nuevo (recovery, dev).
--   - Punto de partida documentado para migraciones futuras sobre esta tabla.
--
-- Re-aplicable: IF NOT EXISTS / DROP IF EXISTS donde corresponde.
-- Fuente de captura: 6 queries del catalog (pg_tables, pg_constraint, pg_indexes,
-- pg_policies, pg_class.relrowsecurity, information_schema.triggers) + pg_get_functiondef
-- para el cuerpo de la funcion del trigger. NO via pg_dump.
-- ============================================================================


-- ===== Funcion del trigger =====
-- Setea respondido_at = now() en la transicion pendiente -> confirmada/rechazada.
-- NO se ejecuta en cancelacion del tutor (el codigo cliente setea respondido_at
-- manualmente en el UPDATE de cancel, ver pages/mis-solicitudes.tsx).

CREATE OR REPLACE FUNCTION public.set_respondido_at_on_response()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.estado IN ('confirmada', 'rechazada') AND OLD.estado = 'pendiente' THEN
    NEW.respondido_at = now();
  END IF;
  RETURN NEW;
END;
$function$;


-- ===== Tabla =====
CREATE TABLE IF NOT EXISTS public.agendamientos (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio_id     uuid        NOT NULL REFERENCES public.servicios_publicados(id) ON DELETE CASCADE,
    proveedor_id    uuid        NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
    tutor_id        uuid        NOT NULL REFERENCES public.usuarios_buscadores(id) ON DELETE CASCADE,
    fecha_preferida timestamptz NOT NULL,
    mensaje         text,
    estado          text        NOT NULL DEFAULT 'pendiente'
                                CHECK (estado IN ('pendiente', 'confirmada', 'rechazada', 'cancelada')),
    nota_proveedor  text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    respondido_at   timestamptz
);


-- ===== Indices =====
-- pkey lo crea Postgres implicito; los demas optimizan los WHERE de los
-- fetches (panel proveedor por estado, /mis-solicitudes por tutor + sort).
CREATE INDEX IF NOT EXISTS idx_agendamientos_proveedor
    ON public.agendamientos (proveedor_id, estado);

CREATE INDEX IF NOT EXISTS idx_agendamientos_servicio
    ON public.agendamientos (servicio_id);

CREATE INDEX IF NOT EXISTS idx_agendamientos_tutor
    ON public.agendamientos (tutor_id, created_at DESC);


-- ===== Trigger =====
DROP TRIGGER IF EXISTS set_agendamientos_respondido_at ON public.agendamientos;
CREATE TRIGGER set_agendamientos_respondido_at
    BEFORE UPDATE ON public.agendamientos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_respondido_at_on_response();


-- ===== Row Level Security =====
ALTER TABLE public.agendamientos ENABLE ROW LEVEL SECURITY;

-- Tutor: INSERT solo en su propio nombre.
DROP POLICY IF EXISTS agendamientos_tutor_insert ON public.agendamientos;
CREATE POLICY agendamientos_tutor_insert ON public.agendamientos
    FOR INSERT
    TO public
    WITH CHECK (
        tutor_id IN (
            SELECT id FROM public.usuarios_buscadores
            WHERE auth_user_id = auth.uid()
        )
    );

-- Tutor: SELECT solo sus propias solicitudes.
DROP POLICY IF EXISTS agendamientos_tutor_select ON public.agendamientos;
CREATE POLICY agendamientos_tutor_select ON public.agendamientos
    FOR SELECT
    TO public
    USING (
        tutor_id IN (
            SELECT id FROM public.usuarios_buscadores
            WHERE auth_user_id = auth.uid()
        )
    );

-- Proveedor: SELECT solo las solicitudes hacia sus servicios.
DROP POLICY IF EXISTS agendamientos_proveedor_select ON public.agendamientos;
CREATE POLICY agendamientos_proveedor_select ON public.agendamientos
    FOR SELECT
    TO public
    USING (
        proveedor_id IN (
            SELECT id FROM public.proveedores
            WHERE auth_user_id = auth.uid()
        )
    );

-- Proveedor: UPDATE para confirmar o rechazar.
-- ⚠️ La policy solo valida el NUEVO estado; NO bloquea re-responder una ya
-- respondida. El gate de re-respuesta vive en el handler del cliente
-- (handleResponderSolicitud en pages/proveedor/index.tsx) — state machine
-- en codigo, no en RLS.
DROP POLICY IF EXISTS agendamientos_proveedor_respond ON public.agendamientos;
CREATE POLICY agendamientos_proveedor_respond ON public.agendamientos
    FOR UPDATE
    TO public
    USING (
        proveedor_id IN (
            SELECT id FROM public.proveedores
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        proveedor_id IN (
            SELECT id FROM public.proveedores
            WHERE auth_user_id = auth.uid()
        )
        AND estado IN ('confirmada', 'rechazada')
    );

-- Tutor: UPDATE solo para cancelar.
-- ⚠️ Mismo principio que arriba: la policy solo valida que el nuevo estado
-- sea 'cancelada'; permite cancelar tanto pendientes como confirmadas. El
-- warning + notify-al-proveedor para el caso de cancelar confirmadas vive
-- en el handler del cliente (handleConfirmCancel en pages/mis-solicitudes.tsx).
DROP POLICY IF EXISTS agendamientos_tutor_cancel ON public.agendamientos;
CREATE POLICY agendamientos_tutor_cancel ON public.agendamientos
    FOR UPDATE
    TO public
    USING (
        tutor_id IN (
            SELECT id FROM public.usuarios_buscadores
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        tutor_id IN (
            SELECT id FROM public.usuarios_buscadores
            WHERE auth_user_id = auth.uid()
        )
        AND estado = 'cancelada'
    );


-- ============================================================================
-- FIN BASELINE. Cambios nuevos sobre agendamientos van en archivos separados —
-- NO modificar este baseline.
-- ============================================================================
