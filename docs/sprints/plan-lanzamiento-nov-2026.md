# Plan de lanzamiento — noviembre 2026

**Decisión PO original**: 2026-09-22 (fecha tentativa 2026-11-11).
**Ajuste Tramo 3 kickoff**: 2026-11-05 (regreso del PO).
**Fecha lanzamiento**: **miércoles 2026-11-18**.
**Respaldo**: **miércoles 2026-11-25**.
**Freeze pre-launch**: **martes 2026-11-17 16:00 CLT**.

---

## Tramo 1 — hasta 2026-09-28 (PO en Chile, trabajo normal) · HISTÓRICO

**PO**:
- Responder DEL-CUENTA-LEY (las 10 preguntas).
- Decidir botones con el informe de J-2.
- Aprobar alcance de SHARE-PROV.

**Auditor**:
- J-4 con el orden acordado: **F2-3-CLEANUP → BELL-150 → cue-1 (P8 forzado) → conviene → resto**.
- **cue-1 es el reporte prioritario** — apenas se tenga, PO decide si CUE-1 sigue monitoreado o pasa a BLOQUEA.

Entregable al PO el 2026-09-28:
- Estado de J-4 (qué queda, qué merge-able, qué en hold).
- Resultado de cue-1 (con evidencia P8).
- Lista exacta de PRs que quedarán abiertos durante el viaje + dependencias entre sí.

Cierre Tramo 1: ejecutado. Ver `docs/sprints/entregable-2026-09-28.md`.

---

## Tramo 2 — 2026-09-29 al 2026-10-27 (viaje del PO) · HISTÓRICO

**CONGELAMIENTO DE PROD.** Ningún merge a `main` en este período. Cero
excepción por conveniencia operativa. Aplica a todos los PRs sin
distinción de tamaño ni urgencia percibida.

**Resultado observado al regreso (2026-11-05)**: congelamiento respetado
al 100%. Último commit a main `6f341df` del 2026-09-24. Cero merge
durante el tramo.

**Orden de trabajo original**:

1. **J-4** (si quedaba algo del Tramo 1).
2. **DEL-CUENTA-LEY**.
3. **AUTH-LINK-PROPIO**.
4. **Sprint visual de botones** (nombre exacto a definir tras la decisión PO de Tramo 1 sobre el informe J-2).
5. **SHARE-PROV**.

**Reglas del tramo**:
- **PR desactualizado respecto a otro** → rebase en orden (nunca merges
  cruzados de PRs abiertos).
- **Única excepción al congelamiento**: hotfix por incidente real en
  prod detectado por Sentry. Requiere:
  - OK explícito del PO por chat, en el turno vigente.
  - Rama `hf-<slug>` de vida corta.
  - Post-hotfix: reanudar congelamiento inmediato.

Ejemplos que NO son excepción: flake CI, warnings de dependencias, deuda
técnica descubierta, mejora "que conviene aterrizar ya", propuesta del
auditor sin request específico del PO, etc. Cero merge a main sin OK
literal del PO en el mismo turno.

Cierre Tramo 2: cero hotfix ejecutado. Cero merge. Los PRs #85, #87,
#84, #77, #86 quedaron abiertos listos para review post-regreso.

---

## Tramo 3 — 2026-11-05 al 2026-11-18 (regreso PO, ejecución pre-launch)

**Decisiones de alcance (PO 2026-11-05, ampliado 2026-11-10)**:

- **Críticos para 2026-11-18**: merge `vis-bypass` → cola secuencial
  `#92 → #87 → #84 → #77`, SQL RPC-C lote 3 (lo ejecuta el PO), parche
  observabilidad `Error: Rejected`, smokes golden path proveedor / tutor
  / admin, revalidación Lighthouse + DMARC pre-freeze.
- **Objetivo (si alcanza)**: SHARE-PROV completo (0.5-1 día), fixes
  bloqueantes de Lighthouse según reporte del lunes 16 (correrla hoy
  martes 10 post-merge vis-bypass — no se corrió el fin de semana).
  Si sobra margen: bypass del spec `visits-doble/idempotencia-24h.spec.ts`
  (deuda hallada en vis-bypass §3, misma clase de bug que vis-bypass
  solo que sin assertion visual — pasa silencioso).
