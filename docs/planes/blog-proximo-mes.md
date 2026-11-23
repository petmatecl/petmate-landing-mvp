# Plan de contenido de blog — próximos 30 días (2026-11-20 → 2026-12-20)

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: proponer 10 entradas de blog que cubran gaps de categoría + alineen SEO con campañas futuras + expandan la biblioteca de 10 → 20 entradas.
**Contexto**: blog hoy tiene 10 entradas (ver `lib/blogData.ts`). Fuerte en paseos (1), cuidado/hotel (3), generalidades (3), gatos (1), proveedores B2B (1), paseador guía (1). **Gaps**: veterinaria (0), peluquería (0), adiestramiento (0), etología (0), nutrición (0), emergencias (0, parcial en golpe-calor), categorías de nicho (0).

---

## Entradas actuales (baseline)

| # | Slug | Categoría cubierta | Keyword principal |
|---|---|---|---|
| 1 | `cuidados-mascotas-verano-altas-temperaturas` | Cuidado general | "cuidados mascota verano" |
| 2 | `golpe-de-calor-mascotas-sintomas` | Salud emergencias | "golpe de calor perro" |
| 3 | `mitos-verdades-gato-indoor-100-por-ciento` | Gatos | "gato indoor" |
| 4 | `importancia-registro-nacional-mascotas-chile` | Regulación | "registro nacional mascotas chile" |
| 5 | `beneficios-fisicos-emocionales-tener-mascota` | Lifestyle | "beneficios tener mascota" |
| 6 | `importancia-no-cambiar-ambiente-mascotas-viaje` | Cuidado viajes | "cuidar perro de viaje" |
| 7 | `ventajas-desventajas-hotel-mascotas-vs-sitter` | Hospedaje | "hotel para mascotas" |
| 8 | `como-elegir-paseador-perros-santiago` | Paseos | "paseador perros santiago" |
| 9 | `como-publicar-en-pawnecta-guia-proveedores` | B2B proveedores | "ofrecer servicios mascotas" |
| 10 | `que-buscar-guarderia-cuidado-mascota-santiago` | Guardería | "guardería mascotas santiago" |

**Volumen por categoría**:
- Cuidado general / viajes / hospedaje: **5 entradas** ✅.
- Salud: **1 entrada**.
- Gatos: **1 entrada**.
- Paseos: **1 entrada**.
- Guardería: **1 entrada**.
- B2B: **1 entrada**.
- Veterinaria / peluquería / adiestramiento / nutrición / etología: **0 entradas** ❌.

---

## Propuesta — 10 entradas para los próximos 30 días

### Semana 1 (nov 23-29) — gaps críticos de categoría

#### P1 — Veterinaria

- **Título**: "Cuándo llevar a tu perro al veterinario: señales que no debes ignorar"
- **Slug**: `cuando-llevar-perro-veterinario-senales`
- **Público**: tutores con perro que dudan si una consulta es necesaria.
- **Keyword principal**: `cuando llevar perro al veterinario` (volumen medio-alto Chile).
- **Estructura (5 puntos)**:
  1. 10 señales de alerta (vómito persistente, letargia, cambio apetito, etc.).
  2. Qué chequear antes de salir corriendo (hidratación, encías, temperatura).
  3. Urgencia vs consulta regular — cómo diferenciar.
  4. Cómo elegir veterinario en tu comuna (link a `/veterinario/{comuna}`).
  5. Costos típicos consulta Chile (rango $15k-35k CLP) + emergencias.

#### P2 — Peluquería

- **Título**: "Peluquería canina: ¿cada cuánto, qué esperar y cómo elegir?"
- **Slug**: `peluqueria-canina-cada-cuanto-elegir`
- **Público**: tutores con perro de pelo largo o abundante.
- **Keyword principal**: `peluquería canina` + variants por comuna.
- **Estructura**:
  1. Frecuencia según raza (poodle vs labrador vs chihuahua).
  2. Servicios típicos (baño, corte, limpieza de oídos, uñas, glándulas anales).
  3. Qué preguntar a tu peluquero antes de la primera visita.
  4. Rangos de precio Chile ($15k-50k según perro).
  5. CTA → `/peluqueria/{comuna}`.

