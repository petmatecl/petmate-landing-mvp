# Primera semana en operación — miércoles 25-11 al lunes 01-12

**Audiencia**: PO · **Autor**: auditor (2026-11-19 noche).
**Objetivo**: checklist operacional día por día. Cada sección es una jornada concreta. Qué revisa el PO, qué publica, qué correos salen, qué métricas saca, qué decisiones toma.
**Formato**: 7 secciones, una por día. Cada día tiene (a) rutina matutina, (b) acciones específicas, (c) checkpoint cierre de día.

Este doc se complementa con [docs/planes/monitoreo-24h-post-launch.md](../planes/monitoreo-24h-post-launch.md) (día 25 extendido) + [docs/planes/comunicacion-25-11.md](../planes/comunicacion-25-11.md) (comunicación externa) + [docs/playbooks/incidentes-comunes-20261119.md](../playbooks/incidentes-comunes-20261119.md) (bugs reportados).

---

## Día 1 — miércoles 25-11 (día del lanzamiento)

**Resumen del día**: lanzamiento oficial 10:00 CLT. Monitoreo denso primeras 24h. Ver [docs/planes/monitoreo-24h-post-launch.md](../planes/monitoreo-24h-post-launch.md) para el detalle.

### Rutina matutina (08:30-10:00 CLT)

- [ ] 08:30 — Despertar, café, abrir las 14 pestañas de monitoreo (lista en monitoreo-24h doc).
- [ ] 08:30-09:00 — Verificar SHA prod activo = SHA pre-freeze. Verificar Sentry sin issues críticos últimas 12h. Verificar Supabase Health.
- [ ] 09:00-09:30 — Smoke rápido manual: home + login + reserva + chat. Si algo falla → NO-GO.
- [ ] 09:30 — Baseline Q1-Q5 Supabase (contar users, servicios, reservas pre-launch).
- [ ] 09:30-10:00 — Preparar post IG (asset final) + agendar envío.

### T=0 GO (10:00 CLT)

- [ ] Publicar post IG anuncio (ver `comunicacion-25-11.md § Pieza 2`).
- [ ] Anunciar GO en el chat del equipo / grupo privado.
- [ ] Iniciar monitoreo denso (cada 15 min en Sentry + Vercel Logs).

### Acciones del día

- [ ] 11:00 — Enviar correo masivo a users registrados (si decisión fue manual, ver `comunicacion-25-11.md § Pieza 1`).
- [ ] 11:00 — Reporte parcial #1 (template monitoreo).
- [ ] 15:00 — Reporte parcial #2.
- [ ] 19:00 — Post Story IG refuerzo + reporte parcial #3.
- [ ] 22:00 — Verificar cron 22 UTC (recordatorio-reserva) ejecutó OK.
- [ ] 23:00 — Reporte parcial #4 (último del día).

### Checkpoint cierre de día

Al cerrar el día:

- [ ] Captura de pantalla de GA4 Realtime + Vercel Analytics dashboard (archivo en `docs/postmortems/2026-11-25-primer-dia-ss/`).
- [ ] Anotar números reales: registros totales, reservas, contactos, mensajes.
- [ ] Anotar incidentes (si hubo) + rollback aplicado.
- [ ] Mañana: reporte final T+24h.

---

## Día 2 — jueves 26-11

**Resumen del día**: cerrar reporte T+24h. Primer feedback de users en inbox. Primera decisión de ajustes.

### Rutina matutina (09:00-10:00 CLT)

- [ ] 09:00 — Café. Abrir Sentry (filtrar últimas 12h) + Vercel Logs + Supabase Health.
- [ ] 09:30 — Ejecutar query bank completa Q1-Q9. Anotar números.
- [ ] 10:00 — **Reporte T+24h final** (template extendido de `monitoreo-24h-post-launch.md § T+24h`).

### Acciones del día

- [ ] 10:30 — Revisar Zoho inbox `hola@pawnecta.com`. Responder reports en orden FIFO.
- [ ] 11:00 — Revisar IG notifs + comentarios en post lanzamiento. Responder comentarios públicos.
- [ ] 11:30-13:00 — **Primera ventana de fixes** si hay bugs reportados.
  - Priorizar: BLOQUEA (home/login/reservar roto) > CONVIENE (fricción visible) > MENOR.
  - Fix + PR + merge con CI verde.
  - Si fix amerita rollback del día 25 → aplicar N1 según `rollback-25-11.md`.

- [ ] 14:00 — Post IG de agradecimiento: "Gracias por el primer día. En 24h: X tutores, Y proveedores, Z reservas". (Ver `comunicacion-25-11.md § Día +1`).

