# Pawnecta — Backlog

## Producto (features nuevas)

### Fichas de mascotas del tutor
- El tutor crea perfiles de sus mascotas (nombre, especie, raza, edad, tamaño, condiciones) y los adjunta a solicitudes de servicio.
- Objetivo: apropiación (engagement del tutor) + comunicación (el proveedor tiene contexto sin preguntar).
- Infra: la tabla `mascotas` ya existe — revisar campos, relación con `usuarios_buscadores` (dueño) y con `agendamientos` (asociación).
- Capas: CRUD de mascotas en panel tutor; selector en SolicitarAgendamientoModal; vista de la ficha para el proveedor en solicitud/chat.
- Decisión pendiente: ficha obligatoria u opcional al solicitar servicio.

### Categoría: Retratos / pinturas de mascotas
- Servicio de alto valor emocional/regalo, diferenciador.
- Camino de categoría nueva: entrada en `lib/camposPorCategoria.ts` + tabla `categorias_servicio` + ícono + demo.
- Decisiones: ¿categoría o modalidad? (digital vs físico); campos propios (técnica, formato, plazo, desde foto/presencial); dar peso a la galería del proveedor en la ficha.

### Categoría: Etología
- Etólogo / especialista en conducta animal, distinta de adiestramiento.
- Mismo camino de categoría nueva (`camposPorCategoria.ts` + tabla + ícono + demo).
- Decisión pendiente: cómo diferenciarla de adiestramiento.

## Deuda técnica / pulido

- **ProveedorCard**: paridad de layout con ServiceCard (title `min-h`, aspect ratio, rating overlay).
- **Typography del blog**: las clases `prose-*` son no-op (falta `@tailwindcss/typography`). Decidir: instalar plugin (blog gana tipografía) o borrar el config muerto de `blog/[slug].tsx`.
- **Styleguide rewrite**: `pages/styleguide.tsx` documenta el sistema viejo (emerald). Reescribir para el sistema visual v3: capa marca (accent/deep) + capa estado (success/danger/warning/info).
- **UI_STANDARDS.md**: línea stale con `ring-emerald-500`, actualizar a accent/success.
- **Token `notification`**: los dots de no-leído usan `danger` por unificación de paleta. Si se quiere separarlos del rojo de error, crear token `notification` (alias de red) y migrar `UnreadBadge` + `NotificationBell`.

## Sistema visual (referencia — YA COMPLETADO)

- **Rollout de color v2**: emerald → accent (marca). Completo en prod.
- **Sprint de tokens semánticos**: estados → `success` (emerald) / `danger` (red) / `warning` (amber) / `info` (blue). Completo en prod.
- **Dos capas**:
  - Marca: `accent` (#22C55E) / `deep` (#134E4A).
  - Estado: tokens semánticos.
