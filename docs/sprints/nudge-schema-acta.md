# Acta P5 — Schema change `nudge_count` (Sprint A PR 1 refined)

Written for: el PO (Aldo). Sprint PROVEEDOR-PERFIL-NUDGE-7D PR 1 refined per dispatch 2026-11-26 Sprint A. **Docs + migration file, cero código productivo**. Spec origen: [`docs/sprints/proveedor-perfil-nudge-plan.md`](proveedor-perfil-nudge-plan.md).

**Contexto**: el dispatch 2026-11-26 Sprint A refinó la semántica: en vez de "1 nudge forever" con un solo timestamp, se agrega un contador `nudge_count` que permite enviar hasta 2 nudges (día 7 y día 14) con 7+ días de gap entre ellos. Esta acta complementa la [`nudge-7d-schema-acta.md`](nudge-7d-schema-acta.md) (PR #228 c254d48 merged).

---

## 1. Objetivo

Agregar columna `nudge_count integer NOT NULL DEFAULT 0` a `public.proveedores` para contador de nudges enviados. Semántica:

- `0` → proveedor no recibió ninguno (default inicial, todos en prod).
- `1` → recibió primer nudge (día 7 post-signup).
- `2` → recibió segundo nudge (día 14 post-signup aprox, +7d del primero).
- `>=2` → stop (no enviar más).

Combinación con la columna pre-existente `nudge_perfil_enviado_at` (de PR #228):

- `nudge_perfil_enviado_at` **funciona como `last_nudge_sent_at`** del spec dispatch — timestamp del último nudge enviado. Nombre levemente distinto pero semántica idéntica.
- `nudge_count` funciona como contador explícito para el max=2 enforcement.

Query idempotency del cron (futuro PR 2):

```sql
SELECT ...
FROM proveedores p
WHERE p.nudge_count < 2
  AND (p.nudge_perfil_enviado_at IS NULL
       OR p.nudge_perfil_enviado_at < NOW() - INTERVAL '7 days')
  AND p.estado = 'aprobado'
  AND p.email_onboarding_at IS NOT NULL
  AND p.created_at < NOW() - INTERVAL '7 days'
  AND p.created_at > NOW() - INTERVAL '60 days'
  AND NOT EXISTS (
    SELECT 1 FROM servicios_publicados sp
    WHERE sp.proveedor_auth_id = p.auth_user_id AND sp.activo = true
  );
```

## 2. SQL a ejecutar (PO ejecuta manual patrón P5)

**Fase 1 — snapshot previo**:

```sql
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'proveedores'
   AND column_name  = 'nudge_count';
-- Esperado: 0 filas (columna no existe antes de la migration).

SELECT column_name
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'proveedores'
   AND column_name  = 'nudge_perfil_enviado_at';
-- Esperado: 1 fila (columna agregada por PR #228 c254d48). Si 0 filas,
-- NO aplicar esta migration — aplicar PRIMERO la migration previa
-- 20261126_add_nudge_perfil_enviado_at.sql.
```

**Fase 2 — aplicación de la migration**:

```sql
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS nudge_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.proveedores.nudge_count IS
  'Contador de nudges "¿por qué no has publicado?" enviados al proveedor.
   0 = no recibió ninguno. 1 = recibió el primer nudge (7 días post-signup).
   2 = recibió el segundo nudge (14 días post-signup). >=2 = stop (no más
   nudges). Max estricto 2 per decisión producto. Sprint PROVEEDOR-PERFIL-
   NUDGE-7D 2026-11-26.';
```

**Fase 3 — verificación post-aplicación**:

```sql
-- 3.1 Columna creada
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'proveedores'
   AND column_name  = 'nudge_count';
-- Esperado: 1 fila. data_type='integer', is_nullable='NO',
--   column_default='0'.

-- 3.2 Todas las filas existentes tienen nudge_count=0 (default aplicado)
SELECT COUNT(*) AS proveedores_sin_nudge,
       COUNT(*) FILTER (WHERE nudge_count > 0) AS proveedores_con_nudge
  FROM public.proveedores;
-- Esperado: proveedores_sin_nudge=28 (o el total actual),
--           proveedores_con_nudge=0.

-- 3.3 Comentario aplicado
SELECT col_description(
  (SELECT oid FROM pg_class WHERE relname = 'proveedores'
     AND relnamespace = 'public'::regnamespace),
  (SELECT ordinal_position FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'proveedores'
       AND column_name = 'nudge_count')
) AS comment_actual;
-- Esperado: el texto completo del COMMENT ON COLUMN.
```

**Fase 4 — rollback escrito (si verificación falla)**:

```sql
BEGIN;
  ALTER TABLE public.proveedores
    DROP COLUMN IF EXISTS nudge_count;
COMMIT;
```

## 3. Blast radius

- **Mutation**: ADD COLUMN NOT NULL DEFAULT 0 sobre `public.proveedores`. Postgres aplica el default a filas existentes automáticamente (ADD COLUMN NOT NULL con DEFAULT es seguro per Postgres docs).
- **Cascade**: ninguna.
- **Riesgo**: cero. El peor caso (rollback) es DROP COLUMN sobre una columna que acabó de crearse — no destruye datos históricos.

## 4. Paridad staging ↔ prod

Primero aplicar a staging via MCP `supabase-staging-rw` (tras GO del PO). Después PO aplica en prod via SQL Editor Supabase Studio.

## 5. Dependencias downstream

- **PR 2 `nudge-cron`**: consume `nudge_count` + `nudge_perfil_enviado_at` para idempotency. Requiere esta migration + la previa (#228) aplicadas antes del merge.
- **PR 3 `nudge-email`**: email template Resend. Independiente del schema pero mergeado post PR 2 para integración.
- **PR 4 `nudge-unsub`**: endpoint `/unsubscribe` + columna `nudge_opt_out boolean` o tabla `email_opt_outs`. **Schema change ADICIONAL** que podría incluirse en este PR o en PR 4 propio — sugerencia: en PR 4 para mantener alcance separado.

## 6. Checklist operacional

### Auditor (yo)
- [x] Preparar archivo migration `migrations/20261126_add_nudge_count.sql`.
- [x] Preparar este acta con SQL exacto + verificaciones + rollback.
- [ ] Aplicar a staging via MCP `supabase-staging-rw` tras GO del PO.
- [ ] Reportar outputs de Fase 1 + Fase 3 a staging.

### PO
- [ ] Revisar este acta.
- [ ] Autorizar aplicación a staging al auditor.
- [ ] Post-staging verde: aplicar a prod manualmente usando las Fases 1→4.
- [ ] Autorizar arranque Sprint A PR 2 (`nudge-cron`).

## 7. Trazabilidad

- Spec origen: [`docs/sprints/proveedor-perfil-nudge-plan.md`](proveedor-perfil-nudge-plan.md).
- Migration previa referenciada: `migrations/20261126_add_nudge_perfil_enviado_at.sql` (PR #228 c254d48).
- Archivo migration: `migrations/20261126_add_nudge_count.sql`.
- Acta previa: [`nudge-7d-schema-acta.md`](nudge-7d-schema-acta.md).
- Dispatch origen: PO 2026-11-26 Sprint A refined.
- Branch: `nudge-schema` (12 chars, ≤13 límite dispatch).
- Reglas aplicables: P5 (evidencia por fase), P6 (nombres columna verificados), idempotencia IF NOT EXISTS.
