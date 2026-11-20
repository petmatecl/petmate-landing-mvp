# Decisiones del PO pendientes — reclasificadas tras reset 2026-11-20 PM

**Audiencia**: PO · **Autor**: auditor (2026-11-20 PM).
**Reset**: NO hay lanzamiento oficial 25-11. El sitio ya opera, los proveedores se registran orgánicamente. Nueva meta: **100 proveedores activos** antes de arrancar campañas pagadas para tutores.
**Objetivo de este doc**: triage de las 53 decisiones ya documentadas (ver doc previo) con criterio nuevo. Permitir al PO revisar solo las que impactan la ventana de campañas, sin leer los 11 docs.
**Método**: reclasificación del inventario previo (listado aterrizado 2026-11-20 AM) con 3 categorías nuevas.

Categorías nuevas (reemplazan las antiguas BLOQUEANTE / DESEABLE / POST-LAUNCH):

- **BLOQUEANTE para activar campañas**: decisión que afecta la experiencia que verán los tutores cuando lleguen por campaña. Sin decisión, la campaña puede romperse o dar fricción visible.
- **DESEABLE continuo**: calidad general del sitio. Mejora el producto independientemente de campañas; se resuelven a ritmo del equipo sin bloquear nada.
- **POST-CAMPAÑAS**: puede esperar a tener tráfico real para priorizar con data.

---

## Resumen por categoría

| Categoría | Total |
|---|---:|
| ACTIVAS hoy (ventana pre-campañas) | 4 (1 abierta · 3 cerradas) |
| BLOQUEANTE para activar campañas | 10 |
| DESEABLE continuo | 19 |
| POST-CAMPAÑAS | 20 |
| **Total** | 53 |

---

## 🔴 ACTIVAS hoy (4) — ventana pre-campañas, acción cercana

### ✅ A1 — CERRADA 2026-11-20 PM — FK `agendamientos_servicio_id_fkey` verificada

**Pregunta original**: ¿FK es RESTRICT (no SET NULL ni CASCADE)?

**Resultado (MCP prod-ro, 2026-11-20)**:

```
FK agendamientos_servicio_id_fkey
  confdeltype = 'r'
  delete_rule = RESTRICT
  def = FOREIGN KEY (servicio_id) REFERENCES servicios_publicados(id) ON DELETE RESTRICT

Agendamientos totales en prod:  11
Con servicio_id IS NULL:         0
Huérfanos (servicio_id → inexistente):  0
```

**Conclusión**: FK bien configurada. Cero acción necesaria. Caso borde del doc correos-20261119 (servicio borrado entre reserva y correo del cron) está cubierto por la FK — el DELETE del servicio falla si tiene reservas vivas.

### ✅ A2 — CERRADA 2026-11-20 PM — Regla operativa de disponibilidad PO establecida

**Pregunta original**: ¿confirmás ventana de disponibilidad?

**Respuesta del PO (2026-11-20)**:

- Disponibilidad habitual: martes, jueves y viernes, respuesta ágil (horas, no días).
- Lunes y miércoles: menor disponibilidad (más reuniones Bci).
- Fines de semana: menor, salvo notificación al teléfono.
- Vía de contacto para incidente crítico: mail, WhatsApp o SMS indistinto (todas llegan al teléfono).
- No hay horas prohibidas.

**Regla operativa para el auditor**: cuando necesite decisión del PO, seguir la regla "avanza + documenta decisión pendiente, no pausar". El PO revisa cuando puede. Escalar por canal teléfono solo si incidente crítico (sitio caído, pérdida de datos, bug afectando usuarios reales ahora mismo).

### ✅ A3 — CERRADA 2026-11-20 PM — NO autorizado permanente; case-by-case

**Pregunta original**: ¿auditor queries playbook durante incidentes sin GO?

**Respuesta del PO**: **NO se autoriza queries permanentes**. Razón: el auditor no está de guardia continua y el flujo de incidentes real es casi nulo mientras el tráfico sea bajo. Cuando aparezca un incidente real reportado, el PO escalará puntualmente y las queries se autorizarán caso por caso (como con el GRANT del RPC del 2026-11-19).

**Consecuencia**: durante incidentes, el auditor propone queries por chat, el PO autoriza y el auditor ejecuta. Loop ~5-10 min adicionales, aceptado como trade-off.

