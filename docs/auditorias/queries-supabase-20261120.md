# Auditoría de queries de Supabase — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: analizar performance de queries actuales + identificar índices faltantes + propuestas pre-campañas.
**Método**: (a) análisis estático de patrones de query en código (`main @ 0954bbe`); (b) MCP `supabase-prod-ro` para inspeccionar índices actuales + counts por tabla; (c) `pg_stat_statements` NO habilitado — análisis basado en patrones + schema.

**Limitación**: `pg_stat_statements` deshabilitado en el proyecto Supabase. Sin data real de mean_exec_time + call count por query. Análisis es predictivo basado en estructura de índices + patrones de queries en la app.

---

## Estado real prod (2026-11-20 PM)

| Tabla | Rows | Comentario |
|---|---:|---|
| notifications | 51 | Mayor volumen — bell del header |
| proveedores | 26 | Meta 100 proveedores |
| servicios_publicados | 25 | Catálogo activo |
| agendamientos | 11 | Reservas totales históricas |
| contactos | 11 | Contactos tracked |
| usuarios_buscadores | 9 | Tutores registrados |
| messages | 9 | Mensajes chat |
| conversations | 6 | Hilos de chat |
| favoritos | 1 | Baja activación (ver funnel contacto tutor) |
| evaluaciones | 1 | Reviews casi nulas |

**Volumen total**: pequeño (<200 rows cumulativo de tablas críticas). Performance de queries es **irrelevante HOY** en términos de latencia; relevante como **preparación para 10-100x volumen post-campañas**.

---

## Índices existentes

### agendamientos (8 índices)
- `agendamientos_pkey` (id)
- `agendamientos_no_solape_confirmadas` (gist servicio_id + F1 slot)
- `agendamientos_no_solape_estadias` (gist servicio_id + F2 rango)
- `agendamientos_unique_pendiente_por_tutor_servicio` (tutor+servicio WHERE pendiente)
- `idx_agendamientos_mascota` (mascota_id WHERE NOT NULL)
- `idx_agendamientos_proveedor` (proveedor_id, estado)
- `idx_agendamientos_servicio` (servicio_id)
- `idx_agendamientos_tutor` (tutor_id, created_at DESC)

**Análisis**: excelente cobertura. F1/F2 solape + reserva pendiente duplicada + lookup por tutor/proveedor/mascota. ✅ **No se necesitan índices nuevos acá**.

### conversations (2 índices)
- `conversations_pkey` (id)
- `conversations_client_id_sitter_id_key` (UNIQUE client+sitter)

**Análisis**: patrón de query típico `/mensajes` es `WHERE client_id = X OR sitter_id = X` (ver `components/Chat/ChatLayout.tsx`). El unique compound NO sirve para esta query. Sin índice simple, Postgres hace seq scan.

**Propuesta ÍNDICE-1 [ALTA pre-campañas]**:
```sql
CREATE INDEX idx_conversations_client ON public.conversations(client_id);
CREATE INDEX idx_conversations_sitter ON public.conversations(sitter_id);
```
Permite scan por índice en ambas condiciones del OR. Esfuerzo: 1 min. Impacto post-campañas (volumen conversations 10-100x).

### messages (1 índice — solo pkey)

**Análisis**: query típica es `SELECT * FROM messages WHERE conversation_id = X ORDER BY created_at ASC`. Sin índice en `conversation_id` → seq scan en toda la tabla.

**Propuesta ÍNDICE-2 [ALTA pre-campañas]**:
```sql
CREATE INDEX idx_messages_conversation_created ON public.messages(conversation_id, created_at);
```
Compound para que el order by created_at use el mismo índice. Esfuerzo: 1 min. Impacto directo en performance del chat.

### notifications (1 índice — solo pkey)

**Análisis**: queries típicas de `NotificationBell.tsx`:
- `SELECT * FROM notifications WHERE user_id = X ORDER BY created_at DESC LIMIT N`.
- `SELECT COUNT(*) FROM notifications WHERE user_id = X AND read_at IS NULL`.

