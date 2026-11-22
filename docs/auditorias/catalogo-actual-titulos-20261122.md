# Audit de títulos y descripciones del catálogo actual — 2026-11-22

Written for: el PO (Aldo), para decidir qué servicios "contactar para pulir" antes de que lleguen tutores masivos vía campañas pagadas.

**Fuente**: `supabase-prod-ro.servicios_publicados` JOIN `proveedores` + `categorias_servicio`, filtrado `activo=TRUE AND estado='aprobado'`. **Snapshot**: 2026-11-22 ~11:00 CLT. **Total servicios activos**: 22 (incluye placeholders sembrados por el PO; filtrados para la recomendación — los placeholders no son contactables).

**Cómo se usa**: columna "Acción sugerida" clasifica cada servicio en una de 3 categorías:
- **OK**: título y descripción están pulidos, cero cambio sugerido.
- **Pulir** (recomendado): errores tipográficos, mayúsculas excesivas, espacios sobrantes, falta de tildes, o copy muy escueto. Contactar al proveedor y proponer la versión mejorada.
- **Placeholder**: servicio sembrado por el PO con nombre_publico NULL. No hay a quién contactar; actualizar el copy directamente desde el panel admin o coordinar con el PO.

---

## Servicios de proveedores reales (nombre_publico ≠ NULL)

| # | Proveedor | Categoría | Título actual | Problema detectado | Sugerencia | Acción |
|---|-----------|-----------|---------------|---------------------|------------|--------|
| 1 | Eduardo C. | Cuidado y Hospedaje | "Visitas a domicilio para mascotas que prefieren quedarse en casa" | — | — | OK |
| 2 | Eduardo C. | Fotografía de Mascotas | "Fotografía profesional de mascotas en parques o tu domicilio" | — | — | OK |
| 3 | Eduardo C. | Paseo de Perros | "Paseos en grupos pequeños por parques de Las Condes y Vitacura" | — | — | OK |
| 4 | Grazia | Cuidado y Hospedaje | "PetSitter" | Copy escueto (7 chars). "PetSitter" es el rol, no el servicio. La descripción tiene buen contenido pero el título no engancha. | "Visitas de petsitter: paseo + alimentación en tu casa" (describe modalidad + lo que incluye) | Pulir |
| 5 | Nicole Acevedo | Cuidado y Hospedaje | "Hospedaje cariñoso " | **Trailing space** en el título. | "Hospedaje cariñoso para perros" (trim + especificar mascota) | Pulir |
| 6 | Nicole Acevedo | Paseo de Perros | "Paseos personalizados " | **Trailing space** en el título. | "Paseos personalizados con fotos en tiempo real" (trim + diferenciador) | Pulir |
| 7 | Constanza | Guardería Diurna | "Acompañandolo en su hogar" | **Falta tilde**: "Acompañándolo". | "Acompañándolo en su hogar" | Pulir |
| 8 | Constanza | Paseo de Perros | "¡A gastar energía!" | — (OK, exclamación correcta) | — | OK |
| 9 | Constanza | Traslado | "Lo acompaño a sus tramites" | **Falta tilde**: "trámites". Además escueto. | "Acompañamiento a trámites y urgencias veterinarias" | Pulir |
| 10 | 𝐏𝐚𝐬𝐞í𝐭𝐨𝐬 𝐏𝐞𝐫𝐫𝐮𝐧𝐨𝐬.𝐜𝐥 | Paseo de Perros | "Paseos de mascotas " | (a) **Trailing space**. (b) Nombre público del proveedor usa caracteres **Unicode matemáticos cursivos** (𝐏𝐚𝐬𝐞í𝐭𝐨𝐬) que no se indexan como texto normal en Google y dañan accesibilidad (screen readers). (c) Duplicado con el #11 del mismo proveedor. | **Prioridad alta**: (1) contactar y pedir que cambie el nombre público a "Paseítos Perrunos" (caracteres normales). (2) Eliminar duplicado — dejar solo uno de los dos paseos. (3) Trim trailing space. | Pulir (urgente) |
| 11 | 𝐏𝐚𝐬𝐞í𝐭𝐨𝐬 𝐏𝐞𝐫𝐫𝐮𝐧𝐨𝐬.𝐜𝐥 | Paseo de Perros | "Paseítos Perrunos" | **Duplicado** con el #10 del mismo proveedor (misma descripción, mismo precio, misma unidad). | Eliminar uno de los dos (el que tenga menos visitas/reservas). | Pulir (urgente) |

