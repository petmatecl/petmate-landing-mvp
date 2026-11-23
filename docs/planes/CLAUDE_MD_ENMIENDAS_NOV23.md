# CLAUDE.md enmiendas propuestas — jornada 2026-11-23

Written for: el PO (Aldo). **Borrador de propuesta**, zero aplicación. Cada enmienda abajo captura una regla operativa nueva o un patrón diagnostico que aterrizó durante la jornada 2026-11-23 y aún no está en `CLAUDE.md`. El PO revisa el borrador y decide cuáles mergear a `CLAUDE.md` en un 2do PR dedicado.

**Fuente primaria**: `docs/bitacora/incidentes-20261123.md` + `docs/planes/ci-flakes-acumulados.md`. Las reglas abajo son destilación operativa de esas evidencias.

---

## Enmienda 1 — Patrón AUTH-TOKEN-PERSIST documentado explícitamente con 3 manifestaciones

### Contexto

CLAUDE.md actualmente menciona AUTH-TOKEN-PERSIST en la regla temporal P11 (2026-11-13 extendida 2026-11-19) pero no desarrolla el patrón ni distingue sus manifestaciones. Durante la jornada 2026-11-23 aparecieron 3 manifestaciones distintas con fix específico cada una. Documentarlas como patrón canónico + trigger para la 4ª.

### Regla propuesta

**Patrón AUTH-TOKEN-PERSIST (session stale cache cross-fixture)**: cuando la sesión server-side del rol autenticado en e2e es revocada mid-run (p.ej. signOut global humano, rotación refresh_token, rate-limit del endpoint `/auth/v1/token`), el fallback de re-login con password del fixture puede dejar un cliente con `accessToken` nuevo cuya sesión server-side aún no está consistente para el próximo query. Resultado: `.single()` / `.insert().select().single()` devuelve `{data: null, error: null}` (silent-null). El fixture rompe con mensaje genérico ("INSERT/SELECT falló: sin data").

**3 manifestaciones documentadas**:

- **3a — INSERT silent-null**: `crearServicioEfimero` / `crearServicioCuidadoConF2`. Fix: `invalidateRoleCache(role)` + retry fresh UNA vez. Aterrizado en PR #170.
- **3b — SELECT silent-null en resolvedores**: `getProveedorId` / `getTutorId` tras `auth.getUser(accessToken)`. Fix: helper interno `resolveProfileId(role, table)` con mismo patrón retry. Aterrizado en PR #171.
- **3c — setup auth `waitForTokenInStorage returned=false`**: el token no llega a localStorage post-login dentro de 10s + cascada `storageState no existe`. Mitigación: regla temporal P11 rerun autónomo único. Fix estructural pendiente post-freeze.

**Trigger para 4ª manifestación**: si el patrón aparece en una 4ª superficie distinta (NO INSERT, NO SELECT en resolvedores, NO setup waitForToken), en próximos 7 días → **escalar a fix estructural** (rediseño cliente Supabase e2e para detectar silent-null universal desde capa base, wrapper que intercepte `.insert() / .update() / .select().single()` + `invalidateRoleCache` + retry desde esa capa). Alcance ~2-3h código + testing. Beneficio: elimina necesidad de parchar fixtures caso a caso.

### Texto propuesto para pegar en CLAUDE.md

Agregar en sección `## Database migrations` o crear sección nueva `## E2E fixtures y silent-null`:

```markdown
### Patrón AUTH-TOKEN-PERSIST — session stale cache en e2e

Sintoma canónico: `.single()` / `.insert().select().single()` del cliente Supabase e2e devuelve `{data: null, error: null}` tras un re-login exitoso por password. Resultado: fixture rompe con "INSERT/SELECT falló: sin data".

Causa raíz: la sesión server-side fue revocada entre el `signInWithPassword` OK y la query siguiente (race transient del refresh token). RLS policy pasa WITH CHECK pero RETURNING devuelve 0 filas por sesión inconsistente.

3 manifestaciones conocidas (fix específico cada una):
- **3a INSERT silent-null** (fixture `servicio-efimero` + `servicio-cuidado-listo`): fix `invalidateRoleCache(role)` + retry fresh UNA vez. PR #170 commit `6664218c`.
- **3b SELECT silent-null en resolvedores** (`getProveedorId` / `getTutorId`): helper interno `resolveProfileId` con mismo patrón retry. PR #171 commit `cd590651`.
- **3c setup `waitForTokenInStorage returned=false`**: regla temporal rerun autónomo P11 iter único hasta freeze 2026-11-24 16:00 CLT. Post-freeze, sprint FIX-SETUP-AUTH-WAITFORTOKEN ~1h.

**4ª superficie distinta → fix estructural**: rediseñar cliente Supabase e2e con wrapper que detecte silent-null universal desde capa base (`.insert()`, `.update()`, `.select().single()`). Evita parchar caso a caso. Alcance ~2-3h.
```

