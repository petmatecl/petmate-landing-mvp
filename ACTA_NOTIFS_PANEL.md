# ACTA — Sprint `notifs-panel`

**Rama**: `notifs-panel` (forkeada de `main` @ `14c6c62` post-cierre `admin-visibilidad`).
**SHA final en `main`**: `8da3036` (código `60ddc55` + docs BACKLOG `8da3036`).
**Tag**: `notifs-panel-prod-20260901`.
**Fecha ejecución**: 2026-08-28 → 2026-09-01.
**Estado**: **CERRADO** en producción. Smokes 1–5 verdes por PO 2026-09-01.

---

## 1. Alcance original y decisiones producto

El sprint arrancó con 8 defectos reportados por el PO sobre el panel de la campana (`NotificationBell`) tras usarlo en producción durante el sprint `admin-visibilidad`. Cuatro decisiones producto se tomaron ANTES del código:

- **D1** — Destino del click en la notif: navegar al recurso del evento (agendamiento / evaluación / mensaje), no a un feed dedicado.
- **D2** — Panel corto (campana) muestra **solo no leídas**. El panel largo `/notificaciones` (deuda a sprint dedicado) mostraría todas con filtros.
- **D3** — Fechas relativas al render (`"hace 3 min"`, `"hoy a las 14:30"`, `"Mañana a las 10:00"`), no `toLocaleString('es-CL')` cristalizado.
- **D4** — Datos e2e NO se borran en prod bajo ninguna circunstancia. Cualquier limpieza pasa por revisión previa.

## 2. Plan de commits y ejecución real

**Plan original**: 6 commits (C1 quitar link → C2 helper → C3 aplicar → C4 render defensivo → C5 panel solo no leídas → C6 hook común Escape+routeChange).

**Ejecución real**: **8 commits técnicos** en la rama del sprint (más 1 de docs BACKLOG al cierre). El sprint **creció de 6 a 8 commits** por dos defectos que aparecieron recién al probar el gesto real en el smoke del C6, cuando el plan los daba por cubiertos:

- **C7a** (`2830e40`) — Portal del backdrop + panel al `document.body`. Aparece porque el smoke C6 del PO reveló que el defecto 4a (backdrop no captura clicks) **nunca había estado resuelto**. El diagnóstico de la ronda 1 lo había marcado como funcionando por lectura de código; el DOM real mostró `padreEsHeader=true` + `es_backdrop=false`. El backdrop vivía dentro del stacking context del header sticky (z-40) que atrapaba su propio `z-40 fixed inset-0`. Portal al body corrige el stacking context.
- **C7b** (`60ddc55`) — Event bus de overlays para exclusión mutua. Aparece porque el smoke C6 del PO reveló un bug nuevo no listado en los 8 originales: los dos overlays persistentes (`NotificationBell` + `FeedbackWidget`) se superponían con backdrop compartido si el user abría uno con el otro ya abierto. Nadie lo había considerado en el plan.

**Es evidencia directa de que el smoke sirvió**: dos defectos reales quedaron fuera del alcance planificado y solo aparecieron al ejercitar los gestos reales sobre el DOM que efectivamente renderea. Sin el smoke del C6 habrían llegado a prod escondidos bajo el veredicto verde de la ronda 1.

**Log completo de la rama del sprint** (post-C1 que fue mergeado suelto a main como `7c39210`):

```
8da3036 docs(backlog): 2 observaciones menores del sprint notifs-panel
60ddc55 fix(notifs): C7b event bus de overlays para exclusion mutua
2830e40 fix(notifs): C7a portal del backdrop + panel al body — fix defecto 4a
9cd286f feat(notifs): C6 hook comun usePersistentOverlayClose + aplicar a NotificationBell y FeedbackWidget
4e52fbb feat(notifs): C5 panel corto solo no leidas + filter defensivo realtime
232e352 feat(notifs): C4 render defensivo + fecha del evento (Opcion Y + modo evento del helper)
4b831e6 feat(notifs): C3 aplicar helper formatFechaRelativa al created_at del panel
ab8c7d5 feat(notifs): helper compartido formatFechaRelativa con distincion pasado/futuro
```

C7 se partió en C7a + C7b (dos commits separados) por decisión operativa del PO: "arreglos independientes con riesgos distintos, para poder revertir uno sin el otro". Cumplido — cada uno es reversible por separado.

