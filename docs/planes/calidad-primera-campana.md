# Plan de calidad — primera campaña pagada

Written for: el PO (Aldo), para orquestar la calidad del primer servicio prestado cuando lleguen tutores masivos vía campañas pagadas.

**Problema que resuelve**: hoy Pawnecta tiene 12-14 proveedores activos (pocos reales no-placeholder) y 1 tutor real. Al prender campañas de Meta / Google Ads, van a llegar ~100-500 tutores nuevos la primera semana. Si el primer servicio que contraten es mediocre, abandonan y no vuelven. Si es bueno, se convierten en advocates. **La ventana para construir reputación es la primera semana — no hay segunda oportunidad para la primera impresión**.

**Objetivo**: asegurar que los primeros 20-30 servicios prestados post-campaña tengan calidad por encima de la media del mercado.

---

## Principios de diseño

1. **Curar antes de filtrar**: no todos los proveedores están listos para recibir tutores masivos. Pre-seleccionar los top por categoría y marcarlos como "destacados" para que aparezcan arriba del catálogo durante la campaña.
2. **Monitoreo proactivo, no reactivo**: contactar al tutor + proveedor DESPUÉS del primer servicio, no esperar que un problema aparezca por sí solo.
3. **Feedback estructurado**: diseñar las preguntas post-servicio ANTES de que llegue el primer caso. Capturar data útil, no catalogar tickets.
4. **Fast recovery**: si un servicio sale mal, acción explícita del PO (reembolso del "vuelve a Pawnecta" con promo + llamada personal).

---

## Fase 1 — Pre-campaña: curar los destacados (3-5 días antes del launch)

### 1.1 Criterio de selección para "destacado"

Un proveedor se marca `destacado=true` si cumple **al menos 4 de 5**:

| # | Criterio | Fuente | Verificación |
|---|----------|--------|--------------|
| 1 | Carnet identidad verificado | `proveedores.rut_verificado = true` | Query SQL |
| 2 | Foto de perfil real (no genérica, mirada amable al cliente) | Revisión visual admin | Panel `/admin/proveedores` |
| 3 | Título y descripción de servicio pulidos (sin typos, sin trailing spaces, descriptivo) | Ver `docs/auditorias/catalogo-actual-titulos-20261122.md` | Audit titulos del 22-11 |
| 4 | Agenda activa (F1 o F2) para al menos 1 servicio | `servicios_publicados.duracion_slot_min IS NOT NULL OR fase_f2_activa` | Query SQL |
| 5 | Al menos 1 contacto previo trazado (señal de que puede responder) | `contactos WHERE auth_user_id = proveedor.auth_user_id` | Query SQL (ajustada a dirección correcta) |

**Hoy**: prácticamente ningún proveedor cumple los 5 (base pequeña). Objetivo pre-campaña: al menos **5 proveedores** que cumplan ≥4.

### 1.2 Query para identificar candidatos

```sql
WITH candidatos AS (
  SELECT 
    p.id, p.nombre_publico, p.foto_perfil, p.rut_verificado, p.verificacion_estado,
    (SELECT COUNT(*) FROM public.servicios_publicados s WHERE s.proveedor_id = p.id AND s.activo = TRUE) AS servicios_count,
    (SELECT COUNT(*) FROM public.servicios_publicados s 
      WHERE s.proveedor_id = p.id AND s.activo = TRUE 
        AND (s.duracion_slot_min IS NOT NULL OR s.fase_f2_activa = TRUE)) AS servicios_con_agenda,
    (SELECT COUNT(*) FROM public.conversations c 
      WHERE c.sitter_id = p.auth_user_id) AS convs_recibidas
  FROM public.proveedores p
  WHERE p.estado = 'aprobado' AND p.es_ejemplo IS DISTINCT FROM TRUE AND p.es_placeholder IS DISTINCT FROM TRUE
)
SELECT nombre_publico, 
       (CASE WHEN rut_verificado THEN 1 ELSE 0 END +
        CASE WHEN foto_perfil IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN servicios_con_agenda > 0 THEN 1 ELSE 0 END +
        CASE WHEN convs_recibidas > 0 THEN 1 ELSE 0 END) AS score,
       rut_verificado, foto_perfil IS NOT NULL AS tiene_foto,
       servicios_count, servicios_con_agenda, convs_recibidas
  FROM candidatos
 ORDER BY score DESC, servicios_count DESC;
```

