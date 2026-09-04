# ACTA — Sprint `popup-fix`

**Rama**: `popup-fix` (forkeada de `main` @ `ca52a94` post-cierre `volver-fix`).
**SHA final en `main`**: por completar tras commit del acta (ver §7).
**Tag**: `popup-fix-prod-20260904`.
**Fecha ejecución**: 2026-09-04.
**Estado**: **CERRADO** en producción. Smoke prod verde por PO 2026-09-04 con medición empírica idéntica al preview.

---

## 1. Los 3 fixes cerrados

Popup del marker de precio en `/explorar` con 2 defectos visuales reportados por PO (contraste + encuadre foto). El sprint cerró **3 cosas** — los 2 reportados + un defecto de layout descubierto durante el smoke que resultó ser el mecanismo real del encuadre mal.

**Smoke prod PO 2026-09-04**:

| Fix | Comportamiento antes | Comportamiento después |
|---|---|---|
| **Contraste botón "Ver perfil completo"** | Texto azul-verdoso apagado sobre fondo verde (`bg-accent-600`) — casi ilegible | Texto **blanco pleno** sobre verde, contraste WCAG AA (~4.6:1+) |
| **Altura foto popup** | `h-28` (112px), aspect ratio ~2:1 muy horizontal → foto muy recortada arriba/abajo | `h-32` (128px), aspect ratio ~1.7:1 → menos recorte vertical |
| **Ancho foto popup** | Franja blanca de ~32-60px a la derecha (hack de márgenes negativos no funcionaba a medias) | `right_gap_px: 0` verificado empírico prod + preview |

**Medición empírica idéntica prod y preview**:
```
{ wrapper_width: 221, img_width: 221, right_gap_px: 0 }
```

## 2. Diagnóstico del contraste — mecanismo Leaflet vs Tailwind

El botón **ya tenía `text-white`** en la clase Tailwind. El PO reportaba "verde apenas más claro sobre verde". Contradicción aparente entre código y observación visual.

**Causa técnica** (verificada en DevTools de prod por PO ANTES de escribir código):
- Leaflet incluye en su CSS default:
```css
.leaflet-container a {
    color: #0078A8;   /* azul-verdoso apagado */
}
```
- Especificidad `(0,0,1,1)` (una clase + un elemento) > `.text-white` de Tailwind `(0,0,1,0)` (una clase sola).
- Leaflet ganaba silente → el link renderea azul apagado. Sobre fondo `bg-accent-600` verde daba el efecto "verde sobre verde apenas visible".

**PO verificó en DevTools de prod ANTES de aprobar el fix** — panel Elements mostró: (a) HTML con `class="... text-white ..."`, (b) panel Styles con regla `.leaflet-container a { color: #0078A... }` activa. **Ambas verdades simultáneas** — el `text-white` estaba pero no se aplicaba.

**Corrección del auditor sin que el PO la pidiera** durante ese diagnóstico: en ronda 1 estimé el selector como `.leaflet-popup-content a`. Verificación PO en DevTools reveló que era `.leaflet-container a` (**más amplio** — cubre todos los `<a>` dentro del contenedor Leaflet, no solo los del popup). Corregí en el acta + comentario in-code. El mecanismo es el mismo (especificidad clase+elemento supera clase sola), el fix es el mismo (`!text-white` para ganar por importance), pero el ámbito del selector era mayor de lo estimado.

**Verificado que el ámbito ampliado NO cambia el sprint**: los otros `<a>` dentro del `.leaflet-container` son los del attribution control ("OpenStreetMap", "CARTO") que viven sobre fondo blanco donde el azul de Leaflet funciona. Solo este CTA sobre fondo verde sufría el bug. Fix `!text-white` cubre el ámbito real.

**Fix aterrizado**: agregar prefijo `!` de Tailwind (`!text-white`) → genera `text-white !important` → `!important` supera especificidad → gana sobre `.leaflet-container a` default. 1 carácter, `<Link>` component sigue idéntico en todo lo demás.

## 3. Diagnóstico de la imagen — 3 hipótesis, 2 descartadas midiendo

El PO reportó "imagen recortada arriba y abajo con sujeto descentrado" en varias fotos distintas. La ronda 1 propuso 3 opciones para el encuadre: altura mayor, `object-position`, o `aspect-ratio`. Elegimos altura mayor (h-32) que aterrizó en el commit 1.

**Post-smoke del commit 1, el PO descubrió más**:
- La imagen NO ocupaba todo el ancho del popup — franja blanca de ~60px a la derecha visible.
- Sospecha del PO: no era problema del origen (sujeto descentrado), era problema del código (elemento mal alineado).

**Diagnóstico ronda 2 — 3 hipótesis, verificadas empíricamente**:

**Hipótesis A** — padding real de Leaflet vs asumido por el hack.
- CSS default de Leaflet: `.leaflet-popup-content { margin: 13px 24px 13px 20px }` (ASIMÉTRICO — 24 right para closeButton, 20 left).
- Nuestro override: `.leaflet-popup-content { margin: 16px }` (uniforme).
- El hack de la imagen `-mx-4` + `marginLeft: -16px` + `width: calc(100% + 32px)` asume que el override gana (16 uniforme).
- **Verificación PO** con comando `getComputedStyle(document.querySelector('.leaflet-popup-content')).margin` = **"16px"**.
- **Descartada** — override gana, el hack alinea correcto respecto al padding real. El bug no es la asimetría.

**Hipótesis B** — wrapper más ancho que content+márgenes.
- Sospecha PO: Leaflet puede dimensionar el wrapper independientemente del content, dejando espacio extra que el hack no cubre.
- **Verificación PO** con `getBoundingClientRect()` sobre wrapper + content: wrapper 253px, content 221px, diff = 32px = exactamente los `margin: 16px * 2 lados`.
- **Descartada** — wrapper y content encajan perfecto. La diferencia es solo los márgenes del content.

**Hipótesis C** — Tailwind reset `img { max-width: 100% }` limita la imagen extendida.
- Sospecha del auditor tras descartar A y B.
- **Verificación PO** con `getComputedStyle(document.querySelector('.leaflet-popup-content img')).maxWidth` = **"100%"**.
- **Confirmada**. El `calc(100% + 32px)` intenta pedir 253px pero `max-width: 100%` limita a 221px (100% del content). La imagen NO crece. Sí se corre 16px a la izquierda (`marginLeft: -16px` sin restricción), pero sin crecer. Cubre desde `-16px` hasta `205px`. Wrapper mide 253px. **Franja blanca de ~48-60px a la derecha**.

**Lo confuso del bug era que el hack funcionaba a medias**: desplazamiento izquierdo sí (margin negativo sin límite), ensanchamiento NO (limitado por reset Tailwind). Si ninguna de las dos partes hubiera funcionado, la imagen estaría centrada y nadie habría notado nada.

**Fix estructural (Opción R)**:
- `.leaflet-popup-content { margin: 0 }` (era 16px) → content ocupa todo el wrapper.
- JSX: imagen SIN hacks negativos ni width extendido. Solo `className="w-full h-32 object-cover"`. Al 100% del content nuevo, llega naturalmente a los 2 bordes del wrapper.
- Div interno nuevo `<div className="p-4">` envuelve el texto, reemplaza el aire que daba el margin del content.
- **Cero número hardcodeado** en el hack de la imagen. Robusto ante upgrades de Leaflet que cambien el padding default del content.

## 4. Mis 2 correcciones de análisis en el mismo sprint

**Corrección propia (mía, sin que el PO la pidiera)** en ronda 1:
Dije en el diagnóstico inicial que aplicar `isolate` al wrapper del mapa era "cero riesgo para popups, markers y controles" — al mirar el código de CaregiverMap para escribir el fix noté que las burbujas de precio son Markers con `divIcon`, no popups nativos, y que podían recortarse con overflow. Corregí en el mismo turno antes de aterrizar el fix. **El PO no tuvo que pedirlo**.

**Corrección tuya (del PO)** en ronda 2 sobre Opción R:
En el turno del diagnóstico dije: "Opción R por sí sola no ayuda si el wrapper es más ancho que content, porque poner imagen al 100% del content la deja igual de corta." **Error de mi lado** — no consideré que la Opción R INCLUYE poner el margin del content en 0. Con margin 0, el content llena el wrapper, y la imagen al 100% ya llega a los bordes. Cita verbatim del PO:

> "Dijiste que la Opción R no ayudaría porque poner la imagen al 100% del content la deja igual de corta. Eso no es exacto — TU PROPIA Opción R incluye poner el margin del content en CERO."

**Anotable como patrón meta**: 2 errores de análisis en el mismo sprint, ambos corregidos antes de aterrizar código. Uno por lectura propia post-primera-respuesta, otro por lectura del PO. **El sprint no aterrizó código sobre análisis equivocado en ninguno de los 2 casos** — el ciclo diagnóstico → revisión → corrección → verificación empírica funcionó. Pero el propio patrón (afirmar sin haber verificado hasta el fondo) es el mismo que aparece en el corolario P8 aplicado a mí mismo. Nota recurrente. La respuesta absoluta ("cero riesgo") y la asunción no explícita ("Opción R sola vs con las dos partes juntas") son las 2 formas del sesgo — ambas domesticables con más rigor en el análisis inicial.

## 5. Método canónico registrado — comandos de consola de una línea

Nota del PO 2026-09-04 verbatim:

> "Una nota sobre el método: el comando de consola de una línea funcionó mucho mejor que pedirme que navegue paneles del inspector. Para las próximas mediciones, pasame directamente el comando."

**Adoptado como método canónico del proyecto para futuros sprints con verificación DevTools**. En este sprint fueron 4 mediciones, cada una cerró una hipótesis:

| Comando | Resultado | Hipótesis cerrada |
|---|---|---|
| `getComputedStyle(...).margin` | `"16px"` | Padding asimétrico Leaflet **descartado** |
| `getBoundingClientRect()` sobre wrapper + content | wrapper 253, content 221, diff 32 | Wrapper crece más allá del content **descartado** |
| `getComputedStyle(...).maxWidth` (sobre img) | `"100%"` | Reset Tailwind limita ancho **confirmado** |
| Comando post-fix triangulador (wrapper + img + right_gap_px) | `right_gap_px: 0` | Fix efectivo verificado |

**Ventaja sobre navegar paneles**: cada comando es una línea copy-paste, devuelve el valor exacto que necesitamos triangular, y el output es citable literal en el chat. Cero interpretación, cero paneles distintos por browser version, cero paso perdido en la navegación del inspector. **Diagnóstico avanza 3-4x más rápido**.

**Regla operativa para el proyecto**: cuando un sprint necesite medir propiedad computada, dimensión o estado del DOM, el auditor pasa el comando de consola en un solo bloque. El PO copia-pega y responde con el output crudo. Cero instrucciones tipo "abrí DevTools panel X, buscá Y".

## 6. Encogimiento del popup como efecto colateral medido

**Dato empírico** registrado por el PO 2026-09-04 (medición triangulada antes/después):

| Fase | Wrapper | Content | Imagen |
|---|---|---|---|
| **Antes del sprint** | 253px | 221px | 221px con franja de 32px sin cubrir a la derecha |
| **Post-fix Opción R** | **221px** | 221px | 221px sin franja |

**El wrapper pasó de 253 → 221px** — el popup entero encogió 32px al aplicar el fix. Ninguno de los 2 anticipamos este efecto.

**Explicación técnica**: Leaflet dimensiona el `.leaflet-popup-content-wrapper` a partir del `.leaflet-popup-content` **más sus márgenes**. Al setear `margin: 0` en el content (fix del sprint), Leaflet recalculó y el wrapper terminó con el mismo ancho que el content puro (~221px + el `padding: 1px` default). Sin los 32px de margin, el ancho total del popup encogió esos 32px.

**Anotación del PO**: "NO me molesta visualmente — se ve bien y el texto respira igual gracias al `p-4`. Pero anotalo en el acta como efecto colateral del fix, no como algo que buscamos. Si en algún momento el popup se ve apretado con títulos largos, ahí está la explicación."

**Trigger para revisar en el futuro**: si aparece un servicio con título largo (`s.titulo` con muchas palabras) que se corte al `line-clamp-2` de forma agresiva, o el layout del popup se ve apretado, la explicación de por qué el popup mide 221 (no 253 como antes) está acá. Fix futuro sería una línea: subir `maxWidth={220}` del `<Popup>` a un valor mayor (probado en ronda 2 pero postergado — "cerrar el sprint con lo que funciona y ajustar después si hace falta").

## 7. Verificación empírica en producción — smoke visual del PO

Smokes ejecutados por PO 2026-09-04 contra `www.pawnecta.com`:

- ✅ **Popup del marker de precio en `/explorar`**: botón con texto blanco legible, imagen ocupando todo el ancho, foto más completa verticalmente.
- ✅ **Medición empírica prod idéntica al preview**: `{ wrapper_width: 221, img_width: 221, right_gap_px: 0 }`.
- ✅ **Los 3 fixes cerrados en producción**.

**Cero rollback, cero regresión reportada**.

## 8. Deuda anotada durante el sprint

Ambas ya anotadas al BACKLOG en commit `ca52a94` (main, previo al fix):

- **Componente `<Button>` canónico compartido** (prioridad baja) — el sprint reveló que el proyecto no tiene un `<Button>` compartido. La defensa (`!text-white` u override) vive en el botón local. Con un componente, la defensa contra CSS agresivo externo vive una sola vez. Trigger para arrancar: próximo bug del mismo tipo o sprint de sistema de diseño.
- **Import muerto de `Popup` en `LocationMap.tsx:1`** (deuda light) — `Popup` importado sin usar. Sacar de paso cuando se toque el archivo por otra razón.

## 9. Metadata del tag

- **Tag anotado**: `popup-fix-prod-20260904`
- **Apunta a**: (SHA del commit final tras merge FF + este acta — completar tras push)
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/popup-fix-prod-20260904`): completar
- **Fecha del commit apuntado**: completar

Fechas separadas por regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

---

**Cierre**: sprint 100% ejecutado en producción, smoke verde con evidencia empírica cuantitativa (los 3 números idénticos prod vs preview), 3 fixes aterrizados (contraste + altura + ancho imagen), deuda anotada, método canónico registrado, efecto colateral medido y documentado. El próximo sprint queda en cancha del PO — el auditor no arranca nada.
