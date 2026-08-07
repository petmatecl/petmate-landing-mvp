# Mini-checklist — Cola de merges post-monitor N15

**Cierre esperado del monitor**: jueves 06-ago ~15:00 CLT (Fase 8 checklist N15 en curso desde 2026-08-04 ~15:00).

**Orden estricto de la cola** (autorización pendiente por PO al abrir la ventana):
1. `producto-1` — sprint técnicamente completo + revisión visual PO aprobada 2026-08-04.
2. `zonab-1` — sprint completo con ZB1-ZB4 cerrados (actas pushed).
3. `producto-2` — sprint técnicamente completo con PD1+PD2+PD4-bis+PD3 (acta consolidada en este mismo commit).
4. `prelaunch-1` — sprint técnicamente completo con PL1 (SEO 307-fantasmas) + PL2 (gate GA por entorno). Suite 42/42 verde en preview propio (SHA `45a8e9c` código + `2ed8024` acta con cabos). **Merge BLOQUEADO hasta cerrar Cabo #2** (ver Contingencias). Alternativa operativa aceptada por PO: **fusionar en sweeps del jueves** si el operador del desfile lo absorbe mejor tras Fase D.

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

## Fase D-bis — Merge `prelaunch-1 → staging` (o fusión en sweeps del jueves)

**Bloqueo previo**: los DOS CABOS de Contingencias abajo deben estar cerrados con evidencia ANTES de arrancar esta fase.

**Pre-check**:
- [x] **Cabo #2 CERRADO** (verificación `NEXT_PUBLIC_APP_ENV=production` en scope Production de Vercel — ver Contingencias abajo). **Ejecución 2026-08-04**: caso (b) resuelto por creación — Aldo confirmó que la env var NO existía en scope Production (confirmando sospecha del repaso del 30-jul); creada HOY en el proyecto `pawnecta-landing-mvp` (primer intento a nivel team-shared fue borrado y re-creado en el scope de proyecto correcto, consistente con el resto de las env vars del proyecto). Configuración final: Key `NEXT_PUBLIC_APP_ENV`, Value `production`, Scope SOLO Production, no-sensitive (legible a futuro), Updated timestamp de hoy. **Sin redeploy requerido** (nota P4): el consumidor es el build futuro del merge de prelaunch-1 — ningún deploy vigente lee esta env var, el desfile la horneará al buildear el merge. Fallback hostname (B2 del análisis del acta prelaunch-1) archivado sin uso.
- [ ] `git checkout staging && git pull origin staging` (post-Fase D).
- [ ] `git checkout prelaunch-1 && git pull origin prelaunch-1`
- [ ] **FF-check**: `git log --oneline prelaunch-1..staging` — esperado NO vacío (staging tiene producto-1 + zonab-1 + producto-2, prelaunch-1 forkeó de staging pre-desfile). **Merge normal esperado**.
- [ ] **Conflicto pre-declarado en `playwright.config.ts`**: garantizado por Cabo #1. Ver resolución prescrita abajo.
- [ ] **NO se esperan otros conflictos**: verificación previa cero colisiones (sección 2 de `ACTA_SPRINT_PRELAUNCH-1.md`) confirmó que las 5 superficies de PL1+PL2 (`pages/servicio/*`, `pages/sitemap.xml.tsx`, `lib/gtag.ts`, `pages/_app.tsx`, `pages/_document.tsx`) no fueron tocadas por producto-1 / zonab-1 / producto-2.

