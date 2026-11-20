# Journey de activación proveedor — post-signup

**Audiencia**: PO.
**Alcance**: correos automáticos que debería recibir un proveedor nuevo desde el signup hasta su primera reserva confirmada, con criterio de corte claro para cada uno. Diseño re-usa plantillas React Email existentes donde se pueda; marca HTML inline a migrar como deuda post-launch.
**Fuente**: auditoría [docs/auditorias/correos-20261119.md](../auditorias/correos-20261119.md) + crons de `vercel.json` + endpoints `pages/api/cron/*`.

---

## Objetivo del journey

Guiar al proveedor nuevo desde la **cuenta recién creada** hasta tener un perfil publicable y, idealmente, su **primera reserva confirmada**, con comunicación clara en los momentos clave. Que nadie quede 48h perdido sin saber qué hacer.

El journey NO busca saturar: cada correo tiene un disparador condicional (no un horario fijo) y un criterio de corte que evita el envío si el proveedor ya avanzó solo.

---

## Journey canónico (4 correos)

### E1 — Welcome al signup

- **Disparador**: `POST /api/auth/welcome` (llamado server-to-server desde `/api/auth/signup`) al terminar el wizard.
- **Destinatario**: proveedor recién registrado.
- **Remitente**: `EMAIL_FROM` → `Pawnecta <hola@pawnecta.com>`.
- **Subject**: con link confirmación: *"Confirma tu correo — Recibimos tu solicitud, {nombre}"* · sin link: *"Recibimos tu solicitud, {nombre}"*.
- **Cuerpo** (template React Email existente `ProviderWelcomeEmail`):
  - Hero "¡Hola, {nombre}! Gracias por sumarte a Pawnecta."
  - Explicación en 2-3 frases del siguiente paso según modo:
    - Si viene con `confirmationUrl`: "Primero confirma tu correo haciendo clic en el botón, y listo — tu cuenta queda activa."
    - Si ya confirmó inline: "Tu cuenta está lista. Ya puedes entrar al panel y publicar tu primer servicio."
  - CTA único: confirmar correo (si aplica) o "Ir a mi panel".
  - Firma: Equipo Pawnecta.
- **Criterio de corte**: envío único al signup. Nunca se repite para el mismo signup (idempotencia garantizada por la ruta — llamada 1 vez por server-to-server `/api/auth/signup`).
- **Estado**: ✅ **En prod** — correo #2 de la auditoría.
- **Deuda**: cero.

### E2 — Publica tu primer servicio

- **Disparador**: cron `/api/cron/recordatorio-onboarding` (schedule `0 14 * * *`). Condiciones: proveedor con `estado='aprobado'` + `email_onboarding_at IS NULL` + `created_at` entre -7d y -48h + `count(servicios_publicados WHERE proveedor_auth_id=X) = 0`.
- **Destinatario**: proveedor sin servicio publicado.
- **Remitente**: `EMAIL_FROM`.
- **Subject**: *"{nombre}, tu perfil está aprobado. ¡Publica tu primer servicio!"*.
- **Cuerpo** (HTML inline hoy, migrar a React Email):
  - Hero verde: "¡Felicidades, {nombre}!"
  - "Tu perfil fue aprobado en Pawnecta. Ahora solo falta un paso para empezar a recibir consultas:"
  - CTA: "Publica tu primer servicio" → `/proveedor`.
  - Firma + valor: "Pawnecta — Conectando mascotas con cuidadores de confianza".
- **Criterio de corte**: `email_onboarding_at` se actualiza al enviar → cron no reprocesa al mismo proveedor. **Idempotencia dura**. También corta automáticamente si el proveedor publicó un servicio antes del disparo (`count > 0` → `continue`).
- **Ventana efectiva**: 48h a 7d desde el signup. Después de 7d el proveedor cae del radar del cron y no recibe E2 nunca más.
- **Estado**: ✅ **En prod** — correo #12 de la auditoría.
- **Deuda cosmética post-launch**: migrar HTML inline a React Email template (consistencia con WelcomeEmail).

### E3 — Agrega foto a tu perfil

