# ACTA ZB2 — Sprint ZONAB-1 (rama `zonab-1`)

**Sub-entregable**: ZB2 — Batch a11y + visual.
**Rama**: `zonab-1` (forkeada de `staging` @ `55489fe`, incluye N15).
**SHA final**: `4dcf176`.
**Cadena**: `bea9fff (acta ZB1) → 4dcf176 (código+spec ZB2)`.
**Fecha ejecución**: 2026-07-31.
**Estado**: **CERRADO**. Suite full 46/46 verde en 45s, cero flaky, cero regresión.

---

## 1. Alcance

Barrido de 6 dimensiones a11y + visual identificadas por scan Explore inicial. Cero implementación de features nuevas; solo mejoras semánticas y de contraste sobre la superficie existente.

## 2. Aplicación por dimensión

### Dim 1 — `aria-live` en errores de forms (14 casos)

Wrapping del texto de error con `role="alert" + aria-live="polite"` (o `assertive` para el error de submit del wizard de register, más crítico).

| File | Casos |
|---|---|
| `pages/admin.tsx` | Login admin (loginError) |
| `pages/register.tsx` | Error submit wizard (assertive) + passwordError + passwordConfirmError |
| `pages/usuario/mascotas/index.tsx` | errorMsg del form crear/editar |
| `pages/proveedor/index.tsx` | rutInputError verificación identidad |
| `components/Proveedor/ServiceFormModal.tsx` | minNochesError + maxNochesError + rowError blackouts |
| `components/Service/ReviewForm.tsx` | errorMsg submit review |
| `components/Servicio/SolicitarAgendamientoModal.tsx` | pickerEstError + rangoEstError + pickerError + errorMsg (4 casos) |

### Dim 2 — `htmlFor` + id matcheado (11 casos directos)

| File | Label → control |
|---|---|
| `pages/explorar.tsx` | Ordenar por → `explorar-orden` |
| `pages/register.tsx` | Categoría → `register-categoria`, Cuéntanos → `register-descripcion` |
| `pages/admin/evaluaciones.tsx` | Motivo rechazo → `admin-evaluaciones-motivo` |
| `pages/admin/proveedores.tsx` | Motivo rechazo → `admin-proveedores-motivo` |
| `components/Admin/ProveedorApprovalList.tsx` | Motivo (solicitud + verif) → `approval-motivo-*` |
| `components/Admin/ProveedorManagementList.tsx` | Motivo suspensión → `mgmt-suspension-motivo` |
| `components/Proveedor/ServiceFormModal.tsx` | Categoría → `servicio-categoria`, Unidad → `servicio-unidad` |

**Deuda light**: 5 grouping labels (Elige noches, Elige horario, Cómo quieres, Cuánto dura, disponibilidad grid) requieren refactor a `<fieldset>/<legend>` o `aria-describedby` — no aplicable con `htmlFor` sobre chip-group. Anotado.

### Dim 3 — Semántica ARIA en chip groups

**13 contenedores single-select** (`role="radiogroup"` + `role="radio"` + `aria-checked`):
- `pages/explorar.tsx`: toggle Lista/Mapa.
- `pages/admin/servicios.tsx`: filtro estado (todos/activos/inactivos).
- `pages/admin/evaluaciones.tsx`: filtro estado (4 valores).
- `pages/admin/proveedores.tsx`: filtro estado (6 valores).
- `pages/register.tsx`: selector rol (usuario/proveedor) + tipoEntidad (persona_natural/empresa).
- `pages/proveedor/index.tsx`: selector tipoEntidad en dashboard.
- `components/Servicio/SolicitarAgendamientoModal.tsx`: chip modalidad, toggle noches/horas, strip 7 días, grid slots.

**2 nav-tabs** migrados a `role="tablist"` + `role="tab"` + `aria-selected` (no radio — navegación, no selección de estado):
- `pages/admin.tsx`: sidebar + mobile tabs.
- `components/Admin/ProveedorApprovalList.tsx`: TabButton incorporación/verificaciones.

