# Decisiones del PO — recomendaciones razonadas desarrolladas — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: ampliar `docs/planes/decisiones-po-pendientes-20261120.md` con recomendaciones razonadas listas para que el PO decida en bloque durante el fin de semana. Foco: las **10 BLOQUEANTE para activar campañas** + **19 DESEABLE continuo** (las 4 ACTIVAS están cerradas).
**Formato por decisión**: ID + resumen 1 línea + recomendación del auditor + razonamiento 2-3 líneas + riesgo si se posterga.
**Dependencia**: lee en conjunto con `decisiones-po-pendientes-20261120.md` para contexto completo.

---

## 🟠 BLOQUEANTE para activar campañas (10)

### C1 · Alias de correo newsletter

**Resumen**: ¿crear `novedades@pawnecta.com` o reutilizar `hola@pawnecta.com` para campañas?

**Recomendación**: **crear `novedades@` al momento de activar campañas** (no antes). 15 min setup Zoho.

**Razonamiento**: separar transaccional de marketing es best practice para proteger reputación del dominio principal (`hola@` es inbound soporte + transaccional; si mete campaña y el usuario marca spam, afecta deliverability de reservas). Pre-campañas no urge; post-campañas sí.

**Riesgo si se posterga**: delivery rate de campañas 10-20% menor + riesgo de que reservas confirmadas caigan en spam.

---

### C2 · Lista correo para primera campaña

**Resumen**: ¿enviar a 100% confirmados o filtrar por actividad?

**Recomendación**: **todos confirmados primera campaña**. Filtrar en campaña #2+ con data real de engagement.

**Razonamiento**: con 102 usuarios confirmados hoy, filtrar deja N muy chico (< 50) → data no significativa para hipótesis del test. Enviar a los 102 mide tasa de reactivación real que define si valen la pena campañas futuras a dormidos.

**Riesgo si se posterga**: no se puede decidir, es decisión del momento de activar. Default conservador (todos) es seguro.

---

### C3 · Variante banner home (A/B/C)

**Resumen**: ¿qué copy en el banner al arrancar campañas?

**Recomendación**: **variante C** (énfasis apertura + CTA "Explorar") para primera ola. Rotar a variante A (pide feedback) a las 2 semanas.

**Razonamiento**: tráfico pagado llega frío — user que no conoce la marca necesita empuje directo a acción, no invitación a dar feedback. La variante A es útil post-engagement (user ya exploró, puede dar feedback). Secuencia C→A alinea con journey del user.

**Riesgo si se posterga**: default actual (A) deja la primera ola de user nuevo sin CTA directo → conversion rate inicial baja 15-25%.

---

### C4 · Trigger envío correo masivo (manual vs auto)

**Resumen**: ¿envío automático por script o manual por PO desde Resend?

**Recomendación**: **manual primera campaña**. Automatizar cuando templates + proceso estén validados.

**Razonamiento**: primera campaña es aprendizaje. Manual permite al PO revisar preview + ajustar + detectar errores pre-envío. Automatización es optimización de un proceso que primero hay que validar que vale la pena repetir.

**Riesgo si se posterga**: default manual es correcto, zero riesgo.

---

### C5 · Notificaciones Sentry email nocturno

**Resumen**: ¿alertas Sentry por email al PO fuera de horario durante campañas?

**Recomendación**: **sí al activar campañas**. Config Sentry Alerts con regla `is:new AND user.count > 2` + cooldown 30 min.

**Razonamiento**: con campañas activas, tráfico sube 5-10x. Un incidente nocturno sin captura inmediata puede dejar sitio roto horas antes de que el PO despierte → 24h de usuarios frustrados abandonando.

**Riesgo si se posterga**: incidente nocturno = horas de usuarios con experiencia rota sin notificación proactiva. ROI alto (10 min setup × riesgo acotado).

---

### C6 · Baseline Q1-Q5 Supabase

**Resumen**: ¿correr baseline queries pre primer push campaña?

**Recomendación**: **sí, ventana de 5 min antes**. Snapshot anotado en acta de la campaña.

**Razonamiento**: sin baseline, impossible calcular delta real post-campaña. "Antes había X registros, ahora hay Y" solo tiene sentido si X está documentado. 5 min de inversión que paga en el reporte post-campaña.

**Riesgo si se posterga**: reporte post-campaña queda con "registros totales" sin delta → interpretación ambigua.

---

### C7 · Uptime Robot externo

**Resumen**: ¿montamos uptime externo independiente de Vercel pre-campañas?

