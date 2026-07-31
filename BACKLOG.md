# Pawnecta — Backlog

## Producto (features nuevas)

### Retratos de Mascotas — CERRADA EN PROD
- Categoría "Retratos de Mascotas" (slug `retratos`, ícono Lucide `Palette`) publicada en prod.
- Entrada en `lib/camposPorCategoria.ts` con campos de encargo (tecnica, plazo_entrega, formatos, desde_foto, modalidad_entrega, portfolio_url, inclusiones artísticas). CHECK constraint de `unidad_precio` ampliado con `'por obra'`. Demo servicio colgado del proveedor Patricia.
- Consumo actualizado: SearchBar, SidebarFiltros (icono), register wizard, [categoria] getStaticPaths (SEO `/retratos`).

### Fichas de mascotas del tutor — IMPLEMENTADA (parcial)
- El tutor crea perfiles de sus mascotas (nombre, especie, raza, edad, tamaño, condiciones) y los adjunta a solicitudes de servicio.
- Objetivo: apropiación (engagement del tutor) + comunicación (el proveedor tiene contexto sin preguntar).
- ✅ **Hecho**:
  - Selector opcional de mascota en `SolicitarAgendamientoModal` (Forma B: asocia `mascota_id` real, fallback a texto libre cuando el tutor no tiene ficha o eligió "Otra").
  - Persistencia del `mascota_id` en `agendamientos` (migration `20260707_agendamientos_mascota.sql` — agrega `mascota_id` FK a `mascotas` + `tipo_mascota_texto` fallback, ambos NULLABLE).
  - Ficha completa visible al proveedor en su panel de solicitudes (`/proveedor` tab Solicitudes), con join a `mascotas` (nombre, tipo, raza, sexo, edad calculada, foto, condiciones médicas, trato especial).
  - Cero regresión en solicitudes sin ficha (retrocompat total: si `mascota_id` y `tipo_mascota_texto` son null, la tarjeta no se renderiza).
- ⏳ **Pendiente**:
  - CRUD de mascotas en panel tutor (`/usuario/mascotas` — hoy es placeholder que va a 404; el CTA "Agregar una mascota" del modal linkea acá).
  - Referencia compacta de la mascota en el chat — **bloqueada**: las conversaciones no se vinculan a agendamientos, así que no se puede inferir con certeza cuál mascota corresponde a un hilo (ver proyecto "Vincular conversaciones a agendamientos" abajo).
  - Decisión pendiente: ficha obligatoria u opcional al solicitar servicio (hoy es opcional).
  - **Procesamiento de imagen al subir foto de mascota**:
    - (a) **Cropper interactivo** estilo LinkedIn / Instagram al subir foto principal (y opcionalmente cada foto de galería). `react-easy-crop` o similar — el usuario ajusta el encuadre al marco (aspect fijo `4/5`) antes de que la imagen llegue al bucket. Hoy el crop lo hace CSS con `object-cover object-center` — funciona para most cases pero si el sujeto no está centrado en la foto original queda mal encuadrado.
    - (b) **Compresión client-side pre-upload**: hoy las fotos suben sin compresión hasta el cap de 5 MB. Resize a ~1600px lado mayor + calidad JPEG ~80% via canvas API antes de llamar a `subirFotoAStorage` reduce transferencia + storage sin pérdida visible. Bibliotecas candidatas: `browser-image-compression` (~14 kB) o inline con `<canvas>`.
    - Ambos aplican a foto principal y galería de mascotas. Extender también al patrón vivo de upload de fotos de proveedores (`avatars` y `servicios-fotos`) es el mismo esfuerzo — si se hace, ideal extraerlo a un helper compartido.

### Categoría: Etología
- Etólogo / especialista en conducta animal, distinta de adiestramiento.
- Mismo camino de categoría nueva (`camposPorCategoria.ts` + tabla + ícono + demo).
- Decisión pendiente: cómo diferenciarla de adiestramiento.

### Catálogo de categorías futuras (roadmap producto)
Orden por prioridad estimada; cada una entra por el mismo camino (`camposPorCategoria.ts` + INSERT en `categorias_servicio` + ícono + demo + opcionalmente flag de modalidad).
1. **Asesoría veterinaria online** — PRIORITARIA. Consulta remota por video/chat, sin desplazamiento. Habilitada por el proyecto "categorías por modalidad" (remota pura).
2. **Nutrición animal** — planes alimenticios personalizados. Puede ser presencial o remota (mixta).
3. **Fisioterapia veterinaria** — rehabilitación motora, generalmente presencial.
4. **Hotel felino** — hospedaje especializado en gatos, presencial (recinto).
5. **Visitas de medicación** — administración de tratamientos a domicilio, presencial.
6. **Entrenamiento deportivo** — agility, canicross, deportes caninos, presencial.
7. **Servicios funerarios** — cremación, entierro, memoriales para mascotas. Presencial o mixto según proveedor.

