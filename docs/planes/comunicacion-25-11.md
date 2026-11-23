# Plan de comunicación — lanzamiento 2026-11-25

**Audiencia**: PO · **Autor**: auditor (2026-11-19 noche).
**Objetivo**: drafts listos para 3 piezas que arrancan en el miércoles 25-11 10:00 CLT y acompañan la ventana T+0 → T+7d.

Español chileno neutro (tú, nunca vos). Sin emojis en la UI de la plataforma (regla CLAUDE.md), aunque sí están permitidos en redes sociales según el tono habitual de Pawnecta en IG (decidir el PO — ver D1 abajo).

Las piezas asumen que los correos transaccionales siguen siendo escritos por la plataforma (welcome, reserva, recordatorio) — este plan cubre **comunicación proactiva fuera del flow transaccional**.

---

## Pieza 1 — Correo a lista de usuarios registrados

**Destinatarios**: todos los users en `auth.users` con `email_confirmed_at IS NOT NULL` (verificado) que no hayan hecho opt-out del newsletter (si existe la columna; si no, todos los confirmados).

**Volumen esperado**: por verificar query `SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL` el 24-11.

**Remitente sugerido**: `Pawnecta <hola@pawnecta.com>` (consistencia con transaccionales). Alternativa: `Pawnecta <novedades@pawnecta.com>` si el PO quiere separar canal transaccional de newsletter (requiere crear alias en Zoho).

**Envío sugerido**: miércoles 25-11, 11:00 CLT (1h post-launch, cuando el equipo ya validó que todo opera). Vía Resend usando el endpoint ya existente del newsletter o via API ad-hoc.

**Subject**: `Pawnecta ya está abierta — encuentra el servicio perfecto para tu mascota`

**Preview text** (snippet visible en inbox antes de abrir): `Hoy lanzamos oficialmente. Explora paseadores, cuidadores, veterinarios y más, cerca de ti.`

### Cuerpo (draft)

```
Hola {nombre},

Hoy, miércoles 25 de noviembre, Pawnecta abre oficialmente sus puertas.
Te escribimos porque te registraste cuando estábamos en vista previa.
Gracias por confiar en nosotros desde el principio.

Qué puedes hacer ahora en pawnecta.com:

- Explorar servicios de paseadores, cuidadores, guarderías, veterinarios
  y más en tu comuna.
- Reservar directamente con horario y modalidad que te acomode.
- Chatear con el proveedor para coordinar detalles antes del servicio.
- Dejar reseñas que ayuden a otros tutores a elegir.

¿Eres proveedor? También puedes publicar tu primer servicio en minutos
desde tu panel.

Un par de cosas prácticas:

- Ciudades activas al lanzamiento: Santiago y alrededores.
- Horario de atención del equipo: lunes a viernes de 10 a 19.
- Si algo no funciona, escríbenos a hola@pawnecta.com — respondemos
  rápido.

Gracias por acompañarnos en este primer día.

El equipo Pawnecta

---

[Botón CTA] Explorar servicios
pawnecta.com

Si no quieres recibir más correos informativos de Pawnecta,
[desuscríbete aquí].
```

### Variantes por segmento

**Variante A — Tutores registrados**: cuerpo tal cual arriba.

**Variante B — Proveedores aprobados sin servicio publicado**: reemplazar bloque medio con:
```
Veo que tu cuenta de proveedor ya está aprobada. Si todavía no publicaste
tu primer servicio, hoy es un buen día. Toma 5 minutos y empieza a
recibir reservas:

[Botón CTA] Publicar mi primer servicio
pawnecta.com/proveedor
```

**Variante C — Proveedores con servicios publicados**: bloque dedicado:
```
Ya tienes tus servicios publicados. Hoy llega el tráfico real —
mantente atento a las reservas en tu panel y al chat con tutores
interesados. Responder rápido es la mejor manera de empezar.

[Botón CTA] Ir a mi panel
pawnecta.com/proveedor
```

### Nota operativa

- No usar imágenes grandes en el correo — hay costo de delivery (bounces si son muy pesados) + fatiga visual. Logo de Pawnecta en header (ya en los templates existentes).
- Checklist pre-envío: (a) Resend Delivered rate >95% las últimas 24h antes del envío; (b) link preview pegado en test mail funciona en 3 clientes (Gmail web, Outlook, Apple Mail); (c) un smoke a `hola@pawnecta.com` antes del broadcast real.

---

## Pieza 2 — Post de Instagram para el día 25

**Formato sugerido**: carrusel de 4 slides (estándar IG, scroll natural). Cero AI-generated images y cero stock de mascotas o personas (regla aterrizada 2026-11-19 — misma que aplica al blog). Usar ilustraciones vectoriales propias o capturas reales de la plataforma.

### Slide 1 — Anuncio principal

