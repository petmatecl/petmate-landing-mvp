# Feasibility — CATEGORIA-DESPEDIDA-Y-DUELO

**Fecha**: 2026-11-26.
**Scope del documento**: investigación read-only para determinar si agregar una nueva categoría `despedida-y-duelo` (Despedida y Duelo de Mascotas) al catálogo de Pawnecta es ejecutable como sprint pequeño o requiere refactor mayor.
**Trigger**: deuda BACKLOG `CATEGORIA-DESPEDIDA-Y-DUELO` agregada en PR #200 (2026-11-25), prioridad MEDIA post-launch, incluida en dispatch autónomo del PO el 2026-11-26.

---

## 1. Resultado del análisis

**Catálogo semi-data-driven**: la fuente de verdad es la tabla Supabase `categorias_servicio` (verificado vía MCP prod-ro 2026-11-26 — 9 filas activas en prod), **pero varios consumers mantienen listas hardcoded** que duplican o filtran la fuente para distintos propósitos (fallback de red, mapeo de iconos Lucide, SEO landing pages con slug display, campos dinámicos por categoría). Agregar una nueva categoría **NO es solo un `INSERT` SQL** — requiere además tocar ~6-7 archivos de código hardcoded + diseño del bloque de campos dinámicos + decisión UX del nombre + elección de icono Lucide.

**Scope estimado**: **2-3 días** (migration + 6 edits de código hardcoded + 1 bloque de campos dinámicos + icon decision + copy UX + regression test manual). Más alto si se requiere auditor UX del nombre (tema sensible — deuda emocional del tutor).

---

## 2. Fuentes del catálogo (data-driven)

