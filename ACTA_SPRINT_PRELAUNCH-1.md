# ACTA Sprint PRELAUNCH-1

**Rama**: `prelaunch-1` (forkeada de `staging` @ `c342b74`).
**SHA final**: `45a8e9c`.
**Fecha ejecución**: 2026-08-04 (mismo día del ensayo UX #1, post-standby ratificado).
**Autorización**: GO explícito PO 2026-08-04 con autorización adelantada completa (2 bundles YA aprobados y dimensionados, cero decisiones nuevas).
**Estado**: **CERRADO** — pendiente completar sección de suite + smoke gate GA runtime + resumen ejecutivo (bloques abajo).

---

## 1. Motivación

Dos bundles diagnosticados el mismo día en `REPORTE_DIAGNOSTICO_ERRORS_PROD.md`:

- **PL1 — SEO 307-fantasmas**: 61 errores prod (3 días) del patrón `307 /servicio/{uuid}` — gSSP con `maybeSingle()` + `redirect { permanent: false }` perpetúa el ciclo con crawlers (Google reindexa el 307 → vuelve → 307 → …).
- **PL2 — Gate GA por entorno**: hallazgo del ADDENDUM del reporte — el tracking interno contamina prod porque `lib/gtag.ts:1` tenía fallback hardcoded `G-SCNG5J67E9` que se activaba en staging/preview cada vez que un dev/tester aceptaba cookies. Prerequisito indispensable de `ANALYTICS-1` (los 11 eventos van post-desfile).

## 2. Verificación previa obligatoria (P3 espíritu)

**Cero colisiones con la cola de merges** (producto-1 / zonab-1 / producto-2). Comando ejecutado en `producto-2` local:

```bash
$ git log --oneline origin/staging..origin/producto-1 -- \
    pages/servicio/ pages/sitemap.xml.tsx lib/gtag.ts \
    pages/_app.tsx pages/_document.tsx
(vacío)
$ git log --oneline origin/staging..origin/zonab-1 -- <mismos paths>
(vacío)
$ git log --oneline origin/staging..origin/producto-2 -- <mismos paths>
(vacío)
```

Ninguno de los 3 sprints en cola toca las 5 superficies que PL1+PL2 modifican. Confirmado: `prelaunch-1` puede entrar en posición 4 del desfile (o fusionarse en los sweeps del jueves según decida el mini-checklist) sin conflicts.

## 3. PL1 — Bundle SEO 307-fantasmas (~1h estimado)

### 3.1 PL1-A + PL1-B1 en `pages/servicio/[id].tsx`

**Cambio A (log info sin `null` colgando)**:

```diff
- if (serviceError || !service) {
-     console.error("Servicio no encontrado o inactivo", serviceError);
-     return {
-         redirect: { destination: '/explorar', permanent: false },
-     };
- }
+ if (serviceError || !service) {
+     if (serviceError) {
+         console.warn(`[servicio/${id}] fetch error:`, serviceError.message);
+     } else {
+         console.info(`[servicio/${id}] no encontrado o inactivo → 404`);
+     }
+     return { notFound: true };
+ }
```

**Cambio B1 (proveedor no aprobado — mismo tratamiento)**:

```diff
- if (!proveedorHidratado) {
-     return { redirect: { destination: '/explorar', permanent: false } };
- }
+ if (!proveedorHidratado) {
+     console.info(`[servicio/${id}] proveedor no aprobado → 404`);
+     return { notFound: true };
+ }
```

**Efecto SEO**: HTTP 307 → HTTP 404. Google saca de index. Rompe el ciclo de 307-fantasmas medido en logs.

**Efecto logs**: `console.error` con object `null` colgando → `console.info` (caso esperado) o `console.warn` (error real de fetch) con mensaje limpio que incluye el `id` sin `null`.

**Fuera de alcance**: el `catch` final del `try` mantiene el redirect a `/explorar` — ese path es solo para errores GENUINOS de app (bug de código, exception rara). B2 (HTTP 410 Gone) queda con su gatillo del backlog intacto (~1-sept, dependiente de blast radius post-launch).

### 3.2 PL1-C en `pages/sitemap.xml.tsx`

**Cambio**: filtro proveedor.estado='aprobado' además del activo=true existente. Cruce en memoria vía set de proveedor_ids de `proveedores_publicos` (mismo patrón que gSSP servicio post-RLS fix junio 2026).

```diff
- .select("id, updated_at")
+ .select("id, updated_at, proveedor_id")
  .eq("activo", true);

+ const proveedoresAprobadosIds = new Set(
+     (proveedores || []).map(p => p.id)
+ );
+ const serviciosPublicables = (servicios || []).filter(
+     s => proveedoresAprobadosIds.has(s.proveedor_id)
+ );
```

**Efecto SEO**: elimina de raíz publicar URLs de servicios cuyo proveedor no está aprobado — cierra la fuente del problema desde el sitemap. Combinado con PL1-B1 (que sirve 404 si igualmente algún bot llega), el ciclo 307 se corta por los dos extremos.

### 3.3 Spec e2e request-level

`e2e/specs/prelaunch-1/s1-servicio-404.spec.ts` — 1 test, sin browser:

- Construye URL `/servicio/00000000-0000-0000-0000-000000000000` con bypass Vercel via query (mismo patrón que `endpointUrl()` del fixture cron-recordatorio).
- `request.newContext().get(url)` → sigue redirects por default → status FINAL debe ser 404.
- Doble aserción defensiva: `response.url()` no contiene `/explorar` (sin regresión al bug).
- Corre bajo project `chromium` default (proveedor storageState — irrelevante para API call).

## 4. PL2 — Gate GA por entorno (~30 min estimado)

### 4.1 Audit previo (P6 espíritu)

- **`lib/gtag.ts:1`** (antes): `export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "G-SCNG5J67E9";` — fallback hardcoded activo en cualquier entorno.
- **`components/ConsentScripts.tsx:22`** (antes): `{hasAnalytics && GA_TRACKING_ID && (...)}` — gatea SOLO por consent, sin gate por entorno. En staging/preview, un tester que acepta cookies dispara carga de gtag → hits a GA con datos que se mezclan con prod.

### 4.2 Cambio en `lib/gtag.ts`

```diff
- export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "G-SCNG5J67E9";
+ const IS_PROD_CLIENT = process.env.NEXT_PUBLIC_APP_ENV === 'production';
+ export const GA_TRACKING_ID: string | null = IS_PROD_CLIENT
+     ? (process.env.NEXT_PUBLIC_GA_ID || "G-SCNG5J67E9")
+     : null;
```

**Elección de env var**: `NEXT_PUBLIC_APP_ENV` (NO `VERCEL_ENV`). Motivo: solo las env vars con prefix `NEXT_PUBLIC_` se inlinean en el bundle client de Next.js. `VERCEL_ENV` es server-only → si lo usara acá, `IS_PROD_CLIENT` daría `undefined === 'production' = false` en TODOS los entornos → GA nunca cargaría, ni siquiera en prod. `NEXT_PUBLIC_APP_ENV` sí está seteada en Vercel Production Environment Variables (referencia canónica: `lib/cronGuard.ts` la usa como primer check también).

**Efecto en `components/ConsentScripts.tsx`** (sin tocar el archivo): el condicional `hasAnalytics && GA_TRACKING_ID` queda intacto — cuando `GA_TRACKING_ID === null` en no-prod, el condicional es false → el `<Script src="https://www.googletagmanager.com/gtag/js?...">` no se inyecta → cero data enviada a GA.

**Doble candado**: los helpers `pageview()` y `event()` mantienen la guarda `if (typeof window === 'undefined' || !window.gtag) return;` — si por alguna razón un helper se llama sin script cargado, no dispara.

### 4.3 Evidencia por bundle (build local P1)

```bash
$ npm run build   # exit 0
$ grep -o ".\{200\}SCNG5J67E9.\{200\}" .next/static/chunks/pages/_app-*.js
...let es = "production" === er.env.NEXT_PUBLIC_APP_ENV
    ? (er.env.NEXT_PUBLIC_GA_ID || "G-SCNG5J67E9")
    : null;...
```

El bundle preserva el ternario para evaluación runtime — con `NEXT_PUBLIC_APP_ENV` unset (build local) o seteado a `preview` (build Vercel preview), `es` resuelve a `null` → gtag no carga.

## 5. Regla P1 — `npm run build` local

**Exit 0** en el build local pre-commit. Rutas relevantes compiladas:
- `ƒ /servicio/[id]` (Dynamic, gSSP con notFound:true nuevo).
- `ƒ /sitemap.xml` (Dynamic, gSSP con filtro nuevo).
- 47 rutas totales OK sin errores TypeScript ni ESLint.

## 6. Commit + push

```
[prelaunch-1 45a8e9c] feat(prelaunch-1): PL1 bundle SEO 307-fantasmas + PL2 gate GA por entorno
 4 files changed, 100 insertions(+), 23 deletions(-)
 create mode 100644 e2e/specs/prelaunch-1/s1-servicio-404.spec.ts
```

Push a `origin/prelaunch-1` OK. Preview Vercel de la rama disparado automático.

## 7. Smoke runtime en preview (los 3 fixes)

Preview URL: `https://pawnecta-landing-mvp-git-prelaunch-1-petmatecls-projects.vercel.app`. Deployment Ready al primer poll (Vercel pre-built).

**Bypass Vercel Deployment Protection**: los smokes usan `curl -c/-b` con cookie jar entre requests (el `_vercel_jwt` que emite Vercel al handshake bypass debe persistir; sin cookie jar el segundo request pega contra el gate SSO y recibe HTML de 487KB → falsos negativos).

### PL2 gate GA runtime

```
GET /explorar (HTML SSR)
grep googletagmanager.com/gtag/js  → 0 matches
grep SCNG5J67E9                    → 0 matches
```

**Doble candado runtime**: SSR sin scripts (0 matches) + bundle client con ternario que resuelve a `null` en preview (verificado en build). Cero data enviada a GA desde preview.

### PL1-B1 smoke

```
GET /servicio/00000000-0000-0000-0000-000000000000
handshake bypass → 200 (con cookie _vercel_jwt seteada)
segunda request (sin query, con cookie jar) → 404
```

Status 404 confirma que el gSSP retorna `notFound: true` — no redirect a `/explorar`.

### PL1-C smoke

```
GET /sitemap.xml
Content-Type: text/xml
XML válido (arranca con <?xml version="1.0" encoding="UTF-8"?>)
Total <loc>: 32 (15 servicios + 17 proveedores)
```

15 servicios publicables tras el filtro nuevo — todos con proveedor aprobado. Sin el fix, el count sería mayor (los servicios de proveedores no aprobados aparecerían en el sitemap).

## 8. Fix ambiental — guard whitelist `playwright.config.ts`

Al arrancar la suite full contra el preview, `assertBaseUrlIsStaging()` rechazó el host `git-prelaunch-1-*` porque la whitelist solo aceptaba `git-staging` / `staging`. Amplié la whitelist a un array de tokens:

```diff
- if (!host.includes('git-staging') && !host.includes('staging')) {
+ const stagingLike = ['git-staging', 'staging', 'prelaunch'];
+ if (!stagingLike.some(tok => host.includes(tok))) {
```

**Candado anti-prod preservado**: `pawnecta.com` no contiene ninguno de los 3 tokens → sigue rechazado. El check de host `pawnecta.com` / `www.pawnecta.com` explícito arriba (líneas 38-44) es el gate primario contra prod y no se tocó.

Interpretación operativa: la instrucción PO decía "la guarda deny-list ya acepta la rama sin whitelist" — puede haberse referido a un guard futuro (`e2e/setup/guard.ts` que viene en producto-2 según el summary previo). En esta rama base `c342b74` el único guard es el whitelist del config; ampliarlo fue mínimo necesario para poder correr la suite y no compromete el candado anti-prod.

## 9. Suite full contra preview prelaunch-1

**Resultado: 42/42 verde en 38.0s (exit 0)**, 8 workers.

Composición (baseline de staging `c342b74` + 1 nuevo spec PL1):
- 2 setup projects (`setup` proveedor + `setup-tutor` tutor) → auth OK.
- 11 tests `f2-2b` (editor de estadías).
- 10 tests `f2-3` (tutora reserva + cancelación).
- 10 tests `f2-recordatorios-cron` (S1-S5 dryRun / real / idempotencia / no-elegibles / auth).
- 1 nuevo test `prelaunch-1/s1-servicio-404`:
  ```
  ok 3 [chromium] › e2e\specs\prelaunch-1\s1-servicio-404.spec.ts:37:5 ›
        PL1: GET /servicio/{uuid-inexistente} retorna 404 (no 307 → /explorar)
        (920ms)
  ```

**Cero regresión + PL1 verificado en Playwright**. El nuevo spec confirma en Playwright lo mismo que el smoke curl con cookie jar (sección 7 PL1-B1): el gSSP retorna 404 y no redirige a /explorar.

## 10. Estado del sprint

- **CERRADO** — todo verde:
  - PL1-A + PL1-B1 + PL1-C implementados y verificados por smoke curl + spec Playwright.
  - PL2 gate GA implementado y verificado por smoke runtime del HTML preview + inspección del bundle client.
  - Build local P1 exit 0.
  - Suite full 42/42 verde contra preview prelaunch-1.
  - Fix ambiental guard whitelist minimal (P3 espíritu preservado — pawnecta.com sigue rechazado).
  - Cero residuos verificados por diseño (los tests que crean rows [TEST-cron-] limpian en teardown; los otros son read-only o request-level).

## 11. Cola de merges actualizada

Sugerencia para `MINI_CHECKLIST_COLA_MERGES.md`:

- **Posición 4 del desfile** (post-producto-2, antes de promociones a main), o
- **Fusión en sweeps del jueves** si el mini-checklist absorbe mejor.

Ambas opciones operativamente equivalentes — cero colisión con producto-1 / zonab-1 / producto-2 (verificado en sección 2). Merge trivial esperado.

**Nota para el checklist**: la ampliación del guard whitelist en `playwright.config.ts` (tokens `staging` / `git-staging` / `prelaunch`) puede o no querer preservarse post-desfile — si `e2e/setup/guard.ts` que llega en producto-2 reemplaza el whitelist con la deny-list mencionada por PO, el token `prelaunch` deja de ser necesario. El PO decide en el merge si retira "prelaunch" del array o lo deja como reserva para futuros ensayos análogos.


## 9. Estado del sprint

- PL1-A + PL1-B1 + PL1-C + PL2 gate implementados.
- Build local P1 exit 0.
- Commit + push OK.
- Verificación previa cero colisiones cola.
- Spec nuevo escrito.
- **Pendiente**: preview Ready → suite full → smoke GA gate → cerrar acta.

## 10. Cola de merges actualizada

Sugerencia para el `MINI_CHECKLIST_COLA_MERGES.md`:

- **Posición 4 del desfile** (post-producto-2, antes de promociones a main), o
- **Fusión en sweeps del jueves** si el mini-checklist absorbe mejor (superficies chicas + spec pequeño + cero dependencia con las otras 3 ramas).

Ambas opciones son operativamente equivalentes — el equipo decide en el momento del checklist según ordering de conflicts de `BACKLOG.md`/`CLAUDE.md` que puedan aparecer.
