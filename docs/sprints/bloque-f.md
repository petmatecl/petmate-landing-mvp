# Bloque F — Deuda técnica menor (autónomo)

**Fecha kickoff**: 2026-09-15
**Convención**: PRs por afinidad, merge autónomo con checks verdes, reglas P11 vigentes.
**Condición de parada**: cualquier cambio de comportamiento observable por un usuario.

**Metodología obligatoria por ítem**:
1. Paso 0 con spec o grep de `estado-actual`. Solo se toca lo que siga vivo.
2. Sin preguntas. Si un ítem exige decisión → saltar + anotar acá.
3. Al cerrar: acta, tag `deuda-f-prod-YYYYMMDD`, BACKLOG conciliado en el mismo PR.
4. Lista de instrucciones de un paso para PO al final (Vercel, DNS, Mailtrap, prod cleanup avatars).

---

## Ítems (13)

1. **BUTTON-CANON restante**: migrar los ~18 botones que quedan al componente `<Button>`, con pantallazos antes/después por página. Sin cambio visual.

2. **AVATARS-HUER**: script de auditoría que liste objetos del bucket `avatars` sin proveedor o tutor que los referencie. Ejecutar en staging con `supabase-staging-rw`, limpiar allí, entregar al PO el listado + SQL/comando para prod.

3. **SENTRY-WRAP-API**: envolver los 31 endpoints con `wrapApiHandlerWithSentry`. **SENTRY-FLUSH-MISSING**: verificar flush en el path de credenciales faltantes.

4. **SELF-CALLS-PREVIEW**: los 5 endpoints con self-calls server-side deben enviar el bypass de Deployment Protection en preview, o usar import directo del handler en vez de `fetch` a sí mismos.

5. **LINK-CONFIRM-EMAIL**: eliminar el `console.log` de `confirmationUrl` y reemplazar por el mecanismo de test que ya usa la suite (Mailtrap o inbox de staging). Junto con esto, si SMTP de staging → Mailtrap es solo config de dashboard, dejar al PO instrucción de un paso.

6. **SFM-BUGS-PRE**: los bugs menores preexistentes de `ServiceFormModal` listados en BACKLOG.

7. **ROADMAP-CRON-RESOLVERS**: unificar los resolvers de `recordatorio-reserva` con `lib/emails/resolvers`. Sin cambio de salida (render-diff obligatorio).

8. **ESTADODERIV-FALSY-0**, **PICKER-F2-NITPICKS**, **F2-3-D-DESCARTES**: aplicar los que sean correcciones claras, descartar con nota los que no.

9. **STYLEGUIDE-REWRITE** y **UI-STANDARDS-STALE**: actualizar `pages/styleguide.tsx` al sistema actual y corregir la línea stale.

10. **P8-COROLARIOS-AUD**: auditoría documental de los corolarios de `CLAUDE.md`, consolidar redundantes.

11. **GIT-COMMIT-VERIFY**: tooling. **GA4-DEBUGVIEW**: solo investigación con conclusión escrita.

12. **PERF-1 bucket D** (Speed Insights, 15 min setup; si requiere activar algo en Vercel, instrucción de un paso). **PERF-1 bucket B** (auditoría mobile, solo informe).

13. **DMARC-RUA**: instrucción DNS de un paso para PO.

---

## Grupos de PRs por afinidad (plan tentativo)

Se resuelve empíricamente tras Paso 0 — puede consolidarse o fragmentarse según lo que sobreviva vivo.

- **PR F-UI**: BUTTON-CANON restante, STYLEGUIDE-REWRITE, UI-STANDARDS-STALE, SFM-BUGS-PRE (si UI-only).
- **PR F-OBS-API**: SENTRY-WRAP-API, SENTRY-FLUSH-MISSING, SELF-CALLS-PREVIEW, ROADMAP-CRON-RESOLVERS.
- **PR F-TESTS-TOOLING**: LINK-CONFIRM-EMAIL, GIT-COMMIT-VERIFY, GA4-DEBUGVIEW (nota), AVATARS-HUER script.
- **PR F-DOCS**: P8-COROLARIOS-AUD, ESTADODERIV-FALSY-0, PICKER-F2-NITPICKS, F2-3-D-DESCARTES (si docs-only), PERF-1 bucket B (informe).