- **Disparador**: mismo cron `/api/cron/recordatorio-onboarding` (bloque 2). Condiciones: proveedor con `estado='aprobado'` + `foto_perfil IS NULL` + `email_foto_at IS NULL` + `created_at` entre -7d y -48h. **No importa si publicó servicio o no**: el gap de foto se completa en paralelo.
- **Destinatario**: proveedor sin foto de perfil.
- **Remitente**: `EMAIL_FROM`.
- **Subject**: *"{nombre}, agrega una foto a tu perfil"*.
- **Cuerpo** (HTML inline hoy, migrar a React Email):
  - Hero verde: "Hola, {nombre}".
  - Argumento de valor: "Los perfiles con foto reciben un **70% más de contactos** que los que no tienen."
  - "Sube una foto profesional o una imagen de tu espacio para generar confianza con los dueños de mascotas."
  - CTA: "Completar mi perfil" → `/proveedor`.
- **Criterio de corte**: `email_foto_at` actualizado al enviar → idempotencia. También corta automáticamente si el proveedor subió `foto_perfil` antes del disparo (`is('foto_perfil', null)` ya no matchea).
- **Ventana efectiva**: 48h a 7d desde signup. Mismo cutoff que E2.
- **Estado**: ✅ **En prod** — correo #13 de la auditoría.
- **Deuda cosmética**: idem E2.

### E4 — Follow-up pasadas 2 semanas sin publicar (⚠️ **propuesto, no existe**)

**Problema que resuelve**: hoy el cron de onboarding tiene cutoff de **7 días** (`cutoff7d`). Un proveedor que firma, no confirma hasta +3 días, luego no publica servicio, cae del radar al día 8 y **nunca más recibe recordatorio**. Caso real detectado en auditoría de huérfanos (reporte PO 2026-08-20, 15 "nunca confirmaron" repartidos parejo entre dic-2025 y mar-2026). Un correo adicional al día 14 recapta % no despreciable de proveedores que se olvidaron del signup.

- **Disparador propuesto**: cron **nuevo** `/api/cron/recordatorio-onboarding-14d` (schedule sugerido `0 14 * * *`, mismo horario que el de 48h). Condiciones: proveedor con `estado='aprobado'` + `email_onboarding_14d_at IS NULL` + `created_at` entre -21d y -14d + `count(servicios_publicados) = 0`.
- **Destinatario**: proveedor que no publicó servicio en 2 semanas.
- **Remitente**: `EMAIL_FROM`.
- **Subject** propuesto: *"{nombre}, ¿necesitas ayuda para publicar tu primer servicio?"*.
- **Cuerpo propuesto** (HTML inline, luego migrar a React Email):
  - Hero suave: "Hola, {nombre}".
  - Empatía: "Vemos que creaste tu cuenta en Pawnecta hace un par de semanas pero aún no publicaste tu primer servicio. ¿Necesitas ayuda?"
  - Opciones:
    - "Si tienes dudas con el formulario: responde este correo y te guiamos."
    - "Si tienes el servicio pero falta la foto o la descripción: te dejamos la guía rápida."
  - CTA primario: "Entrar a mi panel" → `/proveedor`.
  - CTA secundario (link, no botón): "Léeme la guía 'Cómo publicar en Pawnecta'" → `/blog/como-publicar-en-pawnecta-guia-proveedores` (entrada publicada hoy 2026-11-19).
  - Firma + oferta de responder el correo para soporte humano.
- **Criterio de corte**:
  - `email_onboarding_14d_at` se actualiza al enviar → cron no reprocesa al mismo proveedor (idempotencia dura).
  - Si publicó servicio antes del disparo (`count > 0`) → `continue`.
  - Si pasa el día 22 sin publicar y sin haber recibido E4 → cae del radar definitivamente (cutoff -21d). **Decisión de diseño**: cero E5 a +30 o +45 días. Más allá del día 21 el proveedor se considera inactivo y entra al silencio (evita spam a cuentas abandonadas; si vuelve a conectarse, puede re-explorar por su cuenta).
- **Estado**: ❌ **No existe**. Sprint propuesto **post-launch** (no bloquea 2026-11-25).
- **Esfuerzo estimado**: ~4h (crear endpoint cron + columna BD `email_onboarding_14d_at` + migration + registro en `vercel.json` + template React Email reusando patrón de E2).

---

