# Testing manual pre-campañas — checklist operacional

**Audiencia**: PO (ejecutor) + tester externo opcional.
**Duración estimada**: 2-3 horas en 1 sesión.
**Objetivo**: validar end-to-end que Pawnecta está presentable antes de activar campañas pagadas. Zero código durante el testing — todo validación empírica contra prod.

**Convenciones**:
- ✅ = pass
- ⚠️ = pasa con fricción (documentar)
- ❌ = fail, bloquea campañas
- Documentar cada hallazgo en un side-doc o chat con screenshots + fecha/hora.

**Ambiente**: prod (`https://www.pawnecta.com`). Usar modo incógnito + cuentas de test (NO cuentas reales de users). Email de test sugerido: `test-{randomHex}@tutormail.com` / `proveedor-{randomHex}@mail.com`.

---

## Sección 1 — Tutor nuevo (anónimo, luego registra) · 15 ítems · ~30 min

### 1.1 Home / landing SEO

- [ ] 1.1.1 Abrir `https://www.pawnecta.com/` en incógnito desktop viewport 1920x1080.
- [ ] 1.1.2 Verificar hero carga en <3s + muestra servicios.
- [ ] 1.1.3 SearchBar: escribir "paseos" + comuna "Providencia" → click Buscar → debería navegar a `/explorar` con filtros aplicados.
- [ ] 1.1.4 Volver home. Repetir con comuna vacía: solo "paseos" → debería ir a `/explorar?categoria=paseos`.
- [ ] 1.1.5 Click en algún link del footer (Términos, Privacidad, Blog) — debería abrir correctamente.

### 1.2 Explorar

- [ ] 1.2.1 En `/explorar`, verificar que carga grid de servicios reales.
- [ ] 1.2.2 Aplicar filtro categoría "Cuidado y Hospedaje" → grilla se actualiza + chip muestra "Cuidado y Hospedaje" (NO "cuidado" slug crudo). ⚠️ Si dice "cuidado" slug, es bug conocido (sprint fix pendiente — ver `docs/auditorias/copy-20261120.md`).
- [ ] 1.2.3 Aplicar filtro comuna → grilla se actualiza.
- [ ] 1.2.4 Aplicar filtro precio min+max → grilla se actualiza.
- [ ] 1.2.5 Click en un ServiceCard → navega a `/servicio/{uuid}` correcto.
- [ ] 1.2.6 Volver atrás (browser back) → filtros persisten en URL + grilla.

### 1.3 Ficha servicio (anónimo)

- [ ] 1.3.1 Ficha `/servicio/{uuid}` carga sin error.
- [ ] 1.3.2 Ver galería (click en miniaturas → cambia hero).
- [ ] 1.3.3 Click "Contactar" → modal `LoginRequiredModal` con mensaje "Crea una cuenta para contactar" + 2 CTAs (Crear cuenta / Iniciar sesión).
- [ ] 1.3.4 Click "Reservar" o CTA agenda → mismo modal.

### 1.4 Registro tutor (inicial)

- [ ] 1.4.1 Click "Crear cuenta" desde el modal → `/register` abre con rol pre-seleccionado tutor.
- [ ] 1.4.2 Step 1: elegir "Busco servicios" (tutor).
- [ ] 1.4.3 Step 2: completar con email ficticio + password válida + nombre + apellido.
- [ ] 1.4.4 Submit → mensaje "Revisa tu correo para confirmar".
- [ ] 1.4.5 Revisar inbox (Gmail/Outlook del email usado) → debería haber correo welcome de `hola@send.pawnecta.com` / `hola@pawnecta.com`.
- [ ] 1.4.6 Click link de confirmación → aterriza en `/email-confirmado` con mensaje "Tu cuenta ya está activa".

---

## Sección 2 — Tutor con cuenta (post-login) · 20 ítems · ~40 min

### 2.1 Login

- [ ] 2.1.1 Click "Iniciar sesión" → formulario login carga.
- [ ] 2.1.2 Ingresar credenciales incorrectas → error visible (puede ser genérico — ok).
- [ ] 2.1.3 Ingresar credenciales correctas → redirect a `/explorar` o home.
- [ ] 2.1.4 Header muestra avatar o nombre del user.
- [ ] 2.1.5 Click avatar → menú desplegable con opciones (Mis Reservas, Favoritos, Perfil, Salir).

### 2.2 Perfil tutor

- [ ] 2.2.1 Ir a Perfil → form carga con datos.
- [ ] 2.2.2 Agregar foto de perfil, teléfono, comuna, bio corta.
- [ ] 2.2.3 Guardar → toast success. Refresh → datos persisten.

### 2.3 Favoritos

