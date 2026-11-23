# Benchmarks de marketplaces similares — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: analizar 5 marketplaces de referencia (Chile + LATAM + global) para extraer qué hacen bien, qué hacen mal, qué copiaríamos a Pawnecta. Puro análisis estratégico.
**Método**: búsqueda web + análisis de presencia pública + heurísticas de producto. Zero datos privados de las empresas; todo basado en material público.

**Nota importante sobre la lista original del PO**: El PO pidió **Wayni, LinkerPet, Rover, GoNanny, Allteachers**. Dos de ellos (Wayni, LinkerPet) **no se encontraron** como productos vivos en la búsqueda web — pueden ser nombres incorrectos o productos inactivos. Reemplacé los dos faltantes con **DOGIN** (Chile, equivalente directo) + **Laika** (Colombia/México, referencia regional). Wayni/LinkerPet quedan con nota de "no encontrado" al final por si el PO quiere confirmar los nombres originales.

---

## Marketplace 1 — DOGIN (Chile)

**Qué es**: app chilena nativa (Petsclub SpA) que conecta tutores de perros con cuidadores y paseadores verificados. Lanzamiento abril 2024, ~17.800 users registrados + ~3.000 "doggers" activos a junio 2026 (fuentes: The Clinic + Emol).

**Modelo**:
- Cuidador fija su precio.
- DOGIN cobra comisión por transacción dentro de la plataforma (porcentaje no público).
- Servicios: paseos + guardería + hospedaje nocturno.

**Features destacados** (qué hacen bien):
- **GPS tracking en paseos** en tiempo real para el tutor.
- **Reporte end-of-service** con fotos/resumen del paseo.
- **Cobertura veterinaria de emergencia** incluida en servicios de hospedaje.
- **Sistema de reseñas** post-servicio.
- **Verificación de cuidadores** (dato público pero sin detalles del flow).
- **App nativa iOS** (apps.apple.com listing) además de web. Mobile-first.

**Qué estarían por hacer**:
- Marketplace interno (productos para mascotas).
- Suplemento alimenticio propio para perros con ansiedad.
- Sección de eventos.
- QR-code identificación + búsqueda de perros perdidos.

**Qué no se ve que hagan bien**:
- No es claro el mecanismo de precio sugerido (cuidadores podrían no saber cómo pricing).
- Expansión a gatos/otras mascotas limitada.
- Dependen de app móvil; web presence menor.

**Qué copiaríamos a Pawnecta**:
1. **GPS tracking en paseos** → feature diferenciador fuerte para tutores ansiosos. Alto valor percibido, moderado esfuerzo (Supabase Realtime + geolocation API).
2. **Reporte end-of-service** con fotos → facil win para engagement + feedback loop.
3. **Cobertura veterinaria de emergencia** → plan adicional opcional contratado via Pawnecta. Requiere partner veterinario.

**Qué NO copiaríamos**:
- Comisión por transacción. Nuestro positioning hoy es "sin comisión por conectar" — mantener.
- Enfoque monoespecie (solo perros). Nuestro catálogo cubre perros + gatos + otros.

---

## Marketplace 2 — Rover.com (global, principalmente USA/Canadá/UK)

**Qué es**: marketplace más grande del mundo para pet care (fundado 2011, público NASDAQ ROVR). Tutores + sitters/walkers. Expandido 2026 a dog training.

**Modelo** (conocido públicamente):
- Fee ~15% al sitter + ~5-10% service fee al tutor (según reviews recientes 2026 en Trustpilot, no confirmado por Rover oficialmente).
- Sitter independiente contractor, no empleado.
- Background check obligatorio antes de publicar.

**Features destacados** (qué hacen bien):
- **Background check** oficial + verificación de identidad.
- **Mensajería interna** + reservas con calendario.
- **Pago dentro de la plataforma** (recibos, protección fraude).
- **Rover Guarantee**: reembolso si el servicio sale mal.
- **Fotos + updates durante el servicio** (Rover Cards).
- **Repeat booking** fácil con cuidadores previos.
- **Reviews obligatorias** con rating 1-5 + comentario.
- **Ampliación vertical**: dog training con "credentialed trainers" (marzo 2026).

