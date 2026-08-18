# ACTA — Barrido deuda técnica ejecutable (agosto 2026)

**Modo**: autónomo con consultas obligatorias solo en 3 casos (decisión producto, cambio visual, operación riesgosa prod).
**Fecha**: 2026-08-18.
**Tandas ejecutadas**: 6 de 7 planeadas. Tanda 7 (tooling) **cancelada por decisión PO** post-Tanda 6 — con backlog usuario vaciado, invertir en `git-commit-verify` y CI improvements es optimizar proceso de algo ya fabricado.
**Estado post-barrido**: listo para lanzamiento con backlog usuario vaciado + deuda técnica remanente clasificada por trigger.

---

## 1. Resumen numérico

| Métrica | Cuenta |
|---|---:|
| Tandas ejecutadas | **6** |
| Sub-items ejecutados con código | **19** |
| Sub-items defer explícito con criterio | **4** |
| Consultas obligatorias del proceso | **1** (wrapper Sentry ROI; ~~Styleguide preview~~ retirado por análisis) |
| Migrations SQL entregadas a Aldo | **1** (`20260818_drop_datos_especificos.sql` — pendiente ejecución manual) |
| **Ítems obsoletos detectados en el BACKLOG** | **13** (arrastraban estado "abierto" con el trabajo ya en prod) |
| Tags prod emitidos | **6** (uno por tanda + wrapper) |
| Commits a `main` | 11 (6 merges FF + 5 commits doc/ajustes) |

---

## 2. Ejecución por tanda

### Tanda 1 — Emails (`deuda-emails-prod-20260818`)

**Aterrizado**:
- 4 templates `React.FC` → `(props): React.ReactElement` (Aprobacion, Rechazo, NewMessage, Welcome).
- 5 cambios de copy visible al usuario (rename taxonomía "solicitud/agendamiento" → "reserva" según spec pre-aprobada BACKLOG PDPO). Preservado deliberadamente: "solicitud" en contextos donde el objeto nunca fue reserva (rechazada, alta de proveedor).

**Verificaciones**: render-diff no-regresión con 23 sets → solo los 5 renames esperados en el diff, cero regresión inesperada.

**Ítem obsoleto detectado**: retrofit banda fecha emails — ya cerrado en `42c151e R7` (2026-07-30). BACKLOG lo tenía como pendiente.

### Tanda 2 — BD/backend (`deuda-bd-prod-20260818`)

**Aterrizado**:
- `estadoDerivado.ts:96` falsy-zero fix + test unit `duracion_horas === 0`. Suite 30/30 verde.
- `images.remotePatterns` scopeado a `/storage/v1/object/public/**` para los 2 hosts Supabase (defensa en profundidad — no-op en runtime actual verificado).
- `signup.ts` removido `p_datos_especificos: null` del call RPC (prep para el DROP).
- Drift RLS mascotas verificado via MCP staging: 10 policies con 8 duplicados semánticos. Documentado con costo real (no puramente cosmético) en BACKLOG.

**Consulta obligatoria pendiente**: migration `20260818_drop_datos_especificos.sql` para ejecución manual por Aldo. Evidencia cero lectores adjunta. Ajustes P8 6ª: backup query en corrida separada + BEGIN/COMMIT en un solo click. **Estado ejecución**: pendiente que Aldo la corra en Supabase Studio.

### Tanda 3 — Pickers F1/F2 (`deuda-pickers-prod-20260818`)

**Aterrizado en `SolicitarAgendamientoModal.tsx`**:
- Watchdog cross-tab con `Promise.race` timeout 15s en los 3 submits (F1, F2, legacy). Copy consistente con canónico `ServiceFormModal.tsx:747`.
- Fix `isDiaDisabledEst` undefined-as-disabled cuando `pickerEstDiasMap.size > 0` (evita rebote 23P01 con copy engañoso).
- Skeleton overlay al cambiar mes en picker F2 (bg-white/70 + Loader2). Paridad con F1.
- Fix TZ browser en `fromDate` — `chileMidnightUtc(localTodayIso())` en vez de `new Date()`.

### Tanda 4 — Nitpicks F2-3-D (`deuda-nitpicks-prod-20260818`)

**Aterrizado (7 sub-items — 2 previamente cerrados verificados)**:

Cambios de **comportamiento observable** (6/7):
- #2 unificar 403→404 (elimina enumeration oracle en `cancelar.ts`).
- #3 `emailLimiter` (3/60s) → `apiLimiter` (30/60s) — user cancelando ≥4 reservas seguidas ya no recibe 429 injustificado.
- #6 `puedeCancelarPorVentana` reactivo al tiempo (useState `nowTick` + setInterval 60s).
- #7 `<span title>` wrapper en `<button disabled>` para Firefox/Safari tooltip.
- #8 close dialog distingue 4xx vs 5xx (usuario con 5xx transient ya no pierde la fila).
- #9 copy F2 branch `esConfirmadaAuto` → "Elegiste noches disponibles".

