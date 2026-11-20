# Auditoría del funnel de contacto del tutor — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: mapear el flow desde "visitante llega al sitio" hasta "contacta a un proveedor por primera vez". Preparación para medir efectividad de campañas (donde el tutor se va a convertir en el principal objetivo de tráfico pagado).
**Método**: (a) análisis estático del flow en el código (`main @ a045af0`); (b) queries read-only contra prod via MCP `supabase-prod-ro`; (c) hallazgos + recomendaciones.

---

## Estado real prod (snapshot 2026-11-20 PM)

| Paso del funnel | Cantidad | Conversión |
|---|---:|---:|
| **1. Visitantes al sitio** (sin tracking server-side, estimar vía GA4 — no accesible en este doc) | — | — |
| **2. Tutores registrados** (`usuarios_buscadores`) | 9 | — |
| **3. Con favoritos** (al menos 1 servicio en favs) | 1 | **11%** |
| **4. Con conversación abierta** (al menos 1 conv iniciada) | 4 | **44%** |
| **5. Contactaron explícitamente (`contactos` tracked)** | 2 | **22%** |
| **6. Reservaron (al menos 1 agendamiento)** | 2 | **22%** |

**Notas sobre los datos**:
- **Discrepancia 4 vs 5**: 4 tutores con conversación abierta, pero solo 2 aparecen en `contactos` tracked. Posible causa: el tracking de `contactos` requiere evento específico (canal=mensaje/whatsapp/llamada/email_copiado), y algunos tutores abrieron conversación sin generar el evento. Alternativa: el tracking `contactos` se agregó después y no cubre convs anteriores.
- **11 reservas / 2 tutores distintos**: los 2 tutores hacen ~5.5 reservas promedio cada uno. Casi seguro Aldo + Camila smokes internos. Sin tráfico real, las reservas no son representativas.
- **Distribución de canales de contacto**: `mensaje: 9`, `whatsapp: 1`, `llamada: 1`. El chat interno es ampliamente el canal preferido.

---

## Mapa detallado del flow

### Paso 1 — Visita al sitio (anónimo, sin auth)

**Archivos**: [pages/index.tsx](../../pages/index.tsx), [pages/explorar.tsx](../../pages/explorar.tsx), [pages/[categoria]/index.tsx](../../pages/%5Bcategoria%5D/index.tsx), [pages/[categoria]/[comuna].tsx](../../pages/%5Bcategoria%5D/%5Bcomuna%5D.tsx).

**Comportamiento**: user llega vía URL directa (landing) o `/explorar` directo. Puede ver catálogo + ficha + perfil proveedor sin login. Puede ver fotos, precios, descripciones. **NO puede**: contactar, reservar, favoritear, dejar reseña.

**Fricciones observables**:
- F-V-1: No hay **CTA claro al explorar** para "cuenta para contactar" hasta que el user intenta la acción. Si intenta "Contactar" → modal `LoginRequiredModal` con copy "Crea una cuenta para contactar". Puede ser demasiado tarde (el user ya decidió explorar y no quiere romper flow).
- F-V-2: **Precio visible pero sin señal de escala**. User ve "Desde $15.000" pero no sabe si es caro/barato comparado a mercado. Sin señales de confianza (reviews, verificación) decidir es difícil.
- F-V-3: **Ausencia de social proof** en cards iniciales. El badge "Identidad verificada" existe pero solo el 15% de proveedores actuales lo tiene; para los demás, la card se ve igual que un servicio sin verificar. Sin reseñas (0 por ahora), tutor no tiene proxy de calidad.

### Paso 2 — Consideración / "shortlist mental"

**Comportamiento**: user explora varios servicios antes de decidir contactar. En el modelo mental típico: 3-5 servicios candidatos.

**Fricciones observables**:
- F-C-1: **Sin favoritos sin login**. El user tiene que registrarse para marcar un servicio favorito. Pierde momentum — podría al menos permitir "guardar en localStorage" como shortlist anónimo (ya hay pattern en WebStorage del proyecto).
- F-C-2: **Sin comparación side-by-side**. Si tutor quiere comparar 2 paseadores, abre dos tabs — no hay vista "compara" nativa. Impacta decisiones racionales (precio × calidad × distancia).
- F-C-3: **Explorar paginado 12 items** ([explorar.tsx](../../pages/explorar.tsx)). Sin infinite scroll. User con >12 opciones tiene que paginar → probable abandono.

