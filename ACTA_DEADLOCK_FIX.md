# ACTA — Sprint `deadlock-fix`

- **Rama**: `deadlock-fix` (13 chars, DNS-safe).
- **SHA en prod**: `3a36abbddbbea4b8d5e2b021799aeec8144480f6` (short `3a36abb`).
- **Tag anotado**: `deadlock-fix-prod-20260828` → apunta a `3a36abb`. Tag object `158bcea790f090a5137083274d6b00025a2e73df`.
- **Fecha del tag**: `2026-08-28 14:06:27 -0400` (extraída con `git for-each-ref --format='%(creatordate:iso)'`, distinta de la fecha del commit apuntado — regla P5 del proyecto).
- **Estado**: **CERRADO**. Fix aterrizado en main, instrumentación removida en commit propio revisado por PO, smoke visual verde.
- **Rama histórica**: `cuelgue-diag @ 70799d4` — sprint de investigación completo, **no mergeada**. Vive como registro auditable del proceso diagnóstico. Este acta referencia sus logs, snapshots y el control negativo del deadlock.

---

## 1. Contexto y motivación

Cuelgue intermitente reportado por PO durante smokes prod del sprint `admin-visibilidad` (2026-08-28): spinner indefinido en múltiples rutas (`/admin > Proveedores`, `/admin > Moderación`, `/explorar`, ficha de proveedor), en prod y en staging, sin excepción en consola, sin request fallido reportado, destrababa solo con Ctrl+Shift+R. Frecuencia "seguido" sin disparador identificado. Bug preexistente al sprint `admin-visibilidad` (no introducido por él).

## 2. Contenido del sprint

Sprint dividido en 2 ramas:

- **`cuelgue-diag`** (sprint de investigación, no mergeada): mapeo de código + instrumentación temporal + 3 rondas de diagnóstico. Termina en `70799d4` con la causa raíz identificada empíricamente por PO usando snippet B (`setSession` con credenciales actuales → cuelgue reproducido a demanda, stack trace capturado).
- **`deadlock-fix`** (fix aterrizado a main): 4 commits.

| # | SHA | Título |
|---|---|---|
| 1 | `e74516c` | chore(cuelgue-diag): instrumentacion temporal H2 vs H4 (cherry-pick de `3d777cc`) |
| 2 | `4bf987c` | chore(cuelgue-diag) ronda 3: event exacto onAuthStateChange + queries separadas + userId por hydrate (cherry-pick de `70799d4`) |
| 3 | `9150b6a` | fix(deadlock): setTimeout en SIGNED_IN cierra reentrada al lock del SDK Supabase Auth + guard identidad |
| 4 | `08ed0fc` | chore(deadlock-fix): expose `window.__hydratedUserIdRef` + `__resetHydratedUserId` helper para T1b |
| 5 | `3a36abb` | chore(deadlock-fix): remove instrumentacion temporal (pre-merge cleanup) |

---

## 3. Las 6 hipótesis y cómo murió cada una

Los datos empíricos del PO en ronda 2 (Tests 1-2 de consola) descartaron 4 de 6 hipótesis, ronda 3 (snapshot con instrumentación) descartó las últimas 2. Cada una con evidencia literal.

### H1 · SDK Supabase espera un `INITIAL_SESSION` que nunca dispara

- **Predicción**: en cuelgue, `await supabase.auth.getSession()` desde consola también cuelga.
- **Killer**: **Test 1 del PO** en consola durante cuelgue activo (uptime 26 min): `microtask -> 1ms`, `setTimeout 0 -> 1ms`, `raf -> 14ms`, `setTimeout 1000 -> 1012ms`. Event loop sano. Adicionalmente, `snap.getSessionTest = { ok: true, hasSession: true, error: null }` post-episodio — el auth respondió.
- **Conclusión**: SDK auth NO estaba estancado. H1 **MUERTA**.

### H2 · Singleton cliente Supabase corrupto / múltiples instancias / subscribers orphans

