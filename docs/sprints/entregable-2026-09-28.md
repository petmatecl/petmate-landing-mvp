# Entregable Tramo 1 · 2026-09-28

**Objetivo**: cierre del Tramo 1 antes del viaje del PO (2026-09-29 → 2026-10-27). Estado consolidado + plan del Tramo 2 + riesgos con formato de escalación pre-definido.

Docs-only. Rama `entregable-0928`. Sin merge — revisamos el domingo y ajustamos.

---

## 1. Estado de J-4

### 1.1 Cerrados esta semana (con PR y fecha)

| # | Ítem | PR | Merge SHA | Fecha |
|---|---|---|---|---|
| 1 | **F2-3-CLEANUP** · fixture cron F2-3 borra notifs cascade + workflow_dispatch en `ci.yml` | #78 | `9b58553` | 2026-09-22 |
| 2 | **BELL-150** · Bell resiliente bajo carga >150 unread + T4 stress con user dedicado efímero + BELL-PAGINACION anotado como deuda | #80 | `5eb1e75` | 2026-09-22 |
| 3 | **F2-RESERVAS-CLEANUP** · `getSupabaseAdmin()` para cleanup (RLS FOR DELETE ausente en agendamientos) + 13 call sites + limpieza 373 reservas + 263 servicios huérfanos Camila | #83 | `f4301f1` | 2026-09-23 |
| 4 | **cue-1 watchdog fix** · stale closure con `useRef` + F4 doble dirección (positiva/negativa) + revert instr B1.5 + B3 CI-SPEC-COUNT | #85 | pendiente merge sábado tras QA post-deploy (2 tabs + logout + confirmar cero events nuevos) | — |
| 5 | **B3 specs descubiertos** · CI-SPEC-COUNT en el workflow detectó 5 dirs no incluidos (`prelaunch-1`, `producto-1`, `producto-2`, `sentry`, `zonab-1`) + ci-canario en EXCLUDE_LIST | #85 (dentro del sprint) | pendiente merge sábado | — |
| 6 | **sentry-boundary** · `Sentry.captureException` en `componentDidCatch` con `contexts.react.componentStack` + tag `subsystem=error-boundary` + test unitario `components/ErrorBoundary.test.tsx` + regla P8 12ª (cero código productivo de prueba, incluso gated por env). P8 positivo end-to-end confirmado con evento `JAVASCRIPT-NEXTJS-9` post-merge | #88 | `6774fbd` | 2026-09-24 |
| 7 | **chat-open-error** · `existingResult` sin `servicio_id` (bug 409 UNIQUE constraint por par tutor-proveedor) + spec regresión 2 casos hard-assert + captureException del catch + reemplazo del spec diagnóstico `expect.soft` por `regresion.spec.ts` | #90 | `273f911` | 2026-09-24 |
| 8 | **incidente-usuario-fix** (rename `hf-usuario-fix`) · `pages/mensajes.tsx` defaultReturn tutor `/usuario` → `/mis-reservas` + copy dinámico + guard `if (!categoria) return <NotFoundContent />` en `pages/[categoria]/index.tsx` + spec regresión 3 casos + `authenticate.ts` guard token loud (3 iters) | #91 | `6f341df` | 2026-09-24 |
| 9 | **CUE-1-SENTRY-USER** · `Sentry.setUser({id})` en UserContext (solo id, sin PII) | #82 | `330a890` | 2026-09-23 |
| 10 | **cue-1-p8** · diagnóstico monitoreado + caso canónico lista vacía en acta bloque-j-4 | #81 | `3d62f56` | 2026-09-22 |
| 11 | **no-push-directo** · regla operativa "cero push directo a main" + ajuste branch protection (documentado, PO aplica en GitHub Settings) | #79 | `c51d269` | 2026-09-22 |
| 12 | **LCE-P8** · helper `signupLink.ts` + spec P8 positivo/negativo + guards STAGING_PROJECT_REF + prefix `sb_secret_` (approach runner, sin tocar código productivo) | #76 | `75a4fe8` | 2026-09-21 |

### 1.2 Abiertos con plan

