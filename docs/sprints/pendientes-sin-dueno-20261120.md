# Pendientes sin dueño — viernes 2026-11-20

Written for: el PO (Aldo), para decidir cuáles decisiones del viernes 20-11 van al próximo batch pre-campañas y cuáles quedan documentadas para después del lanzamiento.

**Snapshot**: 2026-11-22 ~11:30 CLT. **Fuente**: grep sobre `docs/auditorias/*20261120*.md` + `docs/analisis/*20261120*.md` buscando headers `### D[N]. ...` (patrón canónico del auditor cuando deja una decisión pendiente para el PO). **Total decisiones encontradas**: 54 decisiones en 12 documentos.

**Legend**:
- **Prio A** — decisión gating para campañas pagadas (no se puede lanzar sin esto).
- **Prio B** — decisión relevante pre-campañas, no bloqueante del lanzamiento.
- **Prio C** — decisión post-launch (ya marcada como "deuda" / "sprint propio" por el auditor).
- **?** — depende de respuesta del PO; prioridad real se calcula tras conocer su posición.

---

## Resumen ejecutivo

| Documento (fecha 20-11) | Total D-items | Prio A | Prio B | Prio C |
|---|---:|---:|---:|---:|
| seguridad-20261120.md | 5 | 0 | 2 | 3 |
| search-console-keywords-20261120.md | 4 | 1 | 2 | 1 |
| copy-20261120.md | 5 | 1 | 2 | 2 |
| queries-supabase-20261120.md | 5 | 0 | 1 | 4 |
| analitica-20261120.md | 5 | 1 | 2 | 2 |
| navegacion-global-20261120.md | 5 | 2 | 2 | 1 |
| funnel-contacto-tutor-20261120.md | 4 | 1 | 2 | 1 |
| correos-visual-20261120.md | 5 | 1 | 2 | 2 |
| a11y-mobile-20261120.md | 5 | 2 | 2 | 1 |
| funnel-registro-proveedor-20261120.md | 4 | 1 | 2 | 1 |
| benchmarks-marketplaces-20261120.md (análisis) | 5 | 0 | 1 | 4 |
| costos-operacionales-20261120.md (análisis) | 5 | 1 | 2 | 2 |
| user-journeys-20261120.md (análisis) | 4 | 0 | 2 | 2 |
| competencia-chile-20261120.md (análisis) | 5 | 0 | 2 | 3 |
| **TOTAL** | **70** | **11** | **26** | **29** |

> Nota: los totales de D-items por doc suman 70 porque hay 14 documentos, no 12. Corregí en la enumeración individual.

**11 decisiones Prio A — gating para campañas pagadas**. Son las que hay que resolver en los próximos 3-4 días (antes del lanzamiento del 25-11).

---

## Prio A — gating pre-campañas (11)

Cada ítem nombra: docto · header · recomendación corta del auditor · esfuerzo estimado si el PO dice "GO".

