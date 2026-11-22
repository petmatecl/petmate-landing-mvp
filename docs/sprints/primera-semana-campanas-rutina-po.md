# Primera semana de campañas — rutina diaria del PO

Written for: el PO (Aldo), como playbook operacional accionable para los 7 días posteriores al prendido del primer ad pagado (Google y/o Meta). Pre-condición: ≥100 proveedores activos en catálogo + landing /explorar + /register pulidos + tracking GA4 configurado.

**Objetivo**: evitar que el PO descubra problemas a los 3 días cuando ya quemó $X.XXX de ad spend. Rutina concreta hora-por-hora + decisiones esperables + umbrales de acción.

**Supuesto de budget**: $30-50k CLP / día en Google Ads + $30-50k CLP / día en Meta (total $60-100k / día, $420-700k / semana). Ajustable.

**Horario de trabajo del PO**: lunes AM (poco), martes/jueves/viernes (full), miércoles (menos), sábado/domingo (ping-based si algo urge). Rutina diseñada bajo esta disponibilidad real.

---

## Pre-lanzamiento (día -1)

**Checklist 60 min**:

1. **Dashboards abiertos en pestañas fijas**:
   - Google Ads (con alertas budget + conversion rate).
   - Meta Ads Manager.
   - GA4 Realtime.
   - /admin/metricas-proveedores + /admin (tabs).
   - Vercel Logs (runtime).
   - Sentry (Issues view).
   - Resend (Emails Delivered).

2. **Alertas configuradas**:
   - Vercel: notif email si deploy fail o 5xx > umbral.
   - Sentry: notif email si issue nuevo severidad high.
   - Google Ads: budget cap alert si gasta >80% diario.
   - Supabase: no tiene alerts nativos, ver via dashboard.

3. **Horarios de ad delivery definidos**:
   - Primeros días: 08:00 - 22:00 CLT (horario core).
   - Pause: 00:00 - 06:00 (bajo tráfico + bajo intent).

4. **Mensaje a mano** para outreach rápido a proveedores si una zona queda saturada:
   > "Hola {nombre}, estamos recibiendo mucha demanda en {comuna}. ¿Tenés capacidad para sumar 1-2 clientes más esta semana? Responde si podés."

---

## Día 1 (lunes AM — bajo ritmo esperable)

### 09:00 — Prender ads

- Activar campañas Google (keywords: "paseador perros santiago", "cuidador mascotas", "veterinario domicilio", etc.) + Meta (interés: dueños de perros 25-55 CL).
- Budget conservador el día 1: $15k en vez de $30k. Limitar riesgo si algo rompe.

### 09:30 — Primer check-in (30 min post-arrancar)

**Qué mirar**:
- GA4 Realtime: ¿hay visitas? ¿de qué fuente?
- Vercel Logs: ¿hay 5xx? ¿spikes de errores?
- Sentry: ¿issue nuevo?

**Umbral de acción**:
- 5xx > 1% → **PAUSAR ADS INMEDIATO**, diagnosticar.
- Cero visitas tras 30 min → chequear que los ads están realmente activos (reject rate, aprobación pendiente).

### 12:00 — Check mediodía

**Qué mirar**:
- Visitas acumuladas vs budget gastado.
- Click-through rate (CTR) del ad: <1% = ad creative débil, >3% = bueno.
- Bounce rate del landing /explorar.

**Umbral**:
- CTR <0.5% → pausar ad, ajustar creative.
- Bounce >80% → problema en landing, abrir /explorar en modo incógnito + validar.

### 15:00 — Reporte interno (si aplica equipo)

- Mandar a {sí mismo o equipo} snapshot con: visitas, clicks, costos, registros intentados, registros completos, contactos reales.

### 18:00 — Check vespertino

- Mismas métricas que 12:00.
- Si hay registros tutor nuevos: revisar que confirmaron email (via `usuarios_buscadores + join auth.users.email_confirmed_at`).
- Si hay contactos reales: revisar rapidez de respuesta del proveedor (query Q-FT-10).

### 20:00 — Decisión fin de día

- Si todo OK: mantener budget para día 2.
- Si todo caótico: pausar ads overnight + diagnosticar mañana.
- Si tendencia media: doblar budget a $30k día 2.

