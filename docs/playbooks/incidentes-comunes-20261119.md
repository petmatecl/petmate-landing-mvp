# Playbook incidentes comunes — 2026-11-19

**Audiencia**: PO · **Autor**: auditor.
**Uso**: cuando un user reporta un bug en vivo, abrir este doc en el escenario que aplica. Objetivo: diagnosticar + decidir (fix, N1 rollback, workaround) en <15 min.
**Convención SQL**: todas las queries son **read-only**. El PO las ejecuta en SQL Editor prod cuando acepta. El auditor NO ejecuta nada contra prod sin GO explícito.

---

## Escenario A — Proveedor reporta "no puedo publicar un servicio nuevo"

### Síntoma típico

User (proveedor) escribe a `hola@pawnecta.com` o IG DM: "Intento publicar un servicio y no se guarda" / "Me sale error" / "Nada pasa cuando aprieto Publicar" / "Se queda cargando".

### Paso 1 — recopilar info del reporter (2 min)

Responder con 3 preguntas específicas:

> Hola {nombre}, gracias por avisarnos. Para destrabarte rápido necesitamos:
>
> 1. ¿Qué categoría de servicio? (paseos, cuidado, veterinario, etc.)
> 2. ¿En qué paso del formulario falla? (el botón "Publicar" no responde, aparece un mensaje de error rojo, se queda cargando, otra)
> 3. ¿Desde qué dispositivo y navegador? (ej. iPhone Safari, Chrome en PC)
>
> Si puedes, mándanos una captura de pantalla.

### Paso 2 — identificar al user en prod (2 min)

**SQL diagnóstico Q-A1**:

```sql
SELECT p.id AS proveedor_id,
       p.auth_user_id,
       p.nombre || ' ' || COALESCE(p.apellido_p, '') AS nombre,
       p.estado,
       p.verificacion_estado,
       p.created_at AS registrado,
       p.updated_at AS ultima_act,
       au.email,
       au.last_sign_in_at
  FROM public.proveedores p
  JOIN auth.users au ON au.id = p.auth_user_id
 WHERE au.email ILIKE '{email_del_user}'
 LIMIT 1;
```

Verificar:
- `estado = 'aprobado'` → user puede publicar.
- `estado = 'pendiente'` → cuenta legacy; auto-aprobación badge-f1 ya no deja estos. Un UPDATE manual (PO aprobó) resuelve.
- `estado = 'suspendido'` → cuenta suspendida por moderación. **No** debería poder publicar (correcto). Confirmar con PO si fue error.

**SQL diagnóstico Q-A2 — servicios del user y último intento**:

```sql
SELECT s.id, s.titulo, s.activo,
       c.slug AS categoria,
       s.created_at,
       s.updated_at,
       s.agendamiento_habilitado
  FROM public.servicios_publicados s
  JOIN public.categorias_servicio c ON c.id = s.categoria_id
  JOIN public.proveedores p ON p.id = s.proveedor_id
 WHERE p.auth_user_id = '{auth_user_id_del_paso1}'
 ORDER BY s.created_at DESC
 LIMIT 5;
```

Verificar:
- Si el último registro tiene `created_at` reciente (minutos) → el INSERT llegó. El user puede ver el servicio pero quizás no sabe dónde.
- Si no hay nada reciente → el INSERT no ocurrió. Bug en client o endpoint.

### Paso 3 — correlacionar con logs Vercel (3 min)

- Vercel → Logs → filter por email del user o timeframe específico (±5 min alrededor del reporte).
- Buscar POSTs a endpoints `/rest/v1/servicios_publicados` o `/api/proveedor/servicios/*`.
- Response status: 2xx (OK, el INSERT llegó) / 4xx (validación client) / 5xx (bug server).

### Paso 4 — correlacionar con Sentry (2 min)

- Sentry → Issues → filter `user.email: {email}` o `user.id: {auth_user_id}` + timeframe reciente.
- Si aparece un issue con stack trace en `ServiceFormModal.tsx` o `api/proveedor/*` → bug del cliente/endpoint identificado.

### Decision tree

```
¿SQL Q-A2 muestra servicio reciente creado?
├── SÍ
│   └── ¿El user dice "nada pasa al apretar Publicar"?
│       ├── SÍ → bug de UX: tras INSERT exitoso, no hay toast ni redirect visible
│       │   Workaround al user: "Tu servicio ya está publicado, lo encuentras en tu panel en /proveedor.
│       │                        Vamos a mejorar la confirmación en los próximos días."
│       │   Fix: agregar toast.success + redirect a /proveedor tras POST OK. Sprint hotfix.
│       └── NO → preguntar al user qué ve exactamente.
├── NO
│   └── ¿Sentry tiene issue con user.id del reporter?
│       ├── SÍ → fix según stack trace. Escalar al auditor para diagnóstico.
│       │       Si bug es del PR deploy del día → considerar N1 rollback.
│       └── NO
│           └── ¿Vercel Logs tiene response 4xx con validación?
│               ├── SÍ → mensaje del user falló validación client.
│               │       Responder al user: "Hay un campo que necesita completarse: {X}.
│               │                            Prueba agregándolo y vuelve a intentar."
│               └── NO → caso "user confundido" o problema de red cliente.
│                   Pedir al user screenshot + hacer F12 → Network para capturar request.
```

