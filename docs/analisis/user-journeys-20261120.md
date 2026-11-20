# User Journeys — 3 buyer personas — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: mapear journeys end-to-end de 3 buyer personas para identificar fricciones + momento "aha" + loops de retención. Base para decisiones de UX pre-campañas.
**Complementa**: `funnel-registro-proveedor-20261120.md` + `funnel-contacto-tutor-20261120.md`.

---

## Persona 1 — Camila, tutora que busca paseador casual

**Perfil demográfico**:
- 32 años, profesional recursos humanos en Providencia.
- Vive en departamento con labrador de 4 años (Mila).
- Trabajo híbrido 3 días oficina + 2 casa.
- Soltera, ingresos sueldo ~$1.5M CLP netos.
- Usa Instagram + WhatsApp + apps pago.

**Trigger**: viene llegando tarde del trabajo últimas 2 semanas → Mila sin salir hace 48h → siente culpa + busca ayuda puntual.

### Antes de llegar a Pawnecta

**Pensamiento**: "Necesito alguien que saque a Mila de lunes a viernes 1-2 horas, horario flexible. ¿Un paseador por app? ¿Alguien del barrio? ¿Cuánto cuesta?"

**Preocupaciones**:
- Dejar su departamento llave a alguien desconocido.
- ¿Y si Mila se escapa? ¿Y si se enferma?
- ¿Cuánto es "razonable" pagar? (no tiene referencia).
- ¿Puedo cancelar si cambia mi horario?

**Canales típicos de descubrimiento**:
- Google search: "paseador perros providencia" → landing Pawnecta vs 2x3.cl vs DOGIN.
- Instagram recommendation de una amiga.
- Ad Meta "Encuentra paseadores verificados" (futuro con campañas).

### Primera visita a Pawnecta

**Aterriza en**: `/paseos/providencia` (si llegó por Google) o `/` home (si por link directo).

**Primeros 10 segundos — LOOK**:
- Ve lista de paseadores con foto + precio + rating.
- Impresión: "Pro, parece verificado, precios razonables ($8k-18k)".
- **Momento clave**: el badge "Identidad verificada" o "Nuevo en Pawnecta" (ver BACKLOG BADGE-NUEVO-PAWNECTA) + rating visibles sin scroll.

**Fricciones observables actualmente**:
- F1-C-1: Chip filtro aplicado dice "cuidado" en vez de "Cuidado y Hospedaje" (bug naming, ya documentado).
- F1-C-2: El CLS mobile 0.187 en ficha (ya documentado) hace que la página "salte" al cargar reviews.
- F1-C-3: 58% de proveedores sin foto perfil (data real prod) → Camila ve avatars genéricos → baja confianza.

### Exploración de 2-3 fichas

**Comportamiento esperado**: compara 3 paseadores. Ve precio, distancia (si tiene geolocation), fotos del paseador, reseñas si hay.

**Momento "aha"**: ve una ficha con foto del paseador caminando un perro grande + rating 4.5+ con 1-2 reseñas específicas ("muy puntual, me mandó fotos"). Decide: "este".

**Fricciones**:
- F1-C-4: Zero reseñas en la mayoría de fichas (sprint reseñas-verificadas pendiente post-launch) → Camila duda sin social proof.
- F1-C-5: Sin comparación side-by-side → tiene que abrir tabs separadas.
- F1-C-6: Sin filtro "disponible hoy" visible → tiene que entrar ficha por ficha a chequear agenda.

### Primer intento de contacto

**Comportamiento**: click en "Contactar" o "Reservar" en la ficha seleccionada.

**Flow actual**:
1. Modal `LoginRequiredModal` → "Crea una cuenta para contactar".
2. Click "Crear cuenta" → `/register?rol=tutor`.
3. Step 1 elegir rol → Step 2 datos personales (email + password + nombre + apellido + RUT opcional + comuna + teléfono).
4. Submit → mensaje "Revisa tu correo para confirmar".
5. Camila revisa inbox → click link → `/email-confirmado`.
6. Click "Ir a /explorar" → **aterriza en catálogo sin memoria del paseador que quería contactar**. ⚠️

**Momento de fricción crítica**: F1-C-7 — Camila pierde el contexto del paseador que eligió. Tiene que buscarlo de nuevo. 20-40% de users abandonan aquí (hallazgo H1 del funnel-contacto-tutor).

**Si persiste**:
- Retoma el flow, encuentra al paseador, contacta.
- O renuncia + otra app.

### Primer contacto exitoso

**Si Camila supera la fricción F1-C-7**: contacta por chat. Envía mensaje: "Hola, necesito paseador para mi labrador Mila, dpto. en Providencia, lunes-viernes 2hs. ¿Disponibilidad?"

