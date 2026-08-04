# ACTA PD1 — Sprint PRODUCTO-2 (rama `producto-2`)

**Sub-entregable**: PD1 — Estados derivados REALIZADA / VENCIDA en UI (cero cambios BD).
**Rama**: `producto-2` (forkeada de `zonab-1` @ `af0b6d7`).
**SHA final**: `54d1477` (código `bbbfbce` + fix spec `6957587` → `54d1477`).
**Fecha ejecución**: 2026-08-04.
**Estado**: **CERRADO**. Suite 49/49 verde + 29/29 tests unitarios verdes.

---

## 1. Motivación

Hallazgo del PO en prod (previo al brief):
- Solicitud pendiente con `fecha_preferida = 24-jul` aún mostrándose activa (semántica confusa: la fecha del servicio ya pasó pero el estado BD sigue `pendiente`).
- Reserva confirmada del `29-jul` sin estado terminal (la BD sigue `confirmada` pero el servicio ya fue prestado).
- Cards ofreciendo acciones imposibles ("Cancelar reserva" sobre reserva ya cumplida, "Cancelar solicitud" sobre solicitud vencida).

Decisión PO: derivar los estados en **render-time**, sin tocar BD ni schema, ni gatillar cron/trigger. Los estados canónicos siguen siendo los 4 base (`pendiente`, `confirmada`, `cancelada`, `rechazada`) + `cancelada_proveedor`.

## 2. Regla derivada

```
confirmada + fin efectivo pasado    → realizada
pendiente + fecha_preferida pasada  → vencida
resto (terminales, futuras)         → sin cambio
```

Los terminales (`cancelada` / `rechazada` / `cancelada_proveedor`) NO vencen — su timeline terminó al cambiar de estado.

## 3. Implementación

### 3.1 `lib/estadoDerivado.ts` (nuevo)

Helper puro con 3 funciones exportadas — **reusa la semántica canónica de `pages/api/cron/recordatorio-reserva.ts:166-189`** (familia + fin efectivo), no reinventa:

- **`familia(reserva)`**: F2 (`capacidad_snapshot_estadia != null`) / F1 (`duracion_min != null`) / legacy. F2 tiene precedencia (mismo orden que el cron).
- **`finEfectivoMs(reserva)`**: F2 → `fecha_fin`; F1 → `fecha_preferida + duracion_min min`; legacy → cascada `fecha_fin > fecha_preferida + duracion_horas > fecha_preferida`.
- **`estadoDerivado(reserva, nowMs?)`**: retorna `EstadoDerivado`. Reloj inyectable para tests deterministas (default `Date.now()`).

Tolerante a `fecha_preferida: null` (tipo DB permite null) — sin derivación en ese caso, retorna estado base.

**Semántica clave para `vencida`**: usa `fecha_preferida` (inicio) — no fin efectivo. Rationale del brief: el tutor solicitó "para esa fecha"; no confirmar antes de que llegue = vencer. Un pendiente F2 con `fecha_preferida` pasada pero `fecha_fin` futura sigue siendo vencida (nunca fue confirmado a tiempo).

### 3.2 `lib/estadoDerivado.test.ts` (nuevo) — 29/29 verdes

Tests puros ejecutables con `npx tsx lib/estadoDerivado.test.ts`. Cubre:
- `familia()`: 4 casos (F2, F1, legacy, precedencia F2 sobre F1 si ambos populados).
- `finEfectivoMs()`: 6 casos (F2 con y sin fecha_fin, F1, legacy V4b, legacy V2/V4a con precedencia fecha_fin, legacy V1 puntual).
- `estadoDerivado()` regla realizada: 8 casos (F2 pasada/futura, F1 pasada/en-curso/futura, legacy V1 pasada, legacy V4b pasada, F2 malformado).
- `estadoDerivado()` regla vencida: 5 casos (pendiente pasada, pendiente F1 pasada, pendiente F2 con fecha_preferida pasada, pendiente futura, borde exacto = `<= nowMs`).
- Terminales no vencen: 3 casos (cancelada/rechazada/cancelada_proveedor con fecha muy pasada).
- Determinismo del reloj + `fecha_preferida: null`: 3 casos.

