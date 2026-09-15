-- migrations/20260915_c_higiene_staging_alignment.sql
-- ---------------------------------------------------------------------------
-- Sprint c-higiene PR C-3 (2026-09-15) — alinear staging a prod.
-- Prod ya tiene el schema/policies correctas (verificado via MCP prod-ro
-- el 2026-09-15). Este script solo aplica en STAGING para eliminar drift.
-- Cero SQL para ejecutar en prod desde este archivo.
--
-- Cambios:
--   1. MASCOTAS-POL — DROP 4 policies duplicadas de staging con slug
--      `tutor_*_own_mascotas`. Los predicates son idénticos a los 4
--      "Usuarios pueden ..." (canónicos en prod), evaluación redundante
--      hoy. Post-DROP staging queda con 6 policies (idéntico a prod).
--   2. DATOS-ESP — DROP COLUMN proveedores.datos_especificos en staging.
--      Prod ya no tiene esta columna (dropeada por migration
--      20260818_drop_datos_especificos.sql). Cero lecturas en código
--      productivo (solo comentarios explicando la deprecación).
--   3. Paridad avatars INSERT — ALTER POLICY para que staging use
--      `TO authenticated` en vez de `TO public`. Prod ya tiene el
--      valor correcto; staging quedó con `{public}` por drift histórico.
--      El resto (UPDATE/DELETE avatars) también tiene drift pero queda
--      como deuda separada (BACKLOG anota + fuera de alcance PO).
-- ---------------------------------------------------------------------------

-- 1. MASCOTAS-POL: DROP duplicados en staging
DROP POLICY IF EXISTS "tutor_delete_own_mascotas" ON public.mascotas;
DROP POLICY IF EXISTS "tutor_insert_own_mascotas" ON public.mascotas;
DROP POLICY IF EXISTS "tutor_select_own_mascotas" ON public.mascotas;
DROP POLICY IF EXISTS "tutor_update_own_mascotas" ON public.mascotas;

-- 2. DATOS-ESP: DROP COLUMN huérfana
ALTER TABLE public.proveedores DROP COLUMN IF EXISTS datos_especificos;

-- 3. Paridad avatars INSERT: alinear roles a `authenticated`
-- ALTER POLICY con reasignación de roles no es directo — Postgres exige
-- DROP + CREATE. Reasignamos preservando el nombre para retrocompat.
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');