El PO corre esta query pre-campaña. El 5-10 top score son los candidatos a destacado.

### 1.3 Contactar a los seleccionados

**Mensaje propuesto por WhatsApp o email directo del PO**:
> "Hola {nombre}, soy Aldo, el fundador de Pawnecta. Estamos a {N} días de arrancar campañas pagadas en Google y Meta. Por tu perfil pulido y tu respuesta a solicitudes, serás uno de los proveedores destacados que aparezcan arriba del catálogo durante las primeras 2-3 semanas. En breve tendrás más visitas y solicitudes. Lo importante: responde rápido (ideal <6h), confirma siempre lo que puedas cumplir y **si tienes alguna duda sobre el flow de la plataforma, respondeme por este medio en cualquier momento**. ¿Te sumas?"

**Qué mide**: si responden rápido a este mensaje → son los que van a responder rápido a tutores. Los que tardan >24h se excluyen del destacado.

### 1.4 Implementación del badge "Destacado"

Opción A — **sprint chico pre-campaña** (preferible, 3-4h):
- Agregar columna `proveedores.destacado boolean DEFAULT false`.
- Toggle en `/admin/proveedores`.
- RPC `buscar_servicios` ordena por `destacado DESC, created_at DESC` cuando `p_destacados_arriba=true`.
- Card del catálogo muestra badge "Destacado" (icono distintivo, no un emoji — siguiendo convención CLAUDE.md).

Opción B — **sin cambio de code** (fallback si no hay ventana):
- Dejar sistema actual (sin destacado) pero contactar manualmente al PO cada tutor nuevo para "sugerencias" curadas por email. Baja escala pero cero cambio de código.

Recomendación: Opción A. Esfuerzo 3-4h. Sprint `DESTACADO-PRE-CAMPAÑA`.

---

## Fase 2 — Durante la campaña: monitoreo proactivo diario

### 2.1 Dashboard del PO (admin + queries)

**Lo que el PO abre cada día 9 AM durante las primeras 2 semanas de campaña**:

1. **`/admin/metricas-proveedores`** → ya existe, muestra total activos + tendencia 7d.
2. **Nuevas secciones propuestas en el dashboard (ampliación pre-campaña)**:
   - Reservas de las últimas 24h (count + lista con: tutor, proveedor, servicio, estado).
   - Conversaciones nuevas últimas 24h (count + lista).
   - Proveedores con convs sin responder >12h (query Q-FT-10 del doc funnel-detalle).
   - Tutores nuevos registrados últimas 24h.

**Esfuerzo**: 2-3h. Sprint `DASHBOARD-CAMPAÑA-OPS`.

### 2.2 Alertas tempranas

**Umbrales que disparan email o push al PO** (vía Supabase cron o Sentry):

| Alerta | Umbral | Acción |
|--------|--------|--------|
| Proveedor con conv sin responder | >12h | Ping manual del PO al proveedor |
| Reserva pendiente sin confirmar | >24h | Email al proveedor "¿necesitas ayuda para responder?" |
| Primer contacto de un tutor nuevo | — | Email al PO "tutor {X} acaba de contactar — vigila primera experiencia" |
| Reserva cancelada por proveedor | — | Email al PO "cancelación — revisar motivo" |

**Esfuerzo**: 3-4h. Sprint `ALERTS-CAMPAÑA`.

### 2.3 Ping manual del PO al proveedor: playbook

Cuando una alerta dispara, el PO ejecuta:

**Caso A — proveedor silencioso >12h con conv pendiente**:
> "Hola {proveedor}, {tutor X} te escribió hace {N} horas en Pawnecta y aún no te responde. ¿Pudiste leer el mensaje? Si necesitas que te ayude con algo del sitio, dímelo. Es importante responder en el día porque los tutores están saliendo a buscar alternativas rápido."

