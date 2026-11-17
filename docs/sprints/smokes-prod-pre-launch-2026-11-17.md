# Guía de smokes prod — pre-launch 2026-11-17

**Ejecutor**: PO.
**Entorno**: producción (`https://www.pawnecta.com`).
**Objetivo**: validar los flujos golden path antes del freeze 16:00 CLT. Decidir si se mantiene lanzamiento mañana 2026-11-18 o se posterga al respaldo 2026-11-25.
**Duración estimada**: 55–75 min total (proveedor 25 + tutor 20 + admin 10 + colchón).
**Orden deliberado**: PROVEEDOR → TUTOR → ADMIN. El tutor interactúa **solo** con el servicio smoke publicado en §1 para evitar generar correos o mensajes contra proveedores reales de prod.

---

## 0. Setup (5 min, una vez)

### Dispositivos y perfiles

Según CLAUDE.md § "Testing con múltiples cuentas", Supabase Auth persiste la sesión por proyecto — dos cuentas distintas en el mismo navegador se apagan entre sí. Para evitar cross-fire y para no cerrar la sesión de la cuenta admin:

- **Desktop · perfil Chrome A (admin)**: queda logueado con `acanocts@gmail.com` todo el día. No lo cierres durante el smoke, lo usas en §3.
- **Desktop · perfil Chrome B (proveedor)**: perfil Chrome **distinto al perfil admin**. Menú Chrome → Perfiles → Añadir perfil. Lo usas para el signup + dashboard del proveedor smoke en §1.
- **Móvil Android · Chrome incógnito o perfil secundario**: lo usas para el smoke tutor en §2. Si prefieres desktop, abre un **tercer perfil Chrome C** para el tutor.

### Cuentas a usar

- **Proveedor**: `acanocts+smokeprov@gmail.com` (Gmail entrega `+<alias>` al mismo inbox).
- **Tutor**: `acanocts+smoketutor@gmail.com`.
- **Admin**: tu cuenta `acanocts@gmail.com` ya existente, rol admin. **Perfil Chrome A, no cerrarla.**

Anota contraseñas temporales que puedas recordar (no tienen que ser seguras, estas cuentas se limpian apenas termine el smoke — ver §6).

### Fechas para la agenda F1

Hoy es martes 2026-11-17. Los slots que configure el proveedor deben caer en:
- **Preferente**: miércoles 2026-11-18 o jueves 2026-11-19.
- Evitar hoy (ya pasó parte del horario operativo).
- Evitar fechas muy lejanas (el tutor tiene que poder reservar el mismo slot en §2).

### Registro de evidencia

Mientras ejecutas, lleva una nota corta con:
- **BLOQUEANTE**: cualquier cosa de la lista "Bloqueantes" al pie de cada sección.
- **COSMÉTICO**: cosas que molestan pero no detienen (texto raro, icono desalineado, spacing). Se anotan en BACKLOG post-launch.
- **TIMESTAMP** CLT de cada corte: si algo falla, el minuto exacto me ayuda a cruzar con Sentry/Vercel/Supabase después.

---

## 1. Smoke PROVEEDOR (25 min, desktop perfil B)

### 1.1 Registro proveedor (wizard multi-step)

1. En desktop con **perfil Chrome B** (sin sesión activa), navega a `https://www.pawnecta.com/register` → elige "Soy proveedor".
   - **Debes ver**: wizard con pasos (datos personales → dirección → categoría/servicio base → confirmación).
   - **Bloqueante**: wizard no inicia, pasos rotos, botones "Siguiente" / "Atrás" no responden.
2. Completa cada paso:
   - Email: `acanocts+smokeprov@gmail.com`
   - Password: recordable.
   - Nombre + apellido_p + apellido_m: "Smoke Proveedor Tester"
   - RUT: uno válido (verificar DV).
   - Comuna: una en Santiago (ej. Providencia, Ñuñoa).
   - Categoría preferida: **Paseos** (es la que vamos a reservar en §2; también sirve si eliges otra con agenda F1, pero Paseos simplifica el filtro del tutor).
