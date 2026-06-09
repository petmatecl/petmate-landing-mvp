-- ============================================================================
-- Sprint D — Favoritos polimórficos (servicios + proveedores)
-- ============================================================================
-- DESTRUCTIVO: drop de la tabla legacy `favoritos` (0 filas, confirmado).
-- Crea tabla nueva polimórfica con UNIQUE(user_id, entidad_tipo, entidad_id).
-- Contador favoritos_total denormalizado en servicios_publicados y proveedores
-- vía trigger en INSERT/DELETE.
-- RLS: cada user lee/escribe solo sus propios favoritos. Admin SELECT all.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Drop tabla legacy
-- ──────────────────────────────────────────────────────────────────────────
-- CASCADE para arrastrar policies, indexes y cualquier dependencia interna.
-- Estaba vacía (verificado: 0 filas) — sin pérdida de datos.
DROP TABLE IF EXISTS public.favoritos CASCADE;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Tabla polimórfica nueva
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE favoritos (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entidad_tipo  TEXT         NOT NULL CHECK (entidad_tipo IN ('servicio', 'proveedor')),
    entidad_id    UUID         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, entidad_tipo, entidad_id)
);

CREATE INDEX idx_favoritos_user_id    ON favoritos(user_id);
CREATE INDEX idx_favoritos_entidad    ON favoritos(entidad_tipo, entidad_id);
CREATE INDEX idx_favoritos_created_at ON favoritos(created_at DESC);

COMMENT ON TABLE favoritos IS
    'Sprint D — Feature favoritos polimórficos. Cada fila = (user_id, entidad_tipo, entidad_id). '
    'UNIQUE constraint evita duplicados. favoritos_total denormalizado en servicios_publicados '
    'y proveedores vía trigger. RLS: cada user lee/escribe SOLO sus propios favoritos.';

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Columnas denormalizadas favoritos_total
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE servicios_publicados
    ADD COLUMN IF NOT EXISTS favoritos_total INTEGER NOT NULL DEFAULT 0;

ALTER TABLE proveedores
    ADD COLUMN IF NOT EXISTS favoritos_total INTEGER NOT NULL DEFAULT 0;

-- CHECK constraints idempotentes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'servicios_publicados_favoritos_total_check'
    ) THEN
        ALTER TABLE servicios_publicados
            ADD CONSTRAINT servicios_publicados_favoritos_total_check
            CHECK (favoritos_total >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'proveedores_favoritos_total_check'
    ) THEN
        ALTER TABLE proveedores
            ADD CONSTRAINT proveedores_favoritos_total_check
            CHECK (favoritos_total >= 0);
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Trigger que mantiene favoritos_total sincronizado
-- ──────────────────────────────────────────────────────────────────────────
-- AFTER INSERT/DELETE → +1 / -1 en la entidad correspondiente.
-- GREATEST(_, 0) defensivo contra desincronización.
-- search_path locked por SECURITY DEFINER best practice.
--
-- ⚠️ El trigger trg_proveedor_perfil_completo (Sprint F 5/6) ya está
-- optimizado a UPDATE OF (9 cols del rubric) que NO incluye favoritos_total
-- → el UPDATE de favoritos no dispara recálculo innecesario.
CREATE OR REPLACE FUNCTION trg_favoritos_actualizar_contador()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.entidad_tipo = 'servicio' THEN
            UPDATE servicios_publicados
               SET favoritos_total = favoritos_total + 1
             WHERE id = NEW.entidad_id;
        ELSIF NEW.entidad_tipo = 'proveedor' THEN
            UPDATE proveedores
               SET favoritos_total = favoritos_total + 1
             WHERE id = NEW.entidad_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.entidad_tipo = 'servicio' THEN
            UPDATE servicios_publicados
               SET favoritos_total = GREATEST(favoritos_total - 1, 0)
             WHERE id = OLD.entidad_id;
        ELSIF OLD.entidad_tipo = 'proveedor' THEN
            UPDATE proveedores
               SET favoritos_total = GREATEST(favoritos_total - 1, 0)
             WHERE id = OLD.entidad_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_favoritos_contador ON favoritos;
CREATE TRIGGER trg_favoritos_contador
AFTER INSERT OR DELETE ON favoritos
FOR EACH ROW EXECUTE FUNCTION trg_favoritos_actualizar_contador();

-- ──────────────────────────────────────────────────────────────────────────
-- 5. RLS
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favoritos_select_own ON favoritos;
CREATE POLICY favoritos_select_own ON favoritos
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS favoritos_insert_own ON favoritos;
CREATE POLICY favoritos_insert_own ON favoritos
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS favoritos_delete_own ON favoritos;
CREATE POLICY favoritos_delete_own ON favoritos
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS favoritos_select_admin ON favoritos;
CREATE POLICY favoritos_select_admin ON favoritos
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 6. buscar_servicios v3: agregar favoritos_total al RETURNS TABLE
-- ──────────────────────────────────────────────────────────────────────────
-- Patch quirúrgico vs Sprint F v2 (30 cols):
--   · +1 al RETURNS TABLE: favoritos_total integer
--   · +1 al WITH base SELECT: s.favoritos_total
--   · +1 al SELECT final: b.favoritos_total
-- Resto IDÉNTICO. DROP necesario porque cambia el shape.
DROP FUNCTION IF EXISTS public.buscar_servicios(
    text, text[], text, integer, integer, text, numeric, numeric, text, text
);