### Trigger

Al detectar la 4ª manifestación (cualquier query Supabase e2e con `data=null, error=null` fuera de las 3 ya cubiertas).

---

## Enmienda 2 — Regla "slips post-concurrency-guard clase separada" (temporal)

### Contexto

El concurrency-guard activado en PR #168 (merge `1d33f54`) cambió el comportamiento de la cola cross-PR contra Supabase staging. Slips operativos post-guard (push durante CI, scope creep, etc.) pueden parecer nueva clase vs slips pre-guard que tenían contexto distinto. El PO definió en dispatch 2026-11-23 que estos slips post-guard cuentan como clase separada **mientras el guard esté en validación**.

### Regla propuesta

**Slips operativos post-concurrency-guard cuentan como clase separada mientras el guard esté en validación (ventana ≤48h sin reaparición de Clase B Contención cross-PR)**. No gatillan el trigger de 3er slip del patrón pre-guard. Vence cuando se confirmen 48h continuas sin reaparición de Clase B (ventana estimada: 2026-11-25 ~16:00 CLT).

Al vencer: slips post-guard se re-integran al conteo normal del patrón único.

### Texto propuesto para pegar en CLAUDE.md

Agregar bajo `## Bitácora de slips/incidentes` (o sección equivalente):

```markdown
**Clase separada temporal: slips post-concurrency-guard (vence 2026-11-25 16:00 CLT ó al confirmar 48h sin Clase B)**: durante la ventana de validación del concurrency-guard activado PR #168 (merge `1d33f54`), slips operativos post-guard (push durante CI, scope creep, etc.) cuentan como clase separada vs slips pre-guard. NO gatillan trigger 3er slip del patrón pre-guard. Vence al confirmar 48h continuas sin reaparición de Clase B (Contención cross-PR Supabase staging). Post-vencimiento, slips se re-integran al conteo normal.
```

### Trigger de vencimiento

- Ventana 48h post-merge `1d33f54` sin reaparición de Clase B → vence regla + slips post-guard re-integran.
- Si Clase B reaparece dentro de la ventana → extender validación otras 48h.

---

## Enmienda 3 — Práctica "comunicación duplicada Telegram + VS Code"

### Contexto

Durante la jornada 2026-11-23 el PO estableció regla operativa: toda notificación por Telegram se duplica textualmente en el chat VS Code en el mismo turno. Motivo: PO lee Telegram desde móvil (notificación rápida) + necesita texto completo accesible desde VS Code para copy-paste sin fricción al coordinator.

### Regla propuesta

Toda ejecución de `gh workflow run notify-telegram-po.yml` del auditor se duplica **textualmente** en la respuesta del chat VS Code en el mismo turno. Formato: mismo contenido entre canales, cero cambios. Si el mensaje supera cap Telegram 4096 chars → partirlo en varios dispatches pero mantener paridad con VS Code.

### Texto propuesto para pegar en CLAUDE.md

Agregar bajo `## Convenciones de código` o sección operativa equivalente:

```markdown
**Comunicación auditor → PO duplicada Telegram + VS Code — REGLA OPERATIVA (no P-numerada, 2026-11-23)**: toda ejecución de `gh workflow run notify-telegram-po.yml` se duplica textualmente en el chat VS Code en el mismo turno. Motivo: el PO lee Telegram desde móvil (notificación rápida) pero necesita el texto completo accesible desde VS Code para copy-paste sin fricción al coordinator. Formato: mismo contenido entre canales, cero cambios. Si el mensaje excede 3500 chars (cap del workflow) → partirlo en varios dispatches pero mantener paridad con VS Code. Aplica a los 4 urgency: info, update, decision, alert.
```

### Trigger

Permanente desde 2026-11-23. Aplica a cualquier dispatch Telegram por el auditor.

---

## Enmienda 4 — Práctica "cola continua post-chain (zero pausa esperando PO)"

### Contexto

Durante la jornada 2026-11-23 el PO estableció: después de cerrar un chain de PRs (merges secuenciales), el auditor NO pausa esperando GO del PO. Procede con cola continua: items paralelos pendientes → ítem siguiente del backlog priorizado → housekeeping (con límites) → documentación interna faltante.

### Regla propuesta

Post-cierre de chain activo o batch de PRs, el auditor continúa autónomo con:
1. **Items paralelos pendientes** del dispatch anterior si aplica.
2. **Siguiente ítem del BACKLOG priorizado** (Sprints Pre-Campañas tiene prioridad hasta 100 proveedores).
3. **Housekeeping limitado**: zero borrado branches sin GO adicional caso a caso; inventario propuesta en VS Code para GO PO.
4. **Documentación interna**: inventario + propuesta en VS Code para GO PO.

