# Auditoría #2 — Triage Único (viernes 2026-08-07)

**Target**: staging `0292fe2` (desfile consolidado: producto-1 + zonab-1 + producto-2 + prelaunch-1).
**main** (pre-desfile): `8977380`.
**Diff size**: 74 files, +6678/-392.
**Autorización**: GO PO del arranque del viernes tras cierre Fase 8 monitor N15 con evidencia 4/4.

## Fuentes ejecutadas

| Fuente | Estado | Findings surfaced |
|---|---|---|
| **Canónico xhigh** (code-review skill) | ✅ agent principal reportó 7 ranked; 9 finder agents adicionales llegaron por notification (Angle A/B/C/D/E+F/G+H/I+J + focus a11y audit + 2 sub-verifiers) | 7 principales + ~30 adicionales entre finders |
| **Security-guidance** (security-review skill) | ✅ | 0 findings HIGH/MEDIUM ≥8 confidence |
| **UX walkthrough re-navegación** (Playwright MCP contra staging post-desfile) | ✅ | 1 nuevo + 3-4 cerrados por desfile + 5-6 sobrevivientes del walkthrough #1 |
| **3 diagnósticos pre-hechos** (REPORTE_DIAGNOSTICO_ERRORS_PROD, DIAGNOSTICO_MCP_VERCEL_405, REPORTE_UX_WALKTHROUGH_1) | ✅ referenciados | Aportan contexto histórico + baseline UX #1 |
| **Superficie producto-1 explícita** (AUDITORIA_2_SCOPE.md — RPC buscar_servicios SECURITY DEFINER/invoker + wizard etología + badge + cross-links) | ✅ cubierto por xhigh | Sin findings adicionales (SECURITY DEFINER pre-existente, no regresión del sprint) |
| **Línea base performance** (Chrome DevTools Lighthouse) — nuevo módulo | ⚠ GAP tooling | Diferido a post-Fase E en prod (Vercel Deployment Protection intercepta `extraHttpHeaders` del plugin en staging; en prod sin protection funciona natural) |

## Triage consolidado (dedupeado, ranked)

### 🔴 BLOCKER pre-Fase E (5)

**B1 — `e2e/setup/guard.ts:24-62` — trap-door en deny-list anti-prod** — score 95
Fuentes: Angle B + sub-verifier a1e4f09 + Angle A (nota) + Angle C.
`PROD_HOSTS_BLOCKED` omite alias team-scoped `pawnecta-landing-mvp-git-main-petmatecls-projects.vercel.app` (branch main = prod). Suffix whitelist línea 62 acepta cualquier `-petmatecls-projects.vercel.app` → dev que copia URL del dashboard Vercel corre suite full contra PROD. Suite crea/updatea rows con calls autenticados → **corrupción real de data prod posible**.
**Fix**: agregar los aliases team-scoped a `PROD_HOSTS_BLOCKED` + test `guard.test.ts` con el URL específico. Esfuerzo: 15 min.

**B2 — `pages/sitemap.xml.tsx:11-30` — silent-fail catástrofe SEO** — score 90
Fuentes: agent principal + sub-verifier afb9a6b + Angle B.
PL1-C introdujo cross-fetch coupling: si `proveedores_publicos` fetch retorna null/error (RLS revocada, view renombrada, blip DB), Set vacío → todos servicios filtered → sitemap solo 6 STATIC_ROUTES + 200 OK + cache 1h. Google recrawls, dropea previously-indexed `/servicio/*` + `/proveedor/*`. Recovery: días/semanas de reindexing.
**Fix**: capturar `error` de ambos SELECTs + retornar 500 (no cacheable) en error path, o preservar comportamiento previo (no dropear servicios si aprobados-fetch falla). Esfuerzo: 20 min.

**B3 — `pages/mis-solicitudes.tsx:687-688` — `puedeCancelarPorVentana` guard defensivo unreachable** — score 85
Fuente: Angle D.
`new Date(solicitud.fecha_preferida ?? 0).getTime()` — `new Date(0).getTime() = 0` es finite → `Number.isFinite(checkInMs)` returns true → `if (!isFinite) return true` (escape defensivo) NUNCA dispara con `fecha_preferida = null`. Botón "Cancelar reserva" queda greyed con tooltip "Faltan menos de N horas" para F2 legacy row sin fecha.
**Fix**: `if (!solicitud.fecha_preferida) return true;` antes del coerce, drop `?? 0`. Esfuerzo: 5 min.

