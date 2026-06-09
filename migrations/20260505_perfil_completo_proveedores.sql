-- ============================================================================
-- Bloque 3 sprint /ejemplo: badge "Perfil completo" + flag denormalizado
-- ============================================================================
-- Agrega proveedores.perfil_completo (boolean) calculado por trigger.
-- Refleja la misma rúbrica de 8 pasos que el widget en /proveedor (tab Servicios).
--
-- Rúbrica (suma 100 puntos exactos; se considera completo si score >= 100):
--   1. Foto de perfil                          15
--   2. Nombre público definido                 10
--   3. Bio > 100 caracteres                    15
--   4. WhatsApp o teléfono cargado             15
--   5. ≥ 1 servicio activo                     15
--   6. Galería con 3+ fotos                    10
--   7. Comuna                                  10
--   8. Experiencia o certificación             10
--                                             ----
--                                             100
-- ============================================================================
-- ⚠️ Nota: este script NO modifica el RPC `buscar_servicios`. Para que el badge
-- aparezca en /explorar y otras páginas que usan el RPC, hay que agregar
-- `p.perfil_completo AS proveedor_perfil_completo` al SELECT dentro del RPC
-- en una migración separada (requiere ver la definición actual del RPC con
-- `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'buscar_servicios'`).
-- ============================================================================

-- 1. Columna
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS perfil_completo BOOLEAN NOT NULL DEFAULT false;

-- 2. Función pura que calcula el flag para un proveedor dado
CREATE OR REPLACE FUNCTION calcular_perfil_completo_proveedor(p_proveedor_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    v proveedores%ROWTYPE;
    v_servicios_activos integer;
    v_galeria_count integer;
    v_score integer := 0;
BEGIN
    SELECT * INTO v FROM proveedores WHERE id = p_proveedor_id;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- 1. Foto de perfil (15 pts)
    IF v.foto_perfil IS NOT NULL AND v.foto_perfil <> '' THEN
        v_score := v_score + 15;
    END IF;

    -- 2. Nombre público (10 pts)
    IF v.nombre_publico IS NOT NULL AND v.nombre_publico <> '' THEN
        v_score := v_score + 10;
    END IF;

    -- 3. Bio > 100 caracteres (15 pts)
    IF length(coalesce(v.bio, '')) > 100 THEN
        v_score := v_score + 15;
    END IF;

    -- 4. WhatsApp o teléfono (15 pts)
    IF (v.whatsapp IS NOT NULL AND v.whatsapp <> '')
       OR (v.telefono IS NOT NULL AND v.telefono <> '') THEN
        v_score := v_score + 15;
    END IF;

    -- 5. ≥ 1 servicio activo (15 pts)
    SELECT COUNT(*) INTO v_servicios_activos
    FROM servicios_publicados
    WHERE proveedor_id = p_proveedor_id AND activo = true;
    IF v_servicios_activos >= 1 THEN
        v_score := v_score + 15;
    END IF;

    -- 6. Galería 3+ fotos (10 pts)
    v_galeria_count := coalesce(array_length(v.galeria, 1), 0);
    IF v_galeria_count >= 3 THEN
        v_score := v_score + 10;
    END IF;

    -- 7. Comuna (10 pts)
    IF v.comuna IS NOT NULL AND v.comuna <> '' THEN
        v_score := v_score + 10;
    END IF;

    -- 8. Experiencia o certificación (10 pts)
    -- Nota: se considera "done" si anios_experiencia tiene cualquier valor (incluyendo 0)
    -- o si hay certificaciones no vacías. Coincide con la lógica TS del widget:
    -- `!!(aniosExperiencia || certificaciones)` donde aniosExperiencia es string state.
    IF v.anios_experiencia IS NOT NULL
       OR (v.certificaciones IS NOT NULL AND v.certificaciones <> '') THEN
        v_score := v_score + 10;
    END IF;

    RETURN v_score >= 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger BEFORE UPDATE en proveedores: recalcular antes de guardar
CREATE OR REPLACE FUNCTION trg_proveedor_recalcular_completo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.perfil_completo := calcular_perfil_completo_proveedor(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proveedor_perfil_completo ON proveedores;
CREATE TRIGGER trg_proveedor_perfil_completo
BEFORE UPDATE ON proveedores
FOR EACH ROW EXECUTE FUNCTION trg_proveedor_recalcular_completo();

-- 4. Trigger en servicios_publicados: recalcular flag del proveedor
--    cuando cambia un servicio (criterio "≥ 1 servicio activo" puede cambiar).
--    Se dispara tras INSERT, UPDATE de columnas relevantes y DELETE.
CREATE OR REPLACE FUNCTION trg_servicio_recalcular_completo_proveedor()
RETURNS TRIGGER AS $$
DECLARE
    v_id uuid;
BEGIN
    v_id := COALESCE(NEW.proveedor_id, OLD.proveedor_id);
    UPDATE proveedores
       SET perfil_completo = calcular_perfil_completo_proveedor(v_id)
     WHERE id = v_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_servicio_perfil_completo ON servicios_publicados;
CREATE TRIGGER trg_servicio_perfil_completo
AFTER INSERT OR UPDATE OF activo, proveedor_id OR DELETE ON servicios_publicados
FOR EACH ROW EXECUTE FUNCTION trg_servicio_recalcular_completo_proveedor();

-- 5. Backfill — calcular para todos los proveedores existentes
UPDATE proveedores SET perfil_completo = calcular_perfil_completo_proveedor(id);

-- 6. Verificación rápida (corré tras el script):
-- SELECT id, nombre, perfil_completo FROM proveedores LIMIT 10;
-- SELECT count(*) FILTER (WHERE perfil_completo) AS completos,
--        count(*) FILTER (WHERE NOT perfil_completo) AS incompletos
-- FROM proveedores;
