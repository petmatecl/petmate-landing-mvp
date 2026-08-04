# ACTA PD4-bis — Sprint PRODUCTO-2 (rama `producto-2`)

**Sub-entregable**: PD4-bis — Cancel-then-navigate en CTA "Volver a solicitar" de VENCIDA.
**Rama**: `producto-2`.
**SHA final**: `5c27dd8`.
**Fecha ejecución**: 2026-08-04.
**Estado**: **CERRADO**. Suite 55/55 verde con **contra-test oro pasa** (3.0s).

---

## 1. Origen del bug — "el manual de suite pagándose sola"

Este sub-entregable **no estaba en el brief original**. Emergió como bug productivo durante el diagnóstico de la suite `s2-pestanas.spec.ts` de PD2 el 2026-08-04: la fixture inicial creaba **vencida F1 pendiente + pendiente futura F1** sobre el mismo servicio, y el `insertarAgendamientoTest` de la segunda falló con:

```
[cron-recordatorio] INSERT (F1) falló: duplicate key value violates unique
constraint "agendamientos_unique_pendiente_por_tutor_servicio"
```

Al reportar el fix del fixture (cambiar la vencida a `legacy` en s1, eliminar la vencida en s2), el PO detectó que **la misma constraint rompe el flujo productivo primario del CTA "Volver a solicitar" de PD4**:

> "Una VENCIDA sigue siendo estado='pendiente' en BD (decisión derivados); el CTA 'Volver a solicitar' lleva a la ficha donde crear la nueva solicitud del mismo par tutor+servicio viola la UNIQUE parcial — el caso de uso primario del CTA falla con error de constraint (o el mensaje 'ya tienes una solicitud pendiente', absurdo para el usuario que está mirando una vencida)."

**El fixture descubrió el bug en tiempo de suite** — no en producción. Ejemplo canónico de "el manual de suite pagándose sola": la constraint que exige distinguir la vencida de una pendiente vigente estaba oculta a nivel UI hasta que el fixture forzó reproducir la colisión.

## 2. Verificación P6-espíritu del endpoint (reportada antes de tocar)

Antes de aplicar cualquier fix se verificó el estado del endpoint `/api/agendamientos/cancelar` existente:

- **Scope**: F2-confirmadas-only. `if (agend.capacidad_snapshot_estadia == null) return 400` + `if (agend.estado !== 'confirmada') return 400`.
- **Ventana**: `horasHastaCheckIn < cancelacionMinHoras` → 403.

Una vencida es `estado='pendiente'` con fecha pasada → **doble rechazo garantizado** por diseño del endpoint (que atiende un problema distinto: cancelación autoritativa de F2 confirmadas con ventana anti-cancelación de la Sprint F2-3-D).

Se reportaron 3 opciones al PO (A UPDATE client-side + patrón vivo · B ampliar endpoint · C endpoint nuevo). **PO aprobó opción A** con refinamiento obligatorio.

## 3. Fix aplicado (opción A + refinamiento anti-carrera)

`pages/mis-solicitudes.tsx`:

- **Nuevo handler `handleVolverASolicitar(agendamientoId, servicioId)`**:
  1. Loading state por-card (`setVolverASolicitarLoadingId(agendamientoId)`).
  2. UPDATE client-side directo con **doble filter**:
     ```ts
     .from('agendamientos')
     .update({ estado: 'cancelada', respondido_at: new Date().toISOString() })
     .eq('id', agendamientoId)
     .eq('estado', 'pendiente')   // ← refinamiento anti-carrera del PO
     .select('id');
     ```
  3. Si `data.length === 0` (0 rows afectados): entre render y click el estado cambió (proveedor confirmó, o cancelación desde otra tab). **NO navegamos** — `toast.info('Esta solicitud cambió de estado.')` + `fetchSolicitudes()` para refrescar.
  4. Si OK: `router.push('/servicio/{id}')`. La vencida queda como `cancelada` (visible en Historial "Cancelada por ti"), la constraint `unique_pendiente` queda libre para la nueva solicitud.
  5. Si error: toast rojo + no navegar.

- **CTA refactor**: `<Link>` → `<button>` con `onClick={onVolverASolicitar}` + `disabled={volverASolicitarLoading}` + copy "Preparando..." mientras corre.

- **SolicitudCard** firma ampliada: `onVolverASolicitar: (id, servicioId) => void` + `volverASolicitarLoading: boolean`.

## 4. Nitpick copy L1213 SolicitarAgendamientoModal (registrado en el mismo commit)

El flow secundario del error `23505` en `SolicitarAgendamientoModal.tsx` seguía vivo para entradas desde otros orígenes (deep link, back button, etc.) donde la vencida no se cancela antes. Copy antes:

> "Ya tienes una solicitud pendiente para este servicio. Espera a que el proveedor responda, o revísala desde 'Mis reservas'."

Absurdo si la pendiente bloqueante tiene fecha pasada. Copy nuevo:

> "Tienes una solicitud abierta para este servicio. Si ya pasó su fecha, cancélala desde 'Mis reservas' para volver a solicitar; si sigue vigente, espera a que el proveedor responda."

Ofrece salida específica al caso vencido sin asumir cuál caso es.

## 5. Contra-test de oro

`e2e/specs/producto-2/s1-estados-derivados.spec.ts` — test nuevo "PD4-bis contra-test oro":

```
1. PRE: INSERT pending sobre el mismo servicio DEBE fallar 23505.
   Prueba que el bug existe antes del fix (documenta el estado inicial).

2. Click "Volver a solicitar" desde la vencida.
   Wait paralelo del navegación + click.
   Espera URL match /servicio/{ctx.servicioId}.

3. POST: INSERT pending sobre el mismo servicio DEBE pasar.
   Prueba que el fix funcionó: la constraint quedó liberada por el
   UPDATE cancela previo.
```

**Resultado**: ✅ verde en 3.0s en la primera corrida (`5c27dd8`).

Cleanup del INSERT extra queda a cargo del `afterAll` (borra por `servicio_id`).

## 6. Evidencia P5

- **Build P1** con SHA `5c27dd8`: **Compiled successfully** + 58/58 rutas.
- **Suite e2e** `5c27dd8` contra preview `producto-2`:
  ```
  55 passed (47.1s)
  ```
  Cero flaky. Tests PD4-bis relevantes:
  - `Vencida: badge VENCIDA visible, CTA "Volver a solicitar" (button), cero botones Cancelar` (1.5s)
  - `PD4-bis contra-test oro: click "Volver a solicitar" libera constraint unique_pendiente` (3.0s)
- **Cleanup MCP staging**: `0` en 4 tablas.
- **Anti-voseo grep**: `0 hits`.

## 7. Diff scope PD4-bis
```
 components/Servicio/SolicitarAgendamientoModal.tsx | 12 +++-
 e2e/specs/producto-2/s1-estados-derivados.spec.ts  | 71 +++++++++++++++++--
 pages/mis-solicitudes.tsx                          | 80 ++++++++++++++++++++--
 3 files, +150 −13
```

## 8. Meta-lección registrada

- **Constraint parcial silente + tipo derivado en UI** = superficie de bug invisible a testing UI convencional. El fixture que fuerza colisiones cruzadas es lo que la expone.
- **Cuándo un endpoint autoritativo NO es el path**: cuando el endpoint tiene identidad clara y acotada (F2-confirmadas-con-ventana), ampliarlo para cubrir un caso adyacente (cancelación de vencida = pendiente) diluye su contrato. El patrón vivo alternativo (UPDATE client + RLS) resuelve sin desnaturalizar.
- **Refinamiento anti-carrera obligatorio en UPDATEs derivados de estado**: si un CTA opera sobre un estado inferido del reloj (vencida = pendiente + fecha pasada), el UPDATE debe filtrar por el estado BD REAL — sino la carrera silenciosa (proveedor confirmó entre render y click) puede convertir un acto legítimo en corrupción de datos.

## 9. Deuda light

- **Refactor endpoint /cancelar** para exponer un contrato genérico "cancelar cualquier pendiente" cuando algún caso pida ventana / notificación al proveedor sobre pendientes vencidas. Hoy la cancelación pendiente client-side NO notifica al proveedor (el notify-proveedor-cancel es solo para confirmadas — decisión UX original). Aceptable: el proveedor ni siquiera veía la solicitud como próxima; su timeline no cambia con la cancelación de la vencida.
- **Test del path secundario del copy L1213** (deep link a `/servicio/{id}` con vencida existente que el flow del CTA no cancele): útil pero no bloqueante — el spec actual cubre el path primario que es 99% del tráfico.

## 10. Estado tras cierre

- Rama `producto-2` con SHA `5c27dd8` estable en preview. Suite 55/55.
- **Sprint PRODUCTO-2 avanza a PD3** (filtros por proveedor + mascota). Con **discrepancia detectada** en el brief PD3: la data de `mascota_id`/`tipo_mascota_texto` NO viaja actualmente en el SELECT de `/mis-solicitudes` — solo el proveedor sí. A reportar al PO en la entrega de PD3.
- **Fase 8 monitor N15** en curso, cierre esperado jueves 06-ago ~15:00 CLT. El desfile (`producto-1 → zonab-1 → producto-2`) empieza post-monitor.
