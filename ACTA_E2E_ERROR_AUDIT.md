# ACTA — Sprint `e2e-error-audit` (2 PRs, batch cerrado)

**Tag**: `e2e-error-audit-prod-20260908`.
**Fecha ejecución**: 2026-09-08.
**Estado**: **CERRADO en producción**. Los 5 casos Tipo A del sprint error-audit tienen suite Playwright automatizada.

---

## 1. Motivación

El sprint principal `error-audit` (cerrado con tag `error-audit-prod-20260908` + `error-audit-prod-20260908-hotfix`) aterrizó los 5 fixes Tipo A pero **no automatizó su regression coverage**. Los smokes se corrieron una vez manual por el PO y quedaron sin repetición. Riesgo: cambios futuros al RoleGuard, login.tsx o ClientLayout.tsx podrían romper los 5 fixes sin señal de CI.

Este sprint completa el batch convirtiéndolos en tests Playwright bajo `e2e/specs/error-audit/` + workflow GH Actions dedicado.

## 2. Cobertura — 5 specs, 15 tests netos

Cada spec valida un fix del sprint principal. **Todos siguen el protocolo P8**: test 1 es control positivo obligatorio (verifica que la assertion sabe qué buscar sin la manipulación), luego los negativos ejercen el fix.

| Spec | Fix cubierto (SHA original) | Project | Tests |
|---|---|---|---|
| `c2-c1-roleguard.spec.ts` | `3aeb627` — RoleGuard distingue error de red vs no-autorizado | `chromium` (admin) | 4 |
| `c3-admin-hub.spec.ts` | `c564728` — hub `/admin` wrap en RoleGuard (−168 líneas) | `chromium` (admin) | 3 |
| `c4-login-redirect.spec.ts` | `5da5289` — login role lookup + Sentry, /explorar fallback seguro | `chromium` (fresh storage) | 2 |
| `c5-perfil.spec.ts` | `da06fbc` — fetchClientProfile banner + badge condicionado | `chromium-tutor-mobile` | 4 |
| `c5-l92-upload-orphan.spec.ts` | `f40f499` — handlePhotoUpload reorden verificar-antes-de-upload | `chromium-tutor-mobile` | 2 |

**Case 6** (`signup.ts:220`) queda fuera de la suite — server-side, no reproducible con smoke browser-driven, ya documentado en BACKLOG del sprint principal.

### 2.1 Config nueva: project `chromium-tutor-mobile`

Necesario para c5-perfil + c5-l92: el avatar-upload trigger + badge "Usuario Verificado" son `md:hidden` (mobile-only por diseño Tailwind). Sin viewport mobile los elementos no rendean y las assertions fallan.

Definido en `playwright.config.ts`:
- Device: `Pixel 5` (393×851, mobile chrome).
- StorageState: `e2e/.auth/tutor.json` (Camila).
- Dependencies: `setup-tutor`.
- `testMatch: /specs/error-audit/c5-*.spec.ts$/` — solo c5-* van acá.
- `chromium` project `testIgnore` extendido para excluir esos c5-*.

Decisión PO 2026-09-08: project separado (no ampliar testMatch de chromium-tutor con viewport override) porque el mobile se reutilizará en más specs futuros del tutor.

## 3. Workflow GH Actions