**B4 — `pages/[categoria]/[comuna].tsx:243` — mapper omite `tiene_agenda_activa` en SEO landings** — score 85
Fuente: Angle C.
Manual RPC-to-ServiceResult mapper (líneas 243-262) escribe subset hand-picked de fields, sin `tiene_agenda_activa`. TS compile clean porque `ServiceResult.tiene_agenda_activa?: boolean` es opcional. Badge "Reserva online" (feature nuevo de producto-1 PR1) **invisible en TODAS las SEO landing pages** `/paseos/providencia`, `/hospedaje/las-condes`, etc. Users organic Google MISS el feature.
**Cross-page inconsistency**: mismo servicio SÍ muestra badge en `/explorar` pero NO en `/paseos/providencia` (mismo backend, distintas rutas).
**Fix**: agregar `tiene_agenda_activa: raw.tiene_agenda_activa` al mapper. Esfuerzo: 5 min. Alternativa deeper: refactorizar a `mapRpcToServiceResult` compartido (finding L de altitud).

**B5 — `pages/api/cron/recordatorio-reserva.ts:369-402` — drift instrumentation post-send (duplicate email no prevenida)** — score 80
Fuentes: Angle B (removed-behavior) + Angle I (altitud).
ZB4-b agregó conditional UPDATE `.is('recordatorio_*_enviado_at', null).select('id')` DESPUÉS de que `enviarRecordatorio()` ya mandó el email. Logea el drift pero **NO previene el duplicate email**. `sentTutor++` fires regardless → contador y timestamp regresan a stale (T1 vs T2 real).
**Fix**: patrón **claim-then-send** — UPDATE conditional con RETURNING id PRIMERO; solo si claim retorna 1 row, entonces `enviarRecordatorio()`. Cierra idempotencia real en concurrent runs (retry Vercel, manual + scheduled, cold-start). Esfuerzo: 30 min.

### 🟡 MEDIUM (15)

**M1 — Focus regresión en 3 modales tras migración `useModalDialog`** (ExampleCTAModal + VerificationGateModal + SitterDetailModal)
Fuentes: Angle B + focus/a11y audit.
Hook focusea PRIMER tabbable DOM (close-X en header) en vez del primary CTA que el código pre-migración focuseaba con refs explícitos. Screen readers anuncian "Cerrar" al abrir; keyboard user Enter DISMISS modal en vez de convertir signup / disparar aprobación admin. **Regresión de intent del CTA principal en 3 modales críticos** — 2 de conversión + 1 de decisión admin.
**Fix**: exponer `initialFocusRef?: RefObject` en `useModalDialog` + setear focus explícito post-open en los 3 call sites. Esfuerzo: 45 min.

**M2 — `components/Service/ReviewModal.tsx:111` + `components/Shared/ReportModal.tsx:67` — X sin `disabled={isSubmitting}` durante insert**
Fuente: focus/a11y audit.
User clic X durante submit → parent unmount → `setSuccess`/`setRating` on unmounted (React warning) + review persistida sin UI confirmation → **duplicate-submit posible en reopen**.
**Fix**: `disabled={isSubmitting}` + skip `onClose` mientras loading. Esfuerzo: 5 min × 2 = 10 min.

**M3 — `components/Proveedor/ServiceFormModal.tsx:1319` — `blockClose` omite `uploadingFotos`**
Fuente: Angle C.
`useModalDialog blockClose: loading || fetching` — falta `uploadingFotos`. Escape mid-upload cierra modal + tira `fotos` state. Upload sigue en background pero user no ve confirmación; en refresh puede que el blob esté o no.
**Fix**: `blockClose: loading || fetching || uploadingFotos`. Esfuerzo: 2 min.

**M4 — `pages/admin/proveedores.tsx:421-548` — 4 modales admin con aria attributes pero SIN `useModalDialog`**
Fuente: Angle C. Anotado como deuda light en spec `e2e/specs/zonab-1/s10-a11y-modales-batch.spec.ts:73-77`.
Modales aprobar/rechazar/suspender/detalle tienen `role=dialog` + `aria-modal` + `aria-labelledby` pero no hook → sin Escape, sin focus trap, sin return focus. **Admin approval flow con screen reader queda stuck.** El spec pasa porque solo checa role/aria attributes, no keyboard behavior — false sense of coverage.
**Fix**: migrar los 4 modales al `useModalDialog` (mismo patrón que los 9 ya migrados). Esfuerzo: 30 min.