---

## Día 2-3 (martes-miércoles)

### Rutina diaria base (martes full, miércoles ligero)

**09:00 — Morning check (20 min)**:
- Visitas, clicks, costos del día anterior.
- Registros nuevos (tutores + proveedores).
- Contactos iniciados.
- Reservas confirmadas.
- Sentry nuevos issues.

**13:00 — Midday check (15 min)**:
- Mismo set + comparar vs misma hora día anterior.

**19:00 — Evening check (30 min)**:
- Mismo set + decisión de ajuste.
- Si hay comments en Instagram/TikTok de posts → responder esta tanda.

### Ajustes posibles en esta ventana

1. **Si una zona concentra demanda** (ej. todo Santiago Centro) y zonas periféricas no → ajustar geo-targeting del ad para balancear carga sobre proveedores.
2. **Si un ad creative supera 3x promedio en CTR** → duplicar budget en ese + reducir en los perdedores.
3. **Si tutor nuevo registra pero no contacta en 24h** → correr Q-FT-3 (tutores sin actividad) + mandar email de re-engagement manual (10 min PO).
4. **Si proveedor no responde chat en 12h** → ping manual con mensaje template.

---

## Día 4 (jueves AM — full disponibilidad)

### Review semanal parcial (90 min, 10:00-11:30)

**Métricas a compilar**:

| Métrica | Meta primera semana | Status día 4 | Acción |
|---------|--------------------|---------------|-----|
| Visitas totales | 3000-7000 | ? | — |
| Costo total | $420-700k CLP | ? | — |
| CPA (cost per acquisition = registro completo) | <$5000 | ? | Si >$7k, reducir budget 20% + optimizar landing |
| Registros tutor | 50-150 | ? | — |
| Confirmación email (%) | >75% | ? | Si <60%, revisar Supabase deliverability + bump copy del email |
| Contactos iniciados | 20-80 | ? | — |
| Conversión total visitas→contacto | 0.5-2% | ? | Si <0.3%, diagnosticar funnel |
| Reservas creadas | 10-40 | ? | — |

### Decisión jueves

- **Verde** (todas las métricas en rango): mantener + escalar budget 20-30% el fin de semana.
- **Amarillo** (1-2 métricas fuera): pausar escalamiento, ajustar lo específico.
- **Rojo** (3+ métricas fuera o costos fuera de control): pausar campaña, diagnóstico profundo lunes.

---

## Día 5-7 (viernes-sábado-domingo)

### Viernes (full)

Rutina igual que martes + un **sprint de optimización sabatina** si viernes muestra oportunidad clara (ej. un ad creative pega → pinearlo + gastar más).

### Sábado-domingo (ping-based)

- Check único 11:00 AM: ¿algo caótico?
- Si todo OK → zero touch hasta lunes.
- Si algo rojo (5xx > 1%, Sentry crítico, cliente quejándose público) → modo emergencia.

**Por qué ping-based**: fines de semana el PO necesita descanso. Primera semana hace 50h de concentración — insostenible si cada día es full.

---

## Protocolo de incidente (durante la semana)

### Nivel 1 — Alerta leve
**Trigger**: 1 métrica fuera de rango sin impacto visible al user. Ej: email confirmación delay >5 min pero igual llega.

**Acción**: anotar en journal + diagnóstico cuando toque próximo check-in.

### Nivel 2 — Alerta media
**Trigger**: 2+ métricas fuera o 1 con impacto visible. Ej: 10% de registros con error 500.

**Acción**:
1. Pausar ads nuevos.
2. Verificar Sentry por root cause.
3. Avisar al auditor con el screenshot del Sentry issue + request de ayuda.
4. Decisión GO/NO-GO fix inmediato vs mantener pause 24h.

### Nivel 3 — Alerta crítica
**Trigger**: sitio caído, 5xx > 5%, pérdida de datos reportada, user confirma problema grave.

**Acción**:
1. **PAUSAR TODAS las campañas inmediato** (Google + Meta).
2. Rollback del último deploy si es ventana reciente (`git revert` + push + nuevo deploy).
3. Notificación al auditor via email + WhatsApp.
4. Cero ads nuevos hasta tener confirmación de fix en producción.

---

