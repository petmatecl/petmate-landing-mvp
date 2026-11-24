# Acta P5 · EVENTOS MVP PULIDO · ALTER NOT NULL direccion + organizador_nombre (PR 1 del sprint)

Written for: el PO (Aldo). Acta de entrega del PR 1 del sprint EVENTOS MVP PULIDO.

## Scope

ALTER simple sobre `public.eventos`:
- `DROP NOT NULL` en `direccion`.
- `DROP NOT NULL` en `organizador_nombre`.

Justificación PO: "no es necesario ser tan estricto si seré yo mismo quien suba los eventos". Scope del sprint EVENTOS-MVP-PULIDO 6 ajustes post-apply Feria Navideña (listo en prod ~15:04 CLT, PO detectó issues de pulido al verla live).

Columnas required post-ALTER (quedan iguales, 8/22 columnas NOT NULL):

| Columna | Nullable |
|---|---|
| `nombre` | NO |
| `fecha` | NO |
| `lugar_nombre` | NO |
| `comuna` | NO |
| `descripcion` | NO |
| `tipo` | NO (+ CHECK IN enum) |
| `entrada_gratuita` | NO (DEFAULT false) |
| `publicado` | NO (DEFAULT false) |
| `direccion` | **YES (post-ALTER)** |
| `organizador_nombre` | **YES (post-ALTER)** |

## Pre-verificación en staging (2026-11-24 PM)

ALTER aplicado via MCP `supabase-staging-rw` sobre proyecto `jmtadvdkicyylcwjcmcl`. Verificación post-apply:

| Columna | `is_nullable` esperado | Resultado staging |
|---|---|---|
| `direccion` | YES | YES ✓ |
| `organizador_nombre` | YES | YES ✓ |

Confirmación negativa: las otras 8 required siguen `NOT NULL` ✓.

## Instrucciones para apply en prod

**Ejecutor**: el PO (Aldo). Yo (auditor) NO ejecuto DDL contra prod.

**Via Supabase Studio prod** (proyecto `ouezpeeiwjwawauidrqq`):

1. Abrir `https://supabase.com/dashboard/project/ouezpeeiwjwawauidrqq/sql/new`.
2. Pegar el contenido de [migrations/20261124_eventos_mvp_pulido.sql](../../migrations/20261124_eventos_mvp_pulido.sql) (archivo completo, 2 ALTERs + comentarios).
3. Click **Run**.
4. Esperar "Success. No rows returned".
5. Query de verificación:

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'eventos'
  AND column_name IN ('direccion', 'organizador_nombre')
ORDER BY column_name;
```

**Esperado**:
- `direccion` → `YES`
- `organizador_nombre` → `YES`

## Rollback

Prerequisito: todas las filas existentes de `public.eventos` deben tener valores NO NULL en ambas columnas (sino el `ALTER SET NOT NULL` falla con `column contains null values`).

```sql
SELECT COUNT(*) FROM public.eventos WHERE direccion IS NULL OR organizador_nombre IS NULL;
-- Si > 0: migrar/completar los null antes del rollback.
ALTER TABLE public.eventos ALTER COLUMN direccion SET NOT NULL;
ALTER TABLE public.eventos ALTER COLUMN organizador_nombre SET NOT NULL;
```

## Dependencia con PR 2 del sprint

PR 2 (link nav Header + página detalle `/eventos/[id]` + OG tags + sitemap dinámico) arranca cuando el PO reporte **"ALTER aplicada en prod ✓"**. El código del PR 1 (form admin sin `required` + null-handling display + fix CSS imagen) es defense-in-depth: funciona con y sin el ALTER aplicado (antes del apply, el admin no puede dejar null porque la BD rechaza; post-apply, el admin puede omitir + display handles gracefully).

## Trazabilidad

- Sprint origen: dispatch PO 2026-11-24 post-apply Feria Navideña.
- PR 1 code: `pages/admin/eventos/*` form admin update + `components/Admin/EventoForm.tsx` + `components/Home/EventosWidget.tsx` + `pages/eventos.tsx` null-handling.
- Migration previa: [`docs/sprints/eventos-schema-sql-acta.md`](eventos-schema-sql-acta.md) (acta P5 del sprint EVENTOS MVP original).
- Pre-verificación staging: aplicada 2026-11-24 PM con MCP `supabase-staging-rw` (usuario `postgres`).

## Trigger próximo paso

PO reporta "ALTER aplicada en prod ✓" → arranco PR 2 `ev-pulido-2` (link nav + página detalle `/eventos/[id]` + OG tags + sitemap dinámico).
