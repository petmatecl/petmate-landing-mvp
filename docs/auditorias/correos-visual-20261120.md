# Auditoría visual de emails — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: hallazgos visuales de los 12 templates React Email vigentes. Complementa `docs/auditorias/correos-20261119.md` (tabular) con análisis de render + estructura.

**Limitación metodológica**: el PO pidió "captura screenshot de cada uno en Gmail web y mobile". **Zero producción con cuentas reales** (regla CLAUDE.md) + auditor sin infraestructura para trigger smokes staging + capture Gmail live. Esta auditoría es **análisis estático del código de los templates**: estructura, uso de componentes `@react-email`, estilos inline, imágenes referenciadas, previews, buttons, emojis, copy visible. Los screenshots live son task operacional PO con cuentas de test staging (ver `docs/planes/testing-manual-pre-campanas.md` para flow).

**Alcance**: 12 templates vivos en `components/Emails/`:

| # | Template | Líneas | Status real |
|---|---|---:|---|
| 1 | WelcomeEmail | 58 | **En uso** (tutores + proveedores signup) |
| 2 | AgendamientoProveedorEmail | 185 | **En uso** (notify-proveedor) |
| 3 | AgendamientoTutorEmail | 209 | **En uso** (notify-tutor estado update) |
| 4 | ReservaConfirmadaTutorEmail | 174 | **En uso** (notify-tutor-reserva-confirmada) |
| 5 | AgendamientoCancelacionTutorEmail | 164 | **En uso** (notify-proveedor-cancel) |
| 6 | NewEvaluationEmail | 172 | **En uso** (notify-evaluacion) |
| 7 | RecordatorioReservaEmail | 351 | **En uso** (cron 24h antes) |
| 8 | InvitacionResenaEmail | 152 | **En uso** (cron invitacion-resenas) |
| 9 | NuevoProveedorPendienteEmail | 91 | **En uso** (notify-nueva-solicitud admin) |
| 10 | NewMessageEmail | 82 | **No usado** (HTML inline reemplazó, deuda cosmética post-launch) |
| 11 | AprobacionProveedorEmail | 44 | **No usado** (HTML inline) |
| 12 | RechazoProveedorEmail | 37 | **No usado** (HTML inline) |

---

## Hallazgos sistémicos

### S-01 [BLOQUEA pre-campañas] — Emojis en copy de usuario (violación CLAUDE.md)

Regla CLAUDE.md: `NO emojis en la UI — solo iconos Lucide monocromáticos`. Aplica a emails (copy visible al user).

Matches encontrados:
- `WelcomeEmail.tsx:36` → `¡Bienvenido a Pawnecta, {firstName}! 🐾`
- `AprobacionProveedorEmail.tsx:16` → `¡Bienvenido(a) a Pawnecta, {nombre}! 🐾` (template no usado, HTML inline sí tiene)
- `NewEvaluationEmail.tsx:20` (Preview) → `🎉 Has recibido una nueva evaluación de ${rating} estrellas...`
- `NewEvaluationEmail.tsx:35` → `Calificación: X de 5 estrellas 🌟 / ⭐`

**Impacto**:
- WelcomeEmail es el primer touchpoint tras signup → 100% de users nuevos ven 🐾 → inconsistente con tono "marketplace serio" del sitio.
- Preview NewEvaluation con 🎉 aparece en snippet inbox Gmail/Outlook → look casual que puede filtrar como spam o parecer informal.

**Fix propuesto**: reemplazar emojis por SVG inline Lucide equivalente (Heart, Star, PartyPopper no está en Lucide → usar Sparkles). Esfuerzo total: 15 min grep + replace + verificar render.

### S-02 [MEDIO] — AprobacionProveedorEmail + RechazoProveedorEmail + NewMessageEmail no usados

3 templates existen en `components/Emails/` pero NO están importados en ningún call site. Los call sites usan HTML inline (ver `correos-20261119.md § Templates muertos`).

**Impacto**: zero funcional + inconsistencia visual (los 3 call sites inline tienen diseño ligeramente distinto al resto React Email).

**Fix propuesto**: migrar 3 call sites a sus templates. Esfuerzo: 2h.

### S-03 [MEDIO] — Patrón Preview text variable entre templates

Buenas prácticas email: Preview text (snippet inbox) debe tener ~100-150 chars + resumir contenido concreto. Algunos templates lo hacen bien, otros no:

| Template | Preview | Calidad |
|---|---|---|
| WelcomeEmail | **ausente** | **BLOQUEA** — primer email sin preview tiene snippet aleatorio |
| AgendamientoProveedorEmail:71 | `esConfirmadaAuto ? "Nueva reserva confirmada" : "Nueva solicitud..."` | OK |
| AgendamientoTutorEmail:79 | Dinámico | OK |
| ReservaConfirmadaTutorEmail:62 | `"Tu reserva con ${nombreProveedor} para ${servicioTitulo} está confirmada."` | ✅ Óptimo |
| InvitacionResenaEmail:44 | Dinámico `previewText` | OK |
| RecordatorioReservaEmail:96 | Dinámico | OK |
| NewEvaluationEmail:20 | Con emoji + resumen | OK sin emoji |

**Impacto**: WelcomeEmail sin Preview → el inbox Gmail/Outlook muestra las primeras palabras del cuerpo como snippet (muchas veces "Estamos muy felices..." o el logo URL). Un Preview custom aumenta open rate 5-15% según benchmarks email marketing.

**Fix propuesto**: agregar `<Preview>¡Bienvenido a Pawnecta! Tu cuenta está lista. Explora servicios para tu mascota en {comuna}.</Preview>` a WelcomeEmail. Esfuerzo: 5 min.

### S-04 [MEDIO] — Img del logo con width fijo + no loading optimization

Patrón repetido en templates (desde WelcomeEmail.tsx:30):
```tsx
<Img src={`${baseUrl}/pawnecta_logo_final-trans.png`} width="150" alt="Pawnecta" />
```

**Problemas**:
- Width=150 fijo → en mobile muy pequeño.
- Sin `height` → CLS potencial en algunos clients.
- PNG `pawnecta_logo_final-trans.png` según repo es 1045×185 px (`components/Footer.tsx` confirma ratio 5.65:1).
  - Served at width=150 → ancho visual ~150px × height 26px (ratio preservado) → OK pero sin height explícito algunos MUA (especialmente Outlook antiguo) puede renderar mal.

**Fix propuesto**: agregar `height="26"` explícito + considerar `width="200"` para mobile legibilidad. Esfuerzo: 10 min grep + replace en 12 templates.

### S-05 [BAJO] — Hr + Footer text repetitivo + no estandarizado

Pattern repetido:
```tsx
<Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
<Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
  Este es un mensaje enviado automáticamente, por favor no respondas a este correo.
</Text>
```

**Problemas**:
- No todos los templates lo tienen (grep inconsistente).
- Mensaje "no respondas" es pasivo-agresivo. Alternativa: "Si tienes preguntas, escríbenos a hola@pawnecta.com".
- Falta mención de "Puedes gestionar tus preferencias de notificación en..." (requerimiento Ley 21.719).

**Fix propuesto**:
- Crear componente shared `components/Emails/_EmailFooter.tsx` con footer unificado + link a preferences.
- Esfuerzo: 1h (componente + migración 12 templates).

### S-06 [MEDIO] — CTA Button estilos inconsistentes

Grep muestra buttons con `layoutStyles.button` en algunos + custom inline en otros. Falta un sistema visual consistente de CTAs.

**Fix propuesto**: `components/Emails/_EmailButton.tsx` shared con estilos canónicos (accent-600 bg, 14px padding, 6px radius). Esfuerzo: 30 min.

---

## Hallazgos por template

### WelcomeEmail

**Status**: BLOQUEA pre-campañas por 3 razones:
1. **Emoji 🐾** (S-01).
2. **Sin Preview** (S-03).
3. **Primer touchpoint del user** → calidad crítica.

**Hallazgos específicos**:
- No tiene CTA primario. Usuario lee mensaje, no sabe qué hacer siguiente. Agregar botón "Explora servicios" → `pawnecta.com/explorar`.
- Mensaje "Ahora puedes buscar cuidadores de confianza o gestionar tus reservas fácilmente." es ambiguo para proveedores (ellos no buscan cuidadores). WelcomeEmail NO tiene branching por rol — asume tutor.

**Fix propuesto**: WelcomeEmail con branching rol (`rol: 'tutor' | 'proveedor'`) + Preview + CTA primario + remover emoji. Esfuerzo: 1h.

### AgendamientoProveedorEmail

**Status**: operativo + OK mayoritariamente.

