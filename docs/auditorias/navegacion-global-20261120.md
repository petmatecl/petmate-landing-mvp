# Auditoría de navegación global — Header + Footer — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: analizar qué muestra la navegación global, qué podría mostrar, qué estorba y qué falta pre-campañas.
**Método**: análisis estático del código de `components/Header.tsx` (606 líneas) + `components/Footer.tsx` (209 líneas) + patrones de link + estructura visual inferida.

---

## Estado actual

### Header

**Archivo**: [components/Header.tsx](../../components/Header.tsx).

**Componentes visibles**:
- **Franja superior lanzamiento** (`showLaunchBanner`): "Estamos construyendo Pawnecta. Regístrate y cuéntanos qué te gustaría encontrar." — solo guests. **Dismissible**.
- **Logo + link home**: top-left.
- **Nav desktop**: `/blog` + `/explorar` (solo 2 items visibles) + Login/Register o avatar menu (según auth state).
- **Avatar menu** (si auth): dropdown con items según rol (tutor/proveedor/admin).
- **Burger menu mobile**: con mismo subset de items + roles.

### Footer

**Archivo**: [components/Footer.tsx](../../components/Footer.tsx).

**Componentes visibles**:
- Logo Pawnecta.
- **Columna 1 — "Categorías"**: 10 categorías con links a `/explorar?categoria={slug}`.
- **Columna 2 — "Pawnecta"**: Quiénes somos, FAQ, Blog, Publicar mi servicio, contacto email.
- **Columna 3 — sub-bloques "Hospedaje" + "Visita a domicilio"**: cada uno con 5 comunas destacadas (Providencia, Las Condes, Ñuñoa, Vitacura, Santiago).
- Instagram link + copyright.

---

## Hallazgos críticos

### H-1 [BLOQUEA pre-campañas] — Franja superior "Estamos construyendo" contradice realidad operativa

Copy en `Header.tsx:162`:

> "Estamos construyendo Pawnecta. Regístrate y cuéntanos qué te gustaría encontrar."

**Problema**: el sitio ya opera, hay 26 proveedores aprobados + 11 reservas. La franja sugiere pre-launch que ya no aplica (reset PO 2026-11-20 PM). Primer visitante al hacer scroll piensa "aún no está listo".

**Fix propuesto** (ver `docs/auditorias/copy-20261120.md § C-1`):
- "Pawnecta ya opera en Santiago. ¿Falta algún servicio en tu zona? [Cuéntanos]"
- o remover franja completa post-decisión del PO.

**Esfuerzo**: 10 min.

### H-2 [BLOQUEA pre-campañas] — Footer linkea slugs obsoletos (`hospedaje`, `domicilio`)

**Problema detectado en el código**:

- `Footer.tsx:59`: `href="/explorar?categoria=hospedaje"` — pero según CLAUDE.md § "Tablas principales", el slug `hospedaje` fue **fusionado en `cuidado`** (post-reorganización categorías). Link inválido.
- `Footer.tsx:110`: `href="/explorar?categoria=domicilio"` — categoría obsoleta. El reemplazo es `cuidado` (con subset por comuna).
- Los sub-bloques L98-125 tienen 10 links `hospedaje&comuna=X` + 10 links `domicilio&comuna=X` → **~20 links rotos**.

**Impacto**:
- User hace click → `/explorar` carga con filtro `categoria=hospedaje` → el RPC `buscar_servicios` no reconoce el slug → grid vacío o fallback mal.
- SEO: Google puede intentar seguir estos links y encontrar páginas vacías → penaliza coverage.

**Fix propuesto**:
- Cambiar `hospedaje` → `cuidado` en todos los links del footer.
- Reemplazar sub-bloque "Visita a domicilio" por otra categoría activa (`paseos` o `peluqueria`).

**Esfuerzo**: 15 min grep + replace + test visual.

**Verificación requerida pre-fix**: confirmar que `cuidado` es efectivamente el reemplazo de ambos. Query read-only:

```sql
SELECT slug, nombre FROM public.categorias_servicio WHERE slug IN ('hospedaje', 'domicilio', 'cuidado');
```

### H-3 [BLOQUEA pre-campañas] — Nav desktop solo 2 items

