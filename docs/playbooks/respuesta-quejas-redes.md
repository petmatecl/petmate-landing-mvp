# Playbook de respuesta a quejas en redes sociales — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: guía operativa para responder quejas públicas de users en Instagram, Facebook, Twitter/X cuando empiecen las campañas. Zero improvisación en crisis, templates listos para copy-paste.
**Alcance**: aplicable a comentarios en posts Pawnecta + DMs + menciones + reviews externas (Trustpilot, app stores si aplica).

---

## Principios base

1. **Respuesta pública rápida** (<2h en horario business, <12h siempre). Silencio público es peor que mala respuesta.
2. **Nunca ignorar a users reales con queja real**, incluso si es menor.
3. **Zero defensividad**. Sin "pero nosotros..." ni excusas. User importa más que la razón.
4. **Escalar a DM rápido** para detalles personales. Ningún PII ni datos de reserva en comentarios públicos.
5. **Documentar internamente** cada queja escalada (feedback loop).
6. **Pedir disculpas públicas solo cuando corresponde** — nunca por defecto, nunca por cualquier cosa.

---

## Tipos de queja comunes + templates

### Q1 — Proveedor no responde

**Síntoma típico**:
> "Hace 3 días contacté a {proveedor} por Pawnecta y no me contesta. ¿Qué hago?"

**Template respuesta pública** (comentario IG / FB):
```
Hola {nombre}, lamentamos la demora. Te escribimos por DM para destrabar directo.
```

**Follow-up en DM**:
```
Hola {nombre}, vimos tu mensaje. ¿Me puedes compartir el nombre del proveedor y la categoría? Lo contactamos directamente nosotros + buscamos alternativas en tu comuna si no responde. Perdón por la demora.
```

**Acción interna**:
1. Buscar el user en BD via `/admin/proveedores` o query directa.
2. Buscar la conversación en `/admin` (si existe).
3. Contactar al proveedor via WhatsApp / email directamente (admin action, no automated).
4. Si proveedor no responde → ofrecer 2-3 alternativas al user.
5. Flag al proveedor como "slow responder" para monitoring interno.

**Cuándo escalar**:
- Si el proveedor acumula 2+ quejas en 30 días → revisar perfil + considerar suspensión.
- Si el user contactó pero NO está en BD → capturar IP + user-agent, puede ser spam.

### Q2 — Proveedor canceló último momento

**Síntoma**:
> "Reservé {servicio} con {proveedor} hace 2 semanas, me acaba de cancelar 4h antes."

**Template público**:
```
Hola {nombre}, sentimos muchísimo lo que pasó. Esto no debería ocurrir. Te escribimos por DM para resolver.
```

**DM follow-up**:
```
Hola {nombre}, cancelación a última hora es inaceptable para el estándar que buscamos. Dos cosas:

1. Te ayudamos a encontrar un reemplazo urgente en tu zona, te mando opciones ahora.
2. Vamos a seguir con {proveedor} internamente para entender qué pasó y aplicar la política correspondiente.

¿Me confirmas el día/hora que necesitas el reemplazo?
```

**Acción interna**:
1. Verificar la reserva en BD (`agendamientos` + `/admin`).
2. Validar que efectivamente fue cancelación tardía (comparar `cancelled_at` vs `fecha_preferida`).
3. Buscar 2-3 alternativas en la comuna + categoría.
4. Contactar al proveedor para feedback (ocasional sanción si repite).

**Cuándo escalar**:
- Si proveedor acumula 3+ cancelaciones tardías → suspensión temporal + review.
- Si user solicita reembolso (no aplica porque no hay pago in-platform hoy) → tomar nota para cuando haya pagos.

### Q3 — Servicio mal entregado (queja de calidad)

**Síntoma**:
> "Contraté a {proveedor} para pasear a mi perro y la devolvió sucia y asustada."

**Template público**:
```
{nombre}, lamentamos mucho esta experiencia. Te escribimos por DM para resolver esto bien.
```

**DM follow-up**:
```
Hola {nombre}, gracias por avisarnos. Lo que describes es muy serio. Para seguir:

1. ¿Puedes contarme más detalles? (duración del paseo, condiciones del perro antes/después, si tienes fotos).
2. ¿Hablaste con el proveedor sobre esto directamente?
3. Si lo prefieres, podemos mediar la conversación.

Mientras tanto, tomamos nota y vamos a seguir con {proveedor} para entender su versión. Si corresponde, aplicaremos medidas.
```

**Acción interna**:
1. Documentar la queja en `auditoria_admin` o similar con timestamp + screenshots.
2. Contactar al proveedor **por separado** para su versión (zero sentencia previa).
3. Si confirma el relato del user → sanción (suspensión temporal + badge anti-verificado pending).
4. Si contradice → buscar evidencia (otras reviews del proveedor, patrón).

**Cuándo escalar**:
- Si hay señal de maltrato animal → acción inmediata (suspensión + reporte autoridades si corresponde).
- Si la queja es viral (>50 comments) → Post público de respuesta oficial del equipo + timeline de acciones.

