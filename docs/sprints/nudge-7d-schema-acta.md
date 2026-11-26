# Acta P5 — Schema change `nudge_perfil_enviado_at` (Sprint 1 PR 1)

Written for: el PO (Aldo). Sprint PROVEEDOR-PERFIL-NUDGE-7D PR 1/3. **Docs + migration file, cero código productivo**. Spec origen: [`docs/sprints/proveedor-perfil-nudge-plan.md`](proveedor-perfil-nudge-plan.md) § 3.1 Opción A.

---

## 1. Objetivo

Agregar columna `nudge_perfil_enviado_at timestamptz NULL` a `public.proveedores` para tracking de idempotency del nudge 7d+ post-signup que se implementará en PR 2/3 (branch `nudge-7d-impl`).

## 2. SQL a ejecutar en prod (PO ejecuta manual, patrón P5)

**Fase 1 — snapshot previo (verificación de estado inicial)**:

```sql
-- Confirmar que la columna NO existe aún (si existe, la migration es no-op).
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'proveedores'
   AND column_name  = 'nudge_perfil_enviado_at';
-- Esperado: 0 filas (columna no existe antes de la migration).
```

**Fase 2 — aplicación de la migration** (archivo `migrations/20261126_add_nudge_perfil_enviado_at.sql`):

```sql
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS nudge_perfil_enviado_at timestamptz;

COMMENT ON COLUMN public.proveedores.nudge_perfil_enviado_at IS
  'Timestamp del nudge 7d+ post-signup enviado al proveedor cuyo perfil
   sigue sin servicios activos publicados. Null = no enviado. Previene
   duplicados en re-corridas del cron (idempotency). Sprint PROVEEDOR-
   PERFIL-NUDGE-7D 2026-11-26.';
```

**Fase 3 — verificación post-aplicación**:

```sql
-- 3.1 Columna creada
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'proveedores'
   AND column_name  = 'nudge_perfil_enviado_at';
-- Esperado: 1 fila. data_type = 'timestamp with time zone', is_nullable = 'YES'.

-- 3.2 Comentario aplicado
SELECT col_description(
  (SELECT oid FROM pg_class WHERE relname = 'proveedores'
     AND relnamespace = 'public'::regnamespace),
  (SELECT ordinal_position FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'proveedores'
       AND column_name = 'nudge_perfil_enviado_at')
) AS comment_actual;
-- Esperado: el texto completo del COMMENT ON COLUMN.

-- 3.3 Nadie tiene el campo seteado todavía (idempotency bootstrap)
SELECT COUNT(*) AS proveedores_con_nudge_enviado
  FROM public.proveedores
 WHERE nudge_perfil_enviado_at IS NOT NULL;
-- Esperado: 0.

-- 3.4 Total de proveedores intacto post-ALTER (ADD COLUMN no cambia filas)
SELECT COUNT(*) AS total_proveedores
  FROM public.proveedores;
-- Esperado: 28 (valor pre-migration; ajustar si el valor cambió por
--   signups entre acta y ejecución).
```

**Fase 4 — rollback escrito (si verificación falla)**:

```sql
-- Caso: la columna se creó pero con tipo incorrecto, o el COMMENT no se
-- aplicó, o cualquier otra inconsistencia detectada en Fase 3.
BEGIN;
  ALTER TABLE public.proveedores
    DROP COLUMN IF EXISTS nudge_perfil_enviado_at;
COMMIT;
-- Post-rollback: re-correr Fase 1 para confirmar que la columna ya no
-- existe (esperado: 0 filas).
```

## 3. Blast radius

- **Mutation**: ADD COLUMN sobre `public.proveedores`. Zero filas afectadas en el shape de datos existentes — la columna nueva nace NULL para todos los proveedores.
- **Cascade**: ninguna. No es FK, no es UNIQUE, no es NOT NULL, no es DEFAULT con compute. Es columna puramente de tracking.
- **Riesgo**: cero. El peor caso (rollback) es un DROP COLUMN sobre una columna que acabó de crearse — no destruye datos históricos.

## 4. Paridad staging ↔ prod

**Primero**: aplicar a staging via MCP `supabase-staging-rw`. El auditor ejecuta directo tras GO del PO.

**Después**: PO ejecuta en prod via SQL Editor de Supabase Studio o migration CLI. Mismo bloque de las Fases 1→4 exacto, cambiando solo el proyecto target.

## 5. Dependencias downstream

- **PR 2 `nudge-7d-impl`** (Sprint 1 PR 2): cron logic + email template. Consume `nudge_perfil_enviado_at`. Depende de que esta migration esté aplicada a staging + prod ANTES del merge.
- **PR 3 `nudge-7d-admin`** (Sprint 1 PR 3, opcional): filtro admin dashboard "perfil incompleto > 7 días". Consume `nudge_perfil_enviado_at` para mostrar estado del nudge. Depende de PR 2 merged.

## 6. Checklist operacional

### Auditor (yo)
- [x] Preparar archivo migration en `migrations/20261126_add_nudge_perfil_enviado_at.sql`.
- [x] Preparar este acta con SQL exacto + verificaciones + rollback.
- [ ] Aplicar a staging via MCP `supabase-staging-rw` tras GO del PO.
- [ ] Reportar outputs de Fase 1 + Fase 3 a staging (snapshot → 0 → aplicar → 1 fila tipo esperado).

### PO
- [ ] Revisar este acta.
- [ ] Autorizar aplicación a staging al auditor.
- [ ] Post-staging verde: aplicar a prod manualmente (SQL Editor Studio) usando el mismo SQL de las Fases 1→4.
- [ ] Reportar outputs de prod al auditor para confirmar paridad.
- [ ] Autorizar arranque Sprint 1 PR 2 (nudge-7d-impl).

## 7. Trazabilidad

- Spec origen: [`docs/sprints/proveedor-perfil-nudge-plan.md`](proveedor-perfil-nudge-plan.md) § 3.1 Opción A.
- Archivo migration: `migrations/20261126_add_nudge_perfil_enviado_at.sql`.
- Dispatch origen: PO 2026-11-26, Sprint 1 (PROVEEDOR-PERFIL-NUDGE-7D).
- Branch: `nudge-7d-schema` (15 chars, ≤17 límite dispatch).
- Reglas aplicables: P5 (evidencia por fase), P6 (nombres columna verificados via information_schema), idempotencia IF NOT EXISTS.
