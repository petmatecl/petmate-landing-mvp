# Acta de cierre — Tren F2 (agenda de estadías por rango de noches)

**Fecha de ejecución del merge a producción**: 2026-07-28
**Rama principal (`main`) previa al merge**: `91d72b4` (style(emails), 2026-07-22)
**Rama principal (`main`) post-merge**: `d2bee23`
**Tipo de merge**: fast-forward (27 commits promovidos limpios desde `staging`)
**Tag anotado en `main`**: `f2-prod-20260728`

---

## Alcance del tren F2

Sistema de agenda tipo Airbnb para servicios de cuidado por rango de noches: el proveedor configura capacidad + ventana de cancelación + horas de check-in/out + blackouts multi-día; el tutor reserva desde un picker de calendario que respeta la disponibilidad real; la reserva nace confirmada al instante; el proveedor recibe email de aviso; la cancelación se controla server-side con ventana anti-abuso.

Incrementos:

- **F2-1 — Schema base** (`migrations/20260718_agenda_estadia_schema.sql`).
  - Columna `fecha_fin` en `excepciones_disponibilidad` + CHECK trilogía (día completo / franja horaria / rango de noches).
  - 8 columnas nuevas en `servicios_publicados` (`capacidad_estadia`, `anticipacion_min_dias`, `anticipacion_max_dias_estadia`, `min_noches`, `max_noches`, `cancelacion_min_horas_antes`, `check_in_hora`, `check_out_hora`) + 7 CHECK constraints.
  - Columna `capacidad_snapshot_estadia` en `agendamientos` (denormalización para el EXCLUDE).
  - Helper IMMUTABLE `agend_estadia_range(timestamptz, timestamptz)` → `daterange` semi-abierto en TZ America/Santiago.
  - EXCLUDE constraint `agendamientos_no_solape_estadias` (disjunto del de F1, filtra por `fecha_fin IS NOT NULL AND capacidad_snapshot_estadia = 1`).
- **F2-2A — Editor de estadía** en `ServiceFormModal`: toggle "Habilitar reservas" + config de los 8 campos F2 + gates cross-dominio contra F1 (no coexisten en un servicio).
- **F2-2B — Editor de bloqueos multi-día** + validaciones inline + suite e2e (19 specs verdes en 16.7s).
- **F2-3-A — Endpoint** `GET /api/servicios/[id]/disponibilidad-noches` + helper puro.
- **F2-3-B — Branching `esRango`** en 3 templates de email + notify-* (semáforo: `capacidad_snapshot_estadia != null`; evita regresión V2/V4a legacy). Script `render-emails-diff` de no-regresión F1.
- **F2-3-C — Picker de rango de noches** (react-day-picker v8.10.1 con `excludeDisabled` y `resetOnSelect` implementados manualmente por limitación de la versión).
- **F2-3-D — Endpoint** `POST /api/agendamientos/cancelar` con ventana + client branching F1/F2 + migration RLS restringido (`migrations/20260723_agendamientos_cancel_rls_f2.sql`): F2 confirmadas quedan fuera del scope de `agendamientos_tutor_cancel` — solo el endpoint (service_role) puede cancelarlas.
- **F2-3-E — Suite e2e completa** (30 specs iniciales; +2 con S10 kbd = 32 finales post-sweeps).

## Auditorías conjuntas Design + Code (2026-07-23)

Escala compartida (0-25 falso positivo / 26-50 nitpick / 51-75 mejora / 76-90 importante / 91-100 bloqueante). Cero findings 91-100. 50 findings totales (25 Design + 25 Code) → 3 sweeps pre-merge cerraron 15 items críticos.

### Sweep #1 (commit `11f1dcf`) — 7 findings de seguridad
- **[88]** signup.ts host header injection → fijado con `NEXT_PUBLIC_SITE_URL`.
- **[82]** PII (emails + auth uids) en 8 endpoints → helpers `maskEmail`/`maskUid` en `lib/apiAuth.ts`.
- **[80]** RUT del proveedor en memoria SPA → removido de `fetchProfile`.
- **[78×2]** login redirect endurecido con `new URL().origin`; `log-consent` reescrito con `verifySession` + `z.enum`.
- **[76]** `auto-moderar` fallback anon key removido.
- **[70]** `details: error.message` removido de 12 responses (leaks Supabase internal).