**3 multi-select** (`aria-pressed`):
- `pages/proveedor/index.tsx`: idiomas.
- `components/Proveedor/ServiceFormModal.tsx`: mascotas aceptadas + chip multi-select dinámico por campo.

### Dim 4 — Contraste `text-slate-400` → `text-slate-500`

**~25 casos alta prioridad aplicados** — hints en párrafos + counters + CTAs:
- `components/Proveedor/ServiceFormModal.tsx`: 19 hints agenda (`text-xs text-slate-400 mt-1`, `mt-1.5 leading-relaxed`, `mt-3 leading-relaxed`).
- `components/Servicio/SolicitarAgendamientoModal.tsx`: 4 counters + hints.
- `pages/register.tsx`: counter descripción + texto legal wizard.
- `pages/index.tsx`: 2 hints CTAs hero + card stats.
- `pages/explorar.tsx`: hint email captura.
- `pages/usuario/mascotas/index.tsx`: hint upload + counters descripción + enfermedades.
- `pages/proveedor/index.tsx`: hints `[11px]` privados/públicos + JPG/PNG + counter política + subtitle.
- `components/Home/SearchBar.tsx`: hint rotante ROTATING_HINTS.

**Deuda light explícita**:
- ~30 section headers `text-xs font-medium text-slate-400 uppercase tracking-widest` → decorativos con letter-spacing + font-medium + all-caps + tamaño mínimo. Bumping a slate-500 rompe la jerarquía visual y el patrón está aceptado en design systems. Deuda si un audit A11y externo lo marca.
- ~6 casos footer/legal → texto de bajo interés, decorativo.

### Dim 5 — `h-8` → `h-10` en inputs táctiles (11 casos)

Todos en `components/Proveedor/ServiceFormModal.tsx` (editor de franjas + excepciones + blackouts estadía). Replace controlado `h-8 px-2` → `h-10 px-3` para conservar padding proporcional. Target táctil pasa de 32px a 40px (más cerca del sweet spot 44px WCAG AAA sin comprometer densidad del layout).

### Dim 6 — DayPicker responsive (1 caso)

`components/Servicio/SolicitarAgendamientoModal.tsx`: hook `matchMedia('(min-width: 640px)')` inline. 2 meses en desktop, 1 en mobile. El fetch ya venía preparado para 2 meses (comentario L292 mencionaba la intención pendiente). Cleanup del listener en `useEffect` cleanup.

## 3. Spec smoke ZB2

`e2e/specs/zonab-1/s11-a11y-batch.spec.ts` — 4 tests:
1. **Dim 3**: toggle Lista/Mapa en `/explorar` con `role="radiogroup"` + click alterna `aria-checked` entre lista/mapa.
2. **Dim 3**: filtro estado en `/admin/servicios` con `role="radiogroup"` + 3 radios + exactamente 1 con `aria-checked=true`.
3. **Dim 1**: navegación por wizard `/register` hasta step 2 (anchor de que Dim 1 aterrizó bien).
4. **Dim 5**: verificación smoke — cero inputs con `h-8 px-2` en el bundle inicial de `/proveedor`.

## 4. Evidencia P5

### 4.1 Anti-voseo grep
```
Grep pattern: \b(agregá|cambiá|elegí|verificá|recargá|activá|publicá|hablá|contá|revisá|escribí|enviá|mostrá|guardá|querés|tenés|podés|sos|hacé|dale|vení|comé|entrá|ingresá|marcá|cargá)\b
Glob: **/*.{ts,tsx}
```
**Resultado: 0 matches**. Un aria-label transitorio con voseo ("Elegí el día") corregido a "Elige el día" antes del commit.

### 4.2 Build P1
`npm run build` con SHA `4dcf176` → **Compiled successfully** + Linting válido + 58/58 rutas generadas. Cero warnings críticos.

