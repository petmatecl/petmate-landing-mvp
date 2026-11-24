# Acta P5 · EVENTOS MVP · schema + RLS + bucket (PR 1 del sprint)

Written for: el PO (Aldo). Acta de entrega del PR 1 del sprint EVENTOS MVP.

## Scope

Primera migration del sprint EVENTOS MVP — infraestructura BD + storage:

1. Tabla `public.eventos` (22 columnas, SOFT delete via `deleted_at`, `publicado boolean`).
2. 3 índices (PK + `eventos_publicado_fecha_idx` filtered + `eventos_comuna_idx` filtered).
3. RLS enabled + 2 policies (`eventos_public_read` para anon/authenticated filtrado por `publicado=true AND deleted_at IS NULL`; `eventos_admin_write` ALL con `is_admin()`).
4. GRANTs: `SELECT` a anon+authenticated; `INSERT/UPDATE/DELETE` a authenticated.
5. Storage bucket `eventos-imagenes` (public, 2MB max, JPEG/PNG/WebP).
6. 3 storage policies (read público + write/delete admin).

Zero UI, zero código Next.js. Solo infra BD. UI viene en PRs 2-4 del sprint.

## Pre-verificación en staging (2026-11-24 PM)

Antes de entregar a prod, el DDL completo se aplicó en Supabase staging (proyecto `jmtadvdkicyylcwjcmcl`) via MCP `supabase-staging-rw`. Verificación de pre-condiciones:

| Pre-condición | Esperado | Resultado staging |
|---|---|---|
| `public.is_admin()` existe | sí | ✓ (`proname='is_admin'`) |
| `public.eventos` NO existe | sí | ✓ (null) |
| Bucket `eventos-imagenes` NO existe | sí | ✓ (null) |

Verificación post-apply (7/7 ✓):

| Check | Esperado | Resultado staging |
|---|---|---|
| `eventos_rows` | 0 | 0 ✓ |
| `eventos_policies` | 2 | 2 ✓ |
| `eventos_indexes` (incluye PK) | 3 | 3 ✓ |
| `storage.buckets.id='eventos-imagenes'` | existe | existe ✓ |
| `bucket.file_size_limit` | 2097152 (2 MB) | 2097152 ✓ |
| `storage_policies` eventos_imagenes_* | 3 | 3 ✓ |
| `grantees` tabla eventos | `{anon,authenticated,postgres}` | matched ✓ |

## Instrucciones para apply en prod

**Ejecutor**: el PO (Aldo). **Yo (auditor) NO ejecuto DDL contra prod** (regla operativa — ver CLAUDE.md § Workflow MCPs).

**Via Supabase Studio prod** (proyecto `ouezpeeiwjwawauidrqq`):

1. Abrir `https://supabase.com/dashboard/project/ouezpeeiwjwawauidrqq/sql/new`.
2. Pegar el contenido de [migrations/20261124_eventos_mvp.sql](../../migrations/20261124_eventos_mvp.sql) (archivo completo).
3. Click **Run**.
4. Esperar mensaje de éxito ("Success. No rows returned").
5. Ejecutar query de verificación (ver Sección 7 del .sql — bloque de comentario):

```sql
SELECT
  (SELECT COUNT(*) FROM public.eventos) AS eventos_rows,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'eventos' AND schemaname = 'public') AS eventos_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'eventos' AND schemaname = 'public') AS eventos_indexes,
  (SELECT id FROM storage.buckets WHERE id = 'eventos-imagenes') AS bucket_id,
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'eventos-imagenes') AS bucket_limit,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE 'eventos_imagenes%') AS storage_policies;
```

**Esperado en prod**: mismo output que staging (7/7 verde).

## Rollback (si algo falla o se quiere revertir)

Ver Sección 8 del archivo .sql — bloque comentado con el DROP en orden inverso. Prerequisito: tabla sin filas de usuario (si hay eventos creados, migrar/exportar primero).

## Dependencia con PR 2-4 del sprint

PR 2 (admin CRUD) no puede abrirse hasta que la migration esté aplicada en prod. El código TypeScript del admin UI depende de que la tabla + bucket existan. Flujo:

1. Mergeo PR 1 (este, docs+migration SQL).
2. PO ejecuta la migration en Supabase Studio prod cuando esté listo.
3. PO me reporta "migration aplicada en prod, verificación 7/7 verde".
4. Yo arranco PR 2 con confianza de que la BD está al día.

## Trazabilidad

- Spec del sprint: [docs/sprints/eventos-mvp-plan.md](eventos-mvp-plan.md).
- Issue origen: [#164 EVENTOS MVP](https://github.com/petmatecl/petmate-landing-mvp/issues/164).
- Respuestas Q1-Q8 del PO: [comment en issue #164](https://github.com/petmatecl/petmate-landing-mvp/issues/164#issuecomment-7138212363).
- Pre-verificación staging: aplicada 2026-11-24 PM con MCP `supabase-staging-rw` (usuario `postgres`).

## Trigger próximo paso

PO reporta "migration prod aplicada ✓" → arranco PR 2 `eventos-mvp-2-admin` (admin CRUD).
