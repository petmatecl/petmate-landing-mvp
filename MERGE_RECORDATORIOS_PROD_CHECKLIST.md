# Merge tren RECORDATORIOS → producción — checklist ejecutable (v2)

> **ESTADO: APROBADO CON AJUSTES — v2 2026-07-30**. Listo para ejecutar cuando
> Aldo dé GO. Cambios v1 → v2:
>   1. Fase 4.1: eliminado `bypassEnv=1` del dryRun (queremos ejercitar el gate
>      `skipIfNonProd` real como lo hace la corrida programada); nota crítica
>      agregada si retorna `skipped`.
>   2. Fase 4.1: typo `staging global` → `prod`.
>   3. Escenario A rollback: reescrito con cita textual de la doc oficial de
>      Vercel — Instant Rollback NO toca crons, se necesita paso manual extra
>      para desregistrar el cron nuevo tras un rollback.
>
> Patrón heredado de `MERGE_F2_PROD_CHECKLIST.md` v2 (F2 EN PROD desde 2026-07-28
> con tag `f2-prod-20260728`). Reglas de proceso P1-P4 aplicables.

**Alcance**: 1 migration aditiva a Supabase prod (`ouezpeeiwjwawauidrqq`) + merge
`staging → main` + deploy Vercel automático (activa el cron nuevo). Componentes
del tren Recordatorios R1-R7: schema marcas por destinatario, endpoint cron
diario, template `RecordatorioReservaEmail` con dirección de arte + banda de
fecha protagonista, retrofit visual de los 4 templates de confirmación/
cancelación con mapa semántico PO, suite e2e API-only del cron.

**Contexto operativo clave**: la migration R1 es **aditiva** (2 columnas
timestamptz NULL sin default) — el código actual de prod las ignora completo,
cero riesgo de regresión al aplicarla antes del deploy. El cron sólo se activa
al mergear `vercel.json` con la entry nueva a `main`; hasta que eso pase, el
endpoint está deployado en preview branches pero **no ejecuta** (Vercel Cron
Jobs corre solo desde el deploy de la Production Branch).

Commits en `staging` desde la última promoción a `main` (**12 commits**, del
más viejo al más nuevo):

```
a68aa6a docs(acta): fixes post-revisión + regla branch-guard
e24facf feat(recordatorios): R1 migration marcas + R2 helper formatBloqueHorario
c9b71b1 feat(recordatorios): R3 endpoint cron recordatorio-reserva
3d338b4 docs(claude): regla operativa P4 — verificar env vars Vercel post-cambio
0879914 feat(recordatorios): R4 template RecordatorioReservaEmail + switch endpoint
be590bc feat(recordatorios): R4.1 layout de listado + bloque Dónde (feedback PO)
9458e64 feat(recordatorios): R4.2 direccion de arte — pill + banda de fecha + card border-left
c11746e feat(recordatorios): R5 registro cron diario 22:00 + mapa semantico banda
3b96bf3 test(recordatorios): R6 suite e2e cron + fix DST del acta R5
42c151e feat(recordatorios): R7 retrofit templates confirmacion/cancelacion + diagnostico drift
09392a8 docs(recordatorios): borrador checklist de merge del tren (v1) — pendiente PO
c7f6255 docs(checklist): merge Recordatorios v2 — ajustes post-revisión
```

Mezcla de docs (`a68aa6a`, `3d338b4`, `09392a8`, `c7f6255`) + tren completo
(R1-R7). Los 2 últimos (`09392a8`, `c7f6255`) son este mismo checklist en sus
2 iteraciones — **docs, no gatillan PARAR**. Nada más externo al tren se
filtró en la ventana `staging..main`.

---

## Fase 0 — Preflight (en staging, antes de tocar `main`)

- [x] **Cierre formal de la Fase 4 del merge F2 (monitor 24h) — CUMPLIDO
  2026-07-30**. Aldo reportó con evidencia: Vercel ventana 1h sin errores;
  BD prod con actividad sana (5 confirmadas, 1 últimos 3 días, 1 pendiente,
  cero estados anómalos); Resend 100% Delivered (los `[STAGING]` de horas
  previas son la suite R7, gate de `lib/resend.ts` funcionando); soporte 0
  tickets. F2 estable. Ver `ACTA_CIERRE_F2.md > Fase 4 — CERRADA 2026-07-30`
  para el detalle.

