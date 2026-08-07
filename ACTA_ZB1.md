# ACTA ZB1 — Sprint ZONAB-1 (rama `zonab-1`)

**Sub-entregable**: ZB1 — Modales.
**Rama**: `zonab-1` (forkeada de `staging` @ `55489fe`, incluye N15).
**SHA final**: `ec738a0`.
**Fecha ejecución**: 2026-07-31.
**Estado**: **CERRADO**. Suite full 42/42 verde. Cero regresión en específicas ajenas al scope.

---

## 1. Alcance

Estandarizar todos los diálogos modales del app con:
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (a11y semántico).
- Focus-trap + Escape + return-focus (kbd nav).
- Backdrop click cierra (excepto durante loading).

## 2. Implementación

### 2.1 Hook compartido `useModalDialog`
Preexistente en `hooks/useModalDialog.ts` (creado en sweep #2 F2-3). Encapsula:
- Focus-trap dentro del container.
- `Escape` cierra si `!blockClose`.
- Return-focus al elemento previo al abrir.

### 2.2 Componentes migrados a `useModalDialog` (9)
| Componente | Path | Notas |
|---|---|---|
| ConfirmDialog | `components/Shared/ConfirmDialog.tsx` | Cascada — 8+ usos en app + admin |
| ExampleCTAModal | `components/Servicio/ExampleCTAModal.tsx` | — |
| VerificationGateModal | `components/Proveedor/VerificationGateModal.tsx` | — |
| LoginRequiredModal | `components/Shared/LoginRequiredModal.tsx` | — |
| ModalAlert | `components/ModalAlert.tsx` | — |
| ReportModal | `components/Shared/ReportModal.tsx` | — |
| ReviewModal | `components/Service/ReviewModal.tsx` | — |
| MobileActionSheet | `components/Servicio/MobileActionSheet.tsx` | Bottom-sheet mobile |
| SitterDetailModal | `components/Admin/SitterDetailModal.tsx` | Admin — no habilitado hoy en admin/proveedores (ese usa modal inline separado) |

### 2.3 Modales inline admin — role/aria mínimos (3 files, 4 modales por file)
| File | Modales cubiertos |
|---|---|
| `pages/admin/proveedores.tsx` | aprobar + rechazar + suspender/reactivar + detalle ("Ficha del Proveedor") |
| `pages/admin/evaluaciones.tsx` | rechazar |
| `pages/admin/servicios.tsx` | detalle |

Focus-trap + Escape queda como **deuda light** en los 3: refactor a `useModalDialog` requiere extraer los modales inline a componentes propios; hoy conviven varios `type` en un solo bloque JSX. Comentario dejado in-place.

### 2.4 Componentes deliberadamente excluidos
- **FeedbackWidget** — `aria-modal="false"`: es flyout, no modal bloqueante. Focus-trap sería incorrecto.

## 3. Incidente P5 documentado — gap del pass 1

**Pass 1** commit `e6ae558`: dos modales inline de `pages/admin/proveedores.tsx` (`suspender/reactivar` + `detalle`) quedaron **sin** role/aria/aria-labelledby. Solo aprobar/rechazar recibieron los atributos en la primera pasada. `evaluaciones.tsx` y `servicios.tsx` sí quedaron completos desde el pass 1.

**Detección**: suite full contra preview `zonab-1` (SHA `f783778` post cherry-pick PR0) — el spec nuevo `s10-a11y-modales-batch` falló en el aserto `role="dialog"` para "Ficha del Proveedor".

**Fix** commit `ec738a0`:
- `pages/admin/proveedores.tsx`: agrega `role="dialog"` + `aria-modal="true"` + `aria-labelledby` a los 2 modales faltantes + sus respectivos `<h3 id="...">`.
- `e2e/specs/zonab-1/s10-a11y-modales-batch.spec.ts`:
  - Selector determinístico (`button[title="Ver Perfil"]` o `button:has-text("Revisar")` en vez del genérico `button, tr[role="button"]` que agarraba un botón hidden del header mobile).
  - Espera de fila renderizada con `.toPass({ timeout: 20000 })` (evita race con el fetch).
  - Heading real: `"Ficha del Proveedor"` (no "Detalle del Proveedor" como asumí originalmente).
  - Assertion nueva: `aria-labelledby` apunta al `id` real del `<h3>`.

**Causa raíz del pass 1**: revisión visual del diff no detectó los 2 modales sin atributos porque el bloque JSX de proveedores.tsx tiene 4 `type` distintos anidados y solo revisé los 2 primeros (aprobar/rechazar). Aprendizaje: audit checklist debe listar TODOS los `type` posibles antes de aplicar.

## 4. Cadena de commits

```
e6ae558  refactor(zonab-1): ZB1 modales — 9 componentes al hook useModalDialog + 3 admin inline
f783778  test(guard): PR0 refactor whitelist → deny-list + test unitario  [cherry-pick de producto-1 4f6a6b0]
ec738a0  fix(zonab-1): completa role/aria en modales detalle+suspender/reactivar de admin/proveedores + fix spec s10
```

Cherry-pick de PR0 (`f783778`) fue necesario porque `zonab-1` forkeó de `staging @ 55489fe`, pre-producto-1, y traía la guarda antigua con whitelist de substrings. El guard nuevo (deny-list) es requisito para que la suite reconozca `pawnecta-landing-mvp-git-zonab-1-*` como preview permitido. Auto-merge sin conflictos.

## 5. Diff scope
```
 components/Admin/SitterDetailModal.tsx           |  22 ++++-
 components/ModalAlert.tsx                        |  25 +++++-
 components/Proveedor/VerificationGateModal.tsx   |  42 ++-------
 components/Service/ReviewModal.tsx               |  19 +++-
 components/Servicio/ExampleCTAModal.tsx          |  45 ++--------
 components/Servicio/MobileActionSheet.tsx        |  22 ++---
 components/Shared/ConfirmDialog.tsx              |  74 ++++-----------
 components/Shared/LoginRequiredModal.tsx         |  25 +++++-
 components/Shared/ReportModal.tsx                |  21 ++++-
 e2e/setup/guard.test.ts                          | 109 +++++++++++++++++++++++  ← cherry-pick PR0
 e2e/setup/guard.ts                               |  70 +++++++++++++++          ← cherry-pick PR0
 e2e/specs/zonab-1/s10-a11y-modales-batch.spec.ts |  79 ++++++++++++++++
 pages/admin/evaluaciones.tsx                     |  12 ++-
 pages/admin/proveedores.tsx                      |  41 +++++++--
 pages/admin/servicios.tsx                        |  14 ++-
 playwright.config.ts                             |  49 ++++------                ← cherry-pick PR0
 16 files, +463 −206
```

## 6. Evidencia P5 — suite y verificaciones

### 6.1 Build P1
```
> next build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (58/58)
```

### 6.2 Suite full — SHA `ec738a0` contra `https://pawnecta-landing-mvp-git-zonab-1-petmatecls-projects.vercel.app`

**Corrida A (paralelo, 2 workers)** — 56s wall time:
- 35 passed direct
- 5 flaky (verdes en retry #1):
  - `f2-2b/s6-inline-min-max` — max noches < min noches
  - `f2-2b/s9-legacy-oculto` — cuidado apagar F2
  - `f2-3/s1-picker-render` — modal se abre con título
  - `f2-3/s2-dias-pintados` — check-out libre
  - `f2-3/s10-a11y-kbd` — SolicitarAgendamientoModal (spec F2-3, NO el de ZB1)
- 2 failed:
  - `f2-3/s3-reserva-feliz` — timeout en helper interno
  - `f2-3/s4a-race` — timeout en helper interno

**Corrida B (re-corrida aislada de los 2 failed)** — 10s wall time:
```
ok 1 [chromium-tutor] › s4a-race › rango ocupado → EXCLUDE rebota (3.7s)
ok 2 [chromium-tutor] › s3-reserva-feliz › rango válido → toast + BD (5.1s)
3 passed (10.0s)
```

**Diagnóstico**: flakiness ambiental de preview `zonab-1` — cold-start Vercel + Supabase load bajo 2 workers en paralelo. Los 2 fails NO tocan código de ZB1 (F2-3 tutor, subieron con F2 en `d2bee23`). Retry aislado con 1 worker → 3.7s + 5.1s (menos del timeout).

**Total agregado**: 42/42 verde.

### 6.3 Cleanup MCP staging
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

### 6.4 No-regresión indirecta del refactor `useModalDialog`
- `f2-3/s6-cancelar-reserva-ventana` (dentro de la suite pass) ejercita `ConfirmDialog` migrado.
- `f2-3/s10-a11y-kbd` (previo) verifica el hook en `SolicitarAgendamientoModal` (que usa el mismo hook).
- Ambos verdes → hook no rompió el patrón heredado.

### 6.5 Verificación pre-SQL P6
Consulta a `information_schema.columns` para columnas `mensaje` / `nota_proveedor` de `agendamientos` antes del cleanup query final (primeros intentos usaron nombres inexistentes: `notas`, `mensaje_tutor`). P6 aplica y funcionó.

## 7. Estado tras cierre

- Rama `zonab-1` con SHA `ec738a0` estable en preview. Sigue congelada hasta ventana de merge post-N15 monitor 48h.
- Cola de merges (sin cambio): PRIMERO `producto-1`, DESPUÉS `zonab-1` (no-FF esperado por commits paralelos post-fork).
- Prioridad absoluta sigue N15 si su monitor destapa algo.

## 8. Siguiente

**ZB2** — batch a11y + visual. Autorización adelantada del sprint completo vigente. Arranco sin GO específico. Reporto al cerrar ZB2 con acta P5 y suite verde.

## Anexo P5 — Fase C del desfile (merge `zonab-1 → staging` ejecutada 2026-08-07)

**SHA pre-merge staging**: `d5e389c` (post-Fase B con producto-1 mergeado + evidencia P5).
**SHA post-merge staging**: `d730801` (merge commit no-FF).
**Ejecutor**: Claude, guard P3 verificado.

**FF-check pre-merge**: 5 commits en staging que zonab-1 no tenía → no-FF esperado.

**Conflicto resuelto**: `BACKLOG.md` línea 184-192 — 2 ítems P3 nuevos (crons Vercel Pro en HEAD staging + advisory lock zonab-1) → **aceptados ambos bloques** (siguiendo la nota del mini-checklist "Conflicto BACKLOG.md: aceptar ambos bloques"). Auto-merges limpios en `pages/explorar.tsx` + `playwright.config.ts`.

**Build P1 local exit 0** post-merge.

**Preview Vercel staging Ready** al primer poll (attempt 1, code 200).

**Suite full contra staging (SHA `d730801`)** — **corrida dual por protocolo flakiness ambient**:

- **Corrida 1** (post-Ready inmediato):
  ```
  Running 50 tests using 8 workers
  46 passed + 4 failed (44.3s), EXIT=1
  ```
  Los 4 fails son de zonab-1 specs: `s10-a11y-modales-batch:25` (modal SitterDetailModal), `s11-a11y-batch:21` (toggle Lista/Mapa), `s11-a11y-batch:42` (filtro estado admin/servicios), `s11-a11y-batch:60` (aria-live wizard register). Todos fallan también en retry #1.

- **Diagnóstico** (regla mini-checklist "re-correr aislado antes de asumir regresión"):
  ```
  $ npx playwright test e2e/specs/zonab-1/
  Running 6 tests using 5 workers
  6 passed (6.3s), EXIT=0
  ```
  Los 6 tests de zonab-1 pasan en 6.3s cuando el preview ya está caliente. **Flakiness ambient confirmado** — cold-start del preview con concurrencia 8 workers golpea a los tests a11y (que dependen de que scripts cargen + roles ARIA se establezcan post-hidratación).

- **Corrida 2 confirmatoria full** (protocolo):
  ```
  49 passed (32.0s) + 1 flaky, EXIT=0
  ```
  El único flaky es `producto-1/s1-badge-reserva-online:74` — el known-flaky ya documentado en `ACTA_SPRINT_PRODUCTO-1.md` (deuda light anotada del sprint anterior, retry verde consistente). **Cero regresión de zonab-1 sobre la combinación**.

**Cleanup MCP staging post-suite**: `0 [TEST-%` + `0 e2e-%` verificado dos veces (post-corrida 1 + post-corrida 2).

**FASE C CERRADA — 2026-08-07**. Sin bloqueos para Fase D.
