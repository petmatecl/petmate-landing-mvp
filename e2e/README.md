# e2e — smoke tests con Playwright

Suite de e2e para Pawnecta. Apunta **exclusivamente** a staging. Los tests corren en Chromium headless, autentican una vez, y validan flujos críticos del panel proveedor + tutor.

## Cómo correr

```bash
# 1. Copiar template de env vars y llenar valores reales
cp e2e/.env.test.example e2e/.env.test
$EDITOR e2e/.env.test

# 2. Correr toda la suite (headless, reporte HTML en e2e/.report)
npm run test:e2e

# 3. Modo interactivo (Playwright UI — inspector paso-a-paso)
npm run test:e2e:ui

# 4. Ver reporte HTML de la última corrida
npm run test:e2e:report
```

Filtrar por un solo spec: `npx playwright test e2e/specs/f2-2b/s1-editor-visible.spec.ts`.

## Guardas anti-prod

Tres capas de protección — la suite es imposible de correr contra prod por accidente:

1. **`playwright.config.ts`** throwea al arranque si `PLAYWRIGHT_BASE_URL` apunta a `pawnecta.com` / `www.pawnecta.com`, o si el host no contiene `staging`.
2. **`PLAYWRIGHT_BYPASS` requerido** — sin token de bypass de Vercel, la config throwea antes de correr cualquier test. El token solo existe para staging.
3. **`e2e/.env.test` gitignoreado** — credenciales nunca viajan al repo.

## Auth

El project `setup` en `playwright.config.ts` corre primero, autentica con `E2E_STAGING_EMAIL` + `E2E_STAGING_PASSWORD`, y persiste sesión en `e2e/.auth/admin.json`. El resto de tests reusa ese storage state. El usuario staging debe tener roles `admin` + `proveedor` (los tests operan sobre el panel proveedor pero necesitan permisos para crear/borrar servicios efímeros).

## Estructura

```
e2e/
├── .env.test          ← credenciales locales (gitignored)
├── .env.test.example  ← template
├── .auth/             ← storageState generado (gitignored)
├── .report/           ← reporte HTML de última corrida (gitignored)
├── README.md          ← este archivo
├── setup/
│   └── auth.setup.ts  ← login + guardar storageState
└── specs/
    └── f2-2b/         ← suite F2-2B (por venir en Fase 2)
```

## Qué cubre — Suite F2-2B

Ver `e2e/specs/f2-2b/`. Los tests crean un servicio de cuidado efímero (`e2e-f2-2b-{timestamp}`), lo manipulan, y lo borran en `afterAll`. Cero acoplamiento a IDs específicos de staging.

Specs planeados (Fase 2):

| Spec | Cobertura |
|---|---|
| `s1-editor-visible.spec.ts` | Sección "Bloqueos" visible en cuidado + F2 ON. Botón, hint vacío. |
| `s2-preview-noches.spec.ts` | Agregar bloqueo, cambiar fechas, ver preview `(N noches)` reactivo. |
| `s3-round-trip.spec.ts` | Crear 2 bloqueos, guardar, reload, verificar persistencia por UI. |
| `s5-validaciones-blackouts.spec.ts` | Mismo día, duplicado, motivo largo, scroll al primer error. |
| `s6-inline-min-max.spec.ts` | min=10 max=5 → inline error en max + scroll + clear al tipear. |
| `s8-mobile-380.spec.ts` | Viewport 380×800, filas en 1 columna, usable. |
| `s9-legacy-oculto.spec.ts` | Bloque legacy oculto con F2 ON; reaparece con F2 OFF; sin regresión F1. |

## Qué queda como check manual (requiere SQL — Aldo lo corre aparte)

**S4 — diff quirúrgico contra BD**. Verifica que edit/delete/insert de blackouts se refleja como UPDATE/DELETE/INSERT en `excepciones_disponibilidad`. La suite valida round-trip por UI (S3), pero no puede afirmar sobre el shape SQL sin ejecutar queries.

```sql
-- Antes de editar el bloqueo #1
SELECT id, fecha, fecha_fin, motivo
  FROM excepciones_disponibilidad
 WHERE servicio_id = '<id efímero>' AND fecha_fin IS NOT NULL
 ORDER BY fecha;
-- (guardar snapshot)

-- Editar bloqueo #1 en la UI, guardar

-- Después: mismo query. Verificar:
--   * Mismo id en la fila editada (UPDATE, no INSERT+DELETE).
--   * Nuevas fechas populadas correctamente.
--   * Blackout #2 intacto.
```

**S7 — históricos no se tocan**. Verifica que blackouts con `fecha < today` en BD sobreviven a ediciones desde la UI. Requiere INSERT manual de una fila histórica antes del test y SELECT post-edit para comprobar que sigue ahí.

```sql
-- Setup (una vez)
INSERT INTO excepciones_disponibilidad (servicio_id, fecha, fecha_fin, motivo)
VALUES ('<id efímero>', '2026-01-01', '2026-01-05', 'histórico e2e');

-- Correr tests que editen blackouts futuros del mismo servicio

-- Verificar sobrevivencia
SELECT * FROM excepciones_disponibilidad
 WHERE servicio_id = '<id efímero>' AND fecha < CURRENT_DATE;
-- Esperado: 1 fila (el 2026-01-01 → 2026-01-05).
```

## Convenciones

- **Servicios efímeros**: `beforeAll` crea `e2e-{feature}-{timestamp}`, `afterAll` borra. Nombre incluye timestamp para no colisionar entre corridas paralelas.
- **Tests que muten estado compartido**: usar `test.describe.serial()` para forzar orden.
- **Data-testid**: preferido para selectors sobre CSS classes o texto (más resiliente a cambios de copy). Cuando no existan, usar `getByRole` + accessible name.
- **Timeouts**: el default de 60s por test cubre cold starts de Vercel. Assertions individuales tienen 10s.

## CI (pendiente — post F2-2B smoke)

La suite corre local por ahora. Integración a GitHub Actions queda para después de validar en Fase 2 que los tests son estables (baja flakiness). Cuando se integre, `E2E_STAGING_EMAIL` / `E2E_STAGING_PASSWORD` / `PLAYWRIGHT_BYPASS` van como GitHub Secrets del entorno staging.
