-- ========================================================================
-- Migration CORRECTIVA: agendamientos FKs RESTRICT en vez de CASCADE
-- (post-mortem hallazgo PO 2026-08-14 verificación FKs prod).
--
-- HALLAZGO:
--   Post-aplicación de migrations/20260814_fks_habilitantes.sql en prod,
--   las 3 FKs de agendamientos quedaron con ON DELETE CASCADE cuando la
--   tabla aprobada del MIGRATION_FKS_HABILITANTES.md §1 declaraba
--   RESTRICT explícito para las 3. Verificación PO:
--     agendamientos_servicio_id_fkey    → CASCADE   (esperado RESTRICT)
--     agendamientos_proveedor_id_fkey   → CASCADE   (esperado RESTRICT)
--     agendamientos_tutor_id_fkey       → CASCADE   (esperado RESTRICT)
--
--   Las otras 7 FKs quedaron correctas (servicios_publicados.categoria_id
--   quedó NO ACTION que es equivalente a RESTRICT en Postgres).
--
-- CAUSA TÉCNICA:
--   El bloque `DO $$ IF NOT EXISTS` de la migration original verificaba
--   por NOMBRE de constraint, no por SEMÁNTICA. Hipótesis: prod ya
--   tenía estas 3 constraints con esos nombres exactos (creadas por
--   Supabase u otra migration histórica) con CASCADE — el IF NOT EXISTS
--   matcheó, skipeó el ALTER, y las constraints pre-existentes (con
--   CASCADE) quedaron. La migration hizo NO-OP semántico para esas 3.
--
--   Bug de diseño: confundí "idempotente para re-ejecución" con
--   "garantiza el estado deseado". Idempotencia por nombre no garantiza
--   semántica correcta si el nombre ya existe con definición distinta.
--
-- CONSECUENCIA PARA A2:
--   Con las 3 en CASCADE, el DELETE FROM proveedores WHERE es_ejemplo=true
--   se llevaría en silencio TODOS los agendamientos vinculados —
--   invalida la columna `agendamientos_bloquea_delete` del dry-run §4.2
--   del doc, y contradice el diseño de seguridad aprobado.
--   Ola 2 y A2 quedan bloqueados hasta que esta correctiva aplique.
--
-- ESTRATEGIA FIX:
--   DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT con la definición correcta.
--   La secuencia DROP+ADD garantiza el delete_rule esperado
--   independiente de la definición previa (fue CASCADE o RESTRICT).
--
--   Aplicar en STAGING primero + verificar diff automático + luego PROD.
--
-- ROLLBACK:
--   Bloque final comentado (revierte a CASCADE — no recomendado, es lo
--   que motivó esta correctiva). Solo usar si un caso operacional
--   inesperado hace que RESTRICT bloquee un flow legítimo antes del
--   flow eliminación cuenta tutor (Ley 21.719, ver BACKLOG).
-- ========================================================================

BEGIN;

-- ------------------------------------------------------------------------
-- 1. agendamientos.servicio_id → RESTRICT
-- ------------------------------------------------------------------------
ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_servicio_id_fkey;
ALTER TABLE agendamientos
    ADD CONSTRAINT agendamientos_servicio_id_fkey
    FOREIGN KEY (servicio_id) REFERENCES servicios_publicados(id)
    ON DELETE RESTRICT;

-- ------------------------------------------------------------------------
-- 2. agendamientos.proveedor_id → RESTRICT
-- ------------------------------------------------------------------------
ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_proveedor_id_fkey;
ALTER TABLE agendamientos
    ADD CONSTRAINT agendamientos_proveedor_id_fkey
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
    ON DELETE RESTRICT;

-- ------------------------------------------------------------------------
-- 3. agendamientos.tutor_id → RESTRICT
--    (Ver comment inline en 20260814_fks_habilitantes.sql sobre disparador
--    legal Ley 21.719 diciembre 2026 y ruta correcta al construir flow
--    eliminación cuenta tutor.)
-- ------------------------------------------------------------------------
ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_tutor_id_fkey;
ALTER TABLE agendamientos
    ADD CONSTRAINT agendamientos_tutor_id_fkey
    FOREIGN KEY (tutor_id) REFERENCES usuarios_buscadores(id)
    ON DELETE RESTRICT;

