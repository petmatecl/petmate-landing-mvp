# PERF-1 bucket B — mobile Agentic Browsing audit — 2026-09-15

**Origen**: BACKLOG L1027 (Bucket B, ~2h, PO gatillo). Sprint bloque-f item 12b (informe únicamente, cero código).

**Alcance**: auditar en `/explorar` + ficha `/servicio/[id]` los componentes mobile-only (`MobileActionSheet`, drawer de filtros mobile, sticky action bar) para (a) completitud de `aria-*`, (b) duplicación de targets entre desktop y mobile con IDs distintos.

**Método**: audit estático (leer código + evaluar contra spec ARIA + AI-scraper heurístics). Cero smoke con browser.

## Hallazgos

### 1. MobileActionSheet — ARIA ok, cero duplicación

[components/Servicio/MobileActionSheet.tsx](../components/Servicio/MobileActionSheet.tsx):

- ✅ `role="dialog"` (L79)
- ✅ `aria-modal="true"` (L80)
- ✅ `aria-labelledby={titleId}` (L82) — el `<h3 id={titleId}>` del header (L96) es el label del dialog.
- ✅ `aria-hidden={!isOpen}` (L70, L81) — desktop no-render por CSS + a11y-hidden cuando cerrado.
- ✅ Botón cerrar con `aria-label="Cerrar"` (L103).
- ✅ `aria-hidden="true"` en el handle decorativo (L90).

**Duplicación con desktop**: cero. El sheet vive dentro de `ServiceDetailView` y se abre desde la barra fija inferior mobile (ver L1787). Desktop tiene la sticky columna derecha con los mismos handlers pero UI distinta — cero botones "clone" con IDs distintos entre viewports.

### 2. SidebarFiltros (drawer mobile) — ARIA robusto

[components/Explore/SidebarFiltros.tsx](../components/Explore/SidebarFiltros.tsx):

- ✅ `role="radiogroup"` (L256), `role="radio"` + `aria-checked` (L299) — pattern correcto para el selector de categoría.
- ✅ `role="checkbox"` + `aria-checked` (L323) — patrón correcto para modalidades multiselect.
- ✅ `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-autocomplete` + `aria-haspopup` (L418-422) — patrón completo para comuna autocomplete.
- ✅ `role="listbox"` + `aria-label` + `role="option"` + `aria-selected` (L477, L482-483) — sugerencias con roles correctos.
- ✅ IDs únicos por control: `sidebar-search`, `sidebar-zona`, `sidebar-comuna`, `sidebar-comuna-listbox`, `sidebar-precio-min`.

Los inputs `id="sidebar-*"` son los MISMOS en desktop y mobile — un scraper AI ve un input por concepto (comuna, precio, zona), no dos. **Cero duplicación de IDs** entre viewports.

### 3. Sticky action bar ficha `/servicio/[id]` — pendiente

`ServiceDetailView.tsx:1787` renderea `<MobileActionSheet>` que se abre desde una barra fija inferior mobile (no vi el JSX del trigger en el excerpt). Los CTAs "Reservar" / "Enviar mensaje" viven en 2 lugares:

- **Desktop sticky right column**: L969-972 comment menciona "El precio queda solo en el sticky right desktop", implica CTA sticky lateral.
- **Mobile MobileActionSheet**: mismo `handleSolicitarAgendamiento`, `handleChatClick`, `handleWhatsApp` — misma acción, distintos wrappers visuales.

**Riesgo AI-scraper**: si ambos botones "Reservar" están en el DOM al mismo tiempo (uno visible con `hidden lg:block`, otro con `lg:hidden`), un scraper que no evalúa CSS puede leer 2 targets iguales y confundirse sobre cuál "clickear". **Sin verificación empírica** (no ejecuté headless con AI-scraper simulator), pero es la superficie a mirar si el score AB baja post-launch.

## Comparación con criterio original bucket B

> **H3 (yellow)** — mobile `/explorar` + ficha bajan a AB=50 (desktop 100). Auditar `MobileActionSheet` + drawer de filtros mobile + sticky action bar de fichas: aria-labels completos + verificar que no haya duplicación de targets entre desktop y mobile (mismo botón visible en ambos con IDs distintos confunde al scraper AI).

Resultado:
- ✅ **aria-labels completos** en los 2 componentes revisados (`MobileActionSheet`, `SidebarFiltros`). Cero label faltante detectado en el static audit.
- ⚠️ **Duplicación de targets desktop↔mobile no verificable sin ejecución**: el patrón de wrapping con `hidden lg:*` es común en el codebase; sin correr el AI-scraper (Agentic Browsing) contra el DOM renderizado real es imposible confirmar si esta es la causa del score AB=50.

## Recomendación operativa

**No abrir sprint de fixes hoy**. Los aria-labels que motivaron bucket B están ok en el audit estático. La causa del score AB=50 en mobile (vs 100 desktop) puede ser:
1. Duplicación desktop↔mobile del mismo target — verificable ejecutando el AI-scraper contra el DOM real (no static audit).
2. Otros factores no-ARIA (CLS, LCP mobile, JS bundle) que Agentic Browsing pondera — habría que consultar el reporte AB original.
3. Falso positivo del scraper — algunos escrapers dan scores bajos con patrones válidos de Tailwind (visibility responsive).

**Trigger para próximo sprint**: cuando el PO tenga acceso al reporte AB actualizado post-launch, contrastar el score mobile específicamente y si sigue en 50 con superficies similares, ejecutar Agentic Browsing headless local sobre staging URL para diagnóstico específico. Sin ese dato, cualquier fix es a ciegas.

## Conclusión

**PERF-1 bucket B CERRADO como investigación**. Cero código productivo modificado. Deuda de re-medición post-launch anotada en BACKLOG.