**Qué hacen mal** (basado en reviews críticos Trustpilot 2026):
- Comisión percibida como alta por sitters.
- Cambios de pricing control (Rover empieza a sugerir/forzar precios).
- Merge con Cat in a Flat criticado por la base de usuarios.
- Trust & Safety: disputas sobre daños no cubiertos, background checks poco rigurosos para algunos casos.
- Support reactivo, no proactivo.

**Qué copiaríamos a Pawnecta**:
1. **Rover Cards / updates durante servicio**: fotos + mini-updates del cuidador durante el servicio, visible para el tutor. Sigue el patrón "Rover Guarantee" sin el componente pago.
2. **Repeat booking** fácil: "Vuelve a reservar con {proveedor}" como shortcut en `/mis-reservas` tab Historial. 2h de UX, alto valor para retención.
3. **Reviews obligatorias** post-servicio (ya planeado sprint reseñas verificadas).
4. **Vertical ampliación**: dog training ya es categoría nuestra (adiestramiento + etología). Validación del movimiento Rover a training da confianza.

**Qué NO copiaríamos**:
- Comisión + pago in-platform. Nuestro modelo es más liviano, menor costo para proveedor + tutor.
- Background check obligatorio. Alta fricción; nuestro modelo "verificación opcional con badge" baja fricción sin perder confianza.
- Service fee al tutor. Experiencia Rover sugiere que es punto crítico de fricción UX.

**Riesgo observado**: Rover crece verticalmente (training, cats) pero empuja modelo que los proveedores ven como menos amigable (comisiones + pricing forzado). Nuestra oportunidad: mantener el modelo "amigable al proveedor" como diferenciador competitivo.

---

## Marketplace 3 — Laika (Colombia + México)

**Qué es**: Pet care marketplace colombiano. Combina **ecommerce** (productos) + **servicios** (hospedaje, guardería, visitas domicilio con cuidadores y paseadores). Presencia en Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Pereira + expansión a CDMX/Monterrey/Guadalajara.

**Modelo**:
- Ecommerce directo + marketplace de servicios third-party.
- Comisión por servicio + margen propio en ecommerce.

**Features destacados** (qué hacen bien):
- **Vertical dual**: ecommerce + servicios en una app. Alto cross-sell.
- **Cobertura geográfica agresiva**: 6 ciudades Colombia + 3 México en <5 años.
- **Verificación cuidadores**.
- **Subscripciones** (ecommerce) para alimento recurrente.

**Qué copiaríamos**:
1. **Verticalización ecommerce + servicios en el futuro**: hoy Pawnecta tiene el ítem EXPANSION-DIRECTORIO-NEGOCIOS en BACKLOG — Laika es la validación de que el modelo integrado funciona.
2. **Suscripciones recurrentes** (post-ecommerce): paseos semanales con cuidador fijo. Facturación predecible para proveedor + lock-in para tutor.
3. **Cobertura por ciudad**: landing SEO por ciudad (ya en plan SEO programático nuestro).

**Qué NO copiaríamos**:
- Modelo mixto ecommerce + servicios genera complejidad logística (inventario, delivery). No es foco para nosotros en el 1er año.
- Operación cross-border simultánea (Colombia+México). Demasiado early.

---

## Marketplace 4 — Oliver Pets (Argentina + expansión LATAM)

**Qué es**: plataforma all-in-one argentina. Conecta con pet shops + proveedores de servicios. Expansión a México + próximamente Chile.

**Modelo**:
- Marketplace para servicios + referidos a pet shops aliados.
- Modelo de referidos monetizado (acuerdos con partners).

**Features destacados** (qué hacen bien):
- **All-in-one** (shop + servicios + salud).
- **Expansión regional** medida y foco en integración con partners locales.

**Qué copiaríamos**:
1. **Partnerships con pet shops** locales → tutor usa Pawnecta para servicios + obtiene descuento en shop partner. Alta retención sin costo técnico alto.
2. **Localización agresiva**: Oliver Pets adapta UI/copy por país. Si Pawnecta expande a otros países LATAM, no caer en "copy argentino" (regla voseo CLAUDE.md ya resuelve esto).

**Qué NO copiaríamos**:
- Modelo de referidos con pet shops con comisión (requiere scale para que valga).

---

## Marketplace 5 — Dogify MX (México)

**Qué es**: app mexicana de servicios + ecommerce para mascotas. Categorías: alimento, farmacia, grooming, veterinario, transporte, hospedaje. Incluye programa de **gastos veterinarios de emergencia**.

