# Funnel de contacto del tutor — profundización (2026-11-22)

Written for: el PO (Aldo), como complemento a [`docs/auditorias/funnel-contacto-tutor-20261120.md`](../auditorias/funnel-contacto-tutor-20261120.md) con detalle operativo para instrumentación y optimización pre-campañas.

**Alcance de este doc**: profundiza los 6 pasos del funnel con (a) micro-fricciones no listadas en el doc anterior, (b) instrumentación GA4 granular propuesta, (c) copy sugerido de mitigación, (d) KPIs/SLOs para primera campaña, (e) playbook paso a paso de lo que sucede desde la primera impresión del ad hasta el primer contacto exitoso.

**Base de datos**: 1 tutor real en prod (el PO) + 9 tutores en total (mayoría smokes). Muchos números son teóricos; se validarán con data de campañas.

---

## Diagrama consolidado del funnel

```
            [CAMPAÑA / ORGÁNICO]
                     │
                     ▼
       ┌───────────────────────────────┐
       │ VISITA (anónimo)              │
       │ Pisada en /, /explorar,       │   ≈ 1000 visitas target
       │ /{categoria}, /{cat}/{comuna} │   (hipotético campaña)
       └───────────────────────────────┘
                     │  ~60-70% ven ≥ 1 ficha
                     ▼
       ┌───────────────────────────────┐
       │ FICHA (anónimo)               │
       │ /servicio/{id} o perfil prov  │   ≈ 400-700 fichas vistas
       └───────────────────────────────┘
                     │  ~15-25% tocan CTA (contactar/reservar/fav)
                     ▼
       ┌───────────────────────────────┐
       │ LOGIN GATE                    │
       │ LoginRequiredModal            │   ≈ 60-175 toques de CTA
       └───────────────────────────────┘
                     │  ~40-60% continúan a registrar
                     ▼
       ┌───────────────────────────────┐
       │ REGISTRO WIZARD               │
       │ /register role=tutor          │   ≈ 25-105 registros iniciados
       └───────────────────────────────┘
                     │  ~70-85% completan form
                     ▼
       ┌───────────────────────────────┐
       │ EMAIL CONFIRMATION            │
       │ Supabase magic link + landing │   ≈ 18-90 registros creados
       └───────────────────────────────┘
                     │  ~70-80% confirman (benchmark)
                     ▼
       ┌───────────────────────────────┐
       │ POST-LOGIN                    │
       │ Idealmente vuelve a ficha     │   ≈ 12-72 usuarios nuevos activos
       │ origen; hoy cae en home       │
       └───────────────────────────────┘
                     │  ~40-60% hacen contacto real
                     ▼
       ┌───────────────────────────────┐
       │ CONTACTO (mensaje/WA/llamada) │
       │ Evento `contacto_iniciado`    │   ≈ 5-45 contactos reales
       └───────────────────────────────┘
                     │  ~50-70% pasan a reserva (post contacto)
                     ▼
       ┌───────────────────────────────┐
       │ RESERVA (F1/F2)               │
       │ `agendamientos` row created   │   ≈ 3-30 reservas
       └───────────────────────────────┘
                     │  ~60-80% proveedor confirma
                     ▼
       ┌───────────────────────────────┐
       │ RESERVA CONFIRMADA            │
       │ Estado terminal "verde"       │   ≈ 2-24 reservas cerradas
       └───────────────────────────────┘
```

**Observación crítica**: el **drop del 85-98%** entre "visitas" y "contactos reales" está casi todo concentrado en 3 pasos: (1) convertir visita en ficha vista, (2) convertir ficha en toque de CTA, (3) convertir toque de CTA en registro completo. Estos 3 son el foco de la optimización pre-campañas.

**Oportunidad obvia**: hoy toda la fricción del flow está en el paso 3-5 (gate de login → confirmación email → vuelta al contexto perdido). Si H1 + H2 + H3 del doc anterior aterrizan, la conversión visita→contacto puede subir de un hipotético **2-4%** actual a **5-8%** proyectado — duplicación.

---

## Micro-fricciones NO listadas en el doc anterior

Estas son fricciones de bajo impacto individual pero que suman contra conversion. Ninguna es bloqueante; conjunto es lo que vale.

### Paso 1 (visita) — micro-fricciones

