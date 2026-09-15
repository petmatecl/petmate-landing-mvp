# Auditoría P8 corolarios — 2026-09-15 (sprint bloque-f)

**Origen**: BACKLOG L1238 — "Auditoría de los corolarios P8 de CLAUDE.md" (sprint default-privs 2026-09-01, prioridad media).

**Método**: leer cada corolario P8 numerado o no-numerado en CLAUDE.md, verificar (a) si se observó más de una vez, (b) si se verificó o se infirió, (c) si sigue siendo cierto, (d) si redundante con otros.

---

## Inventario canónico de P8 en CLAUDE.md

| ID actual | Línea | Título abreviado | Origen | Instancias | Estado |
|---|---|---|---|---|---|
| **P8 principal (L648)** | 648 | Smoke debe ejercitar el camino del usuario Y verificar el efecto observable | R3 SENTRY-1 2026-08-11 | Falla A + Falla B (2 documentadas del mismo sprint) | Sostenido. Regla base. |
| **P8 5ª** | 642 | El mecanismo de verificación puede fallar mientras la operación verificada está bien | bug1-fks 2026-08-14 | 5 sub-incidentes del mismo día enumerados (Sentry sent:true, GA4 log ext, migration IF NOT EXISTS, MCP info_schema, assertion DO $$) | Sostenido. Sub-caso concreto del principio general. |
| **P8 6ª** | 634 | SQL Editor Supabase transacciones separadas | 1 incidente 2026-08-14 | RETRACTADO 2026-09-01 sprint default-privs | Retractado con texto histórico preservado. Mantener como está. |
| **P8 7ª** | citado L537 | Sentry dashboard "cero issues rate-limit" leído como "no hay fallos" | 1 incidente (dentro de P8 10ª) | Sub-ejemplo de P8 10ª, no corolario propio. | Consolidar dentro de P8 10ª. |
| **P8 8ª** | 630 | Preferir señales síncronas del sistema propio sobre dashboards de terceros con latencia/retención corta | smoke A4 Upstash 2026-08-14 | 1 incidente concreto documentado + ejemplos canónicos (X-RateLimit-Backend, X-Cache, X-Sentry-Id) | Sostenido. Principio general refuerza sobre múltiples ejemplos. |
| **P8 10ª** | 537 | Positivo conocido antes de aceptar un negativo | acumulado 3 días 2026-08-18 | 5 sub-incidentes distintos: migration IF NOT EXISTS, MCP info_schema, Upstash Total Commands: 0, Sentry cero issues rate-limit, grep AlertCircle | Sostenido. El más robusto empíricamente. |
| **P8 11ª** | 620 | Atribución causal, verificar contra positivo conocido | 1 incidente 2026-08-20 (%20 huérfanas) | 1 solo incidente + generalización razonada del 10ª al análisis narrativo | Sostenido con caveat: 1 instancia, aplicación razonada del 10ª. |
| **P8 no-numerado (L644)** | 644 | MCP read-only e `information_schema` sesgo por privileges | bug1-fks 2026-08-14 (mismo día que 5ª) | 1 incidente concreto + docs Postgres cap. 34 (fuente empírica externa) | Sostenido. Fuente empírica sólida (docs oficiales Postgres + incidente concreto). |
| **P8 no-numerado (L646)** | 646 | Verificar contra el sistema del producto, no contra tooling de dev | GA4 debug 2026-08-14 | 1 incidente concreto (3 iteraciones + revert) | Sostenido. Ejemplo canónico bien documentado. |
| **P8 no-numerado (L594)** | 594 | Kill-switch UI probado con smoke inducido | email-landing 2026-08-25 | 1 incidente concreto | Sostenido. |
| **Instancia P8 (L498)** | 498 | Fecha del tag vs commit apuntado | badge-f1 2026-08-20 | 1 incidente | Sostenido. Regla operativa clara. |
| **Instancia P8 (L478)** | 478 | Schema knowledge sin verificar contra information_schema | 3 slips en 1 día 2026-08-25 | 3 sub-incidentes | Sostenido. |

---

## Análisis: redundancias y consolidaciones propuestas

### Consolidación 1 — Familia "positivo conocido"

**Miembros**: P8 5ª (mecanismo de verificación falla) + P8 10ª (resultado negativo → positivo conocido) + P8 11ª (atribución causal → positivo conocido).

