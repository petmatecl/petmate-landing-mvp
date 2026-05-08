-- ============================================================================
-- Sprint F — Contador de visitas (1/6): columnas en tablas existentes
-- ============================================================================
-- Agrega 4 columnas:
--   servicios_publicados.visitas_total + .visitas_mes
--   proveedores.visitas_total + .visitas_mes
-- Todas INTEGER NOT NULL DEFAULT 0 con CHECK >= 0.
--
-- Idempotente: usa ADD COLUMN IF NOT EXISTS para soportar re-run.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. servicios_publicados
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE servicios_publicados
    ADD COLUMN IF NOT EXISTS visitas_total INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS visitas_mes   INTEGER NOT NULL DEFAULT 0;

-- CHECK constraints (PG no soporta IF NOT EXISTS para constraints, así que
-- usamos DO block que verifica antes de agregar — idempotente).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'servicios_publicados_visitas_total_check'
    ) THEN
        ALTER TABLE servicios_publicados
            ADD CONSTRAINT servicios_publicados_visitas_total_check
            CHECK (visitas_total >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'servicios_publicados_visitas_mes_check'
    ) THEN
        ALTER TABLE servicios_publicados
            ADD CONSTRAINT servicios_publicados_visitas_mes_check
            CHECK (visitas_mes >= 0);
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. proveedores
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE proveedores
    ADD COLUMN IF NOT EXISTS visitas_total INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS visitas_mes   INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'proveedores_visitas_total_check'
    ) THEN
        ALTER TABLE proveedores
            ADD CONSTRAINT proveedores_visitas_total_check
            CHECK (visitas_total >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'proveedores_visitas_mes_check'
    ) THEN
        ALTER TABLE proveedores
            ADD CONSTRAINT proveedores_visitas_mes_check
            CHECK (visitas_mes >= 0);
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Verificación rápida (descomentar y correr aparte tras el script)
-- ──────────────────────────────────────────────────────────────────────────
-- SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--  WHERE table_name IN ('servicios_publicados', 'proveedores')
--    AND column_name IN ('visitas_total', 'visitas_mes')
--  ORDER BY table_name, column_name;
-- -- Esperado: 4 filas, todas integer NOT NULL DEFAULT 0
--
-- SELECT count(*) FROM servicios_publicados WHERE visitas_total = 0 AND visitas_mes = 0;
-- -- Esperado: igual al total de servicios (todos arrancan en 0)
--
-- SELECT count(*) FROM proveedores WHERE visitas_total = 0 AND visitas_mes = 0;
-- -- Esperado: igual al total de proveedores
