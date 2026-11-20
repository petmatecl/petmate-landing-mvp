# Plan de testing de campañas con presupuesto bajo — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: validar hipótesis de adquisición con **$50.000 CLP Meta (Facebook/Instagram Ads) + $50.000 CLP Google Ads** antes de escalar inversión. Máximo $100.000 CLP para learnings accionables.
**Precondición**: alcanzar meta de 100 proveedores activos (criterio PO reset 2026-11-20) y haber aterrizado los fixes pre-campañas críticos (ver `docs/sprints/pre-campanas.md`).

---

## Principio de diseño

- **Tests pequeños pero disciplinados**: cada test tiene hipótesis + métrica clara + criterio de cut. Zero "gastemos y veamos qué pasa".
- **Separación plataforma**: Meta y Google miden audiencias distintas (social scrolling vs search intent). Testear en paralelo para no sesgar.
- **Primera semana = validación, no escala**: el objetivo NO es maximizar reservas, es aprender qué funciona para escalar después.

---

## Métricas de éxito (hipótesis conservadora)

**Baseline sin referencias previas**:
- Costo por click (CPC) esperado Chile pet-care: $100-400 CLP (variable por plataforma y tier).
- Costo por registro (signup completo): $2.000-5.000 CLP si audiencia segmentada bien.
- Costo por contacto iniciado (métrica norte): $4.000-10.000 CLP.
- Costo por reserva confirmada: $8.000-20.000 CLP (en marketplace competido LATAM).

**Criterio GO para escalar post-test**:
- Al menos 1 de los 6 tests (3 Meta + 3 Google) tiene **costo por contacto < $8.000 CLP**.
- O al menos 2 tests tienen **CTR > 1.5%** + costo por click < $200.

**Criterio CUT (detener antes)**:
- A las 48h, si el CPC > $500 → pausar ad set, revisar creative/audiencia.
- A los 7 días, si el test NO generó ningún registro de tutor → detener y reajustar hipótesis.

---

## Tests de Meta (Facebook/Instagram Ads) — $50.000 CLP

### Meta-T1 — Audiencia interés "mascotas" + copy emocional

**Hipótesis**: tutores emocionalmente conectados con sus mascotas responden a copy afectivo ("Déjalos en buenas manos").

**Configuración**:
- Plataforma: Facebook + Instagram feed + Stories.
- Audiencia: Chile, 25-55 años, interés "Dogs", "Cats", "Pet care", "Veterinarian" (compound AND).
- Formato: Carrusel 3 slides con foto de perro/gato + CTA "Encuentra un paseador".
- Landing: `/paseos/{comuna-geolocation}`.
- Budget: $17.000 CLP/día × 7 días.

**Duración**: 7 días.

**Métrica de éxito**: **CTR > 1.2%** + costo por registro < $4.000 CLP.

**Criterio de cut**: 48h con CPC > $300.

### Meta-T2 — Audiencia lookalike + copy funcional

**Hipótesis**: audiencia lookalike de nuestros 127 users actuales (si GA4 + Pixel permiten) tiene mayor conversión que interés genérico.

**Configuración**:
- Audiencia: Lookalike 1% Chile basado en Custom Audience "users registered Pawnecta" (importar via GA4 → Audiences → Meta integration).
- Formato: Imagen única (foto real de proveedor con mascota + autorización) + copy "Reserva paseador en {comuna} en 2 minutos".
- Landing: `/explorar`.
- Budget: $17.000 CLP/día × 7 días.

**Duración**: 7 días.

**Métrica de éxito**: CTR > 1.5% + registro completo rate > 20% de clicks.

**Criterio de cut**: 48h con 0 registros.

**Dependencia**: Pixel instalado + al menos 100 registros capturados pre-launch para que el lookalike tenga seed. Hoy tenemos 127 users → suficiente.

### Meta-T3 — Audiencia proveedores (lado oferta)

**Hipótesis**: ayuda sumar MÁS proveedores a la meta 100 si el Meta Ad captura emprendedores pet-care.

**Configuración**:
- Audiencia: Chile, 22-60, interés "Small business", "Entrepreneur", "Freelance", "Dog walking", "Pet care".
- Formato: Imagen + copy "Ofrece tus servicios en Pawnecta. Sin comisión por conectar".
- Landing: `/register?rol=proveedor`.
- Budget: $17.000 CLP/día × 7 días.

**Duración**: 7 días.

**Métrica de éxito**: registros proveedor completados > 5 en 7 días ($10.000 CLP / 5 = $2.000 CLP por proveedor nuevo, aceptable).

