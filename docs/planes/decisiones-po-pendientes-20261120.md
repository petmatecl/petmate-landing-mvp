# Decisiones del PO pendientes — clasificadas por urgencia

**Audiencia**: PO · **Autor**: auditor (2026-11-20 mañana).
**Objetivo**: permitir al PO ver solo las bloqueantes hoy, sin leer los 11 docs. Lista completa de decisiones abiertas al 2026-11-20, extraídas de los 11 docs de anoche + ayer, clasificadas por urgencia para el lanzamiento 2026-11-25.
**Método**: grep de secciones `### D1`, `### D2`, etc. al final de cada doc. Total verificado contra el repo: **53 decisiones**.

Categorías:
- **BLOQUEANTE para el 25-11**: no se puede lanzar sin tomarla.
- **DESEABLE pre-25-11**: suma al lanzamiento pero no es crítica (default seguro si no se decide).
- **POST-LAUNCH**: puede esperar a la semana del 26 al 30 o más allá.

---

## Resumen por categoría

| Categoría | Total |
|---|---:|
| BLOQUEANTE 25-11 | **6** |
| DESEABLE pre-25-11 | 24 |
| POST-LAUNCH | 23 |
| **Total** | 53 |

---

## 🔴 BLOQUEANTE para el 25-11 (6)

### B1 — `comunicacion-25-11.md § D3` — Lista de usuarios para correo masivo del 25

**Pregunta**: ¿enviar correo Pieza 1 a 100% de `auth.users` confirmados, o filtrar solo los con actividad?

**Recomendación**: todos confirmados. Primer correo masivo, filtrar deja fuera dormidos reactivables.

**Por qué bloqueante**: el correo masivo es parte del launch oficial del 25. Sin decisión, no sale.

### B2 — `comunicacion-25-11.md § D5` — Variante del banner home (A/B/C)

**Pregunta**: ¿A minimalista (pide feedback), B con fecha explícita, o C énfasis en apertura + CTA?

**Recomendación**: A — menos intrusiva, canaliza feedback.

**Por qué bloqueante**: si el banner va el 25, hay que elegir la variante antes del freeze del 24.

### B3 — `comunicacion-25-11.md § D6` — Trigger de envío del correo masivo (manual vs auto)

**Pregunta**: ¿envío automático a las 11:00 CLT via script schedule, o envío manual por el PO desde Resend post-smoke?

**Recomendación**: manual por el PO.

**Por qué bloqueante**: define si hay que preparar un cron/script pre-freeze o no. Decisión operativa del día 25.

### B4 — `correos-20261119.md § Sec II D2` — Verificar FK `agendamientos_servicio_id_fkey` es RESTRICT

**Pregunta**: ¿corremos ya la query de 1 minuto para verificar que la FK es RESTRICT (no SET NULL ni CASCADE)?

**Recomendación**: sí, query read-only contra prod via MCP.

**Por qué bloqueante**: si la FK NO es RESTRICT, un proveedor borrando servicio afecta reservas + emails del cron. Caso borde que puede explotar en launch si no se verifica.

### B5 — `primera-semana-25-11-al-01-12.md § D2` — Disponibilidad PO en horarios

**Pregunta**: ¿confirmás ventana laborable 09:00-22:00 CLT + 10:00-20:00 fin de semana primera semana?

**Recomendación**: confirmar explícitamente para planificar escalamiento.

**Por qué bloqueante**: define cuándo el auditor puede actuar autónomo y cuándo debe esperar.

### B6 — `incidentes-comunes-20261119.md § D4` — Acceso auditor a prod read-only durante incidentes

**Pregunta**: ¿autorizás al auditor correr las queries Q-A/B/C/D del playbook directo durante incidentes sin pedir GO por cada una?

**Recomendación**: sí para las queries del playbook (scope read-only + documentado). Acelera diagnóstico de 15-20 min a 5-10 min.

**Por qué bloqueante**: define el loop de respuesta a incidentes del 25. Sin decisión, cada bug reportado agrega latencia por GO manual.

---

## 🟡 DESEABLE pre-25-11 (24)

### D1-D4 · Rollback (3 deseables, 2 post)

- `rollback-25-11.md § D3` — Ventana disparo N1 sin esperar evidencia → DESEABLE. Autorizar al auditor proponer N1 inmediato si ve home 500 full-page en prod.
- `rollback-25-11.md § D4` — Cobertura monitoreo T+24h → T+48h → DESEABLE. Sub-plan de ventana extendida.