- **Post-lanzamiento (semana 19-30 noviembre o después)**:
  - **CARNET-RETENCION** completo.
  - **DEL-CUENTA-LEY código** completo (actualización 2026-11-10 PO:
    sale del scope del lanzamiento 18-11, se ejecuta dentro del plazo
    legal de la Ley 21.719 que entra en vigencia diciembre 2026). PR
    #84 `del-cuenta-docs` igual se mergea en la cola Tramo 3 para
    aterrizar el descubrimiento técnico + copy + reglas A/B definidos.
  - BUTTON-UNIF código.
  - AUTH-LINK-PROPIO.
  - #86 supajs-upgrade (cero merge antes del 18-11).
  - SENTRY-TOAST completo (40 catches pendientes de `captureException`).

### Precondición de SQL irreversible

Todo SQL irreversible en prod (RPC-C lote 3 REVOKE + lo que aparezca):
**Supabase Pro activo + backup verificado**. Supabase Pro ya se activó
el fin de semana del 07-08 por el PO (precondición original para
DEL-CUENTA-LEY). Aplica también al Lote 3 y a cualquier migración
futura del plan.

### Plan día a día

**Jueves 2026-11-05 (regreso PO del viaje) — EJECUTADO**
- Cierre de #72 y #69 sin merge.
- Rebase + merge #85 (`cue-1-fix` → `72afefb`) tras QA del PO en preview
  (15:30 CLT con `acanocts@gmail.com` + `acanocts+tutor@gmail.com`). Tag
  anotado `cue-1-prod-20261106` creado sobre `72afefb` (deploy prod
  jueves ~15:40 CLT).
- Apertura PR #92 (`tuteo-rule` — regla anti-voseo expandida + nota
  cuenta `canocortes@gmail.com` staging).
- Diagnóstico bug visual descubierto en intento de merge #77 → GO opción A.

**Viernes 2026-11-06 — EJECUTADO**
- Primer reporte ventana CUE-1 (17 h 35 min desde deploy 72afefb): 0
  events `user_context_stuck`, 0 events `hydrate exhausted`. Método
  validado con positivo conocido.
- Sprint `vis-bypass` abierto (PR #93): fix spec + guardia P8 + acta +
  workflow `visual-update-snapshots` con input `artifact_only`.
- Dispatch inicial del workflow + review de 8 PNGs iniciales por el PO.
- Aprobación con 4 ajustes para baselines definitivas.

**Sábado 2026-11-07 — Domingo 2026-11-08**
- PO activa Supabase Pro + backup verificado.
- Lighthouse **no corrida** (se pospone a hoy martes 10 post-merge
  vis-bypass).

**Lunes 2026-11-09 — Martes 2026-11-10 (hoy)**
- Aplicación de los 4 ajustes al spec `visual/paginas-clave.spec.ts`:
  consent inyectado en `beforeEach`, máscara contador visitas ficha,
  máscara contador resultados + grilla explorar, login sin máscara.
  Commit `ec2f9f9` + corrección fecha acta `31f5f55`.
- Dispatch segundo workflow (run `42812265005`, `artifact_only=true`)
  para regenerar baselines definitivas sobre el commit nuevo.
- Sweep final CUE-1 (ventana completa jueves 05 15:40 CLT → martes 10):
  6 events NEXTJS-7 todos `(no user)` anónimos + 0 events NEXTJS-5. Cero
  usuarios reales desconocidos → **CUE-1 CERRADO como resuelto por el
  watchdog fix #85**. Clasificación formal baja a CONVIENE (ítem
  `cue-1-mobile-toast` post-lanzamiento sigue abierto, no bloquea).
- **Hoy restante martes 10 + miércoles 11**:
  - Entrega 8 PNGs nuevas al PO + GO commit + merge PR #93 vis-bypass.
  - **Cola secuencial estricta** (un PR en CI a la vez):
    1. #92 `tuteo-rule` (rebase + rerun si quedó cancelado por
       concurrency + merge).
    2. #87 `button-unif-doc` (rebase + merge).
    3. #84 `del-cuenta-docs` (rebase + merge — aterriza descubrimiento
       técnico + reglas A/B + copy; el código del borrado va a
       post-lanzamiento).
    4. #77 `auth-mail-phish` (rebase + confirmación visual templates +
       merge).
  - SQL **RPC-C Lote 3** en prod (bloque entregado, lo ejecuta el PO
    directo en Studio prod).
  - **Parche Error: Rejected** (1-2 h, rama corta propia): fortalecer
    `isSwRegisterRejection` + agregar `Sentry.captureException` con
    tags `subsystem: service-worker, phase: register` deduplicado en
    el listener `unhandledrejection` de `instrumentation-client.ts`.
  - **Lighthouse** solo-lectura sobre prod: home, explorar, ficha de
    servicio, perfil proveedor, dashboard proveedor, mis-reservas.
    Entrega hoy post-merge vis-bypass con bloqueantes priorizados.

