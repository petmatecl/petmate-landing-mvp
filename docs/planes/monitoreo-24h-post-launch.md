# Monitoreo 24h post-launch — manual operacional

**Fecha**: miércoles 2026-11-25 10:00 CLT → jueves 2026-11-26 10:00 CLT.
**Formato**: manual de pantalla. El PO sigue este doc literal durante las 24h del launch. Cada sección dice exactamente qué abrir, qué mirar, qué umbral dispara qué acción.
**Fuentes pre-abiertas sugeridas** (tabs del navegador):

1. Vercel Dashboard → pawnecta-landing-mvp → Deployments.
2. Vercel Dashboard → Analytics tab.
3. Vercel Dashboard → Logs tab (filtro `level=error`).
4. Sentry → Issues (ordenar por First Seen DESC).
5. Supabase Studio prod → SQL Editor (query bank preparada, abajo).
6. Supabase Studio prod → Reports → Database Health.
7. GA4 → Realtime report.
8. GA4 → Reports → Events (filter: últimas 24h).
9. Google Search Console → Coverage + Performance.
10. Upstash → pawnecta-login-ratelimit (si aplica al momento).
11. Resend → Dashboard → Emails.
12. Resend → Analytics → Deliverability.
13. Inbox `hola@pawnecta.com` (Zoho).
14. IG @pawnecta notifications.

---

## Tabla por herramienta

| # | Herramienta | Qué mirar | Umbral alerta | Ventana revisar |
|---|---|---|---|---|
| 1 | **Vercel Deployments** | Estado del deployment prod activo. Debe ser "Ready" sobre el SHA pre-freeze anotado. | Si cambia a "Error" o si hay deployment nuevo no autorizado → alerta inmediata | Cada cambio notificado por email + visualmente al refrescar |
| 2 | **Vercel Analytics** | Visits + Unique visitors + Top routes | Caída brusca de visits >50% vs hora anterior (post pico de lanzamiento) | Horas 10, 12, 14, 16, 18, 20, 22 CLT |
| 3 | **Vercel runtime logs** | Response time p95 + 500s por endpoint | >5 respuestas 5xx en 10 min mismo endpoint | Monitoreo activo 10:00-14:00 CLT, pasivo después |
| 4 | **Sentry Issues** | Issues nuevos con `user_id ≠ aff2a90d/0c2ab509` (usuarios del PO) | ≥3 issues `userCount>1` nuevos en 30 min | Cada 15 min 10:00-14:00; cada 60 min 14:00-22:00 |
| 5 | **Supabase SQL (query bank abajo)** | Cantidad de registros nuevos + reservas + mensajes. Autovacuum estado. | Query latency sostenida >500ms + CPU >80% | Snapshot a T+1h, T+6h, T+12h, T+24h |
| 6 | **Supabase Database Health** | CPU + conexiones + disk I/O + query latency | CPU>80% sostenido 15 min / conexiones>90% cap / queries slow aumentan | Chequeo T+1h, T+4h, T+12h, T+24h |
| 7 | **GA4 Realtime** | Usuarios activos + eventos `ficha_vista`, `reserva_confirmada`, `contacto_iniciado`, `registro_tutor_completado`, `registro_proveedor_iniciado` | 0 actividad en 20 min con tráfico visible en Vercel Analytics → algo roto en el tag | Cada 15 min 10:00-14:00; cada hora después |
| 8 | **GA4 Reports Events** | Volumen agregado por evento key. Comparar con baseline del lunes 24-11 PM. | Caída >70% en `ficha_vista` vs baseline → bug en catálogo | T+6h y T+24h |
| 9 | **Google Search Console** | Errores 404/500 en Coverage, crawl errors, queries indexadas | 20+ URLs nuevos con 404 en Coverage → sitemap mal sirviendo | T+6h y T+24h |
| 10 | **Upstash (login rate limiter)** | Total Commands + Hit rate | Commands = 0 cuando esperamos >0 → rate limiter no conectando | T+6h y T+24h |
| 11 | **Resend Dashboard** | Delivered / Bounced / Complained últimas 24h | Delivered rate <95% / bounces >5 / cualquier complaint | T+1h, T+6h, T+24h |
| 12 | **Resend Analytics** | Métricas por template (welcome, reserva-confirmada, recordatorio-cron) | Si algún template sale con 0 delivered pero >0 intentos → bug en el send | T+6h y T+24h |
| 13 | **Zoho hola@pawnecta.com** | Correos entrantes de users con feedback/bugs | Un reporte de bug con "500 en /ruta" o "no puedo X" → playbook incidentes | Cada 2h 10:00-20:00; cada 4h 20:00-10:00 del 26 |
| 14 | **IG notifs** | Comentarios + DMs post-publicación del launch post | Mención de bug visible en comentario público → responder rápido | Cada 2h 10:00-20:00 |

