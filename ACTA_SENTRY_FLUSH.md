# ACTA Sprint `sentry-flush` — flush + defaults integrations + drift CLAUDE.md

**Rama**: `sentry-flush` (base `main @ 3fd0d0d`).
**SHAs**: `e3a28a5` (fix flush + integrations) → `5526c02` (CLAUDE.md P8 + regla comm + drift 3 batches).
**Tag prod**: `sentry-flush-prod-20260811` sobre `main @ 5526c02`.
**Fecha ejecución**: 2026-08-11.
**Estado**: **PROMOVIDO A PROD** — pendiente única verificación end-to-end del PO (fetch en consola + evento con tag `smoke=true` en dashboard Sentry).

---

## 1. Los 3 bugs superpuestos en la misma feature

R3 SENTRY-1 salió a prod con **cero errores client-side llegando a Sentry** durante múltiples horas, por 3 bugs simultáneos que se enmascararon entre sí:

**Bug #1 — CSP block** (hotfix `sentry-csp`, 2026-08-11): `connect-src` no incluía `*.ingest.us.sentry.io`. El navegador cortaba todos los envelopes con "Refused to connect". Server (Node.js sin CSP) enviaba OK — smoke server-side reportaba `sent:true` correctamente. Fix: agregar el ingest a `connect-src`.

**Bug #2 — Flush ausente** (este sprint): post-CSP, el smoke server-side pegado desde consola por el PO devolvía `{sent:true, eventId:<uuid>}` pero el evento no aparecía en dashboard. `Sentry.captureException()` v10 es **síncrona** y devuelve un eventId sintético inmediato — el envío HTTP al ingest es async y buffered por el transport. Sin `await Sentry.flush(timeoutMs)` antes de `res.json()`, la Vercel Function termina con la cola sin drenar y el envelope se pierde silente. Fix: helper compartido `lib/sentryServer.ts:flushSentryEvents(2000)` aplicado al smoke.

**Bug #3 — `integrations:[]` mataba los defaults core del SDK v10** (este sprint, hallazgo secundario): la config original de R3 pasaba `integrations: []` explícito en los 3 configs (client/server/edge) — pedido del coordinador para "acotar cuota". El efecto real: se apagaron los **defaults core** que Sentry v10 incluye out-of-the-box, incluyendo:
- `globalHandlersIntegration()` — captura `window.onerror` + `unhandledRejection` **automáticamente**. Sin esto, Sentry solo recibía `Sentry.captureException(...)` manuales — que en el repo son **cero desde client-side** → cero errores prod capturados aunque el CSP y el flush estuvieran perfectos.
- `browserApiErrorsIntegration()` — envuelve `setTimeout`/`setInterval`/`addEventListener` para capturar throws async.
- `breadcrumbsIntegration()` — trail de console/DOM/xhr/fetch previos al error, esencial para debugging.
- `dedupeIntegration()`, `inboundFiltersIntegration()`, `linkedErrorsIntegration()`, `httpContextIntegration()`.

Verificación del hallazgo: `node_modules/@sentry/browser/build/npm/esm/prod/sdk.js:getDefaultIntegrations()`. **BrowserTracing NO está en defaults v10** (solo se carga cuando lo pedís explícito via `Sentry.browserTracingIntegration()`). **Replay NO está en defaults v10**. Los pesados que preocupan por cuota NO están en la lista default — el `integrations:[]` no protegía cuota, mataba la funcionalidad principal.

Fix: **remover** `integrations: []` de los 3 configs. Con `tracesSampleRate:0` + `replaysSessionSampleRate:0` + `replaysOnErrorSampleRate:0`, la cuota alta sigue apagada aunque los defaults core estén activos.

Los 3 bugs se enmascararon en cascada: mientras el CSP bloqueaba, el flush y las integrations no importaban porque nada salía. Post-fix CSP, apareció el flush. Post-fix flush, hubiera aparecido `integrations:[]` en el próximo `captureException` client-side real — pero como en el repo no hay ninguno, hubiera sido silente para siempre hasta el primer error prod (potencialmente meses).

## 2. Fix implementado (SHA `e3a28a5`)

### 2.1 Helper compartido `lib/sentryServer.ts`

```ts
export async function flushSentryEvents(timeoutMs = 2000): Promise<boolean> {
    try {
        return await Sentry.flush(timeoutMs);
    } catch {
        return false;  // swallow — no romper response al user
    }
}
```

Retorna `true` = cola drenó, `false` = timeout. Diseñado para llamarse con `await` antes de `res.json()`. Nunca rechaza (no crea unhandledRejection). Base para el futuro wrapper `wrapApiHandlerWithSentry` de v10 documentado en BACKLOG.

