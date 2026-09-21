# BUTTON-CANON · Informe visual una-página · sizes y variants en uso

**Fecha**: 2026-09-21.
**Cierre**: sprint J-2 BUTTON-CANON incremental. 4 CTAs migrados a `<Button>` + 13 justificados fuera. Este informe entrega el inventario visual + recomendaciones para que el PO decida la **unificación visual como sprint aparte** (decisión con ojos, no con umbral).

## Estado global

| Métrica | Valor |
|---|---|
| Total botones ad-hoc identificados en `components/` + `pages/` | 17 |
| Migrados a `<Button>` | **4** (2 CookieBanner seed D-3 + 2 batch bloque-j-2-b2) |
| Justificados fuera (requieren decisión sprint visual) | **13** |
| Componentes canónicos (`<Button>`) uso total post-J-2 | 4 |

## Sizes canónicos objetivo (4)

Cada uno con clases `SIZE_CLASSES[size]` en `components/UI/Button.tsx`.

| Size | Clases Tailwind | Callers hoy | Screenshot ref |
|---|---|---|---|
| `sm` | `px-3 py-1.5 text-xs` | Sin uso directo aún (reservado para chips + filter buttons compactos) | — |
| `md` | `px-4 py-2 text-sm` | CookieBanner "Aceptar todas" + "Guardar preferencias" (2, ya migrados D-3) | `e2e/specs/visual/paginas-clave.spec.ts-snapshots/home-desktop-visual-linux.png` (banner fondo blanco al scroll bottom, no visible en primer paint) |
| `lg` | `px-6 py-2.5 text-sm` | Sin uso directo aún (Header CTAs usan "nav-cta" legacy, ver abajo) | — |
| `xl` | `px-4 py-4 text-base` | Sin uso directo aún | — |

## Sizes legacy (2 — a unificar en sprint visual)

Estos absorbieron shapes reales del proyecto para habilitar migración sin diff visual. Doc inline en `Button.tsx` los marca como candidatos a unificación.

| Size | Clases Tailwind | Callers hoy | Screenshot ref | Decisión sugerida sprint visual |
|---|---|---|---|---|
| `modal-cta` | `px-4 py-3 text-sm` | **Migrado**: LoginRequiredModal L61 "Ingresar a mi cuenta". **Legacy pendiente**: `pages/register.tsx` L578+L680 (shape variante con `w-2/3` sin px). | LoginRequiredModal aparece solo tras click en "Reservar" / "Evaluar" sin sesión; NO en las 8 baselines. Register en `pages/register.tsx` tampoco en baselines. Screenshot manual pendiente PO. | Unificar hacia `xl` (más aire, py-4) o mantener `modal-cta` como intermedio permanente si se prefiere densidad. |
| `cta-hero` | `px-6 py-3 text-base` | **Migrado**: `pages/[categoria]/[comuna].tsx` L88 "Ir a explorar" (error path). **Legacy pendiente**: styleguide L393+L515 (docs page, no user-facing). | [categoria]/[comuna] fuera de baselines (SEO landing, dispositivo específico). | Unificar hacia `lg` (perder text-base a text-sm) es agresivo — probablemente queda `cta-hero` shape permanente para CTAs con icono grandes. |

## Variants canónicos (4 — cap PO)

| Variant | Clases Tailwind | Uso |
|---|---|---|
| `primary` | `bg-accent-600 hover:bg-accent-700 text-white` | Todos los CTAs migrados. |
| `secondary` | `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50` | CookieBanner "Guardar preferencias" (seed D-3). |
| `ghost` | `text-slate-700 hover:bg-slate-100` | Sin uso directo aún — reservado nav items. |
| `danger` | `bg-red-600 hover:bg-red-700 text-white` | Sin uso directo aún — reservado DELETE. |

## Botones justificados FUERA (13, requieren decisión sprint visual PO)

Cada uno con motivo estructural. Ordenados por severidad del cambio requerido para migrar:

### Requieren agregar variant nuevo (5º excedería cap PO)

| # | Archivo:línea | CTA | Shape actual | Propuesta unificación |
|---|---|---|---|---|
| 1 | `components/Shared/LoginRequiredModal.tsx:107-112` | "Registrarme gratis" | `bg-white border-2 border-accent-600 text-accent-700 font-medium tracking-wide py-3 px-4 rounded-xl w-full` | Opciones: (i) agregar variant `outlined-accent` (5º, excedería cap 4 → PO decide expandir); (ii) unificar hacia `secondary` (cambio visual — border color slate → accent). |

### Requieren agregar size nuevo (5º-6º excedería cap PO 6)

| # | Archivo:línea | CTA | Shape actual | Propuesta unificación |
|---|---|---|---|---|
| 2-3 | `components/Header.tsx:212, 415` | "Soy proveedor" desktop + mobile drawer | `px-6 py-2 text-sm font-medium tracking-wide rounded-lg + focus:ring` | Nombre sugerido `nav-cta` (`px-6 py-2 text-sm`). O unificar hacia `lg` (py-2 → py-2.5 = 2px diff). Header aparece en LAS 8 baselines → migrar con diff bloquea gate. |
| 4 | `components/Servicio/ExampleCTAModal.tsx:82` | Ejemplo CTA | `px-4 py-2.5 text-sm font-semibold rounded-xl` | Shape `modal-md`. Unificar hacia `md` (py-2.5 → py-2 = 1px) o `modal-cta` (py-2.5 → py-3 = 2px). |
| 5 | `components/Home/SearchBar.tsx:197` | Buscar hero | Responsive: `py-3 sm:py-2.5 sm:my-1.5 sm:mr-1.5 px-6 text-sm font-medium` | Shape responsive único. Difícil unificar — requiere variant responsive o hard-code custom. Screenshot: home baseline lo captura, es el CTA verde del buscador central. |

