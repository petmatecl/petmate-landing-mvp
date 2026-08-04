# Mini-checklist — Cola de merges post-monitor N15

**Cierre esperado del monitor**: jueves 06-ago ~15:00 CLT (Fase 8 checklist N15 en curso desde 2026-08-04 ~15:00).

**Orden estricto de la cola** (autorización pendiente por PO al abrir la ventana):
1. `producto-1` — sprint técnicamente completo + revisión visual PO aprobada 2026-08-04.
2. `zonab-1` — sprint completo con ZB1-ZB4 cerrados (actas pushed).
3. `producto-2` — sprint técnicamente completo con PD1+PD2+PD4-bis+PD3 (acta consolidada en este mismo commit).

**Naturaleza esperada del merge**: no-FF (los sprints se forkearon de puntos distintos + hubo commits paralelos). El primero puede ser FF si `producto-1` forkeó del último `staging` pre-N15 y el N15 llegó por otro camino — verificar caso por caso.

---

## Fase A — Pre-cola (una sola vez, al arrancar la ventana)

- [ ] **Fase 8 monitor N15 CERRADA** con evidencia P5 en `MERGE_NEXT15_PROD_CHECKLIST.md`. Los ítems del monitor deben quedar todos `[x]`.
- [ ] **Estado limpio de todas las ramas**:
  ```bash
  git fetch --all
  git branch -vv | head -10
  ```
  Verificar cada rama del sprint sincronizada con `origin/<rama>`.
- [ ] **Snapshot inicial**: reportar SHA de `main`, `staging`, `producto-1`, `zonab-1`, `producto-2` antes del primer merge. Pegar output en el reporte final del desfile.

## Fase B — Merge `producto-1 → staging`

**Pre-check**:
- [ ] `git checkout staging && git pull origin staging`
- [ ] `git checkout producto-1 && git pull origin producto-1`
- [ ] **FF-check**:
  ```bash
  git log --oneline producto-1..staging   # Vacío = producto-1 tiene todo de staging + sus commits
  ```
  Si NO vacío → `staging` avanzó por otro camino desde el fork de `producto-1` (probable — N15 landed en staging post-fork). **Merge normal esperado** (no-FF).

**Ejecución**:
```bash
git checkout staging
git merge producto-1  # merge commit esperado (no-FF)
git push origin staging
```

**Post-merge**:
- [ ] Vercel deploy staging **Ready** para el SHA nuevo (verificar via `vercel:status` o dashboard).
- [ ] **Suite full contra staging**:
  ```powershell
  $env:PLAYWRIGHT_BASE_URL = "https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app"
  npm run test:e2e
  ```
  Esperado: verde (sin regresiones de producto-1 sobre el resto).
- [ ] **Revisión visual PO** (badge Reserva online + categoría Etología + wizard 12 campos ya aprobados en producto-1) — re-verificar en preview de staging que no se rompieron con el merge.
- [ ] **Cleanup MCP staging** post-suite: `0 filas [TEST-%`.
- [ ] Pegar evidencia P5 al final del `ACTA_SPRINT_PRODUCTO-1.md`.

## Fase C — Merge `zonab-1 → staging`

**Pre-check**:
- [ ] `git checkout staging && git pull origin staging` (post-Fase B).
- [ ] `git checkout zonab-1 && git pull origin zonab-1`
- [ ] **FF-check**: `git log --oneline zonab-1..staging` — esperado NO vacío (staging tiene producto-1 + N15). **Merge normal esperado**.
- [ ] **Conflicto potencial**: BACKLOG.md tiene ediciones en ambos lados (advisory lock ZONAB-1 + docs Pro producto-2). Resolver aceptando ambos bloques.

**Ejecución**:
```bash
git checkout staging
git merge zonab-1  # merge commit
git push origin staging
```

**Post-merge**:
- [ ] Vercel deploy staging **Ready**.
- [ ] **Suite full contra staging** — esperado verde (ZB1-ZB4 no toca surface UI ejercitada por especs; instrumentación drift cron es opt-in).
- [ ] **Revisión visual PO** aplica a ZB1-ZB2 (modales + a11y + h-10 táctil + DayPicker responsive) — smoke sobre el bloque agenda del `ServiceFormModal` + un modal cualquiera del admin.
- [ ] **Verificar log `[cron-drift-summary]`** en Vercel logs staging tras la primera corrida del cron (ZB4-b aterriza el log). Esperado: aparece con `driftTutor:0 driftProveedor:0` si el fix funciona.
- [ ] Cleanup MCP: `0 [TEST-%`.
- [ ] Pegar evidencia P5 al `ACTA_ZB1.md` / `ACTA_ZB4.md`.

