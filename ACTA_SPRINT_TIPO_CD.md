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
