# Primera semana post-activación de campañas — checklist operacional

**Contexto**: documento previamente conocido como `primera-semana-25-11-al-01-12.md`. Reset del 2026-11-20 PM: NO hay lanzamiento 25-11. Este doc vive **sin fechas específicas** — se aplica literal cuando el PO decida activar campañas pagadas (meta 100 proveedores).

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: checklist operacional día por día para los 7 días post-activación de campañas. Qué revisa el PO, qué publica, qué correos salen, qué métricas saca, qué decisiones toma.

Este doc se complementa con:
- `docs/planes/monitoreo-24h-post-launch.md` (día 1 extendido, 24h intensivo).
- `docs/planes/comunicacion-25-11.md` (comunicación externa al activar campañas).
- `docs/playbooks/incidentes-comunes-20261119.md` (bugs reportados).

Los días se nombran T+0 (activación) a T+6 (primer lunes post). Fechas reales se sustituyen cuando el PO active campañas.

---

## Día T+0 — día de activación de campañas

**Resumen**: publicación del post IG + primer correo masivo + monitoreo denso primeras 24h. Ver `monitoreo-24h-post-launch.md` para el detalle de la jornada intensiva.

### Rutina pre-activación (2-3h antes)

- [ ] Abrir las 14 pestañas de monitoreo (lista en `monitoreo-24h-post-launch.md`).
- [ ] Verificar SHA prod activo = SHA estable de la última ventana. Sentry sin issues críticos últimas 12h. Supabase Health.
- [ ] Smoke rápido manual: home + login + reserva + chat. Si algo falla → NO-GO campañas, postergar.
- [ ] Baseline Q1-Q5 Supabase (contar users, servicios, reservas pre-activación).
- [ ] Preparar post IG + primer correo (asset final + draft) + agendar envío.

### T=0 GO

- [ ] Publicar post IG anuncio (ver `comunicacion-25-11.md § Pieza 2`).
- [ ] Anunciar GO en el chat del equipo.
- [ ] Iniciar monitoreo denso (cada 15 min Sentry + Vercel Logs).

### Acciones del día T+0

- [ ] T+1h — Enviar correo masivo (si decisión fue manual).
- [ ] T+1h — Reporte parcial #1 (template monitoreo).
- [ ] T+5h — Reporte parcial #2.
- [ ] T+9h — Post Story IG refuerzo + reporte parcial #3.
- [ ] T+12h — Verificar cron 22 UTC (recordatorio-reserva) ejecutó OK.
- [ ] T+13h — Reporte parcial #4 (último del día).

### Checkpoint cierre del día T+0

- Captura de GA4 Realtime + Vercel Analytics (archivar en `docs/postmortems/YYYY-MM-DD-activacion-campanas-ss/`).
- Números reales: registros totales, reservas, contactos, mensajes.
- Incidentes (si hubo) + rollback aplicado.
- Mañana: reporte T+24h.

---

## Día T+1 — primer día completo tras activación

**Resumen**: cerrar reporte T+24h. Primer feedback de users en inbox. Primeras decisiones de ajuste.

### Rutina matutina

- [ ] Café + abrir Sentry (últimas 12h) + Vercel Logs + Supabase Health.
- [ ] Ejecutar query bank completa Q1-Q9. Anotar números.
- [ ] **Reporte T+24h final** (template extendido de `monitoreo-24h-post-launch.md § T+24h`).

### Acciones del día

- [ ] Revisar Zoho `hola@pawnecta.com`. Responder reports FIFO.
- [ ] Revisar IG notifs + comentarios. Responder.
- [ ] **Primera ventana de fixes** si hay bugs:
  - BLOQUEA (home/login/reservar roto) > CONVIENE > MENOR.
  - Fix + PR + merge con CI verde.
  - Si fix amerita rollback de T+0 → aplicar N1 según `rollback-25-11.md`.
- [ ] Post IG agradecimiento: "Gracias por la primera jornada. En 24h: X tutores, Y proveedores, Z reservas".

### Decisiones del día T+1

- ¿Algún incidente requiere post-mortem? → Agendar redacción.
- ¿Fixes del día deben comunicarse al user que reportó? → Responder.
- ¿Tasa de conversión primer día en rango esperado? Comparar con hipótesis pre-activación.

---

## Día T+2 — primer Story IG testimonio

**Resumen**: primer Story IG con testimonio de proveedor (si hay). Primer análisis de patrones.

### Rutina + acciones

