# Lighthouse — mediana de 3 corridas · prod · 2026-11-11

**Target**: `https://www.pawnecta.com` (prod).
**Método**: `npx lighthouse` CLI, Chrome local headless, 4 URLs × 2 presets (mobile throttled + desktop) × 3 runs = **24 corridas**. Mediana por métrica en cada escenario.
**Runs duration**: 353 segundos (~6 min).
**Raw JSONs**: generados en `scratchpad` local (no commiteados por volumen ~15 MB). Resumen por escenario en [`median-summary.json`](median-summary.json).

Sesión nueva miércoles 2026-11-11, pedido PO: 3 corridas para absorber variabilidad por cold starts Vercel `sa-east-1`. URLs agregadas a la baseline del 2026-11-10: **`/register?rol=proveedor`** (desktop + mobile).

## Tabla medianas (ordenadas por bloqueo)

| Escenario | Perf | **LCP** | **CLS** | TBT | FCP | SI | A11y | BP | SEO | Flag |
|---|---|---|---|---|---|---|---|---|---|---|
| **ficha-mobile** | **56** | **39589 ms** | 0 | **446** | 2043 | 4198 | 92 | 100 | 92 | 🔴🔴 LCP catastrófico + TBT alto |
| **ficha-desktop** | **68** | **6649 ms** | **0.112** | 3 | 286 | 1966 | 95 | 100 | 92 | 🔴 LCP crítico + CLS >0.1 |
| **explorar-mobile** | **76** | **7128 ms** | 0 | 75 | 847 | 1546 | 90 | 100 | 92 | 🔴 LCP crítico |
| **explorar-desktop** | **75** | **8006 ms** | 0 | 0 | 275 | 533 | 95 | 100 | 92 | 🔴 LCP crítico |
| home-mobile | 97 | **2599 ms** | 0 | 33 | 1042 | 1042 | 95 | 100 | 92 | ⚠ LCP marginal |
| home-desktop | 100 | 644 ms | 0 | 0 | 324 | 465 | 95 | 100 | 92 | OK |
| register-mobile | 98 | 2412 ms | 0.003 | 48 | 851 | 960 | 92 | 100 | 58 | OK (SEO intencional) |
| register-desktop | 98 | 562 ms | 0.086 | 0 | 268 | 371 | 92 | 100 | 58 | OK |

**Umbrales Core Web Vitals (Google 2025)**: LCP ≤2500 ms, CLS ≤0.1, TBT ≤300 ms, Perf ≥90.

### Variabilidad entre runs (orientativa, cold starts)

| Escenario | LCP r1 | LCP r2 | LCP r3 | Observación |
|---|---|---|---|---|
| ficha-mobile | 8584 | 39589 | 40547 | r1 cache hit, r2+r3 cold Vercel |
| home-mobile | 1863 | 2599 | 11962 | r3 outlier, mediana absorbe |
| explorar-mobile | 7128 | 7074 | 9235 | Estable, consistentemente malo |
| explorar-desktop | 7988 | 8006 | 9081 | Estable |
| ficha-desktop | 6649 | 6636 | 6702 | Muy estable (sin variabilidad) |

## Bloqueantes pre-lanzamiento 2026-11-18 (priorizados)

### 🔴🔴 BLOQUEANTE 1 — ficha `/servicio/[id]`

**Perf 56-68 · LCP 6.6-39s · CLS 0.112 desktop**.

**Causa raíz: peso de imagen. No render delay, no proxy sin cache, no script bloqueante.**

La ficha `/servicio/7134e58a-...` (la que midió Lighthouse, 4 fotos en galería + hero + avatar) descarga **6 imágenes totalizando 8.2 MB** en cada corrida:

| # | KB | ms (desc) | Tipo | Proxy |
|---|---|---|---|---|
| 1 | 944 | 154 | hero (`fotos[0]`) | directo Supabase |
| 2 | 2343 | 717 | galería `fotos[1]` | directo Supabase |
| 3 | 2364 | 730 | galería `fotos[2]` | directo Supabase |
| 4 | 1449 | 665 | galería `fotos[3]` | directo Supabase |
| 5 | 1078 | 149 | avatar proveedor | directo Supabase |
| 6 | 9 | 72 | logo Pawnecta | **PROXY-NEXT `/_next/image`** |
| **Total** | **8186** | | | |

**Aritmética de red**: Lighthouse mobile preset throttling = 1.6 Mbps = ~200 KB/s teórico. **8186 KB / 200 KB/s = 41 segundos** → coincide con LCP observado 39-40 s en r2+r3.

