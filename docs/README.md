# docs/ — estructura y convenciones

Written for: auditor nuevo que arranca a trabajar en el repo, o Aldo tras una ausencia larga. Objetivo: mapa de qué vive en cada subcarpeta + cuándo crear algo nuevo + convenciones de naming.

## Estructura

| Subcarpeta | Qué vive ahí | Cuándo crear algo nuevo | Naming |
|---|---|---|---|
| `analisis/` | Análisis técnicos read-only para decisión del PO (no plan de ejecución). Compara opciones + recomendación. | Antes de arrancar un sprint grande o cuando hay que elegir entre 2-4 approaches. Zero código. | `<slug>-<YYYYMMDD>.md` |
| `auditorias/` | Reportes de audit técnicas (Lighthouse, a11y, seguridad, PII) con mediciones empíricas. Suelen traer JSONs raw. | Cada corrida formal de audit sobre prod/staging. Mediciones como fuente verificable. | `<slug>-<YYYYMMDD>.md` + carpeta hermana `<slug>-<YYYYMMDD>/` con raws |
| `auth/` | Material específico del flujo auth: templates de email de Supabase Auth, decisiones sobre el flow. | Cambios estructurales al flow auth (templates email, redirect rules, Session management). | `<tema>.md` |
| `bitacora/` | Bitácora operativa: incidentes resueltos con patrón + fix + trigger para reapertura. Aprendizaje operativo (no estadísticas). | Al cerrar un patrón nuevo detectado (ej. patrón CI, incidente prod, slip operativo). | `incidentes-<YYYYMMDD>.md` o `<tema>-<YYYYMMDD>.md` |
| `blog-drafts/` | Drafts de blog posts para decisión editorial del PO. No pushean al blog productivo hasta GO del PO. | Cuando el PO pide o acepta drafts de 800-1200 palabras para evaluar publicación. | `<slug>.md` con frontmatter YAML (slug, title, category, status) |
| `evidencia/` | Capturas de pantalla, outputs raw, snapshots de evidencia de bugs/fixes. No se edita, solo se agrega. | Al capturar evidencia de un fail/fix que no pueda regenerarse (screenshot UI, JSON de API error, log Sentry). | `<pr-slug>-<YYYYMMDD>/` carpeta + archivos dentro |
| `ops/` | Scripts/queries read-only para operación manual del PO (Studio prod, CLI). Cero mutaciones autónomas. | Cuando el PO necesita un check recurrente (ej. query semanal META-100-proveedores). | `query-<tema>.sql` o `script-<tema>.sh` |
| `planes/` | Planes de acción + roadmaps + análisis multi-sprint. Más amplios que `analisis/`. | Lanzamientos, campañas, batch de sprints, tracking de metas semanales. | `<slug>.md` (fecha opcional si es específico de un período) |
| `playbooks/` | Playbooks de respuesta a escenarios recurrentes: incidentes comunes, flujos de triage, templates de respuesta al user. | Al identificar un patrón recurrente que amerita doc operativo. | `<slug>-<YYYYMMDD>.md` |
| `producto/` | Decisiones de producto, specs de features, roadmap de categorías. Material producto-first. | Cuando se define una feature nueva o se toman decisiones sobre UX/scope. | `<slug>.md` |
| `sprints/` | Planes + actas de cierre + wrap-ups de sprints específicos. Material sprint-first. | Al arrancar un sprint con alcance definido + al cerrar. | `<sprint-slug>.md` o `<sprint-slug>-<YYYYMMDD>.md` |

## Convenciones de naming

- **Fecha ISO comprimida**: `YYYYMMDD` (ej. `20261123`). Evitar `YYYY-MM-DD` dentro del nombre del archivo — se lee peor + rompe algunos glob patterns. Usar fecha ISO con guiones solo en frontmatter YAML o dentro del contenido.
- **Slugs en kebab-case**: todo minúscula, palabras separadas por `-`. Ej. `ci-flakes-acumulados.md`, no `ci_flakes_acumulados.md` ni `CiFlakesAcumulados.md`.
- **Prefijo numérico solo en migraciones SQL** (`migrations/NN_descripcion.sql` o `migrations/YYYYMMDD_descripcion.sql`). Docs NO usan prefijo numérico.
- **Idioma**: contenido en español (consistente con el resto del codebase). Comentarios inline del código en español también.

## Cuándo NO crear un doc nuevo

- Si el contenido entra en 2-3 líneas → va al commit message o al BACKLOG.md.
- Si duplica contenido existente → ampliar el archivo existente, no crear hermano.
- Si es ephemeral (notas para el próximo turno) → usar el chat con el PO o la rama de trabajo, no `docs/`.
- Si es decisión producto del PO → va a `BACKLOG.md > PEDIDOS DIRECTOS DEL PO`, no doc nuevo.

## Convenciones de contenido

- **"Written for:"** como primera línea no-título. Identifica audiencia (`PO`, `auditor nuevo`, `yo mismo en 3 meses`). Ajusta tono + nivel de contexto.
- **Trazabilidad al final**: PRs referenciados + commits + issues + ítems BACKLOG. Facilita encontrar origen.
- **Español chileno tuteo**: `tú`, nunca voseo (`vos`, `tenés`, `querés`, `podés`). Ver `CLAUDE.md > Convenciones de código` para detalle.
- **Imperativos tú**: `elige`, `agrega`, `verifica`, nunca `elegí`, `agregá`, `verificá`.

## Archivos top-level `docs/*.md`

Los 3 archivos directamente en `docs/` (no en subcarpeta) son históricos específicos:
- `GA4_DEBUGVIEW_INVESTIGATION_20260915.md` — diagnóstico GA4.
- `P8_COROLARIOS_AUDIT_20260915.md` — auditoría de corolarios P8 vigentes al 2026-09-15.
- `PERF1_BUCKET_B_MOBILE_AUDIT_20260915.md` — audit mobile específico.

Si aparecen nuevos archivos top-level, considerar si corresponden a `auditorias/`, `analisis/` o `planes/` y mover.

## Mantenimiento

- Un auditor nuevo que abra `docs/` debería saber en <2 min dónde ir según lo que necesita.
- Si una subcarpeta crece a >15 archivos, considerar sub-estructura (ej. `docs/planes/ya-cerrados/` para archivar planes de sprints pasados cuyo contenido ya aterrizó).
- No borrar archivos históricos sin GO explícito del PO — pueden tener valor arqueológico.