3. Final del wizard → "Crear cuenta".
   - **Debes ver**: toast "Cuenta creada" + redirect a `/proveedor` (dashboard) **sin requerir aprobación admin** (auto-aprobación vigente desde sprint badge-f1).
   - **Bloqueante**: wizard atora en algún paso, email de bienvenida no llega, redirect a sala de espera legacy ("Tu cuenta está en revisión").
4. Abre Gmail → email de bienvenida en < 30s con subject "Bienvenido a Pawnecta" o similar.
   - **Bloqueante**: no llega en 1 min, link a `/proveedor` roto.
5. **Nota operativa**: en tu `contacto@pawnecta.com` también va a llegar un "Nuevo proveedor se registró" (notificación interna del endpoint `notify-nueva-solicitud`). No es un correo a tercero, es tu propio inbox corp — bórralo manual post-smoke si quieres.

### 1.2 Dashboard + publicar primer servicio

6. En `/proveedor` dashboard, elige "Publicar nuevo servicio" o similar.
   - **Debes ver**: modal `ServiceFormModal` con secciones: título, descripción, precio, fotos, categoría, detalles dinámicos, agenda F1/F2, cobertura.
   - **Bloqueante**: modal no abre, campos no cargan, categorías vacías.
7. Completa el servicio:
   - Título: "Paseos smoke prelaunch"
   - Descripción: 2 líneas razonables (ej. "Paseos de prueba para validación pre-launch. No tomar como oferta real.").
   - Precio desde: 10.000.
   - Categoría: **Paseos**.
   - Comunas de cobertura: 2–3 comunas reales (Providencia, Ñuñoa, Las Condes).
   - Foto: sube 1 si el flujo lo requiere (si no, déjalo vacío).
8. Configura **agenda F1** (slots horarios):
   - Ventana: **miércoles 2026-11-18** entre las 10:00 y las 18:00, con 3–4 slots de 1h cada uno.
   - **Debes ver**: slots guardados aparecen listados en el modal o en el dashboard.
   - **Bloqueante**: agenda no se guarda, slots no aparecen en ficha pública, formato de hora mezclado 12h/24h.
9. Guarda el servicio → toast "Servicio publicado".
   - Vuelve al dashboard → el servicio aparece en "Mis servicios" con estado "Activo".
10. Abre la ficha pública del servicio en nueva pestaña: `https://www.pawnecta.com/servicio/<uuid>`.
    - **Verifica** que renderiza correcto al público (foto, precio, slots F1, botón "Reservar").
    - **COPIA LA URL COMPLETA** (incluyendo el UUID) y pégala en tu nota. Es la URL que el tutor abre directo en §2 para evitar tocar otros servicios reales.
    - **Bloqueante**: ficha dice 404 o el servicio no aparece con esos slots visibles.

### 1.3 Bloqueantes PROVEEDOR (consolidado)

- Signup wizard atorado o email bienvenida no llega.
- Publicar servicio 500 o no aparece en catálogo público al instante.
- Agenda F1 no persiste o los slots no se muestran en la ficha pública.
- Cualquier string visible con voseo.
- Cualquier email con "agendamiento" visible (taxonomía debe ser "reserva").

**Pausa el smoke proveedor acá**. Seguimos con tutor en §2; volvemos al dashboard proveedor en §2.4 para aceptar la reserva.

---

## 2. Smoke TUTOR (20 min, móvil preferentemente)

El tutor solo interactúa con el servicio smoke publicado en §1.10. Para exploración anónima general puedes abrir fichas reales (ver lo que ve un visitante), pero **cualquier acción con efecto** (reserva, chat, contactar, favorito) va contra el servicio smoke por su URL directa.

### 2.1 Exploración anónima (sin login, sobre catálogo real OK)

1. Abre `https://www.pawnecta.com/` en incógnito móvil.
   - **Debes ver**: hero con buscador, 2 franjas de categoría, cards con precio "Desde $X.XXX" y badge si corresponde. Si una franja tiene <4 servicios, debe aparecer tarjeta de invitación con texto distinto al de franja vacía.
   - **Bloqueante**: landing en blanco, 500, header roto, cero cards, hydration error visible en consola.