**M5 — `pages/mis-solicitudes.tsx:290-318` — `handleVolverASolicitar` sin session check**
Fuentes: agent principal + sub-verifier afb9a6b.
CTA "Volver a solicitar" hace UPDATE client sin `getSession()` pre-check. Sesión expirada → RLS rechaza → toast genérico "No pudimos preparar el reintento: JWT expired". Contrasta con `handleConfirmCancel` F2 (líneas 212-216) que sí redirige a `/login?reason=expired&redirect=...`.
**Fix**: aplicar mismo defensive pattern. Esfuerzo: 10 min.

**M6 — `lib/estadoDerivado.ts:122-127` — F2 pendiente marca vencida al midnight local del check-in day**
Fuente: Angle D. **Call semántico para PO** (no bug mecánico).
`fecha_preferida` es `chileMidnightUtc(ymd)` para F2. Card salta a "Vencida" al 00:01 del check-in day, no al `check_in_hora = 14:00` real → semánticamente el request sigue viable hasta hora de check-in.
**Fixes candidatos**: (a) usar `finEfectivoMs(r)` en vez de `fecha_preferida` (aligns con confirmada→realizada); (b) end-of-day tolerance F2 (`inicioMs + 24h`). Requerir GO PO. Esfuerzo: 20 min post-decisión.

**M7 — `pages/mis-solicitudes.tsx:811-816` — `<img src>` sin `getProxyImageUrl()` VIOLA CLAUDE.md**
Fuente: Angle J (convenciones).
Regla canónica CLAUDE.md > Convenciones: "`getProxyImageUrl()` para URLs de Supabase Storage (bypass AdBlock)". El chip mascota renderea `<img src={solicitud.mascota.foto_mascota}>` directo sin proxy. Users con AdBlock/uBlock/Brave block `*.supabase.co` y ven imagen rota — el PawPrint fallback no dispara.
**Fix**: `<img src={getProxyImageUrl(solicitud.mascota.foto_mascota)}>`. Esfuerzo: 3 min.

**M8 — `lib/emails/resolvers.ts:40` — falsy-0 en `duracion_horas`**
Fuente: Angle D. Mismo pattern que finding P3 conocido `estadoDerivado.ts:96`.
`if (input.duracion_horas)` treats 0 as absent → legacy row con `duracion_horas = 0` + `fecha_fin` real → misclasifica como V2/V4a rango → email sub incorrecto.
**Fix**: `if (input.duracion_horas != null)`. Esfuerzo: 2 min.

**M9 — `pages/api/agendamientos/notify-proveedor-cancel.ts:147` — fallback "chat con tutor" wrong copy**
Fuente: agent principal. **YA CONOCIDO** en BACKLOG P3 (canónico previo). Verificado que sigue presente.
El endpoint envía email AL TUTOR, pero el fallback dice `"chat con ${tutor?.nombre || 'el tutor'}"` — un tutor lee "chat con Camila" (su propio nombre) — nonsense.
**Fix**: cambiar a "chat con el proveedor". Esfuerzo: 2 min.

**M10 — `pages/api/cron/recordatorio-reserva.ts:165-266` — cron duplica `finEfectivoMs` + `resolverDonde` + `resolverFechaSub`**
Fuente: Angle E+F + Angle C + agent principal. **YA CONOCIDO** en BACKLOG P3 (canónico previo). Verificado.
Cron replica inline la lógica que ZB3 extrajo a helpers canónicos. Divergencia latente: cambio en resolvers no propaga al cron → recordatorios envían copy distinto al de confirmación.
**Fix**: refactor pipeline cron para consumir helpers. Esfuerzo: ~1h.

**M11 — UX-7: Footer no lista Etología ni Retratos** (columna "Servicios")
Fuente: UX walkthrough re-navegación 2026-08-07 (mio).
Footer.tsx muestra 8 categorías originales, falta "Etología" (producto-1 PR2) y "Retratos" (sprint anterior). Users organic no descubren las categorías nuevas desde footer.
**Fix**: agregar entradas + patrón mantenimiento cuando se sumen categorías. Esfuerzo: 10 min.

**M12 — `pages/explorar.tsx:109-117` — CATS del ExplorarPrelaunch omite `etologia`**
Fuente: agent principal. **NUEVO del canónico**.
Waitlist para tutores en comunas sin proveedores. `CATS` hardcoded 7 slugs (cuidado, guarderia, paseos, peluqueria, adiestramiento, veterinario, traslado). Falta `etologia` (categoría nueva de PRODUCTO-1 con foco explícito en lanzamiento). Tutor que llega al waitlist buscando ayuda etológica no puede señalizar interés → pérdida de señal de demanda para categoría recién lanzada.
**Fix**: agregar `{ slug: 'etologia', label: 'Etología y Conducta' }` a CATS. Esfuerzo: 2 min.

