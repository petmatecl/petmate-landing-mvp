# Sprint DEL-CUENTA-LEY — Kickoff (Tramo 2, post cue-1-fix)

**Fecha kickoff**: 2026-09-23 (aterrizado post sesión producto PO).
**Trigger legal**: Ley 21.719 Protección de Datos Personales (Chile), vigencia diciembre 2026.
**Insumo previo**: [`docs/producto/del-cuenta-ley-descubrimiento.md`](../producto/del-cuenta-ley-descubrimiento.md) + secciones 8 (puntos abiertos) y 9 (decisiones del PO).
**Modo**: PR abierto sin merge durante el Tramo 2 (viaje del PO 2026-09-29 → 2026-10-27). Merge post-regreso con QA del PO + revisión copy asesor legal.

---

## 0. Estado del arte

Ítem **CARNET-RETENCION** va **ANTES** de DEL-CUENTA-LEY dentro del Tramo 2. Ambos son sprints separados con PRs propios. La secuencia final del Tramo 2 acordada 2026-09-23:

1. `cue-1-fix` (fase A → reporte pre-fix → fix → PR abierto).
2. **CARNET-RETENCION** (kickoff propio abajo en §5, PR abierto).
3. **DEL-CUENTA-LEY** (este sprint, PR abierto).
4. Resto Tramo 2 (AUTH-LINK-PROPIO, botones, SHARE-PROV).

Cada sprint queda con PR abierto + acta committeada, sin merge hasta regreso PO.

---

## 1. Alcance del sprint DEL-CUENTA-LEY

**Anonimización preservando registros de negocio** — decisión PO 2026-09-23 §9.1.

### 1.1 Piezas de código

**Migration** `migrations/YYYYMMDD_del_cuenta_ley.sql`:
- Crear tabla `deletion_log` (`id UUID PK`, `deleted_user_id UUID`, `deleted_at TIMESTAMPTZ DEFAULT NOW()`, `deleted_by TEXT` (self|admin|cron), `data_summary JSONB`).
- Agregar valor `'eliminado_pendiente'` + `'eliminado'` al enum/check de `proveedores.estado`.
- Actualizar RPC `buscar_servicios` para filtrar `estado NOT IN ('eliminado_pendiente','eliminado','suspendido')`.
- Cambiar `conversations.client_id` y `conversations.sitter_id` de `CASCADE` a `SET NULL`.
- Cambiar `messages.sender_id` de `CASCADE` a `SET NULL`.
- Agregar FK `contactos.auth_user_id → auth.users(id) ON DELETE SET NULL` (hoy sin FK explícita — anexo B del descubrimiento).
- Agregar FK `preguntas.auth_user_id → auth.users(id) ON DELETE SET NULL` (idem).

**Endpoint** `pages/api/user/eliminar-cuenta.ts`:
- `POST` inicial (paso 1: solicitud): `verifySession` + insert row en `auth.users.raw_user_meta_data.deletion_requested_at = NOW()` + `proveedores.estado = 'eliminado_pendiente'` (si aplica) + email confirmación via Resend con enlace TTL 24h.
- `GET` con query `?token=<hash>` (paso 2: confirmación 24h): valida token, marca `deletion_confirmed_at = NOW()` en meta. Ventana de gracia 14 días desde este timestamp.
- `POST` con `?cancel=1` (paso 3 opcional: cancelación en gracia): remueve `deletion_requested_at` + revierte `proveedores.estado`.

**Cron** `pages/api/cron/procesar-eliminaciones-pendientes.ts`:
- Diario. `SELECT auth.users WHERE raw_user_meta_data->>'deletion_confirmed_at' < NOW() - INTERVAL '14 days'`.
- Por cada match: ejecuta el borrado real (fase 4 abajo) en transacción única + insert `deletion_log`.