- [ ] 2.3.1 Ir a `/explorar` → click ❤ en algún ServiceCard. Toast "Agregado a favoritos" o similar.
- [ ] 2.3.2 Ir a `/favoritos` → ver el servicio guardado.
- [ ] 2.3.3 Click ❤ para quitar → confirma + se remueve de la lista.

### 2.4 Contacto / Chat

- [ ] 2.4.1 Volver a `/explorar`, abrir una ficha nueva.
- [ ] 2.4.2 Click "Contactar" → modal/sheet con 3 canales (Mensaje interno, WhatsApp si visible, Teléfono si visible).
- [ ] 2.4.3 Click "Mensaje" → redirect a `/mensajes` con conversación abierta.
- [ ] 2.4.4 Escribir primer mensaje + enviar → aparece en el hilo (⚠️ Nota: si post-sprint CHAT-LAZY-CREATE ya aterrizó, la conversación se crea en este envío, no antes).
- [ ] 2.4.5 Verificar que el proveedor recibe email `[STAGING]` si es staging / email real si es prod (confirmar según ambiente).

### 2.5 Reserva (F1 o F2 según servicio)

- [ ] 2.5.1 Volver a la ficha → click "Reservar".
- [ ] 2.5.2 Modal reserva carga picker F1 (slots) o F2 (rango noches).
- [ ] 2.5.3 Seleccionar fecha + hora/rango + agregar nota opcional + mascota si aplica.
- [ ] 2.5.4 Submit → toast "Reserva enviada" o "Reserva confirmada" según modo.
- [ ] 2.5.5 Ir a `/mis-reservas` → ver la reserva en tab correspondiente (Pendientes si F1-request / Próximas si F1/F2 auto-confirmada).
- [ ] 2.5.6 Verificar que email de confirmación llega al tutor.

### 2.6 Cancelación

- [ ] 2.6.1 En `/mis-reservas` → click "Cancelar" sobre la reserva recién hecha.
- [ ] 2.6.2 Modal confirm aparece + user acepta → reserva pasa a estado "Cancelada por ti".
- [ ] 2.6.3 Verificar que el proveedor recibe email de cancelación.

---

## Sección 3 — Proveedor nuevo (registro + primer servicio) · 20 ítems · ~40 min

### 3.1 Signup proveedor

- [ ] 3.1.1 En incógnito nueva ventana (otro perfil), ir a `/register`.
- [ ] 3.1.2 Step 1: elegir "Ofrezco servicios".
- [ ] 3.1.3 Step 2: completar email + password + nombre + apellido_p + RUT + comuna + teléfono.
- [ ] 3.1.4 Step 3: "Cuéntanos sobre tu servicio" — elegir categoría + descripción + precio desde + unidad.
- [ ] 3.1.5 Submit → mensaje "¡Listo!" + "Revisa tu correo para confirmar".
- [ ] 3.1.6 Confirmar email → aterriza en `/email-confirmado`.
- [ ] 3.1.7 Click "Ir a mi panel" → aterriza en `/proveedor`.

### 3.2 Dashboard proveedor

- [ ] 3.2.1 Panel `/proveedor` muestra tabs (Servicios, Solicitudes, Métricas, Perfil).
- [ ] 3.2.2 Tab Servicios: ver el servicio recién creado en Step 3.
- [ ] 3.2.3 Click Editar servicio → modal `ServiceFormModal` abre con datos pre-llenados.
- [ ] 3.2.4 Editar algún campo (ej. subir foto, modificar precio) + guardar → toast success.

### 3.3 Activar agenda

- [ ] 3.3.1 En el servicio, buscar sección "Disponibilidad" / "Agenda".
- [ ] 3.3.2 Activar F1 (slots horarios): elegir días + horas + duración slot.
- [ ] 3.3.3 Guardar → toast success. Refresh → agenda persiste.
- [ ] 3.3.4 Ver ficha pública del servicio → debería mostrar el picker de slots.

### 3.4 Perfil proveedor

- [ ] 3.4.1 Tab Perfil: agregar foto perfil + bio + galería.
- [ ] 3.4.2 Guardar → confirmar.
- [ ] 3.4.3 Ver perfil público `/proveedor/{id}` → cambios visibles.

### 3.5 Aprobar reserva del tutor (Sección 2.5)

- [ ] 3.5.1 Tab Solicitudes: ver la reserva que el tutor hizo en Sección 2.5.
- [ ] 3.5.2 Click Aprobar / Confirmar.
- [ ] 3.5.3 Verificar email al tutor "Tu reserva fue confirmada".
- [ ] 3.5.4 Tab Próximas: ver la reserva confirmada.

### 3.6 Responder al tutor por chat

