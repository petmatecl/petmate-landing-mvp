# CI-CONCURRENCY-E2E — investigación técnica de 4 opciones de fix (2026-11-23)

Written for: el PO (Aldo), como input para decidir el enfoque del sprint cuando se arranque el ítem BACKLOG `CI-CONCURRENCY-E2E` (sección Infraestructura y CI). **Zero implementación en este PR** — solo análisis.

**Escenario a resolver**: fail por contención cross-PR sobre Supabase staging BD cuando varios runs simultáneos de `e2e-error-audit` tocan fixtures compartidos (F2-2b editor, F2-3 reservas, chat conversations, favoritos). Evidencia canónica: episodio #151 pwd-meter sync main (3 fails F2 con 3/3 verdes previos + 6 runs cross-PR en ventana de 12 min).

---

## Estado actual del sistema

**Lo que ya está** (sprint L1-1 2026-09-09):
- `concurrency: group: e2e-staging` + `cancel-in-progress: false` en el workflow `e2e-error-audit.yml`. Serializa runs cross-PR del mismo workflow contra Supabase staging.
- Resultado: solo 1 run `e2e-error-audit` corre a la vez. Los demás quedan queued.

**Lo que NO cubre** (y por qué el bug persiste):
- El grupo serializa el workflow entero pero NO aísla fixtures entre runs. Al terminar el run A, el cleanup (`afterAll`) puede dejar estado residual en staging (fixtures huérfanas, favoritos no borrados, blackouts en edición). El run B arranca sobre ese estado residual y rompe assertions.
- Specs del editor F2-2b (`s2-preview-noches`, `s5-validaciones-blackouts`, `s9-legacy-oculto`) son particularmente sensibles porque dependen del estado del servicio Camila + blackouts + toggles F1/F2 — mutaciones de otro PR pueden dejar el servicio en estado inesperado.

**Hipótesis complementaria**: workflows paralelos de OTROS workflows que también tocan staging (`visual-update-snapshots`, `smoke-auth-templates`, el futuro smoke si se agrega staging target) pueden correr en paralelo con el `e2e-error-audit` porque cada uno tiene su propio concurrency group — sin cordón sanitario cross-workflow.

---

## 4 opciones de fix evaluadas

### Opción A — Concurrency group estricto por workflow Playwright con `cancel-in-progress: true`

**Idea**: cambiar `cancel-in-progress: false` → `true` en el workflow `e2e-error-audit.yml`. El run nuevo cancela el in_progress → cero overlap temporal en staging.

**Pros**:
- Fix de **1 línea**. Zero refactor de specs ni fixtures.
- Garantiza aislamiento temporal total: solo 1 run corriendo contra staging en cualquier momento.
- Reversible instantáneo si rompe algo.

**Contras**:
- **Cancelación destructiva del cleanup**: si el run A está en medio del `afterAll` (borrando fixtures efímeros) y el run B lo cancela, quedan fixtures huérfanas en staging. Peor que el estado actual porque el `_cleanup` nunca completa.
- **Pérdida de señal para PRs concurrentes**: un push al PR A dispara CI, push al PR B 30s después cancela el A → el autor de A nunca ve su CI completo hasta que push de nuevo. Fricción en ciclos de review activos (varias personas pusheando a distintos PRs cuasi-simultáneo).
- No resuelve contaminación de staging acumulada (si el run cancelado dejó fixtures huérfanas, el próximo las encuentra).

**Esfuerzo técnico**: 5 minutos (cambio de 1 línea + PR).

**Recomendación técnica**: **DESCARTAR**. El trade-off es peor — resuelve overlap pero introduce fixtures huérfanas garantizadas por cada cancel.

---

### Opción B — Seeding idempotente de fixtures por run

**Idea**: cada spec `beforeAll` crea su propio servicio F2-2b único (nombre suffix con `run_id` + random). Cero reuso cross-run. `afterAll` solo borra lo que ese run creó.

**Pros**:
- **Aislamiento real**: 2 runs concurrentes crean fixtures distintos, zero overlap.
- `afterAll` idempotente: si falla cleanup, el próximo run no se ve afectado porque trabaja con sus propios UUIDs.
- Ayuda al debugging: al ver fixtures huérfanas en staging, se puede identificar el run que las dejó.
- Soluciona también la contaminación residual del pasado (nuevos runs no la tocan).

**Contras**:
- **Esfuerzo alto**: refactor de ~5-8 specs F2-2b + helper compartido `createRunFixtureServicio()` + ajustes de `afterAll` para solo borrar sus propios IDs.
- **Staging crece**: fixtures huérfanas de runs fallidos se acumulan. Requiere un cron de limpieza complementario (ya existe `cleanup-staging-e2e.yml`, pero habría que extender su scope a los fixtures nuevos).
- Puede exigir cambios en el schema de `servicios_publicados` si el nombre único causa colisiones de UNIQUE.
- Riesgo de regresión durante el refactor (tocar 5-8 specs activos).

**Esfuerzo técnico**: ~1-2 días (refactor + testing + extender cleanup cron).

**Recomendación técnica**: **CANDIDATO FUERTE**. Resuelve la causa raíz. Costo moderado + ganancia permanente.

---

### Opción C — Staging dedicado per PR (Supabase branching)

**Idea**: cada PR levanta un proyecto Supabase ephemeral (branch de Supabase). El workflow apunta a la URL del branch del PR. Cero overlap porque cada PR tiene su propia BD.

**Pros**:
- **Aislamiento total y real**: cada PR es su propio sandbox, cero contención posible.
- Soluciona también otros problemas latentes: tests de migrations pueden correr sin afectar main staging, data seed per PR, etc.
- Alineado con mejor práctica de la industria para proyectos con alta velocidad de PRs.

