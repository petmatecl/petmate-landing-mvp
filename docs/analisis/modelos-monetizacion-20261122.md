# Modelos de monetización — propuesta para Pawnecta

Written for: el PO (Aldo), para decidir estrategia de monetización futura (hoy Pawnecta es 100% gratis). Investigación de 5 marketplaces análogos + propuesta de modelo híbrido aterrizable para Pawnecta.

**Contexto**: Pawnecta está pre-launch. La decisión de monetización no es inmediata (primero 100 proveedores + catalogo real). Pero el modelo elegido tiene consecuencias de arquitectura (e.g., si cobramos comisión por transacción, necesitamos payments in-platform → semestres de trabajo). Decidir temprano evita refactor caro.

---

## Benchmarks: 5 marketplaces análogos

### 1. Airbnb (hospedaje)

**Modelo**: comisión por transacción + fee de servicio.

**Detalle**:
- **Host (proveedor)**: paga **3%** de comisión por booking.
- **Guest (tutor)**: paga **~14%** de service fee sobre el subtotal.
- Total take-rate: **~17%** combined.
- Pagos in-platform (Stripe + Braintree + Adyen).

**Pros**:
- Zero cost upfront al proveedor.
- Alineación perfecta (ganamos si ellos ganan).
- Transparencia total (precios + fees explícitos).

**Contras**:
- Requiere payments in-platform (compleja compliance + integración).
- Compra fuera-de-plataforma (coordinar WhatsApp) es un leak masivo.

**Aplicabilidad Pawnecta**: **ALTA a mediano plazo** pero **BAJA hoy** (payments no existen + tickets pequeños = fee de $200-500 CLP por paseo no justifica infra de pagos).

---

### 2. Rover (paseadores + cuidadores US)

**Modelo**: comisión + fee de servicio (mezclado).

**Detalle**:
- **Sitter (proveedor)**: paga **15-20%** de comisión por booking, dependiendo del nivel.
- **Owner (tutor)**: paga **5-10%** de service fee.
- Total take-rate: **~20-30%** combined. **Más alto que Airbnb** porque es nicho específico + alto costo adquisición.
- Payments in-platform (Stripe).

**Pros**:
- Modelo probado en el nicho exacto de Pawnecta.
- Sitter se compromete a usar la plataforma (no puede cobrar fuera).
- Fees bajos per transacción pero altos por volumen.

**Contras**:
- Take-rate agresivo expulsa a proveedores que podrían operar fuera.
- Chile no tiene cultura de app-pago para servicios cotidianos todavía (mediano).

**Aplicabilidad Pawnecta**: **ALTA a mediano plazo**. Modelo a replicar post-pagos in-platform.

---

### 3. Workana (freelancers LATAM)

**Modelo**: comisión + suscripción premium.

**Detalle**:
- **Freelancer (proveedor)**: comisión **15%** de cada proyecto completado + opción Premium ($70-150 USD/mes) que da acceso a propuestas ilimitadas, mayor visibilidad, filtros mejorados.
- **Cliente (tutor)**: 0 cost upfront + fee de servicio (~5%) al pagar.

**Pros**:
- Modelo híbrido: sostiene proveedores free pero captura upside de los top.
- Proveedor premium se auto-selecciona (menos ruido = más calidad).

**Contras**:
- Complejidad: 2 modelos conviviendo (comisión + suscripción).
- Fee de 15% sigue siendo alto.

**Aplicabilidad Pawnecta**: **MEDIA**. El modelo premium puede inspirar un "proveedor destacado" en Pawnecta (ya se propuso en el plan calidad B4).

---

### 4. UberEats (delivery de comida)

**Modelo**: comisión agresiva + fee de delivery + Uber One subscription.

**Detalle**:
- **Restaurante**: paga **25-30%** de comisión por pedido.
- **User**: paga delivery fee ($1-5 USD) + service fee.
- Uber One: $10/mes, cliente evita delivery fees + descuentos.

**Pros**:
- Captura tutor en el servicio recurrente (sub) + proveedor en cada transacción.
- Modelo probado con volumen masivo.