- [ ] 3.6.1 Ir a `/mensajes` del proveedor.
- [ ] 3.6.2 Ver conversación iniciada por el tutor.
- [ ] 3.6.3 Enviar respuesta → aparece en el hilo.
- [ ] 3.6.4 Verificar notificación al tutor (email si offline + bell si online).

### 3.7 Verificación de identidad (opcional, para badge)

- [ ] 3.7.1 Tab Perfil → sección Verificación → subir carnet frontal + dorso.
- [ ] 3.7.2 Submit → estado pasa a "Pendiente".
- [ ] 3.7.3 ⚠️ Nota: el badge "Identidad verificada" solo aparece tras aprobación admin.

---

## Sección 4 — Admin (Aldo) · 15 ítems · ~30 min

Usar cuenta admin real (`acanocts@gmail.com`). ⚠️ Cuidado: zero actions destructivas (no borrar data real).

### 4.1 Login admin

- [ ] 4.1.1 Login con cuenta admin.
- [ ] 4.1.2 Navegar a `/admin` → sidebar admin visible.
- [ ] 4.1.3 Ver panel con tabs (Proveedores, Evaluaciones, Servicios, Feedback, Notificaciones).

### 4.2 Aprobar verificación proveedor

- [ ] 4.2.1 Tab Verificaciones: ver el proveedor de la Sección 3 con verificación pendiente.
- [ ] 4.2.2 Click sobre la fila → ver carnet frontal + dorso.
- [ ] 4.2.3 ⚠️ **Bug conocido**: carnet puede mostrarse roto (imagen no carga) por bucket privado. Si aparece roto, confirmar que es el bug conocido (no bloqueante — fix post-launch).
- [ ] 4.2.4 Click Aprobar → estado del proveedor pasa a `verificacion_estado='aprobado'` + `rut_verificado=true`.
- [ ] 4.2.5 Ver ficha pública del proveedor → badge "Identidad verificada" aparece.

### 4.3 Moderar evaluaciones

- [ ] 4.3.1 Tab Evaluaciones: si hay reviews pendientes, ver + decidir aprobar/rechazar.
- [ ] 4.3.2 Si no hay pendientes, OK (pasa).

### 4.4 Panel de servicios

- [ ] 4.4.1 Tab Servicios: ver listado de todos los servicios publicados.
- [ ] 4.4.2 Buscar por título → filtro funciona.
- [ ] 4.4.3 Click en un servicio → detalle admin con contact email del proveedor + edición limitada.

### 4.5 Feedback

- [ ] 4.5.1 Tab Feedback: ver feedback entregado por users.
- [ ] 4.5.2 Si hay nuevo, leer + marcar como procesado.

### 4.6 Notificaciones admin

- [ ] 4.6.1 Tab Notificaciones: ver notifs admin recientes.
- [ ] 4.6.2 Verificar que las notifs tienen info útil (nuevo proveedor registrado, verificación enviada, etc.).

---

## Sección 5 — Flows públicos + SEO · 10 ítems · ~20 min

### 5.1 Landings SEO

- [ ] 5.1.1 Abrir `/paseos` → landing carga + muestra servicios de categoría.
- [ ] 5.1.2 Abrir `/cuidado` → idem.
- [ ] 5.1.3 Abrir `/paseos/providencia` → landing comuna×categoría carga.
- [ ] 5.1.4 Abrir `/veterinario/santiago` → idem.
- [ ] 5.1.5 Abrir `/etologia` (si existe) → carga o 404 correcto.

### 5.2 Blog

- [ ] 5.2.1 Abrir `/blog` → ver 10 entradas con imágenes de portada Unsplash.
- [ ] 5.2.2 Click en una entrada → `/blog/{slug}` carga con contenido completo.
- [ ] 5.2.3 Verificar footer blog + links a comuna/categoría.

### 5.3 Sitemap + robots

- [ ] 5.3.1 Abrir `/sitemap.xml` → XML válido con URLs.
- [ ] 5.3.2 Abrir `/robots.txt` → bloqueos correctos (`/register`, etc.).

---

## Sección 6 — Mobile responsive · 10 ítems · ~15 min

Repetir ítems clave en viewport 375x812 (iPhone SE). Puede usar DevTools responsive mode o móvil real.

- [ ] 6.1 Home → hero legible + CTAs tapeables (≥44px hit target).
- [ ] 6.2 Explorar → grid se renderiza en 1 col mobile + filtros accesibles via drawer/sheet.
- [ ] 6.3 Ficha → galería swipeable + CTAs principales sticky bottom.
- [ ] 6.4 Register → wizard navegable sin horizontal scroll.
- [ ] 6.5 Mis reservas → tabs cambian sin romper layout.
- [ ] 6.6 Mensajes → chat usable + input no tapado por teclado virtual.
- [ ] 6.7 Perfil tutor/proveedor → forms fit viewport.
- [ ] 6.8 Admin → sidebar colapsable + tabs accesibles.
- [ ] 6.9 Blog → imágenes y texto fit.
- [ ] 6.10 Login → form compacto + teclado no tapa inputs.

