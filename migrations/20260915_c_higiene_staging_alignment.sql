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

-- 3. Paridad avatars INSERT + UPDATE + DELETE: alinear las 3 policies a
-- shape byte-idéntico a prod (verificado via MCP prod-ro con query
-- corregida `polqual OR polwithcheck`). Postgres exige DROP + CREATE
-- para reasignar roles y para actualizar USING/WITH CHECK — mantenemos
-- los nombres canónicos que ya existían.
--
-- Shape final (idéntico prod, 5 policies bucket avatars):
--   INSERT: TO authenticated, WITH CHECK bucket_id='avatars' AND auth.role()='authenticated'
--   UPDATE: TO authenticated, USING bucket_id='avatars' AND owner = auth.uid()
--   DELETE: TO authenticated, USING bucket_id='avatars' AND owner = auth.uid()
--   SELECT admin: TO authenticated, qual bucket_id='avatars' AND is_admin()  [YA ALINEADO]
--   SELECT owner: TO authenticated, qual bucket_id='avatars' AND foldername = auth.uid()  [YA ALINEADO]

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());
