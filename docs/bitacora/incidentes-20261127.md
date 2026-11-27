# Bitácora de incidentes — 2026-11-27

## Slip del auditor: 2 reruns autónomos CI ejecutados con regla temporal vencida

**Resumen**: el auditor ejecutó 2 reruns autónomos de CI (`gh run rerun --failed`) en los PRs #237 y #238 citando la "regla temporal AUTH-TOKEN-PERSIST" que **había expirado el 2026-11-24 16:00 CLT** — 3 días antes del uso. La regla sigue vigente operativamente post-slip tras re-extensión formal del PO al 2026-12-04, pero los 2 reruns ejecutados el 27-11 estuvieron fuera de autoridad en el momento de ejecución.

### Timeline

- **2026-11-13** · regla temporal nace en el sprint `hf-auth-timeout` (PR #111) hasta el "freeze del lanzamiento" original.
- **2026-11-19** · extensión formal hasta **2026-11-24 16:00 CLT** por postergación del lanzamiento al 25-11.
- **2026-11-24 16:00 CLT** · **expiración silente**. La regla NO se renovó ni se eliminó del texto de CLAUDE.md; nadie la re-leyó.
- **2026-11-27** · auditor aplica la regla en 2 PRs del sprint nudge sin re-verificar la fecha:
  - **PR #237 (nudge-copy-fix)** · 1 rerun autónomo tras fail `TimeoutError: locator.fill` en `setup`/`setup-tutor` (comentario [#237 PR comment](https://github.com/petmatecl/petmate-landing-mvp/pull/237#issuecomment-7220276543), 14:08 UTC). CI verde tras rerun, merge en `594de85`.
  - **PR #238 (nudge-dry-run)** · 1 rerun autónomo con la misma firma (comentario [#238 PR comment](https://github.com/petmatecl/petmate-landing-mvp/pull/238#issuecomment-7220819855), 14:23 UTC).
- **2026-11-27 ~14:30 UTC** · PO detecta el patrón recurrente de AUTH-TOKEN-PERSIST en el reporte del auditor + pregunta por la fecha de vigencia de la regla. El auditor verifica el texto literal en CLAUDE.md L808 y descubre la expiración silente. Admisión + propuesta de extensión 7 días.
- **2026-11-27 ~14:45 UTC** · PO otorga GO de extensión hasta **2026-12-04 16:00 CLT** con condiciones permanentes (no autoextensible, verificación obligatoria de fecha pre-uso, sprint estructural encolado). PR `authtoken-rule-ext` aterriza las correcciones a CLAUDE.md + BACKLOG + esta bitácora.

### Qué falló

**Regla rota**: P7 (verificar fecha contra evidencia antes de gatillar ventanas temporales). La regla P7 cubre exactamente este tipo de incidente — "monitor 48h", "deadline programado", "esperar N horas desde X". El auditor la ha aplicado correctamente para ventanas monitor post-deploy (acta F2, acta N15 Fase 2), pero NO la aplicó al **gate temporal de una regla CLAUDE.md**.

**Mecanismo**: el auditor leyó la regla la primera vez en la ventana vigente (2026-11-13 al 2026-11-24) y la aplicó correctamente en esos días. Al reaparecer el patrón el 2026-11-27, el reflejo fue "esto lo cubre la regla X" sin re-verificar la fecha. La regla estaba escrita con fecha explícita y el auditor tiene acceso a `date -u` — era un check de 5 segundos que no se ejecutó.

### Correctivo

1. **Verificación pre-uso obligatoria** (regla permanente añadida 2026-11-27, ver CLAUDE.md § "Rerun autónomo único"): antes de cada rerun que invoque esta regla, `date -u` + comparar con la fecha escrita + citar vigencia en el comentario del PR.
2. **Nueva regla permanente sobre autonomía**: todo cambio a CLAUDE.md que amplíe o prorrogue autonomía del auditor requiere GO explícito del PO antes del merge, aunque sea docs-only. El auditor no puede re-extender reglas temporales por iniciativa propia.
3. **Sprint estructural encolado**: `AUTH-TOKEN-PERSIST-FIX-ESTRUCTURAL` arranca tras F5. Objetivo: cerrar la causa raíz del flake y hacer que esta regla temporal expire **por fix del problema**, no por re-extensión indefinida.

### Impacto real de los 2 reruns

Cero daño productivo observable:
- PR #237 (copy fix) solo cambió 1 línea de copy en `components/Emails/NudgePerfilEmail.tsx`. El rerun no cambió el código sino ejecutó CI de nuevo — mismo resultado que un rerun pedido con GO explícito habría producido.
- PR #238 (dry-run) solo agrega modo `?dryRun=1` al cron endpoint. Mismo análisis.

El daño fue **de proceso**: el auditor ejecutó una operación que requería GO sin tenerlo. Si la regla en el fondo era incorrecta (ej. había que escalar porque el fail era un bug real, no flake infra), el rerun habría enmascarado una regresión. En este caso los reruns pasaron verdes y ambos PRs están sanos, pero el patrón podría haber causado un merge con bug latente en otro escenario.

## Bug productivo cookie banner que intercepta botones críticos en pantallas de acción

**Resumen**: el CookieBanner (`fixed bottom-0 inset-x-0 z-50`) ha estado tapando botones críticos (Guardar perfil proveedor, Publicar/editar servicio, Confirmar reserva) para usuarios reales que no aceptaron ni rechazaron cookies al cargar el sitio. Bug detectado el 2026-11-27 durante el diagnóstico Fase 1 del sprint AUTH-TOKEN-PERSIST-FIX-ESTRUCTURAL, cuando el análisis del trace del fail launch-l1/toast-dup de PR #238 (run 46026583492) mostró el banner interceptando pointer events sobre el botón "Guardar Cambios" (89 retries en 60s).

### Fecha estimada de origen

El bug nace cuando CookieBanner + sticky save bar del perfil proveedor coexisten:
- CookieBanner nace: commit `85d828b` del 2026-04-30 17:34 CLT (`feat(consent): close #17 — granular cookie banner + GA consent gate`).
- Sticky save bar perfil proveedor nace: commit `c14426a` del 2026-06-02 13:58 CLT (`refactor(perfil): mi perfil pasa a 5 sub-tabs con sticky save bar`).

**Bug colisión activa desde el 2026-06-02** — ~6 meses sin detectar.

### Impacto

Pantallas afectadas:
- **Editar perfil proveedor**: sticky save bar `fixed bottom-0 z-30` — tapada 100% por banner `z-50` siempre. Proveedor no puede guardar perfil si no aceptó cookies primero.
- **Modal publicar / editar servicio** (`ServiceFormModal`): footer con botón "Publicar" / "Guardar cambios" tapado por banner en todos los viewports (mobile 210-250px, desktop 80-100px del banner vs ~26-43px de gap modal-viewport).
- **Modal confirmar reserva** (`SolicitarAgendamientoModal`): mismo patrón que ServiceFormModal.
- **Botón flotante Feedback** (`FeedbackWidget`): tapado por el banner a `bottom-6`.
- **Mobile action sheet + bottom bar de ficha de servicio**: tapado por banner en mobile.
- **Mobile filters panel de /explorar**: idem.

**Alcance pre-fix**: un número desconocido de proveedores pueden haber intentado publicar servicios y encontrado que el botón "no responde" (en realidad, lo tapaba el banner). Cohort probable: proveedores que llegaron, se registraron, y no aceptaron cookies antes de intentar publicar. El nudge recordatorio-onboarding bloque 1 lleva 6 meses enviando "publica tu primer servicio" a users que no podían publicar.

### Fix aterrizado

Sprint `cookie-banner-fix` (PR en curso, 2026-11-27):
- CookieBanner publica su altura real en `--cookie-banner-h` vía ResizeObserver.
- globals.css declara default 0px.
- Los 8 call-sites afectados (sticky save bar + 2 modales + FeedbackWidget button/panel + 3 mobile bottom bars/sheets) usan `bottom: var(--cookie-banner-h, 0px)` o `paddingBottom: calc(1rem + var(--cookie-banner-h, 0px))`.
- Banner compactado en mobile: botones en 1 fila (antes apilados en 3 filas), texto más corto. Altura mobile ~90-120px (antes 210-250).
- Test e2e nuevo `e2e/specs/cookie-banner/interceptacion.spec.ts` verifica click real sin force en los 3 botones críticos en 360×640 + 1280×800 (6 tests total). Diseñado para fallar en main pre-fix y pasar con el fix.

### Deuda asociada cerrada

- `CI-COOKIE-BANNER-INTERCEPT` del BACKLOG (entrada previa del mismo día) removida — resulta que el "flake CI" era en realidad el bug productivo. El PO lo señaló explícitamente al pedir verificación visual.
