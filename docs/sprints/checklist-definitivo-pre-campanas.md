# Checklist definitivo pre-campañas

Written for: el PO (Aldo), como consolidación operativa de todos los items que deben estar listos ANTES de gastar el primer peso en ads pagados. Reconsolida auditorías del viernes 20-11 + documentos del domingo 22-11 + decisiones del PO.

**Formato**: 3 columnas — **item** · **estado hoy** · **dueño**.

**Estados**:
- ✅ LISTO — nada más que hacer.
- 🟡 EN CURSO — trabajo iniciado, ETA conocido.
- 🔴 PENDIENTE — sin empezar, decisión y/o GO del PO requerido.
- ⚫ DEUDA ACEPTADA — queda para post-launch por decisión explícita.
- ❓ DEPENDE — necesita decisión del PO para saber si entra o no.

---

## Bloque A — Técnico producto (funcionalidad + calidad)

| # | Item | Estado hoy | Dueño | Nota |
|---|------|------------|-------|------|
| A1 | Build limpio (zero warnings nuevos) | 🟡 | Auditor | Warnings pre-existentes (Sentry deprecation, img tags) — deuda post-launch |
| A2 | tsc + CI verde para todo PR | ✅ | Auditor | Regla P1 activa |
| A3 | Playwright suite error-audit + F2 estables | 🟡 | Auditor | Flakes CI-FLAKES-ACUMULADOS documentado; reruns funcionan |
| A4 | Visual snapshot baselines actualizados | ✅ | Auditor | Regenerados post a11y-contraste #136 |
| A5 | Core Web Vitals verdes mobile | 🔴 | PO / Auditor | 1 de 3 URLs verde (home). /explorar POBRE 5.8s LCP. Ver `perf-core-20261119.md` + `perf-post-fixes-20261122.md` |
| A6 | A11y WCAG AA baseline | ✅ | Auditor | Fix contraste sistémico en prod #136 |
| A7 | Zero bugs críticos pendientes | 🟡 | Auditor | #140 admin layout + #142 badge feedback esperando GO PO lunes |
| A8 | PWA funcional offline fallback | ✅ | — | Ya en prod via next-pwa |
| A9 | Error boundary + Sentry activo prod | ✅ | — | En prod desde 2026-08-11 |
| A10 | Rate limit anti-brute-force login | ⚫ | Auditor | Deuda in-memory limiter → sprint distribuido post-launch |

**Resumen bloque A**: 6 ✅, 3 🟡, 1 🔴 (A5 perf), 1 ⚫.

---

## Bloque B — Flows críticos tutor + proveedor

| # | Item | Estado hoy | Dueño | Nota |
|---|------|------------|-------|------|
| B1 | Signup tutor pulido | 🔴 | Auditor | 5 fricciones identificadas en `signup-tutor-20261122.md`, sprint TUTOR-FUNNEL-PRE-CAMPAÑA ~9-12h propuesto |
| B2 | Signup proveedor pulido | 🔴 | Auditor | 5 fricciones en `signup-proveedor-20261122.md`, sprint PROVEEDOR-FUNNEL ~9-11h propuesto |
| B3 | Confirmación email <2 min deliverability | 🟡 | PO | Depende Supabase Auth — validar en tests manuales |
| B4 | /explorar pulido para traffic pagado | 🔴 | Auditor | 5 fixes en `explorar-para-trafico-pagado-20261122.md`, sprint EXPLORAR-PRE-CAMPAÑA ~5-7h propuesto |
| B5 | Preservar URL origen pre-registro (H1 funnel) | 🔴 | Auditor | Fix ALTA prioridad — gating ~3-4h |
| B6 | Bug ADMIN-FEEDBACK-BADGE-MARK-READ | 🟡 | PO | PR #142 esperando GO lunes PM |
| B7 | Modal onboarding primer login proveedor | 🔴 | Auditor | F-PR-10 — gating ~3-4h |
| B8 | Presets de disponibilidad semanal en wizard servicio | 🔴 | Auditor | F-PR-12 — ALTA prioridad ~2-3h |
| B9 | Redirect post-confirm según rol | 🔴 | Auditor | F-PR-9 — ALTA prioridad ~1h |
| B10 | Favoritos sin login (localStorage) | ⚫ | Auditor | Post-launch (H2 funnel tutor) |

**Resumen bloque B**: 1 🟡, 7 🔴, 1 🟡, 1 ⚫.

**Esfuerzo total pendiente bloque B** (todos los 🔴): ~25-35h sprints. **Cabe en 3-4 días pre-launch si se arranca el martes 24-11**.

---

## Bloque C — Catálogo y proveedores

