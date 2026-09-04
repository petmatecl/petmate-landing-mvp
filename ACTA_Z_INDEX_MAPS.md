# ACTA — Sprint `z-index-maps`

**Rama**: `z-index-maps` (forkeada de `main` @ `b45b0d5` post-cierre `carto-key`).
**SHA final en `main`**: por completar tras commit del acta (ver §8).
**Tag**: `z-index-maps-prod-20260904`.
**Fecha ejecución**: 2026-09-04.
**Estado**: **CERRADO** en producción. Smoke prod verde por PO 2026-09-04.

---

## 1. Los dos bugs cerrados

**Bug 1 — `/explorar` con vista de mapa + scroll → mapa se monta sobre el Header**:
- **Baseline (prod pre-fix)**: al scrollear con vista de mapa activa, el mapa Leaflet se despega del contenedor y **tapa la franja "Estamos construyendo Pawnecta", los links Blog + Explorar servicios, el botón Ingresar, y los CTAs "Soy tutor" + "Soy proveedor"**. Además el mapa se **sale del contenedor por la derecha**, extendiéndose más allá del ancho de la página. Solo sobrevive el logo por quedar a la izquierda.
- **Después (prod post-fix)**: header sigue **visible arriba** — franja + Blog + Explorar servicios + Ingresar + los 2 CTAs enteros. Mapa **contenido en su caja** sin desbordar. Verificado por PO en smoke prod 2026-09-04.

**Bug 2 — Dashboard `/proveedor` sección Ubicación → mapa tapa el botón "Guardar Cambios"**:
- **Baseline (prod pre-fix)**: el botón "Guardar Cambios" de la barra fija inferior queda **desplazado y fuera de su posición**. El mapa se **sale del contenedor por la izquierda**, cubriendo items del menú lateral — se leen "Servicios", "Perfil", "uaciones" (evaluaciones), "sajes" (mensajes) cortados.
- **Después (prod post-fix)**: botón "Guardar Cambios" **en su posición** en la barra fija, mapa sin invadir el menú lateral. "Estadísticas" y "Solicitudes" completos. Verificado por PO en smoke prod 2026-09-04.

**Causa raíz**: Leaflet usa z-indexes internos altos por default (tile-pane=200, marker-pane=600, popup-pane=700, control=800). Sin stacking context propio del wrapper del mapa, esos valores escapan al context superior y ganan contra el Header sticky (z-40) o la barra fija (z-30). Regla CSS clave: `position: relative` **sin** `z-index` no crea stacking context. Los 2 componentes rotos tenían `relative` pero cero z-index/isolate.