## Proyectos estructurales

### Categorías por modalidad (presencial / remoto / mixto)
- Descubierto en el sprint de Retratos: la ficha + wizard asumen presencialidad (comunas de cobertura obligatorias, disponibilidad horaria, "fotos del espacio"). Retratos es asincrónico y remoto → varias secciones no aplicaban. Fix mínimo interino: ocultar secciones sin contenido (aplicado). Fix estructural: modelar modalidad.
- **Diseño esbozado**:
  - Flag `modalidad_default: 'presencial' | 'remoto' | 'mixto'` a nivel categoría en `lib/camposPorCategoria.ts` (record hermano de `CAMPOS_POR_CATEGORIA`).
  - Categorías **mixtas** (ej. peluquería que ofrece local + domicilio, nutrición presencial + online): refinamiento per-servicio en `servicios_publicados` (columna `modalidad_efectiva` o similar). El proveedor elige al publicar; overrides el default de la categoría solo dentro del rango permitido.
  - Categorías **presenciales puras** (paseos, hotel felino): sin override, wizard pide comunas/disponibilidad como hoy.
  - Categorías **remotas puras** (retratos, asesoría veterinaria online, ilustración digital): sin comunas obligatorias, sin disponibilidad horaria en wizard, ficha oculta secciones de cobertura y "fotos del espacio", CTA de agendamiento cambia de fecha+hora a "solicitar encargo" (sin V1 puntual).
  - **Habilita categorías remotas futuras** — bloqueante para asesoría veterinaria online, nutrición remota, cualquier servicio de consulta digital.
- **Fricción concreta que resuelve** (documentada al descubrir Retratos):
  - Wizard: `comunas_cobertura` es required (`if (comunasCobertura.length === 0) return toast.error(...)`) — bloquea publicar servicio remoto.
  - Wizard: sección "Disponibilidad" semanal L-D con 7 switches + 14 inputs — ruido visual para servicios asincrónicos.
  - Ficha: "Zona de cobertura", "Disponibilidad", "Fotos del espacio" son genéricas, sin condicional por categoría (el fix interino solo oculta cuando la data está vacía, no cuando la categoría no aplica).
- **Alternativa considerada** (descartada por deuda a mediano plazo): Set explícito `CATEGORIAS_ASINCRONICAS` paralelo a `CATEGORIAS_MULTI_DIA`. Simple pero no modela categorías mixtas. Bien como stepping stone si urge — migrar Set → record es mecánico.

### Modo request-to-book en la agenda (F1.5+ candidato, condicional)
- **Solo implementar si proveedores reales lo piden — no especulativo.** Hoy los servicios F1 tienen dos modos: (a) sin agenda (`duracion_slot_min` NULL, flujo viejo pedir-fecha-a-ciegas), (b) instant-book (agenda activa, la reserva nace `confirmada` desde el picker). Faltaría un tercer modo intermedio estilo Airbnb: el tutor VE los slots reales de la agenda pero la reserva nace `pendiente` y requiere aprobación del proveedor. Da control total al proveedor sin perder visibilidad de horarios reales.
- **Requeriría**:
  - Tercer valor del toggle en el editor: `off / agenda-con-aprobación / agenda-automática`. Nueva columna `modo_reserva text` en `servicios_publicados` (o boolean `requiere_aprobacion`) — el toggle actual es solo `duracion_slot_min IS NULL/NOT NULL`.
  - Picker del tutor: mismo strip días + grid slots, pero al elegir slot el INSERT nace `estado='pendiente'` con `duracion_min` y `capacidad_snapshot` poblados. Copy: "Solicitar reserva" en vez de "Confirmar reserva". Toast: "Solicitud enviada. El proveedor responde en X horas".
  - **Decisión de producto pendiente — ¿hold del slot?** Dos alternativas:
    - **Hold optimista** (más simple): el slot NO se retiene mientras espera; otros tutores pueden solicitarlo o reservarlo mientras la primera está `pendiente`. Si el proveedor confirma dos simultáneas, hay conflicto — el EXCLUDE constraint las rechaza al confirmar (una gana). Rechazo natural, pero UX rota para la que pierde.
    - **Hold pesimista** (más complejo): el slot se retiene mientras la solicitud está `pendiente` (durante N horas), otros tutores lo ven ocupado. Necesita ampliar el `WHERE` del EXCLUDE constraint (o segundo EXCLUDE con `estado='pendiente'`) y una expiración automática del hold via cron si el proveedor no responde. Más justo para el tutor pero agrega complejidad de expiración.
