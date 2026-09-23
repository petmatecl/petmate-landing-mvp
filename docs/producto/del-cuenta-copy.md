# Copy DEL-CUENTA-LEY — borrador para revisión asesor legal

**Fecha borrador**: 2026-09-23.
**Estado**: borrador propio del auditor. **Revisión asesor legal obligatoria antes de habilitar en prod**.
**Regla lingüística**: español chileno tuteo (`tú/tu`, imperativos `elige`/`solicita`/`confirma`, nunca voseo). Sin emojis. Cero jerga interna (F1/F2/RPC/etc).
**Placeholders**: `{nombre}`, `{email}`, `{fecha_confirmacion}` (fecha click en el enlace 24h), `{fecha_borrado_real}` (fecha_confirmacion + 14 días), `{enlace_confirmacion}`, `{enlace_cancelacion}`.

---

## 1. Copy UI (`/usuario` y `/proveedor`)

### 1.1 Sección "Eliminar cuenta" en `/usuario`

**Título de la sección**:
> Eliminar mi cuenta

**Copy introductorio**:
> Si ya no quieres usar Pawnecta puedes solicitar la eliminación de tu cuenta. Es un proceso en tres pasos: solicitud, confirmación por correo dentro de 24 horas y ventana de gracia de 14 días para cancelar si cambias de opinión.

**Advertencia estructurada — qué pasa con tus datos**:

Tu cuenta y tus datos personales (nombre, correo, RUT, direcciones, fotos) se **eliminan** o **anonimizan** según su categoría:

- **Se eliminan de inmediato**: tus fotos guardadas, direcciones registradas, mensajes privados, notificaciones y favoritos.
- **Se anonimizan (queda el registro sin tu identidad)**: reservas históricas contigo (para que el proveedor conserve su historial de servicios prestados) y reviews que dejaste (para que el proveedor conserve las opiniones recibidas, sin tu nombre).
- **No podrás iniciar sesión nunca más** con este correo.

**Botón principal** (rojo, disabled si Regla A):
> Solicitar eliminación de mi cuenta

**Copy del bloqueo por Regla A** (aparece en lugar del botón si hay reservas activas):
> Tienes reservas activas que impiden eliminar la cuenta ahora. Cancela o espera a que se completen antes de continuar.
>
> [Ir a mis reservas]

### 1.2 Sección "Eliminar cuenta" en `/proveedor`

**Título de la sección**:
> Eliminar mi cuenta de proveedor

**Copy introductorio** (adaptado):
> Si ya no quieres ofrecer servicios en Pawnecta puedes solicitar la eliminación de tu cuenta. Es un proceso en tres pasos: solicitud, confirmación por correo dentro de 24 horas y ventana de gracia de 14 días para cancelar si cambias de opinión. Desde el momento de la solicitud, tu perfil desaparece del catálogo.

**Advertencia estructurada — qué pasa con tus datos de proveedor**:

- **Se eliminan de inmediato**: tu foto de perfil, galería, carnet de identidad (si aún está guardado), direcciones y mensajes privados.
- **Se anonimizan**: tus reviews recibidas (siguen visibles sin tu nombre, para preservar la reputación pública de la plataforma), tus reservas históricas con clientes (los clientes conservan su historial), tus certificaciones y tus servicios publicados quedan marcados como inactivos.
- **Se conservan por 6 meses después**: las conversaciones con clientes activos hasta esa fecha (sin tu nombre en los mensajes). Después se eliminan.
- **No podrás iniciar sesión nunca más** con este correo.

**Botón principal** (rojo, disabled si Regla A):
> Solicitar eliminación de mi cuenta de proveedor

**Copy bloqueo Regla A proveedor**:
> Tienes reservas activas con clientes que impiden eliminar la cuenta ahora. Responde a las pendientes o espera a que se completen las confirmadas antes de continuar.
>
> [Ir a mis reservas]

### 1.3 Modal de confirmación (2 pasos, tras click del botón)

**Paso 1 — advertencia**:

> **¿Seguro que quieres eliminar tu cuenta?**
>
> Vamos a enviarte un correo a `{email}` con un enlace para confirmar. Tienes 24 horas para hacer clic. Después empieza una ventana de gracia de 14 días en la que puedes cancelar la eliminación desde esta misma pantalla. Al cumplirse los 14 días, tus datos se eliminan y anonimizan según lo explicado arriba.
>
> [ ] Entiendo que este proceso no es inmediato y que puedo cancelar dentro de la ventana de gracia.
>
> [ ] Entiendo que después de los 14 días la eliminación es permanente y no puedo recuperar mi cuenta.
>
> [Cancelar]   [Enviar solicitud]

**Paso 2 — post-envío**:

> **Solicitud enviada**
>
> Revisa tu correo `{email}` en los próximos minutos. El enlace de confirmación vence en 24 horas. Si no lo encuentras, mira la carpeta de spam.
>
> [Volver a mi perfil]

### 1.4 Banners de estado en la sección

**Estado "solicitud enviada, esperando confirmación"** (0-24h post-solicitud):
> Solicitud de eliminación enviada a `{email}`. Confirma desde el correo antes de `{fecha_vencimiento_enlace}`.
>
> [Reenviar correo de confirmación]

**Estado "en ventana de gracia"** (post-confirmación, hasta día 14):
> Tu cuenta se eliminará el `{fecha_borrado_real}`. Puedes cancelar la eliminación aquí mismo hasta ese día.
>
> [Cancelar eliminación]

**Estado post-cancelación**:
> Cancelaste la eliminación de tu cuenta. Todo queda como antes.

---

## 2. Copy emails

### 2.1 `AccountDeletionRequestedEmail` (paso 1 → 2, click enlace 24h)

**Subject**:
> Confirma la eliminación de tu cuenta de Pawnecta

**Preheader** (texto de vista previa en bandeja):
> Recibimos tu solicitud. Confirma desde este correo dentro de 24 horas.

**Body**:

> Hola `{nombre}`,
>
> Recibimos tu solicitud de eliminar la cuenta asociada a este correo en Pawnecta.
>
> Para continuar, confirma tu solicitud haciendo clic en el botón dentro de las próximas 24 horas. Si no lo haces, la solicitud se cancela sola y tu cuenta sigue activa.
>
> **[Confirmar eliminación de mi cuenta]** `{enlace_confirmacion}`
>
> Después de confirmar, tienes una ventana de gracia de 14 días para cambiar de opinión desde tu perfil en Pawnecta.
>
> Si no fuiste tú, ignora este correo. Tu cuenta no se toca.
>
> — Equipo Pawnecta

**Footer legal**:
> Este correo se envió porque alguien con acceso a tu cuenta solicitó eliminarla. Si tienes preguntas sobre cómo tratamos tus datos, escribe a `contacto@pawnecta.com`.

### 2.2 `AccountDeletionConfirmedEmail` (post-click enlace 24h)

**Subject**:
> Ventana de gracia activada — 14 días para cancelar si cambias de opinión

**Preheader**:
> Confirmaste la eliminación. Tienes hasta `{fecha_borrado_real}` para cancelar.

**Body**:

> Hola `{nombre}`,
>
> Confirmaste la eliminación de tu cuenta de Pawnecta el `{fecha_confirmacion}`.
>
> Tu cuenta y tus datos se eliminarán definitivamente el `{fecha_borrado_real}` (14 días desde hoy). Hasta ese día puedes cancelar la eliminación desde tu perfil y todo queda como antes.
>
> **[Cancelar la eliminación]** `{enlace_cancelacion}`
>
> Recuerda: pasado el `{fecha_borrado_real}` la eliminación es permanente y no podemos recuperar tus datos.
>
> — Equipo Pawnecta

### 2.3 `AccountDeletionCompletedEmail` (post-borrado real, día 14)

**Subject**:
> Tu cuenta de Pawnecta fue eliminada

**Preheader**:
> Cumplimos con tu solicitud. Este es el último correo que recibirás.

**Body**:

> Hola `{nombre}`,
>
> Este es el último correo que te enviamos. El `{fecha_borrado_real}` se completó la eliminación de tu cuenta en Pawnecta, tal como solicitaste el `{fecha_confirmacion}`.
>
> - Tus datos personales fueron eliminados o anonimizados según nuestra política de datos.
> - Ya no puedes iniciar sesión con este correo.
> - Si quieres volver a Pawnecta en el futuro, tendrás que crear una cuenta nueva desde cero.
>
> Gracias por haber sido parte.
>
> — Equipo Pawnecta

