# Auditoría del funnel de registro de proveedor — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: mapear el flow completo desde "landing" hasta "primer servicio publicado + agenda activa", identificar los puntos donde los proveedores abandonan, y priorizar mejoras con impacto medible. Sirve de instrumento para la meta "100 proveedores activos".
**Método**: (a) análisis estático del código vigente del flow (`main @ a045af0`); (b) queries read-only contra prod via MCP `supabase-prod-ro` ejecutadas el 2026-11-20 PM; (c) consolidación de hipótesis + recomendaciones priorizadas por impacto/costo.

---

## Estado real prod (snapshot 2026-11-20 PM)

| Paso del funnel | Cantidad | Conversión vs paso anterior |
|---|---:|---:|
| **1. `auth.users` total** (registros intento o completos) | 127 | — |
| **2. `auth.users` con `email_confirmed_at`** (confirmó email) | 102 | **80%** |
| **3. `proveedores` registrados** (eligió rol proveedor) | 26 | **20%** de auth totales (nota: el resto son tutores, no es drop-off puro) |
| **4. `proveedores.estado = 'aprobado'`** (auto-aprobado por badge-f1) | 26 | **100%** |
| **5. Con `servicios_publicados.activo = true`** | 12 | **46%** publicó ≥1 servicio |
| **6. Con agenda F1 (duracion_slot_min) o F2 (capacidad_estadia) activa** | 7 | **58% de los que publican** |
| — | — | — |
| **Composición interna de los 26 proveedores**: | — | — |
| Sin `foto_perfil` | 15 | **58%** |
| Sin `bio` (NULL o vacío) | 8 | **31%** |

---

## Mapa detallado del flow

### Paso 1 — Landing / entrypoint

**Archivos**: [pages/index.tsx](../../pages/index.tsx), [pages/[categoria]/index.tsx](../../pages/%5Bcategoria%5D/index.tsx), landings SEO.

**Comportamiento**: user llega al home o a una landing SEO (`/paseos`, `/cuidado`, etc.). CTA "Ofrece tus servicios" visible en header + home hero.

**Fricciones observables**:
- F-L-1: El CTA "Ofrece tus servicios" compite visualmente con "Busca servicios" (ambos primary). No segmenta por intención.
- F-L-2: No hay página específica `/proveedores` o `/para-proveedores` que explique beneficios + testimonios. El user que quiere "ofrecer servicios" cae directo al wizard sin convencerse.

### Paso 2 — Registro wizard (`/register`)

**Archivo**: [pages/register.tsx](../../pages/register.tsx) (738 líneas).

**Estructura (4 steps)**:
- **Step 1**: elegir rol (tutor / proveedor). Cards grandes, decisión irreversible sin volver atrás.
- **Step 2**: datos personales (email, password, nombre, apellido, RUT, comuna, teléfono). Formulario largo.
- **Step 3** (solo proveedor): "Cuéntanos sobre tu servicio" — categoría, descripción, precio, modalidad, inclusiones.
- **Step 4**: "¡Listo!" — pantalla de confirmación + instrucción de revisar email.

