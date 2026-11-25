# Revisión F2-CHAT-PERFIL-FLAKY — 2026-11-24 PM

Written for: el PO (Aldo). Investigación del ítem backlog `F2-CHAT-PERFIL-FLAKY` para decidir entre (a) proponer sprint `FIX-FLAKES-TRANSIENT-PLAYWRIGHT` ahora o (b) documentar observación + trigger de re-revisión próxima semana.

**Resultado**: **(b)** — los 2 specs target pasan `✓` consistentemente en la ventana observada. Cero sprint ahora; re-revisar 2026-12-01.

## Scope

Specs bajo escrutinio (nomenclatura backlog `F2-CHAT-PERFIL-FLAKY`):
- [e2e/specs/chat-open-error/regresion.spec.ts:57](../../e2e/specs/chat-open-error/regresion.spec.ts#L57) · test `(a) primer clic SIN conversación previa → navega a modo new-chat + cero INSERT + cero toast` · project `chromium-tutor`.
- [e2e/specs/error-audit/c5-perfil.spec.ts:108](../../e2e/specs/error-audit/c5-perfil.spec.ts#L108) · test `4) recuperación: desbloquear + Reintentar → banner desaparece, badge aparece` · project `chromium-tutor-mobile`.

## Criterio de decisión (PO en turno 2026-11-24)

> Si frecuencia **≥3 fails** en última semana → proponer sprint `FIX-FLAKES-TRANSIENT-PLAYWRIGHT`.
> Si frecuencia **<3 fails** → documentar hallazgo + trigger próxima semana.

## Datos observados

### Runs analizados

11 runs de `e2e-error-audit` en la ventana 2026-11-24 14:00 CLT → 20:46 CLT (últimas ~7 horas, tasa de push pre-freeze). Fuente: `gh run list --workflow e2e-error-audit --limit 25 --json databaseId,status,conclusion,createdAt`.

| Run ID | SHA / branch | Conclusion overall | `chat-open-error:57` | `c5-perfil:108` |
|---|---|---|---|---|
| 45483567955 | welcome-guard | failure | ✓ 4.6s | ✓ 1.4s |
| 45480081894 | docs-gastos | failure | ✓ (visual snapshot fail OTRO) | ✓ |
| 45477325543 | rrss-icons | failure | ✓ 5.3s | ✓ 1.5s |
| 45472127714 | ev-pulido-2 | failure | ✓ 5.3s | ✓ 1.4s |
| 45465355475 | admin-unify-a | failure | ✓ | ✓ |
| 45459287711 | docs-ev-cierre | failure | ✓ | ✓ |
| 45448210015 | docs-bitacora-24 | failure | ✓ 6.3s | ✓ 2.6s |
| 45447035791 | eventos-mvp-4 | failure | ✓ 3.7s | ✓ 1.4s |
| 45446022481 | eventos-mvp-3 | failure | ✓ 4.7s | ✓ 1.4s |
| 45445185399 | eventos-mvp-2 | failure | ✓ 3.6s | ✓ 2.7s |
| 45444758333 | eventos-mvp-2 | failure | **✓ 21.8s** (outlier timing) | ✓ 1.3s |

**Mediana de duración `chat-open-error:57`**: ~4.6s. **Mediana de `c5-perfil:108`**: ~1.5s.

### Frecuencia de FAIL en los 2 specs target

**0 de 11 runs** (frecuencia = 0 en la ventana). Los 11 runs failure resolvían OTROS specs (confirmed: visual snapshot drift, AUTH-TOKEN-PERSIST en setup/setup-tutor, etc.) — los 2 specs target pasaron `✓` consistentemente.

Criterio PO (≥3): **NO cumplido** → documentar + trigger próxima semana.

## Observación lateral — outlier timing

Run `45444758333` (branch `eventos-mvp-2`, 2026-11-24 17:10 CLT) tuvo `chat-open-error:57` pasando en **21.8s** (vs mediana ~4.6s = ~5× desviación). El test pasó (no fue flake-fail), pero el timing sugiere:

- **Cold start del preview Vercel** (match típico: cualquier suite correrla primero post-deploy puede recibir lambda frío).
- **Concurrencia Supabase staging** — setup `authenticate as proveedor` + `authenticate as tutor` recibe presión de otros runs cross-PR (ver regla operativa `staging-exclusive` serializando runs).
- **Hidratación tutor** en móvil — este spec ejerce tutor desde desktop, pero el paralelo `chromium-tutor-mobile` corre en el mismo worker pool.

Sin más outliers pico en la ventana, no hay signal suficiente para promover a sprint. Lo mantenemos en radar.

## Decisión

**No se propone sprint `FIX-FLAKES-TRANSIENT-PLAYWRIGHT` ahora** — la frecuencia de fail observada (0 en 11 runs) está por debajo del umbral del PO (≥3).

### Trigger de re-revisión

**Lunes 2026-12-01 (próxima semana)**: repetir el scan con los mismos 2 specs + extender a cualquier spec de los packs `chat-open-error`, `c5-perfil`, `f2-3`. Si la frecuencia de fail sigue <3 sin outlier timing nuevo → cerrar el ítem en BACKLOG como "monitored, no flake confirmed". Si aparecen ≥3 fails → sprint con opciones de mitigación (retry inteligente scope test, timeout por-spec, warm-up explícito del preview antes del golden path).

### Query canónica para la re-revisión

```bash
# Obtener últimos 25 runs del workflow + filtrar fails
gh run list --workflow e2e-error-audit --limit 25 --json databaseId,status,conclusion,createdAt,headBranch

# Para cada runid failure, grep match exacto de los 2 specs
for runid in <runids>; do
  gh run view $runid --log-failed 2>&1 | grep -E "regresion.spec.ts:57|c5-perfil.spec.ts:108"
done
```

Patrón de match: línea con `✓` = pasó (count OK); línea con `✘` = fail (count hacia el umbral ≥3).

## Siguiente paso operativo

Backlog item `F2-CHAT-PERFIL-FLAKY` queda en estado **monitored** con fecha de próxima revisión **2026-12-01**. Cero acción productiva adicional hasta esa revisión. Si entre ahora y 2026-12-01 aparece un fail aislado de cualquiera de los 2 specs, anotarlo en el acta de ese PR y actualizar este documento.