- [ ] Checkpoint Sentry + Vercel + Supabase.
- [ ] Query reservas confirmadas vs pendientes acumuladas 48h.
- [ ] Zoho + IG.
- [ ] Identificar proveedor con buen resultado + pedir autorización escrita para publicar testimonio (regla imágenes blog aplica también a IG).
- [ ] Si autorización OK, publicar Story IG testimonio (foto + servicio + quote corto).
- [ ] **Segunda ventana de fixes** o inicio sprint cleanup post-activación (ver `docs/sprints/deuda-aceptada-25-11.md`).

### Decisiones del día T+2

- ¿Lanzamos ya experimentos A/B (E1 + E3) o esperamos volumen? Setup ~1 día si no está.
- ¿Push al blog? Entradas existentes pueden compartirse en IG Stories.

---

## Día T+3 — monitoreo pasivo, sprint cleanup

**Resumen**: día de baja densidad operacional (típicamente sábado si T+0 fue miércoles). Monitoreo pasivo. Ventana sprint cleanup.

### Rutina + acciones

- [ ] Checkpoint Sentry + inbox.
- [ ] Query Supabase: mensajes chat últimas 24h.
- [ ] **Sprint cleanup** si no se arrancó antes. Target: 7 ítems CONVIENE de deuda aceptada (~8-10h).
  Prioridades típicas:
  1. Fixes de a11y sistémicos (contraste `text-slate-400` → `text-slate-500`).
  2. Kill-switch `/mis-reservas` + MessageThread.
  3. Fix empty state engañoso `/mis-reservas`.
  4. Rename ruta `/mis-solicitudes` → `/mis-reservas` + redirect.
- [ ] Opcional Post IG compartir métrica agregada.

### Decisiones del día T+3

- ¿Qué items del BACKLOG escalaron en prioridad post-activación? Repriorizar.

---

## Día T+4 — monitoreo pasivo + preparación retrospectiva

**Resumen**: idem T+3 — monitoreo pasivo + continuar cleanup + preparar retrospectiva.

### Rutina + acciones

- [ ] Checkpoint.
- [ ] Continuar sprint cleanup si quedaron ítems.
- [ ] Preparar material para "retrospectiva primera semana" (tabla de números acumulados, incidentes, fixes).
- [ ] Verificar progreso de sprint reseñas verificadas (si estaba en calendario).

### Decisiones del día T+4

- ¿Sprint cleanup se cumplió? ¿Falta algo crítico?
- ¿Lanzamos un experimento A/B el T+5?

---

## Día T+5 — reporte primer tramo + experimentos A/B

**Resumen**: típico lunes (si T+0 fue miércoles). Reporte semanal interno.

### Rutina + acciones

- [ ] Checkpoint diario.
- [ ] Query Supabase acumulado 5 días completos:
  ```sql
  SELECT
    (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL
       AND created_at > '{T+0 timestamp}') AS usuarios_nuevos,
    (SELECT COUNT(*) FROM public.servicios_publicados
       WHERE created_at > '{T+0 timestamp}' AND activo = true) AS servicios_nuevos,
    (SELECT COUNT(*) FROM public.agendamientos
       WHERE created_at > '{T+0 timestamp}') AS reservas_totales,
    (SELECT COUNT(*) FROM public.agendamientos
       WHERE created_at > '{T+0 timestamp}' AND estado = 'confirmada') AS reservas_confirmadas,
    (SELECT COUNT(*) FROM public.messages
       WHERE created_at > '{T+0 timestamp}') AS mensajes_chat,
    (SELECT COUNT(*) FROM public.contactos
       WHERE created_at > '{T+0 timestamp}') AS contactos_tracked;
  ```
- [ ] **Reporte semanal interno** en `docs/postmortems/{T+5 fecha}-retrospectiva-primera-semana-campanas.md`.
- [ ] Responder inbox acumulado.
- [ ] Lanzar E1 + E3 si setup A/B está listo.
- [ ] Preparar blog post retrospectiva.

### Decisiones del día T+5

- ¿Mantenemos o aumentamos inversión en campañas semana 2?
- ¿Expandimos a nueva ciudad / categoría?

---

## Día T+6 — primer día del tramo "operación normal post-activación"

**Resumen**: primer día de la segunda semana. Transición de "primera semana campañas" a "operación normal con campañas activas".

### Rutina + acciones

- [ ] Checkpoint.
- [ ] Query email bounced + bounces en Resend. Primer check reputación dominio post-campaña.
- [ ] Publicar blog post retrospectiva "Primera semana con campañas".
- [ ] Promocionar blog en IG Stories.
- [ ] Revisar métricas experimentos (datos aún tempranos).
- [ ] Sprint planning semana 2 campañas.

### Checkpoint cierre primera semana

- Acta formal `docs/postmortems/{T+6 fecha}-primera-semana-campanas-cerrada.md`:
  - Números acumulados finales.
  - Incidentes + resoluciones.
  - Fixes aplicados.
  - Features nuevas si aplica.
  - Feedback destacado.
  - Decisiones para semana 2.

