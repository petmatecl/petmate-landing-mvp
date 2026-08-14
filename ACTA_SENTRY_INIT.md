# ACTA Sprint `sentry-init` — cierre estructural R3 SENTRY-1

**Rama**: `sentry-init` (base `main @ 7a9ee19`).
**SHAs**: `4bf684b` (rename client) → `b77c02e` (archivos adicionales por commit parcial) → `b1cc840` (P1.1 en CLAUDE.md).
**Tag prod**: `sentry-init-prod-20260814` sobre `main @ b1cc840`.
**Fecha ejecución**: 2026-08-11 (código) → 2026-08-14 (promoción a prod).
**Estado**: **PROMOVIDO A PROD** — pendiente única verificación end-to-end del PO con dashboard Sentry. Si el evento aparece con tag `smoke=true`, R3 SENTRY-1 cierra tras **4 iteraciones**.

---

## 1. La partición completa como una sola historia — caso de estudio

R3 SENTRY-1 se promovió a prod en **cuatro iteraciones** entre el 2026-08-11 y 2026-08-14. Cada una arregló una capa distinta del pipeline; cada una era correcta y necesaria para su capa; ninguna de las tres primeras tocaba la capa base que rompía todo el sistema. La historia lineal:

| Iteración | Sprint | Tag prod | Capa fixeada | Estado post-merge |
|---|---|---|---|---|
| 1 | `sentry-1` | `sentry-1-prod-20260811` | Base setup — install, 3 configs, gate, scrub PII, endpoint smoke, spec | Aparente "verde" — smoke server-side reportaba `sent: true` |
| 2 | `sentry-csp` | `sentry-csp-prod-20260811` | CSP header (`connect-src`) — bloqueaba envelopes cliente | Post-fix CSP, PO ejecuta fetch prod: `sent: true, eventId: <uuid>` pero dashboard vacío |
| 3 | `sentry-flush` | `sentry-flush-prod-20260811` | Flush ausente antes de `res.json()` + `integrations:[]` mataba defaults core | Post-fix flush, PO ejecuta fetch: `sent: true, flushed: false` — P8 exponía honestamente el fallo |
| 4 | `sentry-init` | `sentry-init-prod-20260814` | **Capa base** — `instrumentation.ts` faltaba desde el día uno; `Sentry.init()` server NUNCA corría | Preview: `sdk_initialized: true` en runtime real. Post-merge prod: pendiente confirmación PO |

**El diagnóstico correcto llegó en la 4ª iteración**, cuando el PO forzó pipeline completo antes del siguiente parche. Todos los fixes previos (CSP, flush, defaults) eran correctos pero enmascarados en cascada — mientras el CSP bloqueaba, el flush no importaba; mientras el flush timeouteaba, los defaults no importaban; y mientras `Sentry.init()` server nunca corriera, ningún fix aplicado server-side podía tener efecto observable.

### 1.1 El aprendizaje operativo del caso

**Cuando un sistema no funciona post-fix N y los síntomas son consistentes (misma señal apagada), diagnosticar el pipeline COMPLETO de punta a punta antes del fix N+1**. Los parches en cascada consumen tiempo (~4h aquí) y ocultan la raíz. La ruta más rápida a un fix definitivo NO es el parche siguiente al síntoma visible, es el mapeo exhaustivo de las capas del sistema y la verificación individual de cada una.

El PO forzó esto al mensaje pre-sentry-init: **"llevamos tres fixes en esta feature (CSP, flush, integrations) y ninguno la puso a funcionar. Antes de proponer el cuarto, quiero un diagnóstico completo del pipeline de punta a punta"**. Ese fue el punto de inflexión. Cinco minutos de `grep` en el source del SDK revelaron `webpack.js:311` con la respuesta: `"An instrumentation file is required for the Sentry SDK to be initialized on the server"`.

### 1.2 El warning venía en stderr desde el día uno