**Recomendación**: **sí, 10 min setup**. Monitor sobre `https://www.pawnecta.com/` + alerta email + SMS al PO si down >2 min.

**Razonamiento**: Vercel tiene SLA 99.9% + auto-reporting, pero depender de la misma plataforma para detectar sus propios outages es punto único de falla. Canal externo (Uptime Robot free tier 50 monitors) es seguro independiente.

**Riesgo si se posterga**: durante un outage de Vercel, el PO no se entera hasta que un user reporta. Puede ser 1-2h de down invisible.

---

### C8 · Ejecutar top 5 fixes perf pre-campañas

**Resumen**: ¿bloqueamos primera campaña hasta ejecutar top 5 fixes perf (~2h 15 min)?

**Recomendación**: **sí**, bloquear. Especialmente P1 (CLS ficha mobile 0.187) + P2 (LCP explorar mobile 5.8s).

**Razonamiento**: mobile = 50-70% del tráfico pagado. CLS mal se traduce directo en SEO rank malo + conversión 10-20% menor. LCP 5.8s mobile es rango "pobre" Google — usuarios abandonan antes de ver contenido. 2h 15min es inversión trivial comparada al costo de CAC desperdiciado con tráfico malo convertido.

**Riesgo si se posterga**: CAC primeras campañas +30-50% más alto que necesario. Dinero quemado en optimización post-mortem.

---

### C9 · Ejecutar top 5 fixes a11y pre-campañas

**Resumen**: ¿bloqueamos primera campaña hasta ejecutar top 5 fixes a11y (~3-4h)?

**Recomendación**: **sí para sistémicos** (contraste `text-slate-400` + `text-accent-500` que afectan todo el app). Los 3 puntuales pueden esperar post-primera-semana campañas.

**Razonamiento**: contraste sistémico mejora el 100% de usuarios con baja visión y, crítica para SEO moderno (Google penaliza accessibility issues). Los fixes puntuales son nice-to-have, no bloqueantes.

**Riesgo si se posterga**: SEO penalty + usuarios con discapacidad visual no pueden navegar + reputation risk si incidente público.

---

### C10 · Primer experimento A/B al activar campañas

**Resumen**: ¿lanzamos E1+E3+E4 con primera campaña o esperamos data?

**Recomendación**: **E1 (CTA ficha) + E3 (hero home) con primera campaña**. E4 (subject welcome) con segunda campaña.

**Razonamiento**: E1 + E3 son copy changes, zero riesgo técnico. Permiten aprender qué copy convierte con tráfico pagado frío (data imposible de obtener pre-campañas). E4 requiere volumen de emails que solo llega post-primera-semana — mejor segunda ola.

**Riesgo si se posterga**: primera campaña corre con default copy, data de tests queda pendiente 2-3 semanas más.

---

## 🟡 DESEABLE continuo (19)

### Rollback (2)

#### D-R1 · Autorizar auditor proponer N1 sin esperar criterio "2 o más"

**Resumen**: autorizar al auditor proponer rollback N1 inmediato si ve home full-page 500.

**Recomendación**: **sí, con gate: auditor propone via chat, PO decide y ejecuta**. Zero rollback autónomo por auditor.

**Razonamiento**: home 500 full-page es inequívoco (nadie puede acceder al sitio). Esperar el criterio "2 o más issues Sentry" en ese caso es overkill. El gate "PO decide y ejecuta" mantiene autoridad en el PO; auditor solo acelera el reporte.

**Riesgo si se posterga**: default = esperar criterio "2 o más", agrega 2-5 min de visibilidad del bug a users.

#### D-R2 · Sub-plan monitoreo T+24h → T+48h ante incidente

**Resumen**: ¿agregamos sub-plan de ventana extendida 24-48h post-incidente?

**Recomendación**: **sí, 15 min redactar**. Cadencia pasa de "cada 15min T+0→T+24" a "cada 2h T+24→T+48".

**Razonamiento**: ventana T+24→T+48 captura bugs de volumen acumulados (dead tuples, crons con segunda ejecución, race conditions con data acumulada). Sin plan explícito el PO sale de "modo incidente" al cumplir T+24 y pierde ventana crítica.

**Riesgo si se posterga**: bug de segundo orden detectado días después, difícil atribuir al incidente original.

---

### Comunicación (1)

#### D-C1 · Tono IG con/sin emojis

**Resumen**: ¿posts IG con emojis o sin?