**Contras**:
- **Costo monetario alto**: Supabase branching está en el plan Pro ($25/mes por proyecto activo) y cada branch cuenta como proyecto. 10 PRs abiertos = 10 proyectos efímeros = costo variable alto.
- **Esfuerzo técnico muy alto**: workflow debe (a) crear branch Supabase al abrir PR vía API, (b) migrar schema automáticamente, (c) seed data base, (d) pasar URL dinámica a Playwright, (e) destruir branch al cerrar PR. Requiere Supabase CLI + scripts custom + webhook GitHub → Supabase.
- **Tiempo de warmup**: cada CI run tiene que esperar que el branch Supabase esté listo (~1-2 min extra por run).
- **Data seed**: cada branch arranca desde cero → fixture setup tarda porque no hay data ambiental. Specs tardan más.

**Esfuerzo técnico**: ~3-5 días (scripts de branching + workflow glue + testing) + evaluación del plan Supabase para capacidad.

**Recomendación técnica**: **DEFER a post-launch**. Es el fix más robusto pero el ROI no justifica hoy con el volumen de PRs actual (~5-10/semana). Reconsiderar cuando el equipo pase de 1-2 devs activos a 3+ con alta tasa de PRs concurrentes.

---

### Opción D — Cola FIFO estricta cross-workflow (concurrency group global sobre staging)

**Idea**: todos los workflows que tocan staging comparten UN concurrency group global (`staging-exclusive`). Solo 1 workflow corre contra staging a la vez, independiente de qué workflow sea.

**Pros**:
- **Aislamiento temporal cross-workflow**: ni siquiera `visual-update-snapshots` ni `smoke-auth-templates` corren en paralelo con `e2e-error-audit`.
- **Fix de bajo costo**: cambiar `group: e2e-staging` → `group: staging-exclusive` en 2-3 workflows.
- `cancel-in-progress: false` preservado → zero cancel destructivo.

**Contras**:
- **CI más lento**: PRs esperan más en cola cuando hay varios workflows activos simultáneo. En ventanas de alta actividad (desfile de merges), pueden ser 20-30 min de espera extra por PR.
- No resuelve contaminación residual: si el workflow A deja fixtures huérfanas, el B las encuentra igual (misma BD).
- Solo cubre contención temporal, no la raíz (fixtures compartidos).

**Esfuerzo técnico**: 15-30 min (cambio en 2-3 workflows + verificar no romper nada).

**Recomendación técnica**: **FIX INTERINO**. Reduce la frecuencia del bug sin resolverlo. Útil como mitigación mientras se implementa B. Pero no es solución permanente.

---

## Matriz comparativa

| Opción | Esfuerzo | Costo $ | Resuelve causa raíz | Introduce problema nuevo | Reversible |
|--------|----------|---------|---------------------|--------------------------|------------|
| A — cancel-in-progress true | 5 min | $0 | NO | Sí (fixtures huérfanas garantizadas) | Trivial |
| B — Seeding idempotente | 1-2 días | $0 | SÍ | Riesgo refactor | Difícil (atraviesa muchos files) |
| C — Staging per PR | 3-5 días | $25-250/mes | SÍ | Operativo nuevo + latencia | Media |
| D — Group global | 15-30 min | $0 | NO (reduce freq) | CI más lento en picos | Trivial |

---

## Recomendación técnica consolidada

**Plan en 2 fases**:

### Fase 1 — INTERIM (semana 2026-11-24 si el PO aprueba)
- Aplicar **Opción D** (grupo global `staging-exclusive` cross-workflow).
- 15-30 min de trabajo + PR docs-only para doc.
- Reduce frecuencia del bug a casi cero en el corto plazo sin tocar specs.
- Mientras, monitoreo del episodio: ¿sigue apareciendo? ¿con qué frecuencia?

### Fase 2 — PERMANENTE (sprint 2027-Q1 si el bug recurre o si el volumen crece)
- Aplicar **Opción B** (seeding idempotente).
- 1-2 días de trabajo + testing cuidadoso en 3-4 iteraciones.
- Trigger: >3 episodios registrados de `CI-CONCURRENCY-E2E` en un mes post-Fase 1, O escala del equipo a 3+ devs activos.

**NO recomiendo** la Opción C (staging per PR) hasta que el volumen justifique el costo monetario y operativo. **NO recomiendo** la Opción A nunca — el trade-off es malo.

---

## Decisión del PO

Opciones a decidir:
- **D1** — ¿Autorizás Fase 1 (Opción D grupo global) en sprint propio esta semana? Esfuerzo ~30 min + verificación.
- **D2** — ¿Preferís saltar directo a Fase 2 (Opción B seeding) sin pasar por D? Esfuerzo mayor pero resuelve raíz.
- **D3** — ¿O preferís esperar más episodios antes de actuar (mantener rerun manual como mitigación)? El ítem queda en BACKLOG sin fecha.

**Si no respondes explícito**, recomendación default = **D1** (Fase 1 interim) porque el costo es trivial + el beneficio inmediato + el estado "sin acción" ya costó 1 episodio esta semana.

---

## Trazabilidad

- **Ítem BACKLOG**: `CI-CONCURRENCY-E2E` en `BACKLOG.md > Infraestructura y CI` (creado en PR #157 2026-11-23).
- **Evidencia del episodio origen**: PR #151 pwd-meter, run `45076095233` 2026-11-22 ~22:09 UTC, 3 fails F2-2b con 3/3 history verde + 6+ runs cross-PR concurrentes.
- **Bitácora de slips** (contexto operativo): `docs/bitacora/auditor-slips.md` entry 2026-11-22 ~19:10.

Zero implementación en este PR. Solo análisis + recomendación para el PO.
