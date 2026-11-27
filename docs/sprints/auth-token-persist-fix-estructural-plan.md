# Sprint AUTH-TOKEN-PERSIST-FIX-ESTRUCTURAL — Fase 1 diagnóstico (docs-only)

**Fecha**: 2026-11-27
**Prioridad**: alta
**Arranca**: post-merge PR #240 F5
**Autor**: Claude Opus 4.7 (auditor)
**Estado**: Fase 1 docs-only cerrada.

---

## 1. Motivación

La regla temporal de rerun autónomo por `AUTH-TOKEN-PERSIST` canonical lleva 2 extensiones (2026-11-13, 2026-11-19, 2026-11-27 con slip incluido). El sprint se encola después de F5 para cerrar la causa raíz y evitar renovar la regla a futuro.

**Criterio de éxito**: 20 runs consecutivos del workflow `e2e-error-audit` sin la firma canonical (`TimeoutError: locator.fill: Timeout 30000ms exceeded` en `e2e/setup/auth*.setup.ts`).

## 2. Frecuencia real — últimos 60 runs

### 2.1 Base agregada

- **Total runs**: 60 (`e2e-error-audit`, últimos 60 desde `gh run list --workflow e2e-error-audit --limit 60`).
- **Runs con conclusion:failure final**: 8/60 (13%).
- **Runs que necesitaron al menos un rerun para quedar verde** (`run_attempt > 1` en últimos 30): **7/30 (23%)**.

La métrica "runs que necesitaron rerun" es la relevante para esta regla — captura fails intermitentes que un rerun autónomo resuelve.

### 2.2 Clasificación de los 8 fails final + 7 reruns

| run_id | branch | spec que falló | timeout | firma |
|---|---|---|---|---|
| 46026583492 | nudge-dry-run | launch-l1/toast-dup-regresion.spec.ts:73 | 1m0s | toast-dup timeout (otro flake) |
| 45908281322 | vis-expl-mask | visual/paginas-clave visual-drift | — | visual snapshot drift (regla P11 cubre) |
| 45904949016 | vis-expl-mask | idem | — | idem |
| 45901298264 | vis-expl-mask | idem | — | idem |
| 45867398999 | deps-safe-1 | **producto-2/s1-estados-derivados.spec.ts:246** | 15.4s | **toBeVisible element not found** |
| 45845667649 | fix-flake-sentry | c2-c1-roleguard + pan-1 def3 T3 + tipo-b lote-1 | 15.6-19.8s | mix de toBeVisible/waitFor |
| 45839867270 | fix-flake-link | cue-1-fix a1-lock-sub + pan-1 def3 T3 + sentry gate | 1.6m + 16.2s | mix |
| 45726856770 | tests-eventos | (log vacío al grep, no analizable retroactivamente) | — | — |

**Ninguno de los 8 fails final tiene firma AUTH-TOKEN-PERSIST canonical.** Los fails de AUTH-TOKEN-PERSIST **no aparecen en `conclusion:failure` final** porque el rerun autónomo (regla temporal) los convierte a verde. Aparecen en:

### 2.3 Fails canonical AUTH-TOKEN-PERSIST hoy

Inferidos por análisis de `run_attempt` en runs cuyo final es success:

- **PR #237 (nudge-copy-fix), run 46011548176**: `run_attempt=2`. Primer attempt falló con firma canonical AUTH-TOKEN-PERSIST (`TimeoutError: locator.fill` en `authenticate as proveedor` + `tutor`, 32-35s), comentario del auditor en el PR cita el fail. Rerun pasó verde.
- **PR #238 (nudge-dry-run), run 46015088597**: `run_attempt=3`. Primer attempt firma canonical. Segundo attempt pasó verde el setup pero falló `producto-2/s2-pestanas.spec.ts:124` (otra familia). Tercer attempt (rerun manual autorizado PO) pasó verde.

