# Landings para tráfico pagado — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: proponer 3 landings específicas para dirigir tráfico de Meta Ads + Google Ads con mayor conversión que el home genérico.
**Referencia**: complementa `docs/planes/test-campanas-presupuesto-bajo.md` (plan de tests con $100k CLP) + `docs/planes/seo-programatico.md` (SEO orgánico).

---

## Problema actual

La home `pawnecta.com/` es **genérica**: hero con search + bloques "cómo funciona" + testimonials/placeholders + footer. Al llegar tráfico pagado de "paseador perros providencia", el user ve un marketplace general y tiene que navegar manual. **Alta fricción + bajo CTR a reserva**.

Landings dedicadas optimizadas para:
1. Un único match query → user ve inmediatamente lo que buscaba.
2. Un único CTA primario (no "explora el marketplace" sino "reserva un paseador").
3. Elementos de confianza condensados en primera vista.
4. Conversion event tracked claramente.

---

## Diseño general (shared across the 3 landings)

### Estructura above-the-fold

1. **H1 específico** (keyword-rich, 50-80 chars): coincide con la query del ad.
2. **Subtítulo**: 1-2 líneas con beneficio concreto (ej. "Reserva directo. Sin comisión. En tu comuna.").
3. **CTA primario** (botón grande accent): acción deseada (ej. "Ver paseadores disponibles").
4. **Social proof condensado**: "X proveedores verificados" o "Y servicios en {comuna}" (número dinámico).
5. **Hero image / illustration**: no stock de personas, sí screenshot plataforma O ilustración vectorial propia.

### Elementos below-the-fold

- **Grid de 6-9 servicios** matcheando la landing (ya existente en SEO programático).
- **Bloque "Cómo funciona"** (3 pasos simples, iconografía Lucide).
- **FAQ específico** (3-5 preguntas, schema FAQPage).
- **CTA repetido** al final ("Explora más opciones").

### Elementos de conversión

- Tracking GA4: event `landing_ad_clicked` con `{landing_slug, utm_source, utm_campaign}`.
- Tracking Meta Pixel: ViewContent on load + Lead on form submit.
- Tracking Google Ads: conversion tag on primary CTA click.

### Design system

Zero nuevo. Reusar components existentes (`ServiceCard`, header, footer). Páginas livianas para Core Web Vitals (LCP < 2.5s target).

---

## Landing 1 — `/paseador-santiago` (Meta T1 + Google T1)

**Match query**: `paseador de perros santiago`, `paseadores santiago`, `paseador perros santiago`.

**Volumen estimado**: alto (1k-3k búsquedas/mes según heurística benchmarks).

### Above-the-fold

```
H1: Paseadores de perros en Santiago

Reserva directo. Verificados. Sin comisión. En tu comuna.

[CTA PRIMARIO] Ver paseadores disponibles

{N} paseadores verificados · Reserva en minutos
```

### Below-the-fold

- **Grid 9 paseadores** (los top 9 de Santiago, cualquier comuna — mezcla tier 1 si hay volumen).
- **Cómo funciona** (3 pasos iconografía Lucide): 1. Elige tu paseador → 2. Reserva en línea con horario → 3. Paga al proveedor directo.
- **FAQ 5 preguntas**:
  - ¿Cuánto cuesta un paseador?
  - ¿Cómo sé que es de confianza?
  - ¿Reserva online o solo contacto?
  - ¿Cobra Pawnecta comisión?
  - ¿Qué pasa si cancelo?
- **CTA secundario**: "Ver todos los paseadores →" → `/paseos`.

### Métricas conversion

- Conversion goal: click en cualquier ServiceCard → `ficha_vista` event.
- KPI: Landing View → ficha_vista rate > 25%.

### Esfuerzo técnico

- Página nueva `pages/paseador-santiago.tsx` (o `pages/[categoria]-[region].tsx` como pattern genérico). 2-3h + diseño.
- Conectar grid con RPC `buscar_servicios(p_categoria_slug='paseos', p_comuna=NULL, p_limit=9)`.
- FAQ schema markup.
- GA4 event + Meta Pixel event.

---

## Landing 2 — `/cuidador-vacaciones` (Meta T1 alt + Google T2)

**Match query**: `cuidador de mascotas vacaciones`, `hospedaje perros`, `guardería mascotas`, `donde dejar mi perro`.

**Volumen estimado**: estacional (alto nov-feb en Chile por vacaciones).

### Above-the-fold

```
H1: Cuidadores para tus vacaciones

Tu mascota en casa de un cuidador verificado mientras viajas.
Sin jaulas. Sin stress.

[CTA PRIMARIO] Ver cuidadores en tu comuna

{N} cuidadores con disponibilidad · Reserva por noches
```

### Below-the-fold

- **Grid 6 cuidadores** con capacidad de estadía F2.
- **Comparación visual**: "Hospedaje profesional vs cuidador en casa" (icon-based). Punto a favor para cuidador: "Ambiente familiar + menos stress para mascota".
- **FAQ 5 preguntas**:
  - ¿Cuánto cuesta una estadía por noche?
  - ¿El cuidador manda fotos durante la estadía?
  - ¿Puedo reservar varios días?
  - ¿Qué pasa si mi mascota tiene una emergencia?
  - ¿Pago antes o después?
- **CTA secundario**: "Explora todos los servicios de cuidado →" → `/cuidado`.

### Esfuerzo técnico

- Página nueva `pages/cuidador-vacaciones.tsx`. 2-3h + diseño.
- Grid con filtro `categoria_slug='cuidado' AND capacidad_estadia IS NOT NULL` (solo F2).
- Comparación visual: simple 2-col con íconos Lucide + 3 bullets cada col.

