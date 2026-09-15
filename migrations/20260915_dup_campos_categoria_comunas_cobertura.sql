-- Sprint E Bloque UX · DUP-CAMPOS-CATEGORIA (2026-09-15)
-- =============================================================================
-- Migra el campo text libre `detalles.comunas_cobertura` (residuo pre-sprint
-- E, que duplicaba la columna estructurada `servicios_publicados.comunas_cobertura`
-- text[]) hacia `detalles.notas` con prefijo "Cobertura declarada: <valor>".
--
-- MOTIVACIÓN:
--   camposPorCategoria.ts declaraba `comunas_cobertura` como campo text libre
--   para las categorías veterinario y traslado. Los proveedores lo llenaban
--   con strings como "Todo Santiago" o "Providencia, Las Condes" a la par
--   del selector de chips que persistía en la columna estructurada. Datos
--   duplicados, incoherencia posible, ficha con la misma info dos veces.
--
--   Sprint E remueve el campo del catálogo (`camposPorCategoria.ts` L211 +
--   L234) — a partir de aterrizado, cero proveedor puede seguir agregando
--   el texto libre. Esta migración reubica los valores legacy ya persistidos
--   en `detalles` a `detalles.notas` con el prefijo canónico, sin perder
--   el trabajo del proveedor. La ficha pública deja de mostrar el texto
--   libre (ServiceDetailView solo renderiza los campos que sigan en
--   camposPorCategoria); las notas siguen apareciendo en su bloque
--   habitual.
--
-- IDEMPOTENCIA:
--   El WHERE filtra por `detalles ? 'comunas_cobertura'`. Post-migración
--   la key se elimina — la segunda corrida matchea 0 filas. Seguro re-run.
--
-- BLAST RADIUS:
--   Solo tabla `servicios_publicados`. No toca schema (cero DDL, la columna
--   text[] estructurada sigue intacta). Cero riesgo de FK cascade.
--
-- POSITIVO CONOCIDO VERIFICADO (P8 antidote):
--   Ejecutado el 2026-09-15 en staging con fixture temporal (traslado
--   dummy con `detalles.comunas_cobertura = "Todo Santiago positivo conocido"`
--   y `detalles.notas = "Notas previas del proveedor."`) via BEGIN/ROLLBACK.
--   Resultado post-UPDATE:
--     aun_dup: false
--     notas_final: "Notas previas del proveedor.\n\nCobertura declarada: Todo Santiago positivo conocido"
--   El mecanismo funciona. Migración cerrada con ROLLBACK — cero cambio
--   persistente en staging (que tenía 0 filas afectadas reales).
-- =============================================================================

UPDATE servicios_publicados sp
   SET detalles = (
       CASE
         WHEN sp.detalles->>'notas' IS NULL OR btrim(sp.detalles->>'notas') = ''
         THEN (sp.detalles - 'comunas_cobertura')
              || jsonb_build_object('notas', 'Cobertura declarada: ' || (sp.detalles->>'comunas_cobertura'))
         ELSE (sp.detalles - 'comunas_cobertura')
              || jsonb_build_object('notas', (sp.detalles->>'notas') || E'\n\nCobertura declarada: ' || (sp.detalles->>'comunas_cobertura'))
       END
   )
 WHERE sp.detalles ? 'comunas_cobertura'
   AND sp.detalles->>'comunas_cobertura' IS NOT NULL
   AND btrim(sp.detalles->>'comunas_cobertura') <> ''
RETURNING id, titulo, detalles->>'notas' AS notas_final;

-- Assertion post-migración: cero servicios con la key `comunas_cobertura`
-- en detalles.
DO $$
DECLARE
    remanente int;
BEGIN
    SELECT COUNT(*) INTO remanente
      FROM servicios_publicados
     WHERE detalles ? 'comunas_cobertura';
    IF remanente > 0 THEN
        RAISE EXCEPTION 'DUP-CAMPOS-CATEGORIA: quedan % filas con detalles.comunas_cobertura después de la migración', remanente;
    END IF;
    RAISE NOTICE 'DUP-CAMPOS-CATEGORIA OK: cero remanente de detalles.comunas_cobertura';
END $$;