### 2.2 Aplicación al smoke

[pages/api/admin/sentry-smoke.ts](pages/api/admin/sentry-smoke.ts) ahora:
1. Captura excepción.
2. Si `sent` es true, `await flushSentryEvents(2000)`.
3. Retorna `{sent, flushed, eventId, gate, timestamp}` — `flushed` es la señal observable de que la cola drenó en la red.

### 2.3 Barrido del repo — solo 1 caller server-side hoy

```
grep -rn "Sentry\.captureException\|Sentry\.captureMessage" pages/api/ lib/ pages/api/cron/
→ solo pages/api/admin/sentry-smoke.ts:45 (el propio smoke)
```

Cero en cron, cero en lib/, cero en otros endpoints API. El helper queda listo — el próximo endpoint que capture server-side no nace con el bug latente.

### 2.4 Path browser + unload — SDK v10 auto-flushea, sin pérdida equivalente

Verificado en `node_modules/@sentry/browser/build/npm/esm/prod/client.js` línea 27: `BrowserClient` registra automáticamente un listener `visibilitychange` que llama `this.flush()` cuando la página se oculta. El transport usa `keepalive`/`navigator.sendBeacon` implícito para envelope-during-unload. `sendClientReports: true` es default. **No requiere fix client-side**.

### 2.5 Restaurar defaults integrations (los 3 configs)

`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — removida la línea `integrations: []`. Comentarios inline explican qué defaults se activan y por qué los pesados (BrowserTracing/Replay) siguen apagados por los `sampleRate:0`.

## 3. Verificación

### Preview `sentry-flush` — 5/5 tests

```
ok 1 [setup] authenticate as proveedor (3.2s)
ok 2 [chromium] 1) CSP header contiene el ingest de Sentry (586ms)
ok 3 [chromium] 2) navegador alcanza el ingest sin CSP block (988ms)
ok 4 [chromium] 3) endpoint server reporta gate correcto (2.8s)
    [sentry-smoke server-side] {
      "sent": false, "flushed": false, "eventId": null,
      "gate": {"env": "preview", "enabled": false, "dsn_configured": false}
    }
ok 5 [chromium] 4) defaults integrations activos en el cliente (982ms)

