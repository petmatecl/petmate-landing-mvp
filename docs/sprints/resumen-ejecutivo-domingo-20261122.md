# Resumen ejecutivo — domingo 2026-11-22

Written for: el PO (Aldo), para lectura rápida de 10 minutos el lunes AM. Consolida los 16 docs producidos en la jornada autónoma de domingo (tandas A y B del prompt denso 2026-11-22). Objetivo: saber qué atacar primero sin leer los 16 docs individuales.

**Jornada**: 7 horas autónomas, 2 tandas (A1-A10 + B1-B10 = 20 tareas asignadas).
**Resultado**: 4 PRs mergeados (#141, #143, #137, #144), 2 PRs código abiertos esperando GO lunes PM (#140, #142), 16 docs nuevos en main, 19/20 tareas completas + 1 parcial (A5 PSI rate-limited).

---

## 1. Los 16 docs producidos (nombre + 1 línea)

### Tanda A (6 docs, mergeados vía #143 — SHA `b409f6f`)

| # | Doc | Contenido en 1 línea |
|---|-----|---------------------|
| A5 | [`docs/auditorias/perf-post-fixes-20261122.md`](../auditorias/perf-post-fixes-20261122.md) | Lighthouse prod vs baseline: PSI daily rate limit → plan para PO con 3 opciones (CLI local, pagespeed.web.dev UI, defer). |
| A6 | [`docs/analisis/funnel-contacto-tutor-detalle-20261122.md`](../analisis/funnel-contacto-tutor-detalle-20261122.md) | Profundización funnel tutor→contacto: 15 micro-fricciones, 15 GA4 events faltantes, 4 KPIs norte, playbook T=0 a T+24h. |
| A7 | [`docs/auditorias/catalogo-actual-titulos-20261122.md`](../auditorias/catalogo-actual-titulos-20261122.md) | Audit 22 servicios activos prod: 6 con trailing spaces, 1 typo "PETTSITER", Unicode cursive en 1 título, mejoras concretas para 4 proveedores. |
| A8 | [`docs/analisis/referencias-contenido-rrss-20261122.md`](../analisis/referencias-contenido-rrss-20261122.md) | 9 cuentas referencia pet-tech LATAM, 5 formatos ganadores, plan 3 meses de cadencia realista. |
| A9 | [`docs/planes/calidad-primera-campana.md`](../planes/calidad-primera-campana.md) | Plan calidad primera campaña pagada: 4 fases, 4 sprints propuestos, playbook pings manuales, protocolo fast recovery. |
| A10 | [`docs/sprints/pendientes-sin-dueno-20261120.md`](./pendientes-sin-dueno-20261120.md) | 70 D-items sin dueño del viernes 2026-11-20 consolidados: 11 Prio A (gating), 26 Prio B, 29 Prio C. |

### Tanda B (10 docs, mergeados vía #144 — SHA `2024119`)

| # | Doc | Contenido en 1 línea |
|---|-----|---------------------|
| B1 | [`docs/auditorias/signup-tutor-20261122.md`](../auditorias/signup-tutor-20261122.md) | Audit signup tutor end-to-end: 22 fricciones + top 5 sprint TUTOR-FUNNEL-PRE-CAMPAÑA. |
| B2 | [`docs/auditorias/signup-proveedor-20261122.md`](../auditorias/signup-proveedor-20261122.md) | Audit signup proveedor completo: 16 fricciones del wizard multi-step + top 5 sprint PROVEEDOR-FUNNEL. |
| B3 | [`docs/auditorias/emails-transaccionales-detalle-20261122.md`](../auditorias/emails-transaccionales-detalle-20261122.md) | Audit 12 templates email: 7 emojis presentes, 2 sin Preview, fixes Tier 1/2/3 priorizados. |
| B4 | [`docs/planes/videos-rrss-2-semanas-20261122.md`](../planes/videos-rrss-2-semanas-20261122.md) | 5 videos propuestos para 2 semanas: Max (Nicole), 4 preguntas, Grooming (bloqueado por catálogo), Precios, Constanza. |
| B5 | [`docs/planes/instagram-feed-2-semanas-20261122.md`](../planes/instagram-feed-2-semanas-20261122.md) | Plan Instagram feed 2 semanas: 7 posts estáticos/carousel + hashtags + KPIs. |
| B6 | [`docs/analisis/competencia-tiktok-chile-20261122.md`](../analisis/competencia-tiktok-chile-20261122.md) | Análisis competencia TikTok Chile pet-tech: hallazgo meta — pet-tech CL SIN presencia TikTok relevante documentada. |
| B7 | [`docs/sprints/primera-semana-campanas-rutina-po.md`](./primera-semana-campanas-rutina-po.md) | Playbook día 1-7 campañas pagadas: rutina PO hora-por-hora + umbrales de acción + protocolo de incidentes. |
| B8 | [`docs/auditorias/explorar-para-trafico-pagado-20261122.md`](../auditorias/explorar-para-trafico-pagado-20261122.md) | Audit /explorar para tráfico pagado: 10 hallazgos + top 5 sprint EXPLORAR-PRE-CAMPAÑA. |
| B9 | [`docs/analisis/modelos-monetizacion-20261122.md`](../analisis/modelos-monetizacion-20261122.md) | Benchmark 5 marketplaces + propuesta híbrida 3 fases monetización. |
| B10 | [`docs/sprints/checklist-definitivo-pre-campanas.md`](./checklist-definitivo-pre-campanas.md) | Checklist pre-campañas consolidado: 67 items en 7 bloques (A-G), 30 pendientes. |

---

## 2. Top 5 decisiones pendientes del PO que impactan la semana

Priorizadas por bloqueo de campañas o desbloqueo de trabajo técnico inmediato.

### D1. Smoke visual + GO merge de #140 y #142 (lunes PM)

**Impacto**: desbloquea 2 fixes aterrizados. #140 cierra regresión real de layout admin (botones fuera de viewport 1280px); #142 cierra bug UX del badge feedback (badge no se limpiaba al abrir pestaña).

**Decisión esperada**: smoke manual en preview de ambos → GO merge → prod.

**Costo si posterga**: #140 es regresión real de código ya en prod; cada día que pasa es admin con UI rota. #142 es bug UX, menos urgente pero trivial.

### D2. Elegir 1 de 3 opciones para A5 Lighthouse Pro (lunes AM)

**Contexto**: PSI daily rate limit bloqueó WebFetch 5 veces → A5 quedó parcial.

**Opciones** (detalle en `docs/auditorias/perf-post-fixes-20261122.md`):
- **Opción A** — Lighthouse CLI local, 10 min lunes AM del PO (recomendada).
- **Opción B** — pagespeed.web.dev UI (3 min, menos preciso).
- **Opción C** — defer post-launch, usar Vercel Speed Insights.

**Impacto**: necesario para validar que los fixes CLS/LCP aterrizados en noviembre no se degradaron. Bloquea cierre del checklist B10 bloque E.

### D3. Budget diario campañas pagadas día 1 (previo a prender ads)

**Contexto**: B7 `primera-semana-campanas-rutina-po.md` D1 propone **arrancar con $15-20k/día por plataforma el día 1** (overkill protect) vs $30-50k según el plan macro.

**Decisión esperada**: PO confirma monto exacto antes de activar campañas.

**Impacto**: calibra riesgo del primer día. Overkill protect limita quema si algo rompe (ad creative mal aprobado, landing rota post-deploy, etc.). Si tus primeras métricas son buenas, escalar día 4-5.

### D4. GO para armar sprint consolidado pre-campañas desde B10

**Contexto**: B10 `checklist-definitivo-pre-campanas.md` listó **30 items rojos pendientes** en 7 bloques. Muchos cruzan con sprints propuestos en B1/B2/B8 (TUTOR-FUNNEL, PROVEEDOR-FUNNEL, EXPLORAR-PRE-CAMPAÑA).

**Decisión esperada**: ¿consolidamos en 1 sprint grande "pre-campañas" o 3 sprints temáticos chicos? Si grande → ~5 días de trabajo auditor. Si chicos → secuenciable martes/jueves/viernes.

**Impacto**: define cronograma técnico de las próximas 2 semanas. Bloquea prender campañas hasta que el checklist pase a ≥90% verde.

### D5. Contactar Nicole + Constanza para colab de videos RRSS (B4 D1)

**Contexto**: B4 `videos-rrss-2-semanas-20261122.md` propone Video 1 (Max, con Nicole Acevedo) + Video 5 (Constanza) usando 2 proveedoras activas reales en catálogo prod. Esfuerzo PO: 10 min contactarlas.

**Decisión esperada**: ¿PO autoriza contacto esta semana con mensaje template del doc?

**Impacto**: desbloquea producción de los 2 videos emocionales ancla de la estrategia RRSS Fase 1. Sin colab → Videos 1 y 5 quedan en standby → falta narrativa humana en el feed.

---

## 3. Top 5 hallazgos más importantes del día

### H1. First-mover window: pet-tech CL/LATAM sin presencia TikTok relevante (B6)

**Detalle**: investigación en 9+ cuentas candidatas → pet-tech Chile específicamente **sin presencia TikTok sostenida documentada**. Competidores grandes (Rover, Mascotapp, DogHero) tienen Instagram pero TikTok flojo o inexistente.

**Implicancia**: ventana de oportunidad para posicionarse como voz nativa en TikTok Chile pet-tech en los próximos 3-6 meses. Primer entrante serio se lleva el feed de recomendación del algoritmo.

**Acción propuesta**: priorizar TikTok en B5 Instagram feed (no tratarlo como "+1 plataforma", sino como canal principal).

### H2. 22 servicios activos prod con calidad de copy desigual (A7)

**Detalle**: audit real de catálogo prod via MCP supabase-prod-ro. Encontré:
- 6 títulos con trailing spaces (parecen bug de UI al escribir).
- 1 typo literal: "PETTSITER" en vez de "PET SITTER".
- 1 título con Unicode cursive (emojis/estilos no estándar).
- 4 proveedores reales con títulos mejorables por falta de keyword SEO.

**Implicancia**: con 22 servicios es manejable fix a mano. Si llegan 100 pre-campañas, no escalará sin editor interno.

**Acción propuesta**: fix a mano los 6 trailing + typo PETTSITER + Unicode cursive (15 min). Keyword SEO queda para sprint PROVEEDOR-CONTENIDO.

### H3. Emails transaccionales contienen 7 emojis (B3)

**Detalle**: audit de 12 templates React Email → 7 emojis sembrados en subjects, preview text y body. La regla **"NO emojis en UI"** de CLAUDE.md aplica a la web pero no es explícita sobre emails.

**Implicancia**: es una decisión de identidad visual pendiente. Los emojis en emails son convención mainstream (Resend/Loops/SendGrid los usan), pero rompen la coherencia visual con una web deliberadamente sin emojis.

**Acción propuesta**: decisión explícita del PO. Mi recomendación: **remover emojis para alinear con la identidad del producto** (web sin emojis → emails sin emojis = coherencia). Si se mantienen: documentar la excepción en CLAUDE.md para evitar debates futuros.

### H4. Signup tutor tiene 22 fricciones + 5 bloqueantes para campañas (B1)

**Detalle**: audit signup tutor end-to-end encontró 22 fricciones, de las cuales 5 son **bloqueantes para campañas pagadas**: (a) sin confirmación visual tras enviar formulario antes del redirect, (b) mensaje de error de email duplicado poco accionable, (c) sin indicación de "qué sigue" tras confirmar email, (d) "Olvidé mi contraseña" sin flujo pulido, (e) sin tracking GA4 de la caída entre paso 1 y confirmación email.

**Implicancia**: si la conversión visita→registro completo cae por abajo del 2% en campañas, las 5 bloqueantes son el primer sospechoso. Y no hay tracking para saber dónde se cae el funnel.

**Acción propuesta**: sprint TUTOR-FUNNEL-PRE-CAMPAÑA (~2 días) antes de prender ads de alta inversión. Top 5 ya detallados en el doc.

### H5. Checklist pre-campañas tiene 30 items rojos (B10)

**Detalle**: 67 items totales en 7 bloques (A infraestructura, B producto tutor, C producto proveedor, D emails, E performance, F analytics, G RRSS). 37 verdes, 30 rojos. Los 30 rojos incluyen:
- GA4 tracking funnel tutor (crítico).
- Página /mis-reservas rename + redirect definitivo.
- Email transaccional emojis decision.
- Catalog quality (los 6 trailing + typo arriba).
- Más 25 items distribuidos.

**Implicancia**: prender campañas hoy con 30 rojos = quemar budget sobre un funnel semi-roto. Cada rojo es dinero perdido en CPA inflado.

**Acción propuesta**: congelar fecha de arranque campañas hasta pasar los 30 a verde (o los 15 más críticos mínimo). Estimación conservadora: 2 semanas de trabajo técnico.

---

## 4. Recomendación lunes AM (1 línea)

**Revisa primero el checklist B10 (`docs/sprints/checklist-definitivo-pre-campanas.md`) + los top 5 de los audits B1/B2/B8** — eso te da en 20 min el panorama de cuántos días falta para campañas y en qué orden atacar; después smoke #140 + #142 rutinario y decisión budget D3.

---

## Firma

Jornada cerrada 2026-11-22 ~19:00 CLT tras 7 horas de autonomía. Todos los entregables en main; los 2 PRs código abiertos esperan smoke PO lunes PM. Cero acción pendiente del auditor hasta que respondas con GO o nuevas instrucciones.
