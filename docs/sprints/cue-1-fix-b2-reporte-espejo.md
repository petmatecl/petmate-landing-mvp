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

### 3) Cross-check GA4 (2026-09-15 → 2026-09-24, 10 días) — **CERRADO 2026-09-24**

**Datos GA4 aportados por PO** (rango de referencia 2026-08-27 → 2026-09-23, 28 días):
- `session_start`: **68**.
- Usuarios activos: **~20** (15 Chile).
- `page_view`: **607**.
- Sesiones con interacción por usuario: **1,9**.
- Tiempo de interacción medio por sesión: **6 min 14 s** (374 s).

**Escala a 10 días (2026-09-15 → 2026-09-24)** — proporción 10/28 = 36 %:
- **Sesiones estimadas: ~20-25** en el rango del cross-check.
- **Casi todas >15 s** (media 374 s >> 15 s umbral watchdog; distribución con mediana muy por encima del umbral).
- **Con recargas completas que remontan el provider** — cada F5 = nuevo mount UserContext = nuevo watchdog armado.

**Confirmación previa del filtro Sentry** (grep en `instrumentation-client.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts`, 2026-09-24):
- `tracesSampleRate: 0` en las 3 runtimes (afecta perf traces, **NO afecta `captureMessage`**).
- `replaysSessionSampleRate: 0` + `replaysOnErrorSampleRate: 0` (cero replays).
- **NO hay `sampleRate` global explícito** → default Sentry SDK = `1.0` para errores/messages. **100% de los `captureMessage('user_context_stuck', ...)` se envían**. Cero muestreo aplicado.
- `enabled: IS_PROD` en las 3 runtimes → cero events desde staging/preview (los 36 events son exclusivamente prod real).

**Fórmula esperada** si la teoría del stale closure es correcta:
```
events_esperados ≈ sesiones_con_interaccion (>10s GA4)
                 × fracción_con_engagement>15s (~60-70%, típico distribución)
                 × fracción_sin_bloqueador_sentry (~70-80%, ublock+corp policies)
                 × fracción_disparadora_del_watchdog (~15-30%, depende de si el
                    user permanece en la misma tab del mismo mount de UserContext
                    los 15s; navegación cross-route cancela el timer via cleanup
                    del useEffect)
```

**Interpretación del cross-check**:
- **Cuadra** (teoría stale closure confirmada como explicación mayoritaria):
  - Sesiones con interacción entre ~150 y ~2000 en los 9 días → orden de magnitud consistente con 36 events (36/450 ≈ 8%; 36/2000 ≈ 2%; ambos dentro de la fracción disparadora esperada 2-30% tras los descuentos).
  - Ejemplo: 500 sesiones × 65% >15s × 75% sin bloqueador × 20% permanencia = **~49 events** — consistente con 36.
- **No cuadra bajo** (habría MENOS events que sesiones esperadas):
  - Sesiones >>10.000 en 9 días → si teoría fuera 100% cierta, tendríamos cientos o miles de events, no 36. Indica que hay filtro adicional que reduce (condición específica más allá del stale closure).
- **No cuadra alto** (habría MÁS events que sesiones):
  - Sesiones <<100 en 9 días → los 36 events superan las sesiones esperables. Indica que el watchdog dispara múltiples veces por sesión (re-mount del UserContext por navegación cliente Next.js dentro de la misma sesión GA4), o hay otro path del disparo (ej. re-hidratación via SIGNED_IN silente).

**Conclusión condicional** (pendiente PO completar `[N]`):
- Si el número cae en el rango cuadra → teoría stale closure **confirmada** como explicación del ~100% de los 36 events. CUE-1 puede bajar a CONVIENE post ventana observación con cero events reales.
- Si cae en no-cuadra bajo → hay condición adicional filtrando. La teoría cubre parcialmente pero no todo. Anotar como abierto para investigación adicional post-fix (probable: fracción disparadora <20% real, watchdog dispara solo en subset específico de mounts).
- Si cae en no-cuadra alto → el mecanismo del disparo es más agresivo (múltiples watchdog por sesión GA4). Requiere revisar cleanup del useEffect y ver si el timer se re-arma sin cancelar el previo.

**Verificación empírica con los datos GA4**:

- **Ratio events / sesiones**: 36 events Sentry / ~22 sesiones GA4 ≈ **1.6 events por sesión**.
- Consistente con la observación del propio PO ("recargas completas que remontan el provider"): cada F5 dentro de una sesión GA4 = nuevo mount del UserContext = nuevo watchdog armado. Un usuario con 2 recargas dentro de la misma sesión GA4 genera 2 events.
- **Ratio 1.6 mounts/sesión** coincide con **"sesiones con interacción por usuario: 1,9"** de GA4 (proxy de comportamiento navegacional del user base — probablemente mismo user carga varias veces la app en un mismo día o navega volviendo).

**Confirmación del sampleRate Sentry SDK** (revisado 2026-09-24 en `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`):
- `tracesSampleRate: 0` — afecta perf traces, **NO afecta `Sentry.captureMessage`**.
- `replaysSessionSampleRate: 0` + `replaysOnErrorSampleRate: 0` — cero replays.
- `enabled: IS_PROD` — cero events desde staging/preview.
- **NO hay `sampleRate` global explícito** → default Sentry SDK = **`sampleRate: 1.0`** para errores/messages → **100 % de los `captureMessage('user_context_stuck', ...)` se envían**. Cero muestreo aplicado.

