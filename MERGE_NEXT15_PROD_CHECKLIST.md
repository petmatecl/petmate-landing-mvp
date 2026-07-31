# Merge tren N15 → producción — checklist ejecutable (v1 borrador)

> **ESTADO: BORRADOR — pendiente revisión PO**. No ejecutar hasta aprobación.
> Patrón heredado de `MERGE_F2_PROD_CHECKLIST.md` v2 y
> `MERGE_RECORDATORIOS_PROD_CHECKLIST.md` v2. Reglas de proceso P1-P4 aplicables.

**Alcance**: bump `next@14.2.35 → 15.5.22` + `eslint-config-next@14.2.3 →
15.5.22` + swap `next-pwa@5.6.0 → @ducanh2912/next-pwa@10.2.9` + migración
`images.domains → images.remotePatterns` + fix de bypass Vercel Deployment
Protection (query en URL, no header persistente). Sub-entregables N1-N6
completados en la rama `next15`.

**Contexto operativo clave**:
- **Cero migrations Supabase** — el tren N15 no toca schema, RLS, ni tablas.
  Cero riesgo a nivel BD; el rollback es exclusivamente Vercel side.
- **Cero componentes de UI modificados** — el bump es infra pura + config. Los
  4 templates de email retrofitteados en el tren Recordatorios ya están en
  main desde el merge del 2026-07-30/31.
- **Merge a main CONDICIONADO** al cierre de Fase 5 del tren Recordatorios
  (2 corridas del cron observadas). El merge a `staging` puede hacerse antes
  con suite verde; el merge a `main` espera esa condición.
- **PWA en preview**: `IS_PROD=false` → sirve DEMOLISHER en `/sw.js` (SW
  auto-destructivo). En prod real (post-merge a main) sirve WORKBOX generado
  por `@ducanh2912/next-pwa`. **Este contraste es el criterio invertido de
  S4** entre preview y prod.

Commits en `next15` desde la última promoción a `staging` (6 commits, del más
viejo al más nuevo — ejecutable en cualquier orden por naturaleza aditiva):

```
0727a65 chore(next15): N1+N2 bump 14.2.35 → 15.5.22 + images.remotePatterns
5d91e40 chore(next15): N3 swap next-pwa@5.6.0 → @ducanh2912/next-pwa@10.2.9
8cc7b56 docs(next15): N4 audit fetch() — cero edits necesarios (Pages Router)
27ab079 test(next15): N5 pre — whitelist temporal git-next15 en guarda anti-prod
dadfae2 test(next15): N5 fix bypass Vercel — migrar header persistente → query en URL
<sha del commit N7 con este checklist + BACKLOG UX íconos>
```

---

## Fase 0 — Preflight (en `next15`, antes de tocar `staging`)

### 0.1 Cierre condicional de tren Recordatorios (bloquea Fase 4)

- [ ] **Fase 5 del tren Recordatorios: 2 corridas del cron observadas y
  reportadas cerradas por Aldo en el acta correspondiente**. Ventana de
  observación 18:00-19:30 hora Chile (retención Vercel logs Hobby ~1h;
  captura antes de 19:30 obligatoria). Esta casilla **bloquea únicamente
  la Fase 4** (merge a `main`); Fases 0-3 (preflight, edits especiales,
  merge a `staging`, smokes en preview) pueden ejecutarse antes.

### 0.2 Estado del código

- [ ] **Vercel Dashboard: deployment READY del último commit de `next15`**
  (regla P1). Filtrar Deployments → branch=`next15` → confirmar el SHA
  del último commit local (`git rev-parse HEAD`) coincide con estado
  **Ready**. Si no, PARAR.

- [ ] **Suite e2e 41/41 verde en la última corrida** — corrida con
  `PLAYWRIGHT_BASE_URL=https://pawnecta-landing-mvp-git-next15-*.vercel.app`
  para apuntar al preview de rama. Distribución:
  - `setup` + `setup-tutor` = 2
  - `chromium` (F2-2B) = 8
  - `chromium-tutor` (F2-3) = 22
  - `chromium-cron` (Recordatorios) = 9
  - **Total = 41**, cero flaky.

- [ ] **Check `[TEST-%` residuos en staging**:
  ```sql
  SELECT count(*) FROM agendamientos WHERE tutor_nombre LIKE '[TEST-%';
  ```
  Esperado: **0**. Limpiar si aparece algo (revisar rows primero).

- [ ] **Log de commits a promover** — verificar diff exacto:
  ```bash
  git log --oneline staging..next15
  ```
  Esperado: los 5-6 commits del tren N15 (N1-N7). Si aparece algún commit no
  relacionado → PARAR y triage.

- [ ] **Fast-forward-only check** — confirmar que `staging` no divergió:
  ```bash
  git log next15..staging
  ```
  Esperado: **vacío**. Si trae commits, requiere merge no-FF.

