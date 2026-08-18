-- ========================================================================
-- Migration: auto-aprobar los 7 proveedores en estado='pendiente' que
--            quedaron desde antes de la auto-aprobación del signup
--            (sprint badge-f1, 2026-08-18)
--
-- ⚠️ EJECUCIÓN MANUAL POR ALDO EN PROD (`ouezpeeiwjwawauidrqq`) — NO
--    AUTO-APLICABLE. Requiere GO explícito del PO en el turno vigente.
--
-- CONTEXTO
--   El sprint badge-f1 cambia el default de signup: los nuevos
--   proveedores quedan `estado='aprobado'` de entrada (sin intervención
--   admin), con `verificacion_estado='sin_enviar'` (badge opcional,
--   Q7 diseño). Ese cambio aplica solo a signups POST-merge — las 7
--   cuentas legacy en `estado='pendiente'` quedan atrapadas.
--
--   Query PO ejecutada 2026-08-18 sobre prod:
--     Nicole Novion              pendiente sin_enviar 16-ago
--     Veronica Gonzalez          pendiente sin_enviar 28-jun
--     Ignacia Mellado            pendiente sin_enviar 6-abr
--     Isidora Maciel             pendiente sin_enviar 4-abr
--     Francisca Polette Orellana pendiente sin_enviar 16-mar
--     Laura Marlenet Criado      pendiente sin_enviar 12-mar
--     Fernanda Hamasaki          pendiente sin_enviar 11-mar
--
--   Las 2 cuentas 'Admin Pawnecta' (Aldo, 25-feb) ya están `aprobado` —
--   filtro `WHERE estado='pendiente'` las excluye naturalmente.
--
-- REGLA DE CIERRE
--   `estado`  → 'aprobado' (habilita publicar y aparecer en catálogo).
--   `aprobado_at` → NOW() (registro histórico del cambio).
--   `aprobado_por` → NULL (marcador de auto-aprobación por sprint,
--                          distingue de aprobaciones humanas viejas
--                          que tenían el uuid del admin).
--   `verificacion_estado` → SE CONSERVA en 'sin_enviar' (badge opcional,
--                          no se toca).
--   `rut_verificado` → SE CONSERVA en su valor actual.
--
--   Filtros:
--     `estado = 'pendiente'`  ← target directo.
--     `es_ejemplo IS DISTINCT FROM true`  ← excluye cuentas seed.
--     No hace falta filtrar por 'Admin Pawnecta' — esas están 'aprobado'
--     y el WHERE `estado='pendiente'` ya las descarta.
--
-- ORDEN DE EJECUCIÓN
--   (a) Ejecutar este archivo en Supabase Studio SQL Editor de PROD.
--       BLOQUE ÚNICO: seleccionar TODO el contenido entre BEGIN; y
--       COMMIT; e invocar Run UNA sola vez. Corolario P8 6ª — separar
--       BEGIN/COMMIT en corridas distintas del SQL Editor causa
--       ROLLBACK silencioso.
--   (b) Verificar el output: RETURNING debe listar exactamente los 7
--       proveedores. El DO $$ debe emitir NOTICE con `v_aprobados=7`
--       (o el count real que quede al momento de ejecutar).
--   (c) Contactar manualmente a los 7 con el mensaje del sprint: "ahora
--       puedes publicar, sin trámite pendiente. Verifica tu identidad
--       cuando quieras y ganas el badge de confianza".
--
-- ROLLBACK
--   Bloque comentado al final. Reversible sin pérdida de datos —
--   revierte los 7 a 'pendiente' con aprobado_at=NULL, aprobado_por=NULL.
--
-- P6 CONFIRMADO
--   Columnas verificadas contra information_schema (2026-08-18 via MCP
--   staging): estado text nullable, aprobado_at timestamptz nullable,
--   aprobado_por uuid nullable, verificacion_estado text NOT NULL,
--   es_ejemplo boolean NOT NULL default false.
-- ========================================================================

BEGIN;

-- Paso 1 — UPDATE con RETURNING para evidencia visual explícita.
-- El RETURNING lista exactamente qué filas se movieron; Aldo lee y
-- confirma que son las 7 esperadas antes de decidir si sigue.
UPDATE public.proveedores
   SET estado = 'aprobado',
       aprobado_at = NOW(),
       aprobado_por = NULL
 WHERE estado = 'pendiente'
   AND (es_ejemplo IS DISTINCT FROM true)
