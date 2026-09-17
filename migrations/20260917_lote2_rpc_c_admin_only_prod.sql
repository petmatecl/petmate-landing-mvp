-- ---------------------------------------------------------------------------
-- migrations/20260917_lote2_rpc_c_admin_only_prod.sql
--
-- Sprint bloque-i I-4 (2026-09-17) — RPC-C Lote 2 (admin-only).
-- Restringir `calcular_perfil_completo_proveedor(uuid)` a los roles que
-- efectivamente la necesitan: authenticated (para triggers) + service_role.
-- Retira EXECUTE del PUBLIC + anon.
--
-- Contexto: informe completo en `docs/auditorias/rpc-c-20260917.md` §1.2
-- fila #4 + §2 grupo B. Función SECURITY DEFINER que recalcula el flag
-- `perfil_completo` del proveedor. **Cero caller cliente-side** (grep en
-- pages/, components/, lib/ retornó solo un COMMENT — cero llamada RPC
-- real). El único uso legítimo es via los 2 triggers en la tabla
-- `proveedores` y `servicios_publicados` (que la invocan indirectamente).
--
-- **Por qué authenticated se mantiene**: `trg_proveedor_recalcular_completo`
-- es SECURITY INVOKER (verificado 2026-09-17). Cuando un authenticated user
-- hace UPDATE en su propia fila de `proveedores`, el trigger corre en su
-- contexto y necesita EXECUTE sobre `calcular_perfil_completo_proveedor`
-- (aunque la función misma sea SECURITY DEFINER). REVOKE de authenticated
-- rompería cualquier UPDATE al perfil. Anon no puede UPDATE por RLS →
-- REVOKE de anon es cero superficie legítima perdida.
--
-- **Aplicado en staging (jmtadvdkicyylcwjcmcl) 2026-09-17**: verificado con
--   anon EXECUTE = false, authenticated EXECUTE = true, service_role
--   EXECUTE = true, PUBLIC entry desapareció del ACL. Suite completa CI
--   verde tras el REVOKE.
--
-- **Para prod**: ejecutar este archivo COMPLETO en un único click de "Run"
-- desde Supabase Studio SQL Editor (cero corridas separadas — patrón
-- P5/P8 evidencia por bloque + BEGIN/COMMIT atomicidad).
-- ---------------------------------------------------------------------------

-- =============================================================================
-- FASE 1 — Verificación PREVIA (estado esperado ANTES del REVOKE)
-- =============================================================================
-- Esperado en prod (idéntico al estado inicial de staging pre-REVOKE):
--   acl_entries: `=X/postgres` + postgres + anon + authenticated + service_role
--   anon_execute = true (EL ESTADO QUE VAMOS A CERRAR)
--   auth_execute = true
--   srvc_execute = true
--
-- Si anon_execute ya viene en false, el REVOKE es no-op y no hace daño.
-- Si algún grant esperado falta, DETENER y consultar antes de continuar.
SELECT 'PREVIA' AS fase,
       p.proname,
       p.prosecdef AS security_definer,
       array_to_string(p.proacl::text[], E'\n') AS acl_entries,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS srvc_execute
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname = 'calcular_perfil_completo_proveedor';

-- =============================================================================
-- FASE 2 — REVOKE atómico en transacción
-- =============================================================================
BEGIN;

-- (2.1) Retirar EXECUTE de PUBLIC (base de la herencia anon vía default de
--       PostgreSQL — un REVOKE FROM anon SOLO no cierra el vector si PUBLIC
--       sigue con GRANT, como se aprendió en Lote 1 del sprint bloque-h).
REVOKE EXECUTE ON FUNCTION public.calcular_perfil_completo_proveedor(uuid) FROM PUBLIC;

-- (2.2) Retirar EXECUTE explícito de anon (redundante tras REVOKE FROM
--       PUBLIC pero explícito para audit trail).
REVOKE EXECUTE ON FUNCTION public.calcular_perfil_completo_proveedor(uuid) FROM anon;

-- authenticated y service_role NO se tocan — el trigger
-- trg_proveedor_recalcular_completo (SECURITY INVOKER) necesita
-- EXECUTE en authenticated para funcionar; service_role queda para uso
-- server-side legítimo.

COMMIT;

-- =============================================================================
-- FASE 3 — Verificación POST (estado esperado DESPUÉS del REVOKE)
-- =============================================================================
-- Esperado post-REVOKE (idéntico al post-verify en staging 2026-09-17):
--   acl_entries: postgres + authenticated + service_role (sin `=X/postgres` PUBLIC ni anon)
--   anon_execute = false ← el efecto principal del sprint
--   auth_execute = true ← preservado (trigger dep)
--   srvc_execute = true ← preservado
SELECT 'POSTERIOR' AS fase,
       p.proname,
       array_to_string(p.proacl::text[], E'\n') AS acl_entries,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS srvc_execute
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname = 'calcular_perfil_completo_proveedor';

-- =============================================================================
-- FASE 4 — ROLLBACK (solo si POST muestra algo inesperado)
-- =============================================================================
-- Ejecutar SOLO si la verificación POST muestra algo distinto a lo esperado
-- (ej. auth_execute = false, que indicaría que se rompió una grant que no
-- debía). Restablece el estado previo:
--
--   BEGIN;
--   GRANT EXECUTE ON FUNCTION public.calcular_perfil_completo_proveedor(uuid) TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.calcular_perfil_completo_proveedor(uuid) TO anon;
--   COMMIT;
--
-- Post-rollback, verificar con la query de FASE 1 que retorna al estado
-- previo. Cero necesidad de tocar authenticated/service_role — no fueron
-- revocados en este bloque.