### D5-D10 · Comunicación (3 deseables, 3 bloqueantes)

- `comunicacion-25-11.md § D1` — Tono IG con/sin emojis → DESEABLE. Default sin emojis por consistencia tono.
- `comunicacion-25-11.md § D4` — Dismissibility del banner → DESEABLE. Default dismissible + auto-hide 29-11.

### D11-D15 · Monitoreo 24h (4 deseables, 1 post)

- `monitoreo-24h-post-launch.md § D1` — Notificaciones Sentry email nocturno → DESEABLE. Alert con cooldown 30 min.
- `monitoreo-24h-post-launch.md § D2` — Umbral reporte parcial (cada 4h vs 6h) → DESEABLE. Default cada 4h primeras 12h + cada 6h últimas 12h.
- `monitoreo-24h-post-launch.md § D3` — Baseline Q1-Q5 pre-launch martes 24 PM → DESEABLE. 5 min PO ejecuta.
- `monitoreo-24h-post-launch.md § D5` — Uptime Robot externo pre-launch → DESEABLE. 10 min setup, canal independiente de Vercel.

### D16-D19 · Error handling (2 deseables, 2 post)

- `error-handling-20261119.md § D1` — Prioridad 1 si #125 no mergea antes del freeze → DESEABLE. Hoy status del #125 es verde; probablemente queda resuelto por sí mismo esta mañana.
- `error-handling-20261119.md § D2` — Kill-switch `/mis-reservas` + MessageThread pre-25 → DESEABLE. 30 min el fix, regla ya aterrizada en CLAUDE.md.

### D20-D23 · Correos casos borde (1 deseable, 2 post + 1 bloqueante)

- `correos-20261119.md § Sec II D1` — Grep escape HTML en correo #4 + #10 → DESEABLE. 10 min grep + posible 1-2 líneas fix.

### D24-D28 · Performance (2 deseables, 3 post)

- `perf-core-20261119.md § D1` — Ejecutar P1-P5 fixes viernes 20-11 AM → DESEABLE. ~2h 15min, impacto SEO+UX directo.
- `perf-core-20261119.md § D2` — Lighthouse real sobre perfil proveedor + `/mensajes` viernes AM → DESEABLE. 5 min por URL, completa baseline.

### D29-D33 · A11y (2 deseables, 3 post)

- `a11y-core-20261119.md § D1` — Ejecutar top 5 fixes a11y pre-25 → DESEABLE. ~3-4h, contraste sistémico cubre texto secundario de toda la app.
- `a11y-core-20261119.md § D2` — Runtime audit axe DevTools viernes AM → DESEABLE. 15 min por URL = 1h total.

### D34-D37 · Deuda aceptada (1 deseable, 3 post)

- `deuda-aceptada-25-11.md § D1` — Validar alcance de "deuda aceptada" vs "fix pre-freeze obligatorio" → DESEABLE. Review del corte técnico.

### D38-D44 · Primera semana operación (3 deseables, 3 post + 1 bloqueante)

- `primera-semana-25-11-al-01-12.md § D1` — Umbral fix urgente vs sprint programado → DESEABLE. Criterios mecánicos BLOQUEA/CONVIENE/MENOR.
- `primera-semana-25-11-al-01-12.md § D7` — Modo on-call nocturno semana 1 (Sentry email) → DESEABLE. Alineado con monitoreo D1.

### D45-D48 · Playbook incidentes (3 deseables, 1 bloqueante)

- `incidentes-comunes-20261119.md § D1` — Agregar 4º escenario "Error 5xx generalizado" → DESEABLE. 1 página extra, vale el seguro.
- `incidentes-comunes-20261119.md § D2` — Query consolidada A+B+C+D en una corrida → DESEABLE. 10 min, ahorra copy-paste en caliente.
- `incidentes-comunes-20261119.md § D3` — URLs + templates ticket Resend/Supabase soporte pre-guardados → DESEABLE. 15 min, útil solo en incidente.

---

## 🟢 POST-LAUNCH (23)

### Rollback (2)

- `rollback-25-11.md § D1` — Template página mantenimiento HTML → POST (solo necesaria si N3 ocurre).
- `rollback-25-11.md § D2` — Email de incidente pre-redactado → POST (solo N3).

