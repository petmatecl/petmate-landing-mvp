# F2-FIXTURE-DRIFT — Fix del selector del picker (1 línea)

**Autor**: auditor · **Fecha**: 2026-11-19 · **Estado**: propuesta sin código.

## Diagnóstico

`e2e/specs/f2-3/s2-dias-pintados.spec.ts:57` usa `locatorDiaPicker(page, hastaDay)` (fixture en `e2e/fixtures/panel-tutor.ts:143-148`).

El helper hoy:
```ts
export function locatorDiaPicker(page: Page, dayOfMonth: number) {
    return page.locator('.rdp-day').filter({ hasText: new RegExp(`^${dayOfMonth}$`) }).first();
}
```

**Problema**: `.first()` matchea el PRIMER elemento con texto `^N$` en todo el DOM. Cuando `react-day-picker` muestra 2 meses lado a lado (ej. blackout 29-nov → 1-dic), el día "1" aparece 2 veces: una vez como "trailing/pasado" en el grid de noviembre (disabled) + una vez real en el grid de diciembre (libre). El `.first()` agarra el 1-nov pasado (disabled) → el test espera LIBRE pero obtiene disabled → fail.

Verificado empíricamente 2026-11-19 con `page.evaluate` sobre el preview del PR #120:
```
txt="1"  disabled=true   classes="rdp-day rdp-day_disabled"   ← 1-nov pasado
txt="1"  disabled=false  classes="rdp-day"                     ← 1-dic LIBRE
```

Screenshot evidencia: `docs/evidencia/pr120-picker-f2-dia1-libre.png`.

## Fix — 1 línea del diff

**Archivo**: `e2e/fixtures/panel-tutor.ts`

```diff
 export function locatorDiaPicker(page: Page, dayOfMonth: number) {
-    return page.locator('.rdp-day').filter({ hasText: new RegExp(`^${dayOfMonth}$`) }).first();
+    return page.locator('.rdp-day:not(.rdp-day_outside):not(.rdp-day_disabled):not([disabled])').filter({ hasText: new RegExp(`^${dayOfMonth}$`) }).first();
 }
```

## Por qué funciona

`react-day-picker` v8 marca con class `rdp-day_outside` los días que pertenecen a un mes adyacente renderizados en el grid actual (ej. 1-dic en el grid de noviembre). También marca `rdp-day_disabled` + atributo `disabled` HTML los días que están efectivamente disabled (pasados, bloqueados por blackout, fuera de rango min/max del picker).

El fix excluye los 3 patrones de "no es el día real del mes visible libre":
- `:not(.rdp-day_outside)` → saltea el 1-dic renderizado en el grid de noviembre.
- `:not(.rdp-day_disabled)` → saltea el 1-nov pasado (gris en el screenshot).
- `:not([disabled])` → defensa en profundidad para días disabled por atributo HTML sin la class de rdp-day_disabled (edge case teórico, mantiene robustez).

Con las 3 exclusiones, `.first()` sobre el texto `^1$` matchea **solo** el día 1-dic real en el grid de diciembre.

## Impacto adicional

El fix beneficia a cualquier spec que use `locatorDiaPicker` cuando el picker muestra 2 meses:
- `s2-dias-pintados.spec.ts` ← el spec que falló en #120 iter 4.
- `seleccionarRangoPorDia` (línea 154-157 del mismo fixture) — también se beneficia porque pasa los días al helper.

Caso borde: si el día objetivo ES un día outside/disabled legítimo (ej. un test que verifica que el día 29-nov está disabled), el fix rompería ese test — pero no es el caso de `s2-dias-pintados` (verifica `expect(hastaIsDisabled).toBe(false)` sobre el check-out libre). Si surge después, el caller puede usar un selector propio directo sin pasar por el helper.

## Estimación

- Cambio: 1 línea en `e2e/fixtures/panel-tutor.ts`.
- Smoke: correr el spec `s2-dias-pintados.spec.ts` contra staging (ya debería pasar con el fix) + verificar que ningún otro caller del helper rompe.
- Total: 15 min código + 15 min smoke CI = **30 min**.

## Timing

Post-lanzamiento (sprint propio F2-FIXTURE-DRIFT ya anotado en BACKLOG).