---

## Query bank Supabase (SQL Editor prod)

Todas **read-only**. Pegar una por tab, ejecutar, anotar número en el reporte.

### Q1 — Registros por hora últimas 24h

```sql
SELECT date_trunc('hour', created_at) AS hora,
       COUNT(*) FILTER (WHERE id IN (SELECT auth_user_id FROM public.usuarios_buscadores)) AS tutores,
       COUNT(*) FILTER (WHERE id IN (SELECT auth_user_id FROM public.proveedores)) AS proveedores,
       COUNT(*) AS total
  FROM auth.users
 WHERE created_at > NOW() - INTERVAL '24 hours'
   AND email_confirmed_at IS NOT NULL
 GROUP BY 1 ORDER BY 1 DESC;
```

Umbral de interés: picos por hora. Esperable pico a T+30min a T+2h post-launch.

### Q2 — Reservas creadas últimas 24h por estado

```sql
SELECT date_trunc('hour', created_at) AS hora,
       COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
       COUNT(*) FILTER (WHERE estado = 'confirmada') AS confirmadas,
       COUNT(*) FILTER (WHERE estado = 'rechazada') AS rechazadas,
       COUNT(*) FILTER (WHERE estado = 'cancelada') AS canceladas,
       COUNT(*) FILTER (WHERE estado = 'cancelada_proveedor') AS cancel_prov,
       COUNT(*) AS total
  FROM public.agendamientos
 WHERE created_at > NOW() - INTERVAL '24 hours'
 GROUP BY 1 ORDER BY 1 DESC;
```

Umbral de interés: si `pendiente` sin resolver crece sin `confirmada` = proveedores no están reaccionando (soporte o UX issue).

### Q3 — Servicios publicados nuevos últimas 24h

```sql
SELECT date_trunc('hour', created_at) AS hora,
       COUNT(*) AS servicios_nuevos,
       COUNT(DISTINCT proveedor_id) AS proveedores_publicando
  FROM public.servicios_publicados
 WHERE created_at > NOW() - INTERVAL '24 hours'
   AND activo = true
 GROUP BY 1 ORDER BY 1 DESC;
```

### Q4 — Mensajes de chat últimas 24h

```sql
SELECT date_trunc('hour', created_at) AS hora,
       COUNT(*) AS msgs,
       COUNT(DISTINCT conversation_id) AS convs_activas
  FROM public.messages
 WHERE created_at > NOW() - INTERVAL '24 hours'
 GROUP BY 1 ORDER BY 1 DESC;
```

### Q5 — Contactos (track) últimas 24h por canal

```sql
SELECT canal,
       COUNT(*) AS cantidad
  FROM public.contactos
 WHERE created_at > NOW() - INTERVAL '24 hours'
 GROUP BY 1 ORDER BY 2 DESC;
```

### Q6 — Reservas sin recordatorio enviado + fecha mañana

```sql
SELECT id, fecha_preferida, estado,
       recordatorio_tutor_enviado_at IS NULL AS tutor_pend,
       recordatorio_proveedor_enviado_at IS NULL AS prov_pend
  FROM public.agendamientos
 WHERE estado = 'confirmada'
   AND fecha_preferida BETWEEN NOW() + INTERVAL '12 hours' AND NOW() + INTERVAL '36 hours'
   AND (recordatorio_tutor_enviado_at IS NULL OR recordatorio_proveedor_enviado_at IS NULL)
 ORDER BY fecha_preferida ASC;
```

Umbral: si al 25-11 22:30 UTC (post-cron) queda alguna fila con `*_pend = true`, el cron no procesó esa reserva. Investigar en Vercel logs.

### Q7 — Query performance (identificar slow queries)

```sql
SELECT calls,
       mean_exec_time AS avg_ms,
       max_exec_time AS max_ms,
       query
  FROM pg_stat_statements
 WHERE mean_exec_time > 100
   AND query NOT LIKE '%pg_stat_statements%'
 ORDER BY mean_exec_time DESC
 LIMIT 10;
```

