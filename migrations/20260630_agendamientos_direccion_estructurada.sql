-- ============================================================================
-- migrations/20260630_agendamientos_direccion_estructurada.sql
--
-- Ola 1 del feature "direcciones estructuradas en agendamiento". Agrega 5
-- columnas a `agendamientos` para reemplazar el text libre actual de
-- `direccion_servicio` por un modelo estructurado (region + comuna + calle
-- + numero + info adicional). El catalogo de regiones/comunas vive en
-- lib/comunas.ts (16 regiones, 346 comunas, Ola 1 commit 1).
--
-- TODAS NULLABLE — el INSERT actual del modal (Fase 2 commit 1) no envia
-- ninguna de estas columnas. Las filas existentes quedan con NULL en todas.
-- Postgres acepta el INSERT sin tocar columnas nullable. Cero regresion en
-- comportamiento actual.
--
-- LEGACY direccion_servicio text — se mantiene como columna para que las
-- filas historicas de Fase 2 que tienen texto libre ('Mayecura 1290, Las
-- Condes') sigan siendo legibles. Render branching en /mis-solicitudes y
-- panel proveedor: si los 5 campos estructurados estan poblados → usar nuevo
-- formato; sino → fallback a direccion_servicio text. COMMENT marca la
-- columna como deprecated. Backfill manual de las filas se hace en un
-- UPDATE separado (no parte de esta migration).
--
-- NO afecta:
--   - UNIQUE parcial agendamientos_unique_pendiente_por_tutor_servicio:
--     indexa (tutor_id, servicio_id) WHERE estado='pendiente'. Las nuevas
--     columnas no estan en ningun lado del index. Sigue funcionando identico.
--   - Trigger set_respondido_at_on_response: solo lee NEW.estado y OLD.estado.
--   - Policies RLS: solo validan ownership + estado.
--   - Schema baseline 20260625_agendamientos_baseline.sql y migration
--     20260626 (columnas Fase 2): no se modifican.
--
-- IDEMPOTENTE: `ADD COLUMN IF NOT EXISTS` (PG 9.6+) + nombres de constraint
-- explicitos con `DO $$` + `IF NOT EXISTS` lookup en pg_constraint. Re-correr
-- es no-op.
--
-- APLICADA Y VERIFICADA: 2026-06-30 en staging (jmtadvdkicyylcwjcmcl) y prod
-- (ouezpeeiwjwawauidrqq). Las 4 verificaciones del bloque final dieron OK
-- en ambos. Backfill manual: staging convirtio 1 fila legacy; prod tenia 0
-- filas en `agendamientos` (sin agendamientos reales aun). Este archivo
-- queda en el repo para versionado/recovery — no se re-ejecuta porque ya
-- esta aplicada (igual es idempotente si se necesita).
-- ============================================================================


-- ============================================================================
-- COLUMNA 1 — region
-- Label canonico de la region administrativa de Chile (ej. "Metropolitana",
-- "Valparaiso", "Biobio"). 16 valores posibles segun lib/comunas.ts. No
-- agregamos CHECK de enum en BD porque el catalogo vive en TS — un cambio
-- en TS no debe requerir migration. Validacion la hace el modal client-side
-- (RegionComunaPicker solo permite elegir uno de los 16).
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS region text NULL;


-- ============================================================================
-- COLUMNA 2 — comuna
-- Label canonico de la comuna (ej. "Las Condes", "Vina del Mar"). 346
-- valores posibles. Sin CHECK de enum por la misma razon que region.
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS comuna text NULL;


-- ============================================================================
-- COLUMNA 3 — calle
-- Nombre de la calle/avenida/pasaje. Max 200 chars (CHECK defensivo).
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS calle text NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_calle_max_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_calle_max_check
            CHECK (calle IS NULL OR length(calle) <= 200);
    END IF;
END $$;


-- ============================================================================
-- COLUMNA 4 — numero
-- Texto libre — acepta "1290", "S/N", "1290-A", "12 Bis", "Lote 5". Max 30
-- chars (cubre los casos reales sin overhead).
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS numero text NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_numero_max_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_numero_max_check
            CHECK (numero IS NULL OR length(numero) <= 30);
    END IF;
END $$;


-- ============================================================================
-- COLUMNA 5 — direccion_info
-- Info adicional opcional: "Depto 502 torre B", "Casa interior", "Toque
-- el timbre 3 veces", instrucciones para el proveedor. Max 200 chars.
-- ============================================================================

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS direccion_info text NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_direccion_info_max_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_direccion_info_max_check
            CHECK (direccion_info IS NULL OR length(direccion_info) <= 200);
    END IF;
END $$;


-- ============================================================================
-- CHECK COMPUESTO — los 5 campos estructurados solo se pueblan cuando
-- modalidad_elegida='casa_tutor'. Defensa BD vs payload manipulado que
-- intente mandar direccion en otra modalidad. Permite todos NULL (V1, V2
-- legacy, V4b sin direccion historica, solicitudes Fase 1 sin modalidad).
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agendamientos_direccion_estructurada_solo_casa_tutor_check'
    ) THEN
        ALTER TABLE public.agendamientos
            ADD CONSTRAINT agendamientos_direccion_estructurada_solo_casa_tutor_check
            CHECK (
                (region IS NULL AND comuna IS NULL AND calle IS NULL
                 AND numero IS NULL AND direccion_info IS NULL)
                OR modalidad_elegida = 'casa_tutor'
            );
    END IF;
