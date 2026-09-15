-- scripts/audit-avatars-orphans.sql
-- ---------------------------------------------------------------------------
-- AVATARS-HUER audit — sprint bloque-f item 2 (2026-09-15)
--
-- CONTEXTO:
--   El bucket public `avatars` acumula objetos históricos (uploads de test
--   legacy, cambios de perfil, migraciones abortadas). Este script identifica
--   objetos SIN referencia desde ninguna tabla del schema que legítimamente
--   apunta al bucket:
--     - proveedores.foto_perfil (URL completa con host)
--     - proveedores.foto_carnet (idem)
--     - proveedores.foto_carnet_dorso (idem)
--     - proveedores.galeria[] (array de URLs)
--     - mascotas.foto_mascota (idem)
--     - servicios_publicados.fotos[] (array de URLs)
--
--   Nota: `usuarios_buscadores` (tutores) NO tiene columna foto_perfil hoy —
--   la feature de foto de tutor está deferida (ver BACKLOG L692). Los
--   objetos huérfanos incluyen uploads de test legacy que nunca se
--   commitearon a ninguna tabla.
--
-- QUÉ HACE:
--   1. Query de conteo total y bytes/MB de orphans (safe, sin mutación).
--   2. Query de listado detallado (safe).
--   3. Query DELETE preparado — comentado, requiere descomentar + GO explícito
--      del PO para ejecutar en prod.
--
-- CÓMO USAR:
--   - **Staging**: correr los SELECT vía MCP `supabase-staging-rw` o via
--     Supabase Studio SQL Editor con rol `postgres`. Verificado 2026-09-15
--     → cero huérfanos.
--   - **Prod**: correr los SELECT vía MCP `supabase-prod-ro` (read-only) para
--     el audit inicial. Verificado 2026-09-15 → 79 orphans = ~78 MB.
--     Ejecución del DELETE por Aldo desde Supabase Studio con rol `postgres`.
--     Ver "SECCIÓN 3 — DELETE" abajo con instrucciones.
--
-- SEGURIDAD:
--   - El DELETE de la sección 3 SÓLO borra objetos que NO tienen referencia
--     en ninguna de las 6 columnas listadas arriba. Cero riesgo de dejar una
--     ficha pública con un avatar roto post-cleanup.
--   - El `WHERE bucket_id = 'avatars'` limita el scope al bucket público de
--     avatars. Otros buckets (`documents` con carnets privados) NO son
--     tocados por este script.
-- ---------------------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 1 — CONTEO Y TAMAÑO TOTAL DE ORPHANS
-- ═══════════════════════════════════════════════════════════════════════════

WITH refs AS (
    SELECT foto_perfil AS url FROM proveedores WHERE foto_perfil IS NOT NULL
    UNION ALL
    SELECT foto_carnet FROM proveedores WHERE foto_carnet IS NOT NULL
    UNION ALL
    SELECT foto_carnet_dorso FROM proveedores WHERE foto_carnet_dorso IS NOT NULL
    UNION ALL
    SELECT unnest(galeria) FROM proveedores WHERE galeria IS NOT NULL AND array_length(galeria, 1) > 0
    UNION ALL
    SELECT foto_mascota FROM mascotas WHERE foto_mascota IS NOT NULL
    UNION ALL
    SELECT unnest(fotos) FROM servicios_publicados WHERE fotos IS NOT NULL AND array_length(fotos, 1) > 0
)
SELECT
    COUNT(*) AS orphans_total,
    pg_size_pretty(SUM((o.metadata->>'size')::bigint)) AS orphan_size_pretty,
    ROUND(SUM((o.metadata->>'size')::bigint)::numeric / 1024 / 1024, 2) AS orphan_mb
  FROM storage.objects o
 WHERE o.bucket_id = 'avatars'
   AND NOT EXISTS (SELECT 1 FROM refs WHERE refs.url LIKE '%' || o.name || '%');


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 2 — LISTADO DETALLADO DE ORPHANS
-- ═══════════════════════════════════════════════════════════════════════════

WITH refs AS (
    SELECT foto_perfil AS url FROM proveedores WHERE foto_perfil IS NOT NULL
    UNION ALL
    SELECT foto_carnet FROM proveedores WHERE foto_carnet IS NOT NULL
    UNION ALL
    SELECT foto_carnet_dorso FROM proveedores WHERE foto_carnet_dorso IS NOT NULL
    UNION ALL
    SELECT unnest(galeria) FROM proveedores WHERE galeria IS NOT NULL AND array_length(galeria, 1) > 0
    UNION ALL
    SELECT foto_mascota FROM mascotas WHERE foto_mascota IS NOT NULL
    UNION ALL
    SELECT unnest(fotos) FROM servicios_publicados WHERE fotos IS NOT NULL AND array_length(fotos, 1) > 0
)
SELECT
    o.name AS object_path,
    o.created_at,
    o.metadata->>'size' AS size_bytes,
    ROUND((o.metadata->>'size')::numeric / 1024, 1) AS size_kb
  FROM storage.objects o
 WHERE o.bucket_id = 'avatars'
   AND NOT EXISTS (SELECT 1 FROM refs WHERE refs.url LIKE '%' || o.name || '%')
 ORDER BY o.created_at DESC;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 3 — DELETE DE ORPHANS (COMENTADO — DESCOMENTAR + GO PO)
-- ═══════════════════════════════════════════════════════════════════════════
-- IMPORTANTE:
--   El DELETE de `storage.objects` limpia solo el registro de metadata.
--   El binario en S3 se marca para GC async (típicamente segundos).
--   Cero riesgo si el objeto genuinamente no tiene referencia — el frontend
--   nunca lo servirá (el bucket es público pero el URL es unguessable sin
--   la metadata).
--
-- Descomentar y ejecutar con GO explícito del PO desde Supabase Studio
-- SQL Editor (rol postgres). Retorna las filas que se van a borrar
-- (RETURNING) — verificar el count antes de commit.
--
-- WITH refs AS (
--     SELECT foto_perfil AS url FROM proveedores WHERE foto_perfil IS NOT NULL
--     UNION ALL
--     SELECT foto_carnet FROM proveedores WHERE foto_carnet IS NOT NULL
--     UNION ALL
--     SELECT foto_carnet_dorso FROM proveedores WHERE foto_carnet_dorso IS NOT NULL
--     UNION ALL
--     SELECT unnest(galeria) FROM proveedores WHERE galeria IS NOT NULL AND array_length(galeria, 1) > 0
--     UNION ALL
--     SELECT foto_mascota FROM mascotas WHERE foto_mascota IS NOT NULL
--     UNION ALL
--     SELECT unnest(fotos) FROM servicios_publicados WHERE fotos IS NOT NULL AND array_length(fotos, 1) > 0
-- )
-- DELETE FROM storage.objects o
--  WHERE o.bucket_id = 'avatars'
--    AND NOT EXISTS (SELECT 1 FROM refs WHERE refs.url LIKE '%' || o.name || '%')
-- RETURNING name, created_at, metadata->>'size' AS size_bytes;
