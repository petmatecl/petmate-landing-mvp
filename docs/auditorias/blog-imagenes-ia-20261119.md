# Auditoría de imágenes IA en entradas del blog

**Fecha**: 2026-11-19 · **Autor**: auditor · **Entregable de task 6** pedido por PO 2026-11-19.
**Fuente de datos**: `lib/blogData.ts` (array `blogPosts` con 7 entradas).
**Criterio del PO**: cero imágenes generadas por IA + cero fotos stock de personas o mascotas en el blog.

## Resumen ejecutivo

**7/7 imágenes de cover caen bajo la regla nueva** y requieren remoción o reemplazo:
- **4 IA confirmada** (locales en `public/blog/*.png`).
- **3 fotos stock de mascota** (Unsplash URLs, legítimas pero de mascotas).

Ninguna foto de proveedor/tutor real con autorización. Ninguna captura de la plataforma. Ninguna ilustración vectorial propia del diseño.

## Clasificación detallada

### Imágenes LOCALES (`public/blog/*.png`) — 4 entradas, IA confirmada

| Post slug | Archivo | Diagnóstico IA | Señales |
|---|---|---|---|
| `importancia-registro-nacional-mascotas-chile` | `/blog/pet-registration-cover.png` (765 KB) | **IA confirmada** | Texto deformado en laptop ("PET REGISTRATION PORTAL" repetido solapado, form fields borrosos); "VETERINARY CERTIFICATE" con letras mal formadas; composición Pinterest-aspirational (golden retriever con pata "escribiendo", luz dorada ideal, decor demasiado perfecto). |
| `beneficios-físicos-emocionales-tener-mascota` | `/blog/importance-of-pets-cover.png` (894 KB) | **IA confirmada** | Cuadro "HOME IS WHERE THE HEART IS (AND THE PETS)" con letras aglutinadas; marcos de fotos en el fondo con imágenes blurry sin sentido; alfombra oriental con patrones imperfectos típicos de generación; composición multigeneracional over-saturada emocionalmente. |
| `importancia-no-cambiar-ambiente-mascotas-viaje` | `/blog/pet-home-comfort-cover.png` (978 KB) | **IA confirmada** (ilustración watercolor) | Estilo acuarela uniforme + lomos de libros borrosos sin texto + retrato en pared borroso; luz dorada idealizada. Es ilustración, no foto, pero generada por IA — cae bajo la regla "nada de imágenes generadas con IA". |
| `ventajas-desventajas-hotel-mascotas-vs-sitter` | `/blog/pet-hotel-pros-cons.png` (597 KB) | **IA confirmada** (ilustración cartoon split pros/cons) | Proporciones de la recepcionista raras (cuello/brazos desproporcionados); golden retriever con patas delanteras largas inverosímiles; paneles de puerta de vidrio reflejados al revés en el panel derecho; estilo "guía ilustrada" típico de generator. |

**Señal transversal**: los 4 archivos tienen fecha `Jan 13 2026` (idéntica), nombres en inglés estilo prompt (`pet-registration-cover`, `pet-home-comfort-cover`) → creados en una misma sesión de generación IA, probablemente uso de DALL-E / Midjourney / StableDiffusion. Las fechas de publicación en `blogData.ts` son más recientes — las imágenes se generaron pre-publicación como placeholder.

### Imágenes STOCK (Unsplash) — 3 entradas, no-IA pero caen por regla "nada de stock de mascotas"

| Post slug | Imagen (URL abreviada) | Diagnóstico | Clasificación según regla nueva |
|---|---|---|---|
| `cuidados-mascotas-verano-altas-temperaturas` | `images.unsplash.com/photo-1519052537078-e6302a4968d4` | **foto stock legítima** (Unsplash, ID real, foto real de perro/mascota con calor) | **remover** — regla nueva "nada de fotos stock de personas o mascotas" |
| `golpe-de-calor-mascotas-sintomas` | `images.unsplash.com/photo-1561037404-61cd46aa615b` | **foto stock legítima** (Unsplash, ID real, foto real de perro) | **remover** — regla nueva |
| `mitos-verdades-gato-indoor-100-por-ciento` | `images.unsplash.com/photo-1513245543132-31f507417b26` | **foto stock legítima** (Unsplash, ID real, foto real de gato en ventana) | **remover** — regla nueva |

Las 3 Unsplash **NO son IA** — son fotos reales de bancos de stock gratuitos con atribución opcional. Pero caen en la segunda parte de la regla nueva del PO ("nada de fotos stock de personas o mascotas").

## Recomendación de reemplazo (según criterio PO)