### Paso 3 — Intento de contacto (gatillo de registro)

**Comportamiento**: user hace click en "Contactar" / "Reservar" / "WhatsApp" / "Llamar" / favoritear → LoginRequiredModal.

**Archivo clave**: [components/Shared/LoginRequiredModal.tsx](../../components/Shared/LoginRequiredModal.tsx).

**Fricciones observables**:
- F-I-1: **Modal corta el flujo** sin promesa post-registro clara. Copy actual: "Crea una cuenta para contactar". No dice "Tu cuenta te permite guardar favoritos + reservar + chatear" — menos atractivo que el valor real.
- F-I-2: **Registro tutor también es wizard**, aunque más corto que proveedor (sin step 3). Igual pide: email, password, nombre, apellido, RUT (opcional pero visible).
- F-I-3: **RUT innecesario para tutor**. Un tutor que paga por fuera no necesita RUT (fuera de scope — no hay pagos in-platform). Visible como dato pedido crea fricción.
- F-I-4: **Fallback sin "continuar como invitado"**. En flows modernos (Airbnb, UberEats) el user puede navegar y guardar sin login, hasta el checkout. Acá es gate duro.

### Paso 4 — Primer registro tutor

**Archivo**: [pages/register.tsx](../../pages/register.tsx) con `rol='tutor'`.

**Comportamiento**: Step 1 (elegir tutor) + Step 2 (datos) + Step 4 (¡Listo!). Sin step 3 porque ese es proveedor-only.

**Fricciones observables**:
- F-T-1: **Email confirmación obligatoria**. User registra → NO puede contactar hasta que confirma email. Delay de minutos (o el user cierra tab y se olvida).
- F-T-2: **80% confirmación general** (dato del funnel registro) aplica también acá. Posiblemente más bajo para tutores por menor compromiso.

### Paso 5 — Primer contacto post-login

**Comportamiento**: tras confirmar + login, el user vuelve (idealmente) a la ficha donde estaba y completa el contacto.

**Fricciones observables**:
- F-P-1: **Pierde el contexto de qué servicio estaba viendo**. El flow "estaba viendo ficha → me pidió login → confirmé email → volví" rara vez preserva la URL original. User vuelve a `/explorar` o `/home` desde cero.
- F-P-2: **Sin recordatorio de "estabas interesado en X"**. Un email tipo "Hola, cuando confirmaste tu cuenta estabas viendo {servicio X} — aquí está el link directo" es bajo esfuerzo con alto retención.

### Paso 6 — Reserva post-contacto

**Archivo**: [components/Servicio/SolicitarAgendamientoModal.tsx](../../components/Servicio/SolicitarAgendamientoModal.tsx).

**Comportamiento**: user que ya contactó puede reservar F1 (slots) o F2 (estadía) desde el modal del picker.

**Fricciones observables**:
- F-R-1: **Modal de reserva largo**. F1 → fecha + hora + mascota + mensaje. F2 → check-in + check-out + mascota + mensaje. ~5 campos + confirmación.
- F-R-2: **Confirmación por proveedor manual en algunos casos**. Si el servicio tiene agenda con "pendiente" por default (no confirmación automática), el tutor hace la solicitud → queda en pendiente → espera respuesta del proveedor por hours/days. Ansiedad del user = fricción.

---

## Queries read-only para medir drop-off en prod

### Q-FT-1 — Funnel resumido últimos 7 días

```sql
SELECT
  (SELECT COUNT(*) FROM public.usuarios_buscadores WHERE created_at > NOW() - INTERVAL '7 days') AS tutores_nuevos_7d,
  (SELECT COUNT(DISTINCT user_id)
     FROM public.favoritos
    WHERE created_at > NOW() - INTERVAL '7 days') AS tutores_con_fav_7d,
  (SELECT COUNT(DISTINCT c.client_id)
     FROM public.conversations c
    WHERE c.created_at > NOW() - INTERVAL '7 days') AS tutores_con_conv_7d,
  (SELECT COUNT(DISTINCT auth_user_id)
     FROM public.contactos
    WHERE created_at > NOW() - INTERVAL '7 days') AS tutores_contactaron_7d,
  (SELECT COUNT(DISTINCT tutor_id)
     FROM public.agendamientos
    WHERE created_at > NOW() - INTERVAL '7 days') AS tutores_reservaron_7d;
```