### Criterios de escalamiento

- Si 2+ users reportan el mismo síntoma en <1h → bug sistémico. Investigar con prioridad alta + considerar rollback.
- Si el bug es nuevo (post deploy del día) → N1 rollback candidato.
- Si el bug es pre-existente + afecta <5% de users → fix en hotfix del día siguiente.

---

## Escenario B — Tutor reporta "una reserva no llegó al proveedor"

### Síntoma típico

User (tutor) escribe: "Reservé el servicio X y el proveedor dice que no le llegó" / "No recibí el email de confirmación" / "El proveedor no responde desde ayer".

### Paso 1 — recopilar info del reporter (2 min)

Preguntas:

> Hola {nombre},
>
> 1. ¿A qué proveedor reservaste? (nombre del proveedor o título del servicio)
> 2. ¿Qué día hiciste la reserva? (fecha + hora aproximada)
> 3. ¿Recibiste email de confirmación en tu bandeja (incluyendo spam)?

### Paso 2 — identificar la reserva en prod (3 min)

**SQL diagnóstico Q-B1**:

```sql
SELECT a.id AS reserva_id,
       a.estado,
       a.fecha_preferida,
       a.created_at,
       a.updated_at,
       a.respondido_at,
       pr.nombre AS proveedor,
       au_prov.email AS proveedor_email,
       au_tut.email AS tutor_email,
       s.titulo AS servicio
  FROM public.agendamientos a
  JOIN public.proveedores pr ON pr.id = a.proveedor_id
  JOIN auth.users au_prov ON au_prov.id = pr.auth_user_id
  JOIN public.usuarios_buscadores t ON t.id = a.tutor_id
  JOIN auth.users au_tut ON au_tut.id = t.auth_user_id
  JOIN public.servicios_publicados s ON s.id = a.servicio_id
 WHERE au_tut.email = '{email_tutor}'
 ORDER BY a.created_at DESC
 LIMIT 5;
```

Verificar:
- Reserva aparece → INSERT exitoso.
- `estado = 'pendiente'` + `respondido_at IS NULL` → proveedor no respondió aún (pendiente legítimo).
- `estado = 'pendiente'` + `created_at` reciente (minutos) → esperable.
- `estado = 'pendiente'` + `created_at` hace >24h → proveedor ignoró / no vio.

### Paso 3 — verificar envío del email al proveedor (3 min)

Resend Dashboard → Emails → filter por email del proveedor + timeframe.

Buscar el email con subject "Nueva solicitud de reserva en Pawnecta" o "Nueva reserva confirmada en Pawnecta" con timestamp ±5 min del `created_at` de la reserva.

Estados posibles:
- **Delivered** → email llegó al MTA del proveedor. Puede estar en spam o el proveedor no lo vio.
- **Bounced** → email del proveedor rebotó. Verificar si fue typo al registrarse.
- **Rejected** → Resend lo rechazó (política de spam, etc.).
- **No existe fila** → el envío NO ocurrió. Bug en el endpoint.

### Paso 4 — si no hay fila en Resend (5 min)

**SQL diagnóstico Q-B2 — logs Vercel del endpoint `/api/agendamientos/notify-proveedor`**:

- Vercel Logs → filter por `agendamientoId = {id de Q-B1}` + timeframe.
- Buscar línea `[notify-proveedor] recibido` seguida de `[notify-proveedor] enviado` o `[notify-proveedor] catch error` o `[notify-proveedor] agendamiento no encontrado`.

Patrones:
- `recibido` + `enviado` + Resend sin fila → bug entre response del endpoint y entrega real. **Raro**.
- `recibido` + `catch error` → endpoint falló post INSERT. Investigar error.
- `recibido` + `skipped: true, reason: 'no_email'` → auth.admin.getUserById falló o email del proveedor vacío.
- Solo `recibido` sin siguiente línea → endpoint timeout mid-execution. Bug infra.
- NO aparece `recibido` → el cliente del tutor no llamó al endpoint. Bug en `SolicitarAgendamientoModal.tsx:826`.

### Decision tree

```
¿Q-B1 muestra reserva existente?
├── NO → el INSERT nunca ocurrió. Reproducir con el tutor (user no puede reservar o bug del picker).
│        Workaround: pedir que vuelva a intentar + capturar F12 → Network.
├── SÍ
│   └── ¿Resend tiene fila con timestamp ~created_at?
│       ├── NO → endpoint falló. Ver Q-B2.
│       │       Fix: notificar manual al proveedor por chat/WhatsApp + fix endpoint.
│       │       Respuesta al tutor: "Tu reserva sí llegó, pero tuvimos un problema
│       │                            notificando al proveedor. Ya le avisamos
│       │                            directamente, te responde pronto."
│       ├── SÍ Delivered
│       │   └── El email llegó. El proveedor no lo vio (spam o distracción).
│       │       Workaround: avisar al proveedor por chat/WhatsApp.
│       │       Respuesta al tutor: "El email sí salió hacia {proveedor} el día {X}.
│       │                            Le estamos avisando por otro canal, te confirma pronto."
│       ├── SÍ Bounced → email del proveedor inválido. Problema estructural.
│       │       Respuesta al tutor: "Hay un problema con el email de contacto de {proveedor}.
│       │                            Lo contactamos directamente por chat para destrabar."
│       │       Followup: avisar al proveedor en Pawnecta chat + marcar user email_bounced.
│       └── SÍ Rejected/Complained → investigar manual.
```

