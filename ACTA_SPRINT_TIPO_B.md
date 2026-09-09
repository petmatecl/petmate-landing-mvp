# ACTA SPRINT tipo-b — Cierre 2026-09-09

**Alcance**: los ~35 callers Tipo B de la auditoría de `.error` (vistas que muestran empty state sin aviso ante fallo de red). Objetivo: que ninguna pantalla afirme "no tienes X" cuando lo que pasó es que la consulta falló.

**Duración**: 1 día (2026-09-09 arranque + cierre mismo día).

**Estado**: **CERRADO**. Tag prod: `tipo-b-prod-20260909` sobre SHA `ebd16e4` (Merge PR #12).

## 1. Números finales

| Métrica | Valor |
|---|---|
| Callers Tipo B originales (auditoría) | 29 |
| Callers adyacentes detectados durante review | 3 |
| **Callers Tipo B tocados total** | **32** |
| Callers Tipo B reclassificados a Tipo C (SSR) | 9 → sprint `chore-tipo-b-ssr-audit` |
| PRs abiertos y mergeados | 6 (PR #7 Fase 0 + PR #8-12 Lotes 1-5) |
| Merges autonomos (4 checks verdes) | 6/6 |
| Tests tipo-b nuevos | 27 (14 lote-1 + 4 lote-2 + 5 lote-3 + 4 lote-4 + 0 lote-5) |
| Regresiones a suites previas | 0 |
| Helpers compartidos nuevos | `runReadQuery`, `runCountQuery`, `<EstadoError>`, `<EstadoErrorCompacto>`, `runTipoBSmoke` |

## 2. Roadmap por Fase

| Fase | Alcance | PR | SHA | Fecha merge |
|---|---|---|---|---|
| 0 | Inventario + base compartida (runReadQuery, EstadoError, spec helper) | #7 | (previo al Lote 1) | 2026-09-09 |
| 1 | Dashboard proveedor — useProveedorStats + tabs Servicios/Evaluaciones + CertificacionesSection | #8 | `ae3dbef` | 2026-09-09 |
| 2 | Tutor panel — /favoritos + hallazgo DashboardContent dead-code | #9 | `adece0b` | 2026-09-09 |
| 3 | Fichas — PreguntasSection + ReviewList + ServiceDetailView (6 callers + 1 count) + fix guard mount de ReviewList | #10 | `5220cec` | 2026-09-09 |
| 4 | Admin notificaciones — stats compacto + banner actividad | #11 | `0f2fcd7` | 2026-09-09 |
| 5 | Helpers + context + badges (silent + log Sentry) | #12 | `ebd16e4` | 2026-09-09 |

## 3. Callers cerrados por lote

### Lote 1 — Dashboard proveedor (4 callers)

- `lib/useProveedorStats.ts:47, 114` — 6 métricas del dashboard con banner "No pudimos cargar tus métricas" + `<EstadoErrorCompacto>` "—" en cada stat card.
- `pages/proveedor/index.tsx:450, 457` — tabs Servicios + Evaluaciones con banner "No pudimos cargar tus servicios" / "No pudimos cargar tus evaluaciones" + Reintentar.
- `components/Proveedor/CertificacionesSection.tsx:25` — banner "No pudimos cargar tus certificaciones".

### Lote 2 — Tutor panel (3 callers efectivos + hallazgo)

- `pages/favoritos.tsx:57, 75, 102` — 3 queries encadenadas con banner único "No pudimos cargar tus favoritos" que reemplaza la grilla (header + tabs siguen visibles).
- `components/Client/DashboardContent.tsx:87, 181, 191, 203` — **cerrado como DEAD CODE**: importador único (`pages/usuario.tsx`) tiene redirect 307 en `next.config.js:207-210` `/usuario → /explorar`. Los cambios aterrizaron igual como diseño futuro correcto. Nueva entrada BACKLOG "cleanup pages/usuario.tsx + DashboardContent" pendiente decisión PO.

### Lote 3 — Fichas + explorar (10 callers)

- `components/Service/PreguntasSection.tsx:36` — banner "No pudimos cargar las preguntas" reemplaza SOLO lista Q&A (form de preguntar sigue visible).
- `components/Service/ReviewList.tsx:46` — banner "No pudimos cargar las evaluaciones" reemplaza lista de reviews.
- `components/Service/ReviewList.tsx:64` — hidratación foto silent + log (avatar-inicial fallback).
- `components/Servicio/ServiceDetailView.tsx:186` — deep-link scroll silent + log (cosmético).
- `components/Servicio/ServiceDetailView.tsx:292` — chat lookup con toast fail-close "No pudimos abrir tu chat" (evita conv duplicada).
- `components/Servicio/ServiceDetailView.tsx:307` — count rate limit convs con toast fail-close (evita bypass).
- `components/Servicio/ServiceDetailView.tsx:330, 340` — vinculo agendamiento silent + log (cosmético).
- `components/Servicio/ServiceDetailView.tsx:421, 432` — review gate con toast fail-close "No pudimos verificar tu contacto" (antes: "solo puedes evaluar a proveedores contactados" — mensajero engañoso).
- **Fix estructural agregado**: `ServiceDetailView.tsx:1435` — removí guard `totalReviews > 0 ? <ReviewList /> : null` que impedía a ReviewList exponer su propio error path. Ahora siempre montada.

### Lote 4 — Admin notificaciones (4 callers)

- `pages/admin/notificaciones.tsx:22, 29` — 2 count queries (proveedores pendientes + contactos semana) con `<EstadoErrorCompacto>` "—" por card.
- `pages/admin/notificaciones.tsx:41, 51` — feed actividad (proveedores + usuarios) con banner "No pudimos cargar la actividad reciente".

### Lote 5 — Helpers + context + badges (8 callers, todos silent + log)

- `lib/authService.ts:50, 72` — fetchProfile (2 tablas).
- `lib/profileUtils.ts:19, 28` — getParticipantProfile (2 tablas).
- `lib/hooks/useFavoritos.ts:63` — hidratación isFavorito (decisión PO: corazón inline sin espacio).
- `contexts/UserContext.tsx:749` — refreshProveedorRow (preserva row anterior ante fallo).
- `components/Shared/UnreadBadge.tsx:16, 29` — conversations + messages count (preserva count previo).

## 4. Base compartida entregada (Fase 0 + extensiones)

### `lib/supabaseReadQuery.ts`

- `runReadQuery<T>(query, opts): { data, error }` — envuelve una query Supabase, loguea a Sentry con tags `subsystem`, `table`, `route`, `errorCode` (`'unknown'` si code vacío), devuelve tuple tipado.
- `runCountQuery(query, opts): { count, error }` — variante para `.select('*', { head: true, count: 'exact' })` que retorna `count` fuera de `data`.

### `components/Shared/EstadoError.tsx`

- `<EstadoError titulo sublinea onRetry className>` — banner rojo con título dinámico, sublínea fija "Revisa tu conexión y vuelve a intentar.", botón "Reintentar" que re-ejecuta la query (no F5).
- `<EstadoErrorCompacto tooltip onRetry className>` — variante compacta que renderea `—` con tooltip/aria-label. Para stat cards y contadores.

### `e2e/specs/tipo-b/_helpers.ts`

- `runTipoBSmoke({ route, blockPattern, expectedErrorTitle, expectedPositiveMarker? })` — genera 3 tests estándar (positivo, negativo con `page.route(pattern).abort('failed')`, recuperación con `unroute + Reintentar`).

### CI

- `.github/workflows/e2e-error-audit.yml` — path filters removidos (corre en TODO PR a main). Test command expandido a `e2e/specs/error-audit/ e2e/specs/form-post/ e2e/specs/tipo-b/`.

## 5. Reglas de copy aplicadas

- **Plantilla fija** (banner):
  - Título: "No pudimos cargar {tus/las/los} {cosa en plural, minúsculas}" (o singular si aplica).
  - Sublínea: "Revisa tu conexión y vuelve a intentar." (invariable).
  - Botón: "Reintentar" (invariable).
- **Plantilla fija** (compacto): "—" con tooltip/aria-label "No pudimos cargar este dato. Recarga para reintentar." (default del componente).
- **Toast fail-close** (action gates): "No pudimos {abrir tu chat / verificar tu contacto}. Recarga y vuelve a intentar."
- **Tuteo** en todo el copy visible (sin voseo, sin usted).
- **Nunca afirmar ausencia** cuando hubo error (regla dura del sprint).

## 6. Hallazgos secundarios registrados en BACKLOG

1. **DashboardContent dead code** — par `pages/usuario.tsx` + `components/Client/DashboardContent.tsx` inalcanzable por redirect 307 en `next.config.js:207-210`. Decisión PO pendiente: (i) housekeeping (borrar 2 archivos + redirect), o (ii) levantar el redirect y ejercer la superficie tutor.
2. **ServiceDetailView bug latente** — chat lookup (:292) creaba conv duplicada ante fallo de red; count rate limit (:307) permitía bypass. Ambos corregidos en Lote 3.
3. **Review gate mensajero engañoso** — "Solo puedes evaluar a proveedores contactados" se mostraba cuando el sistema NO verificó (fallo de red); ahora toast dedicado "No pudimos verificar tu contacto".
4. **ReviewList guard mount** — `totalReviews > 0 ? <ReviewList /> : null` en ServiceDetailView impedía exponer error path del fetch client (leía snapshot SSR). Removido en Lote 3.

## 7. Deuda residual (fuera del sprint)

- **9 callers Tipo B reclassificados a Tipo C** (SSR) → sprint `chore-tipo-b-ssr-audit` (BAJA, backlog post-launch): `lib/apiAuth.ts:67`, `pages/index.tsx:705, 760, 789, 802`, `pages/proveedor/[id].tsx:816, 826, 836`, `pages/servicio/[id].tsx:109`.
- **Cleanup dashboard tutor dead code** (ver Hallazgo #1).

## 8. Métricas de ejecución

| Métrica | Valor |
|---|---|
| Tiempo total sprint | 1 día |
| PRs mergeados | 6 (todos autónomos, 4 checks verdes) |
| Build passes locales pre-commit | 6/6 (regla P1) |
| Reruns de CI necesarios | 1 (PR #12 flake cold-preview) |
| Rollbacks | 0 |

## 9. Cierre operativo

- SHA final en `main`: `ebd16e4`.
- Tag prod: `tipo-b-prod-20260909` sobre `ebd16e4`.
- Vercel auto-deploy a prod tras cada merge a main.
- Todas las suites e2e verdes en el último merge.