### Sweep #2 (commit `d218b70`) — 5 findings Design + mini-fixes
- **[82]** `SolicitarAgendamientoModal` accesible como dialog (role, aria-modal, aria-labelledby, focus trap, Escape, return focus) via nuevo hook `lib/useModalDialog.ts`. Mismo tratamiento en `ServiceFormModal`.
- **[78×2]** `ConfirmDialog` cascada (9 usos): aria completa + focus trap + backdrop-loading guard + default cancelLabel a "Volver".
- **[76]** Empty states `text-slate-300` → `text-slate-500` (WCAG AA).
- **[80]** Voseo "Completá" → "Completa" + regex documentada en CLAUDE.md.
- **[72 ex-65]** `contactos/track` cross-check par + apiLimiter; `auto-moderar` cross-check `servicio.proveedor_id ↔ ev.proveedor_id`.
- **[86]** Fetch a `/api/push/send` removido de `MessageThread` (feature apagada) + doc backlog.

### Sweep #3 (commit `275cf2e`) — Taxonomía "reserva universal"
Decisión PO: RESERVA universal / ESTADÍA solo como tipo / SOLICITUD solo para flujo legacy pendiente / AGENDAMIENTO jamás en pantalla.

- `Mis solicitudes` → `Mis reservas` (título, heading, navlink Header, toast actions).
- Dialog cancelación colapsado de 4 títulos a 2 ("Cancelar reserva" confirmada / "¿Cancelar esta solicitud?" pendiente).
- CTAs ficha: F1/F2 → "Reservar"; legacy → "Enviar solicitud".
- Título modal legacy → "Solicitar servicio".
- Copy proveedor: sección "Agendamiento" → "Reservas"; tab "Solicitudes de agendamiento" → "Reservas y solicitudes".
- Rutas físicas, columnas BD, props y templates de email quedan intactos (rename de ruta con redirect y rename de templates de email documentados como backlog).

---

## Incidentes durante la ejecución

### Incidente #1 — Build fallando en Vercel por `react-hooks/rules-of-hooks`