**Observación**: nav desktop tiene solo `Blog` + `Explorar` + login/register o avatar. No hay acceso directo a:
- Categorías (user tiene que ir a `/explorar` + filtrar).
- Páginas estáticas (FAQ, Quiénes somos → solo via footer).

**Problema**: user que llega vía campaña busca "paseadores" → aterriza en home → el único path es scrollear o abrir SearchBar hero. Sin menú claro de categorías pierde rápido.

**Fix propuesto**:
- Agregar dropdown "Servicios" en nav desktop con las 10 categorías (gran dropdown).
- Mantener `/blog` y `/explorar` al lado.

**Esfuerzo**: 2-3h (componente dropdown + diseño + mobile adaptation).

### H-4 [MEDIO] — Footer "columnas 3 con comunas específicas" tiene potencial pero pobre UX

**Observación**: footer tiene sub-bloques con comunas pero solo para 2 categorías (`hospedaje`, `domicilio` obsoletas).

**Oportunidad**: convertir en matriz 10 categorías × 5 comunas top = 50 links SEO-ricos + mejor UX (user navega directo).

**Fix propuesto**: componente `<FooterCategoriaComunaGrid>` con mapping configurable.

**Esfuerzo**: 3-4h (componente + diseño responsive).

### H-5 [MEDIO] — Falta "Mi cuenta" en burger menu guests

**Observación**: mobile burger menu solo muestra Blog + Explorar + Login/Register para guests. Sin indicación de que al login tendrán perfil.

**Fix propuesto**: agregar sección "¿Ya tienes cuenta? [Iniciar sesión]" explícita.

**Esfuerzo**: 15 min.

### H-6 [MEDIO] — Footer sin link a Términos + Privacidad + Cookies

**Observación**: Footer tiene Quiénes somos + FAQ pero NO Términos ni Política Privacidad ni Cookies. Requerimiento legal Chile (Ley 19.628 + Ley 21.719 vigente dic-2026).

**Fix propuesto**: agregar columna 4 "Legal" con `/terminos`, `/privacidad`, `/cookies`. Verificar que las páginas existen o crearlas.

**Esfuerzo**: 10 min agregar links (si páginas existen) + 2-3h si hay que crear páginas.

**Verificación requerida**: `ls pages/terminos*.tsx pages/privacidad*.tsx` en el repo.

### H-7 [MEDIO] — Sin CTA primario en Header para tutores

**Observación**: Header muestra "Iniciar sesión" + "Soy tutor" + "Soy proveedor" como texto plano. Sin botón primary visible.

**Fix propuesto**: elevar "Soy tutor" (o "Registrarme") como botón accent primary. Guía visual al CTA principal para visitantes nuevos.

**Esfuerzo**: 10 min (styling).

### H-8 [BAJO] — Instagram único social link

**Observación**: footer linkea Instagram + copyright. No hay Facebook, X, TikTok, LinkedIn.

**Fix propuesto**: agregar cuando se creen (post-campañas si aplica).

**Esfuerzo**: 10 min cada uno.

### H-9 [BAJO] — Sin breadcrumb visible en nav

**Observación**: páginas internas (`/explorar/filtro`, `/[categoria]/[comuna]`) no muestran breadcrumb en header. Solo SCHEMA.org BreadcrumbList presente (SEO) pero no visual.

**Fix propuesto**: componente `<Breadcrumb>` ya existe en el repo (`components/Shared/Breadcrumb.tsx`) — verificar si está montado en todas las páginas relevantes.

**Esfuerzo**: 30 min audit.

### H-10 [BAJO] — Avatar menu sin sticky foto

**Observación**: avatar menu usa iniciales si el user no tiene foto. OK pero puede ser mejorable (ej. ícono Lucide `User` consistency).

**Fix propuesto**: menor priority, dejar como está.

---

## Oportunidades (post-campañas)

### O-1 — Search bar integrada en Header (sticky nav)

Post-campañas, user puede querer buscar sin volver al hero. Integrar SearchBar mini en header sticky al scroll.

**Esfuerzo**: 2-3h (componente + sticky logic).

### O-2 — Shortcut "Mi comuna" personalizado

Si el user ya seleccionó su comuna (en el futuro `WelcomeTutorModal` del plan onboarding), persistir + mostrar shortcut en header: "Explorar en {comuna}".

**Esfuerzo**: 1-2h.

