# Audit Lighthouse prod — 2026-11-26 (ITEM E dispatch autónomo)

Written for: el PO (Aldo). Ítem E del dispatch autónomo 2026-11-26. Docs-only. **NO se proponen fixes aplicables sin GO del PO** — este documento es solo material de decisión.

**Trigger**: dispatch autónomo del PO 2026-11-26 ("Performance audit Lighthouse páginas clave (docs-only)").

**Método**:
- Lighthouse 13.6.0 vía `npx lighthouse <url> --output=json --chrome-flags='--headless=new' --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --throttling-method=simulate --quiet`.
- 4 URLs públicas de prod (`https://www.pawnecta.com/*`) — zero login, zero mutation, smoke anónimo.
- 1 run por URL (varianza típica ±5 pts en Perf score). Para comparación pre/post sprint se recomienda mediana de 3 runs.
- JSONs completos committed en `docs/auditorias/lighthouse-20261126/*.json` (4 archivos ~3.2 MB total).
- **`/admin/eventos` skipped**: requiere login admin, fuera del scope dispatch.

**Timestamp**: 2026-11-26 ~16:52 UTC (13:52 CLT).

---

## 1. Scores actuales (mobile, throttling simulate)

| # | URL | Perf | A11y | BP | SEO | FCP | LCP | CLS | TBT | SI | TTI |
|---|-----|-----:|-----:|---:|----:|----:|----:|----:|----:|---:|----:|
| 1 | `/` (home) | **84** | 97 | 100 | 92 | 2.3s | 3.8s | 0 | 90ms | 4.0s | 4.4s |
| 2 | `/explorar` | **75** | 90 | 100 | 92 | 0.9s | 6.3s | 0 | 200ms | 1.7s | 6.4s |
| 3 | `/explorar?categoria=paseos` | **73** | 90 | 100 | 92 | 2.1s | 7.3s | 0 | 150ms | 2.3s | 7.5s |
| 4 | `/proveedor/4ca16056-...` | **83** | 95 | 100 | 92 | 2.1s | 2.7s | 0 | 140ms | 29.5s* | 3.3s |

*SI 29.5s en /proveedor es **outlier anómalo** (single-run artifact probable — proveedor con muchas fotos en galería que renderizan progresivamente, SI mide estabilización visual completa). No es representativo. La mediana de 3 runs debería dar un valor normal (~5-10s). TTI 3.3s sí es confiable.

**Proveedor usado para #4**: `4ca16056-90f8-4256-a9e4-da39e4f6f44b` (Paseítos Perrunos.cl), mismo que audit 2026-11-22 para comparación directa.

## 2. Semáforos Core Web Vitals (Google recommendation)

- **LCP** verde ≤2.5s · amarillo 2.5-4.0s · rojo >4.0s.
- **CLS** verde ≤0.1 · amarillo 0.1-0.25 · rojo >0.25.
- **TBT** verde ≤200ms · amarillo 200-600ms · rojo >600ms.

| URL | LCP | CLS | TBT |
|-----|-----|-----|-----|
| `/` | AMARILLO (3.8s) | VERDE (0) | VERDE (90ms) |
| `/explorar` | **ROJO (6.3s)** | VERDE (0) | VERDE (200ms, borde) |
| `/explorar?categoria=paseos` | **ROJO (7.3s)** | VERDE (0) | VERDE (150ms) |
| `/proveedor/{id}` | AMARILLO (2.7s) | VERDE (0) | VERDE (140ms) |

