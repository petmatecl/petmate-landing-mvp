# Pricing strategy — opciones post-validación

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: analizar modelos de monetización que Pawnecta podría adoptar cuando valide traction post-campañas. **Puro análisis estratégico — zero decisión aquí**. Decide PO cuando tenga data real.
**Contexto actual**: Pawnecta hoy **no cobra nada** por conectar. Positioning "sin comisión por conectar" es diferenciador competitivo (ver `docs/analisis/benchmarks-marketplaces-20261120.md`).

---

## Principio operativo

**No monetizar hasta validar demanda**. El PO lo tiene claro — zero fee en V1 (lanzamiento orgánico + primeras campañas). Esta estrategia reemplaza el "siempre gratis" por "gratis mientras validamos, con opciones claras para escalar después".

Marco temporal de decisión:

- **Fase 0 (hoy → 100 proveedores + 1er mes campañas)**: zero fee. Validar traction + modelo de marketplace.
- **Fase 1 (meses 2-6 post-campañas con tracción)**: elegir modelo y pilotear con subset de proveedores.
- **Fase 2 (mes 6+)**: rollout completo del modelo elegido.

---

## Modelos candidatos

### Modelo A — Suscripción proveedor (SaaS-like)

**Cómo funciona**: proveedor paga mensualidad fija para publicar servicios + usar features (agenda online, chat, perfil público, verificación badge). Sin pago por reserva.

**Tiers propuestos**:
- **Gratis**: perfil básico + hasta 2 servicios publicados + chat.
- **Pro $7.900/mes** (equivalente a 1 paseo típico): servicios ilimitados + agenda F1/F2 + estadísticas + highlight en búsquedas + badge verificado.
- **Premium $19.900/mes**: todo lo anterior + publicidad destacada + boost SEO + sin límite de fotos.

**Pros**:
- ✅ Ingresos predecibles (MRR).
- ✅ No afecta la relación tutor-proveedor en cada transacción (precio al tutor no cambia).
- ✅ Alineado con positioning "sin comisión".
- ✅ Fácil de calcular ROI del proveedor (si recibe 1 reserva/mes paga, se justifica).

**Cons**:
- ❌ Proveedores iniciales pueden no pagar antes de validar que el canal funciona ("prueba gratuita de 30 días" obligatoria).
- ❌ Churn risk alto en meses lentos (ej. julio ene chileno con lluvia + vacaciones).
- ❌ Requiere differentiation clara entre tiers para que Pro valga la pena.

**Rentabilidad target**:
- Conversion free → pago: 15-25%.
- Con 100 proveedores activos y 20% pago en Pro → $158.000 CLP/mes MRR.
- Con 500 proveedores y 20% Pro → $790.000 CLP/mes MRR.

**Tiempo a implementar**: 3-4 semanas (billing + Stripe + feature gates + onboarding).

### Modelo B — Comisión por reserva

**Cómo funciona**: cada reserva confirmada paga comisión al platform. Dos sub-modelos:

- **B1 — Comisión al proveedor**: proveedor paga X% de cada reserva. Ejemplo 10%.
- **B2 — Service fee al tutor**: tutor paga X% extra al checkout. Ejemplo 5-8%.
- **B3 — Split**: 5% al proveedor + 5% al tutor (total 10%).

**Pros**:
- ✅ Alineación con valor generado (no cobras si no hay transacción).
- ✅ Scaling natural: tráfico 10x → ingresos 10x.
- ✅ Modelo validado por Rover (15% total approx), DOGIN.

**Cons**:
- ❌ **Requiere pago in-platform**. Hoy Pawnecta no procesa pagos. Setup complejo (MercadoPago / Flow / Transbank integración + flujo de cash collection + liquidación a proveedor).
- ❌ Reduce el diferenciador "sin comisión" (competitivo vs Rover/DOGIN).
- ❌ Riesgo fraude proveedor-tutor "pagamos por fuera" para evadir fee.
- ❌ UX más fricción para tutor (checkout con pago vs contacto directo).

**Rentabilidad target**:
- Con 100 reservas/mes × $15.000 CLP prom × 10% = $150.000 CLP/mes.
- Con 1.000 reservas/mes × $15.000 × 10% = $1.500.000 CLP/mes.

**Tiempo a implementar**: 2-3 meses (pagos + reglas + legal + KYC proveedores).

### Modelo C — Promoción pagada (ads internos)

**Cómo funciona**: proveedor paga por aparecer en primeras posiciones de `/explorar` + cards destacadas con badge "Patrocinado". Como Airbnb "Promover tu anuncio".

**Pros**:
- ✅ Opt-in del proveedor, no es fee obligatorio.
- ✅ No afecta el core (todos siguen listados gratis).
- ✅ Positioning "sin comisión" se mantiene.
- ✅ Precio por click o impresión fácil de testear.

