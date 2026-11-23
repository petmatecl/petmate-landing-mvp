# PII-VIEW-TIGHT — Plan ejecutable sábado 2026-11-21

**Fecha**: 2026-11-19 (preparado) · **Ejecución**: sábado 2026-11-21 · **Autor plan**: auditor · **Ejecución SQL**: PO (yo acompaño chat).

**Objetivo**: cerrar el leak estructural de `nombre` + `apellido_p` + `apellido_m` del payload público JSON de la vista `proveedores_publicos` y del RPC `buscar_servicios`. Pre-requisito Ley 21.719 (vigencia 01-12-2026).

**Dependencias ya resueltas**:
- Migración `20260731_buscar_servicios_agenda_activa_fix.sql` aplicada en prod 2026-11-19 PM (drift staging-vs-prod cerrado). Resultado: 8/21 servicios con badge "Reserva online". Sin errores, V1/V2/V3/V4 verdes.
- Diagnóstico de los 9 puntos de revisión del PO cerrado (ver turno 2026-11-19 PM).
- Paridad `display_name_sql` SQL vs `displayName()` JS validada empíricamente (25/25 prod + 22/22 staging limpios, cero whitespace raro en `nombre`).
- Pregunta cron `recordatorio-mensajes`: cero envíos post-backfill (conv `a11e7a8e` tiene último mensaje 2026-01-21, >24h del cutoff → cron skipea; conv `9a28d98b` tiene 0 mensajes → cron skipea).

## Resumen de piezas (orden cronológico del sábado)

1. **Paso 1 — EXPAND SQL** (PO ejecuta): agregar `display_name_sql` + `display_name` a la vista + migrar RPC a usar el helper + eliminar filter `apellido_p` del `p_texto`. Puramente aditivo, callers viejos siguen.
2. **Paso 2 — MIGRATE PR** (yo armo + PR + merge): callers de la vista + RPC cambian a leer `display_name` / `proveedor_nombre` nuevo. Remover `enrichServiceResultsWithDisplayName` donde ya no hace falta.
3. **Paso 3 — CONTRACT SQL** (PO ejecuta): `DROP VIEW + CREATE VIEW` sin `nombre`/`apellido_p`/`apellido_m` + restaurar grants + `security_invoker=false`.
4. **Backfill conversations** (PO ejecuta): `UPDATE conversations SET proveedor_auth_id = sitter_id WHERE proveedor_auth_id IS NULL` con guardas DO + abort si N inicial ≠ 2 o N post ≠ 0.
5. **Verificación empírica anon REST** (yo ejecuto via curl): hit a `https://ouezpeeiwjwawauidrqq.supabase.co/rest/v1/proveedores_publicos?select=*&limit=1` con anon key → verificar que response NO contiene keys `nombre` ni `apellido_p` ni `apellido_m`.

## Horario propuesto (6 slots)

| Hora CLT | Actividad | Actor | Duración |
|---|---|---|---|
| 09:30 | Pre-flight: yo paso bloques SQL finalizados + checklist | yo | 15 min |
| 09:45 | Paso 1 SQL EXPAND en Supabase Studio prod (snapshot + apply + V1/V2) | PO | 20 min |
| 10:15 | PR migrate (yo abro + CI corre contra preview staging) | yo | 1-1.5 h |
| 11:30 | QA preview PR migrate + GO merge | PO | 15 min |
| 11:45 | Merge PR migrate → deploy prod (automático Vercel, ~1-2 min) | yo (merge) | 5 min |
| 11:50 | Verificación empírica post-merge prod (ficha + perfil + home + explorar siguen funcionando con `display_name` nuevo) | yo via curl + snapshot DOM | 15 min |
| 12:05 | Paso 3 SQL CONTRACT (snapshot + apply + V3/V4 + curl REST anon) | PO + yo | 20 min |
| 12:25 | Backfill conversations (bloque DO con abort) | PO | 10 min |
| 12:35 | Acta de cierre PII-VIEW-TIGHT + entrega al PO | yo | 15 min |

**Total ventana**: ~3 h 05 min desde 09:30 hasta 12:35 CLT. Buffer tarde para imprevistos.

## Criterios de GO / NO-GO por paso