**Criterio de cut**: 48h con 0 clicks a `/register`.

---

## Tests de Google Ads — $50.000 CLP

Google Ads captura **intención de búsqueda** directa — audiencia que YA busca lo que ofrecemos. ROI típicamente mayor que Meta en pet-care LATAM.

### Google-T1 — Exact match "paseador de perros en Santiago"

**Hipótesis**: usuarios buscando "paseador de perros" tienen alta intención → alto CTR + bajo CPL.

**Configuración**:
- Keywords exact match: `[paseador de perros santiago]`, `[paseador perros providencia]`, `[paseador perros las condes]`.
- Ad copy: "Paseadores de perros en {comuna} | Reserva directo | Sin comisión".
- Landing: `/paseos/{comuna-matched}` (ver `docs/planes/seo-programatico.md § Tier 1`).
- Budget: $17.000 CLP (total 7 días, no daily — Google lo distribuye).

**Duración**: 7 días o hasta que budget se acabe.

**Métrica de éxito**: **CTR > 4%** + costo por conversión (ficha_vista + contacto_iniciado) < $6.000 CLP.

**Criterio de cut**: 3 días sin ningún click → keyword demasiado nicho.

### Google-T2 — Broad match "cuidador de mascotas Chile"

**Hipótesis**: broad match captura queries long-tail inesperadas pero convierte menos que exact.

**Configuración**:
- Keywords broad match: `cuidador mascotas chile`, `guardería perros santiago`, `cuidado gatos domicilio`.
- Ad copy: "Cuidadores verificados cerca de ti | Reserva en línea | Pawnecta".
- Landing: `/cuidado` (landing categoría).
- Budget: $17.000 CLP (7 días).

**Duración**: 7 días.

**Métrica de éxito**: CTR > 2% + costo por conversión < $8.000 CLP.

**Criterio de cut**: budget exceeds $17.000 en 3 días con CPC > $400 (demasiado competido).

### Google-T3 — Keyword long-tail niche

**Hipótesis**: long-tail "paseador perro grande providencia" o "veterinario fin de semana santiago" tiene volumen bajo pero CPC muy bajo → ROI alto por conversión específica.

**Configuración**:
- Keywords phrase match: `"paseador perro grande providencia"`, `"veterinario fin de semana"`, `"peluquería canina a domicilio"`, `"adiestramiento canino cachorro"`.
- Ad copy: ultra-específico por keyword grupo. Ejemplo para "paseador perro grande": "Paseador especializado en perros grandes | Reserva con calendario | Pawnecta".
- Landing: ficha de proveedor específico si hay match, sino landing `/paseos/providencia`.
- Budget: $16.000 CLP (7 días).

**Duración**: 7 días.

**Métrica de éxito**: CTR > 5% (long-tail típicamente alto) + 1+ conversión.

**Criterio de cut**: sin impresiones a los 3 días → keywords sin volumen.

---

## Consideraciones prácticas

### Infraestructura mínima pre-tests

Antes de arrancar los $100.000 CLP:
1. **Meta Pixel instalado** en el sitio + eventos clave (ViewContent, Lead, CompleteRegistration). Esfuerzo: 1h.
2. **Google Ads conversion tracking** enlazado a GA4 custom events (`registro_tutor_completado`, `contacto_iniciado`, `reserva_confirmada`) marcados como conversion goals. Esfuerzo: 30 min.
3. **UTM tracking**: cada ad con UTM parameters específicos (`utm_source=meta/google&utm_campaign=T1/T2/T3&utm_content=creative_id`). Ya estándar.
4. **Landings pre-optimizadas** para las comunas/categorías prioritarias (ver `docs/planes/landings-trafico-pagado.md` + `docs/planes/seo-programatico.md`).
5. **Rate limit emails migrado a Upstash** (ítem S-R1 de `docs/auditorias/seguridad-20261120.md`) para no colapsar envío de emails en campaña.

### Timing recomendado

- **Preparación**: 2-3 días antes de arrancar (Pixel + landings + UTMs).
- **Lanzamiento**: todos los 6 tests mismo día (lunes idealmente, mayor atención).
- **Chequeo diario**: 15 min al día para verificar métricas clave + ejecutar cuts según criterios.
- **Cierre**: día 7 → compilar resultados + decidir cuál escalar.

### Schedule de ads

- **Meta**: 24/7 con bid strategy "Highest volume".
- **Google**: horario comercial 9:00-21:00 CLT (lunes-domingo). Pause nocturno para no quemar budget en horas de baja conversión.