El bug tenía firma explícita en el output del build desde el primer merge `sentry-1-prod-20260811`. Nadie lo leyó por leer `tail -3` del output. Uno de los warnings del sprint sentry-init decía literalmente `ACTION REQUIRED` — el build **llevaba semanas pidiendo cosas que nadie leía**. La enmienda `P1.1` (aprobada 2026-08-14, escrita en CLAUDE.md) codifica el fix estructural: pipe `npm run build > file 2>&1 && grep -iE 'warning|deprecat|action required|<sdk-name>' file` como paso obligatorio en cualquier sprint que toque config de una biblioteca externa.

## 2. Fix aplicado (SHAs `4bf684b` → `b77c02e` → `b1cc840`)

### 2.1 `instrumentation.ts` en la raíz

Punto de entrada que Next 15 requiere para cargar los configs server/edge:
```ts
export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config');
    if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config');
}
export const onRequestError = ...  // captureRequestError para gSSP/API auto
```

### 2.2 Migración `sentry.client.config.ts` → `instrumentation-client.ts`

`git mv` preserva historia. Cierra deprecation warning que anticipaba muerte del path viejo con Turbopack.

### 2.3 Hook `onRouterTransitionStart` en instrumentation-client

Cierra warning `ACTION REQUIRED` de Sentry v10 sobre instrumentar navegaciones cliente:
```ts
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

### 2.4 `disableLogger` → `webpack.treeshake.removeDebugLogging` en next.config.js

Cierra deprecation warning de opción migrada.

### 2.5 Introspección real del SDK en el endpoint smoke

Reemplazo de `dsn_configured` (proxy débil sobre env var) por 4 señales de la fuente de verdad `Sentry.getClient()`:
- `sdk_initialized`: `getClient() !== undefined` — expone el bug estructural directo.
- `client_enabled`: `options.enabled === true` — refleja el gate real del SDK.
- `dsn_configured_in_client`: `!!options.dsn` — DSN cargado en el client.
- `dsn_env_var_set`: `!!process.env.NEXT_PUBLIC_SENTRY_DSN` — informativo (el proxy previo, ahora etiquetado explícitamente como env-only).

## 3. `git add` con pathspec inexistente que falló en silencio — bug de la misma familia

Durante el commit inicial del sprint, ejecuté:
```bash
git mv sentry.client.config.ts instrumentation-client.ts   # OK
git add sentry.client.config.ts pages/api/... otros archivos  # pathspec 1 inexistente
git commit -m "..."
```

El `git add` emitió `fatal: pathspec 'sentry.client.config.ts' did not match any files` pero **NO retornó exit code no-cero** en el shell script (o el error se procesó como warning). El `git commit` siguió, tomó solo lo que ya estaba en el índice pre-fallo (el rename detectado por `git mv`), y creó un commit parcial con **solo 1 archivo cambiado (0 insertions, 0 deletions)** — el rename puro sin los edits reales del sprint. Los otros 5 archivos modificados quedaron en el working tree, invisibles al commit histórico.

**Detectado por `git status --short` post-commit**. Fix con segundo commit reparador (`b77c02e`) que agregó los 5 archivos que quedaron fuera.

**Lectura**: es exactamente el mismo patrón que arrastramos toda la sesión. Un comando que "corrió" (exit code OK), no devolvió error visible (fatal→warning), y no hizo lo que se creía. Familia:
- `npm run build` exit 0 con `ACTION REQUIRED` en stderr → 3 iteraciones perdidas.
- `Sentry.captureException()` sync devuelve event ID → 2 iteraciones creyendo que se enviaba.
- `sdk_initialized: true` sin verificar `getClient()` → smoke daba señal falsa.
- `git add pathspec-inexistente` fatal→warning → commit parcial invisible.

Los 4 son variantes de **"la interfaz reportó éxito, el efecto no ocurrió"**. P8 codifica el principio (smoke debe medir el efecto observable, no la señal del emisor). Este bug del `git add` es una instancia del mismo principio aplicado a herramientas de dev. **No es anécdota — es evidencia del patrón**.

Deuda light anotada en BACKLOG.md: helper `git-commit-verify` que valida `git status --short` post-commit contra lista esperada. Post-launch, sin urgencia.

## 4. Verificación

### 4.1 Build P1 con output COMPLETO (P1.1 aplicado)

Post-sprint: `grep -iE "\[@sentry" build.log` = **0 matches** ✅. Los 4 warnings originales cerrados:
- `Could not find a Next.js instrumentation file` → creado `instrumentation.ts`.
- `sentry.client.config.ts DEPRECATED` → renombrado.
- `ACTION REQUIRED: onRouterTransitionStart hook` → agregado.
- `DEPRECATION: disableLogger` → migrado.

### 4.2 Preview `sentry-init` — 5/5 tests

```
ok 1 [setup] authenticate as proveedor (3.2s)
ok 2 [chromium] 1) CSP header contiene el ingest de Sentry (439ms)
ok 3 [chromium] 2) navegador alcanza el ingest sin CSP block (841ms)
ok 4 [chromium] 3) endpoint server reporta gate correcto (complementario) (1.9s)
    [sentry-smoke server-side] {
      "sent": false, "flushed": false, "eventId": null,
      "gate": {
        "env": "preview", "enabled": false,
        "dsn_env_var_set": false, "dsn_configured_in_client": false,
        "sdk_initialized": true,  ← ¡EL BUG ESTRUCTURAL CERRADO!
        "client_enabled": false
      }
    }
