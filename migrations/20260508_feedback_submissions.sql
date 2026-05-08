-- ============================================================================
-- Sprint combinado — Feature B: tabla feedback_submissions
-- ============================================================================
-- Reemplaza la tabla legacy `feedback` (queda intacta como histórico).
-- Nuevo widget en components/Shared/FeedbackWidget.tsx escribe acá.
--
-- - INSERT público (anon + authenticated) — rate-limited en frontend (30s)
-- - SELECT/UPDATE solo admin via public.is_admin() (existente)
-- - Sin notificaciones por email — admin consulta cuando quiera
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_submissions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rol          TEXT         NOT NULL CHECK (rol IN ('tutor', 'proveedor', 'admin', 'otro')),
    categoria    TEXT         NOT NULL CHECK (categoria IN ('bug', 'sugerencia', 'pregunta', 'otro')),
    mensaje      TEXT         NOT NULL CHECK (length(mensaje) BETWEEN 10 AND 2000),
    user_id      UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    pagina_url   TEXT,
    viewport     TEXT,
    user_agent   TEXT,
    estado       TEXT         NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'en_revision', 'resuelto', 'descartado')),
    notas_admin  TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_estado     ON feedback_submissions(estado);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_categoria  ON feedback_submissions(categoria);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at);

-- RLS
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_insert_all ON feedback_submissions;
CREATE POLICY feedback_submissions_insert_all ON feedback_submissions
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS feedback_submissions_select_admin ON feedback_submissions;
CREATE POLICY feedback_submissions_select_admin ON feedback_submissions
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS feedback_submissions_update_admin ON feedback_submissions;
CREATE POLICY feedback_submissions_update_admin ON feedback_submissions
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- updated_at trigger
CREATE OR REPLACE FUNCTION trg_feedback_submissions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feedback_submissions_updated_at ON feedback_submissions;
CREATE TRIGGER trg_feedback_submissions_updated_at
BEFORE UPDATE ON feedback_submissions
FOR EACH ROW EXECUTE FUNCTION trg_feedback_submissions_set_updated_at();

COMMENT ON TABLE feedback_submissions IS
    'Sprint combinado — Feature B. Reemplaza la tabla feedback legacy. '
    'INSERT público (rate-limited en frontend). SELECT/UPDATE solo admin via is_admin().';