2. Toca "Explorar" en el header → `/explorar`.
   - **Debes ver**: filtros laterales (categoría, comuna, mascota, precio), grid de servicios.
   - **Bloqueante**: filtros no cargan, 500, cards duplicadas.

3. Aplica filtro **"Paseos"** + "Santiago" (o comuna donde haya proveedores reales).
   - **Debes ver**: grid se filtra, URL se actualiza con query params, aparece la card smoke junto con reales (si tus filtros coinciden con la comuna que elegiste en §1.7).
   - **Bloqueante**: filtro no responde, grid vacío cuando sabemos que hay data real.

4. Tap sobre **una card cualquiera** (real o smoke) → ficha de servicio `/servicio/<uuid>`.
   - **Debes ver**: hero con foto, precio, botones "Reservar" + "Compartir" (redondo en móvil) + "Contactar", info del proveedor, agenda si tiene F1/F2, reseñas si hay.
   - **Bloqueante**: ficha vacía, 404 para un servicio activo, agenda rota si tiene slots.

5. Toca "Compartir" (círculo en móvil) → debe abrir **menú nativo de Android**. Prueba WhatsApp → debe mostrar preview con foto + título. **Comparte a tu propio chat / archivado** para evitar notificar a terceros.
   - **Bloqueante**: botón no responde, menú nativo no se dispara, WhatsApp muestra link crudo sin preview (OG tags rotos).

### 2.2 Intento de reservar sin login (sobre cualquier ficha, no confirmar)

6. Toca "Reservar" en la ficha que estés viendo (puede ser real).
   - **Debes ver**: modal "Inicia sesión o regístrate".
   - **Importante**: toca "Cerrar" o fuera del modal — NO procedas al signup desde este flow para no vincular la cuenta smoke a un servicio real. Cerramos el modal y vamos al registro por el camino limpio en §2.3.
   - **Bloqueante**: el modal no aparece y la reserva se intenta anónima; o el modal rinde 500.

### 2.3 Registro + confirmación de email

7. Ve a `https://www.pawnecta.com/register` → "Soy tutor" → formulario de signup.
   - Email: `acanocts+smoketutor@gmail.com`
   - Password: algo recordable.
   - Nombre: "Smoke Tutor"
   - RUT: uno válido (verifica DV).
   - **Debes ver**: toast "Cuenta creada, revisa tu correo" o similar, redirect a pantalla de confirmación de email.
   - **Bloqueante**: 500 en signup, "email ya existe" si es cuenta nueva, validación RUT rota.
8. Abre Gmail → email "Confirma tu correo en Pawnecta" **en < 30s** desde `send.pawnecta.com`.
   - **Debes ver**: email con logo, botón "Confirmar mi correo", link válido.
   - **Bloqueante**: email no llega en 1 min, link roto, bounce.
9. Toca "Confirmar mi correo" → `/email-confirmado` en el móvil.
   - **Debes ver**: "Tu cuenta ya está activa" + CTA para entrar.
   - **Bloqueante**: "El enlace ya no sirve", loader pegado > 5s, redirect a `/security-logout`.

### 2.4 Login + reservar F1 (URL directa al servicio smoke)

10. Ve a `/login` → entra con `acanocts+smoketutor@gmail.com`.
    - **Debes ver**: redirect a `/explorar` o landing.
    - **Bloqueante**: login dice "credenciales inválidas" cuando las sabes buenas, timeout, colgado en "Entrando…".
11. **Abre directo la URL del servicio smoke** (la que copiaste en §1.10) → `https://www.pawnecta.com/servicio/<uuid-smoke>`.
    - Confirma que es el servicio "Paseos smoke prelaunch" con los slots del miércoles 2026-11-18.
    - **Bloqueante**: 404, slots no aparecen, botón "Reservar" ausente.
12. Toca "Reservar" → modal F1 con calendario + slots del miércoles 2026-11-18.
    - Elige un slot libre.
    - Completa: nombre del pet (si pide, usa "Firulais Smoke"), notas opcionales.
    - Confirma.
    - **Debes ver**: toast "Reserva solicitada, espera confirmación del proveedor" + redirect a `/mis-reservas`.
    - **Bloqueante**: slot elegido tira 500, modal no se cierra, reserva no aparece en `/mis-reservas`.
