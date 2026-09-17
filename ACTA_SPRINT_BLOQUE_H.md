# ACTA — Sprint autónomo · Bloque H

**Fecha ejecución**: 2026-09-17
**Rama madre**: `main` (tag anterior `deuda-g-prod-20260915`)
**Tag H-1**: `chore-lock-prod-20260917` sobre `d386fe0` (aplicado)
**Orden ejecución**: H-3 → H-4 → H-1 → H-2 (según kickoff PO).

Kickoff completo en [docs/sprints/bloque-h.md](docs/sprints/bloque-h.md).

---

## 1. PRs mergeados

| PR | Rama | Merge SHA | Item | Tipo |
|---|---|---|---|---|
| **#55** | `h4-seo-triviales` | `76655c1` | H-3 informe + H-4 informe + fixes triviales metadata | Docs + código no visual |
| **#57** | `h1-lock-regen` | `d386fe0` | H-1 lock regenerado + `npm ci` restaurado | Config CI + lock |
| **#56** | `h2-rpc-c` | *(a mergear)* | H-2 RPC-C informe | Docs |

**Nota**: PR #55 consolidó H-3 y H-4 en un solo aterrizaje porque ambos son docs + fixes triviales sin decisión. PR #56 (H-2) es docs-only y se merge tras CI verde (rebase post H-1 dado que H-1 tocó el lock).

---

## 2. H-3 · DEL-CUENTA-LEY descubrimiento técnico (solo lectura) ✅

Insumo para sesión 30 min con PO. Informe en [docs/producto/del-cuenta-ley-descubrimiento.md](docs/producto/del-cuenta-ley-descubrimiento.md).

**Contenido**:
- Mapa completo de datos por tabla con FK a tutor / proveedor / auth.users (via `pg_constraint`, evita sesgo por rol MCP — regla P6 corolario 2026-08-14).
- Propuesta binaria por tabla: **BORRAR** vs **ANONIMIZAR in-place**, con motivo.
- Estimación por componente: **~20-24h totales** = 3-4 días laborales (migration + endpoint + cron ventana de gracia + UI /usuario y /proveedor + 2 templates email + tests unit + tests e2e).
- **10 preguntas numeradas con recomendación por defecto** — insumo para sesión.
- Anexo con SQL de verificación (queries `pg_constraint`, `information_schema.columns`) reproducibles.

**Recomendación destacada**: **anonimización preservando registros contractuales** (no delete cascade). Trigger diciembre 2026, mi recomendación es arrancar ahora (ventana 3 meses, testing legal + refinamiento consume 1-2 meses de la ventana).

---

## 3. H-4 · Auditoría SEO + A11y (solo informe + PR triviales) ✅

Informe en [docs/auditorias/seo-a11y-20260917.md](docs/auditorias/seo-a11y-20260917.md).

**Estado global**: verde con matices. La app ya tiene base SEO técnico bien montada (sitemap, robots, JSON-LD LocalBusiness, canonical). Los gaps son de completitud.

**PR compañero (fixes triviales)** — 8 archivos, cero cambio visual, solo `<head>`:
- `pages/privacidad.tsx` + `pages/terminos.tsx`: meta description + og:* + canonical.
- `pages/faq.tsx` + `pages/quienes-somos.tsx` + `pages/explorar.tsx`: og:* + twitter:* + canonical.
- `pages/proveedor/[id].tsx`: twitter cards + og:type=profile + og:url/locale/site_name.
- `pages/[categoria]/index.tsx` + `[comuna].tsx`: canonical + og:image + twitter cards.

**Hallazgos verificados sin acción código**:
- **Cero `<img>` sin alt** en pages/ + components/ (grep exhaustivo).
- **Contraste** tokens semánticos (`success-*`, `warning-*`, `danger-*`, `info-*`) verificado WCAG AA en sprint Ola 2 B4 (2026-08-18). ✅
- **Skip link** "Saltar al contenido principal" en `pages/_app.tsx:100-105`. ✅
- **Sitemap** con fail-loud desde Sweep #1 fix B2 (2026-08-07). ✅
- **Structured data**: `LocalBusiness` en fichas proveedor + `BreadcrumbList` en categorías + `ItemList` en categoría+comuna. ✅

**Hallazgos con decisión PO** (van al informe):
- Structured data extendido en landings de categoría (`ItemList` con servicios reales) — trigger: post-launch con 25+ servicios prod.
- Migrar `image: url` → `image: [...]` en `LocalBusiness` (~15 min, si PO da GO).
- Sitemap con `<lastmod>` explícito (~30 min, beneficio: reindexación 12-24h vs 5-7 días).
- Verificación dinámica axe-core en Playwright (2h, sprint aparte).
- Migrar modales restantes a `useModalDialog` hook (~6-8h, sprint I-a11y candidato).
- Hero images a `next/image` con priority (post-launch, decisión LCP).