**Jueves 2026-11-12 — Viernes 2026-11-13**
- **SHARE-PROV** completo (WhatsApp + copiar enlace + share nativo +
  OG tags + evento GA4, ~0.5-1 día).
- **Fixes bloqueantes de Lighthouse** identificados en el reporte del
  martes 10.
- Si sobra margen: **bypass del spec `visits-doble/idempotencia-24h.spec.ts`**
  (hallazgo colateral del acta vis-bypass §3 — captura SSO Vercel pero
  pasa silente porque solo lee contador BD).

**Sábado 2026-11-14 — Domingo 2026-11-15**
- Buffer.
- Revisión de reportes DMARC acumulados en `dmarc-reports@pawnecta.com`
  (Zoho). Decisión PO sobre subir `_dmarc.pawnecta.com` a `p=reject`
  antes del freeze del martes.

**Lunes 2026-11-16 — Smokes golden path completos**
- Día completo de smokes end-to-end en prod:
  - Proveedor: registro → perfil → publicar servicio → agenda F1/F2 →
    recibir solicitud → confirmar.
  - Tutor: búsqueda → ficha → reserva F1 → reserva F2 → cancelación →
    reseña → mis-reservas.
  - Admin: aprobar proveedor → moderar review → revisar notifs.
- **PO en paralelo**:
  - CARTO API key aplicada en Vercel (Production + Preview +
    Development) + redeploy + smoke sin marca de agua.
  - Teléfono de Eduardo (perfil prod).
  - Nicole cuenta vieja (decisión consolidar o preservar).
  - 5 proveedoras reactivadas.

**Martes 2026-11-17 — Revalidación + freeze**
- **Mañana**: revalidación Lighthouse (solo revalida los targets de los
  fixes aplicados). Cero medición nueva — solo confirmación que las
  mejoras tomaron efecto.
- DMARC: aplicar `p=reject` si los reportes acumulados vienen limpios.
- **16:00 CLT**: **freeze pre-launch**. Cero merge entre freeze y
  lanzamiento salvo hotfix por Sentry alerta real.
- Checklist final de lanzamiento (archivo nuevo
  `docs/sprints/lanzamiento-20261118.md`): deploy prod healthy, Sentry
  quieto, crons funcionando, emails Resend OK, Supabase Pro activo,
  CARTO sin marca, DMARC en orden, 5 proveedoras visibles en catálogo.

**Miércoles 2026-11-18 — Lanzamiento**
- Checklist de lanzamiento ejecutado punto por punto con evidencia.
- Comunicación del PO (canales que decida).
- Monitoreo activo primeras 4 h: Sentry + Vercel logs + Supabase
  dashboard.

---

## Post-lanzamiento (semana 19-30 noviembre o después)

Ítems que salen del scope de lanzamiento 2026-11-18:

- **CARNET-RETENCION** completo (ver `docs/sprints/del-cuenta-ley.md §5`
  para alcance confirmado + decisión nueva PO Tramo 3 kickoff: el cron
  borra únicamente `verificacion_estado IN ('rechazado','sin_enviar')`
  con > 30 días; para `pendiente` > 30 días **notifica al admin**
  en vez de borrar, para evitar que se pierda un carnet en revisión
  pendiente).
- **DEL-CUENTA-LEY código** (decisión PO 2026-11-10: sale del scope de
  lanzamiento, se ejecuta la semana 19-30 noviembre dentro del plazo
  legal de la Ley 21.719, vigencia diciembre 2026). El PR #84
  `del-cuenta-docs` igual se mergea en la cola Tramo 3 para aterrizar
  el descubrimiento técnico + copy + reglas A/B definidos pre-regreso.
- **BUTTON-UNIF** código (rama de implementación sobre #87 docs ya
  mergeado).
- **AUTH-LINK-PROPIO**.
- **SHARE-PROV** (si no cerró el fin de semana 14-15).
- **#86 supajs-upgrade** (post-launch, cero merge antes del 18-11).
- **SENTRY-TOAST completo** (40 catches pendientes de
  `captureException`).

