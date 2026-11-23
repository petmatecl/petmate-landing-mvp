# Lighthouse follow-ups — hallazgos accionables del reporte 2026-11-22

Written for: el PO (Aldo). **Propuesta de ítems backlog**, NO implementación. Zero fix pushed sin GO explícito. Fuente: [`docs/auditorias/lighthouse-20261122.md`](../auditorias/lighthouse-20261122.md) (audit mobile throttling simulate, 5 URLs públicas prod).

**Resumen del audit** (verde = Google recommendation OK, rojo = fix dedicado):
- `/` (home): Perf 79, LCP 4.4s **ROJO**, CLS 0, TBT 80ms. Regresión -11 pts vs baseline 11-17.
- `/explorar`: Perf 78, LCP 5.9s **ROJO**, CLS 0, TBT 80ms. Estable vs 11-17 (+0.1s).
- `/proveedor/{id}`: Perf 92, LCP 2.7s amarillo, CLS 0, TBT 110ms. Baseline nuevo.
- `/login`: Perf 98, LCP 2.4s amarillo borde, CLS 0, TBT 50ms. Baseline nuevo.
- `/register`: Perf 98, LCP 2.4s amarillo borde, CLS 0, TBT 60ms. Baseline nuevo.

---

## Candidato A — PERF-HOME-LCP-REGRESION

**Prioridad**: media-alta (regresión reciente de -11 pts + LCP 4.4s cruzó de amarillo a rojo).

**Problema**: la home perdió Perf de 90 → 79 entre 2026-11-17 y 2026-11-22, con LCP +0.9s. El fix CLS pre-launch quedó bien (CLS 0 mantenido), pero algo bajó Perf considerablemente.

**Primera hipótesis**: cambios de main entre 11-17 y 11-22 agregaron peso al bundle de home o al LCP element. Candidatos:
- Nuevo widget/sección en el home que empuja el LCP element.
- Imagen hero sin optimización reciente (verificar `width` / `height` explícito + `priority` de `next/image`).
- Scripts analytics/Sentry más pesados post-merge SMOKE-PROD/#167/otros.

**Alcance propuesto**:
1. Audit diff: `git log main --since="2026-11-17" --until="2026-11-22" -- pages/index.tsx components/Home/` para el delta de superficie home.
2. Lighthouse diagnostic sobre preview @ 11-17 (SHA baseline) vs prod @ 11-22 para aislar la regresión al commit exacto.
3. Fix según hallazgo: optimización del hero image, reducción de JS bundle de home, lazy load de widgets secundarios.

**Esfuerzo estimado**: 2-3h diagnóstico + 1-2h fix (según hallazgo). Sprint propio.

**Dependencias**: ninguna. Standalone.

**Trigger**: la regresión +0.9s LCP afecta engagement del landing. Si sube a +1.5s, el home cae de CWV OK a NEEDS IMPROVEMENT en Search Console (impacta SEO ranking).

---

## Candidato B — PERF-EXPLORAR-LCP-CRONICO

**Prioridad**: alta (LCP 5.9s rojo profundo, estado crónico detectado también 11-17).

**Problema**: `/explorar` tiene LCP 5.9s crónico — rojo profundo, muy por sobre el amarillo 4.0s. Stable entre 11-17 y 11-22 (+0.1s, dentro de varianza). No es regresión reciente, es deuda acumulada.

**Primera hipótesis**:
- **Cold start Supabase RPC** `buscar_servicios` sobre el primer fetch del catálogo. Si el RPC toma >1s en fríos, se suma al TTFB + render del LCP element.
- **Imágenes de cards**: cada servicio carga su foto desde Supabase Storage con URL `/storage/v1/object/public/...` sin optimización `next/image`. Con 10+ cards visibles en el fold, si el LCP element es una card, el delay de las imágenes domina.
- **Hero LCP element**: si el encabezado "Explorar servicios" es el LCP element y llega tarde por hidratación.

**Alcance propuesto**:
1. Determinar LCP element real vía Chrome DevTools Performance Insights (puede ser hero, primera card, o input de búsqueda).
2. Fix según hallazgo:
   - Si cold start RPC: preload del primer page de resultados via `getServerSideProps` → ya se tiene data en SSR → LCP mejora.
   - Si imágenes cards: migrar a `next/image` con `priority` para las primeras 3-4 visibles en fold.
   - Si Hero: optimizar la fuente/font-display para que el texto de hero llegue antes.

**Esfuerzo estimado**: 3-5h diagnóstico + 1-2 días fix (según camino). Sprint propio de mayor peso.

**Dependencias**: puede necesitar revisión de RLS de `servicios_publicados` si el fix implica SSR con service_role (riesgo de leak PII — coordinar con el ítem abierto PII-VIEW-TIGHT del sábado).