**Visual**: ilustración vectorial Pawnecta (paleta marca) con texto grande centrado.

**Texto on-slide**:
```
HOY ESTAMOS
ABIERTOS

pawnecta.com
```

### Slide 2 — Qué ofrecemos

**Visual**: grid de íconos Lucide monocromáticos (dog, scissors, home, heart) con labels. 10 categorías del catálogo.

**Texto on-slide**:
```
Paseos · Cuidado y Hospedaje
Peluquería · Veterinario
Adiestramiento · Guardería
Etología · Fotografía
Retratos · Traslado
```

### Slide 3 — Cómo funciona (tutores)

**Visual**: captura simplificada de 3 pasos del flow (home → ficha → reserva).

**Texto on-slide**:
```
1. Busca por categoría y comuna
2. Elige al profesional que te guste
3. Reserva directo desde la ficha
```

### Slide 4 — Call to action + contacto

**Visual**: logo + URL en grande.

**Texto on-slide**:
```
EMPIEZA A EXPLORAR
pawnecta.com

Dudas o feedback:
hola@pawnecta.com
```

### Caption del post

```
Hoy abrimos Pawnecta oficialmente.

Un marketplace hecho para que encuentres al profesional perfecto
para tu mascota — paseadores, cuidadores, veterinarios, peluqueros
y más — en tu propia comuna, con reserva directa desde la ficha
y chat para coordinar.

Si eres tutor: entra en pawnecta.com y busca por categoría.
Si eres proveedor: publica tu primer servicio en minutos.

Gracias a quienes nos acompañaron en vista previa estos meses.
Hoy empezamos juntos.

pawnecta.com

#pawnecta #mascotas #chile #petservices #santiago
```

### Hashtag strategy (opcional)

Agregar según alcance que busque el PO:
- Generales: `#mascotas #chile #petservices #santiago`
- Categoría-específicos: `#paseadordeperros #cuidadodemascotas #veterinariosantiago`
- Nicho local: `#providencia #lascondes #ñuñoa` + comuna donde se enfoque el push inicial.

### Timing sugerido

- Post principal: miércoles 25-11, 10:30 CLT (30 min post-launch, buen horario IG para alcance orgánico).
- Story de refuerzo: mismo día 19:00 CLT (horario pico IG en Chile).
- Post en Facebook (si se usa): mismo contenido adaptado, 11:00 CLT.

---

## Pieza 3 — Banner temporal en home

**Rationale**: comunicar "estamos en lanzamiento, feedback bienvenido" a users que llegan directo al sitio (no vía el correo ni IG). Cerrar el loop con un canal de feedback explícito para el primer día.

**Ubicación**: debajo del header principal, encima del hero actual. Alto ~40-60px. Dismissible por el user (con `localStorage` flag `pawnecta_banner_lanzamiento_dismissed=1`). Se auto-oculta el 2026-11-29 (T+4d) por timer dentro del componente.

**Variante A — minimalista (recomendada)**:

```jsx
<div className="bg-accent-50 border-b border-accent-200 py-2 px-4 text-center text-sm text-accent-900">
    <span className="font-medium">Pawnecta abrió hoy — </span>
    <span>¿algo no funciona?</span>{' '}
    <a href="mailto:hola@pawnecta.com" className="underline hover:text-accent-700">
        Cuéntanos por correo
    </a>
    <button onClick={dismissBanner} className="ml-3 text-accent-500 hover:text-accent-700" aria-label="Cerrar banner">×</button>
</div>
```

**Variante B — con fecha explícita** (si el lanzamiento se postergó): reemplazar primera span por:
```
<span className="font-medium">Pawnecta abrió el {fechaLanzamiento} — </span>
```

**Variante C — énfasis en la apertura** (si el PO quiere más fanfarria):
```
<span>Hoy, {fecha}, Pawnecta abre oficialmente. </span>
<a href="/explorar">Empieza a explorar →</a>
```

### Comportamiento

- Dismissible: user click en × oculta el banner permanentemente (en ese browser).
- Auto-hide: componente lee `new Date() >= 2026-11-29T00:00:00Z` y no renderea.
- Rendering: SSR-safe. Si `localStorage` no está disponible (prerender), renderea por defecto.
- Accesibilidad: `role="banner"` + `aria-label="Anuncio de lanzamiento"` + focus visible en el link y el close.

### Implementación sugerida

Nuevo componente `components/Shared/BannerLanzamiento.tsx` (~50 líneas). Mount en `pages/_app.tsx` o en `components/Layout.tsx` (donde ya vive el Header). Esfuerzo: 45 min + smoke visual.

---

## Comunicación extendida (T+1 a T+7)

**Día +1 (jueves 26-11)**: Post IG de agradecimiento — "Gracias por el primer día. En 24 horas tuvimos {X} nuevos tutores, {Y} proveedores publicando, {Z} reservas". Números concretos del dashboard T+24h.

