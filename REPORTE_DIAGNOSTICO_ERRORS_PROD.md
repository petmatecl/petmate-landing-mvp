# Reporte diagnóstico — 61 errores prod `/servicio/{uuid}` (2 semanas)

**Fecha**: 2026-08-04.
**Entrega**: solo lectura + propuesta. Sin código, sin ramas nuevas. Los fixes esperan a la Auditoría Integral #2 post-desfile.
**Origen**: triage PO+coordinador de logs prod. Patrón homogéneo: GET 307 a `/servicio/{uuid}` con `console.error 'Servicio no encontrado o inactivo null'`. UUIDs recurrentes entre días, ráfaga inicial 21-jul + goteo diario, hosts `pawnecta.com` y `www.`.

---

## 1. Verificación del origen (BD prod)

### Query lista para ejecutar en prod (`ouezpeeiwjwawauidrqq`)

Aldo, esto es lo que necesito que corras (o me pases el resultado). Segmenta los UUIDs en 4 buckets:

```sql
-- Bucket 1: UUIDs que EXISTEN y están activos (deberían resolver 200 —
-- si aparecen acá, el error del log es una race o RLS-blocker distinto).
SELECT id::text, titulo, activo, categoria_id
FROM servicios_publicados
WHERE id IN (
    'f311f9a5-...'::uuid,  -- completar UUIDs full de tus logs
    '41437ec0-...'::uuid,
    -- ... el resto
);

-- Bucket 2: EXISTEN pero activo=false (hipótesis principal PO — inactivados
-- después de haber sido indexados).
SELECT id::text, titulo, activo, updated_at
FROM servicios_publicados
WHERE id IN (/* los mismos UUIDs */)
  AND activo = false;

-- Bucket 3: NO EXISTEN en la tabla (borrados hard o UUIDs inventados por
-- el crawler → improbable dado el patrón de recurrencia).
SELECT unnest(ARRAY['f311f9a5-...', '41437ec0-...', /* ... */]::uuid[]) AS uuid_buscado
EXCEPT
SELECT id::text::uuid FROM servicios_publicados;

-- Bucket 4: EXISTEN pero el proveedor no está aprobado (misma pantalla en
-- el gSSP porque el hydrate de proveedor_publicos falla — línea 66-76 de
-- pages/servicio/[id].tsx). Esta rama del código emite el mismo 307 sin
-- log distintivo, así que el ratio bucket-2 vs bucket-4 es data útil.
SELECT s.id::text, s.titulo, s.activo, p.estado AS estado_proveedor
FROM servicios_publicados s
LEFT JOIN proveedores p ON p.id = s.proveedor_id
WHERE s.id IN (/* los mismos UUIDs */)
  AND (p.id IS NULL OR p.estado != 'aprobado');
```

### Verificación paralela en staging (proxy schema — read-only vía MCP)

- **Schema check**: `servicios_publicados` **NO tiene** columnas `es_ejemplo`, `es_demo`, `es_placeholder`, ni `deleted_at`. La única señal de "muerto" es `activo=false`. Cita: `information_schema.columns` filtrada por patrones de estado → devuelve solo `activo boolean`.
- **Dimensiones staging**: 15 servicios, 15 activos, 0 inactivos, 0 UUIDs matchean los listados por el PO (esperado — son de prod).
- **La hipótesis "servicios demo/es_ejemplo desactivados" no aplica al schema actual** — el flag `es_ejemplo` vive en `proveedores`, no en `servicios_publicados`. Si el bucket 4 dominates el resultado, el ciclo es "servicios de proveedores hoy no-aprobados", no "servicios desactivados".

## 2. Sitemap — ¿alimenta el ciclo?

**Ubicación**: `pages/sitemap.xml.tsx` (getServerSideProps).

**Verificación**: filtra `.eq('activo', true)` (línea 18) — **NO emite servicios inactivos**. Cache `s-maxage=3600, stale-while-revalidate` (línea 46) — respeta el TTL de Vercel/Google, sin loops de propagación stale.