- **Predicción**: `supabaseClientEvals > 1` o `authSubscribers` acumulando monotónico.
- **Killer**: **snapshot ronda 2 del PO**: `supabaseClientEvals: 1`, `authSubscribers: 2` (exactamente esperado: UserContext + OnlineStatusProvider, sin acumulación). Verificación cruzada post-episodio: `dataFetchTest: { ok: true, status: 200, rowCount: 1 }` — cliente sano end-to-end.
- **Conclusión**: cliente único, subscribers correctos, cero corrupción. H2 **MUERTA**.

### H3 · Main thread bloqueado por trabajo sincrónico → microtask queue no procesa `fetch()`

- **Predicción**: `setTimeout(() => console.log('tick'), 0)` desde consola NO imprime durante cuelgue; Performance record muestra Long Task.
- **Killer**: **Test 1 del PO** mostró `microtask -> 1ms`, `setTimeout 0 -> 1ms`, `raf -> 14ms`, `setTimeout 1000 -> 1012ms`. Event loop perfectamente sano mientras la UI seguía colgada.
- **Conclusión**: cero bloqueo del main thread. H3 **MUERTA**.

### H5 · Service Worker intercepta el `fetch()` a nivel bindings del script

- **Historia**: hipótesis con dos rondas de refutación. Primera refutación del PO (bypass network toggle en DevTools) resultó **prueba inválida** — el toggle no silenció al SW como se creía, `StrategyHandler.js` seguía interviniendo. Hipótesis pasó a "no descartada, prueba inválida".
- **Killer definitivo**: **Test 2 del PO**: `fetch('https://ouezpeeiwjwawauidrqq.supabase.co/rest/v1/')` desde consola en pestaña colgada → **401 en 304ms**. El fetch al origen Supabase sale y vuelve mientras la UI está colgada. Si el SW interceptara el fetch a ese origen, este no habría vuelto.
- **Conclusión**: SW NO intercepta al origen Supabase. H5 **MUERTA**.

### H6 · Script tercero (`feature_collector.js` o extensión) monkey-patcha `fetch`

- **Predicción**: en incógnito puro (sin extensiones) el cuelgue no ocurre; el fetch a Supabase no vuelve para requests con headers específicos.
- **Killer**: **Test 2 del PO** (mismo que H5): fetch crudo al dominio de Supabase vuelve en 304ms. Si un patch estuviera abortando esos fetches, no habría vuelto.
- **Conclusión**: fetch a Supabase funciona normal. H6 **MUERTA**.

### H4 · `useEffect` de mount se pierde / unmount rápido / StrictMode / bfcache → fetch nunca se llama

- **Predicción**: en el cuelgue, cero logs `run-fired` o `rpc:start` porque el effect NUNCA disparó.
- **Killer**: **snapshot ronda 2 del PO** mostró `explorar:run-fired` **+ `explorar:rpc-buscar_servicios:start` en los logs**. El effect SÍ disparó, el fetch SÍ se llamó. El cuelgue no era ausencia de fetch — era una espera dentro del path del hydrate.
- **Conclusión**: effect vivo, fetch disparado. H4 **MUERTA en su forma original**.

### Causa raíz confirmada empíricamente (post-H4)

Del snapshot ronda 2 emergió el patrón real: `hydrate #1` sano (`hydrate-end setIsLoading(false)` en +584ms) y `hydrate #2` disparado a los +12532ms sin acción del user, cuyas queries del `Promise.all` NUNCA resuelven — solo se liberan por el timeout de 20s de la instrumentación. Ronda 3 instrumentó `event` exacto + `userId` + queries separadas + expose `__pawnectaSupabase`. Snippet B (setSession con credenciales actuales) reprodujo el cuelgue a demanda con stack trace capturado por Chrome:

```
setSession
  → _acquireLock
    → lock
      → _setSession
        → _notifyAllSubscribers
          → [handler de onAuthStateChange en UserContext]
            → hydrateFromSession
              → queries a proveedores / usuarios_buscadores
```

