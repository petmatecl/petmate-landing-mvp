# Baseline Lighthouse prod · 2026-11-10

**Sprint**: lh-baseline-nov · Tramo 3 pre-lanzamiento 2026-11-18.
**Modo**: solo lectura sobre `https://www.pawnecta.com`. Cero mutación.

## Método (anclado para revalidación martes 17)

Lighthouse CLI local en Windows. Chrome del sistema (no PSI por quota agotada).

- **Binario**: `C:\Program Files\Google\Chrome\Application\chrome.exe` (vía `CHROME_PATH` env var).
- **Comando por URL**:
  ```bash
  npx -y lighthouse "<URL>" \
    --output=json \
    --output-path="<file>.json" \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
    --only-categories=performance,accessibility,best-practices,seo \
    --quiet \
    [--preset=desktop]   # omitido para mobile (mobile = default)
  ```
- **1 corrida por URL/form en esta primera pasada**. La revalidación del 17 va a usar **mediana de 3 corridas** para las métricas P0 (`ficha-servicio mobile` + `explorar desktop` + `explorar mobile` + `/register?rol=proveedor`), para distinguir cold start de fenómeno estable.
- Script: `scripts/lighthouse-cli.sh` (fuera del repo, en el scratchpad de la sesión).

## Cobertura · 4 URLs públicas × desktop + mobile = 8 corridas

- `https://www.pawnecta.com/`
- `https://www.pawnecta.com/explorar`
- `https://www.pawnecta.com/servicio/7134e58a-8067-468b-b1d9-633f7bbc6ef8` (seed real prod, verificado prod-ro)
- `https://www.pawnecta.com/proveedor/ed384fc0-826f-44e9-bedf-f03f4eb68ca3` (Constanza, 3 servicios activos, prod)

## Páginas NO medidas en esta pasada

Requieren sesión; Lighthouse CLI sin auth cookie es redirigido al login por el middleware, midiendo esa pantalla, no la app:

- `/proveedor` (dashboard proveedor con sesión).
- `/mis-reservas` (dashboard tutora con sesión).

**Decisión PO 2026-11-10**: opción B del triage — **fuera del baseline pre-lanzamiento, medir post-launch** cuando se arme Lighthouse CI con auth storageState.

## Página adicional sumada para revalidación 17

- `https://www.pawnecta.com/register?rol=proveedor` — landing de la campaña Google Ads. **No está en esta pasada; se mide el 17 con mediana de 3**.

## Scores (sobre 100)

| Página | Desktop (perf/a11y/bp/seo) | Mobile (perf/a11y/bp/seo) |
|---|---|---|
| home | **86**/95/100/92 | 88/95/100/92 |
| explorar | **75**/95/100/92 | **70**/90/100/92 |
| ficha-servicio | 70/95/100/92 | **56**/92/100/92 |
| perfil-proveedor | 96/95/100/92 | 83/95/100/92 |

## Core Web Vitals (foco LCP)

| Página | Form | LCP | FCP | CLS | TBT |
|---|---|---|---|---|---|
| home | desktop | 2.5s ✅ | 482ms | 0.000 | 0ms |
| home | mobile | 4.0s ⚠️ | 1.0s | 0.000 | 28ms |
| explorar | desktop | **7.5s** 🔴 | 269ms | 0.000 | 0ms |
| explorar | mobile | **7.4s** 🔴 | 810ms | 0.000 | 280ms |
| ficha-servicio | desktop | 4.8s ⚠️ | 306ms | 0.112 ⚠️ | 0ms |
| ficha-servicio | mobile | **40.4s** 🔴🔴 | 890ms | 0.000 | 597ms |
| perfil-proveedor | desktop | 277ms ✅ | 277ms | 0.001 | 0ms |
| perfil-proveedor | mobile | 4.2s ⚠️ | 896ms | 0.000 | 37ms |

Umbrales Google: LCP ≤2.5s "Good", 2.5-4s "Needs Improvement", >4s "Poor".

## Bloqueantes priorizados para 18-11

### P0 — bloqueantes (mediana de 3 confirma si estable)

1. **ficha-servicio mobile LCP 40.4s**. Requiere mediana de 3 para descartar cold start / outlier Chrome headless. Si estable, root cause probable: hero image + galería no optimizadas + `getProxyImageUrl()` sin cache CDN. Fix estimado 2-4 h (`next/image` con `priority` + `sizes` + `fetchpriority=high`).
2. **explorar desktop/mobile LCP 7.4-7.5s**. Página pública de más tráfico. Con 12 cards por default (paginación RPC `buscar_servicios` `LIMIT 12`) el problema no es cantidad; probable: cold start Vercel, RPC lenta, bundle mapa Leaflet. Mediana de 3 distingue.

### P1 — no bloqueantes, deseables

3. **home mobile LCP 4.0s**. Hero image.
4. **ficha-servicio desktop CLS 0.112** (>0.1). `aspect-ratio` faltante en algún contenedor.
5. **perfil-proveedor mobile LCP 4.2s**. Mismo patrón hero; se resuelve con el fix de FIX-LCP-HERO-IMAGES.

### Oportunidades menores

`unused-javascript` + `unused-css-rules` con savings 0-450ms. Baja prioridad vs. los LCP.

## Fixes propuestos

- **FIX-LCP-HERO-IMAGES**: migrar hero images de home + ficha-servicio + perfil-proveedor a `next/image` con `priority`, `sizes`, `fetchpriority="high"`. Un solo PR cubre las 3. **3-4 h**.
- **FIX-LCP-EXPLORAR-COLD-START**: investigar tras mediana de 3. Si cold start → nada que hacer (Vercel Pro ya está, paciencia). Si RPC lenta → índice. Si bundle Leaflet → lazy del mapa. **1-4 h** según root cause.
- **FIX-CLS-FICHA**: `aspect-ratio` a los contenedores de imágenes. **1 h**.

Ventana prevista: jueves 12 / viernes 13 en el plan Tramo 3.

## Discrepancia reportada y resuelta

Durante la auditoría reporté "412 resultados en /explorar" por confusión con el preview staging; el número real en prod es 12 por la paginación default de `buscar_servicios(p_limit DEFAULT 12)`. Verificado: con `p_limit := 100` devuelve 19. Cero servicios reales invisibles.

## Archivos adjuntos en esta carpeta

- `home-desktop.json`, `home-mobile.json`
- `explorar-desktop.json`, `explorar-mobile.json`
- `ficha-servicio-desktop.json`, `ficha-servicio-mobile.json`
- `perfil-proveedor-desktop.json`, `perfil-proveedor-mobile.json`
- `summary.json` — resumen scores + CWV + top oportunidades por página.
- `evidence-84-fail/a1c-watchdog-hydrate/` y `evidence-84-fail/a1e-watchdog-reactivacion/` — artifacts del rerun fallido del PR #84 (1 warn del watchdog cold start, resuelto con rerun autónomo autorizado por PO).
