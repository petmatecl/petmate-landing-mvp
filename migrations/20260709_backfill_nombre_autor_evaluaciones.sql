-- Backfill de `evaluaciones.nombre_autor` para reseñas existentes.
--
-- Contexto: la columna `nombre_autor` (agregada en 20260506_seed_demos.sql:496)
-- se poblaba solo por seed. El flow real de ReviewForm no la seteaba, y
-- ReviewList caia a "Usuario" porque `usuarios_buscadores` esta protegida
-- por RLS owner-only y no puede leerse cross-user desde el cliente.
-- Post fix commit fix(resenas): resolver nombre publico del reseñador,
-- todo INSERT nuevo poblara la columna con formato "Nombre I.".
-- Este backfill cierra el gap para las reseñas anteriores.
--
-- Formato publico: primer token del nombre + inicial del segundo con punto.
--   'Aldo Cano Cortes'         → 'Aldo C.'
--   'María José López García'  → 'María J.'
--   'María'                    → 'María'
-- Replica la logica del helper `formatearNombrePublico` en ReviewForm.tsx.
--
-- Idempotente: solo actualiza filas con `nombre_autor IS NULL`. Correr en
-- staging (jmtadvdkicyylcwjcmcl) y prod (ouezpeeiwjwawauidrqq).

-- Paso 1 — resolver desde usuarios_buscadores (tutores).
UPDATE evaluaciones e
   SET nombre_autor = CASE
       WHEN array_length(string_to_array(trim(u.nombre), ' '), 1) >= 2 THEN
           (string_to_array(trim(u.nombre), ' '))[1] || ' '
           || upper(left((string_to_array(trim(u.nombre), ' '))[2], 1)) || '.'
       ELSE
           trim(u.nombre)
   END
  FROM usuarios_buscadores u
 WHERE e.usuario_id = u.auth_user_id
   AND e.nombre_autor IS NULL
   AND u.nombre IS NOT NULL
   AND trim(u.nombre) <> '';

-- Paso 2 — resolver desde proveedores (caso raro: reseñador es un proveedor
-- sin fila en usuarios_buscadores). Preferimos `nombre_publico` si existe;
-- sino componemos "nombre + inicial(apellido_p)".
UPDATE evaluaciones e
   SET nombre_autor = CASE
       WHEN p.nombre_publico IS NOT NULL AND trim(p.nombre_publico) <> '' THEN
           trim(p.nombre_publico)
       WHEN p.apellido_p IS NOT NULL AND trim(p.apellido_p) <> '' THEN
           trim(p.nombre) || ' ' || upper(left(trim(p.apellido_p), 1)) || '.'
       ELSE
           trim(p.nombre)
   END
  FROM proveedores p
 WHERE e.usuario_id = p.auth_user_id
   AND e.nombre_autor IS NULL
   AND p.nombre IS NOT NULL
   AND trim(p.nombre) <> '';

-- Paso 3 — sanity: cualquier residuo (usuarios borrados, huerfanos) queda
-- con label neutro. Evita "Usuario" hardcoded a nivel UI y hace el fallback
-- explicito en BD.
UPDATE evaluaciones
   SET nombre_autor = 'Usuario'
 WHERE nombre_autor IS NULL;

-- Verificacion (correr manualmente despues del UPDATE):
--   SELECT COUNT(*) FILTER (WHERE nombre_autor IS NULL) AS todavia_null,
--          COUNT(*) FILTER (WHERE nombre_autor = 'Usuario') AS anonimas,
--          COUNT(*) AS total
--     FROM evaluaciones;