### Paso 1 EXPAND (abort si:)
- V1 `pg_get_function_result` NO contiene `display_name` al final de las columnas de `proveedores_publicos` o `proveedor_nombre` del RPC NO retorna formato `"Nombre I."`.
- V2 `SELECT buscar_servicios(p_limit:=3)` retorna error cualquiera (regressión funcional).
- V3 `SELECT display_name_sql(nombre_publico, nombre, apellido_p)` para alguna fila retorna NULL (función debe garantizar fallback `'Proveedor'`).

Acción si abort: ejecutar snapshot rollback (`pg_get_viewdef` + `pg_get_functiondef` originales) + escalar.

### Paso 2 MIGRATE PR (abort si:)
- Playwright suite error-audit fail con regresión en `pii-nombre-publico/superficies-publicas.spec.ts` o `pii-chat-nombre/superficies-autenticadas.spec.ts`.
- CI typecheck fail (algún caller quedó con `nombre` o `apellido_p` crudo referenciado post-fix).
- Vercel preview fail (build error).

Acción si abort: cerrar PR, NO proceder al Paso 3. La vista + RPC EXPAND del Paso 1 pueden quedar vivos (son aditivos, no rompen callers viejos).

### Paso 3 CONTRACT (abort si:)
- Al correr `DROP VIEW` da error "objeto depende" → algún objeto que no estaba en el pg_depend inicial depende ahora. Rollback + diagnosticar.
- Post-apply, `SELECT nombre FROM proveedores_publicos LIMIT 1` retorna fila (no debería, la columna debe haber sido eliminada).
- `curl /rest/v1/proveedores_publicos?select=*` con anon key retorna `"nombre": "..."` en el JSON response (el fix no cerró el leak).

Acción si abort: ejecutar snapshot rollback de la vista + Vercel Instant Rollback a commit pre-Paso-2 si prod sirve 500s (ya en Paso 2 los callers migrados leen `display_name`, pero si el CONTRACT sale mal, los callers rompen al no encontrar la vista).

**Orden de reversión correcto** (documentado punto 9 de revisión original PO):
1. Primero: ejecutar snapshot rollback de la vista (restaura `nombre`+`apellido_p`+`apellido_m` columnas).
2. Después: Vercel Instant Rollback del merge Paso 2 (callers vuelven a leer `nombre`/`apellido_p` directo).
3. Al revés = 500s en home/chat/perfil (Vercel sirve código post-Paso-2 que lee `display_name` pero vista sigue sin esa columna si el rollback de la vista no se ejecutó).

### Backfill conversations (abort si:)
- Pre-count de convs con `proveedor_auth_id IS NULL` ≠ 2 (las 2 conocidas: `a11e7a8e` + `9a28d98b`).
- Post-count ≠ 0.
- Alguna de las 2 convs cambió client_id/sitter_id desde la auditoría del 2026-11-19 (verificar snapshot pre).

Acción si abort: `ROLLBACK` automático via `RAISE EXCEPTION` dentro del DO. Nada cambia.

## Paso 1 — SQL EXPAND (ejecuta PO)

### Pestaña 1 — snapshot previo

```sql
-- Guardar outputs como pii-view-tight-rollback-20261121.sql (fallback de
-- emergencia). Pestañas 1-3 corren ANTES del apply, Pestaña 4 es el apply.
SELECT 'view_def_snapshot' AS tipo, pg_get_viewdef('public.proveedores_publicos'::regclass, true) AS definicion
UNION ALL
SELECT 'rpc_def_snapshot' AS tipo, pg_get_functiondef('public.buscar_servicios'::regproc) AS definicion
UNION ALL
SELECT 'view_grants_snapshot' AS tipo,
       string_agg(r.rolname || ':' || acl.privilege_type, ', ' ORDER BY r.rolname, acl.privilege_type)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
  JOIN pg_roles r ON r.oid=acl.grantee
  WHERE n.nspname='public' AND c.relname='proveedores_publicos' AND r.rolname IN ('anon','authenticated','service_role')
UNION ALL
SELECT 'view_opts_snapshot' AS tipo, array_to_string(c.reloptions, ', ') AS definicion
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='proveedores_publicos';
```

### Pestaña 2 — APPLY (1 solo click Run)