**Ítem derivado**: OBSERVABILIDAD-ALERTAS agregado al BACKLOG (post-campañas, prioridad baja) para cuando volumen justifique monitoreo automático.

### 🟡 A4 — ABIERTA — Imágenes del blog, excepción para ilustraciones vectoriales free-use

**Pregunta**: hoy el blog usa placeholder gris + ícono Lucide en todas las entradas (fix BLOG-IMG-REMOVAL aterrizado). La regla CLAUDE.md permite ilustraciones vectoriales propias, capturas reales de la plataforma, o fotos de proveedores y tutores con autorización. **No** permite imágenes de bancos gratuitos como Unsplash para personas/mascotas, pero la regla no cubre ilustraciones/iconografía libre (freepik, undraw, etc.). ¿Querés abrir una excepción explícita para ilustraciones vectoriales free-use de bancos gratuitos, o mantener solo las creadas específicamente para el proyecto?

**Recomendación**: permitir ilustraciones vectoriales free-use (con licencia que lo permita) en el blog, siempre que: (a) no sean fotos de personas ni mascotas; (b) no contengan rostros humanos ni animales fotorrealistas; (c) estilo coherente con la marca (líneas limpias, paleta compatible). Documentar la excepción como enmienda a la regla en CLAUDE.md para que no se re-abra.

**Por qué activa**: el blog es una superficie SEO importante para la conversión orgánica de proveedores (antes de las campañas). Los placeholders grises visuales son fríos; ilustraciones compatibles levantan la percepción del producto. Decisión de 10 min, impacto visible desde la primera actualización de blog.

---

## 🟠 BLOQUEANTE para activar campañas (10)

Decisiones que **deben estar tomadas** antes de abrir el grifo de tráfico pagado hacia el sitio. Si llegan tutores por campaña y alguna de estas quedó sin resolver, se traduce en fricción visible a usuario nuevo.

### C1 — `comunicacion-25-11.md § D2` — Alias de correo newsletter

**Pregunta**: ¿crear `novedades@pawnecta.com` en Zoho para separar transaccional de marketing, o reutilizar `hola@pawnecta.com` para campañas?

**Recomendación**: sin campañas aún no urge; cuando se decidan campañas, crear alias dedicado (15 min). Separar remitente mejora deliverability y limita riesgo reputación al dominio principal.

### C2 — `comunicacion-25-11.md § D3` — Lista de usuarios para correo de campaña

**Pregunta**: cuando arranquen las campañas, ¿enviar a 100% de users confirmados, o filtrar por actividad?

**Recomendación**: todos confirmados en primera campaña; ajustar en campañas 2+ con data de open/click.

### C3 — `comunicacion-25-11.md § D5` — Variante del banner home (A/B/C)

**Pregunta**: cuando campañas arranquen, ¿qué copy en el banner home para visitantes nuevos?

**Recomendación**: variante C (énfasis en apertura + CTA "Explorar") para primera ola de campaña. Variante A (pide feedback) para posteriores.

### C4 — `comunicacion-25-11.md § D6` — Trigger de envío correos de campaña

**Pregunta**: ¿envío automático por script o manual por PO desde Resend?

**Recomendación**: manual primera campaña. Automatizar cuando se consoliden templates.

### C5 — `monitoreo-24h-post-launch.md § D1` — Notificaciones Sentry email nocturno

**Pregunta**: ¿configuramos Sentry para email al PO ante issues con `userCount > 2` en ventana nocturna?

**Recomendación**: sí, al momento de activar campañas. En operación orgánica actual el volumen no justifica aún.

### C6 — `monitoreo-24h-post-launch.md § D3` — Baseline de Q1-Q5 Supabase

**Pregunta**: ¿corremos baseline antes del primer gran push de campaña?

**Recomendación**: sí, 5 min. Permite comparar deltas con/sin campaña.

### C7 — `monitoreo-24h-post-launch.md § D5` — Uptime Robot externo

**Pregunta**: ¿montamos uptime independiente de Vercel antes de campañas?

**Recomendación**: sí, 10 min setup. Canal independiente ayuda a detectar incidentes que Vercel no reporta inmediatamente.

