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

## 4. A2 batch delete post-migration — 3 pasos OBLIGATORIOS antes del DELETE

Con las FKs aplicadas, el batch delete A2 (borrar los proveedores ejemplo) se simplifica técnicamente a `DELETE FROM proveedores WHERE es_ejemplo = true` con cascada automática. **PERO** ese DELETE es irreversible y cascadea 4 tablas (`servicios_publicados`, `evaluaciones`, `contactos`, + RESTRICT sobre `agendamientos`). **Tres pasos obligatorios antes del DELETE**:

### 4.0 — Alcance ampliado A2 (ajuste PO 2026-08-14)

Además de los proveedores marcados `es_ejemplo=true`, la limpieza pre-launch de A2 incluye:

- **Cuentas de proveedor creadas durante rituales de prueba en prod hoy** — Aldo probablemente creó 1-2 cuentas en las verificaciones GA4/A1/A3 del 2026-08-14. Estas cuentas están con `es_ejemplo=false` (creadas via el flow real de signup) pero son data de prueba que contamina el conteo de OfertaMetrics y las 8 solicitudes pendientes reales. Query para identificarlas junto con los ejemplo (§4.1 abajo la incluye vía `id_pattern` + `email_auth`).
- **Eventos `diag_test`, `test_manual_v2`, `test_con_bypass`, `test_no_sw`, `test_manual_aldo`, `diag_1` en GA4** — se van solos (GA4 default retention aplica, no requieren cleanup). Contaminación mínima post-launch, cero acción.
- **Registro `NuevoProveedorPendienteEmail` a `contacto@pawnecta.com`** disparado por las cuentas de prueba creadas hoy — Aldo los revisa manualmente y descarta.

### 4.1 Verificar `es_ejemplo` confiable en prod — REVISIÓN NOMBRE POR NOMBRE

Hoy mismo asumimos que 8 solicitudes eran seed y resultó que eran personas reales. Si algún proveedor **real quedó marcado como ejemplo por error** (ej. bug de flag mal seteado, testing manual olvidado), el DELETE se lleva su catálogo entero — irrecuperable.

**Aldo lee esta query y confirma nombre por nombre que TODOS los listados son efectivamente proveedores de prueba** que él/dev crearon a propósito:

```sql
-- (a) Los es_ejemplo=true en prod, con toda la info que permite juzgar
SELECT p.id, p.nombre, p.apellido_p, p.rut, p.comuna,
       p.telefono, p.whatsapp, p.email_publico,
       u.email as email_auth,
       p.estado, p.verificacion_estado,
       p.created_at::date as created,
       CASE
         WHEN p.id::text ~ '^b100000[12]-' THEN 'seed_pattern_uuid'
         ELSE 'random_uuid_sospechoso'
       END as id_check
FROM proveedores p
LEFT JOIN auth.users u ON u.id = p.auth_user_id
WHERE p.es_ejemplo = true
ORDER BY p.created_at;

-- (b) Cuentas de proveedor CREADAS HOY 2026-08-14 (rituales de prueba
-- ga4/A1/A3). Estas están con es_ejemplo=false pero son data de prueba
-- que también hay que limpiar. Aldo revisa cada una y decide.
SELECT p.id, p.nombre, p.apellido_p, p.rut, p.comuna,
       u.email as email_auth,
       p.verificacion_estado,
       p.created_at
FROM proveedores p
LEFT JOIN auth.users u ON u.id = p.auth_user_id
WHERE p.created_at::date = '2026-08-14'
  AND p.es_ejemplo = false
ORDER BY p.created_at DESC;
```

**Criterio decisión**:
- Si TODOS los 9-10 son nombres claramente de test (nombres del set staging: Sebastián Castro / Carolina Méndez / Matías Fernández / Daniela Rojas / Felipe Navarro / Tomás Pizarro / Andrea Navarro / Patricia Soto / Javiera Espinoza) + `id_check='seed_pattern_uuid'` (patrón `b1000001-...`) → **CONFIABLE, seguir a 4.2**.
- Si aparece cualquier proveedor con nombre real desconocido, con `id_check='random_uuid_sospechoso'`, o con email_auth de dominio real usado (@gmail, @hotmail, @outlook) → **STOP, sospecha de mismarking**. Revisar caso a caso: puede haber sido real que se marcó ejemplo por error. Antes de borrar, `UPDATE proveedores SET es_ejemplo=false WHERE id='<sospechoso>'` para desmarcar + investigar historia (git log de migrations, contactar al mismo proveedor si hay email).