**M13-M17 — Walkthrough #1 sobrevivientes al desfile** (5-6 findings verificados que siguen abiertos hoy):
- **UX-1** filler cards spam `/explorar` (pre-clasificado: owner CÓDIGO, ~30 min, cap ≤1 + condicional ≥3 reales, fix direccional aprobado PO 2026-08-04).
- **UX-2** duplicación CTA proveedor (owner código, 1 canal por página).
- **UX-3** copy "con un proveedor" (VERIFICADO hoy que sigue en staging, 5 min).
- **UX-4** URL `/mis-solicitudes` vs `<title>Mis reservas`; ya en BACKLOG (deuda rewrite 301 documentada).
- **a11y-3** sidebar `/proveedor` tabs sin role=tab (30 min, patrón PD2).
- **UX-6** header menú "Admin" en vez de nombre/rol (15 min).

### 🟢 LOW / cleanup (14)

L1 — `mis-solicitudes.tsx:404-420` sort comparators `|| 0` → nulls al top (ASC) / bottom (DESC) silente.
L2 — `MobileActionSheet.tsx:65` focus ring flash antes de finalizar transición 300ms mobile.
L3 — `ReportModal.tsx:62` duplicate ID entre 2 h3 (success + form) con mismo `useId()` — potencial axe warning si ambos ramos coexisten (React strict mode double-render).
L4 — `mis-solicitudes.tsx:161-186` useEffect deps del `state` completo → re-run innecesario en cada refetch/cancel/vovler.
L5 — `SolicitarAgendamientoModal.tsx:316-317` `mql.addEventListener` sin fallback iOS<14 (project-wide con `ServiceDetailView.tsx:506`).
L6 — `notify-tutor-reserva-confirmada.ts:83-85` raw auth UIDs en console.warn sin `maskUid` (inconsistencia sibling `notify-proveedor-cancel.ts:73-74`).
L7-L14 — 8 findings simplification/efficiency Angle G+H:
  - `mis-solicitudes.tsx:390` mother IIFE → `useMemo` (~800 Date allocations/render savings)
  - `mis-solicitudes.tsx:161` PD5-fix duplicated logic → consumir del memo
  - `estadoDerivado(solicitud)` 3× per card → pasar como prop desde parent
  - Sort comparators pre-compute `fechaMs` en withEstado map (~2000 Date allocations/render savings)
  - `estadoBadge` switch 7 branches → lookup table
  - `mascotaKey` + `mascotaLabel` → merge en `mascotaInfo`
  - `puedeCancelarPorVentana` + `fechaPreferida` IIFEs SolicitudCard → useMemo
  - `sitemap.xml.tsx:11` fetches sequential → `Promise.all` (cuts latency ~50%)
L15 — `pages/[categoria]/index.tsx:174` raw RPC pass-through (fotos como paths, no URLs) — pre-existente, no regresión del sprint, cross-page inconsistency ya documentada.
L16 — `lib/types/agendamiento.ts:116` `mascota_id` + `tipo_mascota_texto` en interface extended en vez de base (footgun type-shape).
L17 — `notify-*.ts` `resolverDonde(agend, servicio)` acepta objeto raw con extra properties (structural subtyping); rename column silencioso → helper recibe undefined. `Pick<>` tighter type los cerraría en compile-time.
L18 — `lib/serviceMapper.ts:141` + `migrations/20260731_buscar_servicios_agenda_activa_fix.sql:117` semaphore duplicado TS/SQL — pre-existente con nota PO "not fixable without more work", divergencia ya observada (por eso existe el `_fix.sql`).

### ⚫ CERRADOS por desfile (verificados en re-navegación)

- **BASELINE-1** walkthrough #1: `/mis-solicitudes` scroll infinito → CERRADO por PD2 pestañas ✅
- **a11y-1** walkthrough #1: `LoginRequiredModal` sin role=dialog → CERRADO por zonab-1 ZB1 (`useModalDialog` + role=dialog + aria-modal ✅ en código)
- **a11y-2** walkthrough #1: botón cerrar sin aria-label → probable CERRADO por ZB1 (mismo hook)

### ⚫ Security-review estricta (0 findings HIGH/MEDIUM ≥8)

Cobertura de 10 secciones PO-anclada, todo preserva patrones canónicos (`verifySession` + id-only + ownership check + RLS-backed mutations + FK-resolved data). Nota: el trap-door del guard fue reportado por sub-verifier del **canónico xhigh** (correctness/defensiva), no por security-review estricta que lo excluye por HARD EXCLUSIONS (test tooling ≠ endpoint prod). Ambas visiones coexisten en este triage.

