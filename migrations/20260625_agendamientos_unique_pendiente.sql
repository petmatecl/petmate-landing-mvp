-- ============================================================================
-- migrations/20260625_agendamientos_unique_pendiente.sql
--
-- Mejora A del cierre del feature agendamiento: evitar que un tutor acumule
-- multiples solicitudes PENDIENTES al mismo servicio. Permite re-solicitar
-- tras rechazo o cancelacion (esos estados no estan en el index parcial).
--
-- DEPENDE de: 20260625_agendamientos_baseline.sql (tabla agendamientos debe
-- existir con la columna estado).
--
-- PRE-FLIGHT obligatorio antes de aplicar este DDL — debe devolver 0 filas
-- en staging Y en prod, sino el CREATE INDEX falla con unique_violation:
--   SELECT tutor_id, servicio_id, count(*) AS n_pendientes
--   FROM public.agendamientos
--   WHERE estado = 'pendiente'
--   GROUP BY tutor_id, servicio_id
--   HAVING count(*) > 1;
--
-- Comportamiento producido:
--   - Tutor crea A (pendiente) → OK. Tutor crea B mismo servicio (pendiente)
--     → 23505 unique_violation. Modal del tutor catchea y muestra mensaje
--     amistoso (ver SolicitarAgendamientoModal.tsx).
--   - Proveedor rechaza A → A sale del index parcial. Tutor crea B → OK.
--   - Proveedor confirma A → A sale del index parcial. Tutor crea B → OK
--     (confirmada = trato cerrado, una pendiente nueva es contexto distinto).
--   - Tutor cancela A → A sale del index parcial. Tutor crea B → OK.
--
-- IDEMPOTENTE: CREATE UNIQUE INDEX IF NOT EXISTS — re-correr es no-op.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS agendamientos_unique_pendiente_por_tutor_servicio
    ON public.agendamientos (tutor_id, servicio_id)
    WHERE estado = 'pendiente';