#### P3 — Adiestramiento

- **Título**: "Adiestramiento canino: qué es, qué NO es, cuándo empezar"
- **Slug**: `adiestramiento-canino-cuando-empezar`
- **Público**: tutores con cachorro o perro adulto con problemas conducta.
- **Keyword principal**: `adiestramiento canino chile` + `cuando adiestrar perro`.
- **Estructura**:
  1. Confusiones comunes: adiestramiento ≠ dominación / castigo.
  2. Métodos modernos (refuerzo positivo, clicker).
  3. Edad ideal para empezar (8-16 semanas cachorro, nunca tarde).
  4. Señales de que necesitas un profesional (agresión, ansiedad, miedo).
  5. CTA → `/adiestramiento/{comuna}`.

### Semana 2 (nov 30 – dic 6) — nicho + preventivo

#### P4 — Etología (diferencia con adiestramiento)

- **Título**: "Etología vs Adiestramiento: ¿qué profesional necesita tu perro?"
- **Slug**: `etologia-vs-adiestramiento-diferencia`
- **Público**: tutores con perro con problemas de conducta severos.
- **Keyword principal**: `etologo canino` + `diferencia etologia adiestramiento`.
- **Estructura**:
  1. Qué es un etólogo (especialista en comportamiento con formación clínica).
  2. Qué es un adiestrador (habilidades + órdenes básicas).
  3. Cuándo cada uno — tabla de casos.
  4. Qué esperar de una consulta etológica.
  5. CTA → `/etologia/{comuna}`.

#### P5 — Nutrición mascotas

- **Título**: "Alimentación de tu perro: qué dice la ciencia (y qué no creer)"
- **Slug**: `alimentacion-perro-ciencia-mitos`
- **Público**: todos tutores.
- **Keyword principal**: `alimentar perro correctamente` + `comida perro`.
- **Estructura**:
  1. Mitos (tabla con 5 mitos comunes + verdad).
  2. Rangos de calidad: superpremium vs premium vs regular.
  3. Alimento húmedo vs seco vs BARF — consideraciones.
  4. Cuánto darle según peso y edad (tabla).
  5. CTA → consultar nutricionista veterinario (categoría futura).

#### P6 — Primeros auxilios

- **Título**: "Primeros auxilios para tu mascota: botiquín mínimo y qué hacer antes del veterinario"
- **Slug**: `primeros-auxilios-mascota-botiquin`
- **Público**: todos tutores.
- **Keyword principal**: `primeros auxilios perro` + `botiquín mascota`.
- **Estructura**:
  1. Qué debe tener el botiquín (gasas, suero fisiológico, termómetro, lista medicamentos, números veterinarios).
  2. 5 emergencias comunes y primera respuesta: convulsión, atragantamiento, herida sangrante, picadura, intoxicación.
  3. Qué NO hacer (no inducir vómito, no dar leche si intoxicación, etc.).
  4. Cuándo llamar emergencia veterinaria vs llevar al consultorio.
  5. Lista de veterinarias de urgencia 24/7 por comuna.

### Semana 3 (dic 7-13) — estacional + conducta

#### P7 — Fin de año + mascotas

- **Título**: "Fin de año con mascotas: cómo cuidarlos del ruido, la calor y los viajes"
- **Slug**: `fin-ano-mascotas-fuegos-viajes`
- **Público**: todos tutores pre-navidad/año nuevo.
- **Keyword principal**: `fuegos artificiales perro miedo` + `mascota año nuevo`.
- **Estructura**:
  1. Fuegos artificiales — preparación (feromonas, música, refugio).
  2. Viajes de vacaciones — cómo elegir cuidador (link a /cuidado).
  3. Visitas en casa — cómo acostumbrar.
  4. Qué NO darle (chocolate, uvas, huesos cocidos, alcohol).
  5. Checklist día previo a 31-12.

