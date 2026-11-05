# Plan de lanzamiento — noviembre 2026

**Decisión PO original**: 2026-09-22 (fecha tentativa 2026-11-11).
**Ajuste Tramo 3 kickoff**: 2026-11-05 (regreso del PO).
**Fecha lanzamiento**: **miércoles 2026-11-18**.
**Respaldo**: **miércoles 2026-11-25**.
**Freeze pre-launch**: **martes 2026-11-17 16:00 CLT**.

---

## Tramo 1 — hasta 2026-09-28 (PO en Chile, trabajo normal) · HISTÓRICO

**PO**:
- Responder DEL-CUENTA-LEY (las 10 preguntas).
- Decidir botones con el informe de J-2.
- Aprobar alcance de SHARE-PROV.

**Auditor**:
- J-4 con el orden acordado: **F2-3-CLEANUP → BELL-150 → cue-1 (P8 forzado) → conviene → resto**.
- **cue-1 es el reporte prioritario** — apenas se tenga, PO decide si CUE-1 sigue monitoreado o pasa a BLOQUEA.

Entregable al PO el 2026-09-28:
- Estado de J-4 (qué queda, qué merge-able, qué en hold).
- Resultado de cue-1 (con evidencia P8).
- Lista exacta de PRs que quedarán abiertos durante el viaje + dependencias entre sí.

Cierre Tramo 1: ejecutado. Ver `docs/sprints/entregable-2026-09-28.md`.

---

## Tramo 2 — 2026-09-29 al 2026-10-27 (viaje del PO) · HISTÓRICO

**CONGELAMIENTO DE PROD.** Ningún merge a `main` en este período. Cero
excepción por conveniencia operativa. Aplica a todos los PRs sin
distinción de tamaño ni urgencia percibida.

**Resultado observado al regreso (2026-11-05)**: congelamiento respetado
al 100%. Último commit a main `6f341df` del 2026-09-24. Cero merge
durante el tramo.

**Orden de trabajo original**:

1. **J-4** (si quedaba algo del Tramo 1).
2. **DEL-CUENTA-LEY**.
3. **AUTH-LINK-PROPIO**.
4. **Sprint visual de botones** (nombre exacto a definir tras la decisión PO de Tramo 1 sobre el informe J-2).
5. **SHARE-PROV**.

**Reglas del tramo**:
- **PR desactualizado respecto a otro** → rebase en orden (nunca merges
  cruzados de PRs abiertos).
- **Única excepción al congelamiento**: hotfix por incidente real en
  prod detectado por Sentry. Requiere:
  - OK explícito del PO por chat, en el turno vigente.
  - Rama `hf-<slug>` de vida corta.
  - Post-hotfix: reanudar congelamiento inmediato.

Ejemplos que NO son excepción: flake CI, warnings de dependencias, deuda
técnica descubierta, mejora "que conviene aterrizar ya", propuesta del
auditor sin request específico del PO, etc. Cero merge a main sin OK
literal del PO en el mismo turno.

Cierre Tramo 2: cero hotfix ejecutado. Cero merge. Los PRs #85, #87,
#84, #77, #86 quedaron abiertos listos para review post-regreso.

---

## Tramo 3 — 2026-11-05 al 2026-11-18 (regreso PO, ejecución pre-launch)

**Decisiones de alcance (PO 2026-11-05)**:

- **Críticos para 2026-11-18**: #85 cue-1-fix + triage CUE-1, merges
  ordenados de #87/#84/#77, SQL RPC-C lote 3, smokes golden path.
- **Objetivo (si el tiempo alcanza)**: DEL-CUENTA-LEY código (corte duro
  — ver abajo). Si es chico adicional: SHARE-PROV. Parche mínimo de
  observabilidad para `Error: Rejected` (captureException + contexto).
- **Post-lanzamiento (semana 19-30 noviembre o después)**:
  - **CARNET-RETENCION** completo (sale del scope de lanzamiento).
  - BUTTON-UNIF código.
  - AUTH-LINK-PROPIO.
  - #86 supajs-upgrade (post-launch, cero merge antes del 18-11).
  - SENTRY-TOAST completo (40 catches pendientes de `captureException`).

### Corte duro DEL-CUENTA-LEY

Si el **viernes 2026-11-13** el PR de DEL-CUENTA-LEY no tiene (a) 5/5
checks verdes, (b) QA del PO aprobada sobre el preview, entonces el
sprint **se diifere a la semana 19-30 noviembre** (post-lanzamiento,
dentro del plazo legal de la Ley 21.719 vigente desde diciembre 2026).

**Cero migración grande el lunes 16** si el corte duro aplica. El lunes
16 queda para smokes golden path + operativos.

### Precondición de migraciones grandes y SQL irreversible

Toda migración grande (DEL-CUENTA-LEY, cambio de CASCADE/SET NULL,
columnas nuevas con backfill) y todo SQL irreversible en prod:
**Supabase Pro activo + backup verificado**. Supabase Pro se activa
antes del lunes 2026-11-09 (acción del PO durante el fin de semana).
Sin Pro activo + backup verificado el lunes por la mañana, los sprints
que requieren migración grande quedan en hold.