## Sweeps propuestos (para el sprint post-Auditoría #2)

### Sweep #1 — BLOQUEANTES pre-Fase E (~1.5h)
B1 guard.ts (15m) + B2 sitemap.xml.tsx (20m) + B3 puedeCancelarPorVentana (5m) + B4 mapper landings (5m) + B5 cron claim-then-send (30m) + tests actualizados (30m).

**Merge de Fase E BLOQUEADO hasta cierre limpio de este sweep** — criterio adicional al `MINI_CHECKLIST_COLA_MERGES.md`.

### Sweep #2 — PEDIDO PO + MEDIUMS quirúrgicos (~3h)

**Actualizado 2026-08-07 tras corrección de proceso del PO** — alcance ampliado con el pedido explícito del PO 2026-07-31 (íconos por campo en "Información del servicio") migrado a `BACKLOG.md > PEDIDOS DIRECTOS DEL PO` y asignado como **PRIMER ítem del sweep, ANTES de los 10 mediums**. Ver también la práctica operativa nueva en `CLAUDE.md > Workflow > Pedidos directos del PO`.

**Ítem 0 — Íconos específicos por campo (`camposPorCategoria` + `renderCampoCard`)** — ~1h.
Fix del `···` genérico en las fichas de servicio: agregar `icon?: LucideIcon` a cada entrada del `lib/camposPorCategoria.ts` según el mapa direccional de la sección `PEDIDOS DIRECTOS DEL PO` (Clock/PawPrint/MapPin/Trees/Scale/Cake/Users/Video/Navigation/Camera/Car/Award/Stethoscope/Home). Fallback `MoreHorizontal` solo para campos futuros sin mapeo. Consumir en `components/Servicio/ServiceDetailView.tsx:1094-1103` reemplazando el SVG inline. **Criterio de cierre**: cero `···` visibles en las fichas de todas las categorías actuales (hospedaje, guardería, paseos, peluquería, adiestramiento, veterinario, traslado, cuidado, etología, retratos) verificable con smoke visual por cada categoría.

**Los 10 mediums quirúrgicos ordenados por costo** (~2h):
M1 focus regresión 3 modales (45m) + M2 X sin disabled 2 modales (10m) + M3 uploadingFotos (2m) + M5 volverASolicitar session check (10m) + M7 img proxy (3m) + M8 duracion_horas falsy-0 (2m) + M9 fallback copy (2m) + M11 footer (10m) + M12 CATS etologia (2m) + tests.

### Sweep #3 — Deep refactor (~4h, opcional pre-launch)
M4 admin 4 modales useModalDialog (30m) + M10 cron consume resolvers (1h) + L7-L14 mis-solicitudes memoization + estadoBadge lookup + sitemap Promise.all + F2 semántica M6 post-GO PO.

### Sweep #4 — Post-launch (deuda light acumulada)
L1-L6, L15-L18, walkthrough #1 UX-1 hasta UX-6, a11y-3, línea base performance en prod.

## Cabo post-triage — Módulo LÍNEA BASE PERFORMANCE

GAP tooling documentado: Chrome DevTools MCP no propaga `extraHttpHeaders` al `navigate` → Vercel Deployment Protection intercepta staging con SSO. Diferido a **post-Fase E en prod** (sin protection → funciona natural). Baseline objetivo: home + `/explorar` + una ficha de servicio, desktop + mobile, métricas LCP/CLS/TTFB/score.

Alternativa si urge pre-Fase E: (a) deshabilitar Deployment Protection para staging temporalmente (requiere GO PO explícito + tiene overhead operacional); (b) instalar Lighthouse CLI local con cookie preset (Aldo, ~10 min setup).

## Notas de operación

- **Cero commits/push/edits** del código durante esta auditoría — solo reporte.
- Los 3 diagnósticos pre-hechos (`REPORTE_DIAGNOSTICO_ERRORS_PROD.md`, `DIAGNOSTICO_MCP_VERCEL_405.md`, `REPORTE_UX_WALKTHROUGH_1.md`) aportan contexto y ya están en el repo.
- Superficies RPC `buscar_servicios` (SECURITY DEFINER sin `SET search_path`) — pre-existente, no regresión del sprint. Puede entrar al backlog como hardening independiente (Supabase advisor puede flagearlo eventualmente).
- **Regla P5 aplicada**: este reporte es la fuente de verdad del triage — el chat es coordinación efímera.

## Estado tras entrega