- [ ] 15:00 — Checkpoint Sentry: qué issues nuevas aparecieron.

- [ ] 19:00 — Checkpoint final del día: monitoreo pasivo activo.

### Decisiones del día 2

- [ ] ¿Algún incidente del día 1 requiere post-mortem? → Agendar redacción post-mortem para el 27-28.
- [ ] ¿Algún fix hecho hoy debe comunicarse al user? → Responder a los reporters.
- [ ] ¿La tasa de conversión primer día está en rango esperado? Comparar con hipótesis pre-launch.

### Checkpoint cierre de día

- [ ] Anotar números acumulados 2 días.
- [ ] Anotar qué decisión se tomó con el feedback de users (fix aplicado / deuda agendada / descartado).

---

## Día 3 — viernes 27-11

**Resumen del día**: primer Story IG con testimonio de proveedor (si hay). Primer análisis de patrones en 72h de data.

### Rutina matutina

- [ ] 09:00 — Checkpoint Sentry + Vercel Logs + Supabase Health.
- [ ] 09:30 — Query Supabase: cuántas reservas confirmadas vs pendientes en 48h.
  ```sql
  SELECT estado, COUNT(*)
    FROM public.agendamientos
   WHERE created_at > '2026-11-25 10:00 CLT'
   GROUP BY 1;
  ```

### Acciones del día

- [ ] 10:30 — Revisar Zoho + IG.
- [ ] 11:00 — Identificar un proveedor con buenos resultados (reservas confirmadas + sin incidentes). Pedir autorización por chat para publicar testimonio.
- [ ] 12:00 — Si autorización OK, preparar Story IG (foto del proveedor + servicio + quote corto — regla imágenes del blog aplica a Instagram también).
- [ ] 14:00 — Publicar Story IG testimonio.

- [ ] 15:00-17:00 — **Segunda ventana de fixes** o inicio de sprint cleanup post-launch (ver `docs/sprints/deuda-aceptada-25-11.md § sprint cleanup semana 1`).

- [ ] 19:00 — Checkpoint final.

### Decisiones del día 3

- [ ] ¿Vale arrancar algún experimento A/B ya (E1 CTA ficha, E3 hero home)? Setup toma ~1 día (ver `experimentos-postlaunch.md`); si el volumen justifica, setup este fin de semana.
- [ ] ¿Push al blog? Entrada relacionada (ej. "Cómo elegir paseador" — ya publicada 19-11) puede ser compartida en IG Stories con link.

---

## Día 4 — sábado 28-11

**Resumen del día**: día de baja densidad operacional. Monitoreo pasivo. Posible ventana de sprint cleanup.

### Rutina matutina

- [ ] 09:30 — Checkpoint Sentry + inbox. Si cero incidentes nocturnos, OK.
- [ ] 10:00 — Query Supabase: contar mensajes de chat últimas 24h. Baja actividad fin de semana es esperable.

### Acciones del día

- [ ] 10:30-13:00 — **Sprint cleanup semana 1** si no se arrancó antes. Target: 7 ítems CONVIENE de deuda aceptada (~8-10h total si se distribuye entre sábado y domingo). Priorizar:
  1. Aterrizar fixes menores de a11y (contraste text-slate-400 → text-slate-500 sistémico).
  2. Fix kill-switch /mis-reservas + MessageThread.
  3. Fix empty state engañoso /mis-reservas.
  4. Rename ruta `/mis-solicitudes` → `/mis-reservas` + redirect.

- [ ] 15:00 — Checkpoint.

- [ ] 19:00 — Post IG opcional (si hay buen momentum de la semana): compartir métrica agregada del primer tramo.

### Decisiones del día 4

- [ ] ¿Qué items del BACKLOG escalaron en prioridad post-launch? Repriorizar lista.

---

## Día 5 — domingo 29-11

**Resumen del día**: idem sábado — monitoreo pasivo + ventana cleanup.

### Rutina matutina

- [ ] 10:00 — Checkpoint Sentry + inbox + IG notifs.

### Acciones del día

- [ ] 10:30-13:00 — Continuar sprint cleanup si quedaron ítems del sábado.
- [ ] 14:00 — Preparar material para la "retrospectiva semana 1" (tabla de números acumulados, incidentes, fixes aplicados).

- [ ] 16:00 — Verificar que sprint reseñas verificadas (planeado 26-11 → 30-11) progresó según plan. Si quedó pendiente, re-agendar.

### Decisiones del día 5

- [ ] ¿Sprint cleanup se cumplió? ¿Falta algo crítico?
- [ ] ¿Lanzamos un experimento A/B el lunes (E1 o E3)?