```sql
BEGIN;

-- 1.A — Función SQL IMMUTABLE única fuente de verdad display_name.
CREATE OR REPLACE FUNCTION public.display_name_sql(
    p_nombre_publico text,
    p_nombre text,
    p_apellido_p text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN NULLIF(TRIM(COALESCE(p_nombre_publico, '')), '') IS NOT NULL
            THEN TRIM(p_nombre_publico)
        WHEN COALESCE(TRIM(p_apellido_p), '') <> ''
            THEN split_part(TRIM(p_nombre), ' ', 1) || ' ' || UPPER(LEFT(TRIM(p_apellido_p), 1)) || '.'
        WHEN ARRAY_LENGTH(string_to_array(TRIM(p_nombre), ' '), 1) >= 2
            THEN split_part(TRIM(p_nombre), ' ', 1) || ' ' || UPPER(LEFT(split_part(TRIM(p_nombre), ' ', 2), 1)) || '.'
        ELSE COALESCE(NULLIF(TRIM(p_nombre), ''), 'Proveedor')
    END
$$;

-- 1.B — Vista con display_name AL FINAL (fix 1 del PO: no en medio).
CREATE OR REPLACE VIEW public.proveedores_publicos AS
SELECT id, auth_user_id,
    nombre, apellido_p, nombre_publico,
    foto_perfil, bio, comuna, region, comunas_cobertura,
    tipo_entidad, razon_social, nombre_fantasia, giro, ocupacion,
    anios_experiencia, certificaciones, primera_ayuda, rut_verificado,
    miembro_asociacion, idiomas, politica_cancelacion, politica_cancelacion_nota,
    round(lat, 2)::double precision AS lat,
    round(lng, 2)::double precision AS lng,
    CASE WHEN mostrar_telefono THEN telefono ELSE NULL::text END AS telefono,
    CASE WHEN mostrar_whatsapp THEN whatsapp ELSE NULL::text END AS whatsapp,
    CASE WHEN mostrar_email THEN email_publico ELSE NULL::text END AS email_publico,
    mostrar_telefono, mostrar_whatsapp, mostrar_email,
    sitio_web, instagram, facebook, tiktok, youtube,
    galeria, estado, created_at, updated_at,
    perfil_completo, es_ejemplo,
    visitas_total, visitas_mes, favoritos_total,
    -- Columna NUEVA al final (fix 1 PO)
    public.display_name_sql(nombre_publico, nombre, apellido_p) AS display_name
FROM proveedores
WHERE estado = 'aprobado'::text;

-- 1.C — RPC buscar_servicios: 2 cambios surgicos sobre pg_get_functiondef de prod post-migración agenda-activa.
--   (a) `proveedor_nombre` emite display_name via helper (línea ~98 del RPC actual).
--   (b) eliminar `OR p.apellido_p ILIKE '%' || p_texto || '%'` del filter p_texto (línea ~164).
-- Mantener: SECURITY DEFINER, owner postgres, search_path null, GRANT EXECUTE a anon+authenticated (pg_get_functiondef los preserva).
-- Resto del body = idéntico al pg_get_functiondef snapshot de Pestaña 1.
--
-- NOTA PRE-EJECUCIÓN: el bloque CREATE OR REPLACE FUNCTION completo va acá,
-- copiado del pg_get_functiondef snapshot actual de prod (32 columnas de
-- RETURNS TABLE incluyendo `tiene_agenda_activa` ya aplicada hoy), con los
-- 2 cambios surgicos indicados. El auditor lo arma en el turno del sábado
-- a las 09:30 con el snapshot fresh de la Pestaña 1 — evita drift.

COMMIT;
```

### Pestaña 3 — verificación (statements separados post-commit)

```sql
-- V1: vista tiene display_name al final
SELECT column_name
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='proveedores_publicos'
 ORDER BY ordinal_position DESC
 LIMIT 1;
-- Esperado: display_name

-- V2: display_name poblado en todas las filas
SELECT COUNT(*) AS con_null FROM proveedores_publicos WHERE display_name IS NULL;
-- Esperado: 0

-- V3: RPC emite display_name en lugar de apellido completo
SELECT proveedor_nombre FROM buscar_servicios(p_limit := 5);
-- Esperado: 5 filas con formato "Nombre I." o nombre_publico literal, NUNCA "Nombre Apellido"

-- V4: filter p_texto por apellido ya no funciona
SELECT COUNT(*) FROM buscar_servicios(p_texto := 'Fierro', p_limit := 100);
-- Esperado: 0 (no debería retornar el proveedor "Rosamel Fierro" porque el filter por apellido_p fue removido)
--          Si retorna 0, el filter removido quedó bien.
--          Si retorna 1 (porque Rosamel podría estar en titulo/descripcion), investigar — posiblemente la búsqueda captó por otro campo.
```