**Trigger**: `/explorar` es la segunda página más visitada post-home. LCP 5.9s es fricción directa a la conversión de "ver servicios" → "contactar proveedor". Alto ROI.

---

## Candidato C — PERF-SERVICIO-FICHA-AUDIT-PENDIENTE

**Prioridad**: media.

**Problema**: la ficha `/servicio/{id}` no fue auditada en el run 11-22 (la cola nocturna pidió 5 URLs específicas). Baseline previo 11-12: Perf 71 mobile + CLS 0.187. El fix CLS del sprint `cls-footer` + PERF-2 pre-launch aterrizó en esa superficie — hay que verificar empírico.

**Primera hipótesis**: el fix CLS 0.187 → 0 aterrizó bien (basado en patrón de los demás URLs). Perf 71 puede haber mejorado también por efectos laterales del wrap-up pre-launch.

**Alcance propuesto**:
1. Agregar `/servicio/{id}` al próximo audit Lighthouse (siguiente ventana — ej. post-primera-campaña).
2. Comparar Perf + CLS + LCP vs baseline 11-12.
3. Decidir si amerita fix dedicado tras resultado.

**Esfuerzo estimado**: 15 min audit + decisión post-resultado.

**Dependencias**: ninguna. Agregar al próximo cron de audit regular o ejecutar manualmente en la próxima pasada de PERF-* dedicada.

**Trigger**: la ficha es la tercera superficie más visitada y el único leak CLS de pre-launch. Verificar empírico cierra la deuda.

---

## Candidato D — PERF-LOGIN-REGISTER-LCP-BORDE

**Prioridad**: BAJA (opcional).

**Problema**: `/login` y `/register` tienen LCP 2.4s — amarillo borde (verde Google CWV = ≤2.5s). Están "justo" dentro del amarillo. Varianza de ±0.2s puede empujarlos a rojo ocasional.

**Primera hipótesis**:
- SSG de ambas páginas renderiza el form rápido pero el font de Google (`Inter` u otro) es LCP element con `font-display: swap` + delay de Google Fonts.
- Bundle JS de validación / supabase client.

**Alcance propuesto**:
1. Determinar LCP element con Performance Insights.
2. Si es el font: `font-display: optional` o preload explícito del font (`<link rel="preload">`).
3. Si es un elemento visible: optimizar su render inicial.

**Esfuerzo estimado**: 2-3h (diagnóstico + fix cosmético).

**Dependencias**: ninguna.

**Trigger**: NO urgente. Las dos páginas están en score 98 Perf — excelente. Fix solo si campañas pagas requieren máximo CWV verde para landing paga.

---

## Priorización recomendada

| # | Candidato | Prioridad | Esfuerzo | ROI estimado |
|---|-----------|-----------|----------|--------------|
| 1 | B — `/explorar` LCP crónico | ALTA | 3-5h diag + 1-2d fix | Alta conversión funnel tutor |
| 2 | A — `/` home LCP regresión | MEDIA-ALTA | 2-3h diag + 1-2h fix | Protege ranking SEO del landing |
| 3 | C — `/servicio/{id}` audit pendiente | MEDIA | 15 min | Cierra deuda monitoreo |
| 4 | D — `/login` `/register` LCP borde | BAJA | 2-3h | Opcional pre-campañas pagas |

---

## Procedimiento sugerido

**Si el PO autoriza**: arrancar por B (`/explorar`) en un sprint propio post-campañas o cuando haya ventana ≥1 día disponible. A puede meterse en una sprint chica standalone. C es 15 min de ejecutar el audit manualmente — puede sumarse al próximo cron SMOKE-PROD-DIARIO o ejecutarse ad-hoc.

**Si el PO no responde**: los 4 candidatos quedan como ítems BACKLOG sin fecha, preservando los números medidos como baseline para comparación futura.

**Metodología para cada candidato**: aplicar P8 10ª (medir contra positivo conocido) — baseline pre-fix vs post-fix con >=3 runs por URL para controlar varianza ±5 pts típica de Lighthouse mobile simulated.

---

## Trazabilidad

- Audit fuente: [`docs/auditorias/lighthouse-20261122.md`](../auditorias/lighthouse-20261122.md) (PR #160 merge commit `9a0032e`).
- JSON raws: `docs/auditorias/lighthouse-20261122/*.json` (5 archivos).
- Baseline previo: `docs/auditorias/lighthouse-20261117/reporte-prelaunch.md` + `docs/auditorias/perf-core-20261119.md`.

Zero implementación hecha. Zero PR abierto. Documento local, no commiteado hasta GO del PO en el chat.