### Plan día a día

**Jueves 2026-11-05** (hoy)
- Cierre de #72 y #69 sin merge con comentario.
- Rebase #85 sobre main (verificado que ya estaba al día — no se forzó push).
- Reporte al PO: #85 con 5/5 verde + preview URL para QA (2 tabs 5 min + logout).
- Ajustes a este plan + BACKLOG.md dentro de PR #77.

**Viernes 2026-11-06**
- Tras OK de QA del PO → **merge #85** + tag `cue-1-prod-20261106`.
- Arranque **ventana de observación CUE-1 48-72 h**: query Sentry cada
  24 h sobre events `user_context_stuck` / `hydrate_exhausted`,
  agrupados por `user.id`, filtrando los conocidos (`aff2a90d`,
  `0c2ab509`, cuentas E2E). Reporte diario al PO.
- **Rebase #87** (button-unif-doc) sobre main + merge tras checks verdes. Docs-only, cero riesgo.
- **Rebase #77** (auth-mail-phish) sobre main. Confirmación visual con
  el PO que los 6 templates docs del PR = los 6 aplicados en Supabase
  (comparación side-by-side `docs/auth/email-templates/*.md` ↔
  Dashboard). Tras OK → merge.
- **Rebase #84** (del-cuenta-docs) sobre main + merge tras checks verdes.
  Habilita el arranque del código DEL-CUENTA-LEY (precondición
  descubrimiento mergeado).

**Sábado 2026-11-07 — Domingo 2026-11-08**
- Ventana CUE-1 en observación (24 h y 48 h de los checkpoints).
  Reporte breve el sábado + domingo.
- **PO**: activación Supabase Pro + backup verificado (precondición
  lunes).
- **Auditor**: medición Lighthouse **solo lectura** sobre prod actual
  (home, explorar, ficha de servicio, perfil proveedor, dashboard
  proveedor, mis-reservas). Reporte entregado al PO el lunes 09
  mañana con hallazgos priorizados.
- Si cero events CUE-1 con `user.id` nuevo → cerrar como ruido del
  stale closure + clasificación vuelve a CONVIENE.
- Si aparecen events nuevos → kickoff investigación aparte, ajuste del
  plan día a día en el acto.

**Lunes 2026-11-09**
- Verificación: Supabase Pro activo + backup verificado. Sin eso, los
  frentes con migración grande quedan en hold y se replanifica.
- Reporte Lighthouse al PO → agendar fixes bloqueantes dentro del tramo.
- **Arranque DEL-CUENTA-LEY código**:
  - Verificación previa de columnas afectadas contra
    `information_schema` + `pg_constraint`.
  - Migración grande (`deletion_log` + enum `'eliminado_pendiente'` +
    `'eliminado'` en `proveedores.estado` + RPC `buscar_servicios`
    filter + `conversations.{client,sitter}_id` CASCADE → SET NULL +
    `messages.sender_id` idem + FKs nuevas `contactos.auth_user_id` y
    `preguntas.auth_user_id` SET NULL + columna
    `conversations.deleted_participant_at`).
- SQL **RPC-C Lote 3** en prod (bloque listo, 15 min + smoke).
- **Parche Error: Rejected** (1-2 h) — commit propio en rama corta, PR
  con 5/5 verdes, merge tras QA.

**Martes 2026-11-10**
- Si CUE-1 sigue sin events reales nuevos → clasificación formal
  cerrada.
- DEL-CUENTA-LEY: endpoint `pages/api/user/eliminar-cuenta.ts` (POST
  solicitud + GET confirmación + POST cancelación).
- Fixes Lighthouse bloqueantes identificados en el reporte del lunes.

**Miércoles 2026-11-11**
- DEL-CUENTA-LEY: UI `/usuario` y `/proveedor` con Regla A (bloqueo por
  reservas activas) + banners de estado.
- 4 templates email (`AccountDeletion{Requested,Confirmed,Completed,Cancelled}Email.tsx`).

**Jueves 2026-11-12**
- DEL-CUENTA-LEY: fase 4 del endpoint (borrado real anonimizado en
  transacción única, pasos 1-12 del kickoff).
- Cron diario `procesar-eliminaciones-pendientes.ts` + cron chat 6
  meses.

**Viernes 2026-11-13 — Corte duro DEL-CUENTA-LEY**
- Tests unitarios (`lib/eliminar-cuenta.test.ts`) + e2e
  (`e2e/specs/del-cuenta-ley/`).
- PR DEL-CUENTA-LEY con 5/5 verdes.
- **Si el PR no está 5/5 verde + QA del PO aprobada en preview al
  cerrar el viernes** → corte duro activo: DEL-CUENTA-LEY se diifere a
  semana 19-30 noviembre. Lunes 16 queda para smokes + operativos.
