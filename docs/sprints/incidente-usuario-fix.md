# Sprint incidente-usuario-fix · 2026-09-24

**Rama**: `incidente-usuario-fix` (desde `main @ 6774fbd`).
**Motivación**: bug real capturado en prod como Sentry issue `JAVASCRIPT-NEXTJS-9` (release `6774fbd` = merge de #88 sentry-boundary, deploy prod 2026-09-24). Un tutor que vuelve del chat con "Volver al Panel" ve la pantalla "Algo salió mal" del `ErrorBoundary`.
**Clasificación PO**: **BLOQUEA** — un tutor que vuelve del chat ve una pantalla de error.
**Target de merge**: antes del viaje (Tramo 1, hasta 2026-09-28) con QA PO.

## 1. Diagnóstico (reporte espejo a-d aceptado por PO 2026-09-24)

**a) `/usuario` desde cliente cae en `pages/[categoria]/index.tsx`** — SPA navigation del router cliente-side de Next resuelve `/usuario` contra el dynamic route `[categoria]` con `categoria='usuario'`, sin pasar por el redirect 307 del [next.config.js:207-211](../../next.config.js#L207-L211) (que solo aplica al request pathname `/usuario`, no al fetch `/_next/data/.../usuario.json?categoria=usuario`). Footgun conocido de Next.js Pages Router con redirects en config.

**b) archivo:línea del `.nombre`** — [pages/[categoria]/index.tsx:23-24](../../pages/[categoria]/index.tsx#L23-L24). Cuando `getStaticPaths` (`fallback:false`) no incluye el slug `'usuario'` y `getStaticProps` devuelve `{notFound: true}`, el hydrate client-side renderiza `CategoryPage` con `categoria=undefined` → TypeError al leer `.nombre`.

**c) Panel real del tutor: NO EXISTE**. Grep de "Mi Panel" solo aparece en `pages/proveedor/index.tsx:1382` (`<title>Mi Panel | Pawnecta</title>`). El tutor tiene rutas separadas: `/explorar`, `/mis-reservas`, `/favoritos`, `/usuario/mascotas`. Único generador de navigation a `/usuario` en el codebase: [pages/mensajes.tsx:27](../../pages/mensajes.tsx#L27) (verificado grep exhaustivo — otros hits son checks defensivos).

**d) Fix propuesto en 2 capas + spec regresión** — aceptado por PO con ajustes.

## 2. Fix aplicado

### 2.1 Capa 1 · [pages/mensajes.tsx](../../pages/mensajes.tsx)

`defaultReturn` tutor cambia de `/usuario` a `/mis-reservas`. Copy del botón dinámico:
- proveedor puro → `/proveedor` + "Volver al Panel" (sin cambio).
- tutor puro o dual → `/mis-reservas` + **"Volver a mis reservas"** (nuevo).

Rationale del destino: el tutor típicamente llega al chat post-reserva, `/mis-reservas` es la ruta más semántica. El rediseño del home del tutor queda como deuda de producto post-launch (ver BACKLOG **TUTOR-HOME**).

### 2.2 Capa 2 · componente 404 reutilizable

Extraído [components/Shared/NotFoundContent.tsx](../../components/Shared/NotFoundContent.tsx) desde `pages/404.tsx` (el contenido sin el `<Head>`, que el caller aporta). `pages/404.tsx` ahora es un wrapper de 12 líneas que compone `<Head>` + `<NotFoundContent />` — cero cambio visual.

Guard defensivo en [pages/[categoria]/index.tsx](../../pages/[categoria]/index.tsx):

```tsx
export default function CategoryPage({ categoria, services }: CategoryPageProps) {
    if (!categoria) return <NotFoundContent />;
    const pageTitle = `${categoria.nombre} | ...`;
```

Cuando el slug no matchea `getStaticPaths`, el componente renderiza el 404 canónico con su copy ("Página no encontrada", CTA "Explorar servicios", CTA "Volver al inicio") en vez de reventar sobre `categoria.nombre`. Consistencia con `/404.tsx` — mismo look & feel, cero UI en blanco.

### 2.3 Spec regresión · [e2e/specs/incidente-usuario-fix/regresion.spec.ts](../../e2e/specs/incidente-usuario-fix/regresion.spec.ts)

3 casos serializados bajo `chromium-tutor`:

1. **botón "Volver a mis reservas" en /mensajes** → asserta `href="/mis-reservas"` + click SPA navega a `/mis-reservas` sin crash + cero `console.error` con prefix "ErrorBoundary caught:" durante el flow.
2. **URL directa a `/usuario`** (goto) → asserta destino `/explorar` (redirect 307 server-side sigue funcionando).
3. **SPA navigation a categoría inexistente** (`/categoria-inexistente-para-regresion` vía `next.router.push`) → asserta heading "Página no encontrada" + CTA "Explorar servicios" visibles + cero fallback "Algo salió mal" + cero `console.error` del boundary.

Actualizado `playwright.config.ts` — nuevo dir `incidente-usuario-fix` agregado a `testMatch` de `chromium-tutor` + `testIgnore` de `chromium` default (evita corrida cruzada). Actualizado `.github/workflows/e2e-error-audit.yml` — `e2e/specs/incidente-usuario-fix/` agregado al comando `e2e-rapido`.

## 3. Fuera de alcance (documentado)

- **TUTOR-HOME**: rediseño formal del home del tutor. Anotado en BACKLOG como deuda de producto post-launch — el tutor debería tener una vista consolidada tipo "Mi Panel" con reservas próximas + mascotas + favoritos en una sola surface. Fix del sprint es curita: apunta el botón a la ruta más semántica existente (`/mis-reservas`), no crea la vista faltante.
- **CHAT-OPEN-ERROR**: bug del handler `handleSendMessage` en [components/Servicio/ServiceDetailView.tsx:415-438](../../components/Servicio/ServiceDetailView.tsx#L415-L438) — el 1er clic de "Enviar Mensaje" falla con toast, el 2do funciona con la conversación ya creada. Hallazgo doble: (a) bug funcional del INSERT + SELECT post-creación (hipótesis: RLS SELECT o trigger post-INSERT), (b) invisibilidad Sentry por catch sin `Sentry.captureException`. Sprint dedicado `chat-open-error` a arrancar 2026-09-24 antes del viaje (diagnóstico 4 pasos: Playwright reproducción + RLS policies via staging-rw + triggers + path del 2do clic + reporte espejo antes del fix). Ver detalle en el kickoff de ese sprint.
- **SENTRY-TOAST**: regla nueva a agregar a CLAUDE.md — todo `catch` que muestre `toast.error` al usuario debe reportar a Sentry con `captureException` y tag `subsystem`. Inventario aproximado 2026-09-24: 135 `toast.error` en 23 archivos, ~15-18 catches sin reporte en `components/**`. Kickoff domingo 2026-09-28 con cifra exacta; ejecución al inicio del Tramo 2, antes de DEL-CUENTA-LEY (la visibilidad es prerrequisito). El catch de ServiceDetailView:415-438 se instrumenta ya en el sprint `chat-open-error`, no espera.

## 4. Enlaces cruzados

- Sprint `sentry-boundary` (2026-09-24, #88, `6774fbd`) — el fix del boundary que hizo visible este bug. Ver [docs/sprints/sentry-boundary.md > 8. Cierre](sentry-boundary.md).
- BACKLOG.md > **TUTOR-HOME** (nueva entrada de producto post-launch).