### Q4 — Problema técnico (bug en la app)

**Síntoma**:
> "La app no me deja reservar. Pongo todo y me da error."

**Template público**:
```
Hola {nombre}, gracias por avisarnos. Te mandamos DM para resolver el bug contigo.
```

**DM follow-up**:
```
Hola {nombre}, perdón por el problema. Para ayudarte rápido:

1. ¿Puedes contarme qué dispositivo (iPhone/Android) + navegador estás usando?
2. ¿En qué paso del flujo salió el error? ¿Mensaje específico si recuerdas?
3. Si puedes, mándanos una captura.

Mientras resolvemos, prueba desde otro dispositivo o browser, o déjame la reserva que querías hacer y la coordino manual con el proveedor.
```

**Acción interna**:
1. Replicar el bug en staging con detalles del user.
2. Reportar a dev team (sprint hotfix si bloquea reservas).
3. Follow-up al user con timeline de fix.

**Cuándo escalar**:
- 3+ users reportan mismo bug en 24h → **incidente nivel BLOQUEA** (ver `docs/playbooks/incidentes-comunes-20261119.md`).

### Q5 — "Pawnecta es caro / cobra comisión"

**Síntoma** (típicamente confusión):
> "Pawnecta cobra 15% de comisión, mejor contacto al proveedor por fuera."

**Template público**:
```
Hola {nombre}, Pawnecta NO cobra comisión por conectar. El precio que ves es el que pagas al proveedor directo. Si quieres te lo explicamos por DM.
```

**DM follow-up**:
```
Hola {nombre}, queríamos aclarar: en Pawnecta no cobramos comisión ni a tutores ni a proveedores. El precio que aparece en la ficha es el que cobra el proveedor directamente, y el pago se hace entre ustedes (efectivo, transferencia, etc.). Pawnecta solo te conecta.

Si quieres puedes reservar sin preocuparte por comisiones ocultas. ¿Hay algo que te hizo pensar que cobramos?
```

**Acción interna**:
- Capturar cuál fue la fuente del malentendido (puede ser copy del sitio) → enviar a backlog copy audit.

### Q6 — Queja sobre proveedor específico (no fundada / sin evidencia)

**Síntoma**:
> "Este proveedor es un estafador, cobra de más."

**Sin evidencia pública**. Riesgo de difamación.

**Template público**:
```
Hola {nombre}, nos preocupa lo que describes. Te escribimos por DM para entender más y apoyarte.
```

**DM follow-up**:
```
Hola {nombre}, para ayudarte necesitamos entender:

1. ¿Qué servicio contrataste con {proveedor}?
2. ¿Qué pasó concretamente? Cualquier detalle o evidencia nos sirve.
3. ¿Qué buscas que resolvamos?

Toda info nos ayuda a verificar y actuar si corresponde. También te escuchamos si simplemente querías ventilar.
```

**Acción interna**:
- Si hay evidencia fuerte → actuar (suspensión / investigar).
- Si no hay evidencia → NO actuar contra proveedor, pero flag mental.
- Considerar reach-out al proveedor con un "hey, hay un comentario, ¿contexto?" si hay 2+ quejas sin fundamento sobre el mismo.

### Q7 — Spam / troll / comentario no-de-user-real

**Síntoma**:
> "Pawnecta es una basura, no lo recomiendo, usen {otro servicio}" (desde cuenta nueva sin data real).

**Acción**: evaluar antes de responder:
- Si la cuenta es new (<30 días), 0 followers, 1-2 posts → probable bot/competencia.
- Si es genuina → responder (incluso si es queja fuerte).

**Si es troll**:
- **No responder públicamente**. Interactuar da aire al troll.
- Opcional: report platform (IG tools + FB tools + X moderation).
- Documentar internamente.

### Q8 — Pedido de reembolso (futuro con pagos in-platform)

**Síntoma**:
> "Pagué por Pawnecta y el servicio no se cumplió. Devuélvanme la plata."

**Nota**: hoy Pawnecta NO procesa pagos. Si llegara una queja así, es confusión o scam.

**Template público**:
```
Hola {nombre}, Pawnecta no procesa pagos. ¿Pagaste directamente al proveedor? Te escribimos por DM para ayudarte a resolver.
```

**DM follow-up**:
```
Hola {nombre}, queríamos aclarar: en Pawnecta el pago se hace entre tú y el proveedor directamente (no pasamos por nosotros). Para recuperar tu dinero el camino es:

1. Contactar al proveedor y pedirle reembolso.
2. Si no responde, podemos mediar.
3. Si el proveedor actuó de mala fe, la vía legal es la mejor opción (denunciar en SERNAC o similar). Nosotros podemos acompañarte con evidencia.

Cuéntame qué pasó y seguimos.
```

---

## Decisión tree pública vs DM