## Mapa temporal del journey

```
Signup
  │
  ├─ T0        E1 Welcome                                 [✅ en prod]
  │
  │      (ventana 48h — proveedor usa la plataforma)
  │
  ├─ T0+48h ─ T0+7d
  │     E2 "Publica tu primer servicio"                   [✅ en prod, HTML inline]
  │     (solo si count(servicios) = 0)
  │
  │     E3 "Agrega una foto"                              [✅ en prod, HTML inline]
  │     (solo si foto_perfil IS NULL)
  │
  │
  ├─ T0+14d ─ T0+21d
  │     E4 "¿Necesitas ayuda para publicar?"              [❌ propuesto]
  │     (solo si count(servicios) = 0 y no recibió E4 antes)
  │
  ↓
Silencio pasado T0+21d (proveedor considerado inactivo).
```

A partir de ese punto, cualquier notificación al proveedor es **reactiva a eventos** (reserva recibida, mensaje nuevo, evaluación nueva, recordatorio 24h) — no más empuje de onboarding.

---

## Decisiones de diseño

**Cero duplicación**: E2 y E3 pueden co-ocurrir en la misma ventana si el proveedor aprobado tiene ambos gaps (sin servicio + sin foto). El cron los emite en bloques separados, idempotentes cada uno — el proveedor puede recibir 2 correos ese día si ambas condiciones aplican. Es intencional: cada correo tiene un CTA único y accionable.

**Tono**: tuteo chileno neutro, cero jerga interna ("servicio publicado", "perfil activo"). Cero voseo argentino. Imperativo tuteo en todos los CTAs (`Publica`, `Completa`, `Entra`).

**Honestidad del disparador**: ningún correo del journey se gatilla por calendario puro — todos leen estado real del proveedor y recortan si ya avanzó solo. Nadie recibe "¡Publica tu primer servicio!" habiendo publicado 3 ayer.

**Caminos que NO se envían por diseño** (para quedar explícito):
- Cero correo diario / semanal recurrente ("sigue activo", "esta semana en Pawnecta").
- Cero correo "bienvenida parte 2" que repita Welcome.
- Cero correo de "visitas a tu perfil" / "alguien buscó tu servicio" (deuda post-launch, requiere tracking y análisis de señal útil vs ruido antes de prometerlo).
- Cero correo pedagogico-largo tipo "10 tips para armar tu perfil" — ese contenido vive en el blog (entrada "Cómo publicar en Pawnecta: guía proveedores" publicada 2026-11-19).

---

## Accionables pre-launch (2026-11-25)

**Nada bloquea**. El journey canónico E1+E2+E3 ya está en prod. E4 es sprint post-launch.

**Deuda cosmética (opcional, ~6h total)**:
1. Migrar E2 (HTML inline → React Email). Template nuevo `OnboardingPublicarServicioEmail.tsx`.
2. Migrar E3 (HTML inline → React Email). Template nuevo `OnboardingAgregarFotoEmail.tsx`.
3. Incluir CTA secundario en E2/E3 apuntando al blog "Cómo publicar en Pawnecta" (2026-11-19).

**Sprint E4 post-launch (~4h)**:
1. Migration: `ALTER TABLE proveedores ADD COLUMN email_onboarding_14d_at timestamptz;` (staging + prod según P6).
2. Endpoint `pages/api/cron/recordatorio-onboarding-14d.ts`.
3. Entry en `vercel.json`: `{ "path": "/api/cron/recordatorio-onboarding-14d", "schedule": "0 14 * * *" }`.
4. Template React Email `Onboarding14dAyudaEmail.tsx`.
5. Smoke contra staging con fixture de proveedor creado hace +14d sin servicio.

---

## Métricas sugeridas post-launch

Tracking ligero para validar journey a los 30 días:
- % de proveedores con servicio publicado antes de T0+7d (baseline post-E2).
- % de proveedores con foto_perfil poblada antes de T0+7d (baseline post-E3).
- Tasa de respuesta al correo de soporte humano del E4 propuesto (si/cuando se implemente).
- Total correos emitidos por el journey / proveedor nuevo (meta: ≤3 correos del empuje onboarding en los primeros 21 días; 1 Welcome + máx 2 en ventana 48h-7d).
