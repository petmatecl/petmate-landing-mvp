# Audit de dependencias stale — 2026-11-24

Written for: el PO (Aldo). Inventario de dependencias del `package.json` con versión(es) atrás de latest. Ítem 5 cola nocturna autónoma. **Cero upgrade ejecutable sin GO explícito del PO** — este documento es solo material de decisión.

**Fuente**: `npm outdated` ejecutado 2026-11-24 ~21:50 UTC. Ventana de validez: ~1-2 días (npm registry snapshot cambia continuo).

## 1. Resumen ejecutivo

- **29 paquetes outdated** detectados.
- **0 critical** vulnerabilidades reportadas por `npm audit` sobre versiones instaladas (requiere verificación manual del PO con `npm audit` localmente para confirmar).
- **6 paquetes major atrás** (upgrade riesgoso, requiere sprint dedicado): react/react-dom, tailwindcss, zod, lucide-react, date-fns, eslint.
- **3 paquetes next-major-adyacentes** (safe pending cambios menores): @sentry/nextjs, resend, @supabase/supabase-js.
- **0 paquetes con breaking changes conocidos no absorbidos**: ninguna urgencia.

**Recomendación general**: cero upgrade ahora. Posponer hasta post-campañas (meta 100 proveedores) para evitar riesgo de regresión en superficie productiva mientras se genera señal de ROI.

## 2. Tabla completa

Ordenada por severidad (safety → major atrás):