**Total proveedores reales con servicios a pulir**: 5 (Grazia, Nicole Acevedo, Constanza, Paseítos Perrunos — este último con el problema más serio del Unicode + duplicado).

---

## Servicios de placeholders (nombre_publico = NULL, sembrados por el PO)

| # | Comuna | Categoría | Título | Problema detectado | Sugerencia | Acción |
|---|--------|-----------|--------|---------------------|------------|--------|
| 12 | Santiago | Cuidado y Hospedaje | "Cuidados de tu Mascota" | — | — | OK (placeholder) |
| 13 | Puerto Varas | Cuidado y Hospedaje | "SERVICIO DE PETTSITER" | (a) **Typo**: "PETTSITER" → "PETSITTER" (doble T en el lugar incorrecto). (b) **Mayúsculas excesivas** que dan sensación de grito. | "Servicio de petsitter" (minúsculas + typo corregido). Idealmente: "Petsitter veterinaria a domicilio" (aprovecha que la descripción menciona título de Médico Veterinaria). | **Placeholder — actualizar directo desde admin** (o coordinar con el PO) |
| 14 | Santiago | Cuidado y Hospedaje | "Hospedaje seguro por la noche " | **Trailing space** en el título. | "Hospedaje seguro por la noche" (trim) | Placeholder — fix admin |
| 15 | La Florida | Cuidado y Hospedaje | "Hospedaje canino con cuidado personalizado " | **Trailing space**. | "Hospedaje canino con cuidado personalizado" (trim) | Placeholder — fix admin |
| 16 | Santiago | Guardería Diurna | "Hospedaje diurno" | — | — | OK (placeholder) |
| 17 | Providencia | Paseo de Perros | "Paseo de perritos." | **Punto innecesario** al final del título (los títulos no se cierran con punto por convención). | "Paseo de perritos" (eliminar punto final) | Placeholder — fix admin |
| 18 | Pudahuel | Paseo de Perros | "Paseos y cariño para tu perrito 🐾 " | (a) **Emoji en título** (prohibido por CLAUDE.md "NO emojis en la UI"). (b) **Trailing space**. | "Paseos y cariño para tu perrito" (sin emoji + trim) | Placeholder — fix admin |
| 19 | Providencia | Paseo de Perros | "Paseador de perros en providencia " | (a) **Trailing space**. (b) **"providencia" sin mayúscula** — es nombre propio, debe ser "Providencia". | "Paseador de perros en Providencia" (trim + mayúscula) | Placeholder — fix admin |
| 20 | Santiago | Paseo de Perros | "Paseo de gatos o perros" | — | — | OK (placeholder) |
| 21 | Santiago | Veterinario a Domicilio | "Cuidados Post operatorios, administración de fármacos, curaciones. " | (a) **Trailing space**. (b) Título largo con lista — formato mejor para descripción, no para título. | "Cuidados post-operatorios a domicilio" (acorta + unifica guion) | Placeholder — fix admin |
| 22 | Puerto Varas | Veterinario a Domicilio | "Veterinaria a domicilio" | — | — | OK (placeholder) |

**Total placeholders con copy a corregir**: 6 (pétizos de pulido mecánico: trim, typo, mayúscula de comuna, eliminar emoji, punto).

---

## Patrones sistémicos