Total **29 passed, 0 failed**.

### 3.3 `pages/mis-solicitudes.tsx`

- Import + reemplaza `solicitud.estado` directo por `estadoDerivado(solicitud)` (línea 352).
- **Badges nuevos** (design system + coherencia con mapa semántico de emails R7):
  - `REALIZADA` — `bg-accent-50 text-accent-700 border-accent-100 + CheckCircle2` — tono neutro-positivo, sin celebración explícita.
  - `VENCIDA` — `bg-slate-50 text-slate-500 border-slate-200 + AlertTriangle` — sin negatividad, solo temporal.
- **Acciones automáticamente gateadas por construction**: `isPendiente`/`isConfirmada` derivan del `estadoUI`, así:
  - Una `realizada` no muestra "Cancelar reserva" ni "Cancelar solicitud" (nada gateado, nada ofrecido).
  - Una `vencida` no muestra "Cancelar solicitud".
  - Cero código de gate extra — el cambio se propaga por la condición existente.

### 3.4 PD4 aterrizado en el mismo commit

CTA **"Volver a solicitar"** en cards `VENCIDA` linkea a `/servicio/{id}` — la vencida deja de ser lápida. Aterrizado en PD1 porque pertenece al ciclo REALIZADA/VENCIDA (mismo diff, mismo test).

### 3.5 `e2e/specs/producto-2/s1-estados-derivados.spec.ts` (nuevo) — 3 tests

Fixtures con **fechas relativas**:
- **Realizada**: F2 confirmada, fecha_fin `-24h`, fecha_preferida `-72h`.
- **Vencida**: F1 pendiente, fecha_preferida `-24h`, duracion_min 60.
- **Confirmada futura (control)**: F2 confirmada, fecha_preferida `+96h`, fecha_fin `+144h`.

Los 3 usan `insertarAgendamientoTest` de `cron-recordatorio.ts` (mismo fixture, mismo cleanup por prefix TAG).

**Contra-tests explícitos**:
- Realizada: `expect(btnCancelarReserva).toHaveCount(0)` + `expect(btnCancelarSolicitud).toHaveCount(0)`.
- Vencida: cero botones Cancelar + CTA "Volver a solicitar" apuntando a `/servicio/{id}`.
- Confirmada futura: control — el botón "Cancelar reserva" sigue visible.

## 4. Iteración del spec (documentada para P5)

3 corridas hasta 49/49:
- **Pass 1** (`bbbfbce`): 46/49 — Realizada falla porque asumí que `tutor_nombre` se rendera en `/mis-solicitudes` (no — es el propio tutor). Vencida y Confirmada tampoco corrieron por `describe.serial`.
- **Pass 2** (`6957587`): 48/49 — filtrar por `servicio.titulo` (único por corrida) arregla Realizada y Vencida. Confirmada control falla porque `text=/^Confirmada$/i` con anchors no matchea el `textContent` concatenado que Playwright arma del badge + fecha (`"Confirmada Del sábado 8..."`).
- **Pass 3** (`54d1477`): 49/49 — Confirmada control usa `hasNotText(/Realizada/).hasNotText(/Vencida/)` para identificar la única card sin badge derivado. Más robusto que anchors sobre texto concatenado.

Ninguna iteración tocó el código productivo — solo el spec. El helper + integración UI (`bbbfbce`) quedó sano desde el primer commit.

## 5. Evidencia P5

### 5.1 Build P1
`npm run build` sobre `bbbfbce` (y `54d1477` acumulado) → **Compiled successfully** + 58/58 rutas.

### 5.2 Tests unitarios puros
```
$ npx tsx lib/estadoDerivado.test.ts
familia()
  ✓ F2: capacidad_snapshot_estadia populada
  ✓ F1: duracion_min populada, capacidad_snapshot_estadia null
  ✓ legacy: ambos null
  ✓ F2 tiene precedencia sobre F1 si ambos populados

finEfectivoMs()
  ✓ F2 usa fecha_fin
  ✓ F2 sin fecha_fin → null (dato malformado)
  ✓ F1: fecha_preferida + duracion_min
  ✓ legacy V4b: fecha_preferida + duracion_horas
  ✓ legacy V2/V4a: prefiere fecha_fin sobre duracion_horas
  ✓ legacy V1 puntual: fecha_preferida directo

estadoDerivado() — confirmada → realizada  (8 casos, todos OK)
estadoDerivado() — pendiente → vencida     (5 casos, todos OK)
estadoDerivado() — terminales no vencen    (3 casos, todos OK)
estadoDerivado() — determinismo + null     (3 casos, todos OK)

29 passed, 0 failed
```