### Criterios de escalamiento

- Si 2+ tutores reportan emails no llegando al mismo proveedor → cuenta de ese proveedor con problema (email inválido o blacklist).
- Si 2+ reportes de distintos proveedores en <1h → problema sistémico con Resend. Verificar Resend status page.
- Si el reporte incluye "ya pasó la fecha del servicio" → caso crítico, resolver manual + ofrecer reembolso si aplica.

---

## Escenario C — Chat de un flow específico está roto para un subset de users

### Síntoma típico

User reporta: "Abrí el chat con {proveedor} y me sale error" / "Mensajes no se envían" / "No veo mis conversaciones" / "El chat está en blanco" / "Se cuelga cargando".

### Paso 1 — recopilar info (2 min)

Preguntas:

> Hola {nombre},
>
> 1. ¿Con qué proveedor intentas chatear? (nombre o título del servicio)
> 2. ¿Qué ves en pantalla? (nada, loading infinito, mensaje de error, otros mensajes pero el tuyo no sale)
> 3. ¿Lo intentaste desde móvil o escritorio? ¿Qué navegador?
> 4. ¿Puedes refrescar la página (F5) y ver si cambia?

### Paso 2 — identificar user + conversación (3 min)

**SQL diagnóstico Q-C1**:

```sql
SELECT c.id AS conversation_id,
       c.client_id,
       c.sitter_id,
       c.proveedor_auth_id,
       c.agendamiento_id,
       c.created_at AS conv_creada,
       (SELECT COUNT(*) FROM public.messages m WHERE m.conversation_id = c.id) AS msgs_total,
       (SELECT MAX(created_at) FROM public.messages m WHERE m.conversation_id = c.id) AS ultimo_msg
  FROM public.conversations c
 WHERE (c.client_id = (SELECT id FROM auth.users WHERE email = '{email_user}')
     OR c.sitter_id = (SELECT id FROM auth.users WHERE email = '{email_user}'))
 ORDER BY c.created_at DESC
 LIMIT 10;
```

Verificar:
- Si retorna 0 filas → user no tiene conversaciones. Puede que esté intentando abrir una nueva (ver escenario C.1 abajo).
- Si retorna filas con `proveedor_auth_id = NULL` → backfill pendiente post-sábado (debería estar resuelto ya al 25-11).
- Si retorna fila específica pero `msgs_total = 0` → chat abierto sin mensajes (user puede estar en lazy-create, correcto post-sprint CHAT-LAZY-CREATE).

### Paso 3 — correlacionar con Sentry (2 min)

Sentry → Issues → filter `user.email: {email_user}` + path contains `messages` o `conversations` o `Chat` o `MessageThread`.

Buscar issues recientes con stack trace en `components/Chat/*` o `pages/mensajes/*`.

### Paso 4 — correlacionar con Vercel Logs (2 min)

Vercel Logs → filter por `conversation_id = {del Q-C1}` o path `/api/messages/*` o `/api/notifications/new-message` + timeframe reciente.

Buscar 5xx en response status.

### Decision tree

```
¿Síntoma = "no veo mis conversaciones"?
├── SÍ
│   └── ¿Q-C1 retorna 0 filas?
│       ├── SÍ → user efectivamente no tiene convs. ¿Está en el flow correcto?
│       │        Preguntar al user: "¿Ya iniciaste una conversación o intentas abrir una nueva?"
│       └── NO → bug del client (fetch no trae las convs). Investigar en Sentry/Vercel.
│                Workaround: user hace F5 (fuerza nuevo fetch).
├── ¿Síntoma = "mensajes no se envían"?
│   └── Q-C1 confirma conv existe + Sentry sin issues
│       └── Bug específico envío. Investigar POST `/rest/v1/messages` en Vercel Logs.
│             Workaround: user hace F5 + reintenta. Si persiste, bug real escalar.
├── ¿Síntoma = "chat en blanco / loading infinito"?
│   └── Bug conocido del kill-switch pendiente en MessageThread (ver docs/auditorias/error-handling-20261119.md #4).
│         Workaround: F5 fuerza re-mount. Fix estructural post-launch.
│         Respuesta al user: "Prueba refrescar (F5). Si sigue igual, cuéntanos qué navegador usas."
└── ¿Síntoma = "Algo salió mal" (error boundary)?
    └── Sentry tendrá el stack. Si es nuevo post-deploy del día → N1 candidato.
          Si pre-existente → fix en hotfix.
```

### Sub-escenario C.1 — "abrí el chat con {proveedor} y me sale error" (chat nuevo)

User tiene 0 conversaciones existentes y intenta iniciar una nueva.

Verificar contra `pages/servicio/[id].tsx` → click "Contactar" → debería (post-CHAT-LAZY-CREATE) abrir el modal sin crear conversation hasta que envíe el 1er mensaje.