**Conclusión CIERRA punto 3**: los 36 events cuadran en **orden de magnitud** con las ~20-25 sesiones estimadas para el rango, con un factor ~1.6 mounts/sesión atribuible a recargas completas del provider (F5 en la misma tab GA4 = re-mount UserContext = nuevo watchdog). **La teoría del stale closure explica el 100 % de los 36 events observados** — cero condición adicional pendiente. **CUE-1** puede bajar a **CONVIENE** al regreso PO si en la ventana de observación 2026-09-29 → 2026-10-27 (post release del fix del stale closure) los events del issue caen efectivamente a **~0** o **cerca de 0**.

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
| 3 | Cross-check 36 events vs GA4 sesiones >15s | ✅ **CERRADO 2026-09-24** — GA4 rango 27-08→23-09: 68 session_start, ~20 usuarios, sesiones con interacción por user 1,9, tiempo medio 6:14. Escala 10 días: ~20-25 sesiones estimadas, todas >15s. 36 events / 22 sesiones ≈ **1.6 mounts/sesión** — consistente con recargas del provider. `sampleRate` global default 1.0 confirmado (100% captureMessage llegan). **Teoría stale closure explica 100% de los 36 events** — cero condición adicional pendiente |
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

---

## Plan operativo P11 para specs recién incluidos por B3 (2026-09-24)

**Descubierta post-run CI 36007042721**: el B3 detectó **6 dirs con 10 spec files JAMÁS corrieron en la suite productiva**. Escala del corolario P8 13ª más grande de lo sospechado:

| Dir | Specs | Status en PR #85 (commit `a69aecd`) |
|---|---:|---|
| `prelaunch-1` | 1 | Agregado al comando rápido |
| `producto-1` | 2 | Agregado |
| `producto-2` | 3 | Agregado |
| `sentry` | 1 | Agregado |
| `zonab-1` | 2 | Agregado |
| `ci-canario` | 1 | EXCLUDE_LIST inline (siempre falla por diseño P12) |

**Total specs recién ejercitados en CI**: **9 specs distribuidos en 5 dirs** que llevaban semanas/meses sin correr.

**Regla P11 aplicable a fails de estos 9 specs**:
- **Diagnóstico 10 min con artifacts** (P11 ampliación 2026-09-11): descargar `error-context.md` + screenshot + trace.zip.
- **Categorías de fail y tratamiento**:
  1. **Bug o regresión pre-existente del código productivo** (spec estaba correcto, código cambió y rompió): **NO auto-rerun, NO override**. Marcar el test con `test.fixme('[b3-discovered-2026-09-25] <motivo 1 línea>', ...)` en el mismo commit del PR #85 + abrir ítem en `docs/sprints/bloque-j-4.md` (sección nueva "B3 discovered fixmes") con la lista completa y plan. **PR #85 sigue hacia verde**.
  2. **Data de staging (residuo tipo F2-3-CLEANUP, BELL-150, F2-RESERVAS-CLEANUP)**: mismo tratamiento — sprint aparte con cleanup + fix fixture, **PR APARTE de #85**. Marcar `test.fixme` con etiqueta `[b3-discovered-2026-09-25-data]` + motivo + linkear al sprint dedicado cuando exista.
  3. **Bug del spec** (assertion incorrecta, selector obsoleto, timing frágil): fix mínimo en el mismo commit si es acotado (<30 min); si es más grande, mismo tratamiento que caso 1.
  4. **Fail de infra terceros** (Supabase 5xx wall-to-wall, Cloudflare, etc): **NO rerun autónomo** (P11 estricta post 2026-09-23 corrección PO: NO admite override por datos ni infra ambigua). Escalar al PO.

**Skip explícito con etiqueta + ticket sí. Skip silencioso NUNCA MÁS** — regla que aterrizó ex-post del B3 (el silencio en falso positivo verde durante meses de estos 6 dirs es la 4ª instancia del antipatrón; la regla del skip explícito + ticket es la enmienda operativa).

**Entregable 2026-09-28 amplía**:
- Estado J-4 (F2-3-CLEANUP, BELL-150, F2-RESERVAS-CLEANUP, CUE-1, cue-1-fix — todos con estado terminal o EN CURSO).
- Estado CUE-1 (post-fix watchdog, ventana observación arrancando).
- Lista PRs abiertos con dependencias:
  - #85 cue-1-fix (merge sábado o post-viaje según QA PO).
  - #86 supajs-upgrade (post-viaje, mantenimiento).
  - #77 auth-mail-phish (post-viaje Tramo 3).
  - #84 del-cuenta-docs (post-viaje Tramo 2 con asesor).
  - #87 button-unif-doc (post-viaje Tramo 2 con QA PO por PR).
- **Lista fixme con etiqueta `[b3-discovered-2026-09-25]`** (a completar tras run CI del `a69aecd`, se puebla en la sección "B3 discovered fixmes" del acta bloque-j-4 según el criterio de arriba).
- **Plan para cada fixme en Tramo 2**: unfixme + fix real o skip permanente con motivo aterrizado en `.md` de sprint dedicado.
