# Descubrimiento técnico — DEL-CUENTA-LEY (Ley 21.719)

**Fecha**: 2026-09-17
**Sprint**: bloque-h H-3
**Modo**: solo lectura (MCP `supabase-prod-ro` + grep de código, cero mutación)
**Insumo para**: sesión de 30 minutos con el PO
**Trigger legal**: Ley 21.719 de Protección de Datos Personales — vigencia diciembre 2026, incorpora derecho de supresión (art. 8).

---

## 1. Contexto y decisión de diseño

**Regla clave** (heredada de BACKLOG L1172-1177 anotada 2026-08-14): NO cambiar los `RESTRICT` de `agendamientos.tutor_id` y `agendamientos.proveedor_id` a `CASCADE`. Un borrado en cadena destruiría el historial del proveedor (facturación externa, evidencia de servicios prestados) y el propio historial del tutor sobre servicios pasados. La ruta correcta es **borrar la PII y preservar el registro de negocio anonimizado**.

**Dos primitivas de borrado**:
- **BORRAR** (delete row completo): apropiado cuando el registro es 100% del user + cero valor de negocio downstream (favoritos, notificaciones, sesiones).
- **ANONIMIZAR in-place** (mantener row, remover PII): apropiado cuando el row tiene contraparte de negocio que otros necesitan preservar (reservas, reviews públicas, contactos, contratos).

**Cero servicios externos** — todo el flow opera contra Supabase + Storage con el service_role_key desde el endpoint API.

---

## 2. Mapa de datos por tabla (evidencia empírica prod, 2026-09-17)

FKs verificadas contra `pg_constraint` (catálogo de sistema, sin sesgo por rol MCP). Ver anexo A al final para el SQL exacto.

### 2.1 Perfil primario del user

| Tabla | Columna FK | Target | on_delete actual | PII | Veredicto propuesto |
|---|---|---|---|---|---|
| `usuarios_buscadores` | `auth_user_id` | `auth.users.id` | CASCADE | `nombre`, `email`, `rut`, `codigo_referido` | **ANONIMIZAR** — preservar row para que `agendamientos.tutor_id` (RESTRICT) siga apuntando |
| `proveedores` | `auth_user_id` | `auth.users.id` | CASCADE | `nombre`, `apellido_p`, `apellido_m`, `rut`, `rut_empresa`, `fecha_nacimiento`, `email_publico`, `telefono`, `whatsapp`, `bio`, `foto_perfil`, `foto_carnet`, `foto_carnet_dorso`, `galeria[]`, `direccion_referencia`, `lat`, `lng`, `sitio_web`, `instagram`, `facebook`, `tiktok`, `youtube`, `codigo_referido` | **ANONIMIZAR** — preservar row para que `agendamientos.proveedor_id` (RESTRICT) siga apuntando + preservar historial de ratings, planes, evaluaciones |

**Nota crítica**: al borrar `auth.users`, ambos perfiles se destruyen por CASCADE. Consecuencia: NO podemos borrar `auth.users` en el flow — hay que dejar la fila con email nulo/dummy o marcada `estado='eliminado'`. El flow práctico es: (1) anonimizar `usuarios_buscadores`/`proveedores`, (2) invalidar sesiones de `auth.users` (`ban_duration=99999h` o similar), (3) opcionalmente rotar el email a `deleted-<uuid>@deleted.pawnecta.local`.

### 2.2 Datos personales secundarios del user