- **Auditoría #2 CERRADA**. Triage único consolidado (5 blockers + 15 mediums + ~14 lows + 3 cerrados por desfile + 0 security estricta).
- **Sweep #1 arranca cuando PO dé GO** — es el desbloqueador de Fase E (`staging → main`).
- Sweeps #2/#3/#4 en cascada según decisión de scope pre-launch vs post-launch.

---

## Anexo P5 — SWEEP #2 CERRADO (viernes 2026-08-07 tarde-noche)

**Autorización PO**: GO explícito del arranque post-Fase E + corrección de proceso (nueva sección `## PEDIDOS DIRECTOS DEL PO` al tope del BACKLOG con íconos como PRIMER ítem del sweep).
**Rama**: `sweep-2` forkeada de `main d4290f3`.
**SHA final sweep-2**: `917e4eb` (16 archivos, +424/-18).
**Merge a main**: fast-forward exitoso (`d4290f3 → 917e4eb`).
**Deploy prod aterrizado**: attempt 4 del poll (~65s post-push), verificado por bundle `_app-dc4bdf02...` + `categoria=etologia` en footer SSG.

### Alcance final ejecutado (12 items)

**ÍTEM 0 (PO 2026-07-31) — Íconos específicos por campo** ✅
- Nuevo record `ICONO_POR_CAMPO_KEY` en `lib/camposPorCategoria.ts` con mapa Lucide completo (24+ keys mapeadas): Clock/PawPrint/MapPin/Trees/Users/Video/Camera/Car/Award/Stethoscope/Home/Package/Palette/Target/Maximize2/Repeat/Shield/Wrench/Briefcase/Receipt/FileText/Layers/Info/ImageIcon.
- Nuevo helper `getIconoParaCampoKey(key)` con fallback `MoreHorizontal`.
- `renderCampoCard` en `ServiceDetailView.tsx:1094` consume el ícono en vez del SVG genérico `···`.
- **Verificación runtime prod**: `curl https://www.pawnecta.com/servicio/c1000001-...-003` → **0 SVG placeholder `···` + 24 lucide icons render** (paw-print, map-pin, sparkles y demás semánticos coherentes con el mapa). Criterio de cierre cumplido.

**ÍTEM 0-BIS (PO 2026-08-07) — REPORTE_EMAIL_CONTACTO.md** ✅
- Diagnóstico grep completo entregado: 4 casillas `@pawnecta.com` referenciadas (contacto/soporte/notificaciones/hola-asumido), ninguna funcional. Canal real `petmatecl@gmail.com` no aparece en ninguna superficie.
- Fix propuesto: Cloudflare Email Routing gratis con 4 forwards + catch-all → `petmatecl@gmail.com`. Paso a paso ejecutable por Aldo (15 min).
- Cero código de mi parte; setup infra por Aldo cuando decida ejecutarlo.

**M6 F2 pendiente semántica** ✅ (call PO)
- PO decidió **opción (C)** — reafirmar comportamiento actual. "Vencida" al midnight del check-in day es SEÑAL AL TUTOR (volver a solicitar), no restricción absoluta.
- Documentado en `lib/estadoDerivado.ts` como comentario canónico con el rationale del PO.

**M1 focus regresión 3 modales** ✅
- Nuevo `opts.initialFocusRef` en `lib/useModalDialog.ts` (opcional; cae al comportamiento previo si se omite).
- Aplicado en `ExampleCTAModal` (primary CTA "Registrarme como tutor") + `VerificationGateModal` (primary "Verificar ahora"/"Ir a mi perfil"/"Entendido") + `SitterDetailModal` (primary "Aprobar/Revocar" admin).
- Screen readers anuncian primary CTA al abrir; keyboard user Enter convierte/dispara acción en vez de dismiss.

**M2 ReviewModal + ReportModal X sin disabled durante submit** ✅
- `ReviewModal.tsx:111`: `disabled={isSubmitting}` + `aria-label="Cerrar"` + styles disabled.
- `ReportModal.tsx:67`: `disabled={loading}` — consistencia con `blockClose:loading` que ya bloqueaba Escape.

**M3 ServiceFormModal blockClose omite uploadingFotos** ✅
- `SFM:1319`: `blockClose: loading || fetching || uploadingFotos`. Escape mid-upload ya no cierra el modal + tira fotos state.

**M5 handleVolverASolicitar sin session check** ✅
- `mis-solicitudes.tsx:290`: session check ANTES del UPDATE. Sesión expirada → redirect `/login?reason=expired&redirect=<back>`. Mismo patrón que `handleConfirmCancel` F2 (líneas 214-217).

