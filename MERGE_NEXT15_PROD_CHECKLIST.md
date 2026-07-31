# Merge tren N15 → producción — checklist ejecutable (v2)

> **ESTADO: v2 con corrección de secuencia**. Fases 1-5 con autorización
> adelantada del PO — pueden ejecutarse SIN esperar cierre de Fase 5 del
> tren Recordatorios. **Fase 6 (merge a `main`) BLOQUEADA** hasta ese cierre.
>
> Cambio v1 → v2: reordenada la Fase 0 vieja para eliminar una trampa de
> secuencia — "remover whitelist git-next15" NO puede ir antes de la
> suite final contra el preview `next15` (la guarda restaurada rechazaría
> el hostname del propio preview). Orden nuevo: sync check → suite pre-
> cleanup (whitelist activa) → cleanup → merge staging → suite staging
> con guarda natural.
>
> Patrón heredado de `MERGE_F2_PROD_CHECKLIST.md` v2 y
> `MERGE_RECORDATORIOS_PROD_CHECKLIST.md` v2. Reglas P1-P4 aplicables.

**Alcance**: bump `next@14.2.35 → 15.5.22` + `eslint-config-next@14.2.3 →
15.5.22` + swap `next-pwa@5.6.0 → @ducanh2912/next-pwa@10.2.9` + migración
`images.domains → images.remotePatterns` + fix bypass Vercel Deployment
Protection (query en URL, no header persistente). Sub-entregables N1-N6
completados en rama `next15`.

**Contexto operativo clave**:
- **Cero migrations Supabase**. Fase 1 explicítamente N/A.
- **Cero componentes de UI modificados**. Bump infra + config puro.
- **Merge a `main` CONDICIONADO**: solo Fase 6 requiere cierre de Fase 5
  del tren Recordatorios (2 corridas del cron observadas, ventana 18:00-
  19:30 Chile). Fases 1-5 (hasta staging inclusive) autorizadas por PO
  para ejecutar antes → staging hornea Next 15 un día extra antes de prod.
- **PWA S4 con criterio invertido según entorno**:
  - Preview `next15` + staging (`VERCEL_ENV=preview`) → sirve DEMOLISHER
    (`/sw.js` ~1656 bytes, head `// AUTO-GENERADO por scripts/write-sw-demolisher.js`).
  - Prod `www.pawnecta.com` (`VERCEL_ENV=production`) → sirve WORKBOX real
    (`/sw.js` ~14000+ bytes, head `if(!self.define){...}define(["./workbox-<hash>"]...`).

Commits en `next15` desde la última promoción a `staging` (7 commits, del
más viejo al más nuevo):

```
0727a65 chore(next15): N1+N2 bump 14.2.35 → 15.5.22 + images.remotePatterns
5d91e40 chore(next15): N3 swap next-pwa@5.6.0 → @ducanh2912/next-pwa@10.2.9
8cc7b56 docs(next15): N4 audit fetch() — cero edits necesarios (Pages Router)
27ab079 test(next15): N5 pre — whitelist temporal git-next15 en guarda anti-prod
dadfae2 test(next15): N5 fix bypass Vercel — migrar header persistente → query en URL
72250a0 docs(next15): N7 borrador checklist merge next15→staging→main + BACKLOG UX
<SHA v2>  docs(next15): N7 v2 checklist con orden corregido de Fase 0
```

---

## Fase 0 — Preflight (en `next15`, cero mutaciones)

### 0.1 Cierre condicional Fase 5 Recordatorios — bloquea SOLO Fase 6

- [ ] **Fase 5 tren Recordatorios cerrada por Aldo con evidencia de las 2
  corridas del cron observadas** (ventana 18:00-19:30 Chile por retención
  Hobby ~1h). Estado del acta correspondiente marcado "cerrado".

  **Bloqueo específico**: esta casilla bloquea SOLO Fase 6 (merge a `main`).
  Fases 1-5 avanzan sin esperar. Repetido en el header de Fase 6 para no
  perder de vista el condicionamiento.