| Tabla | Columna FK | Target | on_delete | PII | Veredicto |
|---|---|---|---|---|---|
| `direcciones` | `user_id` | `auth.users` | NO ACTION | `nombre`, `direccion_completa`, `calle`, `numero`, `depto`, `comuna`, `region`, `latitud`, `longitud`, `notas` | **BORRAR** — datos 100% del user, cero valor de negocio para terceros |
| `mascotas` | `user_id` | `auth.users` | NO ACTION | `nombre`, `descripcion`, `chip_id`, `enfermedades`, `trato_especial_desc`, `foto_mascota`, `fotos_galeria[]` | **ANONIMIZAR** si `agendamientos.mascota_id` apunta (reservas históricas) · **BORRAR** en caso contrario |
| `favoritos` | `user_id` | `auth.users` | CASCADE | (referencia `entidad_id`, sin PII propio) | **BORRAR** — CASCADE ya lo hace correcto |
| `feedback_submissions` | `user_id` | `auth.users` | SET NULL | `mensaje`, `pagina_url`, `viewport`, `user_agent` | **SET NULL preservando** — feedback es insumo de mejora del producto, sin PII directo del user una vez el user_id sale |
| `consent_logs` | `user_id` | `auth.users` | NO ACTION | `document_version`, `ip_address`, `user_agent` | **DECISIÓN PO** — la IP + UA es PII; el compliance de otros compliance puede requerir preservarlo. Ver pregunta 5 abajo |
| `eventos_tracking` | `user_id` | `auth.users` | NO ACTION | `metadata` (JSON), `tipo`, `servicio_id` | **SET NULL** preservando row para métricas agregadas |
| `reportes` | `reporter_id` | `auth.users` | NO ACTION | `motivo`, `detalle`, `referencia_id` | **SET NULL** — reporte queda anónimo (útil para moderación histórica), cero PII del reporter una vez el `reporter_id` sale |
| `referidos` | `referrer_auth_id`, `referred_auth_id` | `auth.users` | NO ACTION | `codigo`, `estado` | **SET NULL** — cadena de referidos queda huérfana pero preserva estadísticas |

### 2.3 Interacción tutor ↔ proveedor (historial de negocio)

| Tabla | Columna FK | Target | on_delete | PII | Veredicto |
|---|---|---|---|---|---|
| `agendamientos` | `tutor_id` | `usuarios_buscadores` | **RESTRICT** | `mensaje`, `nota_proveedor`, `direccion_servicio`, `calle`, `numero`, `direccion_info`, `tutor_nombre` (snapshot), `tipo_mascota_texto` | **ANONIMIZAR PII, PRESERVAR ROW** — proveedor necesita ver historial completo; tutor_nombre snapshot puede vaciarse o reemplazar por "Cliente eliminado" |
| `agendamientos` | `proveedor_id` | `proveedores` | **RESTRICT** | idem arriba | idem — preservar historial del tutor sobre reservas pasadas |
| `contactos` | `auth_user_id` (no FK confirmada) + `proveedor_id` | `proveedores` (CASCADE) | Contactos: canal, timestamp | **SET NULL en auth_user_id** — preserva métrica de "contactos por servicio" del proveedor |
| `evaluaciones` | `usuario_id` | `auth.users` | CASCADE | `comentario`, `respuesta_proveedor`, `fotos[]`, `nombre_autor` | **DECISIÓN PO** — el review es público y forma parte del perfil del proveedor. Ver preguntas 3 y 4 |
| `evaluaciones` | `proveedor_id` | `proveedores` | CASCADE | idem | Si el proveedor se elimina, sus reviews se borran (CASCADE actual). Ver pregunta 4 |
| `reviews` (legacy) | `cliente_id` | `auth.users` | SET NULL | `comentario` | **SET NULL preserving** — tabla legacy, comentario queda anónimo |
| `reviews` (legacy) | `sitter_id` | (no FK explícita) | — | idem | Verificar |
| `conversations` | `client_id`, `sitter_id` | `auth.users` | CASCADE | (metadata sin PII directa) | Al CASCADE se lleva mensajes por FK sender_id | **DECISIÓN PO** — chat es historial de contacto de ambas partes. Ver pregunta 6 |
| `messages` | `sender_id` | `auth.users` | CASCADE | `content` (texto libre del user) | Idem |
| `notifications` | `user_id` | `auth.users` | CASCADE | `message`, `metadata` (JSON) | **BORRAR** — CASCADE correcto, notificaciones son efímeras del user |

### 2.4 Perfil proveedor — sub-datos