### 5.3 Suite e2e — SHA `54d1477` contra preview `producto-2`
```
49 passed (42.5s)
```
- 46 previos (setup+chromium+chromium-tutor+chromium-cron) verdes.
- 3 nuevos PD1 verdes:
  - `ok 41 [chromium-tutor] PD1 S1 — Confirmada futura (control) (1.4s)`
  - `ok N Realizada (verde en pass 3)`
  - `ok N Vencida (verde en pass 3)`

Cero flaky. Wall time 42.5s.

### 5.4 Cleanup MCP staging
```sql
SELECT (SELECT COUNT(*) FROM agendamientos WHERE tutor_nombre ILIKE '[TEST-%') AS ags_test,
       (SELECT COUNT(*) FROM servicios_publicados WHERE titulo ILIKE 'e2e-f2-3-%') AS servicios_test,
       ...;
```
Resultado: `0` en las 4 tablas.

### 5.5 Anti-voseo grep
`\b(agregá|cambiá|elegí|...)\b` → **0 hits** en `**/*.{ts,tsx}`.

## 6. Diff scope PD1 (incluye PD4)
```
 e2e/specs/producto-2/s1-estados-derivados.spec.ts | ~195 líneas (nuevo)
 lib/estadoDerivado.test.ts                        | ~235 líneas (nuevo)
 lib/estadoDerivado.ts                             | ~132 líneas (nuevo)
 pages/mis-solicitudes.tsx                         |  ~56 líneas modificadas
 playwright.config.ts                              |   ~4 líneas modificadas
 5 files, +600 −16 aprox
```

## 7. Migrations

**CERO**. Decisión PO derivados respetada. La BD sigue con:
- 5 estados base en `agendamientos.estado`: `pendiente` / `confirmada` / `cancelada` / `rechazada` / `cancelada_proveedor`.
- Sin columna `realizada_at` / `vencida_at` / `estado_derivado`.
- Sin trigger de auto-transición.

Todo el ciclo de vida REALIZADA/VENCIDA vive en render-time.

## 8. Estado tras cierre

- Rama `producto-2` con SHA `54d1477` estable en preview.
- PD1 + PD4 cerrados. Siguiente: **PD2 (pestañas)** — arranca inmediatamente sin GO (autorización adelantada del sprint completo vigente).
- Cola de merges (sin cambio): `producto-1` (aprobado, esperando ventana) → `zonab-1` → `producto-2`.
- **Recordatorio operativo**: preemptivo por captura obs-2 del cron **hoy martes 4-ago ventana 18:00-19:00**. Si llega, pauso PD2/PD3 para cerrar Fase 5 + tag `recordatorios-prod-20260804` + casilla 0.1 N15 → GO Fase 6.

## 9. Discrepancia detectada para PD3

**A reportar al PO en la entrega de PD3**: el brief menciona "filtros por proveedor y por mascota (ambos datos ya viajan en las cards)". La data de **mascota NO viaja actualmente** en el SELECT de `/mis-solicitudes` — solo el proveedor sí. La mascota vive en `agendamientos.mascota_id + tipo_mascota_texto` y se renderea en el panel del PROVEEDOR (Sprint 3 fichas de mascotas), pero no en la vista del tutor. Opciones cuando llegue el turno:
- (a) Ampliar el SELECT + agregar embed a `mascotas` para poblar el filtro (no rompe nada; agrega 1 join).
- (b) Solo filtro por proveedor en PD3, mascota diferida a sub-entregable propio con visualización de la mascota en la card.

Voto por (a) — mínimo scope adicional, cierra el brief tal como está.