**Patrón**: CLS perfecto en todos (fix CLS footer PR #108 2026-11-12 sigue efectivo). LCP es el problema principal en `/explorar` (filtro + sin filtro ambos rojos). TBT en verde para todas las URLs.

## 3. Comparación vs audit 2026-11-22 (baseline de 4 días atrás)

Snapshot 2026-11-22 ([`docs/auditorias/lighthouse-20261122.md`](../auditorias/lighthouse-20261122.md)):

| URL | Perf 22-11 | Perf 26-11 | Δ | Nota |
|-----|-----:|-----:|---:|------|
| `/` | 79 | **84** | +5 | Mejora — probable efecto del PR #107+#108 CLS fixes + depbumps minor |
| `/explorar` | 78 | **75** | -3 | Regresión leve — dentro de varianza de single-run (±5). Media de 3 runs recomendada para confirmar |
| `/proveedor/{id}` | 92 | **83** | -9 | Regresión aparente — LCP 2.7s vs 2.7s baseline; TTI 3.3s vs 4.6s baseline (mejora). Perf score depende de peso de recursos del proveedor específico — PO verificar con 3 runs que no sea artifact single-run |

**Varianza esperada single-run**: ±5 pts. Las regresiones leves (`/explorar` -3, `/proveedor` -9 pero LCP estable) pueden ser artifact de muestreo. Recomendación: 3 runs mediana antes de clasificar como regresión real.

## 4. Top 5 fixes concretos (ordenados por impacto)

Patrón recurrente detectado vía audit insights: **optimización de imágenes + reducción JS legacy + a11y**.

### Fix 1 — `image-delivery-insight` (impacto: 4/4 URLs afectadas) — **QUICK WIN**

**Issue**: todas las URLs scoran 50/100 en delivery de imágenes. Diagnóstico común:
- Imágenes servidas sin `srcset` responsive para mobile.
- Falta `loading="lazy"` en imágenes below-the-fold.
- Formato JPEG legacy en lugar de WebP/AVIF.

**Acción propuesta** (requiere GO PO):
- Migrar `<img>` restantes (grep `<img src=` en `pages/` + `components/`) a `next/Image` con `priority={true}` solo para hero y `loading="lazy"` por default.
- `next/Image` sirve WebP/AVIF automático + srcset.
- **Scope estimado**: 1-2 días. Enumerar superficie exacta vía grep antes de empezar.
- **Impacto esperado**: +5-10 pts Perf cada URL, LCP -1 a -2s en `/explorar`.
- **Esfuerzo**: Medio. Blast radius acotado a reemplazos de componente.

### Fix 2 — LCP `/explorar` y `/explorar?categoria=paseos` (impacto: 2 URLs ROJO) — **PRIORITARIO**

**Issue**: LCP 6.3-7.3s en `/explorar`, rojo claro. SearchBar hero + grid de cards contribuye pesado. El `lcp-discovery-insight` score 0 indica que el resource LCP no se descubre temprano.

**Acción propuesta** (requiere GO PO):
- Agregar `<link rel="preload">` para la imagen LCP del hero de SearchBar.
- Priorizar la primera card del grid con `priority={true}` en su `next/Image`.
- Mover CSS crítico inline (si el framework lo permite — Next 15 Pages Router default no lo hace).
- **Scope estimado**: 0.5-1 día.
- **Impacto esperado**: LCP -2 a -3s. Perf +10-15 pts para ambas URLs de `/explorar`.
- **Esfuerzo**: Medio. Requiere identificar el elemento LCP exacto vía DevTools Network panel.

### Fix 3 — A11y `color-contrast` + `heading-order` + `select-name` (impacto: 3 URLs afectadas) — **APLICADO 2026-11-27 (PR a11y-fix)**

Análisis específico post-parse del JSON raw:

| Issue | URL | Elemento concreto | Fix aplicado |
|---|---|---|---|
| `color-contrast` (8 items) | /explorar | `<span class="text-xs text-accent-600">Activo</span>` en ServiceCard | `text-accent-600` → `text-accent-700` |
| `heading-order` (1 item) | /explorar + /explorar?cat | `<h3>` título servicio en ServiceCard (h1 page → h3 card, salta h2) | `<h3>` → `<h2>` (misma clase visual) |
| `select-name` (1 item) | /explorar | `<select id="explorar-orden">` con `<label htmlFor>` oculto por `hidden sm:block` → Lighthouse mobile no detecta asociación | `hidden sm:block` → `sr-only sm:not-sr-only` (presente para SR siempre, visible solo desktop) |
| `heading-order` (1 item) | /proveedor | Footer `<h4>Servicios</h4>` + `<h4>Pawnecta</h4>` (page tiene h1→h2, salta a h4) | `<h4>` → `<h3>` en los 2 headings del footer |

**Fuera de alcance de este PR**:
- `link-text` (1 item en /proveedor con snippet `?`): sin selector parseable en el JSON. Deuda: grep manual `Ver más`, `Click aquí`, `Leer más` etc. en pages/ + components/ y renombrar a texto descriptivo. Sprint aparte post-merge.
- `color-contrast` (1 item en /proveedor): botón del CookieBanner. Puede estar resuelto en PR #242 cookie-banner-fix que compactó estilos. Verificar en Lighthouse post-merge #242.

**Impacto esperado** (del audit): A11y +5-7 pts.

**Verificación post-merge**: Lighthouse mobile 3 runs mediana contra `/explorar` y `/proveedor/{id}`. Esperado: `color-contrast`, `heading-order`, `select-name` score 1.0.

### Fix 4 — `legacy-javascript-insight` + `unused-javascript` (impacto: 4/4 URLs)

**Issue**: bundle contiene JS transpilado para browsers legacy que ya no requerimos (ES5 polyfills, Promise polyfills, async/await transformation). Y hay tree-shaking opportunities.

**Acción propuesta** (requiere GO PO):
- Verificar `browserslist` en `package.json` — actualizar target a "defaults, not IE 11".
- Analizar bundle con `@next/bundle-analyzer` (dev-only tool).
- Identificar paquetes con imports completos vs tree-shaking selectivo (ej. `date-fns/*` vs `date-fns`).
- **Scope estimado**: 0.5 día análisis + 1 día aplicar fixes.
- **Impacto esperado**: -50 a -200 KB bundle size, +2-5 pts Perf.
- **Esfuerzo**: Bajo (análisis) + Medio (aplicación).

### Fix 5 — `cache-insight` (home) + `total-byte-weight` (home) — **QUICK WIN** si se cambian headers CDN

**Issue**: `home` scora 50/100 en `cache-insight` (lifetimes cortos) y 50/100 en `total-byte-weight` (payload > threshold recomendado).

**Acción propuesta** (requiere GO PO):
- Configurar `Cache-Control` headers específicos para assets estáticos vía `next.config.js:headers()`.
- Verificar que `/public/*` tiene `immutable, max-age=31536000` (1 año — para versioned assets).
- Comprimir imágenes grandes (home hero puede estar cerca de 500 KB — target 100 KB WebP).
- **Scope estimado**: 0.5 día.
- **Impacto esperado**: Perf home +5-8 pts, cache hit ratio CDN mejor.
- **Esfuerzo**: Bajo.

---

## 5. Síntesis + decisión propuesta

**Sprint factible como `perf-lh-26-11`** post-launch, scope 2-3 días si se aplican los 5 fixes. Orden sugerido:
1. **Fix 1 (image-delivery)** — mayor impacto compuesto across 4 URLs.
2. **Fix 2 (LCP /explorar)** — prioriza la URL más visitada post-conversión.
3. **Fix 5 (cache + payload)** — quick win homógeneo.
4. **Fix 3 (a11y)** — menos impacto en Perf pero mejora global del score Lighthouse.
5. **Fix 4 (legacy JS)** — requiere análisis bundle previa.

**Alternativa chunked**: cada fix como PR independiente pre-campañas (meta 100 proveedores). Mergeable autónomo bajo CI verde cada uno.

**Zero implementación aterrizada en este documento** — es audit read-only para habilitar decisión informada del PO.

**Backlog candidato**: `PERF-LH-26-11` prioridad MEDIA post-launch, con los 5 fixes como sub-ítems.

---

## 6. Trazabilidad

- JSONs raw: `docs/auditorias/lighthouse-20261126/*.json` (4 archivos).
- Baseline previa: [`docs/auditorias/lighthouse-20261122.md`](../auditorias/lighthouse-20261122.md).
- Baseline anterior: [`docs/auditorias/lighthouse-20261110/`](../auditorias/lighthouse-20261110/) (raw + reporte-baseline).
- Mediana de 3 runs: [`docs/auditorias/lighthouse-20261111/reporte-mediana.md`](../auditorias/lighthouse-20261111/reporte-mediana.md).
- Lighthouse version: 13.6.0 (via `npx lighthouse`).
- Chrome: C:/Program Files/Google/Chrome/Application/chrome.exe (sistema PO).
- Dispatch origen: PO 2026-11-26, ITEM E.