- [ ] **N6 smokes de Aldo contra preview `next15` cerrados con evidencia**
  (Smoke 1 proxy, Smoke 2 imágenes visuales, Smoke 3 ISR, Smoke 4 SW
  demolisher — ver [MERGE — anexo N6 en el acta correspondiente]).

### 0.3 Env vars Vercel prod (verificación)

Sin cambios de env vars requeridos por N1-N6. Solo confirmación:

- [ ] `NEXT_PUBLIC_APP_ENV=production` en scope Production (crítico — es lo
  que activa `IS_PROD=true` → `next-pwa` emite workbox real, no demolisher).
- [ ] `VERCEL_ENV=production` es automático en la Production Branch.
- [ ] Cero cambios a `CRON_SECRET`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SITE_URL`, `EMAIL_FROM`, `PLAYWRIGHT_BYPASS` — todos siguen
  igual que antes del tren.

### 0.4 CASILLAS ESPECIALES DEL TREN N15 (edits explícitos que este checklist EXIGE)

Estas dos casillas capturan compromisos hechos durante N5. Ambas se aplican
en un commit único **antes** del merge a `staging` (Fase 2).

- [ ] **CASILLA A — Remover whitelist temporal `git-next15` de `assertBaseUrlIsStaging`**.
  El commit `27ab079` agregó `!host.includes('git-next15')` a la guarda de
  [playwright.config.ts:52](playwright.config.ts#L52) con comentario inline
  "TEMPORAL tren N15 — remover al mergear (ver N7 Fase 0)". Este edit debe
  revertir esa línea a su estado pre-N15:
  ```typescript
  // Antes del edit:
  if (!host.includes('git-staging') && !host.includes('staging') && !host.includes('git-next15')) {
  // Después del edit:
  if (!host.includes('git-staging') && !host.includes('staging')) {
  ```
  Y remover el comentario "TEMPORAL tren N15..." que lo precede. La opción B
  canónica (deny-list de hosts prod) queda anotada como sprint chico
  post-tren en [BACKLOG.md](BACKLOG.md).

- [ ] **CASILLA B — NO revertir el fix de bypass query** (`dadfae2`). Aunque el
  commit fue disparado por el incidente de N5, es un fix permanente y
  correcto — Vercel cambió su comportamiento del bypass header globalmente
  (no solo para preview), y el patrón query bypass es el único que funciona.
  **Los 3 archivos siguientes deben mantenerse en su estado post-`dadfae2`**:
  - [playwright.config.ts](playwright.config.ts) — sin `extraHTTPHeaders`
    con bypass; comentario largo con el histórico y motivo.
  - [e2e/fixtures/cron-recordatorio.ts:endpointUrl](e2e/fixtures/cron-recordatorio.ts) —
    agrega `x-vercel-protection-bypass` + `x-vercel-set-bypass-cookie` como
    query params.
  - [e2e/specs/f2-recordatorios-cron/all.spec.ts](e2e/specs/f2-recordatorios-cron/all.spec.ts) —
    `bypassHeaders()` / `bypassHeadersNoSecret()` sin headers de bypass.
  Casilla explícita para prevenir revert accidental durante el clean-up de
  CASILLA A.

- [ ] Commit único de las casillas A + B (verificación):
  ```bash
  git checkout next15
  # Aplicar edit CASILLA A en playwright.config.ts
  git diff playwright.config.ts   # ver solo la línea removida + comentario
  git add playwright.config.ts
  git commit -m "chore(next15): remover whitelist git-next15 pre-merge (N7 Fase 0)"
  git push origin next15
  ```
  Verificar en Vercel Dashboard que el nuevo deploy queda Ready.

### 0.5 Backup Supabase — N/A

El tren N15 no toca schema, RLS, ni tablas. Cero necesidad de PITR/backup
manual. Ítem incluido explícito para que la ausencia sea intencional, no un
olvido.

## Fase 1 — Migraciones Supabase — N/A

**Cero migrations en este tren**. Fase incluida como skeleton del patrón
heredado para no dar la impresión de que se omitió.

## Fase 2 — Merge `next15 → staging` + deploy

```bash
git checkout staging
git pull origin staging
git merge next15    # fast-forward esperado si Fase 0.2 lo confirmó; sino PARAR
git push origin staging
```

- [ ] **Fast-forward esperado**. Output debe decir `Fast-forward`. Si dice
  `Merge made by the 'ort' strategy` → PARAR; `staging` divergió entre
  Fase 0.2 y ahora.

- [ ] Vercel autodeploya en push a `staging`. Esperar ~1-2 min. Verificar
  build Ready. Si falla → NO se activa el nuevo deploy; revisar logs.

- [ ] Verificar SHA post-deploy: `git ls-remote origin staging` debe
  coincidir con el HEAD local. Pegar output en el acta.

## Fase 3 — Suite e2e + smokes contra `staging` post-merge

- [ ] **Suite completa 41/41 verde contra staging** (baseURL default de
  `playwright.config.ts` = staging Vercel URL — ya no necesita override
  `PLAYWRIGHT_BASE_URL` porque `staging` = último SHA de `next15`).

- [ ] **Check `[TEST-%` residuos post-suite**: 0.

- [ ] **Los 4 smokes de N6 contra `staging`** (mismos comandos, cambiando
  `$env:BASE` al hostname de staging):
  - S1 Proxy `/supabase-proxy/*` — JSON idéntico al directo.
  - S2 `next/image` en 3 páginas — imágenes cargan, Network limpio (`···`
    en Info del servicio es PRE-EXISTENTE — no bloquear).
  - S3 ISR `/cuidado/providencia` — 200 con HTML.
  - S4 `/sw.js` — **sigue siendo DEMOLISHER en staging** (staging es
    `VERCEL_ENV=preview`, no production; mismo criterio que preview
    `next15`).

## Fase 4 — Merge `staging → main` + deploy prod

**BLOQUEADA hasta cierre de Fase 5 del tren Recordatorios (casilla 0.1)**.

```bash
git checkout main
git pull origin main
git merge staging   # fast-forward esperado
git push origin main
```

- [ ] Fast-forward. Vercel autodeploya. Verificar build Ready.
- [ ] `git ls-remote origin main` = último SHA promovido. Pegar en acta.

## Fase 5 — Smoke prod (post-deploy inmediato)

**Los MISMOS 4 smokes de N6 pero contra `www.pawnecta.com`. Criterio S4 se
INVIERTE**: en prod real, `/sw.js` debe servir WORKBOX (no demolisher).

**Setup PowerShell**:
```powershell
$env:BASE = "https://www.pawnecta.com"
$env:ANON = "<pegar valor NEXT_PUBLIC_SUPABASE_ANON_KEY prod>"
$env:SUPABASE = "https://ouezpeeiwjwawauidrqq.supabase.co"
# NOTA: prod NO tiene Vercel Deployment Protection → cero bypass necesario en URL/header.
```

### 5.1 Smoke 1 — Proxy `/supabase-proxy/*` prod

```powershell
$viaProxy = Invoke-RestMethod `
  -Uri "$env:BASE/supabase-proxy/rest/v1/categorias_servicio?select=slug&limit=3" `
  -Headers @{ "apikey" = $env:ANON; "Authorization" = "Bearer $env:ANON" }
$directo = Invoke-RestMethod `
  -Uri "$env:SUPABASE/rest/v1/categorias_servicio?select=slug&limit=3" `
  -Headers @{ "apikey" = $env:ANON; "Authorization" = "Bearer $env:ANON" }
$viaProxy | ConvertTo-Json -Compress
$directo  | ConvertTo-Json -Compress
```
- [ ] Ambos JSON idénticos (3 slugs mismos).

### 5.2 Smoke 2 — `next/image` en 3 páginas prod

Abrir en browser (sin bypass query — prod no lo requiere):
- [ ] `https://www.pawnecta.com/explorar` — cards con foto OK, Network limpio.
- [ ] `https://www.pawnecta.com/servicio/<id-real-prod>` — galería + Network limpio.
  (Aldo elige un servicio real de prod; los ids de staging no aplican).
- [ ] `https://www.pawnecta.com/proveedor/<id-real-prod>` — avatar + Network limpio.

### 5.3 Smoke 3 — ISR `/cuidado/providencia` prod

```powershell
Invoke-WebRequest -Uri "$env:BASE/cuidado/providencia" -UseBasicParsing |
  Select-Object StatusCode, @{N='LenKB';E={[math]::Round($_.RawContentLength/1024,1)}},
                @{N='HasTitle';E={$_.Content -match "<title[^>]*>"}}
```
- [ ] StatusCode = 200, LenKB > 10, HasTitle = True. Vercel Logs sin error de gSP.

### 5.4 Smoke 4 — SW en prod: **debe ser WORKBOX** (criterio invertido vs preview/staging)

```powershell
$sw = Invoke-WebRequest -Uri "$env:BASE/sw.js" -UseBasicParsing
$sw.StatusCode
$sw.RawContentLength
$sw.Content.Substring(0, [Math]::Min(200, $sw.Content.Length))
```

- [ ] StatusCode = 200.
- [ ] **RawContentLength ≈ 14000+ bytes** (workbox real; el demolisher es
  ~1656 bytes — si ves ese tamaño en prod, hay bug en la gate `IS_PROD` o
  env var mal seteada, PARAR).
- [ ] Content **NO** empieza con `// AUTO-GENERADO por scripts/write-sw-demolisher.js`.
  Debe empezar con código workbox tipo `if(!self.define){...}define(["./workbox-<hash>"],...`
- [ ] En browser: abrir `https://www.pawnecta.com/` → DevTools → Application
  → Service Workers → confirmar `sw.js` activated y sin errores rojos en
  Console tipo `SW registration failed`.
- [ ] Verificar que existe `https://www.pawnecta.com/workbox-<hash>.js`
  (200) — el chunk del workbox debe estar presente.

## Fase 6 — Monitor 48h post-merge a main

- [ ] **Vercel Logs**: sin spike de 500 en cualquier endpoint (`/`, `/explorar`,
  `/servicio/*`, `/proveedor/*`, `/api/*`, `/api/cron/*`).
- [ ] **Resend Dashboard**: cero cambios en la tasa de delivery/bounce vs
  baseline pre-N15.
- [ ] **Sentry / Console errors reportados por Aldo** en browsing normal: cero
  errores nuevos de `next/image` o `next/link`.
- [ ] **Vercel Cron Jobs**: los 6 crons siguen ejecutando en su schedule
  (verificar Last Run de cada uno post-24h en el Dashboard).
- [ ] **Bandeja soporte**: cero tickets nuevos "no puedo entrar" / "página
  rota" / "mensaje raro".

## Plan de rollback

### Escenario A — Deploy Vercel roto (build fail o runtime crash inmediato)

Vercel Dashboard → Deployments → deploy anterior a este merge N15 →
**Promote to Production**. 1 click. Bundle vuelve al Next 14.2.35 sin
tocar nada más.

**Consideración de crons**: doc oficial Vercel confirma que Instant
Rollback NO desregistra crons agregados post-rollback (verificado durante
tren Recordatorios, ver `MERGE_RECORDATORIOS_PROD_CHECKLIST.md` Escenario
A). Como este tren N15 **no agrega ni remueve crons**, ese caveat no
aplica — los 6 crons siguen funcionando idénticos.

### Escenario B — Regresión de PWA (SW workbox del fork rompe cache/offline)

Vercel Instant Rollback (escenario A) suficiente. La sesión del browser
del usuario detectará el nuevo `/sw.js` (Cache-Control max-age=0 fuerza
re-check), instalará el SW previo del deploy revertido. Si el problema
persiste porque el usuario mantiene cache viejo, el `sw-demolisher` NO
ayuda acá (solo actúa en no-prod). Solución: comunicar al usuario que
haga hard refresh (Ctrl+Shift+R) — issue transitorio hasta próximo
navigate.

### Escenario C — Regresión de `next/image` en algún host

Si `remotePatterns` de N2 dejó fuera algún host que sí se usaba
(improbable — mantuvimos paridad 1:1 con `domains`), el síntoma es
"broken image" en Network con status 400 y mensaje "Invalid src prop".
Fix-forward preferido: agregar el host faltante a `remotePatterns` en
`next.config.js` + commit + push. Rollback via Escenario A también
válido.

**Regla general**: preferir **fix-forward** sobre rollback. Es un bump
mayor, revertir es alto costo si se acumulan mejoras post-merge.

## Deuda post-launch (registrada en BACKLOG)

- **[P3] Refactor guarda anti-prod Playwright** — de whitelist de hosts a
  deny-list de prod únicamente. Ítem ya en `BACKLOG.md`.
- **[P3] Endurecer `images.remotePatterns`** — scopear hosts Supabase a
  `/storage/v1/**` en vez de `/**`. Ítem ya en `BACKLOG.md`.
- **[P3] Íconos específicos por campo en "Información del servicio"** —
  reemplazar el `···` genérico por íconos semánticos (peso, edad,
  distancia, etc.). Detectado en smoke S2 del tren N15, confirmado
  pre-existente. Ítem ya en `BACKLOG.md`.

## Anexo — commit único post-Fase 6 (documentación en `main`)

Si Fase 6 pasa limpia, cerrar el tren con tag anotado:

```bash
git checkout main
git pull origin main
git tag -a next15-prod-YYYYMMDD -m "Tren N15 en prod — bump Next 14.2.35 → 15.5.22 + swap PWA fork"
git push origin next15-prod-YYYYMMDD
```

Actualizar `CLAUDE.md > Vulnerability management` para reflejar el nuevo
estado: (a) matriz 4/4 mitigados sigue vigente pero ahora sobre 15.5.22
(baseline actualizado); (b) el tren N15 pasa de "en curso" a "EN PROD
desde YYYY-MM-DD (tag next15-prod-YYYYMMDD sobre <sha>)"; (c) próxima
deuda con timer: monitorear EOL de la línea 15.x (aprox Q4 2027 basado
en política 2-años Maintenance LTS).