### 0.2 Estado del código

- [x] **`git rev-parse HEAD`** en `next15` local — reportar SHA.
- [x] **Sync check `staging..next15`** — verifica los 7 commits del tren
  (listados arriba):
  ```bash
  git log --oneline staging..next15
  ```
  Esperado: los 7 SHAs del tren N15, en orden inverso (más nuevo primero).
  Si aparece algún commit no relacionado → PARAR y triage.

- [x] **FF-only staging vs next15**:
  ```bash
  git log --oneline next15..staging
  ```
  Esperado: **vacío**. Si trae commits → `staging` divergió, requiere merge
  no-FF y análisis manual.

- [x] **Ready del SHA v2 del checklist** (el `<SHA v2>` de arriba) en Vercel
  Dashboard, filtro branch=`next15`. Confirmado por Aldo (Ready inicial —
  bundle es doc-only, resolución rápida esperada).

**Ejecución 2026-07-31**:
- `git rev-parse HEAD` local: `79dd1c8` (SHA v2 del checklist).
- `git log --oneline staging..next15` → 7 commits del tren:
  ```
  79dd1c8 docs(next15): N7 v2 checklist con orden corregido de Fase 0
  72250a0 docs(next15): N7 borrador checklist merge next15→staging→main + BACKLOG UX
  dadfae2 test(next15): N5 fix bypass Vercel — migrar header persistente → query en URL
  27ab079 test(next15): N5 pre — whitelist temporal git-next15 en guarda anti-prod
  8cc7b56 docs(next15): N4 audit fetch() — cero edits necesarios (Pages Router)
  5d91e40 chore(next15): N3 swap next-pwa@5.6.0 → @ducanh2912/next-pwa@10.2.9
  0727a65 chore(next15): N1+N2 bump 14.2.35 → 15.5.22 + images.remotePatterns
  ```
- `git log --oneline next15..staging` → vacío (FF-only OK).
- Ready `79dd1c8` en Vercel Dashboard preview branch `next15`: confirmado por Aldo.

### 0.3 Check `[TEST-%` residuos en staging

- [x] Via Supabase MCP staging (read-only) o SQL Editor:
  ```sql
  SELECT count(*) FROM agendamientos WHERE tutor_nombre LIKE '[TEST-%';
  ```
  Esperado: **0**. Si aparece, limpiar antes de la Fase 2 (rows heredados
  de otros trenes).

**Ejecución 2026-07-31**: MCP staging retornó `[{"residuos_test_cron":0}]` ✅.

### 0.4 Env vars Vercel prod (verificación, sin cambios)

- [x] `NEXT_PUBLIC_APP_ENV=production` scope Production seteada. **Crítico**:
  es lo que activa `IS_PROD=true` → `@ducanh2912/next-pwa` emite workbox
  real, no demolisher. Si no está, el S4 prod del smoke Fase 7 va a
  encontrar demolisher (bug).