**Momento "aha" #2**: proveedor responde en <2h con detalles claros + ofrece pasear hoy mismo si está libre. Camila siente que es real + profesional.

**Reserva F1**: Camila elige horario en el picker de slots del proveedor. Confirma. Recibe email confirmación.

### Post-primera reserva

**Camila regresa**: si la experiencia fue buena, reserva recurrente. Modelo típico pet-care: 2-3 veces/semana × 4-6 meses = 50-80 reservas/user/año.

**Loops de retención**:
- Push notification / email cuando el paseador hace check-in.
- Reportes end-of-service con fotos.
- "Agenda recurrente con tu paseador habitual" (feature propuesta Rover-inspirada).

### Hallazgos cruzados Persona 1

**Críticos pre-campañas**:
- F1-C-7 (contexto perdido post-confirmación email) → H1 funnel contacto tutor, 3-4h fix.
- F1-C-1 (naming chip bug) → fix 15 min.
- F1-C-3 (proveedores sin foto) → trigger recordatorio ADMIN-PROVEEDORES-RECORDATORIO-MANUAL.

**Post-campañas**:
- Reseñas verificadas (sprint existente).
- Repeat booking fácil.
- Updates in-service con fotos.

---

## Persona 2 — Diego y Sofía, pareja que busca hospedaje vacaciones

**Perfil**:
- Pareja 35+ años, casa en Las Condes.
- 1 perro mediano (Milo, 5 años) + 1 gato (Luna, 7 años).
- Ingresos ~$3M CLP combinado.
- Viajan 1-2 veces/año, destino típico Pucón o Cartagena.
- Usan WhatsApp + Airbnb regularmente.

**Trigger**: tienen viaje planificado 23-dic al 30-dic. Zero familia disponible para cuidar → necesitan hospedaje profesional.

### Antes de llegar a Pawnecta

**Pensamiento**: "Necesito cuidador para Milo y Luna por 7 días. Sofía insiste que sea cuidador en casa de él, no hotel. Mejor mascotas juntas para que no se estresen."

**Preocupaciones (altas — mascotas juntas 7 días)**:
- Experiencia del cuidador con razas específicas.
- Fotos del lugar (ambiente, patio, limpieza).
- Confianza para dejar 2 mascotas.
- Costo total — $25-40k CLP/noche × 7 = ~$175-280k.
- ¿Cancelación si imprevisto?

**Canales**:
- Google search "hospedaje perros vacaciones santiago" → landing Pawnecta vs apps internacionales.
- Recomendación de un amigo que usó DOGIN.

### Primera visita Pawnecta

**Aterriza en**: `/cuidado` o `/cuidado/las-condes` (ideal con SEO programático).

**Primeros 10 segundos**: ve lista de cuidadores con fotos del lugar + experiencia. Impresión depende mucho de **calidad de las fotos y badges de verificación**.

**Fricciones**:
- F2-D-1: Si el cuidador no tiene fotos del espacio físico (solo foto de perfil), Diego/Sofía descartan rápido.
- F2-D-2: Precio por noche no siempre visible en card (verificar). Tienen que entrar ficha por ficha.
- F2-D-3: Filtro "mascotas aceptadas" (¿acepta gatos AND perros?) existe pero puede ser confuso.

### Exploración + decisión

**Comportamiento**: filtran por comuna (Las Condes o cercanas) + categoría cuidado/hospedaje + mascotas (perro + gato) + fechas disponibles 23-30 dic.

**Momento "aha"**: encuentran cuidador con foto de un living con gato en sofá + perro durmiendo + rating 4.7 + 5 reseñas que mencionan "muy atenta con los míos", "mandó fotos todos los días".

**Fricciones**:
- F2-D-4: Sin filtro "disponible fechas X-Y" (verificar) → tienen que entrar ficha + revisar calendario.
- F2-D-5: Reseñas pueden no estar presentes (data prod: 1 evaluación total) → Diego/Sofía dudan sin social proof.
- F2-D-6: Cuidador puede no ofrecer F2 estadías configuradas → ambiguity "¿acepta 7 días seguidos?".

### Contacto + reserva F2

**Flow**: click "Reservar" → modal F2 picker rango check-in/check-out + capacidad.

**Momento crítico**: F2 requiere agenda activa del proveedor. Hoy solo **7 proveedores tienen agenda activa** (data prod). Si el cuidador que les gustó no tiene agenda → tienen que contactar por chat + coordinar manual.

**Fricciones**:
- F2-D-7: Diferencia F1/F2 oculta al tutor → si el cuidador no habilitó F2, no hay picker visible → confusión.
- F2-D-8: Si contactan por chat, respuesta puede tardar 24h+ → pierden ventana de planificación.

