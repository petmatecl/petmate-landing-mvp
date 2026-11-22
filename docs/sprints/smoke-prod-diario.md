# Smoke prod diario — Sprint SMOKE-PROD-DIARIO (2026-11-23)

Written for: el PO (Aldo). Doc del workflow [`smoke-prod-diario.yml`](../../.github/workflows/smoke-prod-diario.yml) aterrizado 2026-11-23.

---

## Qué checkea

6 checks Playwright contra producción (`https://pawnecta.com`), navegación **100% anónima** (cero sesión, cero mutación). READ-only.

| # | Check | Criterio de éxito | Spec |
|---|-------|---------------------|------|
| 1 | Home carga | GET `/`, status < 400, texto "Pawnecta" visible | [`home.spec.ts`](../../e2e/specs/smoke-prod/home.spec.ts) |
| 2 | Explorar carga | GET `/explorar`, status < 400, al menos 1 card de servicio visible | [`explorar.spec.ts`](../../e2e/specs/smoke-prod/explorar.spec.ts) |
| 3 | Ficha proveedor | Toma primer id dinámico desde `/explorar`, GET `/proveedor/[id]`, status < 400, H1 visible, NO dice "no encontrado o inactivo" | [`ficha-proveedor.spec.ts`](../../e2e/specs/smoke-prod/ficha-proveedor.spec.ts) |
| 4 | Login carga | GET `/login`, status < 400, input email visible | [`login.spec.ts`](../../e2e/specs/smoke-prod/login.spec.ts) |
| 5 | Register carga | GET `/register`, status < 400, selector tutor/proveedor visible (Step 1 wizard) | [`register.spec.ts`](../../e2e/specs/smoke-prod/register.spec.ts) |
| 6 | API catálogo | POST a RPC Supabase `buscar_servicios` del proyecto prod (anon key público), status 200, array no vacío | [`api-catalogo.spec.ts`](../../e2e/specs/smoke-prod/api-catalogo.spec.ts) |

**Zero signup real. Zero login. Zero mutation.** Respeta regla `CLAUDE.md § PROHIBIDO navegar producción con cuentas reales → prod se navega solo con browsing anónimo para smokes públicos`. El check 6 usa la anon key que ya es pública (está en el bundle JS del cliente).

---

## Schedule

**Estado actual**: `schedule:` **COMENTADO en el YAML**. Solo `workflow_dispatch` (manual) está activo hasta que el PO dé GO explícito post primer smoke manual del PR.

**Al re-habilitar** (descomentar el bloque `schedule:` en el YAML):
- Cron: `0 12 * * *` UTC → **09:00 CLT invierno / 08:00 CLT verano**.

---

## Cómo probar manualmente

Útil para:
- Smoke on-demand post-deploy grande.
- Verificar alertas tras setear/rotar secrets.
- Probar cambios en los specs antes de que el cron los recoja.

**Pasos**:

1. Ir a [Actions tab del repo](https://github.com/petmatecl/petmate-landing-mvp/actions).
2. Click en workflow **"smoke-prod-diario"** (lista izquierda).
3. Click en **"Run workflow"** (arriba a la derecha).
4. Seleccionar branch `main`.
5. (Opcional) Marcar **"Forzar alerta de prueba"** (`force_alert: true`) para disparar alerta Telegram aunque los 6 checks pasen. Útil solo para verificar el canal.
6. Click **"Run workflow"** verde.

Run tarda ~5-8 min (install deps + Playwright browsers + 6 specs).

### Verificar primera alerta de prueba

Workflow recién mergeado → nunca ha disparado → verificar que Telegram llega:

1. Disparar manual con `force_alert: true`.
2. Esperar a que el run termine.
3. Revisar chat privado con **@PawnectaAlertsBot** — debe aparecer un mensaje tipo:
   ```
   🚨 SMOKE PROD FALLÓ — 1 check(s): [TEST] Alerta de prueba disparada manual — ningún check falló realmente — <link al run>
   ```
4. Si **no llega**:
   - Revisar step "Alertar Telegram si hubo fallos" en el run — el log imprime response de Telegram API con el error.
   - Verificar secrets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` en Settings → Secrets → Actions. Timestamp "Updated" reciente + sin quotes extra.

---

## Dónde están los secrets

| Secret | Rol | Obtención |
|--------|-----|-----------|
| `TELEGRAM_BOT_TOKEN` | Token del bot @PawnectaAlertsBot | @BotFather en Telegram |
| `TELEGRAM_CHAT_ID` | Chat privado del PO con el bot | Llamar `https://api.telegram.org/bot<TOKEN>/getUpdates` tras enviar mensaje al bot, extraer `message.chat.id` |

Ambos ya están configurados en **Settings → Secrets → Actions** del repo según indicación del PO 2026-11-23.

### Sin email por ahora

El PO 2026-11-23 reespecificó: solo Telegram. El workflow NO envía email. Si en el futuro se quiere agregar email, agregar un step nuevo que use `RESEND_API_KEY` (ya está en el stack).

---

## Cómo deshabilitar temporalmente si da ruido

Escenarios:
- Deploy grande en curso (esperas 5xx intermitentes).
- Migración de BD programada.
- PO fuera de alcance por viaje.

### Opción A — Deshabilitar el workflow entero (más fuerte, reversible)

1. Actions tab → workflow "smoke-prod-diario" → click en `...` (tres puntos arriba a la derecha).
2. "Disable workflow".
3. Cron deja de disparar. Volver a "Enable workflow" cuando querás reactivar.

Preferido para ventanas > 24h.

### Opción B — Comentar el cron en el YAML (trazable en git log)

Hoy ya está comentado. Para re-comentarlo tras el GO:

```yaml
on:
  # Desactivado temporalmente 2026-XX-XX por <razón>
  # schedule:
  #   - cron: '0 12 * * *'
  workflow_dispatch:
    ...
```

PR + merge. El `workflow_dispatch` sigue disponible para disparar manual.

---

## Qué NO cubre

- No hace signup real (zero contaminación prod).
- No crea reservas.
- No prueba flow autenticado completo (requiere login, prohibido por regla).
- No mide performance (Lighthouse es sprint separado — ver A5 resumen ejecutivo domingo).
- No verifica delivery de emails transaccionales (ver `smoke-auth-templates.yml` para ese patrón).

---

## Trazabilidad

- **Sprint origen**: SMOKE-PROD-DIARIO (2026-11-23), ítem H de la cola operativa.
- **PR aterrizaje**: [será completado tras merge].
- **Workflow**: `.github/workflows/smoke-prod-diario.yml`.
- **Config Playwright**: `playwright.config.prod.ts` (separado del canónico — ver comentario inline).
- **Specs**: `e2e/specs/smoke-prod/*.spec.ts` (6 archivos).
- **Script**: `npm run test:smoke-prod` para correr local.

**Cerrado el ciclo**: silencio diario = producto sano. Alerta Telegram = ventana de atención. Zero ruido con éxitos.
