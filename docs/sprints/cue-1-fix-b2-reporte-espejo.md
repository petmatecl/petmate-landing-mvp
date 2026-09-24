# Sprint cue-1-fix · Fase B2 · Reporte espejo — 7 condiciones PO 2026-09-24

**Fecha**: 2026-09-24.
**Rama**: `cue-1-fix` (PR #85).
**Alcance**: fix estructural del stale closure del watchdog + revert instrumentación B1.5 + F4 doble dirección (negativa+positiva) + B3 CI-SPEC-COUNT + BACKLOG updates.
**Sin merge hasta**: sábado 2026-09-27 (si verde) + QA PO post-deploy prod OK.

---

## Cumplimiento por condición PO

### 1) Fix watchdog useRef (opción 1) + quitar eslint-disable exhaustive-deps

**Aterrizado** en `contexts/UserContext.tsx`:

- **Nuevo `stateForWatchdogRef`** (Op 1 del reporte espejo B1.5): objeto ref con `isLoading`, `user`, `hydrationState`, `routerAsPath`. Actualizado en cada render (línea inmediata tras la declaración), sin useEffect adicional.
- **useEffect del watchdog** ahora lee state fresco vía `stateForWatchdogRef.current` dentro del `setTimeout` de 15s — sin capturar closure.
- **`eslint-disable-next-line react-hooks/exhaustive-deps` REMOVIDO** del useEffect. Cero ignore del linter en el path fixeado.
- **Cero cambio de deps** en el useEffect (sigue `[]`): el ref se lee dentro del timer, no en las deps. El linter aprueba porque `stateForWatchdogRef` es ref, `previousRouteRef` y `lastAuthEventRef` también son refs, y ya no hay `isLoading`/`user`/`hydrationState`/`router.asPath` capturados directamente.

Build local exit 0 sin warnings de exhaustive-deps sobre este effect.

**Otros `eslint-disable-next-line react-hooks/exhaustive-deps` en `UserContext` y componentes de auth** (grep completo, no tocados en este PR según condición PO):

| Archivo:línea | Effect | Nota |
|---|---|---|
| `components/Client/ClientLayout.tsx:50` | `}, [userId, retryTrigger]); // eslint-disable-line react-hooks/exhaustive-deps` | Deps declaradas parcialmente. Revisar por qué el linter reclama qué. |
| `components/Client/NotificationCenter.tsx:118` | `// eslint-disable-next-line react-hooks/exhaustive-deps` | Contexto pendiente. |
| `components/SessionTimeout.tsx:195` | `// eslint-disable-next-line react-hooks/exhaustive-deps` | Sprint email-landing session-timeout fix 2026-08-25. Contexto pendiente. |

**Cero disables adicionales** en `contexts/UserContext.tsx` (post-B2 remove — antes había 1 en L855). Cero disables en `pages/reset-password.tsx`, `pages/email-confirmado.tsx`, `pages/completar-registro.tsx`, `components/Shared/RoleGuard.tsx`, `components/Shared/OnlineStatusProvider.tsx`, `components/Shared/NotificationBell.tsx`.

**Cero se toca** los 3 disables listados en este PR. Anotados para revisión en sprint futuro si aparece regresión.

### 2) F4 en las dos direcciones (P8)

**Dirección NEGATIVA** — hydrate OK debe dar `warns=0` y cero `captureMessage`. Aterrizado en `e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts`:

- **A1.c**: `expect(w1.warnings.length).toBe(0)` + `expect(w2.warnings.length).toBe(0)`. Pre-fix esta assertion fallaba con warns=1+1; post-fix debe pasar.
- **A1.d**: `expect(warnings.length).toBe(0)` post-signOut + navegación /security-logout. Pre-fix warns=1.
- **A1.e**: `expect(wA/wB.warnings.length).toBe(0)` tab oculta 90s + reactivación. Pre-fix warns=1+1.

Los tests pasan a ser assertions de regresión permanente: pre-fix fallaban, post-fix pasan. Si el watchdog vuelve a romperse por futuros cambios en UserContext (nuevo eslint-disable, nuevo state agregado sin ref), estos specs fallan.

**Dirección POSITIVA** — condición forzada del spec `cue-1-watchdog.spec.ts`: queries bloqueadas indefinidamente (`page.route('**/rest/v1/proveedores*', () => new Promise(() => {}))`) → hydrate cuelga real → `isLoading` sigue `true` en state real → `stateForWatchdogRef.current.isLoading` refleja `true` → **watchdog dispara warn correctamente**.

- Post-fix: `stateForWatchdogRef` refleja state real → el positivo sigue funcionando idénticamente a pre-fix (assert `warns.length > 0` sigue verde).
- Sin el positivo, un watchdog que nunca dispara también daría `warns=0` en A1.c/d/e — no distinguible del fix. El par negativo (A1.c/d/e) + positivo (cue-1-watchdog) verifica **P8 en ambas direcciones**: dispara cuando debe, NO dispara cuando no debe. Comentario agregado al header del spec cue-1-watchdog documentando este pairing.

### 3) Verificación de la teoría antes del merge — cross-check GA4

**Método propuesto**: cruzar los 36 events del issue prod (ventana 2026-09-15 → 2026-09-24, 9 días) con sesiones GA4 de duración >15s en el mismo período. Si la teoría del stale closure es correcta, el watchdog dispara en toda visita >15s con storageState válido (o en toda visita >15s a rutas sin auth también, dependiendo del rendering path).

**Estado**: **NO PUEDO ejecutar el cross-check** — cero MCP GA4 configurado, cero export descargable, cero credencial en el runner. `.mcp.json` local solo tiene supabase-staging-rw + supabase-prod-ro + vercel + context7. **Pido al PO que traiga el número**:

- **Métrica requerida** (Google Analytics 4, propiedad Pawnecta prod):
  - Reports → Engagement → Pages and screens → filtro fecha 2026-09-15 al 2026-09-24 (9 días).
  - Métrica: **Sessions with `Average engagement time per session > 15s`** — o equivalente ("session duration bucket >15s").
  - Alternativa si GA4 no separa: `Total sessions` × `% sessions > 15s duration`. Con solo el total y una estimación del % en > 15s alcanza.
  - Rango de cifra que confirmaría la teoría: **orden de magnitud comparable a 36 events** (ej. entre 200 y 5000 sesiones >15s). Si GA4 reporta 500-2000 sesiones >15s en la ventana, el watchdog disparando en un subset (36) es plausible con la teoría (no cada sesión dispara — depende de qué combinación de state stale + condition guard trigger; se estima que solo un fracción disparaba porque la condición `stuckLoading || stuckNoUser` requiere valores específicos del closure inicial).
  - Cifra que refutaría la teoría: si GA4 muestra >100.000 sesiones >15s pero solo 36 events, o al revés <100 sesiones >15s con 36 events, el orden de magnitud no cuadra y hay otra condición además del stale closure.

**Anotado como abierto**: pending cifra GA4 del PO. Sin ella, la teoría del stale closure es la **explicación más probable con la evidencia empírica actual** (Promise.all resuelve <1s + watchdog dispara igual + fix del closure inmediato + reversibilidad del `eslint-disable`), pero **no está confirmada por cross-check con GA4**. Post-cross-check GA4, se decide si CUE-1 se cierra o se mantiene con nota "cross-check no cuadra, condición adicional pendiente".

### 4) F1+F2 NO van — CUE-1-FALLBACK CONVIENE en BACKLOG

**Aterrizado** en BACKLOG.md:

- Ítem **CUE-1-FALLBACK** [CONVIENE] con disparador "evento real de loading_never_resolved con watchdog corregido". Alcance: pieza F1+F2+F4 completa (AbortController timeout 10s + fallback setUser + Sentry event `user_context_timeout_fallback` con tags stuck_reason+has_storage_session+sw_controlling+route+cuál de las 2 promises no resolvió + spec P8).
- **Trigger para activar**: post watchdog corregido, si Sentry recibe events NUEVOS con `user.id` poblado + payload consistente con hydrate colgado real (no stale). Sin ese trigger empírico, queda en CONVIENE indefinido.
- F1+F2+F4 NO aterrizan en PR #85. Cero código para arreglar problema que empíricamente no existe.

### 5) CUE-1 NO se cierra

**Aterrizado** en BACKLOG.md — ítem CUE-1 reescrito con estado empírico:

- **Título**: "36 events previos son ruido del instrumento; cuelgue original queda sin evidencia".
- **Estado**: `NO CERRADO · watchdog corregido 2026-09-24`.
- **Ventana observación**: 2026-09-29 → 2026-10-27 con `user.id` activo (post-#82 mergeado 2026-09-23).
- **Regla de baja**: si en la ventana cero events reales del issue + cero reportes de usuarios → **baja a CONVIENE al regreso PO 2026-10-28**. NO se cierra como "resuelto".
- **Cuelgue original PO 2026-08-27**: sin evidencia a favor ni en contra post-fix. Documentado como abierto en la nota.

Idem sección "acta" en `docs/sprints/bloque-j-4.md` (actualización en el mismo commit).

### 6) Revert instrumentación [CUE-1-INSTR] + B3 CI-SPEC-COUNT en el mismo PR

**Revert aterrizado** en el mismo commit del fix:
- `contexts/UserContext.tsx` — 3 sitios de `console.debug('[CUE-1-INSTR] ...')` removidos. Cero traza en producción.
- `e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts` A1.c — eliminados: `page.on('request')`, `page.on('response')`, colección INSTR logs, bloques de reporte por pestaña. Solo queda la lógica base + assertions negativas nuevas.

**B3 CI-SPEC-COUNT aterrizado** en `.github/workflows/e2e-error-audit.yml`:

- Step nuevo pre-Playwright: `B3 CI-SPEC-COUNT — verificar cobertura de specs en workflow`.
- Verificación (a): dirs bajo `e2e/specs/` (via `find -mindepth 1 -maxdepth 1 -type d`) vs dirs listados en el workflow (via `grep -oE 'e2e/specs/[a-zA-Z0-9_-]+/'`). Si algún dir falta en NINGUNA de las 2 líneas de `npx playwright test` (rápida + F2) → **falla con lista explícita**.
- Verificación (b): conteo total de `.spec.ts` files vs mínimo `MIN=40` (piso arbitrario). Si `< MIN` → falla (regresión de setup o borrado accidental).
- Corre PRE-Playwright para fallar antes del retry cascade largo.
- **Cerraría el falso positivo verde del corolario P8 13ª** (workflow ignora specs, checks verdes falsos porque cero test corría).

### 7) Merge sábado si 5 verdes + QA PO prod pasa

**PR #85 estado**: pendiente CI post este commit. Al pushear (`git push`), CI corre:
- typecheck-and-build (esperado verde — build local OK).
- Playwright suite error-audit (con A1.c/d/e + A3 y el nuevo B3 CI-SPEC-COUNT step). **A1.c/d/e ahora deben pasar con warns=0** post-fix del stale closure.
- Playwright suite F2 (sin cambio relacionado).
- Vercel deployment (build production).
- Vercel Preview Comments.

**Si 5 verdes el sábado** → notifico al PO. **QA PO post-deploy**:
- Navegar 5 min con sesión en dos pestañas.
- Post-logout.
- Confirmar en dashboard Sentry (issue `JAVASCRIPT-NEXTJS-7`) que **NO llega ningún `user_context_stuck`** con la release nueva.

**Merge solo con GO PO explícito post-QA**. NO auto-merge.

**Plan B** si no llega verde el sábado o QA no pasa: PR queda abierto, merge en Tramo 3 (regreso PO 2026-10-28+).

---

## Reporte espejo 1-7 (checklist punto por punto del pedido PO)

| # | Condición PO | Estado |
|---|---|---|
| 1 | Fix watchdog useRef Op1 + quitar eslint-disable + listar otros disables | ✅ Aterrizado; 3 otros disables listados sin tocar |
| 2 | F4 negativo (A1.c/d/e warns=0) + positivo (cue-1-watchdog con queries bloqueadas dispara) | ✅ Aterrizado en ambas direcciones |
| 3 | Cross-check 36 events vs GA4 sesiones >15s | ⚠️ **Pending PO** — cero MCP GA4 disponible; método + cifras esperadas anotadas arriba |
| 4 | F1+F2 NO van → BACKLOG CUE-1-FALLBACK CONVIENE | ✅ Aterrizado con disparador explícito |
| 5 | CUE-1 NO cierra + ventana observación + regla de baja | ✅ Reescrito en BACKLOG + acta j-4 |
| 6 | Revert instrumentación [CUE-1-INSTR] + B3 CI-SPEC-COUNT mismo PR | ✅ Ambos aterrizados en el commit del fix |
| 7 | Merge sábado si verde + QA PO prod pasa | ⏳ Pendiente CI + QA PO |

**Sin merge hasta GO PO explícito post-QA prod**.

---

## Método P8 acumulado del sprint

| Falseo | Descubrimiento |
|---|---|
| B1 (upgrade) | Upgrade ~2.117.1 NO cierra la causa. Los issues #2426/#2344/#2392 no aplican al mecanismo real. |
| B1.5 (instrumentación) | Promise.all resuelve en <1s; el cuelgue del hydrate NO EXISTE. El watchdog reporta falso positivo. |
| B2 (fix del closure) | El fix es 8 líneas + revert 1 disable del linter. Cero AbortController, cero fallback, cero complejidad F1+F2. |

**Costo evitado**: ~2-3 días de F1+F2+F3+F4 aterrizados sobre problema inexistente + ventana observación prod con métrica que no bajaría. Costo P8: 2h B1.5 + 30 min B2.

**Corolario P8 13ª** (workflow ignora specs) queda cerrado por B3 CI-SPEC-COUNT en este PR — 4ª instancia canónica "señales verdes que no hacen nada" con defensa activa.
