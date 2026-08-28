-- ============================================================================
-- Sprint admin-visibilidad (2026-08-27) — RPC admin_listar_proveedores
-- ============================================================================
-- Contexto: el panel /admin → Proveedores mostraba "N/A" en la columna Contacto
-- porque leía `proveedores.email_publico` (0/N pobladas en staging y prod, campo
-- opcional que nadie llena) y NO joineaba `auth.users` — el email real vive ahí.
--
-- Bloqueo estructural: `auth.users` NO está expuesto por PostgREST al rol
-- `authenticated` (schema fuera del `db-schemas` config, sin GRANT SELECT
-- directo). Por diseño de Supabase Auth — no un olvido nuestro. El admin
-- necesita un canal explícito y auditado.
--
-- Solución: RPC `security definer` gateada por `is_admin()`. Patrón dominante
-- del proyecto (23 funciones security definer ya vivas: buscar_servicios,
-- is_admin, send_notification, es_owner_aprobado, etc.). El gate corre en el
-- primer statement — RAISE EXCEPTION antes de tocar la data. Cero endpoint
-- HTTP server-side nuevo (Opción A del diagnóstico 2026-08-27, aprobada PO).
--
-- Retorna todas las columnas del perfil relevantes al admin + email real de
-- auth.users + email_confirmado (boolean derivado de email_confirmed_at IS NOT
-- NULL) + last_sign_in_at (útil para detectar cuentas dormidas) + banned_until
-- + n_servicios / n_servicios_activos (elimina el segundo query embed que
-- hacía el .select('*, servicios:servicios_publicados(...)')).
--
-- Uso: `supabase.rpc('admin_listar_proveedores')` desde
-- components/Admin/ProveedorManagementList.tsx (drop-in reemplazo del
-- .from('proveedores').select(...) actual). Otros consumidores admin
-- pueden reusar el mismo RPC.
--
-- Restricción de alcance del sprint: solo lectura. Cero acciones sobre el
-- proveedor desde este RPC — suspender/reactivar/rechazar siguen su path
-- actual (.from('proveedores').update(...) gated por policy Admin update all).
--
-- ─────────────────────────────────────────────────────────────────────────
-- Historial de correcciones (P6 aplicada empíricamente contra
-- information_schema.columns antes de reescribir):
--
--   V1 (2026-08-27, commit c0838e3) — nunca aplicada. Incluía dos columnas
--     inexistentes en `proveedores`: `es_placeholder` y `notas_admin`. Postgres
--     habría rechazado al ejecutar. `notas_admin` sí existe pero en
--     `feedback_submissions` — la otra tabla del mismo sprint, confusión
--     entre tablas del mismo contexto. Detectado por PO con
--     `information_schema.columns` antes del apply. Regla operativa
--     confirmada: el nombre de una columna que NO vengo de leer de
--     `information_schema` en el turno vigente es hipótesis de nombre,
--     no hecho (CLAUDE.md > P6 corolario ampliado 2026-08-25).
--
--   V2 (esta versión) — 18 columnas verificadas 1 a 1 contra
--     information_schema. Removidas: `es_placeholder`, `notas_admin`.
--     Agregadas por pedido PO: `telefono` (para contactar dormidos por
--     otra vía cuando el correo no confirmó), `whatsapp` (mismo motivo),
--     `perfil_completo` (indicador chico "quién completó vs quién no"),
--     `region` (complemento geográfico a comuna).
-- ─────────────────────────────────────────────────────────────────────────
--
-- SOBRE EL DROP FUNCTION IF EXISTS abajo:
--   Postgres rechaza `CREATE OR REPLACE FUNCTION` cuando cambia el shape del
--   `RETURNS TABLE(...)` con `ERROR: cannot change return type of existing
--   function`. Por eso DROP explícito antes del CREATE cuando la firma
--   cambia. `IF EXISTS` lo hace idempotente: si la función nunca se aplicó
--   (staging virgen o prod virgen — que es el caso hoy, la V1 nunca se
--   ejecutó por auditoría P6 antes del apply), el DROP es no-op silencioso.
--   Si en el futuro se agrega/quita una columna al RETURNS, mantener el
--   DROP (con o sin IF EXISTS según el estado) al escribir la próxima
--   revisión.
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_listar_proveedores();

