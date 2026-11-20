# Plan de SEO programático por comuna × categoría — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: hacer competitivas en Google las landings `/[categoria]/[comuna]` para capturar demanda orgánica de búsqueda local tipo "paseador de perros en providencia".
**Método**: análisis del estado actual del código + queries sobre qué combinaciones son prioritarias + plan de contenido, schema, interlinking y despliegue por tanda.

---

## Estado actual

**Rutas vigentes** (`pages/[categoria]/[comuna].tsx`):

- 10 categorías × 15 comunas SEO = **150 landings estáticas** en el repo hoy.
- Categorías (`lib/catalogoCategorias.ts` + DB): adiestramiento, cuidado, etologia, fotografia, guarderia, paseos, peluqueria, retratos, traslado, veterinario.
- Comunas SEO definidas estáticas en `pages/[categoria]/[comuna].tsx:17-33` (Providencia, Las Condes, Ñuñoa, Vitacura, Santiago, Maipú, La Florida, San Miguel, Macul, La Reina, Lo Barnechea, Peñalolén, Pudahuel, Quilicura, Estación Central).
- `getStaticPaths` genera las 150 combinaciones al build.

**Estructura actual de cada landing**:
- Head con `<title>` + `<meta description>` + canonical.
- Breadcrumb (home > categoría > comuna).
- Si HAY proveedores de esa categoría con cobertura en la comuna → grid de ServiceCard.
- Si NO HAY proveedores → empty state "Aún no hay {categoria} en {comuna}. Sé el primero." + CTA registro proveedor.
- Schema BreadcrumbList + ItemList (para los que tienen proveedores).

**Problema actual**:
- Las 150 landings existen pero **están aisladas** — sin interlinking consistente entre ellas.
- El contenido es **genérico** — mismo template, varía solo título/breadcrumb/grid. Google penaliza near-duplicate content en un marketplace con 150 páginas template.
- Sin **contenido textual único** por combinación (ej. "Por qué contratar paseadores en Las Condes" → párrafos específicos).
- Sitemap las incluye pero sin prioridad diferenciada.

---

## Priorización — qué combinaciones trabajar primero

### Criterios de priorización

Orden de valor estimado:

1. **Demanda de búsqueda real** (Google Trends + Keyword Planner): combinaciones con volumen >100 búsquedas/mes.
2. **Oferta disponible actual**: landings con ≥3 proveedores activos convierten mejor que vacías.
3. **Costo estimado por clic** (CPC Ads): combinaciones con CPC alto = alta intención comercial.
4. **Facilidad de ranking**: comunas pequeñas con baja competencia rankean más rápido.

### Combinaciones tier 1 (foco inmediato — 10-15 landings)

Basado en heurística **sin data real de Search Console aún** (requiere confirmar con el PO via Google Keyword Planner / SEMrush):

| # | Categoría | Comuna | Estimación volumen/mes | Rationale |
|---|---|---|---:|---|
| 1 | paseos | providencia | 500-1500 | Capital densa + rents altos + trabajadores oficina con mascotas |
| 2 | paseos | las-condes | 500-1500 | Mismo perfil demográfico |
| 3 | paseos | nunoa | 300-800 | Densidad media alta + jóvenes profesionales |
| 4 | cuidado | providencia | 300-800 | Viajes frecuentes + mascota sola |
| 5 | cuidado | las-condes | 300-800 | Idem |
| 6 | veterinario | providencia | 400-1000 | Búsqueda urgente, high intent |
| 7 | veterinario | las-condes | 400-1000 | Idem |
| 8 | veterinario | santiago | 300-800 | Centro |
| 9 | peluqueria | providencia | 200-500 | Mascota urbana, cuidado estético |
| 10 | paseos | santiago | 300-800 | Centro |
| 11 | guarderia | las-condes | 200-500 | Combinación alta income + mascotas |
| 12 | paseos | la-florida | 200-500 | Volumen alto, comuna grande |
| 13 | adiestramiento | providencia | 100-300 | Nicho pero high intent |
| 14 | paseos | maipu | 200-500 | Alta población |
| 15 | cuidado | nunoa | 100-300 | Target medio |