| # | Item | Estado hoy | Dueño | Nota |
|---|------|------------|-------|------|
| C1 | ≥100 proveedores activos en catálogo | 🔴 | PO | **Hoy: 12 reales + 12 placeholders. Falta 76-88 reales. Outreach manual del PO + campañas específicas para captar proveedores** |
| C2 | Audit títulos + descripciones pulidos | 🟡 | PO | 4 proveedores reales con mejoras propuestas + 6 placeholders a fixear. Doc `catalogo-actual-titulos-20261122.md` |
| C3 | Trim trailing spaces masivo | 🔴 | PO | SQL mecánico 5 min en prod |
| C4 | Proveedor "destacado" pre-curados identificados | 🔴 | PO | Plan `calidad-primera-campana.md` §1 |
| C5 | Proveedores destacados contactados + confirmados | 🔴 | PO | Mensaje template en plan calidad §1.3 |
| C6 | Fotos reales en al menos 80% de servicios activos | 🔴 | PO | Hoy ~50% sin foto |
| C7 | Agenda F1/F2 activa en al menos 50% de servicios | 🟡 | PO | Hoy 42% publican SIN agenda — fricción conocida |
| C8 | Cobertura ≥5 comunas principales de Santiago | 🟡 | PO | Hoy: Las Condes, Providencia, Santiago, Ñuñoa, Vitacura cubiertas |

**Resumen bloque C**: 6 🔴, 3 🟡.

**Dependencia crítica**: C1 (100 proveedores) es gating para TODA la campaña. Sin esto, ads traen tutores a catálogo delgado.

---

## Bloque D — Instrumentación y data

| # | Item | Estado hoy | Dueño | Nota |
|---|------|------------|-------|------|
| D1 | GA4 configurado + consent flow | ✅ | — | Ya en prod |
| D2 | Eventos clave (`contacto_iniciado`, `reserva_confirmada`, `registro_proveedor`, `reserva_finalizada`) | 🟡 | PO | Base en código; validar que disparan |
| D3 | Sprint instrumentación granular tutor funnel | 🔴 | Auditor | ~4-6h, propuesto en `funnel-contacto-tutor-detalle-20261122.md` |
| D4 | Dashboard /admin/metricas-proveedores activo | ✅ | — | En prod desde #135 |
| D5 | Vercel Analytics + Speed Insights | ❓ | PO | Verificar que están instalados; leer `vercel:status` output |
| D6 | Baseline semanal de funnel (query estándar) | 🟡 | PO | Queries listas (Q-FT-1 a Q-FT-10) — correr manual |
| D7 | Search Console verificado | 🔴 | PO | Decisión D1 del doc `search-console-keywords-20261120.md` |

**Resumen bloque D**: 2 ✅, 2 🟡, 2 🔴, 1 ❓.

---

## Bloque E — Operativo + playbooks

| # | Item | Estado hoy | Dueño | Nota |
|---|------|------------|-------|------|
| E1 | Playbook primera semana campañas | ✅ | Auditor | Doc `primera-semana-campanas-rutina-po.md` |
| E2 | Plan calidad primera campaña | ✅ | Auditor | Doc `calidad-primera-campana.md` |
| E3 | Protocolo fast recovery | ✅ | Auditor | Incluido en plan calidad §4 |
| E4 | Alertas automatizadas Vercel + Sentry + Supabase | 🟡 | PO | Vercel + Sentry OK; Supabase alerts no nativos (ver via dashboard) |
| E5 | Casilla `soporte@pawnecta.com` operativa | ❓ | PO | Verificar en Zoho |
| E6 | Casilla `contacto@pawnecta.com` operativa + atendida | ✅ | — | Confirmado |
| E7 | Horario de ads delivery definido | 🔴 | PO | Decisión del PO. Recomendación: 08:00-22:00 CLT primeros días |
| E8 | Budget diario definido | 🔴 | PO | Recomendación: $15-20k/día c/u día 1, escalar a $30-50k día 4+ |
| E9 | Mensaje template para outreach a proveedores sobre-demanda | 🔴 | Auditor | Incluir en playbook primera semana (ya hay base) |
| E10 | Alertas de billing en Vercel + Supabase | 🔴 | PO | 30 min configuración |

**Resumen bloque E**: 3 ✅, 1 🟡, 2 ❓, 4 🔴.

---

## Bloque F — Marca + contenido RRSS

| # | Item | Estado hoy | Dueño | Nota |
|---|------|------------|-------|------|
| F1 | Cuenta oficial @pawnecta en Instagram | ❓ | PO | Verificar existencia + branding |
| F2 | Cuenta oficial @pawnecta en TikTok | ❓ | PO | Verificar existencia + branding |
| F3 | Mínimo 5-7 posts Instagram pre-ads | 🔴 | PO | Plan `instagram-feed-2-semanas-20261122.md` |
| F4 | Mínimo 2-3 videos TikTok/Reels pre-ads | 🔴 | PO | Plan `videos-rrss-2-semanas-20261122.md` |
| F5 | Linktree o bio link con 3-5 opciones | 🔴 | PO | Instagram y TikTok necesitan enlace útil |
| F6 | Hashtag propio `#pawnectacuidadores` registrado | 🔴 | PO | Publicar 1 post de "lanzamiento" para quedarlo como owner primera referencia |
| F7 | Audit copy visual (casa editorial consistente) | 🟡 | PO | Mezcla tono formal/humor hoy — definir voz |

