# Auditoría del formulario de publicación de servicio + verificación de identidad

**Fecha**: 2026-11-19 · **Autor**: auditor · **Entregable urgente** pedido por PO 2026-11-19 PM (para redactar entrada de blog).
**Fuente**: [components/Proveedor/ServiceFormModal.tsx](../../components/Proveedor/ServiceFormModal.tsx) (2876 líneas) + [lib/camposPorCategoria.ts](../../lib/camposPorCategoria.ts) + [pages/proveedor/index.tsx](../../pages/proveedor/index.tsx) sección verificación.
**Estado**: refleja el código de prod a 2026-11-19 (SHA main `614674e`).

## Resumen ejecutivo

El formulario tiene **3 bloques principales + 2 modos de agenda + 1 bloque dinámico por categoría + 1 bloque de fotos + 1 bloque de verificación de identidad opcional**.

**Lo mínimo obligatorio para publicar** (12 campos):
Categoría + Título + Descripción + Precio desde + Unidad + al menos 1 mascota aceptada + Comunas de cobertura (≥1) + Disponibilidad (al menos 1 día activo) + al menos 1 foto.

El resto es opcional (apellido_m, apellido_p, precio hasta, inclusiones, políticas, tamaños, agenda avanzada F1/F2, campos dinámicos por categoría).

La **verificación de identidad** es **opcional**, no bloquea publicar ni recibir reservas. Da badge "Identidad verificada" en ficha.

## Tabla de campos — formulario de servicio

### Bloque 1 — Información básica del servicio

| Campo | Obligatorio | Tipo | Valores / Validación | Descripción |
|---|---|---|---|---|
| **Categoría** | Sí | select | 10 valores dinámicos desde BD: `adiestramiento`, `cuidado` ("Cuidado y Hospedaje"), `etologia`, `fotografia`, `guarderia`, `paseos`, `peluqueria`, `retratos`, `traslado`, `veterinario` | Sin categoría no se puede publicar. El select carga dinámico desde `categorias_servicio` — si la query falla, muestra "No pudimos cargar las categorías" + botón retry. |
| **Título** | Sí | texto | min 1, max 80 chars | Placeholder: "Ej: Hospedaje cariñoso con amplio patio". Visible en cards del catálogo + ficha. |
| **Descripción** | Sí | textarea | min **100** chars (guard L625) + max 1000 chars | Placeholder: "Describe tu servicio, qué incluye, el ambiente que ofreces...". Si tiene <100 chars, el submit se aborta con toast de error antes del PATCH. |

### Bloque 2 — Precio

| Campo | Obligatorio | Tipo | Valores / Validación | Descripción |
|---|---|---|---|---|
| **Precio desde ($)** | Sí | texto numérico | separador de miles con punto (ej. "15.000") | Precio mínimo del servicio. |
| **Precio hasta ($)** | No | texto numérico | separador de miles con punto, opcional | Rango superior opcional; sin esto las cards muestran solo "Desde $X". |
| **Unidad** | Sí (default `por noche`) | select | `por noche` · `por hora` · `por sesión` · `por paseo` · `por mes` · `por visita` · `por obra` | Cómo se cobra. Las categorías tienen defaults sugeridos pero el provider puede cambiar. |

### Bloque 3 — Disponibilidad (editor legacy) + agenda F1/F2

El form muestra **3 modos de agenda mutuamente excluyentes** (el proveedor elige uno):

#### Modo (a) — Disponibilidad simple (editor legacy, visible por default si no activa F1 ni F2)

| Campo | Obligatorio | Tipo | Valores / Validación | Descripción |
|---|---|---|---|---|
| **Disponibilidad por día** (Lun-Dom) | Sí (al menos 1 día) | toggle por día + 2 inputs time | `activo` boolean + `desde` time + `hasta` time (default 09:00-18:00) | 7 botones (Lun, Mar, ..., Dom) toggleables. Al activar un día se muestran 2 inputs time. Guardado como JSON en `servicios_publicados.disponibilidad`. El tutor ve franjas mostradas en la ficha; no agenda reservas — es declarativo. |