**Mecanismo**: las queries de datos del hydrate se ejecutan DENTRO del lock de auth del SDK. Para armar una query, el cliente necesita el access token, y obtenerlo requiere ese MISMO lock, que el handler todavía tiene tomado porque está esperando a que las queries terminen. **Deadlock circular por reentrada.**

---

## 4. Hipótesis del auditor que resultaron falsas (registro honesto)

El acta pierde valor si solo anota los aciertos. Los siguientes fueron errores del auditor durante el sprint — los registro con la evidencia empírica que los mató:

### 4.1 · Service Worker propuesto como causa (dos veces, la segunda con prueba mal diseñada)

- **Primera propuesta** (auditor, ronda 1): `StrategyHandler.js:160` como initiator en el trace observado del PO sugería SW en juego. Consistente con Ctrl+Shift+R destraba (bypasa SW cache). **Evidencia circunstancial, no de mecanismo**.
- **Primera refutación** (auditor, ronda 2 tras PO decir "bypass for network no lo silenció"): mi propuesta de refutación asumía que "bypass for network" en DevTools efectivamente silenciaba al SW. **Falso**. El toggle no desconecta al SW en runtime — solo pasa a network las requests que el SW ya no capturaría (los assets con Content-Type distinto, por ejemplo). El SW seguía interviniendo, `StrategyHandler.js` seguía apareciendo. **Prueba de refutación mal diseñada — di por descartada a H5 cuando no lo estaba**.
- **Refutación válida** (PO, ronda 2 con Test 2): fetch crudo al origen Supabase vuelve en 304ms — el SW no captura ni bloquea ese origen. **H5 muerta con evidencia positiva-conocida**.
- **Lección**: verificar que el mecanismo de refutación efectivamente hace lo que promete antes de sacar conclusión. Corolario P8 5ª aplicado a un toggle de DevTools. Registrado en BACKLOG.

### 4.2 · "El fetch nunca sale a la red" — refutada por mis propios logs

- **Propuesta** (auditor, ronda 2 tras captura de Network del PO con cero requests Supabase): interpreté "cero requests visibles" como "el fetch nunca se dispara desde el script". Adelanté ese diagnóstico como base para H4.
- **Killer empírico** (ronda 2 snapshot): mis propios logs `[cuelgue] explorar:run-fired` y `[cuelgue] explorar:rpc-buscar_servicios:start` mostraron que el fetch SÍ se dispara. La captura de Network del PO fue tomada en una ventana donde aún no había salido (o el filtro engañó) — no era prueba de ausencia definitiva.
- **PO explícitamente lo llamó**: "Mi conclusión anterior de 'el fetch nunca sale a la red' era incorrecta". Acepté la corrección en el mismo turno.
- **Lección**: cero requests en un snapshot Network son una ventana temporal, no ausencia estructural. Combinar con instrumentación propia para confirmar disparo.

### 4.3 · RUT como dato faltante sin verificar

- **Propuesta** (auditor, sprint admin-visibilidad, previo al deadlock-fix): en el commit del RPC `admin_listar_proveedores` di por implícito que "RUT: N/A en todos" era esperable porque F1b sigue pendiente y el campo es opcional.
- **Killer empírico** (smokes prod del PO): 7 proveedores SÍ tienen RUT cargado (verificado con Fernanda Hamasaki mostrando `21.894.323-3` en el panel). Mi interpretación era falsa — daba por dato faltante lo que en realidad estaba poblado y visible.
- **PO explícitamente lo llamó**: "Mi reporte inicial de 'RUT: N/A en todos' era incorrecto — esas filas no tenían RUT cargado. 7 proveedores lo tienen y se muestran bien."
- **Lección**: no atribuir "dato faltante" sin verificar con query directa contra BD, incluso cuando la hipótesis parece razonable. Corolario P8 11ª (atribución sin verificar).

