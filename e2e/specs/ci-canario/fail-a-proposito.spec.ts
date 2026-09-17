// e2e/specs/ci-canario/fail-a-proposito.spec.ts
// ---------------------------------------------------------------------------
// Sprint bloque-i I-1 (2026-09-17) — spec canario que SIEMPRE falla, ejecutado
// semanalmente por .github/workflows/ci-canario.yml para verificar que la
// propagación de exit code de un test que falla sigue funcionando (fix P12).
//
// Diseño:
//   * `expect(false).toBe(true)` — fail determinístico, cero dependencia de
//     staging, browser, red, o env vars. Con eso Playwright retorna exit
//     code != 0 en cualquier configuración.
//   * El workflow ci-canario invierte la lógica: si npx playwright retorna
//     exit 0 (spec pasó), es porque el pipefail o algún mecanismo de
//     propagación se rompió → abre issue automático.
//   * NO incluido en las suites productivas (e2e-error-audit, visual):
//     esos workflows apuntan a `e2e/specs/{error-audit,f2-*,...}` explícitos,
//     y `e2e/specs/ci-canario/` no aparece en esas listas.
//
// Regla operativa (CLAUDE.md, propuesta para agregar en este PR):
//   No agregar `e2e/specs/ci-canario/` a la lista de dirs de ningún workflow
//   productivo (rápido, F2, visual) — es un canario dedicado; incluirlo en
//   una suite productiva la deja siempre rota.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

test('canario: fallo intencional para verificar propagación de exit code (P12)', async () => {
    // Fail hardcoded. Cero navegación, cero red, cero fixture.
    // Si este assertion pasara (imposible con `false === true`), Playwright
    // reporta 0 tests failed y retorna exit 0 → el workflow ci-canario
    // detecta el "verde falso" y abre un issue "CI ciego".
    expect(
        false,
        'Este test DEBE fallar. Si viste este mensaje sin issue "CI ciego" ' +
            'abierto, algo en el pipeline propagó exit 0 cuando debía propagar 1.',
    ).toBe(true);
});