13. En `/mis-reservas` → la reserva aparece en pestaña "Pendientes" con fecha correcta, estado "Pendiente", precio.
    - **Bloqueante**: pestañas no cargan, reserva en estado equivocado, botón "Cancelar" ausente.

### 2.5 Chat con el proveedor smoke

14. Desde la card de la reserva o desde la ficha del servicio smoke → toca "Contactar" o el icono de chat → debe abrir chat interno con "Smoke Proveedor".
15. Envía un mensaje: "Hola, confirmo asistencia, cualquier duda avísame."
    - **Debes ver**: mensaje aparece inmediato en la conversación con tu avatar.
    - **Bloqueante**: 500 al enviar, mensaje no persiste tras refresh, timeout, el chat se abre con otro proveedor que no es el smoke.

### 2.6 Bloqueantes TUTOR (consolidado)

- Landing no carga o rinde error de hydration.
- Signup falla o email de confirmación no llega en 1 min.
- Login con credenciales correctas falla.
- Reserva F1 no persiste o no aparece en `/mis-reservas`.
- Chat 500 o no persiste mensajes.
- Compartir no abre menú nativo o rompe OG preview en WhatsApp.
- Cualquier string visible con voseo ("elegí", "contactá", "podés", "tenés").

**Deja la reserva en estado "Pendiente"**. Volvemos a cancelarla en §2.8 después de que el proveedor la acepte y verifiquemos el ciclo completo.

---

## 2.7 Cierre del ciclo reserva (vuelve a perfil B · proveedor)

Pasa al desktop con perfil Chrome B (proveedor smoke logueado).

16. En `/proveedor` dashboard → sección "Solicitudes pendientes" debe tener 1 solicitud nueva.
    - **Debes ver**: contador o badge en < 15s desde que el tutor reservó.
    - **Bloqueante**: la solicitud no aparece en < 15s, campana sin badge, dashboard no se refresca al recargar.
17. Abre Gmail de la cuenta proveedor → email "Nueva solicitud de reserva de Smoke Tutor" en < 30s.
    - **Bloqueante**: email no llega, link al dashboard roto, subject con voseo o con palabra "agendamiento".
18. En el dashboard, abre la solicitud → modal con fecha, slot, pet, nota del tutor, CTAs "Aceptar" / "Rechazar".
19. Toca "Aceptar".
    - **Debes ver**: toast "Reserva confirmada", solicitud desaparece de pendientes y aparece en "Reservas confirmadas".
    - **Bloqueante**: 500, estado queda en pendiente tras aceptar, toast en blanco.
20. En el móvil con cuenta tutor → abre Gmail → email "Tu reserva fue confirmada por Smoke Proveedor" en < 30s.
    - Abre `/mis-reservas` en el móvil → la reserva pasa de "Pendientes" a "Próximas" con estado "Confirmada".
    - **Bloqueante**: email no llega, el estado en el móvil no sincroniza tras refresh.

### Chat de respuesta + cerrar ciclo

21. En el chat interno (desde dashboard proveedor o desde la reserva), responde el mensaje del tutor.
    - **Debes ver**: mensaje enviado + indicador de recibido.
22. Desde el móvil del tutor, verifica que el mensaje llegó al chat (badge en la campana, mensaje visible al abrir).
    - **Bloqueante**: mensaje no llega, chat bidireccional roto.

## 2.8 Cancelar la reserva (vuelve a tutor)

En el móvil con cuenta tutor:

23. Ve a `/mis-reservas` → pestaña "Próximas" → tap "Cancelar" en la reserva confirmada.
    - **Debes ver**: confirm dialog con texto explicando consecuencias + botones "Confirmar cancelación" / "Volver".
24. Confirma cancelación.
    - **Debes ver**: toast "Reserva cancelada", card se mueve a "Historial" con badge "Cancelada por ti".
    - Proveedor (en desktop) recibe notif + email "Reserva cancelada por el tutor".
    - **Bloqueante**: 500, cancela pero sigue en "Próximas", texto dice "cancelada por vos" (voseo), toast en blanco.

---

## 3. Smoke ADMIN (10 min, desktop perfil A · ya logueado)

