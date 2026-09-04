# ACTA — Sprint `carto-key`

**Rama**: `carto-key` (forkeada de `main` @ `4e09854` post-cierre `role-degradation`).
**SHA final en `main`**: por completar tras commit del acta (ver §7).
**Tag**: `carto-key-prod-20260904`.
**Fecha ejecución**: 2026-09-04.
**Estado**: **CERRADO** en producción. Smoke prod verde por PO 2026-09-04.
**Defecto conocido sin arreglar al cierre**: sí — ver §5.

---

## 1. Lo que el sprint venía a arreglar

En producción, en el perfil de un proveedor (`/proveedor/ed384fc0-826f-44e9-bedf-f03f4eb68ca3` originalmente reportado por PO), el mapa Leaflet rendereaba con la **marca de agua "API KEY REQUIRED"** repetida por todo el fondo + link `carto.com/basemaps/apikey`. Impresión de sitio roto para cualquiera que mire un perfil.

**Causa de fondo**: CARTO cambió su política en 2024/2025 exigiendo API key para basemaps públicos, y está retirando los raster tiles. Los 2 componentes del proyecto que usan CARTO (LocationMap perfil público + LocationPicker dashboard privado) apuntaban al URL sin key → CARTO devolvía tiles con marca de agua incrustada. CaregiverMap `/explorar` no tiene el problema porque usa OpenStreetMap directo.

Urgencia real: **9 servicios de proveedores reales publicados en producción**. Actividad orgánica creciendo. Perfiles vistos por tráfico externo.

## 2. La decisión se tomó dos veces

**Primera lectura del PO (Opción B — migrar a OSM directo)**:
- Sin claves que gestionar, sin cuenta de dependencia.
- Unifica estilo visual con `/explorar` que ya usa OSM.
- Extensión de patrón ya funcional en el proyecto.
- Costo asumido: pérdida estética (OSM más crudo que Voyager CARTO).

Auditor arrancó ejecución en rama `map-tiles` (SHA `caf3972` en remoto — **NO mergeada, intacta como plan B**). Push preview, capturas antes/después.

**Revisión del PO tras comparación justa (Opción A — mantener CARTO con API key)**:
- PO hizo comparación **misma zona (Las Condes)** en prod (CARTO) vs preview (OSM). Antes había mirado perfiles de zonas distintas — **evidencia mal construida, comparación inválida**.
- Con la misma zona a la vista, CARTO se ve claramente mejor para el bloque Ubicación: menos ruido, colores más suaves, círculo verde del área aproximada resalta. En OSM el círculo compite con calles naranjas + nombres de vías.
- **Costo asumido conscientemente**: CARTO retira los raster tiles en algún momento y hay que migrar igual. Prefiere que el sitio se vea bien HOY con proveedores reales publicados y pagar la migración cuando toque.

**Registro explícito por pedido del PO**: la decisión se tomó dos veces, la primera con evidencia mal construida. Anotable como caso — un feature visual comparado en escenarios distintos no da respuesta confiable. **Mismo perfil, misma sesión, misma zona** es la única forma justa de comparar dos proveedores de tiles.

**Rama `map-tiles`** (SHA `caf3972`): NO borrada, queda como plan B ejecutable en minutos si CARTO corta antes de tiempo. Entrada BACKLOG anotada.

## 3. El bug de attribution oculta por overflow — preexistente desde diciembre 2025

Durante el smoke inicial con la key CARTO aplicada, el mapa se veía limpio pero **el PO no encontró la atribución con Ctrl+F "carto"** en la página del perfil. Único match: la URL del tile dentro del DOM del MapContainer. Cero texto visible con "OpenStreetMap" ni "CARTO".

**Diagnóstico técnico**:
- Padre `<div>` de LocationMap: `height: 300px + overflow: hidden`.
- `<MapContainer>` con `style={{ height: '100%' }}` → ocupaba TODO el height del padre = 300px.
- Div attribution hermano quedaba empujado por debajo del área visible → `overflow: hidden` lo recortaba.
- **Existía en el DOM pero jamás fue visible al usuario**.

