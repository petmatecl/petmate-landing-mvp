# Deuda técnica aceptada — lanzamiento 2026-11-25

**Audiencia**: PO · **Autor**: auditor (2026-11-19 noche).
**Objetivo**: inventario explícito de cosas que lanzamos sabiendo que no están 100%. Honestidad pre-launch es mejor que sorpresa post-launch.

Cada ítem lista: qué es, impacto esperado al user (si aplica), por qué se acepta pre-25, cuándo se arregla post-launch. Severidad `BLOQUEA` quedó fuera (esos no son "aceptables", esos requieren fix pre-freeze) — solo entran `CONVIENE`, `MENOR` y `OK pero mejorable`.

---

## Arquitectura + infra

### A1. Rate limit de endpoints es in-memory (no Upstash Redis)

**Qué**: `lib/rateLimit.ts > authLimiter` + `emailLimiter` guardan el contador en un Map in-memory. En Vercel serverless cada invocación arranca con memoria fresca → el contador NO persiste → el límite es efectivo en dev (single process) pero prácticamente no-op en prod.

**Impacto esperado**: cero en condiciones normales (users legítimos no disparan 100 signups/segundo). Vulnerable a ataque de scripting dedicado contra signup o emails (podría spammear). Supabase Auth tiene su propio rate-limit a nivel plataforma como defensa secundaria.

**Por qué se acepta**: migrar a Upstash Redis es sprint propio (store distribuido, retry policy, tests). Pre-launch no hay evidencia de abuso real. Costo si se materializa: delay en response + eventual dolor de cabeza con Supabase bill.

**Cuándo se arregla**: sprint L1-A4 **ya aterrizado** — rate limiter de login usa Upstash Redis. Resto (signup, emails) es deuda separada → post-launch. BACKLOG item documentado.

---

### A2. Admin verificación de carnet — imagen rota en prod

**Qué**: `components/Admin/ProveedorApprovalList.tsx:376,384` renderea `<img src={prov.foto_carnet}>` con URL pública que el bucket `documents` (privado) no sirve. El admin ve imagen rota en el panel de verificación.

**Impacto esperado**: admin no puede ver el carnet frontal + dorso al verificar identidad → no puede aprobar nuevas verificaciones de proveedores. **Impacto a users: cero** (no afecta flow público). **Impacto operativo: alto** si queremos activar verificaciones masivas post-lanzamiento.

**Por qué se acepta**: el flow de verificación es opcional (post badge-f1 todos arrancan sin badge; es un incentivo, no un gate). En el 1er día de launch pocos proveedores pedirán verificación. Fix requiere cambiar upload a guardar `path` + admin usa `createSignedUrl(path, 60)`.

**Cuándo se arregla**: semana post-launch. Esfuerzo: ~1h.

---

### A3. SIGNOUT-SCOPE: `supabase.auth.signOut()` revoca TODOS los refresh tokens