---

## Paso 0 / estado por ítem (auditado 2026-09-15)

| # | Item | Estado | Evidencia empírica | Notas |
|---|---|---|---|---|
| 1 | BUTTON-CANON restante | **VIVO** | grep `bg-accent-600.*text-white` en `pages/ components/` → 25+ botones en 20+ archivos (Header ~10, ServiceFormModal, ExampleCTAModal, VerificationGateModal, ModalAlert, PreguntasSection, ReviewForm/Modal, Home/SearchBar, CertificacionesSection, EvaluacionesTab, Chat/MessageThread, ClientLayout, ErrorBoundary, ProveedorDetailDrawer, CaregiverMap popup HTML) | Cada botón tiene variaciones sutiles (font-medium vs semibold, focus ring on/off, padding/radius). Componente `<Button>` en `components/UI/Button.tsx` ya expone 4 variants + 4 sizes + opt-in radius/focusRing/weight. Migración factible pero volumen alto — requiere spec de regresión por componente. |
| 2 | AVATARS-HUER | **VIVO** | Storage `avatars` referenciado por `foto_perfil` (proveedores; `usuarios_buscadores` no tiene la columna). ClientLayout hace upload via `.from('avatars')`. | Requiere script SQL+storage list para detectar huérfanos. Ejecutar en staging con `supabase-staging-rw`; entregar SQL/comando prod al PO. |
| 3 | SENTRY-WRAP-API | **VIVO** | 35 archivos `.ts` en `pages/api/**`. Cero uso actual de `wrapApiHandlerWithSentry` (grep repo → cero matches). | Wrap mecánico de handler. SENTRY-FLUSH-MISSING: verificar que paths con credenciales faltantes tengan `Sentry.flush()` antes de `res.status(500).json(...)`. |
| 4 | SELF-CALLS-PREVIEW | **VIVO** | `pages/api/auth/signup.ts` L221 (`fetch(${siteUrl}/api/auth/welcome)`), L292/309/331 (`fetch(${siteUrl}/api/admin/notify-nueva-solicitud)`). 4 self-calls detectadas — no 5, pero el patrón exacto está vivo. | En prod funciona; en preview Vercel las URLs de deployment protection requieren bypass o el fetch cuelga/401. Solución: import directo del handler (evita HTTP round-trip completamente). |
| 5 | LINK-CONFIRM-EMAIL | **YA-CERRADO PARCIAL** (código) + **VIVO** (infra Mailtrap) | `grep 'console.log.*confirmationUrl' pages/api/ = 0`. Log temporal fue removido pre-merge email-landing (SHA `0fa0ead`, BACKLOG L164). SMTP staging → Mailtrap sigue sin config (BACKLOG L157-162). | Código: sin acción. Config: instrucción de un paso al PO (Supabase Dashboard staging → Auth → SMTP Settings). |
| 6 | SFM-BUGS-PRE | **VIVO** | BACKLOG L410 — Race en select de Categoría (fetch al abrir, categorias=[] visible ~100-300ms). L389 — Descripcion sin validación 50 chars mínimos. | Fix directo. Ambos son ~15 min c/u. |
| 7 | ROADMAP-CRON-RESOLVERS | **PARCIALMENTE VIVO** | `recordatorio-reserva.ts` L61 ya importa `resolverDonde`. Posible unificar más (`resolverFecha`, formatters). Requiere render-diff. | Auditar qué queda inline vs qué está en `lib/emails/resolvers.ts`. |
| 8a | ESTADODERIV-FALSY-0 | **VIVO** | BACKLOG L1251 (P3 code smell). `lib/estadoDerivado.ts:96` `if (r.duracion_horas)` cae a fallback si es `0`. Semánticamente correcto pero code smell. Nota: BACKLOG L1140 dice "CERRADO en Tanda 2" — verificar; si ya cerrado, saltar. | |
| 8b | PICKER-F2-NITPICKS | **A VERIFICAR** | Buscar en BACKLOG. | |
| 8c | F2-3-D-DESCARTES | **A VERIFICAR** | Buscar en BACKLOG. | |
| 9a | STYLEGUIDE-REWRITE | **VIVO** | `pages/styleguide.tsx` L6-9 documenta "sistema visual post sprint del 15/05/2026 (HEAD d20dc41)" — desactualizado. Cero enlaces desde producto (BACKLOG L1264). | Deuda docs, cero impacto usuario. PO lo pidió explícito acá. |
| 9b | UI-STANDARDS-STALE | **A CONFIRMAR** | No encontré "UI-STANDARDS-STALE" literal en BACKLOG. Probablemente refiere a `pages/styleguide.tsx` L6-9 con SHA histórico stale. | |
| 10 | P8-COROLARIOS-AUD | **VIVO** | BACKLOG L1238. `CLAUDE.md` tiene 15 menciones de "P8" y 13 de "corolario" — corolarios P8 5ª, 6ª, 8ª, 10ª, 11ª numerados. El 6ª (SQL Editor rollback silente) ya está retractado en el propio doc (L633-640). | Auditoría documental — leer cada corolario, verificar si se sostiene, consolidar redundantes. |
| 11a | GIT-COMMIT-VERIFY | **VIVO** | BACKLOG L1169. Helper bash/node que valide `git diff --cached --name-only` post-commit. | Tooling — cero impacto usuario. |
| 11b | GA4-DEBUGVIEW | **VIVO** (investigación) | BACKLOG L1167. Divergencia DebugView vs Realtime; solo Realtime lo muestra. | Sólo investigación con conclusión escrita. |
| 12a | PERF-1 bucket D | **VIVO** | `grep @vercel/speed-insights package.json = 0`. Bucket D listado en BACKLOG L1040 como "candidato, gatillo PO". | Requiere instalar `@vercel/speed-insights` + `<SpeedInsights />` en `_app.tsx` + activar en Vercel Dashboard (instrucción un paso PO). |
| 12b | PERF-1 bucket B | **VIVO** | BACKLOG L1027 (mobile Agentic Browsing, ~2h). Solo informe. | Requiere corrida de auditoría mobile — reporte, cero código. |
| 13 | DMARC-RUA | **VIVO** | BACKLOG L426. `_dmarc.pawnecta.com` `rua` apunta a `dmarc_rua@onsecureserver.net` (GoDaddy default). | Instrucción DNS de un paso al PO (cambio de destino `rua=mailto:...`). |