### Q-FT-2 — Distribución canales de contacto

Si la campaña dirige a WhatsApp vs chat interno, ver la tendencia:

```sql
SELECT canal,
       COUNT(*) AS n,
       COUNT(DISTINCT auth_user_id) AS tutores_unicos,
       MIN(created_at) AS primer_uso,
       MAX(created_at) AS ultimo_uso
  FROM public.contactos
 WHERE created_at > NOW() - INTERVAL '30 days'
 GROUP BY canal
 ORDER BY n DESC;
```

### Q-FT-3 — Tutores registrados sin actividad post-signup

Target de re-engagement:

```sql
SELECT ub.id, ub.nombre, au.email, ub.created_at,
       (SELECT COUNT(*) FROM public.conversations c WHERE c.client_id = au.id) AS convs,
       (SELECT COUNT(*) FROM public.agendamientos a WHERE a.tutor_id = ub.id) AS reservas
  FROM public.usuarios_buscadores ub
  JOIN auth.users au ON au.id = ub.auth_user_id
 WHERE ub.created_at > NOW() - INTERVAL '30 days'
   AND NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.client_id = au.id)
   AND NOT EXISTS (SELECT 1 FROM public.agendamientos a WHERE a.tutor_id = ub.id)
   AND NOT EXISTS (SELECT 1 FROM public.favoritos f WHERE f.user_id = au.id)
 ORDER BY ub.created_at DESC;
```

### Q-FT-4 — Ratio reservas por conversación (señal de madurez chat)

```sql
SELECT
  COUNT(DISTINCT c.id) AS conversaciones_7d,
  COUNT(DISTINCT a.id) AS reservas_7d,
  ROUND(100.0 * COUNT(DISTINCT a.id) / NULLIF(COUNT(DISTINCT c.id), 0), 1) AS pct_conv_que_reservo
  FROM public.conversations c
  LEFT JOIN public.agendamientos a ON a.servicio_id = c.servicio_id AND a.created_at > c.created_at
 WHERE c.created_at > NOW() - INTERVAL '7 days';
```

### Q-FT-5 — Reservas confirmadas vs pendientes (fricción paso 6)

```sql
SELECT estado, COUNT(*) AS n,
       AVG(EXTRACT(EPOCH FROM (respondido_at - created_at))/3600) AS avg_horas_respuesta
  FROM public.agendamientos
 WHERE created_at > NOW() - INTERVAL '30 days'
 GROUP BY estado
 ORDER BY n DESC;
```

### Q-FT-6 — Baseline semanal cross-funnel (el mismo que tutores + proveedores)

```sql
SELECT
  (SELECT COUNT(*) FROM public.usuarios_buscadores) AS tutores_total,
  (SELECT COUNT(DISTINCT user_id) FROM public.favoritos) AS con_favoritos,
  (SELECT COUNT(DISTINCT c.client_id) FROM public.conversations c) AS con_conv,
  (SELECT COUNT(DISTINCT auth_user_id) FROM public.contactos) AS contactaron,
  (SELECT COUNT(DISTINCT tutor_id) FROM public.agendamientos) AS reservaron,
  (SELECT COUNT(DISTINCT tutor_id) FROM public.agendamientos WHERE estado='confirmada') AS reservaron_y_confirmaron;
```

---

## Hallazgos priorizados por impacto