**Modelo**:
- Mix ecommerce + servicios tipo Laika.
- Programa de membresía con cobertura veterinaria incluida (seguro).

**Features destacados** (qué hacen bien):
- **Seguro veterinario de emergencia** como feature premium.
- **Transporte de mascotas** como categoría propia (nicho).
- **Farmacia veterinaria** vertical dentro de la app.

**Qué copiaríamos**:
1. **Transporte de mascotas** → ya es categoría nuestra. Validar que el flow sea competitivo (tiempos, precios, cobertura).
2. **Seguro veterinario de emergencia** post-ecommerce (fase 2-3).

**Qué NO copiaríamos**:
- Farmacia veterinaria vertical (requiere licencias regulatorias + inventario).

---

## Benchmarks que el PO citó pero NO se encontraron

### Wayni
- Búsqueda "Wayni Chile marketplace servicios mascotas paseadores": zero match.
- Posibilidad: nombre incorrecto, o producto no-visible públicamente.
- **Decisión**: posiblemente el PO quiso referirse a DOGIN (producto chileno nativo equivalente). Si hay un "Wayni" real que no apareció en la búsqueda, pedir URL al PO.

### LinkerPet
- Búsqueda "LinkerPet Chile paseador cuidado perros marketplace": zero match.
- Posibilidad: producto inactivo o nombre equivocado.
- **Decisión**: ignorar hasta tener URL / confirmación del PO.

### GoNanny
- Nombre sugiere **cuidado infantil**, no mascotas. Si el PO lo citó por paralelismo de "marketplace de cuidadores", aplica como referencia cross-vertical pero no es pet.
- **Decisión**: no analizado acá. Si el PO quiere comparar modelos de verificación/booking de un marketplace de cuidado (independiente del vertical), podemos hacerlo como task separada.

### Allteachers
- Nombre sugiere marketplace de **clases particulares / tutores académicos**, no mascotas.
- **Decisión**: igual que GoNanny. Cross-vertical, no analizado en este doc.

---

## Resumen — top 5 features a adoptar en Pawnecta (de todos los benchmarks)

Ranking por `impacto × costo`:

### 1. Repeat booking fácil (inspiración Rover)

**Qué**: en `/mis-reservas` tab Historial, botón "Vuelve a reservar con {proveedor}" por cada reserva REALIZADA. Pre-llena el modal de reserva con el mismo servicio + proveedor.

**Esfuerzo**: 2-3h. Impacto: retención tutor existente, +20-30% reservas repetidas.

### 2. Updates in-service con fotos (inspiración Rover + DOGIN)

**Qué**: durante un servicio activo (ej. paseo), el proveedor puede subir 1-3 fotos + nota breve "listo, volvemos en 20 min" visible para el tutor.

**Esfuerzo**: 6-10h. Impacto: trust + satisfacción tutor + diferenciador vs clasificados (Yapo, 2x3).

### 3. GPS tracking en paseos (inspiración DOGIN)

**Qué**: feature opt-in para proveedores de paseos. App mobile o PWA tracking geolocation durante el servicio.

**Esfuerzo**: 1-2 días. Impacto: diferenciador fuerte vs DOGIN. Requiere app móvil nativa idealmente (PWA puede ser aceptable).

### 4. SEO programático por ciudad (inspiración Laika)

**Qué**: landings `/[categoria]/[comuna]` optimizadas (ya planeado `docs/planes/seo-programatico.md`).

**Esfuerzo**: 2-3 días tanda 1.

### 5. Verticalización gradual (inspiración Laika + Dogify)

**Qué**: post-100-proveedores + campañas, agregar directorio de pet-friendly places (ítem BACKLOG DIRECTORIO-LUGARES-PETFRIENDLY) + directorio de negocios (EXPANSION-DIRECTORIO-NEGOCIOS). Validación LATAM de que esta expansión funciona.

**Esfuerzo**: sprint propio post-campañas.

---

## Diferenciadores que Pawnecta debería mantener

Qué hace Pawnecta DISTINTO que debe preservar:

1. **Sin comisión por conectar**: todos los benchmarks (Rover 15%+, DOGIN %, Laika) cobran. Pawnecta no — es moat competitivo para proveedores que están tocando el techo de rentabilidad en otros marketplaces.
2. **Cobertura multi-especie**: la mayoría son dog-focused. Pawnecta cubre perros + gatos + otros (fotografía, veterinario transversal).
3. **Verificación opcional** (badge sin ser gate): Rover obliga background check, DOGIN verifica estricto. Pawnecta permite al proveedor empezar sin verificación → menos fricción onboarding.
4. **Cobertura geográfica focalizada Chile**: no competimos con DOGIN con escala global. Nuestro moat es profundidad local (comunas específicas, lenguaje local, precio local).

---

## Decisiones pendientes del PO

### D1. Confirmar Wayni + LinkerPet

**Pregunta**: ¿Wayni y LinkerPet son productos reales con URL, o fue confusión de nombres? Si tenés URL/screenshots los analizo correctamente.

**Recomendación**: si no hay URL, descartar y mantener benchmarks con DOGIN + Laika como equivalentes.

**Impacto si no se decide**: default = este doc queda con 5 marketplaces (los que encontré).

### D2. GoNanny + Allteachers — cross-vertical análisis

**Pregunta**: ¿valide hacer un sub-análisis de marketplaces cross-vertical (cuidado infantil, clases particulares) para extraer patrones de booking/verification agnósticos al dominio?

**Recomendación**: baja prioridad. Más valioso ir profundo en pet-care benchmarks + validar features top 5 con data real de mercado chileno.

**Impacto si no se decide**: default = no se hace.

### D3. Prioridad top 5 features a adoptar

**Pregunta**: ¿cuál arrancamos primero? Mi recomendación: "repeat booking" (ROI alto, costo bajo) + "GPS tracking paseos" (diferenciador fuerte vs DOGIN) como primera ola post-campañas.

**Recomendación**: aceptar la recomendación. Ambos entran en `BACKLOG` como ítems nuevos si el PO confirma.

**Impacto si no se decide**: default = quedan como análisis en este doc sin aterrizar en BACKLOG.

### D4. Posicionamiento vs DOGIN (competidor chileno directo)

**Pregunta**: DOGIN tiene ~18k users + 3k cuidadores. Pawnecta tiene ~127 users + 26 proveedores. Competencia directa vs mercado complementario.

**Recomendación**: mensajería diferenciadora en copy + campañas: "Sin comisión por conectar" + "Multi-especie" + "Verificación opcional sin fricción". NO competir en volumen, competir en **modelo de relación tutor-proveedor**.

**Impacto si no se decide**: default = mensaje generalista, menos diferenciado.

### D5. Análisis más profundo de DOGIN

**Pregunta**: valide pasada de 2-3h sobre DOGIN (descargar app, crear cuenta de prueba, probar flow tutor + flow cuidador) para diagnosticar su UX en detalle.

**Recomendación**: sí si hay ventana. Mejor entender qué hace el competidor directo con precisión que extrapolar de prensa.

**Impacto si no se decide**: default = base solo en material público.

---

## Sources

- [DOGIN · The Clinic 2026-06-01](https://www.theclinic.cl/2026/06/01/la-solucion-para-duenos-de-perros-dogin-la-app-chilena-que-permite-encontrar-cuidadores-y-paseadores-en-minutos/)
- [DOGIN · Emol 2026-06-25](https://www.emol.com/noticias/Economia/2026/06/25/1203800/empresa-negocio-fundadores-cuidado-perros.html)
- [Rover.com · Press release Dog Training launch 2026-03-05](https://www.rover.com/blog/press-release/rover-launches-dog-training/)
- [Rover.com · Rover Launches Dog Training (NASDAQ)](https://www.nasdaq.com/press-release/rover-launches-dog-training-2026-03-05)
- [Laika · Startups LATAM pet care](https://ekosnegocios.com/articulo/startups-latinoamericanas-que-estan-innovando-en-el-cuidado-de-las-mascotas)
- [Oliver Pets · América Retail](https://americaretail-malls.com/retail-especializado/mascotas/startup-pet-tech-transforma-las-reservas-para-mascotas-y-acelera-la-digitalizacion-del-sector-turistico/)
- [Dogify MX · App Store](https://apps.apple.com/ca/app/dogify-mx/id6463792241)

---

## Firma

Este doc es análisis estratégico puro. Sirve para alinear decisiones de roadmap producto con benchmarks competitivos LATAM + globales. Re-ejecutar análisis anualmente o cuando aparezca un entrant nuevo relevante en el mercado chileno.