- **Tabla**: [`categorias_servicio`](https://supabase.com/dashboard/project/ouezpeeiwjwawauidrqq/editor/categorias_servicio) con columnas `id uuid NOT NULL`, `nombre text NOT NULL`, `slug text NOT NULL`, `icono text NULL`, `descripcion text NULL`, `activa boolean NULL`, `orden integer NULL`, `created_at timestamptz NULL`.
- **9 filas activas en prod** (verificado MCP 2026-11-26):

  | slug | nombre | activa |
  |---|---|---|
  | adiestramiento | Adiestramiento | true |
  | cuidado | Cuidado y Hospedaje | true |
  | fotografia | Fotografía de Mascotas | true |
  | guarderia | Guardería Diurna | true |
  | paseos | Paseo de Perros | true |
  | peluqueria | Peluquería Canina/Felina | true |
  | retratos | Retratos de Mascotas | true |
  | traslado | Traslado | true |
  | veterinario | Veterinario a Domicilio | true |

- **Consumer directo del dataset**: [pages/explorar.tsx:228-240](pages/explorar.tsx#L228-L240) hace `supabase.from('categorias_servicio').select('id, slug, nombre, icono').order('nombre', { ascending: true })` y setea `categories` state. Si el fetch falla, aplica `STATIC_CATEGORIES` fallback hardcoded (ver §3.1).
- **RPC consumer**: `buscar_servicios` (RPC principal /explorar) filtra por `p_categoria_slug text` — basta pasar el slug nuevo para que funcione el filtro de catálogo + URL.

---

## 3. Archivos hardcoded que requieren edit al agregar `despedida-y-duelo`

### 3.1 [pages/explorar.tsx:39-50](pages/explorar.tsx#L39-L50) — `STATIC_CATEGORIES` fallback

Array de 9 objetos `{ id, slug, nombre, icono: '' }`. Usado si el `fetchCategories()` de DB falla. **Edit**: agregar fila `{ id: 'despedida-y-duelo', slug: 'despedida-y-duelo', nombre: 'Despedida y Duelo', icono: '' }`.

### 3.2 [components/Home/SearchBar.tsx:8-18](components/Home/SearchBar.tsx#L8-L18) — `CATEGORIAS` dropdown del hero

Lista hardcoded de 9 entries `{ slug, label }` para el dropdown de la SearchBar del home. NO lee de BD — agregar fila manual.

### 3.3 [components/Explore/SidebarFiltros.tsx:62-77](components/Explore/SidebarFiltros.tsx#L62-L77) — `SLUG_ICONS` map Lucide

Mapa `Record<string, LucideIcon>` que resuelve el icono por slug. Fallback: `Grid2x2` (línea 294). **Edit**: agregar `'despedida-y-duelo': <IconoLucide>`. Candidatos de Lucide para el concepto despedida/duelo (tema sensible):

- `Heart` — universal, suave. Ya usado en otros contextos (favoritos).
- `HandHeart` — más específico "cuidado emocional" / "apoyo".
- `HeartHandshake` — "acompañamiento mutuo".
- `Flower` / `Flower2` — símbolo tradicional del duelo en Latam (cementerios, memoriales).
- `Candle` (no existe en Lucide actualmente) — descartar.
- `Sunset` — metafórico (atardecer, final).
- `Feather` — simbolismo "ángel" / ligereza.
- **Recomendación por descarte**: `HandHeart` es la opción más neutra y no-religiosa — cercana al concepto "apoyo en el duelo" sin exclusividades culturales. Validación UX final del PO antes de aterrizar.

### 3.4 [pages/[categoria]/index.tsx:157-168](pages/[categoria]/index.tsx#L157-L168) — `getStaticPaths` SEO

Array `['cuidado', 'guarderia-diurna', 'paseo', 'peluqueria', 'adiestramiento', 'veterinaria', 'traslado', 'retratos']` con slugs **display** (diferentes a los slugs DB en algunos casos — ver nota abajo). **Edit**: agregar `'despedida-y-duelo'` (o el display slug elegido).

**Nota sobre el mismatch slugs display vs slugs DB**: 4 slugs en el getStaticPaths usan plural o nombre completo (`guarderia-diurna`, `paseo`, `veterinaria`) que **NO matchean** los slugs DB (`guarderia`, `paseos`, `veterinario`) — `getStaticProps` filtra por `.eq('slug', categorySlug)` directo y debería retornar `notFound: true` para esos 3 paths. Diagnóstico: o hay un slugMap implícito que no encontré en el grep de este sprint, o los 3 landings SEO de `guarderia-diurna` / `paseo` / `veterinaria` están rotos en prod (hipótesis a validar fuera de scope de este feasibility). Si el nuevo slug es consistente (ej. `despedida-y-duelo` en ambos: DB + getStaticPaths), evita heredar ese mismatch.

### 3.5 [pages/[categoria]/[comuna].tsx:245-260](pages/[categoria]/[comuna].tsx#L245-L260) — `getStaticPaths` comuna SEO

Array similar con 7 categorías × N comunas SEO. **Edit**: agregar el nuevo slug al array. Blast radius: N nuevas páginas SSG (1 por comuna × 1 categoría nueva).

### 3.6 [lib/camposPorCategoria.ts](lib/camposPorCategoria.ts) — Campos dinámicos del wizard + ficha

10 bloques hardcoded `{ cuidado: [...], paseos: [...], veterinario: [...], traslado: [...], peluqueria: [...], adiestramiento: [...], etologia: [...], guarderia: [...], fotografia: [...], retratos: [...] }` con los campos específicos por categoría usados en:
- Wizard de registro proveedor (`pages/register.tsx` Step 3).
- Modal edición de servicio (`components/Proveedor/ServiceFormModal.tsx`).
- Ficha pública del servicio (`components/Servicio/ServiceDetailView.tsx`).
- Ficha pública del proveedor (`pages/proveedor/[id].tsx`).

**Decisión UX requerida**: ¿qué campos específicos tiene "Despedida y Duelo"? Opciones plausibles:
- `modalidad_servicio` (select: `eutanasia_domicilio`, `acompanamiento_veterinario`, `retiro_cuerpo`, `cremacion_individual`, `cremacion_colectiva`, `entierro_asistido`, `memorial_personalizado`).
- `tipo_mascota_atendida` (checkboxes: `perro`, `gato`, `otros`).
- `atiende_urgencias` (boolean).
- `anios_experiencia` (number).
- `radio_cobertura_km` (number).
- `emite_certificado_cremacion` (boolean).
- `ofrece_acompanamiento_emocional` (boolean).

El bloque es sensible UX — redactar con el PO antes de aterrizar código. Scope medio.

### 3.7 (OPCIONAL) [pages/explorar.tsx:60-85](pages/explorar.tsx#L60-L85) — `SINTOMA_REDIRECT_MAP` cross-links

El mapa cross-link `adiestramiento ↔ etologia` sugiere que la nueva categoría podría necesitar cross-links a `veterinario` (para eutanasia que exige vet) o `traslado` (para retiro del cuerpo). Opcional, scope chico. Decisión UX del PO.

### 3.8 (OPCIONAL) [next.config.js:218-228](next.config.js#L218-L228) — Redirects legacy

Si se eligen 2 slugs (DB `despedida-y-duelo` + alias legacy `duelo`, `memorial`, `eutanasia`), agregar 2 redirects 301 similares al patrón `hospedaje → cuidado`. Opcional, cero cost operativo.

### 3.9 (OPCIONAL) `components/Footer.tsx` + sitemap — Links y SEO

Footer tiene links a categorías prominentes. Decisión UX si "Despedida y Duelo" merece slot en el footer o solo aparece en el dropdown /explorar. El sitemap.xml se regenera automático por SSG (getStaticPaths pickea el nuevo slug), cero edit manual.

---

## 4. Migration SQL requerida

```sql
-- migrations/YYYYMMDD_add_categoria_despedida_y_duelo.sql
INSERT INTO categorias_servicio (id, slug, nombre, descripcion, activa, orden)
VALUES (
  gen_random_uuid(),
  'despedida-y-duelo',
  'Despedida y Duelo',
  'Acompañamiento en el final de vida de tu mascota: eutanasia a domicilio, cremación, memoriales y apoyo emocional.',
  true,
  100  -- orden alto para que aparezca al final del listado hasta validar UX
);
```

Aplicar a staging + prod. Flow manual estándar (migrations/*.sql). Verificación post-apply: `SELECT slug, nombre, activa FROM categorias_servicio WHERE slug='despedida-y-duelo';` → 1 fila.

---

## 5. Checklist operacional del sprint (cuando se ejecute)

1. **UX kickoff con PO** (30 min): confirmar nombre visible ("Despedida y Duelo" vs alternativas), icon Lucide final, 7 campos dinámicos del bloque `camposPorCategoria`, prioridad en footer/sitemap.
2. **Migration SQL** aplicada a staging + prod (manual, paridad).
3. **Edits hardcoded** (6 archivos principales + 1-3 opcionales):
   - `pages/explorar.tsx` STATIC_CATEGORIES
   - `components/Home/SearchBar.tsx` CATEGORIAS
   - `components/Explore/SidebarFiltros.tsx` SLUG_ICONS
   - `pages/[categoria]/index.tsx` getStaticPaths
   - `pages/[categoria]/[comuna].tsx` getStaticPaths
   - `lib/camposPorCategoria.ts` bloque nuevo
4. **Tests**:
   - Regression manual /explorar en staging (chip filter funciona, cards renderizan).
   - Regression manual /explorar?categoria=despedida-y-duelo (filtro URL).
   - Regression manual /despedida-y-duelo SEO landing (si el slug matchea DB).
   - Spec Playwright nuevo en `e2e/specs/categoria-despedida-y-duelo/` (opcional, scope chico).
5. **Deploy**: 1 PR code (edits + migration file) + GO merge PO → prod.
6. **Post-merge**: smoke manual en prod (/explorar + /explorar?categoria=despedida-y-duelo + SEO landing si aplica).

**Tiempo total estimado** (sin dedicarse full-time): 2-3 días.

---

## 6. Riesgos y consideraciones

- **Sensibilidad del tema**: el copy de la categoría (nombre, descripción, placeholder del form, mensajes vacíos) debe ser revisado por PO antes de merge. "Despedida" es más suave que "Eutanasia"; "Duelo" apela al tutor, no al servicio. El tono debe ser profesional + empático, cero marketing agresivo.
- **Campos dinámicos sensibles**: `modalidad_servicio` incluye opciones médicas (eutanasia, cremación) que deben mostrarse como opciones informativas, no como venta. Diseño UX de la ficha del servicio debe considerar que el tutor consulta esta categoría probablemente en un momento emocional difícil.
- **Compliance veterinario**: si la categoría incluye eutanasia a domicilio, el proveedor típicamente debe ser médico veterinario titulado. Considerar un badge adicional "Veterinario titulado" o requerir `especialidades` del bloque `veterinario` pre-existente.
- **Cross-link con `veterinario`**: un proveedor que ofrece eutanasia a domicilio típicamente también ofrece veterinario a domicilio. Decidir si permitir que un mismo servicio esté en ambas categorías o forzar 2 servicios separados.
- **SEO sensible**: slug `despedida-y-duelo` tiene ~1-2K búsquedas mensuales en Chile (según Google Trends heuristic). Landing SEO bien curada podría capturar tráfico orgánico de nicho. Vale la pena priorizar el descripcion field y la metadata og:title.

---

## 7. Decisión propuesta

**Sprint factible como dedicated chico-medio (2-3 días)**. Bloqueo principal: decisiones UX + copy sensible del PO. Código es mecánico (edits conocidos + 1 migration) una vez tomadas esas decisiones.

**Propuesta de secuencia**:
1. PO revisa + aprueba este feasibility doc.
2. PO decide: nombre visible final, icon Lucide, 7 campos del bloque camposPorCategoria, cross-links.
3. Sprint `categoria-dd` ejecutado (migration + 6-7 edits + 1 spec e2e básico). 1 PR.
4. Deploy + smoke manual.

**Sin GO del PO no se ejecuta** — queda en BACKLOG como deuda MEDIA post-launch con este feasibility doc como spec técnico.

---

## 8. Trazabilidad

- Deuda origen: `CATEGORIA-DESPEDIDA-Y-DUELO` en [BACKLOG.md](../../BACKLOG.md), prioridad MEDIA post-launch, aterrizada en PR #200.
- Dispatch autónomo: 2026-11-26 AM, ITEM B del dispatch del PO.
- Fuente del catálogo: MCP Supabase prod-ro, SELECT sobre `categorias_servicio` + `information_schema.columns`.
- Verificado 9 categorías activas en prod + slug del DB layer. 10ª categoría `etologia` no aparece en la tabla (está en el código hardcoded pero no en DB — hipótesis fuera de scope: categoría virtual o futura, reutiliza bloque campos propios).

