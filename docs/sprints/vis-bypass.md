# Sprint vis-bypass · 2026-11-06 (Tramo 3, viernes)

**Rama**: `vis-bypass` (desde main `72afefb`).
**Motivación**: durante el intento de merge #77 el 2026-11-05 Tramo 3, los
8 tests `[visual] visual público` cayeron con `expect(page).toHaveScreenshot
failed`. Diagnóstico read-only descartó drift visual de la app y descubrió
que los 8 tests estaban capturando la pantalla "Log in to Vercel" del SSO
de Deployment Protection, no la app Pawnecta.

**Alcance** (decisión PO 2026-11-06, opción A del triage):
1. Fix del spec `e2e/specs/visual/paginas-clave.spec.ts` pasando
   `x-vercel-protection-bypass` en el primer `goto` de cada test público,
   siguiendo el patrón ya canónico de `e2e/setup/authenticate.ts:33-37` y
   los otros 5 specs sin sesión que ya aplican bypass.
2. Guardia P8 obligatoria pre-screenshot: verificar que el logo Pawnecta
   del header es visible + fail explícito si se detecta el SSO Vercel.
   Sin esta guardia, un fallo del bypass queda silencioso (como ocurrió
   durante ~52 días con el bug original).
3. Regenerar baselines reales de la app vía workflow
   `visual-update-snapshots` apuntando al preview de `vis-bypass`.
4. Revisión manual PO de las 8 PNGs nuevas antes de aterrizar.
5. Revisión del resto de specs sin sesión para confirmar que ninguno
   más captura el SSO Vercel.

---

## 1. Diagnóstico del bug raíz

### 1.1 Cronología

- **2026-09-15** — Bloque G-3 seed (`paginas-clave.spec.ts`) aterriza con
  `test.use({ storageState: { cookies: [], origins: [] } })` + `goto('/')`
  sin bypass. Vercel Deployment Protection intercepta cualquier
  navegación sin cookie `_vercel_jwt` → redirige a SSO → Playwright
  captura la pantalla "Log in to Vercel".
- **2026-09-15 → 2026-11-05** — Las baselines commiteadas en
  `e2e/specs/visual/paginas-clave.spec.ts-snapshots/` son PNGs de la SSO
  Vercel. El test pasa en cada PR porque el widget Vercel SSO es estable
  (mismo renderizado pixel-por-pixel entre runs).
- **2026-11-05** — Vercel actualiza el UI del botón "Continue with Email"
  del SSO (hover/focus state ligeramente distinto). El spec detecta diff
  de ~0.19% en desktop y ~0.81% en mobile — **8 fails en el mismo spot
  del layout centrado** (bbox 183×293 px, la caja del `<form>` SSO),
  idéntico en las 4 páginas desktop y las 4 páginas mobile.
- **2026-11-06 Tramo 3 kickoff** — Diagnóstico del auditor con bajada de
  los 8 artifacts + cálculo pixelmatch + inspección visual del
  `-expected.png` revela que la pantalla capturada era "Log in to
  Vercel", no la app. Decisión PO opción A.

### 1.2 Por qué no se detectó durante 52 días

- Las baselines commiteadas también eran de la SSO Vercel → el test
  comparaba SSO contra SSO → pasaba.
- Ningún test adicional verificaba "vi la app Pawnecta" después del
  `goto`. Cero señal positiva pre-screenshot.
- El bug fue latente: cualquier update menor del UI del widget SSO
  Vercel reventaba los 8 tests en bloque, exactamente lo que pasó el
  2026-11-05.

**Lección operativa**: cualquier test visual o de screenshot debe tener
una guardia pre-captura que verifique que renderizó la aplicación esperada
y no una pantalla de error, un redirect o un gate interpuesto. Aplicable
a cualquier spec `toHaveScreenshot`, `page.content()`, `page.screenshot()`.

---

## 2. Fix aplicado

### 2.1 Spec `e2e/specs/visual/paginas-clave.spec.ts`

- Constante `BYPASS_TOKEN` + `BYPASS_QUERY` en el top del archivo,
  mismo patrón que `error-audit/c4-login-redirect.spec.ts:39-42`,
  `form-post/pre-hydration.spec.ts:35-37`,
  `link-confirm-email/p8-positivo-y-negativo.spec.ts:46-48`.
