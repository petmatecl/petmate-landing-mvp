# Plan de rollback integral — lanzamiento 2026-11-25

**Audiencia**: PO + auditor · **Alcance**: incidentes post-GO del miércoles 2026-11-25 hasta T+48h. · **Autor**: auditor (2026-11-19 noche).
**Fuente heredada**: [docs/sprints/lanzamiento-20261125.md § Plan de reversión](../sprints/lanzamiento-20261125.md) nombra N1/N2/N3 sin desarrollar — este doc los desarrolla paso a paso con tiempos, criterios de disparo, responsables y comunicación por nivel.

> Regla general: **minimizar daño antes que recuperar funcionalidad**. Si el incidente afecta PII/RLS/pagos (nada de pagos aún, pero aplicaría), N1 es la primera línea; ante duda entre N1 y N2, escalar directo a N2. Nadie ejecuta rollback contra prod sin **GO explícito del PO en el turno vigente**.

---

## Tabla de niveles

| Nivel | Qué revierte | Escenario típico | Tiempo total | Downtime esperado | Quién ejecuta | Comunicación mínima |
|---|---|---|---|---|---|---|
| **N1** | **Solo código** (Vercel Instant Rollback) | Bug de UI/lógica puro, sin SQL al deploy del día | 2-5 min | <30s (Vercel swap atómico) | PO (Vercel Dashboard) | Interna al chat: "N1 ejecutado, SHA `<X>` vigente" |
| **N2** | **Código + SQL** (rollback de vista/RPC/schema de PII-VIEW-TIGHT o similar) | Deploy que mezcla migración SQL + código nuevo que la consume | 15-30 min | 2-5 min durante el SQL rollback | PO (Studio SQL + Vercel) con auditor en chat guiando orden | Interna al chat + **post incidente público si >5 min de errores vistos por users** |
| **N3** | **Base de datos** (Supabase PITR a backup horario) | Data corruption (DELETE masivo, UPDATE sin WHERE, schema roto) | 60-120 min | 30-60 min full downtime | PO con ticket soporte Supabase + auditor documenta | **Post público obligatorio** (redes + email a users afectados) + post-mortem 48h |

---

## N1 — Rollback solo de código (Vercel Instant Rollback)

### Qué revierte
- Deploy del SHA del día (bug de UI, lógica de endpoint, regresión de componente).
- **No toca BD**: migraciones SQL quedan vivas.
- **Reversible**: se puede re-promote el SHA roto cuando el fix esté listo.

### Criterios de disparo
Disparar N1 cuando se cumplen **2 o más** de estos:
- Sentry Issues: ≥3 issues nuevos con `userCount > 1` sobre el SHA del día en <30 min, mismo mecanismo o path.
- Vercel logs: >5 respuestas 500 en 10 min sobre el mismo endpoint `/api/*`.
- Smoke golden path falla en prod post-GO (tutor reserva / proveedor confirma / admin aprueba).
- Reporte directo de PO o user: "el sitio está roto / no se puede reservar / no cargan los servicios".
- GA4 Realtime: eventos `reserva_confirmada` cayendo a 0 por >15 min cuando antes había tráfico.

Disparar N1 **inmediatamente sin esperar más evidencia** si:
- Página pública (home, /explorar, /blog) muestra error 500 full-screen.
- Flow de registro bloqueado para users nuevos.

### Pasos (PO ejecuta)

```
Tiempo total estimado: 2-5 min desde decisión GO hasta prod servido en SHA viejo.
```