### Estados resumen

- **VIVO** (ejecutable en este bloque): 1, 2, 3, 4, 6, 7, 8a, 9a, 10, 11a, 11b, 12b — 12 items.
- **YA-CERRADO PARCIAL**: 5 (código) — solo queda config Mailtrap PO.
- **INSTRUCCIÓN PO** (1-paso): 5 (Mailtrap), 12a (Vercel Speed Insights), 13 (DNS DMARC-RUA), AVATARS-HUER (SQL prod).
- **A VERIFICAR** (buscar antes de ejecutar): 8b, 8c, 9b.

### PRs por afinidad — plan concreto post-Paso 0

- **PR F-DOCS**: P8-COROLARIOS-AUD (10) + ESTADODERIV-FALSY-0 (8a, si sigue vivo) + STYLEGUIDE-REWRITE (9a+9b) + kickoff `bloque-f.md` con Paso 0 (este archivo actualizado).
- **PR F-TOOLING**: GIT-COMMIT-VERIFY (11a) + GA4-DEBUGVIEW nota (11b) + AVATARS-HUER script (2) + LINK-CONFIRM-EMAIL verificación (5).
- **PR F-OBS-API**: SENTRY-WRAP-API (3) + SENTRY-FLUSH-MISSING (3) + SELF-CALLS-PREVIEW (4) + ROADMAP-CRON-RESOLVERS (7).
- **PR F-UI**: BUTTON-CANON restante (1, batch por afinidad de clases) + SFM-BUGS-PRE (6).
- **PR F-INFORME**: PERF-1 bucket B (12b, informe único).

---

## Instrucciones de un paso para PO (se llena al final)

_(Vercel, DNS, Mailtrap, prod cleanup avatars, etc.)_