**Contras**:
- **No aplicable** a Pawnecta — los proveedores pet-tech no pueden absorber 25-30% de comisión sobre un paseo de $8k ($2k de comisión por paseo = inviable).

**Aplicabilidad Pawnecta**: **BAJA**. El take-rate de delivery funciona porque el user paga premium por conveniencia; en pet-care el user busca precio justo + confianza.

---

### 5. Rappi (super app LATAM)

**Modelo**: comisión + ads + subscription (Prime).

**Detalle**:
- **Restaurante/tienda**: comisión 15-30% + pago por aparecer destacado.
- **User**: delivery fee + Rappi Prime ($10-15k CLP/mes) que exenta delivery + beneficios.
- **Ads**: modelo publicitario donde marcas pagan por aparecer en banners/search.

**Pros**:
- Múltiples fuentes de ingreso diversificadas.
- Subscription genera recurring revenue predecible.

**Contras**:
- Complejidad operacional alta.
- Ads require volumen masivo para ser interesante para marcas.

**Aplicabilidad Pawnecta**: **MEDIA post-launch**. Modelo de ads/destacado tiene potencial (ver propuesta híbrida abajo).

---

## Síntesis de modelos observados

| Modelo | Transparencia | Alineación user+provider | Requiere payments | Viabilidad CL hoy |
|--------|:--------------:|:-------------------------:|:-----------------:|:------------------:|
| Comisión pura (Airbnb) | Alta | Alta | SÍ | MEDIA (payments no existen) |
| Comisión + fee (Rover) | Alta | Alta | SÍ | MEDIA |
| Comisión + Premium (Workana) | Media | Media | Parcial | ALTA (premium sin payments) |
| Comisión agresiva (UberEats) | Baja | Baja | SÍ | BAJA (no funciona en pet) |
| Comisión + Ads + Sub (Rappi) | Media | Variable | SÍ | BAJA (complejidad excesiva) |

---

## Propuesta aterrizable para Pawnecta (modelo híbrido 3 fases)

### Fase A — "Gratis + ads + destacado" (meses 0-6 post-launch)

**Qué cobramos**:
- **Nada por transacción**. Flow gratis para tutor + proveedor.
- **Plan destacado proveedor**: $8.000-15.000 CLP/mes por proveedor que quiera aparecer arriba del catálogo + badge "Destacado" + 2x más visibilidad.
- **Ads de productos/marcas externas**: banners pet-related en el feed /explorar (comida, accesorios, seguros). Monetización lenta — requiere scale de usuarios.

**Cómo construimos**:
- Columna `proveedores.destacado boolean` + plan subscription Stripe (SOLO para el destacado — no para transacciones). ~1 sprint.
- Admin tab para manejar subscripciones.
- Tráfico de ads via auto-serve (Google AdSense, no vendemos directo) para empezar.

**Ingreso potencial**: con 100 proveedores + 10% destacados ($12k/mes promedio) = **$120k CLP/mes** ($1.5M CLP/año). Zero break-even pero construye hábito de pago.

### Fase B — "Comisión suave" (meses 6-18 post-launch)

**Qué cobramos**:
- **Fee de servicio al tutor**: 5% sobre transacciones hechas via platform (reservas F1/F2 con precio definido).
- **Mantenemos plan destacado** del Phase A.
- **Keep ads externos**.

**Cómo construimos**:
- **Integración de payments** (Stripe o Transbank local). Sprint grande (3-4 meses de trabajo).
- Flow de checkout con fee transparente en el momento de reservar.
- Backend para refunds / disputas.

**Trade-off clave**: algunos proveedores van a seguir queriendo cobrar fuera de plataforma (por WhatsApp) para evitar el fee. Mitigación: gamificación + badge "Pago verificado en Pawnecta" para proveedores que operan in-platform.

**Ingreso potencial**: con 500 proveedores + 200 transacciones/semana x $10k promedio x 5% = **$200k CLP/semana** = $800k/mes. Break-even potencial.