- SHARE-PROV se evalúa recién después de este corte (si DEL-CUENTA-LEY
  cerró viernes + sobra margen).

**Sábado 2026-11-14 — Domingo 2026-11-15**
- Buffer. Si SHARE-PROV aprobado como objetivo → PR + checks + QA +
  merge durante el sábado.
- Revisión de reportes DMARC acumulados en `dmarc-reports@pawnecta.com`
  (Zoho). Decidir con el PO si se sube `_dmarc.pawnecta.com` a
  `p=reject` antes del freeze del martes.

**Lunes 2026-11-16 — Smokes + operativos**
- **Smokes golden path** (día completo):
  - Proveedor: registro → perfil → publicar servicio → agenda F1/F2 →
    recibir solicitud → confirmar.
  - Tutor: búsqueda → ficha → reserva F1 → reserva F2 → cancelación →
    reseña → mis-reservas.
  - Admin: aprobar proveedor → moderar review → revisar notifs.
- **PO en paralelo**:
  - CARTO API key aplicada en Vercel (Production + Preview +
    Development) + redeploy + smoke sin marca de agua.
  - Teléfono de Eduardo (perfil prod).
  - Nicole cuenta vieja (decisión consolidar o preservar).
  - 5 proveedoras reactivadas.

**Martes 2026-11-17 — Freeze**
- **Mañana**: revalidación Lighthouse (solo revalida los targets de los
  fixes aplicados). Cero medición nueva — solo confirmación que las
  mejoras tomaron efecto.
- DMARC: aplicar `p=reject` si los reportes acumulados vienen limpios
  (decisión PO del fin de semana).
- Ventana CUE-1 cierra formalmente (observación de 10 días post-#85).
- **16:00 CLT**: **freeze pre-launch**. Cero merge entre freeze y
  lanzamiento salvo hotfix por Sentry alerta real.
- Checklist final de lanzamiento (archivo nuevo
  `docs/sprints/lanzamiento-20261118.md`): deploy prod healthy, Sentry
  quieto, crons funcionando, emails Resend OK, Supabase Pro activo,
  CARTO sin marca, DMARC en orden, 5 proveedoras visibles en catálogo.

**Miércoles 2026-11-18 — Lanzamiento**
- Checklist de lanzamiento ejecutado punto por punto con evidencia.
- Comunicación tuya (canales que decidas).
- Monitoreo activo primeras 4 h: Sentry + Vercel logs + Supabase
  dashboard.

---

## Post-lanzamiento (semana 19-30 noviembre o después)

Ítems que salen del scope de lanzamiento 2026-11-18:

- **CARNET-RETENCION** completo (ver `docs/sprints/del-cuenta-ley.md §5`
  para alcance confirmado + decisión nueva PO Tramo 3 kickoff: el cron
  borra únicamente `verificacion_estado IN ('rechazado','sin_enviar')`
  con > 30 días; para `pendiente` > 30 días **notifica al admin**
  en vez de borrar, para evitar que se pierda un carnet en revisión
  pendiente).
- **DEL-CUENTA-LEY** (si el corte duro del viernes 13-11 aplica —
  dentro del plazo legal de la Ley 21.719, vigencia diciembre 2026).
- **BUTTON-UNIF** código (rama de implementación sobre #87 docs ya
  mergeado).
- **AUTH-LINK-PROPIO**.
- **SHARE-PROV** (si no cerró el fin de semana 14-15).
- **#86 supajs-upgrade** (post-launch, cero merge antes del 18-11).
- **SENTRY-TOAST completo** (40 catches pendientes de
  `captureException`).

---

## Riesgos que miden contra el 18-11

1. **CUE-1 destapa bug real** post-merge #85 (users distintos del PO
   con `user.id` en Sentry). Mitigación: DEL-CUENTA-LEY código pasa a
   semana 19-30, se ganan 3 días hábiles para investigar.
2. **Supabase Pro + backup no verificado al lunes 09-11 mañana**.
   Mitigación: DEL-CUENTA-LEY no arranca; se replanifica la semana en
   el acto.
3. **Smokes golden path revelan regresión del tren post-viaje**.
   Mitigación: lunes 16 es el día de smokes. Bug blocker → se pospone
   al respaldo miércoles 2026-11-25.
4. **Lighthouse revela regresión de performance severa** (LCP > 3s
   móvil). Mitigación: fixes se agendan con la información del lunes
   09; si son más grandes que lo estimado, los bloqueantes se
   diifieren a post-launch.

---

## Regla operativa de este plan

Toda decisión que aparezca durante el Tramo 3 que empuje a merge
autónomo o "solo esto", requiere OK literal del PO en el turno vigente.
Aplica aun bajo presión de calendario cerca del lanzamiento. Bajar el
umbral del "solo esto" cerca del freeze es donde se rompen los
lanzamientos reales.

## Trazabilidad

Este plan se refleja también al tope de `BACKLOG.md > PEDIDOS DIRECTOS
DEL PO` para que sea lo primero visible al abrir cualquier menú de "¿con
qué seguimos?".