### 4.3 Suite full — SHA `4dcf176` contra `https://pawnecta-landing-mvp-git-zonab-1-petmatecls-projects.vercel.app`
```
46 passed (44.5s)
```
Cero flaky. Cero failed. Distribución esperada + cumplida:
- `setup` + `setup-tutor` = 2
- `chromium` (F2-2B + s10 ZB1 + s11 ZB2) = 13
- `chromium-tutor` (F2-3) = 22
- `chromium-cron` (Recordatorios R6) = 9

**Delta vs ZB1** (42/42 en corrida anterior): +4 tests del spec `s11-a11y-batch` de ZB2. Ninguno flaky, todos direct-pass.

### 4.4 Cleanup MCP staging
```sql
SELECT
  (SELECT COUNT(*) FROM agendamientos WHERE mensaje ILIKE '%[TEST-%' OR nota_proveedor ILIKE '%[TEST-%') AS agendamientos_test,
  (SELECT COUNT(*) FROM servicios_publicados WHERE titulo ILIKE '%[TEST-%') AS servicios_test,
  (SELECT COUNT(*) FROM proveedores WHERE nombre_publico ILIKE '%[TEST-%' OR nombre ILIKE '%[TEST-%') AS proveedores_test,
  (SELECT COUNT(*) FROM excepciones_disponibilidad WHERE motivo ILIKE '%[TEST-%') AS excepciones_test;
```
Resultado:
```
[{"agendamientos_test":0,"servicios_test":0,"proveedores_test":0,"excepciones_test":0}]
```

## 5. Diff scope
```
 components/Admin/ProveedorApprovalList.tsx         |  12 ++-
 components/Admin/ProveedorManagementList.tsx       |   3 +-
 components/Home/SearchBar.tsx                      |   2 +-
 components/Proveedor/ServiceFormModal.tsx          |  79 +++++++-------
 components/Service/ReviewForm.tsx                  |   2 +-
 components/Servicio/SolicitarAgendamientoModal.tsx |  50 ++++++---
 e2e/specs/zonab-1/s11-a11y-batch.spec.ts           | 116 +++++++++++++++++++++
 pages/admin.tsx                                    |  10 +-
 pages/admin/evaluaciones.tsx                       |   7 +-
 pages/admin/proveedores.tsx                        |   7 +-
 pages/admin/servicios.tsx                          |   4 +-
 pages/explorar.tsx                                 |  11 +-
 pages/index.tsx                                    |   6 +-
 pages/proveedor/index.tsx                          |  27 +++--
 pages/register.tsx                                 |  30 ++++--
 pages/usuario/mascotas/index.tsx                   |  12 +--
 16 files, +276 −102
```

## 6. Estado tras cierre

- Rama `zonab-1` con SHA `4dcf176` estable en preview + acta ZB2 pendiente de commit al repo.
- Cola de merges (sin cambio): PRIMERO `producto-1`, DESPUÉS `zonab-1` (no-FF esperado — commits paralelos post-fork).
- Congelamiento de staging sostenido hasta ventana post-N15.
- Prioridad absoluta sigue N15 si su monitor destapa algo (obs-2 del cron Recordatorios mañana viernes 1-ago 18:00-19:30 CLT).

## 7. Siguiente

**ZB3** — emails data (props `donde` / `fechaSub` en los 4 templates R7). Autorización adelantada vigente. Arranco sin GO específico. Reporto al cerrar ZB3 con acta P5 y suite verde.

**Deuda light acumulada por ZB2** (para backlog post-launch):
- Refactor `<fieldset>/<legend>` para 5 grouping labels de chip-groups (Elige noches / Elige horario / Cómo quieres / Cuánto dura / Disponibilidad grid).
- Bumping selectivo de section headers `slate-400 uppercase tracking-widest` si audit A11y externo lo marca.
- Focus-trap + Escape para los 3 modales inline de `pages/admin/*.tsx` (refactor a componentes propios con `useModalDialog`).