#### P8 — Ansiedad separación

- **Título**: "Ansiedad por separación en perros: síntomas, causas y qué hacer"
- **Slug**: `ansiedad-separacion-perro-sintomas`
- **Público**: tutores que notan destrozos / vocalización / orinas al salir.
- **Keyword principal**: `ansiedad separación perro` + `perro llora cuando salgo`.
- **Estructura**:
  1. Síntomas comunes.
  2. Causas (cambio de rutina, mudanza, nuevo trabajo).
  3. Estrategias conductuales (desensibilización gradual).
  4. Cuándo consultar etólogo vs medicación veterinaria.
  5. CTA → `/etologia` + `/paseos` (paseador reduce ansiedad).

### Semana 4 (dic 14-20) — enlace con campañas

#### P9 — Guía elegir cuidador para vacaciones

- **Título**: "Cómo elegir cuidador de mascotas para vacaciones: 7 preguntas que debes hacer"
- **Slug**: `como-elegir-cuidador-vacaciones-preguntas`
- **Público**: tutores planeando viaje enero-febrero.
- **Keyword principal**: `cuidador mascotas vacaciones` + `dejar perro vacaciones`.
- **Estructura**:
  1. Entrevista inicial — 7 preguntas clave (experiencia, mascotas propias, seguro, referencias, visitas diarias, emergencias, pago).
  2. Visita al lugar vs cuidado en tu casa — pros/contras.
  3. Entrega: qué dejar al cuidador (comida, medicamentos, contacto vet, rutina).
  4. Precio promedio Chile ($15k-30k/noche).
  5. CTA → `/cuidado/{comuna}`.

**Alineado con landing `/cuidador-vacaciones`** de `docs/planes/landings-trafico-pagado.md` — este post alimenta SEO orgánico de la landing paga.

#### P10 — Historia de un proveedor real

- **Título**: "Cómo {Juan Bou / proveedor seleccionado} encontró clientes con Pawnecta"
- **Slug**: `historia-proveedor-{nombre}-pawnecta`
- **Público**: proveedores considerando registrarse.
- **Keyword principal**: `testimonios paseador perros` + `ingresos extra mascotas`.
- **Estructura**:
  1. Background del proveedor (cómo empezó, cuántas mascotas).
  2. Qué le atrajo de Pawnecta (sin comisión, agenda online).
  3. Cómo configuró su perfil + agenda.
  4. Primera reserva real + aprendizaje.
  5. CTA → `/soy-proveedor` (landing B2B).

**Alineado con landing `/soy-proveedor`**. Primera "customer story" del blog — forma relación brand↔user.

**Requisito**: autorización escrita del proveedor + fotos reales según regla CLAUDE.md.

---

## Checklist técnico por entrada

Cada entrada debe cumplir:

- [ ] `coverImage` con foto Unsplash/Pexels (sin personas con cara reconocible, sin IA) o captura de plataforma.
- [ ] Autor "Equipo Pawnecta".
- [ ] `tags` con 2-4 tags relevantes (Salud, Perros, Gatos, Emergencias, Cuidado, etc.).
- [ ] `readTime` calculado (~1 min por 200 palabras).
- [ ] `coverIcon` fallback (por si falla Unsplash CDN).
- [ ] Links internos al menos 2-3 landings relevantes (`/paseos/{comuna}`, `/cuidado/{comuna}`, etc.).
- [ ] CTA al final del post + CTA inline si aplica.
- [ ] Meta description optimizada para SERP (~150 chars).
- [ ] Schema markup BlogPosting + Author (Equipo Pawnecta como Organization).
- [ ] Palabras: 800-1500 cada post (balance SEO + atención mobile).

