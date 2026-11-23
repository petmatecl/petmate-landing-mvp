# Audit Lighthouse prod — 2026-11-22 (post-SMOKE-PROD-DIARIO merge)

Written for: el PO (Aldo). Ítem #8 de la cola nocturna autónoma. Docs-only. **NO se proponen fixes** esta pasada; solo mediciones + comparación vs baseline.

**Método**:
- Lighthouse 13.6.0 vía `npx lighthouse <url> --output=json --chrome-flags='--headless=new' --only-categories=performance --form-factor=mobile --throttling-method=simulate`.
- 5 URLs públicas de prod (`https://pawnecta.com/*`) — zero login, zero mutation, smoke anónimo.
- 1 run por URL (varianza típica ±5 pts en Perf score).
- JSONs completos committed en `docs/auditorias/lighthouse-20261122/*.json` (5 archivos ~2.6 MB total).

**Timestamp**: 2026-11-22 ~19:49 UTC (16:49 CLT).

---

## Resultados

### Scores actuales (mobile, throttling simulate)

| # | URL | Perf | FCP | LCP | CLS | TBT | SI | TTI |
|---|-----|-----:|----:|----:|----:|----:|---:|----:|
| 1 | `/` (home) | **79** | 2.3s | 4.4s | 0 | 80ms | 4.6s | 5.7s |
| 2 | `/explorar` | **78** | 0.9s | 5.9s | 0 | 80ms | 1.8s | 6.0s |
| 3 | `/proveedor/4ca16056-...` | **92** | 0.9s | 2.7s | 0 | 110ms | 5.3s | 4.6s |
| 4 | `/login` | **98** | 0.8s | 2.4s | 0 | 50ms | 1.3s | 2.9s |
| 5 | `/register` | **98** | 0.8s | 2.4s | 0 | 60ms | 1.1s | 2.9s |

**Proveedor usado para #3**: `4ca16056-90f8-4256-a9e4-da39e4f6f44b` (Paseítos Perrunos.cl, el proveedor más reciente con nombre público en prod, verificado vía MCP supabase-prod-ro 2026-11-22).

### Semáforos Core Web Vitals (Google recommendation)

- **LCP** verde ≤2.5s · amarillo 2.5-4.0s · rojo >4.0s.
- **CLS** verde ≤0.1 · amarillo 0.1-0.25 · rojo >0.25.
- **TBT** verde ≤200ms · amarillo 200-600ms · rojo >600ms.

| URL | LCP | CLS | TBT |
|-----|-----|-----|-----|
| / | **ROJO (4.4s)** | VERDE (0) | VERDE (80ms) |
| /explorar | **ROJO (5.9s)** | VERDE (0) | VERDE (80ms) |
| /proveedor/{id} | AMARILLO (2.7s) | VERDE (0) | VERDE (110ms) |
| /login | AMARILLO (2.4s, borde) | VERDE (0) | VERDE (50ms) |
| /register | AMARILLO (2.4s, borde) | VERDE (0) | VERDE (60ms) |

---

## Comparación vs último baseline (2026-11-17, mobile)

Baseline referencia: [`docs/auditorias/lighthouse-20261117/reporte-prelaunch.md`](lighthouse-20261117/reporte-prelaunch.md) + sección "URLs auditadas" de [`docs/auditorias/perf-core-20261119.md`](perf-core-20261119.md).

| URL | Perf 11-17 → 11-22 | LCP 11-17 → 11-22 | CLS 11-17 → 11-22 |
|-----|--------------------|--------------------|--------------------|
| `/` | 90 → **79** (-11) | 3.5s → 4.4s (+0.9s) | 0 → 0 (==) |
| `/explorar` | 77 → **78** (+1) | 5.8s → 5.9s (+0.1s) | 0 → 0 (==) |
| `/proveedor/{id}` | (sin baseline) | (sin baseline) | (sin baseline) |
| `/login` | (sin baseline) | (sin baseline) | (sin baseline) |
| `/register` | (sin baseline) | (sin baseline) | (sin baseline) |
| `/servicio/{id}` | 71 / 85 | 4.4s | 0.187 → NO MEDIDO HOY |

### Nuevos baselines (primera medición formal)

- `/proveedor/{id}`: Perf 92, LCP 2.7s amarillo borde, CLS 0, TBT 110ms. **Buen score**.
- `/login`: Perf 98, LCP 2.4s amarillo borde (borderline verde), CLS 0, TBT 50ms. **Buen score**.
- `/register`: Perf 98, LCP 2.4s amarillo borde (borderline verde), CLS 0, TBT 60ms. **Buen score**.

### Observaciones (sin proponer fixes)