5 passed (6.9s)
```

Response ahora incluye `flushed`. Preview con gate cerrado: `flushed: false` (correcto — Sentry init es no-op con `enabled:false`, no hay cola que drenar).

### Prod post-merge

**Merge FF ejecutado**: `main 3fd0d0d → 5526c02` (fast-forward limpio, 7 files, 200 insertions/25 deletions).

**Deploy verificado**: buildId `UUWwRTworeYnTal9xAgfD → jDkcrds5xb-lLNzeK1wG4`.

**Smokes prod S1-S7**: 10/10 → 200 ✅. Regresión previas intactas (`/mis-solicitudes → 308`, bots → 403 WAF).

**Test 1 CSP curl regresión**: `connect-src` en prod sigue conteniendo `*.ingest.us.sentry.io` ✅ (hotfix sentry-csp intacto).

**Endpoint smoke prod desplegado**: `POST /api/admin/sentry-smoke` sin auth → 401 (guard OK).

### Verificación end-to-end pendiente en cancha del PO

El auditor NO puede correr el smoke gate-abierto contra prod (guard e2e lo bloquea por diseño — regla del proyecto: e2e con cuentas staging no deben pegar prod). Verificación end-to-end la ejecuta el PO desde su consola con sesión admin prod. **Fetch pegable (corregido de voseo)**:

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
  if (b.sent && b.flushed) {
    console.log(`✅ evento eventId=${b.eventId} debe aparecer con tag smoke=true en https://sentry.io/organizations/pawnecta/issues/?project=javascript-nextjs en <30s`);
  } else {
    console.error(`❌ sent:${b.sent} flushed:${b.flushed}`, b.gate);
  }
})();
```

Response esperada: `{sent:true, flushed:true, eventId:"<uuid-hex-32>", gate:{env:"production", enabled:true, dsn_configured:true}}`. Y evento con tag `smoke=true` en dashboard Sentry en <30s (efecto observable — cierra R3 según P8).

## 4. Aprendizajes codificados (SHA `5526c02`)

### 4.1 P8 (REGLA PERMANENTE) — smoke debe ejercitar camino + verificar efecto observable

Escrito en `CLAUDE.md > Workflow`. Cubre ambas fallas de R3 SENTRY-1: Falla A (path server vs client) + Falla B (eventId sintético sin ingesta). Pregunta canónica: **"si esta assertion pasa, ¿qué es exactamente lo que quedó probado?"** — si la respuesta es "que la librería aceptó la llamada", no alcanza.

### 4.2 Convención comunicación — una sola respuesta final por tarea

Escrito en `CLAUDE.md > Workflow`. Excepción legítima: bloqueo real que requiere decisión del PO. Origen: 3 reportes intermedios en el sprint sentry-flush que se cortaron a media frase.

### 4.3 Anti-voseo también aplica al OUTPUT del auditor al PO

Refuerzo agregado a `CLAUDE.md > Convenciones de código`. La regla del proyecto de tuteo consistente **incluye el meta-canal auditor↔PO** (chat, actas, snippets pegables, commits). Historia: 3 voseos en la misma sesión ("logueá", "y vos ejecutas") que el PO tuvo que corregir explícitamente. Checklist mental antes de enviar cualquier respuesta: strings pegables al chat + snippets con probabilidad de leerse + commits visibles en `git log`.

### 4.4 P9 (regla propuesta al PO, sin escribir aún) — apagar capacidades por nombre sin verificar defaults

Distinta a P8 (P8 = cómo verificas, P9 = cómo configuras). Ver Sección 6 abajo — texto propuesto pendiente de aprobación explícita del PO antes de escribirse en CLAUDE.md.

### 4.5 Drift CLAUDE.md corregido — 3 batches

- **Batch 1 (D1-D4+D10)**: Next 14 → 15.5.22; "NO gestiona reservas" → marketplace con ciclo completo F1+F2+recordatorios; "Lo que NO hace" reescrito (pagos in-platform + monetización + disputas + KYC quedan como no-goals reales); contradicción interna resuelta; estructura archivos ampliada con `middleware.ts`, 3 configs Sentry, `lib/sentryScrub.ts`, `lib/sentryServer.ts`, `lib/estadoDerivado.ts`, `lib/emails/resolvers.ts`, `mis-reservas.tsx`, 6 crons, 11 templates emails.
- **Batch 2 (D5-D6)**: categorías reales verificadas MCP staging (10 activas: `adiestramiento, cuidado, etologia, fotografia, guarderia, paseos, peluqueria, retratos, traslado, veterinario`; `hospedaje` deprecado fusionado en `cuidado`; nuevas post-launch: `retratos`, `etologia`, `fotografia`). Roadmap actualizado — recordatorios 24h EN PROD desde 2026-07-30.
- **Batch 3 (D7-D9 + known-flaky)**: UserContext sin timeout (canal 1 sincrónico + canal 2 event-driven); `Co-Authored-By` = `Claude Opus 4.7 <noreply@anthropic.com>` (verificado 149 commits últimos 30 días); `@ducanh2912/next-pwa@10.2.9`; known-flaky `s1-editor-visible.spec.ts` CERRADO (no reapareció en 6 merges post-anotación).

## 5. Deuda anotada en BACKLOG.md

**`[abierto, condicionado] Migrar endpoints API a wrapApiHandlerWithSentry() de v10 automático`** en `## Deuda técnica / pulido`. Condición explícita: primero verificar end-to-end en prod que el helper actual funciona (evento en dashboard). Si el efecto observable se confirma, se prioriza aplicar el wrapper a todos los endpoints como middleware Next 15. Si NO se confirma, se investiga primero el helper y ese hallazgo redefine el alcance del wrapper.

## 6. P9 propuesta al PO (pendiente aprobación)

Ver reporte final del auditor al PO — texto propuesto para regla nueva sobre "apagar capacidades por nombre sin verificar defaults". Distinta a P8. Debe incluir explícitamente que el pedido puede venir del coordinador y que la regla habilita al auditor a contradecirlo con evidencia. **NO escrita en CLAUDE.md hasta OK del PO**.

## 7. Referencias

- SHAs: `e3a28a5` (fix flush + integrations) → `5526c02` (CLAUDE.md P8 + comm + drift).
- Rama: `sentry-flush` (base: `main @ 3fd0d0d`; 12 chars → subdominio 57 chars ✅).
- Suite gate.spec.ts preview: 5 passed (6.9s).
- Smokes prod: 10/10 rutas + regresión intacta + Test 1 CSP passed + endpoint 401 OK.
- Reglas aplicadas: **P1** (build local exit 0), **P3** (branch verificada pre-commit), **P5** (esta acta), **P6** (verificación shape del CSP + defaults integrations via source SDK, no memoria), **P7** (fecha 2026-08-11), **P8** (nueva — smoke ejercita camino + efecto observable), **una sola respuesta final** (nueva convención), **anti-voseo output-al-PO** (refuerzo).
- Verificación pendiente única: PO ejecuta fetch pegable + confirma evento con tag `smoke=true` en dashboard Sentry (efecto observable — cierre canónico R3).
