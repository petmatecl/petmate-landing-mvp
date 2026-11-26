# Sprint spec — PROVEEDOR-PERFIL-NUDGE (second nudge 14d)

Written for: el PO (Aldo). Deliverable ITEM H del dispatch autónomo 2026-11-26. **Docs-only · NO implementar sin GO PO**.

**Trigger**: PO identificó proveedoras con PERFIL INCOMPLETO sin servicios publicados post-signup (drop del embudo proveedor). Dispatch 2026-11-26 pide investigar query + proponer flow email nudge.

---

## 1. Magnitud del problema (evidencia prod — MCP read-only 2026-11-26)

### Query canónica: proveedores aprobados >7 días sin servicios activos

```sql
WITH prov_sin_servicios AS (
  SELECT p.id, p.nombre, p.apellido_p, p.auth_user_id, p.created_at,
    (SELECT COUNT(*) FROM servicios_publicados sp
      WHERE sp.proveedor_id = p.id AND sp.activo = true) AS n_servicios_activos
  FROM proveedores p
  WHERE p.estado = 'aprobado' AND p.created_at < (NOW() - INTERVAL '7 days')
)
SELECT nombre, apellido_p,
       EXTRACT(DAY FROM (NOW() - created_at))::int AS dias_desde_signup,
       n_servicios_activos
FROM prov_sin_servicios
WHERE n_servicios_activos = 0
ORDER BY dias_desde_signup DESC;
```

**Resultado 2026-11-26 ~18:20 UTC**: **14/25 proveedores aprobados > 7 días sin servicios** (56% completion failure rate). Rango 9–274 días post-signup. Lista:

| Dias desde signup | Candidato nudge |
|---:|---|
| 274 | Admin Pawnecta (cuenta interna, excluir del nudge real) |
| 267 | Lucia Espinoza |
| 266 | Diego Rojas |
| 259 | Fernanda Hamasaki |
| 258 | Laura Marlenet Criado |
| 255 | Francisca Polette Orellana |
| 235 | Isidora Maciel |
| 234 | Ignacia Mellado |
| 151 | Veronica Gonzalez |
| 101 | Nicole Novion |
| 91 | Juan Bou |
| 22 | Jorge Palominos |
| 12 | Constanza Catrifil |
| 9 | Pedro Ruminot |

**Interpretación**: el 56% failure rate es alto, pero hay matices:
- Los 9 más antiguos (>100 días) tienen baja probabilidad de reactivarse con un nudge email — están "congelados" como cuentas abandonadas.
- Los 5 más recientes (9–151 días) son el rango accionable donde un nudge email puede recuperar engagement.
- Admin Pawnecta es cuenta interna del equipo — excluir del nudge real.

### Infra existente consultada

- **Cron `/api/cron/recordatorio-onboarding.ts`** (156 líneas, prod activo):
  - Dispara diario (Vercel Cron en `vercel.json`).
  - Window actual: **48h–7d post-signup** (línea 54: `.lt('created_at', cutoff48h).gt('created_at', cutoff7d)`).
  - Tracking: columna `proveedores.email_onboarding_at` (null = no enviado; timestamp = ya enviado).
  - Sender: `resend.emails.send` con `EMAIL_FROM` env (reutiliza infra Resend Pro Pawnecta).
  - Content: subject "¡Publica tu primer servicio!", CTA al `/proveedor` dashboard.
  - Second trigger ya existe: proveedores sin foto perfil post-48h (línea 100, column `email_photo_reminder_at`).

**Gap identificado**: el cron NO cubre ventana **>7 días**. Los 14 proveedores de la query están fuera del scope actual.

---

## 2. Scope propuesto del sprint

### 2.1 Alcance mínimo (MVP)

- **Nuevo nudge "7d post-onboarding"**: proveedores que YA recibieron el email onboarding (48h-7d) pero siguen con 0 servicios después del día 14 del signup.
- **Rate limit**: 1 nudge máximo. Si no responde en 7 días más (día 21), no insistir. Preserva reputación del sender (Resend bounce/complaint rate) y evita spam al tutor.
- **Target initial**: solo proveedores con signup 7–60 días atrás (ventana accionable). Los >60 días se pueden abordar en un sprint "reactivación cuentas congeladas" aparte.

### 2.2 Alcance extendido (si el MVP valida)

- Segundo nudge 14d (día 21 post-signup) con copy distinto (más empático, "sabemos que la vida se complica").
- A/B test de subject lines para optimizar open rate.
- Admin panel con botón "enviar nudge manual ahora" (deuda existente `ADMIN-PROVEEDORES-RECORDATORIO-MANUAL` en BACKLOG — podría piggy-back).

Este spec cubre solo el MVP § 2.1.

---

## 3. Implementación propuesta

### 3.1 Opción A (piggy-back cron existente) — recomendada

Extender `pages/api/cron/recordatorio-onboarding.ts` con un 3er bloque (después del bloque 1 48h-7d y bloque 2 foto-perfil):

