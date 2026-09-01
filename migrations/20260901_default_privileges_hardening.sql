-- migrations/20260901_default_privileges_hardening.sql
--
-- Sprint default-privs — Sección A (revoke defaults schema public para
-- grantor postgres) + Sección B (limpieza 13 trigger functions que heredaron
-- EXECUTE anon/authenticated/PUBLIC sin necesitarlo).
--
-- ============================================================================
-- MOTIVACIÓN
-- ============================================================================
-- Supabase configura por defecto en el schema `public` un `pg_default_acl`
-- que otorga automáticamente:
--   * TABLAS: SELECT/INSERT/UPDATE/DELETE a anon, authenticated, service_role
--   * SECUENCIAS: USAGE/SELECT a anon, authenticated, service_role
--   * FUNCIONES: EXECUTE a anon, authenticated, service_role, PUBLIC
--
-- Es config de fábrica documentada oficialmente por Supabase, que ellos
-- mismos están migrando a "opt-in" para proyectos nuevos. Este archivo
-- aplica la migración manual a nuestro proyecto (pre-cambio de plataforma).
--
-- Nos mordió dos veces:
--   - Sprint admin-visibilidad (2026-08-27): RPC nuevo heredó EXECUTE anon.
--   - Sprint notifs-panel F2B (2026-08-28): trigger notify_proveedor_new_eval
--     heredó EXECUTE anon/authenticated.
-- Cada migration nueva requería 3 REVOKE manuales (PUBLIC + anon + authenticated).
-- El fix estructural es sacar los defaults — cada RPC/tabla nueva expuesta al
-- Data API requerirá GRANT explícito, visible en PR review.
--
-- Referencia oficial:
--   https://supabase.com/docs/guides/database/hardening-data-api
--
-- ============================================================================
-- RIESGO RESIDUAL CONOCIDO (leer antes de aplicar)
-- ============================================================================
-- La entrada `grantor=supabase_admin` en `pg_default_acl` NO se toca. Supabase
-- la mantiene por diseño (racional oficial: "supabase_admin can't authenticate
-- through the Data API"). Consecuencia práctica: si alguien crea una tabla
-- desde el Table Editor del dashboard, esa tabla se crea internamente como
-- supabase_admin y heredaría automáticamente los grants a anon/authenticated
-- de la entrada supabase_admin que sigue viva.
--
-- Regla operativa que se ancla en CLAUDE.md como parte de este sprint:
-- CERO uso del Table Editor del dashboard para crear tablas, funciones o
-- secuencias en `public`. Toda estructura nueva pasa por migration SQL
-- versionada en `migrations/*.sql` ejecutada como `postgres` desde el SQL
-- Editor. Sin esa disciplina, el revoke de la entrada `postgres` no cubre.
--
-- Verificación empírica de la hipótesis Table Editor está incluida en el
-- smoke del sprint (fase 3d — el PO crea una tabla desde el dashboard y se
-- verifica sus grants). Si sale que Table Editor NO hereda, la regla sobra.
--
-- ============================================================================
-- EJECUCIÓN
-- ============================================================================
-- SQL Editor de Supabase Studio, rol `postgres` default. Un único click de
-- Run — el bloque BEGIN/COMMIT hace la migration atómica (entra entera o
-- no entra, sin estados intermedios).
--
-- Orden staging → prod tras smoke verde. Ver ACTA_DEFAULT_PRIVS.md para
-- la matriz completa de aplicación con outputs pegados por fase (regla P2).

BEGIN;

-- ============================================================================
-- SECCIÓN A — Revoke default privileges (grantor=postgres) en schema public
-- ============================================================================

-- Tablas: revocar CRUD
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES
    FROM anon, authenticated, service_role;

-- Funciones: revocar EXECUTE de roles Data API
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS
    FROM anon, authenticated, service_role;

-- Secuencias: revocar USAGE/SELECT
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE USAGE, SELECT ON SEQUENCES
    FROM anon, authenticated, service_role;

-- Funciones: revocar EXECUTE del grupo virtual PUBLIC
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ============================================================================
-- SECCIÓN B — Limpieza de 13 trigger functions con EXECUTE anon residual
-- ============================================================================
-- Todas retornan `trigger` (verificado con pg_get_function_identity_arguments
-- = "" y prorettype = trigger). Trigger functions se disparan por el
-- mecanismo interno de PostgreSQL, no requieren grant EXECUTE al rol del
-- cliente. La 14ª (`notify_proveedor_new_eval`) ya tiene REVOKE aplicado
-- desde F2B del sprint notifs-panel — no aparece acá.
--
-- REVOKE idempotente: correr esta migration dos veces es no-op sin error.

REVOKE EXECUTE ON FUNCTION public.actualizar_rating_servicio()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.certificaciones_guard_fn()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.evaluaciones_guard_fn()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proveedores_guard_fn()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.servicios_publicados_guard_fn()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_favoritos_actualizar_contador()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_servicio_recalcular_completo_proveedor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_respondido_at_on_response()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at_disponibilidad_semanal()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_feedback_submissions_set_updated_at()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_proveedor_recalcular_completo()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_proveedores_updated_at()              FROM PUBLIC, anon, authenticated;

COMMIT;
