-- ============================================================================
-- Sprint notificaciones (2026-08-28) — F2B
-- Oficializar el trigger `notify_proveedor_new_eval` que estaba activo en
-- prod y staging pero NO trackeado en `migrations/` (grep = 0 antes de esta
-- migration). Detectado durante auditoría F2A del sprint notificaciones.
--
-- Cambios respecto al body observado en BD (extraído vía pg_proc):
--   1. Texto con tildes corregidas (defecto 2 del BACKLOG panel de notifs):
--      "Recibiste una nueva evaluacion. Aparecera publica tras moderacion."
--      → "Recibiste una nueva evaluación. Aparecerá pública tras moderación."
--   2. Se agrega `title` (antes NULL) y `link` a la vista propia del
--      proveedor (defecto 1 aplicando D1: "evaluación → la evaluación, o
--      el servicio evaluado si no hay vista propia" — verificado en F2A:
--      `pages/proveedor/index.tsx` tiene tab evaluaciones, URL canónica
--      `/proveedor?tab=evaluaciones`).
--   3. Se agrega `metadata` con `agendamiento_id`/`servicio_id`/`tipo` para
--      consistencia con el patrón del resto de callers de INSERT en
--      `notifications` (recordatorio-reserva, invitacion-resenas). Habilita
--      el render defensivo de F3 (chequear que la reserva/evaluación aún
--      exista antes de navegar).
--
-- CONTEXTO HISTÓRICO INDEPENDIENTE — hallazgo de seguridad detectado en
-- el mismo sprint F2A por el PO (registrado en ACTA_NOTIFICACIONES.md
-- pendiente): la función `notify_viaje_publicado` también estaba en BD sin
-- trackeo, hacía POST HTTP a un dominio externo desconocido con SECURITY
-- DEFINER + token hardcodeado. Confirmado no ejecutada (pg_net queue vacío,
-- ningún trigger la invocaba) y NO parte de Pawnecta ("viaje" no es
-- concepto del producto, cero referencia en el repo en historia+reflog+
-- stash+untracked). Origen probable: copy-paste externo desde SQL Editor.
-- **DROP ejecutado por el PO en prod y staging antes de esta migration**
-- (2026-08-28). Este archivo NO la incluye — el DROP quedó como acción
-- manual documentada en el acta, no como migration porque no queremos que
-- un `IF EXISTS` post-drop no aporte y un `DROP` sin `IF EXISTS` reviente
-- si alguien re-ejecuta la migration.
--
-- ─────────────────────────────────────────────────────────────────────────
-- Aplicar en STAGING primero, después PROD. Un solo Run cada uno. El
-- bloque es idempotente (DROP TRIGGER + DROP FUNCTION IF EXISTS + CREATE
-- OR REPLACE FUNCTION + CREATE TRIGGER). Rollback: DROP TRIGGER + DROP
-- FUNCTION explícitos.
--
-- POST-APPLY (F2C, ejecuta el PO manualmente): UPDATE de filas históricas
-- para poblar los campos nuevos + tildes correctas. Ver snippet en el
-- reporte del turno del auditor 2026-08-28.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_notify_eval ON public.evaluaciones;
DROP FUNCTION IF EXISTS public.notify_proveedor_new_eval();

CREATE FUNCTION public.notify_proveedor_new_eval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prov_user_id uuid;
BEGIN
    -- Resolver auth_user_id del proveedor (columna en public.proveedores).
    SELECT auth_user_id INTO prov_user_id
      FROM public.proveedores
     WHERE id = NEW.proveedor_id;

    IF prov_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, metadata, read, created_at)
        VALUES (
            prov_user_id,
            'info',
            'Nueva evaluación recibida',
            'Recibiste una nueva evaluación. Aparecerá pública tras moderación.',
            '/proveedor?tab=evaluaciones',
            jsonb_build_object(
                'tipo', 'evaluacion_nueva',
                'evaluacion_id', NEW.id,
                'servicio_id', NEW.servicio_id,
                'proveedor_id', NEW.proveedor_id
            ),
            false,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Cerrar la puerta ancha primero. Los default privileges del schema public
-- en prod (y en staging, verificado empíricamente 2026-09-01) otorgan
-- EXECUTE tanto a `anon` COMO a `authenticated` sobre toda función nueva.
-- El sprint admin-visibilidad detectó el caso anon porque era el que
-- fallaba el smoke ahí; acá se descubrió que authenticated también estaba
-- (proacl post-CREATE en staging incluía tanto anon=X como authenticated=X
-- pese al REVOKE FROM PUBLIC + FROM anon inicial — quedó auth_puede=true
-- hasta agregar el REVOKE FROM authenticated explícito).
--
-- Verificación empírica staging tras aplicar los 3 REVOKE:
--   anon_puede=false, auth_puede=false, service_puede=true
--   proacl={postgres=X/postgres, service_role=X/postgres}  ← limpio
--
-- La función es de trigger, no se llama por RPC — revocar EXECUTE es
-- defensa en profundidad, cero impacto operativo (los triggers corren
-- con la owner del CREATE, no con el rol del caller). Los 3 REVOKE quedan
-- como plantilla para cualquier función nueva mientras la deuda
-- estructural de default privileges (BACKLOG prioridad ALTA) no se
-- resuelva con `ALTER DEFAULT PRIVILEGES` a nivel schema.
REVOKE ALL ON FUNCTION public.notify_proveedor_new_eval() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_proveedor_new_eval() FROM anon;
REVOKE ALL ON FUNCTION public.notify_proveedor_new_eval() FROM authenticated;

CREATE TRIGGER trg_notify_eval
AFTER INSERT ON public.evaluaciones
FOR EACH ROW
EXECUTE FUNCTION public.notify_proveedor_new_eval();

COMMENT ON FUNCTION public.notify_proveedor_new_eval() IS
    'Sprint notificaciones F2B (2026-08-28). Trigger AFTER INSERT ON evaluaciones. '
    'Inserta notificación al proveedor con link a /proveedor?tab=evaluaciones. '
    'Oficializa la función que estaba activa en BD sin trackeo previo en migrations/.';