### 4.2 Dry-run — impacto exacto ANTES del DELETE

Contar EXACTAMENTE cuántas filas cascadearán por cada proveedor a borrar. Query cubre AMBOS grupos (es_ejemplo=true + cuentas de prueba del 2026-08-14) via UNION.

```sql
-- Dry-run: filas que cascadean por cada proveedor a borrar
WITH candidatos AS (
  SELECT id, nombre, apellido_p, 'es_ejemplo' as motivo
  FROM proveedores WHERE es_ejemplo = true
  UNION ALL
  SELECT id, nombre, apellido_p, 'prueba_2026-08-14' as motivo
  FROM proveedores
  WHERE created_at::date = '2026-08-14' AND es_ejemplo = false
)
SELECT
  c.motivo, c.id, c.nombre, c.apellido_p,
  (SELECT COUNT(*) FROM servicios_publicados WHERE proveedor_id = c.id) as servicios,
  (SELECT COUNT(*) FROM evaluaciones WHERE proveedor_id = c.id) as evaluaciones,
  (SELECT COUNT(*) FROM contactos WHERE proveedor_id = c.id) as contactos,
  (SELECT COUNT(*) FROM agendamientos WHERE proveedor_id = c.id) as agendamientos_bloquea_delete
FROM candidatos c
ORDER BY c.motivo, c.nombre;
```

**Interpretación**:
- `agendamientos_bloquea_delete > 0` en cualquier fila → RESTRICT bloqueará el DELETE del proveedor. Decidir por caso: (a) si el agendamiento es tutor real de prueba interno (ej. Aldo probó reservar contra un ejemplo), borrar el agendamiento primero (`DELETE FROM agendamientos WHERE proveedor_id = '<id>'` — verifica tutor no sea uno importante), o (b) si el agendamiento es de un tutor REAL que reservó con un servicio ejemplo, **NO borrar el proveedor** (preservar servicio + agendamiento, evaluar caso legal).
- `servicios + evaluaciones + contactos` — es lo que se pierde. Aldo lee la suma y decide si el costo es asumible. Normalmente sí porque son data de prueba.

**Total esperado en prod** (extrapolando del inventario staging Ola 1 A2): ~10 servicios, ~1 evaluación, X contactos, 0-1 agendamientos por proveedor ejemplo. Cifras chicas.

### 4.3 Ejecutar batch delete con transacción explícita

Con 4.1 confirmado + 4.2 revisado + agendamientos_bloquea_delete resuelto:

```sql
BEGIN;
-- Cascada automática por FKs:
--   servicios_publicados de esos proveedores → CASCADE
--   evaluaciones de esos proveedores/servicios → CASCADE
--   contactos de esos proveedores/servicios → CASCADE
--   agendamientos → RESTRICT (bloquea si hay; si aparece, hacer ROLLBACK)

-- Grupo (a) proveedores marcados es_ejemplo=true
DELETE FROM proveedores WHERE es_ejemplo = true RETURNING id, nombre;

-- Grupo (b) cuentas de prueba creadas hoy 2026-08-14 durante rituales GA4/A1/A3
-- Aldo verifica IDs específicos con el resultado de §4.1 (b) y los borra por id
-- (no confiar en `created_at::date` en DELETE — proveedores REALES pueden haberse
-- registrado hoy también post-launch; usar IDs explícitos).
-- DELETE FROM proveedores WHERE id IN ('<id_1>', '<id_2>', ...) RETURNING id, nombre;

-- Aldo lee ambos RETURNING antes de commit — verifica que las listas de IDs
-- borrados coinciden con lo esperado del dry-run (4.2).
COMMIT;
-- (O ROLLBACK; si algo se ve raro).
```

**Sin FKs**: hay que hacer DELETE manual en orden inverso (agendamientos → contactos → evaluaciones → servicios_publicados → proveedores) rezando por no dejar huérfanos. **Con FKs**: 1 solo DELETE + `RETURNING` para auditar antes de commit + posibilidad de ROLLBACK dentro de la transacción si algo se ve raro.