**Cron adicional** para chat (mismo archivo o separado):
- `SELECT conversations WHERE (client_id IS NULL OR sitter_id IS NULL)` (una de las 2 partes ya se eliminó).
- Cross-check contra `agendamientos` para determinar "última reserva entre las 2 partes originales" — pero como una parte ya es NULL, esa info se pierde al momento del SET NULL. **Alternativa**: al hacer SET NULL, guardar `conversations.deleted_participant_at = NOW()` (columna nueva); cron borra donde `deleted_participant_at < NOW() - INTERVAL '6 months'`.

### 1.2 Fase 4 del endpoint (borrado real, ejecutado por cron diario tras 14 días)

En orden, transacción única:

1. **Anonimizar `usuarios_buscadores`** (si aplica): `nombre='(usuario eliminado)'`, `email=NULL`, `rut=NULL`, `codigo_referido=NULL`.
2. **Anonimizar `proveedores`** (si aplica): NULL en todas las columnas PII (ver §2.1 del descubrimiento). Marcar `estado='eliminado'`.
3. **Anonimizar snapshots en `agendamientos`** donde el user es el "otro lado" del par:
   - Si el user era el tutor: `mensaje=NULL`, `tutor_nombre='(cliente eliminado)'`, `direccion_servicio=NULL`, `calle=NULL`, `numero=NULL`, `direccion_info=NULL`.
   - Si era el proveedor: `nota_proveedor=NULL`.
4. **Borrar rows sin valor**:
   - `direcciones WHERE user_id = <deleted>`.
   - `favoritos WHERE user_id = <deleted>` (CASCADE ya lo cubre, redundante pero explícito para audit).
   - `notifications WHERE user_id = <deleted>` (CASCADE).
   - `mascotas WHERE user_id = <deleted> AND id NOT IN (SELECT mascota_id FROM agendamientos WHERE mascota_id IS NOT NULL)`. Si tiene reservas históricas, anonimizar el row en lugar de borrarlo.
5. **Anonimizar `evaluaciones`**: `nombre_autor='(Usuario eliminado)'`, `usuario_id=NULL`. Preservar `rating`, `comentario`, `respuesta_proveedor`. Si `evaluaciones.fotos[]` tiene URLs → borrar los binarios Storage + poner el array en `[]`.
6. **Anonimizar `consent_logs`**: `UPDATE consent_logs SET ip_address = NULL, user_agent = NULL WHERE user_id = <deleted>`. Preserva `document_version`, `timestamp`, `user_id` (UUID sin resolución humana).
7. **Chat**: `UPDATE conversations SET client_id = NULL, deleted_participant_at = NOW() WHERE client_id = <deleted>` (idem sitter_id). El cron de 6 meses barre después. `messages.sender_id` se pone en NULL por la FK ON DELETE SET NULL (aunque no borramos `auth.users` en este paso, la transición podría requerir UPDATE manual — ver §4 abajo).
8. **`eventos_tracking`, `reportes`, `referidos`, `feedback_submissions`**: `SET user_id = NULL` (ya son NO ACTION / SET NULL en el schema, verificar y forzar por safety en la transacción).
9. **Borrar binarios Storage**:
   - `proveedores.foto_perfil`, `foto_carnet`, `foto_carnet_dorso`, `galeria[]` → `supabase.storage.from('avatars').remove([...paths])`.
   - `mascotas.foto_mascota`, `fotos_galeria[]` → idem.
   - `servicios_publicados.fotos[]` para los servicios del proveedor eliminado (o solo anonimizar el titulo/descripcion y marcar `activo=false`, sin borrar fotos — decisión post-revisión legal).
   - `evaluaciones.fotos[]` de las reviews del user eliminado.
   - `certificaciones.documento_url` → cero preserva, borrar (documento personal del proveedor).
