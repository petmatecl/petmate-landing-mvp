-- ============================================================================
-- migrations/20260722_cleanup_prueba_f2_staging.sql
--
-- LIMPIEZA PUNTUAL — STAGING ONLY (jmtadvdkicyylcwjcmcl).
--
-- Contexto: durante el smoke de F2-2A en staging, el servicio 'prueba f2'
-- (id 8bfe8675-d3b5-4a47-96b1-83954ca5ece7, categoria 'cuidado') quedo
-- contaminado con estado del dominio F1: `duracion_slot_min` populado + 1
-- franja en `disponibilidad_semanal`. Esto fue posible porque el bug de
-- gating de handleSubmit permitia activar F1 en una categoria que la UI
-- ya no renderizaba (state stale tras cambio de dropdown). Aldo lo
-- reprodujo ex-post como workaround del toast bloqueante.
--
-- El fix del commit paralelo (gates por dominio + reset simetrico en
-- ServiceFormModal) previene que se repita, pero NO limpia lo que quedo.
-- Este script lo hace, transaccional y verificable.
--
-- IDEMPOTENTE: los UPDATE/DELETE con WHERE id/servicio_id son no-op si ya
-- se corrieron. Los SELECT devuelven el estado actual en cualquier caso.
--
-- APLICAR: staging (jmtadvdkicyylcwjcmcl) manualmente. Prod NO — el
-- servicio no existe alli.
-- ============================================================================

BEGIN;

-- V1: estado antes del cleanup
SELECT
    id,
    titulo,
    duracion_slot_min,
    capacidad_slot,
    capacidad_estadia,
    anticipacion_min_dias,
    min_noches,
    max_noches
  FROM public.servicios_publicados
 WHERE id = '8bfe8675-d3b5-4a47-96b1-83954ca5ece7';
-- Esperado antes: duracion_slot_min NOT NULL (contaminacion F1) +
-- capacidad_estadia NOT NULL (F2 legitimo).

SELECT id, dia_semana, hora_desde, hora_hasta
  FROM public.disponibilidad_semanal
 WHERE servicio_id = '8bfe8675-d3b5-4a47-96b1-83954ca5ece7'
 ORDER BY dia_semana, hora_desde;
-- Esperado antes: >=1 fila (franja(s) F1 fantasmas en cuidado).

-- V2: excepciones futuras — safety check (F2-2A no permite editarlas para
-- cuidado, pero si el bug las dejo, las listamos para decidir cleanup).
SELECT id, fecha, hora_desde, hora_hasta, motivo
  FROM public.excepciones_disponibilidad
 WHERE servicio_id = '8bfe8675-d3b5-4a47-96b1-83954ca5ece7'
   AND fecha >= CURRENT_DATE
 ORDER BY fecha, hora_desde NULLS FIRST;
-- Esperado antes: 0 filas (Aldo no toco excepciones en el smoke). Si hay
-- filas, decidir case-by-case antes de commit — NO se borran automatico.

-- --- Cleanup ----------------------------------------------------------------

-- (a) Apagar F1 en el servicio: duracion_slot_min a NULL. Las otras 3
-- columnas F1 (capacidad_slot, anticipacion_min_horas, anticipacion_max_dias)
-- se dejan con sus valores actuales — son inertes cuando duracion es NULL
-- y mantenerlas evita reset innecesario (mismo criterio que usa el editor
-- para el toggle opt-out).
UPDATE public.servicios_publicados
   SET duracion_slot_min = NULL
 WHERE id = '8bfe8675-d3b5-4a47-96b1-83954ca5ece7'
   AND duracion_slot_min IS NOT NULL;
-- Esperado: UPDATE 1 (o 0 si ya se corrio).

-- (b) Borrar franjas F1 fantasmas
DELETE FROM public.disponibilidad_semanal
 WHERE servicio_id = '8bfe8675-d3b5-4a47-96b1-83954ca5ece7';
-- Esperado: DELETE >=1 (o 0 si ya se corrio).

-- --- Verificacion post-cleanup ---------------------------------------------

-- V3: servicio limpio de F1, F2 intacto
SELECT
    id,
    titulo,
    duracion_slot_min,
    capacidad_estadia,
    anticipacion_min_dias,
    min_noches,
    max_noches
  FROM public.servicios_publicados
 WHERE id = '8bfe8675-d3b5-4a47-96b1-83954ca5ece7';
-- Esperado: duracion_slot_min IS NULL. capacidad_estadia + config F2
-- preservados (los valores que Aldo dejo en el ultimo guardado F2 valido).

-- V4: cero franjas
SELECT count(*) AS franjas_restantes
  FROM public.disponibilidad_semanal
 WHERE servicio_id = '8bfe8675-d3b5-4a47-96b1-83954ca5ece7';
-- Esperado: 0.

-- --- Commit condicional ----------------------------------------------------

-- Si V3 + V4 se ven bien:
COMMIT;

-- Si algo se ve raro (ej. capacidad_estadia se movio a NULL, o V2 mostro
-- excepciones que hay que evaluar antes):
-- ROLLBACK;