- **Coexistencia con instant-book**: el mismo proveedor podría tener servicios con distinto modo (paseo grupal instant-book, sesión de peluquería con aprobación). Un servicio se compromete a un solo modo — no mezclar en la misma reserva.
- **Notificaciones**: reusar `notify-proveedor` con nuevo branching (subject "Nueva solicitud con horario elegido"), y `notify-tutor` al confirmar/rechazar. Emails ya diferencian estado — extensión menor.
- **Trigger para implementar**: dos o más proveedores lo piden explícitamente (no una impresión general), o Aldo detecta que la fricción del instant-book está frenando adopción del sistema de agenda.

### Roadmap producto (Doctoralia-style)
Camino largo hacia una experiencia tipo Doctoralia (o Booksy, Wag!). Secuencia sugerida por dependencias:
1. **Reseñas automáticas post-servicio** — email + push al tutor N horas/días después del agendamiento marcado como completado. Boost del social proof + señal para el ranking.
2. **Agenda con disponibilidad real** — construcción propia (no Calendly/Google embed). El proveedor bloquea rangos, la disponibilidad publicada refleja slots reales. Bloquea el hardcode actual de disponibilidad JSONB.
3. **Recordatorios** — 24h + 1h antes del servicio, al tutor y al proveedor. Push + email + SMS opcional. Reduce no-shows.
4. **Pagos** — Transbank Webpay para tarjetas locales, opcional Stripe para internacional. Habilita comisión de plataforma. Cambia la propuesta de valor (hoy "directorio" → mañana "marketplace").
5. **Video-consulta** — habilita categorías remotas puras (asesoría veterinaria online, nutrición remota). Depende de "categorías por modalidad" para modelar el servicio como remoto.

### Vincular conversaciones a agendamientos

### Hero rotativo del home
- El hero de `pages/index.tsx` es estático (un mensaje + un CTA + una imagen). Rotar mensajes/CTAs para probar variantes de copy, destacar categorías nuevas (retratos, futuras) o promociones estacionales.
- Camino corto: componente `HeroRotator` con array de slides + auto-rotate cada N segundos + indicadores dot navegables. Sin dependencias externas.
- Camino largo: variantes A/B con tracking en `contactos` o tabla nueva para medir CTR por copy.

### Vincular conversaciones a agendamientos
- Hoy las conversaciones del chat son genéricas (tutor↔proveedor), sin atarse a una solicitud puntual. Eso bloquea mostrar la mascota correcta en el chat (un tutor con varias solicitudes → no se sabe cuál mascota va en el hilo).
- Cambio: agregar `agendamiento_id` a la tabla `conversations`.
- Habilita: chip de mascota en el chat (cierra la feature de mascotas) + modelo de chat más rico (poder mostrar contexto del agendamiento en el header del hilo).
- Decisiones pendientes:
  - **Modelo**: ¿un hilo por agendamiento (múltiples chats entre el mismo par tutor↔proveedor si hay varias solicitudes), o una conversación con "agendamiento activo" (un hilo persistente por par, el `agendamiento_id` apunta al más reciente)?
  - **Migración de datos**: las conversaciones existentes en prod → ¿quedan huérfanas (`agendamiento_id = null`), se migran por heurística (el agendamiento más reciente del mismo par tutor+servicio), o se archivan?
- Es un proyecto con schema + migración de datos + refactor del flujo de creación de conversation en `ServiceDetailView`, NO un ajuste menor.

## Deuda técnica / pulido