Estas 3 quedan documentadas acá y no se van al backlog — son errores de proceso auditor, no deuda del producto.

---

## 5. Stack trace y mecanismo verificado contra el SDK

Verificación paso a paso contra `node_modules/@supabase/auth-js/dist/main/GoTrueClient.js` v2.84.0:

1. `setSession(currentSession)` → `_acquireLock(-1, async () => await _setSession(...))`. Adquiere el lock — `this.lockAcquired = true`.
2. Dentro del lock: `_setSession` con token válido no expirado → `await _getUser(...)` → `await _saveSession(session)` → **`await _notifyAllSubscribers('SIGNED_IN', session)`** — todavía dentro del lock.
3. `_notifyAllSubscribers` invoca los callbacks de `onAuthStateChange`. Nuestro handler entra `case 'SIGNED_IN'` → `await hydrateFromSession(session)`.
4. `hydrateFromSession` hace `Promise.all([supabase.from('proveedores')..., supabase.from('usuarios_buscadores')...])`.
5. Cada `.from(...).select(...)` pasa por `fetchWithAuth(supabaseKey, _getAccessToken.bind(this), ...)` [SupabaseClient.js:71].
6. `_getAccessToken()` [SupabaseClient.js:179]: `const { data } = await this.auth.getSession()`.
7. `getSession()` → `await _acquireLock(-1, async () => await __loadSession())`. **Intenta re-adquirir el lock**.
8. `_acquireLock` detecta `this.lockAcquired === true` → cae en el path de encolado: crea `result = (async () => { await last; return await fn(); })()` y lo encola en `pendingInLock`. Su promise no resuelve hasta que la cadena de `pendingInLock` complete.
9. **Ciclo**: el `_setSession` original (pendingInLock[0]) no completa hasta que las queries completen. Las queries (pendingInLock[1] y [2]) no completan hasta que pendingInLock[0] complete. **Deadlock circular por reentrada**.

**Confirmación adicional en el SDK**: el propio `__loadSession` L tiene:
```js
if (!this.lockAcquired) {
    this._debug('#__loadSession()', 'used outside of an acquired lock!', new Error().stack);
}
```
El SDK **espera** que las queries de datos que necesiten el token pasen por el lock. Antipatrón oficial documentado por Supabase — issue #762.

**Por qué el `noOpLock` preexistente NO evita esto**: reemplaza `this.lock` (primitiva Web Locks vs no-op) pero **NO evita la lógica `lockAcquired` + `pendingInLock`** que corre igual con cualquier implementación de lock que se pase. Cierra un cuelgue distinto (Web Locks huérfanos), la reentrada queda abierta.

**Por qué el hydrate #1 (Canal 1) sí funciona**: se dispara desde `supabase.auth.getSession().then(hydrateFromSession)`. El `getSession()` toma el lock, ejecuta `__loadSession`, libera el lock, resuelve la promise. **Después** el `.then(hydrateFromSession)` corre — fuera del lock. Las queries hijas al pasar por `_getAccessToken` → `getSession` adquieren lock fresh — cero reentrada.

---

## 6. 3 opciones de fix con trade-offs y por qué se eligió 2+1

### Opción 1 · Guard de identidad en el handler

- Skipea hydrate si `session.user.id === hydratedUserIdRef.current`.
- **Ataca**: el disparador específico (SIGNED_IN silente con mismo user). Evita entrar al deadlock desde ESA vía.
- **NO ataca**: la causa estructural. Cualquier otro caller futuro que meta trabajo async dentro de un callback de `onAuthStateChange` cae al mismo deadlock.

### Opción 2 · Deferir hydrate con `setTimeout(fn, 0)` — patrón oficial Supabase

- Encolar el hydrate como macrotask hace que el callback retorne sync, el lock del SDK se libere, y `hydrateFromSession` corra **fuera** del lock.
- **Ataca**: la causa estructural.
- Patrón oficial recomendado por Supabase auth-js.