- [ ] **Verificar en Vercel Dashboard que el ÚLTIMO commit de `staging` tiene
  deployment READY** (regla P1). Ir a Vercel Dashboard → project → Deployments
  → filtrar por branch `staging` → confirmar que el SHA del último commit
  local (`git rev-parse HEAD` en `staging`) coincide con un deployment estado
  **Ready** (no "Error", no "Building"). Si no está Ready, PARAR y arreglar
  antes de cualquier smoke o suite.

- [ ] **Suite e2e completa 41/41 verde en la última corrida** (`npm run
  test:e2e` en local contra staging). Distribución esperada:
  - `setup` + `setup-tutor` = 2
  - `chromium` (F2-2B) = 8
  - `chromium-tutor` (F2-3) = 22
  - `chromium-cron` (Recordatorios R6, all.spec.ts) = 9
  - **Total = 41**, cero flaky, wall ≈ 30s.

- [ ] **Check de limpieza de residuos R6** (SQL contra staging vía Supabase
  MCP o Dashboard SQL Editor):
  ```sql
  SELECT count(*) AS residuos_test_cron
    FROM agendamientos
   WHERE tutor_nombre LIKE '[TEST-%';
  ```
  **Esperado: 0**. Si no es 0 → hay residuos de la suite R6 (dryRun R3 o
  corrida real que no cleanó). Investigar y limpiar antes de continuar —
  esos rows tienen tutor_id + proveedor_id reales de Aldo/Camila y pueden
  disparar el cron real si algún fecha_preferida cae en la ventana. Comando
  de limpieza (aplicar con cuidado, revisar rows antes):
  ```sql
  -- Preview antes de borrar:
  SELECT id, servicio_id, tutor_nombre, fecha_preferida, estado
    FROM agendamientos WHERE tutor_nombre LIKE '[TEST-%';
  -- Borrar (solo si el preview confirma que son fixtures):
  DELETE FROM agendamientos WHERE tutor_nombre LIKE '[TEST-%';
  ```

- [ ] **Log de commits a promover** — verificar el diff exacto entre `main` y
  `staging`:
  ```bash
  git log --oneline main..staging
  ```
  **Esperado**: los 10 commits listados arriba, en orden inverso (más nuevo
  primero). Si aparece algún commit no relacionado con el tren
  (Recordatorios/docs/P4) → PARAR y triage antes de mergear.

- [ ] **Fast-forward-only check** — confirmar que `main` no divergió (no hay
  hotfixes directos que compitan):
  ```bash
  git log staging..main
  ```
  **Esperado: vacío**. Si trae commits → `main` divergió de `staging`,
  requiere merge no-FF y análisis manual.

- [ ] **Confirmar env vars en Vercel prod** (Dashboard → Project → Settings
  → Environment Variables, filtrar por Production scope):
  - `CRON_SECRET` — **valor puede ser distinto del Preview**. Es el que
    autentica el Bearer que Vercel Cron manda al endpoint. Verificar
    timestamp "Updated" — si dice más de 30 días, no importa (no se rotó);
    si dice fecha reciente, confirmar que el redeploy post-rotación ya
    aterrizó (regla P4).
  - `RESEND_API_KEY` — apunta a la key de prod (envía a users reales, NO a
    AUDIT_INBOX).
  - `NEXT_PUBLIC_APP_ENV=production` + `VERCEL_ENV=production` — activa
    el gate del `lib/resend.ts` para envío real y el gate `skipIfNonProd`
    del cron.
  - `SUPABASE_SERVICE_ROLE_KEY` (para el endpoint que usa
    `supabaseAdmin.auth.admin.getUserById`).
  - `NEXT_PUBLIC_SITE_URL=https://www.pawnecta.com` (para el `panelUrl`
    del template).
  - `EMAIL_FROM` — remitente del email (probablemente
    `no-reply@pawnecta.com` o similar; si no está, cae al fallback
    `onboarding@resend.dev` que solo funciona para inbox verificado).

- [ ] **Confirmar Supabase prod tiene PITR activo** (Supabase Dashboard →
  Project `ouezpeeiwjwawauidrqq` → Database → Backups):
  - **Con PITR (tier Pro+)**: casilla marcada, seguir.
  - **Sin PITR (tier Free/Starter)**: bajar backup manual antes de Fase 1
    (`pg_dump` a `backup-prod-YYYYMMDD-HHMM.sql` fuera del repo).
    Verificar `head` del archivo muestra `-- PostgreSQL database dump`.