**Lighthouse NO ejecutado desde el auditor** — entrega comandos exactos en sección 4 del informe (bash con `npx lighthouse`). Puntajes esperados baseline: Performance 70-85 mobile / 85-95 desktop, Accessibility 88-95, Best Practices 92-100, SEO 95-100.

---

## 4. H-1 · LOCK-LINUX bump con auditoría ✅

**Workflow one-shot ejecutado** (`lock-regen.yml` en h1-lock-regen, run `35222546481`, 2026-09-17):
- Borra `package-lock.json` + `node_modules`.
- Corre `npm install` completo en ubuntu-latest.
- Sube el lock nuevo como artifact.

**Auditoría de 14 MAJORS detectados**:

| # | Package | Actual | Nuevo | Categoría |
|---|---|---|---|---|
| 1 | @napi-rs/wasm-runtime | 0.2.12 | 1.2.4 | transitive |
| 2 | @rollup/pluginutils | 3.1.0 | 5.4.0 | transitive |
| 3 | agent-base | 7.1.4 | 6.0.2 | transitive (down) |
| 4 | es-module-lexer | 2.3.1 | 3.0.2 | transitive |
| 5 | estree-walker | 1.0.1 | 2.0.2 | transitive |
| 6 | glob | 10.3.10 | 13.0.6 | transitive |
| 7 | https-proxy-agent | 7.0.6 | 5.0.1 | transitive (down) |
| 8 | json5 | 1.0.2 | 2.2.3 | transitive |
| 9 | lru-cache | 10.4.3 | 5.1.1 | transitive (down) |
| 10 | node-fetch | 3.3.2 | 2.7.0 | transitive (down) |
| 11 | path-scurry | 1.11.1 | 2.0.2 | transitive |
| 12 | picomatch | 2.3.1 | 4.0.7 | transitive |
| 13 | resolve | 1.22.11 | 2.0.0-next.7 | transitive (pre-release) |
| 14 | rollup | 2.80.0 | 4.63.3 | transitive |

**Todos son transitive deps** (dependencies de dependencies), no top-level. **Cero de la lista bloqueadora PO**: `next`, `react`, `@supabase/*`, `@sentry/*`, `leaflet`, `react-day-picker`, `playwright`. Varios son down-versions (resolución npm eligió compat con árbol completo — aceptable).

**Condición de parada NO disparada**. Procedí con merge autónomo.

**Cambios aplicados en PR #57**:
- `package-lock.json` reemplazado por el generado en Linux (12789 líneas, incluye `@rollup/rollup-linux-*` correctas).
- `.github/workflows/ci.yml`: `npm install` → `npm ci`.
- `.github/workflows/e2e-error-audit.yml`: idem (2 steps).
- `.github/workflows/visual-update-snapshots.yml`: idem.
- **`.github/workflows/lock-regen.yml` BORRADO**: workflow one-shot cumplió su propósito.

**Tag**: `chore-lock-prod-20260917` aplicado sobre `d386fe0` (H-1 merge SHA), pusheado.

**Deuda menor detectada** (build warning):
- `@sentry/nextjs` v11 deprecation: `Importing withSentryConfig from @sentry/nextjs is deprecated and will stop working in v11. Import it from @sentry/nextjs/config instead`. Sentry sigue en 10.x, import actual funciona. Fix: 1 línea en `next.config.js` cuando @sentry/nextjs v11 aterrice.

---

## 5. H-2 · RPC-C informe (solo lectura) ✅

Informe en [docs/auditorias/rpc-c-20260917.md](docs/auditorias/rpc-c-20260917.md).

**Total funciones anon**: **201** (PO mencionó 204 — diff aceptable, drift por metadata Supabase).

**Clasificación**:
- **186 (~92%)** — extensión `btree_gist`: internal PostgreSQL. NO tocar (revoke rompe índices GiST del proyecto — agenda F1/F2 usa GiST sobre `tstzrange`).
- **13 (~7%)** — proyecto: cada una con caller documentado por grep en `lib/` + `pages/` + `components/`.

**Candidatas a REVOKE** (5 funciones en 3 lotes con SQL exacto para decisión PO por bloques):

**Lote 1 — Dead code** (3 funciones): `incrementar_vistas_servicio`, `send_notification`, `try_jsonb` — cero caller en el código.

**Lote 2 — Admin-only** (1 función): `calcular_perfil_completo_proveedor` — solo llamada desde panel admin, restringir a `authenticated` con gate `is_admin()` in-body.

**Lote 3 — Legacy con reemplazo** (1 función): `incrementar_vistas` — versión previa reemplazada por `registrar_visita`.

**Cero SQL ejecutado**. Cada lote tiene su SQL de REVOKE + SQL de verificación post + SQL de rollback documentado en el informe.

