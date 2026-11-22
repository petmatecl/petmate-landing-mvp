# CATALOGO-CLEANUP-LITE — Bloque SQL listo para ejecutar

Written for: el PO (Aldo), para ejecutar manualmente en **Supabase Studio prod (`ouezpeeiwjwawauidrqq`) → SQL Editor**. Zero cambio de código. Zero acción del auditor en prod — solo preparación del SQL.

**Sprint**: CATALOGO-CLEANUP-LITE (ítem 1 de la cola Sprints Pre-Campañas, BACKLOG.md).
**Origen**: audit [`docs/auditorias/catalogo-actual-titulos-20261122.md`](../auditorias/catalogo-actual-titulos-20261122.md).
**Fecha prep**: 2026-11-23.
**Alcance**: 8 trailing spaces en títulos de `servicios_publicados` + 1 typo "PETTSITER" + 1 Unicode cursive en `nombre_publico` de `proveedores`.

---

## Objetivo

Normalizar títulos y nombres públicos antes de aterrizar tráfico pagado. Cada fix es independiente — el PO puede ejecutar en 3 partes separadas si prefiere auditar una por una, o todo junto en una transacción.

**Snapshot fuente** (confirmado vía MCP `supabase-prod-ro` 2026-11-23): 10 filas afectadas.

| # | Tipo | ID afectado | Valor actual | Valor nuevo |
|---|------|-------------|--------------|-------------|
| 1 | trailing space | `servicios_publicados.7134e58a-...ef8` | `"Cuidados Post operatorios, administración de fármacos, curaciones. "` | `"Cuidados Post operatorios, administración de fármacos, curaciones."` |
| 2 | trailing space | `servicios_publicados.f14d3f17-...296` | `"Hospedaje canino con cuidado personalizado "` | `"Hospedaje canino con cuidado personalizado"` |
| 3 | trailing space | `servicios_publicados.9aabc6cf-...a86` | `"Paseos y cariño para tu perrito 🐾 "` | `"Paseos y cariño para tu perrito 🐾"` |
| 4 | trailing space | `servicios_publicados.23a9496f-...d92` | `"Paseador de perros en providencia "` | `"Paseador de perros en providencia"` |
| 5 | trailing space | `servicios_publicados.6f6cb166-...d5c` | `"Hospedaje seguro por la noche "` | `"Hospedaje seguro por la noche"` |
| 6 | trailing space | `servicios_publicados.7dd4597e-...698` | `"Paseos personalizados "` | `"Paseos personalizados"` |
| 7 | trailing space | `servicios_publicados.146b0c97-...813` | `"Hospedaje cariñoso "` | `"Hospedaje cariñoso"` |
| 8 | trailing space | `servicios_publicados.b7fec8be-...df3` | `"Paseos de mascotas "` | `"Paseos de mascotas"` |
| 9 | typo PETTSITER | `servicios_publicados.2b9c68da-...2b2b` | `"SERVICIO DE PETTSITER"` | `"Servicio de petsitter"` |
| 10 | Unicode cursive | `proveedores.4ca16056-...44b` | `"𝐏𝐚𝐬𝐞í𝐭𝐨𝐬 𝐏𝐞𝐫𝐫𝐮𝐧𝐨𝐬.𝐜𝐥"` | `"Paseítos Perrunos.cl"` |

Observación operativa: la fila #3 conserva el emoji 🐾 porque el alcance de este sprint es **solo** trailing spaces + typo + Unicode cursive. La remoción de emojis en títulos entra en el sprint separado EMAILS-EMOJI-POLICY / otro ítem del BACKLOG (no en este). Lo mismo aplica al punto final de la fila #1: TRIM solo remueve espacios, conserva el punto.

---

## Patrón habitual: snapshot previo → UPDATE con RETURNING → verificación posterior → rollback escrito