| # | Fricción | Dónde | Costo cognitivo | Fix |
|---|----------|-------|------------------|------|
| M-V1 | Header con CTA ambiguo ("Registrarse" vs "Soy proveedor" vs "Explora") sin jerarquía visual clara | `components/Shared/Header.tsx` | ~2-3 seg por visita, decisiones diferidas | Primary "Explora servicios" + secondary "Soy proveedor" |
| M-V2 | Banner "EXCLUSIVO LANZAMIENTO" en header consume 32px del viewport mobile | `components/Shared/Header.tsx` (banner) | Pérdida visual | Remover (ver nav-global D4) |
| M-V3 | No hay señal de "cuántos servicios hay" en landing principal | `pages/index.tsx` | Visitante no sabe si hay oferta suficiente | Badge "12 proveedores activos en Santiago" (data real) |
| M-V4 | Logo del header no vuelve a home clicable de forma ultra-visible — usuarios móviles no siempre lo asocian | `components/Shared/Header.tsx` | Confusión en navegación | Pre-launch audit visual (ya en D1 nav-global) |

### Paso 2 (consideración) — micro-fricciones

| # | Fricción | Dónde | Costo | Fix |
|---|----------|-------|------|------|
| M-C1 | Chips de filtros categoría + comuna en `/explorar` no son sticky al hacer scroll | `components/Explore/SidebarFiltros.tsx` | Usuario pierde contexto filtros | `sticky top-X` en desktop |
| M-C2 | Breadcrumb inconsistente: `/paseos/providencia` muestra "Paseos en Providencia", pero `/servicio/{uuid}` no muestra breadcrumb a categoría/comuna | `pages/servicio/[id].tsx` | Pérdida de contexto hierarchical | Breadcrumb visible en ficha |
| M-C3 | Bidding visual contra señal de precio: cards con precios bajos dominan arriba del fold sin señal de calidad | Catálogo | Favorece servicios baratos sin diferenciar calidad | Ordenamiento alternativo "destacados primero" (necesita campo `destacado`) |
| M-C4 | Si el user filtra por categoría + comuna sin resultados, mensaje empty state sin link "Explora en comunas vecinas" | `pages/explorar.tsx` | Dead-end | Empty state con comunas alternativas |

### Paso 3 (intento contacto) — micro-fricciones

| # | Fricción | Dónde | Costo | Fix |
|---|----------|-------|------|------|
| M-I1 | LoginRequiredModal dice "Para contactar necesitas tener cuenta" (negativo) en vez de "Crea tu cuenta gratis en 30 segundos" (positivo) | `components/Shared/LoginRequiredModal.tsx` | Tono reactivo | Copy positivo + beneficio |
| M-I2 | Sin indicador visible de "esta es una acción que requiere cuenta" ANTES de hacer click en el CTA | ficha + cards | User decide click esperando action, se le gate | Tooltip sutil "Crea cuenta para contactar" en hover (desktop) / badge sutil (mobile) |
| M-I3 | El modal muestra "Iniciar sesión" y "Registrarse" iguales — pero 90%+ del traffic es nuevo | `LoginRequiredModal.tsx` | Decisión binaria innecesaria para primer touch | Primary "Crear cuenta" + secondary "Ya tengo cuenta" |

### Paso 4 (registro) — micro-fricciones

| # | Fricción | Dónde | Costo | Fix |
|---|----------|-------|------|------|
| M-T1 | Step 1 ("Elegir rol") es cognitivo redundante — el user que llegó por click "Contactar" ya es tutor | `pages/register.tsx` | +1 click innecesario | Pre-select `rol='tutor'` cuando origen = LoginRequiredModal |
| M-T2 | Form de tutor no tiene "continuar con Google" | `pages/register.tsx` | Password friction | OAuth Google (Supabase lo soporta, ~2-3h implementar) |
| M-T3 | Password sin indicador de fuerza — user elige password débil, Supabase rechaza, back-and-forth | `pages/register.tsx` | Fricción invisible al primer intento | Visual meter de fuerza |
| M-T4 | Sin mostrar "al crear cuenta aceptas Términos" — compliance + confianza | `pages/register.tsx` | Riesgo legal + señal baja de seriedad | Copy fine print con checkbox |

### Paso 5 (confirmación email) — micro-fricciones

