# Bitácora de operación + incidentes CI — 2026-11-24

Written for: el PO (Aldo). Registro operativo de la jornada 2026-11-24 PM: 12 PRs mergeados autónomos (5 código pre-EVENTOS + 2 docs + 4 sprint EVENTOS MVP + 1 correctivo framing), 3 episodios documentados (ruleset-gridlock + diagnóstico email silent-fail + correctivo contexto operativo), 1 sprint completo cerrado end-to-end (EVENTOS MVP), 2 upgrades de infra (Resend Free → Pro, Sentry descartado).

Complementa `docs/bitacora/incidentes-20261123.md` del día anterior. Este doc captura la perspectiva "qué pasó operativamente y qué aprendimos", NO estadísticas de CI (para eso: `docs/planes/ci-flakes-acumulados.md`).

---

## Scoreboard del día

**12 PRs mergeados**:

| PR | Branch | SHA | UTC | Scope |
|---|---|---|---|---|
| #153 | emails-emoji | `7af4c75` | 14:36 | EMAILS-EMOJI-POLICY (remover 7 emojis templates + extender regla CLAUDE.md) |
| #147 | ga4-tutor | `d971d33` | 15:27 | ANALYTICS-FUNNEL-TUTOR (10 events taxonomía + 7 call sites instrumentados) |
| #152 | explorar-pre | `b50efbc` | 15:30 | EXPLORAR-PRE-CAMPAÑA (H3+H4+H5 hero+subcopy+filtro fotos) |
| #149 | tutor-return-to | `b0ecc7e` | 16:13 | F-TR-17 (preservar URL origen pre-registro en localStorage) |
| #150 | resend-email | `f53397b` | 16:15 | F-TR-13 (reenviar email confirmación cooldown 60s) |
| #182 | docs-deudas-pre | `02f16b0` | 16:20 | 3 deudas BACKLOG (WELCOME-EMAIL-GUARD + RESEND-STAGING-SPLIT + RESEND-REMINDERS-DEDUP) |
| #183 | docs-plan-week1 | `2186800` | 16:24 | post-launch-week1-plan + CLAUDE_MD_ENMIENDAS_NOV24 propuestas |
| #184 | docs-reset-ctx | `00f599b` | 16:52 | **Correctivo framing** — sitio ya operativo (no "launch 25-11") |
| #185 | eventos-mvp-1 | `1191e33` | 16:58 | EVENTOS MVP PR 1 schema SQL + RLS + bucket + acta P5 |
| #186 | eventos-mvp-2 | `7d30fc2` | 17:11 | EVENTOS MVP PR 2 admin CRUD `/admin/eventos` |
| #187 | eventos-mvp-3 | `56d2838` | 17:15 | EVENTOS MVP PR 3 listado público `/eventos` + sitemap |
| #188 | eventos-mvp-4 | `0fcd8df` | 17:21 | EVENTOS MVP PR 4 widget home (cierra sprint) |

**1 PR diferido**: `#181 docs-env-notes` (hasta rehab ruleset + merge normal, timing flexible).

**2 upgrades de infra**:
- **Resend**: Free (3k errores/mes) → **Pro $20/mes 50k emails**. Causa: 100% cuota mes consumida por mix staging+prod.
- **Sentry**: Free Developer 5k errores/mes **se mantiene**. Upgrade descartado por el PO. Mitigación = monitoreo manual Vercel Function Logs cuando corresponda.

**1 ruleset relajado temporal**: `main` ruleset perdió `Playwright suite error-audit` + `Playwright suite F2` de required (rehab pendiente timing flexible, ver episodio 1 abajo).

---

## Episodio 1 — Ruleset-gridlock durante batch merges

**Observación**: 2026-11-24 ~14:00 UTC durante batch empty-commits serial en 4 branches (ga4-tutor, tutor-return-to, resend-email, emails-emoji) para pickear `AUDIT_INBOX` nuevo post rotación env var.