## 3. Balance real de los 8 defectos originales

| # | Defecto originalmente reportado | Cómo resultó ser |
|---|---|---|
| 1 | Link `/notificaciones` roto (404) | Real — cerrado en `7c39210` (C1) quitando el link |
| 2 | Fechas cristalizadas (`toLocaleString`) | Real — cerrado en C2/C3/C4 (helper `formatFechaRelativa`) |
| 3 | Panel muestra leídas y no leídas | Real — cerrado en C5 (filter defensivo `is_read=false`) |
| 4a | Backdrop no cierra al clickear afuera | **Peor de lo que creíamos** — no era falta de handler, el backdrop **nunca funcionó** por stacking context. Cerrado en C7a (portal) |
| 4b | Panel arrastra tras navegar (persiste al route change) | Real — cerrado en C6 (`usePersistentOverlayClose`) |
| 5 | Código de reserva expuesto al usuario | **No existía** — reportado mal por PO desde captura de datos de test. El cron usaba `servicio.titulo` (nombre legible). Lo que se vio como id era el nombre de un servicio de prueba |
| 6 | Notif duplicada (misma reserva 3 veces) | **No existía** — reportado mal por PO desde captura de datos de test. Eran tres agendamientos DISTINTOS de tres familias (F1/F2/legacy) que compartían un string en el `mensaje` |
| 7 | Fecha del evento ambigua (¿ya pasó o está por venir?) | Real — cerrado en C4 (modo `'evento'` del helper con marcadores `"Fue el"` / `"El"` / `"Hoy"` / `"Mañana"` / `"Fue ayer"`) |

**Resumen**:
- **2 no existían** (5 y 6), ambos reportados mal desde capturas de datos de test.
- **1 estaba peor** (4a: no faltaba handler, el backdrop nunca funcionó).
- **5 eran como se describieron**.

Y aparecieron **3 defectos NO listados** que salieron al mirar el dato completo o al ejecutar el gesto real:
- **Voseo en textos del panel** — encontrado al inventariar la tabla completa de notificaciones buscando otra cosa.
- **Superposición de overlays** — encontrado en smoke C6 del PO. Cerrado en C7b (event bus).
- **`notify_viaje_publicado`** — función `SECURITY DEFINER` en la BD que hacía POST a un dominio externo (`vectis-workspace.cl`) con token hardcodeado (typo `pawnnecta`). Dormida, rota y nunca ejecutada, pero ahí, con las 9 evidencias que la caracterizaban como código malicioso residual (revisar sección 6 para detalle). Cerrado por el PO con DROP en prod y staging.

## 4. Cosas dadas por buenas que no lo estaban

Los tres casos en que la lectura de código o de la superficie del sistema divergió del comportamiento real:

- **El backdrop** — marcado como funcionando en ronda 1 por lectura estructural de código. Nunca funcionó. Se descubrió al probar el gesto real en el smoke del C6, cuando el PO clickeó zona vacía y el panel siguió abierto. Corolario P8 puro (verificación instrumental sin verificar el efecto observable).
- **Los default privileges** — el sprint `admin-visibilidad` había concluido que staging y prod estaban configurados **distinto** en las grants por default del schema `public`. Al verificar en este sprint con query a los dos entornos, resultaron **iguales** — el diagnóstico previo había sido incorrecto. Anotable como evidencia de que un supuesto arrastrado entre sprints puede sobrevivir sin verificar hasta que otra investigación lo cruza.
- **La metadata de la notif de Carolina** — auditor asumió `metadata=null` por lectura estructural; PO verificó empíricamente y **sí tenía metadata** + agendamiento existente. El defensa in-place del C4 quedó justificado por otra razón (defenderse de rows donde el recurso REFERENCIADO en la metadata ya no existe), no por la que se documentó primero.

## 5. Hallazgos que no buscábamos

Aparecieron al mirar el dato completo (SELECT * sobre la tabla o schema) o al ejecutar el gesto real (smoke DOM en vez de lectura de código):

1. **`notify_viaje_publicado`** — función `SECURITY DEFINER` que hacía HTTP POST a `vectis-workspace.cl` con token hardcodeado con typo `pawnnecta`. Descubierta al listar funciones del schema `public` buscando el trigger de notifs. Sin trazabilidad en repo (grep exhaustivo del código = cero referencias reales; los 2 hits eran falsos positivos — hash npm + PNG binary). Ejecutada por PO con DROP en prod y staging. Documentada para trazabilidad forense.

