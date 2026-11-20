# Checklist de lanzamiento — miércoles 2026-11-25

**Fecha lanzamiento**: miércoles **2026-11-25** 10:00 CLT (horario tentativo, validar con PO).
**Freeze pre-launch**: martes **2026-11-24 16:00 CLT** (confirmado).
**Autor**: auditor · **Ejecución**: PO con asistencia del auditor por fase.
**Reglas vigentes**: CLAUDE.md § P2 (evidencia por fase pegada en el mismo archivo), P5 (checklist commiteado al repo), P11 (cero merge con rojo sin GO + override documentado).

Doc histórico del lanzamiento original (postergado del 18-11): [lanzamiento-20261118.md](lanzamiento-20261118.md). Plan día a día de la ventana completa: [plan-lanzamiento-nov-2026.md](plan-lanzamiento-nov-2026.md).

---

## Lista maestra pre-freeze (martes 2026-11-24 16:00 CLT)

**Criterio general**: cada ítem con casilla `[ ]` → `[x]` cuando se verifica. Debajo de cada uno, bloque `**Ejecución <timestamp CLT>**:` con SHA/output/link.

### 1. Código mergeado a prod + verificado empíricamente

- [ ] **PR #120 PII-CHAT-NOMBRE** mergeado + deploy prod Ready + smoke tutor /mensajes muestra `"Nombre I."` (no apellido completo). SHA prod: ____.
- [ ] **PR #121 docs-only** mergeado (4 reglas CLAUDE.md + 9 ítems BACKLOG + 3 docs/planes).
- [ ] **PR CHAT-LAZY-CREATE** mergeado + smoke: click "Contactar" sin enviar → conv NO aparece en `/mensajes` tras recarga. SHA prod: ____.
- [ ] **PR BLOG-IMG-REMOVAL + CLAUDE.md regla + entrada paseador** mergeado + smoke blog: 8 entradas, 7 con placeholder gris + ícono, 1 nueva "Cómo elegir paseador" visible en `/blog`.
- [ ] **SQL PII-VIEW-TIGHT prod** ejecutado (sábado 21-11) + verificación empírica: `curl` a `/rest/v1/proveedores_publicos?select=*` desde anon NO contiene `nombre`/`apellido_p`/`apellido_m` en response JSON. Formato `proveedor_nombre` en RPC = `"Nombre I."`.
- [ ] **Backfill `conversations.proveedor_auth_id`** ejecutado (mismo sábado) + 0 NULL restantes.

### 2. Suites de tests (CI prod main verde)

- [ ] `typecheck-and-build` ✓ sobre SHA prod actual.
- [ ] `Playwright suite error-audit` ✓ sobre SHA prod actual.
- [ ] `Playwright suite F2` ✓ sobre SHA prod actual (si quedó flake de cold start, documentar override P11 en comentario del tag de lanzamiento).

### 3. Datos staging limpios

- [ ] Cero servicios efímeros huérfanos de fixtures e2e (query: `SELECT COUNT(*) FROM servicios_publicados WHERE titulo LIKE 'e2e-%' OR titulo LIKE 'Cuidado de mascota (test F2-3)%' OR titulo LIKE 'SMOKE%'`). Si > 0, cleanup antes del freeze.
- [ ] Cero reservas huérfanas de la cuenta tutor E2E Camila (query: `SELECT COUNT(*) FROM agendamientos a JOIN usuarios_buscadores ub ON ub.id = a.tutor_id JOIN auth.users au ON au.id = ub.auth_user_id WHERE au.email = 'acanocts+tutor@gmail.com'`). Umbral histórico: ≤50 (si >, cleanup F2-RESERVAS-CLEANUP).

### 4. Configuración Vercel + Supabase

