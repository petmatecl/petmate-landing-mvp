# Migration FKs habilitantes — pre-Ola 2 (sprint bug1-fks 2026-08-14)

**Motivación**: hallazgo Ola 1 C1 confirmado por MCP staging → 12/12 tablas del proyecto tienen **CERO FKs definidas**. Consecuencias documentadas en BACKLOG.md (embed PostgREST bloqueado, filas huérfanas posibles, cero `ON DELETE CASCADE`, A2 batch delete requiere cascadas manuales riesgosas).

**Alcance esta migration — HABILITANTE (10 FKs críticas)**. Fase refinamiento (8 FKs adicionales + índices) queda para post-launch.

**Ejecución**: Aldo aplica manual en SQL Editor de **staging PRIMERO** + **prod** con las 3 etapas (auditoría → cleanup si aparece → migration). NO ejecutar la migration si la auditoría muestra huérfanas — corregir primero.

---

## 1. Tabla de decisiones `ON DELETE` justificada

| # | Relación | `ON DELETE` | Justificación |
|---|---|---|---|
| 1 | `agendamientos.servicio_id → servicios_publicados.id` | **RESTRICT** | Historial de reservas del servicio es evidencia (facturación, disputa, ranking). Un proveedor que quiera dar de baja un servicio con reservas activas debe cancelarlas primero (flow admin). RESTRICT bloquea el DELETE del servicio y fuerza al admin a resolver. |
| 2 | `agendamientos.proveedor_id → proveedores.id` | **RESTRICT** | Mismo criterio: agendamientos son evidencia de actividad del proveedor. Borrar proveedor con reservas requiere handling explícito por parte del admin (transferir, anonimizar, cancelar). Sin RESTRICT, borrar proveedor por accidente pierde 100% del historial de sus clientes. |
| 3 | `agendamientos.tutor_id → usuarios_buscadores.id` | **RESTRICT** | El tutor puede querer borrar su cuenta, pero SUS reservas son evidencia legítima para el proveedor (facturación, historial). RESTRICT fuerza a decidir explícitamente. **Alternativa considerada `SET NULL`** (permite borrar cuenta anonimizando reservas) — descartada por ahora porque NO existe flow formal de "eliminar cuenta" y RESTRICT es más seguro contra data loss accidental. Evolucionar a SET NULL cuando exista el flow de GDPR-eliminación de cuenta. |
| 4 | `agendamientos.mascota_id → mascotas.id` (NULLABLE) | **SET NULL** | La ficha de mascota puede desaparecer sin invalidar el agendamiento histórico (el fallback `tipo_mascota_texto` cubre). |
| 5 | `servicios_publicados.proveedor_id → proveedores.id` | **CASCADE** | Los servicios PERTENECEN al proveedor. Si el proveedor se borra intencionalmente (post-rechazo, cierre), sus servicios se borran con él — nadie más los publica. **PERO** combinado con `#2 RESTRICT`: borrar proveedor con reservas activas queda bloqueado en la fuente (agendamientos), así que la cascada solo se dispara sobre proveedores SIN reservas activas. Consistente. |
| 6 | `servicios_publicados.categoria_id → categorias_servicio.id` | **RESTRICT** | Categoría con servicios no se debe borrar por accidente. Las 10 categorías del sistema son referencias estables — su lifecycle es distinto (agregar/renombrar, casi nunca borrar). |
| 7 | `evaluaciones.servicio_id → servicios_publicados.id` | **CASCADE** | Reviews son sobre el servicio. Si el servicio se borra (raro — cascada de #5), las reviews también. **Alternativa `SET NULL`** para preservar reviews como testimonio del proveedor descartada porque `evaluaciones.proveedor_id` también existe y ese es el vínculo canónico al historial del proveedor. |
| 8 | `evaluaciones.proveedor_id → proveedores.id` | **CASCADE** | Idem #5: reviews son sobre el proveedor. Si proveedor se borra (intencional post-rechazo), reviews se borran. |
| 9 | `contactos.servicio_id → servicios_publicados.id` | **CASCADE** | Contactos son tracking del servicio; si el servicio se borra, contactos se borran (evita huérfanos en la tabla de analytics). |
| 10 | `contactos.proveedor_id → proveedores.id` | **CASCADE** | Idem. |

### FKs REFINAMIENTO — post-viaje (NO en esta migration)

- `conversations.{servicio_id, client_id, sitter_id, agendamiento_id}` — chat es tejido conector, decisiones son más sutiles (client_id CASCADE, sitter_id CASCADE, servicio_id SET NULL, agendamiento_id SET NULL).
- `messages.{conversation_id CASCADE, sender_id SET NULL}` — mensajes útiles al receptor aunque sender ya no exista.
- `evaluaciones.usuario_id → auth.users.id` (cross-schema) — SET NULL para review anónima.
- `contactos.auth_user_id → auth.users.id` (cross-schema) — CASCADE por privacidad.
- Índices sobre las FK columns (performance de joins post-launch cuando volumen suba).

**Descartadas del alcance HABILITANTE porque**: (a) cross-schema `auth.users` requiere permisos extra que Supabase managed puede rechazar, (b) `conversations/messages` no bloquean A2 batch delete (no cascadean desde `proveedores/servicios_publicados`), (c) sin urgencia real pre-launch. Post-viaje con volumen real + señal empírica.

---

## 2. Auditoría huérfanas prod — **CORRER PRIMERO**

**Aldo ejecuta en SQL Editor de Supabase Studio del proyecto PROD** (`ouezpeeiwjwawauidrqq`). Cada query debe devolver **CERO rows** para que la migration pase limpia. Si alguna devuelve rows, esas filas son huérfanas históricas — decidir cleanup antes de la migration (borrar, migrar a proveedor válido, o reasignar).

```sql
-- HUÉRFANOS #1: agendamientos.servicio_id apuntando a servicio inexistente
SELECT id, servicio_id, estado, created_at::date FROM agendamientos
WHERE servicio_id NOT IN (SELECT id FROM servicios_publicados);

-- HUÉRFANOS #2: agendamientos.proveedor_id apuntando a proveedor inexistente
SELECT id, proveedor_id, estado, created_at::date FROM agendamientos
WHERE proveedor_id NOT IN (SELECT id FROM proveedores);

-- HUÉRFANOS #3: agendamientos.tutor_id apuntando a tutor inexistente
SELECT id, tutor_id, estado, created_at::date FROM agendamientos
WHERE tutor_id NOT IN (SELECT id FROM usuarios_buscadores);

-- HUÉRFANOS #4: agendamientos.mascota_id apuntando a mascota inexistente (mascota_id NULLABLE, ignorar NULLs)
SELECT id, mascota_id, estado, created_at::date FROM agendamientos
WHERE mascota_id IS NOT NULL AND mascota_id NOT IN (SELECT id FROM mascotas);

-- HUÉRFANOS #5: servicios_publicados.proveedor_id apuntando a proveedor inexistente
SELECT id, proveedor_id, titulo, activo FROM servicios_publicados
WHERE proveedor_id NOT IN (SELECT id FROM proveedores);

-- HUÉRFANOS #6: servicios_publicados.categoria_id apuntando a categoría inexistente
SELECT id, categoria_id, titulo FROM servicios_publicados
WHERE categoria_id NOT IN (SELECT id FROM categorias_servicio);

-- HUÉRFANOS #7: evaluaciones.servicio_id apuntando a servicio inexistente
SELECT id, servicio_id, rating, estado FROM evaluaciones
WHERE servicio_id NOT IN (SELECT id FROM servicios_publicados);

-- HUÉRFANOS #8: evaluaciones.proveedor_id apuntando a proveedor inexistente
SELECT id, proveedor_id, rating, estado FROM evaluaciones
WHERE proveedor_id NOT IN (SELECT id FROM proveedores);

-- HUÉRFANOS #9: contactos.servicio_id apuntando a servicio inexistente
SELECT id, servicio_id, canal, created_at::date FROM contactos
WHERE servicio_id NOT IN (SELECT id FROM servicios_publicados);

-- HUÉRFANOS #10: contactos.proveedor_id apuntando a proveedor inexistente
SELECT id, proveedor_id, canal, created_at::date FROM contactos
WHERE proveedor_id NOT IN (SELECT id FROM proveedores);
```

**Interpretación**:
- **10/10 queries retornan CERO rows** → migration puede aplicarse limpia. Ir al §3.
- **≥1 query retorna rows** → esas son huérfanas históricas. Decidir cleanup por caso (borrar la fila huérfana, o reasignar a padre válido). Reportar hallazgo al auditor con la lista para armar los DELETE / UPDATE correctivos ANTES de la migration.

---

## 3. Migration SQL

Ver `migrations/20260814_fks_habilitantes.sql`. Idempotente vía `ADD CONSTRAINT IF NOT EXISTS` (aunque Postgres <11 no lo soporta directo — el archivo usa `DO $$ ... $$` blocks para verificar existencia por `information_schema.table_constraints` antes de agregar).

**Orden de aplicación estricta — Aldo**:
1. **Auditar huérfanas (§2)** en staging.
2. Si CERO huérfanas staging → aplicar migration en staging.
3. Verificar que las queries del panel admin siguen funcionando (fetchPendientes + fetchVerificaciones + AdminMetrics + ConversionMetrics + OfertaMetrics).
4. Smoke: crear proveedor de prueba en staging → borrar → verificar cascade correcto (servicios se borran, contactos se borran, evaluaciones se borran, agendamientos RESTRICT si hay).
5. **Repetir §2 + §3 + §4 en PROD**.

**Rollback**: cada FK se puede DROP individualmente. Ver bloque `-- ROLLBACK` al final del archivo SQL.

---

## 4. Smoke A2 post-migration

Con las FKs aplicadas, el batch delete A2 (borrar los 9 proveedores ejemplo) se simplifica a:

```sql
-- ANTES de FKs: DELETE en cascada manual sobre 5 tablas EN ORDEN
-- DESPUÉS de FKs: 1 solo DELETE con cascada automática via FK CASCADE
BEGIN;
-- Verificar que los ejemplo NO tienen agendamientos con clientes reales
-- (RESTRICT bloquearía el DELETE del proveedor si los tienen).
SELECT p.id, p.nombre, COUNT(a.id) as agendamientos
FROM proveedores p LEFT JOIN agendamientos a ON a.proveedor_id = p.id
WHERE p.es_ejemplo = true
GROUP BY p.id, p.nombre;

-- Si algún proveedor ejemplo tiene agendamientos reales → decidir caso a caso
-- (borrar agendamientos manualmente primero, o preservar el proveedor).

-- Si cero conflictos: batch delete
DELETE FROM proveedores WHERE es_ejemplo = true;
-- Cascada automática por FKs:
--   servicios_publicados de esos proveedores → CASCADE
--   evaluaciones de esos proveedores/servicios → CASCADE
--   contactos de esos proveedores/servicios → CASCADE
COMMIT;
```

**Sin FKs**: hay que hacer DELETE manual en orden inverso (agendamientos → contactos → evaluaciones → servicios_publicados → proveedores) rezando por no dejar huérfanos.

---

## 5. Estado y próximo movimiento

- **Migration escrita** en `migrations/20260814_fks_habilitantes.sql`.
- **Auditoría huérfanas** — pendiente ejecución PROD por Aldo (§2).
- **Aplicación migration** — pendiente ejecución PROD por Aldo (§3) tras auditoría limpia.
- **A2 batch delete** — pendiente post-migration (§4).

**Ola 2 arranca** post-A2 batch delete + A4 rate limit Upstash.
