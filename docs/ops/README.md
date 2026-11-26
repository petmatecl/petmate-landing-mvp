# Pawnecta · Operations notes

Public-safe operational reference. Valores que vinculan PII del PO o secrets viven en Vercel env vars / auto-memory privado del operador — no en este archivo. El repositorio es público: cualquier línea acá queda indexada por GitHub y buscadores.

## Env vars no públicas (del equipo)

Lista mínima para trazar existencia. Cada entrada apunta dónde buscar el valor actual sin exponerlo.

### `AUDIT_INBOX` (Vercel scope Preview)

Destino de emails redirigidos en entornos non-prod (preview + dev) vía la lógica de wrapper en [`lib/resend.ts`](../../lib/resend.ts). Cuando `NEXT_PUBLIC_APP_ENV !== 'production'` el wrapper reemplaza `to` por el valor de este env var y prefija el `subject` con `[STAGING] (orig: <original_to>)`.

- **Valor**: no committear al repo. Pedir al PO.
- **Controlado por**: el PO.
- **Actualización**: Vercel Dashboard → Settings → Environment Variables → Preview scope → `AUDIT_INBOX`. Tras actualizar: push nuevo o Redeploy UI para que deployments existentes levanten el valor nuevo (Vercel snapshot env vars at deployment creation).
- **Read semantics**: `process.env.AUDIT_INBOX` se lee en [`lib/resend.ts:23`](../../lib/resend.ts) al module-load (cold start de la serverless function), no per-request.
- **Fallback hardcoded**: `audit_inbox@mail.tm` — servicio disposable mail público, esperable que no retenga mensajes (TTL corto). Confiar únicamente en el env var seteado.

### `RESEND_API_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · `CRON_SECRET` · `NEXT_PUBLIC_SENTRY_DSN` · `SENTRY_AUTH_TOKEN`

Sensitive de proveedores externos (Resend, Supabase, Vercel cron auth, Sentry). Valores viven en Vercel scope Production (+ Preview cuando aplica). Rotaciones las ejecuta el PO desde Vercel Dashboard. Cambios se documentan en acta del sprint relevante o en el BACKLOG.

## Dónde buscar valores actuales

- **Vercel Dashboard**: `https://vercel.com/petmatecls-projects/pawnecta-landing-mvp/settings/environment-variables`. Requiere auth del equipo.
- **Supabase Dashboard**: proyectos `ouezpeeiwjwawauidrqq` (prod) y `jmtadvdkicyylcwjcmcl` (staging). Keys bajo Settings → API.
- **Auto-memory del operador** (privado, no en el repo): entradas tipo `reference` con pointers y valores que no deben aterrizar público.