Ejecutar los 4 bloques en orden en SQL Editor de Supabase Studio prod. Mantener la ventana abierta hasta verificar el bloque 3; si algo no calza, ejecutar el bloque 4 (rollback).

### Bloque 1 — Snapshot previo (SELECT, cero mutación)

Copiar el resultado a un .txt local o pegarlo al chat como evidencia P5 antes de ejecutar el bloque 2. Debe retornar **exactamente 10 filas**.

```sql
-- BLOQUE 1: Snapshot previo (SELECT)
SELECT 'servicios_publicados' AS tabla,
       sp.id::text AS id,
       sp.titulo AS valor_actual,
       LENGTH(sp.titulo) AS len_actual,
       sp.activo,
       sp.estado
  FROM public.servicios_publicados sp
 WHERE sp.id IN (
         '7134e58a-8067-468b-b1d9-633f7bbc6ef8',
         'f14d3f17-81bc-46c3-9ccf-4cb167bd9296',
         '9aabc6cf-76a5-4699-8dd9-6c66770afa86',
         '23a9496f-0726-44a3-84b1-faeb7f43ad92',
         '6f6cb166-7e73-4ff4-842a-7cd9b3f09e5c',
         '7dd4597e-fc6c-46c5-bb85-4cf769c29698',
         '146b0c97-695d-4b9a-89f5-c4f9e2730813',
         'b7fec8be-513a-4147-be8b-fcb43f558df3',
         '2b9c68da-9cbe-44f6-abf4-76be5a256b2b'
       )
UNION ALL
SELECT 'proveedores' AS tabla,
       p.id::text AS id,
       p.nombre_publico AS valor_actual,
       LENGTH(p.nombre_publico) AS len_actual,
       NULL AS activo,
       p.estado
  FROM public.proveedores p
 WHERE p.id = '4ca16056-90f8-4256-a9e4-da39e4f6f44b'
 ORDER BY tabla, id;
```

**Criterio de éxito bloque 1**: 10 filas devueltas, 9 de `servicios_publicados` + 1 de `proveedores`.

### Bloque 2 — UPDATE con RETURNING (transacción explícita)

```sql
-- BLOQUE 2: UPDATE en transacción con RETURNING para evidencia
BEGIN;

-- 2a. Trailing spaces en servicios_publicados (8 filas).
UPDATE public.servicios_publicados
   SET titulo = TRIM(titulo)
 WHERE id IN (
         '7134e58a-8067-468b-b1d9-633f7bbc6ef8',
         'f14d3f17-81bc-46c3-9ccf-4cb167bd9296',
         '9aabc6cf-76a5-4699-8dd9-6c66770afa86',
         '23a9496f-0726-44a3-84b1-faeb7f43ad92',
         '6f6cb166-7e73-4ff4-842a-7cd9b3f09e5c',
         '7dd4597e-fc6c-46c5-bb85-4cf769c29698',
         '146b0c97-695d-4b9a-89f5-c4f9e2730813',
         'b7fec8be-513a-4147-be8b-fcb43f558df3'
       )
   AND titulo LIKE '% '  -- guard defensivo: solo si realmente termina con espacio
 RETURNING id, titulo AS titulo_nuevo, LENGTH(titulo) AS len_nuevo;

-- 2b. Typo PETTSITER en servicios_publicados (1 fila).
UPDATE public.servicios_publicados
   SET titulo = 'Servicio de petsitter'
 WHERE id = '2b9c68da-9cbe-44f6-abf4-76be5a256b2b'
   AND titulo = 'SERVICIO DE PETTSITER'  -- guard defensivo: solo si matchea exacto
 RETURNING id, titulo AS titulo_nuevo;

-- 2c. Unicode cursive en proveedores.nombre_publico (1 fila).
UPDATE public.proveedores
   SET nombre_publico = 'Paseítos Perrunos.cl'
 WHERE id = '4ca16056-90f8-4256-a9e4-da39e4f6f44b'
   AND nombre_publico = '𝐏𝐚𝐬𝐞í𝐭𝐨𝐬 𝐏𝐞𝐫𝐫𝐮𝐧𝐨𝐬.𝐜𝐥'  -- guard defensivo: solo si matchea exacto
 RETURNING id, nombre_publico AS nombre_publico_nuevo;

-- NO hacer COMMIT todavía. Verificar los 3 RETURNING arriba antes del COMMIT.
-- Si algo no calza (filas afectadas distintas a 8 / 1 / 1), ejecutar el bloque 4 (rollback).
-- Si todo OK, ejecutar el COMMIT abajo.
COMMIT;
```

