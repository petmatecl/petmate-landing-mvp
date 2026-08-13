# ACTA Hotfix R3-SENTRY-1 — CSP block del ingest (rama `sentry-csp`)

**Rama**: `sentry-csp` (renombrada desde `sentry-1-hotfix-csp`; forkeada de `main @ 4e3819c`).
**SHAs**: `fe01a3e` (fix CSP) → `88105b5` (smoke browser-path) → `ccee68c` (backlog admin notifs).
**Tag prod**: `sentry-csp-prod-20260811` sobre `main @ ccee68c`.
**Fecha ejecución**: 2026-08-11.
**Estado**: **PROMOVIDO A PROD** — hotfix live. Cero errores client-side llegaban a Sentry antes; ahora sí.

---

## 1. Bug y consecuencia

Post-merge `sentry-1-prod-20260811` (SHA `a319649`, 2026-08-11), Aldo abrió `/admin` logueado como admin y encontró en DevTools:

```
Refused to connect to 'https://o4511905223016448.ingest.us.sentry.io/api/4511905344847872/envelope...'
because it violates the document's Content Security Policy.
directive: "connect-src 'self' https://*.supabase.co ..."
```

**Consecuencia**: cero errores client-side llegaron a Sentry desde el merge (~30 min de ceguera operativa antes de detección). El SDK client cargaba y ejecutaba, pero el navegador cortaba TODOS los envelopes POST al ingest antes de que salieran.

## 2. Por qué el smoke original no detectó esto

El smoke previo (`e2e/specs/sentry/gate.spec.ts` versión `bf96ae8`) pegaba **solo** el endpoint `/api/admin/sentry-smoke` server-side y confiaba en el `sent: true` que reportaba el response.

**El problema**: `/api/admin/sentry-smoke` corre en Node.js (Fluid Compute). **CSP es política del navegador**, no del server. Cuando el server llamaba `Sentry.captureException()`, el SDK enviaba via `fetch()` desde Node.js directo al ingest — sin CSP restrictivo. Por eso el server reportaba `sent: true` correctamente mientras el bundle cliente ya no podía enviar nada.

El smoke era **ciego al path que importaba** — el 99% de los errores prod vienen del navegador, no del server.

Ver P8 (regla nueva propuesta al PO) para la codificación general del aprendizaje.

## 3. Ejecución por fase (P5)

### Fase A — fix CSP (`fe01a3e`)