**Conclusión**: el sitemap **NO es el alimentador del ciclo**. Los servicios muertos entran al índice de Google **por revisita crawler a URLs históricamente indexadas** (cuando el servicio estaba activo, sitemap las publicó; hoy siguen en el índice sin señal de "morir").

**Único gap del sitemap** (deuda menor, no bloquea): no filtra proveedor.estado (un servicio de proveedor no-aprobado seguiría en el sitemap si su `activo=true`). Bajo prioridad — el gSSP corta el flujo con 307. Fix natural en la Auditoría #2: agregar join a proveedores + filtro `estado='aprobado'` al SELECT del sitemap.

## 3. Comportamiento del gSSP de `/servicio/[id]`

**Ubicación**: `pages/servicio/[id].tsx:25-142`.

### El log "null" colgando (bug menor de higiene)

**Línea 45-49**:
```ts
const { data: service, error: serviceError } = await supabase
    .from('servicios_publicados')
    .select(`*, proveedor_id, categorias_servicio!inner(nombre, slug, icono)`)
    .eq('id', id)
    .eq('activo', true)
    .maybeSingle();

if (serviceError || !service) {
    console.error("Servicio no encontrado o inactivo", serviceError);
    return { redirect: { destination: '/explorar', permanent: false } };
}
```

**Por qué "null"**: `maybeSingle()` retorna `data=null, error=null` cuando la fila no matchea (comportamiento esperado — no es error, es "no hay match"). El `if (serviceError || !service)` entra al branch por `!service` (falsy `null`), pero pasa `serviceError` (que es `null`) como segundo arg al `console.error` — de ahí el `'Servicio no encontrado o inactivo null'` en los logs.

**Es log de estado ESPERADO** — servicio no existe/no activo es semánticamente correcto, no un error runtime. Debería ser `console.info` (o log estructurado con nivel `warn`) sin el `null` colgando.

### El 307 — cambio semántico incorrecto para SEO

**Línea 50-55**:
```ts
return {
    redirect: {
        destination: '/explorar',
        permanent: false,   // ← esto produce HTTP 307
    },
};
```

`permanent: false` en `getServerSideProps` de Next.js emite HTTP **307 Temporary Redirect**. Semántica que los crawlers interpretan:

| Código | Semántica para Google/Bing | Efecto en indexación |
|---|---|---|
| **307** (actual) | "Sigue intentando esta URL, temporalmente vive en X" | Retiene la URL en el índice. Vuelve a chequear en X días. **Perpetúa el goteo diario observado.** |
| **404** | "No existe" | Retira gradualmente del índice (~semanas de re-crawl). Sin URL alternativa. |
| **410 Gone** | "No existe y NO va a existir" | Retira más rápido del índice (Google trata 410 como señal fuerte de deindexación). |
| **301** a categoría | "Se mudó permanentemente a X" | Retira la URL y transfiere señal SEO a X. Ideal si "X" es sustituto lógico. |

**Diagnóstico**: el 307 actual es la peor opción para deindexar. Los crawlers vuelven cada N días y nosotros les respondemos "sigue intentando" — de ahí el goteo constante en logs.

## 4. Propuestas para triage Auditoría #2