Criterio por defecto del PO:
- (a) **Sin imagen** → posts cortos.
- (b) **Ilustración vectorial propia** del diseño del site → posts largos donde la imagen ayuda a estructurar.
- (c) **Placeholder gris + ícono** → cuando no hay ilustración vectorial clara.

**Longitudes de los posts** (aprox por líneas en `blogData.ts` entre `content` keys):

| Post | Longitud | Reemplazo propuesto |
|---|---|---|
| `cuidados-mascotas-verano-altas-temperaturas` | largo (~85 líneas content) | (b) ilustración vectorial si hay sol/termómetro en Lucide; si no, (c) placeholder gris + ícono `Sun` |
| `golpe-de-calor-mascotas-sintomas` | largo (~90 líneas) | (c) placeholder gris + ícono `ThermometerSun` o `AlertCircle` — tema médico serio, mejor no ilustración "cute" |
| `mitos-verdades-gato-indoor-100-por-ciento` | largo (~140 líneas) | (c) placeholder gris + ícono `Cat` de Lucide |
| `importancia-registro-nacional-mascotas-chile` | largo (~65 líneas) | (c) placeholder gris + ícono `ClipboardList` o `FileText` |
| `beneficios-físicos-emocionales-tener-mascota` | largo (~65 líneas) | (b) si hay ilustración del design system con corazón/mascota; si no, (c) placeholder + `Heart` |
| `importancia-no-cambiar-ambiente-mascotas-viaje` | largo (~90 líneas) | (b) ilustración vectorial casa/maleta; si no hay, (c) placeholder + `Home` |
| `ventajas-desventajas-hotel-mascotas-vs-sitter` | muy largo (~95 líneas) | (b) ilustración vectorial de comparación; si no hay, (c) placeholder + `Hotel` o `Scale` |

**Decisión práctica**: hoy el repo **no tiene ilustraciones vectoriales propias para blog** (verificado con find rápido — solo iconos Lucide + fotos de servicios/proveedores). Entonces todas van a opción **(c) placeholder gris + ícono Lucide**.

## Diseño propuesto del placeholder

Patrón ya usado en otros lados del site (grep rápido):
```tsx
<div className="w-full aspect-video bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
    <IconLucide size={64} aria-hidden="true" />
</div>
```

Honesto: comunica "esto es un placeholder, hay contenido textual debajo" sin fingir una foto que no tenemos.

Alternativa (a) — posts cortos sin ninguna imagen: eliminar completamente la fila del hero + cerrar el espacio, el header del artículo arranca directo con título + autor. Hoy ninguno de los 7 posts es "corto" según el criterio (todos >60 líneas de `content`).

## Próximos pasos (tasks 7 + 8 + 9)

- **Task 7**: PR `blog-img-removal` que modifica `lib/blogData.ts` para reemplazar cada `coverImage` por string vacío + agregar nuevo campo opcional `coverIcon?: string` (nombre del ícono Lucide) + modificar `pages/blog/[slug].tsx` + `pages/blog/index.tsx` para renderizar placeholder cuando `coverImage` vacío.
- **Task 8**: regla permanente en `CLAUDE.md` en el **mismo PR** que task 7: "Las entradas del blog NO pueden incluir imágenes generadas con IA ni fotos stock de personas o mascotas. Solo ilustraciones vectoriales propias del diseño, capturas reales de la plataforma, o fotos de proveedores y tutores reales con autorización escrita."
- **Task 9**: entrada nueva "Cómo elegir un paseador de perros en Santiago: guía 2026" — pendiente del texto completo del PO (mensaje anterior quedó con placeholder `[pega acá el texto que te pasé]`).

## Estimación tasks 7-9

- Task 7 (PR blog-img-removal): 1-1.5 h (modificar 7 entries + 2 componentes + smoke render).
- Task 8 (regla CLAUDE.md): 10 min (parte del mismo PR).
- Task 9 (entrada nueva): 30 min + validación formato (depende del texto que pase el PO).

**Total**: ~2-2.5 h si se hace mañana entre merge #120 y CHAT-LAZY-CREATE.

## Archivos a tocar en el PR BLOG-IMG-REMOVAL

- `lib/blogData.ts` — 7 entries, modificar `coverImage` + agregar `coverIcon`.
- `pages/blog/[slug].tsx` — render condicional: si `coverImage` no vacío → img; si no → placeholder gris + `coverIcon`.
- `pages/blog/index.tsx` — idem en cards de la lista.
- `public/blog/*.png` — eliminar los 4 archivos IA (765 KB + 894 KB + 978 KB + 597 KB = **3.2 MB** liberados).
- `CLAUDE.md` — regla permanente (task 8).
- `lib/blogData.ts` — nueva entrada "Cómo elegir un paseador de perros en Santiago" (task 9, cuando el PO pase el texto).