- Cada `page.goto('/...')` del describe `visual público` ahora es
  `page.goto('/...${BYPASS_QUERY}')`. El primer navigate dispara el
  handshake Vercel → emite cookie `_vercel_jwt` → navegaciones
  subsecuentes del mismo test (si las hubiera) no requieren query.
- Función nueva `assertPawnectaRendered(page, pageLabel)` llamada
  ANTES de cada `toHaveScreenshot`. Verifica dos señales:
  - **Negativa**: el `<h1>Log in to Vercel</h1>` NO es visible. Si lo
    es, throw con mensaje explícito que identifica el fail como
    "capturó SSO Vercel" + checklist de causas probables.
  - **Positiva**: el `<img alt="Pawnecta">` del header ES visible
    dentro de 5 s. Si no aparece, throw con mensaje señalando posible
    redirect silente.

### 2.2 Qué NO incluye este sprint

- **Regenerar baselines**: se hará vía dispatch del workflow
  `visual-update-snapshots` sobre `vis-bypass` tras el merge del spec
  fix. Las 8 PNGs nuevas se entregan al PO para review visual **antes**
  de commitearlas al repo (regla explícita del PO 2026-11-06).
- **Fix de otros specs** fuera de `visual/paginas-clave.spec.ts`. Ver
  §3 para la lista verificada.

---

## 3. Verificación de otros specs sin sesión

Grep de `storageState: { cookies: [], origins: [] }` sobre `e2e/specs/`
devolvió 7 matches en 6 archivos (uno tiene dos usos).

| Spec | Estado | Patrón |
|---|---|---|
| `visual/paginas-clave.spec.ts:126` | ARREGLADO (este sprint) | Nuevo: bypass + guardia P8 |
| `visits-doble/idempotencia-24h.spec.ts:71` | **SOSPECHOSO — anotar aparte** | `goto('/servicio/<seed>')` sin bypass. El test lee contador BD vía service_role, no hace assertion visual ni DOM. Hipótesis: pasa como `delta=0` siempre (la SSO Vercel no dispara `/api/visitor-hash` ni `registrar_visita`, así que el contador queda igual y `delta<=1` se cumple sin medir nada real). Patrón P8: pasa sin probar lo que dice probar. **Verificar en sprint propio post-vis-bypass**. |
| `error-audit/c4-login-redirect.spec.ts:37` | OK | Construye `bypassQuery` + `goto('/login${bypassQuery}')` ✓ |
| `form-post/pre-hydration.spec.ts:45,71` | OK | Mismo patrón bypass + `goto('/login${bypassQuery}')` ✓ |
| `launch-l1/case6-notify-degraded.spec.ts:34` | OK | API-only con `request.post(...?x-vercel-protection-bypass=...)` ✓ |
| `link-confirm-email/p8-positivo-y-negativo.spec.ts:37` | OK | Primero `goto('/login${bypassQuery}')` para setear cookie, luego `goto(actionLink)` con cookie activa ✓ |

**Conclusión**: de los 6 specs sin sesión, el único visualmente afectado
era `paginas-clave.spec.ts`. `visits-doble/idempotencia-24h.spec.ts` es
sospechoso pero el fail es distinto (silent pass, no visual) — queda
para sprint propio post-vis-bypass con alcance "fixture-hygiene"
tipo análogo al hallazgo F2-RESERVAS-CLEANUP (sprint J-4).

---

## 4. Checklist del sprint

- [x] Fix spec `visual/paginas-clave.spec.ts` con bypass + guardia P8.
- [x] Acta con cronología + revisión de los otros specs sin sesión.
- [ ] `npm run build` exit 0 local.
- [ ] Push a `vis-bypass` + PR abierto.
- [ ] Preview Vercel Ready sobre `vis-bypass`.
- [ ] Dispatch del workflow `visual-update-snapshots` apuntando a
  `vis-bypass` → regenera baselines.
- [ ] Bajar las 8 PNGs nuevas + entregarlas al PO para review visual.
- [ ] Tras OK del PO → commit automático del workflow queda en el branch
  → CI corre con baselines nuevas → 5/5 verde.
- [ ] Merge tras confirmación PO.

---

## 5. Post-merge / seguimientos

- Sprint aparte "visits-doble bypass + assertion real" para cerrar el
  sospechoso del §3 (fixture-hygiene siguiente ola).
- Patrón "guardia pre-captura" documentado como convención en
  `e2e/README.md` (sprint FIXTURE-HYGIENE pendiente del BACKLOG).