#### Modo (b) — Agenda F1 (bloque horario con slots, para peluquería/paseos/sesiones)

Activado con checkbox "Habilitar reservas online por slots". Al activar, oculta modo (a).

| Campo | Obligatorio (si F1 on) | Tipo | Valores / Validación | Descripción |
|---|---|---|---|---|
| **Duración del slot** | Sí | select | 15 / 30 / 45 / 60 / 90 / 120 min (varía según categoría — el sustantivo cambia "del paseo", "de la sesión", etc.) | Duración de cada slot bookable. |
| **Capacidad por slot** | Sí | number | ≥1 | Cuántos tutores pueden reservar el mismo slot. |
| **Anticipación mínima (horas)** | Sí | number | ≥0 | Cuántas horas antes del inicio debe reservarse. |
| **Ventana máxima (días)** | Sí | number | ≥1 | Cuántos días hacia el futuro puede verse el calendario. |
| **Días × franjas horarias** | Sí (al menos 1 franja) | matriz 7 × N | HH:MM–HH:MM | Configuración de slots por día: lunes 9:00-12:00, 14:00-18:00, martes ... |
| **Bloqueos de calendario** (fechas) | No | fecha + fecha_fin + motivo opcional | fechas (rango) | Vacaciones, feriados, veterinario. Max **200** chars de motivo. |

#### Modo (c) — Agenda F2 (estadía por rango de noches, para hospedaje/cuidado)

Activado con checkbox "Habilitar reservas online por noches". Al activar, oculta (a) y (b).

| Campo | Obligatorio (si F2 on) | Tipo | Valores / Validación | Descripción |
|---|---|---|---|---|
| **Capacidad de estadías simultáneas** | Sí | number | ≥1 | Cuántas estadías paralelas puedes atender. |
| **Cancelación mínima (horas antes)** | Sí | number | ≥0 (default 48) | Ventana de cancelación sin penalty para el tutor. |
| **Anticipación mínima (días)** | Sí | number | ≥0 | Cuántos días antes del check-in debe reservarse. |
| **Ventana máxima (días)** | Sí | number | ≥1 (default 366) | Hasta cuántos días en el futuro se puede reservar. |
| **Mínimo noches** | Sí (default 1) | number | ≥1 | Noches mínimas por reserva. |
| **Máximo noches** | No | number | ≥min_noches | Tope de noches por reserva (opcional). |
| **Hora check-in** | No | time | HH:MM | Hora sugerida de llegada. Si vacío, se coordina por chat. |
| **Hora check-out** | No | time | HH:MM | Hora sugerida de salida. Si vacío, se coordina por chat. |
| **Bloqueos de calendario** (fechas) | No | fecha + fecha_fin + motivo | — | Igual que F1. |

### Bloque 4 — Mascotas aceptadas

| Campo | Obligatorio | Tipo | Valores / Validación | Descripción |
|---|---|---|---|---|
| **Mascotas aceptadas** | Sí (al menos 1) | multi-toggle | `Perros` · `Gatos` · `Otras` | 3 botones toggleables. Al menos 1 debe estar activo. |
| **Tamaños aceptados** (si `Perros` está activo) | Sí (al menos 1 si perros on) | multi-toggle | `Pequeño` · `Mediano` · `Grande` | Aparece solo si el proveedor marca "Perros". Al menos 1 tamaño debe estar activo. Si marca Gatos/Otras sin Perros, los tamaños no aparecen. |

### Bloque 5 — Comunas de cobertura

