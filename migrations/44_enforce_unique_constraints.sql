-- 1. Asegurar que la columna 'rut' existe (idempotente)
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS rut TEXT;

-- 2. Limpieza de duplicados (Opcional, pero recomendado antes de crear índices únicos)
-- Si hay duplicados exactos de (rut, rol), podríamos tener problemas.
-- Por ahora asumiremos que los datos son consistentes o que el admin los arreglará si falla.

-- 3. Crear índice único para RUT por ROL
-- Un usuario no puede tener 2 cuentas de 'petmate' con el mismo RUT.
-- Pero SÍ puede tener 1 cuenta 'petmate' y 1 cuenta 'cliente' con el mismo RUT.
DROP INDEX IF EXISTS idx_unique_rut_rol;
CREATE UNIQUE INDEX idx_unique_rut_rol 
ON public.registro_petmate (rut, rol)
WHERE rut IS NOT NULL; -- Solo aplica si el RUT no es nulo

-- 4. Crear índice único para EMAIL por ROL
-- Similar al RUT, prevenimos duplicados de email dentro del mismo rol.
DROP INDEX IF EXISTS idx_unique_email_rol;
CREATE UNIQUE INDEX idx_unique_email_rol
ON public.registro_petmate (email, rol);
