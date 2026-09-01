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
-- HIPÓTESIS TABLE EDITOR — REFUTADA POR EVIDENCIA EMPÍRICA
-- ============================================================================
-- La ronda 2 del plan proponía como riesgo residual: "tablas creadas desde
-- el Table Editor del dashboard nacen internamente como supabase_admin y
-- heredan los grants a anon/authenticated de la entrada supabase_admin del
-- pg_default_acl que este sprint NO toca". Esa hipótesis venía de una
-- discusión pública de Supabase de enero 2022 (github.com/orgs/supabase/
-- discussions/4834).
--
-- Verificación empírica staging 2026-09-01 (PO creó tabla desde Table
-- Editor con defaults, sin tocar RLS):
--   creada_por:    postgres        <- NO supabase_admin
--   rls_activo:    true            <- Table Editor lo activa solo
--   anon_select:   false
--   anon_truncate: false
--   auth_select:   false
--   acl_crudo:     {postgres=arwdDxtm/postgres}
--
-- El comportamiento del Table Editor cambió desde 2022 (o nunca aplicó
-- así en este caso). El dashboard crea como `postgres`, entonces cae bajo
-- el mismo pg_default_acl que revocamos en la sección A — herencia bloqueada
-- automáticamente sin regla operativa adicional.
--
-- Consecuencia: la regla "cero Table Editor" que se propuso en ronda 2 NO
-- se aterriza en CLAUDE.md. Habría sido una restricción operativa molesta,
-- permanente, sin fundamento. Anotable en acta como caso: propuesta →
-- prueba antes de escribir → refutada. Mejor resultado posible de haber
-- insistido en verificar.
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
--
-- Cambios aterrizados durante el smoke staging PO 2026-09-01 (ver
-- ACTA_DEFAULT_PRIVS.md § "Smoke ronda 3" para detalle):
--
-- ----------------------------------------------------------------------------
-- (c) MECANISMO — POR QUÉ HAY UN STATEMENT "FUERA DE PATRÓN" (SIN IN SCHEMA)
-- ----------------------------------------------------------------------------
-- El comportamiento del ACL nulo (`relacl IS NULL` / `proacl IS NULL`) para
-- objetos nuevos NO ES SIMÉTRICO entre tipos:
--
--   Tipo de objeto    | ACL nulo significa                       | Default
--   ------------------|------------------------------------------|--------
--   TABLE             | solo el dueño, nada a PUBLIC             | seguro
--   SEQUENCE          | solo el dueño, nada a PUBLIC             | seguro
--   FUNCTION/PROC     | solo el dueño + **EXECUTE a PUBLIC**     | EXPUESTO
--
-- Cita manual PostgreSQL §5.8: "the default privileges granted to PUBLIC
-- are as follows: ... EXECUTE privilege for functions and procedures".
--
-- Consecuencia práctica: cuando el pg_default_acl queda con solo el dueño
-- (situación post-REVOKE), una TABLA o SECUENCIA nueva nace con relacl
-- NULL = protegida. Una FUNCIÓN nueva nace con proacl NULL = EXPUESTA
-- (porque el default global del engine se materializa en runtime, aunque
-- pg_default_acl no diga nada).
--
-- Para cerrar la exposición de funciones nuevas, hay que MATERIALIZAR el
-- proacl con GRANT explícito al dueño, o REVOKE explícito de PUBLIC vía
-- ALTER DEFAULT PRIVILEGES. Y este último tiene la sutileza clave:
--
-- ----------------------------------------------------------------------------
-- ⚠️ WARNING CRÍTICO — EL ALTER DEFAULT PRIVILEGES ... FROM PUBLIC VA GLOBAL
-- ----------------------------------------------------------------------------
-- El statement `ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE
-- ON FUNCTIONS FROM PUBLIC` (línea abajo) va SIN `IN SCHEMA public`
-- deliberadamente. NO agregar `IN SCHEMA`.
--
-- Cita literal manual PostgreSQL §ALTER DEFAULT PRIVILEGES:
--   "This command has no effect, unless it is undoing a matching GRANT:
--    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS
--    FROM PUBLIC;
--    That's because per-schema default privileges can only add privileges
--    to the global setting, not remove privileges granted by it."
--
-- Es exactamente el statement que rompe. Si alguien "arregla" agregándole
-- `IN SCHEMA public` para simetría con los otros 3 statements, el ALTER
-- pasa a ser NO-OP silente y las funciones nuevas vuelven a nacer públicas.
-- Sin error, sin warning — el smoke antes-y-después ya no lo captaría en
-- runs futuros porque nadie sospecharía. La brecha vive escondida hasta
-- que alguien la mide.
--
-- Alcance del statement sin IN SCHEMA: aplica a TODO objeto creado por
-- el rol `postgres` en cualquier schema. Verificación empírica staging
-- 2026-09-01: solo `public` tiene funciones creadas por `postgres`. Los
-- otros schemas (extensions=55 funcs, storage=17, realtime=15, net=12,
-- vault=5, auth=4, graphql_public=1) los pobla Supabase con roles admin
-- distintos (supabase_admin, supabase_auth_admin). Alcance efectivo =
-- idéntico al per-schema, cero efectos colaterales.
--
-- ----------------------------------------------------------------------------
-- OTROS CAMBIOS DEL SMOKE
-- ----------------------------------------------------------------------------
-- (a) REVOKE ALL en vez de enumerar privilegios. El smoke encontró que
--     enumerar "SELECT, INSERT, UPDATE, DELETE" dejaba TRUNCATE, REFERENCES,
--     TRIGGER, MAINTAIN en tablas (arwdDxtm → Dxtm), y UPDATE en secuencias
--     (rwU → w) heredados a anon. REVOKE ALL cubre el bitmask completo sin
--     residuo. Corrección aterrizada por PO durante el smoke.
--
-- (d) La guía oficial Supabase de hardening
--     (https://supabase.com/docs/guides/database/hardening-data-api) usa
--     los 4 statements CON `IN SCHEMA public`, incluido el que el manual
--     PostgreSQL cita como no-op para FROM PUBLIC. Verificado dos veces
--     con WebFetch (2026-09-01, foco específico). Los usuarios que sigan
--     esa guía al pie de la letra creen que están protegidos y no lo están.
--     Reportar a Supabase docs al cierre del sprint. Anotable en acta.

-- Tablas: REVOKE ALL (cubre SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/
-- TRIGGER/MAINTAIN sin enumerar — evita el residuo del smoke)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES
    FROM PUBLIC, anon, authenticated, service_role;

-- Funciones: revocar EXECUTE de roles Data API (per-schema, deshace grants
-- explícitos que agrega el default de supabase)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON FUNCTIONS
    FROM anon, authenticated, service_role;

-- Secuencias: REVOKE ALL (cubre USAGE/SELECT/UPDATE — evita el residuo
-- de UPDATE que el enumerado original dejaba)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES
    FROM PUBLIC, anon, authenticated, service_role;

-- ⚠️ NO AGREGAR "IN SCHEMA public" A ESTE STATEMENT ⚠️
-- Con IN SCHEMA queda no-op silente (manual PG cita este exact statement
-- como ejemplo de "no effect"). Ver header § "WARNING CRÍTICO" para
-- explicación completa. Va global — aplica a todo lo que crea `postgres`.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
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