## Paso 2 — PR migrate (yo armo)

**Rama**: `pii-view-tight-migrate`.

**Callers de la vista `proveedores_publicos` a migrar** (9 total, verificado 2026-11-19):

| Archivo | Cambio |
|---|---|
| `lib/profileUtils.ts:28-32` | `.select('auth_user_id, display_name, foto_perfil')` (drop `nombre`, `apellido_p`, `nombre_publico` del select). Retornar `display_name` directo sin llamar al helper JS. |
| `lib/enrichProveedorNombre.ts:62` | `.select('id, display_name, nombre_publico')`. El enrich pasa a ser casi no-op defensivo (si falta display_name, fallback a 'Proveedor'). |
| `lib/supabase/queries/proveedoresPublicos.ts:56` | Helper central: default select incluye `display_name`. Los callers con `columns` explícito pasan el string. |
| `pages/index.tsx:840, 850` | Select cambia a `display_name` en vez de `nombre, apellido_p, nombre_publico`. |
| `pages/favoritos.tsx:129` | Select `display_name` + asignación directa en map. Elimina `displayNameOf()` del favoritos.tsx porque la vista ya lo computa. |
| `pages/sitemap.xml.tsx:12` | Verificar — probablemente no lee nombres, solo `id` + stats. Sin cambio. |
| `pages/proveedor/[id].tsx:834` | Select incluye `display_name`. Render pasa a leerlo directo (ya está usando `displayName(proveedor)` client-side; cambia a `proveedor.display_name`). |
| `components/Service/ReviewList.tsx:76` | Select `display_name`. Render ya usa el string, sin cambio al render. |
| `e2e/specs/pii-nombre-publico/superficies-publicas.spec.ts` + `e2e/specs/pii-chat-nombre/superficies-autenticadas.spec.ts` | beforeAll del spec consulta la vista para resolver targets — select `display_name` en vez de `nombre`+`apellido_p`. |

**Callers del RPC `buscar_servicios`** (5 total): **cero cambio** (el RPC emite `proveedor_nombre` con nuevo semántico `display_name`; los call sites ya lo consumen por esa key).

**Cleanup opcional del PR**: remover llamada a `enrichServiceResultsWithDisplayName` donde ya no hace falta (el RPC ya emite `proveedor_nombre` con display_name). El helper queda como no-op defensivo o se puede eliminar. Decisión: dejar el helper pero marcar como legacy en comentario.

**Spec nuevo** `e2e/specs/pii-view-tight/payload-red.spec.ts`:
- Test 1: `fetch('/rest/v1/proveedores_publicos?select=*&limit=1', { headers: {apikey: ANON_KEY} })` → assertion response JSON **NO** contiene keys `nombre` ni `apellido_p` ni `apellido_m`.
- Test 2: `fetch('/rest/v1/rpc/buscar_servicios', { headers: {apikey: ANON_KEY}, body: JSON.stringify({p_limit: 3}) })` → assertion `proveedor_nombre` tiene formato `"<string> <letra>."` o literal con punto final, **nunca** matchea regex `^<Nombre> <Apellido>{3,}$`.
- Test 3 (cambio de comportamiento): `rpc('buscar_servicios', {p_texto: '<apellido_conocido>'})` NO retorna resultados → documenta en spec que el search por apellido fue removido intencionalmente.

**Estimación código PR**: 1-1.5 h total.

## Paso 3 — SQL CONTRACT (ejecuta PO)

### Pestaña 1 — snapshot (fallback rollback)

```sql
-- Ya está en el snapshot del Paso 1; si hace falta re-correr:
SELECT pg_get_viewdef('public.proveedores_publicos'::regclass, true);
```

### Pestaña 2 — APPLY

**Fix 2 PO**: `CREATE OR REPLACE VIEW` NO puede quitar columnas → `DROP VIEW + CREATE VIEW` en transacción.