Umbral: query con mean_exec_time >500ms visible en lista → identificar origen (RPC `buscar_servicios` o agregación específica).

### Q8 — Autovacuum last run por tabla

```sql
SELECT relname,
       last_autovacuum,
       last_autoanalyze,
       n_dead_tup
  FROM pg_stat_user_tables
 WHERE schemaname = 'public'
 ORDER BY n_dead_tup DESC NULLS LAST
 LIMIT 15;
```

Umbral: tabla con >10k dead_tup + sin autovacuum >7 días → VACUUM ANALYZE manual.

### Q9 — Sentry setUser coverage (users con eventos atribuidos vs anónimos)

Sentry no es Supabase, pero queda nota: al abrir Sentry → All Events → verificar que hay `user.id` populado en >80% de events. Si cae a <50%, el `Sentry.setUser` no está ejecutando en algún path nuevo.

---

## Cronograma hora por hora — miércoles 25-11

### T=0 (09:30-10:00 CLT) — Pre-GO

- [ ] Abrir los 14 tabs listados arriba.
- [ ] Verificar SHA prod activo = SHA pre-freeze anotado en [docs/sprints/lanzamiento-20261125.md § SHAs clave](../sprints/lanzamiento-20261125.md).
- [ ] Vercel Logs — cero 5xx en últimas 2h.
- [ ] Sentry — cero issues nuevos con `userCount>1` últimas 12h.
- [ ] Supabase Health — CPU <40%, conexiones <40% cap.
- [ ] Ejecutar Q1-Q4 como baseline (anotar números pre-launch).

### T=0 (10:00 CLT) — GO

- [ ] Smoke rápido manual en prod: home carga, login funciona, /explorar muestra catálogo, logout.
- [ ] Publicar post IG (ver `docs/planes/comunicacion-25-11.md § Pieza 2`).

### T+5 → T+30 min (10:05-10:30 CLT) — Monitoreo intensivo

- [ ] Sentry refresh cada 2 min. Cero tolerancia a issues nuevos `userCount>1`.
- [ ] Vercel Logs refresh cada 2 min. Filter `level=error`.
- [ ] GA4 Realtime activo. Verificar que aparecen events `ficha_vista` / `contacto_iniciado` conforme haya tráfico.
- [ ] Q2 cada 15 min — verificar que las primeras reservas aparecen.

### T+30 → T+60 min (10:30-11:00 CLT) — Primera revisión

- [ ] Ejecutar Q1-Q5. Anotar números.
- [ ] Vercel Analytics: ¿hay tráfico esperado? (~50-200 uniques en primera hora si campaña IG ya está en circulación).
- [ ] Sentry: issues nuevos ≤ 1 por hora aceptable.

### T+60 min (11:00 CLT) — **Reporte parcial #1**

**Template reporte de 4 horas**:

```
MONITOREO T+1h (25-11 11:00 CLT)

Sentry issues nuevos userCount>1: {N}
  - Issue más alto: {JAVASCRIPT-NEXTJS-X — userCount Y — summary Z}
Vercel 5xx últimas 1h: {N} (endpoints: {lista})
Supabase CPU avg última hora: {%}
  conexiones peak: {N}
Q1 — registros últimas 1h: {tutores N, proveedores N}
Q2 — reservas últimas 1h: {pend N, conf N, rech N}
Q3 — servicios nuevos: {N} publicados por {N} proveedores
Q4 — msgs: {N} msgs en {N} convs
GA4 Realtime: {N} users activos, {ficha_vista N, reserva_confirmada N}
Resend: delivered {N}, bounced {N}

Alertas activas: {ninguna / lista}

Siguiente check: 15:00 CLT (T+5h).
```

**Enviar**: anotar en el chat / inbox. Si algo en `Alertas activas`, actuar inmediato.

- [ ] Enviar correo masivo a users registrados si decisión D6 de `comunicacion-25-11.md` fue "manual" + conditions OK.

### T+1h → T+5h (11:00-15:00 CLT) — Monitoreo activo

- [ ] Sentry cada 30 min.
- [ ] Vercel Logs cada 30 min.
- [ ] Q2 cada hora.
- [ ] Zoho inbox cada 2h.
- [ ] IG notifs cada 2h.