Entonces en los PRs del día de hoy (2026-11-27), **2 de 4 PRs** con CI completo tuvieron AUTH-TOKEN-PERSIST en el primer attempt: **50% hoy**. Los otros 2 PRs del día pasaron primer intento (PR #235 nudge-prov-id-fix, PR #236 F1+F2).

## 3. Causa raíz — evidencia disponible y gaps

### 3.1 Mecanismo del fail canonical

Los logs de #237 attempt 1 muestran:

```
[AUTH-STEP][tutor] 0 start
[AUTH-STEP][proveedor] 0 start
[AUTH-STEP][tutor] 0b warmup / done
[AUTH-STEP][proveedor] 0b warmup / done
[AUTH-STEP][tutor] 1 goto /login done
[AUTH-STEP][proveedor] 1 goto /login done
[AUTH-STEP][tutor] 2 networkidle done
[AUTH-STEP][tutor] 3 form filled
[AUTH-RETRY] tutor attempt 1/3 — click submit + waitForURL(30000ms)
...
```

En otros runs donde falla:
- El step `2 networkidle` o `3 form filled` no llega a emitirse.
- El timeout 30000ms exacto apunta al `locator.fill` del input email/password en `auth.setup.ts:18`.

### 3.2 Hipótesis documentadas (no verificadas)

Del CLAUDE.md § "Rerun autónomo único":

1. **SIGNED_IN remount P10** (`contexts/UserContext.tsx` deadlock): el callback `onAuthStateChange` corre dentro del lock de auth; si una re-hidratación de session se dispara al mount de `/login`, el form puede quedar "pintado pero disabled" hasta que el lock se libere → `locator.fill` espera al input habilitado → timeout.
2. **Cold Vercel preview**: la primera request a un preview recién deployado toma 2-5s para serializar el JS. Durante ese tiempo el DOM está parcial. Si Playwright hace `fill` justo antes del full render → input sin estado válido → timeout.
3. **Concurrency cross-workflow Supabase staging**: múltiples PRs corriendo en paralelo contra la misma BD staging. `signInWithPassword` puede quedar bloqueado si hay saturación del auth endpoint de Supabase (poco probable pero posible).

### 3.3 Fase 1.5 — EVIDENCIA DEFINITIVA (artifacts descargados 2026-11-27)

Artifacts descargados de los 2 fails canonical de hoy:

- **#237 attempt 1 (run 46011548176)** → `setup-auth.setup.ts-authenticate-as-proveedor-setup/error-context.md`.
- **#238 attempt 1 (run 46015088597)** → mismo archivo del mismo setup.

**Ambos DOM snapshots capturados en el momento del fail son idénticos**:

```yaml
- status "Loading"
  - generic: Loading...
- heading "Deployment is building" [level=1]
  - generic: Deployment is
  - generic: b-u-i-l-d-i-n-g
- link:
  - /url: https://vercel.com/deployments/<preview-url>?redirect=1
  - paragraph: View Build
- paragraph: This page will update once the build completes.
```

**La página servida NO es la app de Pawnecta**. Es la UI "Deployment is building" de Vercel — placeholder que Vercel sirve en la URL del preview mientras el build está aún en proceso. Playwright hace `page.goto('/login')` → recibe ese placeholder → busca `locator('#email')` → el input no existe en ese DOM → timeout 30s.

### 3.4 Veredicto de la Fase 1.5

- **Causa raíz CONFIRMADA**: carrera entre el job GitHub Actions (que arranca Playwright) y el build del preview Vercel (que todavía está compilando el bundle de la rama).
- **Hipótesis (1) SIGNED_IN remount P10 — DESCARTADA**. No hay implicancia para users reales; el sitio productivo nunca sirve la UI "Deployment is building".
- **Hipótesis (2) cold Vercel runtime — PARCIALMENTE CORRECTA pero más grave**: no es cold runtime, es **build-in-progress** (etapa anterior al runtime).
- **Hipótesis (3) concurrencia Supabase staging — DESCARTADA**. Supabase no interviene — ni siquiera se llega a hacer login.

### 3.5 Implicancia para el plan de fix

**La Opción C (tocar productivo) ya no aplica**. Causa es 100% entorno CI. Autorización PO vigente para fix autónomo (solo CI + setup e2e).

### 3.6 Diagnóstico del fail toast-dup de #238 (post-rerun 46026583492)

**Contexto**: tras el rerun manual autorizado del PR #238, los setups auth pasaron limpios (sin "Deployment is building") pero apareció un fail nuevo en `launch-l1/toast-dup-regresion.spec.ts:73` con `locator.click` timeout 60s.

**Evidencia** (artifact run 46026583492, `error-context.md`):

```
Call log:
  - waiting for getByRole('button', { name: /...|Guardar/i }).last()
    - locator resolved to <button ...>Guardar Cambios</button>
  - attempting click action
    89 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - <div role="region" aria-label="Aviso de cookies" class="fixed bottom-0 inset-x-0 z-50 ...">
         intercepts pointer events
     - retrying click action
```

**Causa distinta**: el **cookie banner** (`<div role="region" aria-label="Aviso de cookies">` con z-50 fixed bottom) intercepta el click al botón "Guardar Cambios". El test retrea 89 veces en 60s sin éxito, cada intento bloqueado por el banner.

**NO es "Deployment is building"**. La Opción D **NO lo cubre**.

**Hipótesis de este flake**:
- El fixture auth guarda el storageState con cookies aceptadas (`authenticate.ts:166-173` ya hace click en "Aceptar todas"). Pero el storageState se persiste solo si el banner aparece en el flow de setup. Si en algún run el banner no apareció al login (cookie ya existente, timing race), la aceptación no corre y el storageState captura una sesión sin la cookie de dismiss → específicos tests downstream encuentran el banner al navegar a otras páginas.
- Alternativa: el banner usa `localStorage.setItem` para el flag de dismiss, y storageState() captura localStorage del origin donde se hizo click. Si el test navega a un origin distinto (preview vs www), el flag no aplica.

**Fix fuera de alcance de este sprint** (sprint distinto). Se registra como:
- **CI-COOKIE-BANNER-INTERCEPT** (BACKLOG, prioridad media): auditar el teardown del banner en `authenticate.ts` + mejorar la persistencia cross-origin. Fases: (1) analizar storageState guardado buscando el flag de dismiss; (2) decidir si mover el flag a cookie en vez de localStorage; (3) si localStorage sigue → agregar `localStorage.setItem` manual en setup post-login antes del storageState save.

Este fail **no comparte causa con AUTH-TOKEN-PERSIST** canonical. La Opción D del sprint **no lo resuelve**. Se incluye acá por trazabilidad (fue descubierto al analizar el rerun de #238) pero el fix propio queda encolado aparte.

## 4. Opciones de fix

### Opción D — wait-for-deployment-ready en el workflow CI (PREFERIDA post-Fase 1.5, zero riesgo productivo, autónoma)

**Dónde**: `.github/workflows/e2e-error-audit.yml` (y `visual-update-snapshots.yml` si usa el mismo patrón).

**Qué**: nuevo step `Wait for Vercel preview ready` ANTES del step `playwright test`:
- Polea con `curl` + `grep` el preview URL cada 5-10s.
- Condición de pass: response HTML **NO** contiene el marker `Deployment is building` (texto `<h1>` de la UI de Vercel).
- Max wait: ~5 minutos. Si se agota → fail del job con mensaje claro (`ERROR: Vercel preview no ready en 5min — abort`).
- Headers: incluye `x-vercel-protection-bypass` si el preview tiene protection activa.

**Esfuerzo**: ~30 min código + ~1h validación (correr workflow 10 veces consecutivas verificando 0% canonical).

**Riesgo**: bajo. Solo workflow YAML.

**Ganancia esperada**: **elimina la causa raíz identificada**. Flake rate canonical → 0%.

### Opción A — Fixture retry wrapper + timeout escalonado (BAJO esfuerzo, BAJO riesgo, solo setup e2e)

**Dónde**: `e2e/setup/auth.setup.ts` y `e2e/setup/auth-tutor.setup.ts`.

**Qué**:
1. Envolver el `locator.fill` + `click submit` en un retry explícito (actualmente hay `AUTH-RETRY` pero solo para el click submit — el `fill` crudo no retrea).
2. Antes del `fill`, agregar `await locator.waitFor({ state: 'visible' })` + `await expect(locator).toBeEnabled()`.
3. Timeout escalonado: primer intento con 30s, segundo con 60s, tercer con 90s.
4. Log por paso con `console.log('[AUTH-STEP]...')` ya existente — ampliado para capturar el state del input al entrar al fill (disabled, visible, value).

**Esfuerzo**: ~1h código + ~1h validación (correr workflow múltiple veces en staging para verificar reducción de flake).

**Riesgo**: bajo. Solo toca `e2e/setup/*`. Cero cambio productivo. Autónomo.

**Ganancia esperada**: reducir fails canonical de 50% (hoy) a <10%. No elimina la causa raíz pero sí mitiga el síntoma.

### Opción B — Warmup del preview antes del setup (MEDIO esfuerzo, BAJO riesgo, solo setup e2e)

**Dónde**: `e2e/setup/auth.setup.ts` antes del `goto('/login')`.

**Qué**: agregar un `warmup step` que haga un `GET anónimo` al preview URL (`/`, `/explorar`) y espera 2-3s para forzar el cold boot del Vercel runtime antes de que el setup haga goto al form de login. Si la hipótesis (2) cold Vercel preview es correcta, esto elimina el fail.

**Esfuerzo**: ~30 min + validación.

**Riesgo**: bajo. Solo setup e2e.

**Ganancia esperada**: elimina la causa (2) si aplica. Si la causa real es (1) o (3), no ayuda. Incertidumbre alta sin la evidencia del trace.

### Opción C — Investigar + fix del deadlock SIGNED_IN remount P10 (ALTO esfuerzo, MEDIO riesgo, toca código productivo — REQUIERE GO PO)

**Dónde**: `contexts/UserContext.tsx` + `pages/login.tsx`.

**Qué**: auditar el flujo de hidratación del UserContext en `/login`, identificar si hay un ciclo `onAuthStateChange → setState → re-render → remount` que bloquea el DOM 1-2s al mount. Si confirmado, aplicar el patrón `setTimeout(..., 0)` para diferir el trabajo fuera del lock (ver CLAUDE.md regla P10).

**Esfuerzo**: ~4-8h (diagnóstico + fix + validación + regression check).

**Riesgo**: medio. Toca UserContext (crítico — afecta todas las sesiones). Necesita smoke exhaustivo post-fix.

**Ganancia esperada**: si la causa raíz es (1), eliminación completa del flake + mejora UX de users reales (menos tiempo en pantalla de login). Alta recompensa si confirmado.

### Recomendación (actualizada post Fase 1.5)

**Opción D primero** (wait-for-deployment-ready). Elimina la causa raíz confirmada. ~30 min + validación.

**Opción A** como red defensiva adicional. Es rápida, cero riesgo y cubre edge cases (preview deploy que se invalida post-ready por redeploy en paralelo, rate limit transitorio del auth endpoint de Supabase, etc.).

**Opciones B y C ya no aplican** post-evidencia de Fase 1.5.

## 5. Diagnóstico adicional: familia `producto-2` (dispatch PO 2026-11-27)

### 5.1 Fails recientes de producto-2

- **#219 deps-safe-1** (2026-11-26 17:34 UTC): `producto-2/s1-estados-derivados.spec.ts:246` — "Confirmada futura (control): badge CONFIRMADA, botón 'Cancelar reserva' habilitado". `Error: expect(locator).toBeVisible() failed. element(s) not found` 15.4s.
- **#238 nudge-dry-run attempt 2** (2026-11-27 ~14:32 UTC): `producto-2/s2-pestanas.spec.ts:124` — "Default = Próximas + los 3 tabs presentes con role=tab". Mismo error, 15.4s.

### 5.2 Patrón común

- Timeout exacto 15.4s (default de `toBeVisible()` en Playwright config).
- Spec distinto cada vez, pero **mismo fixture `servicio-efimero`**.
- Errores colaterales en el log: `[servicio-efimero] DELETE servicios_publicados ... error: ... foreign key constraint "agendamientos_servicio_id_fkey"` × 3 en el fail de #238.

### 5.3 Causa probable: residuo de fixture entre tests

El fixture `e2e/fixtures/servicio-efimero.ts` función `borrarServicioResiliente` **ya implementa cascade delete correcto** (DELETE agendamientos antes del servicio, Promise.all para hijos — sprints estab-e2e y estab-e2e-i del 2026-09). Sin embargo, los logs de #238 siguen mostrando errores FK → significa que **el teardown no siempre se ejecuta** o que **el DELETE del servicio corre antes de que completen los agendamientos** en caso de race con workers paralelos.

Hipótesis específica: con `workers: 2` + `fullyParallel: true` del `playwright.config.ts`, dos tests del mismo file pueden correr en workers distintos, cada uno con su propio `beforeAll` y `afterAll`. Si el describe no está en `.serial` (regla permanente 2026-11-19), los dos workers escriben a la misma BD con records que se solapan (mismo proveedor, mismo prefijo `e2e-f2-2b-*`).

### 5.4 Verificación pendiente

Grep en `e2e/specs/producto-2/*.spec.ts` para verificar si los describes están en `.serial` o no. Si no lo están, agregar `.serial` cierra el fail (regla permanente ya aterrizada para este patrón).

### 5.5 Propuesta fix producto-2

**Opción Pr-A** (preferida, 10 min): auditar los `test.describe` de `e2e/specs/producto-2/*` + convertir a `test.describe.serial(...)` los que tengan `beforeAll` con inserts al fixture `servicio-efimero`.

**¿Comparte causa con AUTH-TOKEN-PERSIST?** No directamente. AUTH-TOKEN-PERSIST es del setup de auth; producto-2 es de la contención cross-worker del fixture. Son dos flakes diferentes. El sprint AUTH-TOKEN-PERSIST-FIX-ESTRUCTURAL **no cubre** este fix — el fix producto-2 va en otro PR o incluido en Fase 2 de este sprint como barrido limpieza.

## 6. Plan Fase 2 (post-F5 merge, pendiente de arranque)

1. **Fase 1.5** (pendiente antes de Fase 2): descargar + analizar los 2 `trace.zip` de hoy para confirmar o descartar las hipótesis (1)/(2)/(3). ~30 min.
2. **Fase 2 Opción A**: implementar el fixture retry wrapper + waitFor + toBeEnabled + timeout escalonado + logs ampliados. Autónomo (solo setup e2e). ~1-2h.
3. **Fase 2 producto-2**: convertir describes de `e2e/specs/producto-2/*` a `.serial`. Autónomo (solo tests). ~30 min.
4. **Validación**: correr workflow `e2e-error-audit` 10 veces seguidas contra un PR de prueba (ej. docs-only). Si pasa 10/10, criterio parcial cumplido. Si pasa <8/10, agregar Opción B.
5. **Cierre criterio éxito**: 20 runs consecutivos verde del workflow sin la firma canonical. Si se cumple, se retira la regla temporal de CLAUDE.md en el mismo PR que mergea el fix.

## 7. Referencias

- CLAUDE.md § "Rerun autónomo único si el único fallo CI es el setup de auth + su cascada" (regla temporal + condiciones permanentes 2026-11-27).
- CLAUDE.md § P10 "El callback de `onAuthStateChange` corre DENTRO del lock de auth".
- CLAUDE.md § ".serial describes con beforeAll que escriben a BD compartida" (regla permanente 2026-11-19).
- `e2e/fixtures/servicio-efimero.ts` L186-277 — cascade delete existente.
- Fails: run_id 46011548176 (#237 attempt 1), 46015088597 (#238 attempt 1/2), 45867398999 (#219 s1:246).
- `docs/bitacora/incidentes-20261127.md` — slip de 2 reruns autónomos con regla vencida.