Corroboración con audits adicionales:
- **`image-delivery-insight`: savings 7,024 KiB**.
- **`cache-insight`: savings 6,542 KiB**.
- **`mainthread-work-breakdown`: 2.4 s** + **`unused-javascript` 189 KiB** (contribuye al TBT 446-703 ms pero no es el bottleneck principal).
- **1 layout shift** detectado → CLS 0.112 desktop viene de no reservar `aspect-ratio` en containers.

**`getProxyImageUrl`**: importado en [components/Servicio/ServiceDetailView.tsx:48](../../components/Servicio/ServiceDetailView.tsx#L48) pero **no se usa** en los `src` de hero/galería/avatar (`<img>` nativo con URL directa Supabase en L829, L942, L1483, L1492). Solo el logo pasa por `/_next/image` (optimizado a 9 KB AVIF).

**Control cruzado PO (móvil real con datos móviles, 2026-11-11)**: la ficha carga "casi al instante" con cache poblada + red real chilena 4G/5G (sin throttling 1.6 Mbps + 4x CPU slowdown). **Lighthouse mobile preset simula worst case** (red lenta + CPU bajo + cache clean cada run). El bug real se manifiesta solo en: (a) primer visit sin cache, (b) red lenta real (2G/3G/congestión), (c) users con dispositivos low-end. La mediana Lighthouse mobile 39 s es techo, no típico.

**Protocolo h3, `priority: High`, `isLinkPreload: true`**: preload del hero en [components/Servicio/ServiceDetailView.tsx:711-721](../../components/Servicio/ServiceDetailView.tsx#L711-L721) sí funciona (tiempo de descarga del hero solo 154 ms). El problema no es el hero individual sino la suma de las 4 fotos galería + avatar.

**Fix propuesto (3-4 h, PR propio `perf-ficha`)**:

1. Migrar los 4 call sites `<img>` del ficha ([components/Servicio/ServiceDetailView.tsx:829, 942, 1483, 1492](../../components/Servicio/ServiceDetailView.tsx)) a `<Image>` de Next.js con `sizes` responsive + `priority` en el hero. Esto da WebP/AVIF conversion automática — reduce JPEG 944 KB → ~80-150 KB AVIF.
2. Agregar `aspect-ratio` CSS fijo + `object-fit: cover` en el container del hero y de cada thumb de la galería → elimina CLS 0.112 **Y** evita descuadres / espacios blancos con las fotos actuales (que son 4:3 variado). Prepara el terreno para cuando `UPLOAD-IMG-RESIZE` post-launch fuerce proporciones 4:3 / 1:1 en nuevas uploads.
3. `loading="lazy"` en el carrusel secundario (thumbs y espacio proveedor).
4. Verificar `images.remotePatterns` de `next.config.js` cubre `ouezpeeiwjwawauidrqq.supabase.co/storage/v1/object/public/**` (ya debería, según CLAUDE.md tren N15 pieza N2).
5. (Opcional extra, bajo riesgo) Extender `cache-control` de los objects del bucket `servicios-fotos` a `public, max-age=31536000, immutable` desde Supabase Storage Settings. Reduce hits a Supabase + mejora CDN.
6. Si `/explorar` (ServiceCard) también carga fotos originales sin optimizar y entra en el mismo PR (TBD jueves): aplicar `aspect-ratio` + `object-fit: cover` + `<Image>` también en el ServiceCard.

**Estimación impacto post-fix**: 8.2 MB → ~1-1.5 MB total (AVIF). LCP mobile throttled 39 s → 5-8 s. CLS <0.05. Perf 80+.

**Verificaciones a confirmar ANTES de codificar el fix** (pedido PO 2026-11-11):
- **Cupo Vercel Pro `/_next/image` optimization**: Vercel Pro incluye source images optimizadas gratis (verificar límite exacto en billing). Estimar consumo mensual con tráfico actual (~20 proveedores x ~5 fotos x N visits/mes) y con 10× más tráfico. Si hay overage → costo en USD + CLP.
- **`/explorar` (ServiceCard)**: verificar si usa las mismas fotos originales Supabase sin optimizar. Si sí, considerar cubrir en el mismo PR o PR inmediato siguiente.
- Ítem BACKLOG `UPLOAD-IMG-RESIZE` post-lanzamiento (ya anotado en este PR): comprimir o limitar el tamaño de las fotos al subirlas (hoy entran a 2 MB+ sin resize).

### 🔴 BLOQUEANTE 2 — `/explorar`

**Perf 75-76 · LCP 7-8s desktop+mobile**.

Catálogo público, segundo path más visitado por anónimos. Mismo patrón: cards con imágenes sin optimizar en `components/Explore/ServiceCard.tsx` (verificar si usa `<img>` o `<Image>`).

**Fix propuesto (3-4 h, PR propio `perf-explorar`)**:
1. Migrar `<img>` de `ServiceCard` a `<Image>` con `sizes` responsive.
2. Skeleton loader con dimensiones reservadas.
3. Verificar si el fetch inicial de `buscar_servicios` es SSR o client-fetched; si client, mover a SSR con primera página prefetched.

**Estimación impacto**: LCP 3-5 s, Perf 85+.

### ⚠ MARGINAL 3 — home móvil

**Perf 97 · LCP 2599 ms** (borde del umbral 2500 ms).

Variabilidad alta entre runs (r3 outlier 11962 ms). Puede quedar OK con una optimización chica.

**Fix propuesto (1-2 h, PR chico `perf-home`)**:
- Preload del hero image (si no está) + preload de font bold.

### No bloqueante pero notable — ficha-desktop CLS 0.112

Cubierto por BLOQUEANTE 1 (aspect-ratio del hero).

### Nota — register SEO 58 (intencional probable, verificar origen)

- Audit que falla: `is-crawlable: Page is blocked from indexing`. Alguien bloqueó la indexación de `/register?rol=proveedor` — tiene sentido (página de signup no debería estar en SERPs).
- Audit secundario: `link-text: 1 link found` sin texto descriptivo.
- `grep -n "noindex|robots"` en `pages/register.tsx` → 0 matches. El bloqueo viene de otra capa: `_app.tsx`, `_document.tsx`, `middleware.ts`, o un `<Head>` dentro del wizard.
- **Acción**: verificar origen del noindex. Si es intencional, documentar aquí. Si es accidental, decidir si reindexar.

## Propuesta orden jueves-viernes (ajustado PO 2026-11-11 tarde)

Tras el control cruzado del PO en móvil real (ficha carga "casi al instante" en red real chilena con cache), **SHARE-PROV vuelve a primer orden** del jueves. El fix de imágenes es acotado (next/image + sizes + aspect-ratio) y el bug es específico del escenario Lighthouse throttled.

| Día | Tarea | Horas |
|---|---|---|
| **Jueves 12 AM** | SHARE-PROV completo (botones WhatsApp + copiar + share nativo + OG metadata + evento GA4) — PR propio | 4-6 h |
| **Jueves 12 PM** | Fix BLOQUEANTE 1 ficha (`<Image>` + CLS aspect-ratio + lazy galería) — PR propio `perf-ficha` | 3-4 h |
| **Viernes 13** | Fix BLOQUEANTE 2 explorar si `/explorar` también carga fotos sin optimizar + buffer | 1 día |
| **Viernes 13 PM / Lunes 16** | MARGINAL 3 home (si sobra tiempo) | 1-2 h |
| **Lunes 16** | Re-medir Lighthouse mediana + smokes golden path | 1 día |
| **Martes 17 16:00 CLT** | Freeze | — |
| **Miércoles 18** | Lanzamiento | — |

**Si algo se come la ventana**: Fix BLOQUEANTE 2 explorar primer candidato a diferir (el hallazgo del jueves sobre `/explorar` ServiceCard puede modificar prioridad). Home marginal también difiere. Ficha no se difiere — el 39 s mobile throttled es baseline peor caso, usuarios en red congestionada lo sufren igual.

## Decisiones aterrizadas (PO 2026-11-11)

- **Orden**: ficha primero, SHARE-PROV después. Los enlaces compartidos abren la ficha; no sirve compartir una página de 40 s.
- **JSON raw**: solo `median-summary.json` + este reporte MD en el repo. Raws locales.
- **Antes de codificar la ficha**: PO corre prueba real en celular con datos móviles y pasa tiempos como control cruzado. Auditor queda a la espera de esa evidencia antes de abrir PR `perf-ficha`.
- **`cache: none` en logs Lighthouse**: cada run arranca con browser clean. En usuarios reales con cache, el hit rate del bucket Supabase es `max-age=3600` default (1h). Fix opcional del BLOQUEANTE 1 pt. 5 sube a 1 año.

## Siguiente paso

1. PO corre WebPageTest / DevTools Performance en celular con datos móviles reales → pasa tiempos + elemento LCP real.
2. Auditor arma PR `perf-ficha` jueves AM con `<Image>` + aspect-ratio + verificación origen SEO 58 register.
3. Smoke manual pre-merge del PO + 4/4 verde + merge.
4. Re-medir con mediana 3 post-merge para validar impacto.