| # | Ítem | Estado | Plan |
|---|---|---|---|
| A | **CONVIENE · Cuelgue intermitente de carga** (spinner indefinido, se destraba con Ctrl+Shift+R) | **MONITOREADO** desde 2026-09-15 con watchdog CUE-1. Watchdog corregido en #85 (stale closure). Cero events reales de usuarios ≠ PO en 28 días | Ventana de observación 2026-09-29 → 2026-10-27 con `user.id` activo (post-#82). Disparador para reabrir: cualquier evento `user_context_stuck` o `hydrate_exhausted` con `user.id` distinto del PO |
| B | **CONVIENE · `cue-1-mobile-toast`** (post-launch) | Anotado post-hallazgo issues -5/-8 en dispositivo Android del PO. Cuando UserContext cae a `hydrationState=degraded` post-hydrate exhausted, surface toast "Tuvimos problemas conectando..." + action "Recargar" | Sprint chico ~30 min. Tramo 3 |
| C | **fixmes etiquetados** con lista exacta | Ver 1.3 abajo | — |
| D | **FIXTURE-HYGIENE** · inventario exhaustivo de qué crea/borra cada fixture e2e (tabla en `e2e/README.md`) | Abierto con disparador "antes del lanzamiento nov-2026" | Tramo 2 (viaje) — PR chico solo docs. Estimación 2-4h |
| E | **CI-CONCURRENCY** | Kickoff domingo 2026-09-28. Ver 4 abajo · recomendación final = combo A (concurrency group repo-wide) + B reescrita (fixtures scoped por preview slug) | Aterrizar **A** en rama `ci-concurrency` **antes del viaje** si el PO confirma domingo. B reescrita en Tramo 3 |
| F | **CI-SPEC-COUNT** · guard en workflow que detecta dirs de `e2e/specs/` no incluidos en el comando rápido | **YA ACTIVO** en #85 (pendiente merge sábado). Cero acción adicional | Verificar en el primer rebase post-merge que sigue disparándose correctamente |
| G | **SENTRY-TOAST** | Ver 4 abajo · kickoff domingo con inventario exacto | Tramo 2 inicio, antes de DEL-CUENTA-LEY |

### 1.3 Fixmes con etiqueta `[b3-discovered-*]` — lista exacta

