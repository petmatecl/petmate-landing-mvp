# Bloque J — Kickoff

**Fecha kickoff**: 2026-09-21.
**Rama base**: `main` post-cierre de Bloque I (SHA `e19154c` — 12 baselines committeadas por CI runner).
**Precondiciones cumplidas**: Bloque I cerrado — canario CI activo, Node 22 alineado en 4 workflows, RPC-C Lote 2 aplicado en staging (SQL prod pendiente ejecución PO), 12 baselines visuales committedas.

## Contexto operativo

Bloque autónomo posterior a I. Cierra los 3 ítems abiertos del cierre de Bloque I:

- **J-1**: 2 baselines faltantes de `/servicio/[id]` (spec navegaba a `/explorar` y clickeaba primer card con storage state vacío — cero servicios visibles al visitante anon en staging con esa data).
- **J-2**: BUTTON-CANON incremental — migración de los ~25 botones ad-hoc al componente `<Button>` canónico. El spec visual (baselines de I-3) es la puerta.
- **J-3**: `actions/*@v5` — migrar los workflows a la versión que no fuerce Node 24 sobre `actions/*@v4` (annotation persistente del sprint I-3).

Orden explícito PO: J-1 → J-2 → J-3.

## Alcances por sprint

### J-1 · Baselines faltantes de /servicio/[id]

**Motivación**: el dispatch de `visual-update-snapshots` del sprint I-3 generó 12/14 baselines. Los 2 faltantes son el desktop + mobile de `ficha de servicio` (`/servicio/[id]`) — el spec navegaba a `/explorar` y clickeaba el primer `a[href*="/servicio/"]` con storage state vacío (anon), pero staging no muestra servicios a visitantes anónimos con la data actual (RLS o falta de seeds públicos).

**Entregable**:
- Modificar `e2e/specs/visual/paginas-clave.spec.ts` para navegar directo a un seed conocido y estable: `c1000001-0000-4000-8000-000000000006` — "Adiestramiento canino con refuerzo positivo en Vitacura" (seed 2026-05-05, 4 fotos, 498 chars descripción). Verificado activo vía `supabase-prod-ro`.
- Push del PR + verificar CI verde (los 12 baselines ya generados no deben cambiar; los 2 nuevos fallan la primera vez con "snapshot doesn't exist" pero eso es el behavior esperado del gate).
- Post-merge: dispatch de `visual-update-snapshots --ref main` para generar los 2 nuevos PNGs. Commit + push al main.

**Verificación**: `git ls-tree -r main | grep "ficha-servicio.*png"` debe listar 2 archivos post-dispatch. Suite visual verde en el siguiente PR (baselines vs baseline = idénticas).

### J-2 · BUTTON-CANON incremental

**Motivación**: unificar los ~25 botones ad-hoc restantes al componente `<Button>` canónico. Baselines visuales (I-3) permiten validar que la migración no altera el look de las 14 páginas × 2 viewports = 28 snapshots.

**Entregable**:
- Inventario inicial: grep exhaustivo de `<button` (JSX) en `components/` + `pages/` que NO usan `<Button>` importado. Categorizar:
  - **Migrables**: botones custom con className Tailwind + onClick. Reemplazar por `<Button variant="..." size="...">`.
  - **Justificados fuera**: botones de librerías (`react-day-picker`, `@headlessui/*`, etc.), botones nativos requeridos por semántica (`type="submit"` dentro de forms con handling específico), botones dentro de componentes ya standalone (Modal close X con aria-label).
- PRs incrementales, 5-8 botones cada uno. Cada PR:
  - Cambios acotados a esa selección de botones.
  - Spec visual como puerta — si diff visual → detener + adjuntar diff a la conversación + NO mergear.
  - 5 checks verdes (typecheck-and-build, rápida, F2, Vercel, Vercel Preview Comments) → merge autónomo.
- Continuar hasta que el grep de "botones ad-hoc no migrables" retorne cero (o solo los justificados fuera).

**Verificación**: cada PR con visual verde. Al cierre del sprint, reporte con conteo `migrados=N, justificados_fuera=M` + listado de justificados con motivo (una línea cada uno).

### J-3 · actions/*@v5

**Motivación**: annotation persistente en cada corrida CI desde I-3 (`Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4, actions/upload-artifact@v4`). Cuando GitHub retire el fallback forzado (fecha aún no anunciada firmly), estos workflows fallarán. Migrar preventivamente.

**Entregable**:
- Grep de `uses:.*actions/.*@v[0-9]+` en `.github/workflows/*.yml` — inventario de versiones actuales.
- Bump a v5 donde exista (verificar en cada release page). Los conocidos hoy: `actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-artifact@v5` — todos declaran Node 24 native, cierran la annotation.
- Un solo PR con los 5-6 workflows actualizados. Cero cambio de behavior esperado (los `@v5` son drop-in con misma API).
- Post-merge: dispatch manual del canario CI (`gh workflow run ci-canario --ref main`) — el canario debe seguir fallando el spec (`expect(false).toBe(true)`) y NO abrir el issue "CI ciego". Verifica que la propagación de exit code no se rompió con el bump de actions.

**Verificación**: `gh run view <canario-run> --json conclusion,jobs` debe retornar `{conclusion:"success"}` (canario terminó exitosamente probando que la lógica de fail propagation funciona).

## Estado en curso

- [ ] J-1 ficha-servicio seed ID + baselines
- [ ] J-2 BUTTON-CANON incremental
- [ ] J-3 actions/*@v5

## Cierre esperado

- Acta breve `docs/sprints/bloque-j.md` (este archivo, actualizado con SHAs, PRs, verificaciones).
- Tag `button-canon-prod-YYYYMMDD` sobre el último merge de BUTTON-CANON en main.
- BACKLOG.md conciliado — cerrar ítem BUTTON-CANON, cerrar ítem baselines ficha-servicio, cerrar ítem actions v5.
- Reporte final al PO con enlaces a los PRs mergeados + tag + conteo migrados/justificados.
- Confirmación de que los SQL de prod L1+L2 (ejecutados aparte por el PO) están cerrados con verificación posterior compartida.
