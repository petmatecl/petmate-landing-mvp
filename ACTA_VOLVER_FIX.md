# ACTA — Sprint `volver-fix`

**Rama**: `volver-fix` (forkeada de `main` @ `2d4f151` post-cierre `toast-fix`).
**SHA final en `main`**: por completar tras commit del acta (ver §7).
**Tag**: `volver-fix-prod-20260904`.
**Fecha ejecución**: 2026-09-04.
**Estado**: **CERRADO** en producción. Smoke prod verde por PO 2026-09-04.

---

## 1. El bug con su alcance real — 2 de 11 botones "Volver" del sitio

Grep exhaustivo del proyecto detectó **11 botones "Volver"** en total. Solo **2 tenían el patrón vulnerable** (`router.back()` directo):

| Categoría | Cantidad | Detalle |
|---|---|---|
| **`router.back()` — vulnerable** | **2** | `pages/proveedor/[id].tsx:209` (reportado por PO), `pages/admin/notificaciones.tsx:87` (derivado del diagnóstico) |
| `<Link href="..." />` — ruta fija estática | 7 | ErrorBoundary, ChatLayout (2), AdminLayout, 404, 500, forgot-password (2) |
| `router.push('/...')` — ruta fija programática | 1 | register.tsx:713 (`push('/')`) |
| Callback custom sin historial (cierra sub-vista) | 1 | ChatLayout.tsx:65 (`handleBack` interno) |

**Los otros 9 ya estaban bien**. El sprint cubrió exactamente los 2 casos vulnerables — no más, no menos. Grep post-fix (`router.back()` en `pages/*.tsx`) muestra las 2 llamadas restantes **dentro del guard `if (sameOrigin)`**. Cero llamadas residuales sin protección.

## 2. Por qué importaba — perfil público es página de conversión con tráfico externo

`/proveedor/[id]` es página de tráfico externo **por diseño**: SEO indexado, links compartidos por WhatsApp/redes, referencias desde blogs de terceros, campañas de marketing. Recibe leads de gente que **nunca antes tocó Pawnecta** y llega directo al perfil.

El botón "Volver" con `router.back()` puro **expulsaba justamente a ese tráfico**: user llega desde Google → mira el perfil → toca "Volver" esperando ver más opciones → **sale del sitio** (al entry anterior del navegador que era Google, about:blank, o el origen del link compartido).

Es camino de salida en página de conversión. Cada click = lead perdido. **La superficie del bug era la parte del tráfico que más valor tiene** — leads externos que están evaluando por primera vez.

Reportado por PO 2026-09-04 tras encontrarlo en producción en `/proveedor/ed384fc0-826f-44e9-bedf-f03f4eb68ca3`.

## 3. Trade-off del fallback — con tabla, decisión consciente