**Día +2 (viernes 27-11)**: Story IG destacando algún proveedor con feedback positivo primeras 48h (foto + servicio + testimonio, siempre con autorización escrita del proveedor — ver regla CLAUDE.md sobre imágenes en blog).

**Día +5 (lunes 1-12)**: Correo de follow-up a users que registraron pre-lanzamiento pero no han usado la plataforma post-GO. Subject: "¿Cómo fue tu primera semana en Pawnecta?" — pedido de feedback + CTA a usar la plataforma.

**Día +7 (miércoles 3-12)**: Blog post retrospectivo "Primera semana de Pawnecta" con métricas agregadas. Publicado en `/blog`, promocionado en IG.

---

## Métricas a trackear (24h post-lanzamiento)

- Delivery rate del correo masivo (Pieza 1): >95% esperado.
- Open rate: típicamente 20-40% para listas opt-in (verificar con Resend Analytics).
- Click rate del CTA "Explorar servicios": meta >5%.
- Engagement del post IG (Pieza 2): likes + comments + saves + shares. Baseline ~5% del alcance.
- Clicks al banner home → correo (Pieza 3): tracking via UTM en el mailto o via Vercel Analytics custom event.
- Correos a `hola@pawnecta.com` con asunto relacionado a lanzamiento (volumen de feedback): medir en Zoho inbox.

---

## Decisiones pendientes del PO

### D1. Tono del post IG — con emojis o sin

**Pregunta**: la regla CLAUDE.md prohíbe emojis en la UI de la plataforma, pero IG es otro canal. El post actual está redactado sin emojis. ¿Mantener así o agregar emojis de mascota (🐕🐈) en caption y slides?

**Recomendación del auditor**: mantener sin emojis — consistencia con el tono de voz "marketplace profesional de servicios". Si querés darle calidez, mejor usar ilustraciones vectoriales con estilo (como ya está planteado) que emojis.

**Impacto si no se decide**: default sin emojis. Reversible (editable en IG post-publicación si el PO quiere ajustar).

### D2. Alias de correo separado para newsletter

**Pregunta**: ¿crear `novedades@pawnecta.com` en Zoho para separar transaccional de newsletter, o usar `hola@pawnecta.com` para todo?

**Recomendación del auditor**: usar `hola@pawnecta.com` para el primer correo. Crear `novedades@` recién cuando el newsletter sea recurrente (sprint 2027). Simplifica el flow actual, evita setup de un alias nuevo + configuración DKIM pre-launch.

**Impacto si no se decide**: default `hola@pawnecta.com`.

### D3. Lista de usuarios para el correo de Pieza 1 — todos o filtrados

**Pregunta**: ¿enviar a 100% de los `auth.users` confirmados, o filtrar solo los que tienen actividad (registraron un perfil o reservaron)?

**Recomendación del auditor**: todos los confirmados. Es el primer correo masivo; filtrar demasiado deja fuera a users "dormidos" que podrían reactivarse. Costo: Resend es pay-per-email pero el volumen esperado hoy es bajo (~decenas-centenas), despreciable.

**Impacto si no se decide**: default = todos confirmados.

### D4. Dismissibility del banner home

**Pregunta**: ¿el banner debe ser dismissible por el user (× cierra), o visible fijo durante 4 días?

**Recomendación del auditor**: dismissible. Users que llegan repetidamente al home ya saben del lanzamiento después de la primera vista; mantener el banner fijo es fatiga visual.

**Impacto si no se decide**: default dismissible con auto-hide el 29-11.

### D5. Variante del banner (A/B/C)

**Pregunta**: ¿cuál variante de copy del banner preferís? A (minimalista, pide feedback), B (con fecha explícita), C (énfasis en la apertura + CTA a /explorar).

**Recomendación del auditor**: A. Es la menos intrusiva + pone a hola@pawnecta.com como canal directo del equipo (importante en el primer día). C es más agresiva pero compite con el hero principal del home.

**Impacto si no se decide**: default A.

### D6. Trigger de envío del correo masivo

**Pregunta**: ¿envío automático a las 11:00 CLT (schedule script) o envío manual por el PO desde Resend Dashboard tras validar el launch?

**Recomendación del auditor**: envío manual por el PO. T+1h permite tiempo de confirmar que el sitio opera bien (smokes de T+0→T+30 del checklist pasan). Enviar el correo mientras hay un incidente activo sería contraproducente.

**Impacto si no se decide**: default = manual.

---

## Firma

Este plan arranca con la Pieza 1-2-3 el 25-11 y se cierra con el blog post retrospectivo del 3-12. Las variantes y métricas quedan como baseline — los números reales post-lanzamiento informan la estrategia del 2do push (sprint post-launch marketing).
