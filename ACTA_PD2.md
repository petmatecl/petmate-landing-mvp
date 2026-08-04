# ACTA PD2 — Sprint PRODUCTO-2 (rama `producto-2`)

**Sub-entregable**: PD2 — Pestañas Próximas/Pendientes/Historial en `/mis-solicitudes`.
**Rama**: `producto-2`.
**SHA final**: `f5da7ef` (código) + `86b9209` (fixes specs).
**Fecha ejecución**: 2026-08-04.
**Estado**: **CERRADO**. Suite 55/55 verde (incluye 5 tests s2-pestanas).

---

## 1. Alcance

Organizar el ciclo de vida de las reservas en 3 pestañas mutually exclusive, particionado 100% client-side sobre la lista ya cargada por el fetch existente — **cero queries nuevas**, decisión PO respetada.

## 2. Diseño

| Pestaña | Filtro (`estadoDerivado`) | Orden | Default |
|---|---|---|---|
| Próximas | `confirmada` | fecha asc | ✅ |
| Pendientes | `pendiente` | fecha asc | |
| Historial | `realizada` + `vencida` + `cancelada` + `rechazada` + `cancelada_proveedor` | fecha desc | |

**Default = Próximas** — lo que el tutor necesita "próximamente". Coherente con el use case principal detectado por el PO (uso en teléfono).

## 3. Implementación

`pages/mis-solicitudes.tsx`:

- Nuevo state `activeTab: 'proximas' | 'pendientes' | 'historial'` (default `'proximas'`).
- IIFE dentro del render que particiona la lista por `estadoDerivado(sol)` (usa el helper de PD1 — cero duplicación de lógica de derivación).
- Sort específico por pestaña: Próximas/Pendientes ascendente (lo más pronto arriba), Historial descendente (lo más reciente arriba).

**A11y**:
- Wrapper `role="tablist" aria-label="Filtro de reservas por etapa"`.
- Cada tab: `role="tab" aria-selected={isActive} aria-controls={panelId}`.
- Panel: `role="tabpanel" aria-labelledby aria-controls` matching.
- Mismo patrón que las nav-tabs de admin (ZB2 Dim 3).

**Visual**:
- Tab activo: underline `border-b-2 border-accent-600` + texto `text-accent-700`.
- Tab inactivo: `text-slate-600 hover:text-slate-900 hover:border-slate-300`.
- **Contadores como badge** en cada label (accent-100 activo, slate-100 inactivo, `min-w-[1.5rem]` para alinear números).
- **Mobile-first**: `overflow-x-auto hide-scrollbar` en el tablist (los 3 tabs caben pero con contadores grandes podrían desbordar).

**Empty state por pestaña** con copy contextual:
- Próximas → "No tienes reservas confirmadas próximamente."
- Pendientes → "No tienes solicitudes esperando respuesta."
- Historial → "Todavía no hay reservas en tu historial."

## 4. Regresión esperada de PD2 aplicable a specs previos

Al cambiar el default a "Próximas", las cards VENCIDA (Historial) y REALIZADA (Historial) ya no viven en la vista inicial. Los specs de PD1 (`s1-estados-derivados`) que las buscan directo tuvieron que actualizarse:

- Realizada + Vencida: click en tab Historial antes de buscar la card.
- Confirmada futura (control): sin cambio (vive en Próximas = default).

Aplicado en `86b9209` (mismo diff que introdujo el fix de la constraint `unique_pendiente` — ver acta PD4-bis).

## 5. Spec e2e `s2-pestanas.spec.ts` — 5 tests

Fixtures del beforeAll:
- Realizada (F2 confirmada, fin pasado).
- Confirmada futura (F2 confirmada, futura).
- Pendiente futura (F1, para poblar contador Pendientes).

**Nota importante**: la vencida NO se crea en s2 por la constraint `agendamientos_unique_pendiente_por_tutor_servicio` (una pendiente por tutor+servicio). El spec s1 sí cubre vencida en su propio servicio dedicado.

**Los 5 tests**:
1. Default = Próximas + los 3 tabs con `role="tab"`.
2. Panel Próximas: solo confirmada futura (1 card), cero Realizada/Vencida.
3. Panel Pendientes: solo pendiente vigente (fecha futura).
4. Panel Historial: 1 card (Realizada), badge visible.
5. Contadores en tabs reflejan piso del fixture (Próximas ≥ 1, Pendientes ≥ 1, Historial ≥ 1).

## 6. Iteración documentada (P5)

- **Pass 1** (`f5da7ef`): suite falló 2/54 — Realizada regresión + s2 Default por conflicto de constraint (fixture inicial creaba vencida F1 + pendiente futura F1 sobre el mismo servicio → violación `unique_pendiente`).
- **Pass 2** (`86b9209`): fixes documentados en su commit — click tab Historial en s1, eliminación de vencida en s2 fixture.
- **Pass 3** (`54d1477`): 49/49 verde.
- Suites subsecuentes tras PD3/PD4-bis: 55/55 verde en `5c27dd8`.

## 7. Evidencia P5

- **Build P1**: verde en cada SHA.
- **Suite full 55/55** contra preview `producto-2` SHA `5c27dd8`: 5/5 tests PD2 verdes (default 1.5s, panel Próximas 1.5s, panel Pendientes 1.6s, panel Historial 1.5s, contadores 1.4s).
- **Cleanup MCP staging**: `0` en agendamientos+servicios test.
- **Anti-voseo grep**: `0 hits`.

## 8. Diff scope PD2
```
 e2e/specs/producto-2/s2-pestanas.spec.ts | ~238 líneas (nuevo, ajustado en pass 2)
 pages/mis-solicitudes.tsx                | ~123 líneas modificadas
 2 files, +350 −11 líneas aprox
```

## 9. Migrations

**CERO**. Particionado client-side sobre la data ya cargada.

## 10. Deuda light

- **Filtros dentro de pestañas** (PD3): siguiente sub-entregable — filtros por proveedor + mascota, condicional en >1 opción.
- **Contadores globales vs por-servicio**: el spec valida piso, no valor exacto — porque Camila tiene otras reservas históricas en staging. Aceptable para el flow real; si se pide precisión exacta, refactorizar spec para crear en beforeAll un tutor de test aislado (out-of-scope PD2).