10. **Invalidar sesión de `auth.users`**: `admin.updateUserById(id, { ban_duration: '87600h' })` (10 años). NO borrar el row de `auth.users` — CASCADE explotaría los perfiles ya anonimizados; el ban es la vía correcta para "user no puede loguear más".
11. **Insert `deletion_log`** con `data_summary` JSON con contadores por tabla:
```json
{
  "usuarios_buscadores_anonimizados": 1,
  "proveedores_anonimizados": 0,
  "agendamientos_snapshots_anonimizados": 12,
  "direcciones_borradas": 2,
  "notifications_borradas_cascade": 47,
  "evaluaciones_anonimizadas": 3,
  "consent_logs_anonimizados": 5,
  "conversations_set_null": 4,
  "storage_paths_borrados": 8
}
```
12. **Email confirmación post-borrado** al email original (guardado antes del NULL en paso 1/2) via Resend. Single-shot.

### 1.3 UI

**`/usuario` → sección "Eliminar cuenta"** (`pages/usuario/index.tsx` o `pages/usuario/eliminar.tsx`):
- Warning modal 2 pasos: (a) explica qué se anonimiza/borra/preserva; (b) confirmación con checkbox "Entiendo que…" + botón rojo "Solicitar eliminación".
- **Bloqueo por Regla A**: si hay reservas activas (`estado IN ('pendiente','confirmada') AND fecha_preferida >= NOW()`), NO permite solicitar. Muestra copy explicativo + link a `/mis-reservas` para cancelar o esperar.
- Estado post-click: banner "Solicitud enviada, revisa tu correo (24h para confirmar)".
- Estado post-confirmación email: banner "Ventana de gracia hasta <fecha_+14d>. Puedes cancelar aquí." + botón "Cancelar eliminación".

**`/proveedor` → misma sección** con warnings específicos del proveedor:
- "Tu perfil se anonimiza y desaparece del catálogo".
- "Los reviews recibidos quedan sin nombre de tu cuenta".
- "Los agendamientos históricos preservan datos operativos (fechas, precios) sin tu identidad".
- Regla A también bloquea si tiene reservas activas como proveedor.

### 1.4 Templates email (`components/Emails/`)

- `AccountDeletionRequestedEmail.tsx`: subject "Confirma la eliminación de tu cuenta de Pawnecta", TTL enlace 24h, CTA "Confirmar eliminación", copy corto explicando la ventana de gracia 14 días post-confirmación.
- `AccountDeletionConfirmedEmail.tsx`: enviado post-confirmación del enlace 24h. Subject "Ventana de gracia activada — 14 días para cancelar si cambiaste de opinión".
- `AccountDeletionCompletedEmail.tsx`: enviado post-borrado real (día 14 desde confirmación). Subject "Tu cuenta de Pawnecta fue eliminada".
- `AccountDeletionCancelledEmail.tsx`: enviado si el user cancela en la ventana de gracia. Subject "Cancelaste la eliminación de tu cuenta".

Copy borrador en [`docs/producto/del-cuenta-copy.md`](../producto/del-cuenta-copy.md).

### 1.5 Tests

**Unitarios** (`lib/eliminar-cuenta.test.ts`):
- Bloqueo por Regla A (reservas activas).
- Anonimización de perfil.
- Anonimización de snapshots en agendamientos.
- Borrado condicional de mascotas (con/sin reservas históricas).

**E2E** (`e2e/specs/del-cuenta-ley/`):
- Flow tutor completo (solicitud → confirmación email vía `signupLink.ts` variante magiclink → ventana gracia → cancelación) + flow paralelo con espera 14d simulada (mock reloj o helper que fuerza el cron).
- Flow proveedor completo con verificación de desaparición del catálogo post-solicitud.
- Test P8 del cron `procesar-eliminaciones-pendientes` con seed de user marcado hace 15d.
- Test regla A: reserva activa → botón deshabilitado + copy correcto.

---

## 2. Migración incluye FKs faltantes anexo B

Del descubrimiento §7:
- `contactos.auth_user_id → auth.users(id) ON DELETE SET NULL`.
- `preguntas.auth_user_id → auth.users(id) ON DELETE SET NULL`.