## Fase 1 — Migration R1 a Supabase prod (`ouezpeeiwjwawauidrqq`)

**Aplicación manual por Aldo** desde Supabase Dashboard → SQL Editor.

**Naturaleza**: `ADD COLUMN IF NOT EXISTS` × 2 timestamptz NULL sin default +
2 `COMMENT ON COLUMN`. **Aditiva, idempotente, transaccional (BEGIN/COMMIT
explícito por Caveat B post-F2)**. El código actual de prod NO lee ni
escribe estas columnas → cero riesgo de regresión al aplicarla antes del
deploy de Fase 2.

### 1.1 — Verificación previa (las columnas NO existen aún)

```sql
SELECT column_name
  FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name='agendamientos'
   AND column_name IN ('recordatorio_tutor_enviado_at',
                       'recordatorio_proveedor_enviado_at');
```
- [ ] **Esperado: 0 filas**. Si retorna alguna → la migration ya fue
  aplicada parcialmente (raro pero posible si alguien corrió media
  transacción antes); no re-aplicar sin verificar el estado.

### 1.2 — Aplicar migration R1

- [ ] Aplicar el bloque completo del archivo
  `migrations/20260728_recordatorios_marcas.sql`:

```sql
BEGIN;

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS recordatorio_tutor_enviado_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS recordatorio_proveedor_enviado_at timestamptz NULL;

COMMENT ON COLUMN public.agendamientos.recordatorio_tutor_enviado_at IS
    'Tren Recordatorios (R1) — timestamp del último recordatorio "día '
    'anterior" enviado al tutor. NULL = pendiente / nunca enviado. '
    'Update con NOW() sólo tras éxito del envío (email Resend + INSERT '
    'notifications). Idempotencia por destinatario: independiente de '
    'recordatorio_proveedor_enviado_at.';

COMMENT ON COLUMN public.agendamientos.recordatorio_proveedor_enviado_at IS
    'Tren Recordatorios (R1) — timestamp del último recordatorio "día '
    'anterior" enviado al proveedor. NULL = pendiente / nunca enviado. '
    'Idempotencia independiente de la marca del tutor.';

COMMIT;
```

### 1.3 — Verificaciones posteriores

**V1 — las 2 columnas existen con shape correcto**:
```sql
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name='agendamientos'
   AND column_name IN ('recordatorio_tutor_enviado_at',
                       'recordatorio_proveedor_enviado_at')
 ORDER BY column_name;
```
- [ ] **Esperado: 2 filas**. Ambas `data_type = timestamp with time zone`,
  `is_nullable = YES`, `column_default = NULL`. Pegar output en el acta.

**V2 — agendamientos existentes intactos**:
```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE recordatorio_tutor_enviado_at IS NULL) AS tutor_null,
       count(*) FILTER (WHERE recordatorio_proveedor_enviado_at IS NULL) AS prov_null
  FROM public.agendamientos;
```
- [ ] **Esperado: `total = tutor_null = prov_null`** (todas las filas con
  ambas marcas NULL por default post-ADD). Pegar output en el acta.

## Fase 2 — Merge `staging → main` + deploy Vercel

```bash
git checkout main
git pull origin main
git merge staging  # fast-forward esperado (Fase 0 lo confirmó); si NO es FF, PARAR
git push origin main
```

- [ ] **Fast-forward esperado**. Output del `git merge` debe decir
  `Fast-forward` seguido del rango de commits (`main` avanza a `42c151e`).
  Si en su lugar dice `Merge made by the 'ort' strategy` (commit de merge
  creado) → **PARAR**: significa que `main` divergió entre la Fase 0 y
  ahora (alguien pusheó algo). Investigar antes de continuar.

- [ ] **Vercel autodeploya en push a `main`**. Esperar ~1-2 min. Verificar
  en Vercel Dashboard → Deployments que el build del último SHA (`42c151e`)
  quedó **Ready**. Si el build falla → NO se activa el nuevo deploy;
  prod sigue con el código anterior. Revisar logs y decidir fix-forward vs
  revert.

- [ ] **Verificar SHA post-deploy** con `git ls-remote origin main` desde
  local — debe coincidir con `42c151e`. Regla P2: no dar por hecho el deploy
  sin evidencia; capturar el output del comando en el acta.

## Fase 3 — Verificación Cron Jobs Dashboard

