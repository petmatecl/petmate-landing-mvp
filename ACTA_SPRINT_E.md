# ACTA — Sprint prelaunch · Bloque E UX

**Fecha ejecución**: 2026-09-15
**Rama madre**: `main`
**Tag prod**: `ux-e-prod-20260915`
**Alcance**: 5 PRs de UX (E-1 hasta E-5) + PR de conciliación entre bloques D y E.

---

## 1. PRs mergeados

| PR | Rama | Merge SHA | Título |
|---|---|---|---|
| **#37** | `conciliacion-post-d` | `fe693e8` | Conciliación post-cadena D→E: cerrar F2-3-FLAKINESS + MIS-RESERVAS-STALL |
| **#36** (pre-bloque) | `e-ux` | `9c8ab6f` | E-1 UX: UBI-PROV-LEG + DUP-CAMPOS-CATEGORIA (mergeada en cadena anterior) |
| **#38** | `e-explorar-ctas` | `8084e5f` | E-2 explorar+CTAs: UX-1 + UX-2 + UX-3 + EMPTY-STATES |
| **#39** | `e-header-a11y` | `f331543` | E-3 header+a11y: UX-6 + a11y-3 + M-ADMIN-1..4 |
| **#40** | `e-mapa` | `1bffa88` | E-4 mapa: MAP-BURBUJAS clustering + MAP-FICHA condicional |
| **#41** | `e-notif-toasts` | `276cb06` | E-5 notif+toasts: TOASTS-HOMOL + F2-NOTIF-0000 + NOTIF-CONTRASTE + AV-TUTOR-TRIGGER + ICON-STETHO |

Todos con `npm run build` exit 0, spec estructural de regresión, workflow CI actualizado, BACKLOG tocado en el mismo PR (regla P5).

---

## 2. Items cerrados (14 total)

### Conciliación (2)
- **F2-3-FLAKINESS** — CERRADO mitigado por estab-e2e, sin reincidencia en 4 PRs post-mitigación. Trigger de reapertura: 2 fallos en 7 días.
- **MIS-RESERVAS-STALL** — CERRADO por igual criterio.

### E-1 (2)
- **UBI-PROV-LEG** — Comuna + Región bajo título en `/proveedor/[id]`.
- **DUP-CAMPOS-CATEGORIA** — Removido texto libre `comunas_cobertura` de veterinario + traslado. Migración `detalles.comunas_cobertura` → `detalles.notas` con prefijo "Cobertura declarada: ...".

### E-2 (4)
- **UX-1** — Filler cards cap 2 + condición `services.length < 3`.
- **EMPTY-STATES** — Copy explicativo "Aún hay pocos proveedores en esta categoría..." bundled con UX-1.
- **UX-2** — CTA registro proveedor solo en Header + Footer. Removidos 3 CTAs de `pages/explorar.tsx` + `ServicePlaceholderCard` refactorizado de `<Link>` CTA → `<div>` informacional.
- **UX-3** — Copy `ExampleCTAModal` "con un proveedor" → "a un proveedor real, regístrate".

### E-3 (3, agrupados en 3 líneas)
- **UX-6** — Chip Header con pill de rol activo (visible cuando cuenta tiene ≥2 roles). `adminNav` agregado al menú personal. `rolActivo` derivado del pathname.
- **a11y-3** — Sidebar proveedor (desktop + mobile) con `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls` + `tabIndex` (roving).
- **M-ADMIN-1..4** — 4 modales de `pages/admin/proveedores.tsx` migrados a `useModalDialog` (Escape + focus trap + return focus + blockClose:actionLoading).

