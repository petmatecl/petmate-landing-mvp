# Plan de experimentos A/B — post-launch (primeras 4 semanas)

**Audiencia**: PO · **Autor**: auditor (2026-11-19 noche).
**Objetivo**: priorizar experimentos que mueven la aguja real en las primeras 4 semanas (26-11 → 23-12). Cada experimento tiene costo de implementar + duración + métrica objetivo + hipótesis.
**Supuesto**: no hay plataforma A/B montada (Growthbook, Optimizely, etc.). Primer sprint de experimentos usa toggle simple por env var + instrumentación GA4. Si volumen justifica, migrar a plataforma dedicada.

---

## Marco de decisión

Un experimento vale la pena si cumple todos:

1. **Hipótesis clara**: "si cambiamos X, esperamos que Y suba Z%".
2. **Métrica medible**: GA4 event o Supabase query concreta.
3. **Costo implementación ≤ 1 día**.
4. **Duración razonable**: suficiente volumen para N significativo (ver tabla abajo).
5. **Decisión binaria**: al final del test, se decide A o B — no se queda ambiguo.

### Volumen mínimo por métrica

Con tráfico esperado inicial (estimación conservadora: 500-2000 uniques/semana primeras 2 semanas):

| Métrica | Baseline esperada | Mínimo para test confiable |
|---|---|---|
| Click en CTA "Contactar" / "Reservar" en ficha | 15-30% de vistas de ficha | 300+ vistas por variante |
| Signup completion rate | 40-60% de inicios | 100+ inicios por variante |
| Reserva iniciada → confirmada | 50-70% | 50+ reservas iniciadas por variante |
| Open rate correo welcome | 30-50% | 200+ entregas por variante |

Si el volumen semana 1 no alcanza, el experimento corre semanas 2-3 o se pospone.

---

## Pool de experimentos priorizados

Ranking por `impacto esperado / costo implementar`:

### Top 5 experimentos (primera ola — semanas 1-2)

### E1 — Variantes del CTA en ficha de servicio

**Hipótesis**: el CTA "Enviar mensaje" tiene menos conversión que "Contactar al proveedor" porque "mensaje" sugiere conversación larga; "contactar" sugiere acción puntual.

**Variantes**:
- A (control): "Enviar Mensaje" (actual).
- B: "Contactar al proveedor".
- C (opcional): "Chatear ahora".

**Métrica**: click rate en el botón / visitas a la ficha.

**Tracking**: GA4 event `cta_ficha_click` con prop `variant: A|B|C` + `servicio_id`.

**Implementación**:
- Toggle por env var `NEXT_PUBLIC_EXPERIMENT_CTA_FICHA=A|B|C` o random assign client-side con seed en localStorage.
- Cambiar label en `ServiceDetailView.tsx:1732` y `1902`.

**Costo**: 2-3h. Instrumentar GA4 event + lógica de assign + copy swap.

**Duración**: 2 semanas o hasta 300 clicks por variante (lo que ocurra primero).

**Criterio decisión**: diferencia ≥10% en click rate con N significativo. Si todas empatan, mantener A.

### E2 — CTA "Reservar" vs "Reservar ahora" en ficha F1

**Hipótesis**: agregar "ahora" al CTA aumenta urgencia + reduce fricción percibida. +5-10% conversión.

**Variantes**:
- A (control): "Reservar".
- B: "Reservar ahora".
- C: "Agendar cita".

**Métrica**: click en CTA → abrir modal reserva / vistas de ficha.

**Tracking**: GA4 event `cta_reservar_click`.

**Implementación**: toggle env var. Swap label en modal trigger.

**Costo**: 1h.

**Duración**: 2 semanas.

### E3 — Hero home: "Encuentra" vs "Explora"

**Hipótesis**: "Encuentra" es acción implícita de búsqueda (user activo); "Explora" es acción pasiva (user navegando). Misma literatura UX apunta a +5-15% en conversión con verbo de acción.

**Variantes**:
- A (control): "Explora servicios para tu mascota" (actual).
- B: "Encuentra el servicio perfecto para tu mascota".
- C: "Pawnecta: servicios de calidad para tu mascota".

**Métrica**: click en SearchBar hero → navegación a `/explorar` con categoría.

**Tracking**: GA4 event `hero_search_submit` con prop `variant`.

**Implementación**: toggle. Swap H1 del hero.

**Costo**: 1-2h (incluye prerender SSG considerations si el hero es estático).

**Duración**: 2 semanas.

### E4 — Correo welcome: subject "Bienvenido" vs "Tu cuenta Pawnecta está lista"

**Hipótesis**: subject con acción tangible ("tu cuenta está lista") abre más que subject genérico ("bienvenido"). +3-8% open rate.

**Variantes**:
- A (control): "Bienvenido a Pawnecta, {nombre}" (actual).
- B: "{nombre}, tu cuenta Pawnecta está lista".
- C: "{nombre}, bienvenido a Pawnecta — próximos pasos".

**Métrica**: open rate (Resend Analytics) + click rate del CTA interno.