| # | Fricción | Dónde | Costo | Fix |
|---|----------|-------|------|------|
| M-E1 | Email de confirmación llega de `noreply@...` genérico — algunas inboxes filtran a spam | `pages/api/auth/welcome.ts` | 20-40% pueden no verlo | From real "equipo@pawnecta.com" (ya está en algunos emails) |
| M-E2 | Sin preview del mensaje que recibirán tras confirmar | landing register | Usuario no sabe qué esperar en inbox | Mini-mockup del email "Te llegó un mensaje de equipo@pawnecta.com" |
| M-E3 | Página `/email-confirmado` no tiene CTA específico al servicio origen (H1 doc anterior) | `pages/email-confirmado.tsx` | H1 = ALTA | Ya listado |
| M-E4 | Sin reenvío fácil de email si no llega — user frustrado abandona | `pages/email-confirmado.tsx` / fallback | 5-10% de abandono | Botón "No te llegó? Reenviar" con cooldown 60s |

### Paso 6 (post-login primera acción) — micro-fricciones

| # | Fricción | Dónde | Costo | Fix |
|---|----------|-------|------|------|
| M-P1 | Sin "bienvenida" personalizada al primer login — user cae en home como si nada hubiera pasado | `pages/index.tsx` o redirect | Baja sensación de progreso | Toast "¡Hola {nombre}! Ya puedes contactar proveedores" al primer login |
| M-P2 | Sin suggestion de "estos son los proveedores verificados cercanos a ti" en home post-login | `pages/index.tsx` | Decisión paralizada | Sección personalizada (requiere comuna del user) |
| M-P3 | Modal de contacto por primera vez no explica "cómo funciona" — user no sabe si el mensaje llega al proveedor por chat interno o email | `MessageThread.tsx` / ficha CTA | Confusión | Sub-copy "El proveedor recibe un email + notif push. Su respuesta llega a tu bandeja." |

---

## Instrumentación GA4 granular propuesta

El doc anterior listó 5 eventos custom. Acá propongo la taxonomía completa con dimensions para hacer debugging de drop-off efectivo.

### Eventos por paso del funnel

| Evento | Dispara en | Parámetros |
|--------|-----------|-----------|
| `page_view` (automático) | Cada página | `page_path`, `page_title` |
| `view_catalog` | Mount de `/explorar` o `/[categoria]` | `categoria?`, `comuna?`, `results_count` |
| `view_service_detail` | Mount de `/servicio/{id}` | `service_id`, `provider_id`, `category`, `comuna`, `price_desde` |
| `view_provider_profile` | Mount de `/proveedor/{id}` | `provider_id`, `verified`, `has_services`, `service_count` |
| `cta_contacto_click` | Click "Contactar" en ficha o card | `service_id`, `source` (ficha/card/busqueda), `logged_in` (bool) |
| `cta_reservar_click` | Click "Reservar" en ficha | `service_id`, `tipo` (F1/F2), `logged_in` |
| `login_gate_shown` | LoginRequiredModal mounts | `action_intent` (contacto/reserva/favorito), `source_service_id?` |
| `login_gate_choice` | Click en modal | `choice` (login/register/dismiss) |
| `register_step_viewed` | Paso del wizard aparece | `step` (1/2/4), `role` (tutor/proveedor) |
| `register_completed` | POST a `/api/auth/signup` success | `role`, `source` (gate/organic) |
| `email_confirmed` | Landing `/email-confirmado` | `time_since_register_h`, `has_return_url` |
| `post_login_action` | Primera acción tras confirm | `action_type` (contacto/reserva/favorito/exploracion), `time_since_confirm_min` |
| `contacto_iniciado` | INSERT a `contactos` | `canal`, `service_id`, `provider_id`, `source` (ficha/dashboard) **← KEY EVENT** |
| `reserva_creada` | INSERT a `agendamientos` | `service_id`, `tipo`, `price`, `estado` (pendiente/confirmada) **← KEY EVENT** |
| `reserva_confirmada_x_proveedor` | UPDATE estado → confirmada | `agendamiento_id`, `horas_respuesta` **← KEY EVENT** |

### Custom dimensions propuestas

1. **source_campaign**: `organic / ads_google / ads_meta / direct / referral / email` — poblada en todos los eventos a partir de `utm_source`.
2. **user_segment**: `anonymous / tutor_new (<7d) / tutor_active (≥7d con actividad) / tutor_lapsed (>30d sin actividad)` — calculada server-side.
3. **service_tier**: `free (sin agenda) / f1 (slots) / f2 (estadia)` — por ficha.

Con estas 3 dimensions + los 15 eventos, el PO puede responder:
- "¿Cuántas visitas de ads google se convierten en contacto?" (filter campaign=ads_google, funnel visit→contacto)
- "¿Qué paso tiene más drop en campaña Meta?" (comparar eventos sequence por campaign)
- "¿Usuarios anónimos ven más fichas que logueados?" (segment anonymous vs tutor_*)