Cambio **solo logging** (1/7):
- #5 log `[cancelar] recibido` simétrico al de `notify-proveedor`.

### Tanda 5 — Cron/observabilidad (`deuda-cron-prod-20260818` + `sentry-wrap-prod-20260818`)

**Aterrizado**:
- T5-1: Unificar `pages/api/cron/recordatorio-reserva.ts` con `lib/emails/resolvers.ts` (usa `resolverDonde`, elimina duplicación inline). Render-diff no-regresión con 23 sets → cero diff.
- T5-4 wrapper Sentry piloto: `wrapApiHandlerWithSentry(handler, '/api/cron/recordatorio-reserva')` con comentario extenso explicando por qué SOLO este endpoint (evita flood futuro cuando el próximo dev vea "faltan wrappers" en los otros 31).

**Defer explícito**:
- T5-2 `?verbose=1`: ZB4-b logs `[cron-drift]` cubren 80% del valor sin drift real observado en prod. Sin trigger.
- T5-3 revisar frecuencias crons Pro: informativo. 6 crons diarios, ninguno pide bump. Cero cambio de código.

### Tanda 6 — Frontend/UX (`deuda-ui-prod-20260818`)

**Aterrizado**:
- T6-3 Typography blog: borradas ~14 clases `prose-*` muertas (plugin nunca instalado + contenido HTML del CMS trae classNames por tag). Sin cambio visual + evita ~35KB CSS innecesarios.
- T6-4 ProveedorCard paridad: `min-h-[2.5em]` en `<h3>` alinea con ServiceCard en grids mixtos.
- T6-2 Token `notification` = alias de `red` en `tailwind.config`. NotificationBell migrado. Cero cambio visual HOY (mismo hex); permite rotar el color de notifs con 1 línea sin tocar componentes.

**Defer explícito**:
- T6-5 Styleguide rewrite: retirado por análisis "quién lo usa" (cero enlaces desde producto, cero menciones en nav/footer, cero entradas sitemap). Deuda documentación interna, NO deuda que toque usuarios.

**Ítem obsoleto detectado en la tanda**: T6-1 PERF-2 CLS ficha — ya cerrado en `7c8859b` (2026-08-11) con `width={1200} height={800}` en el hero. BACKLOG lo tenía como pendiente. 13ª instancia de estado obsoleto.

### Tanda 7 — Tooling (**CANCELADA**)

Alcance original: `git-commit-verify` helper + CI improvements (Playwright triggered + linting required check).

**Decisión PO 2026-08-18 post-Tanda 6**: cancelar. "Con backlog usuario vaciado, invertir en tooling es optimizar el proceso de fabricación de algo ya fabricado. Si en algún momento un commit parcial vuelve a morder, ahí se hace con el caso concreto a la vista."

---

## 3. 13 ítems obsoletos detectados durante el barrido

El BACKLOG los declaraba "abiertos" cuando el trabajo ya estaba en prod. Contando la sesión de Aldo B1 previa al barrido:

| # | Ítem | Aterrizó en | Detectado en |
|---|---|---|---|
| 1 | B1 íconos por campo en ficha | `917e4eb` sweep #2 (2026-08-11) | Planning Ola 2 (14-ago) |
| 2 | Notif admin nueva solicitud | Ola 1 A3 | Auditoría 14-ago |
| 3 | Sprint ANALYTICS-1 (11 eventos GA4) | Post-desfile | Auditoría 14-ago |
| 4 | Sprint SENTRY-1 | `sentry-1-prod-20260811` + 3 iteraciones | Auditoría 14-ago |
| 5 | Sprint EMAIL-CONTACTO-1 | 2026-08-11 (Zoho) | Auditoría 14-ago |
| 6 | Fichas mascotas CRUD | Pre-2026-08-18 | Auditoría 14-ago |
| 7 | Fallback "Se coordina" cancelación | Sweep #2 M9 (~2026-08-07) | Auditoría 14-ago |
| 8 | Nitpick F2-3-D #4 (callerUserId mask) | Previa | Auditoría 14-ago |
| 9 | Nitpick F2 #1 numberOfMonths responsive | ZB2 Dim 6 | Auditoría 14-ago |
| 10 | Higiene pickers F1+F2 AbortController | Pre-2026-08-18 | Auditoría 14-ago |
| 11 | B3 form errors registro fuera viewport | `a659eec desfile-prod-20260807` | Arranque Tanda 2 (18-ago) |
| 12 | Retrofit banda fecha emails | `42c151e R7` (2026-07-30) | Tanda 1 (18-ago) |
| 13 | Sprint PERF-2 CLS ficha | `7c8859b remate-1-prod-20260811` | Tanda 6 (18-ago) |

