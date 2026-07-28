-- ============================================================================
-- migrations/20260728_recordatorios_marcas.sql
--
-- TREN RECORDATORIOS DE CITA — R1: schema para idempotencia por destinatario.
--
-- CONTEXTO
--
-- El cron nuevo `/api/cron/recordatorio-reserva` (R3) envía un recordatorio
-- el día anterior a cada reserva confirmada (tutor + proveedor, ambos
-- destinatarios). Idempotencia por columna marca — patrón espejo del ya
-- probado en `invitacion-resenas.ts` con `invitacion_resena_enviada_at`.
--
-- Decisión D6+D8 del brief: DOS columnas separadas, una por destinatario.
-- Motivo: fallo parcial de un envío (ej. Resend rate-limit al proveedor)
-- NO debe bloquear el otro destinatario ni forzar re-envío duplicado en
-- la siguiente corrida. Cada UPDATE se hace solo tras éxito de su propio
-- envío.
--
-- SHAPE
--
-- Ambas columnas timestamptz NULL. El cron filtra por `... IS NULL` en el
-- SELECT amplio y refina server-side; UPDATE ... = now() solo al final
-- del pipeline por destinatario.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS. Re-correr = no-op.
-- TRANSACCIONAL: BEGIN/COMMIT explícito por regla nueva post-merge F2
-- (checklist Caveat B — si el ADD falla a mitad, ROLLBACK limpia sin
-- dejar la tabla a medio migrar).
--
-- APLICAR: staging (jmtadvdkicyylcwjcmcl) primero, correr V1-V2 al pie.
-- Prod queda para el checklist final de merge del tren.
-- ============================================================================

BEGIN;

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS recordatorio_tutor_enviado_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS recordatorio_proveedor_enviado_at timestamptz NULL;

COMMENT ON COLUMN public.agendamientos.recordatorio_tutor_enviado_at IS
    'Tren Recordatorios (R1) — timestamp del último recordatorio "día '
    'anterior" enviado al tutor. NULL = pendiente / nunca enviado. '
    'Update con NOW() sólo tras éxito del envío (email Resend + INSERT '
    'notifications). Idempotencia por destinatario: independiente de '
    'recordatorio_proveedor_enviado_at.';

COMMENT ON COLUMN public.agendamientos.recordatorio_proveedor_enviado_at IS
    'Tren Recordatorios (R1) — timestamp del último recordatorio "día '
    'anterior" enviado al proveedor. NULL = pendiente / nunca enviado. '
    'Idempotencia independiente de la marca del tutor.';

COMMIT;


-- ============================================================================
-- VERIFICACIONES (correr como statements separados post-commit)
-- ============================================================================

-- V1: las dos columnas existen, timestamptz, NULLABLE, sin default
--   SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='agendamientos'
--      AND column_name IN ('recordatorio_tutor_enviado_at',
--                          'recordatorio_proveedor_enviado_at')
--    ORDER BY column_name;
--   Esperado: 2 filas — ambas timestamptz, is_nullable='YES', column_default=null.

-- V2: agendamientos existentes intactos — ambas marcas NULL en todo el set
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE recordatorio_tutor_enviado_at IS NULL) AS tutor_null,
--          count(*) FILTER (WHERE recordatorio_proveedor_enviado_at IS NULL) AS prov_null
--     FROM public.agendamientos;
--   Esperado: total = tutor_null = prov_null (todas NULL por default post-ADD).

-- ============================================================================
-- FIN R1. Siguiente: R2 (helper formatBloqueHorario + tests) — arranca en
-- paralelo. R3 (endpoint cron) depende de ambos.
-- ============================================================================