| Tabla | Columna FK | Target | on_delete | PII | Veredicto (cuando se elimina proveedor) |
|---|---|---|---|---|---|
| `certificaciones` | `proveedor_id` | `proveedores` | CASCADE | `titulo`, `institucion`, `documento_url` | Con anonimización in-place del proveedor → **preservar row + anonimizar titulo/institucion** (si es PII sensitive), o borrar row (más simple, defendible) |
| `servicios_publicados` | `proveedor_id` | `proveedores` | CASCADE | `titulo`, `descripcion`, `fotos[]` | **DECISIÓN PO** — servicios son de negocio, no PII estricta. Marcar `activo=false` preserva ratings + historial. Ver pregunta 4 |
| `planes_visibilidad` | `proveedor_id` | `proveedores` | CASCADE | `monto_clp` (transaccional) | **PRESERVAR row** con proveedor anonimizado — evidencia de facturación |
| `preguntas` | `proveedor_id` | `proveedores` | CASCADE | `pregunta`, `respuesta` | **PRESERVAR row** — Q&A público es parte del catálogo del servicio |
| `preguntas` | `auth_user_id` (¿FK?) | — | — | (autor de la pregunta) | Anonimizar autor si se elimina el user que preguntó |
| `contactos` | `proveedor_id` | `proveedores` | CASCADE | canal, timestamp | Al eliminar proveedor: CASCADE borra métricas del proveedor — aceptable |
| `evaluaciones` | `proveedor_id` | `proveedores` | CASCADE | comentario | Ver pregunta 4 (borrar reviews vs anonimizar proveedor) |
| `usuarios_buscadores.proveedor_id` | `proveedor_id` | `proveedores` | SET NULL | (referencia) | Correcto — tutor pierde link a "mi proveedor referido" sin perder su cuenta |

### 2.5 Storage (fotos)

Los siguientes campos apuntan a URLs de Supabase Storage (bucket `avatars` o `documents`):

- `proveedores.foto_perfil`, `foto_carnet`, `foto_carnet_dorso`, `galeria[]`
- `mascotas.foto_mascota`, `fotos_galeria[]`
- `servicios_publicados.fotos[]`
- `evaluaciones.fotos[]`
- `certificaciones.documento_url`

**Regla operativa**: al anonimizar un row, se DEBE también borrar el binario en Storage (API `storage.remove([paths])`, mismo patrón que `scripts/cleanup-avatars-orphans.ts` del bloque F). Sin el borrado del binario, la PII visual sigue accesible por URL directa.

---

## 3. Propuesta arquitectónica (recomendada)

**Un solo endpoint**, `POST /api/user/eliminar-cuenta`, protegido por `verifySession` (el user debe estar autenticado):

1. **Autz**: `verifySession(req)` → `userId`. El endpoint solo permite auto-eliminar (nunca eliminar a otro).
2. **Confirmación email** (opción PO): enviar email con link único de confirmación con TTL 24h. El link cae en `/eliminar-cuenta-confirmada?token=...` que redirige al mismo endpoint con `?confirmed=1`.
3. **Ventana de gracia** (opción PO): marcar `auth.users.raw_user_meta_data.deletion_requested_at = now()` y correr un cron diario que ejecuta el borrado real 30 días después. En la ventana, el user puede loguear normal y "cancelar eliminación".
4. **Ejecución real** (dentro de una transacción):
   - Anonimizar `usuarios_buscadores` (si aplica): `nombre='(usuario eliminado)'`, `email=NULL`, `rut=NULL`, `codigo_referido=NULL`.
   - Anonimizar `proveedores` (si aplica): mismo patrón sobre todas las columnas PII listadas en 2.1. Marcar `estado='eliminado'` (valor nuevo) — RPC `buscar_servicios` lo filtra.
   - Anonimizar snapshots en `agendamientos`: `mensaje=NULL`, `nota_proveedor=NULL`, `tutor_nombre='(cliente eliminado)'`, `direccion_servicio=NULL`, `calle=NULL`, `numero=NULL`, `direccion_info=NULL` (solo cuando el user eliminado es el "otro lado" del par).
   - Borrar rows sin valor: `direcciones`, `favoritos`, `notifications`, `messages` (o CASCADE que ya lo hace), `mascotas` (si no tienen `agendamientos.mascota_id` apuntando).
   - Anonimizar `evaluaciones.nombre_autor` según decisión PO (pregunta 3).
   - Borrar binarios Storage referenciados en las columnas PII eliminadas.
   - Invalidar sesión de `auth.users`: `admin.updateUserById(id, { ban_duration: '87600h' /* 10 años */ })` — el user queda sin poder loguear pero el row de auth queda para que las FKs no exploten.
   - **NO tocar** `agendamientos` fila completa, `evaluaciones` fila completa (más allá de anonimizar autor), `certificaciones`, `planes_visibilidad`, `servicios_publicados` (más que marcar `activo=false`) — todos preservan historial de negocio del "otro lado".
5. **Log**: insertar row en `deletion_log` (tabla nueva) con `deleted_user_id`, `deleted_at`, `deleted_by` (self o admin), `data_summary` (JSON con contadores). Para compliance interno.
6. **Email confirmación post-borrado**: notificar al email original (via Resend, single-shot).