**Resolución de conflicto `playwright.config.ts` (Cabo #1 — aplicar directo, sin re-consulta al PO)**:

```bash
# Durante el merge, aceptar la versión de staging (que ya trae PR0 deny-list):
git checkout staging -- playwright.config.ts
# La whitelist ampliada de prelaunch-1 muere en el merge — es lo prescrito.
```

**Justificación operativa**: la deny-list `assertBaseUrlIsNotProd` de PR0 (`e2e/setup/guard.ts`) acepta cualquier preview `*-petmatecls-projects.vercel.app` sin whitelist específica — incluye `git-prelaunch-1-*`. Cero mantenimiento por-rama. La whitelist de prelaunch-1 era un fix ambiental temporal, no una decisión de arquitectura.

**Ejecución**:
```bash
git checkout staging
git merge prelaunch-1  # merge commit — conflict esperado en playwright.config.ts
git checkout staging -- playwright.config.ts   # resolver: gana deny-list
git add playwright.config.ts
git commit --no-edit
git push origin staging
```

**Post-merge**:
- [ ] Vercel deploy staging **Ready** para el SHA nuevo.
- [ ] **Suite full contra staging** — esperado verde. La deny-list debe operar sin whitelist específica para el preview de staging (mismo comportamiento canónico).
- [ ] **Smoke PL1 runtime en staging con cookie jar**:
  - `curl /servicio/00000000-0000-0000-0000-000000000000` → status **404**.
  - `curl /sitemap.xml` → XML válido, `<loc>` count coherente (solo proveedores aprobados).
- [ ] **Smoke PL2 gate runtime en staging**: `curl /explorar` → HTML sin `googletagmanager.com/gtag/js` ni `SCNG5J67E9`.
- [ ] Cleanup MCP staging: `0 [TEST-%`.
- [ ] Pegar evidencia P5 al `ACTA_SPRINT_PRELAUNCH-1.md`.

**Alternativa operativa** (aceptada por PO): si el operador del desfile prefiere, prelaunch-1 puede **fusionarse en sweeps del jueves** tras Fase D, absorbido por los sweeps de la Auditoría #2 en vez de tener fase propia. Cero colisión + change chico + un solo spec nuevo → merge trivial vía sweeps es viable.

## Fase E — Promoción `staging → main` (opcional, decisión PO)

**Condiciones para promover a prod**:
- [ ] Los 4 sprints mergeados a staging sin issues (producto-1 + zonab-1 + producto-2 + prelaunch-1, o alternativa vía sweeps para prelaunch-1).
- [ ] Suite full verde en el SHA final de staging (baseline post-desfile: 58 tests producto-2 + 1 nuevo prelaunch-1 = 59, si prelaunch-1 se mergea).
- [ ] Cero smokes rotos en preview staging.
- [x] **Cabo #2 cerrado** con evidencia (env var `NEXT_PUBLIC_APP_ENV=production` creada 2026-08-04 en scope Production del proyecto `pawnecta-landing-mvp`, sin redeploy requerido — el desfile la hornea al buildear el merge de prelaunch-1).
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
| D-bis (si aplica) | `prelaunch-1-staging-<YYYYMMDD>` | (merge commit en staging) |
| E (si aplica) | `desfile-prod-<YYYYMMDD>` | (merge commit en main) |

## Contingencias conocidas

- **Suite falla post-merge B/C/D/D-bis**: puede ser flakiness ambiental (patrón visto ya varias veces con preview cold-start + 2 workers). **Regla**: re-correr aislado el test failed antes de asumir regresión real; si aislado pasa, es flakiness — re-correr full para confirmar.
- **Conflicto BACKLOG.md**: los sprints editaron secciones distintas + ANALYTICS-1 nueva. Aceptar ambos bloques + verificar que los items ANALYTICS-1 (sprint post-desfile) + advisory lock (ZONAB-1) + docs infra Pro queden sin duplicados.
- **Conflicto CLAUDE.md**: producto-2 agregó sección "Vercel plugin" + "security-guidance" + "Playwright + Chrome DevTools" post-N15. Preservar todo ese bloque nuevo al mergear.
- **Cron `[cron-drift-summary]` NO aparece**: si post-ZB4 el log summary no se ve en Vercel Logs staging, verificar que el cron ejecuta contra staging (skipIfNonProd) y que el deploy tiene el código del sprint zonab-1 aterrizado. NO bloquea el merge — es observabilidad, no runtime.

### Cabo #1 — Conflicto de guarda en `playwright.config.ts` (Fase D-bis, PRE-DECLARADO por PO 2026-08-04)

**Garantizado**: `prelaunch-1` amplió la whitelist vieja del guard (fork de staging pre-desfile, tokens `[git-staging, staging, prelaunch]`) mientras la cola trae la deny-list de PR0 (`assertBaseUrlIsNotProd` importada de `e2e/setup/guard.ts`). Al mergear prelaunch-1 en Fase D-bis, `playwright.config.ts` **CHOCA**.

**Resolución prescrita (aplicar directo, sin re-consulta al PO)**: **GANA LA DENY-LIST DE PR0** — es el estado final de la guarda; la whitelist ampliada de prelaunch-1 muere en el merge.

**Comando de resolución**:
```bash
# Durante el merge de prelaunch-1 → staging, cuando aparezca el conflict:
git checkout staging -- playwright.config.ts
git add playwright.config.ts
git commit --no-edit
```

**Verificación post-resolución**: correr suite full contra el preview staging tras el merge. La deny-list acepta el host de staging (`git-staging-*-petmatecls`) sin whitelist específica — misma corrida canónica que la Fase D. Si la suite pasa verde, la resolución fue correcta.

**Sorpresa desactivada**: cero decisión nueva en el momento del merge.

### Cabo #2 — Gate PL2 condicionado a env var `NEXT_PUBLIC_APP_ENV=production` (Fase D-bis, PRE-DECLARADO por PO 2026-08-04) — **CERRADO 2026-08-04 por caso (b)**

**Resolución final**: caso (b) confirmado (la env var NO existía en scope Production, confirmando sospecha del repaso del 30-jul). Aldo eligió **opción B1 — creación con ritual P4 adaptado**:

- Key: `NEXT_PUBLIC_APP_ENV`
- Value: `production`
- Scope: SOLO Production (no Preview ni Development)
- Sensitivity: no-sensitive (legible a futuro para verificación por dashboard)
- Proyecto: `pawnecta-landing-mvp` (scope de proyecto, no team-shared — hubo primer intento team-shared que se borró y re-creó en proyecto para mantener consistencia con el resto de env vars del proyecto).
- Updated timestamp: 2026-08-04.

**Adaptación P4 aplicada**: SIN redeploy requerido en este caso. El consumidor de la env var es el bundle client generado por el build de prod, y el próximo build de prod ocurrirá al mergear prelaunch-1 hasta main (Fase E). Ningún deploy vigente lee `NEXT_PUBLIC_APP_ENV` — la env var quedó "durmiente" hasta el desfile. El build del merge la horneará al bundle client automáticamente. El smoke prod post-Fase E (`curl https://www.pawnecta.com/explorar` con consent aceptado → grep `googletagmanager.com/gtag/js`) es el momento canónico de verificación runtime end-to-end.

**Fallback hostname (opción B2 del análisis)**: archivado sin uso. Queda documentado en el acta prelaunch-1 como referencia por si algún día la env var se pierde y se prefiere una señal client-side sin dependencia de configuración Vercel.

**Merge de prelaunch-1 DESBLOQUEADO** por este cabo. El único gate restante del desfile completo vuelve a ser el original: cierre limpio del monitor N15 jueves ~15:00 CLT.

---

**HISTÓRICO (para trazabilidad del análisis pre-cierre — no aplicar)**:

**Situación**: el gate de PL2 (fix del bug de contaminación de GA) asume que la env var `NEXT_PUBLIC_APP_ENV=production` existe en el scope **Production** de Vercel. En el repaso del 30-jul quedó como 'no visible'. Si NO existe (o vale distinto de `'production'`) → `IS_PROD_CLIENT === false` en prod → `GA_TRACKING_ID === null` → **GA muere silencioso en prod al mergear** (modo de falla INVERSO al bug que arreglamos: en vez de contaminar staging, apaga tracking real en prod).

**Acción requerida ANTES del merge de prelaunch-1 (Aldo, en Vercel Dashboard)**:

1. Ir a Project Settings → Environment Variables → filtro scope **Production**.
2. Buscar `NEXT_PUBLIC_APP_ENV`.
3. Verificar valor + timestamp "Updated".

**Ramas de decisión según resultado**:

- **(a)** Existe con valor exacto `'production'` → **CABO CERRADO**. Anotar evidencia (screenshot del dashboard + valor exacto + "Updated" timestamp) en este archivo antes de arrancar Fase D-bis. Merge desbloqueado.

- **(b)** NO existe, O valor distinto de `'production'` → **DOS OPCIONES** a evaluar con el PO antes de ejecutar:

  **B1 — Crear en scope Production con ritual P4 completo**:
  - Dashboard → Add New: `NEXT_PUBLIC_APP_ENV = production` en scope Production.
  - Verificar timestamp "Updated" en la fila (bug UI de Vercel observado el 2026-07-28: guardar puede no persistir; recargar página y re-guardar si el timestamp no refleja el edit).
  - **Redeploy explícito** del último deploy prod para que la env aterrice al bundle (env vars nuevas NO se aplican al bundle actual hasta redeploy).
  - **Smoke inmediato** post-redeploy: `curl https://www.pawnecta.com/explorar` con cookie de consent aceptado → grep HTML → debe aparecer `googletagmanager.com/gtag/js`. Si aparece, gate funciona.

  **B2 — Cambiar el gate a una señal que sí exista en el bundle client**:
  - Documentar cuál con evidencia del bundle antes de commitear.
  - Candidatos evaluados:
    - **`window.location.hostname === 'www.pawnecta.com' || 'pawnecta.com'`** — client-side puro, cero env var, cero configuración Vercel. **Contra**: hardcodea el dominio de prod (si algún día cambia, el gate se rompe silente — mismo modo de falla que hoy). **Recomendación por defecto si va por B2**: es el más simple y sin dependencia externa.
    - **`process.env.NODE_ENV === 'production'`** — inyectado automáticamente por Next.js. **DESCARTADO**: vale `'production'` en TODOS los builds de producción de Next (prod + preview + staging), NO diferencia prod-real vs preview → NO sirve para el objetivo del gate.
    - **`NEXT_PUBLIC_VERCEL_ENV`** mapeado desde `VERCEL_ENV` en `next.config.js` — expone al bundle client. **Contra**: mismo esfuerzo operativo que B1 con misma exposición al bug de env no seteada. **No hay ventaja neta vs B1**.

**MERGE DE PRELAUNCH-1 BLOQUEADO** hasta cerrar este cabo con evidencia. Criterio adicional al checklist. Si se elige B2, el cambio de código de PL2 se aplica en la rama prelaunch-1 con un commit adicional antes del merge (rehacer smoke runtime en preview + build P1).

## Métricas del desfile (a reportar en acta final)

- Tiempo total del desfile (start Fase A → fin Fase E).
- Nº de conflictos resueltos por fase.
- Nº de re-corridas de suite por flakiness ambiental.
- SHA final de main tras Fase E (si aplica).
