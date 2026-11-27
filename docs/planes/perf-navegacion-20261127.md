# Plan PERF-NAVEGACION-FICHAS — Diagnóstico FASE 1

**Fecha**: 2026-11-27
**Sprint**: PERF-NAVEGACION-FICHAS (prioridad ALTA)
**Autor**: Claude Opus 4.7 (auditor)
**Estado FASE 1**: diagnóstico cerrado — pendiente GO para FASE 2 fixes seguros.

---

## 1. Problema reportado

El PO reporta que el sitio responde muy lento al clic — por ejemplo abrir una
ficha de servicio o proveedor desde `/explorar`. Sensación "no pasa nada"
durante uno-dos segundos.

## 2. Mediciones en prod (anónimo, 2026-11-27, 5 corridas por URL)

Tiempos en segundos. `ttfb` = server first byte, `total` = total transfer.
Primera corrida separada (cold) del resto (warm).

### 2.1 Tabla de tiempos TTFB

| URL | run 1 (cold) | mediana warm (runs 2-5) | peor warm | payload HTML |
|---|---|---|---|---|
| /explorar | **0.857** | **0.218** | 0.223 | 45 KB |
| /proveedor/[1] | **1.933** | **1.478** | 1.592 | 37 KB |
| /proveedor/[2] | 1.133 | **1.408** | 1.617 | 62 KB |
| /proveedor/[3] | 1.131 | **1.440** | 1.640 | 59 KB |
| /servicio/[1] | 1.175 | **1.117** | 2.246 | 70 KB |
| /servicio/[2] | 1.281 | **1.299** | 1.397 | 97 KB |
| /servicio/[3] | 1.129 | **1.127** | 1.422 | 66 KB |
| /eventos | 0.537 | **0.502** | 0.530 | 30 KB |
| /eventos/[1] | 0.560 | **0.498** | 0.510 | 31 KB |

### 2.2 Lectura rápida

- **/eventos y /eventos/[id]**: ~500 ms TTFB → **saludable**, cero cambio
  necesario.
- **/explorar**: TTFB 218 ms warm → la página NO tiene `getServerSideProps`;
  todo el trabajo de datos ocurre después, client-side. No es el cuello.
- **/proveedor/[id]**: mediana warm ~1.4 s, peor warm 1.6 s → **lento**.
- **/servicio/[id]**: mediana warm ~1.1-1.3 s, peor warm 2.2 s → **lento**.

Las fichas (proveedor + servicio) concentran el problema. El resto del sitio
está en rango razonable para SSR.

## 3. Causas raíz (ordenadas por impacto)

### 3.1 Queries Supabase en SERIE dentro de getServerSideProps ★ MAYOR

El `getServerSideProps` de **[pages/proveedor/[id].tsx](../../pages/proveedor/[id].tsx)**
ejecuta **5 queries estrictamente secuenciales**:

1. L848 · `proveedores_publicos` (obligatoria primero — valida existencia).
2. L881 · `servicios_publicados` del proveedor.
3. L891 · `evaluaciones` del proveedor.
4. L901 · `certificaciones` aprobadas.
5. L953 · `contactos` count.

Las queries 2-5 dependen **solo del `id` del proveedor**, que viene de la ruta.
Nada bloquea arrancarlas en paralelo tras la query 1.

Con RTT típico de ~250-300 ms función Vercel (iad1) ↔ Supabase (us-east-1)
más tiempo de PostgREST, 5 queries en serie componen ~1.2-1.4 s. Calza con los
números medidos.

**[pages/servicio/[id].tsx](../../pages/servicio/[id].tsx)** tiene un patrón
similar con 5 pasos secuenciales (L57, L85, L123, L138, L159). Las queries de
líneas 85 (proveedor via vista), 123 (reviews del servicio) y 138 (reviews del
proveedor) dependen solo de datos que ya existen después de L57 — son
paralelizables. La query de L159 (`buscar_servicios` para "similares") necesita
la comuna del proveedor, así que se queda después del Promise.all.

### 3.2 Sin indicador de carga durante la navegación ★ UX

[pages/_app.tsx](../../pages/_app.tsx) **no engancha `router.events`**. Cuando
el usuario hace clic en una ficha, pasan 1.2-2 segundos entre el clic y el
primer pintado de la ficha. Durante ese lapso **no hay ninguna señal visual** —
ni barra top, ni cursor de espera, ni skeleton en el destino. Es la mitad del
problema percibido por el PO: el otro medio segundo "lento" se convierte en
"roto" sin feedback.

Fix directo: top-progress bar global que se muestra entre `routeChangeStart` y
`routeChangeComplete`. Cero cambio de datos.

### 3.3 Region Vercel ↔ Supabase — descartada

- Headers prod: `X-Vercel-Id: gru1::iad1::...` → el edge POP es São Paulo
  (gru1, cercano al PO en Chile), pero la función runtime corre en **iad1
  (Washington DC, us-east-1)**.