### Requieren cambio de peso/estilo (diff visual)

| # | Archivo:línea | CTA | Motivo |
|---|---|---|---|
| 6 | `components/Shared/EstadoError.tsx:50` | "Reintentar" banner error | `font-medium` SIN `tracking-wide`. Button `weight="medium"` agrega tracking-wide → letter-spacing diff. |
| 7-8 | `components/Shared/EmptyState.tsx:33, 40` | CTA + botón empty state | Mismo problema tracking-wide. |
| 9 | `components/Admin/ProveedorDetailDrawer.tsx:419` | Contact CTA | `px-4 py-2.5 shadow-sm` — shadow no soportado en Button, agregar prop o unificar sin shadow. |
| 10 | `pages/404.tsx:19` | "Ir a explorar" | `px-5 py-2.5` — `px-5` no en canonical (`lg` = `px-6`, `md` = `px-4`). |

### Fuera del sistema React

| # | Archivo:línea | CTA | Motivo |
|---|---|---|---|
| 11 | `components/Explore/CaregiverMap.tsx:136` | "Ver perfil completo" popup mapa | HTML inyectado via Leaflet `bindPopup`, NO es JSX. Se mantiene el token CSS de MAP-4 per instrucción PO. |

### En pages/register.tsx (justificados por shape `w-2/3` custom)

| # | Archivo:línea | CTA | Motivo |
|---|---|---|---|
| 12 | `pages/register.tsx:578` | "Continuar" step wizard | `w-2/3 py-4 sin px` con `justify-center` + `disabled:opacity-60`. Ningún size fitea (Button `xl` = `px-4 py-4` agregaría px). |
| 13 | `pages/register.tsx:680` | "Finalizar" wizard | Idem #12. |

## Screenshots disponibles

Las 8 baselines efectivas actuales (`e2e/specs/visual/paginas-clave.spec.ts-snapshots/`):

- **home-desktop-visual-linux.png** + **home-mobile-visual-linux.png**: Header CTAs "Soy proveedor" visible + SearchBar buscar verde.
- **explorar-desktop-visual-linux.png** + **explorar-mobile-visual-linux.png**: Header (mismo CTA) + Explorar sin CTAs custom.
- **login-desktop-visual-linux.png** + **login-mobile-visual-linux.png**: Header + form login (sin bg-accent-600 CTA custom).
- **ficha-servicio-desktop-visual-linux.png** + **ficha-servicio-mobile-visual-linux.png**: Header + ficha con CTA "Reservar" (F1/F2 huge — no está en el inventario BUTTON-CANON, aún ad-hoc SolicitarAgendamientoModal L2029).

**Baselines pendientes** (drift dashboard, fixme'd en J-1 → J-4 subitem): proveedor + admin + mis-reservas × 2 vp = 6 PNGs. Contienen los CTAs de paneles autenticados.

**Screenshots NO cubiertos por baselines** (requiere captura manual PO al revisar):
- LoginRequiredModal (modal, se abre tras click).
- ExampleCTAModal (idem).
- EstadoError (banner error state).
- EmptyState (state vacío).
- Admin/ProveedorDetailDrawer (drawer admin).
- Register wizard (`pages/register.tsx`).
- 404 page.
- Categoria/comuna error path.

## Recomendaciones para sprint visual dedicado (PO decide)

1. **Expansion vs preservation**: PO decide si `outlined-accent`, `nav-cta`, `shadow-sm` merecen 5º variant / 7º-8º size, o si los CTAs afectados unifican hacia canonical con cambio visual documentado.
2. **Migration path**: cada decisión de unificación → PR de refactor visual con **regeneración de baselines** (workflow `visual-update-snapshots`) + review manual del PO comparando los PNG antes/después.
3. **`font-medium` sin `tracking-wide`**: patrón común (EstadoError, EmptyState). Opciones: (a) agregar `weight="medium-tight"` (5º weight), (b) unificar hacia `weight="medium"` con tracking-wide aceptando ~2px letter-spacing diff, (c) mantener ad-hoc.
4. **Cero necesidad de agregar todo al canónico**: mantener 4-5 CTAs justificados fuera (ej. `SearchBar` responsive, `CaregiverMap` HTML) es válido — el objetivo BUTTON-CANON no es "todo en Button", es "el patrón común empaquetado + defensa CSS unificada".

## Cierre J-2

- **4/17 botones migrados**: 2 CookieBanner (D-3 seed) + LoginRequiredModal L61 + [categoria]/[comuna] L88 (batch 2).
- **13/17 justificados fuera** con clasificación arriba.
- **Cero sprints incrementales adicionales rentables** sin decisión de expansion vs unificación del PO.
- **Próximo paso**: sprint visual dedicado post-decisión.
