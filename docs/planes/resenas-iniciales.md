# Plan de generación de reseñas iniciales éticas — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: conseguir las primeras 20-30 reseñas verificadas en Pawnecta sin falsificar nada. Reseñas reales de servicios reales.
**Contexto**: hoy el sitio tiene 0 reseñas públicas (o muy pocas). El vacío impacta la confianza de tutores nuevos y la conversión. Pero publicar reseñas falsas destruye reputación irrecuperable si se descubre. Este doc arma el flujo legítimo.

---

## Principios éticos

1. **Cero reseñas inventadas**. Nunca. Ni por el equipo, ni "reseñas de ejemplo", ni perfiles seed.
2. **Transparencia del gate**: el tutor sabe que su reseña va pública con su nombre.
3. **Sin pago por reseña**. Incentivar al proveedor a *pedir* reseña es OK; pagar al tutor por escribirla no.
4. **Reseñas verificadas vs no verificadas** (sprint `reseñas-verificadas-postlaunch` vigente): distinguir las que vienen de reserva real confirmada vs las que vienen de contactos sin reserva.

---

## Formas éticas de conseguir reseñas iniciales

### Ruta 1 — Incentivos al proveedor para pedir a sus clientes (más efectiva)

**Comportamiento esperado**: proveedor ya tiene clientes reales fuera de Pawnecta (los que trae de su base propia). Si el proveedor convence a 3-5 de sus clientes de dejar una reseña en Pawnecta, cada proveedor aporta 3-5 reseñas → con 10 proveedores activos = 30-50 reseñas.

**Herramientas que el equipo construye** (sprint chico):

1. **Link directo para pedir reseña**: cada proveedor tiene un URL único `pawnecta.com/review/{servicio_id}?from={proveedor_id}` que abre el flujo de reseña pre-llenado (el usuario solo entra, se registra si hace falta, deja la nota 1-5 + comentario).
2. **Template de WhatsApp pre-llenado** para el proveedor:
   > "Hola {nombre cliente}, gracias por confiar en mí para {servicio}. ¿Podrías dejarme una reseña en Pawnecta? Toma 1 minuto y me ayuda mucho: {link}. Si te sirvió la experiencia, cuéntalo. Si no, también, agradezco el feedback honesto."
3. **Panel proveedor**: botón "Pedir reseñas" en `/proveedor` que:
   - Muestra el link pre-llenado.
   - Botón "Copiar al portapapeles".
   - Botón "Compartir por WhatsApp" (abre `wa.me` con el template).
   - Contador visible: "0/5 reseñas recibidas → aparecerás destacado al llegar a 5".

**Esfuerzo técnico**: 3-4h.
- Ruta `/review/[servicio_id]` con query params + redirect a login si hace falta.
- Botón + template WhatsApp en dashboard proveedor.
- Tracking del origen (`?from=` + proveedor_id) para medir efectividad.

**Impacto estimado**: 15-30 reseñas en primera semana si 10 proveedores lo usan.

### Ruta 2 — Flujo post-reserva que facilita dejar reseña

**Comportamiento esperado**: tras una reserva confirmada que el estado derivado detecta como REALIZADA, el sistema envía email al tutor (cron ya existe: `/api/cron/invitacion-resenas`) + muestra prompt en el panel de reservas del tutor.

**Hoy ya existe**: `pages/api/cron/invitacion-resenas.ts` manda email a tutores con reserva realizada hace +3 días sin reseña.

**Mejoras pre-campañas** (sprint chico):
1. **Email de invitación más efectivo**: subject "¿Cómo te fue con {proveedor}?" + CTA directo al form de reseña. Hoy el email es OK pero el CTA puede ser más grande / visible.
2. **Prompt in-app**: en `/mis-reservas` tab Historial, badge amarillo en cada card REALIZADA sin reseña con botón "Deja tu reseña".
3. **Recordatorio a 7 días** si no deja reseña (actualmente solo hay a los 3 días).

**Esfuerzo**: 2-3h.

**Impacto estimado**: +5-15 reseñas post-reserva en primer mes.

### Ruta 3 — Transición de testimonios externos (manual + consentimiento)