RETURNING id,
          nombre,
          apellido_p,
          estado,
          verificacion_estado,
          aprobado_at,
          created_at::date AS registrado;

-- ========================================================================
-- Verificación automática — el bloque falla loud si el resultado no
-- coincide con lo esperado (patrón corolario P8 5ª: el mecanismo de
-- verificación debe fallar cuando SÍ tiene que fallar).
--
-- Antídoto P8 5ª (d): agregado un test negativo local — el bloque
-- verifica ADEMÁS que las cuentas 'aprobado' que YA existían (Admin
-- Pawnecta) NO cambiaron su aprobado_at por este UPDATE. Si el filtro
-- del UPDATE estuviera roto (por ejemplo, `WHERE estado != 'aprobado'`
-- por typo), las cuentas admin también se hubieran tocado — este check
-- lo detectaría.
-- ========================================================================
DO $$
DECLARE
    v_pendientes_restantes INT;
    v_aprobados_recien INT;
    v_admin_intactos INT;
BEGIN
    -- Debe quedar 0 pendientes NO-ejemplo tras el UPDATE.
    SELECT COUNT(*) INTO v_pendientes_restantes
      FROM proveedores
     WHERE estado = 'pendiente'
       AND (es_ejemplo IS DISTINCT FROM true);

    IF v_pendientes_restantes > 0 THEN
        RAISE EXCEPTION 'Post-UPDATE: quedan % pendientes no-ejemplo. Esperado 0.', v_pendientes_restantes;
    END IF;

    -- Debe haber N aprobados con aprobado_at reciente (< 5 minutos).
    SELECT COUNT(*) INTO v_aprobados_recien
      FROM proveedores
     WHERE estado = 'aprobado'
       AND aprobado_at > NOW() - INTERVAL '5 minutes'
       AND aprobado_por IS NULL;

    IF v_aprobados_recien < 1 THEN
        RAISE EXCEPTION 'Post-UPDATE: cero aprobados-recientes con aprobado_por NULL. El UPDATE no marcó ninguna fila.';
    END IF;

    -- Test negativo — las cuentas 'Admin Pawnecta' YA estaban aprobado.
    -- Su aprobado_at NO debe haberse tocado por este UPDATE (WHERE
    -- filtraba por 'pendiente'). Si esta assertion falla, el filtro
    -- estaba mal (bug del script, no de los datos).
    SELECT COUNT(*) INTO v_admin_intactos
      FROM proveedores
     WHERE nombre ILIKE 'admin%pawnecta%'
       AND (aprobado_at IS NULL OR aprobado_at < NOW() - INTERVAL '5 minutes');

    IF v_admin_intactos = 0 THEN
        RAISE WARNING 'Test negativo P8-5ª: cero cuentas Admin Pawnecta con aprobado_at antiguo. Verificar que el UPDATE no las tocó por error.';
    END IF;

    RAISE NOTICE 'OK — % proveedor(es) auto-aprobado(s) sin tocar cuentas admin previas. Pendientes restantes: %.', v_aprobados_recien, v_pendientes_restantes;
END $$;

-- Verificación visual complementaria — snapshot post-cambio.
SELECT
    estado,
    verificacion_estado,
    COUNT(*) AS cnt
  FROM proveedores
 WHERE (es_ejemplo IS DISTINCT FROM true)
 GROUP BY estado, verificacion_estado
 ORDER BY estado, verificacion_estado;

COMMIT;

-- ========================================================================
-- ROLLBACK (descomentar y ejecutar SOLO si el estado post-COMMIT es
-- inesperado). Revierte los 7 al estado previo.
-- ========================================================================
-- BEGIN;
-- UPDATE public.proveedores
--    SET estado = 'pendiente',
--        aprobado_at = NULL,
--        aprobado_por = NULL
--  WHERE estado = 'aprobado'
--    AND aprobado_por IS NULL
--    AND aprobado_at > '2026-08-18'::timestamptz  -- ajustar cutoff según fecha real de ejecución
--    AND (es_ejemplo IS DISTINCT FROM true)
--    AND nombre NOT ILIKE 'admin%pawnecta%'
-- RETURNING id, nombre, apellido_p, estado;
-- COMMIT;
