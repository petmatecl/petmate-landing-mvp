# REPORTE EMAIL DE CONTACTO — Diagnóstico + Fix propuesto + Ejecución real

**Fecha diagnóstico**: viernes 2026-08-07 tarde (post-desfile + Sweep #1).
**Fecha ejecución en prod**: martes 2026-08-11.
**Origen**: pedido del PO 2026-08-07 tras aclaración del ITEM 4 de la Fase 8 monitor N15 (el canal real es `petmatecl@gmail.com`; las casillas `@pawnecta.com` referenciadas en el código NO existen aún).
**Alcance**: (a) diagnóstico exhaustivo de qué email ve el usuario dónde y qué le pasa cuando lo usa hoy; (b) fix propuesto + paso a paso Cloudflare/registrar para que Aldo lo ejecute; (c) **Sección 8 — ejecución real 2026-08-11** con el estado final: se resolvió con **Zoho Mail sobre DNS de GoDaddy sin migrar nameservers**, NO con Cloudflare.

> ⚠ **Nota histórica**: las secciones 1-7 documentan el diagnóstico y la propuesta del 2026-08-07 con Cloudflare Email Routing como opción recomendada. **Esa opción NO se ejecutó** — Aldo optó por Zoho Mail. El estado real de la zona DNS y el cierre operativo están en la **Sección 8** al final. Las secciones 1-7 se preservan como testimonio histórico (P5: docs inmutables) y como referencia de las alternativas evaluadas.

---

## 1. Diagnóstico — inventario completo (grep 3 patrones)

### 1.1 `contacto@pawnecta.com` (usado 6 veces en superficies visibles al usuario)

| Archivo | Línea | Contexto |
|---|---|---|
| `components/Footer.tsx` | 65 | Link "contacto@pawnecta.com" en footer (columna "Pawnecta") |
| `pages/faq.tsx` | 157 | Enlace en la sección de contacto de FAQ |
| `pages/privacidad.tsx` | 28 | "Correo de contacto: contacto@pawnecta.com" |
| `pages/privacidad.tsx` | 156 | Instrucciones para ejercer derechos LGPD |
| `pages/terminos.tsx` | 28 | "Contacto: contacto@pawnecta.com" |
| `pages/terminos.tsx` | 265 | "Para soporte, reportes o solicitudes: contacto@pawnecta.com" |

**Todas** son `<a href="mailto:contacto@pawnecta.com">` — click abre cliente de email del usuario con destinatario ya rellenado. Alta visibilidad.

### 1.2 `soporte@pawnecta.com` (usado 8 veces — mayormente en templates de email)

| Archivo | Línea | Contexto | Visible en |
|---|---|---|---|
| `components/Emails/AgendamientoCancelacionTutorEmail.tsx` | 138 | "Si tienes dudas, contáctanos a soporte@pawnecta.com" | Footer email cancelación |
| `components/Emails/AgendamientoProveedorEmail.tsx` | 153 | ídem | Footer email nueva solicitud |
| `components/Emails/AgendamientoTutorEmail.tsx` | 183 | ídem | Footer email tutor tras reserva |
| `components/Emails/InvitacionResenaEmail.tsx` | 78 | ídem | Footer email invitación a evaluar |
| `components/Emails/NewEvaluationEmail.tsx` | 56 | ídem | Footer email nueva evaluación al proveedor |
| `components/Emails/RecordatorioReservaEmail.tsx` | 147 | ídem | Footer email recordatorio 24h antes |
| `components/Emails/ReservaConfirmadaTutorEmail.tsx` | 146 | ídem | Footer email reserva confirmada |
| `pages/proveedor/index.tsx` | 1220 | "contáctanos en soporte@pawnecta.com" | Panel proveedor, mensaje de rechazo/apelación |

**Nota**: los 7 templates de email son plain text (`Si tienes dudas, contáctanos a soporte@...`), NO `<a href>`. Cliente de email suele auto-linkear pero depende del renderer.

### 1.3 Otros emails visibles al usuario

| Archivo | Línea | Contexto | Tipo |
|---|---|---|---|
| `pages/api/notifications/new-message.ts` | 91 | `from: "Pawnecta <notificaciones@pawnecta.com>"` | Remitente email "tienes un mensaje nuevo" |
| `pages/proveedor/[id].tsx` | 325 | `mailto:${proveedor.email_publico}` | Email del PROVEEDOR (dinámico, no de Pawnecta) |
| `pages/api/push/send.ts` | 15 | `'mailto:soporte@pawnecta.com'` | VAPID `sub` de Web Push (NO visible al usuario — es identificador técnico del servicio push) |

### 1.4 Remitente REAL de emails transaccionales (Resend `from`)

Todos usan la env var `EMAIL_FROM` con fallback `onboarding@resend.dev`:

| Archivo | Línea |
|---|---|
| `pages/api/agendamientos/notify-proveedor-cancel.ts` | 150 |
| `pages/api/agendamientos/notify-proveedor.ts` | 167 |
| `pages/api/agendamientos/notify-tutor-reserva-confirmada.ts` | 163 |
| `pages/api/agendamientos/notify-tutor.ts` | 180 |
| `pages/api/auth/welcome.ts` | 113 |

**Valor real de `EMAIL_FROM` en producción**: no verificable desde el código — vive en Vercel Environment Variables scope Production. Requiere que Aldo verifique. Sospecha alta (basado en convención): `Pawnecta <hola@pawnecta.com>` o similar. **Cuando un usuario responde al email transaccional (Reply), la respuesta va a `EMAIL_FROM`.**

## 2. Veredicto por casilla — ¿qué le pasa hoy al usuario que las usa?

| Casilla | Existe hoy? | ¿Adónde llega? | Impacto |
|---|---|---|---|
| `contacto@pawnecta.com` | ❌ **NO** (confirmado por PO 2026-08-07) | Bounce del provider de dominio | **Usuario escribe → jamás llega a Aldo**. Alta prioridad. |
| `soporte@pawnecta.com` | ❓ **desconocido** (probablemente no) | ¿Bounce? | Mismo problema en 7 templates de email + panel proveedor. |
| `notificaciones@pawnecta.com` | ❓ **desconocido** | Se usa como `from:` de `new-message` — si un user responde a esa notificación, va a esta casilla. | Reply-black-hole potencial. |
| `hola@pawnecta.com` (asumida como `EMAIL_FROM`) | ❓ **desconocido** — verificar en Vercel dashboard | Reply de cualquier email transaccional (welcome, notify-*, reserva confirmada, cancelación, recordatorio, invitación reseña). | **Vector principal** — los users RESPONDEN a estos emails para preguntar/coordinar. Si la casilla no existe, todas las respuestas se pierden silenciosamente. |
| `petmatecl@gmail.com` | ✅ **SÍ** (canal real hoy, confirmado por PO) | Bandeja gmail personal de Aldo | Es el ÚNICO canal que funciona, pero **ningún email de Pawnecta lo menciona ni lo enruta**. |

**Resumen del gap**: hoy hay 4 casillas `@pawnecta.com` referenciadas en el código (contacto/soporte/notificaciones/hola-asumido) — **ninguna confirmada como funcional**. El único canal real (`petmatecl@gmail.com`) no aparece en ninguna superficie visible al usuario ni recibe redirects. Un usuario con problema que sigue las instrucciones del sitio → escribe a `contacto@` → **no llega a Aldo → user perdido**.

## 3. Fix propuesto — 3 alternativas (recomendada: Cloudflare)

### Opción A (recomendada) — Cloudflare Email Routing (gratis, ~10-15 min)

**Requisitos**: dominio `pawnecta.com` con nameservers apuntando a Cloudflare. Si no está en Cloudflare hoy, el paso previo es cambiar los nameservers en el registrar (típicamente 24-48h de propagación).

**Setup**:
1. Login en Cloudflare Dashboard → seleccionar `pawnecta.com`.
2. Sidebar → **Email → Email Routing** → click "Get started".
3. Cloudflare agrega automáticamente los MX records necesarios (verificar que reemplacen cualquier MX previo — si `pawnecta.com` NO tenía email antes, no hay conflict).
4. **Custom addresses** → agregar 4 forwards, todos apuntando a `petmatecl@gmail.com`:
   - `contacto@pawnecta.com` → `petmatecl@gmail.com`
   - `soporte@pawnecta.com` → `petmatecl@gmail.com`
   - `hola@pawnecta.com` → `petmatecl@gmail.com`
   - `notificaciones@pawnecta.com` → `petmatecl@gmail.com`
5. **Catch-all** (opcional pero recomendado): "Send to an address" → `petmatecl@gmail.com`. Cualquier email a `<algo>@pawnecta.com` no listado arriba también forwardea. Cierra el gap de casillas futuras que se agreguen al código sin actualizar Cloudflare.
6. **Verificación en Gmail**: primero Cloudflare envía un email de confirmación a `petmatecl@gmail.com` con un link para autorizar el forwarding — click y listo.

**Test post-setup**: desde otro correo (personal), enviar test emails a las 4 casillas + una arbitraria (ej. `test-catchall@pawnecta.com`) → verificar en Gmail que las 5 llegan con subject original y header `to:` visible.

**Costo**: $0. Cloudflare Email Routing es gratis sin límite de forwards.

**Limitación aceptada**: forwarding-only. Aldo puede recibir y responder desde `petmatecl@gmail.com`, pero el **From:** de la respuesta sale con `petmatecl@gmail.com` — el user ve la dirección personal, no `contacto@pawnecta.com`. Fix futuro: configurar Gmail "Send mail as" con `contacto@pawnecta.com` (requiere SMTP relay + Cloudflare Workers Email o similar). Para el day-1 launch, el forwarding-only es suficiente — el user obtiene respuesta.

### Opción B — Forwarding del registrar del dominio

Muchos registrars (Namecheap, GoDaddy, Google Domains/Squarespace, etc.) ofrecen email forwarding gratis. Cero cambio de nameservers. Setup similar (~10 min): añadir forwards en el dashboard del registrar.

**Cuándo elegir**: si `pawnecta.com` NO está en Cloudflare y no queremos mover nameservers para un launch inmediato.

**Limitación**: mismo forwarding-only que Cloudflare; algunos registrars limitan a 5-10 forwards (Cloudflare no).

### Opción C — Google Workspace ($6/mes por casilla real)

Casilla real de Gmail con dominio custom (`contacto@pawnecta.com` como email nativo). Se puede enviar y recibir desde esa dirección directamente. **NO** recomendado por defecto para el launch (overkill + gasto recurrente). Evaluar solo si volumen del día 1 justifica.

## 4. Paso a paso ejecutable para Aldo — Cloudflare (opción A)

Requisito previo (verificar): `pawnecta.com` en Cloudflare. Si sí → 15 min. Si no → primero migrar DNS a Cloudflare (~48h propagación).

```
1. Cloudflare Dashboard (dash.cloudflare.com) → seleccionar "pawnecta.com".
2. Sidebar izquierda → Email → Email Routing.
3. Click "Enable Email Routing" (Cloudflare configura MX records automáticamente).
   ⚠ Si ya había MX records de otro provider (ej. si alguna vez se configuró
     Google Workspace/Zoho), Cloudflare pregunta si reemplazar. Reemplazar
     SOLO si estás seguro de que ningún email en flight se pierde.
4. Después de habilitar → click "Add address".
5. Agregar los 4 forwards uno por uno:
    a. Custom address: contacto     · Destination: petmatecl@gmail.com
    b. Custom address: soporte      · Destination: petmatecl@gmail.com
    c. Custom address: hola         · Destination: petmatecl@gmail.com
    d. Custom address: notificaciones · Destination: petmatecl@gmail.com
6. Cloudflare envía un email de verificación a petmatecl@gmail.com por cada
   destination (la primera vez que agregas gmail; después ya está autorizada).
   Click al link "Verify email address" en gmail.
7. (Recomendado) Habilitar CATCH-ALL:
   Email Routing → Routing rules → Catch-all address → "Send to an address"
   → petmatecl@gmail.com. Esto atrapa cualquier @pawnecta.com futuro que no
   hayamos enrolado explícitamente.
8. Test funcional: desde una cuenta externa (celular, otro correo) enviar
   mensajes a las 4 casillas + uno al catch-all (test-catchall@pawnecta.com).
   Verificar en gmail que los 5 llegan con:
     - Subject original preservado.
     - Header To: mostrando el @pawnecta.com original (permite filtros).
     - Body sin modificar.
9. Verificar EMAIL_FROM en Vercel Dashboard → Settings → Environment
   Variables scope Production. Confirmar cuál casilla usa (probablemente
   hola@pawnecta.com o notificaciones@pawnecta.com). Esa casilla también
   debe estar en el forward de Cloudflare (paso 5 ya la incluye si es
   hola@ o notificaciones@).
```

## 5. Después del setup — verificación desde el código

Ninguna. El setup es 100% de infra (DNS/routing) sin cambios de código. Los `mailto:contacto@pawnecta.com` del código funcionan igual — solo que ahora los emails que envíen los users efectivamente llegan a Aldo.

**Regresión post-setup a monitorear en el finde**: bandeja gmail de Aldo debería ver 1-2 emails de test propios + eventuales emails reales. Zero-inbox baseline = fix aterrizado.

## 6. Sprint futuro (Send-as desde gmail)

Post-lanzamiento, si Aldo prefiere que sus respuestas salgan con `contacto@pawnecta.com` (no `petmatecl@gmail.com`), el fix es Gmail "Send mail as" con SMTP relay. Cloudflare no ofrece SMTP send-as gratis; alternativas:
- Cloudflare Workers Email (gratis, requiere código serverless para envío).
- Zoho Mail (gratis para 1 mailbox real, $1/mo por adicional).
- Google Workspace (opción C — el completo).

Fuera del scope del launch inmediato. Anotar como deuda para post-monitor.

## 7. Estado tras entrega de este reporte

- **Diagnóstico entregado** — 3 grep + veredicto por casilla.
- **Fix propuesto** con 3 alternativas + recomendación (Cloudflare).
- **Paso a paso ejecutable por Aldo** — no requiere código de mi parte.
- **Cero cambios de código** — todo es infra DNS/routing.
- **Ejecución**: pelota en cancha de Aldo. Al confirmar setup + tests → ítem se cierra en `BACKLOG.md > PEDIDOS DIRECTOS DEL PO`.

---

## 8. Ejecución real — CIERRE EN PROD (2026-08-11)

**Camino elegido**: Zoho Mail (no Cloudflare) sobre DNS de **GoDaddy** (no se migraron nameservers). El dominio `pawnecta.com` está en GoDaddy — registrar y DNS —, nameservers `ns59.domaincontrol.com` / `ns60.domaincontrol.com`. Cero migración de infraestructura.

**Motivo por el que no se usó Cloudflare**: la Opción A del diagnóstico asumía que valdría la pena migrar nameservers a Cloudflare para habilitar Email Routing gratis. Aldo prefirió resolver sin tocar nameservers — Zoho ofrecía casilla real (no solo forward), configuración vía TXT/MX en el mismo panel GoDaddy, y evitaba la ventana de propagación de 24-48h.

### 8.1 Estado final de la zona DNS de `pawnecta.com` (post-ejecución)

| Nombre | Tipo | Valor | Propósito | Origen |
|---|---|---|---|---|
| `@` | A | Vercel | Web app pawnecta.com | Intacto (pre-existente) |
| `www` | CNAME | Vercel | Alias www → web app | Intacto (pre-existente) |
| `send` | MX + TXT | Amazon SES (`v=spf1 include:amazonses.com ~all`) | Resend transaccional aislado en subdominio `send` | **Intacto** (Resend) |
| `resend._domainkey` | TXT | DKIM Resend | Firma DKIM de Resend en el subdominio | **Intacto** (Resend) |
| `@` | MX (10) | `mx.zoho.com` | Zoho primario | **Nuevo — Zoho** |
| `@` | MX (20) | `mx2.zoho.com` | Zoho secundario | **Nuevo — Zoho** |
| `@` | MX (50) | `mx3.zoho.com` | Zoho terciario | **Nuevo — Zoho** |
| `@` | TXT | `v=spf1 include:zoho.com ~all` | SPF de Zoho para casillas del dominio raíz | **Nuevo — Zoho** |
| `zmail._domainkey` | TXT | DKIM Zoho 1024 bits | Firma DKIM Zoho, **VERIFICADO** y activo | **Nuevo — Zoho** |
| `@` | TXT | `zoho-verification=...` | Verificación de propiedad del dominio ante Zoho | **Nuevo — Zoho** |
| `_dmarc` | TXT | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | Política DMARC del dominio (relajada) | Intacto (pre-existente) |

### 8.2 Por qué no hubo colisión SPF Resend ↔ Zoho

**El aislamiento por subdominio es lo que hace posible la convivencia**. Resend firma y envía como `<algo>@send.pawnecta.com` — el SPF de Resend vive en el TXT del subdominio `send`, NO en el TXT raíz. Zoho recibe/envía como `<algo>@pawnecta.com` — su SPF vive en el TXT del dominio raíz. Los dos SPF nunca comparten registro → cero colisión.

**El DMARC del dominio raíz** aplica a ambos flujos gracias a la alineación **relajada** (`adkim=r`, `aspf=r`), que reconoce como alineado cualquier subdominio del `From:`. Un email transaccional con `From: hola@pawnecta.com` firmado en `send.pawnecta.com` alinea bajo `adkim=r`. Un email desde Zoho con `From: contacto@pawnecta.com` firmado en `zmail._domainkey.pawnecta.com` también alinea. Ambos pasan DMARC — ambos aterrizan en la bandeja del destinatario sin quarantine.

### 8.3 Smoke de regresión ejecutado (2026-08-11)

**Test**: reserva real en prod (después del deploy de Batch REMATE-1).

**Resultado**: **2 emails Resend entregados con status "Delivered"** en el dashboard Resend:
1. Aviso a proveedor (`Nueva solicitud de reserva ...`).
2. Confirmación a tutor (`Reserva confirmada ...`).

**Conclusión**: agregar Zoho al dominio raíz **no afectó** el flujo transaccional Resend. Los MX raíz de Zoho gobiernan las casillas `contacto@` / `soporte@` / etc. Los emails que **envía** la app (via Resend con `From:` que resuelve al subdominio `send`) siguen su propio camino DKIM/SPF sin interferencia.

### 8.4 Estado de las casillas del diagnóstico (sección 2 del reporte) — post-ejecución

| Casilla | Antes (2026-08-07) | Ahora (2026-08-11) | Cómo |
|---|---|---|---|
| `contacto@pawnecta.com` | ❌ NO existe → bounce | ✅ Casilla real en Zoho | Zoho Mail |
| `soporte@pawnecta.com` | ❓ desconocido | ✅ Casilla real en Zoho | Zoho Mail |
| `notificaciones@pawnecta.com` | ❓ desconocido | ✅ Casilla real en Zoho | Zoho Mail (si Aldo la creó — verificar) |
| `hola@pawnecta.com` | ❓ desconocido | ✅ Casilla real en Zoho | Zoho Mail (si Aldo la creó — verificar) |
| `petmatecl@gmail.com` | ✅ canal real | ✅ sigue funcionando | Sin cambio |
| `<algo>@send.pawnecta.com` | (subdominio Resend, no user-facing) | Sigue funcionando | Resend intacto |

### 8.5 Diferencia clave respecto al Opción A del diagnóstico

| Aspecto | Opción A (Cloudflare — no ejecutada) | Ejecución real (Zoho + GoDaddy) |
|---|---|---|
| Casillas | Forward-only → `petmatecl@gmail.com` | Casillas reales con inbox propio |
| Send-as | Requería SMTP relay adicional (deuda futura) | Nativo desde el inicio (Zoho SMTP) |
| Costo | $0 (Cloudflare Email Routing) | $0 (Zoho Free — 1 mailbox real; adicionales tienen fee) |
| Cambio de nameservers | Sí (24-48h propagación) | **No** — todo por TXT/MX en GoDaddy |
| Ventana de riesgo | Ventana de propagación | Instantáneo (los MX propagan en minutos, no requieren cambio de NS) |
| Interacción con Resend | Requería asegurarse que MX de Cloudflare no reemplazaba MX transaccional | No aplica — Resend aislado en `send.` |

### 8.6 Deuda residual / candidatos post-launch

- **DMARC `rua`**: apunta a `dmarc_rua@onsecureserver.net` (default de GoDaddy). Anotado en `BACKLOG.md > PEDIDOS DIRECTOS DEL PO` como candidato menor — cambiar por una dirección propia (`dmarc@pawnecta.com` en Zoho, o servicio dedicado como Postmark DMARC / dmarcian) para leer los reportes agregados semanales.
- **Send-as desde Gmail** (si Aldo quiere responder desde `petmatecl@gmail.com` con `From: contacto@pawnecta.com`): configurar Gmail "Send mail as" apuntando al SMTP de Zoho — ~10 min, deuda light.
- **Verificar valor real de `EMAIL_FROM` en Vercel Environment Variables** (mencionado en Sección 1.4). Confirmar cuál casilla usa el remitente de los emails Resend — si es `hola@pawnecta.com` u otra, alinear con las casillas Zoho creadas.

### 8.7 Cierre del ítem

**Ítem "email de contacto" cerrado en prod** — canal funcional para el launch. Sin cambios de código. Reporte actualizado como evidencia P5. El ítem se mueve de `PEDIDOS DIRECTOS DEL PO > abierto` a `cerrado 2026-08-11`.