**Comportamiento esperado**: el proveedor ya tiene testimonios en Google Business Profile, Instagram, WhatsApp. Puede migrar esos testimonios a Pawnecta con autorización del cliente original.

**Flujo ético**:
1. Proveedor contacta a cliente real externo: "¿Me autorizas a publicar en Pawnecta la reseña que ya me dejaste en Google? Tendría tu nombre y la nota que pusiste."
2. Cliente responde SÍ o NO.
3. Con SÍ: proveedor envía el screenshot del testimonio + autorización escrita al equipo Pawnecta.
4. Equipo Pawnecta (admin) carga la reseña manualmente desde `/admin/evaluaciones`, con flag `verificada: false` (no viene de reserva pawnecta) y nota "Reseña migrada con autorización del cliente, originalmente en {Google/Instagram/etc.}".

**Herramientas que el equipo construye**:
- Form en `/admin/evaluaciones` para carga manual: campos autor_nombre, rating, comentario, servicio_id, fuente_original (text), fecha_original, link_prueba_opcional, autorizacion_escrita (text + archivo adjunto).
- Columna `fuente` en `evaluaciones` (`"pawnecta_reserva"`, `"migrada_google"`, `"migrada_ig"`, etc.) para auditoría.
- Badge sutil en la reseña migrada: "Opinión original en Google, publicada con autorización".

**Esfuerzo técnico**: 4-6h (migration + form + tracking).

**Impacto estimado**: 5-10 reseñas si 5 proveedores con base externa participan.

**Riesgo ético**: aceptable solo si:
- Autorización escrita verificable (screenshot de chat donde cliente autoriza, no "me dijo que sí").
- Badge visible de que es migrada (no engañoso).
- Rating y comentario literal, sin editar.

### Ruta 4 — Programa amigos & familia (controlado)

**Comportamiento esperado**: el PO (y el equipo cercano) contacta amigos/familia que ya conocen el servicio de un proveedor específico (ej. "mi amiga llevó a su perro con Juan Bou"). Les pide que dejen reseña real.

**Reglas éticas**:
- Cliente **tiene que haber usado el servicio** realmente (no "yo sé que Juan es bueno").
- Reseña escrita por el cliente, no por el PO.
- Divulgación al amigo: "esto será pública con tu nombre".

**Esfuerzo**: 0h técnico. Trabajo de outreach del PO.

**Impacto estimado**: 3-5 reseñas si el PO hace outreach dedicado.

**Riesgo**: cae en "amigos recomendando amigos" si no es honesto. Transparencia en la ejecución es la diferencia entre ético y no.

### Ruta 5 — Primera reserva free / descuento por reseña (post-reserva, no previa)

**Comportamiento esperado**: ofrecer al tutor "si dejas tu reseña después de tu primera reserva, tu segunda reserva tiene 20% off del proveedor" (el descuento lo pone el proveedor voluntariamente, no Pawnecta).

**Reglas éticas**:
- Descuento **post-reseña** (no condicionado al contenido).
- Cliente libre de dejar nota baja si corresponde.
- Clara en la UI: "Deja tu reseña y tu próxima reserva con este proveedor tendrá 20% off" sin "deja 5 estrellas y gana..."

**Esfuerzo técnico**: 6-8h (cupones + gestión + display).

**Impacto estimado**: alto pero requiere proveedor que ofrezca el descuento + sistema de cupones no existe hoy.

**Decisión**: baja prioridad hasta que haya sistema de cupones base.

---

## Prioridad recomendada

### Fase 1 — pre-campañas (meta primeras 15-25 reseñas en 2 semanas)

1. **Ruta 1 — Botón "Pedir reseñas"** (3-4h). Alto ROI.
2. **Ruta 2 — Mejoras cron + in-app prompt** (2-3h). Infra que amplifica Ruta 1.
3. **Ruta 4 — Outreach amigos & familia del PO** (0h código). El PO ejecuta.

**Total esfuerzo técnico fase 1**: ~5-7h. Impacto: 20-40 reseñas en 2 semanas.

### Fase 2 — primer mes post-campañas

4. **Ruta 3 — Migración testimonios externos con autorización** (4-6h). Suma 5-10 más.

### Fase 3 — post primer mes

5. **Ruta 5 — Cupones condicionados** (6-8h + decisión de producto sobre cupones). Decisión aparte.

