# Sprint cue-1-fix · Fase B1.5 · Reporte espejo — diagnóstico acotado A1.c (4 puntos)

**Fecha**: 2026-09-24.
**Alcance**: 2h máx experimento diagnóstico solicitado PO. Cero fix. Instrumentación temporal marcada `[CUE-1-INSTR B1.5]` en 3 sitios de `UserContext.tsx` + `page.on('request'/'response')` en spec A1.c. Se revierte antes del merge del fix.
**Run CI**: [36001248238](https://github.com/petmatecl/petmate-landing-mvp/actions/runs/36001248238) — 5 verdes.

---

## Respuesta a los 4 puntos del PO

### a) ¿La petición HTTP de cada consulta SALE del navegador?

**SÍ, ambas salen.** Network summary por pestaña:
- **tab1**: `2 req, 2 res`.
- **tab2**: `2 req, 2 res`.

Cero request faltante. Cero request bloqueado en el browser.

### b) Si sale, ¿VUELVE respuesta y con qué status?

**SÍ, ambas vuelven exitosas.** Los logs INSTR muestran resolución de las dos promises con `hasError: false` y `hasData: true` en ambas pestañas:

```
tab1:
  [CUE-1-INSTR] seeker:resolved   {dt: 911, hasError: false, hasData: true}
  [CUE-1-INSTR] proveedor:resolved {dt: 949, hasError: false, hasData: true}

tab2:
  [CUE-1-INSTR] seeker:resolved   {dt: 741, hasError: false, hasData: true}
  [CUE-1-INSTR] proveedor:resolved {dt: 787, hasError: false, hasData: true}
```

### c) Si vuelve, ¿la promesa de supabase-js resuelve?

**SÍ, ambas promises resuelven, y el `Promise.all` también.** Timing:

```
tab1: promise-all:both-resolved  {dt: 950}  (~950ms desde build-start)
tab2: promise-all:both-resolved  {dt: 787}  (~787ms desde build-start)
```

El `await Promise.all([proveedorP, seekerP])` completa en **<1 segundo** en ambas pestañas.

### d) ¿Cuál de las dos (proveedorRes o seekerRes) es la que no resuelve, o ambas?

**NINGUNA no resuelve. Las dos resuelven exitosas en <1s.**

---

## Descubrimiento crítico

**Pese a que Promise.all completa en <1s con datos válidos en ambas pestañas, el watchdog dispara igual con `stuckReason: loading_never_resolved` a los 15s.**

Esto contradice la hipótesis operativa del sprint entero (que el cuelgue estaba en `Promise.all` o en `getSession()`). **No hay cuelgue en el path del hydrate**. Los datos empíricos INSTR muestran:

```
tab1 timeline completo:
  getSession:start        t=239016
  getSession:resolved     t=239019 (dt=3ms desde start)
  hydrate:enter           t=239020
  promise-all:build-start t=239021
  promise-all:awaiting-both dt=1ms
  seeker:resolved         dt=911ms
  proveedor:resolved      dt=949ms
  promise-all:both-resolved dt=950ms
  ...
  [user_context_stuck]    a los ~15000ms   ← ??
```

**El hydrate completa exitosamente en ~1 segundo. El watchdog dispara 14 segundos después con `loading_never_resolved`.** Contradicción.

---

## Punto 3 del pedido: lectura del código entre `getSession OK` y `Promise.all`

**No hay patrón P10 encubierto** en el path del canal 1 (mount inicial). Verificado empíricamente:

- L643: `supabase.auth.getSession().then(({data:{session}}) => { ... hydrateFromSession(session) })` — **FUERA** del callback de `onAuthStateChange`. Es un `.then()` posterior a la promise.
- `hydrateFromSession` corre en tick posterior al `.then` — cero relación con el lock del SDK.
- Las queries del `Promise.all` (`proveedores` + `usuarios_buscadores`) resuelven correctamente (evidencia empírica arriba).

El canal 2 (SIGNED_IN case en `onAuthStateChange` L681-689) **sí** usa `setTimeout(fn, 0)` explícito para diferir fuera del lock — patrón P10 respetado.

**Los locks vacíos en las 13 celdas del reporte pre-fix eran señal correcta**: el mecanismo del cuelgue observado en el watchdog **no tiene relación con lock del SDK** — porque el cuelgue observado **no existe**.

---

## Causa raíz REAL: stale closure del watchdog

Localización: `contexts/UserContext.tsx:801-858`.

```ts
useEffect(() => {
    const t = setTimeout(async () => {
        const stuckLoading = isLoading;             // ← closure STALE
        const stuckNoUser = !user && !isLoading;    // ← closure STALE
        if (!stuckLoading && !stuckNoUser) return;
        ...
        Sentry.captureMessage('user_context_stuck', ...)
    }, 15_000);
    return () => clearTimeout(t);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Diagnóstico**:
- El `useEffect` con `[]` deps corre **una sola vez al mount**.
- Las variables `isLoading` y `user` referenciadas dentro del `setTimeout` son las **capturadas del closure del primer render** — cuando `isLoading` es siempre `true` (default state L125) y `user` es `null`.
- Cuando el timer dispara a los 15s, lee **esos valores stale**, no los actuales.
- `stuckLoading = isLoading` evalúa a `true` (del closure), aunque el state real ya sea `false` desde hace 14 segundos.
- El watchdog dispara `console.warn` + `Sentry.captureMessage('user_context_stuck')` — **falso positivo estructural**.

El `// eslint-disable-next-line react-hooks/exhaustive-deps` en L857 confirma que alguien deliberadamente ignoró la advertencia del linter — que hubiera detectado el bug.

**El watchdog está roto desde el sprint prelaunch CUE-1 (2026-09-15) que lo introdujo**. Los 36 events prod en el issue `JAVASCRIPT-NEXTJS-7` son mayoritariamente (o completamente) **falsos positivos** del stale closure, no cuelgues reales del UserContext.

---

## Consecuencias sobre F1+F2 y sobre la ventana prod

### Sobre los 36 events prod

- **Mayoritariamente falsos positivos** — el watchdog dispara a los 15s con `isLoading=true` STALE, aunque la app funcione OK.
- La reproducción visual del PO 2026-09-24 (2 casos en 5 min con spinner que "queda pegado") **puede ser otro problema**: spinner de página (loading de datos post-hidratación, `router.isReady`, sockets abiertos, imagen fallando, etc.), NO el `isLoading` del UserContext. Sentry solo captura el warn del watchdog, no un screenshot del DOM ni verifica que el user vea la app funcional.
- **Cross-check necesario post-fix**: si el fix del watchdog reduce los 36 events prod a ~0, se confirma que era 100% falso positivo. Si persisten events con datos reales del state, hay problema aparte.

### Sobre F1+F2 (AbortController + fallback)

**Ya no son fix causa** — el path del hydrate no cuelga empíricamente. **Se convierten en defensa en profundidad** de bajo costo:
- **F1**: `AbortController` timeout 10s en `Promise.all` de perfil. **Bajo valor**: las queries resuelven en <1s. Solo cubre escenario hipotético de red muy lenta.
- **F2**: fallback `setUser(session?.user ?? null)` + Sentry event `user_context_timeout_fallback`. **Bajo valor**: si `Promise.all` no cuelga, el fallback nunca dispara.

**Recomendación**: **NO aterrizar F1+F2 en este PR**. Cero código para arreglar un problema que no existe empíricamente. Foco en el fix real del watchdog.

### Sobre la ventana de merge sábado

**El fix del watchdog es 5-10 líneas** (refactor stale closure con `useRef` para tracking). Simple, acotado, verificable con las mismas specs A1.c/d/e (post-fix `warns=0` esperado en las 3).

Ventana sábado es holgada para: (a) escribir fix, (b) F4 spec regresión que verifica que el watchdog NO dispara cuando el hydrate completa OK, (c) QA PO en prod con 2 tabs post-logout mirando dashboard Sentry (esperado: cero events nuevos del issue post-deploy).

---

## Fix propuesto (para B2 revisado — no aterrizado aún, PO ratifica)

**Opción 1 (recomendada, mínima)**: usar `useRef` que se actualiza en cada render para trackear el state real, luego leerlo dentro del `setTimeout`:

```ts
// Nuevo ref para tracking state actualizado.
const stateForWatchdogRef = useRef({ isLoading, user });
// Actualizar en cada render — cero setTimeout, cero lock.
stateForWatchdogRef.current = { isLoading, user };

useEffect(() => {
    const t = setTimeout(async () => {
        const { isLoading: nowLoading, user: nowUser } = stateForWatchdogRef.current;
        const stuckLoading = nowLoading;
        const stuckNoUser = !nowUser && !nowLoading;
        if (!stuckLoading && !stuckNoUser) return;
        // ... resto igual
    }, 15_000);
    return () => clearTimeout(t);
}, []);
```

- **Delta**: +3 líneas, cero cambio de comportamiento del watchdog "cuando hay cuelgue real".
- **Fix del bug**: al disparar el timer, lee state actual (post-render), no closure inicial.

**Opción 2 (alternativa)**: `useEffect(() => {...}, [isLoading, user])` con re-arming del timer en cada cambio de deps. Más complejo, agrega presión al ciclo de render, pero permite al linter aprobar sin `disable`.

### Spec de regresión F4 (revisado)

Nuevo test en `a1-lock-sub-experiments.spec.ts` o `cue-1-watchdog.spec.ts`:
- Setup normal (auth proveedor 1 tab / proveedor).
- Wait 18s.
- Assert `warns.length === 0` (el hydrate completa OK, el watchdog NO debe disparar).

Este test verifica el fix causa. Los A1.c/d/e existentes siguen como fuente de verdad pre/post fix. Post-fix estos también deben pasar a `warns=0`.

---

## Estado del método P8

**El experimento B1.5 falsó la hipótesis original** (que el cuelgue estaba en el hydrate). Falseó también la hipótesis del reporte pre-fix consolidado (que hipotetizaba `Promise.all` colgado). **Segundo falseo consecutivo, tercer P8 útil del sprint** (el primero fue B1 upgrade).

Sin la instrumentación B1.5 y sin haber pedido específicamente los 4 puntos, F1+F2 hubieran aterrizado sobre un problema inexistente. Costo evitado: ~1 día de código + 2 semanas de observación prod para descubrir que la métrica seguía en 36 events.

**Sin fix hasta GO PO al reporte espejo**. Propuesta: reemplazar F1+F2 por fix del watchdog stale closure + spec F4 revisado. **Merge #85 sábado**: viable si el PO ratifica el approach y el fix pasa CI + QA prod.