**Bug PREEXISTENTE** desde el commit `8f1d766` (**2025-12-16**, cuando se creó LocationMap). Vivió en producción **~9 meses invisible al usuario**. No lo introdujimos:
- Cuando el texto era "© OpenStreetMap contributors, © CartoDB", nadie lo miraba — cero consecuencia.
- **El sprint lo hizo relevante** porque con la key CARTO, la atribución pasa a ser **requisito CONTRACTUAL** del free tier ("keeping CARTO and OpenStreetMap attribution visible") — el checkbox literal que el PO aceptó al pedir la key. Sin la atribución estamos usando la clave fuera de los términos.

**Método de detección**: **Ctrl+F "CARTO"** en la página del preview. Sin ese control, la verificación visual "el mapa se ve bien" habría pasado el bug por alto — el texto está en el DOM pero cortado por overflow. **A ojo era invisible; Ctrl+F lo encontró**.

**Fix estructural**: `className="isolate flex flex-col"` en el padre + `style={{ flex: 1 }}` en el MapContainer (en vez de `height: 100%`). Attribution ocupa altura natural (~24px), MapContainer ocupa lo que sobra. Ambos siempre visibles.

**LocationPicker** NO tuvo este bug — usa el control default de Leaflet (no está `attributionControl={false}`) que renderea DENTRO del canvas del mapa como DOM interno del MapContainer, no afectado por overflow del wrapper externo. Confirmado en smoke por PO: `Leaflet | © OpenStreetMap, © CARTO` visible en esquina inferior derecha.

**Aterrizado como test canónico del sprint**: Ctrl+F "CARTO" y "OpenStreetMap" en la página debe encontrar texto **visible** (no la URL del tile en DOM). Documentado in-commit para futuros sprints que toquen mapas.

## 4. Costo asumido — migrar cuando CARTO retire raster

El PO asumió conscientemente el costo de una migración futura obligatoria. **Registrado en BACKLOG** con contexto:

- Entrada nueva "Migrar de tiles raster CARTO cuando los retiren" (prioridad media, trigger externo).
- **Rama `map-tiles` (SHA `caf3972`) queda intacta en remoto como plan B** ejecutable en minutos. Cero trabajo de análisis nuevo cuando llegue el momento.
- Triggers: (a) aviso oficial CARTO deprecation date, (b) primer degradation observable, (c) decisión proactiva.
- Alternativas si OSM no alcanza: Stadia Maps, Mapbox.

## 5. Defecto conocido sin arreglar al cierre — z-index LocationPicker tapa "Guardar Cambios"

**Registro explícito por pedido del PO — sin suavizar**:

Durante el smoke de **este** sprint, el PO descubrió que **en el dashboard del proveedor, sección Ubicación, el mapa LocationPicker se monta sobre el botón "Guardar Cambios" de la barra inferior — el botón queda tapado por el mapa**.

Es la misma familia del bug de z-index de Leaflet ya conocido en `/explorar` (donde el mapa tapa el Header sticky + los 2 CTAs de conversión). Ambos componentes comparten el patrón vulnerable: wrapper sin `isolate` ni `zIndex`, MapContainer con z-indexes internos altos (200-800) que escapan al stacking context superior.

**Decisión deliberada de postergar**: es un bug de layout sin relación con los tiles CARTO. Mezclarlo con el sprint de la key habría ensuciado el smoke de los dos y aumentado alcance sin razón técnica (el z-index es 100% CSS del wrapper, cero interacción con el URL de tiles). El fix probable es transcripción directa del patrón que **LocationMap ya aplica correctamente** (`className="isolate"` + `zIndex: 0`).

**Consecuencia registrada**: hoy, en producción, **un proveedor que edita su ubicación puede tener el botón de guardar tapado por el mapa**. No es hipotético. No lo descubrimos después: **lo vimos, lo entendimos, y decidimos postergarlo**.

Anotado en BACKLOG con estado **CONFIRMADO** (subido de "potencial" a "confirmado" tras este smoke) + severidad marcada explícita: **peor que /explorar** — /explorar tapa navegación, dashboard tapa el botón que el user necesita para persistir lo que acaba de editar.

## 6. Verificación en producción — smoke visual del PO

Smokes ejecutados por PO 2026-09-04 contra `www.pawnecta.com`:

- ✅ **LocationMap `/proveedor/ad258d35-...`**: mapa sin marca de agua, estilo Voyager limpio, círculo verde presente, **`© OpenStreetMap contributors, © CARTO` visible en borde inferior derecho**.
- ✅ **LocationPicker dashboard**: mapa CARTO limpio, **`Leaflet | © OpenStreetMap, © CARTO` visible en esquina inferior derecha** (control default Leaflet).
- ✅ **Camino completo del picker**: mover marcador → guardar ("Perfil actualizado correctamente") → **F5** → ubicación **persistió** en la nueva posición.
- ✅ **Ctrl+F control positivo**: encontró texto visible de ambos créditos en la página.
- ✅ **Variable env `NEXT_PUBLIC_CARTO_TILES_KEY`** aterrizada en Production Vercel — verificable por ausencia de marca de agua (si faltara, la marca volvería).

**Cero rollback, cero regresión**.

## 7. Hallazgos nuevos aterrizados al BACKLOG durante el smoke

**Toast duplicado — GENERAL de toda la app (subida de prioridad media→alta)**:
- Detectado inicialmente en toggle activar/pausar servicio (sprint role-degradation).
- Confirmado también al guardar perfil desde dashboard (este sprint smoke): "Perfil actualizado correctamente" sale 2 veces con las mismas 2 variantes visuales.
- **Refuta la hipótesis original** "caller llama `toast()` dos veces": es GENERAL de toda la app, no de una pantalla.
- **Hipótesis nueva**: probablemente **2 `<Toaster>` montados en el árbol** (canónico en `_app.tsx:63` + otro inadvertido — probable el de `ServiceFormModal:2578` conocido como "duplicado a limpiar"). Cada Toaster renderiza cada toast disparado → dos elementos visuales por invocación.
- Método verificable al abrir: `grep '<Toaster' **/*.tsx` = espera 1 solo match.
- **Prioridad subida** porque afecta a toda la app, no una pantalla.

**Z-index LocationPicker CONFIRMADO**:
- Ver §5. Sub-línea de la entrada BACKLOG del z-index actualizada de "bug potencial no reportado" a "**BUG CONFIRMADO 2026-09-04**".
- Sprint del z-index cubre **CaregiverMap + LocationPicker** confirmadamente (LocationMap queda fuera — ya tiene isolate).

## 8. Cierre del sprint

**Aterrizado en producción**:
- `NEXT_PUBLIC_CARTO_TILES_KEY` en Vercel Production + Preview + Development.
- Merge FF `carto-key` → `main`.
- Tag `carto-key-prod-20260904` anotado.

**Documentación aterrizada**:
- Esta acta.
- `.env.example` con variable documentada.
- BACKLOG actualizado con hallazgos del smoke.

**Deuda anotada al cierre**:
- Migrar de raster CARTO cuando los retiren (rama `map-tiles` lista como plan B).
- Homologación toasts + eliminar Toaster duplicado (subida de prioridad).
- Z-index Leaflet en `/explorar` + `dashboard picker` (LocationMap sirve de modelo).
- Mapa en ficha de servicio según modalidad (pedido PO durante el sprint).
- Ubicación legible del proveedor (comuna + región como texto).

## 9. Próximo sprint — z-index de mapas

Confirmado por PO al cierre: **próximo sprint es el z-index**. Cubre CaregiverMap + LocationPicker. LocationMap sirve de modelo (ya tiene el patrón correcto — transcripción directa de sus atributos `isolate` + `zIndex: 0`, cero diseño nuevo). Dos superficies confirmadas con el bug: `/explorar` tapa navegación + CTAs de conversión, dashboard tapa botón "Guardar Cambios".

## 10. Metadata del tag

- **Tag anotado**: `carto-key-prod-20260904`
- **Apunta a**: (SHA del commit final tras merge FF + este acta — completar tras push)
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/carto-key-prod-20260904`): completar
- **Fecha del commit apuntado**: completar

Fechas separadas por regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

---

**Cierre**: sprint 100% ejecutado en producción, smokes verdes, docs actualizadas, deuda anotada. **1 defecto conocido sin arreglar** registrado explícitamente en §5 — no oculto. El próximo sprint (z-index de mapas) queda en cancha del PO. El auditor no arranca nada.
