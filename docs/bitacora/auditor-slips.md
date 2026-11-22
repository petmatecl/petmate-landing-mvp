# Bitácora de slips/patrones del auditor

Written for: el auditor (yo), como memoria larga de errores operativos para auto-observación. Si aparece un tercer slip del mismo tipo registrado acá, revisar si amerita cambio de proceso.

**Formato**: entradas ordenadas por fecha. Cada una con fecha, contexto, patrón, consecuencia, y acción correctiva aplicada.

---

## 2026-11-22 ~17:00 CLT — Slip #1: 2 pushes al PR #145 mientras CI en curso

**Contexto**: PR #145 docs-only (BACKLOG migración + resumen ejecutivo). Primer push creó el PR + CI arrancó. Mientras CI corría, el PO envió aclaración sobre división de responsabilidades sitio-web vs RRSS en el ítem EVENTOS-MASCOTAS-ECOSISTEMA. Yo pusheé un segundo commit con la corrección de copy al mismo branch.

**Patrón violado**: `feedback_pr_ci_no_pushes` — "No pushear al PR mientras el CI esté en curso. Aunque sean docs-only, cada push reinicia el run y pospone la señal útil. Nuevas anotaciones van en el próximo PR."

**Consecuencia**: la CI del primer push (`a4fc815`) fue superseded por el segundo (`deaff5b`). El run F2 de `deaff5b` terminó CANCELLED por infra/concurrency (probablemente contención cross-PR). Se consumió el rerun autónomo P11 iter 1 docs-only único del PR para intentar recuperar la señal.

**Acción correctiva aplicada en el momento**: reconocí el slip al PO en el turno siguiente ("Slip anotado: pusheé commit extra con CI en curso"). Las correcciones subsecuentes al mismo contexto (nuevo ítem PAWNECTA-APOYO-DONACIONES del PO a los minutos) fueron a **PR separado** `apoyo-item2` basado en pre-camp-cola — zero push adicional a #145.

**Patrón corregido**: PRs separados para correcciones post-push incluso cuando el scope del nuevo cambio parece cercano al anterior. La disciplina es mecánica: **si el CI del PR ya arrancó, nuevo cambio = nuevo PR**.

---

## 2026-11-22 ~19:10 CLT — Slip #2: push del fix guard B3 al branch equivocado (pwd-meter en vez de smoke-prod)

**Contexto**: tras GO merge del PO en PR #151 pwd-meter, sync main → nuevo CI corriendo. Mientras esperaba, descubrí que PR #155 smoke-prod tenía 1 FAILURE en e2e-error-audit por guard B3 CI-SPEC-COUNT no reconociendo el dir nuevo `e2e/specs/smoke-prod/`. Hice el fix del guard en `.github/workflows/e2e-error-audit.yml` y pusheé — **pero estaba posicionado en el branch `pwd-meter`**, no `smoke-prod`. El commit `2dce9a7 fix(ci): agregar smoke-prod al EXCLUDE_LIST del guard B3 CI-SPEC-COUNT` quedó incorrectamente en #151.

**Patrón violado**: P3 "Branch destino en commits con instrucción explícita". No tenía instrucción explícita del PO para pushear a smoke-prod, pero el principio aplica — verificar `git branch --show-current` antes de cualquier commit que toque un area ortogonal al scope del PR activo.

**Consecuencia**: scope creep silencioso en #151. El commit del guard fix no pertenecía conceptualmente al sprint F-TR-4 password meter. Un reviewer podría objetar "¿por qué el PR del password meter agrega smoke-prod al EXCLUDE_LIST?"

**Acción correctiva aplicada en el momento**: `git revert --no-edit 2dce9a7` + push al pwd-meter (restaura scope original) + `git checkout smoke-prod` + `git cherry-pick 2dce9a7` + push al smoke-prod (el fix llega al branch correcto). Zero force-push.

**Patrón corregido**: antes de edit + commit de workflow files u otros archivos "cross-cutting", verificar `git branch --show-current` + si el cambio pertenece al scope del branch actual. Si no, checkout branch correcto primero.

---

## Meta-patrón

Los 2 slips comparten raíz: **falta de pausa pre-push para verificar el estado del contexto (branch + CI activo)**. Ambos pasaron porque el auditor privilegió velocidad de ejecución sobre verificación mecánica previa.

**Antídoto operativo aplicable a ambos**: antes de cada `git push`, ejecutar mental checklist de 3 segundos:
1. **¿En qué branch estoy?** → `git branch --show-current`.
2. **¿El CI del branch está en curso?** → si sí, pausar hasta que termine antes de push extra.
3. **¿El contenido del commit pertenece al scope del branch?** → si no, checkout branch correcto.

Los 3 puntos son 3-10 segundos máximo. El ahorro es: zero revert, zero scope creep, zero CI consumido en vano.

**Trigger para revisar proceso**: si aparece un tercer slip del mismo tipo (push equivocado o push durante CI) en las próximas 48h, el auditor debe proponer al PO una pausa explícita + sprint de auto-observación antes de continuar la cola operativa.

---

## Notas metodológicas

- Esta bitácora es **privada del auditor**, no reemplaza acta/ACTA del repo.
- Se mantiene en `docs/bitacora/auditor-slips.md` para que quede versionada en git (trazabilidad + reviewable) pero no está wired a ningún workflow.
- Formato: una entrada por slip con fecha + contexto + patrón + consecuencia + acción correctiva.
- Revisar la bitácora **cada vez que ocurra un slip nuevo** para detectar reincidencia de patrón.
