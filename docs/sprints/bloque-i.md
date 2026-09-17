# Bloque I — Kickoff

**Fecha kickoff**: 2026-09-17.
**Rama base**: `main` post-merge de PR #62 (`f841611`) + PR #63 (`64c461c`).
**Precondiciones cumplidas**: 3 corridas F2 verdes consecutivas post cleanup staging + fixture refactor + s1-editor-visible actualizado (PR #63 mergeado). PR #62 (tests-desactual + tipo-cd + regla CLAUDE.md) mergeado con F2 verde una vez rebased sobre main.

## Contexto operativo

Bloque autónomo tras el hotfix P12 (`| tee` sin `pipefail` + supabase-js bump que rompió F2 en CI Node 20). El bloque cierra 3 huecos de infraestructura de tests + 1 sprint SQL:

- **I-1**: canario CI que garantiza que el pipefail (y demás guards del workflow) sigue funcionando semanalmente — no vuelve a haber un CI ciego silente.
- **I-2**: alinear el runtime de CI con producción (Node 22 en Vercel) — cierra el motivo estructural que llevó al bump de supabase-js a romper.
- **I-4**: RPC-C Lote 2 (admin-only). Continuación del ciclo de REVOKE gradual de RPCs deprecadas.
- **I-3**: Baselines visuales + BUTTON-CANON incrementales — depende de staging estable, va al final.

Orden explícito PO: I-1 → I-2 → I-4 → I-3.

## Alcances por sprint

### I-1 · Canario CI (workflow semanal + dispatch)

**Motivación**: el fallo del CI ciego de 2026-09-17 (F2 verde falso por `tee` sin `pipefail`) demostró que necesitamos verificación periódica de que los guards del workflow siguen funcionando. Sin un canario, la próxima regresión del CI puede pasar desapercibida hasta que un merge productivo la revele.

**Entregable**:
- Nuevo workflow `.github/workflows/ci-canario.yml` con:
  - `schedule` cron lunes 08:00 Chile (`0 11 * * 1` en UTC — CLT UTC-3).
  - `workflow_dispatch` para trigger manual.
- Spec e2e nuevo `e2e/specs/ci-canario/fail-a-proposito.spec.ts` con un `expect(false).toBe(true)` o similar — debe fallar SIEMPRE.
- Job del workflow corre el spec + verifica que el exit code es != 0. Si el job termina en verde (exit code 0), el workflow falla y abre un issue automático con título "CI ciego — canario pasó cuando debía fallar" + link al run.
- Documentar en skill (CLAUDE.md o similar) el patrón como "prueba viva del pipefail".

**Verificación**: correr el workflow_dispatch al mergear + confirmar que el issue automático se dispara si se comenta el `set -o pipefail` del step (test negativo).

### I-2 · Node 22 en CI (align 3 workflows + engines)

**Motivación**: producción corre Node 22+ en Vercel; los 3 workflows de CI (`ci.yml`, `e2e-error-audit.yml`, `visual-update-snapshots.yml`) siguen pinneados a Node 20. Esa divergencia fue el mecanismo del fail de 2026-09-17 (supabase-js@2.109 exige WebSocket nativo → OK en Node 22 prod, FAIL en Node 20 CI).

**Entregable**:
- `.github/workflows/ci.yml`: `node-version: '20'` → `'22'`.
- `.github/workflows/e2e-error-audit.yml`: idem.
- `.github/workflows/visual-update-snapshots.yml`: idem.
- `.github/workflows/cleanup-staging-e2e.yml`: idem (aterrizado en PR #63 con Node 20; alinear también).
- `package.json`: agregar `"engines": { "node": ">=22" }` coherente con Vercel default.
- **NO** quitar el pin `@supabase/supabase-js@~2.84.0`. Ese es sprint aparte (con suite completa verde tras Node 22 confirmado).

**Verificación**: 3 corridas F2 verdes consecutivas en el PR. Merge autónomo tras verde.

### I-4 · RPC-C Lote 2 (admin-only)

**Motivación**: Continuación del REVOKE gradual iniciado por Lote 1 (RPC-C dead code). Lote 2 cubre RPCs admin-only que solo el rol `admin` invoca vía backend server-side.

**Entregable**:
- Aplicar REVOKE en staging vía `supabase-staging-rw` MCP.
- Correr suite completa (rápida + F2 + unit) contra staging tras REVOKE — cero regresión.
- Entregar SQL exacto para prod en el mismo formato del Lote 1:
  - Bloque de verificación previa (SELECT counts / SELECT grants).
  - Bloque REVOKE numerado.
  - Bloque de verificación posterior (SELECT grants post = cero para roles no-admin).
  - Bloque rollback (GRANT si necesario).

**Verificación**: entregar el SQL en el mismo turno del cierre del sprint para que Aldo ejecute manualmente en prod.

### I-3 · Baselines visuales + BUTTON-CANON

**Motivación**: BUTTON-CANON (unificación de estilos de botones) requiere baselines visuales estables. El workflow `visual-update-snapshots.yml` regenera los snapshots contra staging; sin ejecutarlo con staging estable, cualquier PR de BUTTON-CANON no puede validar su diff visual limpio.

**Entregable**:
- Cuando staging responde normal (verificar via `curl -sI` sin 5xx), disparar `gh workflow run visual-update-snapshots --ref main` + esperar con `gh run watch`.
- Con baselines committeadas al repo, arrancar los PRs incrementales de BUTTON-CANON (5-8 botones cada uno) con el spec visual como puerta.
- Si aparece diff visual no esperado, detener con diff adjunto para revisión.
- Fallback: si el workflow visual falla por auth de staging, reportar las latencias medidas y detener para decisión PO sobre cómputo staging.

**Verificación**: baselines commiteadas + primera PR de BUTTON-CANON con visual verde.

## Estado FINAL

- [x] I-1 canario CI — PR #64 mergeado (SHA `8001597`). Workflow `.github/workflows/ci-canario.yml` + spec `e2e/specs/ci-canario/fail-a-proposito.spec.ts` + project `canario` en playwright.config.
- [x] I-2 Node 22 CI — PR #65 mergeado (SHA `5879476`). 4 workflows alineados + `engines.node ">=22"` en package.json. `@supabase/supabase-js@~2.84.0` mantenido intencional.
- [x] I-4 RPC-C Lote 2 (admin-only) — PR #66 mergeado (SHA `80ff8fc`). REVOKE aplicado en staging via `supabase-staging-rw`; ACL post-verify `anon=false, authenticated=true, service_role=true`. SQL para prod en `migrations/20260917_lote2_rpc_c_admin_only_prod.sql` — **espera ejecución PO en prod**.
- [x] I-3 Baselines visuales — 2 PRs + 1 direct-fix:
  - PR #68 bootstrap `PLAYWRIGHT_VISUAL_BOOTSTRAP` (SHA `80a45d6`) — cerró el chicken-and-egg del gate `test.skip` que impedía la primera generación.
  - Direct main `160a63c` — hotfix workflow-only: `git add e2e/specs/visual/` reemplaza el pattern `**/*-snapshots/*.png` que no expandía en bash sin globstar. Sin este fix, los PNGs quedaban sin stage y el commit era no-op.
  - Commit CI runner `e19154c` — **12 PNGs baseline commitedas** en `e2e/specs/visual/paginas-clave.spec.ts-snapshots/` (home/explorar/login/proveedor/admin/mis-reservas × desktop+mobile). BUTTON-CANON PRs incrementales están habilitados a partir de este SHA.

## Deuda registrada del bloque

- **ficha-servicio visual (2 baselines faltantes)**: los tests desktop + mobile de la ficha `/servicio/[id]` fallaron en el dispatch de generación (spec navega a `/explorar` y clickea `a[href*="/servicio/"]` con storage state vacío — cero servicios visibles al visitante anon con la data actual staging). Trigger: seed más data pública en staging o cambiar el spec a un ID conocido. Sprint chico post-lanzamiento; no bloquea BUTTON-CANON de las otras 12 páginas.
- **Warnings Node 20 → 24 en action runners**: annotation persistente `actions/checkout@v4, actions/setup-node@v4, actions/upload-artifact@v4` corren en Node 24 forzado. Cuando GitHub Actions retire Node 20 (fecha en la annotation), migrar a `actions/*@v5` que declaren Node 24 native. Sprint chico.

## Lista consolidada de SQL de prod PENDIENTE ejecución PO

1. **Lote 1 RPC-C dead code** (bloque-h H-2, mergeado como PR #59 en `h2-lote1-staging`) — 3 funciones sin callers reales: `incrementar_vistas_servicio`, `send_notification`, `try_jsonb`. SQL final en `docs/auditorias/rpc-c-20260917.md §6`.
2. **Lote 2 RPC-C admin-only** (bloque-i I-4, este bloque) — `calcular_perfil_completo_proveedor`. SQL en `migrations/20260917_lote2_rpc_c_admin_only_prod.sql`.
3. **Lote 3 RPC-C legacy** (bloque-h H-2, pendiente) — `incrementar_vistas` reemplazado por `registrar_visita`. Requiere sprint separado con grep exhaustivo previo (potential false-positive detected en `FeedbackList.tsx`).

## PRs del bloque

| PR | Alcance | SHA merge | Estado |
|---|---|---|---|
| #64 | I-1 canario CI + kickoff doc | `8001597` | MERGED |
| #65 | I-2 Node 22 en 4 workflows + engines | `5879476` | MERGED |
| #66 | I-4 RPC-C Lote 2 admin-only (staging OK + SQL prod) | `80ff8fc` | MERGED |
| #68 | I-3 bootstrap `PLAYWRIGHT_VISUAL_BOOTSTRAP` | `80a45d6` | MERGED |
| direct main | hotfix workflow visual `git add` pattern | `160a63c` | pushed |
| CI runner | 12 PNGs baseline generadas por dispatch | `e19154c` | pushed |
| _(este)_ | acta bloque-i + BACKLOG conciliado | pendiente | pendiente |

## Timing efectivo

Kickoff → cierre funcional: ~2h wall clock. Cuello observado: concurrency queue eviction del workflow `e2e-error-audit` (nueva runs pending cancelaban a las anteriores en la cola `e2e-staging` con `cancel-in-progress: false`) — requirió empty commits para retriggering, y afectó orden de merges. Costo neto ~30 min extra en los merges de I-2 (bloque-i-2) y I-4 (bloque-i-4).