`.github/workflows/e2e-error-audit.yml` (nuevo en PR #3, mergeado en `72e0a5c`):

- **Triggers**: `pull_request` a main con path filters (`e2e/specs/error-audit/**`, `components/Shared/RoleGuard.tsx`, `components/Client/ClientLayout.tsx`, `pages/admin.tsx`, `pages/login.tsx`, el workflow mismo) + `workflow_dispatch` manual con URL custom.
- **NO** se dispara en push a main. Main = prod y los guards `e2e/setup/guard.ts` rechazan prod.
- Compone `e2e/.env.test` desde 7 GH Secrets al arranque del runner.
- Resolve preview URL: `pull_request` → hostname convencional `pawnecta-landing-mvp-git-<branch>-petmatecls-projects.vercel.app`; `workflow_dispatch` → input.preview_url.
- Wait 5min best-effort para preview Ready antes de correr tests.
- Uploads: HTML report siempre, `test-results/` (traces + screenshots + videos) solo en fallo.

**7 GH Secrets cargados en repo** (mismo nombre que variables en `e2e/.env.test`):
`E2E_STAGING_EMAIL`, `E2E_STAGING_PASSWORD`, `E2E_STAGING_TUTOR_EMAIL`, `E2E_STAGING_TUTOR_PASSWORD`, `PLAYWRIGHT_BYPASS`, `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`.

## 4. Comando local

```bash
# Suite completa error-audit (5 specs, 15 tests + 2 setups = 17)
PLAYWRIGHT_BASE_URL="https://pawnecta-landing-mvp-git-<branch>-petmatecls-projects.vercel.app" \
  npx playwright test e2e/specs/error-audit/ --reporter=list

# Un solo spec
npx playwright test e2e/specs/error-audit/c3-admin-hub.spec.ts --reporter=list
```

Tiempo local (contra preview warm): **17 passed en 7.7s**.

## 5. Tiempos en CI

Última corrida verde (PR #4, `45a5901`):
- **`typecheck-and-build`**: 2m30s.
- **`Playwright suite error-audit`**: 2m0s (incluye setup workflow + install Playwright browsers + preview wait + los 17 tests + upload artifacts).

Ambos verdes al primer commit del PR #4 (post-fix del PR #3 que había desbloqueado `npm ci` + tsc errors preexistentes).

## 6. Fixes de infra descubiertos y cerrados en el batch

- **`fix(ci)` `6c98d8e` (PR #3)** — cambió `npm ci` → `npm install --no-audit --no-fund` en `.github/workflows/ci.yml` y `.github/workflows/e2e-error-audit.yml`. Root cause: package-lock cross-platform bug con rollup 4.x optional deps. **Desbloqueó CI en main** que llevaba 5+ commits rojo por lo mismo (invisible porque Vercel usa su propio installer).
- **`fix(e2e)` `547cd84` (PR #3)** — agregó `page.waitForLoadState('networkidle')` en `e2e/setup/authenticate.ts` antes del submit. Root cause: previews cold-start hidratan lento y el fill+click sucede antes de que React vincule el onSubmit del form → submit fires como GET default (creds en query string).
- **`fix(ci) tsc errors` `6c98d8e` bundle** — 2 errors preexistentes que iban a bloquear una vez `npm ci` pasara: `all.spec.ts:403` Set iteration + `gtag.test.ts:61` params unknown property.
- **Deuda anotada en BACKLOG `chore-lock-linux-regen`** (`95e8a14`) — plan para regenerar el lock en Linux via workflow_dispatch dedicado + revertir a `npm ci` estricto. Sprint chico post-launch.

## 7. Convención NUEVA del proyecto — regla de aterrizaje

Acordada con PO 2026-09-08 al cierre del batch, documentada en el skill `.claude/skills/pawnecta-smoke/SKILL.md`:

> **Todo fix Tipo A/B futuro entra con su spec en el mismo PR**. Motivación: evitar el patrón observado en error-audit donde los 5 Tipo A necesitaron sprint dedicado para automatizarse tras el merge del fix (~1 día extra de trabajo). Un fix del backlog Tipo A/B se merge junto con el spec Playwright que valida el fix, no en PRs separados. Excepción: fixes de docs / typos / config sin superficie funcional no requieren spec.

## 8. SHAs de merge

| PR | Título | Merged at | Merge commit |
|---|---|---|---|
| #3 | e2e-error-audit — primer spec c2-c1-roleguard + workflow GH Actions | 2026-09-08T20:26:04Z | `72e0a5c` |
| #4 | e2e-error-audit-2 — 4 specs restantes (c3, c4, c5-perfil, c5-l92) | 2026-09-08T21:50:50Z | `e83e86d` |
| #5 | skill pawnecta-smoke | 2026-09-08T21:50:59Z | `6f1fdbf` |

## 9. Metadata del tag

- **Tag anotado**: `e2e-error-audit-prod-20260908`.
- **Apunta a**: `<SHA a completar tras el tag>` — HEAD de main tras PR #5 mergeado + este acta.
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/e2e-error-audit-prod-20260908`): a completar.
- **Fecha del commit apuntado**: a completar.

Regla del proyecto sobre timestamps de tag — usar `creatordate` del refs/tags, NO `git log --format=%ci` del commit apuntado. Las 2 fechas son distintas por diseño (el tag es la firma del deploy, el commit es cuando el código aterrizó).

---

**Cierre**: batch cerrado, 5/5 casos Tipo A del sprint error-audit tienen suite automatizada. Convención NUEVA "fix + spec en el mismo PR" aterrizada en el skill. Próximo sprint queda en cancha del PO.