END $$;


-- ============================================================================
-- COMENTARIOS sobre las columnas
-- ============================================================================

COMMENT ON COLUMN public.agendamientos.region IS
    'Region administrativa de Chile (label canonico segun lib/comunas.ts, '
    '16 valores). Solo se popula cuando modalidad_elegida=casa_tutor.';

COMMENT ON COLUMN public.agendamientos.comuna IS
    'Comuna (label canonico segun lib/comunas.ts, 346 valores). Solo se '
    'popula cuando modalidad_elegida=casa_tutor.';

COMMENT ON COLUMN public.agendamientos.calle IS
    'Nombre de la calle/avenida/pasaje donde se presta el servicio. Max 200 '
    'chars. Solo se popula cuando modalidad_elegida=casa_tutor.';

COMMENT ON COLUMN public.agendamientos.numero IS
    'Numero de la direccion. Texto libre — acepta "S/N", "1290-A", "12 Bis", '
    '"Lote 5". Max 30 chars. Solo se popula cuando modalidad_elegida='
    'casa_tutor.';

COMMENT ON COLUMN public.agendamientos.direccion_info IS
    'Info adicional opcional (depto, casa interior, instrucciones para el '
    'proveedor). Max 200 chars. Solo se popula cuando modalidad_elegida='
    'casa_tutor.';

COMMENT ON COLUMN public.agendamientos.direccion_servicio IS
    'LEGACY — Fase 2 commit migracion 20260626. Reemplazada por region/'
    'comuna/calle/numero/direccion_info en Ola 1 (migracion 20260630). '
    'Filas historicas pre-Ola 1 pueden tener texto libre aqui; nuevas la '
    'dejan NULL. Render branching: si los 5 campos estructurados estan '
    'poblados, se usa el formato nuevo; sino, fallback a este texto.';


-- ============================================================================
-- VERIFICACIONES post-apply (correr y revisar antes de cerrar la ventana)
-- ============================================================================

-- V1: las 5 columnas nuevas existen, todas nullable
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'agendamientos'
--   AND column_name IN ('region', 'comuna', 'calle', 'numero', 'direccion_info')
-- ORDER BY column_name;

-- V2: los 4 constraints nuevos existen con definicion correcta
-- SELECT conname, pg_get_constraintdef(oid) AS definicion
-- FROM pg_constraint
-- WHERE conrelid = 'public.agendamientos'::regclass
--   AND conname IN (
--       'agendamientos_calle_max_check',
--       'agendamientos_numero_max_check',
--       'agendamientos_direccion_info_max_check',
--       'agendamientos_direccion_estructurada_solo_casa_tutor_check'
--   )
-- ORDER BY conname;

-- V3: los 3 constraints de Fase 2 siguen intactos
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.agendamientos'::regclass
--   AND conname IN (
--       'agendamientos_fecha_fin_posterior_check',
--       'agendamientos_modalidad_elegida_check',
--       'agendamientos_direccion_solo_casa_tutor_check'
--   );

-- V4: filas con direccion_servicio text quedan validas con las 5 nuevas en NULL
-- SELECT id, modalidad_elegida, direccion_servicio,
--        region, comuna, calle, numero, direccion_info
-- FROM public.agendamientos
-- WHERE direccion_servicio IS NOT NULL;


-- ============================================================================
-- BACKFILL manual (no parte de la migration, se corre aparte en cada entorno):
--
--   BEGIN;
--   UPDATE public.agendamientos
--   SET region = 'Metropolitana', comuna = 'Las Condes',
--       calle = 'Mayecura', numero = '1290', direccion_servicio = NULL
--   WHERE direccion_servicio = 'Mayecura 1290, Las Condes';
--   SELECT id, region, comuna, calle, numero, direccion_servicio
--   FROM public.agendamientos
--   WHERE region = 'Metropolitana' AND calle = 'Mayecura';
--   COMMIT;
--
-- Staging (2026-06-30): convirtio 1 fila.
-- Prod (2026-06-30): 0 filas (sin agendamientos reales todavia).
-- ============================================================================
