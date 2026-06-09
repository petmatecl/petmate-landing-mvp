-- 1. Agregar columnas
ALTER TABLE servicios_publicados
  ADD COLUMN IF NOT EXISTS rating_promedio numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_evaluaciones integer DEFAULT 0;

-- 2. Función que recalcula rating de un servicio
CREATE OR REPLACE FUNCTION actualizar_rating_servicio()
RETURNS TRIGGER AS $$
DECLARE
  v_servicio_id uuid;
BEGIN
  v_servicio_id := COALESCE(NEW.servicio_id, OLD.servicio_id);

  UPDATE servicios_publicados sp
  SET
    rating_promedio = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM evaluaciones
      WHERE servicio_id = v_servicio_id AND estado = 'aprobado'
    ), 0),
    total_evaluaciones = (
      SELECT COUNT(*)
      FROM evaluaciones
      WHERE servicio_id = v_servicio_id AND estado = 'aprobado'
    )
  WHERE sp.id = v_servicio_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger sobre evaluaciones (INSERT/UPDATE/DELETE)
-- WHEN clause evita recálculos innecesarios para evaluaciones que no son 'aprobado'
-- y no cambian estado/rating.
DROP TRIGGER IF EXISTS trg_actualizar_rating_servicio ON evaluaciones;
CREATE TRIGGER trg_actualizar_rating_servicio
AFTER INSERT OR UPDATE OR DELETE ON evaluaciones
FOR EACH ROW
WHEN (
  (TG_OP = 'INSERT' AND NEW.estado = 'aprobado') OR
  (TG_OP = 'DELETE' AND OLD.estado = 'aprobado') OR
  (TG_OP = 'UPDATE' AND (
    NEW.estado IS DISTINCT FROM OLD.estado OR
    NEW.rating IS DISTINCT FROM OLD.rating
  ))
)
EXECUTE FUNCTION actualizar_rating_servicio();

-- 4. Backfill inicial — recalcular para todos los servicios existentes
UPDATE servicios_publicados sp
SET
  rating_promedio = COALESCE((
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM evaluaciones e
    WHERE e.servicio_id = sp.id AND e.estado = 'aprobado'
  ), 0),
  total_evaluaciones = (
    SELECT COUNT(*)
    FROM evaluaciones e
    WHERE e.servicio_id = sp.id AND e.estado = 'aprobado'
  );

-- 5. Índice para sorting por rating en /explorar (futuro)
CREATE INDEX IF NOT EXISTS idx_servicios_rating
  ON servicios_publicados(rating_promedio DESC, total_evaluaciones DESC)
  WHERE activo = true;