- **Copy de emails de confirmación de reserva por horas — retrofit visual COMPLETO** (pedido de PO, 2026-07-28; ampliación R4.1 layout de listado 2026-07-28; ampliación R4.2 dirección de arte 2026-07-28). Los emails de confirmación (F1/F2/legacy) adoptan el mismo lenguaje visual que `RecordatorioReservaEmail` en 3 capas:
  1. **Formato horario**: bloque legible tipo `"de 14:00 a 15:00 · 1 hora"`. Helpers ya existentes en `lib/formatFecha.ts`: `formatBloqueHorario`, `formatBloqueHorarioSinFecha`, `formatHoraCorta`, `formatFechaSinHora`, `formatRangoNochesPartes` (probados con 66 casos verdes en `lib/formatFecha.test.ts`).
  2. **Layout de listado etiqueta/valor**: orden fijo — Proveedor (tutor) / Cliente (proveedor) · Servicio · Hora/Horario (u bloque check-in/out F2) · Dónde. Etiquetas 11px uppercase slate-500 letter-spacing 0.5px; valores 15-16px slate-900 con peso 600 en Hora y Dónde. Separadores hairline `#E2E8F0`. Sin fondo gris — card blanca. La fila "Dónde" usa la cascada canónica: `formatDireccionLinea` → primera comuna → fallback `"Se coordina por chat con {nombre}"`.
  3. **Dirección de arte (R4.2)**: card con borde IZQUIERDO 4px accent-600 + border 1px slate-200 + radius 10px. **Fecha protagonista**: fila "Fecha" sale del listado y va como banda full-width `accent-50` al tope, fecha 20px bold deep-900 centrada, sub-línea "(N noches)" 13px slate-600 para rango. **Pill "MAÑANA"** sobre la banda (accent-600 bg, blanco, 11px uppercase letter-spacing 0.12em). Todo email-safe: tablas + inline styles, sin flex/SVG/fuentes custom.

  **Mapa semántico de la banda de fecha por tipo de email (decisión PO 2026-07-28)**: la banda y su pill son parte del lenguaje visual y comunican intención, no adorno.
  - **RECORDATORIO** (`RecordatorioReservaEmail`): banda `accent-50` + pill `MAÑANA` (accent-600 bg, blanco). Urgencia positiva — "es mañana, prepárate".
  - **CONFIRMACIÓN** (`ReservaConfirmadaTutorEmail`, `AgendamientoTutorEmail` branch confirmada, `AgendamientoProveedorEmail` branch `esConfirmadaAuto`): banda `accent-50` **sin pill**. Celebración — "quedó agendada".
  - **CANCELACIÓN** (`AgendamientoCancelacionTutorEmail` + equivalente proveedor si existe): banda **neutra `slate-100`**, sin pill, fecha como dato histórico. Pintar de verde una fecha cancelada sería contradictorio con el mensaje.

  Templates afectados: `ReservaConfirmadaTutorEmail`, `AgendamientoTutorEmail` (branch `estado='confirmada'`), `AgendamientoProveedorEmail` (branch `esConfirmadaAuto`), `AgendamientoCancelacionTutorEmail`, y el equivalente proveedor si existe. `RecordatorioReservaEmail` (R4.2) es la referencia canónica del layout + tipografía + card + border-left; el mapa semántico de banda/pill se aplica por template según su tipo. Testing: render-diff no-regresión F1/F2 con `scripts/render-emails-diff.ts` (23 sets: 16 previos + 7 recordatorio). Sprint chico post-launch.