---

## Spec e2e a cubrir

Al implementar las rutas 1-2, agregar specs:

1. **Link unique de proveedor**: tutor no-logueado abre `/review/{servicio_id}?from={proveedor_id}` → redirige a login → tras login vuelve al form → submit crea row en evaluaciones con rating + comment + user_id=tutor + servicio_id correcto.
2. **Botón panel proveedor**: proveedor logueado click en "Copiar link" → portapapeles tiene URL con query correcta.
3. **Email invitación**: cron detecta reserva REALIZADA +3 días sin reseña del tutor → manda email → open event tracked en Resend.
4. **Prompt in-app**: tutor abre `/mis-reservas` tab Historial → card REALIZADA sin reseña muestra botón "Deja tu reseña" → click abre modal → submit crea evaluation.

---

## Regla de moderación

Todas las reseñas pasan por moderación básica antes de publicarse (sprint reseñas-verificadas-postlaunch cubre este flow):
- Automática: filtro de palabras obviamente ofensivas / spam.
- Humana: admin revisa en `/admin/evaluaciones` las que el automático flagea + las migradas de ruta 3.

**Criterio de rechazo**:
- Lenguaje discriminatorio / amenaza.
- Palabras clave de SPAM (URLs comerciales, otros marketplaces).
- Rating 1-2 sin comentario explicativo (puede ser mala fe) — PO decide caso por caso.

**Criterio de NO rechazo** (importante):
- Rating bajo con comentario específico = reseña honesta negativa. Se publica.
- Crítica constructiva al proveedor = se publica tal cual.
- Variación ortográfica / coloquial = se publica (no editamos).

---

## Decisiones pendientes del PO

### D1. Ruta 1 (botón proveedor) como primera implementación

**Pregunta**: ¿autorizás arrancar sprint de 3-4h con Ruta 1 (link review + botón panel proveedor + template WhatsApp)?

**Recomendación**: sí. Más alto ROI. Compatible con el sprint paralelo FORM-SERVICIO-SIDEBAR-NAV (no se tocan los mismos componentes).

**Impacto si no se decide**: default = permanece en BACKLOG post-campañas.

### D2. Ruta 3 (migración testimonios) sí/no

**Pregunta**: ¿autorizás la ruta de migración de testimonios externos con autorización verificable? Hay riesgo reputacional si se opera mal; si se opera bien es win rápido.

**Recomendación**: sí para fase 2 (post primer mes operación) con cuidado operacional. Cada migración requiere documentación de autorización en `auditoria_admin` o similar.

**Impacto si no se decide**: default = no se hace, se busca solo rutas 1-2-4.

### D3. Outreach amigos & familia pre-campañas

**Pregunta**: ¿el PO está dispuesto a invertir ~4-6h de outreach personal en los próximos 10 días para pedir reseñas de amigos/familia que hayan usado servicios reales?

**Recomendación**: sí. Es trabajo operativo del PO, alto impacto en confianza visible de la plataforma pre-campañas. Mejor que reseñas vacías.

**Impacto si no se decide**: default = no se hace, se espera reseñas orgánicas.

### D4. Cupones condicionados (ruta 5)

**Pregunta**: ¿valide el sistema de cupones como feature de producto? Impacta roadmap más allá del objetivo "reseñas".

**Recomendación**: posponer. Decidir con data real post-campañas.

**Impacto si no se decide**: default = no se hace.

### D5. Badge "Verificada" vs "Original en Google" visibilidad

**Pregunta**: ¿cómo se señaliza que una reseña viene de reserva pawnecta vs migrada de Google? Mismo badge discreto o distinto?

**Recomendación**: badge "Verificada" (verde) solo para las de reserva pawnecta confirmada (sprint `reseñas-verificadas`). Reseñas migradas: nota discreta "Opinión migrada de {fuente} con autorización del cliente" (sin badge verde). Transparencia máxima.

**Impacto si no se decide**: default = mismo badge, que no diferencia. Ruta 3 requiere decidir antes de implementar.

---

## Firma

Plan listo para arrancar la Ruta 1 (botón proveedor) cuando el PO autorice. Objetivo numérico: 20 reseñas verificadas en 2 semanas post-sprint.
