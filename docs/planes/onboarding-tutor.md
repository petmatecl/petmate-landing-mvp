# Plan de onboarding del tutor — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: definir el flow de bienvenida para un tutor nuevo que acaba de confirmar email + hacer primer login. Hoy no hay acompañamiento — aterrizar en `/explorar` sin contexto genera baja activación.
**Referencia**: complementa `docs/planes/journey-activacion-proveedor.md` (journey proveedor, tarea 13).

---

## Estado actual

**Flow actual del tutor** (observable en código):

1. Signup via `/register` (wizard 2 steps: rol + datos).
2. Email confirmación con link a `/email-confirmado`.
3. Click al link → `/email-confirmado` muestra "Tu cuenta ya está activa".
4. User hace click "Ir a /explorar" o similar → aterriza en `/explorar` con grid general de servicios.
5. **Zero acompañamiento post-login**. User queda a la deriva.

**Problemas observables**:
- No sabe por dónde empezar.
- No conoce las categorías (10 disponibles).
- No sabe si tiene que reservar / contactar / cómo funciona.
- Si no encuentra un servicio en su comuna, no sabe que puede dejar su email en "waitlist".
- No tiene retención post primera sesión si no contacta a alguien.

---

## Flow propuesto — tutor nuevo

### Fase 1 — primer login (T=0)

**Trigger**: user acaba de confirmar email + primer `signInWithPassword` success. Detectable por `last_sign_in_at` reciente (primeros 60s) + ausencia de datos de engagement previos (`contactos`, `agendamientos`, `favoritos`).

**Pantalla propuesta**: tras confirmación, redirect a `/bienvenida` (página nueva específica para onboarding tutor; no al `/explorar` genérico).

#### Elementos de `/bienvenida`

**Hero — mensaje personalizado**:
```
¡Hola {nombre}! Bienvenido a Pawnecta.

Aquí encuentras servicios para tu mascota en tu comuna: paseadores,
cuidadores, veterinarios y más.

Vamos a ayudarte a encontrar lo que buscas.
```

**3 pasos guiados (cards grandes clickeables)**:

1. **"¿Qué servicio necesitas?"** → modal de 10 categorías con íconos. Click → `/[categoria]`.
2. **"¿En qué comuna estás?"** → dropdown de comunas prellenado con la comuna del tutor si la capturó al registro, o "Selecciona tu comuna" si no.
3. **"¿Qué mascota tienes?"** → 3 opciones (Perro / Gato / Otro). Click → se guarda como filtro default del user (opcional, mejora catálogo futuro).

**CTA inferior**:
```
Ya quiero explorar → /explorar?categoria=X&comuna=Y&mascota=Z
```

**Skip link**:
```
Prefiero explorar sin filtros → /explorar
```

#### Alternativa minimalista (si /bienvenida se siente overkill)

Página nueva no, sino **modal de bienvenida** sobre `/explorar` al primer login:

- Modal `WelcomeTutorModal` mounted on first page view post-signup.
- 3 preguntas de los pasos arriba.
- Al cerrar, se guarda flag `welcomed_at` en `usuarios_buscadores` (nueva columna) + se aplica los filtros.

**Esfuerzo**:
- Página nueva `/bienvenida`: 3-4h + ~2h diseño.
- Modal: 2-3h + ~1h diseño. **Recomendación: modal**, más flexible + menos ruta nueva.

### Fase 2 — primer día (T=0 a T+2h)

**Trigger**: user completó o skipeó `/bienvenida` + navega por `/explorar`.

**Prompts contextuales (tour de 3 pasos)**:

