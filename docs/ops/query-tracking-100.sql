-- ═══════════════════════════════════════════════════════════════════════
-- TRACKING-META-100-PROVEEDORES — Opción A (consulta semanal manual)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Pedido PO 2026-11-23. Ítem BACKLOG `TRACKING-META-100-PROVEEDORES`
-- sección "Herramientas admin — pre-campañas". Define el criterio
-- empírico para "cuándo activar campañas Meta" (meta = 100 proveedores
-- activos).
--
-- Uso: el PO abre Supabase Studio prod → SQL Editor → pega este archivo
-- entero → Run. Lo corre cada lunes AM por 30 segundos antes de decidir
-- el plan de la semana.
--
-- Read-only. Zero mutaciones. Safe para prod con rol postgres o
-- supabase_admin.
--
-- Cada sección es una query independiente — puede correrse por partes
-- si Studio prefiere resultado tabular (SELECT ... al final de cada CTE
-- bloque, descomentar el SELECT que interese y comentar el resto).
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Sección 1 — RESUMEN EJECUTIVO (una fila agregada).
-- ─────────────────────────────────────────────────────────────────────
-- `activo` = `estado='aprobado' AND al menos 1 servicio_publicado activo`.
-- Definición del PO: proveedor con oferta real en el catálogo, no cuenta
-- creada sin servicio publicado.
WITH activos AS (
    SELECT p.id, p.nombre, p.apellido_p, p.comuna, p.estado,
           p.created_at AS registrado_en
      FROM public.proveedores p
     WHERE p.estado = 'aprobado'
       AND EXISTS (
         SELECT 1 FROM public.servicios_publicados s
          WHERE s.proveedor_id = p.id AND s.activo = true
       )
),
distrib_cat AS (
    SELECT c.slug, COUNT(DISTINCT s.proveedor_id) AS proveedores
      FROM public.servicios_publicados s
      JOIN public.categorias_servicio c ON c.id = s.categoria_id
      JOIN activos a ON a.id = s.proveedor_id
     WHERE s.activo = true
     GROUP BY c.slug
     ORDER BY proveedores DESC
),
distrib_com AS (
    SELECT a.comuna, COUNT(*) AS proveedores
      FROM activos a
     WHERE a.comuna IS NOT NULL
     GROUP BY a.comuna
     ORDER BY proveedores DESC
)
SELECT
    (SELECT COUNT(*) FROM activos) AS total_activos,
    100 - (SELECT COUNT(*) FROM activos) AS faltan_para_meta,
    ROUND((SELECT COUNT(*)::numeric FROM activos) / 100.0 * 100, 1) || '%' AS avance,
    (SELECT COUNT(*) FROM activos WHERE registrado_en >= now() - interval '7 days') AS nuevos_7d,
    (SELECT COUNT(*) FROM activos
      WHERE registrado_en >= now() - interval '14 days'
        AND registrado_en < now() - interval '7 days') AS nuevos_7d_prev,
    (SELECT MAX(registrado_en) FROM activos) AS ultimo_registro,
    (SELECT jsonb_object_agg(slug, proveedores) FROM distrib_cat) AS por_categoria,
    (SELECT jsonb_object_agg(comuna, proveedores) FROM distrib_com) AS por_comuna;

-- ─────────────────────────────────────────────────────────────────────
-- Sección 2 — DISTRIBUCIÓN POR CATEGORÍA (para detectar saturación o gaps).
-- ─────────────────────────────────────────────────────────────────────
-- Un proveedor puede aparecer en varias categorías si tiene múltiples
-- servicios. La suma de la columna puede exceder el total_activos.
SELECT c.slug AS categoria,
       c.nombre AS categoria_nombre,
       COUNT(DISTINCT s.proveedor_id) AS proveedores_con_oferta,
       COUNT(*) AS servicios_activos
  FROM public.servicios_publicados s
  JOIN public.categorias_servicio c ON c.id = s.categoria_id
  JOIN public.proveedores p ON p.id = s.proveedor_id
 WHERE s.activo = true
   AND p.estado = 'aprobado'
 GROUP BY c.slug, c.nombre
 ORDER BY proveedores_con_oferta DESC, servicios_activos DESC;