**Tracking**: Resend ya reporta open/click rates. Variantes requieren `metadata.variant` en el `send()` call.

**Implementación**: toggle. Swap subject en `pages/api/auth/welcome.ts`.

**Costo**: 1h.

**Duración**: 3 semanas (necesita más volumen por el bucket señales smaller).

### E5 — Home: sección destacada "Cuidado y Hospedaje" visible vs oculto

**Hipótesis**: la sección "Cuidado y Guardería (X disponibles)" en home captura demanda específica + aumenta tráfico a esa categoría. Impacto esperado: +20-30% vistas de ficha de categoría destacada.

**Variantes**:
- A (control): home sin sección "Cuidado y Hospedaje" destacada.
- B: home con sección "Cuidado y Hospedaje (N disponibles)" + CTA "Ver todos".

**Métrica**: navegación de home → `/cuidado` (landing categoría) o `/explorar?categoria=cuidado`.

**Tracking**: GA4 event `hero_category_click` con prop `category: cuidado`.

**Implementación**: requiere agregar sección si no existe (verificar estado actual de home). Si no existe, es implementación más costosa.

**Costo**: 3-4h si la sección no existe (diseño + fetch de count + CTA).

**Duración**: 3 semanas.

**Criterio decisión**: diferencia ≥20% en conversión a ficha cuidado.

---

### Top 5 experimentos (segunda ola — semanas 3-4)

### E6 — Paginación `/explorar`: 12 cards vs 24 cards por página

**Hipótesis**: más cards por página (24) aumenta scroll y clicks totales; menos cards (12 actual) exige paginar + costo de fricción.

**Variantes**: 12 vs 24.

**Métrica**: clicks en ficha por sesión en `/explorar`.

**Costo**: 1h (cambio en `buscar_servicios` RPC `p_limit` default + skeleton count).

**Duración**: 2 semanas.

### E7 — Ficha: galería arriba vs galería a la derecha

**Hipótesis**: desktop con galería a la derecha + info a la izquierda lee más natural que galería en hero full-width.

**Variantes**: layout actual (full-width hero) vs grid 2-cols desktop.

**Métrica**: tiempo en ficha + clicks a CTA Reservar/Contactar.

**Costo**: 6-8h (rediseño responsive).

**Duración**: 3 semanas.

**Nota**: experimento más caro. Probar solo si E1-E5 muestran impacto.

### E8 — Social proof en ficha: mostrar "X contactos esta semana" vs no mostrar

**Hipótesis**: scarcity/social proof aumenta conversión. +10-20%.

**Variantes**:
- A: ficha sin counter.
- B: ficha con "N tutores contactaron a {proveedor} esta semana" (si N ≥ 3).

**Métrica**: click en CTA Reservar.

**Costo**: 3h (query Supabase + render condicional).

**Duración**: 3 semanas.

**Riesgo**: en volumen bajo, counter dice "1 tutor contactó" → efecto inverso. Gate N ≥ 3.

### E9 — Registro: 1 paso vs multi-step

**Hipótesis**: wizard multi-step (actual) tiene drop-off progresivo. Un formulario single-page con los mismos campos podría tener mejor completion rate. **O al revés**: multi-step reduce intimidación.

**Variantes**: wizard actual vs single-page compacto.

**Métrica**: inicio signup → signup confirmado (email_confirmed_at populado).

**Costo**: 8-12h (rediseño UX + e2e specs).

**Duración**: 4 semanas (volumen bajo).

**Nota**: experimento caro. Solo si funnel muestra drop en paso específico.

### E10 — Precio en ficha: "Desde $X" vs "$X - $Y"

**Hipótesis**: rango completo ($X - $Y) da certidumbre mejor que "Desde" que suena ambiguo.

**Variantes**:
- A (control): "Desde $X" (actual).
- B: "$X - $Y" si ambos existen.
- C: "Desde $X / hasta $Y" en 2 líneas.

**Métrica**: click en ficha → click en CTA.

**Costo**: 1-2h (swap en ServiceCard + ServiceDetailView + logic de fallback).

**Duración**: 2 semanas.

---

## Setup técnico mínimo (sprint propio ~4h)

Para correr experimentos E1-E10, necesitamos:

### 1. Toggle de variantes

**Opción A — Static por env var** (simple pero rígido):
```typescript
const EXPERIMENT_CTA_FICHA = process.env.NEXT_PUBLIC_EXPERIMENT_CTA_FICHA || 'A';
```
Deploy nuevo cambia variant global. Útil solo para 1 variante a la vez.

**Opción B — Random assign client-side con persistencia** (flexible):
```typescript
function getVariant(expId: string, variants: string[]): string {
    const key = `exp_${expId}`;
    if (typeof window === 'undefined') return variants[0];
    const stored = localStorage.getItem(key);
    if (stored && variants.includes(stored)) return stored;
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem(key, chosen);
    return chosen;
}
```
Cada user sticky en su variante. Sin backend.

**Recomendación**: opción B. Esfuerzo helper: 30 min.

### 2. Tracking GA4