```sql
BEGIN;

DROP VIEW IF EXISTS public.proveedores_publicos;

CREATE VIEW public.proveedores_publicos AS
SELECT id, auth_user_id,
    -- nombre, apellido_p ELIMINADOS del SELECT (apellido_m nunca estuvo).
    nombre_publico,
    foto_perfil, bio, comuna, region, comunas_cobertura,
    tipo_entidad, razon_social, nombre_fantasia, giro, ocupacion,
    anios_experiencia, certificaciones, primera_ayuda, rut_verificado,
    miembro_asociacion, idiomas, politica_cancelacion, politica_cancelacion_nota,
    round(lat, 2)::double precision AS lat,
    round(lng, 2)::double precision AS lng,
    CASE WHEN mostrar_telefono THEN telefono ELSE NULL::text END AS telefono,
    CASE WHEN mostrar_whatsapp THEN whatsapp ELSE NULL::text END AS whatsapp,
    CASE WHEN mostrar_email THEN email_publico ELSE NULL::text END AS email_publico,
    mostrar_telefono, mostrar_whatsapp, mostrar_email,
    sitio_web, instagram, facebook, tiktok, youtube,
    galeria, estado, created_at, updated_at,
    perfil_completo, es_ejemplo,
    visitas_total, visitas_mes, favoritos_total,
    public.display_name_sql(nombre_publico, nombre, apellido_p) AS display_name
FROM proveedores
WHERE estado = 'aprobado'::text;

-- Restaurar grants del snapshot Paso 1 (fix 2 PO).
GRANT SELECT ON public.proveedores_publicos TO anon, authenticated, service_role;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE, MAINTAIN
    ON public.proveedores_publicos TO anon, authenticated, service_role;

-- Restaurar reloptions.
ALTER VIEW public.proveedores_publicos SET (security_invoker=false);

COMMIT;
```

### Pestaña 3 — verificación post-CONTRACT

```sql
-- V1: columnas nombre + apellido_p ELIMINADAS
SELECT column_name
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='proveedores_publicos'
   AND column_name IN ('nombre','apellido_p','apellido_m');
-- Esperado: 0 filas

-- V2: display_name sigue presente
SELECT column_name
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='proveedores_publicos'
   AND column_name = 'display_name';
-- Esperado: 1 fila
```

### Pestaña 4 — curl REST anon (fix 8 PO: URL del proyecto Supabase, no www.pawnecta.com)

Yo lo ejecuto desde mi terminal:

```bash
curl -s -H "apikey: <PROD_ANON_KEY>" \
  -H "Authorization: Bearer <PROD_ANON_KEY>" \
  "https://ouezpeeiwjwawauidrqq.supabase.co/rest/v1/proveedores_publicos?select=*&limit=1" \
  | jq 'keys'
# Esperado: lista de keys SIN "nombre", "apellido_p", "apellido_m". Incluye "display_name".

curl -s -X POST \
  -H "apikey: <PROD_ANON_KEY>" \
  -H "Authorization: Bearer <PROD_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"p_limit": 3}' \
  "https://ouezpeeiwjwawauidrqq.supabase.co/rest/v1/rpc/buscar_servicios" \
  | jq '.[0] | .proveedor_nombre'
# Esperado: formato "Nombre I." o nombre_publico literal.
```

## Rollback escrito (orden correcto, fix 9 PO)

**Si post-Paso-3 algo rompe** (improbable con V1/V2 verdes + curl verde, pero contingencia):

```sql
-- STEP A (primero, SIEMPRE): restituir vista vieja con nombre + apellido_p
BEGIN;

DROP VIEW IF EXISTS public.proveedores_publicos;

-- Pegar acá el `view_def_snapshot` guardado en Pestaña 1 del Paso 1 (snapshot).
-- Es la vista pre-expand, con nombre + apellido_p + sin display_name.
CREATE VIEW public.proveedores_publicos AS
    -- <contenido exacto del snapshot>

GRANT SELECT ON public.proveedores_publicos TO anon, authenticated, service_role;
ALTER VIEW public.proveedores_publicos SET (security_invoker=false);

COMMIT;
```

**STEP B (después)**: Vercel Instant Rollback del merge del Paso 2 (callers vuelven a leer `nombre`/`apellido_p` directo de la vista restituida).

**STEP C**: comunicación al equipo + anotar incidente en acta.

**NUNCA invertir el orden** (STEP B antes de STEP A). Si Vercel rollback ocurre primero, los callers pre-Paso-2 leen `nombre`/`apellido_p` de la vista nueva que NO tiene esas columnas → 400s en home/chat/perfil.

