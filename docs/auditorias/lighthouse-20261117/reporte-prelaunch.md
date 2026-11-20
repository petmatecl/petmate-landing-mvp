# Lighthouse pre-launch · 2026-11-17 revalidación

**Fecha**: 2026-11-17 ~10:18 CLT (martes, día del freeze).
**Método**: `npx lighthouse` 1 run por combo (6 combos). Chrome local headless, prod `https://www.pawnecta.com`.
**UUID de ficha**: `7134e58a-8067-468b-b1d9-633f7bbc6ef8` (Cuidados Post operatorios, cat veterinario, 4 fotos).
**Baseline previa**: [`docs/auditorias/lighthouse-20261112/reporte-post-perf-ficha.md`](../lighthouse-20261112/reporte-post-perf-ficha.md).

---

## Resultados

| Escenario | Perf | LCP | CLS | TBT | FCP |
|---|---:|---:|---:|---:|---:|
| **home-mobile** | **90** | 3.5 s | 0 | 70 ms | 1.1 s |
| **home-desktop** | **100** | 0.8 s | 0 | 0 ms | 0.3 s |
| **explorar-mobile** | **77** | 5.8 s | 0 | 70 ms | 2.0 s |
| **explorar-desktop** | **92** | 1.9 s | 0 | 0 ms | 0.5 s |
| **ficha-mobile** | **71** | 4.4 s | **0.187** | 50 ms | 2.1 s |
| **ficha-desktop** | **85** | 1.8 s | **0.112** | 0 ms | 0.5 s |

## Comparación con baseline 2026-11-12

Importante: el UUID de ficha cambió (el `7134e58a-a15e-4b14-96fe-8c089b47fa04` del baseline ya no responde — 404 en prod hoy). La ficha actual (`-8067-468b-b1d9-633f7bbc6ef8`) es DISTINTA — categoría distinta, cantidad de fotos distinta. **La comparación de ficha NO es apples-to-apples**.

| Escenario | Perf hoy | Perf baseline | Δ | Lectura |
|---|---:|---:|---:|---|
| explorar-mobile | 77 | 77 | = | Estable. LCP mejoró ligero 6.5s→5.8s. |
| explorar-desktop | 92 | 92 | = | Estable idéntico. |
| ficha-mobile | 71 | 89 | **−18** | **Ficha distinta** — no comparable. Flag para diagnóstico. |
| ficha-desktop | 85 | 93 | **−8** | **Ficha distinta** — no comparable. Flag para diagnóstico. |
| home-mobile | 90 | — | n/a | Primer registro. |
| home-desktop | 100 | — | n/a | Primer registro. |

## Observaciones bloqueantes / para evaluar pre-freeze

- **CLS ficha-mobile 0.187** (umbral pobre > 0.1, muy pobre > 0.25) — **requiere diagnóstico del `layout-shifts.subItems.rootCauses`** del JSON para identificar el causante antes de clasificar como bloqueante de lanzamiento. Muy probablemente mismo patrón que `cls-footer` (logo footer sin dimensiones fijas) u otra imagen sin `width/height` en la ficha nueva. **Acción**: 10-15 min de análisis JSON antes del freeze. Fix potencial post-launch si el causante es no-crítico; fix pre-freeze si es trivial y el PO autoriza.
- **CLS ficha-desktop 0.112** (umbral pobre > 0.1 marginal) — mismo logo footer según diagnóstico 2026-11-12. Si `cls-footer` (PR aterrizado) no cerró completamente el issue, requiere re-visitar.
- **LCP explorar-mobile 5.8s** (umbral pobre > 4s) — conocido, ítem `EXPLORAR-MOBILE-LCP` en BACKLOG post-launch. No bloquea.
- **LCP home-mobile 3.5s** (umbral amarillo 2.5-4s) — marginal, estable.
- **LCP ficha-mobile 4.4s** (umbral pobre > 4s) — depende de la ficha específica. La mediana del 2026-11-12 fue 3.4s tras `perf-ficha`. Esta ficha está en rango pobre pero no catastrófico.

## Recomendación

1. **Pre-freeze (ahora, ~15 min)**: diagnosticar el CLS 0.187 de ficha-mobile. Leer `layout-shifts.subItems.rootCauses` del JSON. Si es un fix trivial (dimensión CSS a un elemento), aplicar + medir de nuevo en preview antes de mergear (regla "fix de rendimiento se mide en preview antes del merge").
2. **No bloquea lanzamiento 2026-11-18** si la mediana sobre 2-3 fichas más confirma que el CLS es específico de una ficha con una foto mal dimensionada, no sistémico.
3. **Post-launch**: entrada `FICHA-CLS-SISTEMICO` al BACKLOG si la mediana muestra que sí es sistémico.

## Datos crudos

JSON por combo en el scratchpad de esta sesión. Para reuso post-launch, copiar a `docs/auditorias/lighthouse-20261117/` como artefactos si el PO lo decide.