**Casi la mitad de lo que creíamos pendiente al arrancar ya estaba resuelto**.

Codificación operacional del hallazgo: cláusula "estado actualizado en el mismo commit que aterriza" agregada a `BACKLOG.md > PEDIDOS DIRECTOS DEL PO` (2026-08-18). Verificación simétrica antes de asignar a sprint = 5-30s de grep contra código.

---

## 4. Estado real del BACKLOG post-barrido — qué queda y de qué tipo

### 4.1 Deuda ejecutable inmediata restante — **1 ítem, 5 min**

- **DMARC `rua` propio** (deuda menor) — 5 min DNS + decisión destinatario. Post-launch sin bloqueo.

### 4.2 Deuda con trigger explícito — se ejecuta solo si aparece la señal — **6 ítems**

- `authLimiter → slidingWindow` — solo si aparece patrón de abuso del boundary del minuto absoluto.
- `Sentry.flush()` missing-credentials — solo si aparece drift entre reporte y captura real (rotar token Preview a inválido y verificar).
- Rate limit rotación IP (BotID) — solo si aparece patrón bot barato con IPs residuales similares.
- `?verbose=1` en recordatorio-reserva — solo si aparece drift real en prod (hoy solo observable en tests).
- GA4 DebugView — solo si aparece necesidad frecuente de ver events custom en real-time (Realtime + Reports cubren el uso principal).
- Advisory lock `capacidad_estadia > 1` — solo cuando el primer proveedor active capacidad multi-mascota (staging tiene 0 hoy).

### 4.3 Deuda con trigger legal/fecha — **1 ítem, ~1 semana**

- **Ley 21.719** flow eliminación cuenta tutor — trigger fecha límite 2026-12-01 o primer usuario solicitando eliminación.

### 4.4 Deuda documentación / tooling / interno — **5 ítems, sin urgencia**

- Styleguide rewrite (retirado del alcance ejecutable — deuda docs interna, cero users).
- UI_STANDARDS.md legacy `ring-emerald-500` nota.
- Drift RLS mascotas (limpieza infra BD cuando toque re-sync manual staging→prod).
- Migrar restantes 31 endpoints a `wrapApiHandlerWithSentry` — solo si aparece caso concreto sin traza.
- Post-launch de blog: SEO / typography si el análisis muestra que vale (usar baseline PERF-1 como referencia).

### 4.5 Roadmap producto — proyectos con propio trigger (NO deuda) — **8 sprints/features**

- **Modo request-to-book** — solo si 2+ proveedores lo piden.
- **Recordatorio 1h antes** — habilitado por Vercel Pro, candidato tras validar cron 24h.
- **Vincular conversations a agendamientos** — sprint dedicado, schema + migración datos.
- **Hero rotativo del home** — sprint chico.
- **Roadmap Doctoralia** (reseñas automáticas post-servicio + agenda visual + pagos + video-consulta) — proyectos grandes con trigger propio.
- **Catálogo de categorías futuras** (asesoría veterinaria online, nutrición, fisioterapia, hotel felino, visitas medicación, entrenamiento deportivo, servicios funerarios) — cada una es sprint chico repetible.
- **Categorías por modalidad** (presencial/remoto/mixto) — bloqueante para categorías remotas.
- **Sprint PERF-1 Bucket B/D** — mobile Agentic Browsing + Vercel Speed Insights monitoring. Gatillo PO.

### 4.6 Migration pendiente ejecución manual — **1**

- `migrations/20260818_drop_datos_especificos.sql` — Aldo la corre con GO explícito. Doc en el header + backup query obligatorio previo + BEGIN/COMMIT single-click.

### 4.7 Migration correctiva ejecutada — **1** (para trazabilidad)

- FKs `agendamientos` CASCADE → RESTRICT ejecutada 2026-08-14 (previo al barrido).

---

## 5. Con qué se lanza — vista desde el lente de usuario

- **Cero deuda pendiente que toque flujos user-facing críticos** (registro, búsqueda, ficha, reserva F1/F2, cancelación, chat, notificaciones, emails transaccionales).
- **Cero deuda pendiente en flujos operativos admin** (aprobación proveedores, moderación reviews, panel oferta/conversión).
- **Rate limit real con Upstash + observabilidad (header + badge admin + wrapper piloto en el cron).
- **Emails transaccionales alineados con taxonomía "reserva"** (spec PO aterrizada).
- **Pickers F1/F2 con watchdog + skeleton + TZ fix + isDiaDisabledEst robusto** — cero fricción silenciosa esperable.
- **Analytics + Sentry + Email contacto + Notif admin** — todos operativos y verificados.