**Fricciones observables**:
- F-R-1: **Step 2 pesado**. RUT opcional pero visible como importante; comuna + teléfono pueden percibirse invasivos antes de conocer el producto.
- F-R-2: **Step 3 exige servicio al registrarse**. El proveedor tiene que decidir categoría + precio + descripción EN EL MISMO FLOW de registro. Puede ser barrera para alguien que recién exploró 2 minutos.
- F-R-3: **Sin opción "registrarme después de ver más"**. User que entra al wizard ya no tiene salida grácil — o sigue o abandona.
- F-R-4: Error handling genérico ([pages/register.tsx L162](../../pages/register.tsx#L162) muestra "Error de conexión. Verifica tu internet e intenta de nuevo" — no distingue email duplicado, password débil, timeout).

### Paso 3 — Confirmación email

**Archivo**: endpoint `/api/auth/welcome` manda email vía Resend. User recibe inbox con link.

**Fricciones observables**:
- F-E-1: **80% de confirmación es amplio pero deja 25 users en limbo** (127 - 102). No sabemos quiénes son — puede ser emails inventados / typeados mal / caídos en spam / olvidados.
- F-E-2: No hay **re-envío automático**. Si el user borra el email, tiene que pedirlo manualmente a soporte.
- F-E-3: No hay **recordatorio al day 1 / 2** para users que no confirmaron.
- F-E-4: La URL del link apunta a `/email-confirmado` ([pages/email-confirmado.tsx](../../pages/email-confirmado.tsx)) con copy "Tu cuenta ya está activa". Copy post-sprint 2026-08-25 correcto, pero el link cuando ya fue consumido muestra "Este enlace ya no sirve" — podría asustar al user.

### Paso 4 — Primer login

**Archivos**: [pages/login.tsx](../../pages/login.tsx), redirige a `/proveedor` según rol.

**Fricciones observables**:
- F-L-1: Errores genéricos: "No se pudo iniciar sesión. Inténtalo de nuevo" ([login.tsx:118](../../pages/login.tsx#L118)) sin distinguir credencial incorrecta vs cuenta no confirmada. Ya documentado en [error-handling-20261119.md #12](error-handling-20261119.md).
- F-L-2: No hay **remember me** explícito — Supabase persiste sesión por default pero no está comunicado.

### Paso 5 — Primer servicio publicado

**Archivo**: [pages/proveedor/index.tsx](../../pages/proveedor/index.tsx) + `components/Proveedor/ServiceFormModal.tsx`.

**Comportamiento**: tras login, user ve dashboard `/proveedor` con estado "Sin servicios publicados" + CTA "Crear tu primer servicio".

**Fricciones observables**:
- F-P-1: **Formulario largo**. ServiceFormModal tiene 70+ `focus:outline-none` (grep CLAUDE.md), ~34 campos entre obligatorios y condicionales según categoría. Pensado para experto más que onboarding.
- F-P-2: **Guard de descripción mínima 100 chars** (sprint 2026-09-09) — correcto en producto, pero puede frenar al que quiere "probar rápido".
- F-P-3: **Subida de fotos del servicio** opcional pero fuertemente sugerida. El 58% de proveedores actuales no subió foto de perfil, signo de fricción con uploads.
- F-P-4: **Sin plantilla pre-llenada por categoría**. Un cuidador que seleccione "cuidado" ve el form en blanco en vez de con ejemplo contextual.

### Paso 6 — Agenda activa (F1/F2)

**Archivo**: ServiceFormModal.tsx sección agenda.

**Comportamiento**: el proveedor activa agenda F1 (slots horarios) o F2 (estadía por noches) desde el modal de edición del servicio.

**Fricciones observables**:
- F-A-1: **42% de los que publican NO activa agenda** (5 de 12). Opción "sin agenda" es default invisible: si no tocás los campos F1/F2, el servicio queda publicado como "contacto directo" sin reserva online.
- F-A-2: **Flow F1/F2 oculto**. Requiere entender diferencia entre "ofrezco servicio por sesión de X horas" (F1) vs "ofrezco estadía por N noches" (F2). No hay tutorial ni comparación visual.
- F-A-3: **Sin aviso post-publicación** que destaque "¿Quieres recibir reservas automáticas? Activa tu agenda".

---

## Queries read-only para medir drop-off en prod

Todas ejecutables en Supabase Studio SQL Editor como PO.

### Q-FR-1 — Funnel resumido últimos 7 días

```sql
SELECT
  (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '7 days') AS intentos_registro_7d,
  (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL AND created_at > NOW() - INTERVAL '7 days') AS confirmados_7d,
  (SELECT COUNT(*) FROM public.proveedores WHERE created_at > NOW() - INTERVAL '7 days') AS proveedores_nuevos_7d,
  (SELECT COUNT(DISTINCT p.id)
     FROM public.proveedores p
     JOIN public.servicios_publicados s ON s.proveedor_id = p.id
    WHERE p.created_at > NOW() - INTERVAL '7 days'
      AND s.activo = true) AS prov_con_servicio_publicado_7d,
  (SELECT COUNT(DISTINCT p.id)
     FROM public.proveedores p
     JOIN public.servicios_publicados s ON s.proveedor_id = p.id
    WHERE p.created_at > NOW() - INTERVAL '7 days'
      AND s.activo = true
      AND (s.duracion_slot_min IS NOT NULL OR s.capacidad_estadia IS NOT NULL)) AS prov_con_agenda_activa_7d;
```

### Q-FR-2 — Users que NO confirmaron email

Para campaña de re-engagement.

```sql
SELECT id, email, created_at, (NOW() - created_at) AS antiguedad
  FROM auth.users
 WHERE email_confirmed_at IS NULL
   AND created_at > NOW() - INTERVAL '30 days'
 ORDER BY created_at DESC;
```

### Q-FR-3 — Proveedores aprobados sin servicio publicado

Target de recordatorio (cubre caso ADMIN-PROVEEDORES-RECORDATORIO-MANUAL ítem 1).

```sql
SELECT p.id, p.nombre, p.apellido_p, p.created_at,
       au.email, au.last_sign_in_at
  FROM public.proveedores p
  JOIN auth.users au ON au.id = p.auth_user_id
 WHERE p.estado = 'aprobado'
   AND NOT EXISTS (
     SELECT 1 FROM public.servicios_publicados s
      WHERE s.proveedor_id = p.id AND s.activo = true
   )
 ORDER BY p.created_at DESC;
```

### Q-FR-4 — Proveedores con servicio pero sin foto_perfil

```sql
SELECT p.id, p.nombre, p.apellido_p, p.created_at, au.last_sign_in_at,
       (SELECT COUNT(*) FROM public.servicios_publicados s WHERE s.proveedor_id = p.id AND s.activo = true) AS servicios_activos
  FROM public.proveedores p
  JOIN auth.users au ON au.id = p.auth_user_id
 WHERE p.estado = 'aprobado'
   AND p.foto_perfil IS NULL
   AND EXISTS (SELECT 1 FROM public.servicios_publicados s WHERE s.proveedor_id = p.id AND s.activo = true)
 ORDER BY p.created_at DESC;
```

### Q-FR-5 — Proveedores con servicio pero sin agenda activa

```sql
SELECT p.id, p.nombre, p.apellido_p, au.last_sign_in_at,
       s.titulo, s.created_at AS servicio_creado
  FROM public.proveedores p
  JOIN auth.users au ON au.id = p.auth_user_id
  JOIN public.servicios_publicados s ON s.proveedor_id = p.id
 WHERE p.estado = 'aprobado'
   AND s.activo = true
   AND s.duracion_slot_min IS NULL
   AND s.capacidad_estadia IS NULL
 ORDER BY s.created_at DESC;
```

### Q-FR-6 — Distribución por paso del funnel (visual rápido)

```sql
WITH f AS (
  SELECT
    COUNT(*) FILTER (WHERE au.email_confirmed_at IS NOT NULL) AS confirmados,
    COUNT(*) FILTER (WHERE au.email_confirmed_at IS NULL) AS no_confirmados,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL) AS son_proveedores,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL AND EXISTS (SELECT 1 FROM public.servicios_publicados s WHERE s.proveedor_id = p.id AND s.activo = true)) AS publican,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL AND EXISTS (SELECT 1 FROM public.servicios_publicados s WHERE s.proveedor_id = p.id AND s.activo = true AND (s.duracion_slot_min IS NOT NULL OR s.capacidad_estadia IS NOT NULL))) AS con_agenda
  FROM auth.users au
  LEFT JOIN public.proveedores p ON p.auth_user_id = au.id
)
SELECT * FROM f;
```

---

## Hallazgos priorizados por impacto

| # | Fricción | Impacto esperado si se arregla | Esfuerzo | Prioridad |
|---|---|---|---|---|
| **H1** | F-P-1 — Formulario primer servicio demasiado largo | +15-25% proveedores publican su 1er servicio | 1-2 días (simplificar wizard a 3 campos mínimos + edición post) | **ALTA pre-campañas** |
| **H2** | F-A-3 — Sin aviso post-publicación sobre activar agenda | +30-50% activan F1/F2 | 2-3h (banner informativo + link al editor de agenda) | **ALTA pre-campañas** |
| **H3** | F-R-2 — Step 3 exige servicio durante registro | Posible +20% registro completo | 3-4h (hacer Step 3 opcional, llevar a "/completar-perfil") | **ALTA pre-campañas** |
| **H4** | F-E-2 + F-E-3 — Sin re-envío + sin recordatorio | +10-15% confirmación email | 2h (cron + endpoint re-send) | MEDIA |
| **H5** | F-P-4 — Sin plantilla pre-llenada por categoría | +10-20% completeness de descripción | 4-5h (templates por categoría + preview) | MEDIA |
| **H6** | F-L-2 — No existe landing `/para-proveedores` dedicada | +10% conversion desde home | 1 día (página + copy + screenshots) | MEDIA |
| **H7** | F-L-1 + F-R-4 — Mensajes de error genéricos | +3-8% recovery de errores | 2h (branching por tipo error) | BAJA — ya en error-handling-20261119.md |
| **H8** | F-A-2 — Flow F1/F2 oculto | +15% activación agenda | 2-3h (tutorial inline + comparación visual) | MEDIA |

---

## Recomendación de mejoras pre-campañas

**Top 3 fixes para alcanzar 100 proveedores activos**:

1. **H2 — Banner post-publicación "Activa tu agenda"** (2-3h) · impacto +30-50% activación F1/F2. Hoy 42% de los que publican NO activa agenda — casi la mitad del drop-off del paso 5→6.
2. **H1 — Simplificar formulario primer servicio** (1-2 días) · impacto +15-25% publicación. Hoy 54% de proveedores registrados NO publica ningún servicio — mitad del funnel dropado en paso 4→5.
3. **H3 — Step 3 opcional en registro** (3-4h) · impacto +20% registro completo. Reduce fricción de la decisión inicial.

**Total esfuerzo top 3**: ~2 días de trabajo. Impacto combinado estimado: pasar del 27% actual (7 con agenda / 26 proveedores) a ~45-55% con agenda. Si se mantiene tasa de registro, la meta de 100 proveedores con agenda activa se alcanza **más rápido** que con las mejoras de marketing solas.

---

## Decisiones pendientes del PO

### D1. Priorizar top 3 fixes pre-campañas

**Pregunta**: ¿autorizás arrancar sprint con los 3 fixes H2+H1+H3 en la próxima ventana calma?

**Recomendación**: sí. H2 primero (más cheap, impacto grande). H3 segundo (medium). H1 tercero (sprint entero, bigger risk).

**Impacto si no se decide**: default = quedan en BACKLOG post-campañas sin fecha.

### D2. Campaña de re-engagement a los 25 no-confirmados

**Pregunta**: ¿autorizás pasar la Q-FR-2 + mandar correo "¿Olvidaste confirmar tu email?" + manualmente verificar casos legítimos?

**Recomendación**: sí. ~1h de trabajo (query + correo manual via Resend) con potencial de recuperar 5-10 proveedores de los 25 users en limbo.

**Impacto si no se decide**: default = no recuperamos esos leads.

### D3. Baseline semanal de funnel

**Pregunta**: ¿agendamos Q-FR-1 + Q-FR-6 como query semanal del PO (viernes PM) para trackear progreso hacia los 100?

**Recomendación**: sí. Instrumenta la meta cuantitativamente. Complementa el ítem TRACKING-META-100-PROVEEDORES del BACKLOG.

**Impacto si no se decide**: default = chequeo ad-hoc del PO cuando acuerde.

### D4. Instrumentación GA4 por step del wizard

**Pregunta**: ¿agregamos `gtag('event', 'register_step', { step: N })` en cada setStep del wizard register.tsx para medir drop-off por step?

**Recomendación**: sí. ~30 min. Cuando lleguen tutores por campaña, va a ser crítico saber qué step los pierde.

**Impacto si no se decide**: default = sólo tenemos conteos agregados (completaron / no completaron), no granularidad por step.

---

## Firma

Esta auditoría es base para la meta "100 proveedores activos". Re-correr las 6 queries semanalmente para ver progreso real.
