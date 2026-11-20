# Programa de referidos — propuesta — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: proponer programa de referidos para acelerar la meta "100 proveedores activos" + crecimiento orgánico post-campañas.
**Principio**: zero incentivo monetario inicialmente (zero caja). Incentivos no-monetarios con potencial de escalar.

---

## Dos caminos del programa

### Camino P — Proveedor → Proveedor

**Flow**: proveedor activo A genera link único + lo comparte con amigo B (que podría ser proveedor). B se registra con el link → ambos reciben beneficio.

**Modelo mental**: "Ayúdanos a crecer Pawnecta en tu zona + gana algo por el esfuerzo".

### Camino T — Tutor → Tutor

**Flow**: tutor Camila comparte link con otra tutora Sofía. Sofía se registra + hace primera reserva → ambas reciben beneficio.

**Modelo mental**: "Comparte Pawnecta con tus amigos tutores".

---

## Incentivos no-monetarios candidatos

### Para proveedores

#### I-P1 — Badge "Embajador Pawnecta"

Badge visible en perfil público (sobre el badge "Identidad verificada"). Texto del badge: "Embajador — ha referido a N proveedores".

**Pros**:
- Zero costo caja.
- Prestige proveedor (equivalente a "top reviewer" Amazon).
- Fomenta identidad de marca.

**Cons**:
- Valor percibido depende de si otros proveedores también tienen → novelty decrece.

#### I-P2 — Boost SEO/posición

Perfiles de proveedores que refieren 2+ proveedores activos aparecen primero en el catálogo de su categoría × comuna.

**Pros**:
- Alto valor percibido (más vistas = más reservas).
- Mecanismo gamificado.

**Cons**:
- Puede degradar UX del tutor si "mejor ranking" ≠ "mejor proveedor". Requiere que el referido también califique.

#### I-P3 — Features premium gratis 3-6 meses

Cuando se implemente el modelo suscripción (ver `pricing-strategy.md` fase 1), proveedores referentes tienen Pro gratis por X meses.

**Pros**:
- Alto valor percibido post-monetización.
- Alinea con roadmap monetización.

**Cons**:
- Requiere monetización activa para que el beneficio tenga valor real. No útil hoy.

#### I-P4 — Acceso temprano a nuevas features

Proveedores con 3+ referidos exitosos reciben:
- Beta testing de features nuevas (ej. agenda sync Google, dashboard stats avanzado).
- Reuniones Q&A con el equipo Pawnecta.

**Pros**:
- Senso de "estoy construyendo esto contigo".
- Zero costo caja.

**Cons**:
- Requiere features nuevas regulares para que el beneficio sea tangible.

### Para tutores

#### I-T1 — Badge "Early Adopter"

Solo visible para el tutor en su propio perfil (no público). Reconocimiento personal de haber sido de los primeros.

**Pros**:
- Zero costo.
- Sentimiento de "pertenencia".

**Cons**:
- Valor percibido limitado (no visible socialmente).

#### I-T2 — Cupón de descuento con proveedores participantes

Tutor referente + referido reciben cupón 10-20% off en próxima reserva. Proveedor acepta el cupón voluntariamente al momento del pago (cash recibe menos).

**Pros**:
- Incentivo tangible.
- No sale de caja Pawnecta (proveedor absorbe).

**Cons**:
- Requiere **buy-in del proveedor** para absorber el descuento. Fricción adicional.
- Tracking complicado sin pago in-platform (hoy no hay).

#### I-T3 — Acceso temprano a nuevas features

Similar a I-P4 pero para tutores. Ej. beta de recomendaciones personalizadas, chat avanzado.

**Pros**:
- Zero costo.

**Cons**:
- Valor limitado si features son poco relevantes para casual users.

---

## Recomendación del programa inicial (mínimo viable)

### Fase 0 (ahora → arranque campañas): **Camino P con I-P1 + I-P4**

**Por qué**:
- Zero caja + alto valor percibido + alineado con meta 100 proveedores.
- I-P1 (Badge Embajador): visible público → social proof positivo.
- I-P4 (acceso temprano): construye community + feedback loop con early adopters.

**Workflow técnico**:
1. **Endpoint `/api/referidos/generar-codigo`** (ya existe en `pages/api/referidos/`). Verificar que está activo + generar código único por proveedor (6-8 chars alfanum).
2. **Campo `codigo_referido` en `proveedores`** (verificar si existe). Si no, migration aditiva.
3. **UI en `/proveedor`**: sección "Invita a otro proveedor" con tu código + link compartible (`pawnecta.com/register?rol=proveedor&ref=XXXXXX`).
4. **Capture del referrer en signup**: cuando B se registra con `?ref=XXXXXX`, guardar `proveedor_referido_por=A.id` en su fila `proveedores`.
5. **Threshold**: A obtiene badge "Embajador" cuando su count de referidos activos (B que publicó al menos 1 servicio) llega a 3.
6. **Badge render**: en ficha pública + card, mostrar "Embajador Pawnecta" al lado del badge "Identidad verificada".

**Esfuerzo estimado**: 4-6h (endpoint + migration + UI + render badge).

### Fase 1 (post-primera campaña): **Camino T con I-T2 (cupones)**

Cuando haya volumen de tutores + proveedores estabilizados, agregar camino T con cupones opt-in del proveedor.

**Esfuerzo**: 6-10h (sistema de cupones).

### Fase 2 (post-primera semana campañas): **Camino P con I-P3 (features premium)**

Cuando se activen suscripciones Pro, agregar beneficio Pro gratis por X meses a proveedores que refieren N+.

**Esfuerzo**: 2-3h agregar lógica sobre sistema de suscripción existente.

---

## Riesgos de fraude

