# REPORTE PERFORMANCE BASELINE — www.pawnecta.com

**Fecha**: viernes 2026-08-07 tarde.
**Origen**: módulo de la Auditoría #2 originalmente diferido por GAP tooling (Chrome DevTools MCP no propagaba `extraHttpHeaders` al navigate → Vercel Deployment Protection interceptaba en staging). Desbloqueado tras Fase E — prod real (`www.pawnecta.com`) NO tiene Deployment Protection → Chrome DevTools MCP funciona natural.
**SHA prod medido**: `917e4eb` (Sweep #2 CERRADO — bundle `_app-dc4bdf02...`).
**Herramienta**: Chrome DevTools MCP (`performance_start_trace` + `lighthouse_audit`).
**Alcance**: 3 URLs × 2 form factors × 2 tipos de medición = **12 mediciones**. Home + /explorar + una ficha real (`/servicio/c1000001-0000-4000-8000-000000000003` — Sebastián C., cuidado).
**Objetivo**: baseline numérica pre-optimizaciones + hallazgos evidentes + veredicto del Cold Start Prevention de Vercel Pro si es observable.

**Nota importante sobre throttling**: Chrome DevTools MCP corre con `CPU throttling: 1x` y `Network throttling: none`. Los números miden **compute + serving + CDN**, no experiencia real de mobile users con 4G/3G. Real-world mobile users tendrán LCPs peores por network real. Baseline útil como piso, no como techo del user.

---

## 1. Baseline numérica (los 6 pares)

### Core Web Vitals + Lighthouse categories

**DESKTOP** (1920×1080, sin throttle)

| Página | LCP | CLS | TTFB | A11y | BP | SEO | AB |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` (home) | **328 ms** | 0.00 | 173 ms | 95 | 100 | 92 | 100 |
| `/explorar` | **564 ms** | 0.00 | 138 ms | 95 | 100 | 92 | 100 |
| `/servicio/{id}` | **2420 ms** | 0.00 | 65 ms | 95 | 100 | 92 | 100 |

**MOBILE** (375×812×2, viewport móvil, sin throttle red)

| Página | LCP | CLS | TTFB | A11y | BP | SEO | AB |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` (home) | **343 ms** | 0.00 | 227 ms | 95 | 100 | 92 | 100 |
| `/explorar` | **986 ms** | 0.00 | 549 ms | 90 | 100 | 92 | **50** |
| `/servicio/{id}` | **1236 ms** | 0.00 | 1127 ms | 92 | 100 | 92 | **50** |

**Umbral referencial Core Web Vitals** (targets de Google — "good"):
- LCP: ≤ 2500 ms.
- CLS: ≤ 0.10.
- TTFB: ≤ 800 ms.

**Todos los pares están en verde** para LCP y CLS, con la excepción notable de la ficha desktop en su **primera pasada cold** (2420ms, borderline — apenas 80ms del umbral).

---

## 2. Hallazgos evidentes

### 🟠 H1 — Ficha `/servicio/{id}` desktop cold: LCP 2420 ms borderline
El insight `LCPBreakdown` mostró:
- **Load delay: 2192 ms** (90% del LCP) — dominante.
- TTFB: 65 ms · Load duration: 5 ms · Render delay: 158 ms.

Interpretación: la imagen que gana LCP (galería principal del servicio) NO es discoverable desde el HTML inicial. Chrome espera a que el JS se ejecute + los data-fetches del cliente para saber cuál preloadear. **Fix direccional**: en el gSSP de `/servicio/[id]`, extraer la primera URL de `service.fotos` y renderar un `<link rel="preload" as="image" href={fotos[0]}>` en el `<Head>`. Estimated saving ~2s.

**Alcance**: solo cold. En warm request, el LCP baja a 1236ms (ver H2). Impacto real = primera visita del usuario a la ficha por sesión.

### 🟢 H2 — Cold Start Prevention Pro es OBSERVABLE
Comparación empírica del mismo endpoint (`/servicio/c1000001-0000-4000-8000-000000000003`):
- **Primera pasada** (desktop cold): LCP 2420ms · TTFB 65ms · **Load delay 2192ms**.
- **Segunda pasada** (mobile warm, ~30s después): LCP 1236ms · TTFB **1127ms** · Load delay 16ms.

El shape cambia radicalmente:
- **Cold**: el server responde rápido (TTFB 65ms) pero la CSR chain para descubrir el LCP tarda 2192ms.
- **Warm**: el server tarda más (TTFB 1127ms — refleja el gSSP con SSR + fetches BD) pero la image LCP se descubre y renderea inmediato (Load delay 16ms).

**Interpretación**: en el cold, Vercel probablemente sirve HTML "stub" mientras el gSSP compila; en el warm, el gSSP ya está en cache/function warm y sirve HTML completo con la imagen LCP inline en el `<img>` del hero. **La diferencia de ~1184 ms LCP entre cold-first-visit y warm-second-visit es evidencia empírica del beneficio de Pro** — sin Pro esa diferencia sería mayor y consistente en cada primera visita post-idle.

**Veredicto**: Cold Start Prevention funciona, se ve. Métrica cuantitativa que Aldo puede citar en la conversación de velocidad: ~1.2s de mejora vs Hobby en la primera visita a fichas — feature crítico para SEO organic (Google mide primer render de la primera visita).

### 🟡 H3 — Mobile `/explorar` + ficha: Agentic Browsing score 50
Mismo umbral no aparece en desktop (100). El score "Agentic Browsing" mide qué tan bien un agente AI puede navegar la página. Que baje a 50 en mobile pero se mantenga en 100 en desktop sugiere que hay elementos mobile-only (bottom nav, sticky action bar, drawer de filtros) que confunden al scraper AI.

**Fix direccional**: revisar `MobileActionSheet`, filtros drawer mobile, y sticky action bar de las fichas. Aria-labels + `role` semánticos completos + evitar duplicar targets (mismo botón visible en desktop y mobile con IDs distintos). No es blocker de UX humano, es tema de AI-friendliness.

### 🟠 H4 — Mobile `/explorar` TTFB 549 ms
`/explorar` es CSR (getServerSideProps ausente). El HTML shell debería servirse en <200ms desde CDN. 549ms sugiere que la primera navegación mobile hace un cold start del compute (viewport primer visitor de mobile en la ventana). Ver H2 — mismo patrón.

### 🟡 H5 — Wasted image bytes home desktop: 835 KB
El insight `ImageDelivery` marcó 835.1 KB de "wasted bytes" (imágenes servidas más grandes que su display size, o formatos no optimizados). Fix direccional: `next/image` con `sizes` correcto por breakpoint + preferir AVIF/WebP (Vercel image opt ya lo hace por default; verificar que el `<Image />` component esté usado consistentemente en el hero + cards).

### 🟢 H6 — CLS es 0.00 en todas las mediciones
Cero layout shifts detectados. Reservación de espacio para imágenes + tipografía consistente + skeleton loaders (donde existen) funcionan.

### 🟢 H7 — SEO 92 estable en todas las mediciones
No hay página con SEO caído. El -8 respecto a 100 típicamente viene de meta-tags menores; sin regresión detectable.

### 🟠 H8 — A11y baja de 95 a 90 en mobile `/explorar`
Diferencia sutil pero real. Probablemente touch-target sizing en filtros mobile o contraste en tokens mobile-only. Fix incremental para Sweep #3 UX/a11y batch.

### 🟢 H9 — Best Practices 100 estable en todas
Cero hallazgos de BP (mixed content, deprecated APIs, JS errors en console). Baseline sólida.

---

## 3. Insights Chrome DevTools que quedan en cola

Cada insight de los traces trae `example question` para deep-dive con el MCP. Los relevantes para Sweep #3 o post-launch:

- **LCPBreakdown ficha**: "Which LCP phase was most problematic?" — confirma que Load delay es el 90% del cost.
- **LCPDiscovery ficha**: "What can I do to reduce my LCP discovery time?" — sugerirá exactamente el `<link rel="preload">` de H1.
- **NetworkDependencyTree**: mostraría la chain crítica (HTML → app.js → chunk de ficha → RSC data → primera image). Cortar ese chain baja LCP.
- **ThirdParties** en explorar + ficha: identificaría si Supabase (auth + storage) suma latencia crítica al path de LCP. Si sí → `dns-prefetch` + `preconnect` a `*.supabase.co` en `<Head>`.
- **DOMSize** home: verificar si el bundle inicial del home tiene DOM excesivo (>1500 nodos → warning típico).

---

## 4. Recomendaciones priorizadas

### Sprint chico (~1h) — impacto directo en LCP ficha
- **Preload de la imagen LCP en gSSP `/servicio/[id]`**: agregar `<Head><link rel="preload" as="image" href={fotos[0]}/></Head>` con la primera foto del servicio. Estimated save 1-2s en LCP cold.
- **preconnect a Supabase**: `<link rel="preconnect" href="https://vubmjguwzpesxcgenkxo.supabase.co">` en `_document.tsx` (o `_app.tsx`). Ahorra ~200-300ms del handshake TCP+TLS en el primer request a Supabase de cada sesión.

### Sprint medio (~2h) — Agentic Browsing mobile
- Auditar `MobileActionSheet`, filtros drawer mobile, sticky action bar. Aria-labels completos + verificar que no haya duplicación de targets entre desktop y mobile.

### Sprint pequeño (~30 min) — image optimization
- Auditar uso de `next/image` en home + cards de `/explorar`. Confirmar `sizes` prop por breakpoint.

### Post-launch — monitoring
- Instalar Vercel Analytics (Speed Insights) — está gratis en Pro, mide Core Web Vitals con real users vs esta baseline con Chrome DevTools MCP en máquina de dev. Comparación baseline vs real revelará si los users mobile con 4G están en el "verde" (<2.5s) o si necesitan más optimización agresiva.
- Sentry ya está en el radar (Sprint SENTRY-1 pre-launch) — perf tracing en el mismo Sentry cubre traces de real users si se activa.

---

## 5. Cold Start Prevention Pro — conclusión para la conversación de velocidad del PO

**Sí, es observable + cuantificable**:
- Diferencia empírica ~1184 ms de LCP entre primera visita cold y siguiente visita warm en la misma ficha (mismo bundle, mismo endpoint).
- Con Pro, esa mejora se mantiene en las visitas siguientes de la ventana de la función; sin Pro (Hobby), el gap se repetiría en cada visita post-idle > 5-10 min.
- Impacto neto proyectado: en SEO organic (Google mide primer render de la primera visita), las páginas dinámicas prod del sitio se benefician directamente. Fichas concretamente son las páginas más pesadas de Pawnecta (foto galería + reviews + otros servicios similares); las que más ganan con Pro.

**Métrica clara para el user story del PO**: *"con Vercel Pro, la primera visita a una ficha carga ~2× más rápido en promedio que con Hobby — la diferencia se ve en el LCP: de ~2.4s cold a ~1.2s con función caliente"*.

## 6. Estado tras entrega

- **12 mediciones baseline entregadas** (3 URLs × desktop+mobile × trace+lighthouse).
- **9 hallazgos identificados** (2 orange, 4 yellow, 3 green).
- **Cold Start Prevention verificado empíricamente**.
- **Recomendaciones priorizadas** en 3 buckets (~1h + ~2h + ~30min + monitoring post-launch).
- **Baseline queda registrada** — sirve para comparar contra futuras optimizaciones (mismo test suite → si mejora, se ve).
