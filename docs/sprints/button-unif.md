# Sprint BUTTON-UNIF — Kickoff (Tramo 2, después de AUTH-LINK-PROPIO, antes de SHARE-PROV)

**Fecha kickoff**: 2026-09-24 (aterrizado post decisiones PO sobre informe visual BUTTON-CANON del 21-09).
**Insumo previo**: [`docs/sprints/bloque-j-2-informe-visual.md`](bloque-j-2-informe-visual.md) — 17 botones ad-hoc identificados, 4 migrados en J-2, 13 justificados fuera.
**Modo**: sprint visual dedicado. Ejecución en Tramo 2 (viaje PO 2026-09-29 → 2026-10-27). PRs abiertos sin merge; **merge solo con OK visual del PO sobre PNG antes/después**.

**Principio rector PO**: unificar todo lo que difiera en 1-2 px; quedan fuera solo casos estructurales, con nombre y motivo documentado en `Button.tsx` + este kickoff.

---

## 0. Objetivo de cierre

Al final del sprint, `components/UI/Button.tsx` queda con:
- **4 sizes**: `sm`, `md`, `lg`, `xl` (redefinido).
- **5 variants**: `primary`, `secondary`, `ghost`, `danger`, **`outline`** (nuevo).
- **Cero sizes legacy** (`modal-cta` + `cta-hero` eliminados).
- **Cero justificación de shape ad-hoc** salvo 2 excepciones estructurales.
- Inventario final en el acta: **17 + Reservar SolicitarAgendamientoModal = 18 CTAs** categorizados como migrados o excepciones.

---

## 1. Decisiones del PO (2026-09-24)

### 1.1 Variants: tope 4 → 5