## Herramientas a tener listas

- **Terminal con `gh` instalado** — para rollback rápido via PR.
- **Vercel CLI** — para rollback de deploy sin PR (último recurso).
- **Access Supabase Dashboard** (prod) — queries SQL ad-hoc.
- **Resend Dashboard** — verificar envío emails (Delivered vs Bounced).
- **Google Ads app mobile** — pause de emergencia desde el teléfono.
- **Meta Ads Manager mobile app** — igual.
- **Playbook impreso o PDF** este mismo doc, con atajos claves.

---

## Journal diario sugerido (plantilla)

Cada día al cerrar (20:00), el PO escribe 5 líneas en un markdown local o notebook físico:

```
## Día N — [fecha]

**Resumen**: [estado del día en 1 línea].

**Métricas clave**: [visitas, costo, registros, contactos].

**Qué funcionó**: [ad / posting / proveedor que destacó].

**Qué falló**: [bug, cuello de botella, momento perdido].

**Mañana**: [1-3 acciones específicas].
```

Al fin de semana 1 → compilar los 7 journals = base para retrospectiva.

---

## Retrospectiva fin de semana 1 (lunes día 8)

### Preguntas obligatorias (60 min reflexión)

1. ¿El costo total está en línea con lo previsto? Si no, ¿por qué?
2. ¿Qué ad creative fue el ganador? ¿Por qué?
3. ¿Qué landing page fue el cuello de botella?
4. ¿Hubo quejas de users? ¿Qué patrón mostraron?
5. ¿Qué proveedor respondió rápido? ¿Qué proveedor NO respondió?
6. ¿Cuál es el CPA real? ¿Vale la pena ese CPA vs LTV estimado?
7. ¿Qué cambio del producto urge para la semana 2?

### Entregable retrospectiva

Doc `docs/sprints/campania-s1-retro-{fecha}.md` con las 7 respuestas + plan semana 2. Compartir con el auditor para decidir sprints de la semana 2.

---

## Decisiones pendientes del PO

### D1. Budget diario pre-launch

**Pregunta**: ¿$30-50k CLP / día cada plataforma es realista para el PO?

**Recomendación**: **arrancar con $15-20k / día en cada plataforma día 1** (overkill protect). Escalar día 4-5 según métricas. Un día con todo ok = ~$40-60k combined. Una semana = $280-420k. Presupuesto conservador.

### D2. Herramientas de alerting automatizadas

**Pregunta**: ¿agregar herramienta tipo Statuspage o Better Uptime pre-campañas?

**Recomendación**: **no pre-campañas**. Las alertas built-in de Vercel + Sentry alcanzan para fase 1. Statuspage ayuda cuando hay user-facing comms (no urgente hoy con base de usuarios pequeña).

### D3. Soporte compartido PO + auditor días cruciales

**Pregunta**: ¿jueves es full-attention combined o solo PO?

**Recomendación**: **auditor disponible en chat jueves AM** para apoyar la review semanal + decisión de escalar o pausar. 1-2h del auditor.

### D4. Protocolo de respuesta a reviews/comentarios RRSS negativos

**Pregunta**: ¿cómo manejar reseñas negativas públicas si aparecen?

**Recomendación**: **responder en < 24h con empatía y acción**. Plantilla:
> "Hola {nombre}, lamentamos muchísimo lo que pasó. Nos pondremos en contacto por DM para ayudarte a resolverlo. Gracias por compartir, nos ayuda a mejorar."

Luego: DM privado, ofrecer Opción A de fast recovery (ver `calidad-primera-campana.md`).

### D5. Cuándo escalar budget vs sostener

**Pregunta**: ¿umbral para duplicar budget?

**Recomendación**: duplicar budget SOLO si (a) CPA < $5000, (b) CTR > 2%, (c) conversión visita→contacto > 1%, (d) catálogo no está saturado (proveedores responden en <12h promedio). Si cualquiera no se cumple → NO escalar.

---

## Firma

Este playbook es la red de seguridad del lanzamiento. Primera semana es cognitivamente demandante. **Cero shortcuts, cero asumir que algo "está OK" sin validar.** El auditor sugiere imprimir este doc o tenerlo en pestaña fija del browser durante toda la semana.
