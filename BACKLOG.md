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

## Sistema visual (referencia — YA COMPLETADO)

- **Rollout de color v2**: emerald → accent (marca). Completo en prod.
- **Sprint de tokens semánticos**: estados → `success` (emerald) / `danger` (red) / `warning` (amber) / `info` (blue). Completo en prod.
- **Dos capas**:
  - Marca: `accent` (#22C55E) / `deep` (#134E4A).
  - Estado: tokens semánticos.
