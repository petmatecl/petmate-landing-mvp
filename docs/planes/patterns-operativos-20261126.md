# Patrones operativos descubiertos — jornada 2026-11-26

Written for: el PO (Aldo) + auditor futuro. Deliverable ITEM G del dispatch autónomo 2026-11-26.

**Trigger**: dispatch autónomo del PO 2026-11-26 — captura 2 patrones operacionales que emergieron durante la cola nocturna 25-26 + sesión 26 PM, para consulta reutilizable en episodios futuros.

---

## 1. Pattern `fix-flakes-ext` — template para flakes recurrentes

### Cuándo aplica

Cuando un conjunto de flakes transient aparece simultáneamente en ≥2 PRs code recientes, con **historial verde reciente** (≥3 runs consecutivos verdes previos del mismo spec en los últimos 5 runs del workflow), firma **timing/cold-start/auth-stale** (NO fixture/data-pre-existente strictly), y los PRs mismos NO tocan las surfaces de los flakes. Aterrizado 2026-11-26 en [PR #218 `fix-flakes-ext`](https://github.com/petmatecl/petmate-landing-mvp/pull/218) (merge `2f40545`) bajo OPT-3 GO del PO.

### Estructura del template

**Branch**: `fix-flakes-ext` o similar (patrón defensivo extendido). ≤18 chars.

**Scope**: SOLO specs de test que presentan flake transient. Cero código productivo, cero migration, cero schema. Objetivo: aterrizar defensas (threshold, retry, re-login) que preserven la señal de regresión real mientras acotan el ruido de ambiente.

**Patrones defensivos reusables**:

#### 1.1 Threshold defensivo cold-start (warn count / measurement assertions)

Cuando el assertion es `toBe(0)` sobre una métrica sensible a timing (warn counts, event counts, log counts). Hipótesis cold-start: el preview Vercel + latencia Supabase Auth puede estirar hidratación >1s → el sistema emite 1 warn/evento antes del estado esperado.

Fix:
```ts
// Antes
expect(x.warnings.length, '[X.y REGRESIÓN] ...').toBe(0);

// Después
expect(x.warnings.length, '[X.y REGRESIÓN] warns ≤ 1 (threshold defensivo cold start)').toBeLessThanOrEqual(1);
```

Preserva señal de regresión real (≥2 warns por tab = estado pre-fix = sigue fallando). Acota ruido cold-start a 1 warn máximo.

**Ejemplo real**: PR #214 A1.c + PR #218 A1.e en `e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts`.

#### 1.2 Retry pattern 3 attempts (TimeoutError en UI steps)

Cuando el assertion es `locator.waitFor({ state, timeout: 15_000 })` y el fail sale con `TimeoutError 15s`. Hipótesis cold-start: el elemento tarda > timeout en aparecer durante runs post-cold-deploy, pero aparece consistentemente en ejecución normal.

Fix:
```ts
const MAX_ATTEMPTS = 3;
const operacionConRetry = async (
    param: string,
    rol: string,
): Promise<ResultType> => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const ctx = await browser.newContext({ storageState });
        const page = await ctx.newPage();
        try {
            await page.goto(route);
            await operacionConPotencialTimeout(page);
            const result = await capturarResultado(page);
            await ctx.close();
            if (attempt > 1) console.log(`[spec:case] ${rol} SUCCESS on attempt ${attempt}/${MAX_ATTEMPTS}`);
            return result;
        } catch (err) {
            await ctx.close();
            const msg = err instanceof Error ? err.message : String(err);
            if (attempt < MAX_ATTEMPTS) {
                console.log(`[spec:case] ${rol} attempt ${attempt}/${MAX_ATTEMPTS} failed (${msg.slice(0, 80)}) — retry`);
                continue;
            }
            throw err;
        }
    }
    throw new Error(`[spec:case] ${rol} unreachable — loop sin return`);
};
```

**Ejemplo real**: PR #218 `pan-1/def3-bell-user-context.spec.ts` T3 — `abrirYContarNotifsConRetry`.

Preserva señal (3 attempts fail → sigue fallando, es regresión real).

#### 1.3 Re-login defensivo (401 transient por access_token cerca de exp)

Cuando el assertion es `expect(resp.status()).toBe(200)` y el fail devuelve 401. Hipótesis auth-stale: el `storageState` del fixture cargó un access_token cerca de su exp, el POST ocurrió pasado el límite, Supabase devuelve 401 sin refresh del cliente del test.

Fix:
```ts
if (resp.status() === 401) {
    console.log('[spec:case] 401 on first POST — defensive re-login via page reload');
    await page.reload({ waitUntil: 'domcontentloaded' });
    token = await extractToken();
    expect(token, 'Re-login defensivo: token nuevo debe estar disponible post-reload').toBeTruthy();
    resp = await page.request.post(url, { headers: { Authorization: `Bearer ${token}`, ... } });
}
expect(resp.status()).toBe(200);
```

**Ejemplo real**: PR #216 `sentry/gate.spec.ts:98` — retry UN único solo si 401. Otros errores (500, 403) NO reintentan.

#### 1.4 Retry defensivo para HTML response transient (edge proxy)

Cuando el SDK falla con `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`. Hipótesis: edge proxy (Cloudflare) devolvió HTML en lugar de JSON durante hiccup 5xx/522.

Fix:
```ts
const MAX_ATTEMPTS = 2;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    result = await sdkCall();
    const errMsg = result.error?.message ?? '';
    const isHtmlResponse = errMsg.includes('is not valid JSON') && errMsg.includes("'<'");
    if (!result.error || !isHtmlResponse) break;
    if (attempt < MAX_ATTEMPTS) {
        console.log(`[helper] attempt ${attempt} HTML response — retry in 500ms`);
        await new Promise((r) => setTimeout(r, 500));
    }
}
```

**Ejemplo real**: PR #215 `e2e/fixtures/signupLink.ts` — retry UN único para `admin.auth.admin.generateLink` HTML responses.

### Requisitos de autorización

- **GO explícito del PO** al abrir el PR fix-flakes-ext (ejemplo: OPT-3 GO 2026-11-26).
- **NO** aplicar bajo autoridad ampliada ITEM A u otra sin confirmación.
- Comment inline en cada assertion defensiva citando el documento de diagnóstico del flake (ej. `docs/planes/flakes-pre-existing-YYYYMMDD.md § Flake N`).

### Métricas de éxito post-merge

- PR fix-flakes-ext merge → sync main en PRs escalados → rerun manual UN único → si verde → merge autónomo.
- Esperado: 0 fails de los flakes originales. Si queda 1 fail con firma distinta, se escala por separado.
- **Outcome real 2026-11-26**: PRs #215 + #216 escalados tras 3 flakes pre-existentes + OPT-3 fix-flakes-ext (#218) → sync + rerun manual → #215 y #216 verdes attempt 1 post-sync → merge autónomo `b378a4c` + `67f5e1d`.

---

## 2. Concurrency `staging-exclusive` queue-replace — mecánica observada

### Qué pasa

El workflow `.github/workflows/e2e-error-audit.yml` declara:

```yaml
concurrency:
  group: staging-exclusive
  cancel-in-progress: false
```

La configuración está pensada para serializar ejecuciones contra el proyecto Supabase staging (evitar que 2+ runs paralelos contaminen BD/fixtures). PERO el comportamiento real de GitHub Actions es más sutil que lo que la documentación sugiere:

- `cancel-in-progress: false` solo preserva el run en estado **IN_PROGRESS**.
- El slot **PENDING** (queued, esperando a que el IN_PROGRESS termine) es **siempre reemplazado** por un nuevo push al mismo group.
- Resultado: pushes consecutivos a 2+ branches diferentes en ventana corta → el run más viejo queda IN_PROGRESS, el 2° push entra PENDING, el 3° push REEMPLAZA el 2° PENDING → el 2° push queda sin CI.

### Manifestación

Durante batch merges con múltiples PRs en vuelo contra la misma Supabase staging, el patrón:

1. Push rama A (dispara run A) → run A IN_PROGRESS.
2. Push rama B (dispara run B) → run B PENDING (esperando A).
3. Push rama C (dispara run C) → run B CANCELLED (reemplazado), run C PENDING.
4. A termina → run C arranca.
5. Rama B queda sin CI terminal → no mergeable bajo ruleset strict.

Observado en:
- 2026-11-24 PM batch merges post-AUDIT_INBOX rotación (ep1 incidentes-20261124.md § ruleset-gridlock).
- 2026-11-25/26 cola nocturna cuando pushé 5 syncs seguidos post-#199 (bitácora Ep5 cierre).

### Mitigaciones conocidas (en orden de preferencia)

#### 2.1 Serialización estricta 1-PR-a-la-vez (operativa, cero infra change)

Patrón canónico aterrizado durante cola nocturna 25-26 nov:

```
1 push → monitor CI terminal → merge → sync next branch → 1 push → ...
```

Tiempo típico ~15-20 min/PR. Lento pero determinista. NO requiere cambios a config.

**Cuándo aplicar**: batch merges sin feature flag temporal (default).

#### 2.2 Relax ruleset temporal (operativa, infra change reversible)

El PO puede quitar temporalmente los 2 Playwright de `required_status_checks` del ruleset `main` para desbloquear merges mientras se investiga el problema estructural. Revertir cuando se completa.

**Cuándo aplicar**: batch merge urgente donde la serialización 1x1 cuesta demasiado tiempo.

**Flow real**: 2026-11-24 PM (Opción A + C del PO) → 4 merges desbloqueados en ~15 min vs. ~90 min si hubiera sido serial.

**Cierre**: rehab del ruleset 2026-11-26 AM post-cola nocturna (ver Ep1 cierre bitácora).

#### 2.3 Sprint candidate `CI-RULESET-CONCURRENCY-REFACTOR` (estructural, post-launch)

Refactor del workflow `e2e-error-audit.yml` de `concurrency: group: staging-exclusive` global a:
- **Opción A**: `concurrency: group: staging-${{ github.ref }}` → per-PR concurrency. Trade-off: 2+ PRs corren contra Supabase staging simultáneamente → contaminación de fixtures.
- **Opción B**: `concurrency: group: staging-exclusive` global + `cancel-in-progress: 'on-push-replace'` (hipotético, no es configurable actualmente en GHA) → preservar PENDING en vez de reemplazar. No existe en GHA 2026.
- **Opción C**: Esquema híbrido con queue externo (Redis lock / Upstash) que coordine entrada a Supabase staging sin depender de GHA concurrency.

Prioridad: MEDIA post-launch. Documentado como deuda candidata en Ep1 cierre bitácora.

### Protocolo operativo mientras no se aterriza el refactor

Antes de push de una rama cuando hay CI activo de otra:
1. Verificar `gh run list --limit 5 --json headBranch,status` que no haya runs `in_progress` o `queued` sobre otros branches contra Supabase staging.
2. Si hay un run `queued`: esperar a que arranque (status→in_progress) antes de pushear. El PENDING ya entró a estado "activo", no se reemplaza.
3. Si hay un run `in_progress`: push es seguro — el nuevo entra a PENDING sin cancelar nada.

Aterrizar este chequeo como step automático está fuera del scope de este documento pero puede ser parte del refactor C mencionado arriba.

---

## 3. Candidatos a enmienda CLAUDE.md

Ambos patrones son candidates para enmienda del PR #177 pending ("CLAUDE.md enmiendas noviembre") si tiene ventana abierta:

### Candidate 3.1 — fix-flakes-ext template como capítulo nuevo

Sección canónica: `## Flakes transient — template reusable fix-flakes-ext` (bajo "Testing / CI" en CLAUDE.md).

Contenido: pointer al presente documento (`docs/planes/patterns-operativos-20261126.md § 1`) + los 4 patrones defensivos sintetizados (threshold, retry 3-attempts, re-login, HTML response retry) + nota "requiere GO explícito del PO".

### Candidate 3.2 — concurrency staging-exclusive queue-replace como regla operativa

Sección canónica: `## Concurrency CI — regla operativa (no P-numerada, 2026-11-26)` bajo "Workflow" en CLAUDE.md.

Contenido: pointer al presente documento (`docs/planes/patterns-operativos-20261126.md § 2`) + la regla práctica ("antes de push, verificar `gh run list` por queued/in_progress en el mismo group staging-exclusive") + referencia a los 2 incidentes en bitácora (Ep1 ruleset-gridlock + Ep5 cola nocturna cierre).

---

## 4. Trazabilidad

- PR #214 fix-flake-cue1 A1.c threshold → `e27137d` main.
- PR #215 fix-flake-link signupLink retry → `b378a4c` main.
- PR #216 fix-flake-sentry re-login → `67f5e1d` main.
- PR #218 fix-flakes-ext OPT-3 (A1.e + pan-1 T3 retry) → `2f40545` main.
- Bitácora Ep1 cierre: [`docs/bitacora/incidentes-20261124.md § Episodio 1`](../bitacora/incidentes-20261124.md).
- Bitácora Ep5 cierre: [`docs/bitacora/incidentes-20261124.md § Episodio 5`](../bitacora/incidentes-20261124.md).
- Análisis diagnóstico original de los 3 flakes: [`docs/planes/flakes-pre-existing-20261125.md`](flakes-pre-existing-20261125.md).
- PR #177 pending (CLAUDE.md enmiendas noviembre) — check if ventana abierta para 3.1 + 3.2.