---

## Sección 7 — Smoke técnico post-testing · 10 ítems · ~15 min

### 7.1 Sentry

- [ ] 7.1.1 Durante los flows anteriores NO debería haber aparecido ningún error crudo al user.
- [ ] 7.1.2 Admin → GET `/api/admin/sentry-smoke?trigger=1` → aparece issue en Sentry dashboard en <2 min.

### 7.2 Correos efectivos

- [ ] 7.2.1 Revisar inbox del email tutor de prueba + proveedor de prueba.
- [ ] 7.2.2 Contar: emails recibidos = emails esperados (welcome × 2 + confirmación emails × 2 + reserva confirmada + cancelación + chat × N según tráfico).
- [ ] 7.2.3 Verificar remitente: `hola@send.pawnecta.com` o `notificaciones@` según tipo.

### 7.3 Search Console (Google)

- [ ] 7.3.1 Abrir Google Search Console → sin errores nuevos de indexación en 24h.
- [ ] 7.3.2 Sitemap enviado + Coverage sin 404 masivos.

### 7.4 Vercel + Supabase

- [ ] 7.4.1 Vercel Logs (últimas 2h) → sin 5xx.
- [ ] 7.4.2 Supabase Health → CPU <40%, conexiones <40% cap.

---

## Cleanup post-testing

**Importante**: limpiar la data creada durante el testing para no contaminar prod ni dashboards.

- [ ] C1. Borrar cuenta tutor de prueba (via Supabase Dashboard Users → delete).
- [ ] C2. Borrar cuenta proveedor de prueba.
- [ ] C3. Si quedaron reservas / conversaciones / servicios asociados, verificar que la cascade los borró. Si no, cleanup manual con SQL (ejecuta PO con GO a sí mismo).
- [ ] C4. Admin: borrar feedback de prueba si lo generaste.

---

## Formato del reporte post-testing

Al cerrar las 7 secciones:

```
TESTING MANUAL PRE-CAMPAÑAS {fecha}

Secciones completadas: X/7
Ítems totales: 100 (~) verificados.

PASS: N
WARN: M (lista con descripción + severidad)
FAIL: K (lista con bloqueantes)

GO campañas? SI / NO (con justificación)
```

---

## Decisiones pendientes del PO

### D1. ¿Testing manual lo ejecuta PO solo o con tester externo?

**Pregunta**: ¿valide contratar un tester externo (ej. UserTesting, Testlio, Fiverr tester CL) para una ronda independiente?

**Recomendación**: PO ejecuta la primera vez. Tester externo opcional para segunda ronda pre-activación de ads (es el momento donde más tráfico pagado llegará).

**Impacto si no se decide**: default = PO solo.

### D2. Testing mobile real vs DevTools

**Pregunta**: ¿valide usar un dispositivo móvil real (iPhone + Android) además de DevTools responsive mode?

**Recomendación**: **sí**, dispositivo real captura cosas que DevTools no (teclado virtual, sticky bottom, performance real). 15 min adicionales.

**Impacto si no se decide**: default = DevTools solo.

### D3. Frecuencia del testing manual

**Pregunta**: ¿cuándo se repite este checklist después de la primera vez?

**Recomendación**: **(a)** antes de activar campañas, **(b)** después de cualquier merge grande (ej. PII-VIEW-TIGHT, WWW-CANONICAL), **(c)** mensual durante los primeros 3 meses post-activación.

**Impacto si no se decide**: default = ad-hoc cuando el PO sienta necesidad.

### D4. Herramienta para tracking del checklist

**Pregunta**: ¿el PO quiere este doc como markdown (como está) o migrar a Notion/Linear/TestRail?

**Recomendación**: **markdown en repo** pre-campañas. Si el equipo crece o se contrata tester externo, migrar a TestRail (gratis para proyectos chicos).

**Impacto si no se decide**: default = markdown.

### D5. Cleanup data automatizado

**Pregunta**: ¿valide armar un script que borre data de test automáticamente (ej. prefix `test-` en email)?

**Recomendación**: baja prioridad. 10 min manual al final del testing es suficiente. Automatizar cuando frecuencia de testing aumente.

**Impacto si no se decide**: default = manual.

---

## Firma

Checklist listo para usar pre-campañas. Mantener este doc committed + actualizar con cada ronda de testing (agregar hallazgos como "incidents of session {fecha}" al final).
