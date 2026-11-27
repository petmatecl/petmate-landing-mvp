-- migrations/20261126_add_nudge_opt_out.sql
-- ---------------------------------------------------------------------------
-- Sprint PROVEEDOR-PERFIL-NUDGE-7D Sprint A PR 4 (nudge-unsub). Agrega
-- flag `nudge_opt_out boolean NOT NULL DEFAULT false` a `proveedores` para
-- marcar opt-out del flow de nudges. Simple column → EMAILS-UNSUBSCRIBE-
-- UNIFIED (BACKLOG candidate) cubre a futuro con tabla dedicada
-- compliance LPDP (Ley 21.096 Chile).
--
-- Consumo en el cron (nudge-cron bloque 3): filtro adicional
--   .eq('nudge_opt_out', false)
-- bloquea envío a proveedores que hicieron unsubscribe.
--
-- Spec completo: docs/sprints/proveedor-perfil-nudge-plan.md.
--
-- Blast radius: ADD COLUMN NOT NULL DEFAULT false sobre tabla
-- `proveedores`. 28 filas existentes se setean en `nudge_opt_out=false`
-- automático por el DEFAULT. Zero data loss. Rollback: DROP COLUMN IF
-- EXISTS documentado en PR body.
--
-- Idempotencia: IF NOT EXISTS permite re-ejecutar sin romper.
-- ---------------------------------------------------------------------------

ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS nudge_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.proveedores.nudge_opt_out IS
  'True si el proveedor hizo click en el unsubscribe link del email nudge.
   Bloquea envío de nudges futuros al cron recordatorio-onboarding. Simple
   column opt-out — deuda EMAILS-UNSUBSCRIBE-UNIFIED cubre tabla dedicada
   compliance LPDP a futuro. Sprint PROVEEDOR-PERFIL-NUDGE-7D 2026-11-26.';