- [x] `VERCEL_ENV=production` automático (no requiere set manual).
- [x] Sin cambios a `CRON_SECRET`, `RESEND_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `EMAIL_FROM`,
  `PLAYWRIGHT_BYPASS` — todos siguen igual que antes del tren.

**Ejecución 2026-07-31**: confirmación del PO (env vars sin cambios; smoke
prod F2 previo verificó empíricamente el gate `IS_PROD` para envío real de
emails).

### 0.5 Backup Supabase — N/A explícito

El tren N15 no toca schema, RLS, ni tablas. **Cero PITR/backup requeridos**.
Ítem incluido explícito para que la ausencia sea intencional, no un olvido
del checklist.

- [x] N/A confirmado.

### 0.6 Casillas especiales — DECLARADAS acá, EJECUTADAS en Fase 3

Estas dos casillas comprometidas durante N5 se aplican **en Fase 3**, no
acá. Se declaran en Preflight para captura mental y trazabilidad.

- **CASILLA A** (Fase 3): remover `!host.includes('git-next15')` de
  `assertBaseUrlIsStaging` en [playwright.config.ts:52](playwright.config.ts#L52).
- **CASILLA B**: **NO revertir** el fix de bypass query (`dadfae2`). Los 3
  archivos afectados permanecen en su estado post-`dadfae2`:
  [playwright.config.ts](playwright.config.ts) (sin `extraHTTPHeaders`
  bypass), [e2e/fixtures/cron-recordatorio.ts:endpointUrl](e2e/fixtures/cron-recordatorio.ts),
  [e2e/specs/f2-recordatorios-cron/all.spec.ts](e2e/specs/f2-recordatorios-cron/all.spec.ts).
  Casilla explícita para prevenir revert accidental durante Fase 3.

## Fase 1 — Migrations Supabase — N/A

**Cero migrations en este tren**. Fase presente como skeleton del patrón
heredado para claridad.

- [x] N/A confirmado.

## Fase 2 — Suite FINAL contra preview `next15` (whitelist git-next15 aún presente)

Última verificación del código de la rama antes del cleanup. Ejecutar con
la guarda actual (permite `git-next15` en el hostname del preview).

- [x] **`PLAYWRIGHT_BASE_URL`** override apuntando al preview `next15`:
  ```powershell
  $env:PLAYWRIGHT_BASE_URL = "https://pawnecta-landing-mvp-git-next15-petmatecls-projects.vercel.app"
  npm run test:e2e
  Remove-Item Env:\PLAYWRIGHT_BASE_URL
  ```

- [x] **Suite 41/41 verde**, cero flaky. Distribución esperada:
  - `setup` + `setup-tutor` = 2
  - `chromium` (F2-2B) = 8
  - `chromium-tutor` (F2-3) = 22
  - `chromium-cron` (Recordatorios) = 9
  - **Total = 41**.

- [x] **Check `[TEST-%` post-suite = 0** (via MCP staging read-only o
  SQL Editor).

**Ejecución 2026-07-31**:
- SHA testeado: `79dd1c8` (pre-Fase 3, con whitelist activa).
- Corridas: primera 45.0s wall (agente local), re-acreditación PO 33.9s
  wall. Ambas 41/41 verde, cero flaky.
- Última línea Playwright: `41 passed (45.0s)`.
- Fixtures creados durante la corrida:
  ```
  [S1 beforeAll] Servicio creado: e2e-f2-2b-1785506748072 (05c19bf3-…)
  [S1 beforeAll] Servicio F2 creado: e2e-f2-3-1785506748350 (946b4b6a-…)
  ```
- `[TEST-%` post-suite (MCP staging): `[{"residuos_test_cron_post_fase2":0}]` ✅.

## Fase 3 — Ejecución CASILLA A: remover whitelist + commit + push

Edit + commit + push. **Solo remoción de la whitelist**. NO tocar los 3
archivos de CASILLA B (fix bypass query).

- [x] Edit en [playwright.config.ts](playwright.config.ts):
  - Remover línea `!host.includes('git-next15')` de la condición del `if`.
  - Remover comentario "TEMPORAL tren N15 — remover al mergear..." que
    precede.
  - Estado final de la línea 52 vuelve a idéntico pre-tren:
    ```typescript
    if (!host.includes('git-staging') && !host.includes('staging')) {
    ```

- [x] Verificación pre-commit:
  ```bash
  git diff playwright.config.ts
  ```
  Diff debe mostrar SOLO las 2 líneas del bloque de whitelist + su
  comentario TEMPORAL. **Cero otros cambios**. Si `git diff` muestra algo
  más → revisar antes de commitear.

- [x] Commit + push:
  ```bash
  git add playwright.config.ts
  git commit -m "chore(next15): guard: restaurar assertBaseUrlIsStaging post-tren N15"
  git push origin next15
  ```

- [x] **Ready A crítico**: Aldo confirma en Vercel Dashboard que el nuevo
  SHA (post-Fase 3) queda **Ready** en preview branch `next15`. Sin ese
  Ready, PARAR — no proceder a Fase 4.

**Ejecución 2026-07-31**:
- Commit inicial de cleanup: `7ee912b` (`chore(next15): guard: restaurar assertBaseUrlIsStaging post-tren N15`).
- Diff quirúrgico: 7 líneas removidas del bloque TEMPORAL + comentario.
  Sin otros cambios. Verificado con `git diff playwright.config.ts` pre-commit.
- CASILLA B intacta:
  - `playwright.config.ts` bloque `use`: cero `extraHTTPHeaders: {...}` activo.
    Los 2 matches de "extraHTTPHeaders" (líneas 151, 158) son solo
    menciones textuales dentro del comentario histórico de `dadfae2`.
  - `e2e/fixtures/cron-recordatorio.ts` y `e2e/specs/f2-recordatorios-cron/all.spec.ts`:
    `git status` vacío — cero modificaciones.
- Push a `origin/next15` OK: `79dd1c8..7ee912b next15 -> next15`.
- **Meta-commit P5** aplicado inmediatamente después: `cf69f58` (`docs(next15): P5 evidencia por fase en repo + evidencia Fases 0-3 aplicada`).
  Bump del "último SHA" de la rama de `7ee912b` → `cf69f58`.
- **Ready A confirmado por PO 2026-07-31**: opción A elegida — Ready `cf69f58`
  (SHA real que se mergea, docs no-runtime-impact que Vercel builda con cache
  reuse). Autoriza Fase 4.

## Fase 4 — Merge `next15 → staging` + deploy staging

```bash
git checkout staging
git pull origin staging
git merge next15    # fast-forward esperado (Fase 0.2 lo confirmó); si NO es FF, PARAR
git push origin staging
```

- [x] **Fast-forward esperado**. Output debe decir `Fast-forward`. Si dice
  `Merge made by the 'ort' strategy` → PARAR: `staging` divergió entre
  Fase 0.2 y ahora. Investigar antes de continuar.

- [ ] Vercel autodeploya en push a `staging`. Esperar ~1-2 min.

- [ ] **Ready B crítico**: Aldo confirma en Vercel Dashboard que el nuevo
  SHA de `staging` (= último de `next15` post-Fase 3) queda **Ready**. Sin
  ese Ready, PARAR — no correr Fase 5.

- [x] Verificar SHA post-deploy: `git ls-remote origin staging` debe
  coincidir con el HEAD local de `next15` post-Fase 3. Pegar output en el
  acta.

**Ejecución 2026-07-31**:
- Branch guard OK antes del checkout: `git branch --show-current` = `staging`
  post-checkout, confirmado con `grep -qx staging`.
- SHA staging pre-merge: `6274d50` (último commit tren Recordatorios previo).
- `git pull origin staging` → `Already up to date`.
- `git merge next15` output: cambios en 10 archivos (+2686/-1837), incluye
  `MERGE_NEXT15_PROD_CHECKLIST.md` y `next15-notas/N4-audit-fetch.md` como
  create mode 100644. **Ausencia de "Merge made by..." + presencia solo de
  stats confirman FF** (verificado por `git log --oneline -5` — los últimos
  5 commits son los del tren N15 tal cual estaban en `next15`, sin commit
  de merge intermedio).
- SHA staging post-merge: `cf69f58` (== HEAD `next15`, prueba FF puro).
- `git push origin staging` → `6274d50..cf69f58 staging -> staging` ✅.
- `git ls-remote origin staging` = `cf69f58f21e0f0668ab8c5c9d87ee7e3c1ed2933`
  ✅ coincide con local.
- **Ready B pendiente**: esperando confirmación PO de `cf69f58` deploy Ready
  en branch `staging`.

## Fase 5 — Suite completa contra `staging` (guarda natural post-cleanup)

- [x] **Suite completa 41/41 verde contra staging**. Sin override de
  `PLAYWRIGHT_BASE_URL` — el default de `playwright.config.ts` apunta al
  staging Vercel URL con hostname `git-staging`. La guarda restaurada en
  Fase 3 acepta este hostname naturalmente.
  ```powershell
  npm run test:e2e
  ```

- [x] Distribución esperada idéntica a Fase 2: 41/41, cero flaky.

- [x] **Check `[TEST-%` post-suite = 0** (via MCP staging).

- [x] **Los 4 smokes de N6 contra `staging`** (`https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app`):
  - S1 Proxy `/supabase-proxy/*` — JSON idéntico al directo.
  - [ ] S2 `next/image` en 3 páginas visuales — imágenes cargan (`···` en Info
    del servicio es PRE-EXISTENTE de PO, no bloquear). *Pendiente de Aldo
    (browser visual).*
  - S3 ISR `/cuidado/providencia` — 200 con HTML.
  - S4 `/sw.js` — **DEMOLISHER en staging** (staging es `VERCEL_ENV=preview`;
    ~1656 bytes, head `// AUTO-GENERADO...`).

**Ejecución 2026-07-31**:

**5.a Suite 41/41 contra staging (SHA `ea1bf5a`, guarda natural)**:
- Wall: 38.2s. Cero flaky. `41 passed` línea final.
- Fixtures creados: `e2e-f2-2b-1785510961590` (4c6a809a-…), `e2e-f2-3-1785510961613` (8433a256-…).
- Auth flows OK con guarda restaurada (`assertBaseUrlIsStaging` pasa con
  hostname `git-staging`).

**5.b `[TEST-%` residuos post-suite (MCP staging)**:
```json
[{"residuos_test_cron_post_fase5":0}]
```
✅ Cleanup 100%.

**5.c Smokes automatizables — todos verdes**:

*S1 — Proxy `/supabase-proxy/*` idéntico al directo*:
```
Via proxy (HTTP 200):  [{"slug":"paseos"},{"slug":"peluqueria"},{"slug":"veterinario"}]
Directo Supabase (HTTP 200): [{"slug":"paseos"},{"slug":"peluqueria"},{"slug":"veterinario"}]
diff → IDÉNTICOS ✓
```

*S3 — ISR `/cuidado/providencia`*:
```
HTTP=200
size=37826 bytes (~37 KB, > umbral 10 KB)
<title> presente (grep count = 1)
```
Vercel Logs sin error de `getStaticProps` en la ventana de la corrida.

*S4 — `/sw.js` DEMOLISHER (criterio staging)*:
```
HTTP=200
size=1656 bytes (matches exact — demolisher)
head: "// AUTO-GENERADO por scripts/write-sw-demolisher.js — NO EDITAR."
```
✅ Comportamiento correcto para `VERCEL_ENV=preview`: el `sw-demolisher`
prebuild escribe el SW auto-destructivo; `next-pwa` disabled por gate
`IS_PROD=false`.

**5.d S2 visual — comandos preparados para Aldo**:

*Setup PowerShell* (pegar UNA vez):
```powershell
$env:BASE = "https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app"
$env:BYPASS = "<PLAYWRIGHT_BYPASS de e2e/.env.test>"
```

*URLs a abrir en browser* (bypass viaja como query, patrón nuevo post-Vercel-change):
```powershell
Write-Output "$env:BASE/explorar?x-vercel-protection-bypass=$env:BYPASS&x-vercel-set-bypass-cookie=samesitenone"
Write-Output "$env:BASE/servicio/385063f9-8fd0-4322-aa33-a866fa7cd2b4?x-vercel-protection-bypass=$env:BYPASS&x-vercel-set-bypass-cookie=samesitenone"
Write-Output "$env:BASE/proveedor/ad258d35-9081-4dbd-8dd0-9a13b9ee7e89?x-vercel-protection-bypass=$env:BYPASS&x-vercel-set-bypass-cookie=samesitenone"
```

Verificar en cada una: DevTools → Network → filtrar `_next/image` → todos
200. Cero broken image icons. Cero `Invalid src prop` en Console. (`···`
en Info del servicio es PRE-EXISTENTE — S2 cierra limpio con eso.)

**FIN de la autorización adelantada del PO**. Antes de Fase 6, esperar
cierre explícito de casilla 0.1 (Fase 5 tren Recordatorios).

## Fase 6 — Merge `staging → main` + deploy prod — **BLOQUEADA HASTA CASILLA 0.1**

- [ ] **REVERIFICAR casilla 0.1 marcada** (Fase 5 Recordatorios cerrada
  con evidencia).

```bash
git checkout main
git pull origin main
git merge staging   # fast-forward esperado
git push origin main
```

- [ ] Fast-forward. Vercel autodeploya. Verificar build **Ready** en
  Dashboard.

- [ ] `git ls-remote origin main` = SHA de `staging` post-Fase 4. Pegar
  output en el acta.

## Fase 7 — Smoke prod (post-deploy inmediato)

**MISMOS 4 smokes de N6 pero contra `www.pawnecta.com`. Criterio S4
INVERTIDO**: en prod real, `/sw.js` debe servir WORKBOX (no demolisher).

**Setup PowerShell** (prod NO tiene Vercel Deployment Protection → cero
bypass necesario en URL/header):
```powershell
$env:BASE = "https://www.pawnecta.com"
$env:ANON = "<pegar NEXT_PUBLIC_SUPABASE_ANON_KEY prod>"
$env:SUPABASE = "https://ouezpeeiwjwawauidrqq.supabase.co"
```

### 7.1 Smoke 1 — Proxy `/supabase-proxy/*`

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
- [ ] Ambos JSON idénticos (3 slugs mismos, mismo orden).

### 7.2 Smoke 2 — `next/image` en 3 páginas prod

Abrir en browser (sin bypass, prod no lo requiere):
- [ ] `https://www.pawnecta.com/explorar` — cards con foto OK, Network sin 400.
- [ ] `https://www.pawnecta.com/servicio/<id-real-prod>` — galería + Network limpio. Aldo elige un servicio real de prod (los ids de staging no aplican).
- [ ] `https://www.pawnecta.com/proveedor/<id-real-prod>` — avatar + galería.

### 7.3 Smoke 3 — ISR `/cuidado/providencia` prod

```powershell
Invoke-WebRequest -Uri "$env:BASE/cuidado/providencia" -UseBasicParsing |
  Select-Object StatusCode, @{N='LenKB';E={[math]::Round($_.RawContentLength/1024,1)}},
                @{N='HasTitle';E={$_.Content -match "<title[^>]*>"}}
```
- [ ] StatusCode = 200, LenKB > 10, HasTitle = True. Vercel Logs sin error
  de gSP.

### 7.4 Smoke 4 — SW en prod: **WORKBOX** (criterio INVERTIDO)

```powershell
$sw = Invoke-WebRequest -Uri "$env:BASE/sw.js" -UseBasicParsing
$sw.StatusCode
$sw.RawContentLength
$sw.Content.Substring(0, [Math]::Min(200, $sw.Content.Length))
```

- [ ] StatusCode = 200.
- [ ] **RawContentLength ≈ 14000+ bytes** (workbox real). Si ~1656 bytes
  (demolisher) en prod → gate `IS_PROD` está mal o env var no aterrizó.
  PARAR.
- [ ] Content **NO** empieza con `// AUTO-GENERADO por scripts/write-sw-demolisher.js`.
  Debe empezar con `if(!self.define){...}define(["./workbox-<hash>"]...`.
- [ ] En browser: `https://www.pawnecta.com/` → DevTools → Application →
  Service Workers → `sw.js` activated, sin errores rojos en Console.
- [ ] `https://www.pawnecta.com/workbox-<hash>.js` responde 200 (el chunk
  del workbox debe estar presente en `public/`).

## Fase 8 — Monitor 48h post-merge a `main`

- [ ] **Vercel Logs**: sin spike de 500 en cualquier endpoint (`/`,
  `/explorar`, `/servicio/*`, `/proveedor/*`, `/api/*`, `/api/cron/*`).
- [ ] **Resend Dashboard**: cero cambios en delivery/bounce rate vs
  baseline pre-N15.
- [ ] **Vercel Cron Jobs**: los 6 crons siguen ejecutando en su schedule
  (verificar `Last Run` de cada uno post-24h en el Dashboard).
- [ ] **Console errors reportados por Aldo** en browsing manual: cero
  errores nuevos de `next/image`, `next/link`, o hidratación.
- [ ] **Bandeja soporte**: cero tickets nuevos "no puedo entrar" / "página
  rota" / "imagen no carga".

## Plan de rollback

### Escenario A — Deploy Vercel roto (build fail o runtime crash inmediato)

Vercel Dashboard → Deployments → deploy anterior al merge N15 → **Promote
to Production**. 1 click. Bundle vuelve a Next 14.2.35.

**Cron caveat**: doc oficial Vercel confirma que Instant Rollback NO
desregistra crons (verificado durante tren Recordatorios,
`MERGE_RECORDATORIOS_PROD_CHECKLIST.md` Escenario A). El tren N15 **no
agrega ni remueve crons**, así que ese caveat no aplica — los 6 crons
siguen funcionando idénticos.

### Escenario B — Regresión de PWA (workbox del fork rompe cache/offline)

Vercel Instant Rollback (Escenario A) suficiente. La sesión del browser
del usuario detectará el nuevo `/sw.js` (Cache-Control max-age=0 fuerza
re-check), instalará el SW previo del deploy revertido. Si el problema
persiste porque el usuario mantiene cache viejo, el `sw-demolisher` NO
ayuda acá (solo actúa en no-prod). Solución: hard refresh (Ctrl+Shift+R)
— issue transitorio hasta próximo navigate.

### Escenario C — Regresión de `next/image` en algún host

Si `remotePatterns` de N2 dejó fuera algún host que sí se usaba
(improbable — mantuvimos paridad 1:1 con `domains`), síntoma es "broken
image" en Network con status 400 y mensaje "Invalid src prop". Fix-forward
preferido: agregar el host faltante a `remotePatterns` en
`next.config.js` + commit + push. Rollback via Escenario A también
válido.

**Regla general**: preferir **fix-forward** sobre rollback. Es bump
mayor; revertir es alto costo si se acumulan mejoras post-merge.

## Deuda post-launch (registrada en BACKLOG)

- **[P3]** Refactor guarda anti-prod Playwright — whitelist → deny-list.
- **[P3]** Endurecer `images.remotePatterns` — scopear hosts Supabase a
  `/storage/v1/**` en vez de `/**`.
- **[P3]** Íconos específicos por campo en "Información del servicio" —
  reemplazar el `···` genérico por íconos semánticos. Detectado en smoke
  S2 del tren N15, confirmado pre-existente.

## Anexo — commit único post-Fase 8 (documentación en `main`)

Si Fase 8 pasa limpia, cerrar el tren con tag anotado:

```bash
git checkout main
git pull origin main
git tag -a next15-prod-YYYYMMDD -m "Tren N15 en prod — bump Next 14.2.35 → 15.5.22 + swap PWA fork"
git push origin next15-prod-YYYYMMDD
```

Actualizar `CLAUDE.md > Vulnerability management`:
- Matriz 4/4 mitigados sigue vigente pero ahora sobre baseline `15.5.22`.
- Tren N15 pasa de "en curso" a "EN PROD desde YYYY-MM-DD (tag
  next15-prod-YYYYMMDD sobre <sha>)".
- Próxima deuda con timer: monitorear EOL de la línea 15.x (aprox Q4 2027
  basado en política 2-años Maintenance LTS).