Rápido sanity check del panel admin. **La cuenta admin sigue logueada en perfil A desde §0** — no la cerraste durante los smokes anteriores.

### 3.1 Panel

1. En desktop perfil A → navega a `https://www.pawnecta.com/admin`.
   - **Debes ver**: panel con sidebar sticky y secciones (Visitas, Verificaciones, Servicios, Proveedores, Evaluaciones, etc.).
   - **Bloqueante**: 403, 500, panel vacío, sidebar roto.

### 3.2 Ver y actuar

2. Abre pestaña "Visitas" → debe cargar métricas del día (counts, tabla o gráfico simple si existe).
   - **Bloqueante**: 500, pestaña queda cargando indefinido.
3. Abre "Verificaciones" → lista con legacy o vacía (el proveedor smoke no subió carnet, así que no aparece acá).
4. Abre "Proveedores" → tabla con listado. Busca "smoke" → debe aparecer la cuenta recién creada.
   - **Bloqueante**: tabla vacía si sabes que hay proveedores reales, search no filtra.
5. Abre "Servicios" → busca "Paseos smoke prelaunch" → debe aparecer activo.
6. Abre "Evaluaciones" → tabla con evaluaciones reales o vacía.
   - **Bloqueante**: 500.

### 3.3 Acción reversible sobre cuenta smoke

7. Sobre tu cuenta smoke proveedor, prueba suspender → verifica que desaparece del catálogo público (usa el móvil incógnito sin login → `/explorar` con filtro Paseos → la card smoke no debe aparecer) → reactivar.
   - Es acción reversible pero deja log.
   - **Bloqueante**: no puedes suspender/reactivar (bloquea capacidad de moderar post-launch).

**No cierres la sesión admin** — queda viva para el cleanup posterior si lo necesitas.

### 3.4 Bloqueantes ADMIN (consolidado)

- Panel no carga o devuelve 403/500.
- Ninguna pestaña del sidebar responde.
- No puedes suspender/reactivar un proveedor.

---

## 4. Qué cuenta como bloqueante para lanzar (tabla consolidada)