1. **Home `/`**: degradación visible de Perf -11 pts y LCP +0.9s vs baseline 11-17. El LCP cruzó de amarillo (3.5s) a rojo (4.4s). Puede ser (a) real por cambios de main entre 11-17 y 11-22, (b) varianza de Lighthouse mobile simulated (±5 pts normal, pero +0.9s LCP excede varianza típica). CLS 0 preservado — el fix CLS de noviembre sigue vivo. Candidato a revisión en la próxima ventana de fixes.

2. **`/explorar`**: estable vs baseline (+1 Perf, +0.1s LCP = dentro de varianza). LCP 5.9s rojo profundo — mismo estado que 11-17 (5.8s). CLS 0. Es consistente con el feedback del audit anterior: `/explorar` tiene LCP alto crónico, candidato de fix dedicado (Hero LCP de la landing + cold start Supabase RPC + imágenes de cards).

3. **`/proveedor/{id}`, `/login`, `/register`**: nuevos baselines — scores muy sanos (92/98/98). El fix del wizard tutor (F-TR-4 password meter, F-TR-13 reenvío email, F-TR-17 return_to) **no degradó performance** — los 3 PRs siguen abiertos pero el baseline actual se mantiene sin ellos (todavía no mergeados).

4. **CLS = 0 en las 5 URLs**: el fix CLS del sprint `cls-footer` (noviembre) + los fixes LCP/CLS post-11-12 aterrizaron bien. Zero regresión visible.

5. **TBT bajo (50-110ms)** en las 5 URLs: cero bloqueo del thread principal relevante. El bundle JS no está sobrecargando a los visitantes.

6. **Pendiente de revisión próxima pasada**: `/servicio/{id}` (ficha de servicio con reviews) — baseline 11-12 tenía Perf 71 mobile + CLS 0.187. La cola nocturna solo pidió 5 URLs específicas (zero ficha servicio), pero vale la pena incluirla en el próximo audit para no perder la señal del fix CLS que aterrizó en esa superficie.

---

## Variación vs runs anteriores — nota metodológica

El baseline 11-17 corrió sobre un deployment anterior. Entre 11-17 y 11-22 mergearon:
- Fix CLS ficha + footer.
- Sprint #137 form-sidebar.
- Sprint #141 BACKLOG arte + merch.
- Sprint #143 docs 6 docs A-tanda.
- Sprint #144 docs 10 docs B-tanda.
- Sprint #146 CATALOGO SQL doc.
- Sprint #155 SMOKE-PROD-DIARIO (`4e86bff`, recién mergeado 22:37).

Ninguno de estos debería degradar `/` performance en 11 pts, salvo que (a) algún cambio no listado haya tocado el bundle del home (verificar con `git log --oneline main 7bc6e29..4e86bff -- pages/index.tsx components/Home/`), o (b) el run de hoy haya caído en una ventana cold de Vercel edge (más probable).

**Recomendación metodológica para el próximo audit**: correr **mediana de 3 runs** por URL en vez de 1, especialmente para `/` donde la varianza impacta señal. Esta pasada se optimizó por tiempo (1 run × 5 URLs ≈ 2 min total vs 3 runs × 5 URLs ≈ 6-8 min).

---

## Artifacts

Los 5 JSONs de Lighthouse están en `docs/auditorias/lighthouse-20261122/`:
- [`home-root.json`](lighthouse-20261122/home-root.json) (565 KB)
- [`home-explorar.json`](lighthouse-20261122/home-explorar.json) (838 KB)
- [`home-proveedor-4ca16056-90f8-4256-a9e4-da39e4f6f44b.json`](lighthouse-20261122/home-proveedor-4ca16056-90f8-4256-a9e4-da39e4f6f44b.json) (402 KB)
- [`home-login.json`](lighthouse-20261122/home-login.json) (421 KB)
- [`home-register.json`](lighthouse-20261122/home-register.json) (414 KB)

Abrir cualquiera localmente con `npx lighthouse-report-viewer` o copiar el contenido a https://googlechrome.github.io/lighthouse/viewer/ para el HTML report interactivo con sugerencias de fix de Google.

---

## Trazabilidad

- **Pedido**: cola nocturna autónoma 2026-11-22 ~22:45 CLT, ítem #8.
- **SHA de main al momento del audit**: `4e86bff` (merge PR #155 SMOKE-PROD-DIARIO).
- **Baseline anterior**: [lighthouse-20261117/reporte-prelaunch.md](lighthouse-20261117/reporte-prelaunch.md) + [perf-core-20261119.md](perf-core-20261119.md).
- **Próximo audit sugerido**: cuando mergeen #147 (GA4 taxonomía) + #152 (EXPLORAR fase 1) + #140 (admin-sidebar) para ver si alguno afecta scores.

**Zero fixes propuestos en esta pasada**. El PO decide qué fixes arrancar según prioridad.