CREATE FUNCTION public.admin_listar_proveedores()
RETURNS TABLE(
    id                  uuid,
    nombre              text,
    apellido_p          text,
    apellido_m          text,
    nombre_publico      text,
    rut                 text,
    rut_verificado      boolean,
    comuna              text,
    region              text,
    foto_perfil         text,
    estado              text,
    verificacion_estado text,
    es_ejemplo          boolean,
    perfil_completo     boolean,
    telefono            text,
    whatsapp            text,
    created_at          timestamptz,
    auth_user_id        uuid,
    email_auth          text,
    email_confirmado    boolean,
    last_sign_in_at     timestamptz,
    banned_until        timestamptz,
    n_servicios         bigint,
    n_servicios_activos bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Gate: solo admin. First statement, cero data touching sin auth.
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT p.id, p.nombre, p.apellido_p, p.apellido_m, p.nombre_publico,
           p.rut, p.rut_verificado, p.comuna, p.region, p.foto_perfil, p.estado,
           p.verificacion_estado, p.es_ejemplo, p.perfil_completo,
           p.telefono, p.whatsapp,
           p.created_at, p.auth_user_id,
           au.email::text AS email_auth,
           (au.email_confirmed_at IS NOT NULL) AS email_confirmado,
           au.last_sign_in_at, au.banned_until,
           (SELECT COUNT(*) FROM public.servicios_publicados s
             WHERE s.proveedor_id = p.id)                                 AS n_servicios,
           (SELECT COUNT(*) FROM public.servicios_publicados s
             WHERE s.proveedor_id = p.id AND s.activo = true)             AS n_servicios_activos
      FROM public.proveedores p
      LEFT JOIN auth.users au ON au.id = p.auth_user_id
     ORDER BY p.created_at DESC;
END;
$$;

-- Cerrar la puerta ancha primero, después revocar a anon explícitamente
-- (default privileges del schema public en prod otorgan EXECUTE a anon
-- sobre toda función nueva — REVOKE FROM PUBLIC NO lo cubre porque el
-- privilegio está asignado DIRECTAMENTE al rol anon, no via PUBLIC ni
-- via membership en authenticated). Después abrir solo a authenticated.
-- is_admin() filtra adentro; anon nunca debería poder llamarla.
--
-- Diagnóstico empírico PO 2026-08-27 durante apply prod (staging no lo
-- reveló por config divergente entre entornos):
--   1. Bloque completo un solo Run → anon_can_call = TRUE.
--   2. REVOKE ALL FROM PUBLIC aparte → sigue TRUE.
--   3. pg_proc.proacl → privilegio como `anon=X/postgres` DIRECTO en
--      la función, no via PUBLIC.
--   4. pg_auth_members para anon → CERO filas (anon NO es miembro de
--      authenticated).
--   5. pg_default_acl → schema public en prod tiene DEFAULT PRIVILEGES
--      que otorgan EXECUTE a anon sobre toda función nueva. Se aplican
--      en el CREATE.
--   6. Control: is_admin() — función preexistente — también da
--      anon_can_call = TRUE en prod. Consistente con el hallazgo.
--   7. Fix: REVOKE explícito FROM anon.
--
-- Anotada la deuda de config en BACKLOG (prioridad ALTA, revisar ANTES
-- del lanzamiento). Cualquier RPC futuro tiene que llevar este REVOKE
-- explícito hasta que el default privilege de anon en public sea
-- removido a nivel schema.
REVOKE ALL ON FUNCTION public.admin_listar_proveedores() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_listar_proveedores() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_proveedores() TO authenticated;

COMMENT ON FUNCTION public.admin_listar_proveedores() IS
    'Sprint admin-visibilidad (2026-08-27, V2). SECURITY DEFINER + is_admin() gate. '
    'Retorna perfil proveedor + email real auth.users + email_confirmado + '
    'telefono/whatsapp/region/perfil_completo. '
    'Uso: supabase.rpc(''admin_listar_proveedores'') desde componentes admin.';
