-- Cleanup unused columns from registro_petmate
ALTER TABLE registro_petmate
DROP COLUMN IF EXISTS edad,
DROP COLUMN IF EXISTS mascotas_viaje,
DROP COLUMN IF EXISTS perros,
DROP COLUMN IF EXISTS gatos,
DROP COLUMN IF EXISTS max_mascotas_en_casa,
DROP COLUMN IF EXISTS max_mascotas_domicilio,
DROP COLUMN IF EXISTS acepta_perros,
DROP COLUMN IF EXISTS acepta_gatos,
DROP COLUMN IF EXISTS fecha_inicio,
DROP COLUMN IF EXISTS fecha_fin,
DROP COLUMN IF EXISTS modalidad,
DROP COLUMN IF EXISTS rol;

-- Cleanup unused columns from mascotas
ALTER TABLE mascotas
DROP COLUMN IF EXISTS edad;

-- Cleanup unused columns from direcciones
ALTER TABLE direcciones
DROP COLUMN IF EXISTS codigo_postal;