### C8 — `perf-core-20261119.md § D1` — Ejecutar top 5 fixes perf pre-campañas

**Pregunta**: ¿bloqueamos primera campaña hasta ejecutar los 5 fixes de perf (~2h 15 min)?

**Recomendación**: sí. El CLS mobile ficha 0.187 y el LCP mobile explorar 5.8s son fricciones medibles que afectan tasa de conversión de tráfico pagado.

### C9 — `a11y-core-20261119.md § D1` — Ejecutar top 5 fixes a11y pre-campañas

**Pregunta**: ¿bloqueamos primera campaña hasta ejecutar los 5 fixes de a11y (~3-4h)?

**Recomendación**: sí para los sistémicos (contraste `text-slate-400` + `text-accent-500`). Los otros 3 pueden esperar.

### C10 — `primera-semana-post-campanas.md § D5` — Primer experimento A/B al activar campañas

**Pregunta**: ¿lanzamos E1 (CTA ficha) + E3 (hero home) + E4 (subject welcome) con la primera campaña, o esperamos 1-2 semanas con tráfico?

**Recomendación**: E1 + E3 con la campaña (copy changes, cero riesgo técnico). E4 con segunda campaña.

---

## 🟡 DESEABLE continuo (19)

Decisiones que mejoran calidad del sitio independientemente de campañas. Se resuelven a ritmo del equipo. Sin deadline.

### Rollback (3)

- `rollback-25-11.md § D3` — Autorizar auditor proponer N1 sin esperar criterio "2 o más" si ve home full-page 500.
- `rollback-25-11.md § D4` — Sub-plan monitoreo T+24h → T+48h ante incidente.
- Nueva derivada del reset: ¿el plan de rollback N1/N2/N3 se aplica tal cual al modo operación continua, o lo simplificamos?

### Comunicación (1)

- `comunicacion-25-11.md § D1` — Tono IG emojis sí/no. Recomendación: sin emojis consistencia.

### Monitoreo (1)

- `monitoreo-24h-post-launch.md § D2` — Umbral reporte parcial cada 4h vs 6h. Default cada 4h primeras 12h + cada 6h últimas 12h.

### Error handling (2)

- `error-handling-20261119.md § D1` — Fix exclusión mutua #125 — **resuelto por el merge inminente del PR**. Queda sin decisión pendiente.
- `error-handling-20261119.md § D2` — Kill-switch 5s `/mis-reservas` + MessageThread. Recomendación: aterrizar cuando ventana ~30 min.

### Correos casos borde (1)

- `correos-20261119.md § Sec II D1` — Grep escape HTML en correo #4 + #10. ~10 min, conveniente antes de campañas.

### Performance (1)

- `perf-core-20261119.md § D2` — Lighthouse real sobre `/proveedor/{id}` + `/mensajes`. 5 min por URL.

### A11y (1)

- `a11y-core-20261119.md § D2` — Runtime audit con axe DevTools sobre las 5 URLs. ~1h total.

### Deuda aceptada (2)

- `deuda-aceptada-25-11.md § D1` — Validar corte técnico de "deuda aceptada" vs "fix pre-campañas". Ya aplicable al nuevo contexto.
- `deuda-aceptada-25-11.md § D3` — Sprint cleanup semana 1 (reinterpretado): aplicable a cualquier ventana calma.

### Primera semana post-campañas (3)

- `primera-semana-post-campanas.md § D1` — Criterios mecánicos BLOQUEA/CONVIENE/MENOR para fixes urgentes. Aplicable al ritmo actual.
- `primera-semana-post-campanas.md § D4` — Sprint cleanup fin de semana. Flexible.
- `primera-semana-post-campanas.md § D7` — On-call nocturno Sentry email. Aplicable al activar campañas (ver C5).

### Playbook (4)

- `incidentes-comunes-20261119.md § D1` — Agregar 4º escenario "Error 5xx generalizado". 1 página extra, buen seguro.
- `incidentes-comunes-20261119.md § D2` — Query consolidada A+B+C+D. 10 min.
- `incidentes-comunes-20261119.md § D3` — URLs + templates ticket Resend/Supabase soporte pre-guardados. 15 min.
- `rollback-25-11.md § D1-D2` reinterpretados: template página mantenimiento HTML + email incidente pre-redactado. Útiles para cualquier modo de operación, no solo lanzamiento.