1. **T=0** PO abre Vercel Dashboard → `pawnecta-landing-mvp` → **Deployments** (https://vercel.com/petmatecls/pawnecta-landing-mvp/deployments).
2. **T=0-30s** Localizar el deployment "pre-lanzamiento estable" (SHA anotado en `docs/sprints/lanzamiento-20261125.md § SHAs clave`). Debe ser el último Ready de la noche del lunes 24-11 o anterior al deploy del día.
3. **T=30s-1min** Verificar visualmente: estado Ready verde, target Production, commit message legible. Si hay dudas, auditor confirma por chat antes del siguiente paso.
4. **T=1min** Click `...` del deployment estable → **Promote to Production**. Modal de confirmación → confirmar.
5. **T=1min-1min30s** Vercel ejecuta swap atómico. El nuevo tráfico ve el SHA viejo en <30s.
6. **T=1min30s-3min** PO hace smoke de validación: home carga + `/explorar` muestra servicios + login funciona. Si algún smoke falla, escalar a N2.
7. **T=3min-5min** Verificar Sentry: issues sobre el SHA roto dejan de incrementar (confirman que el fix llegó a todos los nodos CDN).

### Comunicación durante N1

- **Chat equipo (inmediato)**: "N1 ejecutado por bug en `<endpoint/componente>`. SHA activo: `<X>`. Investigando root cause. ETA fix: `<Y>`."
- **Sin post público** salvo que el incidente haya quedado visible a users por >15 min (casos de full-page-500). Si post público necesario, usar el template de N2.
- **Sin email a users** en N1 (el tráfico post-rollback vuelve a estado conocido-bueno).

### Qué NO hace N1
- No revierte migraciones SQL. Si el deploy incluyó una migración destructiva (DROP COLUMN, DROP VIEW, DELETE), N1 **NO alcanza** — ir a N2.
- No revierte cambios de env vars (Vercel Instant Rollback conserva las env vars actuales). Si el bug fue por env var mal seteada, revertir env var ANTES del rollback de código.

---

## N2 — Rollback de código CON SQL (PII-VIEW-TIGHT u otra migración compleja)

### Qué revierte
- Cambios de schema (vista, RPC, función) aplicados en el sprint del día.
- Código de callers que consume el schema nuevo.
- **Reversible**: puede re-aplicarse cuando el fix esté listo, con orden inverso al rollback.

### Criterios de disparo

Disparar N2 cuando:
- El incidente requiere revertir una migración SQL del día (PII-VIEW-TIGHT del sábado 21-11, o cualquier migración aplicada en la ventana freeze→launch).
- Después de N1, el error persiste (síntoma: callers migrados leen `display_name` pero la vista nueva no la expone / SQL rota).
- Error SQL en prod repetido (`relation does not exist`, `column does not exist`, `function does not exist`, `permission denied`): señal de que el schema vigente no coincide con el código servido.
- Bug afecta columna sensible (PII leak reactivado, RLS bypassed).

### Orden de reversión — **crítico, respetar secuencia**

Documentado en [docs/planes/pii-view-tight-sabado.md § Orden de reversión correcto](pii-view-tight-sabado.md):

**Primero SQL, después código** (al revés = 500s en home/chat/perfil mientras SQL está roto y código nuevo intenta leer columnas inexistentes).

### Pasos (PO + auditor en chat)

```
Tiempo total estimado: 15-30 min. Downtime esperado: 2-5 min durante aplicación del SQL.
```

#### Pre-flight (T-5min)

1. PO anuncia en chat: "Iniciando N2 por `<motivo>`. Downtime esperado 2-5 min."
2. PO abre Supabase Studio prod → SQL Editor.
3. PO abre `docs/planes/pii-view-tight-sabado.md § Rollback escrito (fallback de emergencia)`. Si el rollback fue por otra migración distinta a PII-VIEW-TIGHT, buscar el snapshot `*-rollback-YYYYMMDD.sql` correspondiente en `migrations/rollbacks/` o en el acta del sprint.
4. PO prepara en paralelo Vercel Dashboard → Deployments con el SHA pre-migración identificado.

#### Fase A — Rollback SQL (T=0 → T+5min)

5. **T=0** PO pega el bloque SQL de rollback completo (DROP + CREATE OR REPLACE con la definición original) en SQL Editor.
6. **T=0-1min** PO verifica mentalmente: ¿el bloque incluye `BEGIN`/`COMMIT`? ¿Incluye GRANT EXECUTE a `anon`/`authenticated` tras el DROP (regla CLAUDE.md § P6.2)?
7. **T=1min** PO ejecuta el bloque. Confirmar `COMMIT` exitoso en el output.
8. **T=1-3min** PO ejecuta verificaciones V1/V2/V3/V4 del acta del sprint (shape de vista/RPC + ejecución smoke):
   - V1: `pg_get_viewdef('public.proveedores_publicos')` retorna la definición pre-sprint (columnas `nombre`/`apellido_p`/`apellido_m` presentes si rollback PII-VIEW-TIGHT).
   - V2: `SELECT * FROM proveedores_publicos LIMIT 1` retorna fila con todas las columnas esperadas.
   - V3: `SELECT buscar_servicios(p_limit:=3)` retorna 3 filas sin error.
   - V4: `SELECT has_table_privilege('anon', 'proveedores_publicos', 'SELECT')` retorna `true`.
9. **T=3-5min** Durante este tiempo el prod tráfico ve 500s en home/chat/perfil (código nuevo lee `display_name` que no existe). Esperable. **No pánico**: la Fase B lo cierra.

#### Fase B — Rollback código (T+5min → T+10min)

10. **T=5min** PO va a Vercel Dashboard → Deployments → identificar el SHA pre-migración (del acta del sprint).
11. **T=5-6min** PO click `...` → **Promote to Production** sobre ese SHA.
12. **T=6-7min** Vercel swap atómico. Tráfico vuelve al código pre-migración que lee `nombre`/`apellido_p` directo de la vista. Las 500s cesan.
13. **T=7-10min** Smoke de validación: home + `/explorar` + ficha de un proveedor + login tutor + ver reserva en `/mis-reservas`. Si pasa, incidente contenido.

#### Fase C — Verificación post-rollback (T+10min → T+15min)

14. **T=10-12min** Sentry: issues sobre el SHA roto dejan de incrementar.
15. **T=12-15min** Query Supabase: contar reservas creadas en ventana del incidente (`SELECT COUNT(*) FROM agendamientos WHERE created_at BETWEEN '<inicio>' AND '<fin>'`) + comparar con media esperada → si drop significativo, documentar en acta de incidente.

### Comunicación durante N2

**Chat equipo (T=0)**: "Iniciando N2. ETA 15-30 min. Downtime 2-5 min esperable durante Fase A. Sin reservas confirmadas en ese bloque."

**Post público si >5 min de errores visibles** (template):
> "Estamos atendiendo un problema puntual en Pawnecta. El servicio volverá a operar en los próximos minutos. Disculpen las molestias — les avisamos cuando esté resuelto."

Canal: Instagram Stories + banner temporal en home (si el home carga).

**Post-resolución (T+30min)**:
> "El problema ya está resuelto. El servicio opera normal. Si tenías una reserva en curso durante el incidente, por favor contáctanos en hola@pawnecta.com."

**Email a users afectados**: si hubo pérdida de datos (reservas no guardadas, mensajes no enviados), auditar la ventana y mandar email personalizado con:
- Qué pasó.
- Qué datos se perdieron (específicos de su cuenta).
- Cómo re-hacer la acción.
- Compensación si aplica (no aplica aún — sin pagos).

---

## N3 — Rollback de base de datos (Supabase PITR)

### Qué revierte
- Estado completo de la BD a un punto en el pasado (Point-in-Time Recovery, backup horario).
- **Operación destructiva — se pierden cambios posteriores al punto restaurado**. Imposible "fusionar" cambios post-rollback.
- **Downtime obligatorio**: Supabase pone el proyecto en modo mantenimiento durante la restauración.

### Criterios de disparo

Disparar N3 **solo si**:
- Data corruption masiva confirmada (DELETE sin WHERE, UPDATE catastrófico, migración rota que corrompió filas).
- BD inaccesible por >30 min sin N1/N2 capaces de restaurar.
- Soporte Supabase confirma que la vía rápida es PITR, no fix in-place.

**No disparar N3 si**:
- El incidente es de código (usar N1).
- El incidente es de schema pero los datos están intactos (usar N2).
- Hay pérdida parcial en una tabla específica y Supabase permite restaurar solo esa tabla (operación quirúrgica, no PITR full).

### Pasos (PO abre ticket, auditor documenta)

```
Tiempo total estimado: 60-120 min. Downtime: 30-60 min full.
```

#### Fase A — Decisión + contacto soporte (T=0 → T+10min)

1. **T=0** PO ejecuta en chat: "N3 propuesto por `<descripción del data corruption>`. Afecta: `<tablas/columnas>`. Última hora limpia estimada: `<HH:MM CLT>`."
2. **T=0-5min** PO + auditor confirman:
   - ¿El corruption es irreparable in-place? (Ej.: `evaluaciones` tiene filas NULL en columna NOT NULL — si pocas, parchar in-place; si miles, PITR).
   - ¿Hay backup horario disponible para la hora limpia? (Supabase Pro: últimos 7 días, granularidad horaria).
3. **T=5min** PO abre ticket en Supabase Dashboard → Support con prioridad High:
   - Asunto: "Point-in-Time Recovery requerido — incidente prod `ouezpeeiwjwawauidrqq`"
   - Cuerpo: timestamp exacto al que restaurar (ej. `2026-11-25 09:00:00 UTC`), motivo, impacto.
4. **T=5-10min** Esperar respuesta Supabase (SLA Pro: <30 min para High prioridad).

#### Fase B — Ventana de comunicación pública (T+10min → T+30min)

5. **T=10min** PO publica en Instagram Stories + banner home:
   > "Estamos resolviendo un incidente técnico. Pawnecta no está disponible por los próximos 60 minutos aprox. Agradecemos tu paciencia — te avisaremos cuando esté todo operativo."
6. **T=10-15min** PO modifica DNS o Vercel → página de mantenimiento estática (simple HTML desplegable como override temporal, fuera de alcance de este doc; preparar template separado pre-launch).
7. **T=15-30min** PO + auditor identifican users afectados (reservas/mensajes entre la hora limpia y el inicio del rollback) + preparan email.

#### Fase C — Restauración Supabase (T+30min → T+90min)

8. **T=30min** Supabase soporte confirma inicio de PITR. BD entra en modo mantenimiento (reads + writes bloqueados).
9. **T=30-90min** Esperar a que PITR complete. Monitoreo pasivo — nada que ejecutar.
10. **T=90min** Supabase confirma BD restaurada al timestamp solicitado. Smoke:
    - Login: `SELECT 1 FROM auth.users LIMIT 1` retorna fila.
    - Datos: `SELECT COUNT(*) FROM agendamientos` retorna cuenta esperada para la hora limpia.
    - Vista PII: `SELECT * FROM proveedores_publicos LIMIT 1` retorna fila sin PII si el rollback incluyó post-PII-VIEW-TIGHT.

#### Fase D — Reactivación + reconciliación (T+90min → T+120min)

11. **T=90min** PO remueve página de mantenimiento → Vercel sirve el deploy prod normal.
12. **T=90-100min** Smoke golden path completo (tutor reserva + proveedor confirma + chat + admin).
13. **T=100-110min** Enviar emails a users afectados (ventana de pérdida):
    > "Durante un incidente del `<fecha>` entre las `<HH:MM>` y las `<HH:MM>` CLT, algunos datos en Pawnecta no se guardaron correctamente. Específicamente: `<descripción personalizada>`. Si querés recuperar esta acción, respondénos a este correo o contáctanos en hola@pawnecta.com."
14. **T=110-120min** Post en Instagram + redes: "Incidente resuelto. Todo operativo. Disculpas por las molestias."

### Comunicación durante N3

**Interna (T=0)**:
> "N3 propuesto. Justificación: `<X>`. ETA: 60-120 min. Downtime obligatorio. Ticket Supabase: `<número>`."

**Pública inicial (T+10min)** — Instagram Stories + banner home:
> "Estamos resolviendo un incidente técnico. Pawnecta no está disponible por aproximadamente 60 minutos. Agradecemos tu paciencia."

**Pública intermedia (T+45min si demora >30min)**:
> "Seguimos trabajando. Estimamos restauración en los próximos 30-45 min. Gracias por acompañarnos."

**Pública post-resolución (T+90-120min)**:
> "Incidente resuelto a las `<HH:MM>`. Pawnecta vuelve a operar normalmente. Si tenías una acción en curso entre `<inicio>` y `<fin>`, revisá tu cuenta — te contactamos personalmente si corresponde. Gracias por tu paciencia."

**Email personalizado a users afectados**: obligatorio. Enviado dentro de 2h del cierre.

**Post-mortem** (48h post-incidente): documento en `docs/postmortems/YYYY-MM-DD-incidente.md` con:
- Timeline detallado (minuto a minuto).
- Root cause verificado.
- Datos impactados (números concretos).
- Decisiones tomadas + por qué.
- Acciones preventivas (gated en próximo sprint).

---

## Escenarios de disparo probables (2026-11-25)

### Escenario 1 — Data corruption en una migración

**Síntoma**: tras aplicar PII-VIEW-TIGHT el sábado 21-11 o cualquier migración posterior en freeze, se detecta en el deploy del miércoles 25-11 que una columna quedó con valores corruptos (ej. `display_name` retorna `"NULL I."` en algunas filas).

**Camino recomendado**:
1. Verificar impacto (query: `SELECT COUNT(*) FROM proveedores WHERE <condición de corruption>`).
2. Si <100 filas → parchar in-place con UPDATE específico (fuera de N1/N2/N3, es fix normal).
3. Si >100 filas o >10% de filas totales → **N2** (rollback SQL + código).
4. Si corruption afectó datos críticos (reservas, mensajes, evaluaciones) → **N3** (PITR).

**Prevención pre-launch**: smokes post-SQL exhaustivos en Paso 1 de PII-VIEW-TIGHT (ya documentado en plan del sábado). Query empírica con `curl` anon key post-merge.

### Escenario 2 — Caída de Vercel por bug crítico en deploy del día

**Síntoma**: Vercel prod sirve 500 full-page en `/` o `/explorar`. Sentry se llena de issues del tipo `JAVASCRIPT-NEXTJS-*` con `userCount > 10` en <5 min.

**Camino recomendado**:
1. **N1 inmediato**. No esperar diagnóstico completo — si home está roto, cada minuto pierde tráfico de lanzamiento.
2. Verificar que el SHA pre-lanzamiento estable está Ready en Vercel (debería, estaba servido ayer).
3. Post-rollback: diagnosticar root cause en el SHA roto (branch separada, PR de fix con suite CI completa).
4. Re-deploy cuando CI verde + GO del PO.

**Prevención pre-launch**:
- Freeze estricto martes 16:00 CLT: cero deploys después del freeze hasta GO del miércoles.
- Suite CI verde sobre SHA prod actual (checklist § 2).
- Smoke manual golden path pre-GO (checklist § 7).

---

## Matriz de decisión rápida

| Síntoma | Nivel | Razón |
|---|---|---|
| Sentry: 3+ issues `userCount>1` en 10 min en path específico | N1 | Código roto; rollback de código basta |
| Vercel logs: 500s repetidos en `/api/<endpoint>` | N1 | Idem |
| Home full-page error 500 | N1 inmediato | Cada minuto pierde tráfico |
| Post-sábado 21: ficha carga pero muestra "Proveedor" en vez de nombre | Fix in-place (UPDATE fila) | Fallback OK, no rollback |
| Post-sábado 21: ficha retorna 500 por `column "display_name" does not exist` | N2 | Schema roto; SQL+código revierten juntos |
| Post-sábado 21: `/explorar` 500 por RPC retornando error | N2 | Idem |
| DELETE accidental afectó >100 filas en tabla crítica | N3 | PITR único camino |
| UPDATE sin WHERE afectó miles de proveedores | N3 | Idem |
| Users reportan no poder loguear + BD lenta | Investigar antes | Puede ser Supabase cap conexiones, no bug — N1/N2/N3 no aplican |

---

## Preparación pre-launch (checklist auditor)

- [ ] SHA pre-lanzamiento estable confirmado + anotado en `docs/sprints/lanzamiento-20261125.md § SHAs clave` (ejecutar martes 24-11 16:00 CLT al freeze).
- [ ] Bloques de rollback SQL preparados y guardados en repo:
   - [x] `docs/planes/pii-view-tight-sabado.md § Rollback escrito` (si PII-VIEW-TIGHT aplica).
   - [ ] `migrations/rollbacks/` con snapshot `pg_get_viewdef` + `pg_get_functiondef` pre-aplicación, por cada migración del día.
- [ ] Vercel bypass token verificado (acceso a preview protegido en caso de emergencia).
- [ ] Soporte Supabase Pro plan activo + número de ticket de contacto directo guardado.
- [ ] Template página de mantenimiento HTML estático preparado (deuda pre-launch — ítem BACKLOG propuesto).
- [ ] Email de incidente pre-redactado (template genérico en español) guardado en `docs/planes/emails/incidente-template.md` (deuda pre-launch).

---

## Responsables por nivel

| Nivel | Primary | Backup | Comunicación |
|---|---|---|---|
| N1 | PO (Vercel click) | Auditor (asiste por chat) | PO en chat equipo |
| N2 | PO (SQL + Vercel) | Auditor (dicta orden + verificaciones) | PO en chat + auditor documenta |
| N3 | PO (ticket Supabase) | Auditor (documenta + emails) | PO redes + auditor emails |

**PO disponible 25-11 09:00-13:00 CLT**: contacto primario. Fuera de esa ventana, el auditor tiene permisos read-only y puede diagnosticar pero **no ejecutar rollback contra prod sin GO explícito del PO**.

---

## Decisiones pendientes del PO

### D1. Template página de mantenimiento HTML estático

**Pregunta**: ¿valide armar una página `/mantenimiento.html` servida vía Vercel override durante N3, o preferís que el banner se publique en home + Instagram sin DNS switch?

**Recomendación del auditor**: template HTML estático simple (1 archivo, ~50 líneas, logo + mensaje + fecha estimada de retorno). Vercel permite servirlo vía rewrite temporal en `vercel.json`. Costo: 30 min pre-launch. Beneficio: durante N3 (30-60 min downtime) los users ven algo profesional en vez de 500 crudo.

**Impacto si no se decide**: durante N3 los users verán errores Vercel defaults (feo pero inofensivo). N1/N2 no requieren esta pieza.

### D2. Email de incidente pre-redactado

**Pregunta**: ¿confirmás el template del email personalizado post-N3 que incluí arriba (Fase D, paso 13), o querés rephrase?

**Recomendación del auditor**: aterrizar el template tal cual en `docs/planes/emails/incidente-template.md` con placeholders explícitos para `{ventana_inicio}`, `{ventana_fin}`, `{accion_perdida}`. Durante un N3 real no hay tiempo de redactar desde cero.

**Impacto si no se decide**: en caso de N3, redactar al vuelo cuesta 15-20 min adicionales. Para N1/N2 no se requiere.

### D3. Ventana de disparo N1 sin esperar evidencia

**Pregunta**: ¿autorizás al auditor a proponer N1 por chat (no ejecutar, solo proponer) sin esperar el criterio mínimo "2 o más" si veo home 500 full-page confirmado en prod?

**Recomendación del auditor**: sí, pero manteniendo el gate operativo: el auditor **propone** por chat, el **PO decide y ejecuta**. El criterio "2 o más" es para evitar rollbacks reactivos ante falsos positivos; home 500 full-page es inequívoco.

**Impacto si no se decide**: default seguro es esperar el criterio "2 o más". Costo marginal: 2-5 min adicionales de visibilidad del bug a users durante lanzamiento. Aceptable.

### D4. Cobertura de monitoreo T+24h → T+48h

**Pregunta**: el checklist lanzamiento cubre monitoreo activo T+0 → T+24h. ¿Querés que el auditor arme un sub-plan T+24h → T+48h con menor densidad (checks cada 2-3h en vez de 15 min)?

**Recomendación del auditor**: sí. T+24h a T+48h es la ventana donde emergen bugs de volumen (datos acumulándose, autovacuum atrasado, crons segunda ejecución). Checks cada 2h sobre Sentry + Supabase Database Health + queries de counts de registros/reservas serían suficientes. Costo: 15 min redactarlo.

**Impacto si no se decide**: ventana sin cobertura explícita en el checklist. Los checks ocurren por reflejo pero sin criterio de alerta predefinido.

---

## Firma

Este doc se activa en caso de incidente post-GO del 2026-11-25. Al cerrarse el incidente, el PO + auditor firman al pie del post-mortem correspondiente en `docs/postmortems/YYYY-MM-DD-incidente.md`.