| Campo | Obligatorio | Tipo | Valores / Validación | Descripción |
|---|---|---|---|---|
| **Comunas donde prestas el servicio** | Sí (al menos 1) | multi-selector con search | 345 comunas de Chile (lista completa en `lib/comunas.ts`) | Buscador con autocomplete (hasta 50 resultados por query) + chips de las seleccionadas. El tutor filtra servicios por su comuna → aparece el servicio si coincide con alguna comuna de cobertura. |

### Bloque 6 — Fotos

| Campo | Obligatorio | Tipo | Valores / Validación | Descripción |
|---|---|---|---|---|
| **Fotos del servicio** | Sí (al menos 1) | file multi | `accept="image/*"`, múltiples archivos | Se suben al bucket `servicios-fotos` de Supabase Storage. La primera foto es la cover de la card en el catálogo + hero de la ficha. Las demás aparecen como galería en la ficha. |

### Bloque 7 — Inclusiones (opcional)

Campo `detalles.inclusiones` (jsonb). Chips multi-selector con opciones predefinidas por categoría (ej. para `cuidado`: "Paseos diarios", "Comida incluida", "Agua fresca", etc.). Vacío por defecto. Opcional.

### Bloque 8 — Modalidad (opcional, solo algunas categorías)

Campo `detalles.modalidad` (jsonb array). Multi-chip: para `cuidado` y similares → `En mi casa` / `En tu casa` / `Paseos por el parque` / etc. Vacío por defecto. Opcional.

### Bloque 9 — Políticas (opcional)

Campo `politica_cancelacion` (text libre). Opcional. Max **300** chars.

### Bloque 10 — Campos dinámicos por categoría

Según la categoría, aparecen campos extra desde [lib/camposPorCategoria.ts](../../lib/camposPorCategoria.ts). Ejemplos:

- **Veterinario**: años de experiencia, especialidades, equipamiento disponible, atiende emergencias (yes/no).
- **Peluquería**: productos que usa, atiende en casa, baño medicinal.
- **Paseos**: duración típica del paseo, cantidad máxima de perros por paseo, zona preferida.
- **Adiestramiento**: metodología, años de experiencia, certificaciones.
- **Fotografía / Retratos**: estilo (natural, estudio, retrato), ubicación (exterior, estudio).
- **Etología**: años de experiencia, enfoques, tipo de consulta.
- **Guardería**: horario de recepción/entrega, actividades diarias.
- **Traslado**: tipo de vehículo, ventilación, correas incluidas.
- **Cuidado**: medidas de seguridad, tipo de vivienda, otros animales en el hogar.

Todos opcionales. Tipos variados: select, multi-select, textarea (max 300 chars), number, text. Se guardan en `servicios_publicados.detalles` como jsonb por `key` del campo.

## Flujo de activación (post-submit)

1. Submit → `UPDATE servicios_publicados` con `activo=true` (si pasa guards).
2. Sin tocar más nada, el servicio aparece inmediatamente en:
   - `/explorar` (si cumple filtros categoría + comuna del user).
   - `/<categoria>/<comuna>` landings SEO.
   - `/` home (si el ranking lo trae).
3. El tutor puede reservar desde la ficha (o solo contactar, si F1/F2 no están activos).

**Nota**: el proveedor tiene que tener `estado='aprobado'` para que su servicio aparezca en el catálogo público. El flow de signup auto-aprueba ahora (sprint badge-f1, 2026-08-18). No hay espera de aprobación humana para publicar.

---

## Verificación de identidad — opcional

Fuente: [pages/proveedor/index.tsx](../../pages/proveedor/index.tsx) sección "Verificar identidad" (L1442, L1847).

### Estado operativo

**NO ES OBLIGATORIA**. Un proveedor puede:
- Registrarse como proveedor.
- Publicar servicios.
- Recibir reservas.
- Recibir mensajes y evaluar.
- **Todo sin verificar identidad.**

La verificación **da un badge visual** "Identidad verificada" en la ficha pública del proveedor (`/proveedor/<id>`) + en las cards del catálogo. Es un **incentivo de confianza**, no un gate. Ver CLAUDE.md § "Ejes independientes: `estado` vs `verificacion_estado`".