**Caso B — reserva cancelada**:
> "Hola {proveedor}, vi que cancelaste la reserva con {tutor}. ¿Todo bien? Si hubo algo que podamos mejorar en la plataforma, cuéntame. Si el motivo fue puntual (fechas, enfermedad), déjalo claro en el chat para que el tutor sepa que fue específico y no que no quieres clientes."

**Caso C — tutor sin actividad post-registro**:
> "Hola {tutor}, soy Aldo el fundador de Pawnecta. Vi que te registraste y no has hecho contacto aún. ¿Te ayudo a encontrar lo que buscas? Cuéntame qué servicio necesitas y te sugiero el mejor proveedor para ti. (respuesta por este medio)"

---

## Fase 3 — Post-servicio: feedback estructurado

### 3.1 Email automático post-reserva confirmada 24h después de la fecha del servicio

**Asunto**: "¿Cómo fue tu experiencia con {nombre_proveedor}? 🐾" (sin emoji — reemplazar con icono Lucide en el template HTML)

**Cuerpo propuesto** (versión corta, 5 preguntas de 1 click):

```
Hola {nombre_tutor},

Esperamos que {mascota_nombre} haya pasado bien con {nombre_proveedor}. 
Cuéntanos tu experiencia en 2 minutos:

1. ¿Qué tan satisfecho estás con el servicio?
   [1 muy insatisfecho] [2] [3] [4] [5 muy satisfecho]

2. ¿El proveedor respondió a tiempo en el chat?
   [Sí, rápido] [Sí pero tardó] [No respondió a tiempo]

3. ¿El servicio cumplió con lo que esperabas?
   [Mejor de lo esperado] [Como lo esperaba] [Menos que lo esperado]

4. ¿Volverías a contratar al mismo proveedor?
   [Sí seguro] [Tal vez] [No]

5. ¿Recomendarías Pawnecta a un amigo?
   [Sí] [Tal vez] [No]

Y si quieres, déjanos un comentario abierto:
[textarea]

[Enviar feedback]
```

**Qué mide y qué hace cada pregunta**:
- P1 → NPS-like, numérico comparable.
- P2 → timing del proveedor (correlaciona con retención).
- P3 → gap entre promesa (copy ficha) y cumplimiento (servicio real).
- P4 → repeat purchase intent.
- P5 → NPS clásico (recomendación).
- Textarea → PO revisa y detecta friction cualitativo.

### 3.2 Flujo técnico

**Dependencias**:
- Cron diario que busque `agendamientos WHERE estado='confirmada' AND fecha_fin_efectiva < NOW()-INTERVAL '24 hours' AND feedback_enviado IS NULL`.
- Email con unique link `/feedback/{agendamiento_id}?token=HMAC` (sin login requerido, uso de HMAC para validar).
- Página `/feedback/{id}` con las 5 preguntas (form stateless, submit → INSERT en `feedbacks`).
- Dashboard `/admin/feedback` (ya existe parcial — ampliar para mostrar cada feedback con las respuestas + comentario + link al agendamiento).

**Esfuerzo**: 6-8h. Sprint `FEEDBACK-POST-SERVICIO`. Candidato para aterrizar en 1-2 sprints post-launch, no pre.

### 3.3 Acción del PO sobre feedbacks

Protocolo diario:
- Abrir `/admin/feedback` filtrado por "último día".
- Cualquier P1 ≤ 2, P4 = No, P5 = No → email o llamada personal del PO al tutor.
- Cualquier P2 = "No respondió a tiempo", P3 = "Menos que lo esperado" → email al proveedor con copia de feedback (anonimizado).
- P1 ≥ 4 + P5 = Sí → candidato para "feedback destacado" en marketing.

---

## Fase 4 — Casos extremos: fast recovery

### 4.1 Si un servicio sale realmente mal

**Signals**:
- P1 = 1, P3 = "Menos que lo esperado", P4 = No, textarea con queja.
- Tutor reporta el servicio vía formulario o email.
- Proveedor no responde a chat del tutor >48h durante servicio.

