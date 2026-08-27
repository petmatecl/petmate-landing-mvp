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
-- Retorna todas las columnas del perfil + email real de auth.users +
-- email_confirmado (boolean derivado de email_confirmed_at IS NOT NULL) +
-- last_sign_in_at (útil para detectar cuentas dormidas) + banned_until +
-- n_servicios / n_servicios_activos (elimina el segundo query embed que
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
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_listar_proveedores()
RETURNS TABLE(
    id                  uuid,
    nombre              text,
    apellido_p          text,
    apellido_m          text,
    nombre_publico      text,
    rut                 text,
    rut_verificado      boolean,
    comuna              text,
    foto_perfil         text,
    estado              text,
    verificacion_estado text,
    es_placeholder      boolean,
    es_ejemplo          boolean,
    created_at          timestamptz,
    notas_admin         text,
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
           p.rut, p.rut_verificado, p.comuna, p.foto_perfil, p.estado,
           p.verificacion_estado, p.es_placeholder, p.es_ejemplo,
           p.created_at, p.notas_admin, p.auth_user_id,
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

-- Cerrar la puerta ancha primero, después abrir solo a authenticated.
-- is_admin() filtra adentro; anon nunca debería poder llamarla.
REVOKE ALL ON FUNCTION public.admin_listar_proveedores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_proveedores() TO authenticated;

COMMENT ON FUNCTION public.admin_listar_proveedores() IS
    'Sprint admin-visibilidad (2026-08-27). SECURITY DEFINER + is_admin() gate. '
    'Retorna perfil proveedor + email real auth.users + email_confirmado. '
    'Uso: supabase.rpc(''admin_listar_proveedores'') desde componentes admin.';