**Argumento**: los 3 son variaciones del mismo principio — antes de aceptar una señal como evidencia, verificar que el mecanismo de la señal funciona con un caso conocido.
- **P8 5ª** es el caso: el mecanismo de assertion falló mientras el efecto verificado sí ocurrió.
- **P8 10ª** es la generalización del principio a resultados negativos ("cero X" — validar con ">0 Y_conocido").
- **P8 11ª** es la aplicación del principio a atribuciones causales narrativas ("X explica Y" — validar contra la distribución empírica de Y).

**Propuesta**: mantener los 3 bloques como sub-secciones de una sección madre "Positivo conocido antes de aceptar señales" — el orden narrativo va del más específico (5ª, mecanismo assertion) al más abstracto (10ª, cualquier verificación negativa) al más generalizado (11ª, análisis narrativo). Retirar la numeración "5ª/10ª/11ª" que sugiere secuencia arbitraria de "instancias del meta-patrón" y reemplazarla por títulos temáticos claros.

**Efecto en lector futuro**: reduce el ruido de "¿cuál es P8 5ª vs P8 7ª?" — hoy P8 7ª solo se menciona como ejemplo dentro de P8 10ª y no tiene entrada propia.

### Consolidación 2 — Familia "verificar contra el sistema del producto, no tooling"

**Miembros**: P8 8ª (señales síncronas > dashboards con latencia) + P8 no-numerado L646 (sistema del producto vs tooling de dev).

**Argumento**: ambos dicen que la superficie del producto es la fuente de verdad; dashboards, extensiones y tooling interpretativo son indirecciones que pueden mentir. P8 8ª enfatiza latencia/retención de dashboards; L646 enfatiza estructura interna del tooling divergente del sistema.

**Propuesta**: consolidar en una sola sección "Preferir superficie del producto sobre indirecciones (dashboards con latencia, tooling interpretativo)". Los dos incidentes canónicos (Upstash + GA4 debugger) van como ejemplos dentro de la misma sección.

### Corolarios que quedan independientes

- **P8 no-numerado L644 (MCP read-only sesgo privileges)**: técnico específico con fuente empírica externa (Postgres cap. 34). No redundante — es una regla operativa concreta sobre qué API SQL usar.
- **P8 no-numerado L594 (kill-switch UI smoke inducido)**: aplicación de P8 al patrón "código defensivo cuya ejecución nunca se prueba".
- **Instancia P8 L498 (tag fecha vs commit)** e **instancia P8 L478 (schema knowledge)**: son sub-reglas operativas concretas de P6 y P5, mencionan P8 como paralelismo cognitivo pero no proponen corolario nuevo. Mantener como están.

### P8 6ª (SQL Editor)

Ya retractado con nota + texto histórico preservado. **No tocar** — patrón de retractación es el ejemplo canónico de cómo tratar corolarios refutados.

---

## Recomendación operativa

**No reescribir CLAUDE.md por ahora**. La consolidación propuesta arriba tiene beneficio conceptual (menos numeración confusa, secciones más navegables) pero:

1. **Costo**: el reescrito impacta ~200 líneas de CLAUDE.md, arriesga romper referencias inline de otros documentos (`ACTA_*.md` referencian "P8 5ª" varias veces).
2. **Beneficio marginal**: los corolarios funcionan como están hoy; ningún incidente reciente falló por consultar "P8 5ª vs 10ª".
3. **Trigger real de reescrito**: si aparece un incidente donde el auditor confundió 5ª con 10ª o eligió mal el corolario, entonces sí conviene consolidar. Hoy no hay ese incidente registrado.

**Acciones concretas hechas en esta auditoría** (docs-only):

1. **Este documento** (`docs/P8_COROLARIOS_AUDIT_20260915.md`) queda como registro de la auditoría.
2. **BACKLOG L1238** (entrada "Auditoría de los corolarios P8 de CLAUDE.md") se marca **CERRADA** con puntero acá.
3. **Recomendación pendiente**: si a futuro (post-launch) el volumen de corolarios crece o aparece confusión concreta, disparar sprint dedicado con la consolidación propuesta arriba como plan.

## Grep de referencias externas al inventario numerado

Para futuro sprint de consolidación (si se dispara), estas son las referencias externas al numerado que habría que actualizar:

```
grep -rn "P8 5ª\|P8 6ª\|P8 7ª\|P8 8ª\|P8 10ª\|P8 11ª" --include="*.md"
```

Verificado 2026-09-15: las referencias viven principalmente en CLAUDE.md, BACKLOG.md, y algún ACTA histórico. Cualquier consolidación futura debe hacer sed massivo en actas históricas o dejar los identificadores como aliases sin definición nueva.
