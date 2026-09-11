-- migrations/20260911_dpr1_verificacion_prod.sql
--
-- Sprint launch-l1 · L1-6 (DPR-1) — VERIFICACIÓN read-only para acotar
-- el sprint antes de gastar horas.
--
-- Contexto: el PO pidió confirmar dos cosas en STAGING y PROD antes de
-- decidir si DPR-1 se ejecuta como sprint completo (auditoría case-by-case
-- de las 204 RPC) o se cierra como BLOQUEA (default-privs cubrió lo
-- estructural + cero funciones nuevas expuestas post-2026-09-01).
--
-- Este archivo NO muta nada. Solo SELECT. Copiar/pegar cada bloque al
-- SQL Editor de Supabase Studio (rol postgres) — retornan tablas de
-- diagnóstico. Correr en staging (jmtadvdkicyylcwjcmcl) y prod
-- (ouezpeeiwjwawauidrqq); comparar los resultados.
--
-- Criterio de decisión (PO 2026-09-11):
--   * Ambas condiciones se cumplen (Q1 esperado + Q2 vacío) → DPR-1
--     CIERRA como BLOQUEA. Auditoría RPC-C queda en DESPUÉS.
--   * Q1 no muestra revoke aplicado → default-privs no aterrizó en el
--     proyecto consultado; investigar antes de acotar.
--   * Q2 devuelve funciones expuestas → esa lista corta es lo único
--     que se corrige ahora (REVOKE case-by-case sobre esas fns).
--
-- ============================================================================
-- Q1 — ALTER DEFAULT PRIVILEGES sobre schema public aplicado para anon
--      y authenticated (grantor = postgres).
-- ============================================================================
-- Consulta `pg_default_acl` — tabla del catálogo que registra las
-- políticas de default privileges por (grantor role, schema, object type).
-- El sprint `default-privs` (2026-09-01) revocó los defaults heredados
-- de Supabase que otorgaban EXECUTE anon/authenticated/PUBLIC + SELECT
-- anon/authenticated sobre nuevas funciones y tablas creadas por postgres
-- en schema public.
--
-- Lo que esperamos ver (post-default-privs):
--   * grantor = 'postgres', namespace = 'public', object_type = 'r'/'S'/'f'
--     con `defaclacl` sin entradas 'anon=' ni 'authenticated=' — solo
--     service_role, postgres, y possibly PUBLIC removida para funciones.
--   * Si `pg_default_acl` no tiene fila para (postgres, public, f) o su
--     ACL no incluye anon/auth, quiere decir que el ALTER DEFAULT
--     PRIVILEGES REVOKE aterrizó correcto.
--
-- Interpretación:
--   * Rows con `defaclacl::text` que INCLUYE `anon=` o `authenticated=` para
--     el tipo objeto (r=table, S=sequence, f=function) → default-privs
--     NO aplicó, o alguien creó una entrada nueva post-sprint.
--   * Rows con acl `{}` (vacío) o solo `service_role=`/`postgres=` →
--     default-privs aplicó correctamente.

SELECT
    r.rolname                        AS grantor,
    n.nspname                        AS schema,
    CASE d.defaclobjtype
        WHEN 'r' THEN 'table'
        WHEN 'S' THEN 'sequence'
        WHEN 'f' THEN 'function'
        WHEN 'T' THEN 'type'
        WHEN 'n' THEN 'schema'
        ELSE d.defaclobjtype::text
    END                              AS object_type,
    d.defaclacl::text                AS acl_raw,
    (d.defaclacl::text LIKE '%anon=%')          AS acl_grants_anon,
    (d.defaclacl::text LIKE '%authenticated=%') AS acl_grants_authenticated
FROM pg_default_acl d
JOIN pg_roles r ON r.oid = d.defaclrole
JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE n.nspname = 'public'
  AND r.rolname IN ('postgres', 'supabase_admin')
ORDER BY r.rolname, d.defaclobjtype;

