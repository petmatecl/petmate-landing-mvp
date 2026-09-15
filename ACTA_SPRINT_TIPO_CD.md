# ACTA — Sprint tipo-cd (2026-09-15)

**Rama**: `tipo-cd` (desde `main d01dfe0`).
**Tag prod objetivo**: `tipo-cd-prod-20260915`.
**Bloque**: B de la cola autónoma B→C→D→conciliación→E (GO en cadena PO 2026-09-15).

## Alcance

Cerrar las 2 categorías restantes del inventario error-audit (BACKLOG L744-758):

- **Tipo C (5 sitios originales + 2 hallazgos adyacentes = 7)**: SSR/SEO/componentes SSR que ignoraban `.error` de queries Supabase.
- **Tipo D (16 sitios)**: server crons + `auth.getSession` + notify server-to-server + admin endpoint.

Política por familia según sprint chore-tipo-b-ssr-audit ya declarada:

- **Tipo C**: destructurar `.error` + log a Sentry con tag `subsystem=ssr`. **Cero cambio del comportamiento del render** — el fallback empty state / propagación catch sigue igual, solo se agrega telemetría para diagnóstico.
- **Tipo D**: destructurar `.error` + log a Sentry con tag `subsystem` por familia (`api-cron` / `api-notify` / `api-admin` / `api-eval` / `api-refer` / `auth-session`). Los crons ya están dentro de `try/catch` — no se toca el flow, solo se agrega la señal cuando `error != null`.

## ⚠️ v2 (segundo commit — pedido PO 2026-09-15 post-review PR #29)

Policy correction: la política de B era de **COMPORTAMIENTO**, no solo telemetría. Segundo commit clasifica los 23 sitios en 2 grupos:

### Grupo A · fallback ya cumplía política, solo faltaba log (9 sitios)

| Sitio | Fallback preexistente que cumple |
|---|---|
| `explorar.tsx:410` | Fallback secundario de "sugerencias comunas" — nice-to-have; sin sugerencias no daña UX principal. |
| `servicio/[id].tsx:128` | Sección "servicios similares" opcional; render omite el bloque si vacío. |
| `proveedores-pendientes.ts:58` | Admin ve `emailAuth=null` para el proveedor específico; los demás enrichs OK. |
| `email-confirmado.tsx:143` | Kill-switch defensivo 4s (sprint email-landing) fuerza fallback afirmativo. |
| `recordatorio-onboarding.ts:60,102` | Loop interno auth: fail-close natural via `if (!authUser?.user?.email) continue`. |
| `recordatorio-mensajes.ts:71,74` | Loop interno auth + provider name (cero impacto — fallback textual). |
| `invitacion-resenas.ts:180` | Loop interno auth: fail-close natural via `if (!authUser?.user?.email) continue`. |

### Grupo B · CORREGIR comportamiento (14 sitios, 2° commit)

**Crons — throw en query principal → catch outer 500 (Vercel marca job failed)**:
- `auto-moderar.ts:83,144,155` — `if (err) throw err` en las 3 queries (servicio/buscador/agend lookup). Antes: `data=null` sin throw → auto-moderación con criterio erróneo (`par_incoherente` o rechazo silente).
- `recordatorio-onboarding.ts:42,91` — `throw` en ambas queries principales (`providersNoService`, `providersNoPhoto`). La 2ª puede ejecutar después de la 1ª → 500 partial protegido por idempotencia (`email_onboarding_at` marcado por row).
- `invitacion-resenas.ts:131` — **fail-close por-ítem** con `continue`. Duplicate check falló → asumir "ya reseñó" → skip envío. Alternativa a 500-total: preserva batch, evita invitación duplicada, log Sentry para diagnóstico si es sistémico.

**API endpoints — fail-close 500**:
- `new-message.ts:74` — `if (authErr) return 500 'auth_lookup_failed'`. Distingue "no tiene email" (skipped correcto) de "auth reventó" (recipient sí tiene pero no lo pudimos leer).
- `generar-codigo.ts:28` — `if (existingError) return 500 'existing_lookup_failed'`. Evita generar código DUPLICADO cuando ya tenía uno.