Sin estas FKs, el paso 8 del borrado (SET user_id NULL en `eventos_tracking`, `reportes`, `referidos`, `feedback_submissions`) tiene que hacerse manual también para `contactos` y `preguntas` — más código en el endpoint sin cambio semántico. Agregarlas ahora es minimización.

---

## 3. Copy legal

Borrador en `docs/producto/del-cuenta-copy.md`. Estructura:
- Sección "Copy UI" (warnings modal, banners, botones).
- Sección "Copy email" (subject, preheader, body con placeholders `{nombre}`, `{fecha_borrado}`, `{enlace_confirmacion}`).
- Sección "Copy legal técnico" (política de privacidad / términos que mencionan el proceso).

**El PO lleva este documento al asesor legal** antes de habilitar en prod (post-regreso 2026-10-28).

---

## 4. Riesgos + edge cases documentados

1. **Chat cross-participant NULL race**: si tutor A y proveedor B eliminan sus cuentas dentro del mismo mes, `client_id` y `sitter_id` quedan ambos NULL. La row queda "conversación huérfana" que el cron de 6m tiene que barrer aunque `deleted_participant_at` sea de A o B, no mixto. Diseño de cron considera el primero.
2. **Bloqueo por reserva activa "en el borde"**: user con reserva `confirmada` fecha `NOW() + 1h` técnicamente activa. Se bloquea. UI dice "espera 1h a que se complete" o "cancela desde /mis-reservas". Aceptable.
3. **Doble solicitud**: user solicita eliminación → confirma email → cancela → vuelve a solicitar. Cada solicitud pisa la anterior (`deletion_requested_at` sobreescribe). Cero problema.
4. **Timeout del email de confirmación 24h**: si el user no confirma en 24h, la solicitud queda pendiente pero el cron nunca dispara (requiere `deletion_confirmed_at` populado). Al día 30 (arbitrario), otro cron limpia el `deletion_requested_at` (revierte a estado normal, envía email "Tu solicitud caducó, vuelve a solicitar si querés"). O el user simplemente vuelve a solicitar.
5. **Storage remove idempotente**: `supabase.storage.remove([paths])` no falla si un path no existe. Cero problema de re-runs.

---

## 5. Ítem paralelo · CARNET-RETENCION (sprint ANTES de DEL-CUENTA-LEY)

**Motivo**: minimización de datos. `foto_carnet` y `foto_carnet_dorso` son el dato **más sensible** del sistema (RUT + identidad visual). Solo sirven para verificar identidad una vez. Preservar el archivo indefinidamente post-aprobación es riesgo sin beneficio.

### 5.1 Alcance

**Cambio de código** en `components/Admin/ProveedorApprovalList.tsx:197-198` (transición admin `verificacion_estado` → `'aprobado'`):
- Post-UPDATE de `verificacion_estado='aprobado', rut_verificado=true`, **borrar binarios Storage** (`foto_carnet` + `foto_carnet_dorso` paths) + **UPDATE** `foto_carnet=NULL, foto_carnet_dorso=NULL`.
- Toast admin: "Proveedor aprobado. Carnet borrado por minimización de datos".

**Cron nuevo** `pages/api/cron/limpiar-carnets-viejos.ts`:
- Diario. Query: `SELECT id, foto_carnet, foto_carnet_dorso FROM proveedores WHERE verificacion_estado IN ('sin_enviar','rechazado','pendiente') AND foto_carnet IS NOT NULL AND (verificacion_actualizado_at IS NULL OR verificacion_actualizado_at < NOW() - INTERVAL '30 days')`.
- Por cada match: borrar Storage + UPDATE NULL.
- Log: contador de carnets borrados por corrida.

**Requiere columna `verificacion_actualizado_at`** en `proveedores` (si no existe) — timestamp de última mutación de `verificacion_estado`. Se popula desde el trigger de la tabla o desde el endpoint que hace el UPDATE.