-- ============================================================================
-- Q2 — Funciones del schema public creadas DESPUÉS del sprint default-privs
--      (2026-09-01) que hoy tienen EXECUTE otorgado a anon o authenticated.
-- ============================================================================
-- El sprint default-privs revocó los defaults, así que TODA función nueva
-- creada por postgres a partir del 2026-09-01 debería nacer SIN grants a
-- anon/authenticated a menos que la migration correspondiente haga
-- `GRANT EXECUTE ... TO anon;` explícito (visible en review).
--
-- Esta query lista las funciones que:
--   (a) están en schema public,
--   (b) fueron creadas después del 2026-09-01 (evaluado por la fecha
--       del row más nueva entre `pg_class.relacl` — no siempre disponible;
--       fallback por proxy: cualquier función con grants a anon/auth es
--       candidata a revisar independientemente de fecha),
--   (c) tienen EXECUTE otorgado a `anon` o `authenticated` según
--       `has_function_privilege` — cubre grants directos + heredados
--       vía PUBLIC.
--
-- Nota P6+P8: `information_schema.role_routine_grants` sesga por rol del
-- consultante. Usamos `has_function_privilege` con role explícito para
-- ver el estado real desde postgres.

SELECT
    n.nspname                        AS schema,
    p.proname                        AS function_name,
    pg_get_function_identity_arguments(p.oid) AS args,
    has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute,
    p.proacl::text                   AS acl_raw
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )
ORDER BY p.proname;

-- ============================================================================
-- Q2b — Estimación de "creado después de 2026-09-01" (proxy, no fecha
--       exacta en pg_catalog). Contrasta el listado de Q2 con el listado
--       total pre-sprint via `git log --diff-filter=A -- migrations/`.
--       Si Q2 devuelve N funciones y todas están en migrations con fecha
--       ≥ 2026-09-01, entonces el sprint default-privs cubre el resto.
--       Si Q2 devuelve funciones de migrations pre-2026-09-01 con grants,
--       son legacy expuestas — decisión aparte si mantener o cerrar.
--
-- Este bloque es orientativo, no ejecutable inline. Comparar Q2 contra:
--
--   git log --diff-filter=A --format='%ci %h' --since=2026-09-01 -- migrations/ \
--     | grep -iE 'function|rpc'
--
-- para saber qué migrations agregaron funciones en la ventana.
--
-- ============================================================================
-- Q3 — Cross-check con default-privs SHA aplicado. Verifica que el ACL
--      revocado incluye funciones (defaclobjtype='f').
-- ============================================================================
-- Esta query es la más específica para confirmar que `20260901_default_
-- privileges_hardening.sql` corrió: buscamos que el pg_default_acl para
-- (postgres, public, function) NO tenga `anon=X/postgres` ni
-- `authenticated=X/postgres` ni `=X/postgres` (PUBLIC grant).

SELECT
    r.rolname                        AS grantor,
    n.nspname                        AS schema,
    d.defaclobjtype                  AS object_type,
    d.defaclacl                      AS acl_array,
    d.defaclacl::text                AS acl_text,
    (d.defaclacl::text ~ '(^|\{|,)=[^,}]*\}?')       AS acl_grants_public
FROM pg_default_acl d
JOIN pg_roles r ON r.oid = d.defaclrole
JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE n.nspname = 'public'
  AND r.rolname = 'postgres'
  AND d.defaclobjtype = 'f';

-- Esperado post-default-privs:
--   * Sin fila para (postgres, public, f) → PostgreSQL usa el default
--     de fábrica, PERO Supabase original tenía la entrada con grants a
--     anon/auth/service_role/PUBLIC. Si no hay fila, es porque el
--     ALTER DEFAULT PRIVILEGES REVOKE colapsó el ACL a estado default
--     PostgreSQL (que otorga EXECUTE a PUBLIC — MENOS RESTRICTIVO que
--     lo revocado). En ese caso Q2 debería mostrar funciones con
--     `anon_execute=true` heredado de PUBLIC.
--   * Con fila (postgres, public, f) y ACL sin `anon=`/`authenticated=`
--     ni PUBLIC (`=X`) → default-privs aplicó correcto.
--
-- Si Q3 muestra PUBLIC grant activo (última columna true), el REVOKE de
-- default-privs no cubrió el bit de PUBLIC — investigar si el sprint
-- omitió ese lado.
