-- migrations/20261126_add_nudge_count.sql
-- ---------------------------------------------------------------------------
-- Sprint PROVEEDOR-PERFIL-NUDGE-7D refined per dispatch 2026-11-26 — Sprint A
-- PR 1 (nudge-schema). Agrega `nudge_count integer NOT NULL DEFAULT 0` como
-- contador de nudges enviados (max 2 per decisión producto PO del dispatch).
-- Complementa el `nudge_perfil_enviado_at timestamptz` previamente agregado
-- en migration 20261126_add_nudge_perfil_enviado_at.sql (PR #228 merged
-- c254d48).
--
-- Semántica combinada:
--   - nudge_perfil_enviado_at: timestamp del ÚLTIMO nudge enviado (last_nudge_sent_at
--     en el spec dispatch — misma función, nombre levemente distinto).
--   - nudge_count: contador 0..2 de nudges enviados a este proveedor.
--
-- Idempotency query del cron (PR 2):
--   WHERE nudge_count < 2
--     AND (nudge_perfil_enviado_at IS NULL
--          OR nudge_perfil_enviado_at < NOW() - INTERVAL '7 days')
--
-- Spec completo: docs/sprints/proveedor-perfil-nudge-plan.md.
-- Acta operativa: docs/sprints/nudge-schema-acta.md.
--
-- Blast radius: ADD COLUMN NOT NULL DEFAULT 0 sobre tabla `proveedores`. 28
-- filas existentes se setean en `nudge_count=0` automáticamente por el
-- DEFAULT. Zero data loss. Rollback: DROP COLUMN IF EXISTS en el acta.
--
-- Idempotencia: `IF NOT EXISTS` permite re-ejecutar sin romper.
-- ---------------------------------------------------------------------------

ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS nudge_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.proveedores.nudge_count IS
  'Contador de nudges "¿por qué no has publicado?" enviados al proveedor.
   0 = no recibió ninguno. 1 = recibió el primer nudge (7 días post-signup).
   2 = recibió el segundo nudge (14 días post-signup). >=2 = stop (no más
   nudges). Max estricto 2 per decisión producto. Sprint PROVEEDOR-PERFIL-
   NUDGE-7D 2026-11-26.';