**Protocolo del PO**:
1. **Email personal del PO al tutor** dentro de 6 horas de recibir la señal.
2. Oferta explícita: "Lamentamos mucho lo que pasó. Queremos que vuelvas a probar Pawnecta con una experiencia que sí cumpla. Te damos {tipo de recuperación}:".
3. Opciones de recuperación:
   - **Opción A**: "Elige otro proveedor y la primera hora del servicio va por nuestra cuenta." (riesgo controlado — el PO cubre el valor manualmente).
   - **Opción B**: "Te recomendamos personalmente a {proveedor top destacado} con la seguridad de que tu experiencia va a ser distinta."
4. Seguimiento 7 días después: "¿Cómo fue tu nueva experiencia?"

**Costo**: 1-3h del PO + $8.000-25.000 CLP por caso de recuperación. Es inversión en reputación, no gasto.

### 4.2 Si un proveedor es el problema recurrente

**Signals**:
- 2+ feedbacks con P1 ≤ 2 en 7 días.
- Chat sin responder >48h repetido.
- Reservas canceladas unilaterales >2 en 7 días.

**Protocolo del PO**:
1. Conversación directa con el proveedor (llamada, no chat).
2. Pedir contexto: "¿Te está pasando algo? ¿Necesitas pausar un tiempo?".
3. Si el patrón persiste: suspender la cuenta del proveedor (`estado='suspendido'`), explicando por qué + ofreciendo reactivación tras N días con compromiso explícito.
4. Documentar el caso en `BACKLOG.md > PROVEEDORES-SUSPENDIDOS-POR-CALIDAD` para trazabilidad.

---

## Métricas de éxito del plan

Durante las primeras 2 semanas de campaña, monitorear:

| Métrica | Objetivo | Acción si no se cumple |
|---------|----------|------------------------|
| % reservas confirmadas (vs total creadas) | >70% | Ping manual a proveedores lentos |
| Mediana tiempo respuesta chat del proveedor | <12h | Reducir destacados a los más responsivos |
| NPS (P5) agregado | >50 | Revisar casos negativos manualmente |
| Repeat purchase intent (P4) | >60% | Diagnóstico cualitativo (P4=Tal vez o No) |
| Casos de fast recovery activados | <10% del total | Si >10%, pausar campaña y re-curar proveedores |

---

## Resumen ejecutivo para el PO

**Antes de arrancar campaña** (idealmente 3-5 días antes):
1. Correr query SQL del §1.2 → identificar top 5-10 candidatos a destacado.
2. Contactar a cada candidato con mensaje del §1.3 → filtrar los 3-5 que responden rápido.
3. Aterrizar sprint `DESTACADO-PRE-CAMPAÑA` (opción A §1.4, 3-4h) O usar fallback opción B.
4. Aterrizar sprint `DASHBOARD-CAMPAÑA-OPS` (2-3h) si cabe en ventana.
5. Aterrizar sprint `ALERTS-CAMPAÑA` (3-4h) si cabe en ventana.

**Durante la campaña**:
- Abrir dashboard `/admin` cada día 9 AM durante 2 semanas.
- Actuar sobre alertas tempranas en el día.
- Playbook §2.3 (pings manuales).

**Post-servicios**:
- Sprint `FEEDBACK-POST-SERVICIO` (6-8h) aterriza post-launch, pre-primeros 20 servicios.
- Revisar feedbacks diariamente.
- Fast recovery del §4 cuando dispare.

**Costo total del plan**:
- Setup pre-campaña: 8-11h de sprints (3 sprints) + 2-3h del PO.
- Operación durante campaña: 30-60 min PO/día × 14 días = 7-14h total.
- Fast recovery (si disparan): ~1-3h + $8k-25k por caso × ~2-5 casos esperados = ~$40k-100k CLP.

**Retorno esperado**: tasa de retención del 1er tutor >50% (vs ~10-20% sin este plan en marketplaces típicos pre-reputación). Cada advocate recuperado trae 2-3 referidos orgánicos — multiplicador alto.

---

## Firma

Este plan es la red de seguridad del lanzamiento. No reemplaza al código bueno ni al marketing — multiplica su efecto porque evita que la primera impresión sea la última.