**Timing recomendado**: activar landing + ads **a partir de 15-dic** (pico vacaciones Chile ene-feb).

---

## Landing 3 — `/soy-proveedor` (Meta T3 lado oferta)

**Match query**: `trabajo con mascotas`, `ganar dinero paseando perros`, `cuidador mascotas chile`.

**Volumen estimado**: medio. Nicho pero alta intención comercial.

### Above-the-fold

```
H1: Ofrece tus servicios para mascotas en Pawnecta

Publica tu servicio gratis. Sin comisión por conectar.
Fija tu precio. Reserva online.

[CTA PRIMARIO] Publica tu servicio →

{N} proveedores ya conectan con tutores en Chile
```

### Below-the-fold

- **3 beneficios con íconos**:
  - **Sin comisión**: "No cobramos por cada reserva que recibas".
  - **Agenda online**: "Tus clientes reservan fechas disponibles directo".
  - **Visibilidad gratis**: "Apareces en Google por categoría y comuna".
- **Testimonial** (si existe proveedor con autorización): foto + quote + servicio.
- **Cómo funciona** (3 pasos):
  1. Regístrate en 2 minutos.
  2. Publica tu servicio con fotos + precios.
  3. Recibe reservas directo al email + panel.
- **CTA secundario**: "Ver proveedores activos para inspirarte →" → `/explorar`.

### Esfuerzo técnico

- Página nueva `pages/soy-proveedor.tsx`. 2-3h + diseño.
- Count dinámico de proveedores desde RPC o endpoint específico.
- Si no hay testimonial autorizado, usar bloque estático "Historias reales próximamente".

---

## Convenciones compartidas

### URLs y canonical

- Las 3 landings tienen URLs específicas (no query parameters).
- Canonical self (no apunta a home).
- Agregadas al sitemap con priority=0.9 (más alto que el resto para enfatizar freshness).

### Mobile-first

- Grid de 9 cards → 1 col mobile (verificar).
- CTA primario sticky bottom en mobile viewport <640px.
- Hero image aspect-ratio 16:9 o 4:3 (no vertical).

### Performance

- Landing 1 target LCP < 2s mobile (crítico — campo de ads).
- Lazy-load grid cards below the fold.
- Preconnect a Supabase Storage (ya existe).

### SEO + Ads simultáneo

Las 3 landings sirven **doble propósito**: tráfico pagado + SEO orgánico. Cada una tiene:
- Title + meta description optimizados.
- Schema markup (BreadcrumbList + FAQPage + ItemList).
- Interlinking con landings SEO tier 1 de `docs/planes/seo-programatico.md`.

---

## Métricas de éxito post-ads

### Landing 1 (paseador-santiago)

- Landing View → ficha_vista rate: **> 30%**.
- ficha_vista → contacto_iniciado rate: **> 15%**.
- CAC total: < $7.000 CLP por contacto_iniciado.

### Landing 2 (cuidador-vacaciones)

- Landing View → ficha_vista rate: **> 35%** (audiencia altamente intencionada).
- Reserva F2 confirmada / sesión: **> 5%**.

### Landing 3 (soy-proveedor)

- Landing View → inicio `/register`: **> 20%**.
- Registro proveedor completado / sesión: **> 10%**.
- CAC total: < $5.000 CLP por proveedor registrado.

---

## Decisiones pendientes del PO

### D1. Pattern `/[categoria]-[region]` vs URLs dedicadas

**Pregunta**: ¿URLs hard-coded (`/paseador-santiago`) o patrón generativo (`/[categoria]-[region]`) para escalar a 30+ landings post-success?

**Recomendación**: **hard-coded primero** (3 landings maestras). Si funcionan + se escalan 10+, migrar a pattern. Hoy es overkill.

**Impacto si no se decide**: default = hard-coded.

### D2. Contenido testimonial Landing 3 (soy-proveedor)

**Pregunta**: ¿buscar testimonio autorizado de proveedor activo (Juan Bou del BACKLOG por ejemplo) o usar stock de "próximamente"?

**Recomendación**: pedir autorización a 2-3 proveedores activos con buenos resultados. Testimoniales reales convierten 3-5x más.

**Impacto si no se decide**: default = "Historias reales próximamente" placeholder.

### D3. Landing 2 (cuidador-vacaciones) vigente todo el año o solo temporada

**Pregunta**: ¿dejar la landing viva todo el año o solo activar durante vacaciones (nov-feb + feriados julio)?

**Recomendación**: **viva todo el año** pero ads solo en temporada. La landing captura orgánico fuera de temporada + SEO cumulativo.

**Impacto si no se decide**: default = vive todo el año.

### D4. Esfuerzo técnico — in-house auditor o PO

**Pregunta**: ¿auditor implementa las 3 landings (~6-9h total) o PO redacta copy + un dev externo las codea?

**Recomendación**: auditor redacta + implementa, PO revisa visual + ajusta copy fino. Flow más rápido.

**Impacto si no se decide**: default = auditor + PO review.

### D5. Lanzamiento pre o con campañas

**Pregunta**: ¿landings pre-campañas (soft launch con SEO orgánico 3-4 semanas antes) o paralelo con ads?

**Recomendación**: **pre-campañas 2-3 semanas**. SEO orgánico tarda en indexar (~2-4 semanas para landings nuevas); llegar con landings ya indexadas suma a los ads.

**Impacto si no se decide**: default = pre-campañas 2-3 semanas.

---

## Firma

Plan listo. Esfuerzo total estimado: ~6-9h código + 2-3h diseño. Impacto: CAC esperado 30-50% menor que dirigir ads a home genérica.
