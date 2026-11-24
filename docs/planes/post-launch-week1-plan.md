# Plan post-launch · semana 1 (25-11 → 01-12 2026)

Written for: el PO (Aldo). Propuesta de plan de trabajo para los primeros 7 días post-lanzamiento, basada en el BACKLOG.md del 24-11 PM + el contexto de 5 PRs pre-campañas mergeados durante pre-freeze + 3 deudas técnicas nuevas documentadas hoy.

**Propósito**: orden de ataque priorizado + estimaciones para arrancar la mañana del 25 sin re-planificar + flexibilidad para intercalar bug-fixes reactivos a reportes de usuarios reales + decisiones de campañas ads según señales de GA4 Realtime.

---

## Scoreboard pre-launch 2026-11-24 PM (contexto)

5 PRs pre-freeze mergeados + 1 diferido + 3 deudas documentadas:

- ✅ #153 EMAILS-EMOJI-POLICY `7af4c75` 14:36 UTC
- ✅ #147 ANALYTICS-FUNNEL-TUTOR `d971d33` 15:27 UTC (10 events + 7 call sites)
- ✅ #152 EXPLORAR-PRE-CAMPAÑA `b50efbc` 15:30 UTC (H3+H4+H5)
- ✅ #149 F-TR-17 `b0ecc7e` 16:13 UTC (return_to localStorage)
- ✅ #150 F-TR-13 `f53397b` 16:15 UTC (reenviar email cooldown 60s)
- ⏸ #181 docs-env-notes DIFERIDO post-ruleset-rehab (1ª tarea mañana)
- ⏸ #182 docs-deudas-pre en CI (3 deudas MEDIA documentadas)

Upgrades infra pre-launch:
- Resend: Free → **Pro $20/mes 50k emails** (12:40 CLT).
- Sentry: Free Developer 5k errores/mes **SE MANTIENE** (upgrade descartado, mitigación = monitoreo manual Vercel Function Logs cada 1-2h durante launch day + 48h post-launch).

Ruleset `main` **relajado temporal** (quitados `Playwright suite error-audit` + `Playwright suite F2` de required) por episodio ruleset-gridlock del 24-11 PM. Primera tarea técnica del 25-11 = rehab ruleset + merge #181 (ver [[reminder-ruleset-rehab-20261125]] en auto-memory).

---

## Cola priorizada para los primeros 7 días (5-8 ítems)

### Día 1 · miércoles 25-11 (lanzamiento) — monitoreo + cola corta

**Prioridad absoluta**: zero trabajo que requiera merge a main mientras no se rehabilite el ruleset. Trabajo documental + plan + prep.

