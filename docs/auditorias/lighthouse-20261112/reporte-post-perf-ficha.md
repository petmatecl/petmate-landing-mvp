# Lighthouse mediana · post perf-ficha (SHA 1c655c0) vs baseline 2026-11-11

**Fecha medición**: 2026-11-12 ~16:30 UTC (post merge PR #106).
**Host**: `https://www.pawnecta.com` (prod).
**Método**: `npx lighthouse` CLI, Chrome local headless, 2 URLs × 2 presets (mobile throttled + desktop) × 3 runs = **12 corridas**. Mediana por métrica.
**Baseline**: `docs/auditorias/lighthouse-20261111/reporte-mediana.md` (pre perf-ficha).

---

## Resumen

PR #106 `perf-ficha` migró 10 callsites `<img>` → `next/image` con `fill`/`sizes` responsive, `quality={85}` en el hero, `unoptimized` automático para hosts pre-optimizados (Unsplash/Pexels). Resultado:

| Escenario | Perf score | LCP | Total transfer | Img transfer |
|---|---:|---:|---:|---:|
| **ficha-mobile** | **56 → 89** (+33) | **39.6 s → 3.4 s** (−92%) | 8.8 MB → 1.7 MB (−81%) | 8.3 MB → 1.3 MB (−85%) |
| **ficha-desktop** | **68 → 93** (+25) | **6.6 s → 0.6 s** (−90%) | 8.8 MB → 1.7 MB (−80%) | 8.3 MB → 1.3 MB (−85%) |
| **explorar-mobile** | 76 → 77 (+1) | 7.1 s → 6.5 s (−9%) | 12.2 MB → 1.3 MB (−89%) | 11.7 MB → 0.8 MB (−93%) |
| **explorar-desktop** | **75 → 92** (+17) | **8.0 s → 1.9 s** (−77%) | 29.7 MB → 2.1 MB (−93%) | 29.2 MB → 1.6 MB (−95%) |

---

## Lectura por métrica

### Transfer de imágenes

Cae **85–95%** en los 4 escenarios. El optimizer WebP + `sizes` responsive hace el trabajo pesado: en mobile se sirve ~780w en vez de la original 1920+w; en desktop se sirve WebP ~30–40% más chico que el JPEG original. Los avatares (incluido el de 1078 KB reportado para 96 px) bajan a ~5–10 KB WebP.

### LCP

Baja **77–92%** en 3 de 4 escenarios.

- **ficha-mobile LCP 39.6 s → 3.4 s** (−92%) — el bloqueante bloqueante (🔴🔴) reportado el 11-11 (ficha `/servicio/7134e58a-...` que descargaba 8.2 MB de imágenes en cada carga) queda resuelto en magnitud: la mejora es 12× mejor. Nota de clasificación: **3.4 s LCP sigue en rango "mejorable" según umbrales Core Web Vitals (2.5 s = "bueno", 4 s = "pobre")**. Mejora dramática pero no cruza al verde.
- **ficha-desktop LCP 6.6 s → 0.6 s** (−90%) — cruza a verde holgado (<2.5 s).
- **explorar-desktop LCP 8.0 s → 1.9 s** (−77%) — cruza a verde.
- **explorar-mobile LCP 7.1 s → 6.5 s** (−9%) — mejora marginal porque el bottleneck ya no son las fotos (0.8 MB total post-fix). El culpable restante está en otro lado (probable: main thread del map viewport, primera card renderizada, o hero text). Candidato para sprint perf residual post-launch — ver entrada `EXPLORAR-MOBILE-LCP` del BACKLOG.

### TBT

ficha-mobile **446 ms → 42 ms** (−91%). Main thread liberado por menos bytes de decodificación de imágenes.

### CLS

Se mantuvo en los 4 escenarios (0, 0, 0, 0.112). El 0.112 de ficha-desktop es **pre-existente** y NO regresión de perf-ficha. Culprit identificado por Lighthouse `layout-shifts` audit: el placeholder "Sin evaluaciones todavía" en `components/Service/ReviewSummary.tsx` transiciona de loading `h-48` (192 px) a empty state (~220-240 px) → shift ~30-50 px. Fix aterrizado en PR separado `cls-ficha`.

---

## Raw runs (post)

```
ficha-mobile:
  r1: lcp=9745 cls=0.187 tbt=111 img=1255KB
  r2: lcp=2623 cls=0    tbt=38  img=1255KB
  r3: lcp=3361 cls=0    tbt=42  img=1254KB

ficha-desktop:
  r1: lcp=601  cls=0.113 tbt=0 img=1260KB
  r2: lcp=752  cls=0.112 tbt=0 img=1259KB
  r3: lcp=640  cls=0.112 tbt=0 img=1260KB

explorar-mobile:
  r1: lcp=6818 cls=0 tbt=59 img=764KB
  r2: lcp=6518 cls=0 tbt=93 img=835KB
  r3: lcp=6016 cls=0 tbt=72 img=834KB

explorar-desktop:
  r1: lcp=1734 cls=0 tbt=0 img=1601KB
  r2: lcp=1855 cls=0 tbt=0 img=1601KB
  r3: lcp=2012 cls=0 tbt=0 img=1601KB
```

**Variabilidad ficha-mobile**: r1 (9.7 s) alto vs r2/r3 (2.6/3.4 s). Posible cold start Vercel `sa-east-1` al inicio de la medición. La mediana 3.4 s es representativa del steady state; una medición puntual puede variar hasta 10 s en el peor caso.

---

## Pendientes derivados

- **CLS 0.112 ficha-desktop** → fix en PR `cls-ficha` (ReviewSummary wrapper `min-h-[240px]`). Debería dejar CLS <0.01.
- **explorar-mobile LCP 6.5 s** → nueva entrada BACKLOG `EXPLORAR-MOBILE-LCP` post-lanzamiento.
- **UPLOAD-IMG-RESIZE** (BACKLOG, post-launch): foto principal mínimo 1200 px wide + resto 800 px + avatar 400 px. Afinado en PR #106 tras hallazgo del smoke PO.

---

## Scripts

- Medición: `scratchpad/lh-perf-ficha-median.sh` (12 runs Lighthouse CLI).
- Comparación: `scratchpad/lh-compare-post-vs-baseline.mjs` (mediana + delta vs baseline).
- Diagnóstico CLS: `scratchpad/lh-cls-diag.mjs` (extrae `layout-shifts` audit items).
