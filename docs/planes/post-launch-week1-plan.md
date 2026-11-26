# Plan próxima semana · trabajo pre-campañas pagadas (2026-11-25 → 2026-12-01)

Written for: el PO (Aldo). Propuesta de plan de trabajo para los próximos 7 días calendario, basada en el BACKLOG.md del 24-11 PM + contexto de 5 PRs código + 2 PRs docs mergeados durante la jornada 24-11 + 3 deudas técnicas nuevas documentadas hoy.

**Nota de corrección de framing 2026-11-24 PM**: la versión inicial de este archivo asumía erróneamente "post-launch week 1 (lanzamiento 25-11)". El sitio Pawnecta YA ESTÁ OPERATIVO desde hace tiempo — no hay lanzamiento formal planeado. **Meta operativa real**: alcanzar 100 proveedores activos para activar campañas pagadas (ads Google/Meta), sin fecha fija. Este plan describe trabajo útil hacia esa meta, no una ventana post-launch.

**Propósito**: orden de ataque priorizado + estimaciones + flexibilidad para intercalar bug-fixes reactivos a reportes de usuarios reales + decisiones de campañas según señales de GA4 Realtime.

---

## Scoreboard 2026-11-24 PM (contexto)

7 PRs mergeados + 1 diferido + 3 deudas documentadas:

- ✅ #153 EMAILS-EMOJI-POLICY `7af4c75` 14:36 UTC
- ✅ #147 ANALYTICS-FUNNEL-TUTOR `d971d33` 15:27 UTC (10 events + 7 call sites)
- ✅ #152 EXPLORAR-PRE-CAMPAÑA `b50efbc` 15:30 UTC (H3+H4+H5)
- ✅ #149 F-TR-17 `b0ecc7e` 16:13 UTC (return_to localStorage)
- ✅ #150 F-TR-13 `f53397b` 16:15 UTC (reenviar email cooldown 60s)
- ✅ #182 docs-deudas-pre `02f16b0` 16:20 UTC (3 deudas MEDIA)
- ✅ #183 docs-plan-week1 `2186800` 16:24 UTC (plan + enmiendas CLAUDE.md propuestas)
- ⏸ #181 docs-env-notes DIFERIDO post-rehab ruleset (timing flexible)

Upgrades infra durante la jornada:
- Resend: Free → **Pro $20/mes 50k emails** (12:40 CLT).
- Sentry: Free Developer 5k errores/mes **SE MANTIENE** (upgrade descartado; mitigación = monitoreo manual Vercel Function Logs cuando corresponda).

Ruleset `main` **relajado temporalmente** (quitados `Playwright suite error-audit` + `Playwright suite F2` de required) por episodio ruleset-gridlock del 24-11 PM. Rehab pendiente timing flexible (ver [[reminder-ruleset-rehab]] en auto-memory) — NO urgente primera-hora-mañana.

---

## Cola priorizada próximos 7 días

### Día 1 · miércoles 25-11 — rehab + monitoreo oportunista

**Prioridad**: trabajo documental + decisiones de ruleset rehab + chequeo smokes del día. Zero urgency artificial.