Si el user ve error al hacer click en "Contactar" → bug en el flow lazy-create (regresión reciente).

**SQL diagnóstico Q-C2**:

```sql
-- Verificar RLS de conversations permite INSERT del user
SELECT has_table_privilege('authenticated', 'public.conversations', 'INSERT') AS puede_insertar;
```

Esperado: `true`. Si `false`, policy RLS mal configurada.

### Sub-escenario C.2 — "no recibo notificaciones de chat"

User tiene conversación activa + espera notificación de nuevo mensaje pero no llega.

**SQL diagnóstico Q-C3**:

```sql
SELECT conversation_id,
       message_id,
       created_at,
       user_id AS receiver,
       read_at
  FROM public.notifications
 WHERE user_id = (SELECT id FROM auth.users WHERE email = '{email_user}')
   AND type = 'new_message'
 ORDER BY created_at DESC
 LIMIT 10;
```

Verificar si `/api/notifications/create` está creando filas + si Resend envió email.

### Criterios de escalamiento

- Si 3+ users reportan "no veo conversaciones" en <30 min → bug sistémico en fetch de conversations. Alerta alta.
- Si 1 user reporta pero el user es admin / proveedor con alto volumen → fix prioritario, puede afectar su operación.
- Si el síntoma coincide con deploy del día → N1 rollback candidato.

---

## Escenario default — bug reportado que no cae en A/B/C

### Paso 1 — recopilar (2 min)

Preguntas estándar:

> Hola {nombre},
>
> Para destrabarte rápido:
>
> 1. ¿Qué intentabas hacer?
> 2. ¿Qué pasó en vez de lo esperado?
> 3. ¿Desde qué dispositivo y navegador?
> 4. ¿Puedes mandarnos una captura?

### Paso 2 — identificar al user

**SQL universal Q-D1**:

```sql
SELECT au.id AS auth_user_id,
       au.email,
       au.last_sign_in_at,
       au.created_at,
       CASE
         WHEN p.id IS NOT NULL THEN 'proveedor'
         WHEN ub.id IS NOT NULL THEN 'tutor'
         ELSE 'auth-only'
       END AS rol,
       p.estado AS proveedor_estado
  FROM auth.users au
  LEFT JOIN public.proveedores p ON p.auth_user_id = au.id
  LEFT JOIN public.usuarios_buscadores ub ON ub.auth_user_id = au.id
 WHERE au.email = '{email_user}'
 LIMIT 1;
```

### Paso 3 — abrir Sentry + Vercel Logs filtrados por el user

Mismo patrón que arriba.

### Paso 4 — reproducir local si posible

- Si el bug es en una ruta pública (/explorar, home, ficha), reproducir en staging con cuenta de test.
- Si es en ruta autenticada, reproducir en staging con cuenta E2E Camila/Aldo.

### Regla de oro

Si tras 15 min no se identificó la causa:

1. Responder al user con un mensaje de contención:
   > "Estamos revisando lo que nos reportaste. Te confirmamos resolución en las próximas 2 horas. Mientras tanto, {workaround alternativo si aplica}."

2. Escalar al auditor en chat con:
   - Email + auth_user_id del user.
   - Descripción del síntoma.
   - Links a Sentry issue + Vercel log relevantes.
   - Timestamp.

3. Si tras 2h no hay fix + no hay workaround → ofrecer contacto manual (admin resuelve la acción por el user, ej. confirmar reserva manualmente).

---

## Escenario D — "No recibí el email de bienvenida / confirmación"

### Síntoma típico

User (tutor o proveedor recién registrado) reporta: "no me llegó el email para confirmar" / "me registré y no me llegó nada" / "lo busco en spam y no está". A veces: "el link del email no funciona" (ver también Escenario default si link apunta a página rota).

### Paso 1 — recopilar (1 min)

Pedir solo 2 datos:

> Hola {nombre}, para resolverlo rápido:
> 1. ¿Con qué correo te registraste?
> 2. ¿Más o menos a qué hora lo hiciste?

### Paso 2 — verificar en auth.users + estado del email

**SQL diagnóstico Q-D1**:

```sql
SELECT au.id AS auth_user_id,
       au.email,
       au.created_at AS registrado,
       au.email_confirmed_at AS confirmado,
       au.last_sign_in_at AS ultimo_login,
       (SELECT COUNT(*) FROM public.proveedores WHERE auth_user_id = au.id) AS tiene_fila_prov,
       (SELECT COUNT(*) FROM public.usuarios_buscadores WHERE auth_user_id = au.id) AS tiene_fila_tutor
  FROM auth.users au
 WHERE au.email ILIKE '{email_del_user}'
 LIMIT 1;
```

Interpretar:
- `confirmado IS NULL` + `registrado` reciente → email no fue abierto o no llegó. Seguir al paso 3.
- `confirmado` tiene fecha → ya se confirmó. Probable el user se confundió — pedir que intente login directamente.
- `tiene_fila_prov=0 AND tiene_fila_tutor=0` → el signup falló entre auth + perfil. Caso signup rollback — ver escenario default.

### Paso 3 — verificar Resend delivery status