### Opción 3 · Reactor state signal + hydrate en useEffect separado

- Handler solo hace `setState`, retorna sync, libera el lock. React programa el re-render, un nuevo `useEffect` ve el `pendingHydrate` y dispara el hydrate fuera del lock.
- Más idiomático React, pero refactor mayor de arquitectura del context.
- Overkill para el scope de este fix.

### Decisión PO: **Opción 2 + Guard como cinturón**

- **Opción 2 (setTimeout) cierra el deadlock estructuralmente** — sin ella, el bug vuelve. Es la pieza que arregla el bug.
- **Guard (Opción 1) evita trabajo innecesario** cuando el SDK dispara SIGNED_IN silente con mismo user — es optimización, no protección.
- **Comentario extenso en el código** [contexts/UserContext.tsx](contexts/UserContext.tsx) declara explícitamente los roles distintos con la advertencia literal "Si esto se saca, VUELVE EL BUG. No es opcional" sobre setTimeout, para que en 6 meses nadie confunda un rol con el otro.
- **3 condiciones de implementación PO**:
  1. Guard con ref (`useRef`), no con state — evita stale entre renders.
  2. Logout limpia el ref en 3 puntos: case SIGNED_OUT del handler, hydrateFromSession path guest, softReset. Sin esto, T3 falla (re-login con misma cuenta post-logout sería saltado por el guard).
  3. Chequeo `mounted` dentro del setTimeout — evita setState sobre árbol desmontado.

### Rechazada implícitamente: solo Guard sin setTimeout

Sería parche por vía y quedaría estructuralmente frágil. Cualquier otro caller futuro que meta trabajo async en un callback de `onAuthStateChange` cae al mismo deadlock. Rechazado.

---

## 7. Los 3 tests de aceptación con números literales

Ejecutados por el PO sobre preview `deadlock-fix @ 08ed0fc` (rama con instrumentación viva).

### T1a · Guard actúa con mismo user

```
[+9240ms] onAuthStateChange fired {event: 'SIGNED_IN', hasSession: true, userId: '63c223b7-...', mounted: true}
[+9240ms] SIGNED_IN skipped by guard (same user already hydrated) 63c223b7-...
T1a {elapsed: 339.4, ok: true}
```

**339ms vs control negativo 20000ms** en `cuelgue-diag @ 70799d4`. **PASA**.

### T1b · setTimeout cierra el deadlock (PIEZA 1 aislada)

Con `window.__resetHydratedUserId()` previo para que el guard NO bloquee:

```
[+11383ms] __resetHydratedUserId called via consola helper {prev: '63c223b7-...'}
[+11543ms] onAuthStateChange fired {event: 'SIGNED_IN', hasSession: true, userId: '63c223b7-...', mounted: true}
[+11544ms] onAuthStateChange BRANCH=SIGNED_IN → hydrate (deferred macrotask)
[+11544ms] hydrate-start {hasUser: true, userId: '63c223b7-...', email: 'acanocts@gmail.com'}
[+11545ms] hydrate-query-proveedores:start
[+11545ms] hydrate-query-usuarios_buscadores:start
[+11645ms] hydrate-query-usuarios_buscadores:resolved
[+11647ms] hydrate-query-proveedores:resolved
[+11647ms] hydrate-end setIsLoading(false)
```

Delta queries: **100ms y 102ms**. Cero REJECTED_OR_TIMEOUT. Cero hydrate-catch. **102ms vs control negativo 20000ms** en `cuelgue-diag @ 70799d4` (mismo camino sin fix). El log `BRANCH=SIGNED_IN → hydrate (deferred macrotask)` confirma que el guard NO actuó y la ejecución pasó por la PIEZA 1. **PASA**.

### T3 · Re-login con misma cuenta hidrata (verifica que el fix no trajo un problema nuevo)

