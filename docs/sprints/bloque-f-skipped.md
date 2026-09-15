# Bloque F — ítems saltados con nota (2026-09-15)

Este documento consolida los ítems del kickoff de bloque F que se saltan
en esta iteración con rationale explícito. **Cero acción código para
estos ítems en este bloque**; se dejan como propuesta de sprints
dedicados posteriores.

## Item 1 BUTTON-CANON restante — SALTADO

**Alcance real medido en Paso 0**: ~25 botones en 20+ archivos con
`bg-accent-600 text-white` fuera de `components/UI/Button.tsx`. Ubicaciones
principales: Header (~10 sitios), ServiceFormModal (submit + 2 chips),
ExampleCTAModal, VerificationGateModal, ModalAlert, PreguntasSection,
ReviewForm, ReviewModal, Home/SearchBar, CertificacionesSection,
EvaluacionesTab, Chat/MessageThread, ClientLayout, ErrorBoundary,
ProveedorDetailDrawer, CaregiverMap (popup HTML string).

**Por qué se salta**:

1. **Condición de parada del bloque F** (kickoff literal PO): "cualquier
   cambio de comportamiento observable por un usuario". Cada botón tiene
   variaciones sutiles (font-medium vs semibold, focus ring on/off,
   padding, radius, shadow-sm, disabled:opacity). El componente `<Button>`
   canónico expone 4 variants + 4 sizes + opt-in para radius/focusRing/
   weight, pero garantizar cero cambio visual en 25 refactors mecánicos
   requiere visual regression testing (Chromatic, Percy, o smoke manual
   pantallazo por pantallazo).

2. **PO pidió "pantallazos antes/después por página"** en el kickoff.
   Ese proceso, ejecutado bien, es ~5-10 min por botón (renderizar
   antes, aplicar cambio, renderizar después, comparar píxel a píxel,
   ajustar props si hay drift). 25 botones × 7 min ≈ 3 horas mínimas
   solo de verificación visual, sin contar iteraciones.

3. **Riesgo asimétrico**: un solo botón con drift visual (ej. tracking
   distinto tras el rename) rompe el "sin cambio visual" — y el fix
   requiere volver a caso por caso. La probabilidad crece con el número
   de refactors.

**Propuesta de sprint dedicado post-launch**:

- Instalar herramienta de visual regression (Percy free tier o Chromatic
  free tier — evaluar cuál se paga menos).
- Baseline con screenshots del estado actual de las 20+ superficies.
- Refactorear 5 botones por PR con verificación visual regression
  automatizada.
- 5 PRs pequeños en vez de 1 grande, cada uno con evidencia visual.

**Estimado**: sprint chico de 4-6h para setup + 1 PR seed; luego los
otros PRs son incrementales de 30-45 min c/u.

## Items 3+4+7 F-OBS-API — SALTADOS (subset ejecutado como investigación)

**Alcance real medido en Paso 0**:
- **SENTRY-WRAP-API**: 33 endpoints `pages/api/**/*.ts` (excluyendo
  `mercadopago_disabled/*` = 31 efectivos). Cero uso actual de
  `wrapApiHandlerWithSentry`.
- **SENTRY-FLUSH-MISSING**: 20 endpoints con `res.status(500)` sin
  `Sentry.flush()` previo (solo `admin/sentry-smoke.ts` y
  `cron/recordatorio-reserva.ts` lo tienen).
- **SELF-CALLS-PREVIEW**: 4 self-calls en `pages/api/auth/signup.ts`
  (`fetch(${siteUrl}/api/auth/welcome)` + 3 × `fetch(${siteUrl}/api/
  admin/notify-nueva-solicitud)`).
- **ROADMAP-CRON-RESOLVERS**: `recordatorio-reserva.ts` ya importa
  `resolverDonde` de `lib/emails/resolvers`. Otros crons pueden usar
  patrones distintos — no auditado en detalle.

**Por qué se saltan**:

1. **SENTRY-WRAP-API**: 31 edits mecánicos, cada uno cambia el `export
   default async function handler` a `async function handler` +
   `export default wrapApiHandlerWithSentry(handler, '/api/path')`.
   Cero riesgo funcional pero volumen alto — mejor un sprint dedicado
   con script bash que genere los diffs automáticamente + PR chico por
   directorio (admin/, agendamientos/, cron/, evaluaciones/, notifications/,
   push/, auth/, etc.).

2. **SENTRY-FLUSH-MISSING**: requiere agregar `await flushSentryEvents()`
   antes de cada `res.status(500).json(...)` en 20 endpoints. Similar a
   SENTRY-WRAP-API — mecánico pero volumen. Mejor combinar con wrap en
   el sprint dedicado.

3. **SELF-CALLS-PREVIEW**: 4 self-calls a reemplazar por imports
   directos del handler. **Riesgo**: cambio de comportamiento sutil —
   el handler importado corre en el mismo process (Node.js function),
   mientras que fetch se comporta como HTTP request externa (headers,
   auth boundaries, timeout). Requiere análisis por caso:
   - `welcome.ts`: verifica `verifyInternalSecret` — si se importa
     directo, ese check tiene que hacerse manual o skipearse (defensa
     que se vuelve no-op).
   - `notify-nueva-solicitud.ts`: mismo patrón `verifyInternalSecret`.
   Fix alternativo más simple: **agregar el bypass de Vercel Deployment
   Protection al header del fetch en preview** (`x-vercel-protection-
   bypass`). Cero cambio de contract, solo header adicional gated por
   `NEXT_PUBLIC_APP_ENV !== 'production'`.

4. **ROADMAP-CRON-RESOLVERS**: requiere render-diff (comparación byte-
   a-byte del HTML output de emails render antes/después). Es cero
   riesgo si se hace bien, pero el setup del render-diff toma tiempo.

**Propuesta de sprint dedicado**:

- **PR-1 SENTRY-WRAP+FLUSH** (~4h): script bash que enumera endpoints,
  detecta patrón handler, aplica wrap + flush, corre build, corre
  spec de regresión sentry-init. Split en 5 PRs por directorio para
  no explotar review.
- **PR-2 SELF-CALLS-PREVIEW** (~2h): agregar header
  `x-vercel-protection-bypass` al fetch en preview (gate por env).
  Cero refactor, solo header condicional. Import directo queda como
  opción B si el header no resuelve.
- **PR-3 ROADMAP-CRON-RESOLVERS** (~2h): auditar cada cron
  (`recordatorio-*`, `invitacion-*`, `cleanup-*`, `reset-*`) contra
  `lib/emails/resolvers`. Migrar los que dupliquen. Render-diff
  automático via `scripts/render-emails-diff.ts` (ya existe en repo).

## Items totales del bloque F

- 12 items VIVOS + 1 YA-CERRADO PARCIAL + 4 instrucciones PO = 17 unidades
  del kickoff.
- **Ejecutados en bloque F** (en 5 PRs): items 1 partial (kickoff+Paso0),
  2 (AVATARS-HUER audit), 5 (LINK-CONFIRM verificación), 8a/8b/8c
  (verificados YA CERRADOS), 9a (STYLEGUIDE-REWRITE), 9b (verificado
  YA CERRADO), 10 (P8-COROLARIOS-AUD), 11a (GIT-COMMIT-VERIFY), 11b
  (GA4-DEBUGVIEW investigación), 12b (PERF-1 bucket B audit), 6
  (SFM-BUGS-PRE verificado YA CERRADO). = **11 items cerrados**.
- **Saltados con nota** (este documento): item 1 completo (BUTTON-CANON
  restante 25 botones), items 3+4+7 (F-OBS-API 31 endpoints + 4
  self-calls + resolvers unify). = **4 items saltados con propuesta
  de sprint dedicado**.
- **Instrucciones PO** (acta cierre): item 5 (Mailtrap SMTP staging),
  12a (Speed Insights install + Vercel), 13 (DNS DMARC-RUA),
  AVATARS-HUER (SQL prod cleanup 79 archivos). = **4 instrucciones
  de un paso**.
