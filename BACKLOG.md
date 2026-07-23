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

- **Higiene de pickers F1 + F2 (SolicitarAgendamientoModal)**: paquete de 3 mejoras conjuntas a pagar cuando se toquen los pickers de nuevo (F2.5 con advisory lock o refactor de reserva).
  1. `AbortController` en refetch inline post-rebote `23P01`. Hoy el `fetch(...)` que refetche `/slots` (F1) o `/disponibilidad-noches` (F2) tras la exclusion_violation no tiene signal — puede setState en componente desmontado + race con el fetch del effect si el usuario navega meses en la ventana. Impacto real: React warning + posible sobrescritura de mapa por milésimas. F1 tampoco lo tiene (patrón consistente); se paga junto.
  2. Limpieza de map stale al reopen del modal. `reset()` preserva `pickerEstDiasMap` + `pickerEstConfig` intencionalmente (evita re-fetch entre reopens rápidos), pero el primer render post-reopen muestra el mapa de la sesión anterior por 200-500ms hasta que el fetch responde. Si otro tutor reservó entre cierre y reapertura, el usuario ve un día como libre que ya no lo está. F1 lo maneja igual (resetea `pickerSlots` implícitamente al setear `pickerDesde`); alinear ambos con skeleton mientras `loading && (mapa previo || vacío)`.
  3. Días fuera de la ventana de fetch tratados como disponibles al completar rango. `isDiaDisabledEst` y la iteración `excludeDisabled` manual retornan `false` cuando la fecha no está en `pickerEstDiasMap` (mes visible + siguiente). Un tutor que arranca rango en julio, navega a septiembre y cierra el rango allí tiene días intermedios (agosto) no gateados client-side — el server EXCLUDE los rechaza con `23P01` + copy amable ("acaba de ocuparse"), pero es engañoso porque no fue una race real, fue una validación fría. Opciones: tratar `undefined` como disabled al completar rango (fuerza al usuario a navegar a las fechas intermedias antes de seleccionar), o refetchar la ventana completa `[from, to]` antes de validar. Detectado en code-review de F2-3-C (score 70, bajo threshold, deuda consciente).
- **Nitpicks picker F2 (SolicitarAgendamientoModal, F2-3-C)**: 3 issues menores del mismo tren, a pagar cuando toque el picker.
  1. Comentario dice `numberOfMonths=2` pero el render usa `1`. El fetch mensual sí trae mes + siguiente (prefetch para navegación snappy). Actualizar el comentario para reflejar la realidad, o bumpear a `numberOfMonths=2` en desktop (mobile mantiene 1 por espacio).
  2. Sin hint visual de carga al cambiar de mes. F1 muestra skeleton durante `pickerLoading`; F2 mantiene los días previos visibles (continuidad visual pero sin señal de "cargando"). Alinear con F1 o mostrar un spinner discreto.
  3. `fromDate={new Date()}` usa TZ del browser. Un tutor en TZ occidental (ej. viaje) podría ver "hoy" clickeable siendo ya "ayer" en Chile. Server lo marca `pasado` via el endpoint, pero es cosmético mejorable: usar `chileMidnightUtc(localTodayIso())`.
  4. `ReservaConfirmadaTutorEmail` dice "Elegiste un horario disponible en su agenda — no hace falta esperar respuesta." incluso para reservas F2 (`esRango=true`) donde el mental model es "noches", no "horario". Detectado en el smoke S3 (2 reservas 10-12 sep + 16-18 sep). Fix: cuando `esRango`, cambiar a "Elegiste las noches disponibles en su agenda — no hace falta esperar respuesta.". Vive en [components/Emails/ReservaConfirmadaTutorEmail.tsx](components/Emails/ReservaConfirmadaTutorEmail.tsx).

## Sistema visual (referencia — YA COMPLETADO)

- **Rollout de color v2**: emerald → accent (marca). Completo en prod.
- **Sprint de tokens semánticos**: estados → `success` (emerald) / `danger` (red) / `warning` (amber) / `info` (blue). Completo en prod.
- **Dos capas**:
  - Marca: `accent` (#22C55E) / `deep` (#134E4A).
  - Estado: tokens semánticos.
