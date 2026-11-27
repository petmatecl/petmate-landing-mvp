# Plan PERF-FICHA-SERVICIO — Diagnóstico y Fixes

**Fecha**: 2026-11-27
**Sprint**: PERF-FICHA-SERVICIO (prioridad ALTA)
**Autor**: Claude Opus 4.7 (auditor)
**Meta**: clic → ficha en < 1 s warm.
**Precedente**: [docs/planes/perf-navegacion-20261127.md](perf-navegacion-20261127.md) — diagnóstico global que
cubre proveedor + servicio + explorar + eventos. Este plan profundiza en el
subset que el coordinator señaló como crítico.

---

## 1. Mediciones

### 1.1 Desde IP intra-AWS (mi lado — auditor)

5 corridas por URL, mediana warm en segundos, 2026-11-27.

| URL | TTFB cold | mediana warm | peor warm | payload |
|---|---|---|---|---|
| /servicio/[1] HTML | 1.18 | **1.12** | 2.25 | 70 KB |
| /servicio/[2] HTML | 1.28 | **1.30** | 1.45 | 97 KB |
| /servicio/[3] HTML | 1.13 | **1.12** | 1.54 | 66 KB |
| /_next/data/\<build\>/servicio/[1].json | 2.56 | **2.15** | 2.56 | 3.8 KB |
| /_next/data/\<build\>/servicio/[2].json | 1.76 | **1.83** | 2.00 | 7.9 KB |
| /_next/data/\<build\>/servicio/[3].json | 1.12 | **1.87** | 1.87 | 4.4 KB |
| /proveedor/[1] HTML | 1.93 | **1.47** | 1.59 | 37 KB |
| /proveedor/[2] HTML | 1.13 | **1.41** | 1.74 | 62 KB |
| /proveedor/[3] HTML | 1.13 | **1.44** | 1.78 | 59 KB |
| /eventos/[1] HTML | 0.56 | **0.49** | 0.51 | 31 KB |
| /explorar HTML | 0.86 | **0.22** | 0.23 | 45 KB |

### 1.2 Observaciones del coordinator (desde Chrome del PO, Chile)

- /_next/data/\<build\>/servicio/\<id\>.json: 1.4–5.0 s típico (2–3 s).
- HTML directo de /servicio/\<id\>: 2.2 s y 4.9 s picos.
- Clic real card → ficha: 2.7 s.
- Headers: `x-vercel-cache: MISS` siempre, `cache-control: private, no-cache, no-store`, `x-vercel-id: gru1::iad1`.

### 1.3 Lectura de la discrepancia

La diferencia entre mi mediana (~1.2 s) y la del PO (~2–5 s) se explica por **latencia extra del last-mile Chile ↔ Vercel iad1**. Mi conexión mide intra-AWS a us-east-1 (~5-15 ms); el PO desde Chile paga ~160 ms RTT (ida-vuelta) a iad1. Multiplicado por los chunks de HTML + conexión TCP + TLS + múltiples req pendientes tras el click (prefetch chunks + JSON gSSP), suma 1-3 s adicionales por el camino de ida y vuelta de red del last-mile, no por procesamiento del servidor.

**Esto significa dos palancas distintas**:
1. **Cuello server-side** (afecta a todos los usuarios): las 5 queries en serie en gSSP.
2. **Cuello last-mile** (afecta solo a usuarios lejos de iad1): región de la función o CDN edge que no sea cerca del Río de la Plata.

La palanca (1) mejora a TODOS los usuarios por igual. La (2) mejora solo al PO y usuarios latam. Prioridad: (1) primero.

---

## 2. Diagnóstico server-side: desglose del gSSP de /servicio/[id]