**~~⚠️ CRÍTICO — el SQL Editor de Supabase NO mantiene transacciones entre ejecuciones separadas~~** — **AFIRMACIÓN RETIRADA 2026-09-01 (sprint default-privs)**. Este bloque fue el eco simétrico del corolario P8 6ª de CLAUDE.md, y se retracta bajo los mismos motivos:

- Anclada a 1 solo incidente (A2 prod 2026-08-14).
- Observación empírica contraria del PO (múltiples separaciones exitosas de corridas sin rollback silente) nunca se refutó con datos.
- Retracción verbal en admin-visibilidad 2026-08-27, no aterrizada, hasta este sprint.

**Instrucción al lector futuro**: si necesitás saber cómo se comporta el SQL Editor con corridas separadas, **medilo** con un caso simple. No citar este bloque como regla. Ver `CLAUDE.md > SQL Editor de Supabase...` para la retracción completa + entrada BACKLOG "Auditoría de los corolarios P8 de CLAUDE.md" (sprint default-privs 2026-09-01).

**Alternativa segura para dry-run destructivo** (independiente de la afirmación retirada, sigue válida por otro motivo — el BEGIN sin COMMIT explícito revierte por especificación PostgreSQL cuando la sesión cierra la transacción): correr primero `BEGIN;` + `DELETE ... RETURNING ...;` sin `COMMIT`. La transacción no persiste porque no se commiteó. Si el output matchea lo esperado, agregar `COMMIT;` en un segundo bloque completo. Este mecanismo es documentado en PostgreSQL y no depende del comportamiento afirmado en el bloque retractado.

**Registro histórico del incidente A2 prod (2026-08-14, preservado para trazabilidad)**: Aldo reportó que un primer intento con `BEGIN` / `DELETE RETURNING` / `COMMIT` separados en 3 corridas no persistió (las 9 filas seguían tras la corrida 3). Un segundo intento con los 3 en 1 sola corrida sí persistió. La conclusión que se sacó (rollback silente entre corridas) fue una inferencia sobre 1 caso, no una verificación repetida. El comportamiento efectivo del SQL Editor requiere medirse antes de citarse como regla — no fue medido.

---

## 5. Estado y próximo movimiento

- **Migration original** aplicada 2026-08-14 pero **con 3 divergencias descubiertas post-aplicación** — ver §6.
- **Migration correctiva** en `migrations/20260814b_fks_agendamientos_correctiva.sql` — pendiente aplicación Aldo.
- **Auditoría huérfanas** — §2 (aplicable también antes de la correctiva; huérfanas siguen bloqueando ADD CONSTRAINT).
- **A2 batch delete** — pendiente post-correctiva.

**Ola 2 arranca** post-correctiva + A2 batch delete + A4 rate limit Upstash.

## 6. Post-mortem 2026-08-14 — divergencia migration original vs tabla aprobada

Aldo verificó post-aplicación en prod y descubrió que 3 de las 10 FKs quedaron con `ON DELETE CASCADE` cuando la tabla aprobada §1 declaraba `RESTRICT` explícito para las 3.

| # | FK | §1 aprobado | Aplicado prod | Match? |
|---|---|---|---|---|
| 1 | `agendamientos.servicio_id` | RESTRICT | **CASCADE** | ❌ |
| 2 | `agendamientos.proveedor_id` | RESTRICT | **CASCADE** | ❌ |
| 3 | `agendamientos.tutor_id` | RESTRICT | **CASCADE** | ❌ |
| 4 | `agendamientos.mascota_id` | SET NULL | SET NULL | ✅ |
| 5 | `servicios_publicados.proveedor_id` | CASCADE | CASCADE | ✅ |
| 6 | `servicios_publicados.categoria_id` | RESTRICT | NO ACTION | ✅ (equivalente en PG) |
| 7 | `evaluaciones.servicio_id` | CASCADE | CASCADE | ✅ |
| 8 | `evaluaciones.proveedor_id` | CASCADE | CASCADE | ✅ |
| 9 | `contactos.servicio_id` | CASCADE | CASCADE | ✅ |
| 10 | `contactos.proveedor_id` | CASCADE | CASCADE | ✅ |

**Causa técnica**: el bloque `DO $$ IF NOT EXISTS` de la migration original verificaba por **NOMBRE de constraint**, no por **semántica**. Hipótesis: prod ya tenía las 3 constraints (con esos nombres exactos, creadas por Supabase u otra migration histórica) en CASCADE. El `IF NOT EXISTS` matcheó → skipeó el `ALTER` → constraints pre-existentes en CASCADE quedaron. La migration hizo NO-OP semántico para esas 3.