---

## 4. Estimación por componente

| Componente | Alcance | Estimación |
|---|---|---|
| **Migration SQL** | (a) crear tabla `deletion_log`; (b) agregar valor `'eliminado'` al enum `proveedores.estado` (si es enum) o al CHECK constraint; (c) actualizar RPC `buscar_servicios` para filtrar `estado != 'eliminado'`; (d) nueva FK constraint que valida `auth_user_id` puede estar en `banned` state | **~2h** |
| **Endpoint `POST /api/user/eliminar-cuenta`** | verifySession + confirmación email + transacción de anonimización + Storage cleanup + audit log + email post-borrado. Con wrapApiHandlerWithSentry (patrón bloque G). | **~4-6h** |
| **Cron ventana de gracia** (si PO elige 30 días) | `pages/api/cron/procesar-eliminaciones-pendientes.ts` que corre diario, busca users con `deletion_requested_at < now() - 30 days` y ejecuta el borrado real. | **~2h** |
| **UI /usuario "Eliminar cuenta"** | Componente en `/usuario` con warning modal explicando: qué se borra, qué se anonimiza, período de gracia, cancelación posible. 2 pasos + confirmación por checkbox. | **~3-4h** |
| **UI /proveedor "Eliminar cuenta"** | Idem `/usuario` pero con warnings específicos del proveedor: se anonimiza el perfil, se marca inactivo en catálogo, los reviews quedan anónimos, los agendamientos históricos preservan datos. | **~2-3h** |
| **Templates email** | `AccountDeletionRequestedEmail` (24h confirmación) + `AccountDeletionCompletedEmail` (post-borrado). Con render-diff no-regresión. | **~2h** |
| **Tests unitarios** | Handler del endpoint + cron procesamiento diferido, mismo patrón que `lib/g1-*.test.ts`. | **~2h** |
| **Tests e2e** | Flow completo tutor + flow proveedor + cancelación en ventana de gracia. | **~3h** |
| **Testing legal / revisión asesor** | Revisar copy legal + confirmación con asesor legal externo antes de habilitar en prod. | **fuera de este scope técnico** |
| **Total técnico** | | **~20-24h** = **3 días laborales completos** |

Estimación gruesa del BACKLOG L1176 decía "~1 semana". Con el detalle técnico actual **el rango es 3-4 días de trabajo dedicado**, sin contar la revisión legal externa.

---

## 5. Preguntas concretas para vos (con mi recomendación por defecto)

**Regla del insumo**: 30 min con vos, 10 preguntas.

### Pregunta 1 — Alcance del borrado
¿Borrado TOTAL (delete `auth.users` + CASCADE en todo) o **anonimización preservando registros de negocio** (row de perfil vacía, `agendamientos` intactas con snapshots vacíos, `evaluaciones` con autor anónimo)?

**Mi recomendación**: **anonimización**. El delete total destruye historial del proveedor (evidencia de facturación, reviews recibidos) y del tutor (historial de servicios contratados) — no defendible legalmente en Chile como "borrado del interesado" cuando el interesado es solo uno de dos partes del contrato. La ley 21.719 art. 8 permite el rechazo cuando "el tratamiento es necesario para el ejercicio de derechos o el cumplimiento de obligaciones", y las obligaciones contractuales caen ahí.

### Pregunta 2 — Ventana de gracia
¿Instant delete al click + email post-facto, o **confirmación por email (24h) + ventana de gracia de 30 días con opción de cancelar**?

**Mi recomendación**: **confirmación 24h + gracia 30 días**. El costo es un cron nuevo + un flag en `auth.users.raw_user_meta_data`. El beneficio es (a) evitar accidentes / phishing / borrados en caliente, (b) alineación con GDPR-style que otras juridicciones esperan, (c) buffer para que el asesor legal / soporte reciba consultas. El único costo es que el user espera 30 días para que la eliminación sea total — aceptable, la ley no exige "instant".

### Pregunta 3 — Reviews públicas
Las `evaluaciones` que el tutor dejó a servicios son públicas en el perfil del proveedor. ¿**Anonimizar autor** ("Usuario eliminado", conservar comentario público + rating para historial del proveedor) o **borrar review completa**?

