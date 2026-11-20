# Plan de changelog público — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: proponer un changelog público mínimo que comunique mejoras al user + mejora SEO (señal de "producto activo") + transparencia. Zero código aún; este doc es diseño + propuesta.

---

## Por qué un changelog público

### Beneficios esperados

1. **SEO**: página con contenido fresco frecuente → señal a Google de sitio activo. Google indexa changelog (si es público y crawlable) y lo usa como feature freshness.
2. **Transparencia**: users ven que el equipo "trabaja". Reduce fricción al abandonar frente a bugs ("están arreglándolo").
3. **Diferenciador**: la mayoría de marketplaces competidores LATAM (DOGIN, Laika, Oliver Pets según `docs/analisis/benchmarks-marketplaces-20261120.md`) NO tienen changelog público. Diferenciador cualitativo.
4. **Gestión expectativas**: los users ven lo que sí viene vs lo que no.
5. **PR narrative**: features en changelog pueden referenciarse en social media + press.

### Riesgos

1. **Mantenimiento**: un changelog sin updates es peor que no tenerlo ("el equipo dejó de trabajar").
2. **Tono**: muy técnico aliena users; muy casual desvía la seriedad.
3. **Oversharing**: comunicar bugs resueltos puede sugerir que había bugs → confianza baja.
4. **SEO duplicate**: si el formato no es único, Google lo agrupa con otros changelog templates.

---

## Propuesta — formato

### Ubicación

**`/blog/changelog`** como entrada maestra tipo "pagina viva" que lista las versiones. **No** `/changelog` directo como ruta raíz (más fricción de implementación + decisión de IA).

Dentro de `/blog/changelog`:
- Encabezado fijo con descripción breve.
- Lista invertida cronológicamente: la versión más reciente arriba.
- Cada versión linkea a su entrada detallada en `/blog/changelog/v{semver}` o `/blog/changelog-{YYYY-MM}`.

Alternativa más simple: **una sola entrada que se actualiza** cada release, con todas las versiones listadas inline. Menos work pero menos SEO (una sola URL).

**Recomendación**: hybrid. `/blog/changelog` como listado + cada release tiene link a `/blog/changelog-{YYYY-MM}` con mes de releases (no por versión). Mes mensual balance SEO + baja frecuencia update manual.

### Estructura de cada entrada

```markdown
# Cambios en Pawnecta — Noviembre 2026

## Nuevo

- **Reseñas verificadas de clientes**: ahora distinguimos reseñas de servicios realmente tomados vs. comentarios generales. Más confianza para elegir.
- **SEO por comuna**: encontrarnos en Google desde "paseadores providencia" ahora es más fácil.
- **Fotos de verdad en el blog**: reemplazamos las imágenes genéricas por fotos reales de nuestros usuarios y profesionales.

## Mejor

- **Perfil del proveedor**: ahora se ve tu fecha de registro + badge "Nuevo en Pawnecta" si aún no tenés reseñas. Más contexto para tutores que recién nos conocen.
- **Chat**: cuando apretás "Contactar" no creamos la conversación hasta que escribís el primer mensaje. Menos ruido en tu bandeja.

## Arreglamos

- **Catálogo**: solucionamos un problema donde el filtro "Cuidado y Hospedaje" a veces no mostraba todos los servicios.
- **Email bienvenida**: ahora llega consistente a todos los proveedores nuevos.

---

**¿Algo falta? ¿Algo molesta?** Escribenos a hola@pawnecta.com.
```

### Tono

- Lenguaje de usuario, no técnico.
- Nunca mencionar nombres de PRs, SHAs, Supabase, Vercel.
- Nunca mencionar bugs antes de arreglarlos ("arreglamos un problema donde X").
- Categorías: **Nuevo** (features), **Mejor** (cambios existentes), **Arreglamos** (bugs resueltos).
- Zero humor forzado.
- Emoji selectivo: ❤ solo si la regla CLAUDE.md permite (no, aplica también al blog — regla general). Sin emojis.

### Frecuencia

**Mensual** es sweet spot:
- Semanal: sobrecarga de mantenimiento + sin substancia → "fixed bug in button".
- Mensual: 2-5 cambios concretos + narrativa + SEO fresco.
- Trimestral: muy espaciado → lectores olvidan.

**Primer release**: con lanzamiento de campañas (o antes si hay traction).

---

## Estructura técnica

### Nueva entrada blog o sección aparte

**Opción A**: cada release = post nuevo en `lib/blogData.ts`:
- Slug `changelog-2026-11`.
- Autor `Equipo Pawnecta`.
- Tag `changelog`.
- Fecha de release.

**Pro**: reusa infra blog existente. **Con**: navegación mixta con posts "normales" en `/blog` index.

**Opción B**: colección aparte `lib/changelogData.ts` + ruta nueva `/changelog`:
- Separación conceptual.
- Pagina maestra `/changelog` con listado de todas las versiones.
- Páginas individuales `/changelog/[slug]`.

**Pro**: UX más clara. **Con**: infra duplicada (template, routing, sitemap).

**Recomendación**: **Opción A** inicialmente (tag `changelog` en blog). Si volumen crece (>6 releases/año + tráfico significativo) migrar a Opción B.

### Filtrado en `/blog` index

Para evitar ruido: en la página `/blog` index, agregar filtro opcional "Ver artículos / Ver changelog". Default muestra ambos, pero user puede filtrar.