---

## 🟢 POST-CAMPAÑAS (20)

Decisiones que requieren tráfico real para priorizar con data. Posponer hasta tener baseline con campaña activa.

### Experimentos A/B (5 — todos post por definición técnica)

- `experimentos-postlaunch.md § D1-D5` — Prioridad de rondas, volumen conservador/optimista, Growthbook vs client-side, confianza estadística, disclosure.

### Monitoreo (1)

- `monitoreo-24h-post-launch.md § D4` — Métricas públicas a redes post reporte T+24h. Decidir cuando tengamos números.

### Error handling (2)

- `error-handling-20261119.md § D3` — Sprint migración a `EstadoError`. Deuda cosmética.
- `error-handling-20261119.md § D4` — Error logging a Sentry en catches mudos.

### Correos casos borde (2)

- `correos-20261119.md § Sec II D3` — Snapshot título servicio en `agendamientos`.
- `correos-20261119.md § Sec II D4` — Validación fecha pasada en endpoint reserva.

### Performance (3)

- `perf-core-20261119.md § D3` — Bundle analyzer instalado + análisis.
- `perf-core-20261119.md § D4` — Target browserslist moderno.
- `perf-core-20261119.md § D5` — Objetivo Core Web Vitals formal.

### A11y (3)

- `a11y-core-20261119.md § D3` — Objetivo WCAG AA formal.
- `a11y-core-20261119.md § D4` — @axe-core/react en dev.
- `a11y-core-20261119.md § D5` — Soporte `prefers-reduced-motion`.

### Deuda aceptada (2)

- `deuda-aceptada-25-11.md § D2` — Publicar deuda en sitio.
- `deuda-aceptada-25-11.md § D4` — Umbrales de alerta Sentry (independiente de C5).

### Primera semana post-campañas (2)

- `primera-semana-post-campanas.md § D3` — Testimonios proveedores IG con autorización.
- `primera-semana-post-campanas.md § D6` — Blog retrospectiva primera campaña (números vs narrativa).

---

## Decisiones que se cancelaron con el reset (2)

Las bloqueantes originales B1 y B2 del doc 2026-11-20 AM quedan **canceladas** porque dependían de un lanzamiento 25-11 que no ocurre.

- ~~B1 — Correo masivo lista 25-11~~ · absorbido en C2 con criterio distinto (cuando campañas arranquen, no en fecha fija).
- ~~B2 — Banner home variante A/B/C para el 25-11~~ · absorbido en C3 con criterio distinto (cuando campañas arranquen).

---

## Checklist resumido para el PO

- [x] **A1** · Query FK `agendamientos_servicio_id_fkey` → CERRADA: RESTRICT ✅, 0 huérfanos.
- [x] **A2** · Disponibilidad PO horarios → CERRADA: regla operativa establecida (avanza sin pausar, teléfono para crítico).
- [x] **A3** · Auditor queries playbook durante incidentes → CERRADA: NO autorizado permanente, case-by-case. Derivada: OBSERVABILIDAD-ALERTAS al BACKLOG.
- [ ] **A4** · Imágenes del blog, excepción ilustraciones vectoriales free-use → recomendado **permitir con restricciones**.

Revisar pre-primera-campaña (C1-C10):

Las 10 bloqueantes de campañas. Ventana flexible — se revisan cuando el PO decida activar campañas.

Las 19 deseables continuo + 20 post-campañas quedan como pool de mejoras ongoing sin deadline.

---

## Nota metodológica sobre el reset

- El doc previo (2026-11-20 AM) clasificaba 6 decisiones como BLOQUEANTE por el lanzamiento 25-11.
- El reset invalida 2 (B1, B2) y re-contextualiza las 4 restantes (B4, B5, B6 + imágenes blog) como ACTIVAS hoy (operación continua + base para 100 proveedores).
- El resto de las 53 se redistribuye entre BLOQUEANTE-para-campañas / DESEABLE-continuo / POST-CAMPAÑAS.
- El doc previo queda archivado — este lo reemplaza.

---

## Firma

Este doc vive hasta que las campañas arranquen. En ese momento, las C1-C10 se cierran o escalan; luego el doc se cierra y se archiva.