-- ========================================================================
-- Verificación AUTOMÁTICA post-migration — diff aplicado vs esperado.
-- Si alguna fila no matchea el delete_rule esperado, RAISE EXCEPTION
-- fuerza ROLLBACK. Aprendizaje P8: la verificación debe fallar loud si
-- el estado real no coincide con el declarado, no solo mostrar un dump.
-- ========================================================================
DO $$
DECLARE
    esperado CONSTANT text[][] := ARRAY[
        ['agendamientos_servicio_id_fkey',    'RESTRICT'],
        ['agendamientos_proveedor_id_fkey',   'RESTRICT'],
        ['agendamientos_tutor_id_fkey',       'RESTRICT'],
        ['agendamientos_mascota_id_fkey',     'SET NULL'],
        ['servicios_publicados_proveedor_id_fkey',  'CASCADE'],
        ['servicios_publicados_categoria_id_fkey',  'NO ACTION'],  -- equivalente a RESTRICT en PG
        ['evaluaciones_servicio_id_fkey',     'CASCADE'],
        ['evaluaciones_proveedor_id_fkey',    'CASCADE'],
        ['contactos_servicio_id_fkey',        'CASCADE'],
        ['contactos_proveedor_id_fkey',       'CASCADE']
    ];
    fila text[];
    actual_rule text;
    fallos int := 0;
    fail_msg text := '';
BEGIN
    FOREACH fila SLICE 1 IN ARRAY esperado
    LOOP
        SELECT rc.delete_rule INTO actual_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_schema='public'
          AND tc.constraint_name = fila[1];

        IF actual_rule IS NULL THEN
            fallos := fallos + 1;
            fail_msg := fail_msg || format(E'\n  MISSING: %s (esperado %s)', fila[1], fila[2]);
        ELSIF actual_rule <> fila[2] THEN
            fallos := fallos + 1;
            fail_msg := fail_msg || format(E'\n  MISMATCH: %s → aplicado=%s, esperado=%s', fila[1], actual_rule, fila[2]);
        END IF;
    END LOOP;

    IF fallos > 0 THEN
        RAISE EXCEPTION E'Verificación FKs falló (% divergencia(s) vs esperado):%\n\nMigration NO se commiteó.', fallos, fail_msg;
    ELSE
        RAISE NOTICE E'✅ Verificación FKs OK — las 10 constraints matchean la tabla aprobada.';
    END IF;
END $$;

-- Verificación final visual (redundante con el DO $$ arriba, pero útil
-- para leer el estado con ojos humanos también):
SELECT tc.table_name, tc.constraint_name, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_schema='public'
  AND tc.constraint_type='FOREIGN KEY'
  AND tc.constraint_name IN (
    'agendamientos_servicio_id_fkey',
    'agendamientos_proveedor_id_fkey',
    'agendamientos_tutor_id_fkey',
    'agendamientos_mascota_id_fkey',
    'servicios_publicados_proveedor_id_fkey',
    'servicios_publicados_categoria_id_fkey',
    'evaluaciones_servicio_id_fkey',
    'evaluaciones_proveedor_id_fkey',
    'contactos_servicio_id_fkey',
    'contactos_proveedor_id_fkey'
  )
ORDER BY tc.table_name, tc.constraint_name;

COMMIT;

-- ========================================================================
-- ROLLBACK (descomentar SOLO si RESTRICT bloquea un flow legítimo
-- inesperado; recuerda que perder el bloqueo re-abre el riesgo de
-- borrar proveedor con reservas activas → historial destruido silente)
-- ========================================================================
-- BEGIN;
-- ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_servicio_id_fkey;
-- ALTER TABLE agendamientos
--     ADD CONSTRAINT agendamientos_servicio_id_fkey
--     FOREIGN KEY (servicio_id) REFERENCES servicios_publicados(id)
--     ON DELETE CASCADE;
-- ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_proveedor_id_fkey;
-- ALTER TABLE agendamientos
--     ADD CONSTRAINT agendamientos_proveedor_id_fkey
--     FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
--     ON DELETE CASCADE;
-- ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_tutor_id_fkey;
-- ALTER TABLE agendamientos
--     ADD CONSTRAINT agendamientos_tutor_id_fkey
--     FOREIGN KEY (tutor_id) REFERENCES usuarios_buscadores(id)
--     ON DELETE CASCADE;
-- COMMIT;