Abrir Resend dashboard (`https://resend.com/emails`) + filtrar por `to:{email}` + ventana del registro ±5 min. Estados posibles:

- **Delivered**: el email salió OK. Es muy probable que esté en spam del user o que filtrado por el proveedor del email (Gmail / Outlook). Instruir al user:
  - Buscar en carpeta "Spam" / "Correo no deseado" / "Promociones".
  - Buscar por remitente `hola@send.pawnecta.com` o subject "Confirma tu correo en Pawnecta".
  - Marcar como "no es spam" para futuros emails.
- **Bounced**: email rechazado por el servidor del user. Puede ser dirección mal escrita (typo tipo `gmail.co` o doble `@`). Ofrecer re-registro con corrección.
- **Delayed / Queued >30 min**: problema en Resend. Chequear dashboard de estado de Resend. Si está general, esperar + comunicar al user.
- **Blocked / Complained**: el user previamente marcó Pawnecta como spam. Fuera de la plataforma gestionar (pedir al user que quite el bloqueo en su cliente de email).

### Paso 4 — workaround si urgente

Si el user quiere arrancar HOY y Resend está demorado o en spam irreversible:

1. El PO re-envía manualmente desde Supabase Dashboard → Auth → Users → buscar user → "Send magic link" o "Reset email". Un segundo email desde Supabase (SMTP distinto) puede llegar donde el primero no.
2. Si sigue sin llegar: el PO puede marcar `email_confirmed_at = NOW()` manualmente en `auth.users` **solo** con GO explícito (SQL UPDATE con WHERE + RETURNING). Patrón P5.

### Paso 5 — registro + cierre

Si fue infra Resend/DNS → revisar ventana de delay con el PO. Si es patrón recurrente >5 users en 24h → candidato a issue de infra (DMARC, SPF, dominio en blocklist). Ver también `docs/auth/email-templates/` para referencias del flujo.

---

## Escenario E — User reporta error 500 en `/servicio/[id]` (o cualquier página pública)

### Síntoma típico

User muestra captura con "500 Internal Server Error" o "Algo salió mal — intenta más tarde". Puede llegar por chat, IG, o detectarse directamente en Sentry (issue nuevo con muchas instancias recientes).

### Paso 1 — recopilar (1 min)

> Hola {nombre},
> 1. ¿Puedes mandarnos la URL completa de la página? (copiar desde la barra del navegador).
> 2. ¿Hace cuánto te pasó?

### Paso 2 — abrir Sentry + Vercel

- **Sentry**: buscar issue nuevo filtrado por ruta reportada + ventana de tiempo ±15 min.
  - Si hay issue abierto → leer stack trace. Priorizar signals:
    - `RLS policy violation` → bug server-side en policy o en query (falta autorización).
    - `undefined is not iterable` / `cannot read property X of undefined` → bug de null-safety en código Next.
    - `fetch failed` / timeout Supabase → infra Supabase (verificar status Supabase Dashboard).
  - Anotar `event.id` para seguimiento.
- **Vercel runtime logs**: `vercel logs <deployment-url> --since 30m --level error` o Dashboard → Deployment → Logs. Filtrar por request path.

### Paso 3 — identificar causa

- **Si el stack trace apunta a `pages/servicio/[id].tsx` getServerSideProps** → probable mala query o RPC caído. Verificar:
  ```sql
  SELECT id, titulo, activo, proveedor_id, categoria_id
    FROM public.servicios_publicados
   WHERE id = '{uuid_del_servicio}';
  ```
  - Si retorna 0 filas → servicio borrado o soft-deleted (verificar `activo=false`). Normal, el user navega con ID stale. **No es bug**, es 404 mal renderizado.
  - Si retorna 1 fila con `activo=true` → bug real en el fetch. Diagnóstico profundo.

- **Si el stack trace es client-side** (p.ej. error en hydration o React) → ver si coincide con un deploy reciente. Candidato a N1 rollback.

### Paso 4 — fix o workaround

- **Si es bug de query / null-safety**: fix de código inmediato (patch + PR + merge). En paralelo, responder al user con workaround ("intenta de nuevo en 1 hora").
- **Si es 404 mal renderizado**: fix de UX diferido (mostrar "Servicio no disponible" en vez de 500). Responder al user con alternativa ("ese servicio ya no está disponible, mira estos otros: `/explorar?categoria=X`").
- **Si es infra Supabase**: ver status Supabase + esperar. Comunicar al user tiempo estimado.

### Paso 5 — verificación empírica

Después del fix, el PO puede abrir la URL reportada en modo incógnito → verificar que carga. También Sentry → confirmar que el issue no suma instancias nuevas en los próximos 15 min.

---

## Escenario F — User reporta "me deslogueó solo" o "perdí mi sesión"

### Síntoma típico

User (tutor o proveedor) reporta: "entré a la app y me pide loguear otra vez" / "mi sesión se fue sola" / "estaba usando y de repente aparece la pantalla de login". A veces: "puse 'recordarme' y no funciona".

### Paso 1 — recopilar (1 min)

> Hola {nombre},
> 1. ¿Qué estabas haciendo cuando pasó?
> 2. ¿Tenías la app abierta en más de una pestaña o dispositivo?
> 3. ¿Más o menos a qué hora pasó?