**Criterios de éxito bloque 2**:
- 2a RETURNING debe devolver **8 filas**, todas con `titulo_nuevo` sin espacio al final (`len_nuevo` igual a `len_actual - 1` de cada fila del snapshot).
- 2b RETURNING debe devolver **1 fila** con `titulo_nuevo = 'Servicio de petsitter'`.
- 2c RETURNING debe devolver **1 fila** con `nombre_publico_nuevo = 'Paseítos Perrunos.cl'`.
- Total afectado: **10 filas** (coincide con el snapshot del bloque 1).

Nota operativa Supabase Studio: el SQL Editor corre todo el bloque en una sola corrida; `BEGIN; ... COMMIT;` funciona end-to-end en un solo click Run. Si prefieres pausar entre los 3 UPDATEs, ejecutar 2a por separado, revisar, y recién después 2b + 2c.

### Bloque 3 — Verificación posterior (SELECT, control positivo conocido)

Mismo query que el bloque 1 pero post-mutación. Debe mostrar los 10 valores nuevos. Esto es el corolario P8 10ª aplicado: antes de dar por cerrado el sprint, verificar que el cambio sí ocurrió con un positivo conocido.

```sql
-- BLOQUE 3: Verificación posterior (SELECT post-mutación)
SELECT 'servicios_publicados' AS tabla,
       sp.id::text AS id,
       sp.titulo AS valor_final,
       LENGTH(sp.titulo) AS len_final,
       -- control positivo: TRUE si matchea el valor esperado post-fix
       CASE sp.id
         WHEN '7134e58a-8067-468b-b1d9-633f7bbc6ef8' THEN sp.titulo = 'Cuidados Post operatorios, administración de fármacos, curaciones.'
         WHEN 'f14d3f17-81bc-46c3-9ccf-4cb167bd9296' THEN sp.titulo = 'Hospedaje canino con cuidado personalizado'
         WHEN '9aabc6cf-76a5-4699-8dd9-6c66770afa86' THEN sp.titulo = 'Paseos y cariño para tu perrito 🐾'
         WHEN '23a9496f-0726-44a3-84b1-faeb7f43ad92' THEN sp.titulo = 'Paseador de perros en providencia'
         WHEN '6f6cb166-7e73-4ff4-842a-7cd9b3f09e5c' THEN sp.titulo = 'Hospedaje seguro por la noche'
         WHEN '7dd4597e-fc6c-46c5-bb85-4cf769c29698' THEN sp.titulo = 'Paseos personalizados'
         WHEN '146b0c97-695d-4b9a-89f5-c4f9e2730813' THEN sp.titulo = 'Hospedaje cariñoso'
         WHEN 'b7fec8be-513a-4147-be8b-fcb43f558df3' THEN sp.titulo = 'Paseos de mascotas'
         WHEN '2b9c68da-9cbe-44f6-abf4-76be5a256b2b' THEN sp.titulo = 'Servicio de petsitter'
       END AS fix_ok
  FROM public.servicios_publicados sp
 WHERE sp.id IN (
         '7134e58a-8067-468b-b1d9-633f7bbc6ef8',
         'f14d3f17-81bc-46c3-9ccf-4cb167bd9296',
         '9aabc6cf-76a5-4699-8dd9-6c66770afa86',
         '23a9496f-0726-44a3-84b1-faeb7f43ad92',
         '6f6cb166-7e73-4ff4-842a-7cd9b3f09e5c',
         '7dd4597e-fc6c-46c5-bb85-4cf769c29698',
         '146b0c97-695d-4b9a-89f5-c4f9e2730813',
         'b7fec8be-513a-4147-be8b-fcb43f558df3',
         '2b9c68da-9cbe-44f6-abf4-76be5a256b2b'
       )
UNION ALL
SELECT 'proveedores' AS tabla,
       p.id::text AS id,
       p.nombre_publico AS valor_final,
       LENGTH(p.nombre_publico) AS len_final,
       p.nombre_publico = 'Paseítos Perrunos.cl' AS fix_ok
  FROM public.proveedores p
 WHERE p.id = '4ca16056-90f8-4256-a9e4-da39e4f6f44b'
 ORDER BY tabla, id;
```