### E-4 (2)
- **MAP-BURBUJAS** — Clustering imperativo con `leaflet.markercluster` (base lib) + `useMap()`. **Descartado** el wrapper `react-leaflet-cluster` por peer dep conflict con react-leaflet 4 (intento con `.npmrc legacy-peer-deps=true` fue revertido por PO — cambia comportamiento global de npm). Componente hijo `ClusteredPriceMarkers` gestiona `L.markerClusterGroup` en useEffect. Popup migrado de JSX → HTML string vía `marker.bindPopup(...)`.
- **MAP-FICHA** — `<LocationMap>` en `/servicio/[id]` SOLO cuando `service.detalles.modalidad.includes('casa_cuidador')` + lat + lng.

### E-5 (5)
- **TOASTS-HOMOL** — Ratificado (Toaster usa tokens Pawnecta desde Ola 2 B4, cero `richColors` activo). Spec de regresión.
- **F2-NOTIF-0000** — `formatFechaRelativa` acepta `sinHora?: boolean`. `NotificationBell` detecta F2 con heurística `duracion_min == null && fecha_fin != null`.
- **NOTIF-CONTRASTE** — No-leídas con `border-l-2 border-accent-500`. Leídas con `border-l-2 border-transparent` (cero shift).
- **AV-TUTOR-TRIGGER** — Opción A: eliminado label + input clickeable en `ClientLayout`. `handlePhotoUpload` preservado con `void` para reactivación futura.
- **ICON-STETHO** — Ya eliminado por c-higiene ICO-HUER (2026-09-15). Actualizado comentario del preset etologia.

---

## 3. SQL prod pendiente

- **Bloque E-1 DUP-CAMPOS-CATEGORIA**: 1 fila esperada — servicio `2713b823-6439-49d7-ab03-fe748bda2454` traslado con `detalles.comunas_cobertura = "Todo Santiago"` (verificado 2026-09-15 vía MCP prod-ro). SQL canónico en [SQL_PROD_PENDIENTE_PRELAUNCH.md](SQL_PROD_PENDIENTE_PRELAUNCH.md) con SELECT previo + UPDATE + assertion `DO $$` + SELECT posterior. Aldo ejecuta manualmente.

Cero SQL adicional. E-2, E-3, E-4, E-5 son code-only.

---

## 4. Deuda técnica agregada al BACKLOG en este sprint

- **Fotografía vs Retratos** — decisión diferida hasta 1-2 semanas post-launch con datos GA4 de `ficha_vista`.
- **Custom SMTP staging → Mailtrap sandbox** — Opción (a) votada por auditor. Requiere config Dashboard.
- **`horario` texto libre en `guarderia`** — DUP análogo pero sin alternativa estructurada (F3 pendiente). Diferido hasta que F3 aterrice.
- **BUTTON-CANON restante** — ~18 CTAs pendientes de migrar al `<Button>` compartido; se migran sprint a sprint cuando se toca el archivo (deuda light no bloqueante).
- **Resend hola→Pawnecta + subject "Recibimos tu solicitud"** — pendiente config Dashboard Supabase (5 min, Aldo).

---

## 5. Verificaciones globales

- **Build local** exit 0 en los 5 PRs. Cero warnings nuevos vs. baseline.
- **CI**: los 5 PRs pasaron typecheck + Playwright suite error-audit + Playwright suite F2. Serialización cross-PR vía concurrency group `e-staging`.
- **BACKLOG.md**: 14 entradas cerradas, 5 nuevas de deuda diferida.
- **Cero rojo de check no infra**. Cero `--legacy-peer-deps` global. Cero mocks nuevos.

---

## 6. Cierre

Tag anotado: **`ux-e-prod-20260915`** apuntando al último merge (`276cb06`, PR #41).

Foto lanzamiento final (estado consolidado al momento del tag):

- **Prod tip**: `276cb06` (PR #41 merge).
- **PRs bloque E**: 6 mergeados (E-1 pre-bloque en la cadena anterior + conciliación + E-2 + E-3 + E-4 + E-5).
- **BACKLOG top**: 14 items nuevos cerrados en las últimas 24 horas.
- **SQL prod pendiente**: 1 UPDATE + 1 SELECT verificación (DUP-CAMPOS-CATEGORIA).

Chain prelaunch cerrada.