**Cambio de nivel reportado con 1 línea Telegram `urgency=info`** cuando se pasa de chain → cola paralela → backlog → housekeeping.

El PO desbloquea decisiones cuando esté disponible. El auditor no se detiene esperándolo.

### Texto propuesto para pegar en CLAUDE.md

Agregar bajo `## Workflow`:

```markdown
**Cola continua autónoma post-chain — REGLA OPERATIVA (no P-numerada, 2026-11-23)**: post-cierre de un chain de PRs o batch autónomo, el auditor NO pausa esperando GO del PO. Procede con cola continua en orden: (1) items paralelos pendientes del dispatch anterior, (2) siguiente ítem del BACKLOG priorizado (Sprints Pre-Campañas tiene prioridad hasta meta 100 proveedores), (3) housekeeping limitado (zero borrado branches sin GO adicional caso a caso; inventario propuesta en VS Code para GO PO), (4) documentación interna faltante (inventario + propuesta en VS Code para GO PO). Cambio de nivel reportado con 1 línea Telegram `urgency=info` cuando se pasa de chain → cola paralela → backlog → housekeeping. El PO desbloquea decisiones cuando esté disponible; el auditor no se detiene esperándolo.
```

### Trigger

Permanente desde 2026-11-23. Aplica a toda jornada operativa.

---

## Enmienda 5 — Protocolo "cuando un spec que el PR MODIFICA falla → hipótesis regresión del patch, no flake"

### Contexto

Durante diagnóstico de #166 (patch `locatorDiaPicker` firma Date), el auditor clasificó inicialmente los fails como "flake pre-existente" porque los 2 specs sí pasaban verde en 6 runs previos del helper number legacy. Correcto reclasificar tras ver el locator exacto en el log: el aria-label que el patch construye NO matchea el real del runtime. Patch introdujo el mismatch.

### Regla propuesta

**Protocolo de diagnóstico CI**: cuando un spec que el PR MODIFICA falla, priorizar hipótesis "regresión del patch" sobre "flake transient" hasta descartar con evidencia del locator/selector exacto del log. El historial verde pre-patch del spec NO es suficiente para descartar regresión — solo confirma que antes del patch funcionaba. El patch pudo haber introducido el mismatch.

### Texto propuesto para pegar en CLAUDE.md

Agregar bajo `## Convenciones de código` o sección diagnóstico CI:

```markdown
**Spec que el PR MODIFICA falla → hipótesis regresión del patch, NO flake — REGLA OPERATIVA (no P-numerada, 2026-11-23)**: cuando un spec específicamente modificado por el patch del PR falla en CI, priorizar hipótesis "regresión del patch" sobre "flake transient" hasta descartar con evidencia del locator/selector exacto del log. El historial verde pre-patch del spec NO basta para descartar regresión — solo confirma pre-patch. El patch pudo haber introducido el mismatch (selector cambiado, firma de helper cambiada, aria-label distinto al esperado). Si el fail se reproduce en reruns consecutivos sobre los mismos specs modificados, reclasificar como regresión real inmediatamente — cero más reruns. Incidente origen: PR #166 f2-pick-helper, patch `locatorDiaPicker` Date mismatch con aria-label runtime de react-day-picker.
```

### Trigger

Permanente desde 2026-11-23. Aplica a diagnóstico CI de PRs con fails.

---

## Procedimiento sugerido para el PO

1. Revisar las 5 enmiendas arriba.
2. Decidir cuáles entran a CLAUDE.md sin cambios.
3. Decidir cuáles necesitan ajuste de wording antes de entrar (el borrador es propuesta, no final).
4. Decidir cuáles descartar (si alguna no sirve en el long run).
5. Aterrizar las aprobadas en un 2do PR `claude-md-enmiendas` con las ediciones específicas sobre `CLAUDE.md`.

El auditor queda en espera de ese GO. Zero aterrizaje autónomo a `CLAUDE.md`.

---

## Trazabilidad

- Fuente primaria: [`docs/bitacora/incidentes-20261123.md`](../bitacora/incidentes-20261123.md).
- Fuente secundaria: [`docs/planes/ci-flakes-acumulados.md`](ci-flakes-acumulados.md).
- PRs del día que motivan las enmiendas: #168 (concurrency-guard), #170 (invalidateRoleCache + 3a), #171 (resolveProfileId + 3b), #166 (regresión patch — escalado).
- Rama borrador: `claude-md-nov23`.

Zero modificación a `CLAUDE.md` en este PR. Solo borrador. Aplicación depende de GO PO en PR dedicado posterior.