1. **En `/explorar`**: tooltip sutil (puede ser el componente [Joyride](https://docs.react-joyride.com/) o custom):
   > "Usa los filtros del lado izquierdo para refinar por precio, disponibilidad o mascota."
   Solo se muestra una vez. Dismissible.

2. **En primera `ficha` visitada**: tooltip:
   > "Si te gusta este proveedor, apriétale ❤ Favoritos para guardarlo + contactarlo cuando quieras."
   Solo se muestra una vez.

3. **Si el user intenta Reservar o Contactar y NO ha llenado perfil (foto, teléfono)**: toast:
   > "Agrega tu teléfono y una foto al perfil — ayuda al proveedor a responderte más rápido."
   Link a `/usuario/perfil`.

**Esfuerzo**: 2-3h (tour component + 3 tooltips + state de "ya visto").

### Fase 3 — a las 48h sin acción (T+48h)

**Trigger**: user confirmado hace +48h sin `favoritos` + sin `contactos` + sin `agendamientos`.

**Segundo correo onboarding** (cron propio nuevo `/api/cron/recordatorio-tutor-sin-accion`, schedule `0 15 * * *`):

```
Hola {nombre},

Hace un par de días te registraste en Pawnecta. Vimos que aún no has
contactado a ningún proveedor — queremos ayudarte a dar el siguiente paso.

Algunas ideas:

- ¿Buscabas algo específico? Entra a explorar con tu categoría.
  [Ver servicios de {categoria_popular_comuna}]

- ¿Quieres hablar con alguien antes? Nuestro equipo responde en
  hola@pawnecta.com.

- ¿No encontraste el servicio que buscabas en tu comuna? Déjanos saber
  qué falta.
  [Decirnos qué buscabas]

Un abrazo,
Equipo Pawnecta
```

**Lógica del envío**:
- Cron diario detecta tutors con `email_confirmed_at > NOW() - 48h` y sin actividad.
- Un solo envío por user (columna `recordatorio_sin_accion_enviado_at` en `usuarios_buscadores`).
- Opt-out respeta preferencia del user (si tiene flag `notif_emails: false`, skip).

**Esfuerzo**: 2-3h (cron + template React Email + migration columna + spec e2e).

### Fase 4 — a los 7 días sin contactar (T+7d)

**Trigger**: user con primer contacto NO iniciado a los 7 días. Posible que no encontró servicio en su comuna.

**Email + action**:

```
Hola {nombre},

Vimos que estuviste explorando pero aún no contactaste a nadie. ¿Falta
algo en tu comuna que debamos agregar?

Cuéntanos qué buscabas:
- Categoría: ____
- Comuna: ____
- Lo que no encontraste: ____

[Respondenos en hola@pawnecta.com]

Gracias por tu paciencia — estamos sumando proveedores todos los días.
```

**Nota**: este email captura demanda insatisfecha para priorizar activación de proveedores por categoría/comuna (data para la meta 100 proveedores).

**Esfuerzo**: ya cubierto en el mismo cron de Fase 3 con otro bloque; +30 min.

---

## Resumen flow completo

| Fase | Timing | Trigger | Formato | Esfuerzo |
|---|---|---|---|---|
| 1 | T=0 | Primer login post-confirm | Modal `WelcomeTutorModal` | 2-3h |
| 2 | T=0 → T+2h | Navega `/explorar` + `/servicio/[id]` | Tooltips contextuales | 2-3h |
| 3 | T+48h | Sin acción (fav, contacto, reserva) | Email recordatorio + 3 CTAs | 2-3h |
| 4 | T+7d | Sin contacto | Email solicita feedback + alimenta meta 100 proveedores | +30 min (same cron) |

**Esfuerzo total sprint**: ~6-8h código + diseño. Impacto: +20-40% activación tutor-nuevo → primer contacto / reserva.

---

## Analytics instrumentation (ver docs/auditorias/analitica-20261120.md)

Eventos nuevos a trackear con este sprint:

- `tutor_bienvenida_vista` (dispara al mount del modal).
- `tutor_bienvenida_completada` (user completó las 3 preguntas).
- `tutor_bienvenida_skipeada` (user cerró sin completar).
- `tutor_filtro_aplicado_desde_bienvenida` (click en CTA "Ya quiero explorar").
- `tutor_tooltip_mostrado` con `{step: 1|2|3}`.
- `tutor_tooltip_dismiss`.
- `tutor_sin_accion_48h_email` (cron tracked emit).
- `tutor_sin_contacto_7d_email` (cron tracked emit).

---

## Edge cases

### EC-1 — User cierra modal sin completar

Guardar flag `welcomed_at` igual (fue mostrado) + aplicar filtros default (sin preseleccionar). El modal nunca se repite.

### EC-2 — User no tiene comuna en el signup

Modal pide la comuna como parte de las 3 preguntas. Si user no sabe o skipea, se guarda `comuna: null` + filtros default sin filtro de comuna.

### EC-3 — User es dual rol (tutor + proveedor)

Si el user se registró como proveedor pero visita `/explorar` también como tutor, el `WelcomeTutorModal` NO aparece (ya tiene `proveedores` row). Caso raro — hoy no priorizable, pero escalar si aparece.

### EC-4 — User tiene favoritos ya al momento del cron T+48h

Significa que ya está activo. Cron skipea.

### EC-5 — User en "waitlist" sin signup completo

Waitlist es flow previo, no cae en este onboarding. Usuarios solo entran al flow post-signup confirmado.

### EC-6 — User rechaza consent GA4

Modal + tooltips igual funcionan (son UI). Solo no tracked en GA4.

---

## Decisiones pendientes del PO

### D1. Modal `WelcomeTutorModal` vs página `/bienvenida`

**Pregunta**: ¿modal sobre `/explorar` o página dedicada `/bienvenida`?

**Recomendación**: **modal**. Más flexible, menos ruta nueva, aterrizado en `/explorar` que ya tiene el contexto productivo.

**Impacto si no se decide**: default = modal.

### D2. Preguntar categoría / comuna / mascota o solo categoría

**Pregunta**: ¿3 preguntas o solo "categoría" para no sobrecargar?

**Recomendación**: **3 preguntas**. Son críticas para aplicar filtros efectivos + no invasivas (datos de preferencia, no PII). 30s de completion.

**Impacto si no se decide**: default = 3 preguntas.

### D3. Tour post-bienvenida con React Joyride o custom

**Pregunta**: ¿agregar [react-joyride](https://github.com/gilbarbara/react-joyride) (14kb gzipped) o tooltips custom?

**Recomendación**: **custom** (3 tooltips simples con portal + localStorage flag). Evita dependencia + mantiene paleta del proyecto. Esfuerzo similar.

**Impacto si no se decide**: default = custom.

### D4. Cron T+48h — ¿solo email o también SMS/WhatsApp?

**Pregunta**: ¿valide integrar canal WhatsApp para recordatorio (vía Twilio, Vonage, etc.)?

**Recomendación**: **solo email pre-campañas**. WhatsApp requiere integración + costos mensuales + regulación LATAM. Fase 2 con data real.

**Impacto si no se decide**: default = solo email.

### D5. Email T+7d — captura "qué buscabas" via form in-app o solo reply-email

**Pregunta**: ¿crear `/feedback-demanda` form dedicado o aceptar reply directo al email hola@pawnecta.com?

**Recomendación**: **reply-email** inicialmente. Barrera baja para el user + aggregator manual del PO. Si volumen de replies justifica, migrar a form.

**Impacto si no se decide**: default = reply-email.

### D6. Timing del cron T+48h

**Pregunta**: ¿15:00 UTC (12:00 CLT verano) o 22:00 UTC (19:00 CLT) ventana atardecer tipo "hora del perro"?

**Recomendación**: **19:00 CLT** (22:00 UTC), post-work hours, mejor open rate según benchmarks mail chimp mascotas LATAM.

**Impacto si no se decide**: default = 19:00 CLT.

---

## Referencia — comparar con Journey del Proveedor

El PO tiene aterrizado `docs/planes/journey-activacion-proveedor.md` (tarea 13 del 2026-11-19). Ese doc cubre:

- E1 Welcome (T=0) — ya existe.
- E2 Publica servicio (T+48h) — recordatorio automático.
- E3 Foto perfil (T+48h → +7d) — recordatorio.
- E4 "¿Necesitas ayuda?" (T+14d → +21d) — propuesta.

**Simetría con tutor**:
- Welcome: E1 proveedor ⇄ **Fase 1** tutor (modal post-login).
- Recordatorio 48h: E2/E3 proveedor ⇄ **Fase 3** tutor.
- Follow-up tardío: E4 proveedor ⇄ **Fase 4** tutor (pero a 7d en vez de 14d — tutor pierde interés más rápido).

**Implementación conjunta**: el cron recordatorio-sin-accion puede unificarse como `/api/cron/recordatorios-actividad` que atiende ambos (tutor + proveedor) con branching interno por rol. Esfuerzo total conjunto: ~3-4h si se arma unificado vs 2+2h separados.

---

## Firma

Plan listo para implementar cuando el PO autorice. Objetivo numérico: +25% tasa de "tutor → primer contacto en 48h" vs baseline actual.
