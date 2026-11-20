# Auditoría schema.org / JSON-LD — 2026-11-19

**Audiencia**: PO (preparación pre-launch 2026-11-25 + input SEO externo).
**Alcance**: inventario de markup de datos estructurados (JSON-LD) presente hoy en producción (`pawnecta.com @ main 167f97b`) + gaps + propuesta de implementación con estimaciones.
**Método**: (a) grep del codebase por `application/ld+json` + `@context` + `@type`; (b) verificación empírica con `curl` de la home de prod. Cero cambios aplicados — es análisis.

---

## Resumen ejecutivo

Pawnecta **ya tiene JSON-LD** en 6 superficies clave del sitio. La cobertura es mejor de lo que el input SEO externo sugería — **no partimos de cero**. Los tipos canónicos para marketplace local ya están: `LocalBusiness` en ficha de proveedor, `Service` en ficha de servicio, `AggregateRating` condicional por contador de evaluaciones, `BreadcrumbList` en 5 superficies, `ItemList` en landing categoría+comuna.

Falta un gap importante y dos oportunidades menores:
- ❌ **`Organization`** en home (gap más visible — es el que Google usa para el knowledge panel y para asociar logo/perfil social a la marca).
- 🟡 `BlogPosting` / `Article` en entradas del blog (nice-to-have pre-launch, boost SEO para las 10 entradas que ya existen).
- 🟡 `FAQPage` en entradas estilo Q&A (blog #8 y #10 tienen bloques de preguntas que calificarían como FAQ snippets — rich result muy visible).

**Prioridad**: Organization pre-launch (~30 min), BlogPosting post-launch (~1h), FAQPage post-launch (~2h).

---

## Inventario actual

Verificado contra `main @ 167f97b` por grep de archivos + curl de prod home.

| # | Superficie | Ruta | Tipos @schema.org | Estado | Fuente |
|---|---|---|---|---|---|
| 1 | Home | `/` | `WebSite` + `SearchAction` | ✅ **en prod** (verificado por curl) | [pages/index.tsx:511-526](pages/index.tsx#L511-L526) |
| 2 | Catálogo | `/explorar` | `BreadcrumbList` | ✅ | [pages/explorar.tsx:563-571](pages/explorar.tsx#L563-L571) |
| 3 | Ficha proveedor | `/proveedor/[id]` | `LocalBusiness` + `PostalAddress` + `AggregateRating` (condicional) + `makesOffer` → `Offer` → `Service` (por cada servicio del proveedor) | ✅ | [pages/proveedor/[id].tsx:153-188](pages/proveedor/[id].tsx#L153-L188) |
| 4 | Landing categoría | `/[categoria]` (ej. `/peluqueria`, `/cuidado`) | `BreadcrumbList` | ✅ | [pages/[categoria]/index.tsx:60-72](pages/[categoria]/index.tsx#L60-L72) |
| 5 | Landing categoría+comuna | `/[categoria]/[comuna]` | `ItemList` (servicios) + `BreadcrumbList` | ✅ | [pages/[categoria]/[comuna].tsx:122-168](pages/[categoria]/[comuna].tsx#L122-L168) |
| 6 | Ficha servicio | `/servicio/[id]` | `Service` + `Person` (provider) + `AggregateRating` (condicional) + `Offer` + `BreadcrumbList` | ✅ | [components/Servicio/ServiceDetailView.tsx:750-793](components/Servicio/ServiceDetailView.tsx#L750-L793) |

**Verificación empírica home** (curl, 2026-11-19 20:40 UTC):

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Pawnecta",
  "url": "https://pawnecta.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://pawnecta.com/explorar?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

Esto habilita el **Sitelinks Searchbox** de Google (caja de búsqueda bajo el primer resultado). Correcto.

---

## Gaps y oportunidades

### 🔴 Gap 1: `Organization` en home — PRIORIDAD ALTA, pre-launch

**Qué falta**: el JSON-LD del `/` inyecta solo `WebSite`. No hay `Organization` con logo, sameAs (redes sociales), ni contactPoint. Google combina `Organization` con `WebSite` para armar el knowledge panel y la vista enriquecida en SERP.

**Impacto SEO**: moderado-alto. Con `Organization + logo` Google muestra el logo oficial en las búsquedas de marca ("Pawnecta") y lo asocia con la entidad verificada. Sin esto, cualquier sitio que mencione Pawnecta puede competir por la representación visual.

**Propuesta**: agregar un segundo `<script type="application/ld+json">` en el Head de [pages/index.tsx](pages/index.tsx) con:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Pawnecta",
  "url": "https://www.pawnecta.com",
  "logo": "https://www.pawnecta.com/pawnecta_logo_final-trans.png",
  "description": "Marketplace de servicios para mascotas en Chile.",
  "sameAs": [
    "<URL Instagram si existe>",
    "<URL Facebook si existe>",
    "<URL LinkedIn si existe>"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "hola@pawnecta.com",
    "contactType": "customer support",
    "areaServed": "CL",
    "availableLanguage": ["es"]
  },
  "areaServed": {
    "@type": "Country",
    "name": "Chile"
  }
}
```

**Nota sobre `sameAs`**: solo poblar con URLs reales activas. Si Pawnecta todavía no tiene cuentas de redes sociales operativas, omitir el array (Google penaliza linked data con URLs rotas).

**Esfuerzo**: **~30 min** (1 Edit en `pages/index.tsx` Head block + verificación con [Rich Results Test](https://search.google.com/test/rich-results) apuntando a preview Vercel). Zero riesgo funcional (es markup pasivo, no afecta render).

**Verificación pre-merge**: paste del preview URL en `search.google.com/test/rich-results` → debe mostrar `Organization` detectado + `WebSite` detectado + 0 errores.

---

### 🟡 Oportunidad 2: `BlogPosting` en entradas de blog — nice-to-have post-launch

**Qué falta**: las 10 entradas del blog (`/blog/[slug]`) renderizan sin JSON-LD. Google puede interpretar que son páginas pero no les da el tratamiento rich snippet (fecha, autor, imagen destacada en Discover feed, tarjeta enriquecida en mobile SERP).

**Impacto SEO**: medio. Con `BlogPosting` las entradas aparecen candidatas a Google Discover (tráfico recurrente a móvil), y la SERP puede mostrar fecha + imagen. Especialmente útil para las entradas largas con palabras clave fuertes ("paseador perros Santiago", "guardería mascota").

**Propuesta**: agregar en Head de [pages/blog/[slug].tsx](pages/blog/[slug].tsx) un script con:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": post.title,
  "description": post.excerpt,
  "image": post.coverImage || undefined,  // placeholder gris no sirve como og:image
  "datePublished": post.date,
  "dateModified": post.date,
  "author": {
    "@type": "Organization",
    "name": post.author  // "Equipo Pawnecta"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Pawnecta",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.pawnecta.com/pawnecta_logo_final-trans.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `https://www.pawnecta.com/blog/${post.slug}`
  }
}
```

**Caveat importante**: Google requiere `image` para que el rich result se dispare en mobile. Nuestras 10 entradas usan **placeholder gris con ícono Lucide** (regla CLAUDE.md § Convenciones: cero imágenes IA ni stock). Opciones:
- (a) Emitir el JSON-LD sin `image` cuando `post.coverImage === ""` → BlogPosting válido pero sin rich snippet mobile.
- (b) Generar un og-image dinámico server-side con el ícono Lucide + título sobre fondo gris (via librería `@vercel/og` o similar). ~2h adicionales.

Opción (a) es la minimalista; opción (b) cosecha el rich result mobile pero requiere trabajo. **Recomendación**: (a) ahora + (b) como ítem BACKLOG post-launch si el blog arranca a traer tráfico.

**Esfuerzo**: **~1h** (opción a; incluye verificación en Rich Results Test de 2-3 slugs).

---

### 🟡 Oportunidad 3: `FAQPage` en entradas Q&A — nice-to-have post-launch

**Qué falta**: entradas blog #8 ("paseador perros Santiago") y #10 ("guardería cuidado mascota") tienen secciones estructuradas tipo Q&A ("Preguntas clave antes de contratar" + lista numerada 1-10). Califican para `FAQPage` markup, que Google renderiza como **expandable FAQ accordion directamente en la SERP** — uno de los rich results con mayor visibilidad.

**Impacto SEO**: alto para esas 2 entradas específicas. El FAQ rich result ocupa 3-5x más real estate en mobile SERP que un snippet común.

**Propuesta**: agregar el schema opcionalmente por entrada. Requiere que cada entrada declare un campo `faqItems: Array<{question, answer}>` en `lib/blogData.ts` (nuevo campo opcional). Si está poblado, `/blog/[slug]` emite un `FAQPage` adicional:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Cuánta experiencia tienes con perros?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Pide ejemplos concretos, no títulos. La respuesta del paseador te dirá si pensó el escenario."
      }
    },
    // ... resto de las preguntas
  ]
}
```

**Caveat**: Google tiene políticas estrictas — el FAQPage solo se puede usar si las preguntas y respuestas SÍ aparecen visualmente en la página al usuario (lo nuestro cumple: la lista está visible). Cero tolerancia a FAQ hidden/duplicado/promocional.

**Esfuerzo**: **~2h** (campo `faqItems` en `lib/blogData.ts` + conversion manual de las 2 entradas al nuevo shape + emisión del JSON-LD en `/blog/[slug]` + verificación Rich Results Test). El resto de entradas no se tocan.

---

### 🟢 Otros tipos relevantes — NO prioritarios

| Tipo | Dónde aplicaría | Por qué no prioritario ahora |
|---|---|---|
| `WebPage` individual | cada ruta pública | Redundante con `WebSite` global; Google no mejora SERP con esto cuando ya hay `WebSite` en la home. |
| `Product` | ficha servicio | Google diferencia `Service` de `Product` según intención comercial. Lo que vendemos es servicio humano (paseo, cuidado), no bien físico. `Service` es la elección correcta (ya aplicada). |
| `Review` individual | cada evaluación | `AggregateRating` ya cubre la vista agregada. Marcar cada review individual con `Review` genera overhead sin rich result diferenciado. |
| `Event` | reservas con fecha confirmada | Fuera de alcance: las reservas no son eventos públicos del sitio, son transacciones privadas. |
| `BreadcrumbList` en home | — | Google ignora breadcrumb cuando es `[Inicio]`. Correcto no emitirlo. |

---

## Checklist pre-launch (acción PO)

**Antes del freeze 2026-11-24 16:00 CLT** (prioridad alta):

- [ ] **Confirmar al auditor**: redes sociales activas de Pawnecta (URLs reales de Instagram/Facebook/LinkedIn) para poblar `sameAs`. Si no hay, se omiten.
- [ ] GO al sprint **schema-org-org-home** (~30 min): el auditor crea rama `schema-org`, agrega Organization en Head de `pages/index.tsx`, abre PR chico, CI verde, merge, deploy. Verifica con Rich Results Test post-merge.

**Post-launch (backlog, no bloquea)**:

- [ ] **BLOG-SCHEMA-POSTING** (~1h, opción a sin og-image dinámico). Prioridad media. Beneficia los 10 posts existentes + todos los futuros.
- [ ] **BLOG-SCHEMA-FAQ** (~2h). Prioridad media-baja. Solo 2 entradas (paseador + guardería). Alto impacto visual si Google acepta.
- [ ] **OG-IMAGE-DINAMICO** (~2h). Depende de BLOG-SCHEMA-POSTING. Habilita rich snippet mobile para posts sin coverImage real.

---

## Verificación post-merge (plantilla)

Para cada sprint anterior, correr:

1. `https://search.google.com/test/rich-results?url=<URL>` → debe detectar el tipo + 0 errores + preview del snippet.
2. Google Search Console → Mejoras → monitorear entre 7-14 días.

URLs canónicas a testear:
- `https://www.pawnecta.com/` → Organization + WebSite.
- `https://www.pawnecta.com/proveedor/<uuid>` → LocalBusiness + AggregateRating + makesOffer.
- `https://www.pawnecta.com/servicio/<uuid>` → Service + Breadcrumb.
- `https://www.pawnecta.com/peluqueria/providencia` → BreadcrumbList + ItemList.
- `https://www.pawnecta.com/blog/como-elegir-paseador-perros-santiago` (post BLOG-SCHEMA-POSTING) → BlogPosting + FAQPage.

---

## Decisiones para 2026-11-25

**Nada bloquea el lanzamiento**. Pawnecta ya tiene cobertura sólida de schema.org en 6 superficies.

**Único sprint pre-freeze sugerido**: schema-org-org-home (~30 min). Es de muy bajo riesgo (markup pasivo), muy alto ratio costo/beneficio (brand entity reconocida por Google), y el PO ya tiene el input SEO externo validando la dirección. Si el PO da GO + confirma URLs de redes sociales (o la ausencia), se puede aterrizar hoy mismo junto con PR #122.

Los sprints post-launch quedan en BACKLOG bajo el ítem **SCHEMA-ORG-EXTENDIDO** con subtareas BLOG-SCHEMA-POSTING + BLOG-SCHEMA-FAQ + OG-IMAGE-DINAMICO.