### T+5h (15:00 CLT) — **Reporte parcial #2**

(Mismo template arriba.)

- [ ] Q1-Q8 completo.
- [ ] Verificar autovacuum ran OK en `agendamientos`, `evaluaciones`, `usuarios_buscadores`, `proveedores` (Q8).

### T+5h → T+12h (15:00-22:00 CLT) — Monitoreo medio

- [ ] Sentry cada 60 min.
- [ ] Vercel Logs cada 60 min.
- [ ] GA4 Realtime al pasar + GA4 Reports para ver decay esperado.

### T+9h (19:00 CLT) — Post Story IG de refuerzo

- [ ] Publicar Story IG (según plan comunicación).

### T+11.5h (21:30 CLT) — Pre-cron verificación

- [ ] Verificar Supabase Health estable.
- [ ] Ejecutar Q6 para contar reservas elegibles del cron 22:00 UTC.

### T+12h (22:00 UTC = 19:00 CLT) — **Cron recordatorio-reserva dispara**

- [ ] Vercel Logs → función `/api/cron/recordatorio-reserva` → confirmar status 200.
- [ ] Response del cron en Logs debe incluir `success: true, enviados: N, failures: []`.
- [ ] Si `failures.length > 0` → investigar cada failure.
- [ ] Ejecutar Q6 post-cron. Las reservas que estaban elegibles ahora deberían tener `recordatorio_*_enviado_at` populado.

### T+12h → T+24h (22:00 CLT → 10:00 CLT del 26) — Monitoreo pasivo

- [ ] Sentry refresh pasivo al despertarse (si el PO está dormido 00:00-07:00, pedir aviso de Sentry por email).
- [ ] Zoho inbox check al despertarse.

### T+24h (26-11 10:00 CLT) — **Reporte final #3 "Primer día"**

Template extendido:

```
REPORTE PRIMER DÍA (25-11 10:00 CLT → 26-11 10:00 CLT)

=== Volumen ===
Tutores nuevos: {N}
Proveedores nuevos: {N}
Servicios publicados: {N}
Reservas totales: {N} (pend {N} / conf {N} / canc {N})
Contactos iniciados: {N} (chat {N}, wa {N}, tel {N}, email {N})
Mensajes chat: {N} en {N} convs

=== Técnico ===
Sentry total issues 24h: {N} (con userCount>1: {N})
Vercel 5xx total: {N}
Vercel p95 response time: {ms}
Supabase CPU max: {%}, avg: {%}
Resend delivered: {N}, bounced: {N}, complained: {N}
Cron 22 UTC: {OK/FAIL} — enviados {N} / fallidos {N}

=== Marketing ===
Correo masivo delivered rate: {%}
Correo open rate: {%}
Correo CTA click rate: {%}
IG post likes/comments/shares: {N}/{N}/{N}
Vercel Analytics uniques: {N}
Top 3 rutas visitadas: {lista}

=== Incidentes ===
{Lista con timestamp + descripción + rollback aplicado si corresponde}

=== Observaciones cualitativas ===
Feedback por correo hola@: {N correos — temas: ...}
Feedback por IG: {N comentarios — temas: ...}

Pendientes para hoy (26-11):
- {ítem 1}
- {ítem 2}
```

---

## Alerta inmediata — respuesta por tipo

| Síntoma | Acción primera | Escalamiento |
|---|---|---|
| Sentry: 3+ issues `userCount>1` nuevos en 10 min, mismo mecanismo | Pausar, investigar stack trace, identificar path roto. Si home/explorar/login → N1 rollback (ver `docs/planes/rollback-25-11.md § N1`) | PO decide rollback |
| Vercel Logs: >5 500s en 10 min mismo endpoint | Idem anterior. Si endpoint crítico → N1 | PO decide |
| Supabase CPU >90% sostenido 10 min | Q7 identificar query. Si query es `buscar_servicios` → cache del front; si otra → investigar | PO + auditor |
| Supabase conexiones >95% cap | Verificar leak (connection pool mal cerrada). Reiniciar instance Supabase vía dashboard o esperar que el spike pase | PO + soporte Supabase si persiste |
| Resend bounce rate >10% | Pausar envíos masivos (correo Pieza 1 si aún no salió). Investigar dominio / inbox del user | PO |
| GA4 Realtime 0 por >20 min con tráfico | Verificar gtag loading en prod (DevTools Network). Si gtag no carga → bug CSP o script tag | PO + auditor |
| Cron 22UTC no ejecutó (Vercel Logs no muestra invocación) | Verificar `vercel.json` cron schedule + env `CRON_SECRET` | Soporte Vercel si persiste |
| Reporte de bug user "no puedo X" | Abrir `docs/playbooks/incidentes-comunes-20261119.md`, ir al escenario que aplica | PO reproduce + playbook |

