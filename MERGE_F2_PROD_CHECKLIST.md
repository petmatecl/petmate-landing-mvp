# Merge F2 → producción — checklist ejecutable (v2)

Versión v2 con 4 ajustes post-triage:
- Fase 1.1: verificación previa de extensión `btree_gist`.
- Fase 1.2: snapshot obligatorio de la policy `agendamientos_tutor_cancel` antes de aplicar (dependencia del rollback B).
- Fase 0: rama explícita para PITR ausente (backup manual como precondición).
- Fase 3: patrón de cuentas Eduardo (proveedor) / Aldo (tutor) + 2 checks nuevos (blackout deshabilitado + rango cancelado liberado).

**Contexto**: 2 migrations pendientes a Supabase prod (`ouezpeeiwjwawauidrqq`) + merge `staging → main` + deploy Vercel automático. Alcance del entregable F2: schema estadía + endpoint disponibilidad + branching esRango en emails/dialogs + endpoint cancelar con ventana + RLS restringido + suite e2e + 3 sweeps de audits.

Commits en `staging` desde la última promoción a `main`:
- `717da8a` fix(agenda): F2-3-B semáforo esRango
- `88c13b1` feat(agenda): F2-3-B branching esRango en templates
- `34079f9` feat(agenda): F2-3-A endpoint disponibilidad de noches
- `62809e6` feat(agenda): F2-3-D endpoint cancelar + ventana
- `33a3afb` feat(e2e): F2-3-E suite tutor
- `1432e4d` chore(higiene): micro-copy F2 en emails + doc CLAUDE.md dual-cuenta
- `daff1c3` fix(ux): 401 amable — redirect + banner
- `11f1dcf` security: sweep #1 (7 findings audit)
- `d218b70` a11y+copy: sweep #2 (5 findings Design + mini-fixes)
- `275cf2e` copy: sweep #3 taxonomía reserva universal

---

## Fase 0 — Preflight (en staging, antes de tocar `main`)

- [ ] **Verificar en Vercel Dashboard que el ÚLTIMO commit de `staging` tiene deployment READY.** Regla nueva post-incidente del 24-07-26 (dos sweeps `d218b70`/`275cf2e` fallaron build silente por rules-of-hooks; `tsc --noEmit` local no lo detectó porque es regla ESLint, y las suites e2e corrían contra el deploy anterior aparentando verde). Ir a Vercel Dashboard → project → Deployments → filtrar por branch `staging` → confirmar el SHA del último commit local (`git rev-parse HEAD` en `staging`) coincide con un deployment estado **Ready** (no "Error", no "Building"). Si no está Ready, PARAR y arreglar antes de cualquier smoke o suite.
- [ ] Suite e2e 32/32 verde (con s10 activo, copy nuevo).
- [ ] Smoke manual staging: golden path como tutor real (Camila) — reserva F2 feliz + cancelación dentro/fuera ventana + verificación de recepción de emails en `AUDIT_INBOX` con prefijo `[STAGING]`.
- [ ] Smoke manual staging: golden path como proveedor real (Aldo) — recibir una reserva F2 en el tab "Reservas y solicitudes", confirmar el email de notificación.
- [ ] Confirmar Supabase prod tiene Point-in-Time Recovery activo (Supabase Dashboard → Project `ouezpeeiwjwawauidrqq` → Database → Backups). **Dos ramas según tier**:
  - **Con PITR activo (tier Pro+)**: casilla marcada, seguir.
  - **Sin PITR (tier Free/Starter)**: paso obligatorio antes de Fase 1 —
    - [ ] Bajar backup manual descargable: Supabase Dashboard → Database → Backups → **Download** el snapshot más reciente disponible.
    - [ ] Alternativa si "Download" no está disponible: `pg_dump` desde la connection string de prod a un `.sql` local antes de continuar. Guardar el archivo en un directorio seguro fuera del repo con fecha (`backup-prod-YYYYMMDD-HHMM.sql`).
    - [ ] Verificar que el archivo pesa > 0 bytes y es un dump SQL válido (`head` del archivo debe mostrar `-- PostgreSQL database dump`).
