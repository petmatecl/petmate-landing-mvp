# Sprint chat-open-error · 2026-09-24

**Rama**: `chat-open-error` (desde `main @ 6774fbd`).
**Motivación**: bug reportado por PO 2026-09-24 durante QA post-deploy #88 — el 1er clic de "Enviar Mensaje" en una ficha de servicio falla con toast "Hubo un error al intentar abrir el chat", el 2do clic abre `/mensajes?id=...` con la conversación **ya creada**. Cero evento Sentry por catch sin `captureException` (invisibilidad estructural que este PR cierra + sprint SENTRY-TOAST resuelve sistémicamente).
**Clasificación PO**: **BLOQUEA** — "Enviar mensaje" es el camino de conversión principal y falla al primer clic.
**Target de merge**: antes del viaje (Tramo 1). Fix funcional depende del paso 1.

## 1. Diagnóstico 4 pasos aprobado por PO 2026-09-24

Orden: (1) Playwright reproducción + captura Postgrest → (2) RLS policies → (3) triggers post-insert → (4) path del 2do clic.

### Paso 2 · RLS policies `conversations` (prod, `supabase-prod-ro` 2026-09-24)

| cmd | policyname | qual (USING) | with_check |
|---|---|---|---|
| INSERT | Users can create conversations | — | `((auth.uid() = client_id) OR (auth.uid() = sitter_id))` |
| SELECT | Users can view their own conversations | `((auth.uid() = client_id) OR (auth.uid() = sitter_id))` | — |
| UPDATE | Participants can update their conversations | mismo | mismo |

**Simétricas**. Tutor inserta con `client_id = auth.uid()` → INSERT check pasa. `.select().single()` post-INSERT usa mismo predicado → debería devolver la fila.

### Paso 3 · Triggers post-insert `conversations` (prod, `pg_trigger` con `tgisinternal=false`)

**Resultado: `[]`**. CERO trigger user-defined en `public.conversations`. Descartada la hipótesis "trigger post-INSERT corrompe la operación".

### Paso 4 · Path del 2do clic