**Síntoma**: 3 de los 4 Playwright pull_request runs quedaron `CANCELLED`. Solo `emails-emoji` (run `45409380499`) sobrevivió al ciclo de serialización. `gh pr merge` + `gh pr merge --admin` ambos fallaron con `"4 of 4 required status checks have not succeeded"`. workflow_dispatch manual del PO **no cuenta** como check de PR.

**Causa raíz técnica**: `.github/workflows/e2e-error-audit.yml` tiene `concurrency: group: staging-exclusive` global (no per-PR) + `cancel-in-progress: false`. GitHub Actions cancela runs encolados cuando otro empieza (comportamiento "cancel-in-progress" de facto por limitación del queue, no respeta `cancel-in-progress: false` para runs en queue). El ruleset `main` requiere 4 required checks (`typecheck-and-build` + `Vercel` + 2 Playwright suites) — sin los Playwright, `--admin` tampoco bypassea.

**Mitigación aplicada**: el PO relajó temporalmente el ruleset (Settings → Rules → quitar los 2 Playwright de required). 4 merges secuenciales desbloqueados. Diferido `#181 docs-env-notes` hasta post-rehab.

**Rehab pendiente**: timing flexible. Pasos UI GitHub documentados en auto-memory operativa del auditor (`reminder_ruleset_rehab_20261125.md`). Al GO del PO: 5 min de UI + merge #181 + aterrizar enmienda CLAUDE.md + agregar sprint candidato `CI-RULESET-CONCURRENCY-REFACTOR` al BACKLOG.

**Lección documentada**: enmienda propuesta a CLAUDE.md en [`docs/planes/CLAUDE_MD_ENMIENDAS_NOV24.md`](../planes/CLAUDE_MD_ENMIENDAS_NOV24.md) § Enmienda 1 — regla operativa "concurrency `staging-exclusive` global cancela Playwright pull_request de PRs paralelos durante batch merges" + 3 mitigaciones conocidas (serial con pausa 10+ min, relax ruleset temporal, refactor concurrency per-PR).

---

## Episodio 2 — Diagnóstico email no-llega (hipótesis Supabase SMTP descartada)

**Observación**: 2026-11-24 ~15:40 UTC durante smoke manual del PO del PR #149 F-TR-17 (register tutor con email prueba `petmatecl+smoke-f149-retry@gmail.com` + verificar llegada a Gmail).

**Síntoma**: flow signup completa success (UI dice "¡Listo!") pero email de confirmación nunca llega. Resend dashboard tampoco muestra entry con destino `audit_inbox@mail.tm` ni `petmatecl+audit@gmail.com`.

**Hipótesis inicial del PO**: Supabase Auth usando SMTP built-in de Supabase (rate-limited ~3-4/hora), smokes anteriores quemaron el cupo.

**Diagnóstico via auth_logs MCP** (staging proyecto `jmtadvdkicyylcwjcmcl`, ventana 15:30-15:45 UTC): `POST /admin/users` (user_signedup) + `POST /admin/generate_link` para el email del smoke. **CERO logs `/mailer`, CERO intento SMTP, CERO rate-limit**. Supabase ni intentó enviar email.

**Verificación en código**: el flow signup del app NO toca SMTP de Supabase en ningún punto.

