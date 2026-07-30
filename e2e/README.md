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

Dos proyectos de setup independientes, uno por rol. Cada uno autentica una vez y persiste su storageState:

| Setup project     | Env vars                                        | storageState                | Rol         |
| ---               | ---                                             | ---                         | ---         |
| `setup`           | `E2E_STAGING_EMAIL` + `E2E_STAGING_PASSWORD`    | `e2e/.auth/proveedor.json`  | Proveedor + admin (F2-2B: editor de servicios). |
| `setup-tutor`     | `E2E_STAGING_TUTOR_EMAIL` + `E2E_STAGING_TUTOR_PASSWORD` | `e2e/.auth/tutor.json` | Tutor puro — Camila Figueroa Mendoza (F2-3: reserva + cancelación). |

Los projects `chromium`, `chromium-tutor` y `chromium-cron` en `playwright.config.ts` consumen esos storageStates. Los specs se rutean al project correcto por `testMatch`:

- `f2-3` → `chromium-tutor` (tutor).
- `f2-recordatorios-cron` → `chromium-cron` (API-only, depende de ambos setups).
- Resto → `chromium` (proveedor).

## Estructura

```
e2e/
├── .env.test          ← credenciales locales (gitignored)
├── .env.test.example  ← template
├── .auth/             ← storageState generado (gitignored)
├── .report/           ← reporte HTML de última corrida (gitignored)
├── README.md          ← este archivo
├── setup/
│   ├── authenticate.ts        ← helper reusable login + persist storageState
│   ├── auth.setup.ts          ← login proveedor
│   └── auth-tutor.setup.ts    ← login tutor (Camila)
├── fixtures/
│   ├── supabase.ts               ← clientes Supabase por rol (extrae JWT de storageState)
│   ├── servicio-efimero.ts       ← crea/borra servicios F1 (F2-2B)
│   ├── servicio-cuidado-listo.ts ← crea/borra servicios F2 (F2-3)
│   ├── panel-proveedor.ts        ← helpers UI proveedor
│   └── panel-tutor.ts            ← helpers UI tutor
└── specs/
    ├── f2-2b/         ← suite F2-2B (editor de servicios — proveedor)
    └── f2-3/          ← suite F2-3 (reserva + cancelación — tutor)
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

## Qué cubre — Suite F2-3 (tutor)

Ver `e2e/specs/f2-3/`. Los tests crean un servicio de cuidado con F2 activo (`e2e-f2-3-{timestamp}`), abren el picker desde la ficha `/servicio/[id]` como Camila (tutora pura), reservan y/o cancelan, y borran todo en `afterAll`. Nada acoplado a IDs específicos de staging.

| Spec | Cobertura |
|---|---|
| `s1-picker-render.spec.ts` | Modal abre con título "Reservar estadía", hint `Estadía entre M y N noches`, check-in/out, DayPicker visible, submit "Confirmar reserva". |
| `s2-dias-pintados.spec.ts` | Blackout `[X, Y)` pinta `X..Y-1` disabled y deja `Y` LIBRE (semi-abierto — día del check-out no bloquea nueva estadía). |
| `s3-reserva-feliz.spec.ts` | Rango válido → toast "Reserva confirmada" + card en `/mis-solicitudes`. Verificación BD: `estado=confirmada`, `fecha_fin NOT NULL`, `capacidad_snapshot_estadia`, `duracion_min NULL`, `tutor_nombre`. |
| `s4a-race.spec.ts` | Fixture pre-inserta reserva confirmada en el rango. Camila intenta el mismo → dos caminos válidos: (A) cliente detectó disabled → error inline; (B) submit y server rebota `23P01` → toast "Esas noches acaban de ocuparse". |
| `s5-validaciones-min-max.spec.ts` | Fixture `min=3 max=5`. Rango 2 noches → inline "estadía mínima es de 3 noches". Rango 6 → "estadía máxima es de 5 noches". |
| `s6-cancelacion-dentro-ventana.spec.ts` | Reserva a +10 días con `cancelacion_min_horas_antes=48`. Camila cancela desde `/mis-solicitudes` → toast "Cancelación enviada" + BD `estado=cancelada`. |
| `s7-cancelacion-fuera-ventana.spec.ts` | Fixture con `cancelacion_min_horas_antes=999` + reserva a +2 días. Botón "Cancelar reserva" disabled. Endpoint directo → `403 reason=ventana_cerrada`. |
| `s8-bypass-rls-cerrado.spec.ts` | Camila hace `UPDATE agendamientos SET estado='cancelada' WHERE id=<F2-confirmada>` con anon key → 0 filas afectadas. Verifica migration `20260723_agendamientos_cancel_rls_f2.sql`. |
| `s9-regresion-F1.spec.ts` | Reserva F1 (`duracion_min NOT NULL`, `capacidad_snapshot_estadia NULL`). UPDATE client de cancelación sigue OK → 1 fila. Fix RLS F2-3-D no regresionó F1. |

## Qué cubre — Suite Recordatorios Cron (R6)

Ver `e2e/specs/f2-recordatorios-cron/`. Suite **API-only** (sin browser) que golpea `/api/cron/recordatorio-reserva` en staging con `?bypassEnv=1` + `x-cron-secret`. Cada bloque `describe.serial` crea un servicio + N agendamientos con `tutor_nombre = '[TEST-cron-*]'` (matcheable por el check Fase 0 del checklist de merge), corre el endpoint, verifica response + BD, y limpia todo en `afterAll`.

Requiere env var extra: `E2E_STAGING_CRON_SECRET` (Vercel Preview scope). Sin ella, la suite falla temprano con mensaje claro.

**Serialización cross-describe (crítica)**: la suite vive en UN solo file `all.spec.ts` con `test.describe.configure({ mode: 'serial' })` al top-level. Motivo: el endpoint es global — su SELECT trae toda fila elegible del staging (no solo las del test que invocó); si dos bloques corrieran en paralelo, cada uno procesaría las filas del otro y updateraría marcas cross-spec, produciendo flakes. Consolidar + serial mode fuerza single-worker sin tocar la config global. Trade-off aceptable: los otros projects (chromium, chromium-tutor) siguen paralelos con este file.

| Bloque en `all.spec.ts` | Cobertura |
|---|---|
| S1 dryRun elegibles | dryRun devuelve `familia` correcta (F1/F2/legacy) para 3 agendamientos test en "mañana Chile". `fechaSub`/`horaLinea` matchean el shape esperado por familia. |
| S2 corrida real + idempotencia | 1ª corrida: 6 marcas populadas + `sent >= 3` c/u. 2ª corrida: 0 envíos para nuestros ids + marcas anteriores a `preRun2Ms` (no re-escritas por la 2ª). |
| S3 marcas independientes | Agendamiento con marca tutor pre-poblada (ISO 3d viejo) y proveedor NULL. Corrida real: envío solo al proveedor, tutor mark exacta intacta (epoch), proveedor mark ≥ startIso. |
| S4 no elegibles | 4 filas que NO deben salir: confirmada+now+6h, confirmada+now+48h, pendiente+now+24h, rechazada+now+24h. Ninguna en sample; corrida real no toca marcas. |
| S5 auth | Sin secret → 401. `x-cron-secret` erróneo → 401. `Authorization: Bearer` erróneo → 401. Secret válido + dryRun → 200. |

**Emails reales generados por corrida completa de la suite** (a AUDIT_INBOX via wrapper `lib/resend`):
- S2: ~6 (2 destinatarios × 3 familias, 1ª corrida sends, 2ª es no-op).
- S3: ~1 (solo proveedor pendiente).
- S1/S4/S5: 0 (dryRun o 401).
- **Total: ~7 emails/corrida**, todos con subject prefijo `[STAGING] (orig: ...)`. Nota: si otras reservas del staging entran en la ventana "mañana Chile", el endpoint también las procesa — el `sent` reportado puede ser >= 7. Los emails "extra" corresponden a reservas legítimas del staging, no a fixtures del test.

## Qué queda como check manual (requiere SQL — Aldo lo corre aparte)

### F2-3 pendientes (manuales)

**S4b — Race real multi-tab**. Abrir la misma ficha en dos tabs distintos, seleccionar y confirmar en ambos casi simultáneamente. Verificar que uno queda en `estado=confirmada` y el otro ve toast rojo "Esas noches acaban de ocuparse". No simulable con Playwright sin fuego innecesario.

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

## Deudas conscientes (backlog)

Riesgos aceptados a nivel de diseño, no cubiertos por la suite. Se reportan
acá para que no se pierdan en un commit message.

### Advisory lock para reserva de estadías con `capacidad_estadia > 1` (F2-3)

**Estado**: Diferido a F2.5 (mismo criterio que F1 aplicó y también difirió).

**Contexto**: F2-3-A/C hace el INSERT de la reserva client-side (`supabase.from('agendamientos').insert(...)` con la sesión del tutor), respetando RLS. El EXCLUDE constraint `agendamientos_no_solape_estadias` en Postgres protege contra doble-booking sólo cuando `capacidad_snapshot_estadia = 1` (por diseño del schema F2-1, ver `migrations/20260718_agenda_estadia_schema.sql`).

**Gap**: para servicios con `capacidad_estadia > 1` (grupales — hotel canino con jardín, cuidador con espacio para 2-3 mascotas simultáneas), dos tutores que hagan INSERT concurrente pueden pasar ambos aunque el cupo real sea 1. La ventana de race es del orden de decenas de ms entre el fetch de disponibilidad y el INSERT.

**Mitigación actual**:
- El endpoint `/api/servicios/[id]/disponibilidad-noches` logea `console.warn` cuando el servicio tiene `capacidad_estadia > 1`. Esto permite dimensionar el uso real en staging/prod.
- En la práctica, la mayoría de cuidadores usan `capacidad_estadia = 1` (default). Grupales son minoría.

**Cierre completo**: F2.5 va a agregar `POST /api/agendamientos/reservar-noches` server-side con `pg_advisory_xact_lock(hashtext('servicio:' || id))` alrededor del check de cupo + INSERT. Cuando se implemente, la reserva client-side de F2-3-C debe reemplazarse por un fetch al nuevo endpoint. Prioridad: activar cuando aparezca el primer caso real de sobre-booking, no antes (evitar over-engineering).

### F1 grupales sin advisory lock (histórico)

Mismo gap idéntico al de F2 pero en el flujo F1 (paseos, sesiones, etc.). Documentado en el schema F1 al momento de diseñarlo y aún no cerrado. F2.5 podría cerrarlos juntos si el patrón del endpoint es reusable.

## CI (pendiente — post F2-2B smoke)

La suite corre local por ahora. Integración a GitHub Actions queda para después de validar en Fase 2 que los tests son estables (baja flakiness). Cuando se integre, `E2E_STAGING_EMAIL` / `E2E_STAGING_PASSWORD` / `PLAYWRIGHT_BYPASS` van como GitHub Secrets del entorno staging.