**Resumen bloque F**: 1 🟡, 4 🔴, 2 ❓.

---

## Bloque G — Legal + compliance

| # | Item | Estado hoy | Dueño | Nota |
|---|------|------------|-------|------|
| G1 | Términos y Condiciones publicados + link en footer | 🟡 | PO | Verificar que está actualizado + visible |
| G2 | Política de Privacidad publicada + link | 🟡 | PO | Igual |
| G3 | Política de cookies explícita + consent | ✅ | — | En prod |
| G4 | Página "Quiénes somos" clara + actualizada | 🟡 | PO | Último update conocido? |
| G5 | Email soporte visible al user | ✅ | — | En footer + templates |
| G6 | Compliance tratamiento de datos personales Chile (CIAM) | ❓ | PO | Verificar si estamos registrados como responsable de tratamiento |
| G7 | Factura electrónica SII (si cobramos Fase A destacado) | ⚫ | PO | Decisión post-launch, deuda aceptada |
| G8 | Términos específicos proveedor (contrato marco) | ❓ | PO | Verificar que existen |

**Resumen bloque G**: 1 ✅, 3 🟡, 1 ⚫, 3 ❓.

---

## Grand total por estado

| Estado | Cantidad total items | % |
|--------|----------------------|---|
| ✅ LISTO | 14 | 21% |
| 🟡 EN CURSO | 14 | 21% |
| 🔴 PENDIENTE | 30 | 45% |
| ⚫ DEUDA ACEPTADA | 4 | 6% |
| ❓ DEPENDE | 7 | 10% |
| **TOTAL** | **67** | **100%** |

**Porcentaje de items ya listos**: ~21% (14 de 67).
**Porcentaje con trabajo activo**: +21% (14 de 67) → ~42% con atención.
**Pendientes puros**: 45% (30 items) — mayoría concentrada en bloques B (producto flows) y C (catálogo proveedores).

**Trabajo aún faltante**: ~30 items 🔴 + 7 items ❓.

---

## Dependencias críticas (bloqueos cruzados)

1. **Bloque C1 (100 proveedores)** → bloquea toda campaña. Sin esto, ads traen tutores a catálogo saturado o vacío.
2. **Bloque A5 (CWV verdes)** → bloquea calidad del landing orgánico + relevance score de Google Ads.
3. **Bloque B1+B2 (flows pulidos)** → bloquea conversion rate del traffic pagado. Mal flow = ads son ruido.
4. **Bloque D3 (instrumentación granular)** → sin esto, el PO navega a ciegas durante la primera semana.
5. **Bloque F3+F4 (RRSS con contenido)** → bloquea que el tutor que llega por ad + visita Instagram/TikTok no vea "cuenta vacía" (sale).

---

## Plan de aterrizaje recomendado (semana pre-launch)

**Supuesto**: la campaña arranca domingo 7-dic o lunes 8-dic (ventana ~2 semanas desde hoy 2026-11-22).

### Lunes 24-nov
- PO revisa checklist completo + decide GOs/NO-GOs de los 🔴 priorizando por bloque.
- Arranca Sprint TUTOR-FUNNEL-PRE-CAMPAÑA (Bloque B).
- PO contacta top 10 proveedores candidatos a "destacados".
- PO empieza outreach para llegar a 100 proveedores (Bloque C1).

### Martes 25 - Jueves 27-nov
- Auditor: Sprints B (tutor + proveedor + explorar), ~15-25h concentrados.
- PO: más outreach proveedores + arranque RRSS (primer post Instagram + primer TikTok).

### Viernes 28-nov
- PO revisa qué se cerró en checklist.
- Si 🔴 > 15 items aún → considerar retrasar campaña 1 semana.
- Si 🔴 < 15 → focus en los restantes.

### Semana 2 (1-6 dic)
- Cerrar items 🔴 restantes.
- Lighthouse real (Bloque A5) + fixes P1-P5 si hay ventana.
- PO corre Bloque E7, E8, E10.

### Sábado 6-dic
- Validación final + smoke test completo.

### Domingo 7-dic o Lunes 8-dic
- **Activar ads** (budget conservador día 1, ver playbook).

---

## Decisiones pendientes del PO (consolidadas)

El PO revisa este doc + marca por cada 🔴 o ❓:
- **GO** — avanzar con la recomendación del auditor.
- **DEFER** — mover a post-launch.
- **NO** — rechazar.

El auditor espera esta tabla de decisiones (puede ser email o comment en este archivo) para armar el sprint plan concreto de las próximas 2 semanas.

---

## Firma

Este checklist es la red de seguridad pre-launch — evita que el PO descubra en el día 3 de campaña que algo crítico no estaba listo. **Imprimir o tener pestaña fija durante las próximas 2 semanas.**