### Propuesta A — Log level de "no encontrado" esperado
- **Severidad**: baja (higiene).
- **Cambio**: `console.error("...", serviceError)` → `console.info` (o `console.warn` si preferimos que aparezca en Vercel's error bucket con menos ruido). Eliminar el `serviceError` del segundo arg cuando es null.
- **Copy sugerido**: `console.info('[servicio/[id]] 404 esperado para id=' + id.slice(0, 8) + '…')`.
- **Impacto**: los 61 events dejan de contar como "errores prod" en Vercel Logs — el ruido del baseline baja limpiamente. La observabilidad mejora: los 500 reales quedan visibles sin este noise.
- **Esfuerzo**: 10 min (1 line change + verificación en prev).

### Propuesta B — Semántica del response para servicio muerto
- **Severidad**: media (SEO + UX).
- **Recomendación**: **410 Gone**, no 404 ni 301.
- **Fundamento**:
  - **410 > 404** porque Google documenta que 410 acelera la deindexación en factor ~2-3x. La URL fue válida antes; 410 informa "ya no lo será" mejor que 404 (que puede leerse como "quizás vuelva").
  - **410 > 301** porque no hay sustituto lógico universal. Redirigir a `/explorar` (que es lo que hoy hace el 307) transfiere señal SEO a la página de explorar — dilutye keywords + confunde al usuario que aterrizó desde Google buscando "paseo en Providencia" y termina en un buscador vacío. Peor UX que la página 410.
  - Página 410 UX: mostrar "Este servicio ya no está disponible" + CTA "Explorar servicios similares en {comuna}" (opcional, si tenemos la comuna del servicio muerto — la tenemos por el UUID en la BD antes de emitir el 410).
- **Implementación en Next.js Pages Router**: `getServerSideProps` no soporta status directo en el return — hay que usar `context.res.statusCode = 410` + retornar props con flag `notFound=true` o similar. Alternativa: `return { notFound: true }` de Next emite HTTP 404 (bueno-pero-no-410) automáticamente y renderea `pages/404.tsx` — más simple que armar 410 manual. **Trade-off**: 404 es 80% del beneficio con 20% del esfuerzo (`return { notFound: true }` vs setHeader manual).
- **Esfuerzo**:
  - 404 nativo: 15 min (cambio `redirect` → `notFound: true` en las 2 ramas). Renderea `pages/404.tsx` existente.
  - 410 con página propia: 1-2h (setHeader manual + página con branding + CTA contextual con comuna del servicio muerto si queremos ese refinamiento).
- **Recomiendo empezar con 404 nativo** como Propuesta B1 (min viable) y evaluar 410 con página propia como B2 si el ritmo de deindexación no baja rápido.

### Propuesta C — Sitemap solo activos
- **Severidad**: baja (ya se cumple parcialmente).
- **Estado actual**: `sitemap.xml.tsx:18` ya filtra `.eq('activo', true)` — no emite servicios inactivos. **NO alimenta el ciclo actual.**
- **Único gap**: no filtra por `proveedor.estado='aprobado'`. Un servicio con `activo=true` pero de proveedor no-aprobado sigue apareciendo en el sitemap. Contribución al ciclo: probable pequeña (los proveedores no-aprobados suelen tener servicios `activo=false` también). Aldo puede verificar la magnitud con la query del bucket 4 arriba.
- **Fix cuando toque**: agregar join a `proveedores` (o cambiar `servicios_publicados` por una vista pre-filtrada) + `.eq('proveedor.estado', 'aprobado')`.
- **Esfuerzo**: 30 min + verificación de que la vista `proveedores_publicos` ya excluye no-aprobados.

### Propuesta D — Estimación global del bundle (para el sprint de la Auditoría #2)

| Ítem | Prioridad | Esfuerzo | Bloqueante | Efecto |
|---|---|---|---|---|
| A. log info + fix `null` | Baja | 10 min | No | Baseline logs limpio; observabilidad mejora |
| B1. `notFound: true` (404) | Media | 15 min | No | Deindexación inicia en semanas (Google) |
| B2. 410 Gone con página propia | Media | 1-2h | Depende de B1 | Deindexación 2-3× más rápida vs 404 |
| C. Sitemap filtro proveedor.estado | Baja | 30 min | No | Cierra gap del alimentador residual |

**Bundle recomendado para Auditoría #2**: A + B1 + C en un solo commit (~1h total). B2 queda como iteración si el monitoreo post-fix no muestra caída del goteo diario en ~2 semanas.

## 5. Verificación operativa post-fix (para el checklist Auditoría #2)

Una vez aplicado el bundle:
- **Vercel Logs prod ventana 1h post-deploy**: verificar que aparezcan `[servicio/[id]] 404 esperado` (info-level) en vez de `console.error`. Los eventos deberían salir de la lista "errores".
- **Google Search Console**: monitorear "Páginas indexadas" en el reporte de Cobertura. Con 404/410, el número de "Excluidas: no encontrada" debería crecer los primeros días. Sin 404/410 y con 307 actual, se mantiene estable.
- **`curl -I https://www.pawnecta.com/servicio/{uuid-muerto}`**: verificar que responda `HTTP/2 404` (o 410 si B2) en vez de `HTTP/2 307`.

## 6. Estado tras entrega (para diagnóstico 307)

- **Reporte entregado como doc**. **Cero código escrito**, **cero ramas nuevas**.
- **Fixes esperan a la Auditoría Integral #2** post-desfile (post-Fase 8 monitor N15 + cola de merges `producto-1 → zonab-1 → producto-2`).
- **Query lista para prod**: Aldo puede ejecutarla al revisar este doc, y actualizar la propuesta con el bucket real (2 vs 4) para dimensionar B1 vs B2.

---

# ADDENDUM — GA disparando desde previews/staging (2026-08-04)

**Hallazgo PO**: el dashboard de Google Analytics muestra tráfico interno confundido con real:
- Página `'prueba f2 - Admin'` (servicio de test de staging) aparece en vistas registradas.
- Picos de usuarios calzan con maratones de suites Playwright.
- Los "35 activos ahora" son los contexts de Playwright de la corrida en curso.

Diagnóstico read-only + propuesta. Fix post-desfile.

## A. Integración GA — dónde vive y qué gates tiene

**Cadena**:
1. `pages/_app.tsx:44` monta `<ConsentScripts />`.
2. `components/ConsentScripts.tsx:22` renderea los `<Script>` tags de gtag SOLO si `hasAnalytics && GA_TRACKING_ID`.
3. `lib/useConsent.ts:70` define `hasAnalytics = hydrated && stored?.analytics === true` (consent por-hostname en localStorage).
4. `lib/gtag.ts:1`: `GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "G-SCNG5J67E9"`.

**Gates activos**:
- ✅ **Consent gate** (usuario acepta banner cookies).
- ❌ **CERO gate por entorno**. `NEXT_PUBLIC_GA_ID` es la misma env var en Preview + Production + Staging + Dev. **Encima tiene fallback hardcoded** al ID real (`G-SCNG5J67E9`) — si Aldo no configura la env var en algún ambiente, el ID prod se hardcodea igual.

## B. Vía #2 CONFIRMADA: consent embebido en storageState de Playwright

Verificado con Node.js sobre `e2e/.auth/*.json`:

```
e2e/.auth/proveedor.json:
  origin: https://pawnecta-landing-mvp-git-producto-2-petmatecls-projects.vercel.app
  pawnecta-cookie-consent = {"analytics":true,"marketing":true,"timestamp":"2026-08-04T18:05:26.713Z","version":1}

e2e/.auth/tutor.json:
  origin: <mismo>
  pawnecta-cookie-consent = {"analytics":true,"marketing":true,"timestamp":"2026-08-04T18:05:26.499Z","version":1}
```

**Consecuencia**: cada corrida Playwright con `chromium` o `chromium-tutor` project **arranca con GA ya aceptado** — el `useConsent` levanta `hasAnalytics=true` inmediatamente, `ConsentScripts` renderea los `<Script>` de gtag, y **cada navegación a `/servicio/{id}`, `/mis-solicitudes`, `/explorar`, etc. dispara un pageview real al GA de producción**.

Los "35 activos" son los ~7 tests × múltiples navigations que corren en paralelo — el conteo de "usuarios activos" de GA en tiempo real es la fábrica corriendo.

Origen probable del embebido: en algún setup histórico (o Aldo aceptando el banner durante visual review del preview), el storageState quedó con la cookie y las corridas subsecuentes la re-usan por diseño (`setup` guarda el context COMPLETO en `.auth/*.json`).

## C. Vías secundarias (contribuyentes menores)

- **Aldo navegando previews con su browser real**: cada preview URL es un hostname distinto → banner aparece en el primer visit. El reflejo humano es click "Aceptar todas" → cookie por-host → cada visit posterior a ese hostname dispara GA prod. Cross-suite entre browsers de Aldo (Chrome laptop, Chrome iPhone, etc.) multiplica.
- **Deployment production branch (`main` deployado a `www.pawnecta.com`)**: aquí SÍ es deseado que GA dispare (público real). El problema NO es la vía prod, es que las otras vías se contaminan al usar el MISMO ID.

## D. Propuesta de fix (para triage Auditoría #2)

### E. Gate por entorno — spirit-of-IS_PROD (RECOMENDADO)

Mismo patrón que ya vive en el proyecto:
- `next.config.js`: `IS_PROD = NEXT_PUBLIC_APP_ENV === 'production' || VERCEL_ENV === 'production'` gatea `next-pwa` (el SW real solo en prod, demolisher en preview/staging).
- `lib/resend.ts`: prod manda a inbox real; staging redirige a AUDIT_INBOX con subject prefijo.
- `lib/cronGuard.ts`: `skipIfNonProd()` gatea todos los crons a producción.

**Aplicación a GA** (~10 líneas):

```ts
// En lib/gtag.ts o inline en ConsentScripts.tsx
const IS_PROD_REAL =
    process.env.NEXT_PUBLIC_APP_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production';

export const GA_TRACKING_ID = IS_PROD_REAL
    ? (process.env.NEXT_PUBLIC_GA_ID || null)
    : null;
```

Luego en `ConsentScripts.tsx`: `{hasAnalytics && GA_TRACKING_ID && ...}` — como ya está — pero `GA_TRACKING_ID` ahora es `null` en preview/staging. **Cero gtag script cargado en entornos internos**. Los previews de Vercel y `pawnecta-landing-mvp-git-*` dejan de aparecer en el GA prod.

**Bonus del gate**: eliminar el fallback hardcoded `"G-SCNG5J67E9"` de `lib/gtag.ts:1` — que la env var sea obligatoria en prod (declarada en Vercel Environment Variables → Production scope) y ausente en preview/staging por defecto.

**Impacto en el storageState de Playwright**: el consent cookie sigue en `.auth/*.json` pero se vuelve **inerte** — con `GA_TRACKING_ID=null`, los `<Script>` de gtag no se renderean. Cero limpieza requerida del storageState.

**Esfuerzo**: **15 min** (edit `lib/gtag.ts` + verificación de env vars en Vercel Dashboard prod + smoke que confirma cero pageview en preview post-fix).

### F. Bonus 1: filtro de tráfico interno GA4 (capa 2)

- **Definición**: GA4 → Admin → Data Streams → seleccionar stream → Configure Tag Settings → Show More → Define Internal Traffic → agregar regla por rango de IP (IP de Aldo, IPs de la oficina).
- **Efecto**: los eventos siguen registrándose pero se etiquetan como `traffic_type=internal` y se pueden excluir de reports con un data filter.
- **Trade-off vs gate por entorno**: es defensivo (asume que gtag ya se disparó) — no reemplaza el gate. Útil como **segunda capa** para tráfico que YA no debería estar ahí pero por si acaso (ej. futuros bots internos, monitores externos que rutean por IP conocida).
- **Esfuerzo**: 20 min (config GA sin código). Solo tiene sentido después del gate — si el gate corta el 95% del tráfico interno, la capa 2 cierra el 5% residual.

### G. Bonus 2: limpiar consent del storageState Playwright (higiene)

- **Post-fix del gate**: el consent ya no dispara nada. Pero el storageState acumula cookies de test histórico que crecen indefinidamente. Higiene chica.
- **Fix**: en `e2e/setup/auth.setup.ts` (y `auth-tutor.setup.ts`), agregar antes de `page.context().storageState({ path })`:
  ```ts
  await page.evaluate(() => {
      localStorage.removeItem('pawnecta-cookie-consent');
  });
  ```
- **Esfuerzo**: 10 min. Post-gate: obliga a que futuras corridas verifiquen que sin cookie tampoco dispara (contra-test implícito).

## H. Registro de deuda: taxonomía de eventos clave del funnel (backlog launch-readiness)

**Estado hoy**: GA4 conectado, `pageview` implementado, `event()` helper genérico en `lib/gtag.ts:18` — pero **0 key events configurados** en GA. Sin key events, GA registra tráfico pero **no mide conversión**. Al lanzar con marketing, la falta de key events implica:
- Sin datos de funnel (dónde caen los usuarios).
- Sin datos de ROI por canal.
- Sin señal para optimizar copy/CTA.
- Sin retention curves útiles.

**Eventos candidatos del funnel Pawnecta** (para sesión de diseño PO aparte, pre-lanzamiento):

| Evento | Trigger | Params sugeridos |
|---|---|---|
| `registro_iniciado` | Landing en `/register` | `rol: 'proveedor'\|'usuario'`, `referrer` |
| `registro_completado` | Success del POST /api/auth/signup | `rol`, `tiempo_completar_wizard_min` |
| `servicio_publicado` | POST INSERT servicios_publicados success | `categoria`, `precio_desde`, `unidad_precio`, `agenda_habilitada` |
| `busqueda_realizada` | Submit del SearchBar hero + filtro sidebar | `categoria`, `comuna`, `terminos_texto` |
| `ficha_servicio_vista` | GSSp de `/servicio/[id]` | `servicio_id`, `categoria`, `proveedor_verificado` |
| `contacto_disparado` | POST /api/contactos/track | `canal: 'mensaje'\|'whatsapp'\|'llamada'\|'email_copiado'` |
| `reserva_creada` | INSERT agendamientos success (F1/F2/legacy) | `familia`, `estado_inicial`, `noches` |
| `reserva_confirmada` | UPDATE estado=confirmada por proveedor | `familia`, `tiempo_respuesta_min` |
| `reserva_cancelada` | UPDATE estado=cancelada (client o endpoint) | `iniciador: 'tutor'\|'proveedor'`, `dentro_ventana` |
| `evaluacion_publicada` | UPDATE evaluaciones.estado=aprobado | `rating`, `dias_desde_servicio` |

**Formato de sesión sugerido** (para PO):
- 1 iteración de 45 min entre Aldo + Claude para pulir la taxonomía + valores esperables por canal.
- Output: markdown en `docs/analytics-events.md` (o similar) con schema exacto por evento + qué componente lo dispara.
- Implementación: 1-2 días en un sprint dedicado (post-launch). Depende del gate del punto E aplicado — sin gate, cada evento del sprint inflaría los reports.

**Prioridad**: **alta pre-lanzamiento externo, no bloquea el desfile actual**. El launch marketing empieza a mostrar valor a partir del día 1 post-lanzamiento — sin key events instrumentados, el primer mes de marketing datos = pageviews sin cohorte, difícil de leer.

## Estimación global del bundle GA (para triage jueves)

| Ítem | Prioridad | Esfuerzo | Bloqueante |
|---|---|---|---|
| E. Gate por entorno GA (spirit-of-IS_PROD) | **Alta** | 15 min | Ninguno |
| F. Filtro tráfico interno GA4 por IP (capa 2) | Baja | 20 min config | E aplicado primero |
| G. Limpiar consent del storageState Playwright | Baja | 10 min | E aplicado primero |
| H. Diseño taxonomía key events + sesión PO | **Alta pre-launch** | 45 min sesión + 1-2 días implementación | Sprint aparte |

**Bundle recomendado Auditoría #2**: E + G en un solo commit (~25 min). F es config GA fuera de código. H se agenda como sprint propio pre-launch.