### Fase C — "Diversificación" (mes 18+)

**Qué cobramos**:
- Comisión del Phase B.
- **Marketplace de productos**: tutor puede comprar comida + accesorios in-platform (alianza con tiendas pet). Comisión 10-15% sobre venta.
- **Seguros de responsabilidad civil** para proveedores: $2-5k/mes, Pawnecta facilita + captura 20% de la prima.
- **Comisión ads interno** (proveedores pagan por aparecer en search específicos).

**Posible dependencia**: podría requerir levantar capital para integraciones y sumar team. Decisión estratégica del PO en ese momento.

---

## Propuesta de activación mínima inmediata (si urge)

**Si el PO necesita monetización desde día 1 pre-launch, opción light**:

- **Plan "Destacado" opt-in**: $5.000-8.000 CLP/mes vía Transbank OneClick (ya existe + fácil).
- **Zero cambio al código funcional**: solo agregar toggle admin + badge visual + ordenamiento en /explorar RPC.
- Esfuerzo: ~1-2 semanas.
- Ingreso esperado: muy bajo al principio (2-3 proveedores early adopters = $15-25k/mes), pero construye el patrón.

**Mi recomendación**: **NO hacer esto día 1**. Primero 100 proveedores + validar que la plataforma genera reservas reales + demanda por el "destacado". Monetización prematura puede sabotear adopción.

---

## Alternativas descartadas (con razones)

| Modelo | Razón descarte |
|--------|----------------|
| Freemium puro (features premium a tutores) | Tutor es el lado con menos lock-in — no paga por features que son hygiene. |
| Pay-per-lead a proveedores | Modelo "Angie's List" clásico. Proveedores odian pagar por leads que no convierten. |
| Cobro directo a cuidadores sin prov value add | Antagonizante para la base inicial. |
| Marketplace B2B con grandes clínicas | Diferente mercado — no es el nicho de Pawnecta hoy. |
| Comisión 20%+ desde día 1 | Expulsa proveedores a WhatsApp. Pero más importante — ignora que los take-rates altos solo funcionan con alta captura de valor + lock-in. |

---

## Decisiones pendientes del PO

### D1. Horizonte de monetización

**Pregunta**: ¿cuándo esperás arrancar a cobrar en algún formato?

**Recomendación**: **meses 6-12 post-launch, no antes**. Primero 100 proveedores + demand real + validar NPS.

### D2. Modelo final de la Fase A

**Pregunta**: ¿plan destacado + ads externos? ¿O solo destacado?

**Recomendación**: **solo destacado**. Ads externos agregan complejidad + pueden percibirse como spam. Mejor construir confianza primero.

### D3. Payments in-platform — sprint cuándo

**Pregunta**: ¿cuándo arrancar sprint de pagos in-platform?

**Recomendación**: **mes 6-9**, cuando sepamos que hay demanda sostenida + número de transacciones justifica infra. Si antes, es prematura.

### D4. Alianzas con marcas CL (ads)

**Pregunta**: ¿preguntar a marcas pet CL (PetHouse, Puppis, Laika, etc.) por posibles alianzas publicitarias ya?

**Recomendación**: **no pre-launch**. Primero tracción orgánica. Marca que llega pre-tracción pide descuentos extremos o rechaza.

### D5. Fee al tutor vs al proveedor

**Pregunta**: en Fase B, ¿el fee va al tutor o al proveedor?

**Recomendación**: **al tutor (5%)**. Razón: el tutor busca servicio premium (confianza + conveniencia), paga poco adicional sin resistencia. El proveedor opera en margen más chico, si le descontamos 5% + Stripe fee = puede expulsarlo.

Alternativa: **compartir 50/50** (2.5% a cada uno) → bajo impacto individual pero ambos sienten que pagan la plataforma.

---

## Firma

Este análisis es base para decidir estrategia de monetización cuando toque. La recomendación central es **ser paciente** — Pawnecta no necesita monetización inmediata, y arrancar prematuro puede sabotear tracción. Mejor validar hipótesis + construir base + luego monetizar.