**Criterio de éxito bloque 3**: **10 filas con `fix_ok = true`**. Si alguna fila devuelve `fix_ok = false` o `null`, hay un cambio que no aterrizó correctamente — investigar antes de cerrar el sprint. Si los 10 están en `true` + `len_final` coincide con los valores nuevos esperados, el sprint queda cerrado.

### Bloque 4 — Rollback escrito (solo si bloque 2 o 3 detectan anomalía)

Si tras ejecutar el bloque 2 se detecta que algún UPDATE devolvió un número de filas distinto al esperado (ej. 2a devuelve 7 u 9 en vez de 8), **no ejecutar COMMIT**. En su lugar:

```sql
-- BLOQUE 4: Rollback (solo si bloque 2 todavía en transacción abierta)
ROLLBACK;
```

Si el bloque 2 ya se comiteó y el bloque 3 detecta anomalías, rollback manual por fila con los valores del snapshot:

```sql
-- BLOQUE 4-alt: Rollback manual post-COMMIT (revertir uno por uno)
BEGIN;

-- Revertir trailing spaces (re-agrega el espacio al final)
UPDATE public.servicios_publicados SET titulo = 'Cuidados Post operatorios, administración de fármacos, curaciones. ' WHERE id = '7134e58a-8067-468b-b1d9-633f7bbc6ef8';
UPDATE public.servicios_publicados SET titulo = 'Hospedaje canino con cuidado personalizado ' WHERE id = 'f14d3f17-81bc-46c3-9ccf-4cb167bd9296';
UPDATE public.servicios_publicados SET titulo = 'Paseos y cariño para tu perrito 🐾 ' WHERE id = '9aabc6cf-76a5-4699-8dd9-6c66770afa86';
UPDATE public.servicios_publicados SET titulo = 'Paseador de perros en providencia ' WHERE id = '23a9496f-0726-44a3-84b1-faeb7f43ad92';
UPDATE public.servicios_publicados SET titulo = 'Hospedaje seguro por la noche ' WHERE id = '6f6cb166-7e73-4ff4-842a-7cd9b3f09e5c';
UPDATE public.servicios_publicados SET titulo = 'Paseos personalizados ' WHERE id = '7dd4597e-fc6c-46c5-bb85-4cf769c29698';
UPDATE public.servicios_publicados SET titulo = 'Hospedaje cariñoso ' WHERE id = '146b0c97-695d-4b9a-89f5-c4f9e2730813';
UPDATE public.servicios_publicados SET titulo = 'Paseos de mascotas ' WHERE id = 'b7fec8be-513a-4147-be8b-fcb43f558df3';

-- Revertir typo
UPDATE public.servicios_publicados SET titulo = 'SERVICIO DE PETTSITER' WHERE id = '2b9c68da-9cbe-44f6-abf4-76be5a256b2b';

-- Revertir Unicode cursive
UPDATE public.proveedores SET nombre_publico = '𝐏𝐚𝐬𝐞í𝐭𝐨𝐬 𝐏𝐞𝐫𝐫𝐮𝐧𝐨𝐬.𝐜𝐥' WHERE id = '4ca16056-90f8-4256-a9e4-da39e4f6f44b';

COMMIT;
```

