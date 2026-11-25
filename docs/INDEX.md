# Índice de documentos `docs/`

Índice navegable de los 141 documentos bajo `docs/`. Para convenciones de estructura + naming + cuándo crear algo nuevo, ver [docs/README.md](README.md).

**Generación**: manual, al cierre de sprint o bump de documentación relevante. Para regenerar el inventario: `find docs/ -name "*.md" -type f | sort` + curar las categorías abajo. Este archivo lista sólo documentos vigentes (no archivados); los obsoletos se mueven a `docs/archive/` (ver § 12 abajo).

## 1. `analisis/` — comparaciones para decisión del PO

- [benchmarks-marketplaces-20261120.md](analisis/benchmarks-marketplaces-20261120.md) — comparación mercados similares LATAM
- [ci-concurrency-e2e-20261123.md](analisis/ci-concurrency-e2e-20261123.md) — propuesta serialización runs cross-PR
- [competencia-chile-20261120.md](analisis/competencia-chile-20261120.md) — mapeo competidores sector pets Chile
- [competencia-tiktok-chile-20261122.md](analisis/competencia-tiktok-chile-20261122.md) — scraping TikTok cuentas pets CL
- [costos-operacionales-20261120.md](analisis/costos-operacionales-20261120.md) — tabla costos recurrentes
- [explorar-fase2-opciones-20261123.md](analisis/explorar-fase2-opciones-20261123.md) — 4 opciones evolución /explorar
- [funnel-contacto-tutor-detalle-20261122.md](analisis/funnel-contacto-tutor-detalle-20261122.md) — 15 events GA4 pendientes
- [modelos-monetizacion-20261122.md](analisis/modelos-monetizacion-20261122.md) — comparación modelos revenue
- [pricing-strategy.md](analisis/pricing-strategy.md) — estrategia precios proveedores
- [referencias-contenido-rrss-20261122.md](analisis/referencias-contenido-rrss-20261122.md) — benchmarks IG/TikTok
- [tutor-funnel-fase2-opciones-20261123.md](analisis/tutor-funnel-fase2-opciones-20261123.md) — evolución signup tutor
- [user-journeys-20261120.md](analisis/user-journeys-20261120.md) — mapas journey tutor + proveedor

## 2. `auditorias/` — audits técnicos con mediciones

### Lighthouse

- [lighthouse-20261122.md](auditorias/lighthouse-20261122.md) — audit más reciente
- [lighthouse-20261117/reporte-prelaunch.md](auditorias/lighthouse-20261117/reporte-prelaunch.md)
- [lighthouse-20261112/reporte-post-perf-ficha.md](auditorias/lighthouse-20261112/reporte-post-perf-ficha.md)
- [lighthouse-20261111/reporte-mediana.md](auditorias/lighthouse-20261111/reporte-mediana.md)
- [lighthouse-20261110/reporte-baseline.md](auditorias/lighthouse-20261110/reporte-baseline.md)

### Accesibilidad / UX

- [a11y-core-20261119.md](auditorias/a11y-core-20261119.md)
- [a11y-mobile-20261120.md](auditorias/a11y-mobile-20261120.md)
- [copy-20261120.md](auditorias/copy-20261120.md)
- [error-handling-20261119.md](auditorias/error-handling-20261119.md)
- [formulario-servicio-20261119.md](auditorias/formulario-servicio-20261119.md)
- [navegacion-global-20261120.md](auditorias/navegacion-global-20261120.md)

### Emails

- [correos-20261119.md](auditorias/correos-20261119.md)
- [correos-automaticos-20261110.md](auditorias/correos-automaticos-20261110.md)
- [correos-visual-20261120.md](auditorias/correos-visual-20261120.md)
- [emails-transaccionales-detalle-20261122.md](auditorias/emails-transaccionales-detalle-20261122.md)

### Marketing / funnel

- [analitica-20261120.md](auditorias/analitica-20261120.md)
- [campanas-20261110.md](auditorias/campanas-20261110.md)
- [catalogo-actual-titulos-20261122.md](auditorias/catalogo-actual-titulos-20261122.md)
- [explorar-para-trafico-pagado-20261122.md](auditorias/explorar-para-trafico-pagado-20261122.md)
- [funnel-contacto-tutor-20261120.md](auditorias/funnel-contacto-tutor-20261120.md)
- [funnel-registro-proveedor-20261120.md](auditorias/funnel-registro-proveedor-20261120.md)
- [signup-tutor-20261122.md](auditorias/signup-tutor-20261122.md)

### Otros audits

- [blog-imagenes-ia-20261119.md](auditorias/blog-imagenes-ia-20261119.md)
- [pii-20261120.md](auditorias/pii-20261120.md)
- [seguridad-20261119.md](auditorias/seguridad-20261119.md)

## 3. `auth/` — flujo auth Supabase

- [emails-auth-supabase.md](auth/emails-auth-supabase.md)
- [redirect-rules.md](auth/redirect-rules.md)
- [session-timeout.md](auth/session-timeout.md)
- resto: ver `ls docs/auth/`

## 4. `bitacora/` — incidentes operativos

- [incidentes-20261123.md](bitacora/incidentes-20261123.md) — jornada sábado pre-campañas
- [incidentes-20261124.md](bitacora/incidentes-20261124.md) — jornada lunes pre-freeze

## 5. `blog-drafts/` — drafts editoriales

Tracked en subcarpeta `docs/blog-drafts/`. Los drafts activos se decoran con frontmatter `status: pending-review | approved | rejected`.