**Recomendación**: **sin emojis**, consistencia con tono "marketplace serio de servicios profesionales". Usar ilustración vectorial para calidez.

**Razonamiento**: emojis en marketplace adultos puede proyectar casualness/amateur. Competidores (Rover, DOGIN) mantienen tono formal con warmth visual. Pawnecta ya tiene regla "zero emojis en UI" — aplicar también a social suma consistencia.

**Riesgo si se posterga**: default actual (sin emojis) es correcto, zero riesgo.

---

### Monitoreo (1)

#### D-M1 · Umbral reporte parcial cada 4h vs 6h

**Resumen**: ¿reporte parcial durante campaña cada 4h o cada 6h?

**Recomendación**: **cada 4h primeras 12h + cada 6h últimas 12h**. Balance densidad.

**Razonamiento**: primeras 12h concentran los riesgos de incidente (nuevos usuarios + patrones no previstos). Últimas 12h con más certeza de estabilidad, cadencia más espaciada ahorra fatiga PO.

**Riesgo si se posterga**: default = ad-hoc por PO, puede saltarse checkpoints importantes.

---

### Error handling (2)

#### D-EH1 · Fix exclusión mutua #125 si no mergea

**Resumen**: ¿qué si el fix exclusión mutua `/explorar` no mergea?

**Recomendación**: **resuelto en la jornada** — #125 fue merged el 2026-11-20 AM. Decisión ya efectiva.

**Razonamiento**: superado. Mantengo en lista por completitud del inventario.

**Riesgo si se posterga**: cero (cerrado).

#### D-EH2 · Kill-switch `/mis-reservas` + MessageThread

**Resumen**: ¿aterrizar kill-switch 5s en superficies autenticadas?

**Recomendación**: **sí, 30 min**, aterrizar en sprint cleanup fin de semana. Regla CLAUDE.md "kill-switch en pantallas async" ya existe.

