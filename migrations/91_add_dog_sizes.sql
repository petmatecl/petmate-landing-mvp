ALTER TABLE registro_petmate 
ADD COLUMN IF NOT EXISTS tamanos_perros text[] DEFAULT '{}';

COMMENT ON COLUMN registro_petmate.tamanos_perros IS 'Array of dog sizes the sitter accepts: pequeño, mediano, grande, gigante';