---

## Equipo de guardia

**PO**: contacto primario 25-11 09:00-22:00 CLT. Después, modo pasivo (notificaciones Sentry por email).

**Auditor**: en el chat para asistencia en diagnóstico. Sin permisos de prod (solo lectura + propuestas).

**Soporte Supabase (Pro plan)**: ticket si DB health crítico. SLA Pro: <30 min High priority.

**Soporte Vercel**: ticket si infra. Priority queue Pro.

---

## Preparación pre-GO (martes 24-11 PM)

- [ ] Guardar este doc abierto en el navegador para referencia rápida 25-11.
- [ ] Verificar acceso a los 14 tabs listados (login + permisos activos).
- [ ] Imprimir o guardar en segunda pantalla las queries Q1-Q9.
- [ ] Verificar notificaciones Sentry por email activas (para turno nocturno).
- [ ] Verificar que la cuenta de PO tiene acceso Vercel "Owner" o "Admin" para hacer rollback.
- [ ] Teléfono con buena señal + cargado.

---

## Decisiones pendientes del PO

### D1. Notificaciones push por email de Sentry durante la noche

**Pregunta**: ¿configuramos Sentry para enviar email al PO cuando aparezca un issue con `userCount > 2` durante 25-11 00:00 CLT → 07:00 CLT (horas de sueño)?

**Recomendación del auditor**: sí. Alert con cooldown 30 min para evitar spam. En Sentry → Alerts → Metric alert sobre `events` por issue. Filter: `is:new AND user.count > 2`. Trigger: email al PO.

**Impacto si no se decide**: default = monitoreo pasivo nocturno. Un incidente nocturno se detecta recién al despertar.

### D2. Umbral del reporte parcial

**Pregunta**: ¿reporte cada 4h (T+1, T+5, T+9, T+13, T+17, T+21, T+24) o cada 6h (T+1, T+6, T+12, T+18, T+24)?

**Recomendación del auditor**: cada 4h primeras 12h, cada 6h últimas 12h. Densidad alta en ventana de atención del PO, relajada de madrugada.

**Impacto si no se decide**: default cada 4h primeras 12h + cada 6h últimas 12h.

### D3. Baseline pre-launch (martes 24 PM) para Q1-Q5

**Pregunta**: ¿valide que el auditor corra Q1-Q5 el martes 24-11 PM (pre-freeze) y deje los números en este doc como baseline para comparar el 25?

**Recomendación del auditor**: sí. El PO los ejecuta por SQL Editor (no podemos escribir contra prod). 5 min. Queda registro empírico.

**Impacto si no se decide**: default = se corren al T=0 del 25 como baseline en caliente.

### D4. Métricas públicas a redes sociales

**Pregunta**: ¿publicamos números del primer día en IG/web al cierre (T+24h)? "En nuestro primer día: X tutores nuevos, Y proveedores, Z reservas". Transparencia + marketing.

**Recomendación del auditor**: sí si los números son alentadores. Si volumen bajo, no publicar — mejor cumulative al cierre de semana (plan comunicación extendida día +7).

**Impacto si no se decide**: default = decisión del PO al ver el reporte T+24h.

### D5. Herramienta #15 Uptime monitoring externo

**Pregunta**: el checklist mencionaba "Uptime Robot si aplica". No veo configurado hoy. ¿Lo agregamos pre-launch (gratis 50 monitors en plan free) o lo dejamos para post?

**Recomendación del auditor**: pre-launch. Es 10 min configurar 3 monitores (`www.pawnecta.com`, `www.pawnecta.com/api/health` si existe, `www.pawnecta.com/explorar`). Avisa por email a los 2 min de downtime — segundo canal independiente de Vercel.

**Impacto si no se decide**: default = Vercel es la fuente de verdad única para uptime.

---

## Firma

Este doc se congela el 24-11 PM. Al cerrar el T+24h, se archiva como `docs/postmortems/2026-11-25-primer-dia.md` con todos los números reales.
