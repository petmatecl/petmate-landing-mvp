# TUTOR-FUNNEL-PRE-CAMPAÑA fase 2 — opciones para F-TR-10 (doble email) + F-TR-12 (welcome fail silente)

Written for: el PO (Aldo). Ítem #7 cola nocturna autónoma 2026-11-22 noche. **Docs-only**. Zero código implementado — PO elige A/B/C por hallazgo antes de que el auditor implemente.

Audit origen: [`docs/auditorias/signup-tutor-20261122.md`](../auditorias/signup-tutor-20261122.md) § F-TR-10 + F-TR-12. Fase 1 (F-TR-17 + F-TR-13 + F-TR-4) aterrizada en PRs #149 + #150 + #151 esperando GO. F-TR-3 ya es no-op. Fase 2 = los 2 hallazgos restantes.

---

## F-TR-10 — Doble email (Supabase confirmación + Welcome propio)

### Situación actual

`pages/api/auth/signup.ts:57-61` crea el user con `email_confirm: false` → Supabase envía su propio **email de confirmación** con el magic link. Inmediatamente después (línea 194-233), el server dispara `fetch('/api/auth/welcome')` que envía un **segundo email** desde Resend con copy de bienvenida.

El user recibe **2 emails** al inbox en el espacio de ~5 segundos. Confusión potencial:
- "¿Cuál es el que tengo que abrir?"
- "¿El Welcome dice que mi cuenta ya está activa pero el otro dice que tengo que confirmar?"
- Spam folder puede retener uno o ambos.

### 3 opciones

**Opción A — Try/catch surface + mantener el patrón de 2 emails**

Fase 2 = cambios MÍNIMOS:
- Agregar try/catch robusto en `/api/auth/signup` → `/api/auth/welcome` call (ya hay un warn + non-blocking, pero el client en Step 4 del wizard no sabe si el welcome llegó).
- Agregar prop al response del signup: `{ok: true, welcome_sent: true|false}`.
- En `pages/register.tsx` Step 4, si `welcome_sent === false`, agregar línea "Si no ves el email de bienvenida, chequea la carpeta de spam o pide reenvío" (sin blocking).

- **Pros**: fix mínimo, cero refactor de arquitectura. Preserva el flow actual + visibilidad al user cuando welcome falla.
- **Contras**: NO resuelve el "doble email" (sigue siendo 2 emails). Solo mejora handling del fail silente.
- **Esfuerzo**: 1h (agregar prop + handling + copy).

**Opción B — Un solo email (consolidación: welcome en el landing /email-confirmado)**

Fase 2 = refactor estructural:
- Eliminar el call `/api/auth/welcome` desde `/api/auth/signup`. Zero welcome email en el signup.
- Mover el disparo del welcome al landing `/email-confirmado` cuando el user termina de confirmar (useEffect email_confirmado existente).
- User recibe solo 1 email durante signup (el de Supabase con link). Al confirmar, recibe el welcome como "ya te confirmamos, acá tu bienvenida".

- **Pros**: UX más limpio — 1 email por acción. Welcome se dispara cuando el user está más engaged (acaba de confirmar + aterrizó en la landing). Impacto esperado: +3-5% percepción + reduce confusión.
- **Contras**: welcome se dispara CLIENT-side desde la landing → requiere endpoint client-called nuevo (no `verifyInternalSecret`, que es server-to-server). Alternativa: poll desde server detecta `email_confirmed_at` cambió y dispara welcome (más complejo, cron o webhook Supabase).
- **Esfuerzo**: 3-4h (refactor endpoint + handling client + testing dos paths).

**Opción C — Deshabilitar welcome completamente (solo Supabase email)**

Fase 2 = simplificación máxima:
- Eliminar `/api/auth/welcome` + call desde signup.
- User solo recibe el email de Supabase. Zero welcome.
- Pawnecta ahorra 1 email Resend por signup.

- **Pros**: cero confusión (1 email, 1 action). Ahorro Resend quota. Trivial de implementar.
- **Contras**: pierde oportunidad de "touchpoint cálido" que el welcome actual provee (copy de bienvenida personalizado, CTA al dashboard tutor). El email de Supabase es técnico ("confirma tu email con este link").
- **Esfuerzo**: 15-30 min.

### Recomendación técnica

**Opción A (try/catch surface)** como fix **de bajo riesgo** si el PO no quiere refactor profundo. **Opción B (consolidación)** como fix estructural **de mayor impacto UX** si el PO está dispuesto al refactor + tiempo de testing. **NO recomiendo C** — perder el welcome deja un hueco en el touchpoint tutor que las campañas pagadas valorarían.

**Default reco si no eliges**: Opción A (minimal riesgo, impacto marginal pero positivo). Fase 3 futura puede migrar a B si post-campañas los datos muestran confusión real.