| # | Documento | D-item | Recomendación auditor | Esfuerzo |
|---|---|---|---|---|
| 1 | search-console | D1. Setup Search Console si no está verificado | Sí, hacerlo ya. Sin esto no hay data orgánica cuando lleguen users. | 15 min PO |
| 2 | copy | D1. Fixes C-1 a C-5 pre-campañas | Sí, ejecutar bundle en un PR. Fixes de tono + taxonomía RESERVA. | 1-2h |
| 3 | analitica | D1. Sprint de instrumentación pre-campañas | Sí, tracking de 4 KEY_EVENTS (`contacto_iniciado`, `reserva_confirmada`, `registro_proveedor`, `reserva_finalizada`). | 3-4h |
| 4 | navegacion-global | D1. Top 5 fixes pre-campañas | Sí. Mix: links rotos Footer (✅ cerrado #129), copy del Header, dropdown dropdown "Categorías". | 2-3h |
| 5 | navegacion-global | D5. CTA primary en Header — "Soy tutor" vs "Explora servicios" | Default "Explora servicios". Una decisión de 30 seg del PO. | 15 min |
| 6 | funnel-contacto-tutor | D1. Prioridad top 3 fixes pre-campañas | Sí, los 3 primeros fixes del docto (F-V, F-R, F-C) — ganan >15% conversion. | 2-3h |
| 7 | correos-visual | D1. Ejecutar top 5 fixes visuales pre-campañas | Sí, los 5 tocan emails críticos (bienvenida + confirmación reserva + recordatorio). | 2-3h |
| 8 | a11y-mobile | D1. Top 6 fixes mobile pre-campañas | Sí. Mobile es ~70% del tráfico esperado desde ads. Sin estos fixes, friction visible. | 3-4h |
| 9 | a11y-mobile | D2. Test mobile real en iPhone + Android | Sí. 1h del PO con 2 dispositivos cubre lo que no detecta DevTools. | 1h PO |
| 10 | funnel-registro-proveedor | D1. Priorizar top 3 fixes pre-campañas | Sí, mismo patrón que funnel-contacto. Fixes al wizard + login. | 2-3h |
| 11 | costos-operacionales | D4. Alertas de billing | Sí. Configurar antes de que las campañas disparen tráfico y por ende costos Vercel/Supabase. | 30 min |

**Esfuerzo total Prio A** (si el PO autoriza todos): ~20-25h de auditor + 2-3h del PO. Cabe en 2-3 días pre-launch si se arrancan ya.

---

## Prio B — pre-campañas idealmente, no bloqueante (26)

Decisiones que elevarían la calidad del lanzamiento si entran, pero no lo bloquean. Agrupadas por doc.

### seguridad (2 de 5)
- **D1. Sprint de seguridad consolidado pre-campañas** — mix de todos los Ss pendientes. Auditor recomienda cerrar los más visibles (S-P2 nombre email, S-A1 signOut scope local). Esfuerzo 1h.
- **D2. S-P2 — Nombre completo en subject email al proveedor** — decisión de producto (más engagement vs posible abuso spam-profiling). Default: mantener como está. 30 min decisión.

### search-console (2 de 4)
- **D2. Exportar datos últimos 90 días** — baseline de keywords antes del lanzamiento. 15 min PO.
- **D3. Cadencia monitoreo** — semanal durante primer mes. Decisión del PO.

### copy (2 de 5)
- **D2. Rewording C-5 — "Sin comisión por conectar"** — decisión de producto (promesa vs prudencia legal). 15 min.
- **D3. Taxonomía "solicitud" vs "reserva" en emails** — queda en BACKLOG `EMAIL-TAXONOMIA-RESERVA` ya listado. Refuerzo acá.

### queries-supabase (1 de 5)
- **D1. Aplicar los 7 índices pre-campañas** — marginal ganancia. Auditor recomienda post-launch (bajo volumen no justifica hoy).

### analitica (2 de 5)
- **D2. Custom dimensions en dashboard GA4** — sí, parte del sprint instrumentación.
- **D3. Audiences custom pre-campañas** — sí, útil para Google Ads targeting.

### navegacion-global (2 de 5)
- **D3. Verificar páginas legales existen** — 15 min check PO.
- **D4. Franja "Estamos construyendo" — remover o reemplazar** — default remover. 30 min fix.

### funnel-contacto-tutor (2 de 4)
- **D2. H8 (invitado) — sí/no/depende** — decisión producto si tutor invitado puede ver reservas sin login (default: no).
- **D3. Preguntas por tracking adicional** — ligado al sprint analitica.

### correos-visual (2 de 5)
- **D2. Pasada visual real post-fixes** — 1h PO con Litmus/mailtrap.
- **D3. Componente shared `_EmailFooter.tsx` + `_EmailButton.tsx`** — refactor, 2-3h.

### a11y-mobile (2 de 5)
- **D5. Specs e2e mobile recurrentes** — ampliar grid Playwright. 2h.
- **D4. Safe area env() legacy browsers** — fix defensivo de 30 min.

### funnel-registro-proveedor (2 de 4)
- **D2. Campaña de re-engagement a los 25 no-confirmados** — sí si llega a 50+ no-confirmados; hoy marginal.
- **D4. Instrumentación GA4 por step del wizard** — parte del sprint analitica.

### costos-operacionales (2 de 5)
- **D1. Validar costos reales vs estimación** — 30 min PO.
- **D2. Setup tracking costos recurrente** — spreadsheet mensual + alertas — 1h.

### user-journeys (2 de 4)
- **D1. Validar personas con usuarios reales** — entrevistas / focus group. Post-100 usuarios.
- **D2. Métricas adicionales GA4 por persona** — sí, parte del sprint analitica.

### benchmarks-marketplaces (1 de 5)
- **D3. Prioridad top 5 features a adoptar** — decisión producto de alto impacto. Esfuerzo bajo (lectura doc + ranking).

### competencia-chile (2 de 5)
- **D1. Prioridad O1 (gatos) vs O3 (proveedor-friendly)** — decisión producto estratégica.
- **D2. Monitoreo competencia mensual** — 1h/mes.

---

## Prio C — post-launch / BACKLOG (29)

Decisiones donde el auditor explícitamente dijo "post-launch" o "default: queda como deuda". Ya están cubiertas por el flujo BACKLOG — se moverán a sprints dedicados cuando haya ventana.

Lista corta (agrupada):
- **seguridad**: D3 (2FA admin), D4 (CSP nonces), D5 (rotación secrets) — todos post-launch.
- **search-console**: D4 (alineación blog) — post-launch.
- **copy**: D4 (voice & tone guide formal), D5 (ErrorBoundary copy) — post-launch.
- **queries-supabase**: D2 (pg_stat_statements), D3 (vista materializada catálogo), D4 (autovacuum), D5 (monitoring semanal) — todos post-launch.
- **analitica**: D4 (Google Ads integration), D5 (exclusion list PO) — en mezcla con decisión de campañas.
- **navegacion-global**: D2 (dropdown Servicios/Categorías) — decisión UX post-launch.
- **funnel-contacto-tutor**: D4 (email recordatorio) — post sprint reseñas.
- **correos-visual**: D4 (migrar 3 HTML inline a React Email), D5 (branching rol WelcomeEmail) — refactor post-launch.
- **a11y-mobile**: D3 (mobile-first redesign ServiceFormModal) — refactor grande post-launch.
- **funnel-registro-proveedor**: D3 (baseline semanal funnel) — rutina post-launch.
- **costos-operacionales**: D3 (downgrade preventivo), D5 (herramientas planificadas) — reactivo post-volumen.
- **user-journeys**: D3 (top 5 fixes por journey), D4 (cuarta persona) — post-launch.
- **benchmarks**: D1 (confirmar Wayni/LinkerPet), D2 (GoNanny análisis), D4 (posicionamiento vs DOGIN), D5 (análisis profundo DOGIN) — investigación continua.
- **competencia**: D3 (partnership DOGIN), D4 (barrera salida proveedores), D5 (alerting Oliver Pets) — monitoreo + decisiones estratégicas sin urgencia.

---

## Recomendación al PO

**Acción 1 (hoy domingo 22-11)**: el PO revisa los 11 ítems Prio A → responde GO/NO-GO por cada uno (30-45 min de lectura). El auditor puede empezar ejecución inmediata para los que lleguen GO.

**Acción 2 (lunes AM)**: el PO revisa Prio B → selecciona 3-5 ítems para meter en el batch pre-campañas de la semana (acompañando a los Prio A).

**Acción 3 (post-launch)**: Prio C se mueve a BACKLOG.md en una sola pasada (sprint docs chico). Cero decisión pendiente queda en limbo — cada ítem tiene dueño, prioridad y sprint target.

**Antídoto operativo propuesto**: cuando el auditor escriba `### D[N]. ...` en un doc, obligar a que en ese mismo docto quede explicitado "**Prio propuesta por auditor**: A/B/C" + el ítem se registre automáticamente en una tabla al cierre del doc. Evita que las decisiones se olviden al cambiar de sprint.

---

## Firma

Este documento consolida las decisiones pendientes del PO del viernes 2026-11-20 (día de auditorías en masa pre-lanzamiento) para que ninguna se pierda al cambiar de sprint. **El trabajo del lunes al viernes pre-launch puede arrancar directo desde la lista Prio A** — el auditor espera GOs del PO para cada fila.
