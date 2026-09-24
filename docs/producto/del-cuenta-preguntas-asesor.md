# Preguntas para asesor legal — DEL-CUENTA-LEY

**Contexto**: Ley 21.719 de Protección de Datos Personales (Chile), vigencia diciembre 2026. Sprint técnico DEL-CUENTA-LEY en Tramo 2 (2026-09-29 → 2026-10-27), PR abierto sin merge hasta regreso PO 2026-10-28. Revisión asesor legal previa al merge y habilitación en prod.

**Estructura**: cada pregunta lleva (a) el contexto técnico del descubrimiento / kickoff, (b) la decisión que tomamos internamente con fundamento GDPR-precedente (Chile normalmente sigue precedente europeo), (c) la pregunta concreta al asesor.

---

## 1. Fundamento legal de la anonimización preservando registros de negocio

**Contexto**: FKs de `agendamientos` a `usuarios_buscadores` y `proveedores` están en `RESTRICT` (no CASCADE). Si eliminamos el user, las reservas históricas serían huérfanas o requerirían borrar también reservas — destruyendo historial del "otro lado" (proveedor pierde evidencia de servicios prestados; tutor pierde historial de servicios contratados).

**Decisión interna**: anonimizamos el perfil (nombre, email, RUT, fotos, etc → NULL) pero **preservamos el row** para que las FKs sigan válidas. En `agendamientos` anonimizamos los snapshots de PII (`tutor_nombre`, `mensaje`, `direccion_servicio`, `nota_proveedor`) pero preservamos fechas, precios, `estado`, `capacidad_snapshot_estadia`, etc.

**Fundamento GDPR** (precedente): art. 17.3 (b) permite excepción al derecho de supresión cuando "el tratamiento es necesario para el cumplimiento de una obligación legal" o "el ejercicio de derechos" — obligaciones contractuales entre partes califican.

**Pregunta al asesor**: ¿el patrón "anonimización preservando registros contractuales" (equivalente al patrón usado por Airbnb, MercadoLibre, etc. bajo GDPR) es aceptable bajo Ley 21.719 art. 8? ¿O el asesor recomienda un enfoque más estricto (borrado completo + FK CASCADE con impacto sobre el "otro lado")?

---

## 2. Preservación de reviews con autor anonimizado

**Contexto**: `evaluaciones` (reviews públicas) son parte del perfil visible del proveedor. Un review del tutor eliminado afecta la reputación pública del proveedor.

**Decisión interna**: **anonimizar el autor** (`nombre_autor = '(Usuario eliminado)'`, `usuario_id = NULL`) y **preservar rating + comentario** como historial público del proveedor. Patrón estándar TripAdvisor / Google Reviews / Airbnb.

**Pregunta al asesor**: ¿preservar reviews con autor anónimo cumple con el "derecho de eliminación"? Alternativa: borrar completo el review (pierde el proveedor la calificación pública). El compromiso comercial nuestro es preservar; buscamos confirmación legal.

---

## 3. Retención de `consent_logs`

**Contexto**: `consent_logs` guarda `user_id + document_version + timestamp + ip_address + user_agent` como evidencia de aceptación de términos y política de privacidad. La IP + UA es PII directa.

**Decisión interna**: al eliminar el user, **NO borramos la fila**; **NULLifamos `ip_address` y `user_agent`**, y **conservamos `user_id` (UUID que ya no resuelve a persona por el anonimizado del perfil), `document_version` y `timestamp`**. Motivo: evidencia interna de que ese user aceptó cierta versión de términos en cierta fecha, útil para compliance ante disputa futura.

**Pregunta al asesor**:
1. ¿Es aceptable conservar `user_id` UUID + `document_version` + `timestamp` sin PII directa como evidencia interna? Fundamento nuestro: el UUID sin cross-reference a otras tablas no permite identificar a la persona.
2. ¿Existe plazo máximo de retención específico chileno para este tipo de evidencia en plataformas B2C? (En GDPR el criterio es "el mínimo necesario para el propósito"; sin cifra fija.)

---

## 4. Retención de `deletion_log`

**Contexto**: tabla nueva del sprint. Guarda por cada eliminación completada: `deleted_user_id UUID`, `deleted_at TIMESTAMPTZ`, `deleted_by ENUM('self'|'admin'|'cron')`, `data_summary JSONB` (contadores por tabla anonimizada / borrada). Ninguna PII directa — solo el UUID del user y contadores.

**Decisión interna**: retener **sin plazo** (evidencia interna de cumplimiento de solicitudes de eliminación). El UUID sin cross-reference no identifica a la persona (los perfiles ya están anonimizados).