- Supabase `ouezpeeiwjwawauidrqq.supabase.co` → IPv6 bloque `2600:1f1e:` →
  **AWS us-east-1**.

Función y DB están en la **misma región AWS** (us-east-1) → RTT intra-AZ
~2-10 ms, nunca el cuello. Nada que mover acá.

### 3.4 JS bundle size — no es el cuello de TTFB, pero suma

Total JS cargado por `/servicio/[id]` (gzipped wire):

| Chunk | KB |
|---|---|
| main-ff53234643810ea8.js | 311 |
| pages/_app-266771db5067e925.js | 347 |
| framework-4011adc8d5deb94e.js | 140 |
| 4978-64a5fa0bec985abd.js | 118 |
| polyfills-42372ed130431b0a.js | 113 |
| otros (~13 chunks) | ~170 |
| **total** | **~1.2 MB** |

El bundle **no explica el TTFB** (eso lo cobra el servidor antes de responder
HTML), pero sí explica parte del tiempo-hasta-interactivo en móvil 4G.
Optimizarlo queda como mejora separada (sprint aparte post-launch — no es el
root cause del síntoma reportado).

### 3.5 Prefetch de Links — ya activo

[components/Explore/ServiceCard.tsx:71](../../components/Explore/ServiceCard.tsx#L71)
usa `<Link href="/servicio/:id">` sin `prefetch={false}`. Next 15 Pages Router
hace prefetch del HTML+chunks cuando el Link entra al viewport → el click a
una ficha visible ya tiene el bundle warm. Esto ya está bien.

Lo que **no** prefetchea es el `getServerSideProps` (lógico — es per-request).
Por eso la paralelización de queries SSR es el fix de mayor palanca.

### 3.6 Imágenes — next/image OK

`next.config.js` tiene `remotePatterns` con los hosts legítimos (Supabase,
Unsplash, Pexels, ui-avatars, OSM tiles). Las fotos de servicios se sirven
por `next/image` con optimización automática. No es el cuello.

## 4. Fixes propuestos

### F1 — Paralelizar queries SSR en /proveedor/[id] (ALTA ganancia, BAJO riesgo)

**Dónde**: [pages/proveedor/[id].tsx:848-956](../../pages/proveedor/[id].tsx#L848-L956).

**Qué**: tras la query inicial de `proveedores_publicos`, envolver las
4 queries siguientes (`servicios_publicados`, `evaluaciones`,
`certificaciones`, `contactos` count) en `Promise.all`. Destructurar los
resultados post-await. Cero cambio de datos, cero cambio de API, cero
cambio en el shape de `props`.

**Ganancia estimada**: de ~1.4 s a ~0.5 s TTFB (mediana) — reduce el peor
caso warm de 1.6 s a ~0.6 s. Validación empírica en FASE 2 contra las
mismas 3 fichas.

**Esfuerzo**: ~15 min + preview smoke.

**Riesgo**: bajo. Las 4 queries son READ-ONLY, independientes, no comparten
estado. El único cuidado es mantener los valores que después se calculan en
JS (`globalRatingPromedio`, `visitasTotalProveedor`) que se derivan de los
datos recibidos.

### F2 — Paralelizar queries SSR en /servicio/[id] (ALTA ganancia, BAJO riesgo)

**Dónde**: [pages/servicio/[id].tsx:85-150](../../pages/servicio/[id].tsx#L85-L150).

**Qué**: tras la query inicial de `servicios_publicados`, envolver en
`Promise.all` las 3 queries dependientes solo de datos ya conocidos:
- `fetchProveedoresPublicosByIds` (L85)
- `reviews` del servicio (L123)
- `reviewsGlobalProv` (L138)

La query L159 (`buscar_servicios` para "similares") se queda después del
Promise.all porque necesita `service.proveedores.comuna` del Promise.all.

**Ganancia estimada**: de ~1.2 s a ~0.6 s TTFB (mediana) — la primera query
del servicio (~250 ms) + Promise.all de 3 queries (~300 ms, lo que tarde la
más lenta) + RPC similares (~250 ms).

**Esfuerzo**: ~20 min + preview smoke.

**Riesgo**: bajo. Mismo razonamiento que F1. Hay que mantener el orden de
los `logSupabaseError` y los `globalRatingUnavailable` flags intactos.

### F3 — Top-progress bar global en navegación (ganancia UX directa, BAJO riesgo)

**Dónde**: [pages/_app.tsx](../../pages/_app.tsx) — hook en `router.events`.

**Qué**: componente `<RouteProgress />` que se suscribe a
`routeChangeStart` / `routeChangeComplete` / `routeChangeError` y renderiza
una barra fija top-0 de 2 px que avanza mientras hay navegación en curso.
Sin librería externa (NProgress agrega 20 KB) — implementación propia
~40 líneas, cero dependencia.

**Ganancia estimada**: percepción UX "click respondió al instante" aunque
el TTFB real siga siendo el mismo. Mejora directa del síntoma "parece que
no pasa nada".

**Esfuerzo**: ~30 min + smoke manual navegando entre fichas.

**Riesgo**: bajo. Componente pasivo, sin side effects en datos. Respeta
`prefers-reduced-motion` (la barra se queda estática en lugar de animar
el gradient para usuarios con esa preferencia).

### F4 — Loading indicator visible en ServiceCard al clic (opcional, MEDIO)

**Dónde**: [components/Explore/ServiceCard.tsx:71](../../components/Explore/ServiceCard.tsx#L71).

**Qué**: en el `onClick` del Link, aplicar una clase `opacity-60 pointer-events-none`
a la card recién clicada hasta que termine `routeChangeComplete`. Da feedback
táctil local además de la barra global.

**Ganancia estimada**: refuerza F3 en móviles donde la barra top queda tapada
por el notch / URL bar.

**Esfuerzo**: ~15 min.

**Riesgo**: bajo. Requiere hook compartido con F3 o ambos leyendo
`router.events` por separado.

### F5 — Cache / ISR / revalidación — PROPUESTO, requiere GO del PO

**Qué**: migrar `/proveedor/[id]` y `/servicio/[id]` de `getServerSideProps`
a `getStaticProps` con `revalidate: 60` (ISR) + `getStaticPaths` con
`fallback: 'blocking'` para IDs nuevos. Cada ficha se regenera como máximo
una vez por minuto.

**Ganancia estimada**: TTFB cacheado ~50-80 ms (edge-cache Vercel). ~15-25x
más rápido que el estado actual.

**Esfuerzo**: ~1-2 h + verificación de que todos los consumers de
`props.service.visitas_total` / `visitas_mes` y contadores agregados
toleran el delay de revalidación. Testing manual importante.

**Riesgo**: **cambia frescura de datos**. Un proveedor que edite su perfil
o sus servicios verá los cambios reflejados con hasta 60 s de latencia en
páginas públicas. Igual con cambios de visitas / favoritos / evaluaciones
nuevas. Puede mitigarse con revalidate `on-demand` post-write en los
endpoints de mutación, pero amplía el alcance.

**Por eso queda proposed + GO explícito del PO**. No se aplica en esta
sesión sin autorización.

### F6 — Dedup query de evaluaciones en /proveedor/[id] (BAJA ganancia)

**Dónde**: [pages/proveedor/[id].tsx:891](../../pages/proveedor/[id].tsx#L891).

**Qué**: hoy la query de `evaluaciones` trae `rating, servicio_id` para el
proveedor completo y después se agrupa en JS por servicio. Alternativa:
pedir el agregado directamente a PostgREST con
`.select('rating, servicio_id', { count: 'exact', head: false })` — ya lo
hace así. No hay mucho que mejorar. Posible: mover al Promise.all de F1 y
queda resuelto.

**Ganancia**: parte de F1.

## 5. Plan FASE 2 (fixes autónomos sin GO requerido)

Aplica solo lo que **no cambia datos ni comportamiento**:

1. **F3** — top-progress bar en `_app.tsx`.
2. **F1** — Promise.all en `/proveedor/[id]`.
3. **F2** — Promise.all en `/servicio/[id]`.
4. (opcional, si queda tiempo) **F4** — loading state local en `ServiceCard`.

Después de cada fix: re-medir con el mismo script `measure.sh` + reportar
antes/después en este documento (sección 6).

**Fixes que NO se aplican sin GO del PO**: F5 (ISR / cache) — pendiente
confirmación de que el PO acepta hasta 60 s de latencia en reflejar edits
de proveedor + contadores de visitas.

## 6. Mediciones post-fix (FASE 2 — pendiente)

_(se llena al cierre de la FASE 2)_

| Fix aplicado | SHA | /proveedor mediana warm | /servicio mediana warm |
|---|---|---|---|
| (baseline) | e56dcc3 | ~1.44 s | ~1.19 s |
| F3 progress bar | — | n/a (sin cambio TTFB, mejora UX) | n/a |
| F1 + F2 Promise.all | — | esperado ~0.5-0.6 s | esperado ~0.5-0.7 s |

## 7. Referencias

- Audit Lighthouse PR #221 (desktop/mobile) — insumo para ponderar bundle
  size y CLS, no es el root cause del síntoma reportado acá.
- Mediciones crudas: `scratchpad/perf/results.txt` (sesión local, no
  committeada).
- CLAUDE.md regla P1.1 — todo fix de rendimiento se mide en preview antes
  del merge (aplica a FASE 2).

---

**Cierre FASE 1**: diagnóstico documentado. Causas ordenadas por impacto.
Fixes seguros listos para FASE 2 autónoma; fix estructural (ISR) propuesto
esperando GO.