**Esfuerzo**: 1h (filter state + tag matching). Opcional pre-launch.

---

## Workflow de redacción

### Trigger

Cada merge a main que aterriza feature user-facing genera un ítem **candidato** para el changelog. Fuente: PR title + body.

**Mecanismo**: labels GitHub (`user-facing`, `bug-fix`, `improvement`) o palabras clave en PR title (`feat:`, `fix:`, `improve:`). Semver light sin versioning numérico.

### Compilación mensual

**Fin de mes (o fin de sprint grande)**:
1. PO + auditor revisan merges del mes.
2. Seleccionan 3-10 user-facing (filtrar changes internos tipo CI, perf non-visible, etc.).
3. Redactan cada ítem en lenguaje usuario.
4. Publican entrada nueva.

**Esfuerzo mensual**: 30-60 min. Aceptable.

### Primera entrada (hitos pre-campañas)

Al publicar el primer changelog (post campañas), hacer una sola entrada "resumen" que cubra todo lo aterrizado desde el inicio:

- Lanzamiento oficial del sitio.
- 10 categorías de servicio disponibles.
- Agenda con reserva en línea F1 (slots) + F2 (estadía).
- Chat tutor↔proveedor.
- Perfiles verificados con badge "Identidad verificada".
- Blog con guías.
- (Lista de 5-8 ítems, no exhaustiva).

Ayuda a establecer el nivel de madurez del producto a users nuevos.

---

## Opciones de diseño visual

### Minimalista (recomendado)

Entrada blog estándar con header "Changelog mes X" + categorías Nuevo/Mejor/Arreglamos como H2.

### Timeline

Cada versión en un elemento de timeline vertical con dot+línea. Más visual pero más código CSS.

### Cards por release

Cards horizontales con versión + fecha + resumen. Al hover expande al detalle.

**Recomendación**: minimalista. Prioriza contenido sobre forma.

---

## Integración con SEO programático

Las landings `/[categoria]/[comuna]` del plan [seo-programatico.md](seo-programatico.md) pueden linkear al changelog como señal de "producto activo" en el footer de cada landing. Un link interno "Últimos cambios en Pawnecta → /blog/changelog" en 50+ landings pasa link juice al changelog + reiterated freshness.

Esfuerzo: 10 min cuando se aterrice el link global en el template.

---

## Métricas de éxito del changelog

Post-lanzamiento, medir:
- **Pageviews mensuales** de `/blog/changelog*`: target 50-150 en primer mes, escalando con tráfico.
- **Time on page**: >60s significa lectura real.
- **Bounce rate**: <50% esperable (users que llegan via Search están interesados).
- **Backlinks**: media o bajo esperado; +1 backlink desde press/social es señal buena.

Tracking GA4 estándar (page_view) + custom event `changelog_version_click` con `{version_slug}`.

---

## Decisiones pendientes del PO

### D1. Formato minimalista vs timeline

**Pregunta**: ¿minimalista (blog entry) o timeline visual?

**Recomendación**: minimalista. Menos código + más énfasis en contenido.

**Impacto si no se decide**: default = minimalista.

### D2. Opción A (blog entry) vs Opción B (sección aparte)

**Pregunta**: ¿tag `changelog` en blog existente (A) o ruta dedicada `/changelog` (B)?

**Recomendación**: **A** inicialmente. Zero refactor. Migrar a B si volumen crece.

**Impacto si no se decide**: default = A.

### D3. Primera entrada "resumen hitos"

**Pregunta**: ¿autorizás una entrada inicial que compile todo lo aterrizado desde el inicio del proyecto?

**Recomendación**: sí. Es el momento de establecer "Pawnecta ya tiene estas features" explícito a users nuevos llegando por campañas.

**Impacto si no se decide**: default = arrancar con changelog mes-a-mes sin resumen histórico.

### D4. Mantenimiento mensual — PO o auditor

**Pregunta**: ¿el PO redacta la compilación mensual o el auditor arma el draft + PO ajusta?

**Recomendación**: auditor arma draft (30 min) basado en merges del mes + PO revisa y publica (15 min). Ownership PO.

**Impacto si no se decide**: default = auditor arma, PO publica.

### D5. Sección aparte "Qué viene" / Roadmap público

**Pregunta**: ¿agregamos sección en changelog o página dedicada con "próximos cambios" tipo roadmap?

**Recomendación**: **no por ahora**. Roadmap público requiere compromiso de delivery; lo peor es anunciar y no entregar. Dejar como posible fase 2 post-6-meses operación.

**Impacto si no se decide**: default = solo changelog de lo aterrizado.

### D6. Primera publicación fecha

**Pregunta**: ¿publicamos primer changelog con activación de campañas, 1 mes después, o ya mismo?

**Recomendación**: **con activación campañas**. Alineado con narrativa "ahora llega el gran tráfico, acá está lo que tenés disponible".

**Impacto si no se decide**: default = con activación campañas.

---

## Resumen de esfuerzo

- **Setup inicial** (crear entrada blog + diseño filtro changelog): 2-3h.
- **Primera entrada "resumen hitos"**: 1-2h redacción.
- **Mantenimiento mensual**: 30-60 min.

Total año 1: ~15h de trabajo total distribuido mensual.

---

## Firma

Plan listo. Arranque recomendado con activación de campañas. Hasta entonces, mantener internamente los PRs mergeados como fuente para la primera compilación.