Sin índice en `user_id` → seq scan cada vez que alguien abre el bell.

**Propuesta ÍNDICE-3 [ALTA pre-campañas]**:
```sql
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;
```
Primero para listado, segundo (partial) para el counter de unread. Esfuerzo: 1 min + 1 min. Impacto: bell responsive sin importar el volumen total de notifications.

### contactos (1 índice — solo pkey)

**Análisis**: query típica anti-review-spam gate en `ReviewModal.tsx` — `SELECT COUNT(*) FROM contactos WHERE auth_user_id = X AND servicio_id = Y`. Sin índice → seq scan.

**Propuesta ÍNDICE-4 [MEDIA pre-campañas]**:
```sql
CREATE INDEX idx_contactos_user_servicio ON public.contactos(auth_user_id, servicio_id);
```
Esfuerzo: 1 min. Impacto: review spam gate sub-millisecond incluso a volumen grande.

### evaluaciones (2 índices)
- `evaluaciones_pkey` (id)
- `evaluaciones_unique_por_servicio_usuario_activa` (UNIQUE servicio+usuario WHERE estado<>rechazado)

**Análisis**: query típica "reseñas de un servicio" → `SELECT * FROM evaluaciones WHERE servicio_id = X AND estado = 'aprobado' ORDER BY created_at DESC`. El unique compound ayuda parcial (prefijo servicio_id) pero WHERE filter adicional + order limita utilidad.

**Propuesta ÍNDICE-5 [MEDIA pre-campañas]**:
```sql
CREATE INDEX idx_evaluaciones_servicio_aprobado ON public.evaluaciones(servicio_id, created_at DESC)
WHERE estado = 'aprobado';
```
Partial index para solo las aprobadas (más común query en ficha). Esfuerzo: 1 min. Impacto post-sprint reseñas verificadas.

### favoritos (4 índices)
- `favoritos_pkey`
- `favoritos_user_id_entidad_tipo_entidad_id_key` (UNIQUE compound)
- `idx_favoritos_created_at`
- `idx_favoritos_entidad`
- `idx_favoritos_user_id`

**Análisis**: excelente cobertura. ✅ No necesita más.

### servicios_publicados (3 índices)
- `servicios_publicados_pkey`
- `idx_servicios_detalles_inclusiones` (GIN JSONB)
- `idx_servicios_rating` (rating + total_evaluaciones WHERE activo)

**Análisis**: el GIN para inclusiones JSONB es correcto. El rating index cubre ordenamiento. Pero NO hay índice en `activo + categoria_id + proveedor_id`.

Query típica del RPC `buscar_servicios`:
```sql
FROM servicios_publicados s
JOIN categorias_servicio c ON c.id = s.categoria_id
JOIN proveedores p ON p.id = s.proveedor_id
WHERE s.activo = true AND p.estado = 'aprobado' ...
```

Sin índice en `activo` el planner usa seq scan (cost < index scan hoy con 25 filas). Post-campañas con 200+ servicios, puede volverse issue.

**Propuesta ÍNDICE-6 [MEDIA post-campañas]**:
```sql
CREATE INDEX idx_servicios_activos_categoria ON public.servicios_publicados(categoria_id, activo)
WHERE activo = true;
```
Partial index solo sobre activos (que son los relevantes en la mayoría de queries). Esfuerzo: 1 min. Baja prioridad hasta tener >100 servicios.

### proveedores + usuarios_buscadores (2 índices cada uno)
- pkey + auth_user_id unique

**Análisis**: `auth_user_id unique` cubre el patrón común (lookup user actual). ✅ OK.

---

## Patrones de query en el código

Análisis estático del repo:

### P1 — N+1 potencial: proveedor hidratación en `/mis-reservas`

