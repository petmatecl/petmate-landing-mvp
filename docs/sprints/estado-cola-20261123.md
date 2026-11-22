# Estado de la cola A→G — auditor out, 2026-11-23

Written for: el PO (Aldo), para revisar con contexto completo al conectarse. Consolida todos los PRs abiertos post-cola + resultado de merges autónomos + pendientes.

**Modo operativo aplicado**: cola + avance continuo (reset operativo PO 2026-11-22 noche). Zero planificación por día; cada tarea que requirió decisión/smoke del PO quedó pendiente y pasé a la siguiente.

**Resumen numérico**:
- **2 PRs mergeados autónomamente** (docs-only ALL GREEN): #146, [148 pendiente al rebase].
- **8 PRs abiertos esperando CI/GO**: #145, #147, #148, #149, #150, #151, #152, #153.
- **0 commits directos a main**.
- **0 acción en prod**.

---

## PRs mergeados autónomamente

| # | Título | Tipo | SHA | Trigger |
|---|--------|------|-----|---------|
| #146 | docs(catalogo-cleanup-lite): SQL listo para ejecutar en prod | docs-only | `b87e5ae` | ALL 5 CI GREEN |

---

## PRs abiertos — ordenados por prioridad para el PO

### PR #148 — docs PAWNECTA-APOYO-DONACIONES
- **Scope**: docs-only, nuevo ítem BACKLOG en subsección "Monetización blanda".
- **CI**: ALL 5 CHECKS GREEN pre-rebase; actualizado con main → nuevo CI corriendo.
- **Base**: originalmente sobre `pre-camp-cola` (#145). Post-rebase, sobre main actualizado.
- **Acción PO**: ninguna, docs-only → merge autónomo en cuanto CI post-rebase pase.

### PR #145 — docs(backlog): Sprints Pre-Campañas al tope + 5 ítems sin fecha + EVENTOS Feria Navideña
- **Scope**: migración de 10 ítems del resumen ejecutivo del domingo + nuevo ítem EVENTOS-MASCOTAS-ECOSISTEMA con seed Feria Navideña + resumen ejecutivo (`docs/sprints/resumen-ejecutivo-domingo-20261122.md`).
- **CI**: 3 checks SUCCESS, F2 fue CANCELLED por infra; **rerun autónomo P11 iter 1 consumido** (log en comentario del PR).
- **Acción PO**: ninguna, docs-only → merge autónomo en cuanto CI pase.

### PR #149 — feat(tutor-funnel): F-TR-17 preservar URL origen pre-registro
- **Scope**: TOP 1 del audit B1, +20-40% retención post-confirm email esperado.
- **CI**: 3 checks SUCCESS, Playwright suites pendientes.
- **Acción PO**: **SMOKE MANUAL + GO merge**. Smoke en 6 pasos detallado en el body del PR (desktop anónimo → ficha → gate → registro → confirm → verificar que vuelve a la ficha origen).

### PR #150 — feat(tutor-funnel): F-TR-13 botón "Reenviar email" con cooldown 60s
- **Scope**: TOP 3 del audit B1, +10-15% confirm email esperado.
- **CI**: 3 checks SUCCESS, Playwright suites pendientes.
- **Acción PO**: **SMOKE MANUAL + GO merge**. Usar \`supabase.auth.resend\` + AUDIT_INBOX staging.

### PR #151 — feat(tutor-funnel): F-TR-4 password meter + checklist inline
- **Scope**: TOP 4 del audit B1, +5-10% submit exitoso primera vez.
- **CI**: 1 Playwright IN_PROGRESS al momento de este reporte.
- **Acción PO**: **SMOKE MANUAL + GO merge**. Tipear passwords de ejemplo (débil / medio / fuerte) en el wizard.

### PR #152 — feat(explorar-pre): H3 + H4 + H5
- **Scope**: 3 de 5 top fixes del audit B8. Impacto combinado +25-45% percepción catálogo.
- **CI**: 3 checks SUCCESS, Playwright suites pendientes.
- **Acción PO**: **SMOKE MANUAL + GO merge**.

### PR #153 — feat(emails): EMAILS-EMOJI-POLICY
- **Scope**: 7 emojis removidos de 4 templates + regla CLAUDE.md extendida a emails.
- **CI**: typecheck IN_PROGRESS al momento del reporte.
- **Acción PO**: **SMOKE MANUAL + GO merge**. Render diff de templates + flow smoke en staging (AUDIT_INBOX).

### PR #147 — feat(ga4): ANALYTICS-FUNNEL-TUTOR — 10 eventos taxonomía + 7 call sites
- **Scope**: 10 eventos nuevos en \`EventoDemanda\` + instrumentación en \`explorar\`, \`proveedor/[id]\`, \`LoginRequiredModal\`, \`register\`, \`email-confirmado\`.
- **CI**: 3 checks SUCCESS, Playwright suites pendientes.
- **Acción PO**: **SMOKE MANUAL** (flow golden tutor con GA4 Realtime abierto) **+ GO merge**.
- **Nota**: 3 eventos pendientes fase 2 (cta_contacto_click, cta_reservar_click, primera_accion_post_login).

---

## Ítems de la cola A→G por categoría

### Mergeado hoy
- **B** → PR #146 MERGED. SQL CATALOGO-CLEANUP-LITE listo para que el PO ejecute en Supabase Studio prod (zero acción auditor en prod; patrón P5 con snapshot + UPDATE con RETURNING + verificación + rollback).

### Esperando CI docs-only → merge autónomo
- **A** → PR #145 (migración BACKLOG + resumen ejecutivo + EVENTOS).
- **Extra** → PR #148 (PAWNECTA-APOYO-DONACIONES).

### Esperando GO PO
- **D** → PR #147 (ANALYTICS-FUNNEL-TUTOR 10 eventos + 7 call sites instrumentados).
- **E** (TUTOR-FUNNEL-PRE-CAMPAÑA):
  - PR #149 (F-TR-17 URL origen) — TOP 1 del audit.
  - PR #150 (F-TR-13 reenviar email cooldown 60s) — TOP 3 del audit.
  - PR #151 (F-TR-4 password meter) — TOP 4 del audit.
  - F-TR-3 del audit = no-op (RUT solo para proveedor empresa, verificado).
  - F-TR-10 + F-TR-12 (TOP 5 del audit, doble email + welcome fail silente) → fase 2 diferida.
- **F** → PR #152 (EXPLORAR H3+H4+H5). Fase 2: H1 cookies + H2 sin reseñas proxy diferida.
- **G** → PR #153 (EMAILS-EMOJI-POLICY). Cierra con regla CLAUDE.md ampliada.

### Eliminada del scope del auditor por decisión PO
- **C** → captions Instagram/TikTok Feria Navideña. El PO gestiona cuentas RRSS directamente; el auditor solo trabaja la pieza del sitio web (ver EVENTOS-MASCOTAS-ECOSISTEMA § división de responsabilidades aterrizada en #145).

---

## Fases 2 diferidas (dentro de los sprints activos)

Ninguna es gating; todas pueden aterrizar post-merge de la fase 1 cuando el PO/auditor retome el sprint.

| Sprint | Fase 2 pendiente | Esfuerzo | Nota |
|--------|------------------|----------|------|
| ANALYTICS-FUNNEL-TUTOR | 3 eventos: `cta_contacto_click`, `cta_reservar_click`, `primera_accion_post_login` | 1-2h c/u | CTAs scattered en ServiceDetailView + MobileActionSheet + ServiceCard; primera_accion_post_login requiere coordinación cross-pages |
| TUTOR-FUNNEL-PRE-CAMPAÑA | F-TR-10 + F-TR-12 (doble email + fail silente welcome) | 1-2h | Decisión UX previa: Option A (try/catch surface) vs Option B (sin welcome hasta confirmar) |
| EXPLORAR-PRE-CAMPAÑA | H1 (cookies banner diferir/discreción) + H2 (sin reseñas proxy de confianza) | 3-5h c/u | Requieren decisión UX cuidada del PO sobre copy + comportamiento |

---

## Deltas operativos del día

### Slips reconocidos
1. **PR #145**: 2 pushes mientras CI en curso (violación de `feedback_pr_ci_no_pushes`). El segundo push aterrizó corrección de copy del ítem EVENTOS (remover referencia a captions del auditor). Mea culpa anotada en el momento.
2. **Rerun autónomo P11 iter 1 consumido en #145**: F2 CANCELLED por infra (1m31s de run, cero assertion fail) → rerun ejecutado + comentado en el PR. Regla "docs-only rerun autónomo único".

### Regla aplicada correctamente
- **P1.3 (branch up-to-date)**: #148 estaba behind main por #146 merge → detectado por GitHub al intentar merge autónomo → merge main → push → nuevo CI corriendo. Sin force-push. Sin intento de skipear el gate.
- **P1.1 (build output completo)**: tsc + build verificados en cada PR con código antes de commit + push. Warnings grep-eados.
- **P6 (verificar columnas antes de SQL)**: SQL CATALOGO-CLEANUP-LITE construido con IDs reales obtenidos via MCP supabase-prod-ro, zero asunciones.
- **Branch names ≤18 chars**: todas las ramas nuevas verificadas (pre-camp-cola 13, cat-cleanup-sql 15, apoyo-item2 11, ga4-tutor 9, tutor-return-to 15, resend-email 12, pwd-meter 9, explorar-pre 12, emails-emoji 12, estado-cola 11). Una rename pre-push (`analytics-funnel-tut` 20 chars → `ga4-tutor` 9).

---

## Pendientes PO para revisar

| ID | Acción | Fuente | Urgencia |
|----|--------|--------|----------|
| **#140** | Smoke visual admin iter 2 → GO merge | Sprint previo viernes | Admin layout regresión real |
| **#142** | GO merge fb-badge-read | Sprint previo viernes | Bug UX badge feedback |
| **CATALOGO-CLEANUP-LITE SQL** | Ejecutar bloque SQL en Supabase Studio prod | PR #146 (merged) → `docs/sprints/catalogo-cleanup-lite-sql-20261123.md` | Pre-campañas calidad catálogo |
| **#149** | Smoke F-TR-17 + GO merge | PR body | TOP 1 impacto funnel tutor |
| **#150** | Smoke F-TR-13 + GO merge | PR body | TOP 3 funnel tutor |
| **#151** | Smoke F-TR-4 + GO merge | PR body | TOP 4 funnel tutor |
| **#152** | Smoke EXPLORAR H3/H4/H5 + GO merge | PR body | Catálogo pre-campañas |
| **#153** | Smoke EMAILS-EMOJI-POLICY + GO merge | PR body | Coherencia visual web↔emails |
| **#147** | Smoke GA4 + GO merge | PR body | Gating analytics campañas |
| **D1 Lighthouse** | Correr Lighthouse local o pagespeed.web.dev UI | Resumen ejecutivo domingo A5 | Validar que fixes CLS/LCP no se degradaron |
| **D3 Budget campañas** | Confirmar monto exacto $15-20k vs $30-50k día 1 | Resumen ejecutivo domingo | Previo a prender ads |
| **D5 Colab videos** | Contactar Nicole + Constanza | Resumen ejecutivo domingo | Desbloquea videos RRSS |
| **PAWNECTA-APOYO-DONACIONES** | 4 decisiones (monto, copy, ubicación, métrica pública) | #148 body | V1 post-100 proveedores, cero urgencia |

---

## Nota final

Cola A→G completada con 6 sprints de código + 2 de docs. 7 PRs abiertos esperando CI/GO. Ritmo sostenido; cada commit pasó tsc + build local antes de push. El PO toma el control al conectarse. Cero bloqueador crítico — todo el flow pre-campañas queda listo para avanzar en cuanto los PRs reciban GO y mergeen.

Zero navegación con credenciales prod. Zero acción mutante prod. Zero push directo a main.
