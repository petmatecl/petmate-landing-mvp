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

## Paso 0 / estado por ítem

_(Se completa antes de cada PR — no confiar en memoria de sesión, verificar contra el código actual.)_

Cada ítem debe listarse aquí con: estado (`vivo` / `ya-cerrado` / `saltado-por-decision`), fuente empírica (grep, script, migration, PR), justificación.

---

## Instrucciones de un paso para PO (se llena al final)

_(Vercel, DNS, Mailtrap, prod cleanup avatars, etc.)_