```
¿Comentario público de user con queja clara?
├── SÍ (identificable, data real, queja específica)
│   └── Responder público conciso (1-2 líneas "te escribimos por DM") + DM detallado.
├── NO (troll / sin contexto / cuenta sospechosa)
│   └── No responder público. Report platform si aplica.
└── AMBIGUO
    └── 1 respuesta pública pidiendo DM. Si no responde al DM, no insistir.
```

---

## Timing de respuesta

- **IG / FB público**: <2h horario business (9-21 CLT lun-vie), <12h sáb-dom.
- **DM**: <4h horario business.
- **Email (hola@pawnecta.com)**: <12h horario business, <24h sáb-dom.
- **Trustpilot / reviews externas**: <48h.

Fuera de horario:
- Response bot auto "Recibimos tu mensaje, te escribimos en horario laboral". Zero PII.

---

## Escalación — cuándo pedir disculpas públicas

Pedir disculpas públicas **solo si**:

1. Error empíricamente claro de Pawnecta (ej. caída del sitio, bug confirmado).
2. Múltiples quejas del mismo tipo en <24h (señal de incidente).
3. User con influencia significativa (>10k followers) recibió experiencia mala.

Template de disculpa pública (cuando aplica):
```
Hola a todos,

Tuvimos un problema con {X} entre las {HH:MM} y las {HH:MM} de hoy. 
Lamentamos mucho la molestia.

Qué pasó: {descripción corta sin jerga técnica}.
Qué estamos haciendo: {acción concreta ya tomada}.
Cómo compensamos: {si aplica, acción específica}.

Si tu caso específico quedó afectado, escríbenos a hola@pawnecta.com y te resolvemos personalmente.

Gracias por tu paciencia.
Equipo Pawnecta
```

**No pedir disculpas públicas** por:
- Queja de 1 user sin evidencia.
- Problema del proveedor individual (no es nuestro).
- Expectativa no cumplida que nunca prometimos.

---

## Documentación interna

Cada queja escalada se documenta en:
1. **Spreadsheet / Notion**: `Quejas públicas - {YYYY-MM}` con columnas: fecha, canal, user, tipo (Q1-Q8), proveedor involucrado (si aplica), acción tomada, resolución.
2. **auditoria_admin** (tabla DB) si aplica para sanción a proveedor.
3. **Trend monthly**: review tipo quejas Q1-Q8 recurrentes → feed al backlog producto (ej. 5 quejas Q4 bug reserva → sprint fix).

---

## Tono de voz

Reusar la voz de Pawnecta (ver `docs/auditorias/copy-20261120.md`):
- **Chileno tuteo** ("te escribimos", "contáctanos").
- **Cálido pero directo** ("lamentamos") sin ser cursi.
- **Zero emojis** en contexto crisis.
- **Zero jerga técnica** ("bug", "endpoint" → "problema técnico").

---

## Decisiones pendientes del PO

### D1. Quién responde las quejas

**Pregunta**: ¿PO en persona, auditor con approval previo, o rotación con equipo (cuando crezca)?

**Recomendación**: **PO primera fase** (control total + aprende patrones). Auditor puede armar borrador para approval rápido. Post-crecimiento equipo: delegación con guidelines + review PO semanal.

**Impacto si no se decide**: default = PO.

### D2. Response bot fuera de horario

**Pregunta**: ¿activamos auto-reply IG/FB fuera de horario business?

**Recomendación**: sí. Message Studio IG permite. Simple "Recibimos tu mensaje, te escribimos en horario laboral". Zero PII.

**Impacto si no se decide**: default = no auto-reply (user puede percibir abandono).

### D3. Trustpilot / app store reviews

**Pregunta**: ¿valide claim de perfiles en Trustpilot y app stores para gestionar reviews?

**Recomendación**: **no pre-campañas** (volumen bajo). Post-campañas si aparecen reviews orgánicos.

**Impacto si no se decide**: default = no proactivo.

### D4. Alerta + monitoring quejas automático

**Pregunta**: ¿valide herramienta tipo Hootsuite / Buffer / Mention.com para monitorear menciones de "Pawnecta" en redes y responder desde panel único?

**Recomendación**: **no pre-campañas** (volumen bajo, free IG/FB tools alcanzan). Post-campañas con tracking pagado si justifica.

**Impacto si no se decide**: default = tools nativas IG/FB.

### D5. Política de compensación por incidente

**Pregunta**: ¿valide política escrita de compensación (ej. "recomendación proveedor alternativo", "ayuda personal a coordinar") para incidentes? Hoy no hay pagos, zero monetary compensation posible — pero sí service recovery.

**Recomendación**: documentar 3 niveles de service recovery:
- **Nivel 1** (queja leve): respuesta pública + DM resolución.
- **Nivel 2** (queja fuerte, proveedor culpable): mediación + 2-3 alternativas + followup.
- **Nivel 3** (incidente mayor, Pawnecta culpable): post público + email oficial + compensación simbólica (ej. mes gratis de futura suscripción, boost de perfil gratis para proveedor afectado).

**Impacto si no se decide**: default = respuesta ad-hoc.

---

## Firma

Playbook listo. Se activa con primera campaña + se refina mensual con patrones reales de quejas.