**Esfuerzo total instrumentación**: ~4-6h. Es sprint propio ANALYTICS-FUNNEL-DETALLE pre-campañas.

---

## KPIs y SLOs propuestos para la primera campaña

### KPIs a reportar semanal

| KPI | Fórmula | Benchmark objetivo pre-launch | Target campaña |
|-----|---------|-------------------------------|----------------|
| Visitas totales | GA4 `page_view` únicas | — | 1000+/semana |
| Tasa de rebote | % users con <2 pageviews | <60% | <50% |
| Fichas vistas / visita | `view_service_detail` / visits | ~0.5-0.7 | >0.8 |
| CTR a login gate | `login_gate_shown` / `cta_*_click` | ~0.5 | >0.7 |
| Conversion gate → registro | `register_completed` / `login_gate_choice=register` | ~0.5-0.6 | >0.65 |
| Tasa confirmación email | `email_confirmed` / `register_completed` | ~0.75 | >0.85 |
| Contacto / registro confirmado | `contacto_iniciado` (user) / `email_confirmed` | ~0.4-0.6 | >0.5 |
| Reserva / contacto | `reserva_creada` / `contacto_iniciado` | ~0.5 | >0.6 |
| Reserva confirmada / reserva creada | `reserva_confirmada_x_proveedor` / `reserva_creada` | ~0.7 | >0.8 |
| **Conversión total visitas → reserva confirmada** | producto | ~0.5-1.5% | >2% |

### SLOs operacionales (gating para la campaña)

| SLO | Métrica | Umbral verde | Acción si rojo |
|-----|---------|--------------|----------------|
| Latencia P95 home | GA4 `first_contentful_paint` | <2.5s | Investigar + fix perf |
| Latencia P95 ficha | GA4 `first_contentful_paint` | <3.0s | Investigar |
| Errors rate | Sentry issues/day | <5 | Pausar campaña, triage |
| 4xx/5xx rate | Vercel logs | <1% | Pausar campaña |
| Tiempo respuesta proveedor (mediana) | `respondido_at - created_at` en `agendamientos` | <24h | Alert al PO + ping manual al proveedor |

---

## Playbook paso a paso — primera impresión al primer contacto

**Setup**: tutor "María, 28 años, Providencia, está buscando paseador para su golden Max". Entra via ad Meta "Paseador para tu perro — Pawnecta".

### T=0:00 — Click en ad
- Aterriza en `pages/[categoria]/[comuna].tsx` = `/paseos/providencia`.
- **Hoy**: ve título "Paseadores de perros en Providencia", 3-6 cards de servicios, filtros laterales, sticky header con "Registrarse" CTA.
- **Instrumentación hoy**: `page_view`. Instrumentación propuesta: `view_catalog` con `categoria=paseos`, `comuna=providencia`, `results_count=N`.
- **Oportunidad**: hero específico "Encontramos N paseadores en Providencia. Todos verificados." (H6 verif badge visible).

### T=0:05 — Scroll del catálogo
- Mira 2-3 cards sin tocar.
- **Hoy**: sin heatmap / sin eventos. Imposible saber cuánto tiempo mira cada card.
- **Instrumentación propuesta**: `scroll_depth` (25%, 50%, 75%, 100%).

### T=0:20 — Click en primera card
- Aterriza en `/servicio/{uuid}` ficha completa.
- **Hoy**: ve foto hero, precio, descripción, galería, botón "Contactar", botón "Reservar", botón "WhatsApp".
- **Instrumentación hoy**: `page_view`. Propuesta: `view_service_detail` con dimensions.
- **Oportunidad**: badge "N tutores contactaron a este proveedor esta semana" (social proof quant).

### T=1:30 — Lee descripción, mira fotos
- **Hoy**: galería con ~3-6 fotos. Lightbox visible.
- **Oportunidad**: time-on-page tracker + heatmap (Hotjar o Clarity post-launch).

### T=2:00 — Click "Contactar"
- Hoy: `LoginRequiredModal` aparece.
- **Instrumentación propuesta**: `cta_contacto_click` + `login_gate_shown`.
- **Fricción M-I1-M-I3**: user ve "necesitas cuenta para contactar" — tono reactivo.
- **Copy sugerido**: "Crea tu cuenta gratis en 30 segundos para chatear con {nombre del proveedor} — ya guardamos tu interés en este servicio."

