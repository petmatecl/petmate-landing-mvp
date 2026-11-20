# Auditoría de analítica — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: inventariar qué se mide hoy con GA4 + custom events + identificar qué falta para medir el funnel real pre-campañas.
**Método**: grep sobre `lib/gtag.ts` + call sites `trackEvent()` en el código vigente (`main @ 0954bbe`). Análisis estático; no se consultó dashboard GA4 real.

---

## Estado actual

### Infraestructura GA4

- **Tracking ID**: `G-SCNG5J67E9` (prod), gated por `NEXT_PUBLIC_APP_ENV === 'production'` (único env var client-side). En staging/preview/dev → `null` → script gtag NO se inyecta → cero data a GA.
- **Consent gate**: `components/ConsentScripts.tsx` controla injección del script via `hasAnalytics` (cookie banner).
- **Page views**: `pageview(url)` dispara `event page_view` en route changes (patrón GA4 canónico — no `config` que reinicia estado).

### Taxonomía de eventos custom (sprint ANALYTICS-1, 2026-08-07)

Union type en [lib/gtag.ts:63-79](../../lib/gtag.ts#L63-L79). **11 eventos** snake_case español + `page_view` base GA4.

#### Lado oferta (proveedor) — 5 eventos

| Evento | Call site | Params | Key event? |
|---|---|---|---|
| `registro_proveedor_iniciado` | [register.tsx:151](../../pages/register.tsx#L151) — click Step 2 proveedor | — | — |
| `registro_proveedor_completado` | [register.tsx:299](../../pages/register.tsx#L299) — POST signup success | — | ⭐ KEY |
| `verificacion_enviada` | [proveedor/index.tsx:1106](../../pages/proveedor/index.tsx#L1106) — submit wizard verificación | — | — |
| `servicio_publicado` | [ServiceFormModal.tsx:993](../../components/Proveedor/ServiceFormModal.tsx#L993) — INSERT servicios_publicados | — | ⭐ KEY |
| `agenda_activada` | [ServiceFormModal.tsx:1001](../../components/Proveedor/ServiceFormModal.tsx#L1001) — toggle F1/F2 guardado | `{familia}` | — |

#### Lado demanda (tutor) — 6 eventos

| Evento | Call site | Params | Key event? |
|---|---|---|---|
| `busqueda_realizada` | [SearchBar.tsx:92](../../components/Home/SearchBar.tsx#L92) — submit / filter apply | `{categoria, comuna}` | — |
| `ficha_vista` | [servicio/[id].tsx:39](../../pages/servicio/%5Bid%5D.tsx#L39) — mount `/servicio/[id]` | `{servicio_id, categoria}` | — |
| `contacto_iniciado` | [ServiceDetailView.tsx:290](../../components/Servicio/ServiceDetailView.tsx#L290) — click chat/whatsapp/teléfono | `{canal}` | ⭐ KEY |
| `reserva_confirmada` | [SolicitarAgendamientoModal.tsx:850,1034](../../components/Servicio/SolicitarAgendamientoModal.tsx) — INSERT estado=confirmada | `{familia: F1\|F2\|legacy}` | ⭐ KEY |
| `solicitud_enviada` | [SolicitarAgendamientoModal.tsx:1280](../../components/Servicio/SolicitarAgendamientoModal.tsx#L1280) — INSERT estado=pendiente | — | — |
| `resena_publicada` | [admin/evaluaciones.tsx:138](../../pages/admin/evaluaciones.tsx#L138) — admin aprueba review | — | — |

#### Social — 1 evento

| Evento | Call site | Params |
|---|---|---|
| `share_click` | [ShareButtons.tsx:96](../../components/Share/ShareButtons.tsx#L96) | `{canal, entidad, entidad_id}` |

### Métrica norte

**Conexiones semanales** = `contacto_iniciado` + `reserva_confirmada`. Indicador de valor generado por la plataforma (ambos lados del funnel demanda cerrando una interacción).

---

## Gaps identificados

### G1 — Sin tracking de registro tutor completado

**Problema**: hay evento `registro_proveedor_completado` (KEY), pero **NO existe `registro_tutor_completado`**. El funnel proveedor está instrumentado; el funnel tutor arranca ciego hasta `ficha_vista` / `contacto_iniciado`.

**Impacto para campañas**: si llega tráfico pagado para tutores, no sabemos cuántos completaron signup vs solo visitaron landings. Sin esto no se puede calcular CAC (costo por adquisición).

**Fix sugerido**: agregar `registro_tutor_iniciado` + `registro_tutor_completado` (KEY) en [register.tsx](../../pages/register.tsx) espejo del flow proveedor. ~15 min.

### G2 — Sin tracking de confirmación email

**Problema**: user se registra, recibe email, confirma. Ese paso **NO tiene event**. Entre `registro_*_completado` y el primer login real pueden quedar hasta 20% users (dato real prod: 25 users en limbo "no-confirmados" de 127 totales, 20% drop-off).

**Impacto**: no sabemos si el drop-off 80→20% confirmación es por emails en spam, UX, o abandono real.

**Fix sugerido**: evento `email_confirmado` en [email-confirmado.tsx](../../pages/email-confirmado.tsx) cuando el user aterriza desde el link del email + token válido. ~10 min.

### G3 — Sin tracking de abandono por step del wizard

**Problema**: el wizard de registro tiene 4 steps (rol → datos → servicio → listo). Hoy solo trackeamos iniciar + completar. Si el 30% abandona en step 3, no lo sabemos.

**Impacto**: el funnel-registro-proveedor-20261120.md identifica Step 3 "cuéntanos sobre tu servicio" como fricción alta (54% de proveedores NO publica después). Sin event por step, no podemos dimensionar.

**Fix sugerido**: `registro_step_completado` con `{step: 1|2|3}` + `{rol: tutor|proveedor}` en cada setStep del wizard. ~20 min.

### G4 — Sin tracking de favoritos

**Problema**: user puede agregar favoritos al estar logueado. Cero evento. No sabemos si users usan la feature.

**Impacto**: si inversión en UX favoritos no mueve engagement, no lo sabemos.

**Fix sugerido**: `favorito_agregado` con `{servicio_id}`. ~5 min.

### G5 — Sin tracking de clicks en resultados de búsqueda

**Problema**: trackeamos `busqueda_realizada` + `ficha_vista`, pero no la conexión: "user busca X → click en resultado Y". Sin esto no sabemos click-through rate del grid de `/explorar`.

**Impacto**: no podemos optimizar ranking del grid (orden más relevantes arriba).

**Fix sugerido**: `resultado_click` con `{posicion, servicio_id, categoria, filtros_activos}`. ~15 min.

### G6 — Sin tracking de abandono del modal reserva

**Problema**: trackeamos `reserva_confirmada`, pero no "abrió el modal y cerró sin confirmar". Fricción en picker F1/F2 es invisible.

**Impacto**: si 40% abre el picker y 10% confirma, los otros 30% son UX blockers que no vemos.

**Fix sugerido**: `reserva_modal_abierto` + `reserva_modal_cerrado_sin_confirmar` con `{servicio_id, familia}`. ~15 min.

### G7 — Sin tracking de respuesta del proveedor a solicitud

**Problema**: trackeamos `solicitud_enviada` (tutor) pero no "proveedor aprobó/rechazó/canceló". Loop de respuesta del proveedor es invisible a GA.

**Impacto**: no sabemos qué % de solicitudes se confirman vs quedan pendientes indefinido.

**Fix sugerido**: `solicitud_respondida` con `{accion: confirmada|rechazada|cancelada, horas_respuesta}` del lado proveedor. ~15 min.

### G8 — Sin tracking de chat intensity

**Problema**: `contacto_iniciado` dispara al primer click, pero no sabemos cuántos mensajes se intercambian ni si la conversación es sustantiva.

**Impacto**: chat que no lleva a reserva es invisible al funnel.

**Fix sugerido**: `mensaje_enviado` con `{conversacion_id_hash, es_primer_mensaje_user: bool}`. ~15 min. **Nota**: NO loguear contenido de mensajes (PII).

### G9 — Sin tracking de session-timeout

**Problema**: user con sesión expirada o cerrada por SessionTimeout queda silente. No sabemos cuánto desgaste de UX produce.

**Impacto**: si N users pierden sesión y abandonan, no lo sabemos.

**Fix sugerido**: `sesion_expirada` (sin PII) al momento del redirect a `/security-logout`. ~10 min.

### G10 — Sin tracking de errores del lado cliente

**Problema**: Sentry captura errores técnicos pero GA4 no sabe. Un user que ve "No se pudieron cargar los servicios" es invisible al funnel.

**Impacto**: errores UX → abandono invisible.

**Fix sugerido**: `error_mostrado` con `{tipo: 'fetch_fail'|'validation'|'otro', surface: 'explorar'|'ficha'|...}`. ~20 min. Complementa Sentry (técnico) con GA4 (funnel-view).

---

## Eventos propuestos nuevos (priorizados)

| # | Evento | KEY? | Esfuerzo | Prioridad pre-campañas |
|---|---|---|---|---|
| 1 | `registro_tutor_iniciado` | — | 10 min | **ALTA** (G1) |
| 2 | `registro_tutor_completado` | ⭐ KEY | 10 min | **ALTA** (G1) |
| 3 | `email_confirmado` | ⭐ KEY | 10 min | **ALTA** (G2) |
| 4 | `registro_step_completado` | — | 20 min | **ALTA** (G3) |
| 5 | `resultado_click` | — | 15 min | **MEDIA** (G5) |
| 6 | `reserva_modal_abierto` | — | 10 min | **MEDIA** (G6) |
| 7 | `reserva_modal_cerrado_sin_confirmar` | — | 10 min | **MEDIA** (G6) |
| 8 | `solicitud_respondida` | — | 15 min | **MEDIA** (G7) |
| 9 | `favorito_agregado` | — | 5 min | BAJA (G4) |
| 10 | `mensaje_enviado` | — | 15 min | BAJA (G8) |
| 11 | `sesion_expirada` | — | 10 min | BAJA (G9) |
| 12 | `error_mostrado` | — | 20 min | BAJA (G10) |

**Total pre-campañas (ítems 1-8)**: ~2 horas. Impacto: funnel completo visible lado tutor + diagnóstico de fricciones específicas.

---

## Configuración GA4 pendiente (dashboard-side, no código)

Además de agregar eventos, el PO debe configurar en GA4:

### D-GA-1 — Mark as key event

Hoy están marcados como KEY: `registro_proveedor_completado`, `servicio_publicado`, `contacto_iniciado`, `reserva_confirmada`. Agregar al listado (cuando se implementen los nuevos):
- `registro_tutor_completado`
- `email_confirmado`

### D-GA-2 — Custom dimensions

Para que GA4 permita filtrar por custom dimension en reports, hay que registrar los params en Admin → Custom Definitions → Custom Dimensions. Hoy no se ha hecho; los params se mandan pero no se pueden pivotear.

Dimensiones a registrar pre-campañas:
- `categoria` (de busqueda_realizada, ficha_vista).
- `comuna` (de busqueda_realizada).
- `canal` (de contacto_iniciado).
- `familia` (de reserva_confirmada).
- `posicion` (de resultado_click cuando se agregue).
- `step` (de registro_step_completado cuando se agregue).

**Esfuerzo**: ~15 min en GA4 dashboard.

### D-GA-3 — Audiences

Hoy GA4 tiene audiencias default (all users, purchasers, etc.). Crear audiencias custom:

- "Tutores no confirmados" → users con `page_view` sin `email_confirmado` en 48h.
- "Proveedores sin publicar" → users con `registro_proveedor_completado` sin `servicio_publicado` en 7d.
- "Ficha vista sin contacto" → users con `ficha_vista` sin `contacto_iniciado` en misma sesión.

Permite segmentar reports + habilita remarketing cuando se active Google Ads.

**Esfuerzo**: ~30 min dashboard.

### D-GA-4 — Attribution model

Default GA4 es "Data-driven" (requiere volumen). Pre-campañas con tráfico bajo, cambiar a "Last click" para claridad. Post-campañas con tráfico sostenido, volver a "Data-driven".

**Esfuerzo**: 2 min dashboard.

### D-GA-5 — Exclusion list

Excluir del tracking:
- IPs del PO (desktop + móvil).
- IPs de test.
- Referidos internos (ej. links de PRs).

**Esfuerzo**: ~10 min dashboard. **Ya detectado en sprint cue-1-sentry-user** (filtro `user.id` del PO como fuente de falsos positivos).

---

## Hallazgos complementarios

### H-1 — Consent gate vigente

El flujo de consent via `ConsentScripts.tsx` + cookie banner está vigente. Users que **rechazan consent** no son trackeados. Proporción desconocida (verificar en GA4 Admin → Consent).

### H-2 — Gate a prod estricto

En staging/preview, `GA_TRACKING_ID = null` → zero data contaminante. ✅ Correcto (sprint PRELAUNCH-1 PL2).

### H-3 — pageview GA4-canónico

Patrón correcto: `gtag('event', 'page_view', {...})` en vez de `gtag('config', ...)` que reinicia estado. ✅ Sprint ga4-fix 2026-08-14 cerró este bug.

### H-4 — Sin Google Ads conversion tracking

Hoy GA4 tiene los events; cuando se active Google Ads, hay que **vincular** la cuenta de Ads a GA4 y marcar los KEY events como conversion goals. Setup: 20 min + 48h de data warming.

---

## Sugerencia de rutina de análisis para el PO

### Semanal (15 min)

- **GA4 → Reports → Engagement → Events**: comparar count semanal de los 4 KEY events.
- **GA4 → Explore → Funnel Exploration**: funnel tutor (page_view → registro_tutor_completado → email_confirmado → ficha_vista → contacto_iniciado).
- **Realtime (si campañas activas)**: ver tráfico actual.

### Mensual (1h)

- **Audiences dashboard**: analizar comportamiento de "Tutores no confirmados" vs "Tutores confirmados".
- **Comparación semana a semana** de conexiones semanales (métrica norte).

### Post-campaña (ventana ad-hoc)

- **Acquisition reports**: canal que trajo users (Organic Search, Direct, Social, Ads).
- **Landing page performance**: qué landings tienen mayor CTR a ficha.

---

## Decisiones pendientes del PO

### D1. Sprint de instrumentación pre-campañas

**Pregunta**: ¿autorizás sprint de ~2h para aterrizar los 8 eventos de prioridad ALTA/MEDIA (G1-G8)?

**Recomendación**: sí. Con 2h se cierra el funnel tutor completo + 4 gaps críticos. Habilita decisiones data-driven durante campañas.

**Impacto si no se decide**: default = funnel tutor queda ciego durante campañas iniciales.

### D2. Custom dimensions en dashboard GA4

**Pregunta**: ¿autorizás pasada de 15 min en GA4 Admin para registrar los 6 custom dimensions?

**Recomendación**: sí. Sin esto, los params `categoria`/`comuna`/`canal`/`familia`/etc. que YA mandamos no se pueden pivotear en reports.

**Impacto si no se decide**: default = reports agrupan por evento sin diferenciar params.

### D3. Audiences custom pre-campañas

**Pregunta**: ¿valide crear las 3 audiences propuestas pre-campañas?

**Recomendación**: sí. Habilita remarketing cuando se active Google Ads + mejora análisis de funnel.

**Impacto si no se decide**: default = solo audiencias default.

### D4. Google Ads integration timing

**Pregunta**: ¿cuándo se activa Google Ads? Determina cuándo vincular GA4 con Ads + marcar conversion goals.

**Recomendación**: marcar en calendar "Pre-activar campañas → 24h antes, verificar integration Ads↔GA4 OK".

**Impacto si no se decide**: default = setup Ads reactivo al momento de arrancar.

### D5. Exclusion list del PO

**Pregunta**: ¿quieres que el auditor arme las IPs del PO para excluir? Requiere que PO comparta sus IPs actuales.

**Recomendación**: el PO comparte sus IPs (desktop + móvil con WiFi típico) → auditor documenta + PO configura en GA4.

**Impacto si no se decide**: default = tráfico del PO cuenta como "usuario real" (10% ruido en volumen bajo).

---

## Firma

Este doc complementa `funnel-registro-proveedor-20261120.md` + `funnel-contacto-tutor-20261120.md` + `monitoreo-24h-post-launch.md`. Los 4 docs juntos forman el set completo "cómo medir Pawnecta" pre-campañas.