**Razonamiento**: incidente real (PR #20 pan-1-def3) documentado con user colgado en "Cargando..." indefinido. Fix trivial con alto ROI preventivo.

**Riesgo si se posterga**: durante Supabase slow, usuarios ven página colgada → abandono invisible.

---

### Correos casos borde (1)

#### D-CC1 · Grep escape HTML en correo #4 + #10

**Resumen**: ¿pasada 10 min grep HTML inline en 2 templates email?

**Recomendación**: **sí**, 10 min pre-campañas. Si encuentra interpolación sin escape → 1-2 líneas fix.

**Razonamiento**: 10 min de pasada diagnostica XSS potencial en email HTML — vector real si proveedor malicioso pone HTML en su nombre. Fix cheap, riesgo cerrado.

**Riesgo si se posterga**: XSS en inbox depende del cliente MUA (algunos renderan, otros no). Baja probabilidad, alta severidad si pasa.

---

### Performance (1)

#### D-P1 · Lighthouse real sobre `/proveedor/{id}` + `/mensajes`

**Resumen**: ¿correr Lighthouse en 2 URLs auth viernes AM?

**Recomendación**: **sí, 5 min cada URL**. Completa baseline que la auditoría pre-launch no tenía.

**Razonamiento**: `/proveedor/{id}` + `/mensajes` son 2 superficies críticas sin datos de performance. Baseline permite detectar regresiones futuras.

**Riesgo si se posterga**: superficies auth sin baseline → regresiones futuras invisibles hasta que PO note "esto está más lento".

---

### A11y (1)

#### D-A1 · Runtime audit con axe DevTools sobre 5 URLs

**Resumen**: ¿pasada de 1h con axe runtime audit?

**Recomendación**: **sí, 1h**, idealmente durante testing manual pre-campañas. Complementa análisis estático.

**Razonamiento**: axe captura issues de a11y específicos del render real que análisis estático no puede ver (contraste con background específico, orden tabular computed, aria-live timings).

**Riesgo si se posterga**: hallazgos a11y runtime invisibles → usuarios con tech asistiva frustrados.

---

### Deuda aceptada (2)

#### D-DA1 · Validar alcance "deuda aceptada" vs "fix pre-freeze"

**Resumen**: ¿revisar corte técnico del doc deuda-aceptada?

**Recomendación**: **sí, 15 min review**. Validación cualitativa del PO sobre si hay ítems mal clasificados.

**Razonamiento**: el corte lo hizo el auditor con criterio técnico. El PO puede subir ítems a "fix pre-launch" por razones de negocio que el auditor no vio.

**Riesgo si se posterga**: default = corte del auditor queda. Baja probabilidad de clasificación errada.

#### D-DA2 · Sprint cleanup semana 1

**Resumen**: ¿sprint dedicado fin de semana para cerrar 7 ítems CONVIENE deuda aceptada?

**Recomendación**: **sí, ventana sábado-domingo** (~8-10h distribuidas). Impacto directo.

**Razonamiento**: fin de semana 21-22 nov tiene PII-VIEW-TIGHT (sábado) + WWW-CANONICAL (domingo). Combinar con cleanup aprovecha momentum de sesión técnica dedicada.

**Riesgo si se posterga**: deuda se acumula, más fricción visible en campañas.

---

### Primera semana post-campañas (3)

#### D-PS1 · Criterios mecánicos fix urgente (BLOQUEA/CONVIENE/MENOR)

**Resumen**: ¿aceptar criterios mecánicos del auditor para fix urgente durante primera semana?

**Recomendación**: **sí, criterios canónicos**. PO reserva derecho de override case-by-case.

**Razonamiento**: criterios mecánicos aceleran respuesta durante crisis. Override PO mantiene el juicio humano para casos no previstos.

**Riesgo si se posterga**: default = decisión ad-hoc cada incidente, lento.

#### D-PS4 · Sprint cleanup fin de semana primera semana

**Resumen**: autorizar cleanup fin de semana (ver D-DA2).

**Recomendación**: cubierto por D-DA2. Decisión conjunta.

**Razonamiento**: duplicado. Un solo sprint cleanup fin de semana cubre ambas semanas (pre y post campañas).

**Riesgo si se posterga**: idem D-DA2.

#### D-PS7 · Modo on-call nocturno Sentry email primera semana campañas

**Resumen**: ¿notificaciones nocturnas primera semana?

**Recomendación**: cubierto por C5. Decisión conjunta.

**Razonamiento**: duplicado (ver C5). Mismo setup Sentry Alerts + ventana noche aplica.

**Riesgo si se posterga**: idem C5.

---

### Playbook incidentes (4)

#### D-PI1 · Agregar 4º escenario "Error 5xx generalizado" al playbook

**Resumen**: ¿agregar escenario inequívoco 5xx-wide al playbook?

**Recomendación**: **sí, 1 página extra**, directo a N1 rollback. 30 min redacción.

**Razonamiento**: playbook actual cubre reports específicos (A: no publicar, B: reserva no llega, C: chat roto). 5xx-wide es inequívoco + hoy tiene gate "esperar 2 o más Sentry issues". Playbook con path directo a N1 reduce latencia.

**Riesgo si se posterga**: durante incidente 5xx-wide, el equipo lee playbook y no encuentra path → improvisa.

#### D-PI2 · Query consolidada A+B+C+D

**Resumen**: ¿agregar query universal al playbook?

**Recomendación**: **sí, 10 min redacción**. Query que dado un email retorna TODO (role, servicios, reservas, convs, contactos, notifs).

**Razonamiento**: durante incidente el PO ejecuta 2-3 queries secuenciales — tiempo perdido en copy-paste. Una query consolidada corta loop diagnostic.

**Riesgo si se posterga**: durante incidente, 3-5 min extra copy-paste por reporte.

#### D-PI3 · URLs + templates ticket Resend/Supabase soporte

**Resumen**: ¿guardar URLs ticket + templates genéricos pre-escritos?

**Recomendación**: **sí, 15 min**. Agregar sección "Escalación proveedores" al playbook.

**Razonamiento**: durante incidente escalable (Resend caído, Supabase down), buscar URL de ticket + redactar escalación al momento = 3-5 min extra. Pre-guardar lo evita.

**Riesgo si se posterga**: idem D-PI2 — demora operativa en incidente.

#### D-RB1 · Template página mantenimiento HTML estático

**Resumen**: ¿preparar página de mantenimiento estática para rollback N3?

**Recomendación**: **sí, 30 min**, pre-campañas. HTML simple, servido vía Vercel rewrite temporal durante N3.

**Razonamiento**: N3 (PITR Supabase) tarda 30-60 min. Durante ese tiempo users ven errores Vercel default (feo). Página custom mantiene profesionalidad + canal de comunicación (email de contacto, estado del incidente).

**Riesgo si se posterga**: en caso de N3 real, 30-60 min de users con experiencia pobre.

#### D-RB2 · Email incidente pre-redactado

**Resumen**: ¿template email para usuarios tras N3?

**Recomendación**: **sí, 15 min redacción**, template en `docs/planes/emails/incidente-template.md`.

**Razonamiento**: durante N3 real, redactar email al vuelo cuesta 15-20 min + riesgo de errores en copy bajo estrés. Template aterrizable con 3 placeholders.

**Riesgo si se posterga**: en N3 real, email tardío o mal redactado.

---

## Resumen priorizado

### Ítems ALTA prioridad pre-campañas (urgencia + impacto)

Si el PO tuviera que elegir 5 BLOQUEANTES + 5 DESEABLES para resolver primero:

**TOP 5 BLOQUEANTES**:
1. **C8** · Top 5 fixes perf (~2h 15min). Afecta CAC directo.
2. **C9** · Top 5 fixes a11y sistémicos (~3-4h). SEO + inclusión.
3. **C5** · Sentry email nocturno (10 min). Red de seguridad incidentes.
4. **C7** · Uptime Robot externo (10 min). Canal independiente.
5. **C10** · Experimento A/B E1+E3 (setup ~3-4h). Aprendizaje primera campaña.

**TOP 5 DESEABLES**:
1. **D-RB1** · Template página mantenimiento (30 min). Safety net N3.
2. **D-PI1** · Escenario 5xx-wide al playbook (30 min). Response rápido.
3. **D-EH2** · Kill-switch `/mis-reservas` (30 min). Prevención colgado.
4. **D-DA2** · Sprint cleanup fin de semana (8-10h). Deuda acumulada.
5. **D-CC1** · Grep escape HTML emails (10 min + fix). XSS gate.

**Total esfuerzo top 5 BLOQUEANTES + TOP 5 DESEABLES**: ~12-18h de trabajo distribuido.

### Decisiones rápidas (<15 min cada una)

Ítems donde el PO puede decidir "yes" sin más análisis — aceptar la recomendación:

- C1, C2, C3, C4 (todas comunicación campañas, decisión al momento).
- C6 (baseline queries, decisión al momento).
- D-C1 (tono emojis: no).
- D-M1 (umbral reporte: cada 4h primeras 12h + cada 6h últimas 12h).
- D-DA1 (validar alcance deuda: 15 min review).
- D-PS1 (criterios fix urgente: aceptar).

### Decisiones duplicadas (consolidar)

- **D-DA2 == D-PS4** → sprint cleanup fin de semana (una decisión única).
- **D-PS7 == C5** → notificaciones Sentry nocturno (una decisión única).

Al consolidar: lista de 29 queda efectivamente en 27 decisiones únicas.

---

## Modelo de respuesta en bloque sugerido

El PO puede responder al conjunto con el formato:

```
DECISIONES EN BLOQUE — {fecha}

BLOQUEANTES:
C1 [accept|modify|reject]: {nota opcional}
C2 [accept|modify|reject]: ...
...

DESEABLES:
D-R1 [accept|modify|reject]: ...
...

Items a priorizar esta semana: {lista de IDs}
Items a priorizar semana 2: {lista de IDs}
Items permanentes a BACKLOG: {lista de IDs}
```

---

## Decisiones pendientes del PO (sobre este doc)

### D1. ¿Formato acepta/modifica/rechaza en bloque sirve?

**Pregunta**: ¿el formato "accept|modify|reject" por ID es útil para revisar en bloque el fin de semana?

**Recomendación**: sí. 30 min de tiempo PO cierra 29 decisiones. Alternativa: revisar una por una lleva 2-3h.

**Impacto si no se decide**: default = formato libre PO.

### D2. Consolidación de duplicados sí/no

**Pregunta**: ¿fusionamos D-DA2 + D-PS4 + D-PS7 + C5 en 2 decisiones únicas en vez de 4?

**Recomendación**: sí. Reduce ruido. El doc base queda más limpio.

**Impacto si no se decide**: default = decisiones listadas como duplicadas, nota explicativa.

### D3. Ejecución post-decisión

**Pregunta**: ¿el PO acepta el bloque → auditor ejecuta cada "accept" como sprints chicos post-campañas (en orden de prioridad del top 5)?

**Recomendación**: sí. Permite al auditor avanzar autónomo sobre decisiones ya tomadas. PO revisa diffs al final.

**Impacto si no se decide**: default = decisión por decisión al momento de implementar.

---

## Firma

Este doc es "gatillo" para que el PO cierre decisiones en bloque durante el fin de semana. Complementa `decisiones-po-pendientes-20261120.md` sin duplicarlo.