**Qué**: 3 call sites de `signOut()` en la app ([UserContext.tsx:942](../../contexts/UserContext.tsx#L942), [SessionTimeout.tsx:94](../../components/SessionTimeout.tsx#L94), [Client/ClientLayout.tsx:135](../../components/Client/ClientLayout.tsx#L135)) no pasan `{ scope }` → default `global` del SDK v2 → revoca todos los refresh tokens del user cuenta y la sesión server-side. Un user con tabs abiertas en varios dispositivos pierde sesión en todos al cerrar en uno.

**Impacto esperado**: fricción menor. User cierra sesión en el móvil → al día siguiente abre el desktop y tiene que loguearse de nuevo. Recuerda que fue él quien cerró, pero puede confundirlo.

**Por qué se acepta**: comportamiento default del SDK Supabase, no es un bug per se. Fix cambia scope a `'local'` o agrega botón explícito "Cerrar sesión en todos los dispositivos". No bloquea.

**Cuándo se arregla**: BACKLOG item `SIGNOUT-SCOPE` documentado. Semana post-launch. ~45 min.

---

### A4. Autovacuum + housekeeping Postgres

**Qué**: BD vigente usa autovacuum default de Supabase. Tablas de alto volumen (`agendamientos`, `evaluaciones`, `conversations`, `messages`) acumulan dead tuples + eventualmente degradan query performance.

**Impacto esperado**: en volumen inicial (decenas-centenas de operaciones/día), cero. A escala moderada (miles de operaciones/día), query latency puede subir al mes.

**Por qué se acepta**: Supabase Pro hace autovacuum razonablemente. Afinar parámetros requiere métricas de uso real (que arranca el 25-11).

**Cuándo se arregla**: sprint de observabilidad post-mes 1 (si métricas lo justifican). Queries de monitoreo ya en el checklist T+24h.

---

## Correos y notificaciones

### E1. notify-* catches silentes (sin Sentry capture)

**Qué**: los endpoints `/api/agendamientos/notify-*.ts` y los crons tienen catches que loguean a console + devuelven 200. Si el email falla silente (Resend down, email rebota, admin API Supabase caída), no se entera nadie hasta que el user reporta o mira el dashboard Resend manualmente.

**Impacto esperado**: en condiciones normales, bajo. Los emails son notificación no-transaccional (el panel del proveedor y el tutor igual muestran el estado). Si Resend tiene incidente, perdemos horas de telemetría de fallo.

**Por qué se acepta**: Sentry ErrorBoundary + wrapApiHandlerWithSentry ya captura las excepciones no atrapadas en los endpoints. Lo que se pierde es la visibilidad de los "skipped" intencionales.

**Cuándo se arregla**: pasada de `Sentry.captureException` en catches productivos — sprint propio post-launch. ~1h. Ver [docs/auditorias/error-handling-20261119.md § #10](../auditorias/error-handling-20261119.md).

---

### E2. 3 templates React Email no usados (deuda cosmética)

**Qué**: `components/Emails/AprobacionProveedorEmail.tsx`, `RechazoProveedorEmail.tsx`, `NewMessageEmail.tsx` existen pero sus call sites usan HTML inline reemplazándolos.

**Impacto esperado**: cero funcional. Consistencia visual: los 3 correos "inline" tienen diseño ligeramente distinto a los demás.

**Por qué se acepta**: no afecta delivery ni comportamiento. Es solo cleanup.

**Cuándo se arregla**: sprint propio post-launch. ~2h. Migrar los 3 call sites a usar los templates existentes + verificar render-diff.

---

### E3. Email bounces no ingested (webhook Resend inactive)

**Qué**: Resend emite webhooks para `email.bounced`, `email.complained`, `email.delivered_delayed`. No hay endpoint `/api/resend/webhook` configurado → no mapeamos bounces a users → no deshabilitamos email tras N bounces.

**Impacto esperado**: dashboard Resend muestra tasas de bounce agregadas, que a largo plazo pueden afectar reputación SPF/DKIM del dominio. Para un usuario con email mal escrito, el sistema seguirá intentando enviarle emails → bounce repetido.

**Por qué se acepta**: volumen esperado en primeras semanas es bajo. Resend recomienda configurar webhook a partir de ciertos umbrales (verificable en dashboard).

**Cuándo se arregla**: sprint propio post-launch, ~2-3h. Incluye migration `usuarios_buscadores.email_bounced boolean` + endpoint + lógica de disable.

---

### E4. Subject del correo de nueva reserva no incluye título del servicio

**Qué**: proveedor con 10 servicios recibe emails "Nueva reserva de Camila M." sin saber de qué servicio. Debe abrir el email para ver.

**Impacto esperado**: fricción leve para proveedores multi-servicio.

**Por qué se acepta**: la mayoría de proveedores arrancan con 1-3 servicios. Problema emerge a escala.

**Cuándo se arregla**: cambio de 1 línea en `/api/agendamientos/notify-proveedor.ts:152` + variante de subject. ~15 min. Post-launch.

---

### E5. Snapshot del título de servicio en `agendamientos`

**Qué**: si proveedor borra servicio (improbable con FK RESTRICT) o el servicio cambia de título entre reserva y cron, el email usa el título vigente al momento del fetch — puede diferir de lo que el tutor vio al reservar.

**Impacto esperado**: muy bajo. Proveedores no renombran servicios con frecuencia.

**Por qué se acepta**: edge case extremo + requiere migración + backfill.

**Cuándo se arregla**: sprint post-launch, agrupado con snapshot de otros campos. ~1h.

---

## Frontend + UX

### F1. Mensajes de error genéricos en login/forgot/register

**Qué**: `pages/login.tsx:118` "No se pudo iniciar sesión. Inténtalo de nuevo." — colapsa credencial incorrecta, cuenta no confirmada, Supabase caído. Similar en forgot-password, reset-password, completar-registro.

**Impacto esperado**: user con credenciales incorrectas puede pensar que el sitio está roto y abandonar. En primeros días de lanzamiento, 5-10% de intentos de login típicamente dan error.

**Por qué se acepta**: fix requiere branching por tipo de error de Supabase Auth + i18n. ~25 min por superficie × 4 superficies = ~2h. Prefiero dejar como deuda **CONVIENE** semana 1 post-launch.

**Cuándo se arregla**: sprint propio semana 1 post-launch. Ver [docs/auditorias/error-handling-20261119.md § #11-12](../auditorias/error-handling-20261119.md).

---

### F2. Kill-switch 5s en `/mis-reservas` + MessageThread

**Qué**: ambas pantallas muestran "Cargando..." indefinidamente si el fetch cliente se cuelga (visto en PR #20 pan-1-def3 stall). CLAUDE.md § "Pantallas de tránsito async llevan kill-switch" ya existe como regla.

**Impacto esperado**: en Supabase saludable, raro. Si Supabase tiene latencia alta transient, user ve pantalla congelada sin feedback.

**Por qué se acepta**: la regla es "aplicar a nuevas pantallas". Las existentes son deuda de retroaplicación.

**Cuándo se arregla**: sprint propio post-launch, ~1h las 2 superficies. Ver [docs/auditorias/error-handling-20261119.md § #3-4](../auditorias/error-handling-20261119.md).

---

### F3. UserContext degraded → sin toast (`cue-1-mobile-toast`)

**Qué**: cuando UserContext cae a `hydrationState=degraded` post-hydrate exhausted, surface del user queda con dashboard vacío sin explicación.

**Impacto esperado**: user que hit este path (raro, requiere condiciones específicas de red + reintentos) ve UI "incompleta" sin saber por qué.

**Por qué se acepta**: ya documentado en BACKLOG como `[cue-1-mobile-toast]` CONVIENE post-lanzamiento. Fix son ~30 min.

**Cuándo se arregla**: BACKLOG item vigente. Sprint chico post-launch.

---

### F4. `pages/_offline.tsx` y `pages/500.tsx` sin contexto adicional

**Qué**: la página offline y la 500 muestran "Reintentar" + "Algo salió mal" sin más info.

**Impacto esperado**: raro que un user llegue. Si llega, puede no saber qué hacer.

**Por qué se acepta**: es la pantalla de último recurso. Mejorarla es bueno pero no bloqueante.

**Cuándo se arregla**: polish post-launch. ~20 min cada una.

---

### F5. `alert()` nativo en GoogleAuthButton

**Qué**: [components/GoogleAuthButton.tsx:47](../../components/GoogleAuthButton.tsx#L47) usa `alert()` bloqueante para errores de OAuth.

**Impacto esperado**: bajo (OAuth rara vez falla), pero UX feo.

**Por qué se acepta**: alert funciona, solo es estéticamente inferior a toast.

**Cuándo se arregla**: ~10 min, swap a toast.error. Post-launch.

---

### F6. Patrón repetido "No pudimos cargar X" sin usar `EstadoError` consistente

**Qué**: 12 call sites tienen la misma lógica `catch → setError(...) → render <p>No pudimos cargar X</p> + <button>Reintentar</button>` pero no usan `components/Shared/EstadoError.tsx` ya existente.

**Impacto esperado**: cero funcional. Deuda de mantenimiento.

**Por qué se acepta**: refactor cosmético. Costo de aterrizar pre-25 > beneficio.

**Cuándo se arregla**: sprint propio ~2-3h post-launch. Ver [docs/auditorias/error-handling-20261119.md § Patrón repetido](../auditorias/error-handling-20261119.md).

---

## Testing + CI

### T1. Flake AUTH-TOKEN-PERSIST en setup Playwright

**Qué**: el fixture de login en `e2e/setup/auth*.setup.ts` falla ocasionalmente con `refresh_token_not_found` o timeout. Hipótesis P10 (deadlock SIGNED_IN remount) + cold Vercel preview + concurrency cross-workflow.

**Impacto esperado**: CI amarillo. Mergeos bloqueados ocasionales. Regla temporal aterrizada en CLAUDE.md (rerun autónomo único) hasta freeze lanzamiento.

**Por qué se acepta**: la causa raíz es inestable / multifactorial. Inversión de 1-2 sprints de diagnóstico sin garantía de resolver.

**Cuándo se arregla**: post-launch, cuando tengamos data de prod + presupuesto de tiempo.

---

### T2. CI-CONCURRENCY cross-PR estructural (Opción D del PR #15)

**Qué**: la opción canónica para resolver flakes CI cross-PR sobre Supabase staging es agregar `concurrency: { group: 'e2e-staging', cancel-in-progress: false }` al workflow. Serializa runs cross-PR.

**Impacto esperado**: CI más lento (serializado) pero más estable.

**Por qué se acepta**: implicaría ampliación del tiempo de merge (potencialmente 20-30 min por PR). Pre-launch preferimos velocidad.

**Cuándo se arregla**: sprint propio post-launch si los flakes persisten.

---

### T3. 8 tests en fixme (bloque C-D-E grep sobre comentarios)

**Qué**: sprint tests-desactual (PR #62) marcó 8 tests `test.fixme` porque el pattern grepeaba un literal que vivía en un comentario del sprint anterior.

**Impacto esperado**: cero funcional (los tests structural no verifican behavior real). Deuda de mantenibilidad.

**Por qué se acepta**: el fix productivo ya está en prod. Los tests solo verifican el literal en el source.

**Cuándo se arregla**: cuando re-escribamos los tests structural con assertions sobre call sites reales (no literales en comentarios). Bajo prioridad.

---

## Routing + taxonomía

### R1. Ruta `/mis-solicitudes` no renombrada a `/mis-reservas`

**Qué**: el archivo `pages/mis-reservas.tsx` existe (desde batch REMATE-1 R2b) y hay redirect 308 desde `/mis-solicitudes`. Pero el rename físico del archivo no se completó + algunas URLs internas y 2 emails siguen con `/mis-solicitudes`.

**Impacto esperado**: cero (el 308 transparenta el rename). Menor consistencia textual.

**Por qué se acepta**: funciona. Cambio es housekeeping.

**Cuándo se arregla**: BACKLOG item vigente. Sprint post-launch chico. ~1h.

---

### R2. Rename taxonomía en 4 strings de email

**Qué**: 4 strings en templates y endpoints de email dicen "solicitud de agendamiento" cuando la taxonomía unificada post-sweep #3 es "reserva". Ver `## Vulnerability management` en CLAUDE.md sección "Rename taxonomía en templates de email".

**Impacto esperado**: user ve 2 palabras para lo mismo (fricción menor).

**Por qué se acepta**: renaming cosmético. No bloquea.

**Cuándo se arregla**: BACKLOG item. Sprint post-launch chico. ~30 min.

---

## PII y compliance

### P1. Apellido completo en subject de correo chat (PR #120 postergado al 20-11 AM)

**Qué**: subject del correo "Nuevo mensaje" (#10) hoy muestra `Nombre Apellido` completo, no `Nombre I.`. Leak PII menor.

**Impacto esperado**: Ley 21.719 compliance (vigencia 01-12-2026) espera formato anonimizado.

**Por qué se acepta**: PR #120 está planeado para mergearse viernes 20-11 AM. **No es deuda aceptada, es trabajo planificado pre-launch**. Listado aquí solo para visibilidad.

**Cuándo se arregla**: 20-11 AM.

---

### P2. PII-VIEW-TIGHT: `nombre`/`apellido_p`/`apellido_m` en vista `proveedores_publicos`

**Qué**: la vista pública hoy expone los 3 campos. El RPC `buscar_servicios` también los retorna.

**Impacto esperado**: Ley 21.719 compliance.

**Por qué se acepta**: **No es deuda aceptada, es trabajo planificado pre-launch**. PII-VIEW-TIGHT se ejecuta sábado 21-11 según `docs/planes/pii-view-tight-sabado.md`.

**Cuándo se arregla**: sábado 21-11.

---

## Seguridad defensiva

### S1. Rediseño gate anti-review-spam

**Qué**: `ReviewModal.tsx` gatea submit por count de `contactos` matcheando user + servicio. El vector "atacante abre chat trivial → dispara `conversations` row → cuenta como contacto real → review se auto-aprueba" sigue abierto.

**Impacto esperado**: en volumen inicial, prácticamente nulo. Al escalar, podría explotar.

**Por qué se acepta**: moderación humana del PO cubre el 1er mes. Fix estructural requiere migrar evidencia a `agendamientos.estado=confirmada + fecha_pasada`.

**Cuándo se arregla**: sprint propio dedicado post-launch. ~3-4h. Ver CLAUDE.md § "Rediseño del gate anti-review-spam".

---

### S2. Reseñas no verificadas sin badge

**Qué**: hoy todas las reseñas son equivalentes. Post-launch se arma el sprint `reseñas-verificadas` que agrega columna `verificada` + lógica + UI.

**Impacto esperado**: en volumen inicial cero. Ya hay plan completo listo.

**Por qué se acepta**: alcance claramente post-launch. Sin presión legal ni comercial de pre-launch.

**Cuándo se arregla**: semana 2026-11-26 → 2026-11-30 según [docs/planes/resenas-verificadas-postlaunch.md](../planes/resenas-verificadas-postlaunch.md).

---

### S3. Push notifications `/api/push/send` refactor id-only

**Qué**: endpoint usa `verifyInternalSecret` server-to-server, único caller histórico era `MessageThread.tsx` (browser) → 403 siempre. Fetch removido en sweep #2 finding [86].

**Impacto esperado**: feature push notifications no funcional end-to-end (gated por `NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` flag).

**Por qué se acepta**: push notifications no se lanza con el launch. Feature flag off.

**Cuándo se arregla**: cuando activemos push. Ver CLAUDE.md § "Migrar `/api/push/send` al patrón id-only".

---

## Dependencias y build

### D1. Dependencias con moderate vulnerabilities aceptadas

Según CLAUDE.md § Vulnerability management:
- `next-pwa@5.6.0` → cadena de 7 highs build-time (workbox-build + plugins). Fix: migrar a `@ducanh2912/next-pwa@10.2.9`. Esfuerzo: sprint post-launch.
- `ws` 8.20.x → moderate uninitialized memory disclosure (fix en 8.21). Impacto marginal (memory leak hacia Supabase Realtime, mitigado por TLS).
- `postcss` 8.4.31 → moderate XSS via `</style>`. Build-time, sin user input → riesgo real ≈ 0.
- `supabase` CLI → tar path traversal. Dev-only.

**Por qué se acepta**: todos son marginal o dev-only. Fix requiere audit coordinado + regresión testing.

**Cuándo se arregla**: sprint deuda-deps post-launch.

---

### D2. React 18.3.1 pinned (no 19)

**Qué**: Next 15 soporta React 19 nativamente, pero mantenemos 18.3.1 por decisión PO (pages router, estabilidad).

**Impacto esperado**: cero. React 18 recibe seguridad fixes de Meta mientras React 19 no sea LTS.

**Por qué se acepta**: decisión explícita del PO.

**Cuándo se arregla**: cuando React 19 sea LTS (indefinido). No hay plazo.

---

## Observabilidad

### O1. Sentry dashboard sin alertas automatizadas configuradas

**Qué**: Sentry recoge issues pero no hay alertas configuradas (Slack, email, PagerDuty) para issues con `userCount > N` en ventana `< X min`.

**Impacto esperado**: incidentes se detectan por monitoreo manual del dashboard (checklist T+0→T+24). Post-24h, visibilidad baja.

**Por qué se acepta**: team actual es 2 personas. Alert fatigue > utilidad en volumen inicial.

**Cuándo se arregla**: cuando escalemos a mayor volumen o team.

---

### O2. GA4 Realtime no dispara "custom event dashboard"

**Qué**: GA4 recibe eventos `ficha_vista`, `reserva_confirmada`, etc. No hay un Looker Studio o dashboard custom montado sobre GA4.

**Impacto esperado**: métricas se ven en GA4 UI una por una. Comparativas custom requieren export manual.

**Por qué se acepta**: el volumen inicial cabe en GA4 UI. Dashboard custom es inversión post-tracción.

**Cuándo se arregla**: cuando tengamos data suficiente (post-mes 1).

---

### O3. Métricas de delivery de emails en Resend sin alerting

**Qué**: Resend dashboard muestra delivery/bounce/complaint. Si bounce rate sube a >5%, no hay alerta.

**Impacto esperado**: reputación SPF/DKIM se degrada silente.

**Por qué se acepta**: Resend Pro tiene threshold-based alerts opcionales que no hemos activado. Volumen inicial bajo.

**Cuándo se arregla**: cuando volumen supere baseline de 100 emails/día.

---

## Operacional

### OP1. Supabase CLI versioning no integrado

**Qué**: migraciones se aplican manualmente via Management API o SQL Editor. No hay flow `supabase db push` ni versión tracking atómica.

**Impacto esperado**: paridad prod ↔ staging es manual. Documentado en CLAUDE.md § Database migrations.

**Por qué se acepta**: estable. Cambio de tooling es sprint propio.

**Cuándo se arregla**: cuando el volumen de migraciones mensuales justifique la inversión.

---

### OP2. Backups DB solo horarios Supabase (no snapshots custom)

**Qué**: Supabase Pro ofrece backups horarios + PITR 7 días. Sin lógica propia de dumps / archivado long-term.

**Impacto esperado**: recuperación ante incidentes limitada a ventana 7 días.

**Por qué se acepta**: 7 días es suficiente para la escala actual.

**Cuándo se arregla**: cuando el BD crezca o cambien requisitos de compliance.

---

### OP3. Sin template HTML de "página de mantenimiento"

**Qué**: en N3 rollback (PITR), el user ve errores Vercel default durante 30-60 min.

**Impacto esperado**: en el incidente real, UX inferior.

**Por qué se acepta**: N3 es evento raro. Preparar la página es ~30 min pre-launch pero solo paga si N3 ocurre.

**Cuándo se arregla**: pre-launch si el PO autoriza (decisión pendiente en `docs/planes/rollback-25-11.md § D1`). Post-launch si no.

---

## Resumen por severidad

| Severidad | Cantidad | Esfuerzo total estimado post-launch |
|---|---|---|
| CONVIENE (fix semana 1 post-launch) | 7 ítems (A2, E1, F1, F2, R1, R2, S1) | ~8-10 h |
| MENOR (fix mes 1-2 post-launch) | 14 ítems (A1, A3, E2-E5, F3-F6, T2, T3, S3, OP3) | ~15-20 h |
| OK pero mejorable (fix cuando dé) | 7 ítems (A4, D1, D2, O1-O3, OP1, OP2) | ~20-30 h |
| PLANIFICADO pre-launch (no son deuda aceptada, aquí para visibilidad) | 2 ítems (P1, P2) | ya en calendario |

**Total deuda aceptada activa**: 28 ítems. Esfuerzo total: ~43-60 h si se hace todo. Realistic: ~20-30 h priorizados post-launch.

---

## Lo que NO es deuda aceptada (fix pre-freeze obligatorio)

Para claridad de alcance, estos **NO** son parte de este doc — deben estar fixeados antes del freeze martes 24-11 16:00 CLT:

- Bug `/explorar` exclusión mutua error ↔ 0-resultados (PR #125 en curso).
- Bug `/mis-reservas` catch mudo → empty state engañoso (BLOQUEA según error-handling audit).
- Bug `/mis-reservas` Cargando sin kill-switch (BLOQUEA).
- Chip "cuidado" vs breadcrumb "Cuidado y Hospedaje" naming (BLOQUEA).
- Verificación FK `agendamientos_servicio_id_fkey` es RESTRICT (acción de 1 min).
- Grep escape HTML en correos #4 y #10 (acción de 10 min).
- PR #120 PII-CHAT-NOMBRE merge viernes 20-11.
- PII-VIEW-TIGHT ejecutado sábado 21-11.
- CHAT-LAZY-CREATE sprint viernes.
- Badge "Nuevo en Pawnecta" viernes AM.
- Sync staging ↔ main para e2e consistency pre-freeze.

---

## Decisiones pendientes del PO

### D1. Validar el alcance de "deuda aceptada" vs lo que debe fixearse pre-freeze

**Pregunta**: la lista de 28 ítems de deuda aceptada arriba + la lista de "NO es deuda aceptada" abajo. ¿Confirmás el corte, o querés subir alguno a "fix pre-freeze"?

**Recomendación del auditor**: el corte representa criterio técnico razonable (severidad + esfuerzo + riesgo de regresión). Confirmar sin cambios salvo que haya ítem que te pique específicamente.

**Impacto si no se decide**: default = corte actual. Fix se mete en sprint propio post-launch.

### D2. Publicar este doc en el sitio (transparencia) o solo interno

**Pregunta**: ¿valide publicar un extracto público (ej. `/estado` o entrada de blog) con las "cosas que sabemos que faltan y cuándo las arreglamos", o mantener solo interno?

**Recomendación del auditor**: solo interno. Transparencia con users opera mejor en el "post-mortem si hay incidente" + "roadmap destacado si pide feedback". Lista granular de deuda técnica es ruido para user final.

**Impacto si no se decide**: default solo interno.

### D3. Sprint "cleanup semana 1" post-launch

**Pregunta**: ¿agendamos sprint dedicado la primera semana post-launch (26-11 → 3-12) para pasar los 7 ítems CONVIENE (~8-10h)?

**Recomendación del auditor**: sí. Primera semana post-launch típicamente tiene baja carga nueva (users descubriendo, pocas features nuevas) — buena ventana para cleanup.

**Impacto si no se decide**: default = cada ítem queda en BACKLOG, se resuelven por prioridad individual.

### D4. Umbrales de alerta Sentry post-launch

**Pregunta**: ¿configuramos alertas Sentry (al menos para `userCount > 5` en 30 min) post-launch, o monitoreo manual indefinido?

**Recomendación del auditor**: configurar la alerta básica tras cerrar el primer día. Ir incrementando granularidad con experiencia.

**Impacto si no se decide**: default = monitoreo manual.

---

## Firma

Este doc se congela el freeze 24-11 16:00 CLT. Los ítems aquí listados representan compromiso explícito del equipo: sabemos que están, sabemos por qué no se resuelven ahora, y tenemos plan de cuándo arreglarlos. Post-launch, cada ítem resuelto se marca cerrado + referencia al PR que lo cerró.