**Fix**: transcripción literal del wrapper de LocationMap ([línea 38](components/Shared/LocationMap.tsx#L38)), que ya aplicaba el patrón correcto (`className="isolate"` + `style={{ position: 'relative', zIndex: 0 }}`) y por eso no tenía el bug. Cero diseño nuevo — copia de un patrón ya funcional del propio proyecto.

## 2. El sprint se amplió en el camino — decisión consciente, no scope creep

Entró como **fix de z-index puro** (2 componentes: CaregiverMap + LocationPicker). Al ver el resultado del preview con el fix aterrizado, la **divergencia visual entre `/explorar` y los perfiles quedó evidente**: los perfiles con estilo Voyager limpio (CARTO con key desde sprint carto-key), `/explorar` con OSM crudo. La atribución de CaregiverMap decía solo "Leaflet | © OpenStreetMap" — sin CARTO — congruente con OSM pero divergente ahora que el resto del sitio usa CARTO.

**Decisión del PO en el turno del smoke**: agregar la clave CARTO a CaregiverMap **sobre la misma rama**, como **commit APARTE** para revertibilidad separada. Razones:
- Mismo archivo (`CaregiverMap.tsx`) que acabamos de tocar.
- Cambio de 2 líneas.
- Smoke se solapa — vas a mirar `/explorar` con vista de mapa igual para verificar el z-index.
- Separarlo sería armar otra rama + otro ciclo completo para verificar lo mismo en la misma pantalla.

**Aterrizado como `44f5f07`** post-rebase (commit 2 sobre `0aa443f`). Revertible por separado si aparece problema con CARTO en `/explorar` sin tocar el fix del z-index. Env var `NEXT_PUBLIC_CARTO_TILES_KEY` ya en Vercel Prod/Preview/Dev desde sprint carto-key — cero step operativo adicional.

**Nombre del sprint quedó desalineado a mitad de camino** (empezó como fix de z-index, terminó cubriendo también tiles). Aceptable — el tag `z-index-maps-prod-20260904` sigue reflejando el core del sprint + la ampliación queda en esta acta.

## 3. Corrección de mi ronda 1 sobre popups — sin que el PO la pidiera

**Error inicial (mío) en ronda 1**: reporté "**cero riesgo** para popups, markers y controles del mapa al aplicar el fix. El stacking context del wrapper NO cambia el orden interno de los panes de Leaflet, solo cómo se comparan con el exterior."

**Corrección propia en ronda 2** (al mirar el código antes de escribir el fix):
- Las burbujas de precio del CaregiverMap **NO son popups nativos** de Leaflet — son **Markers con `divIcon`** ([componentsExplore/CaregiverMap.tsx:133-145](components/Explore/CaregiverMap.tsx#L133-L145)). Viven en `.leaflet-marker-pane` con posición absolute, `iconSize: [56, 40] + iconAnchor: [28, 40]`.
- Con el fix aterrizado, `overflow: hidden` del wrapper empezaría a funcionar correctamente. Los markers cerca del borde del wrapper podrían quedar **recortados post-fix** — comportamiento visual distinto al de hoy.
- Corregí mi lectura ANTES de escribir el código y reporté explícitamente al PO, sin que él lo pidiera.

**Evidencia del PO al capturar la baseline** confirmó el mecanismo: el mapa se sale del contenedor por la derecha en `/explorar` y por la izquierda en el dashboard — el rendering interno del mapa **escapaba visualmente del wrapper** hoy. Con el fix, `overflow: hidden` ahora sí contiene → burbujas cerca del borde pueden recortarse.

**Resultado empírico post-fix (smoke PO en preview)**: las burbujas **NO se recortaron**. Cero regresión visual con ninguno de los dos basemaps. El escenario B que anticipé no se materializó en la práctica — posiblemente porque los markers naturalmente quedaban lejos del borde por el `fitBounds` + padding del `MapUpdater`, o porque el `iconAnchor: [28, 40]` posiciona el marker de forma que las burbujas caen dentro del contenedor incluso cerca del borde. El análisis técnico era correcto en abstracto pero la disposición práctica del CaregiverMap lo evitó.

**Registro del meta-patrón**: la corrección fue **mía** en el mismo turno de ronda 2, sin que el PO tuviera que pedirla. Es aplicación del corolario P8 aplicado a mi propia respuesta — antes de aterrizar un análisis "cero riesgo", verificar contra el código real. El caso vale como ejemplo canónico: **la afirmación absoluta ("cero riesgo") es sospechosa por sí sola, y una segunda lectura del código encontró el caso concreto que la desmentía**.

## 4. Diferencia menor de uniformidad entre los 3 componentes de mapa

Post-sprint, los 3 componentes tienen configuración **parcialmente uniforme**:

| Componente | isolate | zIndex 0 | overflow hidden | URL CARTO con key | subdomains | maxZoom |
|---|---|---|---|---|---|---|
| LocationMap | ✅ | ✅ | ✅ | ✅ | default Leaflet (`abc`) | default Leaflet (18) |
| LocationPicker | ✅ | ✅ | ✅ | ✅ | default Leaflet (`abc`) | default Leaflet (18) |
| CaregiverMap | ✅ | ✅ | ✅ | ✅ | **`abcd` explícito** | **20 explícito** |

**CaregiverMap tiene `subdomains="abcd"` + `maxZoom={20}` explícitos**, los otros 2 usan defaults Leaflet. Justificable: CaregiverMap es el mapa **más usado del sitio** (browsing catálogo público con zoom in/out frecuente) — mejora reparto de carga sobre 4 subdominios vs 3 + habilita zoom mayor que CARTO soporta pero el default Leaflet recortaba.

**Deuda leve de uniformidad**: agregar los mismos atributos a LocationMap y LocationPicker por paridad total. Sprint chico. **NO se aterriza acá** por decisión de mantener el scope acotado — el sprint z-index-maps entró como fix de z-index, ya se amplió una vez con CARTO en CaregiverMap, un tercer punto de scope creep sería demasiado. Anotado como deuda light.

## 5. Este sprint cierra el defecto conocido del sprint anterior

**Sprint carto-key (2026-09-04)** cerró con **un defecto conocido sin arreglar** registrado explícitamente en su acta §5:

> "hoy, en producción, un proveedor que edita su ubicación puede tener el botón de guardar tapado por el mapa. No es hipotético. No lo descubrimos después: lo vimos, lo entendimos, y decidimos postergarlo."

**Este sprint cierra ese defecto**. Verificado por PO en smoke prod 2026-09-04: botón "Guardar Cambios" en su posición, mapa sin desbordar. **El próximo sprint anticipado al cierre de carto-key era exactamente éste, y se ejecutó** — el compromiso de "el próximo sprint es el z-index de mapas" registrado en `ACTA_CARTO_KEY.md §9` se cumplió.

Cadena de sprints coordinada: `carto-key` (marca de agua + attribution) → **`z-index-maps` (2 bugs de layout + CARTO en CaregiverMap para uniformidad visual)**.

## 6. Hallazgo del smoke sobre método — preview equivocado detectado por efecto observable

Durante el smoke del PO en el preview del sprint, la **primera vez miró un preview equivocado** (deployment id `d2ze75iap`) que tenía el z-index roto Y sin CARTO. Se dio cuenta **no mirando el SHA** sino porque **la atribución no coincidía con lo que el cambio prometía** — decía solo "Leaflet | © OpenStreetMap" cuando el sprint incluye ambos créditos "OpenStreetMap, CARTO".

**Buscar el deployment correcto lo resolvió** — ahí el smoke pasó verde en los 5 puntos.

**Registro del método**: es aplicación pura del corolario P8 del proyecto — **verificar contra el efecto observable, no contra el SHA reportado**. El SHA en Vercel Dashboard puede coincidir o no con el deployment que uno abre por URL vieja / bookmark viejo / tab persistente. El efecto observable (attribution con ambos créditos) es garantía real de que el código del sprint aterrizó: si el efecto está, el código aterrizó; si el efecto NO está, no aterrizó, sin importar qué diga el SHA.

**Caso replicable para futuros smokes**: el smoke debe verificar algo que **solo puede estar presente si el cambio aterrizó**. En este sprint fue la mención "CARTO" en la atribución del mapa `/explorar` — antes del sprint NO estaba, después del sprint SÍ debe estar. Es contrato binario auditable en 1 segundo por el PO.

## 7. Hallazgos nuevos aterrizados al BACKLOG durante el sprint

**Actualizaciones a entradas existentes**:
- **Toast duplicado**: subido de prioridad media → **ALTA** + **3 casos confirmados en 2 pantallas + 2 entornos** (toggle servicio prod + guardar perfil preview + guardar perfil prod). Los 3 con las mismas 2 variantes visuales. Refuerza fuertemente la hipótesis de **2 `<Toaster>` montados en el árbol** — si fuera caller doble, sería el mismo bug independiente en 3 lugares, improbable.
- **Contraste botón "Ver perfil completo" popup mapa**: subido de baja → **MEDIA** por argumento del PO (inconsistencia con sistema de diseño canónico, CTA principal del popup, cuesta clicks). Al abrir, verificar si el patrón aparece en otros botones del sitio.

**Entradas nuevas**:
- **Burbujas de precio superpuestas en zonas densas** (prioridad media, decisión de diseño): con 17 resultados ya se nota, va a empeorar. Requiere clustering/spider/contador/reducir iconSize — sprint dedicado post-viaje PO.
- **Encuadre foto del servicio en popup** (prioridad baja): `object-cover` centra sin importar el sujeto. `h-28` puede ser corto para fotos horizontales. Relacionado con la entrada existente del cropper LinkedIn (L529) — si aterriza, este defecto se reduce solo.

## 8. Verificación empírica en producción — smoke visual del PO

Smokes ejecutados por PO 2026-09-04 contra `www.pawnecta.com`:

- ✅ **`/explorar` con vista de mapa + scroll**: estilo Voyager uniforme con los perfiles, sin marca de agua, attribution `© OpenStreetMap, © CARTO` visible, **header visible al scrollear** (franja + Blog + Explorar servicios + Ingresar + CTAs "Soy tutor" / "Soy proveedor").
- ✅ **Dashboard `/proveedor` sección Ubicación**: **botón "Guardar Cambios" en su posición** en la barra fija, mapa sin invadir el menú lateral (Estadísticas + Solicitudes completos).
- ✅ **Los 2 bugs del sprint cerrados en producción**.
- ✅ **Burbujas de precio**: cero recorte cerca del borde (escenario B corregido en ronda 2 no se materializó empíricamente).
- ✅ **Popups clickeables**: click en marker → card con foto + categoría + título + proveedor + rating + precio + botón "Ver perfil completo" (con contraste bajo — entrada BACKLOG).
- ✅ **Los 3 mapas del sitio uniformes**: Voyager en LocationMap + LocationPicker + CaregiverMap.

**Cero rollback, cero regresión**.

## 9. Metadata del tag

- **Tag anotado**: `z-index-maps-prod-20260904`
- **Apunta a**: (SHA del commit final tras merge FF + este acta — completar tras push)
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/z-index-maps-prod-20260904`): completar
- **Fecha del commit apuntado**: completar

Fechas separadas por regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

---

**Cierre**: sprint 100% ejecutado en producción, smokes verdes, docs actualizadas, deuda anotada, defecto conocido del sprint anterior CERRADO. El próximo sprint queda en cancha del PO — el auditor no arranca nada.