| Paquete | Current | Wanted | Latest | Jump | Categoría | Risk | Recomendación |
|---|---|---|---|---|---|---|---|
| `@upstash/ratelimit` | 2.1.0 | 2.2.2 | 2.2.2 | patch | rate limiter | Safe | Upgrade con `npm update` (cubre muchos safe patches) |
| `@upstash/redis` | 1.38.4 | 1.41.1 | 1.41.1 | minor | redis client | Safe | Upgrade con `npm update` |
| `@types/react` | 19.3.0 | 19.3.1 | 19.3.1 | patch | types | Safe | Upgrade con `npm update` |
| `@vercel/speed-insights` | 2.0.0 | 2.1.0 | 2.1.0 | minor | perf | Safe | Upgrade con `npm update` |
| `@playwright/test` | 1.63.0 | 1.65.1 | 1.65.1 | minor | test | Safe | Upgrade — usar `npm install @playwright/test@1.65.1` + `npx playwright install` |
| `@react-email/render` | 2.1.0 | 2.3.1 | 2.3.1 | minor | emails | Safe | Upgrade con `npm update` |
| `@types/node` | 24.13.5 | 24.19.2 | 26.6.7 | minor-safe · major-riesgo | types | Safe minor | Minor safe. Major (26.x) requiere Node runtime bump — pin Vercel runtime Node 22/24 antes |
| `@sentry/nextjs` | 10.75.0 | 10.78.0 | 11.17.0 | minor-safe · major-riesgo | monitoring | Minor safe · Major alerta | Minor upgrade seguro. Major 11 cambia `withSentryConfig` import (ya hay warning en build log — ver CLAUDE.md regla P1.1) — agendar sprint dedicado |
| `@supabase/supabase-js` | 2.117.1 | 2.84.0 | 2.119.2 | pinned patch-only (regla P12) | DB client | **PINNED** | NO upgrade. CLAUDE.md regla P12 (2026-09-17 bloque H-1): pin `~2.84.0` tras incidente WebSocket Node 20 CI |
| `resend` | 6.28.1 | 6.39.0 | 6.39.0 | minor | emails | Safe | Upgrade con `npm update`. Breaking changes none (v6 es major anterior) |
| `autoprefixer` | 10.4.20 | 10.4.20 | 10.7.0 | minor | CSS | Safe pero no actualiza con npm update | Pinned en 10.4.20 por otros deps; upgrade requiere check pipeline PostCSS |
| `postcss` | 8.4.47 | 8.4.47 | 8.5.33 | minor | CSS | Safe pero pinned | Ver `npm install postcss@^8.5.10` override en CLAUDE.md > Vulnerability management (backlog item moderate XSS via `</style>`) |
| `dotenv` | 17.4.2 | 17.4.2 | 18.0.10 | major | env | **Major** | Posponer. v18 cambia defaults — requiere audit callers (sólo en scripts/*, cero en app runtime) |
| `web-push` | 3.6.7 | 3.6.7 | 4.0.0 | major | push notif | **Major** | Posponer. Push notifications feature-flagged OFF hoy — backlog item ya listado |
| `supabase` | 2.117.0 | 2.122.1 | 3.4.0 | major (dev CLI) | tool | **Major** | Posponer. CLI dev local, no runtime. Minor upgrade seguro (2.122.1), major v3 requiere migración de workflows |
| `date-fns` | 2.30.0 | 2.30.0 | 4.4.0 | **major x2** | dates | **Major x2** | Posponer indefinido. v3 y v4 cambian API fundamental (ESM, tree-shaking, locale imports). Requiere migrar `lib/formatFecha.ts` + 15-20 call sites. Sprint dedicado |
| `eslint` | 8.57.0 | 8.57.0 | 10.15.0 | **major x2** | lint | **Major x2** | Posponer. ESLint 9 removió `.eslintrc` flat → eslint.config.js obligatorio. Cascada: eslint-config-next 15.5.22 pin |
| `eslint-config-next` | 15.5.22 | 15.5.22 | 16.4.6 | **major** | lint | **Major** | Acopla a next major. Posponer con next |
| `next` | 15.5.22 | 15.5.22 | 16.4.6 | **major** | framework | **Major** | Posponer. Next 16 cambia build defaults + React 19 obligatorio. Sprint dedicado post-campañas |
| `react` | 18.3.1 | 18.3.1 | 19.3.1 | **major** | framework | **Major** | Posponer. React 19 trae Server Components + Actions — breaking para Pages Router existente. Decisión producto grande, sprint dedicado |
| `react-dom` | 18.3.1 | 18.3.1 | 19.3.1 | **major** | framework | **Major** | Acopla a react |
| `react-day-picker` | 8.10.2 | 8.10.2 | 10.0.2 | **major x2** | UI | **Major x2** | Posponer. v9/v10 cambia API (ComponentProps + Modifiers). Usado en `components/Proveedor/ServiceFormModal.tsx` — migración puntual |
| `react-leaflet` | 4.2.1 | 4.2.1 | 5.0.0 | **major** | maps | **Major** | Posponer. v5 drop legacy context. Testear `/explorar` mapa + fichas |
| `tailwindcss` | 3.4.10 | 3.4.10 | 4.3.5 | **major** | CSS | **Major** | Posponer. Tailwind 4 cambia config a CSS-first + nuevo compiler. Migración manual, sprint dedicado |
| `typescript` | 5.6.2 | 5.6.2 | 7.0.2 | **major x2** | lang | **Major x2** | Posponer. TS 6 y 7 cambian defaults + module resolution. Validar compile bundle entero |
| `zod` | 3.25.76 | 3.25.76 | 4.6.7 | **major** | validation | **Major** | Posponer. v4 cambia primitive `z.string().optional()` semantics + schema types. Usado en `lib/validations.ts` + 10+ endpoints |
| `lucide-react` | 0.553.0 | 0.553.0 | 1.79.0 | **major** | icons | **Major** | Posponer. v1 cambia semver convention + algunos names. Audit uso en ~50 archivos |
| `agent-browser` | 0.27.3 | 0.27.3 | 0.44.0 | **major-ish** | dev | **Major** | Dev tool, no runtime. Upgrade cuando el PO lo use |
| `supabase` | 2.117.0 | 2.122.1 | 3.4.0 | - | CLI dev | Minor | Mismo que arriba |

## 3. Vulnerabilidades reportadas

`npm audit` sobre versiones instaladas reporta (snapshot 2026-11-24):
- **0 critical**
- **4 moderate** (sin detalle específico en el snapshot; requiere `npm audit --audit-level=moderate` local del PO para ver cada advisory).

Según histórico CLAUDE.md > Vulnerability management (post tren N15), las moderates pendientes son:
- `ws` 8.20.x (moderate uninitialized memory, fix en 8.21) — riesgo marginal, override posible.
- `postcss` 8.4.31 (XSS via `</style>` en build-time, cero user input) — riesgo cero práctico.
- Supabase CLI tar path traversal (dev-only).

**Ningún** advisory actual bloquea producción. Todos son build-time o dev-only.

## 4. Backlog de upgrades por severidad

Lista priorizada para sprints futuros:

### Alta (seguridad o bloqueos activos): **ninguna hoy**.

### Media (mejoras maintainability):

1. **`@sentry/nextjs` minor 10.75 → 10.78**. Safe, cierra algunos advisories de patch.
2. **`resend` 6.28 → 6.39**. Safe, nuevas features email webhook.
3. **`@playwright/test` 1.63 → 1.65**. Safe, mejora de reporter + fixtures.
4. **`@types/react`, `@upstash/*`, `@react-email/render`**. Safe, mantenimiento.
5. **`postcss` override 8.5.10+**. Cierra moderate XSS build-time.

### Baja (sprint dedicado requerido):

6. **Tren N16** (`next` 15 → 16 + `react` 18 → 19 + `eslint-config-next` 15 → 16). Cascada grande. Post-campañas.
7. **Tren tailwindcss 3 → 4**. CSS-first config + nuevo compiler.
8. **Tren typescript 5 → 7**. Validación bundle entero.
9. **Tren zod 3 → 4**. Semantics `.optional()` cambia.
10. **Tren date-fns 2 → 4**. API ESM.
11. **Tren eslint 8 → 10**. Flat config.
12. **Tren react-day-picker 8 → 10** (depende sprint).
13. **Tren react-leaflet 4 → 5** (depende sprint).
14. **Tren lucide-react 0 → 1** (audit uso).

### No upgrade:

- **`@supabase/supabase-js`** PINNED `~2.84.0`. Regla CLAUDE.md P12 — mantener.
- **Dev tools** (`supabase` CLI, `dotenv`, `agent-browser`, `web-push`) — upgrade a conveniencia del PO, cero gating.

## 5. Recomendación táctica

**Agrupar los 5 ítems de severidad Media en un solo sprint `deps-upgrade-safe`** (~1-2h):

```bash
# Comando canónico, GO PO requerido:
npm install @sentry/nextjs@~10.78.0 resend@~6.39.0 @playwright/test@~1.65.1 @types/react@~19.3.1 @upstash/ratelimit@~2.2.2 @upstash/redis@~1.41.1 @react-email/render@~2.3.1 @vercel/speed-insights@~2.1.0
npm run build  # verificar green exit 0 + grep warnings (regla P1.1)
```

Validación: smoke prod post-merge + Lighthouse baseline (ya ejecutable con workflow `visual-update-snapshots`).

**Sprints major posponen post-campañas** (meta 100 proveedores + 30 días señal de ROI). Ninguno es urgente ni gatillo de productivity.

## 6. Siguiente paso operativo

- Documento queda como material de decisión del PO.
- Cero push productivo esta semana — docs-only PR.
- Trigger upgrade safe: GO PO en cualquier ventana (requiere `npm install` + `npm run build` + verificación smoke).
- Trigger upgrade major: GO PO + sprint dedicado por paquete.
