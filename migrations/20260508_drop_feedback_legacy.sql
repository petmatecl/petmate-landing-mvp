-- ============================================================================
-- Sprint backlog menor — Drop tabla legacy 'feedback'
-- ============================================================================
-- Reemplazada por feedback_submissions desde commit 8fd032d
-- (migrations/20260508_feedback_submissions.sql).
--
-- Verificaciones previas (todas confirmadas antes de aplicar):
--   · 0 filas en la tabla
--   · 0 referencias en código (grep "from('feedback')" → 0 hits)
--     El FeedbackWidget rewrite migró todos los inserts a feedback_submissions.
--   · 0 dependencias externas (vistas, RPCs, foreign keys, triggers externos)
--     Solo 1 CHECK constraint propio (feedback_tipo_check) que se borra
--     automáticamente con la tabla.
--
-- DROP es 100% seguro. CASCADE como salvaguarda por si quedó alguna RLS policy
-- huérfana — borrarla no afecta nada externo.
-- ============================================================================

DROP TABLE IF EXISTS public.feedback CASCADE;
