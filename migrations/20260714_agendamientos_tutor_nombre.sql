-- ============================================================================
-- migrations/20260714_agendamientos_tutor_nombre.sql
--
-- F1 agenda con disponibilidad real — denormalizacion del nombre del tutor
-- en agendamientos para que el proveedor pueda mostrarlo en su panel.
--
-- Motivo: la RLS de usuarios_buscadores es owner-only. El proveedor no puede
-- leer el nombre via join en la query del panel. Un intento previo de policy
-- cross-role (usuarios_buscadores_proveedor_select_via_agendamientos) causo
-- recursion — las policies de agendamientos.tutor_* consultan
-- usuarios_buscadores dentro de sus USING, y la nueva policy consultaba
-- agendamientos → ciclo detectado por Postgres, query rota entera.
--
-- Patron espejo de evaluaciones.nombre_autor (migration 20260709). El
-- INSERT del cliente puebla la columna desde el buscador logueado (que si
-- puede leer su propia fila via RLS owner-only). Trade-off aceptado: si el
-- tutor cambia su nombre luego, el proveedor ve el nombre viejo en reservas
-- historicas. En el contexto del panel del proveedor es informacion
-- legitima ("con quien reserve aquella vez"), no un bug.
--
-- IDEMPOTENTE. Aplicar en staging (jmtadvdkicyylcwjcmcl), verificar, luego
-- prod (ouezpeeiwjwawauidrqq) en el merge final del roadmap.
-- ============================================================================

-- (1) Columna nueva. NULLABLE — retrocompat con filas historicas y con
-- INSERTs viejos que no la pueblen. El render tiene fallback al join
-- (que devuelve null bajo la RLS actual) y ultimo fallback "Tutor".
ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS tutor_nombre TEXT;

COMMENT ON COLUMN public.agendamientos.tutor_nombre IS
    'Denormalizacion del nombre del tutor al momento del INSERT. Motivo: '
    'RLS de usuarios_buscadores es owner-only — el proveedor no puede leer '
    'via join. Patron espejo de evaluaciones.nombre_autor. Retrocompat: '
    'filas sin poblar caen a "Tutor" en el render.';


-- (2) Backfill de filas existentes. Bypass del guard evaluaciones_guard_fn
-- NO aplica aca (es de evaluaciones), pero usamos el mismo patron
-- session_replication_role = 'replica' por si algun trigger futuro de
-- agendamientos gatilla — proteccion defensiva.
BEGIN;

SET LOCAL session_replication_role = 'replica';

UPDATE public.agendamientos a
   SET tutor_nombre = u.nombre
  FROM public.usuarios_buscadores u
 WHERE a.tutor_id = u.id
   AND a.tutor_nombre IS NULL
   AND u.nombre IS NOT NULL
   AND trim(u.nombre) <> '';

COMMIT;


-- ============================================================================
-- Verificacion (correr como statement separado despues del COMMIT):
--
--   SELECT COUNT(*) FILTER (WHERE tutor_nombre IS NULL) AS sin_nombre,
--          COUNT(*) FILTER (WHERE tutor_nombre IS NOT NULL) AS con_nombre,
--          COUNT(*) AS total
--     FROM public.agendamientos;
--
-- Esperado: `sin_nombre` = filas donde el tutor_id apunta a un buscador
-- eliminado o con nombre vacio (deberia ser 0 o marginal). `con_nombre` +
-- `sin_nombre` = `total`.
-- ============================================================================