### Post-reserva confirmada

**Loop esperado**: fotos diarias del cuidador. Milo y Luna felices. Diego/Sofía tranquilos vacaciones.

**Retención**: si experiencia 10/10, Diego/Sofía repiten cuidador mismo o lo recomiendan.

### Hallazgos cruzados Persona 2

**Críticos pre-campañas**:
- F2-D-6 / F2-D-7 (F2 agenda confusa, 42% proveedores sin activar) → H2 funnel registro proveedor "banner post-publicación activar agenda".
- F2-D-1 (fotos del lugar) → prompt proveedor "agrega 3 fotos del lugar donde cuidas".

**Post-campañas**:
- Filtro "disponible fechas" en `/explorar`.
- Sistema de reseñas verificadas.

---

## Persona 3 — Juan, proveedor nuevo sin clientes aún

**Perfil**:
- 28 años, ingeniero civil freelancer en Ñuñoa.
- Tiene 2 perros propios + experiencia cuidando mascotas de amigos.
- Ingresos irregulares freelance ~$800k-1.5M CLP.
- Busca ingreso extra estable.
- Usa Instagram + LinkedIn.

**Trigger**: dejó trabajo anterior → busca alternativas con menos horas + le gustan los animales → ve ad Meta de Pawnecta "Sin comisión por conectar".

### Antes de llegar a Pawnecta

**Pensamiento**: "¿Esto funciona? ¿Realmente sin comisión? ¿Cuánto podría ganar paseando perros fin de semana?"

**Preocupaciones**:
- Clientes reales vs "la app está vacía".
- Cobro: ¿cómo me pagan? ¿Pawnecta cobra?
- Tiempo invertido vs retorno.
- Competencia local (cuántos paseadores en Ñuñoa).

### Primera visita

**Aterriza en**: `/soy-proveedor` (landing B2B propuesta de landings-trafico-pagado.md) o `/register?rol=proveedor` directo.

**Primeros 10 segundos**: lee "Sin comisión por conectar" + lista beneficios. **Momento clave**: ve `N proveedores activos` count → si es alto (>50) confirma marketplace real.

**Fricciones**:
- F3-J-1: Hoy el count de proveedores (26) es bajo. Juan puede pensar "el marketplace aún no arrancó, pierdo tiempo".
- F3-J-2: Sin testimonios de proveedores actuales → falta prueba social del lado oferta.
- F3-J-3: Zero mención de "cuánto podrías ganar" concreto → incertidumbre.

### Registro

**Flow**: Step 1 → Step 2 (datos personales) → Step 3 (cuéntanos sobre tu servicio).

**Fricciones**:
- F3-J-4: Step 3 exige elegir categoría + descripción + precio EN EL MISMO FLOW de registro (H3 funnel registro proveedor). Juan no está seguro de su precio → abandona o pone precio bajo arbitrario.

**Momento "aha"**: si llega al Step 4 "¡Listo!" → confirma email → entra al panel `/proveedor` + ve su servicio publicado.

### Primera semana sin reservas

**Realidad**: 54% de proveedores NO publica servicio tras registro (data prod). Juan quizás ni publicó aún si abandonó Step 3.

**Si publicó**: espera reservas. 1-7 días sin mensaje → ansiedad "esto no funciona".

**Fricciones críticas**:
- F3-J-5: Sin cron recordatorio "no has recibido reservas, aquí 3 tips para mejorar perfil" → Juan abandona sin feedback.
- F3-J-6: Sin dashboard de "qué tutores vieron tu perfil" → no sabe si falla el perfil o la demanda.

**Momento "aha"**: primer mensaje de un tutor. Responde rápido. Reserva confirmada. Juan siente que es real.

### Post-primera reserva

**Loop retención**:
- Más reservas → ingresos incrementales → Juan prioriza Pawnecta.
- Reseñas acumuladas → más confianza → más reservas → loop.

### Hallazgos cruzados Persona 3

**Críticos pre-campañas**:
- F3-J-4 (Step 3 obligatorio) → H3 funnel registro proveedor "Step 3 opcional".
- F3-J-5 (sin recordatorios progresivos) → Sprint onboarding proveedor + ADMIN-PROVEEDORES-RECORDATORIO-MANUAL.
- F3-J-1 (count bajo) → ocultar count o reformular "proveedores verificados en tu zona" sin número.

**Post-campañas**:
- Dashboard proveedor con stats (visitas, contactos, conversiones).
- Sistema de badges progresivos ("Primer servicio publicado", "Primera reserva", "5 reseñas").

---