**Deudas remanentes son todas gatilladas por eventos futuros específicos** (patrones de abuso, decisiones producto, activaciones legales). Ninguna espera "sprint dedicado sin causa".

---

## 6. Verificación diferida cron 22:00 UTC — MAÑANA (2026-08-19)

**Contexto**: T5-4 wrapper `wrapApiHandlerWithSentry` piloto aterrizado en `recordatorio-reserva.ts`. Primera corrida del cron con wrapper activo = 22:00 UTC del 19-ago-2026.

**Protocolo de doble canal** (ver notas PO sobre positivo de control):

### Canal 1 — Vercel Runtime Logs (POSITIVO de control)

- **URL**: Vercel Dashboard → Project `pawnecta-landing-mvp` → Deployments → deploy production actual (`main = 859ce9a` o superior) → **Logs**.
- **Filter**: `/api/cron/recordatorio-reserva` en el buscador de logs.
- **Timeframe**: 22:00-22:05 UTC (18:00-18:05 CLT invierno, 19:00-19:05 CLST verano).
- **Señal a buscar**:
  - Entrada del cron: `console.log` de inicio (o el primer output del handler).
  - Salida del cron con status 200: `[cron-drift-summary]` line + tiempo total.
  - **Cero `[Error]` levels** en el intervalo del cron.
- **Interpretación**:
  - **Log presente + 200 + cero errors** = handler completó normal. Positivo de control confirmado.
  - **Log presente + timeout / 500** = handler falló en runtime. Investigar traza.
  - **Log ausente** = el cron ni siquiera corrió. Investigar Vercel Cron scheduler.

### Canal 2 — Sentry Issues (SILENCIO interpretable, condicional al Canal 1)

- **URL**: Sentry Dashboard → proyecto Pawnecta → **Issues**.
- **Filter**: `tags.route:"/api/cron/recordatorio-reserva"` (parameterized route del wrapper) + timeframe últimas 24h.
- **Señal a buscar**:
  - **Cero eventos** con esa route.
- **Interpretación** (condicionada al Canal 1):
  - Canal 1 = OK + Canal 2 = cero eventos → **wrapper funcionando correctamente en happy path** (no hubo throws no manejados). Piloto exitoso.
  - Canal 1 = OK + Canal 2 = eventos con esa route → wrapper captura pero hubo error inesperado. Investigar cada uno.
  - Canal 1 = falla + Canal 2 = cero eventos → **AMBIGUEDAD PELIGROSA** (el wrapper podría no estar capturando). Investigar por qué no hay evento correspondiente al fallo del Canal 1.
  - Canal 1 = ausente + Canal 2 = cero → cron no corrió; wrapper no probado; nada que confirmar.

**Regla operativa**: **solo el par Canal 1 OK + Canal 2 silencio confirma "wrapper funciona"**. Cualquier otra combinación necesita investigación específica.

### Post-verificación esperada (mañana ~22:05 UTC)

Reporte por Aldo o auditor: los 2 canales leídos + interpretación aplicada. Si ambos OK, el wrapper piloto queda **CERRADO** con evidencia dura. Los otros 31 endpoints siguen como candidatos anotados (aplicar solo si aparece caso concreto sin traza).

---

## 7. Reglas y corolarios codificados durante el barrido

Ninguna regla nueva P-numerada (decisión PO 2026-08-18: "una regla más se diluye"). Actualizaciones:

- **Cláusula PDPO**: estado se actualiza en el mismo commit que aterriza (agregada al tope del BACKLOG).
- **Corolario P8 10ª**: ante resultado negativo, verificar que el método detecta un positivo conocido (agregado a CLAUDE.md). Auto-aplicado ~5 veces durante el barrido (grep escapado, chunks JS 404, contract-feature-nuevo con usos previos, comment interfering con grep de tipos, etc.).
- **Convención tanda 4 (nota PO)**: cambios de "comportamiento observable" se separan en el reporte de los cambios "solo logging/naming".

---

## 8. Cierre operativo

- **Modo reactivo activo** desde este commit.
- **Sin tanda 7**. Backlog usuario vaciado.
- Verificación diferida wrapper cron mañana 22:00 UTC — reporte por doble canal.
- Migration DROP `datos_especificos` pendiente ejecución manual por Aldo (con evidencia + procedimiento en el archivo SQL).
- Nada más sin señal PO explícita.

Aldo se dedica a captación de proveedores + campañas hasta viaje a China (~fines septiembre). El sistema soporta la ausencia — wrapper piloto, gates operacionales, canal FeedbackWidget persistente, y deuda técnica clasificada por trigger específico.