**Validación recomendada**: PO sube el listado a [Google Keyword Planner](https://ads.google.com/) o [Ubersuggest free](https://neilpatel.com/ubersuggest/) con 10 min de trabajo + ajusta la lista con data real.

### Combinaciones tier 2 (siguiente ola — 25-40 landings)

Resto de `paseos`, `cuidado`, `veterinario` en comunas medianas (San Miguel, Macul, La Reina, Peñalolén, Lo Barnechea) + categorías de volumen medio (guardería, peluquería) en comunas tier 1.

### Combinaciones tier 3 (no trabajar activamente — las otras ~100)

Mantener landing viva (indexable + sitemap) pero sin inversión de contenido custom. Suficiente con el template genérico que ya existe.

---

## Contenido mínimo por landing tier 1

Cada landing tier 1 debe tener al menos:

### 1. Title optimizado

```
Paseadores de perros en Providencia — Pawnecta
```

Patrón: `{Categoría} {articulo apropiado} en {Comuna} — Pawnecta`. Longitud 50-60 chars para que Google muestre completo.

Actualmente ya existe `<title>` genérico: hay que auditar que el patrón exacto esté bien calibrado por categoría (singular vs plural, articulo correcto).

### 2. Meta description optimizada

```
Encuentra paseadores de perros verificados en Providencia. Compara precios, lee reseñas y reserva directo. 100% gratis en Pawnecta.
```

Patrón:
- Primer frase: acción + categoría + comuna (keyword-rich).
- Segunda frase: 3 beneficios concretos ("compara precios, lee reseñas, reserva directo").
- CTA: "100% gratis" / "Reserva online" / "Sin comisión".

150-160 chars ideal.

### 3. H1 visible

```
Paseadores de perros en Providencia
```

Coincide con title sin "— Pawnecta". Google usa H1 para confirmar tema de la página.

### 4. Párrafo introductorio (150-300 palabras, único por combinación)

Contenido que explique **específicamente** la combinación:

```
¿Buscas un paseador de perros en Providencia?

Providencia es una de las comunas con más demanda de paseadores en Santiago.
Los departamentos pequeños + horarios laborales extensos hacen que muchos
tutores necesiten un paseador profesional de confianza. En Pawnecta puedes
encontrar paseadores verificados que trabajan en Providencia, ver sus
precios desde la primera vista, leer reseñas de otros tutores y reservar
directo sin intermediarios ni comisiones.

El precio promedio de un paseo en Providencia oscila entre $8.000 y $18.000
según la duración (30, 45 o 60 min) y si es individual o grupal. Algunos
paseadores también ofrecen servicios adicionales como baño express o
ejercicios específicos para tu mascota.

Explora los paseadores disponibles abajo o filtra por disponibilidad para
el día que necesitas.
```

**Unique content** es la clave del SEO programático moderno — Google agrupa landings similares y rankea solo la mejor. Un párrafo único con precios/horarios/datos específicos de la comuna evita el agrupamiento.

### 5. Grid de proveedores (ya existe)

Mantener el grid actual. Si hay >5 proveedores, paginar en 10/página; si hay <3, mostrar empty state + CTA registro proveedor.

### 6. FAQ específico (schema FAQPage)

3-5 preguntas típicas con respuesta corta (50-80 palabras cada una):

```
¿Cuánto cuesta un paseador de perros en Providencia?
Los paseadores en Providencia cobran entre $8.000 y $18.000 por paseo según duración y modalidad. Puedes comparar precios directamente en Pawnecta.

¿Los paseadores de Providencia están verificados?
Los proveedores pueden verificar su identidad subiendo su carnet. Busca el badge "Identidad verificada" en cada ficha.

¿Puedo reservar un paseo con anticipación en Pawnecta?
Sí. Los paseadores con agenda activa permiten reservar horarios específicos directamente desde la ficha del servicio.

¿Cómo contacto a un paseador?
Puedes enviarle un mensaje por el chat interno, llamarlo o escribirle por WhatsApp si publicó esos contactos.

¿Pawnecta cobra comisión por la conexión?
No. Pawnecta no cobra comisión a tutores ni a proveedores. La relación es directa entre las partes.
```

**Schema FAQPage** levanta la landing con rich result en SERP (expande respuestas inline), aumenta CTR notablemente.

### 7. Linking interno

En cada landing tier 1, al final del contenido:

- **Comunas cercanas**: "También buscas {categoría} en {comuna cercana 1}, {comuna cercana 2}, {comuna cercana 3}" → links a esas landings.
- **Otras categorías en esta comuna**: "En {comuna} también tenemos: {categoría 1}, {categoría 2}, {categoría 3}" → links a esas landings.

Nunca más de 5 links en cada bloque. Google penaliza over-linking.

Patrón adicional: desde `/explorar`, header o sidebar con shortcuts a las 10 combinaciones tier 1.

### 8. Breadcrumb schema (ya existe)

Mantener. Correcto.

### 9. ItemList schema (ya existe para landings con proveedores)

Mantener. Correcto. Opcional: enriquecer cada item con `AggregateRating` si el proveedor tiene ≥3 reviews.

---

## Interlinking estratégico (hub & spoke)

**Hub principal**: `/explorar`. Consume todos los filtros.

**Hubs intermedios**: landings categoría sola (`/paseos`, `/cuidado`, etc.).

**Spokes**: landings `/[categoria]/[comuna]`.

Reglas:
- Hub principal `/explorar` linkea a los 10 hubs intermedios (categorías) desde un bloque fijo.
- Cada hub intermedio linkea a sus top 5 spokes (comunas con más proveedores de esa categoría).
- Cada spoke linkea a su hub intermedio + 3-5 spokes hermanos (misma categoría, comuna cercana).
- Home linkea a 3-5 spokes destacados (los tier 1 con mejor volumen esperado).

---

## Plan de despliegue por tandas

### Tanda 1 — 15 landings tier 1 con contenido único

- Escribir 15 párrafos introductorios + 15 sets de 5 FAQs cada uno = ~450 palabras × 15 = **~7,000 palabras** de contenido editorial. Esfuerzo: 1-2 días de redacción.
- Agregar bloque de linking interno "Comunas cercanas" + "Otras categorías en esta comuna".
- Validar schema FAQPage con [Schema Markup Validator](https://validator.schema.org/).
- Actualizar sitemap con priority=0.8 para estas 15 (resto priority=0.5).

**Estimación total tanda 1**: 2-3 días (redacción + implementación + validación).

### Tanda 2 — 25-40 landings tier 2 con contenido template-mejorado

- Template de párrafo introductorio parametrizado por comuna + categoría (variables: nombre comuna, rango precio típico de la comuna, descripción de la categoría). Aplicar via componente.
- FAQ compartida (3-5 preguntas genéricas por categoría + rangos de precio específicos de la comuna como variable).
- Agregar a sitemap con priority=0.6.

**Estimación total tanda 2**: 1-2 días.

### Tanda 3 — ~100 landings tier 3 (template actual)

- Sin inversión de contenido custom.
- Verificar que el canonical apunta correctamente a self + sitemap las incluye.
- Si alguna empieza a rankear orgánicamente con mucho volumen, promoverla a tier 2.

---

## Monitoreo post-despliegue

- **Google Search Console** (semanal): impressions + clicks + position media por landing. Target: landings tier 1 con >100 impressions/semana + position media <20 a 3 meses.
- **GA4** (semanal): `page_views` por landing tier 1. Conversion (`ficha_vista`) desde la landing.
- **Backlink growth** (mensual): checkear [ahrefs](https://ahrefs.com/) o [ubersuggest](https://neilpatel.com/ubersuggest/) para dominios que linkean a Pawnecta.
- **Top organic keywords**: identificar queries que trajeron tráfico sin estar optimizadas → crear tier 2 reactivamente.

---

## Decisiones pendientes del PO

### D1. Validar lista tier 1 con Google Keyword Planner

**Pregunta**: ¿autorizás pasar 15 min en Keyword Planner con la lista de 15 combinaciones + 10 adicionales candidatas?

**Recomendación**: sí. Ahorra invertir 1-2 días redactando contenido en combinaciones con bajo volumen real.

**Impacto si no se decide**: default = usar la lista heurística; resultado 70% acertado pero puede tener 2-3 combinaciones sin volumen real.

### D2. Esfuerzo redacción 15 párrafos tier 1

**Pregunta**: ¿el auditor redacta los 15 párrafos (2-3h) o el PO los escribe (más auténtico pero 1-2 días)?

**Recomendación**: auditor arma primer draft (plantilla + rangos de precio + párrafos) + PO revisa + ajusta. Reparte el esfuerzo.

**Impacto si no se decide**: default = PO escribe cuando tenga tiempo; el plan queda en espera.

### D3. FAQ schema — unificado o por landing

**Pregunta**: ¿FAQ idéntica entre landings de misma categoría (5 preguntas, variable solo "rango precio comuna") o FAQ 100% custom por landing?

**Recomendación**: unificado por categoría con 1-2 preguntas variables por comuna. Google tolera repetición moderada de FAQ cuando el patrón "¿Cuánto cuesta X en Y?" es natural.

**Impacto si no se decide**: default = unificado por categoría.

### D4. Timing de implementación

**Pregunta**: ¿tanda 1 pre-campañas (meta 100 proveedores) o post-campañas (una vez validada demanda real)?

**Recomendación**: **pre-campañas**. El SEO toma 2-3 meses en rankear; empezar ya acelera que las campañas pagadas conviertan sobre tráfico orgánico que también llega.

**Impacto si no se decide**: default = post-campañas, SEO orgánico 3 meses después.

### D5. Interlinking "Comunas cercanas"

**Pregunta**: ¿autorizás helper que calcule "comuna cercana" basado en una tabla manual de proximidad o se usa la lista fija del archivo?

**Recomendación**: tabla manual simple en `lib/comunasVecinas.ts` con top 3-4 vecinas por comuna. Esfuerzo: 30 min.

**Impacto si no se decide**: default = interlinking manual al momento de crear cada landing tier 1.

---

## Firma

Este plan arranca con la tanda 1 cuando el PO autorice. Modelo de SEO programático escalable para crecimiento orgánico sin dependencia de campañas pagadas.
