-- migrations/20260911_avatars_no_public_list.sql
--
-- Sprint launch-l1 · L1-5 (AVA-1) — Bloquear listado público del bucket
-- `avatars`, dejando visible el GET individual por URL pública.
--
-- ============================================================================
-- MOTIVACIÓN
-- ============================================================================
-- Estado previo (heredado de `09_create_storage_buckets.sql` +
-- `103_fix_avatar_public_access.sql`):
--   * Bucket `avatars` con `public = true`.
--   * Policy "Public Access to Avatars" / "Public Read Avatars":
--       SELECT to public USING (bucket_id = 'avatars')
--     → cualquier anon puede `storage.list('avatars')` y enumerar TODOS
--     los objetos del bucket (paths con `user_id` como prefijo,
--     nombres de archivo, timestamps de upload). Aunque el contenido
--     de una foto de perfil es "público" por diseño (cualquiera con la
--     URL directa puede verla), el listado agregado expone el UNIVERSO
--     de proveedores registrados — información demográfica de la
--     plataforma que no debe ser público.
--
-- Plan aprobado PO 2026-09-11:
--   * Mantener bucket `public = true` — habilita el endpoint
--     `/storage/v1/object/public/avatars/<path>` que BYPASSEA RLS y
--     sirve GET directo sin auth. Sin este flag, `getPublicUrl()` +
--     `<img src>` en la ficha pública dejarían de renderizar.
--   * Eliminar policies "Public Access to Avatars" y "Public Read
--     Avatars" (SELECT to public sobre `bucket_id = 'avatars'`).
--   * Dejar SELECT solo para: (a) dueño autenticado sobre archivos
--     bajo su propio path prefix `user_id/`, (b) admin.
--
-- Trade-off aceptado:
--   * `storage.list('avatars')` con anon → devuelve `[]` (RLS filtra
--     todo). Con dueño autenticado → devuelve solo lo bajo su prefijo.
--     Con admin → devuelve todo.
--   * GET vía `/object/public/avatars/<user_id>/avatar.png` → sigue
--     sirviendo 200 con el archivo — el endpoint público bypassea RLS
--     por diseño de Supabase Storage (documentado). Fotos de perfil
--     en fichas públicas siguen visibles sin cambio.
--
-- Convención de path (verificado 2026-09-11 en `pages/proveedor/index.tsx:809`):
--   Los uploads del proveedor usan `filePath = "${user.id}/avatar.${ext}"`
--   → primer folder segment del path = `user.id`.
--   La policy de owner-scope usa `(storage.foldername(name))[1] = uid`
--   que es el patrón canónico de Supabase docs para owner-scoped access.
--
-- Referencia oficial:
--   https://supabase.com/docs/guides/storage/security/access-control
--
-- ============================================================================
-- POLICIES QUE PERMANECEN (creadas por 09_create_storage_buckets.sql)
-- ============================================================================
-- * "Authenticated users can upload avatars" (INSERT to authenticated)
-- * "Users can update own avatars" (UPDATE to authenticated, owner = uid)
-- * "Users can delete own avatars" (DELETE to authenticated, owner = uid)
--
-- No las tocamos — el flujo de write sigue igual.
--
-- ============================================================================
-- EJECUCIÓN
-- ============================================================================
-- SQL Editor de Supabase Studio, rol `postgres` default. Un único click
-- de Run. Bloque BEGIN/COMMIT hace la operación atómica.
--
-- Orden: staging primero → smokes de verificación (ver bloque final del
-- archivo) → aplicar a prod tras evidencia OK.

BEGIN;

-- ============================================================================
-- SECCIÓN A — Bucket sigue público (idempotente; no cambia si ya lo era).
-- ============================================================================
UPDATE storage.buckets
   SET public = true
 WHERE id = 'avatars';

-- ============================================================================
-- SECCIÓN B — Drop policies de SELECT público sobre bucket avatars.
-- ============================================================================
-- Dos nombres coexisten históricamente (una por archivo). Ambas apuntan
-- al mismo vector; drop de las dos con IF EXISTS para idempotencia.
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;