**SSR — flag degradación + UI apropiada**:
- `[categoria]/[comuna].tsx:226,237` — nueva prop `errorLoading?: boolean` + throw en catch outer → props `errorLoading: true` + `revalidate: 60` (rápida recuperación). UI muestra "No pudimos cargar esta página" + CTA `/explorar` en vez de `services=[]` cached 1h afirmando "sin proveedores en esta comuna".
- `servicio/[id].tsx:109` — nueva prop `globalRatingUnavailable?: boolean` (NO throw — la ficha SÍ debe cargar). Se propaga `ServiceDetailView` → `ProveedorResumenCard`. UI muestra "Evaluaciones —" en vez de "Aún sin evaluaciones" (falso cuando el proveedor SÍ tenía reviews que no leímos).
- `ConversionMetrics.tsx:86,96` — nuevo state `partialError` seteado si alguno de los 2 enriches falla + banner `bg-warning-50` "Datos parciales" con botón Reintentar. Rankings top se muestran incompletos pero el admin sabe que están.

**Client auth**:
- `UserContext.tsx:846 refreshProfile` — early return `setIsLoading(false); return` si `getSession` falla. Antes llamaba `hydrateFromSession(null)` → degradaba silente admin/proveedor a "Usuario" por un blip de red, contradiciendo la intención del refresh.

### Reporte de caso edge (crons en batch, según instrucción PO)

**recordatorio-onboarding.ts** procesa 2 secciones secuenciales (`no_service` + `no_photo`), cada una con SELECT principal + loop de envíos. Decisión aplicada:
- **1ª sección envía N** (marca `email_onboarding_at` fila por fila).
- **2ª sección query principal falla** → `throw` → cae al catch outer → 500 con log. Los N ya enviados quedan protegidos por idempotencia (`email_onboarding_at IS NOT NULL` excluye del próximo run). Vercel marca el job como failed, PO ve la señal.

Alternativa considerada y descartada: 200 con `partial: true` para no gatillar alarma. Motivo del descarte: el criterio operativo del PO ("Vercel marque el job como fallido") pesa más que evitar la alarma; una 2ª sección fallando SÍ amerita diagnóstico.

**Loop interno auth (recordatorio-onboarding L60,L102 + recordatorio-mensajes + invitacion-resenas L180)**: fail-close natural ya presente (`if (!authUser?.user?.email) continue`). Un `auth.admin.getUserById` que reviente cae idénticamente al patrón de "user sin email registrado" — comportamiento correcto para lotes. Solo se agregó log a Sentry en el 1er commit para diagnóstico si el fail es sistémico.

### Test de comportamiento

**Ideal**: mock server-side de queries Supabase para forzar el error real + assertion `status === 500`. **Infra no disponible** — `page.route` de Playwright intercepta el browser context, no las Vercel Functions. Alternativa `?__forceError=1` gate no-prod contamina el bundle productivo.

**Compromiso pragmático (aplicado)**: tests structural sobre el source (grep + assertion regex) que verifican **cada patrón exigido**: `throw` presente en las líneas críticas, `return res.status(500)` en API endpoints, flag prop en interfaces SSR, `setPartialError` + banner en ConversionMetrics, early return en UserContext. 7 tests nuevos en `[tipo-cd-v2]` del spec `estado-actual.spec.ts`. Auditable como cualquier grep; cualquier reintroducción del patrón viejo revienta el test.

Si el PO requiere runtime mocks reales, disponible en 3er commit vía query param `?__forceError=<tabla>` gated a `NEXT_PUBLIC_APP_ENV !== 'production'`.

## Diseño

Nuevo helper `lib/logSupabaseError.ts`:

```ts
export function logSupabaseError(
    context: string,     // slug 'familia:superficie:accion'
    error: SupabaseErrorLike,
    extra?: Record<string, unknown>,
): void {
    if (!error) return;
    Sentry.captureMessage(context, {
        level: 'warning',
        tags: { subsystem: context.split(':')[0], errorCode: error.code || 'unknown' },
        extra: { errorMessage, errorDetails, errorHint, ...extra },
    });
}
```

Reduce boilerplate de ~200 líneas totales a ~25 por sitio. Sentry ya con gate `VERCEL_ENV===production` en `sentry.*.config.ts` — en preview no envía; los tests structural verifican via grep del source.

## Archivos tocados (14)