### Cuándo se pide

- **Nunca de forma automática** o bloqueante.
- El proveedor la inicia **a su elección** desde:
  - CTA en el sidebar izquierdo del panel `/proveedor` ("Verificar identidad", con ícono y estado del progreso).
  - Al expandir la sección "Verificar identidad" dentro del panel principal.
- El flujo no se activa durante el signup, ni al publicar el primer servicio, ni al recibir la primera reserva.

### Campos requeridos (si el proveedor decide verificar)

| Campo | Obligatorio | Tipo | Validación | Descripción |
|---|---|---|---|---|
| **RUT chileno** | Sí | texto | Validación de dígito verificador (algoritmo módulo 11) | Formato libre al tipear, se normaliza a `XX.XXX.XXX-X` al guardar. Si dígito verificador inválido, inline error "RUT inválido. Verifica el dígito verificador." |
| **Foto frontal del carnet** | Sí | file upload | image/* | Se sube al bucket `documents` de Supabase Storage. |
| **Foto dorso del carnet** | Sí | file upload | image/* | Se sube al bucket `documents`. |

### Flujo post-submit verificación

1. El proveedor envía los 3 campos → `verificacion_estado` pasa de `sin_enviar` a **`pendiente`**.
2. Panel muestra banner "Tu solicitud de verificación está en revisión".
3. Admin (interno Pawnecta) revisa en `/admin` tab "Verificaciones" → aprueba o rechaza manualmente.
4. Si aprueba: `verificacion_estado='aprobado'` + `rut_verificado=true` → **badge "Identidad verificada"** aparece en la ficha + cards.
5. Si rechaza: `verificacion_estado='rechazado'` + opcional `verificacion_nota` con el motivo. El proveedor ve el motivo + puede reenviar.

### Estados posibles

| `verificacion_estado` | Significado | Badge en ficha |
|---|---|---|
| `sin_enviar` | Nunca envió carnet (default al signup) | No aparece badge |
| `pendiente` | Envió carnet, admin no revisó | No aparece badge (aún) |
| `aprobado` | Admin verificó, RUT coincide con nombre en carnet | **Badge "Identidad verificada"** verde en ficha + cards |
| `rechazado` | Admin rechazó (ej. carnet ilegible, RUT no coincide con nombre) | No aparece badge, proveedor ve `verificacion_nota` con el motivo |

### Bug conocido documentado (no impacta función real)

CLAUDE.md § "Bugs conocidos" documenta que el panel admin para revisar carnets hoy renderiza `<img src={URL pública>` pero el bucket `documents` es privado → la URL pública da 400. El admin no puede ver el carnet remoto desde el panel (debería usar signed URL). **Fix post-launch** (no bloquea el flow de verificación real — el PO sube las fotos a Supabase Storage via SDK con policy privada, y el admin revisa descargando manualmente desde Supabase Studio). El usuario final nunca ve el bug.

## Síntesis para blog

Para el PO redactando el blog:

- **Lo mínimo para publicar**: categoría + título + descripción (100+ chars) + precio + mascotas + al menos 1 comuna + disponibilidad + 1 foto. ~**10 minutos** llenando con detalle.
- **Lo opcional pero recomendado**: inclusiones, modalidad, políticas, campos dinámicos por categoría, agenda F1/F2 para aceptar reservas sin esperar respuesta, verificación de identidad para badge de confianza. ~**20-30 minutos adicionales** para dejar un perfil completo.
- **Qué no cuesta**: Pawnecta no cobra por publicar ni por conectar con tutores. El cobro del servicio es entre proveedor y tutor, fuera de la plataforma.
- **Diferencia clave**: la verificación de identidad **NO es obligatoria** — el proveedor puede publicar y recibir reservas sin ella. El badge es un incentivo de confianza, no un gate.