CREATE OR REPLACE FUNCTION public.buscar_servicios(
    p_categoria_slug text DEFAULT NULL::text,
    p_categorias     text[] DEFAULT NULL::text[],
    p_comuna         text DEFAULT NULL::text,
    p_limit          integer DEFAULT 12,
    p_offset         integer DEFAULT 0,
    p_mascota        text DEFAULT 'any'::text,
    p_precio_min     numeric DEFAULT NULL::numeric,
    p_precio_max     numeric DEFAULT NULL::numeric,
    p_orden          text DEFAULT 'relevancia'::text,
    p_texto          text DEFAULT NULL::text
)
RETURNS TABLE(
    servicio_id               uuid,
    titulo                    text,
    descripcion               text,
    precio_desde              integer,
    precio_hasta              integer,
    unidad_precio             text,
    fotos                     text[],
    categoria_nombre          text,
    categoria_slug            text,
    categoria_icono           text,
    proveedor_id              uuid,
    proveedor_nombre          text,
    proveedor_foto            text,
    proveedor_comuna          text,
    destacado                 boolean,
    rating_promedio           numeric,
    total_evaluaciones        bigint,
    acepta_perros             boolean,
    acepta_gatos              boolean,
    acepta_otras              boolean,
    proveedor_updated_at      timestamp with time zone,
    comunas_cobertura         text[],
    detalles                  jsonb,
    total_count               bigint,
    proveedor_verificado      boolean,
    proveedor_primera_ayuda   boolean,
    proveedor_perfil_completo boolean,
    proveedor_es_ejemplo      boolean,
    visitas_total             integer,
    visitas_mes               integer,
    favoritos_total           integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH base AS (
        SELECT
            s.id              AS servicio_id,
            s.titulo,
            s.descripcion,
            s.precio_desde::integer,
            s.precio_hasta::integer,
            s.unidad_precio,
            s.fotos,
            c.nombre          AS categoria_nombre,
            c.slug            AS categoria_slug,
            c.icono           AS categoria_icono,
            p.id              AS proveedor_id,
            COALESCE(p.nombre_publico, p.nombre || ' ' || p.apellido_p) AS proveedor_nombre,
            p.foto_perfil     AS proveedor_foto,
            p.comuna          AS proveedor_comuna,
            s.destacado,
            COALESCE(AVG(e.rating), 0)::numeric AS rating_promedio,
            COUNT(e.id)                          AS total_evaluaciones,
            s.acepta_perros,
            s.acepta_gatos,
            s.acepta_otras,
            p.updated_at      AS proveedor_updated_at,
            s.comunas_cobertura,
            s.detalles,
            COALESCE(p.rut_verificado, false)  AS proveedor_verificado,
            COALESCE(p.primera_ayuda, false)   AS proveedor_primera_ayuda,
            COALESCE(p.perfil_completo, false) AS proveedor_perfil_completo,
            COALESCE(p.es_ejemplo, false)      AS proveedor_es_ejemplo,
            s.visitas_total,
            s.visitas_mes,
            s.favoritos_total
        FROM servicios_publicados s
        JOIN categorias_servicio c ON c.id = s.categoria_id
        JOIN proveedores p         ON p.id = s.proveedor_id
        LEFT JOIN evaluaciones e   ON e.servicio_id = s.id AND e.estado = 'aprobado'
        WHERE
            s.activo = true
            AND p.estado = 'aprobado'
            AND (
                p_categorias IS NOT NULL AND c.slug = ANY(p_categorias)
                OR p_categorias IS NULL AND (p_categoria_slug IS NULL OR c.slug = p_categoria_slug)
            )
            AND (
                p_comuna IS NULL OR p_comuna = ''
                OR lower(p.comuna) = lower(p_comuna)
                OR lower(p_comuna) = ANY(SELECT lower(x) FROM unnest(s.comunas_cobertura) AS x)
            )
            AND (p_mascota IS NULL OR p_mascota = 'any'
                OR (p_mascota = 'perro' AND s.acepta_perros = true)
                OR (p_mascota = 'gato'  AND s.acepta_gatos  = true)
                OR (p_mascota = 'otro'  AND s.acepta_otras  = true)
            )
            AND (p_precio_min IS NULL OR s.precio_desde >= p_precio_min)
            AND (p_precio_max IS NULL OR s.precio_hasta <= p_precio_max)
            AND (
                p_texto IS NULL
                OR s.titulo ILIKE '%' || p_texto || '%'
                OR s.descripcion ILIKE '%' || p_texto || '%'
                OR p.nombre ILIKE '%' || p_texto || '%'
                OR p.nombre_publico ILIKE '%' || p_texto || '%'
                OR p.apellido_p ILIKE '%' || p_texto || '%'
            )
        GROUP BY s.id, c.id, p.id
    )
    SELECT
        b.servicio_id, b.titulo, b.descripcion, b.precio_desde, b.precio_hasta,
        b.unidad_precio, b.fotos, b.categoria_nombre, b.categoria_slug, b.categoria_icono,
        b.proveedor_id, b.proveedor_nombre, b.proveedor_foto, b.proveedor_comuna,
        b.destacado, b.rating_promedio, b.total_evaluaciones,
        b.acepta_perros, b.acepta_gatos, b.acepta_otras,
        b.proveedor_updated_at, b.comunas_cobertura, b.detalles,
        COUNT(*) OVER()::bigint AS total_count,
        b.proveedor_verificado, b.proveedor_primera_ayuda,
        b.proveedor_perfil_completo, b.proveedor_es_ejemplo,
        b.visitas_total, b.visitas_mes, b.favoritos_total
    FROM base b
    ORDER BY
        CASE WHEN p_orden = 'rating'      THEN b.rating_promedio END DESC NULLS LAST,
        CASE WHEN p_orden = 'precio_asc'  THEN b.precio_desde::numeric END ASC  NULLS LAST,
        CASE WHEN p_orden = 'precio_desc' THEN b.precio_desde::numeric END DESC NULLS LAST,
        b.destacado DESC,
        b.rating_promedio DESC,
        b.total_evaluaciones DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$function$;