---

## Resumen de artefactos

| Día | Artefacto a producir |
|---|---|
| T+0 | Capturas GA4 + Vercel. Reportes parciales 4x. |
| T+1 | Reporte T+24h. Post IG agradecimiento. |
| T+2 | Story IG testimonio proveedor (si autorizado). |
| T+3 | PRs de cleanup. |
| T+4 | Material para blog retrospectiva. |
| T+5 | `docs/postmortems/{YYYY-MM-DD}-retrospectiva-primera-semana-campanas.md`. Experimentos A/B lanzados. |
| T+6 | Blog post retrospectiva publicado en /blog + IG. Sprint planning semana 2. |

---

## Rutina de monitoreo por día (compacto)

### Lunes a viernes

- 09:00 — Check Sentry + inbox + IG notifs (5 min).
- 11:00 — Reportes parciales si aplica.
- 15:00 — Check Sentry + queries si corresponde.
- 19:00 — Cierre.

### Sábado + domingo

- 10:00 — Check Sentry + inbox (3 min).
- 15:00 — Check pasivo.
- 19:00 — Cierre.

---

## Métricas norte

Trackear + comparar semana sobre semana:

1. **Conexiones semanales** = `contacto_iniciado` + `reserva_confirmada`. Meta semana 1: baseline campañas. Semana 2: +20%.
2. **Tasa conversión ficha vista → contacto**: 15-25% sano.
3. **Tasa conversión contacto → reserva confirmada**: 40-60% sano.
4. **Reseñas publicadas por proveedor activo**: ≥ 0.3 por semana.

---

## Decisiones pendientes del PO

### D1. Umbral de fix urgente vs sprint programado

**Pregunta**: durante primera semana campañas, ¿cualquier bug reportado se arregla al día o espera al sprint programado?

**Recomendación**: criterios mecánicos:
- BLOQUEA (home/login/reserva) → fix al momento.
- CONVIENE (fricción visible, no bloquea flow core) → fix al día siguiente AM.
- MENOR (cosmético, afecta <5%) → sprint cleanup fin de semana.

**Default si no decide**: criterios arriba.

### D2. Disponibilidad PO en horarios — RESUELTA

**Respuesta del PO (2026-11-20)**: martes/jueves/viernes respuesta ágil; lunes/miércoles menor disponibilidad (reuniones Bci); fines de semana menor salvo notificación teléfono. Vía incidente crítico: mail/WhatsApp/SMS indistinto. Regla operativa para auditor: avanzar + documentar decisión pendiente, no pausar. Escalar por teléfono solo si incidente crítico (sitio caído, pérdida de datos, bug afectando users ahora).

### D3. Testimonios de proveedores para IG

**Pregunta**: ¿autorizás pedir testimonios a proveedores con reservas confirmadas en T+1/T+2 para publicar con autorización escrita?

**Recomendación**: sí si hay candidato claro. Regla imágenes blog aplica (fotos reales con autorización). Alternativa: cita textual anónima.

**Default si no decide**: no publicar sin autorización previa.

### D4. Sprint cleanup fin de semana T+3/T+4

**Pregunta**: ¿autorizás usar T+3 + T+4 para cerrar los 7 ítems CONVIENE de deuda aceptada (~8-10h)?

**Recomendación**: sí si el fin de semana no tiene otros compromisos. Impacto alto (cierra fricciones visibles), riesgo bajo.

**Default si no decide**: cleanup se distribuye en semana 2.

### D5. Primer experimento A/B fecha

**Pregunta**: E1 (CTA ficha) requiere setup ~3-4h + 2 semanas de run. ¿Setup T+3/T+4 + lanzamiento T+5?

**Recomendación**: sí. Da data útil al empezar semana 2.

**Default si no decide**: setup semana 2 + lanzamiento semana 3.

### D6. Blog post retrospectiva T+6 — tono

**Pregunta**: ¿blog con números concretos (transparente) o narrativa general (más seguro)?

**Recomendación**: con números si son alentadores. Alternativa narrativa si pobres.

**Default si no decide**: decisión del PO al tener números el T+5 PM.

### D7. Modo on-call nocturno primera semana campañas

**Pregunta**: ¿notificaciones push de Sentry por email al PO durante noches T+0 → T+6?

**Recomendación**: sí primera semana. Reducir a email-only semana 2+.

**Default si no decide**: Sentry email-only.

---

## Firma

Este doc es checklist operacional para aplicar cuando el PO active campañas. Modo operacional subsecuente (semana 2+) usa patrones distintos — plan separado en su momento.