### O-3 — Notificaciones bell en Header para proveedores

Actualmente existe `NotificationBell.tsx` en Header. Verificar que es visible + funcional para proveedores (no tutores quizás).

**Esfuerzo**: verificar + fix si necesario, 1h.

### O-4 — "Cambiar idioma" para expansión LATAM

Post-expansión a Argentina/Colombia/México, añadir selector de idioma/país. Hoy premature.

**Esfuerzo**: sprint completo i18n, post-tracción Chile.

---

## Top 5 fixes pre-campañas

Ranking impacto × esfuerzo:

### 1. H-2 · Slugs obsoletos en Footer (hospedaje/domicilio → cuidado)

**Esfuerzo**: 15 min.
**Impacto**: cierra 20+ links rotos → mejora SEO + UX directa.
**Verificar primero**: query categoria_servicio schema (1 min).

### 2. H-1 · Remover franja "Estamos construyendo"

**Esfuerzo**: 10 min.
**Impacto**: coherencia con realidad operativa (sitio ya opera).

### 3. H-7 · CTA primary "Soy tutor" en Header

**Esfuerzo**: 10 min.
**Impacto**: guía visitantes nuevos campañas al funnel correcto.

### 4. H-3 · Dropdown "Servicios" en nav desktop

**Esfuerzo**: 2-3h.
**Impacto**: acceso directo a 10 categorías. Reduce fricción navegación.

### 5. H-6 · Links legales en Footer

**Esfuerzo**: 10 min a 3h (si páginas existen vs crearlas).
**Impacto**: compliance legal + confianza.

**Total top 5**: ~4-7h de trabajo. Impacto significativo en navegabilidad.

---

## Decisiones pendientes del PO

### D1. Top 5 fixes pre-campañas

**Pregunta**: ¿autorizás arrancar sprint ~4-7h con los 5 fixes pre-campañas?

**Recomendación**: sí. H-2 + H-1 son trivial (25 min total, alto impacto). H-7 + H-3 + H-6 cubren el resto.

**Impacto si no se decide**: default = links rotos en footer + copy desactualizado.

### D2. Dropdown "Servicios" vs "Categorías"

**Pregunta**: ¿título del dropdown H-3 debería ser "Servicios" o "Categorías"?

**Recomendación**: **"Servicios"**. Es el término user-facing que entiende cualquier visitante. "Categorías" suena técnico.

**Impacto si no se decide**: default = "Servicios".

### D3. Verificar páginas legales existen

**Pregunta**: ¿valide revisar si `/terminos`, `/privacidad`, `/cookies` existen en el repo?

**Recomendación**: sí, 2 min de check. Si no existen, pre-campañas obligatoria crearlas (compliance Ley 21.719 vigente dic-2026 muy cerca).

**Impacto si no se decide**: default = chequeo pendiente.

### D4. Franja "Estamos construyendo" — remover o reemplazar

**Pregunta**: ¿removerla completa o reemplazar con copy nuevo (ej. "Pawnecta ya opera. ¿Algo falta en tu zona? Cuéntanos")?

**Recomendación**: **reemplazar**. Mantiene el espacio para capturar feedback + reduce inconsistencia que hoy existe.

**Impacto si no se decide**: default = remover.

### D5. CTA primary en Header — "Soy tutor" vs "Explora servicios"

**Pregunta**: ¿cuál es el CTA primary del Header para visitantes nuevos?

**Recomendación**: **"Explora servicios"** (acción primera + no exige commitment registro). "Soy tutor" / "Soy proveedor" secundarios.

**Impacto si no se decide**: default = "Explora servicios".

---

## Verificación complementaria

Pre-aplicar fixes, confirmar en Supabase:

```sql
-- Confirmar slugs vigentes vs obsoletos
SELECT slug, nombre, activa
  FROM public.categorias_servicio
 ORDER BY slug;
```

Resultado esperado (según CLAUDE.md): 10 slugs activos — `adiestramiento, cuidado, etologia, fotografia, guarderia, paseos, peluqueria, retratos, traslado, veterinario`. **Sin `hospedaje` ni `domicilio`** (confirmar que fueron eliminados o deshabilitados).

---

## Firma

Auditoría completa Header + Footer. Top 5 fixes pre-campañas claros + decisiones pendientes para GO del PO.