### R1 — Auto-referir (cuenta duplicada)

**Riesgo**: proveedor A crea 2 cuentas (A + B) con emails distintos pero misma identidad real. Se refiere a sí mismo → ambos ganan beneficio.

**Mitigación**:
- **Verificación email obligatoria** para que el referido cuente (ya existe).
- **Verificación RUT**: si ambos tienen mismo RUT → marcar como duplicado + revocar beneficio. Requiere que proveedores tengan RUT verificado.
- **Verificación teléfono**: mismo patrón que RUT.
- **Threshold acción**: beneficio solo se otorga cuando el referido publica 1 servicio Y ese servicio recibe al menos 1 contacto tracked (prueba de actividad real).
- **Rate limit**: máximo 10 referidos activos por cuenta.

### R2 — Referidos sin intención real

**Riesgo**: proveedor A comparte el link con 50 personas por copy-paste masivo. Varios registran "para probar" sin intención real → inflación de métricas.

**Mitigación**:
- **Gate "publicó 1 servicio"** (ver R1). Registrarse no basta.
- **Gate tiempo**: referido debe estar activo (last_sign_in_at <30 días) para contar.

### R3 — Spam + bots

**Riesgo**: bots automatizados usan links de referidos para flooder signups.

**Mitigación**:
- **Rate limit por IP** del endpoint signup (ya existe en `authLimiter`).
- **Captcha opcional** post-X signups con mismo referrer (futuro, baja prioridad).

### R4 — Churn de proveedor referente

**Riesgo**: proveedor A refiere a 5 proveedores, luego A deja de usar Pawnecta. ¿El badge se mantiene?

**Decisión propuesta**: badge **se mantiene** histórico (A fue Embajador en su momento). Si A se desactiva o suspende → badge se oculta pero se recupera si reactiva cuenta.

---

## Tracking + métricas

### Métricas clave

- **Rate de referidos por proveedor** (count distinct referidos / count proveedores activos).
- **Conversion rate del referido** (registró → publicó 1 servicio → activo).
- **CAC de referidos** vs CAC de campañas pagadas (post-datos).
- **Tiempo mediano desde referido → primera reserva recibida** del referido.

### Dashboard admin propuesto

Panel `/admin/referidos` con:
- Top 10 proveedores por referidos activos.
- Timeline de referidos últimos 30 días.
- Detección de patrones sospechosos (ej. 1 IP con 5+ signups referidos).

**Esfuerzo**: 3-4h incluyendo query + UI.

---

## Comunicación del programa

### Lanzamiento

1. **Email a los 26 proveedores actuales** anunciando el programa + su código personal.
2. **Banner en panel `/proveedor`**: "Invita a otro proveedor y gana Embajador Pawnecta".
3. **Post IG** explicando el programa (sin foco en tutor fase 0).

### Mensajería

**Para proveedores**:

> Invita a otro proveedor que conozcas al que le pueda servir Pawnecta. Cuando se registre con tu código y publique su primer servicio, ganas el badge **Embajador Pawnecta** en tu perfil — visible a todos los tutores.

> Tu código: **{CODE}**
>
> Link para compartir: `pawnecta.com/register?rol=proveedor&ref={CODE}`

**Para tutores (Fase 1)**:

> Comparte Pawnecta con un amigo tutor. Cuando se registre y haga su primera reserva, ambos reciben cupón 20% off del proveedor participante (sujeto a disponibilidad).

---

## Decisiones pendientes del PO

### D1. Arrancar con Fase 0 (Camino P, I-P1 + I-P4) ya o esperar

**Pregunta**: ¿autorizás sprint 4-6h implementar Fase 0?

**Recomendación**: sí, pre-primeras-campañas. Acelera camino a 100 proveedores.

**Impacto si no se decide**: default = programa queda en BACKLOG, crecimiento orgánico sin boost referidos.

### D2. Threshold para Badge Embajador — 3 referidos o 5

**Pregunta**: ¿cuántos referidos activos para ganar el badge?

**Recomendación**: **3** inicialmente (achievable). Subir a 5 si se banaliza.

**Impacto si no se decide**: default = 3.

### D3. Camino T con cupones — ¿viable con proveedores actuales?

**Pregunta**: ¿valide preguntar a los 26 proveedores actuales si estarían dispuestos a absorber cupón 20% off?

**Recomendación**: encuesta rápida por email + 5-10 proveedores participantes alcanza. No hace falta 100%.

**Impacto si no se decide**: default = Fase 1 cupones se pospone.

### D4. Dashboard admin referidos pre-campañas

**Pregunta**: ¿construir `/admin/referidos` ya o solo cuando tengamos volumen?

**Recomendación**: **post-primera-campaña**. Con 26 proveedores no se justifica dashboard; query manual admin alcanza.

**Impacto si no se decide**: default = post-campañas.

### D5. Mantener código al dar de baja proveedor

**Pregunta**: ¿si un proveedor con badge Embajador se desactiva, el badge se revoca o se mantiene?

**Recomendación**: **se oculta temporalmente**, se mantiene en BD. Si reactiva → vuelve a mostrarse. Retiro por suspensión moderación admin → sí revoca.

**Impacto si no se decide**: default = ocultar en desactivación, mantener en BD.

### D6. Fraude detection pasive vs active

**Pregunta**: ¿detectar patrones de fraude vía query admin manual o cron automatizado?

**Recomendación**: manual pre-primeras-campañas. Automatizado post-volumen (cuando el cron valga la pena).

**Impacto si no se decide**: default = manual.

---

## Firma

Programa listo para arrancar Fase 0 con GO del PO. Zero costo caja + alineado con meta 100 proveedores + escalable a Fase 1 y Fase 2 post-tracción.