| # | Ítem | Scope | Dependencia | Gating campañas |
|---|---|---|---|---|
| D1.1 | Rehab ruleset + merge #181 docs-env-notes | ~10 min | GO PO + merge #181 | NO gating |
| D1.2 | Smoke canónico GA4 Realtime en PROD (#147 post-merge) | ~15 min | PO navega golden flow con GA4 Realtime abierto | **GATING ads**: sin funnel medible no se activan campañas pagadas |
| D1.3 | Monitoreo manual Vercel Function Logs post-cambios | cada 2-4h cuando haya push a main | cuenta Vercel PO | **NO gating**, pero crítico ante Sentry 100% consumido |
| D1.4 | Monitoreo Resend dashboard quota consumption | diario | PO chequea Resend Delivered log | **NO gating** inmediato (Pro cubre 50k) · gatillo RESEND-STAGING-SPLIT si ≥70% |

### Día 2-3 · jueves 26 + viernes 27 — deudas técnicas MEDIA

| # | Ítem | Scope | Dependencia | Gating campañas |
|---|---|---|---|---|
| D2.1 | **RESEND-REMINDERS-DEDUP** (sprint propio) | ~3-5h total: 1h investigación controlada + 2-3h fix + 1h test | PR separado, GO PO post-smoke | **NO gating** campañas (Pro absorbe 3× sin fricción), pero evita spam a usuarios reales cuando volumen de reservas suba |
| D2.2 | **WELCOME-EMAIL-SILENT-FAIL-GUARD** fix | ~15 min + test | standalone. PR separado | **NO gating** pero defense-in-depth tras confirmación empírica 24-11 |
| D2.3 | Bug-fixes reactivos a señales de users reales (post-smoke GA4 + user feedback) | variable | depende reportes | Variable según severidad |

### Día 4-5 · sábado 28 + domingo 29 — preparación campañas pagadas

| # | Ítem | Scope | Dependencia | Gating campañas |
|---|---|---|---|---|
| D4.1 | **Dashboard GA4 custom funnel** (manual, PO en GA4 UI) | ~2h manual | #147 events live en dashboard + mínimo 500 visits trackeadas | **GATING ads**: sin dashboard no se mide ROAS/conversion por campaign source |
| D4.2 | **Decisión activación Google Ads / Meta campaign inicial** | definido con PO | GA4 funnel visible + presupuesto definido + 100 proveedores (meta operativa) | — |

### Día 6-7 · lunes 30 + martes 01-12 — seguimiento infra + retrospectiva

| # | Ítem | Scope | Dependencia | Gating campañas |
|---|---|---|---|---|
| D6.1 | **RESEND-STAGING-SPLIT** si quota ≥70% | ~2h Opción A (workspace separado) | monitoreo D1.4 | **NO gating** (Pro absorbe mientras) · gatillo preventivo |
| D6.2 | Retrospectiva semana + plan semana siguiente | ~1h | datos recolectados D1-D7 | — |

---

## Riesgos conocidos + mitigaciones

1. **Sentry 100% cuota free tier** → ceguera parcial a errores nuevos. Mitigación: monitoreo manual Vercel Function Logs (D1.3) + opción (b) upgrade reactivo si incidente justifica.
2. **Resend quota** → si surge spike inesperado (ej. campaign high-volume signups) la quota 50k puede acercarse. Mitigación: monitoreo D1.4 + gatillo RESEND-STAGING-SPLIT.
3. **CI gridlock recurrente** → si no rehabilitamos ruleset y el patrón ruleset-gridlock se repite con PRs pendientes. Mitigación: enmienda CLAUDE.md pendiente + refactor `CI-RULESET-CONCURRENCY-REFACTOR` (nuevo item BACKLOG candidato).
4. **Bugs silent-failure** (`WELCOME-EMAIL-SILENT-FAIL-GUARD` confirmado empírico) → otros endpoints similares pueden tener el mismo patrón. Mitigación: fix D2.2 + mental checklist "revisar response.error en todos los await resend/external API".
5. **Campañas pagadas sin datos funnel completo** → sin instrumentar los 3 call sites pendientes de fase 2 PR #161 (`cta_contacto_click`, `cta_reservar_click`, `primera_accion_post_login`). Mitigación: mergear #161 D1-D2 con GO PO.

---

## Ítems del BACKLOG explícitamente DIFERIDOS esta semana

- **PROVEEDOR-FUNNEL-PRE-CAMPAÑA** → gatillo `≥50 proveedores activos`. Progreso hacia meta 100 proveedores lo activará eventualmente.
- **FAST-RECOVERY-PROTOCOL-CODIFICADO** → playbook, no urgente mientras no haya quejas públicas.
- **LIGHTHOUSE-REGRESION-WATCH** → cuando tráfico post-campañas justifique monitoreo automático. Semana 2+.
- **PO-DASHBOARD-INTERNO** → revisable con primera semana de campañas activas (D5+ cuando haya datos).
- **TIKTOK-FIRST-MOVER** → PO define cadencia realista antes de activar.
- **EVENTOS-MASCOTAS-ECOSISTEMA MVP** → draft spec en [docs/sprints/eventos-mvp-plan.md](../sprints/eventos-mvp-plan.md). Arranca cuando el PO cierre issue #164 con respuestas Q1-Q8 definitivas.

---

## Entrega + próximos pasos

- Este archivo es **propuesta inicial del auditor** — el PO ajusta prioridades según realidad de señales día 1-2.
- Al cierre semana (01-12): escribir retro `docs/planes/semana-pre-campanas-retro.md` con datos reales vs plan.

Anotado 2026-11-24 PM por cola continua autónoma del auditor. Correctivo contexto operativo aplicado el mismo día (framing "post-launch week 1" → "próxima semana pre-campañas pagadas").