| # | Fricción | Impacto esperado si se arregla | Esfuerzo | Prioridad |
|---|---|---|---|---|
| **H1** | F-P-1 — Pierde contexto post-confirmación email | **+20-40%** retención post-signup | 3-4h (guardar URL origen en localStorage antes de ir al register, restore post-confirm) | **ALTA pre-campañas** |
| **H2** | F-C-1 — Favoritos requiere login | **+10-20%** engagement | 4-6h (favoritos localStorage sin login + merge al login) | ALTA |
| **H3** | F-I-3 — RUT visible como "importante" para tutor | **+5-10%** registro completo | 1h (hacer RUT invisible en path tutor) | ALTA |
| **H4** | F-R-2 — Fricción espera "pendiente" sin picker | +10-15% reservas finalizadas | Ya documentado en roadmap F1 picker. Este es amplificador de ese fix. | DEPENDE |
| **H5** | F-P-2 — Email recordatorio "estabas viendo X" post-confirmación | +10% vuelta al flujo | 3h (cron diario con users confirmados hace <24h sin actividad) | MEDIA |
| **H6** | F-V-3 — Sin social proof en cards | **+15-25%** click rate a ficha | Depende de reseñas. Ligado al sprint reseñas-verificadas (post-launch). | MEDIA (tras reseñas) |
| **H7** | F-C-2 — Sin vista compara | +5% decisiones racionales | 1-2 días | BAJA |
| **H8** | F-I-4 — Permitir "invitado" en lugar de login hard-gate | **+25-35%** contactos (vía quick-reg en checkout) | 2-3 días (reescribe LoginRequiredModal como "crea cuenta rápida en 30s") | ALTA |

---

## Recomendación de mejoras pre-campañas

**Top 3 fixes para campaign-readiness**:

1. **H1 — Preservar contexto URL post-confirmación email** (3-4h) · impacto +20-40% retención. Hoy el user que empieza en "/paseos/providencia" + registro + confirma email → cae en home sin contexto. Un localStorage con la URL origen + redirect al confirmar resuelve el problema.
2. **H3 — Quitar RUT del path tutor** (1h) · impacto +5-10%. Trivial pero elimina fricción visible en form.
3. **H2 — Favoritos localStorage sin login** (4-6h) · impacto +10-20%. User que puede favoritar sin registrarse construye shortlist mental; al llegar al punto de contacto ya invirtió en la decisión.

**Alternativa pesada para considerar post-H1-H3-H2**:
- **H8 — Permitir "continuar como invitado" en punto de contacto** (2-3 días) · impacto +25-35%. Cambia el modelo de "registro gate" a "registro checkout-style" típico de e-commerce moderno. Riesgo: cambio estructural.

---

## Decisiones pendientes del PO

### D1. Prioridad top 3 fixes pre-campañas

**Pregunta**: ¿autorizás arrancar sprint con H1 + H3 + H2 en ventana calma?

**Recomendación**: sí. H3 es 1h (gratis), H1 es 3-4h (win grande), H2 es 4-6h (win grande).

**Impacto si no se decide**: default = quedan en BACKLOG post-campañas sin fecha.

### D2. H8 (invitado) — sí/no/depende

**Pregunta**: ¿valide gestar cambio estructural "registro en checkout, no gate"? Impacto grande pero riesgo + tiempo.

**Recomendación**: **no pre-campañas**. Validar con data real primero. Si H1+H2+H3 no mueven la aguja, entonces H8 queda como next step.

**Impacto si no se decide**: default = esperar data.

### D3. Preguntas por tracking adicional

**Pregunta**: ¿agregamos events GA4 por:
- Visita de ficha anónima.
- Click en "Contactar" / "Reservar" (pre-login).
- Click en registro desde LoginRequiredModal.
- Confirmación email landing.
- Primer contacto post-login.

**Recomendación**: sí. ~1h de trabajo para 5 custom events. Habilita decisiones data-driven.

**Impacto si no se decide**: default = solo tenemos conteos agregados.

### D4. Email recordatorio "estabas viendo X"

**Pregunta**: ¿autorizás nuevo cron / endpoint que mande email a tutores confirmados hace <24h sin actividad con link al último servicio visto?

**Recomendación**: media prioridad. Depende de implementar tracking de "último servicio visto" (localStorage o server-side). ~3h estrictos + dependencies.

**Impacto si no se decide**: default = ítem BACKLOG sin fecha.

---

## Firma

Esta auditoría es base para instrumentar la efectividad de campañas futuras. Re-correr las 6 queries semanalmente para medir progreso de conversión visitante → contacto.
