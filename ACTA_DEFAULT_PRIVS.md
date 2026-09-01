# ACTA — Sprint `default-privs`

**Rama**: `default-privs` (forkeada de `main` @ `146784f` post-cierre `notifs-panel`).
**SHA final en `main`**: por aplicar tras merge FF (ver §7).
**Tag**: `default-privs-prod-20260901`.
**Fecha ejecución**: 2026-09-01.
**Estado**: **CERRADO** en producción. Smoke 8+8+8+8+14+3+cleanup verde por PO 2026-09-01.

---

## 1. Alcance original y decisiones

El sprint arrancó con un problema arrastrado de dos sprints previos: cada migration nueva requería 3 REVOKE manuales (PUBLIC + anon + authenticated) sobre cada función nueva, porque el schema `public` de Supabase configura por default privileges que otorgan EXECUTE/SELECT/etc. a esos roles automáticamente. **Nos mordió dos veces**:
- Sprint `admin-visibilidad` (2026-08-27): RPC nuevo heredó EXECUTE anon.
- Sprint `notifs-panel` F2B (2026-08-28): trigger `notify_proveedor_new_eval` heredó EXECUTE anon/authenticated.

**Decisiones de alcance (PO 2026-09-01)**:
- **A** — Revoke defaults del schema `public` (grantor postgres). SÍ.
- **B** — Cleanup de 13 trigger functions con EXECUTE anon residual. SÍ.
- **C** — Auditoría de las 204 funciones RPC-callable case-by-case. **FUERA** — a BACKLOG como sprint propio. Costo alto (horas), modo de fallar feo (revocar una llamada desde cliente rompe silente), PO en viaje fin de mes.

## 2. Rondas del sprint y hallazgos

**Ronda 1 — Diagnóstico**: 5 preguntas del PO respondidas con MCP staging + docs oficiales:
- Es config de fábrica de Supabase, no residual manual.
- 2 entradas en `pg_default_acl` para `public` (grantor postgres + grantor supabase_admin) — aplican en paralelo según quién crea el objeto.
- Alcance el TRIPLE de lo asumido: tablas, secuencias, funciones (no solo funciones).
- 26 tablas todas con RLS enabled — salvaguarda real hoy. 13 trigger functions con EXECUTE anon innecesario.

**Ronda 2 — Plan**: statements iniciales enumerados + 13 REVOKE + smoke antes-y-después + hipótesis Table Editor. Descubrimiento en Ronda 2: `postgres` (rol default del SQL Editor) NO es miembro de `supabase_admin` — no podemos revocar la entrada `grantor=supabase_admin`. Docs Supabase lo confirman: no recomiendan tocarla porque `supabase_admin` no autentica via Data API.

**Ronda 3 — Smoke staging** (2026-09-01): dos problemas encontrados que se habrían publicado sin este smoke — ver §3.

**Ronda 4 — Aplicación prod**: migration `81ab440` completa aplicada por el PO. Smoke antes-y-después idéntico al de staging, todo verde.

## 3. Dos cosas que el smoke encontró y que se habrían publicado sin él

### 3.1 El REVOKE enumerado dejaba TRUNCATE/REFERENCES/TRIGGER/MAINTAIN residuales

Los 4 statements iniciales del plan enumeraban `SELECT, INSERT, UPDATE, DELETE` para tablas. Es **incompleto**: el bitmask de tablas de PostgreSQL es `arwdDxtm` (INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN — 8 privilegios). El REVOKE enumerado dejaba `Dxtm` heredado (TRUNCATE + REFERENCES + TRIGGER + MAINTAIN) a anon.

**Consecuencia real**: cualquier tabla nueva creada por `postgres` en `public` habría dado a `anon` la capacidad de `TRUNCATE` — vaciarla sin condición. Aunque RLS filtra SELECT/INSERT/UPDATE/DELETE por fila, TRUNCATE bypassea RLS (es DDL, no DML).

**Fix del PO durante smoke**: reemplazar los `REVOKE SELECT, INSERT, UPDATE, DELETE` por `REVOKE ALL` para tablas + `REVOKE ALL` para secuencias (que también tenía residuo `w` de UPDATE) + `REVOKE ALL` para funciones. Cubre el bitmask completo sin residuo.

### 3.2 Las funciones seguían naciendo ejecutables por PUBLIC

Con los 4 ALTERs aplicados (incluido el `REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` per-schema), una función nueva creada post-alter seguía con `has_function_privilege('anon', ..., 'EXECUTE') = TRUE`.

**Mecanismo diagnosticado** contra el manual PostgreSQL §5.8 y §ALTER DEFAULT PRIVILEGES:
- ACL nulo para funciones = "aplicar default global de PostgreSQL" = **EXECUTE granted to PUBLIC**. Distinto de tablas y secuencias, donde ACL nulo = solo el dueño.
- Cita literal manual: "This command has no effect, unless it is undoing a matching GRANT: `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`. That's because per-schema default privileges can only add privileges to the global setting, not remove privileges granted by it."
- Es exactamente el statement #4 del plan inicial. **No-op por diseño de PostgreSQL**.