## 6. `evidencia/` — capturas/screenshots de bugs

Snapshots de fails, capturas DevTools, logs Sentry. No editables, solo agregables.

## 7. `ops/` — scripts/queries read-only PO

- [gastos-periodicos.md](ops/gastos-periodicos.md) — tabla consolidada gastos recurrentes (actualizada 2026-11-24)

## 8. `planes/` — roadmaps + planes multi-sprint

### Cola activa (más recientes)

- [post-launch-week1-plan.md](planes/post-launch-week1-plan.md) — plan próxima semana pre-campañas (vigente)
- [flakes-transient-f2-review.md](planes/flakes-transient-f2-review.md) — revisión flakes F2 2026-11-24
- [ci-flakes-acumulados.md](planes/ci-flakes-acumulados.md) — bitácora ci flakes
- [ci-concurrency-e2e.md](planes/ci-concurrency-e2e.md) — propuesta serialización
- [CLAUDE_MD_ENMIENDAS_NOV24.md](planes/CLAUDE_MD_ENMIENDAS_NOV24.md) — enmiendas CLAUDE.md pendientes
- [CLAUDE_MD_ENMIENDAS_NOV23.md](planes/CLAUDE_MD_ENMIENDAS_NOV23.md)
- [comunicacion-25-11.md](planes/comunicacion-25-11.md) — comms plan lanzamiento
- [decisiones-po-pendientes-20261120.md](planes/decisiones-po-pendientes-20261120.md)
- [changelog-publico.md](planes/changelog-publico.md)
- [experimentos-postlaunch.md](planes/experimentos-postlaunch.md)
- [calidad-primera-campana.md](planes/calidad-primera-campana.md)
- [blog-proximo-mes.md](planes/blog-proximo-mes.md)

## 9. `playbooks/` — triage recurrentes

- [incidentes-comunes-20261119.md](playbooks/incidentes-comunes-20261119.md)
- [incidentes-comunes-20261110.md](playbooks/incidentes-comunes-20261110.md)

## 10. `producto/` — decisiones producto + specs features

Material producto-first, decisiones UX/scope.

## 11. `sprints/` — planes + actas sprints específicos

### Cola activa (2026-11-24)

- [fixtures-cleanup-recon.md](sprints/fixtures-cleanup-recon.md) — recon ITEM 1 cleanup fixtures e2e
- [resend-staging-split-plan.md](sprints/resend-staging-split-plan.md) — 4 opciones split quota Resend
- [resend-reminders-dedup-plan.md](sprints/resend-reminders-dedup-plan.md) — Block 2 investigación
- [eventos-schema-sql-acta-pulido.md](sprints/eventos-schema-sql-acta-pulido.md)
- [eventos-schema-sql-acta.md](sprints/eventos-schema-sql-acta.md)
- [eventos-mvp-plan.md](sprints/eventos-mvp-plan.md)
- [smoke-prod-diario.md](sprints/smoke-prod-diario.md)
- [resumen-ejecutivo-domingo-20261122.md](sprints/resumen-ejecutivo-domingo-20261122.md)
- [lighthouse-followups.md](sprints/lighthouse-followups.md)
- [estado-cola-20261123.md](sprints/estado-cola-20261123.md)
- [checklist-definitivo-pre-campanas.md](sprints/checklist-definitivo-pre-campanas.md)
- [bloque-j-4.md](sprints/bloque-j-4.md) — F2-RESERVAS-CLEANUP + fixtures

### Actas de cierre (históricas, relevantes como referencia)

- [cue-1-fix.md](sprints/cue-1-fix.md)
- [sentry-boundary.md](sprints/sentry-boundary.md)
- [deadlock-fix.md](sprints/deadlock-fix.md)
- [email-landing-session-timeout.md](sprints/email-landing-session-timeout.md)

Resto: ver `ls docs/sprints/` — 41 archivos.

## 12. `archive/` — docs obsoletos

Dir **propuesto para crear post-GO PO**. No existe hoy. Mover acá docs con >90 días sin modificación + cuya info ya está consolidada en otro doc vigente. Incluye:

- Candidatos para archivado (propuestos pendiente GO PO):
  - `GA4_DEBUGVIEW_INVESTIGATION_20260915.md` (resuelto, archivar tras verificar no referenciado)
  - `P8_COROLARIOS_AUDIT_20260915.md` (consolidado en CLAUDE.md § corolarios P8)
  - `PERF1_BUCKET_B_MOBILE_AUDIT_20260915.md` (sprint cerrado, referencias nulas hoy)

**Zero delete**: solo move a `docs/archive/` preservando path original como subcarpeta.

## 13. Mantenimiento

- **Trigger de update**: al cerrar un sprint o al agregar un doc relevante, actualizar esta sección.
- **Script de verificación** (propuesto pendiente — no implementado): `scripts/verify-docs-index.sh` que cruza `find docs/ -name '*.md'` contra los links de este archivo + reporta docs no indexados + links rotos.
- **Responsable**: el auditor marca cada PR docs-only con "actualizar INDEX.md" si el doc es destacable (vigente para plan/sprint activo). Docs puramente de registro histórico (actas cerradas, evidencia puntual) no requieren indexación.

## 14. Convenciones vivas

Ver [docs/README.md](README.md) para:

- Naming de archivos (kebab-case + fecha ISO comprimida)
- Cuándo NO crear un doc nuevo
- Mapeo subcarpeta → propósito