### Paso 2 — identificar causa probable por patrón

**Más común — cross-fire dual-cuenta** (patrón documentado en `CLAUDE.md > Auth flow > Testing con múltiples cuentas`): user tiene la app abierta en Pestaña A (cuenta P1) + inicia sesión como P2 en Pestaña B del mismo navegador. Supabase Auth almacena token por proyecto en `localStorage` → `signInWithPassword` de P2 sobreescribe el token de P1 → gotrue-js dispara `SIGNED_OUT` en TODAS las tabs del proyecto. No es bug, es `persistSession: true` funcionando. **Preguntar explícitamente al user si tenía 2 cuentas simultáneas**.

**2da hipótesis — signOut global desde otro dispositivo**: si el user usó una tablet / otro navegador para cambiar contraseña o cerró sesión "global", Supabase Auth revoca TODOS los refresh_tokens del user. Las sesiones en otros dispositivos caen al próximo refresh. Preguntar al user: "¿cambiaste contraseña o cerraste sesión en otro teléfono/tablet reciente?".

**3ra hipótesis — session expiry natural**: el JWT dura 1h. Si el user dejó la tab inactiva >1h, el refresh silente puede fallar + redirigir. Inusual que el user lo reporte como "sin motivo".

**4ta hipótesis — SessionTimeout por inactividad**: la app tiene `components/SessionTimeout.tsx` que redirige a `/security-logout` tras 20 min de inactividad. Si el user dejó la pantalla abierta sin interactuar → redirect automático. Preguntar: "¿la pantalla estuvo abierta mucho tiempo sin tocar nada?".

### Paso 3 — SQL diagnóstico Q-F1

Si el user confirma que no cambió contraseña ni tenía 2 cuentas, verificar sesiones recientes:

```sql
SELECT au.id,
       au.email,
       au.last_sign_in_at,
       au.updated_at,
       (SELECT COUNT(*) FROM auth.sessions WHERE user_id = au.id) AS sesiones_activas,
       (SELECT MAX(created_at) FROM auth.sessions WHERE user_id = au.id) AS sesion_mas_reciente
  FROM auth.users au
 WHERE au.email ILIKE '{email}'
 LIMIT 1;
```

Interpretar:
- `sesiones_activas = 0` + `last_sign_in_at` reciente → sesión fue revocada. Causa externa (patrón 1 o 2).
- `sesiones_activas > 0` + `sesion_mas_reciente` muy reciente → usuario YA logueado otra vez. Confirmar con el user si volvió a loguear después del reporte (puede haber auto-resuelto).

### Paso 4 — Sentry para user_context_stuck

Ver también issues Sentry `JAVASCRIPT-NEXTJS-7` (`user_context_stuck`) + `JAVASCRIPT-NEXTJS-5` (`hydrate_exhausted`). Si el user.id coincide con un hit reciente en estos issues → watchdog del UserContext colgó.

### Paso 5 — fix / respuesta

- **Si patrón 1 (cross-fire)**: responder al user: "es por tener varias pestañas abiertas con cuentas distintas — Supabase Auth no está diseñado para mantener dos sesiones simultáneas en el mismo navegador. Usa perfiles de navegador separados o incógnito si quieres probar dos cuentas". No es bug.
- **Si patrón 2 (signOut global)**: responder: "al cerrar sesión desde otro dispositivo, esta sesión también se cierra por seguridad. Es intencional". No es bug.
- **Si patrón 3/4 (expiry/inactividad)**: responder: "por seguridad cerramos la sesión después de inactividad prolongada. Vuelve a entrar". No es bug.
- **Si NO coincide con ningún patrón**: escalar — posible bug UserContext. Crear issue técnico + anotar `user.id`.

---

## Escenario G — Proveedor pide eliminar su cuenta (Ley 21.719)

### Síntoma típico

Proveedor escribe: "quiero borrar mi cuenta" / "cancelar mi membresía" / "elimina todos mis datos". Puede llegar por IG DM, email, o chat interno. **URGENTE legal** desde 2026-12-01 (Ley 21.719 vigencia).

### Paso 1 — recopilar (1 min)

> Hola {nombre},
>
> Entendido, vamos a procesar tu solicitud. Para hacerlo correctamente necesito:
> 1. Confirmación por escrito de que quieres eliminar permanentemente tu cuenta.
> 2. ¿Alguna razón específica (feedback)? Opcional, nos ayuda a mejorar.
>
> Importante: la eliminación es permanente. Perderás acceso a las reservas que hiciste + histórico de contactos + reseñas recibidas.

### Paso 2 — verificar tipo de cuenta + dependencias

**SQL diagnóstico Q-G1**:

```sql
SELECT p.id AS proveedor_id,
       p.estado,
       p.nombre || ' ' || COALESCE(p.apellido_p, '') AS nombre,
       (SELECT COUNT(*) FROM public.servicios_publicados WHERE proveedor_id = p.id) AS servicios,
       (SELECT COUNT(*) FROM public.agendamientos WHERE proveedor_id = p.id) AS agendamientos,
       (SELECT COUNT(*) FROM public.evaluaciones WHERE proveedor_id = p.id) AS evaluaciones,
       (SELECT COUNT(*) FROM public.conversations WHERE sitter_id = p.auth_user_id) AS conversaciones
  FROM public.proveedores p
 WHERE p.auth_user_id = (SELECT id FROM auth.users WHERE email ILIKE '{email}')
 LIMIT 1;
```

