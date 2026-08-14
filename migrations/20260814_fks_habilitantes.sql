-- ========================================================================
-- Migration: FKs habilitantes pre-Ola 2 (sprint bug1-fks 2026-08-14)
--
-- Alcance: 10 constraints FOREIGN KEY sobre las relaciones críticas
-- documentadas en MIGRATION_FKS_HABILITANTES.md tabla ON DELETE justificada.
--
-- PRERREQUISITO: correr las 10 queries de auditoría del §2 del
-- MIGRATION_FKS_HABILITANTES.md ANTES de este archivo. Si alguna devuelve
-- rows huérfanas, cleanup PRIMERO — de lo contrario, la migration falla
-- con ERROR: insert or update on table "X" violates foreign key
-- constraint "Y".
--
-- Idempotente: cada FK se agrega solo si no existe (verificación via
-- information_schema en DO $$ block).
--
-- Aplicar en STAGING primero (Supabase Studio SQL Editor
-- jmtadvdkicyylcwjcmcl), verificar admin panel + smoke A2, luego PROD
-- (ouezpeeiwjwawauidrqq).
--
-- Rollback: bloque final comentado, descomentar y ejecutar para revertir.
-- ========================================================================

BEGIN;

-- ------------------------------------------------------------------------
-- 1. agendamientos.servicio_id → servicios_publicados.id ON DELETE RESTRICT
--    Historial de reservas del servicio es evidencia. RESTRICT bloquea
--    borrar servicio con reservas — fuerza cancelar primero.
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='agendamientos'
          AND constraint_name='agendamientos_servicio_id_fkey'
    ) THEN
        ALTER TABLE agendamientos
            ADD CONSTRAINT agendamientos_servicio_id_fkey
            FOREIGN KEY (servicio_id) REFERENCES servicios_publicados(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 2. agendamientos.proveedor_id → proveedores.id ON DELETE RESTRICT
--    Idem: proveedor con reservas activas no se borra por accidente.
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='agendamientos'
          AND constraint_name='agendamientos_proveedor_id_fkey'
    ) THEN
        ALTER TABLE agendamientos
            ADD CONSTRAINT agendamientos_proveedor_id_fkey
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 3. agendamientos.tutor_id → usuarios_buscadores.id ON DELETE RESTRICT
--    Tutor con reservas no puede borrar cuenta silente. RESTRICT fuerza
--    handling explícito.
--
--    ⚠️ DISPARADOR LEGAL — Ley 21.719 de Protección de Datos Personales
--    de Chile entra en vigencia diciembre 2026 (Pawnecta va a estar
--    operando para entonces). Incorpora derecho de supresión —
--    RESTRICT actual IMPIDE que un tutor pueda eliminar su cuenta si
--    tiene reservas históricas.
--
--    Ruta correcta cuando se construya el flow de eliminación de cuenta:
--    NO cambiar RESTRICT por CASCADE (borrar cuenta = borrar historial
--    del proveedor, doble violación de derechos + pérdida de evidencia
--    de facturación). Alternativas válidas:
--      (a) Anonimización in-place: mantener la fila usuarios_buscadores
--          con datos personales removidos (nombre='(usuario eliminado)',
--          email='', rut=NULL). tutor_id sigue apuntando pero sin PII.
--          Ver ítem BACKLOG.md > 'Flow eliminación cuenta tutor (Ley
--          21.719)'.
--      (b) Migrar a SET NULL con tutor_nombre_snapshot al INSERT del
--          agendamiento (nombre del tutor congelado como texto en la
--          fila del agendamiento, tutor_id nullable). Cambio schema
--          adicional pero decouple total.
--
--    Trigger para revisar esta FK: diciembre 2026 (vigencia Ley 21.719)
--    o cuando se implemente flow formal de eliminación de cuenta.
--    Cualquiera venga primero.
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='agendamientos'
          AND constraint_name='agendamientos_tutor_id_fkey'
    ) THEN
        ALTER TABLE agendamientos
            ADD CONSTRAINT agendamientos_tutor_id_fkey
            FOREIGN KEY (tutor_id) REFERENCES usuarios_buscadores(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 4. agendamientos.mascota_id → mascotas.id ON DELETE SET NULL (NULLABLE)
--    Mascota puede desaparecer; agendamiento histórico queda con
--    tipo_mascota_texto fallback.
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='agendamientos'
          AND constraint_name='agendamientos_mascota_id_fkey'
    ) THEN
        ALTER TABLE agendamientos
            ADD CONSTRAINT agendamientos_mascota_id_fkey
            FOREIGN KEY (mascota_id) REFERENCES mascotas(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 5. servicios_publicados.proveedor_id → proveedores.id ON DELETE CASCADE
--    Servicios pertenecen al proveedor. Al borrar proveedor (no
--    bloqueado por #2 solo si NO tiene reservas), se borran sus servicios.
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='servicios_publicados'
          AND constraint_name='servicios_publicados_proveedor_id_fkey'
    ) THEN
        ALTER TABLE servicios_publicados
            ADD CONSTRAINT servicios_publicados_proveedor_id_fkey
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 6. servicios_publicados.categoria_id → categorias_servicio.id ON DELETE RESTRICT
--    Categoría con servicios no se debe borrar por accidente.
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='servicios_publicados'
          AND constraint_name='servicios_publicados_categoria_id_fkey'
    ) THEN
        ALTER TABLE servicios_publicados
            ADD CONSTRAINT servicios_publicados_categoria_id_fkey
            FOREIGN KEY (categoria_id) REFERENCES categorias_servicio(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 7. evaluaciones.servicio_id → servicios_publicados.id ON DELETE CASCADE
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='evaluaciones'
          AND constraint_name='evaluaciones_servicio_id_fkey'
    ) THEN
        ALTER TABLE evaluaciones
            ADD CONSTRAINT evaluaciones_servicio_id_fkey
            FOREIGN KEY (servicio_id) REFERENCES servicios_publicados(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 8. evaluaciones.proveedor_id → proveedores.id ON DELETE CASCADE
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='evaluaciones'
          AND constraint_name='evaluaciones_proveedor_id_fkey'
    ) THEN
        ALTER TABLE evaluaciones
            ADD CONSTRAINT evaluaciones_proveedor_id_fkey
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 9. contactos.servicio_id → servicios_publicados.id ON DELETE CASCADE
--    Contactos son tracking del servicio; si servicio se borra, se borran.
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='contactos'
          AND constraint_name='contactos_servicio_id_fkey'
    ) THEN
        ALTER TABLE contactos
            ADD CONSTRAINT contactos_servicio_id_fkey
            FOREIGN KEY (servicio_id) REFERENCES servicios_publicados(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------------------------
-- 10. contactos.proveedor_id → proveedores.id ON DELETE CASCADE
-- ------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema='public' AND table_name='contactos'
          AND constraint_name='contactos_proveedor_id_fkey'
    ) THEN
        ALTER TABLE contactos
            ADD CONSTRAINT contactos_proveedor_id_fkey
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- ========================================================================
-- Verificación post-migration — debería retornar 10 rows
-- ========================================================================
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
-- ROLLBACK (descomentar y ejecutar para revertir)
-- ========================================================================
-- BEGIN;
-- ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_servicio_id_fkey;
-- ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_proveedor_id_fkey;
-- ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_tutor_id_fkey;
-- ALTER TABLE agendamientos DROP CONSTRAINT IF EXISTS agendamientos_mascota_id_fkey;
-- ALTER TABLE servicios_publicados DROP CONSTRAINT IF EXISTS servicios_publicados_proveedor_id_fkey;
-- ALTER TABLE servicios_publicados DROP CONSTRAINT IF EXISTS servicios_publicados_categoria_id_fkey;
-- ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_servicio_id_fkey;
-- ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_proveedor_id_fkey;
-- ALTER TABLE contactos DROP CONSTRAINT IF EXISTS contactos_servicio_id_fkey;
-- ALTER TABLE contactos DROP CONSTRAINT IF EXISTS contactos_proveedor_id_fkey;
-- COMMIT;