---

## Checklist operacional del PO

1. [ ] Abrir Supabase Studio prod (`ouezpeeiwjwawauidrqq`) → SQL Editor.
2. [ ] Ejecutar **Bloque 1** (snapshot). Confirmar 10 filas.
3. [ ] Copiar el resultado del bloque 1 a un archivo local o pegar al chat como evidencia P5.
4. [ ] Ejecutar **Bloque 2** (UPDATE en transacción). Verificar los 3 RETURNING: 8 / 1 / 1.
5. [ ] Si todo OK, confirmar que el COMMIT dentro del bloque 2 cerró la transacción.
6. [ ] Ejecutar **Bloque 3** (verificación posterior). Confirmar 10 filas con `fix_ok = true`.
7. [ ] Si bloque 3 verde → sprint cerrado. Avisar al auditor para marcar el ítem CATALOGO-CLEANUP-LITE como cerrado en BACKLOG con la fecha + SHA del commit que marcará el cierre.
8. [ ] Si bloque 2 o 3 detectan anomalía → ejecutar **Bloque 4** correspondiente (rollback en transacción o rollback manual post-COMMIT).

---

## Notas metodológicas

- **Permisos Supabase**: Studio por default corre como `postgres` (superuser), que tiene UPDATE sobre `public.servicios_publicados` y `public.proveedores`. No requiere `SET LOCAL role` porque no hay triggers `_guard_fn` sobre las columnas `titulo` ni `nombre_publico` (triggers `proveedores_guard_fn` protegen `estado`/`roles`/etc, no `nombre_publico`; verificado implícitamente porque el audit de FKs 2026-08-14 no reportó `nombre_publico` como protegida). Si al ejecutar el bloque 2 el UPDATE falla con `ERROR 42501`, avisar al auditor — habría que agregar `SET LOCAL role = 'service_role';` dentro de la transacción.

- **Impacto sobre el buscador**: el RPC `buscar_servicios` filtra por `estado='aprobado'` y mezcla el `titulo` en el ranking de texto. Los cambios son estrictamente de normalización (TRIM / typo / Unicode) y no afectan la semántica del match. Cero invalidación de caché, cero efecto sobre resultados ya ranked. Los crawlers de buscadores verán el título normalizado en el próximo scrape.

- **Afectación al proveedor Paseítos Perrunos.cl**: el cambio de `nombre_publico` de Unicode cursive a texto estándar es un cambio visible en todas las fichas, cards y perfiles donde aparece el proveedor. No es un cambio semántico (el nombre es el mismo en substancia), pero el PO puede querer **notificar al proveedor por chat/WhatsApp** antes o inmediatamente después del fix. Mensaje sugerido:

  > Hola Paseítos Perrunos, un ajuste chico en tu nombre público: cambiamos el estilo de letra cursiva matemática (𝐏𝐚𝐬𝐞í𝐭𝐨𝐬) por el tipo de letra estándar (Paseítos). El motivo es que los buscadores como Google no indexan bien los caracteres matemáticos y los lectores de pantalla tampoco los reconocen bien, entonces era una barrera de accesibilidad y SEO. El contenido es el mismo, solo cambia el tipo de letra. Avísanos cualquier duda.

- **Sprint cerrado**: cuando el bloque 3 devuelve 10 filas con `fix_ok=true`, el auditor marca el ítem CATALOGO-CLEANUP-LITE como `[cerrado 2026-11-XX]` en `BACKLOG.md > Sprints Pre-Campañas` + agrega la fecha y evidencia en una línea.

---

**Generado por el auditor 2026-11-23**. SQL no ejecutado — queda a espera del PO.