**M7 img sin getProxyImageUrl** ✅ (viola CLAUDE.md)
- `mis-solicitudes.tsx:816`: chip mascota `src={getProxyImageUrl(...)}`. Users con uBlock/Brave ya no ven imagen rota.

**M8 duracion_horas falsy-0 en resolvers.ts** ✅
- `if (input.duracion_horas != null)` en vez de truthy check. Semáforo consistente con `esF2` arriba en el mismo file.

**M9 fallback "chat con tutor" copy en notify-proveedor-cancel** ✅
- Cambiado a `"Sin dirección registrada"`. Reserva CANCELADA → "se coordina por chat" es futuro imposible; además email va al TUTOR (leer "chat con Camila" es su propio nombre = nonsense).

**M11 UX-7 Footer con etología/retratos** ✅ (temática PO — servicios inexplotados llegando al footer)
- `components/Footer.tsx` columna Servicios: agregadas Etología, Retratos, Cuidado en casa del tutor. Preservado Hospedaje para backwards-compat.
- **Verificación runtime prod**: `curl https://www.pawnecta.com/faq` → los 4 nuevos entries visibles en SSG (etologia:1, retratos:1, cuidado:1, hospedaje:1).

**M12 CATS ExplorarPrelaunch omite etologia** ✅
- `pages/explorar.tsx:109` CATS: agregados `etologia` + `retratos`. Waitlist captura señal de demanda para categorías nuevas.

### Build P1 + Suite

- **Build local `npm run build`** exit 0 con warnings de linter aceptables (patrón habitual).
- **Suite corrida 1**: 60 passed + 1 failed (known-flaky `producto-1/s1-badge-reserva-online:74`) + 2 flaky setups (retry verde). EXIT=1.
- **Aislado del known-flaky**: 2/2 verde en 5.2s.
- **Suite corrida 2 confirmatoria**: **63 passed exit 0 en 35.5s, CERO flaky**.

### Cleanup MCP staging

`0 [TEST-%` + `0 e2e-%` verificado post-suite ✅.

### Smokes prod runtime post-deploy