---

## Riesgos que miden contra el 18-11 (actualizado 2026-11-10)

1. **CUE-1 reabre** si aparece `user.id` nuevo. **Estado actual 2026-11-10**:
   sweep final de la ventana jueves 05 15:40 CLT → martes 10 arrojó 6 events
   `user_context_stuck` todos `(no user)` anónimos + 0 events `hydrate_exhausted`
   = cero usuarios reales desconocidos. CUE-1 **cerrado como resuelto**
   por el watchdog fix #85. Riesgo baja a observación pasiva.
2. **Smokes golden path revelan regresión del tren post-viaje**.
   Mitigación: lunes 16 es el día de smokes. Bug blocker → se pospone
   al respaldo miércoles 2026-11-25.
3. **Lighthouse revela regresión de performance severa** (LCP > 3s
   móvil). Mitigación: medición hoy martes 10 post-merge vis-bypass +
   fixes bloqueantes agendados en la ventana jueves 12 / viernes 13; si
   son más grandes que lo estimado, los bloqueantes se diifieren a
   post-launch y se reevalúa si bloquean el 18-11.
4. **Cola de merges cae por CI-CONCURRENCY durante la ejecución**
   (vis-bypass, #92, #87, #84, #77). Mitigación: secuencia estricta un
   PR en CI a la vez (regla PO), evidencia CI-CONCURRENCY ya registrada.

---

## Regla operativa de este plan

Toda decisión que aparezca durante el Tramo 3 que empuje a merge
autónomo o "solo esto", requiere OK literal del PO en el turno vigente.
Aplica aun bajo presión de calendario cerca del lanzamiento. Bajar el
umbral del "solo esto" cerca del freeze es donde se rompen los
lanzamientos reales.

## Trazabilidad

Este plan se refleja también al tope de `BACKLOG.md > PEDIDOS DIRECTOS
DEL PO` para que sea lo primero visible al abrir cualquier menú de "¿con
qué seguimos?".

---

## Estado al cierre 2026-11-10 EOD (sesión martes)

**Mergeados a main hoy** (orden cronológico):

| SHA | PR | Alcance |
|---|---|---|
| `200bde49` | #95 `hf-name-resolve` | Fix email chat "Un usuario" → formato `Nombre I.` con `resolveSenderName()` server-side + `supabaseAdmin` (`pages/api/notifications/new-message.ts`). Test unit `lib/g1-new-message-name-resolve.test.ts` con 8 casos. Regla CLAUDE.md "cero smoke manual durante CI". |
| `1df5eb8` | #97 `estab-e2e-tokens` | Pieza B: fixture `e2e/fixtures/supabase.ts` buildEntry con fallback re-login password si refresh falla. Pieza D: máscara spec `/explorar` ampliada al contenedor padre + baselines regeneradas. Fix workflow verde-falso en `visual-update-snapshots.yml` (guard P8). Regla CLAUDE.md "cero signOut manual QA mientras corre CI". BACKLOG `STAGING-DATA-LEAK`. |
| `1d66ab1` | #96 `del-cuenta-decis` | Decisiones PO 2026-11-10 sobre 11 preguntas asesor DEL-CUENTA-LEY + terminología "seudonimizar" en docs/copy/correos (cero rename código). Nueva §10 en descubrimiento + §8 en sprint doc. Registro histórico en preguntas-asesor. 3 entradas BACKLOG: `DEL-CUENTA-LEY` principal, `BRECHAS-PROCEDIMIENTO`, `SIGNOUT-SCOPE`. CARNET-RETENCION ajustado 30→15. SENTRY-PII subió a pre-01-12-2026. |
| `65c4385` | #98 `home-verdad-1-3` | HOME-VERDAD items 1-3 obligatorios pre-lanzamiento. Eliminados 4 testimonios ficticios + sección "Proveedores que puedes conocer" entera. Corrección textos engañosos en home (meta description/og/twitter + cards "Por qué confiar" + StepCard paso 2 "Compara perfiles y precios" + CTA final) + Quiénes somos (Identidad verificable opcional + Evaluaciones con moderación) + FAQ L12. Fix bug placeholder duplicado "¿Eres veterinario a domicilio?" en `FranjaPares` + `FranjaCategoria`. Refinamiento ENMIENDA P11 rerun autónomo (máx 1 por PR, solo infra inequívoca, anotado en acta). BACKLOG `VIS-HOME-FULLPAGE`. |

**No mergeados hoy** (fuera del scope o aplazados):
- HOME-VERDAD items 4-6 (simplificación): evaluación jueves 12-11 según holgura real con SHARE-PROV + Lighthouse.
- SHARE-PROV: no arrancado todavía — próximo PR.
- Lighthouse fixes: pendiente mediana de 3 corridas antes de empezar a arreglar.
- Parche "Error: Rejected": pendiente análisis desde Sentry.
- Baseline Sentry `incrementar_vistas` 42501 (observación 24h post RPC-C Lote 3): revisión mañana AM (parte de la revisión matutina).
- Monitoreo mensajes nuevos en `public.messages` + cross-ref Resend para verificar envío correcto desde notificaciones@: revisión mañana AM.

**Pendientes para retomar mañana** (miércoles 2026-11-11):

### Revisión matutina (primer bloque)

1. **Sentry 24h post RPC-C Lote 3**: filtrar issues en el dashboard por `42501` o `permission denied` sobre `incrementar_vistas`. Cero → cerrar observación; no-cero → diagnóstico + decidir rollback REVOKE o parche de callers.
2. **Mensajes nuevos en public.messages desde merge #95**: `SELECT count(*) FROM public.messages WHERE created_at > '2026-11-10T17:25:14Z'` (SHA 200bde49). Si count > 0, cross-ref con Resend (buscar subject "te envió un mensaje" post hora merge) + reportar remitente + senderName + formato efectivo al PO.

### Plan día (miércoles + jueves hasta freeze martes 17-11 16:00 CLT)

1. **SHARE-PROV** (prioridad alta, antes que Lighthouse fixes). Alcance a confirmar con el PO al arrancar — kickoff en `docs/sprints/` si no existe todavía.
2. **Lighthouse baseline + fixes**:
   - Mediana de 3 corridas (home + ficha-servicio + explorar en desktop + mobile). Artefacts ya generados hoy en `docs/auditorias/lighthouse-20261110/reporte-baseline.md` → re-ejecutar 3× para mediana.
   - Identificar bloqueantes (LCP > 2.5s móvil, CLS > 0.1, etc.).
   - Fixes en PRs separados, uno a la vez.
3. **Parche "Error: Rejected"** (observabilidad Sentry): el filtro en `lib/sentryScrub.ts` ya cubre con `isSwRegisterRejection` + `workbox-window` stack match + el `unhandledrejection` listener registrado antes de `Sentry.init` en `instrumentation-client.ts`. Confirmar en dashboard Sentry si el issue sigue ingiriendo events o si quedó silenciado. Si sigue → ampliar filtro.

### Reglas vigentes a respetar mañana

- **Un PR en CI a la vez** (sin excepción).
- **Nunca mergear con rojo** (regla P11 global).
- **Enmienda P11 rerun autónomo refinada (2026-11-10 PR #98)**: máximo 1 rerun autónomo por PR, solo para infra inequívoca (ECONNRESET, timeouts, 5xx Vercel/Supabase, SSL/DNS). Todo lo demás es diagnóstico + aviso al PO sin rerun. Cada rerun autónomo se anota.
- **Smoke manual pre-merge**: pedir OK explícito del PO para todo merge de código productivo tras smoke en preview. Docs-only + CI 4/4 verde puede mergearse autónomo si ya hay GO del PO en el turno vigente para el ciclo.
- **Baselines visuales**: aprobación del PO con copias NUEVA-SIN-CACHE-rX.png para evitar bug image preview VS Code.
- **Cero smoke manual durante CI** ni **cero signOut manual QA mientras corre CI** (reglas CLAUDE.md).

### Reglas de reinicio de sesión (para la sesión nueva mañana)

- El PO abre sesión nueva. El contexto previo no se preserva automáticamente.
- Para retomar: leer este bloque "Estado al cierre 2026-11-10 EOD" + `BACKLOG.md > PEDIDOS DIRECTOS DEL PO` + CLAUDE.md top ("Estado del roadmap").
- Verificar qué está en main: `git log --oneline origin/main | head -10`.
- Verificar CI de main: `gh run list --branch main --limit 5`.

**Tag anotado del día**: `eod-2026-11-10` (marca el estado del repo al cierre). Crear con `git tag -a eod-2026-11-10 -m "Estado al cierre sesión martes"` tras merge del PR que aterriza esta nota.