```
Logout: hydrate-end-guest setIsLoading(false) + ref cleared
Login:  hydrate-start {hasUser: true, userId: '63c223b7-...', email: 'acanocts@gmail.com'}
        hydrate-query-usuarios_buscadores:resolved (+205ms)
        hydrate-query-proveedores:resolved (+218ms)
        hydrate-end setIsLoading(false)
Header muestra 'Admin'. Panel de proveedor carga con servicios y datos.
Cero 'skipped by guard'. El ref se limpió correctamente en el logout.
```

**PASA** — el bug que el guard podía introducir NO existe.

---

## 8. Nota de alcance del smoke visual post-cleanup

**Registrada honestamente por pedido explícito del PO** — sin maquillar:

- El smoke visual post-cleanup (login → `/admin > Proveedores` → `/admin > Moderación` → panel de proveedor → `/explorar`) sobre `3a36abb` confirmó cero cuelgues visibles y cero regresiones en superficies afectadas.
- **PERO NO revalida el deadlock**: los helpers de consola (`window.__pawnectaSupabase`, `window.__resetHydratedUserId`, logs `[cuelgue]`) se fueron con la instrumentación. El snippet B ya no funciona sobre `3a36abb`.
- **La validación empírica del fix quedó en T1b sobre `08ed0fc`**.
- **La única diferencia entre `08ed0fc` y `3a36abb` es el commit remove-only** (`3a36abb` — verificado por el PO: 380 borradas, 11 agregadas, todas las 11 son re-hilvanado, cero cambio a lógica del fix).
- **Cadena de validación**: T1b (empírica sobre `08ed0fc`) + diff review (`08ed0fc → 3a36abb` cero cambios de lógica) + smoke visual (`3a36abb` no rompió superficies). **Cadena razonable pero indirecta** — no hay validación empírica del deadlock sobre `3a36abb` mismo.

Se acepta el riesgo residual porque el commit remove-only fue quirúrgico y auditado línea por línea antes del merge.

---

## 9. Regla candidata a CLAUDE.md

**Anotada como candidata**, texto final lo cierra el PO:

> Nunca hacer llamadas asíncronas al cliente Supabase dentro del callback de `onAuthStateChange` — el callback corre dentro del lock de auth y cualquier query que necesite el token deadlockea por reentrada. Diferir con `setTimeout(fn, 0)`.

---

## 10. Evidencia P5 completa por fase

- **Ramas**: `cuelgue-diag` (investigación, no mergeada, viva en `70799d4`) + `deadlock-fix` (fix, mergeada a main, viva en `3a36abb`).
- **Commits del sprint deadlock-fix**: 5 (§2).
- **Merge**: FF de `deadlock-fix` (`3a36abb`) → `main`. `origin/main` remoto post-push = `3a36abbddbbea4b8d5e2b021799aeec8144480f6`, verificado con `git ls-remote origin refs/heads/main`.
- **Tag**: `deadlock-fix-prod-20260828` (anotado) → apunta a `3a36abb`.
  - Tag object: `158bcea790f090a5137083274d6b00025a2e73df`.
  - Fecha del tag: `2026-08-28 14:06:27 -0400` (extraída con `git for-each-ref --format='%(creatordate:iso)'` — regla P5 del proyecto, distinta de la fecha del commit apuntado).
  - Desreferencia correcta: `git rev-parse deadlock-fix-prod-20260828^{commit}` = `3a36abbddbbea4b8d5e2b021799aeec8144480f6`.
  - Push remoto verificado: `git ls-remote origin refs/tags/deadlock-fix-prod-20260828` = tag object idéntico.
- **Rama histórica `cuelgue-diag`**: preservada en `70799d4` como registro auditable del sprint de investigación. Contiene los 6 archivos de instrumentación temporal + snapshot ronda 2 + logs de las 3 rondas. NO se mergea nunca. Referenciada desde este acta como control negativo del deadlock (mismo camino sin fix cuelga 20s).
- **Vercel prod**: deploy automático desde `main @ 3a36abb`.
