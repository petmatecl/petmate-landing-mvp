-- ========================================================================
-- Migration: DROP COLUMN proveedores.datos_especificos + regenerar RPC
--
-- ⚠️ EJECUCIÓN MANUAL POR ALDO — NO AUTO-APLICABLE
--    Requiere GO explícito del PO en el turno vigente (regla del proyecto
--    para DROP de columnas).
--
-- CONTEXTO
--   Columna `datos_especificos jsonb` en `proveedores` quedó viva como
--   legado del modelo un-proveedor-una-categoría (pre Sprint 4 Fase 1).
--   Los datos categoria-específicos viven ahora en `servicios_publicados.
--   detalles` per-servicio. Deuda documentada en BACKLOG.
--
-- VERIFICACIÓN CERO LECTORES (evidencia auditor 2026-08-18)
--   1. Grep exhaustivo en pages/, components/, lib/:
--      Cero lecturas efectivas — todos los matches son comentarios de
--      deprecación (`// datos_especificos deprecado...`) o el envío
--      forzado a null en signup.ts. Sin usos activos.
--   2. Verificación staging vía MCP (proxy de prod):
--      - Cero triggers en tabla proveedores.
--      - Cero views que referencien datos_especificos.
--      - 1 RPC referencia: `registrar_proveedor` (INSERT con parámetro
--        `p_datos_especificos jsonb DEFAULT NULL`).
--   3. `signup.ts:111` (commit deploy previo a esta migration) YA NO envía
--      `p_datos_especificos` como parámetro. La RPC vieja usa `DEFAULT
--      NULL` → INSERT con `datos_especificos=NULL` sin disruption.
--
-- ORDEN SAFE DE EJECUCIÓN
--   (a) Deploy código nuevo (signup.ts sin p_datos_especificos): YA
--       ATERRIZADO en el commit que promueve esta migration. Verificable
--       con smoke de signup en preview antes de ejecutar prod.
--   (b) Ejecutar ESTE archivo en prod SQL Editor (bloque único, siguiendo
--       corolario P8 6ª — SQL Editor no persiste transacciones entre
--       corridas separadas). Ver CLAUDE.md > Corolario SQL Editor.
--   (c) Verificar post-ejecución: 3 queries incluidas al final.
--
-- ROLLBACK
--   Bloque comentado al final del archivo. Reversible sin pérdida de
--   funcionalidad (RPC vuelve a aceptar p_datos_especificos + columna
--   vuelve NOT NULL con DEFAULT NULL — datos históricos NO recuperables
--   si ya se droparon, ver DUMP recomendado abajo).
--
-- BACKUP OBLIGATORIO ANTES DE EJECUTAR — PASO SEPARADO, GUARDAR A ARCHIVO
--   Aldo ejecuta ESTE query PRIMERO en una corrida distinta del SQL Editor
--   y **COPIA EL OUTPUT A UN ARCHIVO LOCAL** antes de tocar la migration
--   principal. Si algo sale mal después del DROP, esta es la ÚNICA vía de
--   recuperación — no queda en ningún otro lado.
--
--     SELECT id, nombre, datos_especificos
--     FROM proveedores
--     WHERE datos_especificos IS NOT NULL
--       AND datos_especificos::text NOT IN ('null', '{}');
--
--   En staging el resultado fue 1 fila. En prod es incierto. Guardar como
--   `backup_datos_especificos_prod_20260818.json` o similar antes de
--   continuar. Este NO va dentro del BEGIN/COMMIT de abajo — es paso previo.
--
-- EJECUCIÓN EN UN SOLO CLICK (crítico — corolario P8 6ª)
--   El bloque `BEGIN...COMMIT` que sigue **DEBE ejecutarse en una única
--   corrida del SQL Editor con un único click Run**. Copiar TODO desde
--   `BEGIN;` hasta `COMMIT;` en el editor y ejecutar de una sola vez.
--
--   Si se ejecuta en corridas separadas (ej. `BEGIN;` en un click,
--   `CREATE OR REPLACE FUNCTION` en otro), el SQL Editor descarta la
--   transacción abierta silenciosamente entre corridas. Riesgo mayor que
--   A2 con DELETE: acá una migration a medias deja la RPC vieja borrada
--   y la columna sin dropear, o RPC nueva creada con columna aún viva
--   (INSERT explota con column doesn't exist en runtime del signup
--   siguiente). Ver `CLAUDE.md > Corolario P8 6ª (SQL Editor no persiste
--   transacciones entre corridas)`.
--
--   Verificación pre-ejecución: mirar el buffer del editor y confirmar
--   que contiene DESDE `BEGIN;` HASTA `COMMIT;` en un solo bloque
--   contiguo. Si Aldo pega solo parte, abortar y re-copiar completo.
--
-- APROBACIÓN CONSULTA OBLIGATORIA
--   Este archivo se genera COMO EVIDENCIA para el PO. Aldo lo ejecuta
--   manualmente en Supabase Studio SQL Editor tras GO explícito.
-- ========================================================================