Nuevo variant **`outline`**:
- `bg-white border-2 border-accent-600 text-accent-700 hover:bg-accent-50`
- **Caller único**: `components/Shared/LoginRequiredModal.tsx:107-112` "Registrarme gratis" (#1 del informe visual).
- **No se agregan más variants**. Cualquier CTA que necesite fondo blanco + border accent va a este.

Tabla completa post-sprint:

| Variant | Uso |
|---|---|
| `primary` | Todos los CTAs migrados por default. `bg-accent-600 hover:bg-accent-700 text-white`. |
| `secondary` | CookieBanner "Guardar preferencias" + otros CTAs con fondo blanco + border slate. |
| `ghost` | Reservado nav items sin fondo. Sin uso activo esperado post-sprint. |
| `danger` | DELETE / acciones destructivas. Sin uso activo esperado post-sprint. |
| **`outline`** (nuevo) | LoginRequiredModal "Registrarme gratis" (#1). |

### 1.2 Sizes: 4, sin nuevos

- **`sm`**: `px-3 py-1.5 text-xs` (sin cambio, reservado para chips/filter buttons compactos).
- **`md`**: `px-4 py-2 text-sm` (sin cambio).
- **`lg`**: `px-6 py-2.5 text-sm` (sin cambio).
- **`xl`** (redefinido): `px-6 py-3 text-base` — **absorbe la forma actual de `cta-hero`**. El `xl` anterior (`px-4 py-4`) no tiene callers, se sobrescribe.
- **`cta-hero` eliminado**. Callers migran a `xl`.
- **`modal-cta` eliminado**. Callers migran a `lg`.

### 1.3 Migraciones por caller (tabla del informe visual)

| # | Archivo:línea | CTA | Size destino | Variant destino | Notas |
|---|---|---|---|---|---|
| 1 | `components/Shared/LoginRequiredModal.tsx:107-112` | "Registrarme gratis" | `md` | **`outline`** (nuevo) | Único caller del variant nuevo. |
| 2 | `components/Header.tsx:212` | "Soy proveedor" desktop | `lg` | `primary` | Header aparece en LAS 8 baselines → migración cuidadosa. |
| 3 | `components/Header.tsx:415` | "Soy proveedor" mobile drawer | `lg` | `primary` | Idem. Sin `nav-cta` (rechazado por PO). |
| 4 | `components/Servicio/ExampleCTAModal.tsx:82` | Ejemplo CTA modal | `md` | `primary` | Migra sin cambio de shape material. |
| 5 | `components/Home/SearchBar.tsx:197` | Buscar hero | **EXCEPCIÓN** | — | Fuera del sprint. Documentado en `Button.tsx` + este kickoff como excepción #A. |
| 6 | `components/Shared/EstadoError.tsx:50` | "Reintentar" | `md` | `primary` | `weight="medium"` con `tracking-wide`. **Se acepta el diff de letter-spacing** (decisión PO). |
| 7 | `components/Shared/EmptyState.tsx:33` | CTA empty state | `md` | `primary` | Idem #6, se acepta el diff. |
| 8 | `components/Shared/EmptyState.tsx:40` | Botón secundario empty state | `md` | `secondary` | Idem #6, se acepta el diff. |
| 9 | `components/Admin/ProveedorDetailDrawer.tsx:419` | Contact CTA admin | `md` | `primary` | **Sin shadow** (decisión PO: no se agrega prop shadow al canónico). |
| 10 | `pages/404.tsx:19` | "Ir a explorar" | `lg` | `primary` | Migra de `px-5 py-2.5` a `lg` (`px-6 py-2.5`, diff 1px horizontal). |
| 11 | `components/Explore/CaregiverMap.tsx:136` | Popup mapa "Ver perfil completo" | **EXCEPCIÓN** | — | HTML inyectado via Leaflet `bindPopup`, no JSX. Documentado como excepción #B. |
| 12 | `pages/register.tsx:578` | "Continuar" wizard | `xl` | `primary` | Ancho `w-2/3` vía `className` prop (permitido solo para layout). |
| 13 | `pages/register.tsx:680` | "Finalizar" wizard | `xl` | `primary` | Idem #12. |
| **+1** | `components/Servicio/SolicitarAgendamientoModal.tsx:2029` | "Reservar" F1/F2 (entra al sprint post-J-2) | `xl` | `primary` | **Nuevo alcance** (no estaba en el inventario J-2). Define shape dentro de 4+5. |

**Excepciones documentadas** (permanentes, en `Button.tsx` inline docs + este acta):
- **#A `SearchBar` hero**: responsive `py-3 sm:py-2.5 sm:my-1.5 sm:mr-1.5 px-6 text-sm font-medium`. Shape responsive único; requiere variant responsive o hard-code custom. **Fuera del sprint** — mantener ad-hoc con comentario explicativo en el JSX.
- **#B `CaregiverMap` popup**: HTML injection via Leaflet `bindPopup` — no es JSX. Token CSS de MAP-4 se mantiene. Cero migración posible sin refactor de Leaflet.

### 1.4 Regla nueva del componente `<Button>`

**`className` prop acepta SOLO clases de layout** (ancho, márgenes, flex, grid). **Nunca** colores, padding ni tipografía.

Enforcement:
1. **JSDoc** en `components/UI/Button.tsx` con la regla explícita + ejemplos ✓ y ✗.
2. **Test unitario** que rechace clases `bg-`, `text-`, `px-`, `py-`, `font-`, `tracking-` en el `className` prop. Si es viable con la arquitectura de tests actual, agregar en el mismo PR del componente. Si requiere setup dedicado (ej. dev-time linter React), sprint aparte con nota en el JSDoc "verificación pendiente sprint linter-Button".

Motivación: preservar canonical shape post-sprint. Sin esta regla, la próxima ronda de refactors reintroduce ad-hoc via `className="bg-red-500 px-8"` sobre el `<Button variant="primary" size="lg">`.

---

## 2. Proceso (4 + 1 PRs)

### 2.1 PR 0 — Baselines pendientes

**Alcance**: generar 6 baselines PNG pendientes (proveedor + admin + mis-reservas × desktop/mobile) usando workflow `visual-update-snapshots`. Cobertura obligatoria antes de tocar botones de paneles autenticados.

**Entregable**:
- 6 nuevos PNG en `e2e/specs/visual/paginas-clave.spec.ts-snapshots/`.
- Cero cambio de código productivo.
- PR docs-only + snapshots.

**Estimación**: 0.5-1 día (1 corrida del workflow + review manual de las 6 imágenes por PO).

**Riesgo**: cero — cambio inerte, solo agrega cobertura. Merge con OK PO.

### 2.2 PR 1 — Pantallas públicas (Header + 404 + SearchBar exception doc)

**Alcance**:
- #2, #3 Header "Soy proveedor" desktop + mobile → `<Button size="lg" variant="primary">`.
- #10 404 "Ir a explorar" → `<Button size="lg" variant="primary">`.
- #5 SearchBar: **no migra**, agrega comentario JSX inline que apunta al kickoff excepción #A.
- Redefinir `xl` en `Button.tsx` (`px-6 py-3 text-base`, absorbe `cta-hero`).
- Nuevo variant `outline` en `Button.tsx` (aún sin caller aquí, se prepara para PR 2).
- Regenerar baselines home + explorar + login + ficha-servicio × desktop/mobile (8 PNGs afectados por Header).
- Carpeta `docs/sprints/button-unif/antes-despues/pr-1-publicas/` con los 8 PNG antes/después lado a lado.

**Merge**: OK visual PO sobre los 8 PNG.

**Estimación**: 1-1.5 días.

### 2.3 PR 2 — Modales y estados (LoginRequiredModal + ExampleCTAModal + EstadoError + EmptyState + ProveedorDetailDrawer)

**Alcance**:
- #1 LoginRequiredModal "Registrarme gratis" → `<Button variant="outline" size="md">` (**estreno variant `outline`**).
- #4 ExampleCTAModal → `<Button size="md" variant="primary">`.
- #6, #7, #8 EstadoError + EmptyState → `<Button size="md" variant="primary|secondary" weight="medium">` (acepta diff tracking-wide).
- #9 ProveedorDetailDrawer → `<Button size="md" variant="primary">` (sin shadow).
- Eliminar size `modal-cta` de `Button.tsx` (cero callers post-migration).
- Regenerar baselines de las pantallas que incluyan estos componentes:
  - LoginRequiredModal: se abre en ficha-servicio tras click "Reservar/Evaluar" sin sesión → capturar 2 PNG dedicados (desktop + mobile) con el modal abierto (spec nuevo o helper que dispare el modal).
  - ExampleCTAModal: capturar 2 PNG con modal abierto.
  - EstadoError: capturar 2 PNG (empty state programado o vía fixture que fuerce error state).
  - EmptyState: idem.
  - ProveedorDetailDrawer: capturar 2 PNG (drawer abierto en /admin).
- Carpeta `docs/sprints/button-unif/antes-despues/pr-2-modales-estados/` con los ~10 PNG antes/después.

**Merge**: OK visual PO.

**Estimación**: 2 días (más pesado por los specs de captura de modales/estados).

### 2.4 PR 3 — Paneles autenticados (Reservar de SolicitarAgendamientoModal)

**Alcance**:
- **+1 Reservar** de `SolicitarAgendamientoModal:2029` → `<Button size="xl" variant="primary">`. Alcance ampliado post-J-2 por PO.
- Eliminar size `cta-hero` de `Button.tsx` (cero callers post-migration).
- Regenerar baselines de:
  - `[categoria]/[comuna].tsx` "Ir a explorar" (#5 batch 2 J-2 anterior).
  - Modal SolicitarAgendamientoModal abierto en ficha-servicio (spec nuevo con proveedor auth).
- Carpeta `docs/sprints/button-unif/antes-despues/pr-3-paneles/` con los PNG.

**Merge**: OK visual PO.

**Estimación**: 1 día.

### 2.5 PR 4 — Register wizard

**Alcance**:
- #12, #13 register.tsx "Continuar" + "Finalizar" → `<Button size="xl" variant="primary" className="w-2/3">`.
- Ancho `w-2/3` vía `className` (única clase permitida, layout puro — respeta regla 1.4).
- Regenerar baselines register step 1-N × desktop/mobile (~6-8 PNG según steps).
- Carpeta `docs/sprints/button-unif/antes-despues/pr-4-register/`.

**Merge**: OK visual PO.

**Estimación**: 1 día.

### 2.6 PR 5 (opcional) — Enforcement `className` regla + test unitario

**Alcance**:
- Test unitario que rechace clases prohibidas (`bg-*`, `text-*`, `px-*`, `py-*`, `font-*`, `tracking-*`) en `className`.
- Si la arquitectura de tests actual permite testear el componente en isolación (probable — hay `lib/*.test.ts` con jest/vitest), incluir aquí. Sino, split como sprint separado con nota inline.

**Merge**: CI verde + OK PO.

**Estimación**: 0.5 día si es viable con lo existente.

---

## 3. Estimación total

| PR | Alcance | Días |
|---|---|---:|
| PR 0 | Baselines pendientes (proveedor, admin, mis-reservas) | 0.5-1 |
| PR 1 | Públicas (Header + 404 + SearchBar exception doc + `xl` redef + `outline` def) | 1-1.5 |
| PR 2 | Modales + estados (5 CTAs + eliminar `modal-cta`) | 2 |
| PR 3 | Paneles + Reservar (+1 alcance ampliado) + eliminar `cta-hero` | 1 |
| PR 4 | Register wizard (Continuar + Finalizar) | 1 |
| PR 5 (opcional) | Enforcement `className` test unitario | 0.5 |
| **Total** | | **6-7 días** |

**Ventana Tramo 2**: 2026-09-29 → 2026-10-27 = ~20 días laborales. Sprint entra holgado, con buffer para revisión visual del PO por cada PR.

**Orden dentro del Tramo 2**: post AUTH-LINK-PROPIO (que sí requiere código productivo), antes de SHARE-PROV. Aproximado 2ª mitad de octubre.

---

## 4. Riesgos y mitigaciones

1. **Regenerar baselines** puede introducir cambios visuales no relacionados con botones (fuente cambió, imagen distinta). Mitigación: PO revisa PNG antes/después uno por uno; si aparece diff no relacionado con botón, PR se pausa y se investiga (typography drift, image loading race, etc).
2. **Diff de tracking-wide en EstadoError/EmptyState** (aceptado por PO 2026-09-24) es cambio visual real. Mitigación: documentado en el PR body con justificación explícita + PO ratifica al revisar los PNG.
3. **Baselines de modales/drawers requieren specs de captura** que hoy no existen. Mitigación: PR 0 puede ampliarse a "PR 0 = baselines nuevas de paneles + fixture de captura de modales" para tener todo el setup listo antes de PR 2. Se decide al ejecutar PR 0.
4. **Enforcement `className`** (regla 1.4) puede ser difícil de testear si el componente Button no está fácilmente en jest. Mitigación: PR 5 es opcional; si no viable, se documenta como "verificación pendiente sprint linter-Button" en el JSDoc y se cierra el sprint con las 4-5 primeras PRs.

---

## 5. Cierre esperado

Al mergear PR 4 (o PR 5 si opcional entra), sprint queda con:
- 4 sizes canónicos + 5 variants + 1 nueva regla `className`.
- 15/17 + Reservar (16/18 total) migrados a `<Button>`.
- 2 excepciones estructurales documentadas (`SearchBar` responsive, `CaregiverMap` Leaflet HTML).
- Inventario final en acta con matriz completa.
- Ventana Tramo 2 con buffer holgado para observación pre-lanzamiento.

**Sin código productivo hasta comenzar sprint efectivo en Tramo 2** — este kickoff es solo planificación.