ok 5 [chromium] 4) defaults integrations activos en el cliente (827ms)

5 passed (5.3s)
```

**`sdk_initialized: true` en preview con gate cerrado** — evidencia dura de que `Sentry.init()` server-side ahora corre en runtime real. La assertion `expect(body.gate.sdk_initialized).toBe(true)` es la que hubiera atrapado el bug de las 3 iteraciones anteriores.

### 4.3 Prod post-merge

**Merge FF ejecutado**: `main 7a9ee19 → b1cc840` (fast-forward limpio, 6 files, 157 insertions/37 deletions).

**Deploy verificado**: buildId `WMS0_l5AYALISruzk0y1T → hqawUl5ieOeiTfOmE9kzx`.

**Smokes prod S1-S7**: 10/10 → 200 ✅. Regresión previas intactas (`/mis-solicitudes → 308`, bots → 403 WAF).

**Test 1 CSP curl regresión**: `connect-src` sigue conteniendo `*.ingest.us.sentry.io` ✅.

**Endpoint prod desplegado**: `POST /api/admin/sentry-smoke` sin auth → 401 (guard OK).

### 4.4 Verificación end-to-end pendiente en cancha del PO

Guard e2e bloquea Playwright contra prod por diseño. El PO ejecuta desde su consola con sesión admin prod. **Fetch pegable actualizado con el shape nuevo de 6 señales**:

```js
(async () => {
  const t = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!t) return console.error('Inicia sesión como admin primero');
  const jwt = JSON.parse(t[1]).access_token;
  const r = await fetch('/api/admin/sentry-smoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` }
  });
  const b = await r.json();
  console.log('[sentry-smoke]', b);
  const g = b.gate;
  const allGreen = b.sent && b.flushed && g.sdk_initialized && g.client_enabled && g.dsn_configured_in_client && g.env === 'production';
  if (allGreen) {
    console.log(`✅ 6/6 señales verdes. Evento eventId=${b.eventId} debe aparecer con tag smoke=true en https://sentry.io/organizations/pawnecta/issues/?project=javascript-nextjs en <30s`);
  } else {
    console.error('❌ alguna señal falló — inspecciona gate:', g);
    console.log('  sent:', b.sent, '· flushed:', b.flushed);
    console.log('  sdk_initialized:', g.sdk_initialized, '· client_enabled:', g.client_enabled);
    console.log('  dsn_configured_in_client:', g.dsn_configured_in_client, '· dsn_env_var_set:', g.dsn_env_var_set);
  }
})();
```

Response esperada en prod: `{sent:true, flushed:true, eventId:"<uuid-hex-32>", gate:{env:"production", enabled:true, dsn_env_var_set:true, dsn_configured_in_client:true, sdk_initialized:true, client_enabled:true}}` + evento con tag `smoke=true` en dashboard Sentry en <30s. Ese es el cierre canónico R3 con **efecto observable** (P8) — no proxy, no señal del emisor.

## 5. Reglas nuevas del ciclo — codificadas en CLAUDE.md

- **P8** (REGLA PERMANENTE) — smoke debe ejercitar camino del usuario Y verificar efecto observable. Codificada 2026-08-11 en `sentry-flush`.
- **P9** (REGLA PERMANENTE) — apagar capacidades por nombre sin verificar defaults desactiva la funcionalidad, no la acota. Codificada 2026-08-11 en `sentry-flush`.
- **P1.1** (enmienda REGLA PERMANENTE) — output completo del build, no solo exit code, cuando se agrega una biblioteca nueva. Codificada 2026-08-14 en `sentry-init`.
- **Convención comunicación**: una sola respuesta final por tarea. Codificada 2026-08-11.
- **Anti-voseo también aplica al OUTPUT del auditor al PO**. Codificada 2026-08-11.
- **Convención longitud de nombres de rama** (≤18 chars por DNS label 63). Codificada 2026-08-11 en `sentry-csp`.

## 6. Deuda light anotada en BACKLOG

- Helper `git-commit-verify` que valida `git status --short` post-commit — mismo patrón que P8, aplicado al ciclo de dev.
- Migrar endpoints API a `wrapApiHandlerWithSentry()` de v10 (condicionado a verificación end-to-end del PO — si el evento aparece en dashboard, se prioriza; si no, se investiga primero el helper).
- Homologar look-and-feel de toasts/popups (pedido PO 2026-08-11).
- DMARC `rua` propio (deuda menor).
- Íconos específicos por campo en "Información del servicio" (pedido PO 2026-07-31, asignado a Sweep #2).
- Notificaciones a admin de solicitudes pendientes (pedido PO 2026-08-11, alto ROI pre-lanzamiento).

## 7. Cierre técnico del frente Sentry — el próximo paso es el pre-lanzamiento

R3 SENTRY-1 completo en 4 iteraciones. Si el smoke end-to-end del PO confirma el evento en dashboard, se paran los sprints del frente técnico y el próximo trabajo es ordenar el pre-lanzamiento (priorización del PO sobre `BACKLOG.md > PEDIDOS DIRECTOS DEL PO` + `## Deuda técnica / pulido`).

## 8. Referencias

- SHAs: `4bf684b` (rename client via git mv) → `b77c02e` (archivos adicionales por commit parcial) → `b1cc840` (P1.1 en CLAUDE.md).
- Rama: `sentry-init` (base: `main @ 7a9ee19`; 11 chars → subdominio 56 chars ✅).
- Suite gate.spec.ts preview: 5 passed (5.3s).
- Smokes prod: 10/10 rutas + regresión intacta + Test 1 CSP passed + endpoint 401 OK + Sentry warnings 0/0.
- Tags relacionados: `sentry-1-prod-20260811` → `sentry-csp-prod-20260811` → `sentry-flush-prod-20260811` → `sentry-init-prod-20260814`.
- Reglas aplicadas: **P1.1** (output completo build), **P3** (branch verificada), **P5** (esta acta), **P6** (introspección real getClient() vs proxy env var), **P7** (fechas correctas), **P8** (smoke ejercita efecto observable — assertion `sdk_initialized: true` es el ejemplo canónico), **una sola respuesta final** (aplicada en todos los reportes desde 2026-08-11), **anti-voseo output-al-PO** (aplicada al fetch pegable de este sprint).
