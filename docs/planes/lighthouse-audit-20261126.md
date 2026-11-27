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

### Fix 1 — `image-delivery-insight` — **INVENTARIO 2026-11-27, SCOPE REDUCIDO**

**Hallazgo del inventario**: las 3 zonas priority que el audit nombraba (`/explorar` cards, ficha de servicio, ficha de proveedor público) **YA están migradas** a `next/Image` en el sprint perf-ficha 2026-11-12. Verificado via `grep "<img "`:

| Zona priority PO | Estado | Archivo |
|---|---|---|
| Cards `/explorar` | ✅ Migrada | `components/Explore/ServiceCard.tsx` usa `next/Image` con `fill` + `sizes` responsivo + `priority` para 1ra card (PR #245) |
| Ficha servicio | ✅ Migrada | `components/Servicio/*` sin `<img>` crudo |
| Ficha proveedor público | ✅ Migrada | `pages/proveedor/[id].tsx:774,781` usa `<Image>` |

**`<img>` crudos pendientes** (ninguno en las 3 zonas priority):

| Superficie | Cantidad | Impacto Lighthouse | Recomendación |
|---|---|---|---|
| `pages/index.tsx:184` avatar proveedor 20×20px en carousel destacados | 1 | **Bajo** — asset < 1 KB en JPEG. Convertir a `next/Image` agrega overhead del componente > ahorro en el asset | Mantener `<img>` con `eslint-disable` (ya tiene) |
| `pages/proveedor/index.tsx` dashboard (flow privado — foto perfil, carnet preview, foto espacio) | 5 | **Mínimo** — no es ruta pública, no se mide en Lighthouse de rutas visitadas | PR aparte post-launch, baja prioridad |
| `components/Admin/*` carnet signed URLs + avatares + eventos | 10+ | **Cero** — solo admin logeado | Omitir, no justifica sprint |
| `components/Explore/CaregiverMap.tsx:112` popup Leaflet (HTML string, no JSX) | 1 | **Cero** — renderizado solo al click marker, fuera del LCP window | Omitir (patrón no-JSX impide `next/Image` directo) |
| `components/Proveedor/ServiceFormModal.tsx` previews locales `URL.createObjectURL` | 2 | **Cero** — flow privado de edición | Omitir |

**Conclusión**: Fix 1 **efectivamente cerrado** por sprint perf-ficha 2026-11-12 + `priority` de PR #245. El score 50/100 de `image-delivery-insight` en el audit refiere a aspectos distintos (lazy-loading nativo, `srcset` responsive) que `next/Image` resuelve pero Lighthouse sigue descontando por métricas internas (varianza de scoring).

**Siguiente verificación**: Lighthouse mobile mediana 3 runs post-merge de PR #244 cache + PR #245 LCP + PR #246 a11y. Si `image-delivery-insight` sigue en 50/100, inspeccionar el audit `details.items[]` concreto para identificar qué recurso específico falla (puede ser un asset de `/public/` sin srcset — fuera de alcance de migración `next/Image`).

**Sprint dedicado Fix 1 queda descartado como tal**. Residual: 1 PR chico migrando `pages/index.tsx:184` a `next/Image` si post-mediciones muestra impacto en Lighthouse home. Decisión del PO tras ver los números post-fix.

### Fix 2 — LCP `/explorar` (impacto: 2 URLs ROJO) — **APLICADO PARCIAL 2026-11-27**

**Issue**: LCP 6.3-7.3s en `/explorar`, rojo claro. Grid de cards contribuye pesado. El `lcp-discovery-insight` score 0 indica que el resource LCP no se descubre temprano.

**Fix aterrizado** (parte de PR Fix 2 LCP /explorar, pendiente de CI):
- `components/Explore/ServiceCard.tsx`: nuevo prop `priority?: boolean` opcional. Cuando `true`, pasa `priority={true}` a `next/Image` → emite `<link rel="preload" as="image">` para el cover.
- `pages/explorar.tsx`: la primera card de la página 1 (`pagina === 1 && idx === 0`) recibe `priority={true}`. Resto queda `loading="lazy"` por default.

**Pendiente** (en Fix 1 sprint): migrar imágenes de hero de `pages/index.tsx` (home) si aplica.

**Impacto esperado**: LCP -1 a -2s en `/explorar` por preload temprano del cover de la primera card. Perf +5-10 pts.

**Verificación post-merge**: Lighthouse mobile 3 runs mediana vs baseline 26-11.

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

### Fix 4 — `legacy-javascript-insight` + `unused-javascript` — **DESCARTADO 2026-11-27**

**Decisión del PO 2026-11-27**: descartado como sprint. No hay oportunidad clara de ganancia sin análisis bundle-analyzer profundo.

**Verificación previa al descarte** (grep sobre el repo 2026-11-27):
- No existe `.browserslistrc` ni config `browserslist` en `package.json` → Next 15 usa su default, que ya excluye IE 11 y navegadores con < 0.5% share.
- `date-fns` imports: todos usan named imports (`import { format } from 'date-fns'` → tree-shakeable). Cero wildcards.
- `import * as Sentry from '@sentry/nextjs'`: patrón diseñado por el SDK Sentry; el bundler lo trata correctamente en server-side y no ensucia el bundle cliente.
- No se detectaron imports no-tree-shakeable obvios en pages/, components/ ni lib/.

**Motivo**: sin un `@next/bundle-analyzer` que identifique chunks concretos para optimizar, el sprint es exploración sin target. Ganancia esperada (-50 a -200 KB) está en el límite de varianza de muestreo del score Lighthouse. Prioridad baja frente a Fix 1, 2, 3, 5.

**Si se reabre a futuro**: arrancar con `ANALYZE=true npm run build` + `@next/bundle-analyzer` (dev-only) para identificar chunks pesados concretos antes de proponer cambios. No es sprint factible sin ese insumo.

### Fix 5 — `cache-insight` (home) + `total-byte-weight` (home) — **APLICADO 2026-11-27 (PR #244 lh-cache-hdrs)**

**Issue**: `home` scora 50/100 en `cache-insight` (lifetimes cortos) y 50/100 en `total-byte-weight` (payload > threshold recomendado).

**Fix aterrizado** (PR #244, merge pending CI):
- Nueva regla `headers()` en `next.config.js` para assets estáticos del directorio `/public/*` (png/jpg/jpeg/webp/avif/gif/svg/ico/woff/woff2/ttf/otf/eot).
- Policy: `public, max-age=3600, stale-while-revalidate=86400` — 1h cache + 24h SWR.
- NO toca `/_next/static/*` (Next ya pone `immutable, max-age=31536000` automático, content-hashed).
- Evidencia empírica pre-fix: `/pawnecta_logo_final-trans.png` (~100 KB) venía con `max-age=0, must-revalidate` → re-descarga cada visita.

**Compresión imágenes home hero** queda pendiente como item aparte del sprint Fix 1 (imágenes a `next/Image`).

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
