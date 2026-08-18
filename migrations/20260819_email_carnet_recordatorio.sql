-- ========================================================================
-- Migration: agregar columna email_carnet_recordatorio_at + backfill
--            retroactivo para proveedores existentes
--
-- ⚠️ EJECUCIÓN MANUAL POR ALDO — NO AUTO-APLICABLE
--    Requiere GO explícito del PO en el turno vigente (regla del proyecto
--    para DDL sobre prod).
--
-- CONTEXTO
--   Sprint cron-carnet (2026-08-19) — sub-flujo (c) del cron
--   `/api/cron/recordatorio-onboarding` que dispara email a proveedores
--   con `verificacion_estado='sin_enviar'` entre 48h y 14 días desde
--   registro. Sin marcador de "ya enviado", el cron re-enviaría cada
--   día — este marcador implementa la idempotencia (mismo patrón que
--   `email_onboarding_at` y `email_foto_at` en el mismo cron).
--
-- CONDICIÓN CRÍTICA — NO DISPARAR RETROACTIVO A LOS 7 ACTUALES
--   Instrucción PO 2026-08-19: los 7 proveedores actuales en
--   `verificacion_estado='sin_enviar'` los va a contactar Aldo a mano
--   con mensajes personales (algunos llevan 135 días esperando — un
--   correo automático se lee como desprecio a esas alturas).
--
--   Implementación: BACKFILL de `email_carnet_recordatorio_at = NOW()`
--   para TODOS los proveedores existentes al momento de la migration.
--   Cero fecha corte hardcoded en código → el cron los ve como "ya
--   notificado" y no dispara. Solo proveedores registrados POST-
--   migration entran al flujo del cron.
--
--   El backfill preserva la idempotencia natural del sub-flujo:
--   `AND email_carnet_recordatorio_at IS NULL` en el WHERE del cron
--   → los existentes quedan fuera para siempre. Aldo puede escribir a
--   mano sin miedo a que el sistema le mande también un automático.
--
-- ORDEN DE EJECUCIÓN
--   (a) Ejecutar este archivo en Supabase Studio SQL Editor de PROD
--       (un solo bloque BEGIN/COMMIT — corolario P8 6ª sobre
--       transacciones separadas del SQL Editor).
--   (b) Merge del código (rama `cron-carnet`) a `main` — el cron
--       nuevo empieza a filtrar por la columna nueva.
--   (c) Verificar next-day (mañana ~10:00 UTC según schedule del
--       cron actual, ver vercel.json) — Vercel Runtime Logs debe
--       mostrar sub-flujo (c) con `sent=0` si no hay proveedores
--       nuevos elegibles.
--
-- ROLLBACK
--   Bloque comentado al final. Reversible sin pérdida de datos.
--
-- APROBACIÓN CONSULTA OBLIGATORIA
--   Este archivo se genera COMO EVIDENCIA para el PO. Aldo lo ejecuta
--   manualmente en Supabase Studio SQL Editor tras GO explícito.
-- ========================================================================

BEGIN;

-- Paso 1 — Agregar columna nullable. NOT NULL sería incorrecto porque
-- necesitamos NULL para "aún no notificado" (mismo shape que
-- email_onboarding_at, email_foto_at).
ALTER TABLE public.proveedores
    ADD COLUMN IF NOT EXISTS email_carnet_recordatorio_at timestamptz NULL;

COMMENT ON COLUMN public.proveedores.email_carnet_recordatorio_at IS
    'Marcador de "ya se envió email recordatorio carnet" — usado por sub-flujo (c) del cron /api/cron/recordatorio-onboarding para idempotencia. NULL = aún no enviado (elegible). NOT NULL = ya enviado en la fecha indicada.';

-- Paso 2 — Backfill retroactivo. Todos los proveedores existentes al
-- momento de la migration quedan marcados como "ya notificado" con
-- NOW() → el cron los excluye del sub-flujo (c) para siempre. Solo
-- proveedores registrados POST-migration entran al flujo.
--
-- Aldo va a contactar a los 7 sin_enviar actuales a mano; el cron
-- nuevo aplica solo hacia adelante.
UPDATE public.proveedores
   SET email_carnet_recordatorio_at = NOW()
 WHERE email_carnet_recordatorio_at IS NULL;

-- ========================================================================
-- Verificación automática — el bloque falla loud si el resultado no
-- coincide con lo esperado (mismo patrón corolario P8 5ª).
-- ========================================================================
DO $$
DECLARE
    v_total INT;
    v_notificados INT;
    v_pendientes INT;
BEGIN
    SELECT COUNT(*) INTO v_total FROM proveedores;
    SELECT COUNT(*) INTO v_notificados FROM proveedores WHERE email_carnet_recordatorio_at IS NOT NULL;
    SELECT COUNT(*) INTO v_pendientes FROM proveedores WHERE email_carnet_recordatorio_at IS NULL;

    IF v_pendientes > 0 THEN
        RAISE EXCEPTION 'Backfill falló: % proveedor(es) sin marcador post-UPDATE. Esperado 0 pendientes.', v_pendientes;
    END IF;
    IF v_notificados <> v_total THEN
        RAISE EXCEPTION 'Backfill inconsistente: total=%, notificados=%. Deberían ser iguales.', v_total, v_notificados;
    END IF;

    RAISE NOTICE 'OK — % proveedores marcados como notificado. Sub-flujo (c) del cron los excluye. Solo registros POST-migration disparan email.', v_total;
END $$;

-- Verificación visual complementaria — Aldo lee el output.
SELECT
    COUNT(*) AS total_proveedores,
    COUNT(*) FILTER (WHERE email_carnet_recordatorio_at IS NOT NULL) AS marcados_backfill,
    COUNT(*) FILTER (WHERE email_carnet_recordatorio_at IS NULL) AS elegibles_cron_futuro
FROM proveedores;
-- Esperado: total = marcados_backfill, elegibles_cron_futuro = 0.

COMMIT;

-- ========================================================================
-- ROLLBACK (descomentar SOLO si algo se ve raro post-COMMIT)
-- ========================================================================
-- BEGIN;
-- ALTER TABLE public.proveedores DROP COLUMN email_carnet_recordatorio_at;
-- COMMIT;
