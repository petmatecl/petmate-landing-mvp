-- migrations/20261126_add_nudge_perfil_enviado_at.sql
-- ---------------------------------------------------------------------------
-- Sprint PROVEEDOR-PERFIL-NUDGE-7D (2026-11-26) — Sprint 1 PR 1 del dispatch
-- autónomo. Agrega columna de tracking para idempotency del nudge 7d+
-- post-signup a proveedores sin servicios publicados activos.
--
-- Spec completo: docs/sprints/proveedor-perfil-nudge-plan.md § 3.1 Opción A.
-- Acta operativa: docs/sprints/nudge-7d-schema-acta.md.
--
-- Blast radius: ADD COLUMN IF NOT EXISTS sobre tabla `proveedores`. Zero
-- data loss. Zero reversión destructiva requerida — rollback es DROP COLUMN
-- documentado en el acta.
--
-- Idempotencia: `IF NOT EXISTS` permite re-ejecutar sin romper si ya se
-- aplicó (misma semántica que migrations/20260818_*.sql del patrón del
-- repo).
-- ---------------------------------------------------------------------------

ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS nudge_perfil_enviado_at timestamptz;

COMMENT ON COLUMN public.proveedores.nudge_perfil_enviado_at IS
  'Timestamp del nudge 7d+ post-signup enviado al proveedor cuyo perfil
   sigue sin servicios activos publicados. Null = no enviado. Previene
   duplicados en re-corridas del cron (idempotency). Sprint PROVEEDOR-
   PERFIL-NUDGE-7D 2026-11-26.';