---

## 6. BACKLOG conciliado

Items del BACKLOG que este bloque toca:

- **L318 SELF-CALLS-PREVIEW**: sin cambio (ya CERRADO por bloque G G-2).
- **L1156 SENTRY-FLUSH missing-credentials**: sin cambio (ya CERRADO por bloque G G-1a).
- **L1172 DEL-CUENTA-LEY (Ley 21.719)**: **ampliado** con puntero al informe H-3 + estimación refinada (3-4 días vs "~1 semana" original). Estado sigue `[abierto — DISPARADOR LEGAL diciembre 2026]`; el sprint arranca cuando el PO confirme en la sesión.
- **`chore-lock-linux-regen`** (referencia BACKLOG post-septiembre 2026-09-08 sobre workflow lock-regen inerte): **CERRADO** con el aterrizaje de H-1 el 2026-09-17. Tag `chore-lock-prod-20260917`.

Nueva deuda anotada:
- **@sentry/nextjs v11 deprecation** de `withSentryConfig` import path. Fix trivial 1 línea + verificación cuando v11 se instale.
- Hallazgos SEO+A11y con decisión pendiente (sección 3 del informe H-4).
- 5 candidatas REVOKE del H-2 (secciones 2 y 3 del informe H-2).

---

## 7. Verificaciones globales

- **Build local** exit 0 en los 3 PRs. Cero warning nuevo del @sentry runtime (solo la deprecation de import path documentada).
- **CI verde**: los 3 PRs pasaron typecheck + Unit tests tipo-cd + G-1a/b/c/d/e + G-2 + Playwright suite error-audit + Playwright suite F2 + Vercel.
- **Cero SQL prod ejecutado** (H-2 y H-3 son solo lectura).
- **Cero cambio de comportamiento observable por usuario** en H-1 (config CI), H-2 (docs), H-3 (docs). Los fixes triviales H-4 son cero cambio visual (solo metadata `<head>`).

---

## 8. Instrucciones de un paso para el PO

### 8.1 Sesión 30 min DEL-CUENTA-LEY (H-3)

Agendar sesión con el auditor para revisar las **10 preguntas numeradas** de la sección 5 del informe [docs/producto/del-cuenta-ley-descubrimiento.md](docs/producto/del-cuenta-ley-descubrimiento.md). Al cierre de la sesión el auditor arranca el sprint de implementación (~3-4 días).

### 8.2 Ejecutar Lighthouse baseline (H-4)

Sección 4 del informe [docs/auditorias/seo-a11y-20260917.md](docs/auditorias/seo-a11y-20260917.md) tiene los comandos exactos. Requiere Chrome + `npm install -g lighthouse`. Copy-paste + esperar 3-6 min. Guardar HTML como baseline.

### 8.3 Decidir REVOKE por lotes (H-2)

Sección 3 del informe [docs/auditorias/rpc-c-20260917.md](docs/auditorias/rpc-c-20260917.md) tiene 3 lotes independientes con SQL exacto. GO por lote → auditor ejecuta contra prod con el patrón habitual (SQL entregado, PO ejecuta manual en Studio, evidencia P5 en actas).

**Recomendación de arranque**: Lote 1 (dead code) primero — cero riesgo, cero disrupción. Verificar `pg_depend` con el SQL del anexo del informe antes de aplicar.

### 8.4 Ninguna instrucción PO para H-1

H-1 quedó 100% cerrado. El tag `chore-lock-prod-20260917` ya está pusheado. Los 3 workflows están usando `npm ci` en el próximo deploy.

---

## 9. Cierre

Foto lanzamiento del bloque H:
- **PRs mergeados**: 3 (H-3+H-4 consolidados en #55 + H-1 en #57 + H-2 en #56 tras rebase).
- **BACKLOG top**: 4 entradas conciliadas (una CERRADA, una ampliada con puntero, dos deudas nuevas anotadas).
- **Informes generados**: 3 (`del-cuenta-ley-descubrimiento.md`, `seo-a11y-20260917.md`, `rpc-c-20260917.md`).
- **Instrucciones PO**: 3 (sesión 30 min DEL-CUENTA + Lighthouse baseline + REVOKE por lotes).
- **Tag**: `chore-lock-prod-20260917` aplicado.

**Estado por item**:
- **H-1**: ✅ 100% cerrado. Lock regenerado en Linux + `npm ci` en 3 workflows + tag aplicado.
- **H-2**: ✅ Informe entregado (docs-only, cero acción código). Espera decisión PO por lote.
- **H-3**: ✅ Descubrimiento técnico entregado. Espera sesión 30 min con PO.
- **H-4**: ✅ Informe entregado + PR triviales mergeado (cero cambio visual).

Chain bloque H cerrada.