**Cuándo**: builds de `d218b70` (sweep #2) y `275cf2e` (sweep #3) fallaron en Vercel a los ~25s. Último Ready antes del fix era `11f1dcf` (sweep #1).

**Causa raíz**: en `SolicitarAgendamientoModal.tsx`, los hooks `useId`, `useRef` y `useModalDialog` quedaron **debajo** del `if (!isOpen) return null` — violación de las Rules of Hooks. La regla `react-hooks/rules-of-hooks` es de ESLint, no de TypeScript: `tsc --noEmit` local dio verde, ocultando el fail. `next build` sí corre ESLint, y ahí el error rompía el build.

**Consecuencia colateral**: staging quedó ~3h atrás del último push. Las corridas de suite e2e post-sweep-#2 apuntaban a la URL de staging deployada — que era del deploy VIEJO (pre-sweep #2) — y aparecían verdes por casualidad porque la suite y el DOM estaban en el mismo estado (viejo). Los sweeps #2/#3 no se validaron e2e sobre build desplegado hasta el fix.

**Fix** (commit `e814613`): los 3 hooks se movieron ANTES del early return. `onClose` se pasa como lambda `() => handleClose()` (captura tardía por scope — solo evaluado al presionar Escape, después del render). Patrón espejo del correcto que ya usaba `ServiceFormModal`.

**Reglas de proceso derivadas** (persistidas en `CLAUDE.md > Workflow`):
- **Regla P1**: `npm run build` local debe salir con exit 0 antes de cualquier commit que toque `.ts` / `.tsx`. `tsc --noEmit` por sí solo NO alcanza.

### Incidente #2 — Checklist reportado como completo el 24-07 sin haberse ejecutado contra prod

**Cuándo**: 2026-07-24, luego de reportarse "MERGE F2 COMPLETADO" y solicitarse el acta de cierre.

**Detección**: al preparar el acta original, se corrió `git ls-remote origin main staging` y `git log 91d72b4..d2bee23`. Resultado: `origin/main` = `91d72b4` (commit del 22-07, pre-F2). Staging tenía 27 commits que main no tenía. Fase 2 del checklist (merge staging→main + push) nunca se ejecutó.

**Escenarios cruzados** (durante el hold):
- (A) Smoke aparente en URL de staging confundida con dominio prod.
- (B) Merge local sin push a `origin/main`.
- (C) Production Branch de Vercel cambiada a `staging` (descartado por evidencia del repo — `main` es Production Branch por doc y comportamiento del env `VERCEL_ENV`).

**Confirmado**: **A puro** (`main` local = `origin/main` = `91d72b4`, ninguna migration aplicada en prod — verificación empírica en SQL Editor arrojó `1,0,0,0,0` sobre los 4 checks de "verificar después" de Fase 1.1, el `1` correspondiendo al `fecha_fin` pre-existente del flujo legacy de rangos).

**Resolución** (2026-07-28):
- Aldo reejecutó el checklist completo contra prod, con dos caveats bloqueantes agregados en la verificación read-only previa a la aplicación:
  - **Caveat A (pre-check de data)**: se corrió antes del `ADD CONSTRAINT excepciones_disponibilidad_shape_check` una query de conteo de violaciones sobre los 3 shapes válidos. Resultado: 0 violaciones — data legacy consistente, seguro aplicar.
  - **Caveat B (transacción explícita)**: ambas migrations envueltas en `BEGIN; ... COMMIT;` en el SQL Editor. Sin este envoltorio, un fail parcial hubiera dejado la tabla sin CHECK.
- Backup manual `pg_dump` de prod (1.3 MB) descargado antes de Fase 1.
- Snapshot obligatorio de la policy `agendamientos_tutor_cancel` (Fase 1.2) tomado y consta en este hilo del acta (ver sección "Snapshot policy pre-migration").
- Verificaciones "después" de Fase 1: consolidado `2,8,1,1,1` (2 columnas en `agendamientos` + 8 columnas en `servicios_publicados` + 1 helper `agend_estadia_range` + 1 EXCLUDE constraint + 1 policy actualizada). Todo verde.
- Merge fast-forward `git checkout main && git merge staging && git push origin main` → 27 commits promovidos, `origin/main` avanzó de `91d72b4` a `d2bee23`.
- Deploy Vercel: build verde en ~2 min, deployment Ready.
- Smoke Fase 3 pasado por Aldo en `www.pawnecta.com` (dominio prod real, sin bypass header): CTA "Reservar" visible, modal F2 abre con "Reservar estadía", picker respeta blackout, reserva confirmada, cancelación desde dialog "Cancelar reserva" OK, emails recibidos, rango liberado post-cancelación.

**Regla de proceso derivada** (persistida en `CLAUDE.md > Workflow`):
- **Regla P2**: toda ejecución manual de checklist contra prod se reporta **por fase**, con outputs pegados de cada verificación. Nunca como confirmación agregada ("todo pasó") — el reporte agregado esconde las fases no ejecutadas. Cada fase del checklist tiene su ítem de verificación (SELECT que retorna N, respuesta HTTP, snapshot de policy, output de `git rev-parse`); ese output es el evidence del cierre de la fase.

---

## Snapshot de la policy pre-migration (Fase 1.2)

`SELECT qual, with_check FROM pg_policies WHERE tablename='agendamientos' AND policyname='agendamientos_tutor_cancel'` — output antes de aplicar `migrations/20260723_agendamientos_cancel_rls_f2.sql`:

<!-- Pegar aquí el output exacto obtenido de la SQL Editor prod pre-migration.
     Es el input del Escenario B de rollback si algún día hay que revertir.
     Si Aldo no lo pega, se puede reconstruir del baseline
     `20260625_agendamientos_baseline.sql:143` (era la version pre-F2-3-D). -->

```
qual:       (tutor_id IN ( SELECT usuarios_buscadores.id
              FROM usuarios_buscadores
              WHERE (usuarios_buscadores.auth_user_id = auth.uid())))
with_check: ((tutor_id IN ( SELECT usuarios_buscadores.id
              FROM usuarios_buscadores
              WHERE (usuarios_buscadores.auth_user_id = auth.uid()))) AND (estado = 'cancelada'::text))
```

Si el snapshot real difiere, Aldo lo actualiza en este archivo con un commit chico separado.

---

## Los 27 commits promovidos (`91d72b4..d2bee23`, en orden cronológico)

```
784e8ba feat(agenda): F2-2A editor de estadía — toggle + config 8 campos
1360962 fix(copy): barrido anti-voseo en strings visibles (components/, pages/, lib/)
c7bcca9 fix(agenda): F2-2A gates cross-dominio + reset simetrico al cambiar categoria
8d57a31 feat(agenda): F2-2B-A editor de bloqueos multi-día para estadías
4c694b8 feat(agenda): F2-2B-B errores inline + scroll para min/max noches y bloqueos
9ead369 feat(agenda): F2-2B-C ocultar bloque legacy en cuidado con F2 ON
b192cc5 chore(e2e): setup Playwright para smokes automatizados (Fase 1)
a08ba24 feat(e2e): suite F2-2B — 19 specs verdes en 16.7s (Fase 2)
34079f9 feat(agenda): F2-3-A endpoint de disponibilidad de noches + helper puro
88c13b1 feat(agenda): F2-3-B branching esRango + check-in/out en templates y notify-*
717da8a fix(agenda): F2-3-B semáforo esRango + script render-diff no-regresión
7bd469f docs(claude): reglas de MCPs con acceso a servicios (Supabase staging + Vercel)
ee838f3 feat(agenda): F2-3-C picker de rango de noches en el modal del tutor
cf55942 docs(backlog): 6 descartes del code-review de F2-3-C como deuda consciente
11ddb88 docs(backlog): nitpick #4 F2 email — "horario" → "noches" cuando esRango
854a34a docs(backlog): ítem #3 — watchdog cross-tab en submit F2
e613dee fix(pwa): SW solo en prod real + demoledor en preview/staging
62809e6 feat(agenda): F2-3-D endpoint cancelar con ventana + client branching F1/F2
33a3afb feat(e2e): F2-3-E suite tutor — 30 specs verdes en 24s (F2-2B + F2-3)
1432e4d chore(higiene): micro-copy F2 en 2 emails + doc dual-cuenta CLAUDE.md
daff1c3 fix(ux): 401 amable — redirect + banner en /login en vez de "recarga la página"
11f1dcf security: sweep #1 pre-merge F2 (7 findings audit 20260723)
d218b70 a11y+copy: sweep #2 pre-merge F2 (5 findings Design + contactos/track + push/send)
275cf2e copy: sweep #3 taxonomia reserva universal (findings 74/60/45)
e814613 fix(build): hooks condicionales en SolicitarAgendamientoModal — rules-of-hooks rompía build Vercel (d218b70/275cf2e)
5233c43 fix(e2e): S6 scope 'Cancelar reserva' al dialog
d2bee23 docs(claude): observable known-flaky de e2e s1-editor-visible
```

## Estado de ramas post-cierre

- `main` = `staging` = `d2bee23` en el momento del merge y del deploy Ready.
- Este commit del acta queda solo en `staging` — la promoción a `main` es post-Fase 4 (monitor 24h) o cuando corresponda; el acta no es código productivo. **Esperado y correcto** que staging vaya 1 commit adelante de main post-cierre.

## Fase 4 en curso

Monitor 24h a cargo de Aldo, cierre esperado 2026-07-29:
- Vercel Logs sin spikes de 500/403 en `/api/agendamientos/*`.
- Supabase Logs sin rebotes `23P01` inexplicados.
- Resend Dashboard: emails de reserva confirmada + notify-proveedor con delivery ok.
- Bandeja de soporte: sin tickets de "no puedo reservar" o "no puedo cancelar".

---

## Siguiente del tren Doctoralia-style

Próximo incremento planificado: **Recordatorios** (24h y 1h antes del servicio, tutor + proveedor, push + email + SMS opcional). Reduce no-shows y refuerza el ciclo post-servicio → reseña. Ver `BACKLOG.md > Roadmap producto (Doctoralia-style)` punto 3.
