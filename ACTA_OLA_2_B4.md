# ACTA Ola 2 B4 — Sistema de toasts unificado con paleta Pawnecta

**Rama**: `ola2-b4` (base `main @ b45994d`, 52 chars subdominio ≤63 ✅).
**Fecha**: 2026-08-18.
**Estado**: **PREVIEW LISTO — pendiente GO merge FF + decisión copy toast error**.

---

## 1. Alcance

Sprint chico (~1 hora ejecutado). Cierra el pedido del PO del 2026-08-11 sobre homologar look-and-feel de toasts. Un solo cambio de código en `pages/_app.tsx:48` que enruta las 4 variantes canónicas de sonner (success/info/warning/error) a los tokens semánticos del sistema visual v3 (success/info/warning/danger) — cero color nuevo introducido, solo mapping via `toastOptions.classNames`.

Sub-ítem "Toaster duplicado en `ServiceFormModal.tsx:2578`" ya CERRADO en rama previa `ola2-b3` (mergeada a `main = b45994d`) como bug funcional independiente del preview de estilos.

## 2. Cambio en el código

**Antes** (`pages/_app.tsx:48`):
```tsx
<Toaster position="top-center" richColors />
```

**Después**:
```tsx
<Toaster
  position="top-center"
  toastOptions={{
    classNames: {
      toast:        'group rounded-xl border shadow-md',
      title:        'font-semibold text-sm',
      description:  'text-xs opacity-90 mt-1',
      actionButton: 'font-semibold text-xs px-3 py-1.5 rounded-lg',
      cancelButton: 'text-xs px-3 py-1.5 rounded-lg border',
      closeButton:  'text-slate-400 hover:text-slate-600',
      success: 'bg-success-50 border-success-100 text-success-900',
      info:    'bg-info-50 border-info-100 text-info-900',
      warning: 'bg-warning-50 border-warning-100 text-warning-900',
      error:   'bg-danger-50 border-danger-100 text-danger-900',
    },
  }}
/>
```

Los ~154 call sites de `toast()`, `toast.success()`, `toast.error()`, etc. distribuidos en la app siguen funcionando sin cambio. Sonner enruta cada uno a su variante correspondiente que ahora tiene classNames Pawnecta.

## 3. Verificación WCAG AA — ratios de contraste (modo claro)

Cálculo con fórmula oficial WCAG 2.1 (`L = 0.2126*R + 0.7152*G + 0.0722*B` con canales gamma-corregidos):

| Variante | Text/BG | Border/Ground blanco | BG/Ground blanco |
|---|---:|---:|---:|
| success `-50 / -100 / -900` | **8.70:1** ✓ AAA | 1.10:1 | 1.05:1 |
| info    `-50 / -100 / -900` | **8.87:1** ✓ AAA | 1.15:1 | 1.07:1 |
| warning `-50 / -100 / -900` | **8.75:1** ✓ AAA | 1.11:1 | 1.04:1 |
| danger  `-50 / -100 / -900` | **9.16:1** ✓ AAA | 1.22:1 | 1.09:1 |

**Texto vs BG**: **los 4 pasan AA (≥4.5:1) con holgura enorme — todos ≥8.7:1, incluso pasan AAA (≥7:1) sin ajuste.**

**Border/Ground <3:1**: los tokens `-100` son claros por diseño; ni siquiera subir a `-200` (1.21-1.45:1) o `-300` (1.40-1.90:1) llega al umbral 1.4.11 (Non-text Contrast). La única forma de cumplir 3:1 estricto sería usar `-500`/`-600` como border, lo que pintaría un borde intenso que compite visualmente con el ícono. Trade-off descartado.

**Cómo el toast SÍ es distinguible del ground pese al border bajo** (WCAG 1.4.11 permite alternativas cuando el color no es el único identificador visual):
- **Shadow** (`shadow-md` = box-shadow 0 6px 20px -8px rgba(15,23,42,0.18)) — separa el toast del ground.
- **Título en `text-<sem>-900`** — texto oscuro sobre `-50` claro cumple 4.5:1 vs ground blanco directamente (los `-900` son casi negro tinted).
- **Ícono Lucide monocromático** también en color `-900` — refuerza identificación.
- **BG tinted** (aunque el ratio BG/ground blanco es 1.04-1.09, el ojo humano detecta el tint suave que informa la variante — es refuerzo, no identificador único).

Combinación de los 3 canales anteriores hace que el toast sea inequívocamente distinguible del ground. El border al `-100` funciona como delimitador sutil, no como identificador crítico. Decisión de diseño consciente, no accidente.

## 4. Copy del toast de error — decisión operativa pendiente

El preview HTML del artifact incluía un toast de ejemplo:

> "No pudimos guardar tu servicio — Verifica tu conexión y vuelve a intentar. Si persiste, escríbenos a contacto@pawnecta.com."

**Ese copy es ilustrativo, no existe hoy en el código real** — verificado con `grep -rE "toast\.(error|warning)\(.*contacto@" pages/ components/` = 0 matches. Los únicos 2 toasts que mencionan email son admin-facing (`ProveedorApprovalList.tsx:87,129` — Aldo mismo es el destinatario), no user-facing.

Consecuencia: la revisión de copy es **preventiva** (para cuando aterricemos un toast de error genérico en el futuro), no un fix a algo que hoy engañe al usuario.

**Problema real** (planteado por el PO): Aldo va a estar un mes en China con conectividad limitada. Un copy que dice "escríbenos a contacto@pawnecta.com" crea expectativa de respuesta rápida que no se puede cumplir.

**Propuesta — usar `FeedbackWidget` como canal asíncrono default**:

`components/Shared/FeedbackWidget.tsx` está montado globalmente en `pages/_app.tsx:67` (botón flotante bottom-right, siempre visible en todas las páginas). Persiste el mensaje en `feedback_submissions` de Supabase (línea 136) — Aldo lo lee de la BD cuando esté online, sin dependencia de responder en tiempo real.

**Copy propuesto para toast de error genérico** (cuando lo necesitemos):

> "No pudimos guardar tu servicio — Verifica tu conexión y vuelve a intentar. Si persiste, cuéntanos desde el ícono de comentarios (abajo a la derecha)."

Ventajas vs mencionar `contacto@pawnecta.com`:
- No promete tiempo específico de respuesta.
- Redirige a un canal que ya persiste en BD sin depender de Aldo online.
- "Cuéntanos" es voz neutra, no ambigua sobre urgencia esperada.
- El FeedbackWidget ya está visible; el usuario no tiene que abrir un cliente de email.

**Alternativa mínima** (si el FeedbackWidget se considera muy indirecto):

> "No pudimos guardar tu servicio — Verifica tu conexión y vuelve a intentar más tarde."

Elimina la mención al canal por completo. Pierde la ruta de escape (usuario con problema persistente queda sin qué hacer), pero cero promesa.

**Convención aprobada por PO 2026-08-18** (cláusula operativa, no regla P-numerada):

> **Toasts de error user-facing con ruta de escape → FeedbackWidget, no email.** El widget de comentarios está montado globalmente (`pages/_app.tsx:67`), persiste en `feedback_submissions` de Supabase, y desacopla la respuesta de que alguien esté online (Aldo lo lee cuando pueda; el usuario tiene ruta real de reporte sin esperar). Los emails a `contacto@pawnecta.com` se reservan para **superficies asíncronas** donde la latencia es aceptable: footer, Términos de Servicio, Política de Privacidad, headers `reply-to` de transaccionales. La convención se aplica al aterrizar el próximo toast user-facing que requiera ruta de escape — sin cambios a los toasts existentes en este commit (0 matches user-facing en el grep pre-B4).

**Copy de referencia para futuros toasts de error genéricos** (usar como plantilla):

```ts
toast.error('No pudimos guardar tu servicio', {
  description: 'Verifica tu conexión y vuelve a intentar. Si persiste, cuéntanos desde el ícono de comentarios (abajo a la derecha).',
});
```

Ventajas del copy:
- No promete tiempo de respuesta.
- Redirige a canal asíncrono que persiste sin dependencia de Aldo online.
- "Cuéntanos" es voz neutra, no ambigua sobre urgencia.
- El FeedbackWidget ya está visible en todas las páginas; cero fricción de descubrimiento.

## 5. Cierre de ciclo A1 — warning "Tu verificación pendiente"

El preview HTML del artifact incluía un toast de ejemplo warning:

> "Tu verificación está pendiente — Sube foto del carnet frontal y dorso para poder recibir reservas."

**Observación del PO 2026-08-18**: ese es justo el punto donde el flujo se rompía por el bug del bucket privado que arreglamos en Ola 1 A1. Con A1 aterrizado:
1. El proveedor sube carnet frontal + dorso desde `/proveedor > Verificación`.
2. El backend guarda **PATH** (no URL pública inválida) en `foto_carnet` / `foto_carnet_dorso`.
3. El admin en `/admin > Verificaciones` ve la imagen via `getCarnetSignedUrl()` con signed URL 5 min TTL.
4. El admin aprueba, el proveedor recibe el email `AprobacionProveedorEmail`, empieza a recibir reservas.

**Cierre de ciclo**: el toast warning ahora tiene sentido operativo real — la acción que sugiere ("Sube foto del carnet frontal y dorso") lleva a un flujo funcional end-to-end en prod. Pre-A1 el proveedor podía subir el carnet pero el admin veía `<img>` roto y el flow se estancaba silenciosamente. Post-A1, el ciclo cierra.

Anotable como una de las razones por las que A1 valía el sprint dedicado en Ola 1 pese al bajo count de usuarios prod actuales — sin A1, la vitrina del sistema hubiera tenido un dead-end justo en el punto donde el proveedor gasta esfuerzo (subir fotos de doc oficial).

## 6. Compatibilidad con familias hermanas

`ModalAlert`, `ConfirmDialog`, `NotificationBell/Center`, `CookieBanner` mantienen su look actual. La homologación de las 4 familias juntas queda como sprint separado (post-launch, sin urgencia — cada una funciona bien en su propio ámbito). B4 solo unifica los toasts, que es donde estaba el chirrido visible que el PO detectó en el walkthrough post-batch REMATE-1.

## 7. Estado

- **Rama `ola2-b4` pusheada, preview en Vercel** — verificación visual antes del merge FF.
- **Decisión pendiente del PO**: aprobar la propuesta de copy del toast de error (opción A "usar FeedbackWidget" recomendada, alternativa "eliminar mención al canal" también válida) — la cláusula queda como convención documentada en este acta; no cambia ningún toast existente porque no hay ninguno con el patrón problemático.
- **Post-aprobación**: GO merge FF `ola2-b4 → main` + smokes S1-S7 + tag `ola2-b4-prod-20260818`.

## 8. Deudas menores anotadas — NO se implementan sin GO explícito

- **Copy convention al aterrizar toasts de error nuevos**: cuando aterrice el primer toast de error user-facing con ruta de escape, aplicar la convención de la sección 4 (FeedbackWidget, no email).
- **Sprint futuro opcional — Homologación 4 familias**: unificar tokens tipográficos + spacing entre `Toaster` + `ModalAlert` + `ConfirmDialog` + `NotificationBell`. Post-launch, decisión UX (no técnica).

---

**PO**: aprobación del copy propuesto (o "eliminar mención al canal") + GO merge FF. Cero acción unilateral mía hasta ese punto.
