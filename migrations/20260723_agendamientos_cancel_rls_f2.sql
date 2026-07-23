-- ============================================================================
-- migrations/20260723_agendamientos_cancel_rls_f2.sql
--
-- F2-3-D — cierra el gap de autoridad del endpoint POST /api/agendamientos/
-- cancelar. Detectado en code-review interno (CRÍTICO, score 100).
--
-- CONTEXTO
--
-- La política vigente `agendamientos_tutor_cancel` (baseline
-- 20260625_agendamientos_baseline.sql:143) permite al tutor UPDATE sus
-- propias filas para setearlas en 'cancelada' via anon key + RLS, sin
-- ninguna validación de ventana ni discriminación F1/F2. El endpoint
-- server (POST /api/agendamientos/cancelar) valida ownership + ventana
-- `cancelacion_min_horas_antes` correctamente, PERO un tutor con
-- devtools puede saltarse el endpoint entero:
--
--   supabase.from('agendamientos')
--     .update({ estado: 'cancelada' })
--     .eq('id', myReservaF2ConfirmadaId);
--
-- Con la política vigente, ese UPDATE pasa. Hasta que se aplique este
-- fix, el endpoint es decorativo para su propósito declarado.
--
-- FIX
--
-- Restringe el USING de la política: F2 confirmadas
-- (capacidad_snapshot_estadia NOT NULL AND estado='confirmada') quedan
-- FUERA del scope de la política — el tutor no puede targetearlas via
-- anon UPDATE. Solo el endpoint con service_role (bypasea RLS entero)
-- puede cancelarlas, y ahí es donde vive el enforcement de la ventana.
--
-- Semáforo `capacidad_snapshot_estadia IS NOT NULL` — mismo que F2-3-B
-- para no regresionar V2/V4a legacy (esas tienen fecha_fin pero no la
-- columna F2, siguen cancelables directo via anon).
--
-- COMPATIBILIDAD
--
-- Ninguna regresión esperada en flujos existentes:
--   * F1 picker (duracion_min NOT NULL, capacidad_snapshot_estadia NULL):
--     sigue cancelable via anon UPDATE — F2-3-D no cambió el flow F1.
--   * V1/V2/V4a/V4b legacy (capacidad_snapshot_estadia NULL): idem.
--   * Pendientes de cualquier variante: `estado='pendiente'`, la nueva
--     restricción NO aplica (necesita estado='confirmada' AND F2).
--   * F2 confirmadas: pasan por el endpoint (F2-3-D client ya branchea
--     hacia POST /api/agendamientos/cancelar via `usarEndpointCancel`).
--
-- IDEMPOTENTE — DROP POLICY IF EXISTS + CREATE POLICY. Re-correr = no-op.
--
-- APLICAR: staging (jmtadvdkicyylcwjcmcl) primero, correr V1/V2/V3 al
-- pie, luego prod (ouezpeeiwjwawauidrqq) cuando se promueva F2-3-D.
-- ============================================================================

DROP POLICY IF EXISTS agendamientos_tutor_cancel ON public.agendamientos;

CREATE POLICY agendamientos_tutor_cancel ON public.agendamientos
    FOR UPDATE
    TO public
    USING (
        tutor_id IN (
            SELECT id FROM public.usuarios_buscadores
            WHERE auth_user_id = auth.uid()
        )
        -- F2-3-D: F2 confirmadas fuera del scope. Solo el endpoint
        -- (service_role) puede cancelarlas, para enforcear la ventana
        -- cancelacion_min_horas_antes definida por el proveedor.
        AND NOT (
            capacidad_snapshot_estadia IS NOT NULL
            AND estado = 'confirmada'
        )
    )
    WITH CHECK (
        tutor_id IN (
            SELECT id FROM public.usuarios_buscadores
            WHERE auth_user_id = auth.uid()
        )
        AND estado = 'cancelada'
    );


-- ============================================================================
-- VERIFICACIONES (correr como statements separados)
-- ============================================================================

-- V1: la política existe con el USING nuevo (incluye la cláusula NOT).
--   SELECT policyname, pg_get_expr(qual, polrelid) AS using_clause,
--          pg_get_expr(with_check, polrelid) AS with_check_clause
--     FROM pg_policies
--    WHERE tablename = 'agendamientos'
--      AND policyname = 'agendamientos_tutor_cancel';
--   Esperado: using_clause contiene "NOT ((capacidad_snapshot_estadia IS
--   NOT NULL) AND (estado = 'confirmada'::agendamiento_estado))" o similar.

-- V2: reserva F2 confirmada NO se puede cancelar via anon UPDATE del tutor.
--   Setup: como usuario Camila (tutora, auth via session anon):
--     UPDATE agendamientos SET estado='cancelada'
--      WHERE id='<uuid de una F2 confirmada de Camila>';
--   Esperado: 0 filas afectadas (RLS filtra el USING).
--   Comparar con: antes del fix, esto retornaba 1 fila.

-- V3: reserva F1 confirmada del picker (duracion_min NOT NULL,
--     capacidad_snapshot_estadia NULL) SIGUE cancelable via anon UPDATE.
--   Setup: como usuario Camila:
--     UPDATE agendamientos SET estado='cancelada'
--      WHERE id='<uuid de una F1 confirmada de Camila>';
--   Esperado: 1 fila afectada (política pass — no es F2).

-- V4: solicitud pendiente cualquier variante sigue cancelable.
--   UPDATE agendamientos SET estado='cancelada'
--    WHERE id='<uuid de una pendiente de Camila>';
--   Esperado: 1 fila afectada (política pass — no es 'confirmada').

-- V5: endpoint POST /api/agendamientos/cancelar sigue funcionando para F2
--     confirmada dentro de ventana (service_role bypasea RLS).
--   POST /api/agendamientos/cancelar { agendamientoId: '<F2-confirmada>' }
--   con Authorization: Bearer <session Camila>
--   Esperado: 200 { success: true }. UPDATE efectivo (chequear con SELECT
--   de estado post-call).

-- V6: endpoint rechaza F2 confirmada FUERA de ventana con copy amable.
--   Requiere: mover fecha_preferida de una reserva F2 test a menos de N
--   horas del now via SQL (o Aldo cambia servicio a
--   cancelacion_min_horas_antes=99999 temporalmente). Llamar endpoint.
--   Esperado: 403 { error: "No puedes cancelar... quedan menos de N
--   horas...", reason: "ventana_cerrada" }. UPDATE NO efectivo (estado
--   sigue 'confirmada').

-- ============================================================================
-- FIN. Sin este fix, el endpoint F2-3-D es decorativo para su propósito.
-- ============================================================================