- [ ] `EMAIL_FROM='Pawnecta <hola@send.pawnecta.com>'` set en Vercel env vars scope Production (validado post-#116 según acta previa).
- [ ] `CRON_SECRET` rotado o validado para prod (verificar `Updated` en Vercel Dashboard — fila env var `CRON_SECRET` debe mostrar timestamp reciente).
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `NEXT_PUBLIC_SUPABASE_URL` correctos en Vercel Production (apunta a `ouezpeeiwjwawauidrqq`).
- [ ] Supabase Pro plan activo (necesario para cron 22:00 UTC diario + retención 30 días).

### 5. Observabilidad activa

- [ ] Sentry configurado en 3 runtimes (client, server, edge) + gate a `VERCEL_ENV === 'production'` + Sentry.setUser(id) activo desde PR #82. **Verificar**: hacer un error sintético desde `/api/admin/sentry-smoke` (endpoint gated a admin) → aparece en Sentry Issues dashboard en <2 min.
- [ ] Vercel runtime logs retenidos (Pro plan ~30 días).
- [ ] GA4 recibe events `ficha_vista`, `reserva_confirmada`, `contacto_iniciado` (validar via GA4 Realtime → Events).

### 6. DNS + SSL + redirects

- [ ] `www.pawnecta.com` responde HTTP 200.
- [ ] `pawnecta.com` (sin www) responde HTTP 200 **o** 301→www (validar cuál después de decidir WWW-CANONICAL — ver plan `docs/planes/www-canonical-domingo.md`).
- [ ] SSL cert válido (verificar `curl -I https://www.pawnecta.com` → `HTTP/2 200` + `strict-transport-security`).
- [ ] Sitemap accesible: `https://www.pawnecta.com/sitemap.xml` → XML válido.

### 7. Smokes manuales golden path (PO ejecuta en prod)

- [ ] **Tutor registro + login + explorar + reservar**: registro de tutora nueva (ej. email `test-launch@...`) → navegar `/explorar` → filter por categoría + comuna → ficha → click Reservar → modal F1 o F2 → confirmar → recibir email de reserva confirmada → login funciona → ve la reserva en `/mis-reservas` tab Pendientes.
- [ ] **Proveedor login + crear servicio + aprobar reserva**: login Admin Pawnecta → `/proveedor` → crear servicio nuevo → aprobar la reserva de la tutora smoke → email de confirmación llega al tutor → el tutor ve estado "Confirmada" en `/mis-reservas` tab Próximas.
- [ ] **Chat funciona**: tutor abre conv con proveedor → envía mensaje → proveedor lo ve en `/mensajes` → responde → tutor recibe notificación + email si está offline.
- [ ] **Cancelación bilateral**: proveedor cancela reserva → tutor ve estado "Cancelada por proveedor" + email → tutor cancela otra reserva → proveedor ve estado + email.
- [ ] **Admin aprueba proveedor**: login Admin Pawnecta → `/admin` → panel Pendientes de verificación → aprobar proveedor smoke → badge "Identidad verificada" aparece en ficha.
- [ ] **Cleanup smoke manual**: borrar reservas + servicios + conv creados en los 5 smokes anteriores. Dejar staging+prod limpios.

### 8. Documentación operativa lista

- [ ] `BACKLOG.md` sección "PEDIDOS DIRECTOS DEL PO" al día con cierres de los ítems lanzados.
- [ ] `CLAUDE.md` con las reglas aterrizadas este mes (ampliación P11, service_role, .serial, meta-regla aterrizaje, regla blog imágenes, etc).
- [ ] Este doc con todos los `[x]` marcados + SHA prod final + evidencia pegada.
- [ ] `docs/sprints/pii-view-tight-sabado.md` cerrado como acta post-sábado.

### 9. Preparación comunicación

- [ ] Post anuncio redes sociales redactado (para disparar post-GO).
- [ ] Email a lista early access (si existe) redactado.
- [ ] PO disponible el 25-11 09:00-13:00 CLT para responder a reportes de incidente inmediatos.

### 10. Rollback preparado

- [ ] SHA del commit "pre-lanzamiento estable" anotado abajo. Si algo sale mal el 25-11, Vercel Instant Rollback a ese SHA.
- [ ] Bloque SQL de rollback PII-VIEW-TIGHT guardado (`docs/planes/pii-view-tight-sabado.md` sección Rollback STEP A/B/C).

---

## Lista maestra día del lanzamiento (miércoles 2026-11-25)

**Hora recomendada**: 09:00-10:00 CLT (mañana, martes-jueves son días de alta atención; viernes/lunes peor por weekend lag).

### T-30 min (08:30 CLT)

- [ ] PO en el chat disponible.
- [ ] Auditor armado para asistir.
- [ ] Ventana en Vercel abierta en `https://vercel.com/petmatecls/pawnecta-landing-mvp/deployments`.
- [ ] Ventana en Sentry abierta en `https://sentry.io/organizations/<org>/projects/javascript-nextjs/`.
- [ ] Ventana en Supabase Studio prod abierta.
- [ ] Ventana en Supabase Dashboard → Reports → Database Health abierta.

### T=0 (09:00 CLT) — ejecución

El lanzamiento del 25-11 NO es un deploy nuevo, sino la publicación activa del sitio ya en prod (anuncio + apertura promocional). Salvo decisión contraria, no se mergea código nuevo el día del lanzamiento.

- [ ] Verificar SHA prod actual = SHA pre-freeze anotado en la lista pre-freeze sección 10.
- [ ] Verificar que `www.pawnecta.com` carga en <3s (`curl -o /dev/null -s -w "%{time_total}\n" https://www.pawnecta.com/`).
- [ ] Smoke rápido: login con cuenta admin + revisar panel admin + logout. Si falla → NO-GO.
- [ ] Publicar post en redes sociales (si corresponde).
- [ ] Enviar email a lista early access (si corresponde).
- [ ] Anunciar GO en el chat del equipo.

### T+5 min → T+30 min — monitoreo activo

- [ ] Sentry Issues: watch por cualquier `JAVASCRIPT-NEXTJS-*` nuevo con `userCount > 1`. Si aparece → investigar en el acto.
- [ ] Vercel Analytics: ver pico de tráfico esperado (si hay).
- [ ] Supabase Database Health: CPU < 60%, conexiones < 80% del cap.
- [ ] GA4 Realtime: ver usuarios activos + eventos `ficha_vista` entrando.
- [ ] Vercel runtime logs: `vercel logs <deployment-url> --follow` por si aparece 500 en algún endpoint.

### T+30 min → T+2 h — monitoreo pasivo

- [ ] Cada 15 min: check Sentry + Vercel logs por anomalías.
- [ ] A T+1 h: query Supabase: `SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '1 hour'` → cuántos registros nuevos.
- [ ] A T+2 h: query `SELECT COUNT(*) FROM agendamientos WHERE created_at > NOW() - INTERVAL '2 hours'` → cuántas reservas.

### T+2 h → T+24 h — monitoreo a demanda

- [ ] Responder a reportes de incidente que lleguen por chat/email.
- [ ] Cron `/api/cron/recordatorio-reserva` corre a 22:00 UTC (19:00 CLT) — verificar que ejecutó OK en Vercel logs.
- [ ] A las 24h: reporte de totales (registros, reservas, contactos iniciados, errores Sentry acumulados).

---

## GO / NO-GO — criterios

**GO si**:
- Todos los `[x]` de las secciones 1-10 pre-freeze están ejecutados + evidenciados.
- Suite CI verde sobre SHA prod actual.
- Cero `JAVASCRIPT-NEXTJS-*` critical open en Sentry (puede haber warnings/info OK).
- Smoke tutor + smoke proveedor + smoke admin golden path funcionan en prod sin regresiones.
- PO disponible.

**NO-GO (postergar al jueves 26-11 o viernes 27-11)** si:
- Algún check de secciones 1-6 pre-freeze falla y no se puede fix en ventana limitada.
- Sentry muestra incidente activo con `userCount > 3` sobre el SHA prod actual.
- SQL PII-VIEW-TIGHT no cerró el sábado + hay PII leak vigente a 3 días del deadline legal 30-11.
- Supabase Database Health reporta anomalías no diagnosticadas.

**Procedimiento si NO-GO**:
1. PO anuncia postergación interna al chat.
2. Auditor documenta el motivo en este doc sección "Postergación" (nueva).
3. Ejecutar fixes en orden de criticidad.
4. Re-correr lista maestra pre-freeze cuando los bloqueantes estén resueltos.
5. Nueva fecha propuesta: jueves 26-11 09:00 CLT.

---

## Plan de reversión (si incidente post-GO)

**Nivel 1 — rollback de código sin SQL** (Vercel Instant Rollback):

1. PO abre Vercel Dashboard → `pawnecta-landing-mvp` → Deployments.
2. Localizar el deployment "pre-lanzamiento estable" (SHA anotado en sección 10 pre-freeze).
3. Click "..." → "Promote to Production" sobre ese deployment.
4. Vercel sirve ese SHA en <30s.
5. Anunciar en chat: "Rollback ejecutado, servicio restaurado al SHA `<X>`".

**Nivel 2 — rollback de código CON SQL (PII-VIEW-TIGHT)**:

1. **Primero**: ejecutar SQL rollback de `proveedores_publicos` (sección "Rollback escrito" en `docs/planes/pii-view-tight-sabado.md`, STEP A).
2. **Después**: Vercel Instant Rollback (Nivel 1) al SHA pre-PII-VIEW-TIGHT.
3. **Al revés = 400s en home/chat/perfil** (los callers pre-PII-VIEW-TIGHT leen `nombre`/`apellido_p` de la vista, que post-DROP no existen).
4. Anunciar en chat: "Rollback ejecutado en SQL + código. SHA prod activo: `<X>`".

**Nivel 3 — rollback de base de datos**:

- Para incidentes catastróficos (ej. DELETE masivo accidental, corruption). Supabase Pro plan permite restaurar a backup horario de hasta 7 días atrás.
- PO contacta soporte Supabase + solicita Point-in-Time Recovery (PITR).
- Downtime de ~30-60 min esperado.
- Comunicación pública de incidente obligatoria.

**Comunicación pos-rollback**:
1. Post en redes sociales con disculpa + ETA de recuperación.
2. Email a users afectados si los datos lo justifican.
3. Post-mortem interno dentro de 48 h → documento en `docs/postmortems/YYYY-MM-DD-incidente.md`.

---

## Monitoreo primeras 24 horas

### Herramientas + umbrales de alerta

| Herramienta | URL / comando | Qué mirar | Umbral alerta |
|---|---|---|---|
| **Sentry Issues** | `https://sentry.io/organizations/<org>/projects/javascript-nextjs/` | Issues nuevos con `userCount > 1` | **>3 issues con userCount>1 en 1 h** → investigar |
| **Vercel runtime logs** | `vercel logs <deployment-url> --follow` | 5xx en endpoints `/api/*`, errores server | **>5 500s en 10 min en mismo endpoint** → fix + redeploy |
| **Vercel Analytics** | Dashboard | Tráfico + Web Vitals | LCP p75 >3s → investigar; TTFB >1.5s → caché/CDN |
| **Supabase Database Health** | Dashboard → Reports | CPU, conexiones, query latency | **CPU >80% sostenido** → identificar query pesada; **conexiones >90% cap** → investigar leak |
| **GA4 Realtime** | `analytics.google.com` → Realtime | Eventos `ficha_vista`, `reserva_confirmada`, `contacto_iniciado` | Cero actividad en 10 min cuando debería haber → algo roto |
| **Cron Vercel 22:00 UTC** | Vercel Dashboard → Deployments → Cron Jobs → `/api/cron/recordatorio-reserva` | Last Run status = Success | Fail → reportar incidente cron |
| **Resend emails** | `resend.com` Dashboard → Emails | Delivery rate, bounces | **Bounce rate >5%** → revisar dominio/SPF/DKIM |
| **PostgreSQL autovacuum** | Supabase SQL: `SELECT relname, last_autovacuum FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY last_autovacuum NULLS FIRST LIMIT 10` | Última vez que autovacuum pasó por cada tabla | Si alguna tabla >7 días sin autovacuum → VACUUM manual |

### Checks programados post-lanzamiento

- **T+1 h**: smoke golden path tutor + proveedor (mismo que pre-freeze sección 7). Verifica cero regresión bajo tráfico real.
- **T+6 h**: query Supabase `SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '6 hours'` + `SELECT COUNT(*) FROM agendamientos WHERE created_at > NOW() - INTERVAL '6 hours'`. Comparar con expectativa.
- **T+12 h**: query Sentry `events` API para contar errores por tipo + reportar al PO.
- **T+24 h**: acta de monitoreo primera jornada → `docs/sprints/lanzamiento-20261125-post-24h.md`.

### Equipos a tener en mente

- **PO**: contacto primario.
- **Auditor**: asiste en interpretación + rollback técnico si corresponde.
- **Supabase soporte** (Pro plan): ticket si hay incidente de DB.
- **Vercel soporte**: ticket si hay incidente de infra.

---

## Postergación / incidentes (completar durante la ejecución)

### Postergación (si NO-GO)

_Completar con fecha + motivo + nueva fecha + evidencia al día del incidente._

### Incidentes post-lanzamiento

_Completar con timestamp + descripción + rollback ejecutado (Nivel 1/2/3) + resolución._

---

## SHAs clave

_Completar durante las fases:_

- **SHA pre-lanzamiento estable (pre-freeze 24-11 16:00 CLT)**: ____
- **SHA del día del lanzamiento 25-11**: ____ (= pre-lanzamiento salvo cambio)
- **SHA de rollback de emergencia si aplica**: ____

---

## Firma

Este doc se cierra al completar todos los `[x]` + el reporte de monitoreo T+24h.
Firmas al pie del acta: PO + auditor.
