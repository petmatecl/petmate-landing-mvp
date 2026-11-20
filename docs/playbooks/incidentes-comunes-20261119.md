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
