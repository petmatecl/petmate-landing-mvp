# Inventario de correos automáticos en prod + journey de activación · 2026-11-10

**Pedido PO 2026-11-10** (post reporte campañas): mapa completo de correos automáticos existentes + propuesta de journey para proveedores/tutores a medio camino.
**Modo**: solo lectura (grep `resend.emails.send` + `vercel.json` + `pg_trigger`). Cero mutación.

## Endpoints API (on-demand)

| # | Endpoint | Dispara | Recipient | Frecuencia |
|---|---|---|---|---|
| 1 | `pages/api/auth/welcome` | signup success | Nuevo user | 1 por signup |
| 2 | `pages/api/admin/notify-nueva-solicitud` | tutor envía solicitud legacy F1 | Admin | 1 por solicitud |
| 3 | `pages/api/admin/notify-provider` | admin usa panel para contactar | Proveedor | On-demand admin |
| 4 | `pages/api/agendamientos/notify-proveedor` | tutor hace reserva | Proveedor | 1 por reserva |
| 5 | `pages/api/agendamientos/notify-tutor` | reserva creada | Tutor ("en revisión") | 1 por reserva |
| 6 | `pages/api/agendamientos/notify-tutor-reserva-confirmada` | proveedor confirma | Tutor | 1 por confirmación |
| 7 | `pages/api/agendamientos/notify-proveedor-cancel` | proveedor cancela | Tutor | 1 por cancelación |
| 8 | `pages/api/notifications/new-message` | INSERT en `messages` **si recipient no online** | Recipient | 1 por mensaje con recipient offline |
| 9 | `pages/api/evaluaciones/notify` | tutor publica reseña | Proveedor | 1 por review |
| 10 | `components/Emails/AprobacionProveedorEmail` | admin aprueba proveedor manual (legacy pre-badge-f1) | Proveedor | **Inactivo** desde auto-aprobación 2026-08-18 |

## Crons (programados, `vercel.json`, `skipIfNonProd` gate a prod)

| # | Cron | Horario UTC | Horario CLT | Recipient | Condición |
|---|---|---|---|---|---|
| 11a | `recordatorio-onboarding` **nudge "primer servicio"** | 0 14 * * * | 11:00 | Proveedor aprobado sin servicios | **Ventana 48h-7d desde `created_at`**. Marca `email_onboarding_at`. **Un solo envío por vida del usuario**. Subject: `${nombre}, tu perfil está aprobado. ¡Publica tu primer servicio!` (`recordatorio-onboarding.ts:76`). |
| 11b | `recordatorio-onboarding` **nudge "foto de perfil"** (segunda parte del mismo cron) | 0 14 * * * | 11:00 | Proveedor aprobado con `foto_perfil IS NULL` | Flag independiente `email_foto_at`. Un solo envío por vida. Subject: `${nombre}, agrega una foto a tu perfil` (`recordatorio-onboarding.ts:126`). Puede llegar junto al 11a si el proveedor cumple ambas condiciones el mismo día — exactamente lo que le pasó a Jorge Palominos 2026-11-06. |
| 12 | `recordatorio-mensajes` | 0 10 * * * | 7:00 | Proveedor con conv sin respuesta | Último mensaje del cliente >24h sin respuesta + sin recordatorio en 24h |
| 13 | `invitacion-resenas` | 0 11 * * * | 8:00 | Tutor post-reserva | Reserva `confirmada`, fecha + 24h pasó, `invitacion_resena_enviada_at IS NULL`, sin review previa |
| 14 | `recordatorio-reserva` | 0 22 * * * | 19:00 | Tutor + proveedor | 24h antes de la reserva confirmada. Doble marca independiente. |
| — | `cleanup-visitas-tracking` | 0 3 * * * | 0:00 | — | Data cleanup, cero email |
| — | `reset-visitas-mes` | 0 0 1 * * | — | — | Data reset, cero email |

## Triggers DB

14 triggers en `public.*`, todos **guard / audit / counter / timestamp**. **Cero trigger DB manda email**. Todo email pasa por Resend API vía endpoints Node.

## Templates sin uso productivo (candidatos a limpieza post-launch)

Grep de imports desde `pages/api/**` reveló 4 templates en `components/Emails/` sin caller productivo:

- **`WelcomeEmail.tsx`**: solo referenciado como mock en `lib/g1-cron-auth.test.ts:142`. El endpoint `pages/api/auth/welcome.ts` usa HTML inline + subject propio, no el template.
- **`NewMessageEmail.tsx`**: solo referenciado como mock en `lib/g1-cron-auth.test.ts:146` + `lib/g1-notifs-push-evals.test.ts:119`. El endpoint `pages/api/notifications/new-message.ts` usa HTML inline.
- **`AprobacionProveedorEmail.tsx`**: legacy pre-badge-f1 (auto-aprobación 2026-08-18), cero callers productivos.
- **`RechazoProveedorEmail.tsx`**: cero callers productivos, probablemente nunca se activó en prod.

Acción post-launch (BACKLOG `EMAIL-TEMPLATES-LIMPIEZA`): decidir si (a) borrar los 4 templates, (b) migrar los endpoints `auth/welcome` + `notifications/new-message` para usar los templates existentes (consistencia visual), (c) mantener como referencia futura.

## Verificación P8 — cron `recordatorio-onboarding` funciona en prod