---

## Día 6 — lunes 30-11

**Resumen del día**: reporte semanal interno. Preparación del "post retrospectiva" para IG/blog del 3-12.

### Rutina matutina

- [ ] 09:00 — Checkpoint diario.
- [ ] 09:30 — Query Supabase: acumulado de 5 días completos.
  ```sql
  -- Overview semana 1
  SELECT
    (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL
       AND created_at > '2026-11-25 00:00 UTC') AS usuarios_nuevos,
    (SELECT COUNT(*) FROM public.servicios_publicados
       WHERE created_at > '2026-11-25 00:00 UTC' AND activo = true) AS servicios_nuevos,
    (SELECT COUNT(*) FROM public.agendamientos
       WHERE created_at > '2026-11-25 00:00 UTC') AS reservas_totales,
    (SELECT COUNT(*) FROM public.agendamientos
       WHERE created_at > '2026-11-25 00:00 UTC' AND estado = 'confirmada') AS reservas_confirmadas,
    (SELECT COUNT(*) FROM public.messages
       WHERE created_at > '2026-11-25 00:00 UTC') AS mensajes_chat,
    (SELECT COUNT(*) FROM public.contactos
       WHERE created_at > '2026-11-25 00:00 UTC') AS contactos_tracked;
  ```

### Acciones del día

- [ ] 10:00 — **Reporte semanal interno** en doc dedicado: `docs/postmortems/2026-11-30-retrospectiva-semana-1.md`. Cerrar con decisiones semana 2.
- [ ] 11:00 — Responder inbox acumulado (fin de semana).
- [ ] 12:00 — Lanzar E1 (CTA ficha) + E3 (hero home) si setup A/B está listo. O setup inicial si no se hizo fin de semana.
- [ ] 14:00 — Preparar material para blog post retrospectiva del 3-12.

### Decisiones del día 6

- [ ] ¿Lanzamos campaña de ads pagada semana 2? (Si viene en el plan de marketing — revisar con PO).
- [ ] ¿Expandimos a nueva ciudad / categoría? (Si el PO tiene en el plan).
- [ ] ¿Priorizamos sprint PII-VIEW-TIGHT (aplicado sábado 21-11 según plan) o algo salió mal?

### Checkpoint cierre de día

- [ ] Acta de "reseñas verificadas" (sprint 26-30 nov) marcada como cerrada si aplica.
- [ ] Doc retrospectiva semana 1 publicado internamente.

---

## Día 7 — martes 01-12

**Resumen del día**: primer día del mes. Transición de "semana 1 lanzamiento" a "operación normal". Blog post retrospectiva.

### Rutina matutina

- [ ] 09:00 — Checkpoint. Semana 1 cerrada, nueva fase arrancando.
- [ ] 09:30 — Query Supabase: contar `email_bounced` + `bounces` en Resend Analytics. Primer check real de reputación dominio.

### Acciones del día

- [ ] 10:00 — Publicar blog post retrospectiva "Primera semana de Pawnecta" (ver draft en `comunicacion-25-11.md § Día +7`).
- [ ] 11:00 — Promocionar blog post en IG Stories.
- [ ] 12:00 — Revisar métricas de experimentos (si E1 + E3 lanzaron el lunes, aún no hay data suficiente — monitoreo pasivo).
- [ ] 14:00 — Sprint planning para semana 2 (02-12 → 08-12):
  - Pendientes del sprint cleanup no cerrados en semana 1.
  - Posibles nuevas features si feedback de users apunta a gap específico.
  - Deuda post-lanzamiento prioritaria.

### Decisiones del día 7

- [ ] Prioridades semana 2 confirmadas.
- [ ] ¿Comunicación a users registros nuevos del fin de semana (Pieza 1 modificada para "2a tanda")? O esperar a tener campaign formal.

### Checkpoint cierre de semana 1

- [ ] Acta formal: `docs/postmortems/2026-12-01-semana-1-cerrada.md` con:
  - Números acumulados finales.
  - Incidentes de la semana + resoluciones.
  - Fixes aplicados.
  - Features nuevas (si aplica).
  - Feedback destacado de users.
  - Decisiones para semana 2.

---

## Resumen de artefactos de la semana

| Día | Artefacto a producir |
|---|---|
| Miércoles 25 | Capturas pantalla dashboard GA4 + Vercel. Reportes parciales 4x. |
| Jueves 26 | Reporte T+24h. Post IG agradecimiento. |
| Viernes 27 | Story IG testimonio proveedor. |
| Sábado 28 | PRs de cleanup si aplicaron. |
| Domingo 29 | Material para blog post retrospectiva. |
| Lunes 30 | `docs/postmortems/2026-11-30-retrospectiva-semana-1.md`. Experimentos A/B lanzados. |
| Martes 01-12 | Blog post retrospectiva publicado en /blog + IG. Sprint planning semana 2. |