### T=2:15 — Click "Registrarse"
- Aterriza en `/register?role=tutor&return_to=/servicio/{uuid}` (propuesta H1).
- **Hoy**: no hay `return_to` → cae en /register genérico → tras confirmar email vuelve a home.
- **Fix H1**: localStorage o query param guarda URL origen.

### T=2:30-3:30 — Completa form registro
- Datos: nombre, email, password, (RUT optional — M-T1 propone remover).
- **Fricción M-T2**: sin "continuar con Google" → 60s de tecleo.
- **Fricción M-T3**: password weak rechazado al submit.

### T=3:45 — "Confirma tu email"
- Página con "te enviamos email a maria@...".
- **Hoy**: sin preview del remitente / no muestra mockup del email.
- **Fricción M-E2**: user no sabe si mirar inbox ya o esperar.

### T=4:00 — Email recibido → click link
- Supabase Auth handler → aterriza en `/email-confirmado`.
- **Hoy**: página con "Tu cuenta ya está activa" + botón "Ir al sitio".
- **Oportunidad H1**: button "Volver al servicio que estabas viendo" (link al URL guardado en localStorage/return_to).

### T=4:20 — Click "Volver al servicio"
- Aterriza de vuelta en `/servicio/{uuid}`.
- **Hoy**: no hay señal de "estás logueada ahora — podés contactar".
- **Oportunidad M-P1**: toast "¡Bienvenida María! Ya puedes chatear con {nombre}".

### T=4:30 — Click "Contactar" de nuevo
- Abre `MessageThread` o modal de primer mensaje.
- **Hoy**: modal con textarea + botón "Enviar".
- **Fricción M-P3**: user no sabe si el proveedor recibe email + push o solo chat.
- **Oportunidad**: sub-copy "El proveedor recibe un email + push notification. Su respuesta llega acá."

### T=5:00 — Escribe + envía mensaje
- INSERT a `conversations` + `messages` + `contactos` (canal=mensaje).
- **Instrumentación propuesta**: `contacto_iniciado` con `canal=mensaje`, `service_id`, `provider_id`.
- **KEY EVENT** para campaña: 5 minutos del click en el ad a contacto real.

### T+24h — Respuesta del proveedor
- Push notification + email al tutor.
- Tutor abre chat, lee respuesta, agenda reserva.
- **Instrumentación propuesta**: `reserva_creada`.
- **KEY EVENT**: ahora se mide el tiempo total del funnel: click ad → reserva confirmada.

**Observación**: en el flow ideal (con H1 + H2 + H3 aterrizados), el camino click-to-contact es **5 minutos** y zero fricción. Hoy, con contexto perdido post-confirm email, es más cerca de 8-12 minutos y con 15-25% de abandono extra en el paso "qué servicio estaba viendo?".

---

## Queries nuevas (complementan las del doc del 20-11)

### Q-FT-7 — Time-to-first-contact desde registro

```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (c.created_at - ub.created_at))/3600) AS avg_horas_registro_a_contacto,
  MIN(EXTRACT(EPOCH FROM (c.created_at - ub.created_at))/60) AS min_min,
  MAX(EXTRACT(EPOCH FROM (c.created_at - ub.created_at))/3600) AS max_horas
  FROM public.usuarios_buscadores ub
  JOIN auth.users au ON au.id = ub.auth_user_id
  JOIN public.contactos c ON c.auth_user_id = au.id
 WHERE ub.created_at > NOW() - INTERVAL '30 days';
```

Qué dice: cuánto tarda un tutor nuevo en hacer su primer contacto post-registro. Benchmark deseable: mediana <30 min, máximo <24h.

### Q-FT-8 — Tutores registrados que vieron ≥N fichas antes de contactar

Útil si implementamos tracking de `view_service_detail`:

```sql
-- Placeholder: requiere table `page_views` o similar
-- SELECT distinct auth_user_id, COUNT(DISTINCT service_id) as fichas_vistas
--   FROM page_views
--  WHERE ...
```

Si GA4 custom events están configurados, equivalente en GA4 Explorer: `Path Analysis` con origen = page_view de ficha, destino = cta_contacto_click.

### Q-FT-9 — Reservas que nacieron SIN pasar por chat (atajo F1 picker)