**Pregunta al asesor**: ¿aceptable retener `deletion_log` indefinidamente? ¿O sugiere plazo? Fundamento nuestro: es el equivalente al "libro de solicitudes atendidas" del responsable de tratamiento.

---

## 5. Retención del chat post-eliminación (6 meses)

**Contexto**: `conversations` y `messages` tienen 2 partes (client_id, sitter_id / sender_id). Cuando una parte elimina la cuenta, la contraparte sigue activa y podría necesitar el historial de conversación para orientarse en reservas pendientes.

**Decisión interna**: al eliminar user A → `client_id` (o `sitter_id`) = NULL en las conversaciones donde A era una parte + `messages.sender_id` = NULL en los mensajes que A envió. Nombre en render se muestra como `(Usuario eliminado)`. **Retención 6 meses desde la última reserva entre A y B** (usando `deleted_participant_at` timestamp que se guarda al SET NULL). Después cron los borra completamente.

**Pregunta al asesor**:
1. ¿La retención de 6 meses del contenido de mensajes (con sender anonimizado) es aceptable bajo el "derecho de eliminación"? Fundamento nuestro: la contraparte tiene interés legítimo en el historial de una interacción comercial reciente.
2. ¿Debemos ofrecer al user eliminado la opción de "borrar el chat inmediatamente" durante el flow de eliminación, con warning explícito de que la contraparte perderá el historial?

---

## 6. Retención de fotos de identidad (`foto_carnet`, `foto_carnet_dorso`)

**Contexto**: sprint separado **CARNET-RETENCION** (antes de DEL-CUENTA-LEY en Tramo 2). Hoy `proveedores.foto_carnet` + `foto_carnet_dorso` se guardan indefinidamente. Son el dato más sensible del sistema (RUT + foto de identidad).

**Decisión interna**: **borrar Storage + NULL en BD al aprobar** la verificación (transición admin `verificacion_estado='aprobado'`). Cron diario limpia los que quedan en `sin_enviar`/`rechazado`/`pendiente` después de 30 días sin acción. Limpieza única de las que ya existen en prod (aprobadas).

**Pregunta al asesor**:
1. ¿30 días es un plazo razonable para retener carnets no aprobados (`rechazado` o abandonados)? Alternativa: 15 días si prefiere más agresivo.
2. Post-CARNET-RETENCION, en el flow de DEL-CUENTA-LEY el `foto_carnet` ya no existe (fue borrada al aprobar). ¿Hay obligación de retener alguna evidencia de la verificación (ej. `verificacion_estado='aprobado'` + `verificacion_actualizado_at`)? Nuestra intención es preservar solo la marca administrativa sin el binario.

---

## 7. Plazo de respuesta al pedido de eliminación

**Contexto**: Ley 21.719 art. 12 (creo — confirmar cita exacta) establece plazo de 30 días para responder solicitudes del titular de datos.

**Nuestro flow**: envía confirmación por email **inmediata** al recibir la solicitud (paso 1), y confirmación de eliminación **inmediata** al completarse el borrado real (día 14 post-confirmación). Cubre ambos hitos con emails.

**Pregunta al asesor**:
1. ¿El plazo de 30 días es "desde solicitud hasta ejecución del borrado real" o "desde solicitud hasta respuesta al titular explicando qué se hará"? Nuestra ejecución real cae en día 14-15 (24h confirmación + 14 días gracia), dentro de los 30.
2. ¿Debemos incluir en el email `AccountDeletionCompletedEmail` el detalle exacto de qué se anonimizó vs qué se borró? Nuestro copy dice "según nuestra política de datos" con link — ¿alcanza o el asesor recomienda enumerar explícitamente?

---

## 8. Copy legal en política de privacidad