Post-deploy, Vercel registra automáticamente los crons del `vercel.json` de la
Production Branch. Verificar los **4 items de evidencia** definidos en el acta
R5:

- [ ] **Item 1 — Entry listada**. Vercel Dashboard → Project `pawnecta` →
  Settings → Cron Jobs. Fila esperada:
  - `Path: /api/cron/recordatorio-reserva`
  - `Schedule: 0 22 * * *`
  - `Next Run: <fecha próxima 22:00 UTC>` (o "in Xh Ym" si es hoy).

- [ ] **Item 2 — Conteo total = 6 crons activos**. Los 5 previos + el nuevo:
  ```
  /api/cron/recordatorio-onboarding    (0 14 * * *)
  /api/cron/recordatorio-mensajes      (0 10 * * *)
  /api/cron/reset-visitas-mes          (0 0 1 * *)
  /api/cron/cleanup-visitas-tracking   (0 3 * * *)
  /api/cron/invitacion-resenas         (0 11 * * *)
  /api/cron/recordatorio-reserva       (0 22 * * *)   ← nuevo
  ```
  Screenshot del listado completo — adjuntar al acta.

- [ ] **Item 3 — Warning de límite Hobby**. Si aparece banner
  amarillo/rojo tipo "You are approaching / exceeding the Cron Jobs limit
  for the Hobby plan" → **capturar el texto exacto**. Si no aparece →
  también capturarlo (ausencia es evidencia; anotar "sin warning" en el
  acta). Verificar el límite exacto en el momento del merge en
  https://vercel.com/pricing → sección Cron Jobs.

- [ ] **Item 4 — Timestamp del registro**. La columna `Created` o el
  timestamp del deploy que activó el cron debe reflejar el merge (Fase 2)
  y no una fecha vieja. Si aparece con timestamp viejo o el warning
  sugiere que la entry no aterrizó → redeployar explícitamente el último
  commit de `main` desde Vercel Dashboard (regla P4) y re-verificar.

### Plan de contingencia Hobby — cero improvisación

Si el warning bloquea el merge o exige acción inmediata (según lo definido
en el acta R5):

1. **Consolidación NO improvisada**: no fusionar dos crons "sobre la marcha".
   Si el bloqueo es real, reportar y evaluar formalmente si algún cron
   existente puede plegarse (candidato natural: `recordatorio-onboarding` +
   `recordatorio-mensajes` en un cron paraguas — sprint dedicado, no en
   este checklist).
2. **Upgrade a Pro**: decisión de negocio, fuera del checklist técnico.
   Coordinar con Aldo antes de aplicar.
3. **Reversión**: quitar la entry nueva de `vercel.json`, `git revert
   c11746e` (o edit + commit), push a `main`. Cron muere; el resto del
   tren queda silente (columnas marca ya aplicadas, endpoint deployado
   pero nunca disparado). Ver sección ROLLBACK abajo.

## Fase 4 — Smoke prod (post-deploy inmediato)

Verificación end-to-end del endpoint contra prod con dryRun (cero side
effect) + verificación en Resend que efectivamente no envió + opcional
observación de la primera corrida real programada.

### 4.1 — DryRun manual contra prod

Prod (`www.pawnecta.com`) NO tiene Vercel Deployment Protection → **sin
bypass header** (a diferencia de staging donde sí se necesita el
`x-vercel-protection-bypass`).

**Sin `bypassEnv=1`** — a diferencia del smoke de staging, acá queremos que
`skipIfNonProd` pase por sí solo con `VERCEL_ENV=production`. Es el mismo
path que ejecutará la corrida programada de las 22:00 UTC; ejercitarlo
verifica el gate de entorno en vivo.

**Comando PowerShell exacto** (llenar `$env:CRON_SECRET_PROD` con el valor
de Vercel prod — NUNCA hardcodearlo en el checklist ni en un commit):

```powershell
# Aldo pega el CRON_SECRET de PROD (scope Production, no Preview).
# Sesión interactiva local — la variable no persiste después de cerrar la ventana.
$env:CRON_SECRET_PROD = "<pegar-aca>"

# DryRun contra prod — cero envíos, cero UPDATE de marcas.
# Sin bypassEnv=1: el endpoint debe pasar skipIfNonProd por sí solo (VERCEL_ENV=production).
Invoke-RestMethod `
    -Uri "https://www.pawnecta.com/api/cron/recordatorio-reserva?dryRun=1" `
    -Headers @{ "x-cron-secret" = $env:CRON_SECRET_PROD } `
    -Method Get | ConvertTo-Json -Depth 5