## Fase D — Merge `producto-2 → staging`

**Pre-check**:
- [ ] `git checkout staging && git pull origin staging` (post-Fase C).
- [ ] `git checkout producto-2 && git pull origin producto-2`
- [ ] **FF-check**: `git log --oneline producto-2..staging` — esperado NO vacío. **Merge normal esperado**.
- [ ] **Conflicto potencial**: BACKLOG.md (ANALYTICS-1 en producto-2 + advisory lock ZONAB-1). CLAUDE.md (reglas plugins + Plan Vercel Pro). Ambos: aceptar ambos bloques.
- [ ] **Conflicto potencial**: `pages/mis-solicitudes.tsx` si zonab-1 tocó modales relacionados — verificar diff antes de merge.

**Ejecución**:
```bash
git checkout staging
git merge producto-2  # merge commit
git push origin staging
```

**Post-merge**:
- [ ] Vercel deploy staging **Ready**.
- [ ] **Suite full contra staging** — esperado **verde 58/58** (esta es la corrida canónica del sprint completo mergeado).
- [ ] **Revisión visual PO** aplica al ciclo REALIZADA/VENCIDA (estados derivados + pestañas + chip mascota + CTA "Volver a solicitar" + cancel-then-navigate). Smoke manual en `/mis-solicitudes` de Camila.
- [ ] Cleanup MCP: `0 [TEST-%`.
- [ ] Pegar evidencia P5 al `ACTA_SPRINT_PRODUCTO-2.md`.

## Fase E — Promoción `staging → main` (opcional, decisión PO)

**Condiciones para promover a prod**:
- [ ] Los 3 sprints mergeados a staging sin issues.
- [ ] Suite full 58/58 verde en el SHA final de staging.
- [ ] Cero smokes rotos en preview staging.
- [ ] PO da GO explícito de promoción a prod (esto NO es automático post-merge staging — el desfile puede terminar en staging si PO quiere validar más tiempo).

**Ejecución**:
```bash
git checkout main
git pull origin main
git merge staging  # FF-only esperado (main == staging - los 3 sprints)
git push origin main
```

Vercel deploy prod → smokes prod (los mismos 4 de la Fase 7 N15, adaptados a los nuevos SHAs).

## Rollback plan (cada fase)

Si cualquier suite post-merge falla o smoke visual detecta regresión:
- **En staging**: `git reset --hard <SHA anterior al merge>` + `git push --force-with-lease origin staging`. Fix en la rama del sprint, re-verificar, re-merge.
- **En main (post-Fase E)**: Vercel Instant Rollback al deployment anterior (dashboard → Deployments → Promote). No requiere código.

## Cuadro de tags emitidos post-desfile

Tras cada merge exitoso, emitir tag anotado en el commit del merge (sobre staging o main según fase):

| Fase | Tag propuesto | SHA |
|---|---|---|
| B | `producto-1-staging-<YYYYMMDD>` | (merge commit en staging) |
| C | `zonab-1-staging-<YYYYMMDD>` | (merge commit en staging) |
| D | `producto-2-staging-<YYYYMMDD>` | (merge commit en staging) |
| E (si aplica) | `desfile-prod-<YYYYMMDD>` | (merge commit en main) |

## Contingencias conocidas

- **Suite falla post-merge B/C/D**: puede ser flakiness ambiental (patrón visto ya varias veces con preview cold-start + 2 workers). **Regla**: re-correr aislado el test failed antes de asumir regresión real; si aislado pasa, es flakiness — re-correr full para confirmar.
- **Conflicto BACKLOG.md**: los sprints editaron secciones distintas + ANALYTICS-1 nueva. Aceptar ambos bloques + verificar que los items ANALYTICS-1 (sprint post-desfile) + advisory lock (ZONAB-1) + docs infra Pro queden sin duplicados.
- **Conflicto CLAUDE.md**: producto-2 agregó sección "Vercel plugin" + "security-guidance" + "Playwright + Chrome DevTools" post-N15. Preservar todo ese bloque nuevo al mergear.
- **Cron `[cron-drift-summary]` NO aparece**: si post-ZB4 el log summary no se ve en Vercel Logs staging, verificar que el cron ejecuta contra staging (skipIfNonProd) y que el deploy tiene el código del sprint zonab-1 aterrizado. NO bloquea el merge — es observabilidad, no runtime.

## Métricas del desfile (a reportar en acta final)

- Tiempo total del desfile (start Fase A → fin Fase E).
- Nº de conflictos resueltos por fase.
- Nº de re-corridas de suite por flakiness ambiental.
- SHA final de main tras Fase E (si aplica).