**Contexto**: fragmento nuevo para `pages/privacidad.tsx` describiendo el proceso de eliminación. Borrador en [`docs/producto/del-cuenta-copy.md`](del-cuenta-copy.md#3-copy-legal-técnico-fragmento-para-política-de-privacidad--términos) sección 3.

**Pregunta al asesor**: revisar el fragmento propuesto y sugerir cambios de terminología, alcance o precisión legal. En particular:
1. ¿Es preciso decir "anonimizamos (conservamos el registro sin tu identidad)"? Alternativa: "seudonimizamos" — hay diferencia legal precisa entre ambos términos bajo GDPR.
2. ¿La descripción de reservas históricas ("para que el proveedor conserve su historial de servicios prestados") es suficiente justificación? Alternativa: citar el fundamento explícito ("obligaciones contractuales entre las partes").

---

## 9. Bloqueo por reservas activas — fundamento legal

**Contexto**: nuestra UI bloquea la solicitud de eliminación si hay reservas activas (pendientes o confirmadas con fecha futura), explicando al user que primero debe cancelar o esperar.

**Fundamento nuestro**: Ley 21.719 art. 8 permite rechazar solicitudes cuando el tratamiento es "necesario para el cumplimiento de obligaciones legales o contractuales" — una reserva confirmada es contrato entre 2 partes.

**Pregunta al asesor**:
1. ¿Es defendible legalmente exigir "cancela primero o espera" como precondición? Riesgo: leerse como "negativa disfrazada del derecho de eliminación".
2. Alternativa: permitir la solicitud aún con reservas activas, y en el flow marcar automáticamente esas reservas como "canceladas por eliminación de cuenta" con notif al otro parte. ¿Esta alternativa es más limpia legalmente?

---

## 10. Auditoría del cumplimiento

**Contexto**: nuestro `deletion_log` es el registro interno. Sin registro externo (autoridad de control chilena — cuando esté designada bajo la Ley 21.719, presumiblemente Agencia de Protección de Datos).

**Pregunta al asesor**:
1. ¿Hay obligación de reportar solicitudes de eliminación a la autoridad de control chilena? ¿Con qué periodicidad y formato?
2. ¿Nuestro `deletion_log` internal es suficiente o el asesor recomienda formato externo (ej. reporte periódico automático a la agencia)?

---

---

## 11. Retención de eventos Sentry con IP + user.id (nueva 2026-09-24)

**Contexto**: PR #82 cue-1-sentry-user (mergeado 2026-09-23, release prod `330a89031367`) aterrizó `Sentry.setUser({ id })` en `contexts/UserContext.tsx`. Ahora cada event Sentry lleva UUID del user autenticado. Sentry SDK Next.js registra **`ip_address` automáticamente** (default `sendDefaultPii: true` en `@sentry/nextjs`) y **deriva geografía** en `Contexts → User → Geography` (país, región, ciudad).

**Estado actual**:
- `lib/sentryScrub.ts:beforeSend` hace scrub de JWT/emails/RUT/cookies del **payload del error**, pero **NO toca `event.user.ip_address` ni `contexts.geo`**.
- Retención default Sentry: 30 días issue browse + 90 días datos raw (verificar en dashboard Settings de la org).
- Cada event futuro trae: `user.id` (UUID interno, cross-reference a BD Pawnecta) + `ip_address` + geo → combinación reidentificable con acceso interno.

**Pregunta al asesor**:
1. ¿La combinación (`user.id` UUID + `ip_address` + geo) bajo retención Sentry configurable (30-90 días) requiere tratamiento equivalente a PII bajo Ley 21.719? Fundamento nuestro: el UUID sin acceso a la BD interna no identifica a la persona; la IP se resetea con la sesión ISP. Combinación es reidentificable **solo con acceso interno**.
2. ¿Es obligatorio scrub de IP en el `beforeSend` de Sentry, o retención acortada a X días es alternativa aceptable? Trade-off: geo por país/región sigue útil para debug (identificar regresiones específicas por zona); IP específica es PII más pura.
3. ¿Cuánto tiempo puede Sentry retener eventos con esta combinación bajo Ley 21.719 chilena? El default 90 días es europeo GDPR-style; ¿aplica el mismo criterio en Chile?
4. Al eliminar cuenta (DEL-CUENTA-LEY sprint), ¿debemos también **borrar todos los events Sentry del user.id borrado** proactivamente (via Sentry Data Deletion API)? Alternativa: dejar los events (con UUID que ya no resuelve a persona) hasta que Sentry los expira. Ver ítem BACKLOG SENTRY-PII (post-lanzamiento salvo indicación asesor).

**Nota operativa**: ítem BACKLOG `SENTRY-PII` (post-lanzamiento por default) queda subordinado a esta respuesta legal. Si el asesor indica scrub obligatorio de IP o retención acotada, sube a Tramo 2 pre-lanzamiento.

---

**Fin del listado**. Estas 11 preguntas cubren los puntos abiertos técnicos del sprint DEL-CUENTA-LEY + CARNET-RETENCION + SENTRY-PII (nueva). Cualquier respuesta del asesor legal que cambie los defaults técnicos requiere actualizar `docs/producto/del-cuenta-ley-descubrimiento.md` §9 (decisiones del PO) + [`docs/sprints/del-cuenta-ley.md`](../sprints/del-cuenta-ley.md) + `BACKLOG.md` SENTRY-PII antes del merge del sprint post-regreso PO (2026-10-28+).