Interpretar dependencias:
- `agendamientos > 0` **con fecha futura y estado `pendiente`/`confirmada`** → hay tutores que reservaron. Antes de borrar: cancelar esas reservas + notificar a los tutores (patrón P2 + P5).
- `evaluaciones > 0` → decidir qué hacer (anonimizar vs borrar).
- `conversations > 0` → decidir qué hacer con los hilos (los otros tutores pueden tener historial relevante).

### Paso 3 — procedimiento de eliminación (requiere GO explícito del PO + legal)

**Mientras no haya implementación de DEL-CUENTA-LEY código** (post-launch, ventana 19-30 noviembre según `BACKLOG.md > plan-lanzamiento-nov-2026`):

1. **PO confirma recepción al user**: "recibimos tu solicitud. La procesaremos en las próximas 48 horas y te confirmamos cuando esté completo. Cualquier reserva futura la cancelaremos primero y avisaremos a los tutores involucrados".
2. **Cancelar reservas futuras**: `UPDATE public.agendamientos SET estado='cancelada_proveedor', motivo_cancelacion='Proveedor solicitó eliminación de cuenta' WHERE proveedor_id = X AND estado IN ('pendiente','confirmada') AND fecha_preferida >= CURRENT_DATE RETURNING id, tutor_id, fecha_preferida;`
3. **Notificar tutores afectados** (manual por email).
4. **Anonimizar o borrar**:
   - Anonimizar: `UPDATE public.proveedores SET nombre='Usuario eliminado', apellido_p=null, apellido_m=null, nombre_publico='Usuario eliminado', foto_perfil=null, foto_carnet=null, foto_carnet_dorso=null, bio=null, rut='ELIMINADO', estado='suspendido' WHERE id = X RETURNING id;`
   - Borrar binarios de Storage (buckets `avatars`, `documents`): `supabase storage rm ...` manual.
   - `UPDATE auth.users SET email='deleted-{id}@pawnecta.invalid', encrypted_password='', raw_user_meta_data='{}' WHERE id = Y;` (soft-delete; preserva FKs).
5. **Documentar** en acta operativa (`docs/sprints/eliminaciones-cuenta-po.md`) con fecha + user_id + razón + confirmación legal.
6. Confirmar al user: "Tu cuenta y datos personales fueron eliminados. Conservaremos solo registros anónimos de transacciones (reservas pasadas) por cumplimiento legal, sin posibilidad de identificarte".

**Post-implementación DEL-CUENTA-LEY código** (sprint propio post-launch, ver `docs/sprints/del-cuenta-ley.md`): el proveedor puede ejecutar el flujo desde `/usuario/configuracion` con botón "Eliminar cuenta" + confirmación modal. El PO deja de ser gate manual.

### Paso 4 — plazo legal

Ley 21.719 exige respuesta en ≤15 días hábiles tras la solicitud. Pawnecta compromiso interno: ≤48h para evitar escalación formal. Si no se puede en 48h (volumen alto, verificación), avisar al user con nuevo ETA.

---

## Template de respuesta general al user

### Si el bug se resolvió rápido

```
Hola {nombre},

Ya identificamos el problema y lo resolvimos. Intenta de nuevo
y me cuentas si sigue andando raro.

Gracias por avisarnos — nos ayuda mucho a mejorar en este primer día.

Un abrazo,
El equipo Pawnecta
```

### Si requiere workaround + fix diferido

```
Hola {nombre},

Confirmamos el problema que reportaste. Mientras armamos el arreglo
definitivo (lo tenemos en las próximas horas), puedes {workaround concreto}.

Te escribimos de vuelta cuando esté resuelto. Gracias por la paciencia.

El equipo Pawnecta
```

### Si requiere fix de código + ETA

```
Hola {nombre},

Confirmamos el bug — es nuestro, no tuyo. Estamos trabajando en el
arreglo y debería estar disponible en las próximas {X} horas.

Si urge destrabar tu {acción específica}, escríbenos a este mismo
correo y lo resolvemos manualmente para ti.

Gracias por la paciencia.

El equipo Pawnecta
```

---

## Queries consolidadas (bank completo)

Copy-paste al SQL Editor prod:

```sql
-- Q-A1: Info de proveedor por email
SELECT p.id, p.auth_user_id, p.nombre, p.apellido_p, p.estado, p.verificacion_estado,
       p.created_at, au.email, au.last_sign_in_at
  FROM public.proveedores p JOIN auth.users au ON au.id = p.auth_user_id
 WHERE au.email ILIKE '{EMAIL}' LIMIT 1;

-- Q-A2: Servicios de un proveedor
SELECT s.id, s.titulo, s.activo, c.slug AS cat, s.created_at, s.updated_at
  FROM public.servicios_publicados s
  JOIN public.categorias_servicio c ON c.id = s.categoria_id
  JOIN public.proveedores p ON p.id = s.proveedor_id
 WHERE p.auth_user_id = '{AUTH_USER_ID}' ORDER BY s.created_at DESC LIMIT 5;

-- Q-B1: Reservas recientes de un tutor
SELECT a.id, a.estado, a.fecha_preferida, a.created_at, pr.nombre AS prov,
       au_prov.email AS prov_email, s.titulo AS servicio
  FROM public.agendamientos a
  JOIN public.proveedores pr ON pr.id = a.proveedor_id
  JOIN auth.users au_prov ON au_prov.id = pr.auth_user_id
  JOIN public.usuarios_buscadores t ON t.id = a.tutor_id
  JOIN auth.users au_tut ON au_tut.id = t.auth_user_id
  JOIN public.servicios_publicados s ON s.id = a.servicio_id
 WHERE au_tut.email = '{EMAIL_TUTOR}' ORDER BY a.created_at DESC LIMIT 5;

-- Q-C1: Conversaciones de un user
SELECT c.id, c.client_id, c.sitter_id, c.proveedor_auth_id, c.agendamiento_id, c.created_at,
       (SELECT COUNT(*) FROM public.messages m WHERE m.conversation_id = c.id) AS msgs,
       (SELECT MAX(created_at) FROM public.messages m WHERE m.conversation_id = c.id) AS ultimo
  FROM public.conversations c
 WHERE c.client_id = (SELECT id FROM auth.users WHERE email = '{EMAIL}')
    OR c.sitter_id = (SELECT id FROM auth.users WHERE email = '{EMAIL}')
 ORDER BY c.created_at DESC LIMIT 10;

-- Q-C3: Notifs de chat de un user
SELECT conversation_id, message_id, created_at, read_at
  FROM public.notifications
 WHERE user_id = (SELECT id FROM auth.users WHERE email = '{EMAIL}')
   AND type = 'new_message' ORDER BY created_at DESC LIMIT 10;

-- Q-D1: Universal — qué es el user
SELECT au.id, au.email, au.last_sign_in_at,
       CASE WHEN p.id IS NOT NULL THEN 'proveedor'
            WHEN ub.id IS NOT NULL THEN 'tutor'
            ELSE 'auth-only' END AS rol,
       p.estado AS prov_estado
  FROM auth.users au
  LEFT JOIN public.proveedores p ON p.auth_user_id = au.id
  LEFT JOIN public.usuarios_buscadores ub ON ub.auth_user_id = au.id
 WHERE au.email = '{EMAIL}' LIMIT 1;
```

---

## Decisiones pendientes del PO

### D1. ¿Agregamos un cuarto escenario "Error 5xx generalizado"?

**Pregunta**: hoy el playbook cubre reportes específicos (A: no publicar, B: reserva no llega, C: chat roto). ¿Agregamos un cuarto "home / explorar / ficha retornan 500" con pasos directos al N1 rollback?

**Recomendación del auditor**: sí. Es el escenario "5xx-wide" que ya referencia `docs/planes/rollback-25-11.md § N1`. 1 página extra. Vale el seguro.

**Impacto si no se decide**: default = este playbook cubre bugs específicos; para 5xx-wide se va directo al rollback plan.

### D2. SQL que combine A+B (ej. "dame info del user + sus reservas recientes" en una query)

**Pregunta**: en muchos casos reales el PO va a querer "mostrame TODO sobre este user". ¿Agregamos una query universal consolidada (Q-D2) que retorne todo en una corrida?

**Recomendación del auditor**: sí. 10 min de redactar la query (JOINs grandes). Ahorra copy-paste al PO en caliente.

**Impacto si no se decide**: default = el PO ejecuta 2-3 queries en secuencia.

### D3. Workflow de escalamiento Resend/Supabase soporte

**Pregunta**: en varios casos el playbook dice "escalar a soporte Resend" o "soporte Supabase". ¿Tenemos los URLs de ticket pre-guardados + templates de ticket genérico?

**Recomendación del auditor**: sí. Agregar sección al final de este doc con los URLs + template genérico. ~15 min más de redacción (lo hago si GO).

**Impacto si no se decide**: default = PO busca los URLs al momento (3-5 min extra en el peor caso).

### D4. Acceso del auditor a prod (read-only) durante incidentes

**Pregunta**: hoy el auditor tiene MCP `supabase-prod-ro` → SELECT only. ¿Autorizás que el auditor corra las queries de este playbook directamente durante un incidente (sin pedir GO por cada una) para acelerar diagnóstico?

**Recomendación del auditor**: sí para las queries del playbook (Q-A, Q-B, Q-C, Q-D). El scope es read-only, documentado, y las queries no incluyen info sensible más allá de emails/IDs que el user ya compartió al reportar. Acelera el loop diagnóstico de 15-20 min a 5-10 min.

**Impacto si no se decide**: default = PO corre las queries. Loop más lento pero gate mantenido.

---

## Firma

Este playbook se usa en caliente durante incidentes. Post-launch, cada escenario real que aparezca se agrega como "caso histórico" al final de este doc (lo que pasó, qué se encontró, cómo se resolvió, tiempo de resolución).