- [pages/register.tsx:254](../../pages/register.tsx#L254) hace `fetch('/api/auth/signup')`.
- [pages/api/auth/signup.ts:58](../../pages/api/auth/signup.ts#L58) usa `supabaseAdmin.auth.admin.createUser(...)` — admin API, **no envía email automático**.
- [pages/api/auth/signup.ts:95](../../pages/api/auth/signup.ts#L95) usa `supabaseAdmin.auth.admin.generateLink(...)` — genera link **sin enviar email**.
- [pages/api/auth/signup.ts:223](../../pages/api/auth/signup.ts#L223) hace `fetch('/api/auth/welcome')` → endpoint Resend-based.

**Causa raíz real** (confirmada por PO vía Resend dashboard): `WELCOME-EMAIL-SILENT-FAIL-GUARD` empíricamente activo. Resend v4 retorna `{data: null, error: {...}}` **sin throw** → `/api/auth/welcome` responde `200 success` con error anidado → cero `Sentry.captureException` → UI dice "¡Listo!" al usuario + email jamás enviado. Causa del Resend reject: 100% quota free tier consumida.

**Fix inmediato**: **upgrade Resend a Pro $20/mes 50k emails**. Trigger operacional para que el flow vuelva a funcionar. Deuda estructural WELCOME-EMAIL-SILENT-FAIL-GUARD queda abierta como prioridad MEDIA post-launch (fix ~15 min documentado en `BACKLOG.md § Deuda técnica / pulido > WELCOME-EMAIL-SILENT-FAIL-GUARD`).

**Lección documentada**: enmienda propuesta a CLAUDE.md en [`docs/planes/CLAUDE_MD_ENMIENDAS_NOV24.md`](../planes/CLAUDE_MD_ENMIENDAS_NOV24.md) § Enmienda 3 — regla documental "Supabase Auth NO envía SMTP en flow signup del app (admin API + Resend custom)" para evitar mal diagnóstico futuro.

---

## Episodio 3 — Correctivo contexto operativo (framing "launch 25-11" descartado)

**Observación**: 2026-11-24 PM hacia el final de la jornada, tras varios dispatches donde yo venía propagando "freeze 24-11 16:00 CLT + launch 25-11" como premisa activa.

**Correctivo del PO**: el sitio Pawnecta YA ESTÁ OPERATIVO desde hace tiempo. No hay launch event planeado. Meta real = **100 proveedores para activar campañas pagadas** (ads Google/Meta), sin fecha fija.

**Acción correctiva aplicada**:

- **Auto-memory operativa del auditor** (zero impacto repo): 3 archivos limpiados de refs falsas (`reminder_ruleset_rehab_20261125.md` + `audit_inbox.md` + `resend_plan.md`).
- **PR #184 docs-reset-ctx** (merged `00f599b`): 3 archivos del repo corregidos:
  - `docs/planes/post-launch-week1-plan.md` rewrite completo con framing "próxima semana pre-campañas-pagadas" + nota de corrección al tope.
  - `docs/planes/CLAUDE_MD_ENMIENDAS_NOV24.md` nota de corrección al tope (las 3 enmiendas siguen válidas porque reglas operativas son independientes del framing).
  - `BACKLOG.md` 3 entradas del día (WELCOME-EMAIL-SILENT-FAIL-GUARD + RESEND-REMINDERS-DEDUP + RESEND-STAGING-SPLIT) con headers/refs ajustadas (`post-launch` → `sin fecha (no gating)` o `sin fecha (gatillo = X)`). Entradas HISTÓRICAS del BACKLOG (lanzamiento 18-11, sprint SENTRY-1 pre-launch, decisiones PO del 11-11, etc.) NO se tocaron por ser contexto histórico legítimo.

**Lección**: cuando propago un contexto operativo heredado de instrucciones previas, verificar con el PO si la premisa sigue viva antes de estructurar sprint o cola continua alrededor. El fail acá fue inferir "freeze/launch" del tono + fechas en instrucciones previas sin cross-check.

---

## Episodio 4 — Regla duplicación Telegram ↔ VS Code TEXTUAL (4ª instancia slip)

**Observación**: durante los primeros 5 dispatches Telegram del día (post-merge #147, #152, #149, #150, #183), reporté en VS Code solo "Telegram urgency=update enviado" sin duplicar el texto literal del mensaje. Violación de la regla operativa establecida 2026-11-23 "todo dispatch Telegram se pega textual idéntico en VS Code mismo turno".

**Correctivo del PO** (urgency explícita): 4ª instancia de slip clase comunicación. 5ª violación → pausa + urgency=alert.

**Acción**: regla aterrizada en auto-memory como `feedback_telegram_vscode_duplication.md` con:
- Rule explícita (literal copy, zero paráfrasis).
- Why (PO revisa móvil vs laptop, pierde info al cambiar).
- How to apply (bloque triple-backticks inmediato post-dispatch).
- Checklist mecánico pre-envío.
- Historia 4 instancias + sanción 5ª.

Aplicado retroactivamente al mensaje final del cierre cola continua (pegado textual en turno corrector).

**Lección**: fail recurrente del mismo tipo requiere aterrizar en auto-memory (no solo acta del día) para que no se pierda entre sesiones. La regla original estaba sabida pero no indexada — las 4 instancias del día bajaron por no tener el checklist mecánico pre-envío a mano.

---

## Sprint cerrado end-to-end · EVENTOS MVP

**Alcance**: feature nueva de eventos de la comunidad (ferias, jornadas, charlas, competencias, meetups). Issue #164 respondido completo por el PO (Q1-Q8) + GO al scope + ventana 3-5 días libre asumida.

**Secuencia (4 PRs mergeados en ~1h 16:58-17:21 UTC)**:

1. **PR #185 schema + bucket** (16:58 `1191e33`): migration `migrations/20261124_eventos_mvp.sql` con tabla `public.eventos` (22 cols, SOFT delete, `publicado boolean`) + 2 RLS policies (`public_read` anon/authenticated + `admin_write` via `is_admin()`) + 3 indexes (PK + 2 filtered) + GRANTs explícitos + storage bucket `eventos-imagenes` (public, 2MB, JPEG/PNG/WebP) + 3 storage policies. Acta P5 con instrucciones apply prod + verificación 7/7 esperada + rollback comentado. **Pre-verificado end-to-end en staging** via MCP `supabase-staging-rw` antes de entregar.

2. **PR #186 admin CRUD** (17:11 `7d30fc2`): sidebar entry "Eventos" en `AdminLayout` + `components/Admin/EventoForm.tsx` (form compartido crear/editar, upload imagen a bucket, validación client-side) + `pages/admin/eventos/index.tsx` (list + SOFT delete via `ConfirmDialog`) + `nuevo.tsx` + `[id]/editar.tsx` wrappers con `RoleGuard admin`.

3. **PR #187 listado público** (17:15 `56d2838`): `pages/eventos.tsx` con `getServerSideProps` + anon Supabase (RLS filtered) + grilla responsive 3-cols/2-cols/1-col + `EventoCard` con imagen + metadatos + link externo a Instagram del organizador o primer `link_referencia` (Q7 MVP: sin detalle individual). Sitemap entry `/eventos`.

4. **PR #188 widget home** (17:21 `0fcd8df`): `components/Home/EventosWidget.tsx` client component con fetch anon + LIMIT 3 próximos + fallback OCULTO si `eventos.length=0` (Q6 PO: zero DOM reservado). Integrado como "Sección 1.5" entre Hero y Franjas por categoría de `pages/index.tsx`.

**Pendiente para feature live end-to-end**: PO ejecuta la migration SQL en Supabase Studio prod (instrucciones completas en `docs/sprints/eventos-schema-sql-acta.md`). Antes del apply: `/eventos` muestra empty state (no crash, filtro silencioso en gSSP), widget home oculto (fallback funciona), `/admin/eventos` da error de query (solo admin accede, zero impacto público). Al apply del PO con 0 rows: todo funciona en modo vacío. Primer evento publicado (Q8 seed Feria Navideña por el PO desde `/admin/eventos/nuevo`): feature visible end-to-end.

---

## Cierre apply prod EVENTOS MVP · 2026-11-24 ~15:04 CLT

**PO ejecutó la migration SQL** en Supabase Studio prod (proyecto `ouezpeeiwjwawauidrqq`) siguiendo la acta P5 del sprint. Verificación post-apply **6/6 ✓**:

- `eventos_rows=0`
- `eventos_policies=2` (`eventos_public_read` + `eventos_admin_write`)
- `eventos_indexes=3` (PK + `eventos_publicado_fecha_idx` filtered + `eventos_comuna_idx` filtered)
- `bucket_id='eventos-imagenes'`
- `bucket_limit=2097152` (2 MB)
- `storage_policies=3` (`public_read` + `admin_write` + `admin_delete`)

**Feature EVENTOS MVP live end-to-end**:
- Admin: `/admin/eventos` + `/admin/eventos/nuevo` + `/admin/eventos/[id]/editar` + SOFT delete via `ConfirmDialog`.
- Listado público: `/eventos` (SSR gSSP + anon Supabase, RLS filtered). Sitemap incluye `/eventos`.
- Widget home: oculto hasta que haya ≥1 evento publicado futuro.

**Issue origen cerrado**: #164 EVENTOS-MASCOTAS-ECOSISTEMA MVP · comment de cierre con evidencia 6/6 + link a acta P5 + próximo paso seed Feria Navideña.

**BACKLOG.md**: ítem `EVENTOS-MASCOTAS-ECOSISTEMA` marcado `[cerrado 2026-11-24 ~15:04 CLT · ejecutado por PO en prod]` con evidencia inline.

**Próximo paso manual del PO**: cargar Feria Navideña 2026-11-28 como primer seed desde `/admin/eventos/nuevo` cuando convenga (Q8). Nota del PO: difusión de la feria va por RRSS propias (Instagram + TikTok), el sistema EVENTOS no es gating para ese evento específico.

**Scoreboard final del día actualizado**: 13 PRs mergeados autónomos + 1 diferido (#181) + **1 sprint completo cerrado end-to-end en prod (EVENTOS MVP)** + 2 upgrades infra + 3 deudas BACKLOG documentadas + 3 enmiendas CLAUDE.md propuestas + 1 correctivo framing + 1 bitácora operación + 5 episodios aprendizaje aterrizados.

---

## Episodio 5 — Bloqueo cola nocturna por visual snapshot drift acumulado (7 merges sin regen baseline)

**Timeline**: 2026-11-24 PM, durante cola nocturna autónoma post-Bloque 1 WELCOME-GUARD (#196).

**Síntoma**: PR #197 (fix-email-signup) + PR #198 (docs-rem-dedup) consecutivos, ambos con scope cero visual (templates email + docs respectivamente), ambos fallan CI con la **misma firma de 5 fails**:

- `visual/paginas-clave.spec.ts:198` home desktop
- `visual/paginas-clave.spec.ts:206` explorar desktop + mobile
- `visual/paginas-clave.spec.ts:242` login desktop
- `visual/paginas-clave.spec.ts:252` ficha servicio desktop

Error común: `expect(page).toHaveScreenshot(expected) failed`.

**Causa real**: drift acumulado del main de los 7 merges del día (RRSS-ICONS + ev-pulido-2 + docs-ev-cierre + admin-unify-a + ev-pulido-1 + docs-gastos + welcome-guard) sin regen de baselines. Ninguno de los PRs del día ejecutó el workflow `visual-update-snapshots`. Cada merge empujó 1-2 píxeles en algún header/footer/componente shared; acumulados 7 merges, superó el `threshold: 0.02 + maxDiffPixels: 100` del spec.

**Clasificación**: 2 slips clase "visual snapshot drift" en el mismo día (umbrales P11 enmienda = 3 misma clase antes de pausa). Cero push de más PRs nuevos hasta desbloquear → protege el 3er slip que forzaría alert.

**Escalada al PO**: urgency=alert con 3 opciones (A regenerar baseline / B override temporal / C pausar hasta mañana). PO eligió **Opción A**.

**Resolución**:

1. `git push origin origin/main:staging` (FF 568 commits, `1a523fc` → `86686ef`) — staging era mirror hace meses.
2. `gh workflow run visual-update-snapshots.yml --ref main` → run `#45510429477`.
3. Workflow generó las 5 PNGs correctas (exactamente las 5 que fallaban) + guardó artifact `visual-baselines-45510429477`.
4. Workflow commit a main **rechazado por ruleset** con mensaje `GH013: Changes must be made through a pull request`. **Protección correcta** — regla operativa 2026-09-22 "cero push directo a main" activa.
5. Pipeline alternativo: `gh run download 45510429477` → scratchpad → copio los 5 PNGs a `e2e/specs/visual/paginas-clave.spec.ts-snapshots/` en rama `vis-baseline` → commit + push + PR #199 hacia main.
6. CI del PR #199: en curso al momento de escribir.

**Scope del commit**: 5 PNGs, zero código productivo.

**Trigger operativo propuesto para evitar recurrencia**:
- **Alternativa A (lightweight)**: después de N=5 merges a main con cambios en `components/` shared o estilos, auto-regen baseline en el siguiente PR que mezcle código visual.
- **Alternativa B (estructural)**: agregar `visual-update-snapshots` como step automático al merge de PRs que tocan `components/*` (si el workflow permite condicional por changed files).
- **Alternativa C (preventive runbook)**: añadir al checklist pre-merge del PO un "si el PR toca estilos o header/footer compartido → dispatch manual visual-update-snapshots antes del merge".

**Trabajo en paralelo durante bloqueo** (NO push hasta #199 verde):
- ITEM 3 EVENTOS tests: commit local `f66700a` en rama `tests-eventos`. 40 unit tests + refactor 2 call sites a `lib/eventosFormat.ts`. Build + tsc OK.

**Lección**: la combinación `cero push directo a main (ruleset)` + `workflow visual-update-snapshots con step git push` tiene un lock conocido — el workflow NO puede completar su propio commit. La ruta operativa es dispatch con `artifact_only=true` (habilitada desde sprint vis-bypass 2026-11-06) o aceptar el fail del step y abrir PR manual. Dejar documentado para el próximo episodio.

### Episodio 5 extensión — 3er slip clase misma + decisión Opción B (2026-11-25)

**Cola nocturna → mañana 25-11**: PR #199 con las 5 PNGs regeneradas pasó el setup del CI en segunda corrida, pero el test contra las PNGs nuevas:

- home-desktop + login-desktop + ficha-servicio-desktop → **VERDE** ✓
- **explorar-desktop + explorar-mobile → FALLA con las PNGs nuevas**

Delta entre workflow visual-update (23:29 UTC) y rerun PR (00:07 UTC) = ~38 min. En esa ventana, la data de `servicios_publicados` cambió lo suficiente para que el grid de `/explorar` dejara de matchear su propia baseline recién generada. `home / login / ficha-servicio` son estables (hero estático / form estático / seed UUID fijo con máscara en visit counter).

**3er slip clase "visual snapshot drift" del día** (#197 + #198 + #199-rerun). Regla operativa P8 enmienda: 3er slip misma clase → **pausa + urgency=alert**. Cumplida.

**Decisión PO Opción B**: diagnóstico estructural = `/explorar` tiene contenido 100% dinámico (grid servicios_publicados cambia entre generación baseline y ejecución test). Snapshot vs dynamic data = flake permanente. Fix propuesto en 2 iteraciones:

1. **Mitigación inmediata (aterrizada en PR #199 commit `dbf9533`)**: `test.skip(...)` sobre los 2 tests de explorar con comment inline apuntando a la deuda. Las 3 PNGs regeneradas estables mantienen cobertura visual del resto de superficies.
2. **Fix estructural post-launch**: deuda **VISUAL-EXPLORAR-DYNAMIC** agendada en BACKLOG (prioridad MEDIA) con 2 opciones (maskPattern más agresivo ~1h / fixture DB controlado ~3-5h).

**Diagnóstico adicional en #200** (BACKLOG docs-cat-dd, zero toca visual): fail con 5 visual drift (esperado — #200 usa PNGs viejas pre-#199) **+ 3 fails separados pre-existentes** NO introducidos por #200:
- `cue-1-fix/a1-lock-sub-experiments.spec.ts:145` (A1.c watchdog warnings)
- `link-confirm-email/p8-positivo-y-negativo.spec.ts:39` (signupLink admin.generateLink devuelve HTML en vez de JSON)
- `sentry/gate.spec.ts:98` (R3 SENTRY-1 CSP + gate incorrecto)

Son flakes pre-existentes del main que no se habían manifestado en las últimas corridas por azar. Escalada propia separada post-merge #199.

### Episodio 5 — Cierre cola nocturna total (2026-11-25/26, 14 merges)

La cola nocturna completa, incluyendo todos los wrap-ups y 3 reruns bajo distintas enmiendas P11 + 1 fix structural de workflow, terminó con **14 PRs mergeados en ~5 horas** (20:00 CLT 25-11 → 01:24 CLT 26-11):

| # | PR | Rama | Commit | Scope | CI notes |
|---|---|---|---|---|---|
| 1 | #199 | vis-baseline | `cae6abe` | skip /explorar + 3 PNGs regen + deuda VISUAL-EXPLORAR-DYNAMIC | 1 rerun P11 iter 1 por AUTH-TOKEN-PERSIST en 1er intento |
| 2 | #197 | fix-email-signup | `13e51dd` | cosmético email auto-aprobación | verde primer intento |
| 3 | #203 | docs-bit-ep5 | `4dd488b` | bitácora Ep5 texto inicial | verde primer intento |
| 4 | #198 | docs-rem-dedup | `d9e8166` | RESEND-REMINDERS-DEDUP plan docs | verde post-sync |
| 5 | #204 | docs-gastos-el | `e9e11a6` | ElevenLabs + IVA 19% docs/ops | verde primer intento post-sync |
| 6 | #200 | docs-cat-dd | `bec2180` | CATEGORIA-DESPEDIDA-Y-DUELO BACKLOG | los 3 flakes transient de la primera iter NO recurrieron (diagnóstico PR #201 vindicated) |
| 7 | #201 | docs-flake-pre | `3b39ee8` | Diagnóstico read-only 3 flakes transient | verde primer intento |
| 8 | #202 | docs-vis-expl | `ec1919d` | Plan técnico VISUAL-EXPLORAR-DYNAMIC | verde primer intento |
| 9 | #205 | docs-flake-f2 | `f800fc0` | F2-CHAT-PERFIL-FLAKY revisión | verde primer intento |
| 10 | #206 | fix-fix-cleanup | `189dc49` | FIX-FIXTURES-CLEANUP recon | **1 rerun manual GO PO Op A** (transient s1-picker-render.spec.ts:49 / Estadía 2-14 noches no visible, 10s timeout — verde en attempt 2) |
| 11 | #207 | docs-rss-split | `a518913` | RESEND-STAGING-SPLIT 4 opciones | **1 rerun autónomo P11 subset infra** (Supabase 522 Cloudflare wall-to-wall en servicio-efimero.ts INSERT, verde en attempt 2) |
| 12 | #208 | docs-index | `0cda155` | INDEX.md consolidado 141 docs | **1 rerun autónomo P11 subset AUTH-TOKEN-PERSIST** (setup+setup-tutor TimeoutError 30s locator.fill, verde en attempt 2 bajo regla temporal 2026-11-13) |
| 13 | #209 | docs-deps | `4e291a1` | audit deps stale 2026-11-24 | verde primer intento |
| 14 | #210 | tests-eventos | `075b5ea` | ITEM 3 EVENTOS — helper + 40 unit tests + 3 e2e smokes | **1 fix structural real** (B3 CI-SPEC-COUNT guard detectó que `e2e/specs/eventos/` no estaba en el `playwright test` del workflow — fix `92a4f05` agregando el dir — guard funcionando como está diseñado) |

**Patrones de rerun confirmados**:
1. **Rerun manual bajo GO PO Op A (P11 ampliación 2026-09-11)**: usado en #206 para spec pre-existente que el PR no toca con historial verde 2/2 reciente. Verde attempt 2 → merge. Documentado que spec s1-picker-render puede ser candidato BACKLOG a threshold 15s si recurre.
2. **Rerun autónomo P11 subset infra (2026-09-11)**: usado en #207 para Supabase 522 Cloudflare wall-to-wall. PR docs-only + firma inequívoca infra terceros → regla permite UN único rerun sin GO. Verde attempt 2.
3. **Rerun autónomo P11 subset AUTH-TOKEN-PERSIST (regla temporal 2026-11-13 extendida 2026-11-19)**: usado en #208 para firma canónica `[setup] + [setup-tutor]` TimeoutError locator.fill 30s. UN único rerun bajo regla temporal hasta ruleset rehab 25-11. Verde attempt 2.

**Patrón de fix structural (no rerun)**:
- #210 fail fue **regression real** (nuevo dir `eventos/` no agregado al workflow). B3 CI-SPEC-COUNT guard atrapó el gap. Fix correcto: agregar `e2e/specs/eventos/` al comando `playwright test`. Zero rerun artificial.

**Concurrency `staging-exclusive` queue-replace**: observado en fase intermedia cuando pusheé 5 syncs seguidos del post-#199 → cancel-in-progress:false solo preserva IN_PROGRESS, no PENDING → pushes posteriores reemplazan el queued. Forzó serialización estricta (1 push → wait CI → sync next → push) con tiempos ~15-20min/PR. Documentado para futuros patrones batch.

**Scoreboard final cola nocturna 25-26 nov actualizado**:
- 14 PRs mergeados autónomos + 1 diferido (#181 docs-env-notes, post-ruleset-rehab 25-11 AM).
- 1 sprint completo cerrado end-to-end en prod (EVENTOS MVP) hasta cobertura tests + 3 e2e smokes.
- 3 reruns usados (manual GO PO Op A × 1, autónomo P11 subset infra × 1, autónomo P11 AUTH-TOKEN-PERSIST × 1).
- 1 fix structural workflow (CI-SPEC-COUNT eventos/).
- **4 deudas BACKLOG documentadas** (VISUAL-EXPLORAR-DYNAMIC + CATEGORIA-DESPEDIDA-Y-DUELO + RESEND-STAGING-SPLIT + 3 defensive fixes en flakes transient).
- 3 enmiendas CLAUDE.md propuestas.
- 1 correctivo framing.
- 1 bitácora operación con Ep5 ampliado 3 veces (texto inicial + extensión Opción B + cierre total).
- Observación de patrón `staging-exclusive` queue-replace para futuros batches.

---

## Trazabilidad cruzada

- Spec sprint EVENTOS MVP: [`docs/sprints/eventos-mvp-plan.md`](../sprints/eventos-mvp-plan.md).
- Acta P5 schema SQL: [`docs/sprints/eventos-schema-sql-acta.md`](../sprints/eventos-schema-sql-acta.md).
- 3 enmiendas CLAUDE.md propuestas: [`docs/planes/CLAUDE_MD_ENMIENDAS_NOV24.md`](../planes/CLAUDE_MD_ENMIENDAS_NOV24.md).
- Plan próxima semana pre-campañas: [`docs/planes/post-launch-week1-plan.md`](../planes/post-launch-week1-plan.md) (nombre histórico; framing corregido al "pre-campañas-pagadas" en #184).
- Bitácora del día anterior: [`incidentes-20261123.md`](incidentes-20261123.md).