## Backfill conversations (ejecuta PO, 10 min)

```sql
BEGIN;

DO $$
DECLARE
    v_null_count int;
    v_expected int := 2;  -- las 2 conocidas: a11e7a8e + 9a28d98b
    v_updated int;
    r RECORD;
BEGIN
    -- Verificación pre (criterio abort PO fix 7)
    SELECT COUNT(*) INTO v_null_count FROM conversations WHERE proveedor_auth_id IS NULL;
    IF v_null_count <> v_expected THEN
        RAISE EXCEPTION 'ABORT: esperadas % convs con proveedor_auth_id NULL, encontradas %', v_expected, v_null_count;
    END IF;

    -- Snapshot pre-UPDATE (log de evidencia)
    RAISE NOTICE '--- Pre-UPDATE snapshot (convs con proveedor_auth_id NULL) ---';
    FOR r IN
        SELECT id, client_id, sitter_id, proveedor_auth_id, created_at
          FROM conversations WHERE proveedor_auth_id IS NULL
      ORDER BY created_at
    LOOP
        RAISE NOTICE 'id=% client=% sitter=% current_prov_auth=% created=%',
                     r.id, r.client_id, r.sitter_id, r.proveedor_auth_id, r.created_at;
    END LOOP;

    -- UPDATE con criterio: proveedor_auth_id = sitter_id (patrón canónico, backfill histórico)
    UPDATE conversations
       SET proveedor_auth_id = sitter_id
     WHERE proveedor_auth_id IS NULL
       AND sitter_id IS NOT NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated <> v_expected THEN
        RAISE EXCEPTION 'ABORT: esperadas % filas actualizadas, hechas %', v_expected, v_updated;
    END IF;

    -- Verificación post
    SELECT COUNT(*) INTO v_null_count FROM conversations WHERE proveedor_auth_id IS NULL;
    IF v_null_count <> 0 THEN
        RAISE EXCEPTION 'ABORT: post-UPDATE quedan % filas con proveedor_auth_id NULL', v_null_count;
    END IF;

    RAISE NOTICE '✓ Backfill verificado: % convs actualizadas, 0 NULL restantes.', v_updated;
END $$;

COMMIT;
```

**Rollback escrito**: RAISE EXCEPTION dispara ROLLBACK automático dentro del DO. Si el COMMIT se ejecuta, es porque todas las verificaciones pasaron. Post-COMMIT un UNDO requiere:
```sql
-- Solo si se descubre que el backfill fue equivocado post-commit (improbable).
UPDATE conversations
   SET proveedor_auth_id = NULL
 WHERE id IN ('a11e7a8e-7649-4591-843c-3267858104b6', '9a28d98b-190e-48a2-8e4a-d7e8e9075563');
```

## Impacto en cron `recordatorio-mensajes` (pregunta 7 PO)

**Verificado empíricamente 2026-11-19**: cero envíos post-backfill.
- Conv `a11e7a8e`: 6 mensajes totales (5 del client + 1 del sitter), último mensaje `2026-01-21 23:40 UTC` → >24h antes del cutoff → cron skipea (`if lastMsg > cutoff continue`).
- Conv `9a28d98b`: 0 mensajes → cron skipea (`if msgs.length === 0 continue`).

Documentado en código: [pages/api/cron/recordatorio-mensajes.ts:53, 66](../../pages/api/cron/recordatorio-mensajes.ts#L53).

## Resumen de criterios de éxito del sábado

Al cierre del sábado, los siguientes tienen que ser verdes:
- V1/V2/V3/V4 del Paso 1 EXPAND.
- CI del PR migrate Paso 2 verde.
- Merge PR migrate a prod.
- V1/V2 del Paso 3 CONTRACT.
- `curl` anon REST a `/rest/v1/proveedores_publicos` sin `nombre`/`apellido_p` en response.
- `curl` anon REST a `/rest/v1/rpc/buscar_servicios` con `proveedor_nombre` formato `"Nombre I."`.
- Backfill 2 convs: `proveedor_auth_id` poblado, 0 NULL restantes.
- Home + /servicio + /proveedor + /explorar + /mensajes funcionando empíricamente (smoke manual del PO).

Si todos los anteriores son verdes, PII-VIEW-TIGHT cerrado. Acta en `docs/sprints/pii-view-tight-sabado.md` (archivo separado, cierre del sprint).