**Footer legal**:
> Si crees que esta eliminación fue por error, escribe a `contacto@pawnecta.com` antes de 30 días para asistencia — algunos registros históricos anonimizados pueden ayudar a orientar el caso.

### 2.4 `AccountDeletionCancelledEmail` (user canceló dentro de la ventana)

**Subject**:
> Cancelaste la eliminación de tu cuenta

**Preheader**:
> Tu cuenta sigue activa como antes.

**Body**:

> Hola `{nombre}`,
>
> Cancelaste la eliminación de tu cuenta de Pawnecta. Todo sigue como antes: puedes iniciar sesión, ver tus reservas y usar la plataforma normalmente.
>
> Si esto fue un error o quieres retomar la eliminación, puedes hacerlo desde tu perfil en cualquier momento.
>
> — Equipo Pawnecta

---

## 3. Copy legal técnico (fragmento para política de privacidad / términos)

Para agregar a `/privacidad` (`pages/privacidad.tsx`) en una sección nueva "Derecho de eliminación":

> **Derecho de eliminación de tu cuenta**
>
> Puedes solicitar la eliminación de tu cuenta y de tus datos personales en cualquier momento desde tu perfil en Pawnecta, en la sección "Eliminar mi cuenta". El proceso tiene tres pasos:
>
> 1. Envías la solicitud desde tu perfil.
> 2. Confirmas desde un enlace que te enviamos por correo (24 horas para hacer clic).
> 3. Ventana de gracia de 14 días para cancelar si cambias de opinión. Al cumplirse los 14 días, la eliminación es permanente.
>
> Al eliminarse tu cuenta:
>
> - Eliminamos: tu perfil (nombre, correo, RUT, foto), tus direcciones registradas, tus mensajes privados, tus fotos, tus favoritos y tus notificaciones.
> - Anonimizamos (conservamos el registro sin tu identidad, para preservar el historial de servicios prestados por proveedores y la validez de reviews públicas): reservas históricas contigo, reviews que dejaste, evidencia de aceptación de términos.
> - No conservamos: registros de acceso (IP, navegador) asociados a tu cuenta más allá del historial mínimo necesario para nuestra operación.
>
> Si tienes reservas activas al momento de solicitar la eliminación, primero deberás cancelarlas o esperar a que se completen. La plataforma te avisará explícitamente en la interfaz.
>
> Si eres proveedor: tu perfil desaparece del catálogo desde el momento de la solicitud (no desde el borrado real), para que ningún cliente pueda contactarte en la ventana de gracia.
>
> Después de la eliminación no podemos recuperar tu cuenta. Si quieres volver a Pawnecta tendrás que crear una cuenta nueva desde cero.

---

## 4. Notas para el asesor legal

1. **Preservación de reviews con autor anónimo** (§1.2 arriba): confirmar si califica como "anonimización" bajo art. 8 Ley 21.719 o si el asesor recomienda borrado completo. El compromiso comercial es preservar (patrón estándar TripAdvisor/Airbnb).
2. **Preservación de snapshots en `agendamientos`** con datos operativos (fechas, precios, dirección del servicio anonimizada): confirmar si "obligaciones contractuales del otro parte" cubre la retención. GDPR art. 17.3 (b) lo permite; Chile normalmente sigue precedente europeo pero conviene confirmar.
3. **Retención de `consent_logs` con `user_id` UUID + `document_version` + `timestamp`** sin PII directa: es evidencia interna de aceptación de términos. Sin plazo legal específico chileno para plataformas B2C. **Pregunta al asesor**: ¿retención máxima recomendada?
4. **Retención de `deletion_log`**: sin plazo (registro anonimizado por definición, útil como evidencia interna de cumplimiento de solicitudes). ¿Aceptable?
5. **Copy de bloqueo por reservas activas**: confirmar que decir "primero deberás cancelar o esperar" cumple con la Ley (no puede leerse como "negativa del derecho de eliminación"). Nuestro fundamento: la Ley 21.719 art. 8 permite excepciones cuando el tratamiento es necesario para "el cumplimiento de obligaciones legales o contractuales" — una reserva confirmada es contrato entre partes.

---

**Fin del borrador**. El PO lo lleva al asesor legal antes de habilitar en prod (post-regreso 2026-10-28).