Los filtros de `/explorar` viven en query params URL (verificado en [pages/explorar.tsx:253](pages/explorar.tsx#L253) — `categoria`, `comuna`, `pagina`, `orden`, `precio`, `mascota`, `tamano`, `fecha`, `inclusiones`, `modalidad`, `q`).

Comportamiento en las 2 vías del fix:

| Vía | Trigger | Query params en URL | Filtros | Scroll position |
|---|---|---|---|---|
| **Referrer OK → `router.back()`** | `document.referrer` empieza con `window.location.origin` | URL previa restaurada **COMPLETA** (incluye query) | **Mantenidos** — categoria + página + orden + todo | **Restaurado** (Next 15 default) |
| **Referrer vacío o distinto → `router.push('/explorar')` fallback** | Cualquier otra cosa | URL sin query params | **Perdidos** — `/explorar` arranca limpio | Va a top |

**Sí, el fallback pierde los filtros aunque el user haya venido internamente si el referrer falla por privacy policy** (`referrer-policy: no-referrer`, cambio HTTPS↔HTTP, algunos redirects, config del user con Do Not Track o extensiones anti-tracking).

**Decisión consciente, no omisión**: ~2 segundos de re-aplicar filtros vs lead retenido. El primero pesa mucho menos que el segundo. El fallback **es la Opción A ("siempre ruta fija") pero solo cuando el chequeo de referrer no logra ser mejor**. En los casos donde el referrer sí funciona, la vía feliz restaura el estado completo. En los casos edge donde falla, cae al fallback seguro. **Nunca sale del sitio**.

Aterrizado en comentario in-code extenso ([pages/proveedor/[id].tsx:207-268](pages/proveedor/[id].tsx#L207-L268)) que explica el por qué de cada rama + los ~5 mecanismos por los que `document.referrer` puede venir vacío + la instrucción "NO REMOVER el chequeo pensando que es defensa exagerada — el caso vacío está atendido por diseño, no por olvido".

## 4. Control positivo corrido ANTES de escribir código

El diagnóstico predijo el mecanismo del bug (stack de historia vacío en llegada externa) y propuso un método de simulación: **Ctrl+T → pegar URL directa → click Volver**. Predicción falsable, verificable en 60 segundos.

**El PO corrió el control positivo ANTES de aprobar el código**:
- Abrió pestaña nueva.
- Pegó URL `/proveedor/ad258d35-...` en producción.
- Click Volver.
- **Salida del sitio confirmada**.

**Sin ese control**, no había forma de verificar el fix post-aterrizaje. Si el método no reproducía el bug, arreglar algo no verificable habría sido peor que no arreglar nada — se aterriza código sin saber si funciona, y se firma "cerrado" sin evidencia real. **Control positivo ANTES = evidencia falsable ANTES = fix aterrizable con confianza**.

Aterrizable como **regla operativa**: cuando el sprint tiene un método de simulación novedoso (no ejercitado antes en otros sprints), verificar que reproduce el bug ANTES de aterrizar cualquier código. Cero costo (60 segundos), enorme ganancia (evidencia de que el smoke va a funcionar).

## 5. `/admin/notificaciones` arreglado aunque superficie externa mínima

El segundo botón `router.back()` detectado por el grep (además del reportado) estaba en `pages/admin/notificaciones.tsx:87`. Superficie externa **muy baja** — ruta protegida por RoleGuard, cero probable que alguien "llegue de Google". Un admin logueado que llega a `/admin/notificaciones` desde alguna acción interna tiene historia previa dentro del sitio, y `router.back()` funciona bien.

**Decisión del PO al enterarse**: arreglarlo igual. Motivo verbatim del PO:

> "Dejar el de admin con el bug latente porque 'casi nadie llega de afuera' es la clase de decisión que después no se revisa nunca."

Mismo fix, mismo mecanismo, fallback contextual `/admin` (hub padre) en vez de `/explorar`. Cero razón para dejar la mitad. **Evita crear deuda "menor" que sobrevive indefinidamente hasta que algún incidente la resucita** — patrón que aparece muchas veces en el propio proyecto (ejemplos: el Toaster duplicado del sprint anterior toast-fix cerrado 17 días después del trabajo original de Ola 2).

## 6. Apunte de método — cuidado con URLs equivocadas en gestos de simulación

Durante el smoke del PO en el preview, la **primera vez pegó la URL de PRODUCCIÓN** (donde el fix aún no estaba) en la pestaña nueva. Obviamente Volver falló — el bug seguía ahí porque prod no tenía el fix todavía. Confusión momentánea "¿el fix no funcionó?" hasta darse cuenta de que había pegado la URL equivocada.

**Registro operativo**: en un sprint donde el gesto de prueba es "pegar una URL en una pestaña nueva", **es fácil pegar la equivocada** — el gesto de simulación no distingue entornos. Hay que verificar el SHA del preview antes de dar por fallido el fix.

Analogía con el caso canónico ya registrado en `ACTA_Z_INDEX_MAPS.md §6` (preview equivocado detectado por atribución faltante): **verificar contra el efecto observable, no contra el SHA reportado**. En este sprint el efecto observable es "estás en el dominio del preview, no de prod" — cotejar la URL address bar contra la del preview esperado antes de correr el gesto.

Este apunte + el de z-index-maps forman **familia**: cualquier smoke que dependa de que el user esté en el entorno correcto tiene que tener un check simple del entorno antes del gesto. En este sprint la simulación era simplísima (Ctrl+T + pegar URL), pero el check del entorno vale igual.

## 7. Verificación en producción — smoke visual del PO

Smokes ejecutados por PO 2026-09-04 contra `www.pawnecta.com`:

- ✅ **Externo (el bug)**: Ctrl+T → pegué URL del perfil en `www.pawnecta.com` → click "Volver" → **vuelve a `/explorar`**. Antes salía del sitio. **Bug cerrado en producción**.
- ✅ **Interno (no regresión)**: `/explorar` con filtro aplicado → click proveedor → click Volver → vuelve a `/explorar` **con filtro puesto**. El chequeo de referrer no rompió la navegación interna.

**Cero rollback, cero regresión reportada**.

## 8. Deuda anotada al cierre

**Cero deuda nueva** del sprint. Los 2 botones vulnerables cerrados, los otros 9 ya estaban bien.

## 9. Metadata del tag

- **Tag anotado**: `volver-fix-prod-20260904`
- **Apunta a**: (SHA del commit final tras merge FF + este acta — completar tras push)
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/volver-fix-prod-20260904`): completar
- **Fecha del commit apuntado**: completar

Fechas separadas por regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

---

**Cierre**: sprint 100% ejecutado en producción, smoke verde, 2 botones vulnerables cerrados con `Opción B` (referrer check + fallback contextual), comentario in-code extenso con el porqué de cada rama del fix + los ~5 mecanismos por los que el referrer puede venir vacío + instrucción explícita "no remover pensando que es defensa exagerada". El próximo sprint queda en cancha del PO — el auditor no arranca nada.