```ts
// 3. Approved providers 7d-60d ago, with onboarding email sent but still 0 services
const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const cutoff60d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

const { data: providersNoServiceStale, error: staleErr } = await supabaseAdmin
  .from('proveedores')
  .select('auth_user_id, nombre, email_onboarding_at, email_perfil_nudge_2_at, created_at')
  .eq('estado', 'aprobado')
  .not('email_onboarding_at', 'is', null)  // Ya recibieron onboarding 48h-7d
  .is('email_perfil_nudge_2_at', null)     // No han recibido nudge 2
  .lt('created_at', cutoff7d)               // Hace >7 días
  .gt('created_at', cutoff60d)              // Pero <60 días (ventana accionable)
  .limit(30);

for (const prov of (providersNoServiceStale || [])) {
  const { count } = await supabaseAdmin
    .from('servicios_publicados')
    .select('id', { count: 'exact', head: true })
    .eq('proveedor_auth_id', prov.auth_user_id)
    .eq('activo', true);
  if ((count || 0) > 0) continue;

  // ... enviar email nudge 2 ...

  await supabaseAdmin
    .from('proveedores')
    .update({ email_perfil_nudge_2_at: new Date().toISOString() })
    .eq('auth_user_id', prov.auth_user_id);

  sent++;
}
```

**Migration SQL requerida**:

```sql
-- migrations/YYYYMMDD_add_email_perfil_nudge_2_at.sql
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS email_perfil_nudge_2_at timestamptz;

COMMENT ON COLUMN public.proveedores.email_perfil_nudge_2_at IS
  'Timestamp del segundo nudge "¿por qué no has publicado?" (día 7+ post-signup). Null = no enviado. Previene duplicados.';
```

Aplicar a staging + prod manualmente (flow habitual migrations).

**Pros opción A**:
- Zero endpoint nuevo. Reutiliza infra Cron Vercel + Resend ya probada.
- Reutiliza el patrón de tracking vía columna timestamp.
- Testing e2e: existe fixture + patrón para reusar.

**Contras opción A**:
- `recordatorio-onboarding.ts` crece. Hoy 156 líneas → ~210 líneas estimadas.
- Mezcla lógica "onboarding" (48h) con "re-engagement" (7d+). Nombres se vuelven ambiguos.

### 3.2 Opción B (nuevo endpoint `/api/cron/recordatorio-perfil-incompleto`)

Endpoint separado `pages/api/cron/recordatorio-perfil-incompleto.ts` con mismo pattern que `recordatorio-onboarding` pero scope específico 7d-60d + servicios=0.

**Pros opción B**:
- Separación de concerns: onboarding vs re-engagement.
- Testeable independiente.

**Contras opción B**:
- Nuevo endpoint = nueva entry en `vercel.json` cron + nuevo smoke test.
- 2x el código duplicado del pattern cron (auth, Resend, tracking).

**Recomendación**: Opción A por simplicidad + reutilización. Sprint chico.

### 3.3 Template email propuesto

Tono: cálido, pet-brand voice, sin presión excesiva. 1-2 párrafos. CTA directo.

**Subject**: `{nombre}, aún tenés cuenta en Pawnecta — ¿seguimos adelante?`

**Pre-header**: `Tu perfil está aprobado pero aún no publicaste tu primer servicio. Te damos una mano.`

**Body**:
```
¡Hola {nombre}!

Pasó ya una semana desde que aprobamos tu perfil en Pawnecta. Sabemos
que a veces la vida se complica y empezar un flow nuevo lleva tiempo.

Si aún querés recibir consultas de tutores en tu comuna, solo te falta
un paso: publicar tu primer servicio. Toma 5 minutos y te va a ayudar
para que tutores cerca tuyo te encuentren.

[Botón: "Publicar mi servicio"] → https://www.pawnecta.com/proveedor

Si decidís no seguir con Pawnecta, es completamente OK — podés dejar
tu cuenta inactiva o escribirnos a contacto@pawnecta.com si querés
eliminar tus datos.

¡Un abrazo pata-pata!
Equipo Pawnecta
```

**Cumple reglas CLAUDE.md**:
- Cero emojis (regla extendida a emails post sprint EMAILS-EMOJI-POLICY 2026-11-23).
- Español tuteo (no voseo — "pasó ya una semana" en vez de "pasó ya una semana" — OK ambiguous, mejor "ya pasó una semana"; "te falta" en vez de "te queda").

**Audit anti-voseo pre-merge**: correr grep contra blacklist CLAUDE.md antes de aterrizar.

### 3.4 Follow-up 14d (deuda extendida, fuera de MVP)

Si el MVP § 2.1 valida (open rate ≥20%, click ≥5%), proponer sprint segundo nudge:
- Column adicional `email_perfil_nudge_3_at` o reutilizar `email_perfil_nudge_2_at` con lógica de ventana.
- Window: 14-60 días post-signup + nudge 2 ya enviado + 0 servicios.
- Copy aún más suave, "no es tarde para empezar".

---

## 4. Checklist operacional del sprint (cuando se ejecute)

