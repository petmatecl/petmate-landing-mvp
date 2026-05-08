-- ============================================================================
-- Sprint F — Contador de visitas (3/6): RPC registrar_visita
-- ============================================================================
-- Función atómica para registrar una visita.
--
-- Flujo:
--   1. Intenta INSERT en visitas_tracking.
--   2. Si UNIQUE viola → ya visitó hoy → return FALSE (no incrementa contadores).
--   3. Si insertó → UPDATE incrementa visitas_total + visitas_mes en la tabla
--      correspondiente (servicios_publicados o proveedores).
--   4. Return TRUE.
--
-- SECURITY DEFINER + search_path locked: la función necesita escribir en
-- visitas_tracking, servicios_publicados y proveedores. Usuarios anon y
-- authenticated NO tienen permisos directos sobre esas tablas — todo pasa
-- por esta función.
--
-- Idempotente: CREATE OR REPLACE FUNCTION (firma estable: TEXT, UUID, TEXT).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.registrar_visita(
    p_entidad_tipo TEXT,
    p_entidad_id   UUID,
    p_visitor_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Defense in depth: la tabla ya tiene CHECK pero acá fallamos rápido
    -- con mensaje claro si el frontend pasa cualquier otra cosa.
    IF p_entidad_tipo NOT IN ('servicio', 'proveedor') THEN
        RAISE EXCEPTION 'entidad_tipo debe ser servicio o proveedor, recibido: %', p_entidad_tipo;
    END IF;

    -- Intentar registrar en tracking. UNIQUE (entidad_tipo, entidad_id,
    -- visitor_hash, created_date) impide doble conteo en el mismo día UTC.
    BEGIN
        INSERT INTO visitas_tracking (entidad_tipo, entidad_id, visitor_hash)
        VALUES (p_entidad_tipo, p_entidad_id, p_visitor_hash);
    EXCEPTION
        WHEN unique_violation THEN
            -- Ya visitó hoy. NO se incrementa contador.
            RETURN FALSE;
    END;

    -- Insert exitoso → incrementar contadores de la entidad correspondiente.
    IF p_entidad_tipo = 'servicio' THEN
        UPDATE servicios_publicados
           SET visitas_total = visitas_total + 1,
               visitas_mes   = visitas_mes   + 1
         WHERE id = p_entidad_id;
    ELSE
        -- 'proveedor' (ya validado arriba)
        UPDATE proveedores
           SET visitas_total = visitas_total + 1,
               visitas_mes   = visitas_mes   + 1
         WHERE id = p_entidad_id;
    END IF;

    RETURN TRUE;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- GRANT EXECUTE: anon y authenticated.
-- Tutores no logueados también deben poder trackear → anon.
-- ──────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.registrar_visita(TEXT, UUID, TEXT) TO anon, authenticated;

-- Comment para documentar la función en el schema
COMMENT ON FUNCTION public.registrar_visita(TEXT, UUID, TEXT) IS
    'Registra una visita atómicamente. Retorna TRUE si era la primera del día '
    'para ese visitor_hash, FALSE si ya había una (rate limit por día UTC). '
    'Incrementa visitas_total y visitas_mes en la entidad correspondiente.';