---

## Reporte post-test (día 7)

Template a completar con datos reales:

```
TESTS DE CAMPAÑAS — RESULTADOS SEMANA {YYYY-MM-DD → YYYY-MM-DD}

Inversión total: $100.000 CLP ($50k Meta + $50k Google)

=== META ===
T1 (interés mascotas): $X,XXX gastados, Y clicks, CTR Z%, A registros, B contactos
T2 (lookalike): $X,XXX gastados, Y clicks, CTR Z%, A registros, B contactos
T3 (proveedores): $X,XXX gastados, Y clicks, Z proveedores registrados

=== GOOGLE ===
T1 (exact paseador): $X,XXX gastados, Y clicks, CTR Z%, A registros, B contactos
T2 (broad cuidador): $X,XXX gastados, Y clicks, CTR Z%, A registros, B contactos
T3 (long-tail niche): $X,XXX gastados, Y clicks, CTR Z%, A registros, B contactos

=== VEREDICTOS POR TEST ===
Ganador (score impacto / costo): T{X} de plataforma {Y}
Perdedores: T{N}, T{M} (razones concretas)

=== DECISIÓN POST-TEST ===
Escalar: {T ganador} con presupuesto {$NNN,NNN CLP}
Iterar: {T con potencial} con cambios {X}
Descartar: {T perdedores}
```

---

## Rutina de análisis durante campaña

### Día 1-2 (setup + arranque)

- Verificar que Pixel + conversion tracking disparan eventos.
- Revisar cada 4h los primeros 2 días para catch cold start issues.

### Día 3-6 (monitoreo activo)

- Check matutino 15 min: CTR + CPC + conversions acumuladas por test.
- Ejecutar criterios de cut si aplican.

### Día 7 (cierre + análisis)

- Compilar resultados finales.
- Calcular CAC (costo por adquisición) por test.
- Decidir escalado con hipótesis refinada.

---

## Decisiones pendientes del PO

### D1. Fecha de arranque de los tests

**Pregunta**: ¿cuándo se activan los $100.000 CLP? ¿Al llegar a 100 proveedores exactos o antes para validación temprana?

**Recomendación**: cuando haya **al menos 50-60 proveedores activos** + cobertura mínima 5+ comunas × 3+ categorías. Validar con tráfico real antes de llegar a 100 para iterar la hipótesis.

**Impacto si no se decide**: default = esperar a 100 proveedores.

### D2. Agencia vs ejecución in-house

**Pregunta**: ¿el PO ejecuta los tests directamente en Meta Ads Manager + Google Ads, o contrata una agencia pet-care LATAM?

**Recomendación**: in-house para este primer test ($100k es chico, no justifica agencia 20% fee). Si escalamos a $500k+/mes, revisar agencia.

**Impacto si no se decide**: default = in-house PO.

### D3. Creative — fotos y copy

**Pregunta**: ¿el auditor arma drafts de copy (ya los hay en este doc) + PO consigue fotos reales con autorización de proveedores Pawnecta? O contratar banco de imágenes licenciado?

**Recomendación**: **fotos reales de proveedores Pawnecta** (previa autorización escrita). Más auténticas + validan nuestro sistema de contenido. Regla CLAUDE.md permite esto.

**Impacto si no se decide**: default = banco de imágenes libres (Unsplash/Pexels, pero sin cara frontal reconocible).

### D4. Presupuesto split 50/50 Meta/Google o re-balance

**Pregunta**: ¿$50k Meta + $50k Google o re-balance (ej. $30k Meta + $70k Google) basado en hipótesis de mayor intención Google?

**Recomendación**: **50/50 inicial** para learnings balanceados. Re-balance en test #2 con data de este.

**Impacto si no se decide**: default = 50/50.

### D5. Qué pasa si los 6 tests fallan todos

**Pregunta**: ¿autorizás un test #2 con otras hipótesis o pausar + re-estrategia?

**Recomendación**: si los 6 fallan → **pausa + diagnóstico**. Puede ser señal de (a) producto no listo (fricciones UX), (b) audiencia mal segmentada, (c) copy equivocado. No quemar más $100k sin entender.

**Impacto si no se decide**: default = pausa + diagnóstico.

---

## Firma

Plan listo para activar con GO del PO al llegar a hitos pre-campañas. Esfuerzo setup: 1-2 días. Esfuerzo ejecución: 7 días con chequeo diario 15 min. Decisión escalado: post-día 7.