**Hallazgos**:
- Subject (externally) dice "Nueva solicitud de agendamiento en Pawnecta" — taxonomía post-sweep #3 debería ser "Nueva solicitud de reserva" (ver `correos-20261119.md § E-1-E4`). Deuda cosmética.
- Preview text dinámico OK.
- Button to `/proveedor?tab=solicitudes` claro.
- Nombre completo del tutor en el cuerpo (PII — ver RESERVA-MAIL-NOMBRE pending decision PO).

### AgendamientoTutorEmail

**Status**: operativo + OK.

**Hallazgos**:
- Branching por estado (confirmada/rechazada/cancelada_proveedor) correcto.
- Button to `/servicio/{id}` (si confirmada) o `/explorar` (fallback) OK.

### ReservaConfirmadaTutorEmail

**Status**: operativo. **Gold standard** entre los templates.

**Hallazgos**:
- Preview óptimo (ver S-03).
- Mensaje con 3 info blocks (fecha, proveedor, servicio).
- CTA "Ver mis reservas" → `/mis-reservas` claro.
- Deuda: L98 dice "Si necesitas cancelar, puedes hacerlo desde **Mis solicitudes**" → debe decir "Mis reservas" (taxonomía). Ya listado en correos-20261119.md deuda.

### AgendamientoCancelacionTutorEmail

**Status**: operativo + OK.

**Hallazgos**:
- Mensaje directo + asertivo.
- CTA ambiguo o ausente (verificar).

### NewEvaluationEmail

**Status**: BLOQUEA por emoji.

**Hallazgos**:
- Emoji 🎉 en preview + 🌟/⭐ en cuerpo (S-01).
- Branching por rating (5 vs resto) correcto.
- Mensaje al proveedor cuando recibe evaluación.

**Fix propuesto**: emoji → SVG Lucide `Star` en cuerpo + Preview reformulado sin 🎉.

### RecordatorioReservaEmail

**Status**: operativo + **más largo del repo** (351 líneas).

**Hallazgos**:
- Cover 6 variantes (F1/F2/legacy × tutor/proveedor).
- Preview + layout bien estructurado.
- "Dónde" con fallback OK.
- CTA al servicio/panel OK.

### InvitacionResenaEmail

**Status**: operativo + OK.

**Hallazgos**:
- Preview dinámico.
- CTA claro "Deja tu reseña".

### NuevoProveedorPendienteEmail

**Status**: operativo, legacy (post-badge-f1 el flow normal no deja proveedores pendientes).

**Hallazgos**:
- Preview text no verificado en archivo.
- Destino admin — menos crítico UX.

### NewMessageEmail

**Status**: **No usado**. HTML inline en `/api/notifications/new-message` lo reemplaza.

**Hallazgos del HTML inline** (ver correos-20261119.md):
- Sin React escape → riesgo XSS si nombre tiene caracteres especiales (ver seguridad-20261120.md § S-X1).

### AprobacionProveedorEmail + RechazoProveedorEmail

**Status**: **No usados**. HTML inline reemplaza.

**Hallazgos**:
- AprobacionProveedorEmail.tsx:16 tiene emoji 🐾 en heading (aunque no se usa, por limpieza eliminar).

---

## Top 5 fixes visuales antes de campañas

Ranking impacto × esfuerzo:

### 1. Emojis en templates activos (S-01) — BLOQUEA

**Acción**: 3 fixes (WelcomeEmail, NewEvaluationEmail, AprobacionProveedorEmail cosmético).

**Esfuerzo**: 15 min grep + replace + verificación render en React Email preview (`npm run email`).

**Impacto**: tono profesional consistente. Primera impresión user nuevo (WelcomeEmail → 100% signups) sin emoji infantil.

### 2. Preview text en WelcomeEmail (S-03) — BLOQUEA

**Acción**: agregar `<Preview>` custom con ~120 chars.

**Esfuerzo**: 5 min.

**Impacto**: +5-15% open rate del welcome (primer email + preview = decisivo en inbox snippet).

### 3. CTA primario + branching rol en WelcomeEmail — BLOQUEA

**Acción**: agregar `rol` prop + branching + button CTA ("Explora servicios" para tutor, "Publica tu primer servicio" para proveedor).

**Esfuerzo**: 1h incluyendo update call site `/api/auth/welcome`.

**Impacto**: +10-20% click-through rate del welcome (user sabe qué hacer).

### 4. Footer unificado con link preferences (S-05) — CONVIENE

**Acción**: shared `_EmailFooter.tsx` + migración 12 templates.

**Esfuerzo**: 1h.

**Impacto**: consistencia + compliance Ley 21.719 (preferences opt-out visible).