---

## Priorización por impacto SEO + campañas

Si solo se hacen 5 de las 10:

**TOP 5**:
1. **P9** · Cuidador vacaciones — alimenta landing `/cuidador-vacaciones` (campaña dic-feb).
2. **P1** · Veterinaria — categoría con 0 entradas + alto volumen búsqueda.
3. **P3** · Adiestramiento — categoría con 0 entradas + Google Ads nicho.
4. **P7** · Fin de año + mascotas — estacional, pico diciembre.
5. **P2** · Peluquería — categoría con 0 entradas.

**Esfuerzo**: ~2-3h por post (incluyendo research + redacción + imagen + schema). 5 posts = ~10-15h total distribuidos.

---

## Workflow sugerido

### Semana 1-2

- Lunes: redacción posts P1 + P2 + P3 (gaps críticos categorías).
- Miércoles: publicación P1 + P2.
- Viernes: publicación P3.

### Semana 3-4

- Lunes: redacción P4 + P5 + P6.
- Miércoles: publicación P4 + P5.
- Viernes: publicación P6.

### Semana 4

- Lunes: redacción P7 + P8 + P9.
- Miércoles: publicación P7 + P8.
- Viernes: publicación P9 + P10 (historia proveedor con autorización).

---

## Métricas de éxito blog (post 30 días)

- **Visitas totales blog**: baseline + delta de nuevas entradas.
- **Impressions SERP** (Google Search Console) por post.
- **CTR de blog → landing categoría**: meta >5%.
- **Tiempo en página** por post: >60s (lectura real).
- **Backlinks**: media 1-2 externos por post orgánico a 30 días.
- **Shares sociales** (via ShareButtons tracking).

---

## Decisiones pendientes del PO

### D1. Priorización top 5 vs 10

**Pregunta**: ¿autorizás arrancar con top 5 esta semana y los otros 5 según feedback?

**Recomendación**: top 5 primero. Permite validar qué tono/estructura funciona + ajustar los siguientes.

**Impacto si no se decide**: default = top 5 primero.

### D2. Autor "Equipo Pawnecta" vs nombre real

**Pregunta**: ¿mantenemos "Equipo Pawnecta" o firman con nombre real (ej. PO)?

**Recomendación**: "Equipo Pawnecta" para los 10. Nombre real cuando crezca el equipo o cuando un post específico requiera credibilidad personal (ej. post P10 historia de proveedor sí usa nombre real del proveedor).

**Impacto si no se decide**: default = Equipo Pawnecta.

### D3. Post P10 historia proveedor — quién

**Pregunta**: ¿Juan Bou (primer proveedor orgánico, dato BACKLOG) u otro proveedor activo con mejores métricas?

**Recomendación**: **Juan Bou si autoriza** por ser el primer orgánico (narrativa "primer proveedor real"). Alternativa: Rosamel u otro con mejor foto + reseñas.

**Impacto si no se decide**: default = esperar a que haya proveedor con buenos resultados + autorización.

### D4. Redacción auditor vs PO

**Pregunta**: ¿auditor arma drafts + PO revisa, o PO desde cero?

**Recomendación**: auditor drafts estructura + copy + PO ajusta tono fino. Reparte esfuerzo.

**Impacto si no se decide**: default = auditor drafts + PO review.

### D5. Keywords research específico Chile

**Pregunta**: ¿validar keywords propuestas con Google Keyword Planner antes de redactar?

**Recomendación**: sí, 30 min PO. Evita escribir sobre keywords sin volumen real.

**Impacto si no se decide**: default = keywords por heurística auditor.

---

## Firma

Plan listo. Esfuerzo total (10 posts): ~20-30h distribuidos en 4 semanas. Impacto: biblioteca blog 10 → 20 + gaps categóricos cerrados + SEO orgánico creciendo + alimento campañas pagadas.