| Severidad | Criterio | Decisión |
|---|---|---|
| **BLOQUEANTE A LANZAMIENTO** | Signup/login/reserva/chat/admin tira 500 consistente; emails críticos no llegan en 1 min; agenda F1/F2 no funciona; ficha de servicio activo rinde 404 | Posponer lanzamiento al respaldo 2026-11-25. Debugear + PR. |
| **BLOQUEANTE PERO WORKAROUND** | Un flujo colateral (compartir) rompe pero el core funciona | Evaluar en el momento — si el workaround es claro y no afecta al 80% de users, GO lanzamiento con hotfix post-launch en lista. |
| **COSMÉTICO** | Texto desalineado, un icono mal, un loader feo, spacing, placeholder específico | GO lanzamiento. Anotar en BACKLOG para post-launch. |
| **VOSEO VISIBLE** | Cualquier verbo en 2ª persona rioplatense (`elegí`, `contactá`, `podés`, `tenés`, `verificá`, etc.) en UI, email, toast, confirm dialog | Hotfix directo antes del freeze 16:00 CLT — patrón ya identificado como P3 de 3ª instancia, el PO no tolera la 4ª. |
| **TAXONOMÍA "AGENDAMIENTO"** | Cualquier email, subject, toast, o UI que diga "agendamiento" o "solicitud de agendamiento" | Hotfix antes de 16:00 (entry ya en BACKLOG — deuda emails + templates del sweep #3). Puede quedar para post-launch si lo aceptas como diferible. |

---

## 5. Si algo falla: cómo reportar

Para cada fail que detectes, mándame en el chat:

1. **Paso exacto** donde reventó (ej. "1.8 — configurar agenda F1, guardar slot miércoles 10:00").
2. **Timestamp** CLT (nivel minuto basta — ej. "14:32 CLT").
3. **Qué viste vs qué esperabas** (ej. "Toast 'Error al guardar, intenta nuevamente' — esperaba que el slot quede listado").
4. **URL y dispositivo** (ej. "móvil Android Chrome, `/proveedor/configurar-agenda?servicioId=xxx`").
5. **Si pudiste**: screenshot (pega al chat directo) + contenido de consola si estás en desktop (F12 → Console → últimas 5 líneas).

Yo cruzo con:
- **Sentry**: issues nuevos en la ventana del timestamp.
- **Vercel runtime logs**: por path del endpoint que falló (retención extendida en Pro).
- **Supabase logs (prod-ro)**: auth events, postgres errors, por ventana temporal.

Con eso decido si es fixable en < 30 min o si justifica posponer el lanzamiento al 25.

---

## 6. Cleanup post-smoke

> **ACTUALIZACIÓN PO 2026-11-17 post-deploy #116**: con la postergación del lanzamiento al 2026-11-25, las cuentas smoke se **CONSERVAN** para la próxima ronda de smokes. **NO se ejecuta cleanup** mientras la postergación esté vigente.
>
> - **Proveedor smoke** (`acanocts+smokeprov@gmail.com`): queda **suspendido** (`proveedores.estado = 'suspendido'`) para que el RPC `buscar_servicios` no lo retorne — no aparece en `/explorar` ni en catálogos públicos. La cuenta + perfil + servicios + agenda quedan intactos en BD. Reactivable en 1 UPDATE cuando se arme el próximo smoke.
> - **Tutor smoke** (`acanocts+smoketutor@gmail.com`): se conserva sin modificaciones. No tiene exposición pública (los tutores no se listan).
> - **Admin** (`acanocts@gmail.com`): sin cambios.
>
> El DELETE profundo descrito en §6.2 **NO corre** mientras la postergación esté vigente. Se ejecutará solo si el PO decide retirar las cuentas smoke del sistema de forma definitiva — hoy la decisión es conservar.
>
> Lo que SÍ puede ejecutarse (si el UI de suspensión no alcanzó):

Decisión PO: lanzamos sin proveedores precargados, así que `es_ejemplo=true` queda descartado (dejaría cuentas ficticias visibles con aviso "EJEMPLO"). Protocolo histórico en dos tiempos (vigente solo si el PO decide retirar las cuentas smoke; obsoleto mientras la postergación conserva las cuentas).

### 6.1 Apagado inmediato (ni bien termines el smoke admin)

Apenas cierres §3, **desactiva** los servicios publicados por la cuenta smoke proveedor para sacarlos del catálogo público antes del borrado profundo. Mientras los apagas el DELETE puede esperar con tranquilidad.

**Vía 1 — desde la UI del proveedor** (preferida, es el camino que tu usuario final usa):
- Loguéate como `acanocts+smokeprov@gmail.com` en desktop perfil B → `/proveedor` → "Mis servicios" → cada servicio → toggle "Activo" en off, o botón "Despublicar".
- Verifica en el móvil incógnito (sin login): `/explorar` con filtro Paseos → la card smoke no debe aparecer.

**Vía 2 — SQL directo** (más rápido si el UI falla o si hay más de 1 servicio):
```sql
BEGIN;
SET LOCAL role = 'service_role';
UPDATE public.servicios_publicados
   SET activo = false
 WHERE proveedor_id IN (
       SELECT id FROM public.proveedores
        WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'acanocts+smokeprov@gmail.com')
 )
RETURNING id, titulo, activo;
COMMIT;
```
`SET LOCAL role='service_role'` porque `servicios_publicados` tiene trigger `servicios_publicados_guard_fn` que bloquea UPDATE no-admin. Verifica que `RETURNING` lista los servicios con `activo=false`. Si vuelve vacío, chequea `information_schema.columns` por el nombre real del campo (podría ser `estado` o `is_active`).

### 6.2 DELETE profundo con protocolo P5 (al final del día, pre-freeze)

Pásame los **IDs** reales (yo los extraigo con SELECT read-only de prod-ro apenas me los pidas) y yo te entrego el SQL listo con snapshot + verif previa + DELETE + verif posterior. Este es el esqueleto para que lo revises ahora:

**Fase 1 — Snapshot read-only (prod-ro, lo corro yo con MCP y te lo pego)**
```sql
-- A) Resolver IDs raíz
WITH ids AS (
  SELECT id AS uid_tutor FROM auth.users WHERE email = 'acanocts+smoketutor@gmail.com'
), ids2 AS (
  SELECT id AS uid_prov  FROM auth.users WHERE email = 'acanocts+smokeprov@gmail.com'
)
SELECT (SELECT uid_tutor FROM ids) AS uid_tutor,
       (SELECT uid_prov  FROM ids2) AS uid_prov;

-- B) Counts por tabla a borrar (lo que esperamos borrar)
SELECT 'usuarios_buscadores' t, COUNT(*) FROM public.usuarios_buscadores
 WHERE auth_user_id = '<uid_tutor>'
UNION ALL
SELECT 'proveedores', COUNT(*) FROM public.proveedores
 WHERE auth_user_id = '<uid_prov>'
UNION ALL
SELECT 'servicios_publicados', COUNT(*) FROM public.servicios_publicados
 WHERE proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
UNION ALL
SELECT 'agendamientos', COUNT(*) FROM public.agendamientos
 WHERE usuario_id = '<uid_tutor>' OR proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
UNION ALL
SELECT 'conversations', COUNT(*) FROM public.conversations
 WHERE tutor_id = '<uid_tutor>' OR proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
UNION ALL
SELECT 'messages', COUNT(*) FROM public.messages
 WHERE conversation_id IN (
   SELECT id FROM public.conversations
    WHERE tutor_id = '<uid_tutor>' OR proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
 )
UNION ALL
SELECT 'contactos', COUNT(*) FROM public.contactos
 WHERE auth_user_id = '<uid_tutor>'
UNION ALL
SELECT 'evaluaciones', COUNT(*) FROM public.evaluaciones
 WHERE usuario_id = '<uid_tutor>' OR proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
UNION ALL
SELECT 'notifications', COUNT(*) FROM public.notifications
 WHERE user_id IN ('<uid_tutor>', '<uid_prov>');
```

El SQL exacto depende de los nombres reales de columna; yo valido contra `information_schema.columns` antes de mandártelo (regla P6).

**Fase 2 — Transacción de borrado (la ejecutas tú en Supabase Studio prod)**

Un solo bloque `BEGIN; ... COMMIT;` para que todo caiga atómico. Orden hijo → padre, con `RETURNING id` en cada DELETE para auditoría.

```sql
BEGIN;
SET LOCAL role = 'service_role';  -- bypass triggers _guard_fn de proveedores/servicios/evaluaciones

-- 1. Mensajes (hijos de conversations)
DELETE FROM public.messages
 WHERE conversation_id IN (
   SELECT id FROM public.conversations
    WHERE tutor_id = '<uid_tutor>' OR proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
 )
RETURNING id;

-- 2. Conversaciones
DELETE FROM public.conversations
 WHERE tutor_id = '<uid_tutor>' OR proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
RETURNING id;

-- 3. Evaluaciones
DELETE FROM public.evaluaciones
 WHERE usuario_id = '<uid_tutor>' OR proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
RETURNING id;

-- 4. Contactos (tracking de mensaje/whatsapp/llamada/email)
DELETE FROM public.contactos
 WHERE auth_user_id = '<uid_tutor>'
RETURNING id;

-- 5. Agendamientos (reservas)
DELETE FROM public.agendamientos
 WHERE usuario_id = '<uid_tutor>' OR proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
RETURNING id;

-- 6. Notifications (tanto del tutor como del proveedor)
DELETE FROM public.notifications
 WHERE user_id IN ('<uid_tutor>', '<uid_prov>')
RETURNING id;

-- 7. Favoritos (si los hay)
DELETE FROM public.favoritos
 WHERE auth_user_id = '<uid_tutor>'
RETURNING id;

-- 8. Servicios publicados (hijos de proveedores)
DELETE FROM public.servicios_publicados
 WHERE proveedor_id IN (SELECT id FROM public.proveedores WHERE auth_user_id = '<uid_prov>')
RETURNING id, titulo;

-- 9. Perfil proveedor
DELETE FROM public.proveedores
 WHERE auth_user_id = '<uid_prov>'
RETURNING id, nombre_publico;

-- 10. Perfil tutor
DELETE FROM public.usuarios_buscadores
 WHERE auth_user_id = '<uid_tutor>'
RETURNING id, nombre;

-- 11. Auth users (último; SIN SET LOCAL role=service_role, queda en postgres superuser —
--     CLAUDE.md § "SET LOCAL role='service_role' NO se propaga al schema auth")
RESET role;
DELETE FROM auth.users
 WHERE email IN ('acanocts+smoketutor@gmail.com', 'acanocts+smokeprov@gmail.com')
RETURNING id, email;

-- Si todo el RETURNING se ve correcto → COMMIT. Si algo salió raro → ROLLBACK.
COMMIT;
```

**Fase 3 — Verificación posterior** (yo la corro con prod-ro y te confirmo):

> **Ajuste 2026-11-17 (dato operativo PO)**: el proveedor smoke quedó con **nombre "Pedro"** (no "Smoke") y el servicio **"Paseos smoke prelaunch"** en categoría **Adiestramiento**. Las verificaciones por `nombre ILIKE '%smoke%'` NO lo detectan — la Fase 2 ya borra por **correo → id** (correcto), y la Fase 3 verifica usando los mismos correos resueltos al momento, antes del vaciado completo si queremos foto previa, o después para confirmar 0.

```sql
-- Verificación POST-COMMIT: todas las filas deben retornar 0 (auth.users
-- ya vaciado por la Fase 2; cualquier residuo con proveedor_id/usuario_id
-- antes del DELETE es evidencia del leak).
--
-- Usa las referencias por correo + por tiempo de creación (ventana del
-- smoke 2026-11-17). Si alguien matchea hoy y NO es el smoke, es dato
-- ajeno — hay que revisar.
SELECT 'auth.users' t, COUNT(*)::int AS n FROM auth.users
 WHERE email IN ('acanocts+smoketutor@gmail.com', 'acanocts+smokeprov@gmail.com')
UNION ALL
SELECT 'usuarios_buscadores_huerfanos', COUNT(*)::int FROM public.usuarios_buscadores
 WHERE auth_user_id NOT IN (SELECT id FROM auth.users)
   AND created_at > '2026-11-17 00:00:00-03'::timestamptz
UNION ALL
SELECT 'proveedores_huerfanos', COUNT(*)::int FROM public.proveedores
 WHERE auth_user_id NOT IN (SELECT id FROM auth.users)
   AND created_at > '2026-11-17 00:00:00-03'::timestamptz
UNION ALL
SELECT 'servicios_publicados_smoke', COUNT(*)::int FROM public.servicios_publicados
 WHERE titulo = 'Paseos smoke prelaunch'
    OR titulo ILIKE '%smoke prelaunch%'
UNION ALL
SELECT 'agendamientos_huerfanas', COUNT(*)::int FROM public.agendamientos
 WHERE created_at > '2026-11-17 00:00:00-03'::timestamptz
   AND usuario_id NOT IN (SELECT id FROM auth.users);
```
Todas las filas deben retornar 0. Si algún `_huerfanos` > 0 → residuo → DELETE focalizado antes del freeze.

**Fase 4 — Plan de reversión**

No hay reversión post-COMMIT: las cuentas smoke no tenían data valiosa. Si algo revienta **durante** la transacción (FK no prevista, SET LOCAL mal ubicado, trigger no bypasseado), el `ROLLBACK` deja todo intacto y te mando el SQL corregido en un turno más.

### 6.3 Storage (opcional)

Si subiste foto en §1.7 (servicio), hay un objeto en `servicios-fotos` que no se borra con el DELETE de BD. Dos opciones:
- **A**: ignorarlo — ocupa ~pocos KB, se limpia post-launch con sweep aparte.
- **B**: me pasas el path (lo veo en `storage.objects` con un SELECT) y te doy el DELETE sobre storage API.

Recomendación: **A** (ignorar, es trivial).

---

**Fin de la guía. Me avisas cuando arranques, cuando termines cada bloque (proveedor → tutor → admin), o si algo te frena. Yo corro Fase B (Lighthouse) + Fase C (checklist) en paralelo para que estén al freeze.**