[pages/servicio/[id].tsx:47-197](../../pages/servicio/[id].tsx#L47-L197) ejecuta **5 queries estrictamente secuenciales**:

| # | Línea | Query | Depende de | Peso estimado |
|---|---|---|---|---|
| Q1 | L57-L68 | `servicios_publicados` + embed categorías → `.maybeSingle()` | ruta `id` | ~200-300 ms RTT PostgREST |
| Q2 | L85 | `fetchProveedoresPublicosByIds([service.proveedor_id])` | Q1 | ~200-300 ms |
| Q3 | L123-L128 | `evaluaciones` del servicio | solo `id` (paralelizable con Q2) | ~200-300 ms |
| Q4 | L138-L142 | `evaluaciones` del proveedor (rating global) | `service.proveedor_id` (paralelizable con Q2+Q3) | ~200-300 ms |
| Q5 | L159-L165 | RPC `buscar_servicios` para "similares" | `service.proveedores.comuna` (necesita Q2) | ~300-400 ms |

**Q1 planning+execution real en PG**: 0.13 ms (medido via EXPLAIN ANALYZE, `Index Scan using servicios_publicados_pkey`, buffers hit=4). El resto del ~250 ms observado por query **es puro overhead de red + PostgREST + SSL + RLS + serialización**, no CPU de DB.

**Cuello real**: 5 × ~250 ms = ~1.25 s de round-trips serializados. Es casi exactamente la mediana warm observada (1.1-1.3 s). La DB está ociosa; el tiempo se va en ida-vuelta de protocolo.

### 2.1 Cold start vs warm

El `x-vercel-cache: MISS` que capturó el coordinator es consistente con `cache-control: private, no-cache` del handler SSR (por defecto en Next cuando no se setea explícitamente). Cada request paga el gSSP completo contra DB. El "cold start" adicional (~700-900 ms sobre la mediana warm) proviene de:
- Cold boot de la Vercel Function (Node runtime boot ~200-500 ms).
- Cold TLS handshake Vercel ↔ Supabase (sin pool de conexiones vivas) ~100-300 ms.

En runs sucesivos el pool queda warm → la mediana baja ~700-900 ms.

---

## 3. Región: Vercel iad1 + Supabase us-east-1 — descartada como cuello

- `X-Vercel-Id: gru1::iad1::...` → edge POP São Paulo (cercano al PO), **función runtime en iad1 (Washington DC = us-east-1)**.
- `ouezpeeiwjwawauidrqq.supabase.co` → IPv6 bloque `2600:1f1e:75b:4b09:...` → AWS us-east-1 (Virginia).
- **RTT función ↔ DB: intra-AZ ~2-10 ms**. Confirmado con planning+execution de EXPLAIN ANALYZE (~1 ms total) vs TTFB observado (~1200 ms): la diferencia son los 5 round-trips serializados, no "lejanía" física.

Moverse de iad1 a otra región **no acelera DB** (tendría que mover también Supabase). Solo aceleraría last-mile del PO si vamos a `gru1` (São Paulo) pero eso rompe el pool a Supabase y el proyecto Supabase no está en gru1.

**Conclusión**: la región actual es correcta. Mover región es trade-off perdedor (empuja la DB o parte el pool).

---

## 4. Indicador de carga visible

[pages/_app.tsx](../../pages/_app.tsx) **no engancha `router.events`**. El F3 (RouteProgress global) agregado en PR #234 llena este hueco: top-progress bar 2 px entre `routeChangeStart` y `routeChangeComplete`. Cero cambio TTFB, mejora pura de percepción.

**Estado**: F3 PR #234 en CI al momento de este documento. Post-merge, F1 y F2 lo complementan desde el lado del server.

---

## 5. Fixes propuestos — ordenados por palanca

### F1 — Promise.all en /proveedor/[id] (ya diagnosticado en perf-navegacion-20261127.md)

**Dónde**: [pages/proveedor/[id].tsx:848-956](../../pages/proveedor/[id].tsx#L848-L956).

**Qué**: tras la query inicial de `proveedores_publicos`, envolver las 4 queries siguientes en `Promise.all` (`servicios_publicados`, `evaluaciones`, `certificaciones`, `contactos` count).

**Ganancia estimada**: de ~1.44 s (mediana warm) a ~0.5 s. Reduce 4 RTT a 1 (el más lento).

**Esfuerzo**: ~15 min + preview smoke. **Riesgo**: bajo. Cero cambio de datos.

### F2 — Promise.all en /servicio/[id]

**Dónde**: [pages/servicio/[id].tsx:85-150](../../pages/servicio/[id].tsx#L85-L150).

**Qué**: tras Q1 (`service`), envolver Q2 (`fetchProveedoresPublicosByIds`), Q3 (`reviews` del servicio) y Q4 (`reviewsGlobalProv`) en un `Promise.all`. Q5 (RPC `buscar_servicios`) queda después del Promise.all (necesita `service.proveedores.comuna` que viene de Q2).

**Ganancia estimada**: de ~1.19 s (mediana warm mía) a ~0.5-0.6 s. Cuatro queries serializadas se colapsan a dos pasos (Q1 → [Q2|Q3|Q4] → Q5).

**Esfuerzo**: ~20 min + preview smoke. **Riesgo**: bajo. Hay que preservar el orden de `logSupabaseError` + el flag `globalRatingUnavailable`.

### F3 — Top-progress bar global (merged/en merge — PR #234)

Ya diagnosticado y entregado por fork en PR `perf-f3-progress`. Cubre el 1-2 s de pantalla idéntica entre clic y pintado destino. Cero dependencia externa.

### F4 — Loading state local en ServiceCard al click (opcional, si queda tiempo FASE 2)

**Dónde**: [components/Explore/ServiceCard.tsx:71](../../components/Explore/ServiceCard.tsx#L71).

**Qué**: en el `onClick`, aplicar clase `opacity-60 pointer-events-none` a la card clicada hasta `routeChangeComplete`. Refuerza F3 en móvil donde el progress top queda tapado por notch / URL bar.

**Ganancia estimada**: UX adicional en móvil. **Riesgo**: bajo.

### F5 — ISR / caché / revalidación (PROPUESTO, congelado hasta ver números post F1-F3)

**Qué**: migrar `/proveedor/[id]` y `/servicio/[id]` de `getServerSideProps` a `getStaticProps` + `revalidate: 60` + `getStaticPaths` con `fallback: 'blocking'`.

**Ganancia estimada**: TTFB ~50-80 ms (edge-cache Vercel). ~15-25x más rápido que estado actual, pero…

**Riesgo**: **cambia frescura de datos** (hasta 60 s de latencia para reflejar edits de perfil / contadores de visitas / nuevas evaluaciones). Puede mitigarse con `revalidatePath` on-demand en endpoints de mutación — amplía scope.

**Estado**: congelado per decisión PO del dispatch 2026-11-27 — evaluar después de ver mediciones post F1-F3.

### F6 — Mover región Vercel (PROPUESTO, no recomendado)

Descartado en § 3. No mejora RTT a DB y rompe pool.

### F7 — Edge Runtime para gSSP (PROPUESTO, requiere GO del PO)

**Qué**: migrar el handler a Edge Runtime (`export const config = { runtime: 'edge' }`). Edge Functions corren más cerca del usuario (POP más próximo) → reduce last-mile en ~100-200 ms para usuarios latam.

**Trade-off**: Edge Runtime tiene limitaciones (no `supabase/supabase-js` full, no `fs`, no `Buffer`). Requiere refactor del fetcher a `fetch()` directo a PostgREST + reescritura del `displayName` server-side. Scope medio.

**Riesgo**: medio. Compatibilidad del SDK + refactor de helpers.

**Ganancia estimada**: -100 a -300 ms last-mile para PO. No ayuda a RTT función ↔ DB (eso lo arreglan F1/F2).

**Estado**: propuesto, GO del PO explícito necesario. No es palanca prioritaria vs F1/F2.

---

## 6. Plan FASE 2 ejecución (orden del PO)

**F3 → F1 → F2 → F4 (si queda tiempo).** Cada paso con medición antes/después.

Metodología: después de cada merge, re-medir con el script `curl`-based + MCP vía `/_next/data/<build>/servicio/<id>.json` sobre las 3 fichas del baseline.

### 6.1 Mediciones post-fix (pendiente)

| Fix | SHA merge | /servicio warm (mediana 5 corridas) | /proveedor warm | Notas |
|---|---|---|---|---|
| (baseline) | e56dcc3 | 1.12-1.30 s | 1.41-1.47 s | — |
| F3 PR #234 | pendiente | sin cambio TTFB | sin cambio TTFB | UX puro |
| F1 (/proveedor) | pendiente | — | esperado ~0.5 s | — |
| F2 (/servicio) | pendiente | esperado ~0.6 s | — | — |

**Meta operacional**: /servicio warm bajo 1 s. Con F1+F2 juntos se estima alcanzable; si no, F5 ISR entra a decidirse con datos reales.

---

## 7. Referencias

- [docs/planes/perf-navegacion-20261127.md](perf-navegacion-20261127.md) — plan global predecesor.
- PR #234 — F3 RouteProgress global (CI en curso al momento de este doc).
- EXPLAIN ANALYZE Q1 — ejecutado via `supabase-prod-ro` MCP: 0.131 ms execution, 0.875 ms planning, buffers hit=267 planning + hit=4 execution.
- CLAUDE.md regla P1.1 — medir en preview antes de mergear cualquier fix de rendimiento.
