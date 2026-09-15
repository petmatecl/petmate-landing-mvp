# ACTA — Sprint autónomo · Bloque F deuda técnica menor

**Fecha ejecución**: 2026-09-15
**Rama madre**: `main`
**Tag prod**: `deuda-f-prod-20260915` (a aplicar tras merges de #42/#43/#44/#45)
**Alcance**: 4 PRs de deuda técnica menor + 1 PR cierre con acta e instrucciones PO.

Kickoff completo en [docs/sprints/bloque-f.md](docs/sprints/bloque-f.md); ítems saltados con rationale en [docs/sprints/bloque-f-skipped.md](docs/sprints/bloque-f-skipped.md).

---

## 1. PRs mergeados

| PR | Rama | Título | Grupo |
|---|---|---|---|
| **#42** | `f-kickoff-docs` | F-DOCS: kickoff + Paso 0 + P8-COROLARIOS-AUD + STYLEGUIDE-REWRITE + BACKLOG cleanup | Docs |
| **#43** | `f-tooling` | F-TOOLING: git-commit-verify + AVATARS-HUER audit + GA4-DEBUGVIEW nota | Tests-tooling |
| **#44** | `f-informe` | F-INFORME: PERF-1 bucket B mobile audit (docs-only) | Docs |
| **#45** | `f-cierre` | F-CIERRE: acta + BACKLOG conciliación SFM-BUGS-PRE + bloque-f-skipped | Docs |

Todos con `npm run build` exit 0, cero cambio de comportamiento observable por usuario, BACKLOG tocado en el mismo PR (P5).

---

## 2. Items cerrados en bloque F (11 total, todos con cero cambio productivo)

Los 4 grupos originales del kickoff se colapsaron a 4 PRs docs-only + tooling. **Cero código productivo tocado** — condición de parada respetada literal.

### Docs (PR #42)
- **Item 10 P8-COROLARIOS-AUD** — audit documental de 8 corolarios P8 (5 numerados + 3 no numerados). Reporte en [docs/P8_COROLARIOS_AUDIT_20260915.md](docs/P8_COROLARIOS_AUDIT_20260915.md). Recomendación: NO consolidar ahora — costo ~200 líneas + referencias en actas rotas > beneficio marginal. Trigger de reapertura: incidente concreto de confusión de corolarios.
- **Item 9a STYLEGUIDE-REWRITE** — rewrite completo [pages/styleguide.tsx](pages/styleguide.tsx): sección "emerald" renombrada a "accent" (7 usages + sed masivo tokens `emerald-{700,800,50,600,900}` → `accent-{600,700,50,500,800}`). Removida referencia a sprint viejo del header comment. 2 menciones "emerald" restantes son documentation copy legítimas.
- **Item 8b UI_STANDARDS-STALE** — verificado YA CERRADO por commit `e78b12f`. Cero acción.
- **Item 8c EDITAR-FICHA-VS-EDITAR-ITEM** — verificado YA CERRADO por sprint anterior. Cero acción.
- **Item 9b UX-2-MODAL-CTA-TOKENIZATION** — verificado YA CERRADO. Cero acción.
- **BACKLOG cleanup L1140/1145/1146** — 3 items marcados YA CERRADOS por sprints anteriores (ESTADODERIV-FALSY-0, PICKER-F2-NITPICKS, F2-3-D-DESCARTES).

### Tests-tooling (PR #43)
- **Item 11a GIT-COMMIT-VERIFY** — [scripts/git-commit-verify.sh](scripts/git-commit-verify.sh) portable bash: acepta lista de rutas esperadas + valida contra `git diff --cached --name-only`. Exit codes 0/1/2 documentados. Testeado local (sin args → exit 2, rutas fake sin staged → exit 1).
- **Item 2 AVATARS-HUER audit** — [scripts/audit-avatars-orphans.sql](scripts/audit-avatars-orphans.sql) con 3 secciones: count, listado, DELETE preparado. Cross-reference con 6 columnas (`proveedores.foto_perfil`, `foto_carnet`, `foto_carnet_dorso`, `galeria[]`, `mascotas.foto_mascota`, `servicios_publicados.fotos[]`). Verificación empírica 2026-09-15: **staging 0 orphans, prod 79 orphans = ~78 MB**. SQL prod para PO — sección 4 abajo.
- **Item 11b GA4-DEBUGVIEW nota** — [docs/GA4_DEBUGVIEW_INVESTIGATION_20260915.md](docs/GA4_DEBUGVIEW_INVESTIGATION_20260915.md). Hipótesis dominante: `debug_mode: true` requerido por evento (spec GA4 default). **NO se abre sprint** — Realtime + Reports cubren el caso de uso con delay ~30s. Trigger de reapertura: pedido explícito PO tras confirmar hipótesis.
- **Item 5 LINK-CONFIRM-EMAIL** — verificado YA CERRADO PARCIAL. Cero acción código.

### Informe (PR #44)
- **Item 12b PERF-1 bucket B mobile** — audit estático [docs/PERF1_BUCKET_B_MOBILE_AUDIT_20260915.md](docs/PERF1_BUCKET_B_MOBILE_AUDIT_20260915.md): MobileActionSheet + SidebarFiltros con aria-labels OK, cero IDs duplicados desktop↔mobile. Sticky action bar ficha: RIESGO de duplicación no verificable estático (requiere AI-scraper contra DOM real). Recomendación: no fix hoy, trigger post-launch si aparecen reports de screen reader.

### Verificados YA CERRADOS por sprints anteriores (Cierre docs #45)
- **Item 6 SFM-BUGS-PRE** — ambos sub-items verificados YA CERRADOS:
  - Descripción sin validación de largo mínimo → CERRADO por sprint `panel-prov-fixes` (2026-08-27) en [components/Proveedor/ServiceFormModal.tsx:643](components/Proveedor/ServiceFormModal.tsx#L643) con min 100 chars + inline error.
  - Race select Categoría → CERRADO en línea 1558 con `<option value="" disabled>Cargando categorías…</option>` gated por `categoriasStatus === 'ready'`.
  - Consecuencia: entrada BACKLOG stale (patrón P8 aplicado a BACKLOG vs realidad de código). Cero acción código en bloque-f.
- **Item 8a UX-BUTTON-CONSISTENCY** — verificado YA CERRADO por sprint anterior.

---

## 3. Items SALTADOS con rationale (documentados en bloque-f-skipped.md)

**Item 1 BUTTON-CANON restante** (~25 botones en 20+ archivos) — SALTADO. Rationale: la condición de parada del bloque F ("cualquier cambio de comportamiento observable") + ausencia de visual regression testing (Percy/Chromatic) hacen que 25 refactors mecánicos con potencial drift visual sean riesgo asimétrico inaceptable. Propuesta: sprint dedicado post-launch con setup Percy + 5 PRs incrementales de 5 botones c/u.

**Items 3+4+7 F-OBS-API** (SENTRY-WRAP-API 31 endpoints + SENTRY-FLUSH-MISSING 20 endpoints + SELF-CALLS-PREVIEW 4 self-calls + ROADMAP-CRON-RESOLVERS) — SALTADOS. Rationale por item:
- SENTRY-WRAP-API + SENTRY-FLUSH-MISSING: mecánicos pero volumen alto (51 edits total). Mejor script bash + PR chico por directorio con verificación regresión de spec `sentry-init`.
- SELF-CALLS-PREVIEW: 4 self-calls en `pages/api/auth/signup.ts` con **riesgo de cambio de comportamiento sutil** (handler importado corre in-process vs fetch como HTTP externo). Fix alternativo más simple: agregar header `x-vercel-protection-bypass` al fetch en preview (gate `NEXT_PUBLIC_APP_ENV !== 'production'`). Cero refactor.
- ROADMAP-CRON-RESOLVERS: requiere render-diff (setup `scripts/render-emails-diff.ts` existe pero por-cron).

Todos con propuesta de sprint dedicado en el skip doc — sprint chico de 4-6h + PRs incrementales.

---

## 4. SQL / config prod pendiente — instrucciones de un paso para el PO

Aldo ejecuta manualmente. Cada instrucción es autónoma (no depende de las otras).

### 4.1 AVATARS-HUER prod cleanup — 79 archivos huérfanos (~78 MB)

**Contexto**: 79 archivos en bucket `avatars` de prod sin referencia en ninguna de las 6 columnas cross-referenciadas ([scripts/audit-avatars-orphans.sql](scripts/audit-avatars-orphans.sql)). Costo bajo pero limpio.

**Por qué no SQL directo**: un `DELETE FROM storage.objects` borra el registro de metadata en Postgres pero no elimina el binario en S3 — Supabase Storage no garantiza GC async de binarios sin referencia. Quedarían orphans reales invisibles. El script [scripts/cleanup-avatars-orphans.ts](scripts/cleanup-avatars-orphans.ts) usa la API oficial `supabase.storage.from('avatars').remove([paths])` que borra metadata + binario en la misma llamada.

**Verificación previa en staging (2026-09-15)**: 3 fake orphans subidos → dry-run los detectó → `--apply` los borró → `SELECT COUNT(*) FROM storage.objects WHERE bucket_id='avatars'` bajó de 4 → 1 (exacto baseline). Ciclo cerrado.

**Paso — dry-run primero (obligatorio)**:

```bash
SUPABASE_URL="https://ouezpeeiwjwawauidrqq.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_jwt_de_prod>" \
npx tsx scripts/cleanup-avatars-orphans.ts
```

Verifica que reporte `Huérfanos encontrados: 79 (~78 MB)` con listado que coincide con el audit previo. Si el conteo o los nombres divergen inesperadamente, no correr apply — reportar.

**Paso — apply**:

```bash
SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." \
npx tsx scripts/cleanup-avatars-orphans.ts --apply
```

**Verificación posterior**: re-correr sin `--apply` → debe decir `Huérfanos encontrados: 0`. Opcionalmente, contra Supabase Studio prod SQL Editor: `SELECT COUNT(*) FROM storage.objects WHERE bucket_id='avatars';` debe haber bajado en exactamente 79.

### 4.2 Mailtrap SMTP staging — email confirmación signup

**Contexto**: Supabase Auth staging usa defaults (`noreply@mail.supabase.com`). El PO decidió (sprint E-1 acta L71) migrar staging a Mailtrap sandbox para tener casilla propia sin contaminar prod.

**Paso**: Supabase Dashboard staging (`jmtadvdkicyylcwjcmcl`) → Authentication → SMTP Settings → habilitar Custom SMTP con credenciales de Mailtrap sandbox (host `sandbox.smtp.mailtrap.io`, port 2525, credenciales de la cuenta Mailtrap del proyecto). Cambio `From` a `noreply@pawnecta.com` para no romper el subject prefijado del `resend.ts` wrapper.

**Verificación**: signup con email de prueba en preview staging → email debe aparecer en inbox Mailtrap sandbox, no en `AUDIT_INBOX`.

### 4.3 Vercel Speed Insights — activación dashboard (item 12a PERF-1)

**Contexto**: el install de `@vercel/speed-insights` y el mount del `<SpeedInsights />` en [pages/_app.tsx:26](pages/_app.tsx#L26) aterrizan en este mismo PR de correcciones (`f-correcciones-po`). Cuando ese PR mergee a `main`, el deploy prod tendrá el script cargado; solo queda una activación explícita en el dashboard Vercel.

**Paso**: Vercel Dashboard → project `pawnecta-landing-mvp` → **Speed Insights** tab (sidebar izquierdo) → botón **"Enable Speed Insights"** si aparece. Si el tab ya está inicializado (el mount del componente lo detecta automáticamente y crea el proyecto en su primera carga), no hay que hacer nada — la data empieza a llegar sola.

**Verificación**: 24h post-deploy con tráfico real → Vercel Dashboard → Speed Insights tab debe mostrar Core Web Vitals por route (LCP p75, INP p75, CLS p75).

**Nota de costo**: Speed Insights en plan Pro cobra por data points/mes — revisar el modelo de pricing vigente antes de dejarlo prendido si el volumen de tráfico crece agresivo. Post-launch baja probabilidad de sorpresa.

### 4.4 DNS DMARC-RUA record (item 13 DNS-DMARC)

**Contexto**: dominio `pawnecta.com` tiene DMARC policy sin `rua` (reporting URI aggregate). Consecuencia: cero visibilidad de qué remitentes intentan spoofear el dominio (informe agregado semanal de Google/Microsoft/Yahoo que hoy nadie recibe).

**Paso**: registrar en DNS provider del dominio pawnecta.com un record TXT nuevo (o modificar el existente `_dmarc.pawnecta.com`) agregando `rua=mailto:dmarc-reports@pawnecta.com` al valor actual. Ejemplo: si hoy dice `v=DMARC1; p=quarantine;`, cambiar a `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@pawnecta.com; ruf=mailto:dmarc-reports@pawnecta.com`. Crear casilla `dmarc-reports@pawnecta.com` en Zoho antes del cambio DNS.

**Verificación**: `dig TXT _dmarc.pawnecta.com` debe retornar el record con `rua=` presente. Primer informe agregado llega en ~24-72h.

---

## 5. Verificaciones globales

- **Build local**: exit 0 en los 4 PRs. Cero warnings nuevos vs. baseline.
- **CI**: los 4 PRs pasaron typecheck + Playwright suite error-audit + Playwright suite F2 (con serialización cross-PR vía `concurrency: e2e-staging`).
- **BACKLOG.md**: 11 entradas cerradas, cero nueva deuda (todo el trabajo del bloque F es sobre deuda pre-existente).
- **Cero rojo de check no infra**. Cero mocks nuevos.
- **Cero cambio de comportamiento observable por usuario** — condición de parada respetada literal. 3 PRs son docs-only + 1 PR agrega scripts helper que no corren en runtime.

---

## 6. Cierre

Tag anotado: **`deuda-f-prod-20260915`** apuntando al último merge (a determinar tras merge secuencial de #42/#43/#44/#45).

Foto lanzamiento del bloque F:
- **PRs mergeados en bloque F**: 4 (docs + tooling puros).
- **BACKLOG top**: 11 items nuevos cerrados en el mismo día.
- **Items saltados**: 4 con rationale + propuesta de sprint dedicado.
- **SQL/config prod pendiente**: 4 instrucciones de un paso al PO (sección 4).

Chain deuda técnica menor cerrada.

---

## 7. Correcciones PO post-cierre (PR #46 F-CORRECCIONES-PO, 2026-09-15)

El PO devolvió dos correcciones sobre las instrucciones originales:

1. **AVATARS-HUER**: el DELETE crudo sobre `storage.objects` no elimina binarios en S3 — Supabase Storage no garantiza GC async, quedarían orphans reales invisibles. Retirada la sección DELETE del SQL; nuevo script Node [scripts/cleanup-avatars-orphans.ts](scripts/cleanup-avatars-orphans.ts) usa la API oficial `supabase.storage.from('avatars').remove([paths])` (metadata + binario en la misma llamada). **Verificado en staging (2026-09-15)**: 3 fake orphans subidos vía script separado → dry-run los detecta → `--apply` los borra → `SELECT COUNT(*) FROM storage.objects WHERE bucket_id='avatars'` baja de 4 → 1 (exacto baseline). Sección 4.1 actualizada con el flujo dry-run → apply → verify.
2. **Speed Insights**: es código, no instrucción PO. `npm install @vercel/speed-insights` + mount `<SpeedInsights />` en [pages/_app.tsx](pages/_app.tsx) aterrizados en PR #46. Sección 4.3 reducida a la eventual activación explícita en el dashboard Vercel (si el mount automático no crea el proyecto solo).

**Decisiones PO sobre los 4 items saltados** (reflejadas en BACKLOG y [docs/sprints/bloque-f-skipped.md](docs/sprints/bloque-f-skipped.md)):

- **SELF-CALLS-PREVIEW**: **Opción B** (helper `withProtectionBypass()` gated por env, ~1h). Cero refactor de endpoints — preserva `verifyInternalSecret` + `emailLimiter`.
- **SENTRY-WRAP-API + SENTRY-FLUSH**: sprint dedicado propio, mecánico, **con tests API** (spec que verifica que un throw en el handler emite evento con tag `route:<pattern>` en Sentry). Split en 5 PRs por directorio.
- **BUTTON-CANON restante** (~25 botones): sprint dedicado con **regresión visual automática** (Percy/Chromatic free tier). Setup 4-6h + 5 PRs incrementales de 5 botones c/u con evidencia visual automática.
- **ROADMAP-CRON-RESOLVERS**: sin cambio — sigue como propuesta ~2h con render-diff automático via `scripts/render-emails-diff.ts`.

**Mailtrap + DMARC**: quedan como instrucciones directas al PO sin cambio (secciones 4.2 y 4.4).