---

## Rutina de monitoreo por día (compacto)

### Lunes a viernes

- 09:00 — Check Sentry + inbox + IG notifs (5 min).
- 11:00 — Reportes parciales si aplica.
- 15:00 — Check Sentry + queries si corresponde.
- 19:00 — Cierre de día.

### Sábado + domingo

- 10:00 — Check Sentry + inbox (3 min).
- 15:00 — Check pasivo.
- 19:00 — Cierre.

---

## Métricas norte

A trackear y comparar semana sobre semana a partir de semana 2:

1. **Conexiones semanales** = `contacto_iniciado` + `reserva_confirmada`. Meta semana 1: baseline. Meta semana 2: +20%.
2. **Tasa conversión ficha vista → contacto**: 15-25% rango sano.
3. **Tasa conversión contacto → reserva confirmada**: 40-60% sano.
4. **Reseñas publicadas por proveedor activo**: >= 0.3 por semana (1 cada 3 semanas).

---

## Decisiones pendientes del PO

### D1. Umbral de fix urgente vs sprint programado

**Pregunta**: durante la semana 1, cualquier bug reportado se arregla al día o espera al sprint programado?

**Recomendación del auditor**: criterios mecánicos:
- Bug BLOQUEA (home/login/reserva) → fix al momento, cualquier hora.
- Bug CONVIENE (fricción visible, no bloquea flow core) → fix al día siguiente AM.
- Bug MENOR (cosmético, afecta <5%) → agregar a sprint cleanup fin de semana.

**Impacto si no se decide**: default = criterios arriba.

### D2. Disponibilidad PO en horarios

**Pregunta**: el checklist asume PO disponible 09:00-22:00 CLT laborables, 10:00-20:00 fin de semana. ¿Confirmás esta ventana?

**Recomendación del auditor**: confirmar. Si hay ventana en que el PO está offline (viaje, evento), el auditor arma plan de contingencia (modo "diagnóstico-only + escalar via mensaje").

**Impacto si no se decide**: default = ventana asumida.

### D3. Testimonios de proveedores para IG

**Pregunta**: ¿autorizás pedir testimonios a proveedores con reservas confirmadas en semana 1 para publicar (con autorización)?

**Recomendación del auditor**: sí si hay candidato claro. Regla imágenes del blog aplica (solo fotos reales con autorización escrita). Alternativa: cita textual anónima si prefieren.

**Impacto si no se decide**: default = no publicar sin autorización previa.

### D4. Sprint cleanup fin de semana 1

**Pregunta**: ¿autorizás usar sábado + domingo semana 1 para cerrar los 7 ítems CONVIENE de deuda aceptada (~8-10h)?

**Recomendación del auditor**: sí si el fin de semana no tiene otros compromisos. El impacto es alto (cierra fricciones visibles antes que se acumulen reportes) y el riesgo bajo.

**Impacto si no se decide**: default = cleanup se distribuye en semana 2.

### D5. Primer experimento A/B fecha exacta

**Pregunta**: E1 (CTA ficha) requiere setup ~3-4h + luego 2 semanas de run. ¿Setup fin de semana 1 + lanzamiento lunes 30-11?

**Recomendación del auditor**: sí. Da data útil al empezar semana 2. Alternativa: setup semana 2 + lanzamiento semana 3 si fin de semana es muy ocupado.

**Impacto si no se decide**: default = setup semana 2 + lanzamiento fin de semana 2.

### D6. Blog post retrospectiva — tono

**Pregunta**: ¿blog post del 01-12 con números concretos (transparente) o narrativa general (más seguro)?

**Recomendación del auditor**: con números concretos si son alentadores. Transparencia construye confianza. Si números pobres, alternativa narrativa.

**Impacto si no se decide**: default = decisión del PO al tener los números finales el 30-11 PM.

### D7. Modo on-call nocturno

**Pregunta**: durante semana 1, ¿el PO tiene notificaciones push de Sentry activas para incidentes nocturnos?

**Recomendación del auditor**: sí semana 1 (ver `monitoreo-24h-post-launch.md § D1`). A partir de semana 2 reducir a email-only.

**Impacto si no se decide**: default = Sentry email-only.

---

## Firma

Esta semana se cierra el martes 01-12 con el acta formal. Modo operacional subsecuente (semana 2+) usa patrones distintos — plan separado.