**Bug de diseño del auditor**: confundí "idempotente para re-ejecución" con "garantiza el estado deseado". La idempotencia por nombre no garantiza semántica correcta cuando el nombre ya existe con definición distinta.

**Consecuencia crítica para A2**: con las 3 en CASCADE, `DELETE FROM proveedores WHERE es_ejemplo=true` **eliminaría en silencio todos los agendamientos vinculados** — invalida la columna `agendamientos_bloquea_delete` del dry-run §4.2, y contradice el diseño de seguridad aprobado ("solo se puede borrar un proveedor SIN reservas"). **A2 bloqueado hasta correctiva aplicada**.

**Fix**: `migrations/20260814b_fks_agendamientos_correctiva.sql` — DROP + ADD explícito de las 3 FKs con RESTRICT. La secuencia DROP+ADD garantiza el `delete_rule` esperado independiente de la definición previa.

## 7. Aprendizaje P8 aplicado a migrations — verificación por diff, no por dump

La migration original terminaba con un `SELECT` que mostraba las 10 constraints con sus `delete_rule`. Aldo pegó el output. La divergencia estaba visible en el output pero **nadie la comparó contra la tabla aprobada** — la validación fue "el query devolvió 10 rows" en vez de "cada delete_rule matchea el esperado". Es exactamente el patrón P8 aplicado al ciclo de migrations: **la verificación corrió y dio output, pero nadie validó el output contra el criterio**. Precedente del día: 3 iteraciones de GA4 persiguiendo el log equivocado de una extensión.

## 8. Post-mortem 2 (2026-08-14 tarde) — la premisa completa del sprint era falsa

Tras aplicar la correctiva, PO ejecutó `SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public'` desde el SQL Editor de Supabase → **41 FKs** en ambos ambientes. Contradice la premisa original de "cero FKs" que motivó el sprint entero.

**Causa técnica**: el rol MCP `supabase_read_only_user` tiene SELECT + BYPASSRLS pero **no REFERENCES**. `information_schema.table_constraints` en PostgreSQL **filtra por privileges del rol consultante** (docs 34.29: "contains all constraints belonging to tables that the current user owns or has some privilege other than SELECT on"). Sin REFERENCES, las FKs quedan invisibles en `information_schema` para el rol MCP, aunque `pg_constraint` (catálogo de sistema sin ese filtro) las expone.

**Verificado en la sesión con `pg_constraint`**: las 10 FKs del sprint YA existían con esos nombres exactos y los delete_rules que Aldo verificó post-aplicación. La migration original fue **NO-OP completo** (todas skipeadas por IF NOT EXISTS que matcheaba por nombre).

**Consecuencia**: la única deuda real del sprint FKs es la correctiva `20260814b` (3 CASCADE preexistentes → RESTRICT), no la existencia de FKs. Todos los demás argumentos (SEVERIDAD ALTA sistémico, embeds bloqueados en toda la app, huérfanas posibles, cascada A2 requiere FKs) eran falsos.

**Aprendizaje codificado en CLAUDE.md** — corolario P8 nuevo: "para constraints/indexes/triggers/permisos, usar `pg_catalog` en vez de `information_schema` — el MCP read-only tiene sesgo por privileges. Si una consulta MCP fundamenta una conclusión de severidad alta, contrastarla por una segunda vía antes de reportarla".

## 9. Fix operativo P8 → migrations

**Fix operativo permanente** — la migration correctiva incluye un bloque `DO $$` al final que:
1. Declara un array `esperado` con las 10 (constraint_name, delete_rule).
2. Query el estado real de cada una.
3. Si alguna no matchea → `RAISE EXCEPTION` con mensaje detallado. Fuerza `ROLLBACK` de la transacción entera.
4. Solo si todas matchean → `RAISE NOTICE '✅ Verificación FKs OK'`.

**Toda migration futura que modifique constraints/indexes/columnas semánticamente-sensibles debe seguir este patrón**: terminar con un bloque de assertion diff-vs-esperado que RAISE EXCEPTION si diverge. Anotable en CLAUDE.md como corolario P8 si el PO lo aprueba.