## Hallazgos cruzados — patrones comunes 3 personas

### Pattern 1 — Momento aha tarda demasiado en llegar

Para las 3 personas, el "aha" real es la **primera transacción exitosa** (contacto exitoso Camila, reserva confirmada Diego/Sofía, primera reserva recibida Juan). Pero el gap entre aterrizar → "aha" es:

- Camila: ~5-15 min desde landing hasta contactar (si supera fricciones).
- Diego/Sofía: 20-40 min desde landing hasta reservar (decisión más pesada).
- Juan: 2-7 días desde registro hasta primera reserva (depende de demanda).

**Oportunidad**: reducir tiempo hasta el "aha" en cada persona mediante quickwins (preserve context, better social proof, better matching).

### Pattern 2 — Social proof es crítico y débil hoy

- 26 proveedores activos (baja densidad).
- 1 evaluación total (zero social proof real).
- 58% sin foto de perfil.

**Oportunidad**: priorizar **calidad de los 26 perfiles existentes** antes de escalar volumen. Si cada perfil vale más, cada visitante convierte más.

### Pattern 3 — Fricción máxima en transición email → post-login

Las 3 personas (sí incluso Juan proveedor) sufren el flow "confirma email → vuelve al sitio → pierde contexto". Fix único resuelve 3 personas simultáneamente (H1 funnel contacto + extension a proveedores).

### Pattern 4 — Sin diferenciación de servicio por persona

Hoy `/explorar` es vista única. Camila paseo casual vs Diego/Sofía hospedaje largo vs Juan proveedor no ven UIs diferentes.

**Oportunidad**: landings dedicadas por intent (ver `landings-trafico-pagado.md` — las 3 propuestas cubren exactamente las 3 personas).

### Pattern 5 — Zero loop de retención proactivo hoy

Los 3 flows terminan en "reserva confirmada" o "primera reserva recibida" sin seguimiento. Loop de re-engagement ausente.

**Oportunidad**: cron recurrente "¿Cómo estuvo tu última reserva? Deja una reseña" + "Próxima reserva en 5 días" + "Juan, te queda 1 día sin reservas, prueba estas 3 cosas".

---

## Top 5 fixes orientados por journey

| # | Fix | Persona principal | Impacto |
|---|---|---|---|
| 1 | Preservar contexto URL post-confirmación email | **3 personas** | +20-40% retención |
| 2 | Banner post-publicación activar agenda F1/F2 | Juan (y afecta Diego/Sofía indirecto) | +30-50% F1/F2 activa |
| 3 | Chip naming "cuidado" → "Cuidado y Hospedaje" | Camila + Diego/Sofía | Zero confusión naming |
| 4 | Simplificar Step 3 registro proveedor | Juan | +15-25% proveedores publican |
| 5 | Primera landing dedicada por intent (`/paseador-santiago`, `/cuidador-vacaciones`, `/soy-proveedor`) | 3 personas específicas | +25-40% conversion ads |

**Esfuerzo total top 5**: ~2 días. Alineado con tareas pre-campañas de los docs anteriores.

---

## Decisiones pendientes del PO

### D1. Validar personas con usuarios reales

**Pregunta**: ¿valide hacer 3 entrevistas de 20 min con usuarios actuales (Camila-like, Diego/Sofía-like, Juan-like) para validar las personas?

**Recomendación**: sí si hay volumen suficiente post-primera campaña. Con 127 users + 26 proveedores actuales, el recall es limitado pero útil.

**Impacto si no se decide**: default = personas basadas en heurística auditor, no en data real.

### D2. Métricas adicionales GA4 por persona

**Pregunta**: ¿agregamos custom dimension `user_segment` (tutor_casual, tutor_hospedaje, proveedor_nuevo) en GA4?

**Recomendación**: sí post-primeras-campañas. Permite trackear journeys separados.

**Impacto si no se decide**: default = metrics agregadas sin segmentar.

### D3. Prioridad top 5 fixes por journey

**Pregunta**: ¿autorizás los top 5 pre-campañas en bloque?

**Recomendación**: sí. Afectan directamente los 3 journeys.

**Impacto si no se decide**: default = quedan en BACKLOG.

### D4. Cuarta persona post-lanzamiento

**Pregunta**: ¿agregamos persona "admin Aldo" para auditar flows internos (/admin) o eso no es necesario?

**Recomendación**: no como buyer persona, pero sí como documento operacional del admin workflow. Sprint propio.

**Impacto si no se decide**: default = PO opera sin flow mapeado.

---

## Firma

Documento complementa auditorías de funnel + copy + a11y. Las 3 personas forman base para decisiones UX pre-campañas priorizadas por impacto cross-journey.