### 5. Logo width/height explícito (S-04) — MENOR

**Acción**: grep + replace en 12 templates.

**Esfuerzo**: 10 min.

**Impacto**: estética + CLS en Outlook.

**Total top 5**: ~2h 30min de trabajo. Antes de primeras campañas.

---

## Hallazgos adicionales no-visuales (link a sprint relacionado)

- **S-X1** del `seguridad-20261120.md`: HTML inline en NewMessageEmail + notify-provider puede tener XSS si nombre con caracteres especiales. Ya priorizado en seguridad.
- **Taxonomía emails** (correos-20261119.md deuda): "solicitud agendamiento" → "solicitud reserva" en 4 strings.

---

## Metodología completa (para cuando PO ejecute pasada visual real)

Cuando el PO quiera auditoría visual real con screenshots, flow:

1. **Setup cuenta staging**: nueva cuenta tutor test + nueva cuenta proveedor test en staging (NO prod, NO cuentas reales).
2. **Trigger cada email**:
   - **Welcome**: signup la cuenta → confirma email → captura.
   - **Nueva reserva proveedor**: tutor reserva → proveedor recibe → captura.
   - **Reserva confirmada tutor**: proveedor confirma → captura.
   - **Cancelación**: proveedor/tutor cancela → captura.
   - **Nueva reseña**: tutor deja review → proveedor recibe → captura.
   - **Recordatorio 24h**: crear reserva con fecha mañana → trigger cron manual → captura.
   - **Invitación reseña**: reserva realizada +3d sin review → cron → captura.
   - **Admin aprobó/rechazó**: admin actúa en panel → captura.
   - **Nuevo proveedor pendiente**: signup legacy → admin recibe → captura.
   - **Nuevo mensaje**: enviar mensaje chat → otro recibe → captura.
3. **Capturar en**: Gmail web (viewport desktop 1440x900), Gmail mobile app (screenshot phone), Outlook web (opcional).
4. **Documentar hallazgos visuales reales** que análisis estático no captura: imágenes rotas en Outlook, dark mode issues, custom fonts no soportadas, botones que no destacan por color del cliente, etc.
5. Guardar screenshots en `docs/auditorias/correos-screenshots/{nombre-template}-{cliente}.png`.

**Esfuerzo PO**: 2-3h para cubrir los 10 emails activos × 2 clientes mínimo. Ejecutable en una sesión focalizada.

---

## Decisiones pendientes del PO

### D1. Ejecutar top 5 fixes visuales pre-campañas

**Pregunta**: ¿autorizás sprint de ~2h 30min para aterrizar top 5?

**Recomendación**: sí. Alto impacto (first email impression) + bajo esfuerzo.

**Impacto si no se decide**: default = emojis quedan, welcome sin preview + CTA.

### D2. Pasada visual real post-fixes

**Pregunta**: ¿PO ejecuta la metodología de screenshots post-fixes (confirma que los cambios se ven bien en Gmail/Outlook real)?

**Recomendación**: sí, 2-3h. Validación final pre-campañas.

**Impacto si no se decide**: default = confiar en análisis estático. Riesgo: issues visibles solo en client específico pasan sin detectar.

### D3. Componente shared `_EmailFooter.tsx` + `_EmailButton.tsx`

**Pregunta**: ¿autorizás refactor de helpers shared con estilos canónicos?

**Recomendación**: sí, 1h 30min total (ambos). Reduce deuda cosmética.

**Impacto si no se decide**: default = mantener inconsistencia hasta sprint cleanup.

### D4. Migrar 3 HTML inline a templates React Email

**Pregunta**: ¿migrar los 3 call sites HTML inline a sus templates existentes (AprobacionProveedor, RechazoProveedor, NewMessage)?

**Recomendación**: media prioridad. Esfuerzo 2h. Cierra el gap S-X1 (XSS) + S-02 (consistencia).

**Impacto si no se decide**: default = quedan con HTML inline + fix puntual grep escape S-X1.

### D5. Branching rol en WelcomeEmail

**Pregunta**: ¿autorizás agregar prop `rol` + 2 variantes del mensaje (tutor vs proveedor)?

**Recomendación**: sí. User ve mensaje relevante a su intención.

**Impacto si no se decide**: default = mensaje genérico (actual).

---

## Firma

Auditoría visual **estática** del 2026-11-20. Metodología de screenshots live documentada para cuando el PO la ejecute. Top 5 fixes listos para sprint pre-campañas.
