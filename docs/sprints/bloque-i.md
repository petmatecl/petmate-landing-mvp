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

## Estado en curso

- [ ] I-1 canario CI
- [ ] I-2 Node 22 CI
- [ ] I-4 RPC-C Lote 2 (con SQL prod)
- [ ] I-3 Baselines visuales

## Cierre esperado

- Acta breve `docs/sprints/bloque-i.md` (este archivo, actualizado con SHAs, PRs, verificaciones).
- BACKLOG.md conciliado — mover ítems cerrados de "pendiente" a "cerrado", agregar nuevos ítems descubiertos.
- Lista consolidada de SQL de prod pendiente (Lote 1 REVOKE + Lote 2 REVOKE + Lote 3 cuando corresponda).
- Reporte final al PO con enlaces a los PRs mergeados + los bloques SQL para ejecución manual en prod.