| # | Ítem | Scope | Dependencia | Gating campañas |
|---|---|---|---|---|
| D1.1 | Ruleset rehab + merge #181 docs-env-notes | ~10 min | GO PO + merge #181 | NO gating |
| D1.2 | **Monitoreo manual Vercel Function Logs** (cada 1-2h) | continuo primeras 24h | cuenta Vercel PO, dashboard URL en `https://vercel.com/petmatecls-projects/pawnecta-landing-mvp/logs` | **NO gating** pero crítico para detectar bugs tempranos silenciados por Sentry 100% |
| D1.3 | Smoke canónico GA4 Realtime en PROD (#147 post-merge) | ~15 min | PO navega golden flow con GA4 Realtime abierto | **GATING ads**: si events no fire, no se puede medir funnel pagado |
| D1.4 | Monitoreo Resend dashboard quota consumption | cada 2h | PO chequea Resend Delivered log | **NO gating** inmediato (Pro cubre 50k) · gatillo RESEND-STAGING-SPLIT si ≥70% |

**Rol del auditor**: standby + Vercel Function Logs monitor cada 1-2h desde dispatch del PO + reactivo a bugs reportados. Zero merges autónomos salvo docs-only.

### Día 2-3 · jueves 26 + viernes 27 — bug fixes reactivos + RESEND-REMINDERS-DEDUP

| # | Ítem | Scope | Dependencia | Gating campañas |
|---|---|---|---|---|
| D2.1 | **RESEND-REMINDERS-DEDUP** (sprint propio) | ~3-5h total: 1h investigación controlada + 2-3h fix + 1h test | PR separado, GO PO post-smoke | **NO gating** campañas (Pro absorbe 3× sin fricción), pero evita spam a usuarios reales reservas cuando volumen suba |
| D2.2 | **WELCOME-EMAIL-SILENT-FAIL-GUARD** fix | ~15 min + test | standalone. PR separado | **NO gating** pero defense-in-depth tras confirmación empírica 24-11 |
| D2.3 | Bug-fixes reactivos a señales de users reales (post-smoke GA4 + user feedback) | variable | depende reportes | Variable según severidad |

### Día 4-5 · sábado 28 + domingo 29 — campañas ads prep

| # | Ítem | Scope | Dependencia | Gating campañas |
|---|---|---|---|---|
| D4.1 | **Dashboard GA4 custom funnel** (manual, PO en GA4 UI) | ~2h manual | #147 events live en dashboard + mínimo 500 visits trackeadas | **GATING ads**: sin dashboard no se mide ROAS/conversion por campaign source |
| D4.2 | **Activación Google Ads + Meta campaign inicial** | definido con PO | GA4 funnel visible + presupuesto definido | — |

### Día 6-7 · lunes 30 + martes 01-12 — RESEND-STAGING-SPLIT + plan semana 2

| # | Ítem | Scope | Dependencia | Gating campañas |
|---|---|---|---|---|
| D6.1 | **RESEND-STAGING-SPLIT** si quota ≥70% | ~2h Opción A (workspace separado) | monitoreo D1.4 | **NO gating** (Pro absorbe mientras) · gatillo preventivo |
| D6.2 | Retrospectiva semana 1 + plan semana 2 | ~1h | datos recolectados D1-D7 | — |

---

## Riesgos conocidos + mitigaciones

1. **Sentry 100% cuota free tier** → ceguera parcial a errores nuevos. Mitigación: monitoreo manual Vercel Function Logs (D1.2) + opción (b) upgrade reactivo si incidente justifica.
2. **Resend quota** → si surge spike inesperado (ej. campaign high-volume signups) la quota 50k puede acercarse. Mitigación: monitoreo D1.4 + gatillo RESEND-STAGING-SPLIT.
3. **CI gridlock recurrente** → si no rehabilitamos ruleset mañana y el patrón ruleset-gridlock se repite con PRs pendientes. Mitigación: enmienda CLAUDE.md pendiente + refactor `CI-RULESET-CONCURRENCY-REFACTOR` (nuevo item BACKLOG candidato).
4. **Bugs silent-failure** (`WELCOME-EMAIL-SILENT-FAIL-GUARD` confirmado empírico) → otros endpoints similares pueden tener el mismo patrón. Mitigación: fix D2.2 + mental checklist "revisar response.error en todos los await resend/external API".
5. **Campañas pagadas sin datos funnel completo** → sin instrumentar los 3 call sites pendientes de fase 2 PR #161 (`cta_contacto_click`, `cta_reservar_click`, `primera_accion_post_login`). Mitigación: mergear #161 D1-D2 con GO PO.

---

## Ítems del BACKLOG explícitamente DIFERIDOS semana 1

- **PROVEEDOR-FUNNEL-PRE-CAMPAÑA** → gatillo `≥50 proveedores activos`. Improbable semana 1.
- **FAST-RECOVERY-PROTOCOL-CODIFICADO** → playbook, no urgente mientras no haya quejas públicas.
- **LIGHTHOUSE-REGRESION-WATCH** → post-launch cuando tráfico justifique monitoreo automático. Semana 2+.
- **PO-DASHBOARD-INTERNO** → revisable con primera semana de campañas activas (D5+ cuando haya datos).
- **TIKTOK-FIRST-MOVER** → PO define cadencia realista antes de activar.
- **EVENTOS-MASCOTAS-ECOSISTEMA MVP** → draft spec en [docs/sprints/eventos-mvp-plan.md](../sprints/eventos-mvp-plan.md). Arranca cuando el PO cierre issue #164 con respuestas Q1-Q8 definitivas.

---

## Entrega + próximos pasos

- Este archivo es **propuesta inicial del auditor** — el PO ajusta prioridades según realidad de señales día 1-2.
- PR docs-only con este archivo + merge autónomo al CI verde (ruleset relajado permite).
- Al cierre semana 1 (01-12): escribir retro `docs/planes/post-launch-week1-retro.md` con datos reales vs plan.

Anotado 2026-11-24 PM pre-freeze T-~2h30 por cola continua autónoma del auditor.