### 5.2 Limpieza única prod (bloque SQL para el PO)

Antes de mergear el fix, correr en Studio prod:

```sql
-- VERIFICACIÓN PREVIA — cuántos proveedores aprobados tienen carnet todavía.
SELECT
  COUNT(*) FILTER (WHERE verificacion_estado='aprobado' AND (foto_carnet IS NOT NULL OR foto_carnet_dorso IS NOT NULL)) AS aprobados_con_carnet,
  COUNT(*) FILTER (WHERE verificacion_estado IN ('rechazado','sin_enviar') AND (foto_carnet IS NOT NULL OR foto_carnet_dorso IS NOT NULL)) AS otros_con_carnet,
  COUNT(*) FILTER (WHERE verificacion_estado='pendiente' AND (foto_carnet IS NOT NULL OR foto_carnet_dorso IS NOT NULL)) AS pendientes_con_carnet
FROM public.proveedores;

-- LISTA DE PATHS A BORRAR EN STORAGE (parseados desde las URLs)
-- Devuelve id proveedor + paths para pasarle al helper Storage
SELECT
  id,
  regexp_replace(foto_carnet, '^.*/storage/v1/object/(?:public/|sign/)?documents/', '') AS carnet_path,
  regexp_replace(foto_carnet_dorso, '^.*/storage/v1/object/(?:public/|sign/)?documents/', '') AS dorso_path
FROM public.proveedores
WHERE verificacion_estado='aprobado' AND (foto_carnet IS NOT NULL OR foto_carnet_dorso IS NOT NULL);

-- BLOQUE DE LIMPIEZA — solo tras (a) verificar los conteos, (b) borrar los
-- binarios Storage vía el helper (paths obtenidos arriba), (c) confirmar OK.
BEGIN;
UPDATE public.proveedores
   SET foto_carnet = NULL, foto_carnet_dorso = NULL
 WHERE verificacion_estado = 'aprobado'
   AND (foto_carnet IS NOT NULL OR foto_carnet_dorso IS NOT NULL)
RETURNING id, nombre, apellido_p;
COMMIT;

-- VERIFICACIÓN POSTERIOR
SELECT COUNT(*) AS post_aprobados_sin_carnet
FROM public.proveedores
WHERE verificacion_estado='aprobado' AND foto_carnet IS NULL AND foto_carnet_dorso IS NULL;
```

**Nota P6/P8**: el bloque debe ejecutarse con `SET LOCAL role='service_role'` para bypass del `proveedores_guard_fn` que protege columnas sensibles. `foto_carnet`/`foto_carnet_dorso` no aparecen en la lista de columnas del guard (verificado en la sección "UPDATE manual desde SQL Editor sobre columnas protegidas" del CLAUDE.md) — pero mejor curarse en salud con `SET LOCAL` en el bloque.

### 5.3 Auditoría prod pre-sprint

Antes de escribir el fix, el auditor debe correr el bloque `VERIFICACIÓN PREVIA` contra prod para tener las cifras exactas (cuántos carnets sobreviven hoy) y reportar al PO. Sin este número, el sprint no arranca con evidencia empírica.

---

## 6. Timing

- **Kickoff aterrizado**: 2026-09-23 (hoy).
- **Ejecución**: Tramo 2 (2026-09-29 → 2026-10-27), después de `cue-1-fix` + `CARNET-RETENCION`.
- **PR abierto sin merge**: durante todo el Tramo 2.
- **Merge**: post-regreso PO (2026-10-28+), con QA del PO + revisión copy asesor legal.
- **Vigencia legal**: diciembre 2026. Buffer de ~4 semanas entre merge y vigencia para soak + ajustes.

---

## 7. Preguntas abiertas para el asesor legal

Migradas a [`docs/producto/del-cuenta-preguntas-asesor.md`](../producto/del-cuenta-preguntas-asesor.md) para que el PO las lleve.