# Limpiar el secret de la sesión.
Remove-Item Env:\CRON_SECRET_PROD
```

Response esperada (shape):
```json
{
  "success": true,
  "dryRun": true,
  "now": "<ISO UTC del momento>",
  "tomorrowChile": "<YYYY-MM-DD del día siguiente en TZ Chile>",
  "candidates": <N — rows de prod en la ventana>,
  "elegibles": <M — post-refino, <= candidates>,
  "sample": [
    { "agendamientoId": "...", "familia": "F1|F2|legacy", ... }
  ]
}
```

- [ ] **HTTP 200 + `success: true` + `dryRun: true`**. Si retorna 401 → el
  `CRON_SECRET_PROD` está mal (verificar en Vercel Dashboard). Si retorna
  500 → capturar el error, revisar Vercel Logs, reportar antes de
  continuar.

- [ ] **Si retorna `{ skipped: true, env: ... }` → HALLAZGO CRÍTICO**. Es el
  gate `skipIfNonProd` bloqueando el request. Significa que
  `VERCEL_ENV=production` **no está seteada correctamente en el runtime del
  deploy** (o alguna otra variable de `lib/cronGuard.ts` está mal). El mismo
  gate bloquearía la corrida programada de las 22:00 → **el cron nunca
  ejecutaría en prod**. PARAR y diagnosticar antes de esperar la corrida:
  revisar Vercel Dashboard → Settings → Environment Variables → Production
  scope, confirmar `NEXT_PUBLIC_APP_ENV=production` (Vercel setea
  `VERCEL_ENV=production` automáticamente en Production deployments; si
  falla, escalar a Vercel Support).

- [ ] **`candidates` y `elegibles` son numéricos** (pueden ser 0 si no hay
  reservas F2/F1/legacy confirmadas de prod cayendo en "mañana Chile" —
  perfectamente válido en un merge que ocurre en un día sin reservas
  confirmadas para el día siguiente).

- [ ] **`sample[]` tiene shape correcto** si hay elegibles: cada entry con
  `agendamientoId`, `familia ∈ {F1, F2, legacy}`, `fechaLinea`, `fechaSub`,
  `horaLinea`, `donde`, `dentroVentana`, `envios: { tutor, proveedor }`.

### 4.2 — Verificar en Resend que NO se enviaron emails

Resend Dashboard → Emails → filtrar por "Sent" con timestamp de la ventana
de la corrida dryRun de Fase 4.1.

- [ ] **Cero emails nuevos disparados**. El dryRun retorna sin llamar a
  `resend.emails.send` — confirmar visualmente que la lista de "Sent"
  no incluye ningún email nuevo con subject de recordatorio. Si aparece
  alguno con "Mañana:" en el subject → hay bug en el gate dryRun;
  investigar antes de dejar el cron activo.

### 4.3 — (Opcional recomendado) Observar la primera corrida real programada

La primera corrida real ocurrirá automáticamente a las **22:00 UTC del día
del merge** (o del día siguiente si el merge fue post-22:00 UTC). Vercel
Cron dispara un GET al endpoint con `Authorization: Bearer <CRON_SECRET>`.

- [ ] **Vercel Logs** (Deployments → último deploy → Runtime Logs, filtrar
  por `/api/cron/recordatorio-reserva`): buscar la invocación del cron
  a las 22:00 UTC. Response esperada: `200` con `sent: { tutor: N,
  proveedor: M }`, `failures: []` (o solo failures de rows con emails
  inválidos).

- [ ] **Resend Dashboard**: emails con subject "Mañana: ..." disparados a
  users reales. Delivery ok (no bounce/complaint spike).

- [ ] **Supabase prod (via MCP staging read-only NO aplica — es prod;
  usar Dashboard SQL Editor con service_role o consultar via UI)**:
  verificar que las marcas de las reservas procesadas quedaron populadas:
  ```sql
  SELECT count(*) AS con_marca_tutor,
         count(*) FILTER (WHERE recordatorio_proveedor_enviado_at IS NOT NULL) AS con_marca_prov
    FROM agendamientos
   WHERE recordatorio_tutor_enviado_at >= NOW() - INTERVAL '1 hour';
  ```
  Esperado: ambos > 0 si hubo reservas confirmadas para "hoy siguiente
  Chile" al momento de la corrida.

- [ ] **Vercel Logs — cero 500** en `/api/cron/recordatorio-reserva`
  durante la ventana [22:00 UTC, 22:15 UTC].

## Fase 5 — Monitor 48h (dos corridas del cron)

Como el cron es diario a las 22:00 UTC, en 48h ocurren exactamente 2
ejecuciones. Verificar ambas pasan limpias y detectar cualquier
comportamiento inesperado.

- [ ] **Corrida N+0** (día del merge o siguiente): registrar `sent.tutor`
  + `sent.proveedor` + `failures.length` desde Vercel Logs. Snapshot
  guardado en el acta.

- [ ] **Corrida N+1** (24h después): mismos métricos. Verificar que las
  marcas de la corrida N+0 NO se re-escribieron en N+1 (idempotencia
  en prod real — el filter OR NULL de la N+1 debe excluir las rows
  procesadas en N+0):
  ```sql
  -- Correr después de la 2ª corrida. Contar marcas actualizadas en la
  -- ventana [N+1 22:00 UTC ± 15 min]. Debe reflejar SOLO rows nuevas
  -- (reservas confirmadas entre N+0 y N+1 con fecha_preferida en la
  -- ventana de N+1). NO debe re-tocar rows procesadas en N+0.
  SELECT id, recordatorio_tutor_enviado_at, recordatorio_proveedor_enviado_at
    FROM agendamientos
   WHERE recordatorio_tutor_enviado_at BETWEEN '<N+1 22:00>'::timestamptz
                                             AND '<N+1 22:15>'::timestamptz;
  ```

- [ ] **Bandeja soporte / Resend Complaints / Vercel Logs**: cero quejas
  de usuarios por recordatorios erróneos (email al destinatario
  equivocado, "Mañana:" cuando no tenían reserva mañana, doble envío del
  mismo email al mismo destinatario del mismo día).

- [ ] **Verificación cross-tren con la deuda instrumentación drift R6**:
  si en N+1 aparecen marcas re-escritas de reservas procesadas en N+0
  (aunque el filter OR NULL debería excluirlas), es la primera evidencia
  en prod del drift observado en la suite R6 — reportarlo al item de
  BACKLOG `Instrumentar recordatorio-reserva para diagnóstico de drift`
  con timestamps exactos + agendamientoIds afectados.

## Plan de rollback

### Escenario A — Deploy Vercel roto (build fail o runtime crash inmediato)

**Comportamiento del rollback + crons según doc oficial Vercel**
(https://vercel.com/docs/cron-jobs/manage-cron-jobs, sección "Rollbacks
with cron jobs", verificado 2026-07-30):

> "If you Instant Rollback to a previous deployment, active cron jobs will
> not be updated. They will continue to run as scheduled until they are
> manually disabled or updated."

Es decir: **Instant Rollback / Promote to Production de un deployment
anterior NO desregistra el cron nuevo**. Los crons siguen activos como
estaban antes del rollback. Este comportamiento es contraintuitivo — no
sigue el `vercel.json` del deployment "activo" post-rollback — así que se
necesita paso manual adicional para removerlo si el bug es del cron.

**Paso 1 — Revertir el código de prod** (opcional, solo si el crash es del
bundle, no del cron): Vercel Dashboard → Deployments → el deploy anterior
(previo a `42c151e`) → **Promote to Production**. 1 click. El tráfico HTTP
público (www.pawnecta.com) vuelve a servirse del bundle viejo.

**Paso 2 OBLIGATORIO — Desregistrar el cron nuevo** (los crons no siguen
automáticamente al rollback):

- **Opción A rápida (Dashboard)**: Vercel Dashboard → Project → Settings →
  Cron Jobs → botón **Disable Cron Jobs** en la fila
  `/api/cron/recordatorio-reserva`. Cero commit necesario; el cron queda
  listado como disabled pero no ejecuta.
- **Opción B durable (git)**: editar `vercel.json` en `main` removiendo la
  entry del cron nuevo + commit + push. El próximo deploy lo desregistra
  y queda reflejado en el repo. Preferir esta si el rollback es
  permanente.

Consecuencias funcionales del rollback + Paso 2:
- Bundle prod: vuelve al deployment anterior (sin `RecordatorioReservaEmail`,
  sin retrofit R7 de templates).
- Cron nuevo: desregistrado por Paso 2. La primera corrida 22:00 UTC post-
  rollback NO se dispara.
- Migration R1 (columnas marca): **queda aplicada** — aditivas + NULL, no
  interfieren con el código viejo que las ignora completo. Cero data loss.
- Recordatorios ya enviados por corridas previas al rollback (si las hubo):
  quedan enviados; sus marcas quedan populadas en BD (inofensivas para el
  código viejo).

### Escenario B — Cron ejecuta y envía emails erróneos / spam

Fix inmediato: quitar la entry del cron de `vercel.json` + push. Vercel
desregistra el cron en el próximo deploy. El endpoint sigue vivo pero
solo se dispara cuando alguien lo llama manualmente (con secret).

```bash
git checkout main
git pull origin main
# Editar vercel.json — remover la línea:
#   { "path": "/api/cron/recordatorio-reserva", "schedule": "0 22 * * *" }
git add vercel.json
git commit -m "chore(recordatorios): rollback cron entry — revisar bug post-corrida"
git push origin main
```

- Alternativamente: `git revert c11746e -m 1` (revierte solo el commit del
  vercel.json), pero como `c11746e` incluye también el mapa semántico en
  BACKLOG.md, el revert arrastra ese cambio. Preferir el edit manual del
  vercel.json.
- Las columnas marca (aplicadas en Fase 1) **se quedan** — son aditivas,
  no interfieren con nada. El resto del tren (endpoint, template
  RecordatorioReservaEmail, retrofit de los 4 templates de confirmación/
  cancelación R7) también se queda: son código nuevo pero no se ejecuta
  sin el cron o sin invocación manual, y el retrofit visual es mejor que
  el layout anterior (nada peor si se queda).

### Escenario C — Migration R1 causa problema inesperado

**No debería pasar** (aditiva, sin default, sin trigger, sin constraint). Si
algo ocurriera:
```sql
-- Solo si es absolutamente necesario. La columna es aditiva; dropearla
-- es más agresivo que necesario en el 99% de escenarios.
BEGIN;
ALTER TABLE public.agendamientos
    DROP COLUMN IF EXISTS recordatorio_tutor_enviado_at,
    DROP COLUMN IF EXISTS recordatorio_proveedor_enviado_at;