- [ ] Confirmar `main` no tiene hotfixes divergentes de `staging` (`git log main..staging` vs `git log staging..main` — el segundo debe ser vacío).
- [ ] Confirmar env vars en Vercel prod (Dashboard → Project → Settings → Environment Variables, filtrar por Production):
  - `NEXT_PUBLIC_APP_ENV=production`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `INTERNAL_API_SECRET`
  - `NEXT_PUBLIC_SITE_URL=https://www.pawnecta.com`
  - `RESEND_API_KEY`
  - VAPID keys prod (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`)
  - `CRON_SECRET`

## Fase 1 — Migraciones a Supabase prod (`ouezpeeiwjwawauidrqq`)

**Aplicación manual por Aldo** desde Supabase Dashboard → SQL Editor. Orden **estricto** — la segunda depende de la primera.

### 1.1 — `migrations/20260718_agenda_estadia_schema.sql` (F2-1 schema base)

- [ ] **Verificación previa de extensión** (debe retornar 1 fila — está desde F1, es cinturón):
  ```sql
  SELECT extname FROM pg_extension WHERE extname='btree_gist';
  ```
  Si retorna 0 filas → **PARAR y reportar antes de aplicar**. El EXCLUDE constraint de la migration usa `WITH GIST (agend_estadia_range(...) WITH &&)` y necesita `btree_gist`.

- [ ] **Verificar antes** — la columna aún no existe (debe retornar 0 filas):
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name='agendamientos' AND column_name='capacidad_snapshot_estadia';
  ```

- [ ] **Aplicar el archivo completo** `migrations/20260718_agenda_estadia_schema.sql`.

- [ ] **Verificar después** — los 4 checks deben retornar 1+ filas:
  ```sql
  -- (a) columnas en agendamientos
  SELECT column_name FROM information_schema.columns
  WHERE table_name='agendamientos' AND column_name IN ('capacidad_snapshot_estadia', 'fecha_fin');
  -- esperado: 2 filas

  -- (b) columnas de config del servicio
  SELECT column_name FROM information_schema.columns
  WHERE table_name='servicios_publicados'
    AND column_name IN ('capacidad_estadia', 'min_noches', 'max_noches',
      'cancelacion_min_horas_antes', 'check_in_hora', 'check_out_hora',
      'anticipacion_min_dias', 'anticipacion_max_dias_estadia');
  -- esperado: 8 filas

  -- (c) helper IMMUTABLE
  SELECT proname FROM pg_proc WHERE proname='agend_estadia_range';
  -- esperado: 1 fila

  -- (d) EXCLUDE constraint
  SELECT conname FROM pg_constraint WHERE conname='agendamientos_no_solape_estadias';
  -- esperado: 1 fila
  ```

### 1.2 — `migrations/20260723_agendamientos_cancel_rls_f2.sql` (F2-3-D RLS restringido)

- [ ] **Snapshot obligatorio de la policy actual** (dependencia crítica del Escenario B de rollback — sin este snapshot no se puede revertir). Correr:
  ```sql
  SELECT qual, with_check FROM pg_policies
  WHERE tablename='agendamientos' AND policyname='agendamientos_tutor_cancel';
  ```
  **Pegar el output completo (ambas columnas) en el acta del merge**. Este es el estado pre-migration del USING y WITH CHECK — es lo único que permite reconstruir la policy exacta si hay que revertir.

- [ ] **Verificar antes** — la policy actual NO contiene el filtro F2 (el `qual` no menciona `capacidad_snapshot_estadia`):
  ```sql
  SELECT qual FROM pg_policies
  WHERE tablename='agendamientos' AND policyname='agendamientos_tutor_cancel';
  ```

- [ ] **Aplicar el archivo completo** `migrations/20260723_agendamientos_cancel_rls_f2.sql`.

- [ ] **Verificar después** — el `qual` ahora contiene la exclusión F2:
  ```sql
  SELECT qual FROM pg_policies
  WHERE tablename='agendamientos' AND policyname='agendamientos_tutor_cancel';
  -- esperado: "... AND (NOT ((capacidad_snapshot_estadia IS NOT NULL) AND (estado = 'confirmada'::text)))"
  ```

## Fase 2 — Deploy código a prod

```bash
git checkout main
git pull origin main
git merge staging  # si hay conflicts, PARAR y reportar
git push origin main
```

**Vercel autodeploya en push a `main`**. Esperar ~1-2 min. Verificar en Vercel Dashboard → Deployments que el build pasó (verde).

**Si el build falla**: NO se activa el nuevo deploy. Prod sigue con el código anterior. Revisar logs de build y decidir fix-forward vs revert.

## Fase 3 — Smoke prod (post-deploy inmediato)

**Patrón de cuentas** (espeja el Smoke A que usamos en F1):
- **Proveedor**: **Eduardo** — configura el servicio de prueba con `capacidad_estadia=1`, `min_noches=2`, `cancelacion_min_horas_antes=48`, **más un blackout de prueba** en `excepciones_disponibilidad` para días específicos del rango que Aldo va a explorar (ej. `+7d/+9d` en formato `YYYY-MM-DD`).
- **Tutor**: **Aldo** — reserva desde su cuenta tutor, cancela, verifica libración del rango.

Este patrón evita cualquier edge de auto-reserva (proveedor reservando sobre sí mismo bypasea RLS `tutor_id ≠ proveedor.auth_user_id`).

### 3.1 — Landing y navegación

- [ ] `https://www.pawnecta.com` — carga sin errores console.
- [ ] `/explorar` — muestra servicios.
- [ ] Header logueado (Aldo tutor) muestra navlink **"Mis reservas"** (sweep #3 activo).

### 3.2 — Configuración del servicio F2 (por Eduardo)

- [ ] Eduardo crea/edita 1 servicio con `capacidad_estadia=1`, `min_noches=2`, `cancelacion_min_horas_antes=48` desde `/proveedor` con el toggle "Habilitar reservas" en ON.
- [ ] Eduardo agrega **1 blackout** en el editor F2 (sección "Reservas" del ServiceFormModal): rango `[+7d, +9d)` con motivo "prueba merge F2".
- [ ] Guardar y verificar mensaje de éxito.

### 3.3 — Reserva por Aldo (tutor)

- [ ] Aldo abre la ficha del servicio de Eduardo. CTA muestra **"Reservar"** (no "Solicitar agendamiento").
- [ ] Verificar que un servicio SIN F2 (uno legacy de otro proveedor) muestra CTA **"Enviar solicitud"** (regresión negativa — sweep #3 taxonomía).
- [ ] Aldo abre modal F2 → título **"Reservar estadía"** + picker se renderiza + Escape cierra sin efecto.
- [ ] **Check blackout**: los días `+7`, `+8` del picker aparecen deshabilitados (grises, no clickeables). El día `+9` (check-out del blackout, semi-abierto `[+7, +9)`) sigue **disponible**.
- [ ] Aldo selecciona rango de 2 noches en fechas fuera del blackout (ej. `+15/+17`) → click **"Confirmar reserva"** → toast **"Reserva confirmada"** con acción **"Ver mis reservas"**.
- [ ] Aldo aterriza en `/mis-solicitudes` (ruta física intacta) — heading **"Mis reservas"** + card visible con el servicio de Eduardo, estado "Confirmada".

### 3.4 — Emails de la reserva

- [ ] Eduardo recibe email real con subject "Nueva reserva confirmada en Pawnecta" — cuerpo con "Nueva reserva" (no "solicitud"), rango de noches formateado, check-in/check-out horas.
- [ ] Aldo recibe email real con subject "Tu reserva con Eduardo está confirmada" — cuerpo con "Elegiste las noches disponibles" (branching esRango correcto).

### 3.5 — Cancelación por Aldo

- [ ] Aldo hace click **"Cancelar reserva"** en la card de `/mis-solicitudes` → dialog abre con título **"Cancelar reserva"** (título único, sweep #3 — no "Cancelar estadía"). Message menciona "noches" y "avisaremos al proveedor por email".
- [ ] Aldo presiona **"Volver"** — dialog cierra sin efecto. Reserva sigue confirmada.
- [ ] Aldo abre dialog de nuevo y presiona **"Cancelar reserva"** (el confirm) → toast **"Cancelación enviada. El proveedor fue notificado."**
- [ ] Verificar en `/mis-solicitudes` que la card ahora muestra estado "Cancelada por ti".

### 3.6 — Emails de cancelación

- [ ] Eduardo recibe email real con subject "Aldo canceló una reserva" (o similar sin "cita") — cuerpo con "canceló la estadía" (branching esRango).

### 3.7 — Rango liberado post-cancelación (verificación empírica)

- [ ] Aldo abre de nuevo el picker del servicio de Eduardo.
- [ ] Los días del rango recién cancelado (`+15`, `+16`) aparecen **disponibles** de nuevo — el fetch de `/api/servicios/[id]/disponibilidad-noches` los filtra por `estado != 'cancelada'`, así que se liberan al instante.
- [ ] (Opcional) Aldo puede reservarlos de nuevo para confirmar end-to-end el ciclo completo.

### 3.8 — Verificaciones adicionales

- [ ] Vercel Logs (últimos 15 min): **cero 500** en `/api/agendamientos/*` durante la ventana del smoke.
- [ ] Supabase Dashboard → Table Editor → `agendamientos`: fila cancelada tiene `capacidad_snapshot_estadia=1, fecha_fin NOT NULL, estado='cancelada', respondido_at NOT NULL`.
- [ ] Supabase Dashboard → Table Editor → `excepciones_disponibilidad`: fila del blackout de Eduardo persiste correcta (`fecha`, `fecha_fin`, `motivo='prueba merge F2'`).

## Fase 4 — Monitor 24h

- [ ] Vercel Logs: sin spike de 500/403 en `/api/agendamientos/*`.
- [ ] Supabase Logs: sin rebotes `23P01` inexplicados (deben aparecer solo cuando hay race real de reservas).
- [ ] Resend Dashboard: emails de reserva confirmada + notify-proveedor con delivery ok.
- [ ] Bandeja soporte: ningún ticket "no puedo reservar" o "no puedo cancelar".

## Plan de rollback

### Escenario A — Deploy Vercel roto (build fail o runtime crash inmediato)
Vercel Dashboard → Deployments → deploy anterior → **Promote**. 1 click. Migrations quedan aplicadas (columnas nuevas son aditivas + NULL, no interfieren con el código viejo). No hay data loss.

### Escenario B — RLS F2-3-D rompe cancelaciones legítimas
Revert manual usando el snapshot que se guardó **obligatoriamente en Fase 1.2**:
```sql
DROP POLICY agendamientos_tutor_cancel ON agendamientos;
CREATE POLICY agendamientos_tutor_cancel ON agendamientos
FOR UPDATE TO public
USING ( <qual del snapshot de Fase 1.2> )
WITH CHECK ( <with_check del snapshot de Fase 1.2> );
```
Sin el snapshot el rollback es reconstrucción a mano — arriesgado.

### Escenario C — Data corruption F2
No debería pasar (schema aditivo, EXCLUDE constraint valida contra duplicados en el INSERT). Si algo raro sí ocurre:
- **Con PITR**: recovery al momento pre-migration (Supabase Dashboard → Database → Backups → Point-in-Time).
- **Sin PITR**: restore desde el backup manual guardado en Fase 0 (`pg_restore` a un branch nuevo, comparar, reconciliar). Es el "botón rojo" — coordinar antes de ejecutar.

**Regla general**: preferir **fix-forward** sobre rollback de migrations. Las columnas nuevas se quedan; los bugs se parchean con nuevos commits.

## Deuda P0/P1 conocida (post-launch — no bloquea merge)

Documentada en `CLAUDE.md`:
- **P0**: Bump Next 14 → 15 (HTTP smuggling en `/supabase-proxy/*`, DoS `next/image`).
- **P1**: Advisory lock para F2 grupales (`capacidad_estadia > 1` — race de doble-booking teórico).
- **P1**: Migrar `/api/push/send` a patrón id-only al reactivar push notifs.
- **P2**: Rename ruta `/mis-solicitudes` → `/mis-reservas` + redirect 301.
- **P2**: Rename taxonomía "agendamiento" → "reserva" en 4 templates de email.
- **P2**: Rediseño gate anti-review-spam (vector chat trivial abierto).
- **P2**: Rate-limit distribuido (Upstash) — el in-memory actual no persiste en Vercel serverless.