```sql
SELECT a.id, a.servicio_id, a.estado, a.created_at,
       (SELECT COUNT(*) FROM public.conversations c 
         WHERE c.servicio_id = a.servicio_id 
           AND c.client_id = (SELECT auth_user_id FROM public.usuarios_buscadores WHERE id = a.tutor_id)) AS convs_previas
  FROM public.agendamientos a
 WHERE a.created_at > NOW() - INTERVAL '30 days'
 ORDER BY a.created_at DESC;
```

Qué dice: cuántas reservas se hacen por agenda F1/F2 sin chat previo. Si el picker funciona bien, debería haber reservas con `convs_previas=0` y estado directo `confirmada`.

### Q-FT-10 — Proveedores que NO respondieron chat en 48h+

```sql
SELECT p.nombre_publico, 
       COUNT(c.id) AS convs_abiertas,
       AVG(EXTRACT(EPOCH FROM (NOW() - m.sent_at))/3600) AS promedio_horas_sin_respuesta
  FROM public.proveedores p
  JOIN public.conversations c ON c.sitter_id = p.auth_user_id
  JOIN public.messages m ON m.conversation_id = c.id
 WHERE m.sender_id = c.client_id
   AND NOT EXISTS (SELECT 1 FROM public.messages m2 
                    WHERE m2.conversation_id = c.id 
                      AND m2.sender_id = p.auth_user_id 
                      AND m2.sent_at > m.sent_at)
   AND m.sent_at < NOW() - INTERVAL '48 hours'
 GROUP BY p.nombre_publico, p.id
 ORDER BY promedio_horas_sin_respuesta DESC;
```

Qué dice: proveedores con conversaciones "muertas" sin respuesta. Candidato a ping manual del PO o campaña de re-engagement de proveedores.

---

## Mitigaciones de abandono por paso con copy sugerido

### Paso 3 — Login gate (M-I1 / M-I3)

**Copy actual (aproximado)**:
> "Para contactar al proveedor necesitas tener una cuenta."
> [Iniciar sesión] [Registrarse]

**Copy sugerido**:
> "¡Un paso más!"
> "Crea tu cuenta gratis en 30 segundos para chatear con {nombre_proveedor}. Te guardamos el servicio para que no lo pierdas."
> [Crear cuenta gratis] (primary)
> [Ya tengo cuenta] (secondary)

**Impacto esperado**: +15-25% conversion gate → registro.

### Paso 5 — "Reenviar email" en landing register

**Agregado propuesto** en `pages/register.tsx` post-submit:
> "¿No recibiste el email?"
> [Reenviar email] (cooldown 60s)
> "O chequea tu carpeta de spam."

**Impacto esperado**: +10-15% confirmación.

### Paso 6 — Post-login toast + CTA contextual

**Agregado propuesto** en `pages/email-confirmado.tsx` con URL origen guardada:
> "¡Hola {nombre}! Tu cuenta está activa."
> "Estabas viendo: {nombre_servicio} de {nombre_proveedor}."
> [Volver al servicio] (primary) [Explorar más] (secondary)

**Impacto esperado**: +20-40% retención post-confirm (H1).

---

## Recomendaciones pre-campañas finales

**Sprint TUTOR-FUNNEL-PRE-CAMPAÑA** (nuevo ítem BACKLOG propuesto):

1. H1 — preservar URL origen pre-registro (3-4h) · impacto +20-40%
2. H3 — quitar RUT del path tutor (1h) · impacto +5-10%
3. M-I1 + M-I3 — copy nuevo LoginRequiredModal (2h incluye revisión con PO)
4. M-E4 — botón "Reenviar email" con cooldown (2-3h)
5. M-P1 — toast de bienvenida en primer login (1h)
6. M-P3 — sub-copy "cómo funciona el chat" en primer mensaje (1h)
7. Instrumentación GA4 granular (4-6h) — bloqueante para medir todo lo anterior

**Total estimado**: ~15-20h. Realizable en 2-3 días pre-launch si se arranca el lunes temprano.

**Lo que NO entra en el sprint pre-campañas**:
- H2 (favoritos localStorage) — es 4-6h propio, puede ir en segundo sprint post-launch con data real.
- H8 (continuar como invitado) — cambio estructural; esperar data real primero.
- OAuth Google (M-T2) — post-launch (configuración + testing + legal fine print).

---

## Firma

Esta profundización es el playbook operativo del funnel tutor para los primeros 30 días post-campaña. Re-evaluar KPIs semanalmente; ajustar sprint tocando las barreras que la data muestre primero.