**Mi recomendación**: **anonimizar autor**. El rating y comentario forma parte del historial del proveedor (bien de negocio del otro lado del contrato). Anonimización a `nombre_autor='(Usuario eliminado)'` + `usuario_id=NULL` preserva la review pública sin PII del reviewer. Es el patrón estándar de plataformas similares (TripAdvisor, Google, Airbnb).

### Pregunta 4 — Cuenta doble (tutor + proveedor)
Un `auth.users` puede tener rol de proveedor + rol de tutor simultaneamente (el `auth_user_id` de `usuarios_buscadores` puede coincidir con el de `proveedores`, aunque hoy no lo hemos usado activamente). Al pedir eliminación, ¿**se elimina TODO (ambos perfiles)** o el user puede elegir cuál rol borrar?

**Mi recomendación**: **eliminar TODO en un solo paso**. La complejidad UI de "borrar solo tu cuenta de proveedor pero mantener tutor" es alta y probablemente no representa el caso real (el user con doble rol es rarísimo). Mejor un flow simple: elimina la cuenta = elimina toda tu presencia.

### Pregunta 5 — Consent logs (compliance interno)
`consent_logs` guarda IP + UA + document_version + timestamp para evidencia de aceptación de términos. La IP + UA es PII. ¿**Borrar todo el log** al eliminar user (más "puro" ley 21.719) o **preservar el log** (más "puro" compliance interno)?

**Mi recomendación**: **borrar** (`WHERE user_id = <deleted>`). El compliance interno se resuelve manteniendo el log agregado (cuántos users aceptaron v1 vs v2, sin identidad). Si la ley 21.719 se aplica al pie de la letra, cualquier PII debe irse. Consultar con asesor legal si hay obligación específica de retención (no la hay en Chile por defecto para plataformas B2C).

### Pregunta 6 — Chat interno (conversations + messages)
Las conversaciones tienen 2 partes (tutor + proveedor). ¿**Borrar TODO el chat** al eliminar una parte (CASCADE actual) o **preservar chat** con el sender anonimizado?

**Mi recomendación**: **borrar TODO el chat** (mantener CASCADE actual). El chat es efímero, sin valor de negocio downstream una vez cerrada la reserva. Preservarlo con sender anónimo genera confusión ("¿quién es este mensaje sin nombre?") sin beneficio real. La contraparte que sigue activa pierde la vista del hilo — trade-off aceptable dado que el hilo cerrado ya no está activo.

### Pregunta 7 — Fotos en Storage (proveedor eliminado)
Al anonimizar un proveedor, sus fotos (`foto_perfil`, `galeria[]`, `foto_carnet`, `foto_carnet_dorso`) siguen en el bucket. ¿**Borrar todos los binarios Storage** o solo quitar las URLs de las columnas y dejar orphans (que después el script `cleanup-avatars-orphans.ts` limpia)?

**Mi recomendación**: **borrar los binarios en la misma transacción del endpoint**. Los orphans quedan visibles hasta el próximo cleanup manual, que corre irregularmente. Con `supabase.storage.from('avatars').remove([paths])` en el endpoint, el borrado es inmediato + auditable en el mismo log. Costo: +50ms al endpoint (aceptable, no es hot path).

### Pregunta 8 — Auditoría del borrado
¿Crear tabla `deletion_log` con `{deleted_user_id, deleted_at, deleted_by, data_summary}` para trazabilidad interna?

**Mi recomendación**: **sí, tabla nueva `deletion_log`**. Cero PII del user borrado más allá del `user_id` (que ya no matchea nada por CASCADE), pero es evidencia interna del cumplimiento del pedido de eliminación en caso de auditoría legal o disputa. Retención propia del log: sin límite (el registro está anonimizado por definición).

### Pregunta 9 — Copy legal del flow
¿**Escribimos el copy nosotros** basado en templates GDPR/CCPA de proyectos similares, o **contratamos revisión de asesor legal** antes de habilitar en prod?

**Mi recomendación**: **redactar borrador propio + revisión asesor legal antes de prod**. El auditor puede pre-redactar copy en español chileno basado en patrones estándar (Google, Airbnb, MercadoLibre localizadas). El asesor legal revisa 30 min a 1h. Costo ~$100-300 USD, evita riesgo de copy legalmente insuficiente en la vigencia de la ley (dic 2026).

### Pregunta 10 — Timing del sprint
Este descubrimiento no exige implementación inmediata. La ley entra vigente **diciembre 2026** (~3 meses desde hoy 2026-09-17). ¿**Arrancar el sprint ahora** (ventana holgada, sin presión) o **esperar hasta noviembre** (más cerca del deadline, otras prioridades pueden aparecer)?