-- ============================================================================
-- SECCIÓN C — SELECT solo dueño autenticado (owner-scoped por path).
-- ============================================================================
-- Path convention: `${user.id}/avatar.${ext}` — primer folder = user.id.
-- Usamos `storage.foldername(name)` que retorna array de segmentos.
CREATE POLICY "Avatars owner SELECT own"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    );

-- ============================================================================
-- SECCIÓN D — SELECT admin ve todo (para moderación / debugging).
-- ============================================================================
CREATE POLICY "Avatars admin SELECT all"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND public.is_admin()
    );

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-APPLY (smokes en staging antes de aplicar a prod)
-- ============================================================================
-- Los siguientes checks se corren FUERA de la transacción, como
-- verificación operativa. Copiar/pegar cada bloque al SQL Editor o
-- ejecutar los curl desde terminal.
--
-- ------------------------------------------------------------------------
-- CHECK 1: Snapshot de policies vigentes sobre storage.objects filtrado
-- por bucket avatars. Esperado post-apply:
--   * "Avatars owner SELECT own"    (SELECT, authenticated)
--   * "Avatars admin SELECT all"    (SELECT, authenticated)
--   * "Authenticated users can upload avatars" (INSERT, authenticated)
--   * "Users can update own avatars" (UPDATE, authenticated)
--   * "Users can delete own avatars" (DELETE, authenticated)
--   * (cero policies TO public)
--
-- SELECT polname, cmd, roles, qual::text
--   FROM pg_policies
--  WHERE schemaname = 'storage' AND tablename = 'objects'
--    AND qual::text LIKE '%avatars%'
--  ORDER BY polname;
--
-- ------------------------------------------------------------------------
-- CHECK 2: Bucket sigue con `public = true` (para bypass RLS del endpoint
-- public GET).
--
-- SELECT id, public FROM storage.buckets WHERE id = 'avatars';
-- Esperado: id='avatars', public=true.
--
-- ------------------------------------------------------------------------
-- CHECK 3: Anon list bucket → esperado vacío (`[]`), no error.
-- Terminal (staging):
--
--   curl -s -X POST \
--     'https://jmtadvdkicyylcwjcmcl.supabase.co/storage/v1/object/list/avatars' \
--     -H "apikey: <SUPABASE_ANON_KEY_STAGING>" \
--     -H "Content-Type: application/json" \
--     -d '{"prefix":"","limit":100}'
--
-- Esperado: `[]` (RLS filtra todas las rows para anon — cero policies
-- SELECT to public).
--
-- ------------------------------------------------------------------------
-- CHECK 4: Anon GET individual vía endpoint público → esperado 200 con
-- el archivo (el endpoint public/ bypassea RLS cuando bucket.public = true).
-- Terminal (staging), usando un path conocido (foto de perfil de Aldo):
--
--   curl -sI \
--     'https://jmtadvdkicyylcwjcmcl.supabase.co/storage/v1/object/public/avatars/<uid-aldo>/avatar.png'
--
-- Esperado: HTTP/2 200, content-type: image/*. Si retorna 400 "Bucket
-- not found" → el bucket dejó de ser público (regresión — revisar
-- SECCIÓN A). Si retorna 404 → el path no existe (no aplica el test).
--
-- ------------------------------------------------------------------------
-- CHECK 5: Owner autenticado list bajo su prefix → esperado solo sus
-- archivos.
-- SQL Editor con `SET LOCAL role='authenticated'` + JWT del owner, o via
-- Storage Explorer del dashboard estando logueado como Aldo. Alternativa
-- via SDK (spec Playwright):
--
--   const { data } = await supabase.storage.from('avatars').list('<uid-aldo>');
--   → esperado: [{ name: 'avatar.png', ... }] (solo Aldo).
--
--   const { data: otro } = await supabase.storage.from('avatars').list('<uid-otro>');
--   → esperado: [] (owner scope filtra).
--
-- ------------------------------------------------------------------------
-- CHECK 6: Foto de perfil sigue visible en ficha pública (superficie
-- observable del user final). Navegar `/proveedor/<id-de-un-proveedor-
-- con-foto>` sin sesión → hero muestra la foto sin roto.