COMMIT;
```

Con PITR: recovery al momento pre-migration. Sin PITR: restore desde
backup manual de Fase 0.

**Regla general**: preferir **fix-forward** sobre rollback de migrations o
código. Las columnas nuevas se quedan; los bugs se parchean con nuevos
commits.

## Deuda P0/P1 conocida (post-launch — no bloquea merge)

Documentada en `CLAUDE.md` y `BACKLOG.md`:

- **P1 nueva del tren**: Instrumentar `/api/cron/recordatorio-reserva` con
  `?verbose=1` para diagnosticar el drift observado en R6 (ver
  `BACKLOG.md > Instrumentar recordatorio-reserva para diagnóstico de
  drift`). Solo se activa si Fase 5 muestra la misma anomalía en prod
  real; si no, la deuda puede diferirse sin urgencia.
- **P2**: Retrofit de emails de confirmación/cancelación adoptado (R7) —
  templates ya migrados a props opcionales `fechaSub` + `donde`, pero los
  **endpoints callers no fueron migrados** aún (siguen pasando el string
  full como `fechaFormateada` sin `fechaSub` separado, y usando
  `modalidadLabel + direccionServicio` en vez del nuevo `donde`).
  Retrocompat total: cero regresión visible. Sprint chico post-merge
  cuando se toque cualquier endpoint de agendamiento.
- **P2** (arrastradas de F2): rename ruta `/mis-solicitudes` →
  `/mis-reservas` + rename taxonomía en templates.

## Anexo — commit único post-merge (documentación en `main`)

Si la Fase 5 pasa limpia, cerrar el tren con un tag anotado en `main`:

```bash
git checkout main
git pull origin main
git tag -a recordatorios-prod-YYYYMMDD -m "Tren Recordatorios en prod — R1-R7 completo"
git push origin recordatorios-prod-YYYYMMDD
```

Actualizar `CLAUDE.md > Estado del roadmap` de "Recordatorios de cita
(diseño en curso)" a "Recordatorios de cita — EN PROD desde YYYY-MM-DD
(tag recordatorios-prod-YYYYMMDD sobre 42c151e). Siguiente tren
Doctoralia-style: `<lo que decida PO>`.".