- **Instrumentar `/api/cron/recordatorio-reserva` para diagnóstico de drift de idempotencia** (observado en R6). La suite R6 originalmente ejecutaba la 2ª corrida como `real` (no dryRun) y verificaba con un ancla temporal `preRun2Ms` que ninguna marca fuera reescrita durante esa 2ª corrida. Observación consistente: la marca `recordatorio_tutor_enviado_at` del agendamiento F1 test aparece con timestamp ~200-400ms tras `preRun2Ms` — solo la del tutor, solo del F1, en ambos intentos (retry #1 también falla). Serialización cross-describe descartó race intra-suite.

  **Diagnóstico 5-min (2026-07-30)**: hipótesis principal "await faltante / res.json prematuro" **DESCARTADA** tras lectura estructural + verificación BD via MCP staging:
  1. Cada task del batch tiene `await resend.emails.send`, `await supabaseAdmin.from('notifications').insert`, `await supabaseAdmin.from('agendamientos').update({...}).eq(...)` — todos awaited en secuencia dentro del try.
  2. `await Promise.allSettled(tasks)` awaited al final de cada sub-batch (línea 400).
  3. El loop `for (let i = 0; i < elegibles.length; i += SUB_BATCH)` es secuencial — cada sub-batch se resuelve antes del siguiente.
  4. `return res.status(200).json(...)` sale tras el loop entero, no dentro.
  5. Supabase-js `.update().eq()` awaited espera respuesta HTTP de PostgREST, que retorna post-COMMIT (PostgREST usa transaction sync). No hay fire-and-forget.
  6. MCP staging: `SELECT ... FROM information_schema.triggers WHERE event_object_table='agendamientos'` = `[]` (cero triggers). Descarta trigger invisible.
  7. MCP staging: `recordatorio_tutor_enviado_at` y `recordatorio_proveedor_enviado_at` sin column_default (`NULL`). Solo cambian por UPDATE explícito.

  Todos los updates están estructuralmente correctos. El código NO tiene el bug hipotetizado. La drift observada requiere otro mecanismo.

  **Siguientes sospechosos, en orden de probabilidad**:
  1. **Lag entre `await update()` y visibilidad del COMMIT en un SELECT posterior via connection pooler distinta** — improbable en Supabase managed (PostgREST + PgBouncer transaction mode debería ser read-after-write consistent, pero podría haber cases raros).
  2. **`.or('tutor.is.null,proveedor.is.null')` de PostgREST parseando distinto de lo esperado bajo alguna condición** — improbable, sintaxis estándar.
  3. **Race que aún no visto entre el mismo endpoint call procesando la misma fila dos veces** (bug de refino) — improbable, `for (const c of candidatos)` es serial.
  4. **Timestamp del UPDATE evaluado dos veces por algún artifact de Supabase-js retry lógica** — improbable, tests no muestran retry logs.

  **Deuda de instrumentación**: agregar `?verbose=1` al endpoint que retorne `elegibles[].id`, `necesitaTutor`, `necesitaProveedor` + timestamps de cada UPDATE ejecutado. Correr contra los 3 ids test en la 2ª corrida. Si el elegibles.length > 0 con nuestros ids → confirmar mecanismo #2 o #3. Si elegibles.length = 0 pero marca sigue moviéndose → confirmar mecanismo #1. Sprint chico post-launch — no bloqueante (el core de idempotencia sí se prueba vía dryRun; la drift real solo se manifiesta con `real` en el intervalo entre corridas del test — no en producción, donde las corridas están separadas por 24h).
- **[P3 UX producto] Íconos específicos por campo en "Información del servicio" (`camposPorCategoria`)**. Detectado en el smoke S2 del tren N15 (2026-07-31): los campos dinámicos de la sección "Información del servicio" del `/servicio/[id]` renderean todos con el mismo placeholder `···` (SVG inline de 3 círculos horizontales) — pre-existente, no regresión del bump. Ver [components/Servicio/ServiceDetailView.tsx:1102-1104](components/Servicio/ServiceDetailView.tsx#L1102-L1104): el `renderCampoCard` usa un SVG genérico para todos los campos no-boolean (los boolean sí tienen checkmark). Fix natural: agregar campo `icon` a la definición de cada entrada en `lib/camposPorCategoria.ts` (probablemente un `LucideIcon`) y consumirlo en `renderCampoCard`, con fallback al `···` actual. Cada campo puede tener el ícono semánticamente correcto (peso → `Scale`, edad → `Cake`, distancia → `MapPin`, etc.). Sprint chico post-merge N15 o cuando toque revisar la ficha de servicio.

- **[P3, refactor guarda anti-prod Playwright] Migrar `assertBaseUrlIsStaging` de whitelist de hosts (`git-staging` / `staging` / `git-next15`) a deny-list de hosts prod (`pawnecta.com` / `www.pawnecta.com`)**. La whitelist actual necesita mantenimiento cada vez que corremos la suite contra un preview de una rama nueva (durante N5 del tren N15, 2026-07-30, se agregó `git-next15` con nota de remoción en el checklist N7 Fase 0). La opción B invertida — negar solo los hosts prod y aceptar cualquier otro `*.vercel.app` del proyecto — es conceptualmente más correcta: cero mantenimiento por-rama, misma protección estricta contra correr contra prod. No se mezcla con el tren N15 para no cambiar el modelo de la guarda mientras se ejecuta un tren que la usa. Sprint chico post-tren N15.

- **[P3, post-tren N15] Endurecer `images.remotePatterns` — scopear hosts Supabase a `/storage/v1/**`**. En N2 del tren N15 (2026-07-30) migramos `images.domains` → `images.remotePatterns` manteniendo paridad exacta (`pathname: '/**'`) para no romper nada. La mejora incremental es acotar `pathname` en los 2 hosts Supabase (`vubmjguwzpesxcgenkxo.supabase.co`, `pwhplhjkmmbgnphcoibh.supabase.co`) a `/storage/v1/object/public/**` (o el prefijo real que usa `getPublicUrl()`), impidiendo que el `next/image` proxy sirva rutas arbitrarias de Supabase Storage aunque un attacker las conociera. Cero impacto en runtime si el scope es correcto — verificar con smoke antes de mergear. Sprint chico post-tren N15.

- **Errores de formulario fuera de viewport (UX)**: en `/register`, los errores de validación (ej. "La contraseña debe tener al menos 8 caracteres") se renderizan en un banner ARRIBA del formulario. En un form largo, el usuario está scrolleado abajo (cerca del botón "Crear Cuenta") cuando lo submitea — el banner de error queda fuera del viewport y el form parece no responder. Fix: mostrar el error inline junto al campo que falla, y/o scrollear automáticamente al banner al fallar el submit (`banner.scrollIntoView({ behavior: 'smooth', block: 'center' })`). Detectado en `/register` registrando cuenta de prueba. Auditar el mismo patrón en otros forms largos: registro proveedor (wizard multi-paso), wizard de publicación de servicio (`ServiceFormModal`).
- **ProveedorCard**: paridad de layout con ServiceCard (title `min-h`, aspect ratio, rating overlay).
- **Typography del blog**: las clases `prose-*` son no-op (falta `@tailwindcss/typography`). Decidir: instalar plugin (blog gana tipografía) o borrar el config muerto de `blog/[slug].tsx`.
- **Styleguide rewrite**: `pages/styleguide.tsx` documenta el sistema viejo (emerald). Reescribir para el sistema visual v3: capa marca (accent/deep) + capa estado (success/danger/warning/info).
- **UI_STANDARDS.md**: línea stale con `ring-emerald-500`, actualizar a accent/success.
- **Token `notification`**: los dots de no-leído usan `danger` por unificación de paleta. Si se quiere separarlos del rojo de error, crear token `notification` (alias de red) y migrar `UnreadBadge` + `NotificationBell`.
- **Upload de foto de mascota**: la columna `mascotas.foto_mascota` existe en el schema, y el CRUD ya muestra la foto en la card del listado + en el modal (read-only) + en la ficha rica del proveedor. Falta implementar el componente de UPLOAD desde el CRUD del tutor (input file + upload al bucket `avatars` con path `mascotas/{user_id}/{timestamp}.{ext}` + persistencia en `foto_mascota`). Patrón a reusar: [pages/proveedor/index.tsx `uploadAvatar` L560-565](pages/proveedor/index.tsx#L560-L565). `PhotoUploader` fue borrado como dead code — no rehacer, hacer inline (~25 líneas) o extraer si se agrega también upload de galería (`fotos_galeria text[]` también existe en schema, no explotada).
- **Drift cosmético de nombres de políticas RLS en tabla `mascotas`**: staging y prod tienen políticas semánticamente idénticas con nombres distintos (staging: `Mascotas Modification` / `Mascotas Visibility` / `Mascotas Proveedor via Agendamientos`; prod: `Usuarios pueden crear/ver/actualizar/eliminar sus propias mascotas` + `proveedor_select_mascotas_de_solicitudes` + `Admins can view ALL pets` que solo existe en prod). Sin impacto funcional (mismas cláusulas `USING`, mismos permisos efectivos). Unificar nombres si algún día se hace re-sync de staging con prod.
- **Columna huérfana `proveedores.datos_especificos`**: legado del modelo un-proveedor-una-categoría (pre Sprint 4 Fase 1). Los datos categoria-específicos viven ahora en `servicios_publicados.detalles` per-servicio. La columna quedó viva en el schema desde el rename `DatosEspecificosForm → ServicioDetallesForm` (commit `8d8ded8`), esperando decisión. Pendiente:
  1. Verificar que NADA la lee — grep exhaustivo del código + inventario de RPCs en Supabase (`buscar_servicios`, etc.). Si el resultado es cero lecturas, `ALTER TABLE proveedores DROP COLUMN datos_especificos`.
  2. Si hay lecturas residuales pero cero writes desde el frontend (ya se sacaron), evaluar migrar los residuos por proveedor a alguno de sus servicios (heurística: si el proveedor tiene un solo servicio, mergear el blob viejo en `servicios_publicados.detalles` sin sobrescribir keys ya presentes) o descartar los residuos si son irrelevantes.

- **Watchdog cross-tab en submit F2 (SolicitarAgendamientoModal)**: hoy el submit del picker F2 llama `supabase.auth.getSession()` como primer paso — esa llamada toma el lock cross-tab de gotrue-js. Si otra pestaña del mismo usuario está en medio de un `refreshSession()` (token por expirar), el segundo `getSession()` se queda esperando el lock sin timeout. Observado en el smoke S4 de F2-3-C: pestaña 2 colgada pre-INSERT, nunca llegó a disparar el EXCLUDE — el POST no se emitió. El EXCLUDE server sigue siendo la red final (si dos INSERTs concurrentes SÍ llegaran, uno rebota 23P01), pero la UX de la pestaña colgada es horrible: sin indicación de por qué el submit se congeló. Fix: `Promise.race` contra timeout 15s en el submit F2, mismo patrón que `ServiceFormModal:747` (post-smoke Aldo del wizard proveedor). Copy del timeout: idéntico al F1 existente ("El guardado tardó demasiado. Verifica tu conexión y vuelve a intentar."). Aplicable también al submit F1 picker (mismo flow `getSession() → INSERT`, mismo riesgo teórico aunque no observado). Cuando se pague el ítem "Higiene de pickers F1+F2" arriba, incluir ambos watchdogs.
- **Higiene de pickers F1 + F2 (SolicitarAgendamientoModal)**: paquete de 3 mejoras conjuntas a pagar cuando se toquen los pickers de nuevo (F2.5 con advisory lock o refactor de reserva).
  1. `AbortController` en refetch inline post-rebote `23P01`. Hoy el `fetch(...)` que refetche `/slots` (F1) o `/disponibilidad-noches` (F2) tras la exclusion_violation no tiene signal — puede setState en componente desmontado + race con el fetch del effect si el usuario navega meses en la ventana. Impacto real: React warning + posible sobrescritura de mapa por milésimas. F1 tampoco lo tiene (patrón consistente); se paga junto.
  2. Limpieza de map stale al reopen del modal. `reset()` preserva `pickerEstDiasMap` + `pickerEstConfig` intencionalmente (evita re-fetch entre reopens rápidos), pero el primer render post-reopen muestra el mapa de la sesión anterior por 200-500ms hasta que el fetch responde. Si otro tutor reservó entre cierre y reapertura, el usuario ve un día como libre que ya no lo está. F1 lo maneja igual (resetea `pickerSlots` implícitamente al setear `pickerDesde`); alinear ambos con skeleton mientras `loading && (mapa previo || vacío)`.
  3. Días fuera de la ventana de fetch tratados como disponibles al completar rango. `isDiaDisabledEst` y la iteración `excludeDisabled` manual retornan `false` cuando la fecha no está en `pickerEstDiasMap` (mes visible + siguiente). Un tutor que arranca rango en julio, navega a septiembre y cierra el rango allí tiene días intermedios (agosto) no gateados client-side — el server EXCLUDE los rechaza con `23P01` + copy amable ("acaba de ocuparse"), pero es engañoso porque no fue una race real, fue una validación fría. Opciones: tratar `undefined` como disabled al completar rango (fuerza al usuario a navegar a las fechas intermedias antes de seleccionar), o refetchar la ventana completa `[from, to]` antes de validar. Detectado en code-review de F2-3-C (score 70, bajo threshold, deuda consciente).
- **Nitpicks picker F2 (SolicitarAgendamientoModal, F2-3-C)**: 3 issues menores del mismo tren, a pagar cuando toque el picker.
  1. Comentario dice `numberOfMonths=2` pero el render usa `1`. El fetch mensual sí trae mes + siguiente (prefetch para navegación snappy). Actualizar el comentario para reflejar la realidad, o bumpear a `numberOfMonths=2` en desktop (mobile mantiene 1 por espacio).
  2. Sin hint visual de carga al cambiar de mes. F1 muestra skeleton durante `pickerLoading`; F2 mantiene los días previos visibles (continuidad visual pero sin señal de "cargando"). Alinear con F1 o mostrar un spinner discreto.
  3. `fromDate={new Date()}` usa TZ del browser. Un tutor en TZ occidental (ej. viaje) podría ver "hoy" clickeable siendo ya "ayer" en Chile. Server lo marca `pasado` via el endpoint, pero es cosmético mejorable: usar `chileMidnightUtc(localTodayIso())`.

- **Descartes del code-review de F2-3-D (endpoint cancelar + client)**: 7 findings ≥40 pero <80 que quedan documentados. Todos ya cubiertos por defensa en profundidad (RLS post-migration + validación server autoritativa) o son nitpicks. Se pagan cuando se toque el flow de cancelación de nuevo o cuando se haga sweep de higiene de endpoints agendamientos.
  1. `pages/api/agendamientos/cancelar.ts:162` retorna `details: error.message` en 500. Supabase errors pueden incluir column names, RLS hints, constraint text — leak menor de internal detail al toast del user. Fix: dropear `details` del response, log server-only. Score 75. (Review 4)
  2. `pages/api/agendamientos/cancelar.ts:86` vs `:101` — enumeration oracle entre 404 "Reserva no encontrada" y 403 "No autorizado". Distinguibles → un caller podría probar existencia de ids ajenos. Bajo impacto real (UUIDs unguessable). Fix: unificar ambos a 404. Score 40. (Review 4)
  3. `pages/api/agendamientos/cancelar.ts:47` usa `emailLimiter` (3/60s por IP+URL) en un endpoint de mutación no-email. Bucket angosto — un household NAT'd o rage-click hitea. Fix: `apiLimiter` (30/60s) o un `mutationLimiter` nuevo. Score 55. Patrón heredado de siblings notify-* (deuda transversal). (Reviews 2, 3, 4)
  4. `pages/api/agendamientos/cancelar.ts:96-100` loguea `callerUserId: userId` full sin mask, cuando el siguiente log (línea 155) sí lo enmascara a 8 chars. Además el sibling `notify-proveedor.ts:42` usa `callerId` en vez de `callerUserId`. Fix: alinear naming + masking. Score 60. (Reviews 3, 4)
  5. `pages/api/agendamientos/cancelar.ts` no tiene log "recibido" simétrico al de `notify-proveedor.ts:40-43`. Traceo peor en Vercel logs. Fix: agregar `console.log('[cancelar] recibido', { agendamientoId, callerId: userId.slice(0, 8) + '…' })` post-parse. Score 40. (Review 3)
  6. `pages/mis-solicitudes.tsx:381-387` — `puedeCancelarPorVentana` computa `Date.now()` en render y NO es reactivo al tiempo. Tab abierta a través del boundary muestra botón enabled forever; server rechaza con copy amable pero UX diverge. Fix: `useEffect` con `setInterval(60_000)` cerca del boundary, o un tick global de 1 min. Score 50. (Reviews 2, 5)
  7. `pages/mis-solicitudes.tsx` — `title` en `<button disabled>` no dispatch pointer events en Firefox y algunos Safari; el tooltip `tooltipVentanaCerrada` puede no aparecer. Fix: wrap el botón en `<span title={...}>` o usar `aria-disabled` + click-swallow. Score 60. (Review 5)
  8. `pages/mis-solicitudes.tsx:169` cierra el dialog en cualquier `!res.ok`; para 5xx (transient) el user tiene que re-localizar la row y re-abrir. Fix: cerrar solo en 4xx, dejar abierto en 5xx. Score 55. (Review 5)
  9. `pages/mis-solicitudes.tsx:532` — bloque `esConfirmadaAuto` dice "Elegiste un horario disponible" para F1 y F2. Para F2 (noches) es inconsistente con el copy F2 del dialog y del email. Fix: branch por `esReservaAgendaF2` → "Elegiste noches disponibles". Score 70. Alinear junto con el nitpick #4 del email arriba.

## Radar de plugins / MCPs (con gatillo definido, no instalar antes)

Herramientas que agregan valor real cuando llegue su gatillo. Instalar antes es distracción. Todos comparten la convención: cero instalación hasta que dispare la condición.

- **Plugin `Design`** (crítica UX + accesibilidad + UX writing) — **GATILLO**: cierre de F2-3-E. Broche de F2 ANTES del merge a prod. Auditoría objetivo: (a) accesibilidad — contraste WCAG, foco de teclado navegable en el picker de rango, labels/aria en inputs de blackouts, tab order en el modal del tutor. (b) UX crítica del flujo completo — reserva de estadía por Camila desde ficha → picker → confirmación → email → cancelación con ventana; editor de blackouts F2-2B; formularios que expusimos en F2-3-D (dialog de cancelación con copy diferenciado F1/F2). Output esperado: hallazgos priorizables, mismo formato que el code-review (score + descartes justificados).
- **Plugin `Frontend Design`** (generación de UI) — **GATILLO**: cuando se ataque alguno de los ítems visuales del backlog (`Styleguide rewrite`, bottom nav móvil si aparece, `Hero rotativo del home`). Condición de uso: domado con los tokens visuales existentes de Pawnecta (`accent` #22C55E / `deep` #134E4A + estados `success/danger/warning/info`) — no rediseña identidad, construye dentro de ella. Instrucción explícita: pasar el snapshot de `pages/styleguide.tsx` como input inicial cada vez que se lo use.
- **Stripe** — GATILLO: la pasarela elegida en el proyecto "Pagos" del roadmap Doctoralia-style resulta ser Stripe (no Transbank Webpay). Instalar recién con esa decisión.
- **Sentry** — GATILLO: decisión explícita de observabilidad post-F2. Alternativa considerada: Vercel Analytics + Supabase logs siguen alcanzando por ahora.

## Sistema visual (referencia — YA COMPLETADO)

- **Rollout de color v2**: emerald → accent (marca). Completo en prod.
- **Sprint de tokens semánticos**: estados → `success` (emerald) / `danger` (red) / `warning` (amber) / `info` (blue). Completo en prod.
- **Dos capas**:
  - Marca: `accent` (#22C55E) / `deep` (#134E4A).
  - Estado: tokens semánticos.
