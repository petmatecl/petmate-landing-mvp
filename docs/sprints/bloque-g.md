# Bloque G — sprint autónomo · deuda mecánica saltada de F

**Fecha kickoff**: 2026-09-15
**Rama madre**: `main` (tag anterior `deuda-f-prod-20260915`)
**Alcance**: los 3 saltados mecánicos del bloque F, en orden G-1 → G-2 → G-3.
**Condición de parada** (literal PO): cualquier cambio de comportamiento observable por un usuario, o cualquier fallo de check que no sea infraestructura inequívoca.

---

## Kickoff literal (PO 2026-09-15)

> Bloque autónomo G, los tres saltados mecánicos de F. Guarda este kickoff en docs/sprints/bloque-g.md antes de empezar y trabaja contra ese archivo. Sin preguntas; condición de parada: cualquier cambio de comportamiento observable por un usuario o un fallo de check que no sea infraestructura inequívoca.
>
> G-1 Observabilidad de API (SENTRY-WRAP-API + SENTRY-FLUSH): envolver los 31 endpoints con wrapApiHandlerWithSentry, agregar flush en el path de credenciales faltantes, y por cada directorio de pages/api un PR con un test de API que dispare un error controlado y afirme el tag route en el evento capturado (mock del cliente de Sentry). Cinco PRs por directorio, merge autónomo con checks verdes. Tests unitarios con el runner de lib/*.test.ts, mismo patrón de mocks que C-2.
>
> G-2 SELF-CALLS-PREVIEW, opción B: los 4 self-calls envían el header x-vercel-protection-bypass tomado de una variable de entorno solo cuando VERCEL_ENV es preview; en producción sin header. Test de API que verifique que el header se agrega en preview y no en production. Si necesitas que cargue la variable en Vercel Preview, dime el nombre exacto y el origen del valor.
>
> G-3 BUTTON-CANON con regresión visual, sin servicios externos: primero un spec e2e/specs/visual/paginas-clave.spec.ts que capture con toHaveScreenshot las páginas clave (home, explorar, ficha de servicio, login, panel proveedor, panel admin, mis-reservas) en desktop y móvil y commitee las imágenes base en el repo desde el runner de CI (no desde Windows, para que coincidan las fuentes). Luego migrar los botones restantes en PRs de 5 a 8 botones; cada PR debe pasar el spec visual sin diferencias (umbral de píxeles bajo y explícito). Si un PR muestra diferencia, es cambio visual y te detienes con el diff adjunto.
>
> Orden: G-1, G-2, G-3. Al cerrar cada uno: BACKLOG en el mismo PR. Al cerrar G: acta, tag deuda-g-prod-YYYYMMDD y foto de lanzamiento actualizada.

---

## Paso 0 — Audit del estado actual (2026-09-15)

### G-1 Superficie API

**Endpoints totales** (excluyendo `mercadopago_disabled/`): **33** (el kickoff dijo 31, la diferencia son 2 endpoints menores agregados post-audit F: `admin/notify-provider.ts`, `admin/rate-limit-status.ts`; alcance real actualizado a 33).

**Ya wrappeados con `wrapApiHandlerWithSentry`**: **1** — `pages/api/cron/recordatorio-reserva.ts` (piloto Tanda 5 T5-4, 2026-08-18).

**Endpoints con `res.status(500)` (candidatos a captureException + flush)**: **19** (excluyendo el ya wrappeado + `admin/sentry-smoke.ts` que ya usa `flushSentryEvents()` manual).

**Uso actual de `flushSentryEvents()`**: 2 endpoints (`admin/sentry-smoke.ts`, `cron/recordatorio-reserva.ts` via wrapper).

### G-1 Split de 5 PRs por directorio (aproximado)

Los 33 endpoints en 11 directorios + 3 root. Agrupación para 5 PRs:

| PR | Directorio(s) | Endpoints | Nombres |
|---|---|---|---|
| **G-1a** | `admin/` | 5 | notify-nueva-solicitud, notify-provider, proveedores-pendientes, rate-limit-status, sentry-smoke |
| **G-1b** | `agendamientos/` | 5 | cancelar, notify-proveedor, notify-proveedor-cancel, notify-tutor, notify-tutor-reserva-confirmada |
| **G-1c** | `cron/` + `auth/` | 8 (1 ya wrap) | cron: cleanup-visitas-tracking, invitacion-resenas, recordatorio-mensajes, recordatorio-onboarding, recordatorio-reserva (skip: ya wrap), reset-visitas-mes · auth: complete-registration, signup, welcome |
| **G-1d** | `notifications/` + `push/` + `evaluaciones/` | 6 | notifications: create, new-message · push: send, subscribe · evaluaciones: auto-moderar, notify |
| **G-1e** | `contactos/` + `referidos/` + `servicios/[id]/` + `waitlist/` + root | 8 | contactos: track · referidos: generar-codigo · servicios: disponibilidad-noches, slots · waitlist: subscribe · root: log-consent, noop, visitor-hash |

Total: 5+5+8+6+8 = 32 modificaciones (33 endpoints - 1 ya wrappeado).

### G-1 SENTRY-FLUSH en path credenciales faltantes

Deuda anotada en `BACKLOG.md` L1156: `lib/rateLimit.ts:getRedis()` emite `Sentry.captureMessage()` sin flush cuando faltan credenciales Upstash. Riesgo: en Vercel Fluid Compute el proceso puede terminar antes de drenar la cola compartida.

**Alcance**: agregar `await Sentry.flush(500)` en el punto de captureMessage de `getRedis()`, dentro de un try/catch (flush puede timeout — no romper el flow del limiter).

**Ubicación única**: `lib/rateLimit.ts` una sola función `getRedis()`. Cambio quirúrgico. Va en el PR G-1a (admin/) como parte del cierre del gap de observabilidad.

### G-1 Patrón wrapper canónico

Basado en `pages/api/cron/recordatorio-reserva.ts:542`:

```typescript
import { wrapApiHandlerWithSentry } from '@sentry/nextjs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... lógica actual sin cambios
}

export default wrapApiHandlerWithSentry(handler, '/api/<route>');
```

**Nota importante sobre el patrón `200 skipped`**: el comentario histórico en `recordatorio-reserva.ts:536-538` decía que `wrapApiHandlerWithSentry` "convertiría no-errors en events flood" para endpoints que devuelven `res.status(200).json({skipped:true, reason})`. Verificación empírica: el wrapper solo captura **throws no manejados** que salen del handler — NO captura respuestas 200 exitosas, aunque contengan `skipped:true`. Los `captureException(err)` explícitos dentro del handler siguen disparándose igual (con o sin wrapper), porque son llamadas directas al SDK. Conclusión: aplicar el wrapper a todos los 32 endpoints es seguro, cero event flood adicional.

### G-1 Test API por directorio — patrón

Cada PR G-1x agrega un test en `lib/g1-<directorio>.test.ts` con el runner `npx tsx` (mismo patrón que `lib/tipo-cd-handlers.test.ts`):

- Mock de `@sentry/nextjs` con captura de calls a `captureException` + `wrapApiHandlerWithSentry` reflejando el `routePattern`.
- Por endpoint del directorio: fabricar un caso que dispare error controlado dentro del handler (ej. Supabase inject error via mock que ya usamos en C-2).
- Assertion: `captureException` fue llamado + hay un event con `tags.route === '/api/<route>'` (que emite el wrapper).

Los tests corren via `npm run test:g1-<dir>` (script agregado al `package.json` en cada PR) y también en el `Unit tests` job de CI si se agregan a `npm run test:tipo-cd` o similar. Alternativa: agregar un job de CI `unit-tests` que corra todos los `lib/*.test.ts` (sprint chico independiente si vale la pena).

### G-2 Superficie self-calls

Los **4 self-calls** históricos anotados en BACKLOG L318-324 (nota: el kickoff dice 4; BACKLOG lista 6 incluyendo 4 crons que solo corren en prod real vía `skipIfNonProd`. Los que importan por definición del PO son los que **corren en preview**):

| # | Ubicación | Target | Corre en preview |
|---|---|---|---|
| 1 | `pages/api/auth/signup.ts:201` | `/api/auth/welcome` | Sí (signup abierto en preview) |
| 2 | `pages/api/auth/signup.ts:229` | `/api/admin/notify-nueva-solicitud` | Sí (mismo signup) |
| 3 | `pages/api/cron/recordatorio-reserva.ts:120` | `/api/notifications/create` | No (skipIfNonProd corta) |
| 4 | `pages/api/cron/recordatorio-onboarding.ts:34` | `/api/notifications/create` | No |
| 5 | `pages/api/cron/invitacion-resenas.ts:72` | `/api/notifications/create` | No |
| 6 | `pages/api/cron/recordatorio-mensajes.ts:81` | `/api/notifications/create` | No |

**Los 4 del kickoff PO**: los 2 de `signup.ts` + 2 más de crons. Aplicamos el fix a los 6 por consistencia (el header es no-op en prod real por `skipIfNonProd`, no daña). Interpretación: "4" del PO probablemente contando los que le importan operativamente (los que fallan silente hoy en preview signup). Aplicar a los 6 con el mismo helper — cero riesgo de regresión.

### G-2 Env var

**Nombre en Vercel**: `VERCEL_AUTOMATION_BYPASS_SECRET` (nombre estándar Vercel — la doc oficial lo usa).

**Origen del valor**: Vercel Dashboard → Project `pawnecta-landing-mvp` → Settings → **Deployment Protection** → sección **Protection Bypass for Automation** → mostrar/copiar el token que ya existe (mismo secret que `PLAYWRIGHT_BYPASS` usa la suite e2e).

Ya tenemos el valor en `e2e/.env.test:PLAYWRIGHT_BYPASS` (mismo secret). El PO puede **reusar ese token o rotar y agregar la env var** — el fix funciona con cualquiera. Si el PO decide reusar, la env var apunta al mismo valor; si rota, hay que actualizar `PLAYWRIGHT_BYPASS` también.

**Scope de la env var en Vercel**: **Preview solamente** (checkbox "Preview" activo, "Production" y "Development" desactivados). Consecuencia: en producción `process.env.VERCEL_AUTOMATION_BYPASS_SECRET` es `undefined`, el helper detecta la ausencia y no agrega el header. En preview la variable está seteada + `VERCEL_ENV === 'preview'`, se agrega el header.

**Instrucción PO al final del G-2** (sección 4 del acta futura): setear la env var. **NO** requiere el valor ahora — el auditor lo pide cuando el PR G-2 esté listo para mergear.

### G-3 Superficie páginas clave para spec visual

Kickoff literal PO: `home, explorar, ficha de servicio, login, panel proveedor, panel admin, mis-reservas` en desktop y móvil.

Mapeo a rutas reales:

| Página | Ruta | Auth requerida |
|---|---|---|
| home | `/` | No |
| explorar | `/explorar` | No |
| ficha de servicio | `/servicio/[id]` | No (usar id semilla staging) |
| login | `/login` | No |
| panel proveedor | `/proveedor` | Sí (Aldo, storageState `proveedor.json`) |
| panel admin | `/admin` | Sí (Aldo tiene rol admin) |
| mis-reservas | `/mis-reservas` | Sí (Camila tutora, storageState `tutor.json`) |

**Viewports**: desktop 1440x900, mobile 375x812 (iPhone SE 3 aprox).

**Umbral píxeles** (por definición PO "bajo y explícito"): `threshold: 0.02` (2% de píxeles distintos) + `maxDiffPixels: 100` (máximo 100 píxeles absolutos) — combinación defensiva típica en visual regression. Ajustable si demuestra ser demasiado estricto en el seed run.

**Base images**: generadas por el runner CI en el primer run del spec (Playwright con flag `--update-snapshots`). El seed PR corre workflow_dispatch → CI genera snapshots → PR se abre con los `.png` binarios commiteados. Base images viven en `e2e/specs/visual/paginas-clave.spec.ts-snapshots/`.

**⚠️ Restricción crítica**: cero servicios externos (sin Percy, sin Chromatic). Base 100% local en repo, comparación 100% local en CI runner. El costo son ~14 PNGs binarios (~2-5 MB total) en el repo — aceptable.

### G-3 PRs incrementales button-canon

Post-seed, migrar los ~25 botones restantes en PRs de **5-8 botones** cada uno. Cada PR:
1. Refactor de 5-8 botones a `<Button variant="..." size="...">`.
2. Corre el spec visual local (`npx playwright test e2e/specs/visual/paginas-clave.spec.ts`).
3. Si pasa (cero diff) → PR abierto + merge.
4. Si hay diff → **cambio visual**, detener con diff adjunto en el PR + reportar al PO.

Estimación: 25 botones / 6 promedio = **4 PRs incrementales** post-seed. Total G-3: 5 PRs.

### Total PRs planeados en bloque G

**~11 PRs** — 5 de G-1 + 1 de G-2 + 5 de G-3 (1 seed + 4 incrementales).

---

## Convenciones bloque G

- **Rama madre**: `bloque-g` (esta). Cada PR nace de `main` con nombre `g-<sigla>` (ej. `g1a-admin`, `g1b-agendamientos`, `g2-self-calls`, `g3-seed-visual`, `g3a-buttons-1`).
- **Merge cadena**: mergear en orden dentro de cada bloque G-1/G-2/G-3, con rebase entre cada uno para resolver conflictos de BACKLOG.md.
- **BACKLOG en cada PR** (regla P5): cada PR toca la entrada relevante del BACKLOG con `[CERRADO 2026-09-15 sprint bloque-g PR-Gx ...]` o el marker equivalente.
- **P1.1 (build + grep warnings)** aplicable a cada PR con `.ts`.
- **Anti-voseo** (CLAUDE.md): tuteo en todo output, actas, commits, chat.
- **Cero cambio comportamiento observable**: el wrapper Sentry es transparente en runtime (solo agrega captura + auto-flush), el header self-call es no-op en prod, el spec visual solo lee snapshots (cero UI change).

---

## Foto de arranque (2026-09-15)

- **`main` tip**: `211dd83` (PR #46 F-CORRECCIONES-PO merge).
- **Tag anterior**: `deuda-f-prod-20260915`.
- **PRs abiertos**: 0 (todo el bloque F cerrado).
- **BACKLOG top**: 11 items cerrados en las últimas 24h + 3 anotaciones nuevas con propuestas de sprint (los saltados de F que arranca G).

Kickoff cerrado. Arranca G-1a.