-- ─────────────────────────────────────────────────────────────────────
-- Sección 3 — DISTRIBUCIÓN POR COMUNA (cobertura geográfica).
-- ─────────────────────────────────────────────────────────────────────
-- `comuna` es del campo del proveedor (ubicación base), no de
-- `comunas_cobertura` del servicio (zona de operación). Para catálogo
-- geográfico más amplio, considerar `comunas_cobertura` en un reporte
-- futuro.
SELECT COALESCE(p.comuna, '(sin comuna)') AS comuna,
       COUNT(*) AS proveedores
  FROM public.proveedores p
 WHERE p.estado = 'aprobado'
   AND EXISTS (
     SELECT 1 FROM public.servicios_publicados s
      WHERE s.proveedor_id = p.id AND s.activo = true
   )
 GROUP BY p.comuna
 ORDER BY proveedores DESC, comuna NULLS LAST;

-- ─────────────────────────────────────────────────────────────────────
-- Sección 4 — TENDENCIA DE ALTAS ACTIVAS (últimos 4 períodos de 7 días).
-- ─────────────────────────────────────────────────────────────────────
-- Para detectar aceleración o estancamiento del crecimiento. Una
-- aceleración consistente ≥3 semanas da señal de que es un buen momento
-- para destinar CAC adicional.
WITH activos AS (
    SELECT p.id, p.created_at AS registrado_en
      FROM public.proveedores p
     WHERE p.estado = 'aprobado'
       AND EXISTS (
         SELECT 1 FROM public.servicios_publicados s
          WHERE s.proveedor_id = p.id AND s.activo = true
       )
)
SELECT '0-7 días'  AS periodo,
       COUNT(*) AS nuevos_proveedores_activos
  FROM activos WHERE registrado_en >= now() - interval '7 days'
UNION ALL
SELECT '7-14 días',
       COUNT(*)
  FROM activos
 WHERE registrado_en >= now() - interval '14 days'
   AND registrado_en < now() - interval '7 days'
UNION ALL
SELECT '14-21 días',
       COUNT(*)
  FROM activos
 WHERE registrado_en >= now() - interval '21 days'
   AND registrado_en < now() - interval '14 days'
UNION ALL
SELECT '21-28 días',
       COUNT(*)
  FROM activos
 WHERE registrado_en >= now() - interval '28 days'
   AND registrado_en < now() - interval '21 days';

-- ─────────────────────────────────────────────────────────────────────
-- Sección 5 — LISTA DE PROVEEDORES ACTIVOS (detalle visual).
-- ─────────────────────────────────────────────────────────────────────
-- Para revisar quiénes están activos (nombre_publico cuando existe +
-- comuna + cantidad de servicios). Útil para onboarding seguimiento o
-- para detectar perfiles incompletos entre los activos.
SELECT COALESCE(p.nombre_publico, p.nombre || ' ' || COALESCE(p.apellido_p, '')) AS mostrar_como,
       p.comuna,
       p.created_at::date AS registrado,
       p.verificacion_estado,
       (SELECT COUNT(*) FROM public.servicios_publicados s
         WHERE s.proveedor_id = p.id AND s.activo = true) AS servicios_activos
  FROM public.proveedores p
 WHERE p.estado = 'aprobado'
   AND EXISTS (
     SELECT 1 FROM public.servicios_publicados s
      WHERE s.proveedor_id = p.id AND s.activo = true
   )
 ORDER BY p.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- Interpretación esperada:
--
-- - total_activos → el número que se compara contra 100.
-- - faltan_para_meta → gap directo.
-- - nuevos_7d vs nuevos_7d_prev → tendencia semana vs semana anterior.
--   Si nuevos_7d >= nuevos_7d_prev × 1.5 por 2+ semanas seguidas, señal
--   de aceleración orgánica.
-- - por_categoria → detectar saturación (si una categoría ya tiene >50%
--   del total activo, diversificar la captación).
-- - por_comuna → detectar cobertura (si >70% están en Providencia/Las
--   Condes/Vitacura, campañas pagadas segmentadas por comuna más grande
--   cuestan menos CAC).
-- - tendencia 4 períodos → forma de la curva (plana, creciente,
--   decreciente, oscilante).
--
-- Baseline del PO (2026-11-23, prototipo verificado):
-- total_activos=12, faltan=88, nuevos_7d=1, nuevos_7d_prev=1,
-- paseos=8 proveedores (67% del total), cuidado=7, el resto <=2.
-- Concentración en 2 categorías (paseos + cuidado = 15 overlap potencial).
-- Cobertura geográfica a verificar en Sección 3 cuando corra la primera
-- ejecución del PO.
-- ═══════════════════════════════════════════════════════════════════════