- **Ítem 0**: `/servicio/c1000001-...-003` → 0 SVG placeholder `···` + 24 lucide icons render ✅.
- **M11**: `/faq` footer con etologia/retratos/cuidado/hospedaje ✅.
- **No-regresión PL1**: `/servicio/{uuid-inexistente}` → HTTP **404** ✅ (Sweep #1 intacto).

### Estado tras Sweep #2

- **main HEAD**: `917e4eb` — Sweep #2 en producción.
- Todos los pedidos directos del PO detectables como pendientes: **cerrados** (íconos → aterrizado en prod; email de contacto → reporte entregado, setup Cloudflare pelota en cancha de Aldo).
- 10 mediums del triage de Auditoría #2 quirúrgicamente cerrados.
- **Deuda restante del triage**: los ~14 LOW/cleanup + `M4 admin 4 modales useModalDialog` (deep refactor 30m) + `M10 cron consume resolvers` (deep refactor 1h) + los 8 perf/simplification cleanup mis-solicitudes/sitemap. Todos para **Sweep #3** cuando el PO lo gatille.

## Anexo P5 — SWEEP #1 CERRADO (viernes 2026-08-07)

**Autorización PO**: GO explícito del arranque post-triage con las 5 notas direccionales (a-e).
**Rama**: `sweep-1` forkeada de `staging b95e561`.
**SHA final sweep-1**: `8c35692` (9 archivos, +542/-119).
**Merge a staging**: fast-forward exitoso (staging avanzó de `b95e561 → 8c35692` sin conflicts).

### Ejecución por blocker

**B1 — `e2e/setup/guard.ts` deny-list ampliada + shape check**:
- `PROD_HOSTS_BLOCKED` ampliado con team-scoped aliases: `pawnecta-landing-mvp-petmatecls-projects.vercel.app` (team-project raíz) + `pawnecta-landing-mvp-git-main-petmatecls-projects.vercel.app` (main branch = prod).
- Nuevo `PROD_HASH_ALIAS_REGEX` bloquea hash-aliases de deployment (patrón `<project>-<hash>-<team>.vercel.app`, defensa conservadora).
- Nuevo shape check exige infijo `-git-<branch>-` (defensa en profundidad para aliases futuros).
- `e2e/setup/guard.test.ts` ampliado: **18/18 tests verde** con caso DENY por cada alias prod conocido.
- **Verificación runtime**: invocación negativa `PLAYWRIGHT_BASE_URL=https://pawnecta-landing-mvp-git-main-petmatecls-projects.vercel.app npx playwright test --list` → `Error: [e2e/guard] baseURL apunta a producción (pawnecta-landing-mvp-git-main-petmatecls-projects.vercel.app)` ✅. Trap-door cerrado.

**B2 — `pages/sitemap.xml.tsx` fail-LOUD**:
- Si `proveedoresError`, `serviciosError`, o data null → `res.statusCode = 500` + `Cache-Control: no-store` + summary de error en cuerpo + `console.error` con detalle. La CDN NO cachea el error → próximo crawl regenera cuando DB responda.
- **Verificación runtime happy path staging**: `HTTP/1.1 200 OK` + sitemap con **32 `<loc>`** (15 servicios aprobados + 17 proveedores) — paridad con smoke previo del desfile ✅.

**B3 — `puedeCancelarPorVentana` restaurado + contra-test canónico**:
- Extraído a `lib/puedeCancelarPorVentana.ts` como función pura testeable (antes IIFE inline en `mis-solicitudes.tsx:685` — imposible de testear).
- Fix guard defensivo: `if (!input.fecha_preferida) return true` ANTES del coerce.
- `lib/puedeCancelarPorVentana.test.ts` nuevo: **14/14 tests verde**. Contra-test canónico del caso B3 (F2 confirmada con `fecha_preferida = null/undefined/empty` retorna true) + happy path + edge cases (borde 48h, ventana custom del servicio).

**B4 — `tiene_agenda_activa` paridad TODOS mapping paths**:
- `pages/[categoria]/[comuna].tsx`: reemplazado inline object literal por `mapRpcToServiceResult` canónico.
- `pages/[categoria]/index.tsx`: reemplazado raw pass-through por `mapRpcToServiceResult` canónico.
- **Verificación runtime staging**: `/cuidado` badge "Reserva online" = 1 (antes del fix era 0) ✅. Bug pre-existente colateral en `[categoria]/index.tsx` (`fotos` como paths sin URL completa) también cerrado por el mismo refactor.

**B5 — cron `recordatorio-reserva.ts` claim-then-send**:
- Invertido el orden: CLAIM primero (`UPDATE conditional NULL` con RETURNING id), SEND solo si claim gana. Prevención medida real — antes se logeaba el race post-send sin prevenir la duplicación.
- Rollback: si send falla POST-claim, marca vuelve a NULL para que próximo run reintente.
- Rename semántico: `drift*` → `claimsPerdidos*`. Alias legacy `driftTutor`/`driftProveedor` preservado en `[cron-drift-summary]` para no romper dashboards.
- Console tag renombrado: `[cron-drift]` → `[cron-claim-lost]` (semántica precisa: race prevenido, no drift post-hoc).
- **Verificación runtime**: los 10 tests de `e2e/specs/f2-recordatorios-cron/all.spec.ts` (S1 dryRun por familia + S2 corrida real + idempotencia + S3 marcas independientes + S4 no-elegibles + S5 auth) **verde** en la suite full — contrato preservado con la nueva semántica claim-then-send.

### Suite full contra preview sweep-1

- **Corrida 1**: 60 passed + 1 failed (known-flaky `producto-1/s1-badge-reserva-online:74`, documentado como deuda light) + 2 flaky en setups (retry verde). EXIT=1.
- **Aislado del known-flaky**: 2/2 verde en 6.1s.
- **Corrida 2 confirmatoria**: **63 passed exit 0, CERO flaky en 36.0s**.

Total 63 tests (2 setups + 61 tests reales) = baseline post-desfile intacto (los 5 fixes NO agregaron specs e2e nuevos; los 2 helpers extraídos tienen unit tests separados con `tsx`).

### Cleanup MCP staging

`0 [TEST-%` + `0 e2e-%` verificado post-suite ✅.

### Regla P1 aplicada

Build local `exit 0` antes de cada commit. `tsc --noEmit` + `next build` completos. Tests unitarios adicionales (`guard.test.ts` 18/18 + `puedeCancelarPorVentana.test.ts` 14/14) corridos con `npx tsx` como parte del criterio de cierre.

### Estado tras Sweep #1

- **staging HEAD**: `8c35692` (fast-forward exitoso desde `b95e561`).
- **Fase E DESBLOQUEADA** (los 5 blockers de la Auditoría #2 cerrados con evidencia P5).
- Sweep #2 (~2h, 10 mediums quirúrgicos) queda para post-Fase E según instrucción PO.
- Standby a **GO FASE E** (promoción staging→main + smokes prod ampliados con los 2 nuevos de prelaunch + monitor liviano finde).
