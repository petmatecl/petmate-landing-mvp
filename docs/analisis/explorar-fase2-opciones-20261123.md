# EXPLORAR-PRE-CAMPAÑA fase 2 — opciones para H1 (cookies) + H2 (sin reseñas)

Written for: el PO (Aldo). Ítem #5 cola nocturna autónoma 2026-11-22 noche. **Docs-only**. Zero código implementado — el PO elige la opción por hallazgo antes de que el auditor implemente.

Audit origen: [`docs/auditorias/explorar-para-trafico-pagado-20261122.md`](../auditorias/explorar-para-trafico-pagado-20261122.md). Fase 1 (H3 + H4 + H5) aterrizada en PR #152 esperando GO. Fase 2 = los 2 hallazgos restantes.

---

## H1 — Cookies banner diferir/discreción (MEDIA)

### Situación actual

`components/CookieBanner.tsx` renderiza banner al primer visit no-autenticado (`!isSet`). Es un banner **modal fijo full-width con backdrop-blur** en la parte inferior del viewport — tapa el ~15% de la vista en mobile y es lo primero que ve un tutor que llega por ad. Impacto: user ve banner antes de ver catálogo → alta chance de cerrar/rebotar antes de interactuar.

Scope del banner: consent para analytics + marketing (GDPR-style). Es obligatorio cumplir normativa, pero el **momento + estilo** son flexibles.

### 3 opciones

**Opción A — Banner diferido (lazy load)**

Delay el banner 3-5 segundos desde el primer scroll o desde el load. El user ve el catálogo primero, el banner aparece suave después.

- **Pros**: cero perdida de impresión inicial. User engaged con contenido ANTES de ver banner.
- **Contras**: si el user cierra tab antes del delay, zero consent → pierde opt-in analytics. Marginal.
- **Esfuerzo**: 15 min (setTimeout + estado hydration).
- **Riesgo legal**: muy bajo — GDPR/CCPA requieren opt-in visible, no "inmediato".

**Opción B — Banner bottom-right pequeño (no full-width)**

Reemplazar modal full-width por un chip pequeño en la esquina inferior derecha (300px de ancho, ~100px alto). Menos intrusivo visualmente, user puede ignorarlo + seguir navegando.

- **Pros**: cero bloqueo del viewport. Visible pero no demandante.
- **Contras**: UX diferente al patrón "GDPR modal" que algunos users esperan. Pequeño chance de que no lo vean + se queden en `consent=null` → sin tracking para optimizar campañas.
- **Esfuerzo**: 45-60 min (reorganización layout + responsive mobile).
- **Riesgo legal**: bajo — Chile no tiene regulación tan estricta como GDPR; "banner visible" cumple.

**Opción C — Banner "Accept all" por defecto + opt-out discreto**

Mostrar banner mini con "Usamos cookies. [OK] [Configurar]" — el click en OK accepta todo. El link "Configurar" abre el modal actual. Patrón adoptado por muchos marketplaces chilenos (Falabella, Mercado Libre) para reducir fricción.

- **Pros**: menos clicks para la mayoría (OK = 1 tap). Compliance preservado (user puede configurar). El formulario completo sigue disponible.
- **Contras**: algunos users de patrón GDPR-aware perciben "dark pattern" (pre-aceptación de cookies no estrictamente necesarias). Legalmente OK en Chile pero cuestionable en UE.
- **Esfuerzo**: 30-45 min (ajuste layout + mantener modal completo).
- **Riesgo legal**: medio si Pawnecta eventualmente atiende usuarios UE (no prioritario).

### Recomendación técnica

**Opción A (banner diferido)** porque es la de mejor ROI: 15 min de trabajo + cero fricción visual inicial + preserva el banner actual sin rediseñarlo. Si post-campañas el consent rate cae mucho (baseline <60%), re-evaluar B o C.

---

## H2 — "Sin reseñas" proxy de confianza alternativo (CRÍTICA)

### Situación actual

`components/Explore/ServiceCard.tsx:134-137` renderiza chip `Sin reseñas` con estrella outline cuando `service.total_evaluaciones === 0`. Son **16 de 22 servicios activos en prod (73%)** — mayoría de la primera impresión del catálogo tiene el mensaje negativo "Sin reseñas".

Impacto: user que llega por ad ve 73% de cards con "Sin reseñas" → señal de catálogo nuevo/no-validado → menos confianza para contactar.

### 3 opciones

**Opción A — Reemplazar "Sin reseñas" por proxy de confianza alternativo**