**Mi recomendación**: **arrancar ahora**. 3 meses parecen holgados pero el testing legal + posible refinamiento tras primer user real solicitando puede consumir 1-2 meses de la ventana. Además hay un beneficio propio: el sprint pone al descubierto potenciales bugs de FKs / CASCADE mal configurados (mismo patrón que `bug1-fks` reveló ausencia de constraints). Costo del sprint temprano: ~3-4 días de trabajo. Beneficio: cero riesgo de scramble en noviembre + código battle-tested por 2 meses de soak antes de la vigencia legal.

---

## 6. Anexo A — SQL de verificación (queries idempotentes read-only)

Ejecutable en MCP `supabase-prod-ro` o Supabase Studio para reproducir el análisis:

```sql
-- Query 1: FKs a usuarios_buscadores y proveedores
SELECT c.conname, n.nspname || '.' || t.relname AS source_table, a.attname AS source_column,
  fn.nspname || '.' || ft.relname AS target_table,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT'
  END AS on_delete
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_class ft ON ft.oid = c.confrelid
JOIN pg_namespace fn ON fn.oid = ft.relnamespace
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f' AND fn.nspname = 'public'
  AND ft.relname IN ('usuarios_buscadores', 'proveedores')
ORDER BY target_table, source_table;

-- Query 2: FKs a auth.users
SELECT c.conname, n.nspname || '.' || t.relname AS source_table, a.attname AS source_column,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT'
  END AS on_delete
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_class ft ON ft.oid = c.confrelid
JOIN pg_namespace fn ON fn.oid = ft.relnamespace
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f' AND fn.nspname = 'auth' AND ft.relname = 'users' AND n.nspname = 'public';

-- Query 3: contar filas con user_id / auth_user_id / usuario_id no-FK explícitas
-- (buscar columnas que apunten al user sin FK constraint declarada)
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND column_name IN ('user_id', 'auth_user_id', 'usuario_id', 'sender_id', 'client_id', 'sitter_id', 'reporter_id', 'referrer_auth_id', 'referred_auth_id', 'proveedor_auth_id', 'cliente_id')
ORDER BY table_name;
```

---

## 7. Anexo B — Sin FK explícita (verificar manualmente)

Las siguientes columnas apuntan a users pero no aparecen en las queries de FK — posiblemente sin constraint declarado, o FK a una tabla no incluida en la query:

- `contactos.auth_user_id` — verificado grep en el código: se usa como identidad del user contactante. Sin FK explícita → **agregar FK con SET NULL** en migration.
- `preguntas.auth_user_id` — idem. Autor de la pregunta.

**Deuda técnica**: agregar FKs faltantes en la misma migration del sprint DEL-CUENTA-LEY. Costo ~30 min. Beneficio: SET NULL automático cuando se elimina el user (menos código en el endpoint).

---

## 8. Puntos abiertos post-sesión

- Confirmar con asesor legal si la ley 21.719 permite el patrón "anonimización preservando registros contractuales" (mi recomendación 1) — precedente típico GDPR art. 17.3 sí lo permite ("cumplimiento de obligación legal", "ejercicio de derechos"). Chile normalmente sigue el precedente europeo pero conviene confirmar.
- Confirmar retención requerida para `consent_logs` bajo compliance chileno específico (mi recomendación 5).
- Confirmar si el "responsable de tratamiento" tiene que responder por escrito al pedido de eliminación (la ley dice 30 días para responder — nuestro flow envía confirmación email inmediata + resultado post-borrado, cubierto).

---

**Fin del descubrimiento**. Listo para la sesión de 30 min.

---

## 9. Decisiones del PO (sesión producto 2026-09-23)

Resultado de la sesión de 30 min con el PO sobre las 10 preguntas + 2 reglas nuevas que el descubrimiento no anticipó.

### Respuestas a las 10 preguntas