**Cons**:
- ❌ Requiere volumen (tutores viendo `/explorar`) para que valga la pena al proveedor. Pre-campañas no funciona.
- ❌ Transparencia: badge "Patrocinado" visible, user puede decidir evitar.
- ❌ Ingresos lentos al inicio.

**Rentabilidad target**:
- Con 100 proveedores + 10% comprando boost mensual × $5.000 CLP = $50.000 CLP/mes. Bajo al inicio, escala con volumen.

**Tiempo a implementar**: 2-3 semanas (UI + tracking + billing).

### Modelo D — Freemium con features premium

**Cómo funciona**: core gratis forever. Features avanzadas con pago:

- **Analytics avanzados**: dashboard con conversion funnel, best times, comparación vs competencia local.
- **Multi-foto galería**: gratis límite 3 fotos; pago sin límite.
- **Agenda avanzada**: gratis F1 básica; pago F1 + F2 + sync Google Calendar + recordatorios automáticos.
- **Verificación preferencial**: gratis con cola de admin; pago verificación express < 24h.

**Pros**:
- ✅ Core gratis mantiene positioning + adopción.
- ✅ Monetizar los heavy users sin impactar casual.
- ✅ Aditivo, no restrictivo (nadie pierde features actuales).

**Cons**:
- ❌ Requiere construir features premium primero (no existen hoy). Esfuerzo alto para monetizar poco al inicio.
- ❌ Puede fragmentar UX (proveedores con foto 3 vs 20 side-by-side en catalog).

**Rentabilidad target**:
- 5-10% proveedores pagando feature × $4.000 CLP/mes = $20.000-40.000/mes a 100 proveedores.

**Tiempo a implementar**: 4-8 semanas (depende de features elegidas).

### Modelo E — Marketplace B2B (negocios a negocios)

**Cómo funciona**: cobrar a **negocios** (veterinarias, tiendas, hoteles) por aparecer en el futuro directorio (ver ítem BACKLOG `EXPANSION-DIRECTORIO-NEGOCIOS` + `DIRECTORIO-LUGARES-PETFRIENDLY`).

**Pros**:
- ✅ Monetización separada de proveedores persona (que siguen gratis).
- ✅ Alineada con la expansión del BACKLOG.
- ✅ Negocios físicos están acostumbrados a pagar por directorio (Google My Business premium, Yelp, PaginasAmarillas).

**Cons**:
- ❌ Requiere construir el directorio primero (feature grande, post-100-proveedores según BACKLOG).
- ❌ Volumen de negocios físicos < proveedores persona por 10x.

**Rentabilidad target**:
- 50 negocios × $15.000 CLP/mes = $750.000 CLP/mes. Alto potencial.

**Tiempo a implementar**: 3-6 meses (depende de scope del directorio).

### Modelo F — Afiliación con partners (comisión indirecta)

**Cómo funciona**: cobrar a partners (pet shops, veterinarias, aseguradoras mascota) por:
- Referidos de users (ej. tutor Pawnecta → compra en pet shop aliado con descuento).
- Logo + link en footer/landing categoría relevante.
- Promoción conjunta de servicios combinados.

**Pros**:
- ✅ No afecta UX del tutor ni del proveedor en marketplace core.
- ✅ Validado por Oliver Pets (Argentina, ver benchmarks).
- ✅ Diversifica revenue sin infra pagos.

**Cons**:
- ❌ Requiere relaciones comerciales con partners (B2B sales).
- ❌ Ingresos medianos (10-15% comisión de un ticket $5.000 = $500-750/user).
- ❌ Puede diluir el positioning Pawnecta ("¿somos marketplace o pet shop?").

**Rentabilidad target**:
- 500 referidos/mes × $500 CLP = $250.000 CLP/mes.

**Tiempo a implementar**: 1-3 meses (negociación + tracking).

---

## Comparación consolidada

| Modelo | Esfuerzo | Tiempo implement | Rev potencial 100 prov | Rev potencial 1000 prov | Riesgo differentiation |
|---|---|---|---|---|---|
| A — Suscripción | Medio | 3-4 semanas | $158k/mes (20% Pro) | $1.5M/mes | **Bajo** |
| B — Comisión reserva | Alto | 2-3 meses | $150k/mes | $1.5M/mes | **Alto** (pierde "sin comisión") |
| C — Promoción pagada | Bajo-medio | 2-3 semanas | $50k/mes | $500k/mes | **Bajo** |
| D — Freemium features | Medio-alto | 4-8 semanas | $20-40k/mes | $300k/mes | **Bajo** |
| E — Directorio B2B | Alto | 3-6 meses | $0 (requiere directorio) | $750k/mes | **Bajo** (separado del core) |
| F — Afiliación partners | Medio | 1-3 meses | $0-50k/mes (requiere volumen) | $250k/mes | **Medio** |

---

