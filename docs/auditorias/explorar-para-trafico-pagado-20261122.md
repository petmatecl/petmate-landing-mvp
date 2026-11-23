# Audit /explorar bajo el lente de "primer tutor que llega por ad" — 2026-11-22

Written for: el PO (Aldo), para identificar 5 mejoras concretas en [/explorar](https://www.pawnecta.com/explorar) antes de activar campañas pagadas. Esta página es landing probable del traffic pagado (Google Ads keyword "paseador de perros Santiago" → aterriza acá) o del CTA "Explorar servicios" del Header.

**Método**: smoke prod anónimo 2026-11-22 ~11:55 CLT (viewport desktop 1280×800). Observación del DOM + heurística UX + mapping con el funnel documentado en [funnel-contacto-tutor-detalle-20261122.md](../analisis/funnel-contacto-tutor-detalle-20261122.md).

**Screenshot adjunto**: `prod-explorar-anon-20261122.png` (full page, viewport width 1022px — tamaño que usa MCP Playwright).

---

## Lo que ve el tutor en los primeros 3 segundos

```
┌──────────────────────────────────────────────────────┐
│ "Estamos construyendo Pawnecta. Regístrate y..."     │ ← banner oscuro top-bar
├──────────────────────────────────────────────────────┤
│ PAWNECTA    Blog  Explorar servicios  Ingresar       │
│              [Soy tutor] [Soy proveedor]             │
├──────────────────────────────────────────────────────┤
│ FILTROS           │ Explorar en tu zona              │
│ Buscar...         │ Descubre los mejores             │
│ Categoría         │ profesionales para tu mascota... │
│   ○ Todas         │                                  │
│   ○ Adiestramien. │ 22 resultados — página 1 de 2    │
│   ○ Cuidado       │ [Lista] [Mapa]   Ordenar por...  │
│   ○ Fotografía    │                                  │
│   ○ Guardería     │ ┌──────────┐  ┌──────────┐      │
│                   │ │ Card 1   │  │ Card 2   │      │
│ Zona              │ │ foto     │  │ foto     │      │
│ Comuna            │ │ Sin res. │  │ Sin res. │      │
│ Tipo mascota      │ │ $8.000   │  │ $12.000  │      │
│ Precio            │ └──────────┘  └──────────┘      │
├──────────────────────────────────────────────────────┤
│ Cookies banner (Rechazar / Personalizar / Aceptar)  │ ← tapa parte del grid
└──────────────────────────────────────────────────────┘
```

**Primera impresión**:
- Banner top "Estamos construyendo" **transmite trabajo-en-progreso** cuando deberíamos transmitir confianza ("ya operamos").
- "Explorar en tu zona" es genérico — no comunica el valor diferencial de Pawnecta (nombre, verificación, red de confianza).
- "22 resultados" es minúsculo, perdido.
- Cards con "Sin reseñas" en TODAS = cero social proof visible.
- ~50% de las cards SIN foto (placeholders blancos) = percepción de catálogo vacío.
- Cookies banner tapa cards al cargar — mala primera impresión en caliente.

---

## 10 hallazgos (ordenados por impacto en conversion)

### H1 — Cookies banner tapa cards en primera carga (ALTA)

**Problema**: el consent banner arranca visible y tapa el bottom 15-20% del viewport inicial. Un tutor que mira el primer scroll ve filtros + 2 cards cortadas + banner.

**Impacto**: primera impresión débil. Si clickea "Aceptar/Rechazar" = segundo micro-click antes de poder explorar.

**Fix**:
- Opción A: banner más discreto (bottom-right pill, no banda full-width).
- Opción B: aceptación necesarias por default + solo preguntar por opcionales con botón small.
- Opción C: diferir banner 2 seg post-load para que el content se renderice primero.

**Esfuerzo**: 1-2h.

### H2 — "Sin reseñas" en todas las cards (CRÍTICA)

**Problema**: cada card muestra chip "Sin reseñas" (gris). Con 22 cards, la impresión es "nadie ha usado este marketplace". Fatal para conversion ad → contacto.

**Impacto real**: tutor racional ve 22 "Sin reseñas" → infiere baja confianza → mejor volver a Rover/DOGIN donde sí hay reviews.

**Fix propuestos**:
1. **Reemplazar chip** con proxy de confianza alternativo cuando no hay reseñas: "Verificado Pawnecta" (si `rut_verificado=true`) O "Nuevo en Pawnecta" (neutro) en vez de "Sin reseñas" (negativo).
2. **Agregar count de contactos** si existe: "3 tutores lo contactaron esta semana" (metric de social proof alternativo mientras no haya reviews).
3. **Diferir el chip** hasta que haya al menos 1 review (no mostrar "Sin reseñas" vacío).

**Esfuerzo**: 2-3h.

### H3 — ~50% de cards sin foto (ALTA)

**Problema**: muchas cards tienen placeholder blanco en vez de foto real. Percepción "catálogo vacío" aunque hay servicios activos.

**Causa raíz**: proveedores que publican servicio sin agregar fotos (fricción del wizard, ver signup-proveedor F-PR-13).

**Impacto**: card sin foto = 60-70% menos click rate vs card con foto (benchmark industria marketplaces visuales).

**Fix propuestos**:
1. **Placeholder más atractivo**: foto stock relevante por categoría (Unsplash con atribución) en vez de blanco.
2. **No listar servicios sin foto en /explorar** — forzar la publicación con foto como requisito para aparecer en catálogo. Más restrictivo pero más calidad visual.
3. **Outreach manual del PO** a los proveedores sin foto: "agrega una foto para rankear mejor".

**Esfuerzo**: Opción 1 = 2-3h. Opción 2 = 1h cambio en RPC `buscar_servicios` (agregar filter `fotos array_length > 0`). Opción 3 = del PO, 30 min por proveedor.

### H4 — Hero genérico "Explorar en tu zona" (ALTA)

**Problema**: el H1 de la página es "Explorar en tu zona" + "Descubre los mejores profesionales para tu mascota en Pawnecta." Genérico, no diferencia Pawnecta de competencia.

**Impacto**: un tutor que llega por ad tiene 3-5 seg para entender si está en el lugar correcto. Con este heading, tarda más en decidir.

**Fix propuesto**: H1 con diferenciador concreto. Opciones:
- "Encuentra cuidadores verificados en tu zona" (resalta verificación).
- "Cuidado para tu mascota, en tu comuna, hoy" (resalta inmediatez).
- "Conectamos tutores con cuidadores de confianza en Chile" (resalta trust + localidad).
- Con sub-copy quant: "12 cuidadores activos en Santiago · verificados y disponibles para reservar hoy".

**Esfuerzo**: 15-30 min copy + copy review PO.

### H5 — Banner "Estamos construyendo" transmite WIP (MEDIA)

**Problema**: top banner dice "Estamos construyendo Pawnecta. Regístrate y cuéntanos qué te gustaría encontrar." Comunicación beta-friendly OK para early adopters pero **señal pobre para traffic pagado** (user paga = user espera producto terminado).

**Impacto**: tutor ad que lee banner → "entonces no es un producto real todavía" → sale.

**Fix**: remover banner cuando campañas estén activas. Reemplazar por "Lanzamiento exclusivo: cuidadores verificados en Santiago" (si aplica) o nada.

**Esfuerzo**: toggle off del banner. 15 min.

### H6 — Cards con unidades de precio mezcladas (MEDIA)

**Problema**: los 22 servicios tienen precios con unidades distintas ("$8.000 / por visita", "$12.000 / por hora", "$45.990 / por sesión", "$1.500 / por hora", "$25.000 / por noche"). Comparación cognitivamente costosa.

**Impacto**: tutor no puede filtrar "¿cuál es el más barato?" sin normalizar mentalmente. Deja de comparar racionalmente.

**Fix propuesto** (varios no exclusivos):
1. **Normalizar visual**: mostrar siempre "Desde $X.XXX" + unidad en secondary más chica.
2. **Agregar precio de referencia** cuando unidad distinta: "$1.500/hora ≈ $12.000/8h" para paseos largos.
3. **Documento estandarizado de unidades** por categoría: paseo siempre por hora, cuidado siempre por noche, etc. Proveedor NO elige unidad, la elige la categoría.

**Esfuerzo**: Opción 1 = 1h visual. Opción 3 = sprint estructural (decidir mapping unidad-categoría + migrar data existente, 4-6h).

### H7 — Filtros laterales overkill para user nuevo (MEDIA)

**Problema**: 5 secciones de filtros (Buscar, Categoría, Zona, Comuna, Tipo mascota, Precio) en sidebar fijo = overhead cognitivo para user que recién llega.

**Impacto**: un tutor nuevo no sabe qué filtros usar. Scroll vertical del sidebar lo hace ignorarlos. Ningún pre-set para "lo más popular".

**Fix propuesto**:
1. **Quick filters horizontales arriba de las cards**: "Cuidado y hospedaje" / "Paseos" / "Peluquería" / "Veterinario" (4-5 chips de categoría más populares) + "Ver todos los filtros".
2. **Colapsar sidebar a Advanced Filters** detrás de un botón "Más filtros" expandible.
3. **Mantener sidebar como está**: pero agregar heading "Afina tu búsqueda" en la parte alta como señal.

**Esfuerzo**: Opción 1 = 3-4h. Opción 2 = 2h. Opción 3 = 15 min.

### H8 — Falta CTA de "¿No encuentras? Escríbenos" (MEDIA)

**Problema**: user que recorre 22 cards y no encuentra algo específico no tiene ruta clara. Scroll + abandono.

**Impacto**: escape route al equipo humano captura queries valiosas + evita abandono.

**Fix**: CTA secundario en el bottom del grid o sidebar: "¿No encuentras lo que buscas? Escríbenos a contacto@pawnecta.com — te ayudamos a encontrar el proveedor ideal."

**Esfuerzo**: 15 min copy + visual.

### H9 — "22 resultados — página 1 de 2" (BAJA)

**Problema**: contador de resultados minúsculo + paginación poco visible. Un tutor no sabe que hay más oferta.

**Fix**: destacar count ("22 cuidadores en Chile") + paginación visible abajo.

**Esfuerzo**: 30 min visual.

### H10 — Sin skeleton loader visible (BAJA)

**Problema**: en network lenta, user ve filtros + grid vacío con "Cargando..." genérico. Sin indicación de dónde esperar las cards.

**Fix**: skeleton loader de 4-6 cards grises al cargar.

**Esfuerzo**: 1h (puede ya estar implementado; verificar `ServiceSkeleton` component).

---

## Top 5 mejoras concretas ANTES de activar campañas

Ranking por impacto/esfuerzo:

| # | Hallazgo | Impacto esperado | Esfuerzo | Prioridad |
|---|---|---|---|---|
| **1** | **H2** — Reemplazar "Sin reseñas" por proxy de confianza alternativo | +20-30% click rate card | 2-3h | **ALTA (gating)** |
| **2** | **H4** — H1 con diferenciador concreto | +5-10% retention del user (menos bounce) | 30 min | **ALTA (gratis)** |
| **3** | **H3** — Opción 2: filtrar servicios sin fotos del /explorar | +15-25% percepción de catálogo lleno | 1-2h | **ALTA** |
| **4** | **H1** — Diferir/discreción cookies banner | +5-10% percepción | 1-2h | MEDIA |
| **5** | **H5** — Remover banner WIP para campañas | +3-5% percepción | 15 min | MEDIA (gratis) |

**Esfuerzo total top 5**: ~5-7h. Sprint corto `EXPLORAR-PRE-CAMPAÑA`. Realizable martes o miércoles pre-launch.

---

## Decisiones pendientes del PO

### D1. Toggle banner WIP para campañas

**Pregunta**: ¿removemos banner "Estamos construyendo" cuando campañas estén activas?

**Recomendación**: sí. Toggle condicional por env var `NEXT_PUBLIC_SHOW_WIP_BANNER` default false, true solo en pre-launch beta.

### D2. Filtrar servicios sin foto del catálogo público

**Pregunta**: ¿removemos servicios sin fotos del /explorar hasta que agreguen foto?

**Recomendación**: **no bloquear publicar servicio sin foto** (ver F-PR-13 proveedor), pero **sí filtrarlos del /explorar público**. El proveedor los ve en su panel + recibe recordatorio a las 24h pidiendo foto.

**Alternativa suave**: mantener en /explorar pero ranking hasta el final + banner en la card "El proveedor aún no agregó fotos".

### D3. Proxy de confianza alternativo ("Sin reseñas")

**Pregunta**: ¿cuál proxy mostrar cuando no hay reseñas?

**Recomendación**: priorizar en orden:
1. Si `rut_verificado=true` → "Verificado" (ya existe el badge).
2. Si no verificado pero tiene contactos previos: "N tutores lo contactaron esta semana".
3. Si no, "Nuevo en Pawnecta" (neutro, no "Sin reseñas").

**Esfuerzo**: lógica en `ServiceCard.tsx` + eventual query de contactos recientes por servicio. 2-3h.

### D4. Hero copy pre-campañas

**Pregunta**: ¿hay copy final aprobado del H1?

**Recomendación**: "Cuidadores verificados para tu mascota en Chile" + sub "N cuidadores activos en tu ciudad · reserva en minutos". Copy del PO final. 30 min decisión.

### D5. Filtros laterales — colapsar o quick filters

**Pregunta**: ¿priorizar opción 1 (quick filters horizontales) o 2 (colapsar sidebar) o 3 (mantener + heading)?

**Recomendación**: **opción 3 pre-campañas** (mínimo esfuerzo, contexto no urgente) + **opción 1 post-launch** cuando haya data de uso real de filtros.

---

## Firma

Esta auditoría es base para el sprint `EXPLORAR-PRE-CAMPAÑA`. La página /explorar es LA landing esperable del tráfico pagado — cada hallazgo cerrado se traduce directo en conversion rate del anuncio.
