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

### Paso 1 · Reproducción resuelta desde prod por PO 2026-09-24

El PO reprodujo el clic en prod con la consola del navegador abierta y capturó la respuesta exacta:

- **POST `/rest/v1/conversations?select=*` devuelve `409 Conflict`**.
- Catch de `ServiceDetailView.tsx:433` dispara `toast.error(...)`.
- Ficha reproducción: `b1bdf757` "Acompañandolo en su hogar" (Maria Constanza).
- Contexto crítico: el PO **YA tenía conversación previa con esa proveedora para OTRO servicio**.

**Hipótesis del race token vs INSERT SELECT: DESCARTADA**. La causa era estructural del predicado del `existingResult`, no del RETURNING.

**Causa raíz CONFIRMADA con constraints reales** (verificado via `supabase-prod-ro` + `supabase-staging-rw` 2026-09-24, mismos constraints en ambos):

```sql
-- Constraint UNIQUE en public.conversations (prod y staging idénticos):
conversations_client_id_sitter_id_key UNIQUE (client_id, sitter_id)
-- Índice único correspondiente:
CREATE UNIQUE INDEX conversations_client_id_sitter_id_key
    ON public.conversations USING btree (client_id, sitter_id)
```

**El constraint es sobre `(client_id, sitter_id)` — SIN `servicio_id`**. Pero el `existingResult` de [ServiceDetailView.tsx:323-347](../../components/Servicio/ServiceDetailView.tsx#L323-L347) filtraba por `(client_id, sitter_id, servicio_id)` — divergencia entre lo que la app busca y lo que la BD enforce.

**Mecánica del bug**:
1. Tutor abre ficha del servicio B; ya tiene conversación con ese proveedor por servicio A.
2. `existingResult` query `(client_id, sitter_id, servicio_id=B)` → BD tiene fila con `servicio_id=A` → **`.maybeSingle()` devuelve `data=null`**.
3. Flujo cae al INSERT nuevo con `servicio_id=B`.
4. Postgres rechaza por `conversations_client_id_sitter_id_key` violation → HTTP **409 Conflict**.
5. supabase-js throw error → catch → toast → return.
6. La fila **NO se crea** (409 = rechazado). La conversación previa (servicio_id=A) sigue intacta.

**Nota sobre el reporte inicial del PO** ("1er clic falla + 2do clic funciona con conversación creada"): la conversación que el 2do clic abre es la **previa que ya existía por otro servicio**, no una creada por el 1er clic. El 2do clic probablemente navegó por un path distinto (notif bell con link a la conv preexistente, o handler diferente). El 409 rechaza SIEMPRE mientras el filtro divergente esté en `existingResult`.

## 2. Decisión de producto · UNA conversación por par tutor-proveedor

**Decisión PO 2026-09-24**: la BD ya enforce este modelo con el UNIQUE `(client_id, sitter_id)`. La app debe alinearse: `existingResult` busca solo por `(client_id, sitter_id)` — sin `servicio_id`. La conversación existente se reusa cross-servicio.

**`servicio_id` de la conversación existente** se conserva como **el primero** (menos churn: cero UPDATE cross-clic, semánticamente estable — la fila retiene el contexto histórico "esta conversación se abrió por primera vez para el servicio X"). El chat puede renderizar contexto adicional del servicio actual desde la UI si lo tiene, sin tocar el `servicio_id` persistido.

Alternativa descartada ("actualizar al último"): más carga BD (UPDATE por clic) + semánticamente confuso (el chat "cambia de contexto" con cada nuevo servicio abierto). Sin justificación clara sobre "primero preservado".

**Cero cambio de esquema** requerido. El bug era del predicado del cliente, no del constraint.

## 3. Fix aterrizado en este PR

### 3.1 `captureException` en [components/Servicio/ServiceDetailView.tsx:433-465](../../components/Servicio/ServiceDetailView.tsx#L433-L465)

`catch` del handler `handleChatClick` llama `Sentry.captureException(error, { tags: { subsystem: 'ficha_servicio_chat_insert' }, contexts: { chat_insert: { servicio_id, proveedor_id } } })` antes del `toast.error`. `user.id` llega automático desde `Sentry.setUser({id})` de #82. `import * as Sentry from '@sentry/nextjs'` agregado.

**Regla operativa nueva** (a aterrizar en CLAUDE.md dentro del sprint SENTRY-TOAST kickoff 2026-09-28): *todo `catch` que muestre `toast.error` al usuario reporta a Sentry con `Sentry.captureException` + tag `subsystem`*. Este call site adelanta el patrón puntual sin esperar el sweep sistémico.

### 3.2 Fix funcional · `existingResult` sin `servicio_id`

[components/Servicio/ServiceDetailView.tsx:330-350](../../components/Servicio/ServiceDetailView.tsx#L330-L350) — quitado `.eq('servicio_id', service.id)` del query `existingResult`. Comentario extenso in-line documenta la causa raíz, la decisión de producto, la referencia al constraint UNIQUE de la BD, y el criterio "servicio_id preservado como el primero".

### 3.3 Spec regresión hard-assert · [e2e/specs/chat-open-error/regresion.spec.ts](../../e2e/specs/chat-open-error/regresion.spec.ts)

2 casos con hard-asserts (reemplaza al spec diagnóstico `paso-1-repro.spec.ts` con `expect.soft`, que se elimina en el mismo commit — un spec que nunca falla no se queda en la suite):

- **(a) primer clic SIN conversación previa** → navega a `/mensajes?id=...` en <12s + cero toast + **exactamente 1 INSERT** + fila persiste con `servicio_id = SERVICIO_A_ID`.
- **(b) primer clic CON conversación previa por OTRO servicio del mismo proveedor** → `beforeEach` inserta conversación con `servicio_id=SERVICIO_A`; el clic se hace desde la ficha del `SERVICIO_B`; navega a `/mensajes?id=<mismo id que preConvId>` + cero toast + **CERO INSERT nuevo** (el fix reusa la existente) + BD sigue con 1 sola conv (UNIQUE enforced) + `servicio_id` preservado como el primero (`SERVICIO_A_ID`).

Fixture usa `getSupabaseAdmin()` (service_role gated a staging) para setup/cleanup. Cleanup en `beforeEach` + `afterAll` para no dejar residuos.

## 4. Fuera de alcance (para SENTRY-TOAST kickoff 2026-09-28)

- **Regla nueva a CLAUDE.md** (formalización) — todo catch con toast.error → Sentry.captureException + tag subsystem.
- **Inventario completo** de `toast.error` en catches sin reporte (components + pages, cifra exacta) — al 2026-09-24 pre-inventario: 135 `toast.error` en 23 archivos, ~15-18 catches en `components/**` sin reporte (grep multiline aproximado).
- **Sweep sistémico** de los ~15-80 catches sin reporte con `captureException` + tags contextuales. Ejecución al inicio del Tramo 2, antes de DEL-CUENTA-LEY (la visibilidad es prerrequisito).

## 5. Enlaces cruzados

- Sprint `sentry-boundary` (2026-09-24, #88, `6774fbd`) — [docs/sprints/sentry-boundary.md > 8. Cierre](sentry-boundary.md) — evento Sentry `JAVASCRIPT-NEXTJS-9` del error boundary que hizo visible el segundo bug `/usuario` y del cual este sprint es el hallazgo doble.
- Sprint `incidente-usuario-fix` (2026-09-24, #89) — [docs/sprints/incidente-usuario-fix.md](incidente-usuario-fix.md) — el fix del boundary a `/usuario` que se aterriza en paralelo a este PR.
- BACKLOG.md > SENTRY-TOAST (a agregar en el kickoff del domingo 2026-09-28).
