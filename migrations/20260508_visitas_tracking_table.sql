-- ============================================================================
-- Sprint F — Contador de visitas (2/6): tabla de tracking anti-inflación
-- ============================================================================
-- Tracking de quién visitó qué entidad y cuándo, para hacer rate limiting:
-- 1 visita por (entidad, visitor) por día.
--
-- visitor_hash:
--   - Si usuario logueado: usa user.id (UUID como text)
--   - Si anónimo: sha256(ip + user-agent) calculado server-side
--
-- created_date (generated):
--   - DATE(created_at AT TIME ZONE 'UTC') es IMMUTABLE (timezone hardcoded),
--     a diferencia de DATE(created_at) que depende del timezone de sesión.
--   - Permite UNIQUE constraint determinístico por día UTC.
--
-- TTL: 7 días, cleanup vía cron (archivo 6/6 + Vercel cron).
-- Sin RLS: la tabla solo se accede vía RPC registrar_visita (SECURITY DEFINER).
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Tabla
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitas_tracking (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad_tipo  TEXT         NOT NULL CHECK (entidad_tipo IN ('servicio', 'proveedor')),
    entidad_id    UUID         NOT NULL,
    visitor_hash  TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_date  DATE         GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED
);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. UNIQUE constraint: 1 visita por (entidad, visitor) por día UTC
-- ──────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'visitas_tracking_dedupe_diario'
    ) THEN
        ALTER TABLE visitas_tracking
            ADD CONSTRAINT visitas_tracking_dedupe_diario
            UNIQUE (entidad_tipo, entidad_id, visitor_hash, created_date);
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Indexes
-- ──────────────────────────────────────────────────────────────────────────
-- Para queries de stats por entidad (no hay queries de stats hoy, pero útil
-- para auditoría futura o detección de fraude).
CREATE INDEX IF NOT EXISTS idx_visitas_tracking_entidad
    ON visitas_tracking (entidad_tipo, entidad_id);

-- Para el job de cleanup TTL (cron diario): WHERE created_at < NOW() - 7 days
CREATE INDEX IF NOT EXISTS idx_visitas_tracking_created_at
    ON visitas_tracking (created_at);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Sin RLS — la tabla solo se accede vía RPC SECURITY DEFINER (archivo 3/6).
--    Documentamos explícitamente para que quede claro al revisor.
-- ──────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE visitas_tracking IS
    'Tracking anti-inflación de visitas. 1 fila por (entidad, visitor, día UTC). '
    'TTL 7 días via cron. Acceso solo vía RPC registrar_visita (SECURITY DEFINER) — sin RLS.';