---

## F-TR-12 — Welcome fail silente

### Situación actual

`pages/api/auth/signup.ts:232-233`:
```ts
} catch (welcomeErr) {
  console.warn('Welcome email failed (non-blocking):', welcomeErr);
}
```

Si el fetch a `/api/auth/welcome` falla (Resend down, red, auth interno fail), el server **swallow el error silente** y responde al cliente como si todo hubiera ido bien. El user llega a Step 4 "¡Listo!" con copy "Revisa tu email" pero no hay email que revisar.

**Impacto medido en audit**: 5-10% del abandono pre-campañas atribuible a este fail silente (benchmark industria 5-15% signup → zero confirm email).

### 3 opciones

**Opción A — Propagar fail al client + copy accionable**

Igual que F-TR-10 Opción A: agregar `{welcome_sent: true|false}` al response. En Step 4, si welcome falló:
- Copy: "Te enviamos el email pero puede demorar. Si no te llega en 3 min, chequea tu carpeta de spam o toca [Reenviar email]."
- El botón "Reenviar email" (F-TR-13 fase 1 PR #150) resuelve el caso + invita acción explícita.

- **Pros**: cierra el fail silente sin arquitectura nueva. Aprovecha F-TR-13 ya implementado.
- **Contras**: depende de que F-TR-13 sea mergeado primero (está abierto en PR #150). Si F-TR-13 se demora, este fix no tiene base.
- **Esfuerzo**: 30 min (prop + copy + condicional).

**Opción B — Reintentar welcome 2 veces antes de dar up**

Retry con backoff exponencial (1s, 3s) dentro del try/catch del signup. Si tras 2 intentos sigue failing, surface al client igual que A.

- **Pros**: resiliencia frente a fallos transientes de Resend (que son los más comunes). Mejor SLA percibido.
- **Contras**: aumenta tiempo de response del signup (hasta 5s extra en worst case). Si Resend está caído largo, igual falla.
- **Esfuerzo**: 45 min (retry logic + testing).

**Opción C — Capturar explícito en Sentry + alerta ops**

Cambiar el `console.warn` por `Sentry.captureException` con tag `welcome_email_fail`. Alertar al ops (PO) via Sentry issue rule cuando tase > X/día. Mantener el fail silente al user.

- **Pros**: visibility operativa sin tocar el user flow. Permite detectar patrones de fail (Resend outage, config error).
- **Contras**: NO resuelve la fricción del user (siguen sin recibir email + no saben).
- **Esfuerzo**: 15-30 min.

### Recomendación técnica

**Combinar Opción A + Opción C**:
- A para el user (copy visible al ver Step 4 con welcome failed).
- C para ops (captureException + tag → detectar patrón sin depender de users que reporten).

Esta combinación es la que más valor por hora entrega. Esfuerzo total: 45-60 min.

**Default reco si no eliges**: A+C combinado.

---

## Decisiones del PO

### D1 — F-TR-10 doble email
Marcar una:
- [ ] **A** — Try/catch surface, mantener 2 emails (**reco default**, 1h).
- [ ] B — Consolidar a 1 email (welcome en /email-confirmado), 3-4h.
- [ ] C — Deshabilitar welcome completamente, 15-30 min (NO recomendado).
- [ ] Mantener estado actual. Cierra el ítem.

### D2 — F-TR-12 welcome fail silente
Marcar una:
- [ ] **A+C combinado** — Propagar fail al client + Sentry capture (**reco default**, 45-60 min).
- [ ] A solo — propagar fail al client, 30 min.
- [ ] B solo — Reintentar 2 veces, 45 min.
- [ ] C solo — Sentry capture, 15-30 min.
- [ ] Mantener estado actual. Cierra el ítem.

### Timing combinado

Si A (F-TR-10) + A+C (F-TR-12) == **~2h total** sprint de implementación. Puedo arrancar autónomo con GO de ambos defaults. Otras combinaciones ajustan scope.

---

## Trazabilidad

- **Audit origen**: `docs/auditorias/signup-tutor-20261122.md` § F-TR-10 + F-TR-12.
- **Fase 1 (F-TR-17 + F-TR-13 + F-TR-4)**: PRs #149 + #150 + #151, abiertos esperando GO.
- **F-TR-3 del audit**: already no-op (RUT solo para proveedor empresa; verificado).
- **Ítem BACKLOG**: `TUTOR-FUNNEL-PRE-CAMPAÑA` en `## Sprints Pre-Campañas` (PR #145 aún sin merge).
- **Sin merge autónomo**: este PR es docs-only mergeable con CI verde pero NO implementa fix — PO decide con D1/D2 antes del sprint.
