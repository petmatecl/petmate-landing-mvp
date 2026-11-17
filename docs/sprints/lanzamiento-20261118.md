# Checklist de lanzamiento — miércoles 2026-11-18 (POSTERGADO)

> **ACTUALIZACIÓN PO 2026-11-17 post-deploy #116 (SHA 152f3c4)**: lanzamiento **postergado** por decisión del PO.
> - **Nueva fecha propuesta**: miércoles **2026-11-25** (a confirmar por PO).
> - **Freeze pre-launch propuesto**: martes **2026-11-24 16:00 CLT** (a confirmar por PO).
> - **Motivación de la postergación**: ganar ventana para aterrizar `PII-SSR-STRIP + PII-VIEW-TIGHT` (deadline legal 30-11-2026 Ley 21.719) + `NAV-MENSAJES` + `SOLICITUDES-BADGE` + enmiendas de email (`RESEND-FROM-DISPLAYNAME` ya efectivo en prod post #116 vía env var `EMAIL_FROM`, `RESERVA-MAIL-NOMBRE` saludo nombre completo→pila) + ampliar smokes prod sobre superficies no cubiertas el 17-11.
> - **Fechas originales (referencia histórica)**: lanzamiento 2026-11-18, respaldo 2026-11-25, freeze 2026-11-17 16:00 CLT. Freeze del 17-11 se respetó (merges `fc0616c` #114 + `2d2a658` #115 + `152f3c4` #116 aterrizaron antes del límite propuesto). El código de prod a 2026-11-17 18:36 UTC (SHA `152f3c4`) es **lanzable**; la postergación es para ampliar alcance, no para fix de bloqueantes.
> - **Estado post-#116**: logout cruzado entre perfiles validado por PO en prod (cerrar sesión en perfil A + botón "Cerrar sesión" en perfil B → expulsa al login); `EMAIL_FROM='Pawnecta <hola@pawnecta.com>'` validado empíricamente (correo "Tu reserva está confirmada" llegó con remitente "Pawnecta").

**Lanzamiento (original)**: miércoles 2026-11-18. **[POSTERGADO a 2026-11-25]**
**Respaldo (original)**: miércoles 2026-11-25.
**Freeze pre-launch (original)**: martes 2026-11-17 16:00 CLT. **[Respetado; nuevo freeze 2026-11-24 16:00 CLT a confirmar]**
**Ejecución**: PO con asistencia del auditor por fase (evidencia P5 pegada acá en el mismo commit que cierra cada fase).

**Regla**: cada ítem se marca `[x]` + bloque `**Ejecución <timestamp CLT>**:` con outputs/SHAs pegados. Sin evidencia la fase no está cerrada (CLAUDE.md P2).

---

## Estado consolidado · martes 2026-11-17 15:45 CLT (post-merge #116)

**Mergeado a main hoy**:

| SHA | PR | Alcance | Validación prod |
|---|---|---|---|
| `fc0616c` | #114 `hf-fill-timeout` | fill 15s en `authenticate.ts` + grep `"Pawnecta"` warning-only en warmups CI. Workflow + BACKLOG. | N/A (CI only) |
| `2d2a658` | #115 `pii-nombre-publico` | Fase 1 PII: helper `displayName()` + refactor 17 call sites + enrich RPC + spec P8 dinámico + BACKLOG `PII-SSR-STRIP + PII-VIEW-TIGHT` + `WWW-CANONICAL`. | **Chequeo P8 prod ✓** (`Morel`/`Velasquez` cero en HTML renderizado) |
| `152f3c4` | #116 `hf-logout-403` | helper `signOutRobusto()` + 3 call sites (UserContext/ClientLayout global, SessionTimeout local) + 5 tests unit + smoke preview 2 perfiles ✓. | **Smoke prod ✓** PO 2026-11-17 ~15:40 CLT: logout cruzado entre perfiles (A cerró sesión → B "Cerrar sesión" → expulsa al login en `/mis-reservas`). Remitente `EMAIL_FROM='Pawnecta <hola@pawnecta.com>'` validado en correo "Tu reserva está confirmada". |

**Decisión PO post-deploy #116 (15:45 CLT)**: lanzamiento 2026-11-18 postergado a 2026-11-25 (freeze 2026-11-24 16:00 CLT, a confirmar) — detalle en bloque ACTUALIZACIÓN al tope.

**Post-lanzamiento pre-01-12-2026 (deadline 30-11)**:
- `PII-SSR-STRIP` (strip `nombre`/`apellido_p`/`apellido_m`/`auth_user_id` de props server-side) + `PII-VIEW-TIGHT` (RPC + vista con DDL).

**Post-lanzamiento semana 1**:
- `WWW-CANONICAL` (redirect 301 para prevenir multiplicador de sesiones paralelas).

**Sin aterrizar hoy (diferidos a post-launch, decisión PO 2026-11-17)**:
- Landings categoría 404 (`/paseos`, `/veterinario`, `/guarderia`, `/etologia`, `/fotografia`).
- NEXTJS-H diagnóstico (TypeError 1 event aislado).
- Batch SEO (`/blog` canonical/og, `/login`/`/register` noindex, canonical www inconsistente).
- CLS ficha-desktop 0.112 / ficha-mobile diagnóstico profundo.
- Revisión verificación identidad (5 puntos PO).
- Lighthouse completo auditoría (ver `docs/auditorias/prelaunch-20261117/reporte.md`).

---

## Fase 0 · Pre-freeze (martes 17 hasta 16:00 CLT)

### 0.1 Smokes golden path en prod
- [ ] Smoke **PROVEEDOR** (§1 de `docs/sprints/smokes-prod-pre-launch-2026-11-17.md`) sin bloqueantes.
- [ ] Smoke **TUTOR** (§2) sin bloqueantes, reserva contra el servicio smoke.
- [ ] Smoke **ADMIN** (§3) panel + pestañas + suspensión reversible.
- [ ] Cleanup `activo=false` ejecutado post-smoke (§6.1 de la guía).

**Evidencia esperada**: nota corta por bloque con bloqueantes detectados (o "ninguno") + timestamps CLT por paso.

### 0.2 Lighthouse revalidación
- [ ] Mediana 1 run × 6 escenarios (home + explorar + ficha-servicio × mobile + desktop) contra prod.
- [ ] Comparación vs baseline [`docs/auditorias/lighthouse-20261112/reporte-post-perf-ficha.md`](../auditorias/lighthouse-20261112/reporte-post-perf-ficha.md).
- [ ] Sin regresión > 5 puntos de Perf score ni > 500 ms de LCP.
- [ ] CLS de ficha-desktop confirmado < 0.1 post `cls-footer`.

**Evidencia esperada**: tabla con Perf / LCP / CLS / TBT por escenario + línea de comparación vs baseline.

### 0.3 DMARC diagnóstico read-only
- [ ] `_dmarc.pawnecta.com` y `_dmarc.send.pawnecta.com` verificados vía `dig +short TXT`.
- [ ] Reportes DMARC acumulados en `dmarc-reports@pawnecta.com` (Zoho) revisados: count de rejects + razones.
- [ ] Decisión PO sobre `p=reject`: SÍ pre-launch / NO post-launch. **Sin cambio de DNS hoy** (regla PO 2026-11-17).

**Evidencia esperada**: outputs `dig` + resumen Zoho + decisión registrada acá.

### 0.4 Supabase Pro + Leaked Password Protection
- [ ] PO activó Pro en `Vercel Supabase prod` → Dashboard → Settings → Billing.
- [ ] Primer backup diario visible en Settings → Backups < 24h.
- [ ] Toggle "Leaked Password Protection" activo (Authentication → Policies).
- [ ] Advisor `auth_leaked_password_protection` NO aparece en Security advisors.

**Evidencia esperada**: screenshot del Backups + resultado `get_advisors(type=security)` vía MCP prod-ro.

### 0.5 Operativo PO (tareas paralelas)
- [ ] CARTO API key aplicada en Vercel (Production + Preview + Development) + redeploy + smoke sin marca de agua en mapa.
- [ ] Teléfono de Eduardo aplicado en su perfil prod.
- [ ] Nicole: decisión consolidar / preservar / bloquear.
- [ ] 5 proveedoras reactivadas, visibles en `/explorar` con los filtros correspondientes.

### 0.6 Cleanup smoke profundo
- [ ] Fase 1 snapshot pre-DELETE (auditor corre, resultado pegado acá).
- [ ] Fase 2 transacción DELETE ejecutada por PO en Supabase Studio prod (con `RETURNING` revisado antes del COMMIT).
- [ ] Fase 3 verificación posterior (auditor corre con prod-ro, retorna 0 en todas las filas).
- [ ] Opcional: cleanup storage de la foto del servicio smoke (§6.3).

### 0.7 Freeze 16:00 CLT
- [ ] Último commit de `main` registrado + tag anotado `freeze-2026-11-17`.
- [ ] Cola de PRs abiertos: ninguno con merge previsto post-freeze (confirmar).
- [ ] CI en verde sobre main.

**Verificación**:
```bash
git fetch origin && git log --oneline origin/main | head -5
gh run list --branch main --limit 3 --json databaseId,status,conclusion
git tag -a freeze-2026-11-17 -m "Freeze pre-launch miércoles 2026-11-18" <SHA> && git push origin freeze-2026-11-17
```

---

## Fase 1 · T-0 día lanzamiento (miércoles 18 AM)

### 1.1 Deploy prod healthy
- [ ] `git log --oneline origin/main | head -3` muestra el commit del freeze como HEAD de main.
- [ ] Vercel deploy de ese SHA en estado **Ready** (no Building, no Error).
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://www.pawnecta.com/` = 200.
- [ ] `curl -s https://www.pawnecta.com/ | grep -c "Pawnecta"` ≥ 3.
- [ ] Response time < 2s desde Chile (TTFB).

### 1.2 Supabase migrations prod ≡ staging
- [ ] `mcp__supabase-prod-ro.list_migrations()` cuenta y lista consistente con `mcp__supabase-staging-rw.list_migrations()`.
- [ ] No hay migrations en prod que no estén en staging (y viceversa salvo las flagged).

### 1.3 Sentry baseline
- [ ] Sentry dashboard — últimas 24h: cero issues de severidad BLOQUEANTE (ver clasificación `BACKLOG > CUE-1-ANON`).
- [ ] `JAVASCRIPT-NEXTJS-7` (user_context_stuck) count 24h ≤ 2 (baseline post-watchdog fix).
- [ ] `JAVASCRIPT-NEXTJS-5` (hydrate exhausted) count 24h = 0.
- [ ] Error: Rejected filter sigue silenciado (`lib/sentryScrub.ts:isSwRegisterRejection`).

### 1.4 CSP whitelist
- [ ] DevTools → Console en `/` y `/explorar`: cero violation "Refused to load … Content Security Policy".
- [ ] Mapas Leaflet cargan (CARTO + OpenStreetMap).

### 1.5 Service Worker PWA
- [ ] En DevTools → Application → Service Workers sobre prod: SW activo, source `sw.js` del deploy actual.
- [ ] Hard refresh carga HTML del commit nuevo (no cache de deploy anterior).

### 1.6 Crons activos (Vercel Pro ya habilita per-minute)
Listar en Vercel Dashboard → Cron Jobs y confirmar `Next Run` futuro para cada uno:
- [ ] `/api/cron/recordatorio-reserva` (22:00 UTC diario, 24h antes).
- [ ] `/api/cron/recordatorio-onboarding`.
- [ ] `/api/cron/recordatorio-mensajes`.
- [ ] `/api/cron/invitacion-resenas`.
- [ ] `/api/cron/reset-visitas-mes`.
- [ ] `/api/cron/cleanup-visitas-tracking`.
- [ ] `/api/cron/limpiar-carnets-viejos` — **post-launch** (CARNET-RETENCION aterriza semana 19-30 nov), **no debe estar activo aún**.

### 1.7 Emails Resend OK
- [ ] Dashboard Resend → últimas 24h: delivery rate > 95%, bounces < 1%.
- [ ] DKIM + SPF + DMARC verificados en Resend → Domains (`send.pawnecta.com`).
- [ ] Último email transaccional enviado (del cleanup smoke) marcado Delivered.

### 1.8 Supabase Pro activo + backup
- [ ] Settings → Billing muestra plan Pro.
- [ ] Settings → Backups: último backup diario < 24h.
- [ ] Advisors Security: sin `auth_leaked_password_protection`.

### 1.9 CARTO sin marca
- [ ] Carga ficha de servicio con mapa: la marca de agua "Get a free API key" no aparece.

### 1.10 Catálogo visible
- [ ] 5 proveedoras reactivadas visibles en `/explorar` con sus filtros respectivos.
- [ ] Cero proveedores smoke en catálogo (post-cleanup §0.6).

---

## Fase 2 · Comunicación del PO

- [ ] Canales de anuncio (a decidir por PO): WhatsApp, Instagram, email a early adopters, etc.
- [ ] Mensaje aprobado + copy sin voseo.
- [ ] Link directo a `https://www.pawnecta.com/` (no al `/explorar` directo — queremos tracking del landing).

---

## Fase 3 · Monitoreo activo primeras 4h post-lanzamiento

### 3.1 Sentry
- [ ] Refrescar dashboard cada 15 min las primeras 2h.
- [ ] Si aparece issue con `user.id` nuevo no PO ni cuenta E2E, cross-ref con el flow + decidir hotfix o observar.
- [ ] Trigger de reopen de CUE-1: cualquier event `hydrate_exhausted` o `user_context_stuck` con user.id nuevo → alerta al auditor.

### 3.2 Vercel runtime logs
- [ ] `vercel logs <prod-url> --since 1h --level error` sin errores 5xx críticos.
- [ ] Paths críticos a monitorear: `/api/auth/signup`, `/api/agendamientos/*`, `/api/notifications/*`.

### 3.3 Supabase prod dashboard
- [ ] Database → Query Performance: sin queries > 1s sostenidas.
- [ ] Logs → Postgres: sin pattern `permission denied` > 100/h (baseline ANON-RLS-PROVEEDORES pendiente post-launch).
- [ ] Auth logs: signup rate razonable, sin brute force.

### 3.4 Emails Resend
- [ ] Delivery rate 24h > 95%.
- [ ] Cola de bounces revisada (spam filter de nuevos destinatarios reales).

### 3.5 Métricas de negocio (decidir con PO si entra GA4)
- [ ] GA4 Realtime: usuarios activos, eventos `registro_proveedor_iniciado`, `contacto_iniciado`.

---

## Fase 4 · Rollback plan si algo revienta críticamente

**Criterios de rollback (cualquiera basta)**:
- Downtime > 15 min sostenido (prod responde 5xx consistente en cualquier ruta pública).
- Bug que corrompe data (RLS roto que expone otros usuarios, INSERT corrupto, DELETE equivocado).
- Exposición PII nueva (nombre legal, email, teléfono sin `mostrar_*=true`).
- Signup / login roto para 100% de usuarios nuevos.
- Catálogo público `/explorar` vacío sin causa data (todos los servicios no aparecen).

### Mecanismo rápido (Vercel Instant Rollback) — 60 segundos

**PREFERIDO para cualquier rollback de código puro (sin DDL)**:

1. Abrir `https://vercel.com/petmatecls-projects/pawnecta-landing-mvp/deployments`.
2. Identificar el deployment previo marcado `Ready` + `Production` (antes del launch SHA).
3. Click ⋯ → **Instant Rollback** → confirmar.
4. Vercel sirve el deploy anterior en ~30 seg, sin build nuevo.

### Mecanismo git (alternativa si Vercel está caído o para registro limpio)

1. `git fetch origin && git log --oneline origin/main | head -10` para identificar SHA verde previo.
2. **Revert simple** (preferido si solo 1 PR problemático):
   ```bash
   git checkout main
   git pull
   git revert <SHA-problemático> --no-edit
   git push origin main   # dispara deploy auto
   ```
3. **Revert multi-commit** (si el issue arrastra varios merges):
   ```bash
   git revert <SHA-A> <SHA-B> ...  # en orden inverso cronológico
   git push origin main
   ```
4. **Force-rollback** (último recurso, solo si revert no aplica limpio):
   - Coordinar con PO explícito ANTES.
   - `git checkout <SHA-verde>` + crear rama `rollback-launch-18`.
   - Open PR fast-track + merge directo + delete-branch post-merge.
   - NUNCA `git push --force main` sin GO explícito; branch protection lo rechaza.

### Rollback de SQL (preparación — NO se ejecuta launch sin alerta)

**Cero DDL agendada para launch del 18** (regla vigente). Si durante el monitoreo post-deploy se detecta migration aplicada por error:

- **RLS / policies mal aplicadas**: `DROP POLICY IF EXISTS <name> ON <tabla>` + restore con snapshot Supabase Settings → Backups (habilitado por Pro, hoy activado por PO).
- **DDL de columna**: `ALTER TABLE ... DROP COLUMN` o recovery del backup diario (< 24h antigüedad en Pro).
- **RPC dañado**: `CREATE OR REPLACE FUNCTION` con la definición previa (grep `supabase-prod-ro` + `pg_get_functiondef` antes del change para tener la copia).

### Rollback de features gated por env var

Ninguna feature new del launch está feature-flaggeada. Si en el futuro se incorpora:
- Toggle en `Vercel Dashboard → Settings → Environment Variables` → Redeploy desde Deployments list (NO cambiar código).

### Comunicación durante el rollback

- Canal interno: mensaje corto "Detectamos un problema post-launch, estamos resolviendo. Volvemos en ~15 min."
- Twitter/IG (si ya se anunció): dejar ambiente con mensaje similar. NO borrar el anuncio original — perjudica más que ayuda.
- Soporte: redirigir consultas a `contacto@pawnecta.com` como siempre (Zoho sigue respondiendo).

### Después del rollback

- Tag anotado `rollback-20261118-HHMM` sobre el SHA al que se volvió (`git tag -a rollback-20261118-1530 -m "Rollback por <causa>" <SHA>` + `git push origin rollback-20261118-1530`).
- Postmortem en 24h en `docs/sprints/postmortem-launch-20261118.md` con: (a) criterio que gatilló, (b) timeline desde deploy hasta rollback, (c) qué fix prepara el relaunch, (d) smoke adicional para detectar la clase de bug.
- Decisión **GO / NO-GO** para relaunch miércoles 2026-11-25 (respaldo). Si la causa raíz es estructural (ej. Supabase Auth bug no mitigable), evaluar posponer más semanas.

### Qué NO hacer durante el rollback

- No hacer force-push a `main` sin OK explícito del PO en el turno activo.
- No ejecutar `git reset --hard` sobre `main` (branch protection debería bloquearlo, pero la regla operativa manda sobre el candado).
- No borrar PRs mergeados ni tags post-deploy (perder trazabilidad hace imposible el postmortem).
- No diagnosticar "en caliente" sin rollback; **primero volver al estado verde, después diagnosticar tranquilo**.

---

## Fase 5 · Post-launch inmediato (jueves 19-noviembre)

- [ ] Tag anotado `launch-20261118` sobre el SHA del deploy.
- [ ] BACKLOG actualizado: ítems pre-launch marcados `[CERRADO <fecha> <sha>]`.
- [ ] Acta `docs/sprints/cierre-lanzamiento-20261118.md` con:
  - Métricas 4h / 24h / 48h.
  - Issues Sentry nuevos clasificados.
  - Lecciones del día de launch.
- [ ] Kickoff post-launch: DEL-CUENTA-LEY código + CARNET-RETENCION + SENTRY-TOAST + HOME-REDISENO (primer trabajo de diseño).

---

## Anexo — Reglas vigentes durante el lanzamiento

- **Un PR en CI a la vez**. Cero excepción.
- **Nunca mergear con rojo** (P11).
- **Enmienda P11 rerun autónomo**: máx 1 por PR, solo infra inequívoca (ECONNRESET, timeouts, 5xx Vercel/Supabase, SSL/DNS).
- **Cero smoke manual durante CI** + **cero signOut manual QA mientras corre CI**.
- **Smoke manual pre-merge**: GO explícito PO para código productivo.
- **Tuteo estricto** en output al PO (sin voseo en ningún mensaje visible).
- **Cero DDL en el día del lanzamiento**. SQL irreversible queda post-launch.
- **No push directo a main**. Todo entra por PR + checks verdes (incluso docs). Excepción única: hotfix por Sentry alerta real con OK explícito PO en el turno vigente.