1. **Alcance**: **anonimización preservando registros de negocio**. Fundamento legal pendiente confirmación asesor (ver `docs/producto/del-cuenta-preguntas-asesor.md`).
2. **Ventana de gracia**: **confirmación por correo con enlace de 24 h**, luego **ventana de gracia de 14 días** (no 30) con cancelación posible desde la cuenta. Cron diario ejecuta el borrado real al vencer los 14 días. **Durante la ventana el proveedor NO aparece en el catálogo** (el `estado` cambia a `'eliminado_pendiente'` desde el momento del click, antes del borrado real).
3. **Reviews**: **anonimizar autor** (`nombre_autor = '(Usuario eliminado)'`, `usuario_id = NULL`), **conservar rating y comentario** como historial público del proveedor.
4. **Cuenta doble**: **se elimina todo en un solo flujo** — un `auth.users` con perfil de tutor + proveedor elimina ambos en la misma request.
5. **Consent logs**: **NO borrar la fila**. Conservar `document_version`, `timestamp` y `user_id` (UUID que ya no resuelve a persona por el anonimizado del perfil); **poner en NULL `ip_address` y `user_agent`**. Plazo de retención específico queda para el asesor legal.
6. **Chat**: **NO borrar en el acto**. Conservar `conversations` y `messages` con `sender` anonimizado (nombre `'(Usuario eliminado)'`) durante **6 meses desde la última reserva entre las dos partes**; cron diario los borra después. **Requiere cambiar el CASCADE actual de `conversations.client_id/sitter_id` y `messages.sender_id` a SET NULL o equivalente** — cambio incluido en la migración del sprint.
7. **Fotos Storage**: **borrar binarios en la misma transacción del endpoint** (no diferir a orphan-cleanup).
8. **Auditoría**: **sí, tabla nueva `deletion_log`** con contadores por tabla en `data_summary` (JSON), cero PII.
9. **Copy legal**: **borrador propio en español chileno tuteo**, revisión de asesor antes de habilitar en prod. Copy en `docs/producto/del-cuenta-copy.md` para que el PO lo lleve al asesor.
10. **Timing**: **Tramo 2 (viaje del PO)**, después de `cue-1-fix`. PR abierto sin merge hasta el regreso del PO (2026-10-28).

### Reglas nuevas que el descubrimiento no anticipó

**Regla A — Bloqueo por reservas activas**: no se puede solicitar la eliminación si el user tiene reservas activas (como tutor O como proveedor). La UI lo explica y enlaza a `/mis-reservas` para cancelar o esperar a que se complete. Estados que cuentan como activos:

| Rol | Estado | Alcance |
|---|---|---|
| tutor | `pendiente` | Reservas que aún no fueron aprobadas por el proveedor |
| tutor | `confirmada` | Reservas confirmadas con `fecha_preferida` o `fecha_fin` futura respecto a `now()` |
| proveedor | `pendiente` | Reservas pendientes de responder |
| proveedor | `confirmada` | Reservas confirmadas con fecha futura |

Estados que **NO** bloquean:
- `cancelada`, `cancelada_proveedor`, `rechazada` — terminales.
- `confirmada` con fecha pasada (`REALIZADA` / `VENCIDA` derivados en render-time) — historial de negocio, no requiere acción.

**Regla B — CARNET-RETENCION** (ítem separado y ANTES de DEL-CUENTA-LEY en Tramo 2): `proveedores.foto_carnet` y `proveedores.foto_carnet_dorso` se **borran de Storage y se ponen en NULL** en dos casos:
- **Al aprobar al proveedor** (transición `verificacion_estado` → `'aprobado'` en `components/Admin/ProveedorApprovalList.tsx:197-198`): el carnet cumplió su función, borrar inmediato.
- **A los 30 días de la solicitud** si queda `'rechazado'` o abandonada (no revisada, sin acción del admin en 30 días).

Motivo: minimización de datos. El carnet es el dato **más sensible** que guardamos (RUT + foto de identidad) y solo sirve para verificar identidad una vez. Sprint dedicado incluye limpieza única de las que hoy existen en prod:
- SQL de verificación previa (contar cuántos proveedores con `verificacion_estado='aprobado'` tienen `foto_carnet` / `foto_carnet_dorso` populado).
- Bloque de limpieza con `RETURNING` para evidencia.
- Verificación posterior (conteo 0).
- **Lista de paths Storage a borrar** — extraída de las URLs guardadas en BD, pasada al helper Storage con `.remove()`.

**FKs faltantes del anexo B** entran en la misma migración del sprint DEL-CUENTA-LEY: `contactos.auth_user_id` y `preguntas.auth_user_id` con `ON DELETE SET NULL`.

Ver kickoff detallado en [`docs/sprints/del-cuenta-ley.md`](../sprints/del-cuenta-ley.md).