## Recomendación de mix por fase

### Fase 1 (meses 2-6 post-campañas con tracción)

**Combinar C + A light**:
- **C (Promoción pagada)** activada desde mes 2 — opcional, no afecta a nadie que no quiera. Monetiza sin disruption.
- **A tier gratis permanente + Pro opcional** desde mes 4 — algunos proveedores power-user ya empujan features; alineado con Positioning "sin comisión obligatoria".

**Rev target fase 1**: $50-100k/mes con 100-200 proveedores. Baja pero marca el inicio.

### Fase 2 (mes 6-18 post-campañas)

**Agregar E + F**:
- **E (Directorio B2B)** post-100 proveedores validados + lanzamiento del directorio con veterinarias/tiendas. Independiente del core.
- **F (Afiliación partners)** cuando haya volumen de users (500+ activos mes).

**Rev target fase 2**: $500k-1M/mes con 300-500 proveedores + 50 negocios + partners.

### Fase 3 (mes 18+)

**Evaluar B con cautela**:
- Si la competencia (DOGIN, Laika LATAM) ha migrado definitivamente a comisión y Pawnecta compite en features más que en precio, piloto **B con subset de proveedores** (5-8% comisión + pago in-platform via MercadoPago Chile).
- Mantiene "sin comisión" para quienes no quieren pago in-platform (opt-in).

**Rev target fase 3**: $2M+/mes.

---

## Riesgos transversales

### R1 — Perder positioning "sin comisión"

Es el diferenciador #1 vs competencia. Cualquier modelo que lo diluya (B, C si mal comunicado) requiere compensación en features o valor percibido.

**Mitigación**: siempre tener versión gratis forever como safety net. Monetizar los heavy users, no el baseline.

### R2 — Churn alto post-cobro

Proveedores acostumbrados a gratis pueden churn-out al introducir cualquier fee.

**Mitigación**: (a) grandfather clause para proveedores pre-monetización; (b) 60 días trial de features premium para familiarizar; (c) comunicación explícita del valor agregado.

### R3 — Complejidad legal (impuestos, boletas)

Cobrar en Chile requiere boleta electrónica + impuesto IVA 19% (si aplica — algunos servicios digitales están exentos para empresas < X UF).

**Mitigación**: consultoría tributaria antes de activar cobros. Monto esperado de setup: $200-500k CLP consultoría + implementación software (Facturación.cl, Haulmer, Nubox).

### R4 — Dependencia de Stripe/MercadoPago/Flow

Procesadores de pago chilenos tienen caídas + comisiones (2-3% típico). Pago in-platform (B) agrega 2-3% más al CAC.

**Mitigación**: evaluar MercadoPago + Flow + Transbank costs antes de arrancar B.

---

## Decisiones pendientes del PO

### D1. Fase 1 — ¿C + A light o solo C?

**Pregunta**: ¿Promoción pagada + suscripción Pro opcional desde mes 2-4, o solo Promoción hasta validar más?

**Recomendación**: **C solo inicialmente**. 2-3 semanas de implementación, zero disruption. A light en mes 4 si Promoción valida.

**Impacto si no se decide**: default = decisión al llegar a mes 2.

### D2. Comisión por reserva (B) — sí/no en algún momento

**Pregunta**: ¿Pawnecta eventualmente cobrará comisión por reserva, o el positioning "sin comisión" es permanente?

**Recomendación**: **positioning permanente**. Diferenciador fuerte vs Rover/DOGIN. Monetizar por otros caminos.

**Impacto si no se decide**: default = no.

### D3. Directorio B2B como tercer vertical

**Pregunta**: ¿expandir a directorio B2B es parte del roadmap post-100-proveedores?

**Recomendación**: sí. Alto ROI potencial + validado por benchmarks LATAM. Mismo foco demographic (mascotas).

**Impacto si no se decide**: default = evaluar post-Fase 1.

### D4. Consultoría tributaria pre-cobros

**Pregunta**: ¿cuándo contratamos asesor tributario? ¿Al inicio o cuando los ingresos justifiquen?

**Recomendación**: **antes de cobrar el primer peso**. Evita problemas futuros. Costo manejable ($200-500k setup).

**Impacto si no se decide**: default = evaluar al momento de activar cobros.

### D5. Grandfather clause para proveedores actuales

**Pregunta**: ¿los 26 proveedores actuales + los que lleguen hasta activación de cobros tienen free-forever o están sujetos a los mismos cobros?

**Recomendación**: **grandfather forever** de core features (publicar + agenda + chat gratis). Solo cobrar features nuevas de post-monetización. Beneficia la fidelidad early-adopter.

**Impacto si no se decide**: default = decisión al momento de activar.

---

## Firma

Análisis estratégico. Zero decisión aquí. El PO decide con data real post-fase 0 + traction métrica. Re-revisar cada 3-6 meses.