1. **Trailing spaces**: 6 servicios (#5, #6, #10, #14, #15, #18, #19, #21). Es el error más frecuente. **Fix mecánico**: un `UPDATE` con `TRIM(titulo)` sobre todos los activos elimina el problema en una pasada, sin contactar a nadie. Candidato a sprint chico (5 min de SQL).

2. **Falta de tildes**: 2 servicios (Constanza × 2). Usuarios chilenos aceptan títulos sin tildes pero se lee amateur. Contactar a la proveedora, cambio voluntario.

3. **Mayúsculas excesivas**: 1 servicio (#13, placeholder). Fix admin directo.

4. **Emojis en título**: 1 servicio (#18, placeholder). Viola convención CLAUDE.md "NO emojis en la UI". Fix admin directo.

5. **Nombre público con Unicode no-estándar**: 1 proveedor (Paseítos Perrunos.cl). **Alto impacto SEO** — los buscadores no reconocen caracteres matemáticos como letras normales. Perder este tipo de letra cursiva de fantasía reduce rebote estético pero gana en indexación y accesibilidad. Conversación con la proveedora requerida.

6. **Servicios duplicados**: 1 proveedor (Paseítos Perrunos ofrece 2 servicios idénticos en la misma categoría). Candidato a mensaje "¿quieres que te unifiquemos los dos servicios en uno con la descripción combinada?".

---

## Plan de acción sugerido para el PO

**Fase 1 (SQL en prod, sin tocar proveedores)**: 5 min
- `UPDATE servicios_publicados SET titulo = TRIM(titulo) WHERE titulo LIKE '% ' OR titulo LIKE ' %';` (cubre los 6 trailing spaces + eventuales leading spaces).
- Entregar el bloque SQL al PO con `RETURNING id, titulo` para evidencia.

**Fase 2 (fix admin directo sobre 6 placeholders)**: 15 min
- Login admin → entrar a cada servicio placeholder y editar el título según la columna "Sugerencia".
- Alternativamente: SQL con `UPDATE` por `servicio_id` concreto (más rápido, menos clicks).

**Fase 3 (contactar 4 proveedores reales)**: ~30 min de chat/email al proveedor cada uno
1. **Grazia** — ofrecer título propuesto; que ella lo apruebe o proponga otro.
2. **Nicole Acevedo** — notificar sobre trailing spaces + proponer diferenciadores en el título.
3. **Constanza** — proponer correcciones de tildes (3 servicios suyos involucrados).
4. **Paseítos Perrunos.cl** (urgente) — explicar impacto SEO del nombre con Unicode matemático + ofrecer unificación de los 2 servicios duplicados en uno.

**Fase 4 (opcional)**: campaña preventiva de guía de redacción
- Agregar al wizard de publicación un hint "Evita espacios al inicio/final del título" + validación live.
- Agregar validación de caracteres Unicode no-ASCII en el nombre_publico (bloquear caracteres matemáticos cursivos, permitir tildes).
- Ítem BACKLOG candidato: **WIZARD-COPY-VALIDATION** (post-launch).

---

## Nota metodológica

- Los placeholders cuentan como "parte del catálogo que ve el visitante" — si uno aterriza a `/explorar?categoria=cuidado` desde una campaña, no distingue entre placeholder y proveedor real. Pulirlos tiene impacto directo en primera impresión aunque no haya "proveedor humano" a contactar.
- La columna "Acción sugerida" prioriza: **urgente** (Paseítos Perrunos), **mecánico** (trim SQL), **contacto humano** (los 4 proveedores reales), **admin directo** (placeholders).
- El diagnóstico no toca descripciones completas — solo títulos. Audit de descripciones es un sprint separado (mayor fricción porque requiere contexto del servicio y preferencias del proveedor).

---

**Generado por el auditor para el PO, 2026-11-22**. Sin GO para ejecutar fixes — el PO decide qué fase arrancar y cuándo.