El chip sigue existiendo pero muestra señales positivas disponibles:
- **"Identidad verificada"** (si `proveedor.rut_verificado` o `verificacion_estado='aprobado'`).
- **"Nuevo en Pawnecta"** (si `proveedor.created_at` < 30 días).
- **"Primera ayuda"** (si `proveedor.primera_ayuda = true`, flag ya existe).
- Prioridad: Identidad > Primera ayuda > Nuevo > silencio (NO chip si cero señales).

- **Pros**: cero cambio de BD, usa data ya existente, transforma 73% de cards de negativo a positivo o neutral.
- **Contras**: proveedores sin verificación ni primera ayuda ni recientes quedan sin chip (silencio, pero ya no "Sin reseñas"). En cards sin ningún badge, falta contexto de confianza. Aceptable: el PO ya tiene flujo para que proveedores se verifiquen.
- **Esfuerzo**: 1-2h (prop `total_evaluaciones === 0` → switch con los 3 fallbacks + CSS + revisar casos edge).
- **Impacto esperado**: +15-25% click rate card (benchmark: cards con señal positiva vs negativa).

**Opción B — Ocultar completamente el chip cuando hay 0 reseñas**

El chip solo aparece cuando hay reseñas reales (rating ≥ 1). Cards sin reseñas no muestran chip de rating en absoluto.

- **Pros**: cero mensaje negativo. User interpreta "sin chip" como "normal" (más que "sin reseñas").
- **Contras**: inconsistencia visual entre cards (algunas con chip, otras sin). User puede notar y preguntarse por qué.
- **Esfuerzo**: 15-30 min (eliminar el `else` del ternary, cerrar el div vacío).
- **Impacto esperado**: +5-10% click rate (menor que A, pero más barato).

**Opción C — Chip con "N tutores contactaron"**

Reemplazar "Sin reseñas" por un contador alternativo: número de contactos agregados del proveedor en los últimos 30 días (ya se trackea en tabla `contactos`). Ejemplo: "12 tutores contactaron este mes".

- **Pros**: social proof cuantitativo, incluso sin reseñas. Muy fuerte para conversion.
- **Contras**: requiere query adicional en `buscar_servicios` RPC (join con `contactos`). Si un proveedor tiene 0 contactos (muy nuevo), el chip no muestra nada — regresión a caso A. Además, los `contactos` incluyen smokes/tests históricos — habría que filtrar.
- **Esfuerzo**: 2-3h (RPC + logic + filtrado de smokes).
- **Impacto esperado**: +20-30% click rate pero solo para subset de proveedores con contactos reales.

### Recomendación técnica

**Opción A (proxy de confianza alternativo)** porque es el mejor balance:
- Usa data ya existente (zero cambio de BD/RPC).
- Transforma 73% de cards de negativo a positivo/neutral.
- Esfuerzo moderado 1-2h.
- Impacto esperado +15-25% click rate.

Opción C queda como follow-up si A no mueve suficiente la aguja + los contactos reales en prod crecen hasta justificar el esfuerzo.

---

## Decisiones del PO

### D1 — Opción para H1 (cookies banner)
Marcar una:
- [ ] **A** — Banner diferido 3-5s (**reco default**).
- [ ] B — Banner bottom-right pequeño.
- [ ] C — Accept-all por defecto + opt-out discreto.
- [ ] Mantener estado actual (full-width modal). Cierra el ítem como "NO ACTION".

### D2 — Opción para H2 ("Sin reseñas" proxy)
Marcar una:
- [ ] **A** — Proxy de confianza alternativo con prioridad Identidad > Primera ayuda > Nuevo > silencio (**reco default**).
- [ ] B — Ocultar chip cuando 0 reseñas.
- [ ] C — Chip con "N tutores contactaron" (más complejo).
- [ ] Mantener estado actual ("Sin reseñas"). Cierra el ítem.

### Timing

Si el PO elige A+A, el sprint de implementación es ~2-3h. Puedo arrancarlo autónomo si ambas decisiones vienen con GO + default == A. Si eliges otras combinaciones, se ajusta scope + estimación.

---

## Trazabilidad

- **Audit origen**: `docs/auditorias/explorar-para-trafico-pagado-20261122.md` § H1 + H2.
- **Fase 1 (H3 + H4 + H5)**: PR #152 abierto esperando GO.
- **Ítem BACKLOG**: `EXPLORAR-PRE-CAMPAÑA` en `## Sprints Pre-Campañas` (PR #145 aún sin merge → la sección vive en el branch pre-camp-cola).
- **Sin merge autónomo**: este PR es docs-only mergeable con CI verde, pero no implementa fix — el PO decide con D1/D2 antes del sprint de implementación.
