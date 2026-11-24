-- ═══════════════════════════════════════════════════════════════════════
-- EVENTOS MVP — schema + RLS + bucket (sprint eventos-mvp 2026-11-24)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Scope: schema + RLS + storage bucket para feature EVENTOS-MASCOTAS-
-- ECOSISTEMA MVP. Spec en `docs/sprints/eventos-mvp-plan.md`. Respuestas
-- Q1-Q8 del PO en issue #164.
--
-- Pre-verificado en staging (proyecto jmtadvdkicyylcwjcmcl) el 2026-11-24
-- PM — 7/7 checks ✓ (ver `docs/sprints/eventos-schema-sql-acta.md`).
--
-- Dependencias previas:
--   - Función `public.is_admin()` debe existir (verificada ✓).
--   - Schema `auth.users` debe existir (es standard Supabase ✓).
--
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Tabla principal `public.eventos`
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.eventos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos del evento.
    nombre          text NOT NULL,
    fecha           date NOT NULL,
    hora_inicio     time,
    hora_fin        time,
    lugar_nombre    text NOT NULL,
    direccion       text NOT NULL,
    comuna          text NOT NULL,

    -- Organizador.
    organizador_nombre     text NOT NULL,
    organizador_instagram  text,

    -- Entrada.
    entrada_gratuita  boolean NOT NULL DEFAULT false,
    entrada_monto     numeric(10, 0),      -- pesos CLP, null si gratuita.

    -- Taxonomía.
    tipo              text NOT NULL CHECK (tipo IN (
        'feria', 'jornada', 'charla', 'competencia', 'meetup'
    )),

    -- Contenido rico.
    descripcion       text NOT NULL,
    actividades       text[] DEFAULT ARRAY[]::text[],
    imagen_url        text,
    links_referencia  text[] DEFAULT ARRAY[]::text[],

    -- Estado.
    publicado         boolean NOT NULL DEFAULT false,

    -- Audit trail.
    created_at        timestamptz NOT NULL DEFAULT now(),
    created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at        timestamptz   -- SOFT delete; null = vivo.
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Índices
-- ─────────────────────────────────────────────────────────────────────

-- Query canónica listado público: WHERE publicado = true AND deleted_at IS NULL
-- AND fecha >= CURRENT_DATE ORDER BY fecha ASC.
CREATE INDEX IF NOT EXISTS eventos_publicado_fecha_idx
    ON public.eventos (publicado, fecha ASC)
    WHERE deleted_at IS NULL;

-- Query filtro por comuna (si se agrega tab futuro).
CREATE INDEX IF NOT EXISTS eventos_comuna_idx
    ON public.eventos (comuna)
    WHERE deleted_at IS NULL AND publicado = true;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RLS + policies
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- SELECT público anon + authenticated: solo publicados vivos.
CREATE POLICY eventos_public_read ON public.eventos
    FOR SELECT
    USING (publicado = true AND deleted_at IS NULL);

-- INSERT/UPDATE/DELETE: solo admin via `is_admin()`.
CREATE POLICY eventos_admin_write ON public.eventos
    FOR ALL
    USING (is_admin() = true)
    WITH CHECK (is_admin() = true);

-- ─────────────────────────────────────────────────────────────────────
-- 4. GRANTs explícitos (patrón P6.2 — defense-in-depth ante futuros
--    DROP+CREATE que pierdan grants)
-- ─────────────────────────────────────────────────────────────────────

GRANT SELECT ON public.eventos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.eventos TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Storage bucket `eventos-imagenes`
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'eventos-imagenes',
    'eventos-imagenes',
    true,                            -- lectura pública (URLs publicables).
    2097152,                         -- 2 MB en bytes.
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Storage policies
-- ─────────────────────────────────────────────────────────────────────

-- SELECT público anon + authenticated sobre objects del bucket.
CREATE POLICY eventos_imagenes_public_read ON storage.objects
    FOR SELECT
    USING (bucket_id = 'eventos-imagenes');

-- INSERT: solo admin.
CREATE POLICY eventos_imagenes_admin_write ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'eventos-imagenes' AND is_admin() = true);

-- DELETE: solo admin.
CREATE POLICY eventos_imagenes_admin_delete ON storage.objects
    FOR DELETE
    USING (bucket_id = 'eventos-imagenes' AND is_admin() = true);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. Verificación post-apply (query manual — NO parte de la migration)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Ejecutar en SQL Editor tras aplicar la migration:
--
--   SELECT
--     (SELECT COUNT(*) FROM public.eventos) AS eventos_rows,
--     (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'eventos' AND schemaname = 'public') AS eventos_policies,
--     (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'eventos' AND schemaname = 'public') AS eventos_indexes,
--     (SELECT id FROM storage.buckets WHERE id = 'eventos-imagenes') AS bucket_id,
--     (SELECT file_size_limit FROM storage.buckets WHERE id = 'eventos-imagenes') AS bucket_limit,
--     (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE 'eventos_imagenes%') AS storage_policies;
--
-- Esperado: eventos_rows=0, eventos_policies=2, eventos_indexes=3,
--          bucket_id='eventos-imagenes', bucket_limit=2097152, storage_policies=3.

-- ═══════════════════════════════════════════════════════════════════════
-- 8. Rollback (si se necesitara deshacer la migration manualmente)
-- ═══════════════════════════════════════════════════════════════════════
--
-- EJECUTAR EN ORDEN INVERSO + solo si la tabla no tiene filas de usuario:
--
--   -- Storage policies
--   DROP POLICY IF EXISTS eventos_imagenes_admin_delete ON storage.objects;
--   DROP POLICY IF EXISTS eventos_imagenes_admin_write ON storage.objects;
--   DROP POLICY IF EXISTS eventos_imagenes_public_read ON storage.objects;
--
--   -- Storage bucket (solo si no hay objects uploaded)
--   DELETE FROM storage.buckets WHERE id = 'eventos-imagenes';
--
--   -- Table policies + table
--   DROP POLICY IF EXISTS eventos_admin_write ON public.eventos;
--   DROP POLICY IF EXISTS eventos_public_read ON public.eventos;
--   DROP INDEX IF EXISTS public.eventos_comuna_idx;
--   DROP INDEX IF EXISTS public.eventos_publicado_fecha_idx;
--   DROP TABLE IF EXISTS public.eventos;