Agregar `experiment_variant` como custom dimension en GA4 → cada evento clave lo lleva como prop.

Esfuerzo: 1h (config GA4 + helper gtag con prop).

### 3. Dashboard de resultados

Opción simple: GA4 Explore + columna "experiment_variant" como dimension secundaria. Comparar eventos por variante.

Esfuerzo: 1h (crear exploration en GA4).

### 4. Guardrail de abandono

Si el experimento muestra variant B significativamente peor que A en métrica core (ej. -20% conversión), pausar experimento → swap a A universal.

Esfuerzo: 30 min monitoreo semanal + decisión del PO.

**Total setup**: ~3-4h.

---

## Calendario propuesto (4 semanas)

### Semana 26-11 → 30-11

- [ ] Setup técnico (3-4h). Objetivo: listo martes 2026-12-01.
- [ ] Baseline de métricas: contar conversión actual en cada punto (CTAs, hero clicks, signup completion, email open rate).

### Semana 01-12 → 07-12

- [ ] Arrancar E1 (CTA ficha). 2 semanas.
- [ ] Arrancar E3 (hero home). 2 semanas en paralelo si no hay interferencia (ambos son changes de copy, sin overlap).
- [ ] Arrancar E4 (subject correo welcome). 3 semanas en paralelo (métrica independiente).

### Semana 08-12 → 14-12

- [ ] Cerrar E1 (si volumen OK). Decidir ganador.
- [ ] Cerrar E3.
- [ ] Arrancar E2 (CTA reservar). 2 semanas.
- [ ] Arrancar E10 (precio formato). 2 semanas.

### Semana 15-12 → 21-12

- [ ] Cerrar E2, E4, E10.
- [ ] Decidir si E5 (sección cuidado home) justifica el costo según métrica categoría.
- [ ] Preparar segunda ola (E6-E9) para enero.

---

## Métricas a trackear transversalmente (no experimentos específicos)

Independiente de experimentos, instrumentar:

- **Funnel registro**: inicio → paso 2 → paso 3 → confirmado.
- **Funnel reserva**: ficha vista → modal abierto → submitted → confirmado por proveedor.
- **Funnel contacto**: ficha vista → botón contactar → mensaje enviado → proveedor respondió.
- **Churn de proveedores**: proveedor activo semana N → activo semana N+1.
- **Churn de tutores**: tutor registrado semana N → sesión en semana N+2.

Esfuerzo instrumentación: ~4h. Vale independiente de experimentos.

---

## Decisiones pendientes del PO

### D1. Prioridad experimentos semana 1

**Pregunta**: ¿E1 + E3 + E4 son los correctos para arrancar, o querés subir E5 (sección cuidado home) a primera ola?

**Recomendación del auditor**: E1 + E3 + E4 primero porque son bajo costo + impacto medible rápido. E5 requiere diseño + 3-4h implementación + mayor riesgo UX (cambia estructura de home). Mejor segunda ola con data en mano.

**Impacto si no se decide**: default = arranque con E1 + E3 + E4.

### D2. Volumen esperado conservador vs optimista

**Pregunta**: el plan asume 500-2000 uniques/semana primera 2 semanas. Si el lanzamiento jala más (campaña + agencia + social), los tests cierran antes. ¿Qué umbral triggerea tomar decisiones anticipadas?

**Recomendación del auditor**: criterio mecánico "300 clicks por variante O 2 semanas, lo que ocurra primero" — si una variante tiene N=1000 en semana 1 con diferencia de 30%, decidir antes.

**Impacto si no se decide**: default = regla "300 clicks o 2 semanas".

### D3. Herramienta A/B dedicada (Growthbook, Optimizely)

**Pregunta**: ¿valide migrar a Growthbook (open source, free self-host) si los experimentos funcionan bien 4-6 semanas?

**Recomendación del auditor**: sí. Simplifica rollout + stats significativos automáticos + feature flags unificados. Setup: ~1 día. Meta: migrar en enero si experimentos validan.

**Impacto si no se decide**: default = quedarse con GA4 + random assign client hasta nuevo aviso.

### D4. Confianza estadística formal

**Pregunta**: ¿aceptamos criterio "diferencia visible al ojo + N significativo" o exigimos test estadístico formal (chi-square, p<0.05)?

**Recomendación del auditor**: criterio informal para primera ola. Con volumen bajo, formal da "no significativo" para todo. Formal se puede aplicar cuando haya +5000 users/semana.

**Impacto si no se decide**: default = criterio informal.

### D5. Participación de users en experimentos

**Pregunta**: ¿necesitamos disclosure al user que es parte de un experimento? Legalmente en Chile no es requerido para cambios de UI/copy. ¿Preferís política estricta?

**Recomendación del auditor**: no disclosure para A/B de UI/copy. Sí disclosure si experimentamos con pricing, políticas, o afecta derechos del user.

**Impacto si no se decide**: default = sin disclosure para UI/copy.

---

## Firma

Este plan arranca ejecución real el 01-12 (post primera semana estable de operación). Resultados cuantificables para enero 2027.