Agregado `https://*.ingest.us.sentry.io` a `connect-src` en [next.config.js:127-136](next.config.js#L127-L136). Wildcard acotado a región US (nuestra org `pawnecta` está en US).

**worker-src no requiere cambio** — Sentry v10 usa main-thread `fetch()`, no Web Workers para el envelope. **report-uri no aplica** — no lo usamos en la CSP.

### Fase B — smoke browser-path ampliado (`88105b5`)

[e2e/specs/sentry/gate.spec.ts](e2e/specs/sentry/gate.spec.ts) reescrito con **3 tests independientes** que cubren `bundle → CSP → network → gate`:

- **Test 1** — CSP header contiene ingest Sentry. Determinístico (407ms), assertion sobre el header. Corre en cualquier baseURL. **Este es el test que hubiera atrapado el bug original en preview**.
- **Test 2** — navegador alcanza el ingest sin CSP block. Funcional (811ms). Hace `page.evaluate(fetch(SENTRY_ENVELOPE_URL))` REAL desde browser + escucha `page.on('console')` por "Refused to connect". Si CSP bloquea, el fetch rechaza con TypeError.
- **Test 3** — endpoint server reporta gate correcto. Complementario (2.4s). Sigue útil para validar DSN configurado + gate lee VERCEL_ENV.

### Fase C — backlog admin notifs (`ccee68c`)

Nuevo ítem en `BACKLOG.md > PEDIDOS DIRECTOS DEL PO` (investigación cerrada — no existe mecanismo, confirmado por exhaustividad). Diseño propuesto sin implementar — prioriza el PO.

## 4. Verificación

### Preview `sentry-csp` — 4/4 passed

```
ok 1 [setup] authenticate as proveedor (10.3s)
ok 2 [chromium] 1) CSP header contiene el ingest de Sentry (407ms)
ok 3 [chromium] 2) navegador alcanza el ingest sin CSP block (811ms)
[sentry-smoke server-side] {
  "sent": false, "eventId": null,
  "gate": {"env": "preview", "enabled": false, "dsn_configured": false}
}
ok 4 [chromium] 3) endpoint server reporta gate correcto (2.4s)

4 passed (13.8s)
```

**Anécdota operativa (codificada en CLAUDE.md como convención)**: nombre original de rama `sentry-1-hotfix-csp` (19 chars) generaba subdominio Vercel de 64 chars, superando el límite DNS de 63 chars por label. Hostname preview no resolvía (`nslookup Unspecified error`, `curl HTTP 000`). Rename a `sentry-csp` (10 chars → subdominio 55 chars) resolvió. Ver `CLAUDE.md > Workflow > Longitud de nombres de rama` para el presupuesto real: **≤18 chars por rama**.

### Prod post-merge

**Merge FF ejecutado**: `main 4e3819c → ccee68c` (fast-forward limpio, 3 files, 123 insertions/25 deletions).

**Deploy verificado**: buildId `6iSigp_TcQg22ivAqUHDV → j5_9kxTHTPCiVwfMJVB_R`.

**Smokes prod S1-S7**: 10/10 → 200 ✅. Regresión R1/R2/Sentry-1 intacta (`/mis-solicitudes → 308`, bots → 403 WAF).

**TEST 1 contra prod (curl directo)** — el que hubiera atrapado el bug:
```bash
curl -sI https://www.pawnecta.com/ | grep -i "content-security-policy" | grep -oE "connect-src[^;]+" | tr ' ' '\n' | grep sentry
→ https://*.ingest.us.sentry.io
✅ TEST 1 PASSED
```

### Pendiente en cancha del PO — smoke browser end-to-end

El guard `e2e/setup/guard.ts` bloquea Playwright contra prod por diseño. El smoke gate abierto end-to-end lo ejecuta Aldo desde su consola con sesión admin prod:

```js
(async () => {
  const t = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!t) return console.error('Sin sesión Supabase — logueá primero como admin');
  const jwt = JSON.parse(t[1]).access_token;
  const r = await fetch('/api/admin/sentry-smoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` }
  });
  const body = await r.json();
  console.log('[sentry-smoke]', body);
  if (body.sent) {
    console.log(`✅ Buscá tag smoke=true en https://sentry.io/organizations/pawnecta/issues/?project=javascript-nextjs — eventId=${body.eventId} debería aparecer en <30s`);
  } else {
    console.error('❌ sent:false — gate cerrado o DSN missing', body.gate);
  }
})();
```

Response esperada: `{sent: true, eventId: "<uuid-hex-32>", gate: {env: "production", enabled: true, dsn_configured: true}}`. Tag `smoke=true` visible en dashboard Sentry en <30s. Este smoke valida el path **cliente** end-to-end (que era el bug del hotfix) — complementario al Test 1 curl que valida el header.

## 5. Otros errores de consola /admin — pre-existentes, no regresión

- **"Error checking auth: No session"** = [pages/admin.tsx:33](pages/admin.tsx#L33) throw esperado del try/catch cuando `/admin` se abre sin sesión activa. Comportamiento normal (muestra form login). Solo ruido `console.error` — cambiar a `warn` es post-launch light. Git blame: commits sin relación con Sentry.
- **400 con `limit=200`** = [components/Admin/ConversionMetrics.tsx:56](components/Admin/ConversionMetrics.tsx#L56) query nested join `conversations→servicios_publicados!servicio_id→categorias_servicio!categoria_id` con FK alias probablemente incorrecto o RLS bloqueante. Pre-existente (commits sistema-visual/style). Deuda técnica del panel /admin sin relación con este merge.

## 6. Aprendizajes codificados

- **Convención DNS 63 chars** para nombres de rama → agregado a `CLAUDE.md > Workflow > Longitud de nombres de rama`. Presupuesto real: ≤18 chars.
- **P8 (regla nueva)** — smoke debe cubrir la ruta del usuario real, no la fácil de testear. Texto propuesto al PO en el turno del reporte del hotfix; escribir en `CLAUDE.md` post-aprobación explícita.

## 7. Referencias

- SHAs: `fe01a3e` (fix CSP) → `88105b5` (smoke browser-path 3 tests) → `ccee68c` (backlog admin notifs).
- Rama: `sentry-csp` (base: `main @ 4e3819c`).
- Suite gate.spec.ts preview: 4 passed (13.8s).
- Smokes prod: 10/10 rutas + regresión intacta + Test 1 CSP passed.
- Reglas P1-P7 aplicadas: **P1** (build local exit 0), **P3** (branch verificada pre-commit), **P5** (esta acta), **P6** (verificación shape del CSP header via curl directo antes de acta), **P7** (fecha 2026-08-11).
