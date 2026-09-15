# GA4 DebugView investigation — 2026-09-15 (sprint bloque-f item 11b)

**Origen**: BACKLOG L1167 — deuda tooling P-baja, hallazgo 2026-08-14 durante `ga4-revert`. DebugView de GA4 no muestra eventos custom aunque lleguen a `/g/collect`.

## Estado empírico verificado

- **Reports → Realtime → "Número de eventos por Nombre del evento"**: muestra hits de `registro_proveedor_iniciado` + tests manuales (`test_con_bypass`, `test_manual_v2`, `test_no_sw`). Eventos SÍ llegan con status 204 en `/g/collect`.
- **DebugView del mismo período**: NO muestra los eventos custom. Solo muestra `page_view` y `user_engagement` (automáticos del enhanced measurement).

## Hipótesis a validar

GA4 DebugView tiene requisitos específicos que Realtime no exige:

1. **`debug_mode: true` en cada evento** — por spec de gtag.js, DebugView solo captura hits que llevan `debug_mode: true` como parámetro OR provienen de un dispositivo con Google Analytics Debugger extension activa AND una config del stream que expone debug events. Realtime captura TODOS los eventos que aterrizan en la propiedad.

2. **Config del data stream** — algunos data streams tienen `enhanced_measurement` habilitado pero debug events pueden requerir un toggle separado en Admin → Data Streams → \<stream\> → Configure tag settings → ... → Manage more settings.

3. **Device filter en DebugView** — DebugView tiene un dropdown "Debug device" en la izquierda. Si ningún device matchea el filtro (porque ningún hit llevó `debug_mode: true`), la vista queda vacía aunque los eventos existan.

## Verificación empírica (no ejecutada — solo diseño)

Para confirmar sin timepox largo:

1. **Test A** (menos invasivo): agregar `gtag('config', GA_ID, { debug_mode: true })` en dev/preview only (gate por `NEXT_PUBLIC_APP_ENV !== 'production'`) y disparar `registro_proveedor_iniciado` manual. Si el evento aparece en DebugView en <60s → hipótesis 1 confirmada, la solución es opt-in por evento en dev/preview.

2. **Test B** (si Test A no funciona): instalar Google Analytics Debugger extension en Chrome, activarla, disparar evento manual. Si aparece → hipótesis 1 pero con override de la extension.

3. **Test C** (última): revisar Admin → Data Streams → \<stream\> → Configure tag settings para el toggle "Enable debug events". Si existe y está OFF, activarlo.

## Impacto de fondo

**Cero bloqueo funcional**. Realtime + Reports muestran los eventos correctamente, key events están marcados, métrica norte "conexiones semanales" (contacto_iniciado + reserva_confirmada) se puede medir sin DebugView. Retención de datos en Reports = 14 meses (default GA4).

DebugView es tooling para debug en tiempo real durante desarrollo — Realtime cubre el mismo caso de uso con delay ~30s adicional (aceptable). El único inconveniente es no poder ver el JSON completo del payload de un evento antes de que llegue a Reports.

## Conclusión escrita

**No abrir sprint dedicado hoy**. El costo (~30 min investigación + posibles cambios de config) supera el beneficio marginal (mejor debug UX cuando ya tenemos Realtime funcionando). BACKLOG L1167 se marca cerrado como "investigación completada, no requiere acción" — si a futuro (post-launch, sprint de tuning analytics) la necesidad de ver payloads completos en real-time aparece, la hipótesis 1 es el primer test a ejecutar.

**Ancla P8**: la falla original del sprint `ga4-fix` (2026-08-14) fue perseguir el log "Sending event... undefined" de la extensión Chrome contra la superficie del producto. **Verificación decisiva**: Reports → Realtime → eventos por nombre. Ese es el sistema del producto. DebugView es tooling secundario. La regla operativa (`CLAUDE.md > Verificar contra el sistema del producto, no contra tooling de dev`) sigue aplicando y ya está documentada.