1. **GO PO** sobre copy + subject + CTA.
2. **Migration SQL** applied a staging + prod (manual).
3. **Edit** `recordatorio-onboarding.ts` con bloque 3 (Opción A) o nuevo endpoint (Opción B).
4. **Smoke staging**: trigger manual del cron via `curl -X POST <staging-url>/api/cron/recordatorio-onboarding -H "Authorization: Bearer $CRON_SECRET"` → verificar logs + response `{sent: N}` + 1 email en AUDIT_INBOX con el subject esperado.
5. **Audit anti-voseo**: grep blacklist CLAUDE.md sobre el HTML body antes de merge.
6. **PR + CI verde** + GO PO merge.
7. **Deploy prod**: Vercel auto-deploy post-merge main.
8. **Smoke prod**: esperar ciclo diario del cron (22:00 UTC o lo que Vercel tenga schedulado) → verificar logs de Vercel que `{sent: N}` donde N ≥ 1 (hay 14 candidatos).
9. **Monitor 7 días post-deploy**: tracking de open rate + click rate vía Resend dashboard o eventos GA4. Si validation suficiente → MVP cerrado → considerar extensión § 3.4.

**Tiempo total estimado** (sin dedicarse full-time): 1 día desarrollo + 1 día smoke + ventana 7 días monitoreo.

---

## 5. Riesgos y consideraciones

- **Reputation Resend**: 14 emails de bulk en una corrida está lejos del rate limit Resend Pro (50k/mes). Zero riesgo de bounce/complaint spike.
- **Sensibilidad del copy**: 274 días post-signup es prácticamente abandonado — un nudge puede generar unsubscribe reflejo. Scope del MVP SOLO 7-60 días para proteger este riesgo.
- **Exclusión Admin Pawnecta**: la cuenta de admin interna aparece en la query. Filtro adicional: `AND email NOT LIKE '%@pawnecta.com' AND email NOT LIKE 'admin@%'` o similar. Validar con el PO qué emails considera "internos".
- **Compliance GDPR/LPDP**: el email debe tener link "no quiero recibir más" conforme Ley 21.096 Chile. El template debería incluir un pie con `?unsubscribe=<token>` o link a settings de email preferences. **Deuda identificada**: el cron `recordatorio-onboarding` actual NO incluye unsubscribe — es deuda compartida entre todos los crons de email transaccional. Posible sprint colateral `EMAILS-UNSUBSCRIBE-UNIFIED`.
- **Timing de signup**: el proveedor puede haberse registrado y aprobado mismo día, dentro de 48h nunca haber recibido el onboarding email (si el cron falla o si el email_onboarding_at nunca se seteo). Para evitar double-fire del nudge nuevo, la condición `.not('email_onboarding_at', 'is', null)` filtra los que ya recibieron onboarding. Alternativa: `.or(email_onboarding_at is null, created_at < cutoff7d_más)` para capturar ambos casos — decisión PO.

---

## 6. Síntesis + decisión propuesta

**Sprint factible como `perfil-nudge-7d`**, scope 1 día desarrollo + 7 días monitoreo. **Opción A recomendada** (piggy-back sobre cron existente).

**Decisiones del PO antes de GO**:
1. Copy final + subject + CTA (el propuesto en § 3.3 es un draft para iteración).
2. Window 7-60 días vs 7-180 días vs 7-sin-techo (recomiendo 7-60 para preservar reputation sender).
3. Exclusión de cuentas internas (admin@pawnecta.com + similares).
4. Decisión sobre Opción A vs B (recomiendo A).

**Zero implementación aterrizada en este documento** — es spec read-only para habilitar decisión informada del PO.

**Backlog candidate**: `PROVEEDOR-PERFIL-NUDGE-7D` prioridad **ALTA pre-campañas** (gatillo embudo: sin este fix, cada nuevo signup con costo CAC se arriesga a caer al 56% drop rate observado).

---

## 7. Trazabilidad

- Dispatch origen: PO 2026-11-26 ITEM H.
- Cron existente referencia: [`pages/api/cron/recordatorio-onboarding.ts`](../../pages/api/cron/recordatorio-onboarding.ts).
- Tabla `proveedores` columnas relevantes: `created_at`, `estado`, `email_onboarding_at`, `email_photo_reminder_at` (próxima `email_perfil_nudge_2_at` a agregar).
- Query magnitud del problema: ejecutada contra MCP Supabase prod-ro 2026-11-26 ~18:20 UTC. 14 candidatos identificados.
- Deuda relacionada BACKLOG: `ADMIN-PROVEEDORES-RECORDATORIO-MANUAL` (botón manual admin — piggy-back candidato), `EMAILS-UNSUBSCRIBE-UNIFIED` (deuda compartida compliance).
- Reglas CLAUDE.md aplicables: emails sin emojis (post EMAILS-EMOJI-POLICY 2026-11-23), español tuteo (anti-voseo grep pre-merge), cron skipIfNonProd gate ya aplicado en infra existente.