[components/Servicio/ServiceDetailView.tsx:323-347](../../components/Servicio/ServiceDetailView.tsx#L323-L347) — `.maybeSingle()` sobre `(client_id, sitter_id, servicio_id)` ANTES del INSERT. Si la 1ª corrida creó la fila (aunque el catch se disparó por algún fallo post-INSERT), la 2ª la encuentra acá y navega directo sin volver a insertar.

### Paso 1 · Playwright reproducción · pendiente en este PR

Spec [e2e/specs/chat-open-error/paso-1-repro.spec.ts](../../e2e/specs/chat-open-error/paso-1-repro.spec.ts) reproduce el escenario y captura evidencia estructurada:

- **Fixture**: cleanup previo de la conversación (Camila, Aldo, servicio "Paseos dinamicos" `385063f9-...`) via `getSupabaseAdmin()` (service_role gated a staging). `afterAll` limpia también.
- **Captura request**: `page.on('request')` filtrado por `/rest/v1/conversations*` → method, URL, `postData`, headers `Prefer` y `Range`.
- **Captura response**: `page.on('response')` filtrado igual → status, URL, body (primeros 1500 chars), `Content-Range`, `Preference-Applied`.
- **Captura console.error** — el `console.error('Error starting conversation:', ...)` del catch de L435 (pre-fix) o L446+ (post-fix con `captureException`).
- **Estado BD post-clic**: `SELECT id, created_at FROM conversations WHERE client_id=Camila AND sitter_id=Aldo AND servicio_id=X` — verifica si la fila persistió pese al toast.
- **Assertions**: `expect.soft` — spec SIEMPRE pasa, solo captura evidencia. Cuando el fix funcional aterrice en commit posterior a este PR, un spec `regresion.spec.ts` con hard-asserts verificará "1er clic siempre navega, cero toast de error".

**Reproducción paralela del PO**: el PO reproduce el mismo clic en prod con la consola del navegador abierta y comparte el objeto exacto que `console.error` recibió. La combinación de ambos (spec en staging + console de prod) confirma la hipótesis viva de causa raíz.

## 2. Hipótesis viva antes del paso 1

Con los datos de pasos 2-4:
- RLS OK, cero triggers, path 2do clic explicado.
- El bug requiere que el INSERT **cree la fila** pero el catch se dispare igual.

**Hipótesis fuerte candidata**: race entre INSERT y el SELECT implícito del `RETURNING` del `.insert(...).select().single()`. Escenario:
1. INSERT crea la fila con `auth.uid()` A → RLS INSERT check OK.
2. Postgrest hace el SELECT del RETURNING para armar el response body.
3. En ese intervalo, el token de auth se refresca cliente-side → `auth.uid()` durante el SELECT resuelve como B (nuevo user_id post-refresh; puede ser el mismo id pero con jwt claims diferentes).
4. Si RLS SELECT policy usa comparación por `auth.uid()` estricta y el token intermedio no resolvió idéntico, el SELECT filtra la fila → 0 rows en response.
5. `.single()` en supabase-js throw "expected single, got 0" → catch → toast.
6. La fila queda persistida por el INSERT (el rollback del rollback del token no aplica; INSERT ya committeó).

**Vector alternativo**: la `.insert().select()` de supabase-js pide con header `Prefer: return=representation` — Postgrest ejecuta INSERT + SELECT en 1 query, pero con `Prefer: return=representation` el SELECT usa el mismo predicate que RLS SELECT policy. Si el `auth.uid()` en el SELECT devuelve un id que la RLS no matchea, el response es 201 Created + body vacío `[]` → `.single()` throw. Es refinamiento de la misma hipótesis.

**El paso 1** confirma o descarta viendo el response body del INSERT + el status. Si el status es 201 y body `[]`, la hipótesis es correcta; si es 4xx, la causa es otra (constraint violation, validator, etc).

## 3. Fix aterrizado en este PR (independiente del paso 1)

### 3.1 [components/Servicio/ServiceDetailView.tsx:433-455](../../components/Servicio/ServiceDetailView.tsx#L433-L455)

`catch` del handler `handleChatClick` ahora llama `Sentry.captureException(error, { tags: { subsystem: 'ficha_servicio_chat_insert' }, contexts: { chat_insert: { servicio_id, proveedor_id } } })` antes del `toast.error`. `user.id` llega automático desde `Sentry.setUser({id})` de #82. `import * as Sentry from '@sentry/nextjs'` agregado a los imports.

**Efecto**: el próximo `1er clic` que reproduzca el bug deja evento Sentry con stack + user.id + `contexts.chat_insert` (servicio_id, proveedor_id) → diagnóstico posible sobre datos reales sin depender del PO como probador único.

**Regla operativa nueva** (a aterrizar en CLAUDE.md dentro del sprint SENTRY-TOAST kickoff 2026-09-28): *todo `catch` que muestre `toast.error` al usuario reporta a Sentry con `Sentry.captureException` + tag `subsystem`*. El call site de este sprint adelanta el patrón para el caso puntual sin esperar el sweep sistémico.

### 3.2 Fix funcional · pendiente commit posterior con evidencia del paso 1

Espera el resultado del spec + console.error del PO. Opciones tentativas según lo que revele el paso 1:

- **Si es race token vs INSERT SELECT**: separar el INSERT del SELECT — `insert(...)` sin `.select()` + query separado con retry corto (1x) si es necesario para obtener el id. Alternativa: reutilizar el UUID del INSERT si se puede pasar client-side (Postgres `gen_random_uuid()` client-generated).
- **Si es Postgrest bug con `Prefer: return=representation`**: workaround con `Prefer: return=minimal` + query separado.
- **Otra causa**: TBD según evidencia.

### 3.3 Spec regresión · pendiente commit posterior

Después del fix funcional, agregar en el mismo dir `chat-open-error/regresion.spec.ts` con hard-asserts:
- 1er clic desde ficha sin conversación previa → conversación creada + navega a `/mensajes?id=...` en <10s.
- Cero `console.error` con "Error starting conversation".
- Cero toast "Hubo un error al intentar abrir el chat" visible.

## 4. Fuera de alcance (para SENTRY-TOAST kickoff 2026-09-28)

- **Regla nueva a CLAUDE.md** (formalización) — todo catch con toast.error → Sentry.captureException + tag subsystem.
- **Inventario completo** de `toast.error` en catches sin reporte (components + pages, cifra exacta) — al 2026-09-24 pre-inventario: 135 `toast.error` en 23 archivos, ~15-18 catches en `components/**` sin reporte (grep multiline aproximado).
- **Sweep sistémico** de los ~15-80 catches sin reporte con `captureException` + tags contextuales. Ejecución al inicio del Tramo 2, antes de DEL-CUENTA-LEY (la visibilidad es prerrequisito).

## 5. Enlaces cruzados

- Sprint `sentry-boundary` (2026-09-24, #88, `6774fbd`) — [docs/sprints/sentry-boundary.md > 8. Cierre](sentry-boundary.md) — evento Sentry `JAVASCRIPT-NEXTJS-9` del error boundary que hizo visible el segundo bug `/usuario` y del cual este sprint es el hallazgo doble.
- Sprint `incidente-usuario-fix` (2026-09-24, #89) — [docs/sprints/incidente-usuario-fix.md](incidente-usuario-fix.md) — el fix del boundary a `/usuario` que se aterriza en paralelo a este PR.
- BACKLOG.md > SENTRY-TOAST (a agregar en el kickoff del domingo 2026-09-28).
