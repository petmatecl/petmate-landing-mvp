# Auditoría keywords Search Console — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: inventariar qué keywords ya rankea Pawnecta en Google + identificar oportunidades de contenido nuevo.
**Limitación metodológica**: auditor sin credenciales Search Console ni MCP con acceso. Este doc provee (a) método para que el PO extraiga los datos reales, (b) heurísticas de interpretación, (c) tabla template para completar, (d) keywords candidatas priorizadas basadas en análisis estático del sitio.

---

## Método para el PO (15-20 min)

### Paso 1 — Entrar a Search Console

1. Ir a [https://search.google.com/search-console](https://search.google.com/search-console).
2. Seleccionar propiedad `pawnecta.com` o `www.pawnecta.com` (verificar cuál está verificada).
3. Si NO está verificada, setup toma 10 min (DNS TXT record o HTML meta).

### Paso 2 — Exportar datos últimos 90 días

1. Ir a **Performance** / **Rendimiento** en el menú lateral.
2. Filtros arriba: fecha = últimos 90 días; país = Chile (opcional, foco mercado).
3. Activar en la tabla: **Clicks** + **Impressions** + **Position average**.
4. Scroll a la tabla de keywords (arriba) + exportar como CSV (botón derecho superior).
5. Repetir con tab **Pages** para ver URLs con mejor performance.

### Paso 3 — Importar a doc

Pegar la tabla CSV en este doc en la sección "Datos reales" abajo. Estructura:

| Query | Clicks | Impressions | CTR | Position |
|---|---:|---:|---:|---:|
| (completar) | | | | |

### Paso 4 — Clasificar oportunidades

Aplicar criterios abajo para identificar top 10 "oportunidad" + top 10 "atacar con contenido nuevo".

---

## Heurísticas de interpretación

### A. Keywords con alta impresión + baja posición = oportunidad de optimización

**Criterio**: `impressions > 100/90d AND position > 15 AND clicks < 20`.

**Lectura**: Google ya nos muestra en SERPs (hay impresión), pero posición media baja (>15 = página 2+) → casi nadie hace click. Fix: optimizar la landing que rankea para subir a posición top 10.

**Acciones típicas**:
- Mejorar title + meta description.
- Agregar contenido textual único a la landing (párrafos de 200-400 palabras).
- Agregar schema markup (BreadcrumbList + FAQPage + ItemList).
- Interlinking desde home + otras landings.

### B. Keywords con alta posición + baja impresión = refinamiento

**Criterio**: `position < 10 AND impressions < 30/90d`.

**Lectura**: Google valora la página pero volumen de búsqueda es bajo. Fix: optimizar para variantes más buscadas.

### C. Keywords con CTR bajo (anomalía)

**Criterio**: `position < 5 AND CTR < 2%`.

**Lectura**: estamos en top 5 pero nadie hace click → title/meta mal + competencia visualmente dominante.

**Acciones**: iterar title para captar atención (ejemplo: "2026 actualizado", números específicos, promesa clara).

### D. Keywords con zero clicks + alta impresión = SERP feature dominante

**Criterio**: `impressions > 50 AND clicks = 0`.

**Lectura**: Google muestra Featured Snippet / People Also Ask sobre nosotros + user no scroll. Fix: optimizar para capturar el Featured Snippet (contenido estructurado H2 + respuesta directa primeros 50 palabras).

---

## Datos reales (completar por PO)

### Tabla principal — top 30 queries por impressions

| Query | Clicks | Impressions | CTR | Position media | Landing |
|---|---:|---:|---:|---:|---|
| (pendiente completar) | | | | | |
| | | | | | |
| ... (expandir con 30 filas) | | | | | |

**Nota**: pegar CSV exportado tal cual. Si el PO prefiere tabla markdown, convertir con [TableConvert.com](https://tableconvert.com) o similar.

### Tabla pages — top 15 URLs por clicks

| URL | Clicks | Impressions | CTR | Position media |
|---|---:|---:|---:|---:|
| (pendiente) | | | | |

---

## Keywords candidatas priorizadas (heurística auditor, no basada en Search Console real)

Sin data real todavía, priorización por:
- Volumen búsqueda estimado Chile (heurística pet-care + comuna).
- Match con páginas vigentes del sitio (landings existentes).
- Competencia estimada (DOGIN, Rover ausente, 2x3.cl generalismo).

### Top 10 keywords de **optimizar** (landings existentes)

Asumiendo que estas aparecen en Search Console con position 10-25:

| # | Keyword | Landing que la cubre | Acción optimización | Prioridad |
|---|---|---|---|---|
| 1 | `paseador de perros santiago` | `/paseos` o `/paseos/santiago` | Párrafo único 300 palabras + FAQ 5 preguntas | ALTA |
| 2 | `paseador perros providencia` | `/paseos/providencia` | Ídem + rangos de precio local | ALTA |
| 3 | `paseadores perros las condes` | `/paseos/las-condes` | Ídem | ALTA |
| 4 | `cuidadores de mascotas santiago` | `/cuidado/santiago` | Párrafo único + schema FAQ | ALTA |
| 5 | `hospedaje para perros` | `/cuidado` (absorbe hospedaje) | Clarificar que cuidado = hospedaje | MEDIA |
| 6 | `veterinario a domicilio santiago` | `/veterinario/santiago` | Párrafo específico + urgencia diferencia | MEDIA |
| 7 | `peluquería canina a domicilio` | `/peluqueria` | Párrafo + lista de servicios | MEDIA |
| 8 | `guardería para perros santiago` | `/guarderia/santiago` | Ídem | MEDIA |
| 9 | `adiestrador de perros santiago` | `/adiestramiento/santiago` | Ídem (categoría con 0 proveedores hoy) | BAJA |
| 10 | `pawnecta` (marca) | `/` (home) | Verificar que home dominates branded SERP | ALTA |

### Top 10 keywords de **atacar con contenido nuevo**

Keywords con volumen pero sin landing dedicada hoy:

| # | Keyword | Contenido nuevo propuesto | Prioridad |
|---|---|---|---|
| 1 | `cuanto cuesta paseador perros chile` | Blog post con tabla precios (ya cubierto parcial por `como-elegir-paseador-perros-santiago`) | ALTA |
| 2 | `que buscar cuidador mascotas` | Blog post (ya parcialmente en `que-buscar-guarderia-cuidado-mascota-santiago`) | MEDIA |
| 3 | `perro con ansiedad por separación` | Blog post nuevo (planeado P8 en `blog-proximo-mes.md`) | ALTA |
| 4 | `peluqueria canina cada cuanto` | Blog post nuevo (planeado P2) | ALTA |
| 5 | `cuando llevar perro veterinario` | Blog post nuevo (planeado P1) | ALTA |
| 6 | `primeros auxilios mascota` | Blog post nuevo (planeado P6) | ALTA |
| 7 | `adiestramiento canino cuando empezar` | Blog post nuevo (planeado P3) | MEDIA |
| 8 | `mascotas fin de año fuegos artificiales` | Blog post nuevo (planeado P7) | MEDIA |
| 9 | `etologo vs adiestrador` | Blog post nuevo (planeado P4) | MEDIA |
| 10 | `alimentación perro ciencia` | Blog post nuevo (planeado P5) | BAJA |

**Observación**: 8/10 keywords de la lista "atacar con contenido" **ya están planeadas** en `docs/planes/blog-proximo-mes.md`. Los P1-P8 del plan de blog cubren exactamente este set. Redundancia validadora.

---

## Monitoreo propuesto post-campañas

Cadencia semanal (30 min PO):

1. Search Console → Performance → Clicks + Position media (dashboard default).
2. Comparar semana vs semana anterior (feature built-in GSC).
3. Alertas Google Search Console → Coverage errors + Core Web Vitals.

Cadencia mensual (1h PO):

1. Exportar top 50 keywords por clicks.
2. Identificar nuevas keywords emergentes (que no aparecían mes anterior).
3. Decidir si rankean porque content las cubre OR si son gaps (crear landing/blog).
4. Documentar movimientos en `docs/auditorias/search-console-keywords-{YYYY-MM}.md` mensual.

---

## Decisiones pendientes del PO

### D1. Setup Search Console si no está verificado

**Pregunta**: ¿`pawnecta.com` tiene verificación Search Console activa?

**Recomendación**: si no, 10 min setup (DNS TXT record, instructions en Search Console wizard). Crítico pre-campañas para medir CAC orgánico.

**Impacto si no se decide**: default = volamos a ciegas con tráfico orgánico.

### D2. Exportar datos últimos 90 días

**Pregunta**: ¿el PO ejecuta la extracción CSV + pega en este doc?

**Recomendación**: sí, ~15 min. Después auditor recalibra priorización basándose en data real.

**Impacto si no se decide**: default = priorización heurística (puede desviarse de la data real).

### D3. Cadencia monitoreo

**Pregunta**: ¿semanal cuick-check + mensual deep-dive, o solo mensual?

**Recomendación**: semanal quick-check post-campañas (velocidad del CAC orgánico). Mensual deep-dive siempre.

**Impacto si no se decide**: default = ad-hoc cuando el PO note algo.

### D4. Alineación con blog-proximo-mes.md

**Pregunta**: los 8/10 keywords "atacar" coinciden con el plan blog. ¿Valide dependencia explícita en el calendario (SEO depende de que esos posts se publiquen)?

**Recomendación**: sí. Hacer ajuste en `blog-proximo-mes.md` para explicitar las keywords target por post.

**Impacto si no se decide**: default = posts se publican sin tracking de keyword target.

---

## Firma

Auditoría parcial — data real pendiente de extracción PO. Método + heurísticas + candidatas listas para completar en bloque.
