# Playbook — Smoke prod diario + alertas Telegram/email

Written for: el PO (Aldo). Doc operativo del workflow [`smoke-prod-diario.yml`](../../.github/workflows/smoke-prod-diario.yml) aterrizado 2026-11-23 (sprint SMOKE-PROD-DIARIO + ALERTAS TELEGRAM).

---

## Qué cubre el smoke

5 specs Playwright contra producción (`https://www.pawnecta.com`), navegación **100% anónima** (cero sesión, cero mutación). Cubren los 5 flujos críticos del funnel tutor pre-campañas:

| # | Spec | Qué verifica |
|---|------|--------------|
| 1 | [`home.spec.ts`](../../e2e/specs/smoke-prod/home.spec.ts) | Home responde 2xx + H1 visible + al menos un link a /explorar o categoría. |
| 2 | [`explorar.spec.ts`](../../e2e/specs/smoke-prod/explorar.spec.ts) | /explorar renderiza al menos una card de servicio (cold start Supabase OK). |
| 3 | [`ficha-servicio.spec.ts`](../../e2e/specs/smoke-prod/ficha-servicio.spec.ts) | /explorar → click primera card → ficha de servicio carga sin 404 (UUID dinámico, no hardcodeado). |
| 4 | [`contactar-gate.spec.ts`](../../e2e/specs/smoke-prod/contactar-gate.spec.ts) | Ficha → click "Contactar" → LoginRequiredModal aparece (gate funciona para anónimo). |
| 5 | [`register.spec.ts`](../../e2e/specs/smoke-prod/register.spec.ts) | /register?rol=usuario carga con inputs email + password + botón submit visibles. |

**Zero signup real. Zero login. Zero mutation.** El smoke es solo lectura. Cumple la regla de `CLAUDE.md § PROHIBIDO navegar producción con cuentas reales → prod se navega solo con browsing anónimo (sin login) para smokes públicos`.

---

## Schedule

- **Automático**: cron diario `0 5 * * *` UTC = **02:00 CLT invierno / 01:00 CLT verano**.
- **Manual**: workflow_dispatch desde GitHub Actions UI (ver sección "Disparar manual" abajo).

---

## Cómo leer una alerta

### En Telegram (@PawnectaAlertsBot, chat privado con el PO)

```
Smoke prod FALLÓ • 2026-11-24 02:05 UTC

Specs fallidos (2):
home carga con hero visible y categorías listadas | /explorar renderiza cards de servicios

[Ver logs GitHub Actions](https://github.com/petmatecl/petmate-landing-mvp/actions/runs/XXXX)
```

### En email (petmatecl@gmail.com)

Subject: `Smoke prod FALLÓ 2026-11-24`
- Lista HTML de specs fallidos.
- Link al run de GitHub Actions con artifacts (screenshots, videos, trace, log completo).

### Prefijos de severidad

El workflow clasifica el fallo antes de alertar:

- **Sin prefijo** → fallo de spec real. Probablemente regresión de código, cambio de copy que rompió assertion, o nuevo deploy que quebró un flujo. **Acción**: revisar el spec específico + artifact.
- **`[INFRA]`** → fallo con firma de infraestructura (ECONNRESET, SSL handshake, 525/502/503/504, DNS no resuelto) o 5+ specs fallidos (sitio caído). **Acción**: verificar Vercel/Cloudflare/DNS; esperar 10-15 min; si persiste, investigar. Si fue un hiccup puntual, el smoke del día siguiente volverá a pasar.
- **`[TEST]`** → alerta de prueba disparada manualmente con `force_alert: true`. **Acción**: ninguna, solo verifica que las alertas llegan OK.

### Qué hacer cuando llega una alerta

**Tren de decisión de 3 pasos**:

1. **Revisar el run en GitHub Actions** (link en la alerta).
2. **Abrir los artifacts** (`smoke-prod-<run_id>-artifacts`). Contienen:
   - `smoke-prod-results.json` — JSON reporter con todos los specs y sus resultados.
   - `/tmp/smoke-out.log` — log completo del output de Playwright.
   - `test-results/` — screenshots + videos + traces de los specs fallidos.
   - `playwright-report/` — HTML report interactivo (descargar, abrir `index.html` en browser).
3. **Decidir**:
   - **Fallo real** (ej. ficha ya no abre, modal no aparece): triage urgente. Si recibí la alerta a las 02:00 CLT, revisar al despertar. Si es mid-day laboral, fix inmediato. Ads pagados corren → cada hora rota es budget quemado.
   - **[INFRA] puntual** (Vercel hiccup, Cloudflare 525): esperar al smoke del día siguiente. Si 2 días seguidos con [INFRA], investigar.
   - **[TEST]**: ignorar, era prueba de las alertas.

---

## Disparar manual desde GitHub Actions

Útil para:
- Smoke on-demand post-deploy grande.
- Verificar que las alertas llegan tras configurar/rotar secrets.
- Probar cambios en los specs antes de que el cron los recoja.

**Pasos**:

1. Ir a [Actions tab del repo](https://github.com/petmatecl/petmate-landing-mvp/actions).
2. Click en workflow **"smoke-prod-diario"** (columna izquierda).
3. Click en el botón **"Run workflow"** (arriba a la derecha).
4. Seleccionar branch `main` (o la rama que quieras probar, pero típicamente main).
5. (Opcional) Checkear la casilla **"Forzar alerta de prueba"** (`force_alert: true`) para disparar alerta Telegram+email aunque los 5 specs pasen. Útil solo para verificar el canal de alertas.
6. Click **"Run workflow"** verde.

El workflow corre en ~5-8 min (install deps + playwright browsers + 5 specs).

### Verificar primera alerta de prueba

Workflow recién mergeado → nunca ha disparado → hay que verificar que Telegram + email llegan correctamente:

1. **Disparar manual con `force_alert: true`** (pasos arriba).
2. Esperar que el run termine (bloquea el step "Alertar Telegram" + "Alertar email" si los secrets no están OK).
3. Revisar:
   - **Telegram**: mensaje nuevo en el chat privado con @PawnectaAlertsBot. Subject debe decir `[TEST] Smoke prod FALLÓ ...`.
   - **Email**: inbox petmatecl@gmail.com. Subject `[TEST] Smoke prod FALLÓ YYYY-MM-DD`.
4. Si **ambos llegaron**: setup OK.
5. Si **falta alguno**:
   - Revisar step "Alertar Telegram" / "Alertar email" del run — si falló, el log imprime response de la API (Telegram o Resend) con el error específico.
   - Verificar secrets:
     - Settings → Secrets → Actions → `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`.
     - Timestamp "Updated" debe ser reciente si acabas de setear.
     - Zero quotes extra alrededor del valor.

---

## Cómo deshabilitar temporalmente

Escenarios donde silenciar el smoke tiene sentido:
- Deploy grande en curso (esperas 5xx intermitentes temporales).
- Migración de BD anunciada.
- Ventana de mantenimiento programada.
- PO fuera de alcance por viaje / vacación.

### Opción A — Deshabilitar el workflow entero

1. Actions tab → "smoke-prod-diario" → click en los `...` (tres puntos arriba a la derecha).
2. "Disable workflow".
3. Cron deja de disparar hasta que vuelvas a "Enable workflow".

Más fuerte y reversible. Preferido para ventanas > 24h.

### Opción B — Comentar el cron en el YAML

```yaml
# Desactivado temporalmente 2026-XX-XX por <razón>
# schedule:
#   - cron: '0 5 * * *'
workflow_dispatch:
  ...
```

PR + merge. El workflow_dispatch sigue disponible para disparar manual cuando quieras.

Preferido si querés dejar trazabilidad del porqué del silencio en git log.

### Opción C — Rotar el TELEGRAM_BOT_TOKEN a un valor dummy

El workflow intentará llamar a Telegram API, el call fallará, el step tirará error. La alerta no llega pero el run muestra rojo, lo cual contamina la vista de Actions.

**NO recomendado**. Preferir Opción A o B.

---

## Alcance de secrets requeridos

| Secret | Rol | Dónde se setea |
|--------|-----|----------------|
| `TELEGRAM_BOT_TOKEN` | Token del bot @PawnectaAlertsBot. Se obtiene de @BotFather en Telegram. | Settings → Secrets → Actions → New repository secret |
| `TELEGRAM_CHAT_ID` | ID del chat privado entre el PO y el bot. Se obtiene llamando `https://api.telegram.org/bot<TOKEN>/getUpdates` tras enviar un mensaje al bot. | Igual |
| `RESEND_API_KEY` | API key de Resend con permiso `emails:send`. Ya existe en el stack del proyecto (ver `lib/resend.ts`). | Igual |

El workflow asume que los 3 ya están configurados. El PO los seteó previo al deploy del workflow.

---

## Qué NO cubre este smoke (y qué cubrir después)

El smoke es minimal + resiliente. Deliberadamente NO:

- No hace signup real (zero contaminación de prod con cuentas de prueba).
- No crea reservas (zero contaminación de agendamientos).
- No prueba el flow autenticado completo (ingreso + ficha + contacto → eso requiere login contra prod, prohibido por regla).
- No mide performance (Lighthouse es otro sprint — ver A5 del resumen ejecutivo domingo).
- No verifica emails transaccionales delivery (eso requiere un smoke dedicado con Mailtrap sandbox, similar a `smoke-auth-templates`).

Candidatos a sprint futuro (post-primeros 30 días de operación):

1. **Smoke de performance** — cron paralelo que corre Lighthouse contra las 5 páginas clave y alerta si Perf/CLS/LCP se degradan >10% (ver BACKLOG `LIGHTHOUSE-REGRESION-WATCH`).
2. **Smoke de emails transaccionales** — reutilizar el patrón de `smoke-auth-templates.yml` para los 11 templates de `components/Emails/`.
3. **Smoke de rate limit** — golpear `/api/auth/signup` con requests paralelos y verificar que el limiter rechaza (zero spam vía bugs).

---

## Trazabilidad

- **Sprint origen**: SMOKE-PROD-DIARIO (2026-11-23) — pedido explícito del PO como ítem H de la cola post-pre-campañas.
- **PR aterrizaje**: [será completado tras merge].
- **Workflow**: `.github/workflows/smoke-prod-diario.yml`.
- **Config Playwright**: `playwright.config.prod.ts` (separado del canónico — ver comentario inline en el archivo).
- **Specs**: `e2e/specs/smoke-prod/*.spec.ts` (5 archivos).

**Cerrado el ciclo**: silencio diario = producto sano. Alerta = ventana de atención. Zero ruido.