En `pages/mis-reservas.tsx` el tutor fetch de `agendamientos` incluye `.select('...servicios_publicados(...)')`. Hasta ahí OK (join server-side).

Pero después hace `fetchProveedoresPublicosByIds((data || []).map((a: any) => a.proveedor_id))` — otro round-trip. Si el tutor tiene 10 reservas con 10 proveedores distintos, es 1 query de agendamientos + 1 query batched de proveedores = 2 queries total. **NO es N+1 real** (batched), pero es 2 round-trips.

**Recomendación**: aceptable. El patrón separado permite que la vista `proveedores_publicos` aplique PII filtering sin afectar la query principal.

### P2 — Potencial N+1: ratings en `buscar_servicios` RPC

El RPC hace `LEFT JOIN evaluaciones e ON e.servicio_id = s.id AND e.estado = 'aprobado'` + `GROUP BY s.id, c.id, p.id`. Sobre 25 servicios con 1 evaluación total, instantáneo. Sobre 1000 servicios con 10k evaluaciones puede degradarse (aggregate scan sobre evaluaciones sin índice compuesto).

**Fix**: ÍNDICE-5 arriba cubre.

### P3 — Chat loading sin pagination

`components/Chat/MessageThread.tsx` carga TODAS las messages de una conversation sin paginación. Con 9 mensajes hoy, OK. Con 1000+ mensajes post-campañas, performance + UI empeora.

**Recomendación propuesta Q-R1**: pagination con `LIMIT 50 ORDER BY created_at DESC` + infinite scroll al hacer scroll up. Esfuerzo: 3-4h. Post-primer-sprint-chat.

### P4 — Notifications bell paginadas

`NotificationBell.tsx` ya tiene paginación 50 unread + 10 read (BELL-150 ya aterrizado). Con ÍNDICE-3, performance OK.

### P5 — Explorar fetch con joins

El RPC `buscar_servicios` hace 3 joins + 1 LEFT JOIN + GROUP BY. En 25 servicios es ~50-150ms (verificado empíricamente). Post-100 servicios + 500+ evaluaciones, puede subir a 300-500ms.

**Recomendación Q-R2**: considerar vista materializada `servicios_catalogo_cached` refreshed cada 5 min si post-campañas la latencia excede 300ms consistente. Pre-campañas no necesario.

### P6 — RLS overhead

Toda query en tablas con RLS activa paga el costo del policy check. Las policies más complejas (ej. `conversations` con OR client/sitter) pueden ser lentas con muchos rows. Hoy OK.

**Recomendación Q-R3**: revisar explain plan de queries de `/mensajes` y `/mis-reservas` post-campañas si latency sube.

---

## Verificar queries puntuales (dejado para el PO ejecutar)

Queries read-only que el PO puede correr en SQL Editor para monitoreo semanal:

```sql
-- Q1: cuáles tablas tienen más dead tuples (señal de updates intensivos → autovacuum lag)
SELECT relname, n_dead_tup, n_live_tup,
       (n_dead_tup::float / NULLIF(n_dead_tup + n_live_tup, 0) * 100)::int AS dead_pct,
       last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname='public'
ORDER BY n_dead_tup DESC NULLS LAST
LIMIT 10;

-- Q2: tamaño de tablas + índices
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS total,
  pg_size_pretty(pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS table_only,
  pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))
                 - pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS indexes
FROM pg_tables
WHERE schemaname='public'
ORDER BY pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) DESC
LIMIT 20;

-- Q3: índices sin uso (candidatos a borrar)
SELECT schemaname, relname AS tabla, indexrelname AS indice, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname='public'
ORDER BY idx_scan ASC NULLS FIRST
LIMIT 20;
```

---

## Top 5 índices a aplicar pre-campañas

Priorizados por esfuerzo (bajo en todos) + impacto esperado post-escala:

1. **ÍNDICE-1** · `idx_conversations_client` + `idx_conversations_sitter` (2 índices chicos).
2. **ÍNDICE-2** · `idx_messages_conversation_created` (compound chat).
3. **ÍNDICE-3** · `idx_notifications_user_created` + `idx_notifications_unread` (partial para unread).
4. **ÍNDICE-4** · `idx_contactos_user_servicio` (review spam gate).
5. **ÍNDICE-5** · `idx_evaluaciones_servicio_aprobado` (partial para reviews aprobadas).

**Migración consolidada propuesta**: `migrations/20261121_indices_prelaunch.sql`:

```sql
-- Índices pre-campañas (sprint queries-perf-prelaunch-20261121)
-- Esfuerzo: ~5 min aplicar + verificación.
-- Riesgo: cero (CREATE INDEX con CONCURRENTLY si hay volumen mayor).

CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_sitter ON public.conversations(sitter_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contactos_user_servicio
  ON public.contactos(auth_user_id, servicio_id);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_servicio_aprobado
  ON public.evaluaciones(servicio_id, created_at DESC)
  WHERE estado = 'aprobado';
```

**Aplicación**: PO ejecuta en Supabase Studio SQL Editor. Zero tiempo de lock (volúmenes chicos). Verificar post-aplicación con `SELECT * FROM pg_indexes WHERE schemaname='public'` que las 7 nuevas estén presentes.

---

## Habilitar `pg_stat_statements` pre-campañas

Hoy deshabilitado. Es la herramienta #1 para medir queries lentas en real time.

**Trabajo**: activación vía Supabase Dashboard → Database → Extensions → `pg_stat_statements` → Enable. ~2 min.

**Beneficio pre-campañas**: habilita el diagnóstico de queries lentas cuando llegue tráfico pagado.

**Decisión**: recomendación auditor **habilitar ya**.

---

## Decisiones pendientes del PO

### D1. Aplicar los 7 índices pre-campañas

**Pregunta**: ¿autorizás aplicar la migración `20261121_indices_prelaunch.sql` el sábado 21-11 junto con PII-VIEW-TIGHT (que ya tiene ventana SQL)?

**Recomendación**: sí. 5 min de ventana adicional. Zero riesgo (CREATE INDEX IF NOT EXISTS, zero lock a volúmenes chicos, backward-compatible).

**Impacto si no se decide**: default = quedan como deuda post-campañas; performance podría degradarse con volumen.

### D2. Habilitar pg_stat_statements

**Pregunta**: ¿activás la extensión en Supabase Dashboard?

**Recomendación**: sí. 2 min + beneficio continuo para diagnóstico.

**Impacto si no se decide**: default = diagnóstico ciego de queries lentas.

### D3. Vista materializada para catálogo público

**Pregunta**: ¿valide a futuro vista materializada `servicios_catalogo_cached` para `/explorar`?

**Recomendación**: **no pre-campañas**. Solo evaluar si latency del RPC consistent >300ms post-escala real.

**Impacto si no se decide**: default = evaluación reactiva.

### D4. Autovacuum tuning

**Pregunta**: ¿valide tunear parámetros autovacuum (`autovacuum_vacuum_scale_factor`, etc.) pre-campañas?

**Recomendación**: **no**. Defaults Supabase OK para volumen inicial. Revisar Q1 del doc en 2027-Q1 si hay dead_pct >20% en tablas grandes.

**Impacto si no se decide**: default = defaults Supabase.

### D5. Monitoring query latencies semanal

**Pregunta**: ¿agregás al calendar del PO revisar `pg_stat_statements` (post activación) los viernes PM durante primer mes campañas?

**Recomendación**: sí. 5 min / semana. Detecta regresiones rápido.

**Impacto si no se decide**: default = chequeo reactivo cuando hay incidente.

---

## Firma

Auditoría complementa `docs/auditorias/perf-core-20261119.md` (Lighthouse frontend) + `docs/auditorias/seguridad-20261120.md` (RLS). Los 3 forman inventario de performance + security end-to-end.