| # | archivo:línea | etiqueta | motivo | plan Tramo 2/3 |
|---|---|---|---|---|
| 1 | [e2e/specs/producto-1/s1-badge-reserva-online.spec.ts](../../e2e/specs/producto-1/s1-badge-reserva-online.spec.ts) `test.fixme` | `[b3-discovered-2026-09-25]` | Descubierto en sprint `cue-1-fix B2` (PR #85, 2026-09-25). Spec badge "Reserva online" en `/explorar` — card recién creada no aparece en listado (paginación / filtro / delay INSERT→RPC) | Sprint dedicado Tramo 2 · 4 pasos: (a) inspeccionar `/explorar` query params (¿acepta `categoria` + `comuna` + búsqueda por título?), (b) medir delay INSERT `servicios_publicados` → visible en RPC `buscar_servicios`, (c) verificar predicados RPC (¿`estado`, `activo`, `agendamiento_habilitado`?), (d) unfixme + fix (paginación o filtro específico) |
| 2 | [e2e/specs/f2-recordatorios-cron/all.spec.ts:321](../../e2e/specs/f2-recordatorios-cron/all.spec.ts#L321) `test.fixme` S3 "marcas independientes (parcial)" | `[b3-discovered-2026-09-25]` | Descubierto en sprint `sentry-boundary` (PR #88, 2026-09-25). Diagnóstico solo-lectura descartó bug de fixture y de ventana del cron (medianoche Chile 03:00 UTC a 13h de la corrida). Hipótesis viva no verificable por lectura: race cross-PR Supabase staging entre SELECT y `reclamarEnvio` del cron | Sprint dedicado post-lanzamiento Tramo 3: (a) instrumentar cron con log de `body.failures + body.processed + body.claimsPerdidos*` para el agendamiento test, (b) reproducir con 2+ PRs en paralelo, (c) si es race → mover fixture a proyecto Supabase dedicado o filtrar SELECT del cron por `tutor_nombre LIKE '[TEST-cron-%'`, (d) unfixme. Puede resolverse indirecto si CI-CONCURRENCY opción A cierra el race |

**Regla operativa**: fixmes son **uno por uno**, con diagnóstico propio en el acta, nunca en lote (CLAUDE.md > ENMIENDA P11 2026-09-24). Cada fila arriba tiene diagnóstico + plan. Al aparecer un nuevo `[b3-discovered-<YYYY-MM-DD>]`, agregar fila con el mismo formato.

---

## 2. CUE-1 · Estado final de la semana (3 líneas)

1. **Instrumento** (ruido, no bug): 39 events de `user_context_stuck` (JAVASCRIPT-NEXTJS-7) = **stale closure del watchdog**, todos del PO desktop `aff2a90d…`. Fix aterrizado en PR #85 rama `cue-1-fix` (useRef + F4 doble dirección), merge sábado 2026-09-27 tras QA post-deploy (2 tabs 5 min + logout + confirmar cero events nuevos con la release).
2. **Dispositivo propio del PO** (no usuarios reales): 5 events de `hydrate_exhausted` (JAVASCRIPT-NEXTJS-5) + `login_role_lookup_failed` (JAVASCRIPT-NEXTJS-8) = **Chrome Mobile Android 15 del PO con `TypeError: Failed to fetch (supabase.co)` intermitente**, `user.id 0c2ab509…` verificado. Cero usuarios reales afectados en 28 días de monitoreo (`Sentry.setUser({id})` activo desde #82). F1+F2 (AbortController + fallback) archivados como "no aplican" — la causa real es Failed to fetch que ya se resuelve con error y ya dispara los 4 reintentos.
3. **Ventana de observación** 2026-09-29 → 2026-10-27. **Disparador para reabrir**: cualquier evento `hydrate_exhausted` o `user_context_stuck` con `user.id` distinto del PO (`aff2a90d…`, `0c2ab509…`) o de cuentas E2E (`E2E_STAGING_*`). Sin evento nuevo en la ventana → baja a CONVIENE al regreso PO 2026-10-28. `cue-1-mobile-toast` queda como CONVIENE post-lanzamiento.

---

## 3. Cola de PRs abiertos (actualizada 2026-09-24 post-merge #91 + rebase cola)

| # | PR | rama · HEAD post-rebase | contenido (1 línea) | checks | dependencias | qué hacer |
|---|---|---|---|---|---|---|
| — | ~~#91~~ | ~~`hf-usuario-fix`~~ | ~~Rename de #89 · fix `pages/mensajes.tsx` + guard `[categoria]` + `authenticate.ts` guard token (3 iters)~~ | ✅ **MERGEADO en `6f341df` 2026-09-24** | — | QA PO en prod pendiente: (a) "Volver a mis reservas" desde el chat aterriza en `/mis-reservas` sin error; (b) categoría inexistente por URL (ej. `/usuario`) muestra el 404 canónico de la app |
| 1 | **#85** | `cue-1-fix` · `a3024a9` | fase A reproducción diagnóstica + fix stale closure watchdog B2 + F4 doble + B3 CI-SPEC-COUNT | 5/5 verde pre-rebase; **checks post-rebase pending** | Ninguna | **Mergear sábado 2026-09-27** con QA PO (2 tabs + logout + cero events nuevos con release). No tocar hasta el sábado |
| 2 | **#87** | `button-unif-doc` · `c02a7b9` | Kickoff sprint BUTTON-UNIF (Tramo 2, sin merge) · docs de decisiones de UI para el desfile visual | UNKNOWN (docs-only sin código productivo) | Ninguna | **Mantener abierto durante el viaje**. Sprint visual de botones = alcance Tramo 2 |
| 3 | **#86** | `supajs-upgrade` · `c9aabbe` | Experimento B1 `@supabase/supabase-js ~2.84 → ~2.117` + remove noOpLock (sin merge, P8 falseó causa CUE-1) | UNKNOWN | Ninguna | **Mantener abierto durante el viaje**. Falseó la hipótesis SDK bug — mantenido como referencia para bump preventivo al regreso. No es urgente |
| 4 | **#84** | `del-cuenta-docs` | Kickoff DEL-CUENTA-LEY + decisiones PO + copy + preguntas asesor (Tramo 2, sin merge) | UNKNOWN | Espera respuestas del asesor legal | **Mantener abierto durante el viaje**. Ejecución Tramo 2 tras SENTRY-TOAST. Sin rebase todavía por tener conflicts esperables (docs); rebasar el sábado antes de arrancar Tramo 2 |
| 5 | **#77** | `auth-mail-phish` · `0242366` | 6 plantillas Auth ES + NOTIF-FROM-HARDCODE + DMARC en BACKLOG | UNKNOWN | Ninguna | **Mantener abierto durante el viaje**. Merge en Tramo 2 cuando el PO revise las plantillas |
| 6 | **#72** | `fixmes-prodok` | Desmarcar 4 fixmes restantes post-verificación prod OK | UNKNOWN | Ninguna | **Propuesta: cerrar sin merge**. Motivo: los 4 fixmes originales quedaron cubiertos por sprints posteriores (bloque-j J-4 con lista propia + b3-discovered nuevos). El PR es de 2026-09-21, superado por la ENMIENDA P11 (2026-09-24) que ahora exige diagnóstico individual por fixme, no un desmarcado en lote. **Aceptar del PO antes de cerrar** — si prefiere mantener, migrar a un ítem del bloque-j-4 con la lista puntual |
| 7 | **#69** | `bloque-i-acta` | Cierre bloque-i docs + BACKLOG conciliado + lista SQL prod | UNKNOWN | Ninguna | **Propuesta: cerrar sin merge**. Motivo: docs de un bloque anterior al bloque-j, contenido probablemente ya reflejado en actas posteriores (`bloque-j-4.md`, `chat-open-error.md`, `sentry-boundary.md`, etc.) mergeadas esta semana. **Aceptar del PO antes de cerrar** — si contiene datos únicos (ej. lista de SQL prod pendiente aún no aplicada), migrar el subset a una entrada nueva en `BACKLOG.md > PEDIDOS DIRECTOS DEL PO` antes de cerrar |

**Rebase log del 2026-09-24** (post-merge #91 en `6f341df`):
- #85 `cue-1-fix`: 15 commits rebaseados. 2 conflicts aditivos en `.github/workflows/e2e-error-audit.yml` (comando `e2e-rapido`): main aportó `chat-open-error/` + `incidente-usuario-fix/`, la rama aportó `cue-1-fix/` + los 5 dirs del B3 (`prelaunch-1`, `producto-1`, `producto-2`, `sentry`, `zonab-1`). Resolución mecánica: unión completa. Push `a469b5a → a3024a9`.
- #77 `auth-mail-phish`: 11 commits, rebase limpio. Push `5dff20f → 0242366`.
- #86 `supajs-upgrade`: 5 commits, 1 conflict aditivo `e2e-error-audit.yml` (cue-1-fix vs union main), resolución mecánica. Push `398d0e2 → c9aabbe`.
- #87 `button-unif-doc`: 1 commit, rebase limpio. Push `7d39d4a → c02a7b9`.
- #84 `del-cuenta-docs`: no rebaseado (probable conflict de docs esperado; rebase el sábado antes de arrancar Tramo 2).

Todos los rebases usaron `--force-with-lease` (regla del proyecto). Cero pushes destructivos.

---

## 4. Plan del Tramo 2 con orden y kickoff

**Ventana**: 2026-09-29 → 2026-10-27 (viaje del PO, congelamiento de prod).

**Orden estricto**, cada sprint arranca al terminar el anterior:

### Orden 1 · SENTRY-TOAST · kickoff domingo con inventario exacto

**Regla nueva propuesta para CLAUDE.md** (a ratificar en el kickoff): *todo `catch` que muestre `toast.error` al usuario reporta a Sentry con `Sentry.captureException` + tag `subsystem` y (cuando aplique) `contexts` con IDs relevantes*.

**Inventario exacto** (`node inventory-toast.js` sobre `components/`, `pages/` no-api, `contexts/`, `lib/` no-api, excluyendo `.test.ts`):

- **145 catch blocks totales** encontrados.
- **43 catches con `toast.error(...)` adentro** (los que muestran toast al user).
- **3 con `Sentry.captureException` (correcto)** — `pages/proveedor/index.tsx` (2), `components/Servicio/ServiceDetailView.tsx` (1, agregado en #90).
- **40 catches SIN captureException — deuda del sprint**.

Distribución por archivo (ordenado por deuda desc):

| archivo | catches | toast dentro | con | **SIN** |
|---|---|---|---|---|
| `components/Admin/ProveedorApprovalList.tsx` | 6 | 6 | 0 | **6** |
| `pages/admin/proveedores.tsx` | 6 | 5 | 0 | **5** |
| `pages/proveedor/index.tsx` | 8 | 7 | 2 | **5** |
| `components/Admin/ProveedorManagementList.tsx` | 3 | 3 | 0 | **3** |
| `pages/admin/evaluaciones.tsx` | 3 | 3 | 0 | **3** |
| `pages/usuario/mascotas/index.tsx` | 6 | 3 | 0 | **3** |
| `components/Admin/EvaluacionModerationList.tsx` | 2 | 2 | 0 | **2** |
| `components/Proveedor/ServiceFormModal.tsx` | 2 | 2 | 0 | **2** |
| `components/Service/PreguntasSection.tsx` | 2 | 2 | 0 | **2** |
| `pages/admin/servicios.tsx` | 2 | 2 | 0 | **2** |
| `pages/mis-reservas.tsx` | 2 | 2 | 0 | **2** |
| `components/Chat/MessageThread.tsx` | 3 | 1 | 0 | **1** |
| `components/Proveedor/CertificacionesSection.tsx` | 1 | 1 | 0 | **1** |
| `components/Proveedor/EvaluacionesTab.tsx` | 1 | 1 | 0 | **1** |
| `pages/explorar.tsx` | 2 | 1 | 0 | **1** |
| `pages/index.tsx` | 5 | 1 | 0 | **1** |
| `components/Servicio/ServiceDetailView.tsx` | 1 | 1 | 1 | 0 |

**Ejecución**: 40 catches × ~5 min/caso = **~3-4h de sprint**. Ejecutar por archivo (batchs de 5-8), con PR único que muestra el diff completo + acta con tabla actualizada post-sweep.

**Ejecución ANTES de DEL-CUENTA-LEY**: la visibilidad es prerrequisito. Sin ella, cualquier bug que aparezca en el Tramo 2 durante DEL-CUENTA-LEY (o cualquier otro sprint) pasa mudo. Estimación: kickoff sábado tarde o domingo → sweep durante lunes 2026-09-29 (primer día del viaje).

### Orden 2 · CI-CONCURRENCY

**Recomendación consolidada** (ver `docs/sprints/bloque-j-4.md > CI-CONCURRENCY`): combo **A + B reescrita**, con A **antes del viaje** si el domingo se aprueba.

- **A** — concurrency group repo-wide `staging-shared-db-repo-wide` en todos los workflows que tocan Supabase staging. Cierra el race cross-PR hoy sin cambio de código productivo. Costo: feedback loop ~1-1.5h por PR en cola (aceptado durante el viaje, nadie espera resultado en vivo). Estimación: 30-60 min de commit + verificación. **A aterrizar antes del viaje si el PO confirma domingo**.
- **B reescrita** — fixtures etiquetan filas con `[TEST-cron-<PREVIEW-SLUG>-...]` + cron NO cambia (regla P8 12ª respetada). Buena higiene de cleanup + prevención de asserts sobre datos ajenos. NO cierra por sí sola el race del S3 recordatorios-cron (por el escenario "otro cron reclama + rollback"). Ejecución Tramo 3 al volver.

**Kickoff domingo**: revisar sección + confirmar A antes del viaje.

### Orden 3 · resto de J-4

- `FIXTURE-HYGIENE`: tabla en `e2e/README.md` con qué crea/borra cada fixture. Estimación 2-4h. Tramo 2 media.
- Ítem `producto-1/s1-badge` fixme + diagnóstico (paso a-d ver 1.3 fila #1). Estimación 3-6h. Tramo 2 tardía.

### Orden 4 · CARNET-RETENCION

**Estado** (BACKLOG conocido pre-viaje): sprint sobre retención del carnet subido durante el flujo de verificación. Ver bugs conocidos > "Admin verificación de carnet — imagen rota en prod" (CLAUDE.md). **Alcance**: cambiar el upload en `pages/proveedor/index.tsx:771-789` para guardar el `path` en vez de la URL cosmética; en el render admin usar `createSignedUrl(path, 60)`. Estimación: **1-2 días** (SQL migration + fix upload + fix render admin + spec regresión).

### Orden 5 · DEL-CUENTA-LEY

**Estado**: kickoff en PR #84 `del-cuenta-docs`, espera respuestas del asesor legal (10 preguntas). Ejecución **tras SENTRY-TOAST** (visibilidad como prerrequisito). Alcance depende de las respuestas del asesor — retención Sentry vs derecho al olvido, IP/geo scrubbing, etc. Estimación: **2-4 días** dependiendo del alcance del asesor.

### Orden 6 · AUTH-LINK-PROPIO

**Estado**: pedido implícito post-hallazgo `%20` en Site URL de Supabase Auth. Alcance: emitir links de confirmación desde nuestro dominio propio en vez del default de Supabase. Estimación: **2 días** (custom email templates + SMTP + Auth Hooks + spec regresión). Depende de decisión PO sobre Auth Hooks (feature paga de Supabase Pro).

### Orden 7 · sprint visual de botones (BUTTON-UNIF)

**Estado**: kickoff en PR #87 `button-unif-doc`. Alcance: unificación visual de botones en toda la app según la decisión de UI del desfile. Estimación: **1-2 días** (component base + refactor call sites + spec estructural). Depende de la decisión de PO sobre el design system.

### Orden 8 · SHARE-PROV

**Estado**: pedido PO pre-viaje sobre botón "Compartir proveedor" en la ficha. Alcance: link con `og:` tags + rutas SEO + spec. Estimación: **1 día**.

**Total Tramo 2 estimado**: ~10-15 días de sprint condensado. Con ~20 días laborables en el viaje (5 días × 4 semanas), hay margen si SENTRY-TOAST y CI-CONCURRENCY no se dilatan.

---

## 5. Reglas nuevas de la semana en CLAUDE.md (para relectura pre-viaje)

Todas aterrizadas 2026-09-22 → 2026-09-24. Listadas en orden inverso (más nueva primero):

| Fecha | Regla / sección | Ubicación en CLAUDE.md |
|---|---|---|
| 2026-09-24 | **Checklist obligatorio al crear rama nueva — ANTES del primer `git push`**: contar chars (`echo -n "<nombre>" \| wc -c` o mental ≤ 12), presupuesto ≤ 18. Si excede, renombrar local. Si ya se pusheó y CI rompió por `ERR_NAME_NOT_RESOLVED`, flow rename operativo (rama corta + PR nuevo + cerrar viejo con enlace). Caso canónico: PR #89 → #91. | Sección "Longitud de nombres de rama" (junto a la regla de 18 chars existente) |
| 2026-09-24 | **ENMIENDA P11 · fixmes uno por uno con diagnóstico propio en el acta**: nunca en lote por "el PR no toca eso". Antes de fixme, verificar si el spec pasaba en runs verdes recientes (`gh run list --status success --limit 5`) — si sí, **no es deuda histórica: es regresión o ambiente, y el diagnóstico individual decide cuál**. Cada `test.fixme [b3-discovered-<YYYY-MM-DD>]` viene con comentario multi-línea + fila en tabla `bloque-j-4.md > B3 discovered fixmes`. Incidente que originó: PR #90 run `36040364041` con 8 fails (1 propio + 7 pre-existentes) — el auditor propuso fixme en lote, el PO rechazó. | Sección "AMPLIACIÓN P11" (2026-09-11) |
| 2026-09-24 | **Cero push directo a main** (regla operativa). Cero excepción por "es solo docs". Cada push a main dispara deploy prod. Durante el congelamiento Tramo 2, la regla se refuerza con GO explícito PO por chat en el turno vigente. Ajuste de branch protection propuesto (documentado, aplicar en GitHub Settings) | Merge #79 `no-push-directo` (`c51d269`) — regla vive en CLAUDE.md y también documentada en la sección "Workflow" |
| 2026-09-23 | **Regla operativa de verificaciones antes de entregar SQL al PO**: cero confianza en memoria de nombres, cero `SELECT` con nombre de columna no leído del `information_schema` en el turno vigente. Ampliación del P6 a queries de investigación ad-hoc, no solo migrations. Aterrizada en el sprint `f2-reservas-clean` (`b6288fa`) | Sección "Verificación de nombres de columna" (P6) |
| 2026-09-24 | **COROLARIO P8 12ª · aclaración ampliada**: la regla "cero código productivo de prueba en producción" **aplica también a páginas y rutas gateadas por entorno**. Una `pages/foo.tsx` con `getServerSideProps → notFound:true` en prod sigue siendo código desplegable. Verificación en staging = specs / fixtures / tests unitarios, nunca código productivo condicional. Incidente que originó: primera propuesta del auditor en sprint sentry-boundary (ruta smoke gated) — el PO detectó antes del GO | Sección "COROLARIO P8 12ª" |

**Antes de partir el 2026-09-29**: releer estas 5 secciones + el checklist de rama. Todas están en CLAUDE.md ordenadas cronológicamente por fecha en el título de cada bloque.

---

## 6. Riesgos para el viaje

Cada riesgo con: síntoma, cuándo requiere tu decisión, **formato de escalación** (opciones + recomendación, cero rerun / cero override P11 como opción).

### R1 · CUE-1 disparador se activa (evento con user.id no-PO)

**Síntoma**: aparece en Sentry un event `user_context_stuck` o `hydrate_exhausted` con `user.id` distinto de `aff2a90d…` / `0c2ab509…` / cuentas E2E, o Camila prod con reporte de spinner indefinido.

**Cuándo requiere tu decisión**: en el momento en que el disparador se activa.

**Formato de escalación**:
```
Chat: "Riesgo R1 activado — event Sentry <shortId> con user.id <masked> desde <device+browser>. Cuelgue reproducible por el usuario.

Opciones:
(A) Descartar F1+F2 archivados y aterrizar `cue-1-mobile-toast` como fix mínimo (UX de degrade explícito con acción Recargar) · estimación 1h · llega antes del regreso.
(B) Re-abrir `cue-1-fix` con F1 AbortController + F2 fallback determinístico según la investigación pre-existente · estimación 6-8h · congelamiento sigue activo, requiere GO específico para hotfix.
(C) Solo observar hasta el regreso · usuario afectado hace F5 y se destraba (patrón conocido) · cero fix hasta 2026-10-28.

Recomendación: (A) si el disparador es 1 caso puntual (usuario N=1 en móvil). (C) si el evento es intermitente sin reporte de usuario. (B) solo si hay 3+ usuarios distintos afectados en <48h."
```

### R2 · CI rojo persistente en algún PR del Tramo 2

**Síntoma**: los PRs abiertos que sigo pusheando durante el viaje empiezan a fallar el CI de forma persistente.

**Cuándo requiere tu decisión**: al segundo commit con mismo patrón de fail sin causa clara.

**Formato de escalación**:
```
Chat: "Riesgo R2 · PR #<N> rama <slug> — CI rojo persistente. Run ids: <fail1> <fail2>. Fails: [lista con archivo:línea]. Diagnóstico solo-lectura descarta: <hipótesis descartadas con evidencia>. Hipótesis viva: <una>.

Opciones:
(A) Fix del ambiente (concurrency, secret rotation, dependency pin) sin tocar código productivo — estimación X min, riesgo bajo.
(B) test.fixme del subset específico con etiqueta [b3-discovered-<fecha>] + fila J-4 · cada fixme con diagnóstico individual · cero fixme en lote · PR sigue a verde.
(C) Pausar el PR hasta el regreso — el sprint queda en el estado actual, cero merge, tu QA al volver.

Recomendación: (A) si el fix del ambiente es evidente + no toca código productivo. (B) si un test verificado pasaba en runs verdes anteriores (evidencia empírica de flake). (C) siempre disponible como default seguro."
```

### R3 · Deploy prod con error Sentry post-merge de #91 o #85

**Síntoma**: post-merge de sábado, aparece nuevo error boundary en Sentry con `subsystem:error-boundary` que no es el bug ya conocido `/[categoria]` (#89/#91) ni el `user_context_stuck` (#85).

**Cuándo requiere tu decisión**: al ver el evento en Sentry con `user.id` distinto del PO.

**Formato de escalación**:
```
Chat: "Riesgo R3 · Sentry event nuevo <shortId> tras deploy de <#PR>. Stack: <top 3 frames>. componentStack: <mount path>. user.id: <masked>. Reproducción: [confirmada/no]. Categoría: [regresión de <sprint>/nuevo bug latente ahora visible].

Opciones:
(A) Hotfix directo en rama chica antes de que otros users lo hitean · estimación X min · requiere GO explícito porque prod está congelado.
(B) Revert del PR causal si el bug es regresión directa · vuelve a prod al estado pre-merge · cero fix, requiere sprint dedicado al regreso.
(C) Monitorear (contar apariciones × user.id) hasta el regreso · aplicar fix Tramo 3.

Recomendación: (A) si el bug afecta path crítico (login, contactar proveedor, reservar). (B) si el revert es limpio (fix chico + tests aislados). (C) si es un edge case con <3 users afectados en <48h."
```

### R4 · Merge conflict al rebasear PRs abiertos durante el viaje

**Síntoma**: al hacer rebase de un PR de Tramo 2 sobre main que avanzó por otros merges, conflicts que tocan código productivo, migrations, workflows o specs.

**Cuándo requiere tu decisión**: en el momento del conflict que no sea puramente aditivo de docs.

**Formato de escalación**:
```
Chat: "Riesgo R4 · rebase PR #<N> conflict en <archivo:línea>. Naturaleza: [aditivo simple / decisión de contenido / regresión potencial]. Contenido main: <resumen>. Contenido branch: <resumen>. Impacto si resuelvo <opción>: <descripción>.

Opciones:
(A) Aceptar main en <sección específica> y reinsertar líneas del branch que aportan valor único · sin decisión de contenido semántica.
(B) Escalar contenido semántico: <descripción de qué elegir>. Cero autoresolución.
(C) Merge en vez de rebase (1 merge commit sin reescribir historia) · pierde historia lineal pero elimina conflicts N a 1.

Recomendación: (A) si conflict es aditivo docs. (B) obligatorio si conflict toca código productivo / migration / spec. (C) si N conflicts aditivos y prefiero cero commits de resolución."
```

### R5 · Vercel / Supabase incident wall-to-wall

**Síntoma**: múltiples PRs con CI rojo en el mismo día, Sentry con spike de errores 5xx desde `supabase.co`, o toda la app respondiendo lento en prod.

**Cuándo requiere tu decisión**: al confirmar que el incident es del proveedor y no del código.

**Formato de escalación**:
```
Chat: "Riesgo R5 · Incident de <Vercel/Supabase>. Evidencia: <status page URL + Sentry issue con spike + curl a endpoints principales>. Duración estimada: <X min por status page>. Impacto: [código propio ok / degradado / caído].

Opciones:
(A) Esperar el fix del proveedor y hacer smoke post-recovery · cero acción del auditor.
(B) Rollback preventivo del último deploy prod si el incident coincidió con nuestro merge (falso positivo a descartar) · requiere GO explícito.
(C) Comunicar en el status page interno / notif de la app un banner de mantenimiento · N/A si no tenemos ese banner implementado.

Recomendación: (A) por default. (B) solo si Sentry muestra correlación temporal exacta con nuestro merge + patrón de fail que aparece solo con nuestro código."
```

**Regla común**: cero opción "rerun autónomo" ni "merge con override P11". La disciplina P11 se mantiene durante todo el Tramo 2.

---

**Fin del entregable**. Revisamos el domingo 2026-09-28. Cero merge hasta esa revisión.