### Comunicación (1)

- `comunicacion-25-11.md § D2` — Alias `novedades@pawnecta.com` → POST (hasta que haya newsletter recurrente).

### Monitoreo (1)

- `monitoreo-24h-post-launch.md § D4` — Métricas públicas a redes sociales → POST (decisión post reporte T+24h).

### Experimentos A/B (5 — todos post por definición)

- `experimentos-postlaunch.md § D1-D5` — Todos POST (E1+E3+E4 primero, volumen 300/variante, Growthbook si valida, confianza informal, sin disclosure UI/copy).

### Error handling (2)

- `error-handling-20261119.md § D3` — Sprint migración a `EstadoError` → POST.
- `error-handling-20261119.md § D4` — Error logging a Sentry en catches mudos → POST.

### Correos casos borde (2)

- `correos-20261119.md § Sec II D3` — Snapshot del título de servicio en `agendamientos` → POST (semana 1 post-launch, ~1h).
- `correos-20261119.md § Sec II D4` — Validación fecha pasada en endpoint reserva → POST.

### Performance (3)

- `perf-core-20261119.md § D3` — Instalar bundle analyzer → POST.
- `perf-core-20261119.md § D4` — Target browserslist moderno → POST.
- `perf-core-20261119.md § D5` — Objetivo Core Web Vitals formal → POST.

### A11y (3)

- `a11y-core-20261119.md § D3` — Objetivo WCAG AA formal → POST.
- `a11y-core-20261119.md § D4` — @axe-core/react en dev → POST.
- `a11y-core-20261119.md § D5` — Soporte `prefers-reduced-motion` → POST.

### Deuda aceptada (3)

- `deuda-aceptada-25-11.md § D2` — Publicar deuda en sitio (transparencia) → POST (o nunca; mejor interno).
- `deuda-aceptada-25-11.md § D3` — Sprint cleanup semana 1 agendado → POST (planificación semana 1).
- `deuda-aceptada-25-11.md § D4` — Umbrales alerta Sentry post-launch → POST.

### Primera semana operación (4)

- `primera-semana-25-11-al-01-12.md § D3` — Testimonios proveedores IG → POST (decisión semana 1, con autorización).
- `primera-semana-25-11-al-01-12.md § D4` — Sprint cleanup fin de semana 1 → POST (dentro de semana 1).
- `primera-semana-25-11-al-01-12.md § D5` — Primer A/B fecha exacta → POST (lunes 30 o semana 2).
- `primera-semana-25-11-al-01-12.md § D6` — Blog post retrospectiva tono (números vs narrativa) → POST (decisión 30-11 PM).

### Playbook (0 post — todas deseables o bloqueantes)

---

## Checklist resumido para el PO (revisión hoy)

Revisar solo las 6 bloqueantes:

- [ ] **B1** · Correo masivo 25: todos vs filtrados → recomendado **todos**.
- [ ] **B2** · Banner home variante A/B/C → recomendado **A**.
- [ ] **B3** · Correo masivo trigger manual vs auto → recomendado **manual**.
- [ ] **B4** · Autorizar query FK `agendamientos_servicio_id_fkey` hoy → recomendado **sí**.
- [ ] **B5** · Confirmar disponibilidad PO 09-22 CLT + fines 10-20 → recomendado **confirmar**.
- [ ] **B6** · Autorizar auditor queries read-only playbook durante incidentes → recomendado **sí**.

Las 24 deseables y 23 post-launch pueden revisarse post-lanzamiento sin bloquear nada.

---

## Nota metodológica

- El PO había estimado 26 decisiones. Conteo real: **53**. La discrepancia se explica por la expansión que se dio en los docs de ayer (algunas decisiones se desdoblaron en subcasos al redactar).
- Clasificación hecha por el auditor con criterio: "si el default sin decidir es seguro para el 25-11, no es bloqueante". Toda decisión BLOQUEANTE arriba tiene un default inseguro o indefinido.
- Para cada decisión el auditor dio recomendación razonada en el doc original. El PO puede aceptar la recomendación en bloque (todas las DESEABLES con sus defaults) o revisar caso por caso.

---

## Firma

Este doc es inventario. No reemplaza el detalle de cada decisión (que vive en el doc original). Es herramienta de triage para que el PO decida eficiente qué revisa hoy y qué deja para después.