**Helper + spec + workflow + BACKLOG + acta**:
- [lib/logSupabaseError.ts](lib/logSupabaseError.ts) — nuevo.
- [e2e/specs/tipo-cd/estado-actual.spec.ts](e2e/specs/tipo-cd/estado-actual.spec.ts) — 3 tests structural (grep patrón huérfano + firma helper + import per archivo).
- [.github/workflows/e2e-error-audit.yml](.github/workflows/e2e-error-audit.yml) — e2e-rapido incluye `e2e/specs/tipo-cd/`.
- [BACKLOG.md](BACKLOG.md) — inventario Tipo C/D marcado CERRADO con referencia al SHA y tag.

**Tipo C (7 sitios en 4 archivos)**:
- [pages/explorar.tsx:410](pages/explorar.tsx#L410) — `ssr:explorar:sugerencias_alt_rpc`.
- [pages/[categoria]/[comuna].tsx:226, 237](pages/[categoria]/[comuna].tsx#L226) — `ssr:categoria-comuna:categoria_lookup` + `ssr:categoria-comuna:buscar_servicios`.
- [pages/servicio/[id].tsx:109, 128](pages/servicio/[id].tsx#L109) — `ssr:servicio-id:reviews_global_proveedor` + `ssr:servicio-id:similares_rpc`.
- [components/Admin/ConversionMetrics.tsx:86, 96](components/Admin/ConversionMetrics.tsx#L86) — `ssr:admin-conversion-metrics:servicios_lookup` + `ssr:admin-conversion-metrics:proveedores_lookup`.

**Tipo D (16 sitios en 10 archivos)**:
- [pages/api/evaluaciones/auto-moderar.ts:83, 144, 155](pages/api/evaluaciones/auto-moderar.ts#L83) — `api-eval:auto-moderar:*`.
- [pages/api/notifications/new-message.ts:74](pages/api/notifications/new-message.ts#L74) — `api-notify:new-message:auth_lookup`.
- [pages/api/referidos/generar-codigo.ts:28](pages/api/referidos/generar-codigo.ts#L28) — `api-refer:generar-codigo:lookup_existing`.
- [pages/api/cron/recordatorio-onboarding.ts:42, 60, 91, 102](pages/api/cron/recordatorio-onboarding.ts#L42) — `api-cron:recordatorio-onboarding:*`.
- [pages/api/cron/recordatorio-mensajes.ts:71, 74](pages/api/cron/recordatorio-mensajes.ts#L71) — `api-cron:recordatorio-mensajes:*`.
- [pages/api/cron/invitacion-resenas.ts:131, 180](pages/api/cron/invitacion-resenas.ts#L131) — `api-cron:invitacion-resenas:*`.
- [pages/api/admin/proveedores-pendientes.ts:58](pages/api/admin/proveedores-pendientes.ts#L58) — `api-admin:proveedores-pendientes:auth_lookup`.
- [pages/email-confirmado.tsx:143](pages/email-confirmado.tsx#L143) — `auth-session:email-confirmado:fallback_getSession`.
- [contexts/UserContext.tsx:846](contexts/UserContext.tsx#L846) — inline `Sentry.captureMessage` (consistente con RoleGuard-style, mismo file ya usaba Sentry).

## Verificación

- **Type check** `tsc --noEmit`: exit 0.
- **Build** `npm run build`: exit 0 sin warnings nuevos.
- **Spec structural** `e2e/specs/tipo-cd/estado-actual.spec.ts`: 3 tests que garantizan (a) cero patrón huérfano en los 13 archivos del inventario, (b) helper existe con firma esperada, (c) cada archivo importa el helper (con excepción documentada UserContext).
- **CI e2e-rapido**: incluir `e2e/specs/tipo-cd/` en el glob del workflow.

## Impacto

- **Runtime**: cero. Ningún cambio al comportamiento observable del usuario / cliente / cron.
- **Telemetría**: +23 posibles eventos Sentry por evento de error (hoy silentes). Level `warning`, gate a prod, cero PII en tags (solo `errorCode`).
- **Deuda cerrada**: los 21 items Tipo C+D del inventario error-audit + los 25 items P3 del ítem "Auditoría de callers `.data` sin `.error`" del BACKLOG L1185-1187 (parcialmente — los sitios listados en ese ítem son SSR/crons ya cubiertos, más algunos Tipo B ya cerrados en sprint tipo-b previo).

## Estado post-sprint

Merge autónomo con checks verdes → tag `tipo-cd-prod-20260915`. Siguiente en cola: Bloque C higiene (8 items base + F2-3-FLAKINESS + MIS-RESERVAS-STALL + email-confirmado getSession + def 4 ext overlays + PG-NET + ORPH-EDIT-EXT).