BEGIN;

-- Paso 1 — Regenerar RPC `registrar_proveedor` sin el parámetro
-- `p_datos_especificos`. La firma nueva tiene 11 parámetros (era 12).
-- El código cliente ya está deployado sin ese parámetro.
CREATE OR REPLACE FUNCTION public.registrar_proveedor(
    p_auth_user_id uuid,
    p_nombre text,
    p_apellido_p text,
    p_apellido_m text DEFAULT NULL::text,
    p_rut text DEFAULT NULL::text,
    p_comuna text DEFAULT NULL::text,
    p_tipo_entidad text DEFAULT 'persona_natural'::text,
    p_razon_social text DEFAULT NULL::text,
    p_rut_empresa text DEFAULT NULL::text,
    p_nombre_fantasia text DEFAULT NULL::text,
    p_giro text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.proveedores (
        auth_user_id, nombre, apellido_p, apellido_m, rut,
        comuna, tipo_entidad, razon_social, rut_empresa,
        nombre_fantasia, giro, estado
    ) VALUES (
        p_auth_user_id, p_nombre, p_apellido_p, p_apellido_m, p_rut,
        p_comuna, p_tipo_entidad, p_razon_social, p_rut_empresa,
        p_nombre_fantasia, p_giro, 'pendiente'
    );
END;
$function$;

-- Paso 2 — DROP la versión vieja de la RPC con 12 parámetros.
-- Postgres considera funciones con firmas distintas como funciones
-- distintas — la CREATE OR REPLACE del paso 1 creó una NUEVA función
-- con 11 params, sin eliminar la vieja con 12. Sin este DROP quedan
-- 2 versiones y PostgREST puede llamar cualquiera.
DROP FUNCTION IF EXISTS public.registrar_proveedor(
    uuid, text, text, text, text, text, text, text, text, text, text, jsonb
);

-- Paso 3 — DROP COLUMN datos_especificos.
ALTER TABLE public.proveedores DROP COLUMN datos_especificos;

-- ========================================================================
-- Verificación post-migration (visible al operador — Aldo lee el output)
-- ========================================================================
-- (a) Columna dropada
SELECT column_name FROM information_schema.columns
 WHERE table_schema='public' AND table_name='proveedores'
   AND column_name='datos_especificos';
-- Esperado: 0 filas (columna no existe).

-- (b) RPC firma actualizada
SELECT pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
 WHERE n.nspname='public' AND p.proname='registrar_proveedor';
-- Esperado: 1 fila con firma de 11 parámetros (sin p_datos_especificos jsonb).

-- (c) Total proveedores post-migration (integridad)
SELECT COUNT(*) AS total_proveedores FROM proveedores;
-- Esperado: mismo count que pre-migration.

COMMIT;

-- ========================================================================
-- ROLLBACK (descomentar SOLO si algo se ve raro post-COMMIT)
-- ========================================================================
-- BEGIN;
-- ALTER TABLE public.proveedores ADD COLUMN datos_especificos jsonb;
-- DROP FUNCTION IF EXISTS public.registrar_proveedor(
--     uuid, text, text, text, text, text, text, text, text, text, text
-- );
-- CREATE OR REPLACE FUNCTION public.registrar_proveedor(
--     p_auth_user_id uuid,
--     p_nombre text,
--     p_apellido_p text,
--     p_apellido_m text DEFAULT NULL::text,
--     p_rut text DEFAULT NULL::text,
--     p_comuna text DEFAULT NULL::text,
--     p_tipo_entidad text DEFAULT 'persona_natural'::text,
--     p_razon_social text DEFAULT NULL::text,
--     p_rut_empresa text DEFAULT NULL::text,
--     p_nombre_fantasia text DEFAULT NULL::text,
--     p_giro text DEFAULT NULL::text,
--     p_datos_especificos jsonb DEFAULT NULL::jsonb
-- )
-- RETURNS void LANGUAGE plpgsql SECURITY DEFINER
-- AS $function$
-- BEGIN
--     INSERT INTO public.proveedores (
--         auth_user_id, nombre, apellido_p, apellido_m, rut,
--         comuna, tipo_entidad, razon_social, rut_empresa,
--         nombre_fantasia, giro, datos_especificos, estado
--     ) VALUES (
--         p_auth_user_id, p_nombre, p_apellido_p, p_apellido_m, p_rut,
--         p_comuna, p_tipo_entidad, p_razon_social, p_rut_empresa,
--         p_nombre_fantasia, p_giro, p_datos_especificos, 'pendiente'
--     );
-- END;
-- $function$;
-- COMMIT;
-- ⚠️ Data histórica NO recuperable si ya se dropó. Se pierde
-- irreversiblemente en el paso 3 salvo dump previo (ver "BACKUP
-- RECOMENDADO" arriba).