| Grupo | Flag `email_onboarding_at` |
|---|---|
| Total proveedores reales (no ejemplo) | 20 |
| Con flag poblado (cron disparó) | **13** |
| Sin flag (cron nunca los alcanzó) | 7 |
| Earliest flag | 2026-05-16 |
| Latest flag | 2026-11-04 |

**Jorge Palominos** (signup 2026-11-03 16:54 CLT): `email_onboarding_at = 2026-11-06 11:00 CLT`. El cron lo cubrió en la ventana 48h-7d. Que no haya publicado post-nudge es decisión del user, no bug.

**Los 6 sin flag** (Veronica, Ignacia, Isidora, Francisca, Laura, Fernanda, registros marzo-junio 2026): **nunca recibieron el nudge**. El cron no existía o no corría en prod en sus ventanas respectivas. Son los más huérfanos → outreach manual tiene mayor expected recovery.

## Lo que NO existe hoy

- ❌ Re-nudge a **registrado sin confirmar email** (Supabase manda el "Confirm signup" 1 vez; si el user nunca lo clickea, cero re-nudge).
- ❌ Nudge a **confirmado sin publicar fuera de la ventana 48h-7d** del cron onboarding actual. Los 6 legacy quedan fuera para siempre.
- ❌ Nudge por **servicio desactivado** (proveedor desactivó servicio activo).
- ❌ Nudge por **sin entrar hace tiempo** (re-engagement por inactividad).
- ❌ Nudge a **tutor sin usar la app post-signup**.

## Journey de activación post-lanzamiento (decisión PO 2026-11-10)

**Alcance**: ampliar `recordatorio-onboarding` + crons nuevos. Post-lanzamiento 2026-11-18 + **se activa después del contacto manual del PO esta semana** (evita duplicar correos a los 8+Jorge que el PO contacta a mano). Backlog entry: `JOURNEY-ACTIVACION`, prioridad alta.

### 5 piezas del journey (en orden de prioridad)

1. **Confirmado sin publicar — días 14 y 30** (ampliación cron existente)
   - Modificar `recordatorio-onboarding` para soportar múltiples ventanas: día 14 y día 30 post-registro, con flags separados (`email_onboarding_d14_at`, `email_onboarding_d30_at`) para idempotencia independiente del envío de 48h-7d actual.
   - Contenido progresivamente más directo: día 14 "¿Necesitas ayuda para empezar?", día 30 "Te extrañamos — ¿qué te falta?".
   - Opt-out explícito en footer.
   - Estimación: 4-6 h (código + 2 emails + migración 2 columnas + tests).

2. **Correo sin confirmar — reenvío a las 24 h** (cron nuevo)
   - Cron diario que busca `auth.users WHERE email_confirmed_at IS NULL AND created_at BETWEEN now()-48h AND now()-20h AND resend_confirm_sent_at IS NULL` → reenvía `Confirm signup` vía `supabase.auth.admin.generateLink({type:'signup'})` + marca `resend_confirm_sent_at`.
   - Requiere columna nueva en `auth.users.raw_user_meta_data.resend_confirm_sent_at` o tabla propia `resend_confirmaciones` (no tocar `auth.users` columns).
   - Estimación: 4-6 h + 1 template email.

3. **Servicio desactivado — a los 7 días** (cron nuevo)
   - Cron diario. Busca `servicios_publicados WHERE activo = false AND updated_at < now() - 7d AND email_reactivacion_sent_at IS NULL`.
   - Email al proveedor: "Tu servicio '<titulo>' lleva 7 días desactivado — ¿lo pausaste o algo pasó?". CTA a reactivar + link al editor.
   - Marca `email_reactivacion_sent_at` para idempotencia.
   - Estimación: 3-4 h + 1 template.

4. **Sin entrar hace 30 días** (cron nuevo, re-engagement)
   - Cron diario. Busca `proveedores` + `usuarios_buscadores` donde `auth.users.last_sign_in_at < now() - 30 days AND email_reengagement_sent_at IS NULL`.
   - Email suave: "¿Volvemos a conectar? Esto pasó en Pawnecta esta semana" (trending services / categorías / proveedores).
   - Cadencia: 1 envío único por campaña mensual (no spamear).
   - Estimación: 5-7 h + 1 template dinámico.

5. **Tutores después** (análogo a proveedores)
   - Mismas 4 piezas para tutores: confirmación pendiente, inactivo post-signup sin búsqueda, sin contacto en 30 días, re-engagement.
   - Prioridad: **baja hasta tener tráfico tutor real** (hoy 7 registros proveedor en 60d, cero señal de tutores en el funnel medido).
   - Estimación cuando toque: 1-2 días completos.

### Precondición antes de activar

**Contacto manual PO esta semana** a los 9 proveedores sin servicios (8 legacy + Jorge). Una vez cerrado ese outreach, se activa el journey post-launch para NO duplicar correos.

### Opt-out y compliance

- Todo nudge debe incluir "Si no quieres recibir estos correos, [respondé STOP]" o link a preferencias.
- Agregar tabla `user_email_preferences` con flags por tipo (`onboarding_nudges`, `reactivation_nudges`, `reengagement`).
- Verificar política de privacidad vigente para mencionar los correos de activación en una nueva cláusula.
- Vinculado al sprint DEL-CUENTA-LEY post-launch (ya en BACKLOG) para que el borrado anonimice también las preferencias.