**Fix**: agregar el statement equivalente **sin `IN SCHEMA`** — aplica global al rol `postgres`. Verificación empírica: solo `public` tiene funciones creadas por postgres, otros schemas los pobla Supabase con roles admin distintos. Alcance efectivo = idéntico al per-schema, cero efectos colaterales.

**Impacto de este hallazgo**: sin el smoke, el sprint habría cubierto **dos tercios** del problema (tablas + secuencias) creyendo que cubría todo. Las funciones seguirían naciendo públicas y cada migration nueva seguiría necesitando REVOKE manual — el problema que el sprint venía a resolver. El smoke antes-y-después con positivo conocido detectó la brecha en un solo SELECT.

## 4. Docs oficiales de Supabase — incompletas

Guía oficial [hardening-data-api](https://supabase.com/docs/guides/database/hardening-data-api), sección "Revoke default privileges", copia literal verificada dos veces con WebFetch (2026-09-01, foco específico):

```sql
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
```

**Los 4 statements llevan `IN SCHEMA public`**. Respuesta literal del WebFetch con foco específico: "No aparece en ningún lugar un `ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` sin la cláusula de esquema. Cada una de las cuatro líneas contiene la especificación del esquema."

Y el enumerado en vez de `REVOKE ALL` deja los mismos residuos que encontró el smoke.

**Consecuencia**: cualquiera que siga esa guía al pie de la letra cree que cerró el tema y **no lo cerró**. Sus funciones nuevas siguen ejecutables por PUBLIC, y sus tablas nuevas dan TRUNCATE/REFERENCES/TRIGGER/MAINTAIN a anon.

**Acción pendiente**: reportar a Supabase docs (GitHub issue al repo supabase/supabase) con la evidencia + cita del manual PostgreSQL. Anotable como sub-item del cierre — el PO decide cuándo abrir el issue.

## 5. Una regla que no se escribió (Table Editor)

En Ronda 2 se propuso una regla operativa "cero uso del Table Editor del dashboard para crear tablas en public" — con el racional de que las tablas del dashboard nacerían como `supabase_admin` y heredarían de la entrada `grantor=supabase_admin` que no podemos revocar. Basado en discusión Supabase de enero 2022 ([supabase/discussions/4834](https://github.com/orgs/supabase/discussions/4834)).

**Verificación empírica staging 2026-09-01** — PO creó una tabla desde Table Editor con defaults, sin tocar RLS. Resultado:

| Métrica | Valor |
|---|---|
| creada_por | `postgres` (NO supabase_admin) |
| rls_activo | true (Table Editor lo activa solo) |
| anon_select | false |
| anon_truncate | false |
| auth_select | false |
| acl_crudo | `{postgres=arwdDxtm/postgres}` |

**Hipótesis REFUTADA**. El comportamiento del Table Editor cambió desde 2022 (o nunca aplicó así). Crea como `postgres` → cae bajo el mismo `pg_default_acl` que revocamos → herencia bloqueada automáticamente.

**Consecuencia**: la regla "cero Table Editor" NO se aterriza en CLAUDE.md. Habría sido una restricción operativa molesta, permanente, sin fundamento. **Mejor resultado posible de haber insistido en verificar** — el PO forzó el smoke antes de escribir la regla, y la evidencia la descartó.

## 6. Limitación conocida — entrada `grantor=supabase_admin`

La entrada `grantor=supabase_admin` en `pg_default_acl` (3 filas: tabla, secuencia, función) **sigue viva post-sprint** y **no es tocable desde nuestro rol**. `postgres` no es miembro de `supabase_admin` (superuser separado). No hay path oficial documentado por Supabase para ejecutar `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ...` desde el SQL Editor.

**Impacto hoy**: cero. El Table Editor del dashboard NO usa `supabase_admin` para crear objetos (verificado empírico, §5). Los objetos que crea Supabase internamente en otros schemas (auth, storage, realtime, etc.) usan roles admin distintos. Los objetos que creamos nosotros en public van via SQL Editor como `postgres` — cubiertos por el REVOKE del sprint.

**Estado**: limitación conocida, no pendiente. Si Supabase completa su migración plataforma a "opt-in secure defaults" (anunciada, sin fecha), la entrada se retira sola. Hasta entonces, sigue como residuo inactivo.

## 7. Schema `storage` — decisión consciente

El schema `storage` (Supabase-owned) conserva todos los grants a `anon` en sus tablas. Verificado empírico staging 2026-09-01:

| Tabla | RLS | anon SELECT | anon INSERT | anon TRUNCATE | Policies |
|---|---|---|---|---|---|
| `buckets` | true | true | true | true | 0 |
| `buckets_analytics` | true | true | true | true | 0 |
| `buckets_vectors` | true | true | false | false | 0 |
| `migrations` | true | false | false | false | 0 |
| `objects` | true | true | true | true | **19** |
| `s3_multipart_uploads` | true | true | false | false | 0 |
| `s3_multipart_uploads_parts` | true | true | false | false | 0 |
| `vector_indexes` | true | true | false | false | 0 |

**No tocamos**. Es Supabase-owned — la superficie efectiva a anon está gobernada por RLS + policies (`objects` tiene 19 policies restrictivas), no por el grant. Alterar `storage` desde nuestra migration sería tocar algo que Supabase administra y romper compatibilidad con updates de plataforma.

**Decisión consciente, no olvido**.

## 8. Alcance C — auditoría RPC-callable — a BACKLOG

204 funciones RPC-callable en `public`, 203 con EXECUTE anon. Mayoría genuinamente necesita el grant (búsqueda pública sin loguear, acciones del usuario logueado). Alguna proporción NO — pero identificarlas requiere cruzar los `supabase.rpc(...)` del frontend con la lista completa de RPCs.

**Costo**: horas de auditoría case-by-case. **Modo de fallar feo**: revocar una función que SÍ se llama desde cliente rompe producción en silencio (el cliente recibe 401/403 al llamarla, sin error visible hasta que el user la usa). PO en viaje fin de mes — no es momento de abrir eso.

**A BACKLOG como sprint propio, prioridad media**. Ver entrada nueva en `BACKLOG.md > Deuda técnica / pulido`.

## 9. Cierre del sprint — cambios de documentación aterrizados

Junto con esta acta, en commit único post-apply prod, se aterrizan:

1. **Retracción del corolario P8 6ª en [CLAUDE.md:616](CLAUDE.md#L616)** (opción Y aprobada por PO en Ronda 2). El texto original se preserva con nota que documenta: (a) afirmación retirada; (b) fecha original 2026-08-14 → retracción verbal en admin-visibilidad 2026-08-27 → no aterrizada; (c) sustento ausente — 1 solo incidente; (d) instrucción: si alguien necesita saber cómo se comporta el SQL Editor con corridas separadas, **medirlo**, no citar la nota.

2. **Corrección simétrica en [MIGRATION_FKS_HABILITANTES.md:216-224](MIGRATION_FKS_HABILITANTES.md#L216-L224)** §4.3 con la misma retracción anclada a la nota de CLAUDE.md.

3. **Entrada nueva en BACKLOG.md**: "Auditoría de los corolarios P8 de CLAUDE.md" — cada corolario numerado anclado a un único incidente, revisar uno por uno, evaluar si la numeración formal conviene. Origen: sprint default-privs 2026-09-01 a partir del caso del 6ª retractado.

4. **Regla operativa "cero Table Editor" NO se aterriza** — refutada por evidencia empírica (§5).

## 10. Metadata del tag

- **Tag anotado**: `default-privs-prod-20260901`
- **Apunta a**: (SHA del commit final tras merge FF + docs — completar tras push)
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/default-privs-prod-20260901`): completar
- **Fecha del commit apuntado**: completar

Fechas separadas por regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

## 11. Verificación empírica en producción — outputs literales por fase

Recolectados por el PO en el smoke prod 2026-09-01:

- **Fase 1 baseline**: 8/8 TRUE (fn EXECUTE anon+auth, tbl SELECT anon+auth, tbl TRUNCATE anon, seq USAGE anon+auth, seq UPDATE anon). Trigger functions: 13 TRUE, `notify_proveedor_new_eval` FALSE (referencia F2B).
- **Fase 2 migration**: sin error.
- **Fase 3a objetos nuevos post-alter**: 8/8 FALSE. Incluido TRUNCATE en tabla y UPDATE en secuencia.
- **Fase 3b lo existente no cambió**: 8/8 TRUE. Objetos del baseline conservan todo.
- **Fase 3c tablas reales**: 25 tablas, 24 con anon_select. Excepción `proveedores` con `{postgres=arwdDxtm, anon=m, authenticated=arwdDxtm, service_role=arwdDxtm}` (solo MAINTAIN para anon) — preexistente, disciplina anti-default histórica identificada en Ronda 1.
- **Fase 3d 14 trigger functions**: todas FALSE anon+authenticated.
- **Fase 3e `pg_default_acl` final** (5 filas):
  ```
  postgres (GLOBAL)  function {postgres=X/postgres}
  postgres public    function {postgres=X/postgres}
  postgres public    sequence {postgres=rwU/postgres}
  postgres public    table    {postgres=arwdDxtm/postgres}
  supabase_admin public: 3 filas intactas (table, sequence, function)
  ```
- **Cleanup**: cero residuos, 25 tablas.

**Cero rollback, cero regresión**.

---

**Cierre**: sprint 100% ejecutado, en prod, smokes verdes, docs actualizadas. Deuda anotada:
- Auditoría corolarios P8 CLAUDE.md (BACKLOG, prioridad media).
- Alcance C — 204 RPC-callable case-by-case (BACKLOG, sprint propio).
- Reportar guía Supabase incompleta (issue GitHub, cuando el PO lo abra).