2. **Voseo residual en textos de notificaciones** — encontrado al inventariar la tabla `notifications` completa buscando otra cosa. Corregido durante la fase F2C (40 filas actualizadas en prod).

3. **Superposición de overlays** — encontrado en smoke C6 del PO. Ni el plan de defectos ni el diagnóstico de ronda 1 lo consideraron. Cerrado en C7b.

## 6. El patrón que atraviesa todo el sprint

Cuando el sprint se lee al final, el patrón que emerge por encima del detalle vale más que la lista de defectos:

> **Casi todo lo que se descubrió apareció al mirar el dato completo o al ejecutar el gesto real, no al leer el código ni al revisar defecto por defecto.**

- Los 2 defectos que no existían (5 y 6) se descartaron al cruzar la captura con las tablas reales.
- El defecto peor de lo esperado (4a) se detectó ejecutando el gesto real, no leyendo el handler.
- Los 3 defectos no listados (voseo, superposición, función maliciosa) aparecieron mirando el conjunto completo, no auditando por ítem.
- Las 3 cosas dadas por buenas incorrectamente (backdrop, default privileges, metadata Carolina) se validaron por lectura estructural y se derribaron por evidencia empírica.

Es la aplicación del corolario P8 del proyecto en escala de sprint entero, no de un smoke aislado. El método "leer el código, marcar el defecto como cubierto" tiene un falso-negativo estructural cuando la verificación pasa por sistemas visuales o de datos: solo el gesto real y el dato completo lo bloquean.

## 7. Desvíos del plan operativo

**Reporte incompleto del SHA de C7a**: el commit C7a (`2830e40`) aterrizó en la sesión anterior a este cierre, y el auditor no reportó el SHA en su turno de push (apareció recién en el `git log` del turno C7b). El PO lo detectó al pedir el `git log --oneline 7c39210..HEAD` antes del tag y confirmó que el commit sí estaba separado. Cero impacto funcional (el sprint ya está en prod, C7a y C7b son commits reversibles por separado como pedía el plan), pero es desvío operativo de la convención "reportar SHA por commit para trazabilidad". Anotado para futuros sprints — el reporte por commit no es opcional cuando el plan pide separación explícita.

## 8. Verificación en producción

Smokes ejecutados por PO 2026-09-01 contra `www.pawnecta.com` con cuenta admin — **todos verdes**:

1. Panel abre sin el pie "Ver todas" — el 404 del link roto ya no está en prod.
2. Click en zona vacía → cierra. Backdrop funciona.
3. Escape → cierra.
4. Abrir el widget de feedback cierra el panel de notificaciones (event bus C7b).
5. Fechas en formato relativo (helper `formatFechaRelativa`), no `toLocaleString` viejo.

## 9. Deuda anotada al cierre

Migrada a `BACKLOG.md > Deuda técnica / pulido` en commit `8da3036`:

1. **F2 muestra `"00:00"`** en el modo `'evento'` del helper — reservas por noches no tienen hora, midnight local lee raro. Fix propuesto: flag `sinHora?: boolean` o segundo helper. No bloqueante.
2. **Contraste visual insuficiente** entre "no-leída apagada" y "leída apagada" en el panel corto — fix propuesto cuando se toque el diseño del panel largo `/notificaciones`.

Otras deudas ya listadas del sprint (previas a este cierre):
- Página `/notificaciones` completa (panel largo con filtros — sprint dedicado).
- Dead code: union `NotificationType`, `NotificationCenter.tsx`.
- Migration oficializando trigger `notify_proveedor_new_eval` con REVOKE FROM PUBLIC + anon + authenticated.

## 10. Metadata del tag

- **Tag anotado**: `notifs-panel-prod-20260901`
- **Apunta a**: `8da3036` (último commit del sprint en `main`).
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/notifs-panel-prod-20260901`): ver push del turno de cierre.
- **Fecha del commit apuntado** (`git log --format=%ci -1 8da3036`): ver push del turno de cierre.

Fechas separadas por la regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

---

**Cierre**: sprint 100% ejecutado, en prod, smokes verdes, deuda anotada. El próximo sprint queda en cancha del PO — el auditor no arranca nada.
