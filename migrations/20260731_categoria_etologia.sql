-- ============================================================================
-- migrations/20260731_categoria_etologia.sql
--
-- SPRINT PRODUCTO-1 PR2 — categoría "Etología y conducta" (decisión PO
-- opción C, 2026-07-31). Servicio profesional distinto de Adiestramiento:
-- foco en diagnóstico y modificación de problemas conductuales (agresividad,
-- ansiedad, miedos), típicamente con derivación veterinaria coordinada.
--
-- CAMBIO ADITIVO: INSERT 1 fila en `categorias_servicio`. Cero DDL.
--
-- SCHEMA VERIFICADO vía MCP staging (regla P6, 2026-07-31):
--   id           uuid NOT NULL default gen_random_uuid()
--   nombre       text NOT NULL
--   slug         text NOT NULL          (UNIQUE constraint → ON CONFLICT ok)
--   icono        text NULLABLE
--   descripcion  text NULLABLE
--   activa       boolean default true
--   orden        integer default 0
--   created_at   timestamptz default now()
--
--   Constraints: categorias_servicio_pkey (id), categorias_servicio_slug_key
--   (slug UNIQUE).
--
-- ICONO: emoji 🧠 (brain). Coherente con la mayoría de categorías que usan
-- emoji (🎓 adiestramiento, 🏠 cuidado, 🦮 paseos, ✂️ peluquería, 🩺
-- veterinario, ☀️ guardería, 🚗 traslado); `fotografia` (camera) y
-- `retratos` (palette) usan slugs lucide, minoría — mantenemos consistencia
-- con la mayoría emoji.
--
-- ORDEN: 45 (entre `cuidado` que es prioritario y las categorías
-- profesionales). El valor no compite con los defaults 0 existentes; los
-- consumers que usan `orden` para ranking van a colocar Etología en la
-- posición pedida sin recalcular todo el set.
--
-- IDEMPOTENTE: `ON CONFLICT (slug) DO NOTHING` — re-correr en un ambiente
-- que ya tenga la categoría es no-op sin fallar.
-- TRANSACCIONAL: BEGIN/COMMIT explícito (Caveat B).
-- ============================================================================

BEGIN;

INSERT INTO public.categorias_servicio (nombre, slug, icono, descripcion, activa, orden)
VALUES (
    'Etología y Conducta',
    'etologia',
    '🧠',
    'Evaluación y tratamiento de problemas conductuales (agresividad, ansiedad, miedos, conductas compulsivas). Diagnóstico especializado y planes de modificación de conducta.',
    true,
    45
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICACIONES (correr como statements separados post-commit)
-- ============================================================================

-- V1: la categoría existe con los campos esperados
--   SELECT id, slug, nombre, icono, activa, orden
--     FROM categorias_servicio
--    WHERE slug = 'etologia';
--   Esperado: 1 fila con slug='etologia', nombre='Etología y Conducta',
--   icono='🧠', activa=true, orden=45.

-- V2: el RPC buscar_servicios ya la reconoce (filtro por categoría)
--   SELECT count(*) AS total
--     FROM buscar_servicios(p_categoria_slug := 'etologia', p_limit := 50);
--   Esperado: 0 (aún no hay servicios de etología en staging; el RPC no
--   revienta y responde con listado vacío).

-- V3: idempotencia — re-ejecutar la migration no crea duplicado
--   SELECT count(*) FROM categorias_servicio WHERE slug='etologia';
--   Esperado: 1 (siempre, no importa cuántas veces se corra).
-- ============================================================================
