-- ============================================================================
-- Sprint F — Contador de visitas (6/6): funciones SQL para Vercel cron jobs
-- ============================================================================
-- Dos funciones invocadas desde endpoints en pages/api/cron/*:
--
--   reset_visitas_mes()         — schedule mensual día 1 (resetea visitas_mes)
--   cleanup_visitas_tracking()  — schedule diario (TTL 7 días)
--
-- Ambas:
--   - SECURITY DEFINER + search_path locked (best practice)
--   - GRANT EXECUTE solo a service_role (los cron endpoints usan service key)
--   - Retornan integer con count de filas afectadas (telemetría)
--
-- Nota: gracias al trigger optimizado del archivo 5/6, los UPDATE en
-- proveedores que solo tocan visitas_mes NO disparan el recálculo de
-- perfil_completo — barato incluso con miles de filas.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. reset_visitas_mes()
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_visitas_mes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_servicios_count INTEGER;
    v_proveedores_count INTEGER;
BEGIN
    -- Solo tocar filas con visitas_mes > 0 — evita UPDATEs innecesarios
    -- y mantiene el trigger optimizado del archivo 5/6 sin dispararse
    -- (visitas_mes no está en la lista OF).
    UPDATE servicios_publicados
       SET visitas_mes = 0
     WHERE visitas_mes > 0;
    GET DIAGNOSTICS v_servicios_count = ROW_COUNT;

    UPDATE proveedores
       SET visitas_mes = 0
     WHERE visitas_mes > 0;
    GET DIAGNOSTICS v_proveedores_count = ROW_COUNT;

    RETURN v_servicios_count + v_proveedores_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_visitas_mes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_visitas_mes() TO service_role;

COMMENT ON FUNCTION public.reset_visitas_mes() IS
    'Resetea visitas_mes a 0 en servicios_publicados y proveedores. '
    'Pensado para correr el día 1 de cada mes via Vercel cron '
    '(/api/cron/reset-visitas-mes, schedule "0 0 1 * *"). '
    'Retorna total de filas afectadas (servicios + proveedores).';

-- ──────────────────────────────────────────────────────────────────────────
-- 2. cleanup_visitas_tracking()
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_visitas_tracking()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- TTL 7 días: el rate limit usa created_date (DATE), entonces 7 días
    -- es suficiente buffer para que ningún visitante reciente pierda su
    -- protección de "1 visita por día". Más allá de 7 días no aporta valor.
    DELETE FROM visitas_tracking
     WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_visitas_tracking() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_visitas_tracking() TO service_role;

COMMENT ON FUNCTION public.cleanup_visitas_tracking() IS
    'Elimina filas de visitas_tracking con created_at > 7 días. '
    'TTL alineado con la ventana del rate limit (1 visita por visitor por día UTC). '
    'Pensado para correr diariamente via Vercel cron '
    '(/api/cron/cleanup-visitas-tracking, schedule "0 3 * * *"). '
    'Retorna count de filas eliminadas.';
