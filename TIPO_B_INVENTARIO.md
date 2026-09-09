# Sprint tipo-b — Inventario Fase 0

**Fecha**: 2026-09-09.
**Alcance real** (post-reclassification, ver §Reclassifications abajo): **29 callers client-side en 14 archivos**, agrupados en **5 lotes** por área con prioridad de visibilidad.

---

## Reclassifications (9 líneas movidas Tipo B → Tipo C)

Aplicando la stop condition del PO ("un caller server-side o de cron es Tipo C/D, no lo toques"), los siguientes callers listados como Tipo B en el sprint error-audit se **reclasifican** y **NO entran en este sprint**:

| Archivo:línea | Motivo reclassification |
|---|---|
| `lib/apiAuth.ts:67` | Helper server-side (`isAdmin()` usa `SUPABASE_SERVICE_ROLE_KEY`). Fail-closed silente es intencional. |
| `pages/index.tsx:705, 760, 789, 802` | Dentro de `getStaticProps` (build-time). Home stats — sin vista client-side para reintentar. |
| `pages/proveedor/[id].tsx:816, 826, 836` | Dentro de `getServerSideProps` (SSR). Perfil público pre-renderizado. |
| `pages/servicio/[id].tsx:109` | Dentro de `getServerSideProps` (SSR). |

Estos 9 quedan documentados en `BACKLOG.md > chore-tipo-b-ssr-audit` (entrada nueva de este sprint) para revisar la política server-side en sprint separado.

---

## Callers en scope (29) — agrupados por lote

**Columnas de la tabla**:
- **Archivo:línea** — locación exacta.
- **Tabla consultada** — Supabase.
- **Qué muestra hoy cuando falla** — texto exacto del empty state o silencio.
- **Rol que la ve** — proveedor / tutor / admin / any_authenticated / anon.
- **Compartido** — ✓ si vive en componente reutilizable por más de una ruta.

### Lote 1 — Panel proveedor (dashboard) · 5 callers

| Archivo:línea | Tabla | Muestra hoy cuando falla | Rol | Compartido |
|---|---|---|---|---|
| `lib/useProveedorStats.ts:47` | `servicios_publicados` | Métricas de "Visitas 7d" quedan en `0` sin aviso (vistas=0 → conversión N/A) | proveedor | ✓ hook |
| `lib/useProveedorStats.ts:114` | `evaluaciones` | Rating promedio muestra `"0.0"` + count `0` sin distinguir "sin evals" de "fallo query" | proveedor | ✓ hook |
| `pages/proveedor/index.tsx:450` | `servicios_publicados` | Tab "Servicios" muestra empty state `"Aún no tienes servicios publicados"` cuando podría ser fallo | proveedor | — |
| `pages/proveedor/index.tsx:457` | `evaluaciones` | Tab "Evaluaciones" muestra empty state sin aviso | proveedor | — |
| `components/Proveedor/CertificacionesSection.tsx:25` | `certificaciones` | Sección "Certificaciones" vacía sin aviso (visible al proveedor en su propio perfil de edición) | proveedor | ✓ componente |

### Lote 2 — Panel tutor · 8 callers

| Archivo:línea | Tabla | Muestra hoy cuando falla | Rol | Compartido |
|---|---|---|---|---|
| `pages/favoritos.tsx:57` | `favoritos` | Empty state `"Aún no has agregado favoritos"` en vez de aviso de error | tutor | — |
| `pages/favoritos.tsx:75` | `servicios_publicados` | Tras favoritos leídos ok, si servicios falla → listado vacío sin aviso | tutor | — |
| `pages/favoritos.tsx:102` | `proveedores_publicos` | Idem — pestaña de proveedores favoritos vacía | tutor | — |
| `components/Client/DashboardContent.tsx:87` | `proveedores_publicos` | Sección "Conversaciones recientes" muestra `"Proveedor Eliminado"` (misleading) | tutor | ✓ componente |
| `components/Client/DashboardContent.tsx:181` | `evaluaciones` | Set de evaluados vacío → todos los servicios contactados aparecen como "pendientes de evaluar" | tutor | ✓ componente |
| `components/Client/DashboardContent.tsx:191` | `eventos_tracking` | Sección "Servicios consultados" queda vacía sin aviso | tutor | ✓ componente |
| `components/Client/DashboardContent.tsx:203` | `servicios_publicados` | Reseñas pendientes silenciosamente en `[]` | tutor | ✓ componente |
| `components/Shared/UnreadBadge.tsx:16` | `conversations` | Badge de notif muestra `0` sin distinguir "sin no leídos" de "fallo" | tutor + proveedor | ✓ componente |

### Lote 3 — Explorar y fichas de servicio · 8 callers

| Archivo:línea | Tabla | Muestra hoy cuando falla | Rol | Compartido |
|---|---|---|---|---|
| `components/Service/PreguntasSection.tsx:36` | `preguntas` | Sección "Preguntas y respuestas" vacía sin aviso | any (ficha pública) | ✓ componente |
| `components/Service/ReviewList.tsx:64` | `proveedores_publicos` | Fotos de reviewers no se muestran (silent fallback a inicial) — grado bajo | any (ficha pública) | ✓ componente |
| `components/Servicio/ServiceDetailView.tsx:186` | `agendamientos` | Deep-link `?resenar=<id>` no scrolla al form (silent) | tutor logueado | ✓ componente |
| `components/Servicio/ServiceDetailView.tsx:292` | `conversations` | Al hacer click en chat: si query falla, no encuentra conv existente → crea duplicado | tutor logueado | ✓ componente |
| `components/Servicio/ServiceDetailView.tsx:330` | `usuarios_buscadores` | Vinculo agendamiento en chat falla silente → chat sin `agendamiento_id` (fire-and-forget existente pero sin evidencia) | tutor logueado | ✓ componente |
| `components/Servicio/ServiceDetailView.tsx:340` | `agendamientos` | Idem punto anterior | tutor logueado | ✓ componente |
| `components/Servicio/ServiceDetailView.tsx:421` | `conversations` | Al intentar evaluar: si query falla → sale toast "Solo puedes evaluar a proveedores que hayas contactado previamente" (misinformation cuando query falló) | tutor logueado | ✓ componente |
| `components/Servicio/ServiceDetailView.tsx:432` | `eventos_tracking` | Idem — misinformation por fallo, no por falta real de contacto | tutor logueado | ✓ componente |

### Lote 4 — Admin · 2 callers

| Archivo:línea | Tabla | Muestra hoy cuando falla | Rol | Compartido |
|---|---|---|---|---|
| `pages/admin/notificaciones.tsx:41` | `proveedores` | Sección "Actividad reciente" — lista combinada de proveedores + buscadores queda vacía sin aviso | admin | — |
| `pages/admin/notificaciones.tsx:51` | `usuarios_buscadores` | Idem — falta la mitad de la actividad reciente sin aviso | admin | — |

### Lote 5 — Helpers compartidos + context · 6 callers

| Archivo:línea | Tabla | Muestra hoy cuando falla | Rol | Compartido |
|---|---|---|---|---|
| `lib/authService.ts:50` | `proveedores` | `fetchProfile()` retorna null → `UserContext` degrada usuario a "sin perfil" (silent) | any_authenticated | ✓ helper compartido |
| `lib/authService.ts:72` | `usuarios_buscadores` | Idem tras fallthrough proveedores | any_authenticated | ✓ helper compartido |
| `lib/profileUtils.ts:19` | `proveedores_publicos` | Chat message header muestra `"Proveedor"` genérico en vez de nombre real | tutor + proveedor (chat) | ✓ helper compartido |
| `lib/profileUtils.ts:28` | `usuarios_buscadores` | Idem — nombre del interlocutor no se muestra | tutor + proveedor (chat) | ✓ helper compartido |
| `lib/hooks/useFavoritos.ts:63` | `favoritos` | Icono corazón silent-off cuando debería estar on (falso "no es favorito") | tutor (todo caller de <FavoritoToggle />) | ✓ hook |
| `contexts/UserContext.tsx:749` | `proveedores` | `refreshProveedorRow()` post-mutation en dashboard: cache no refresca → user ve datos stale sin aviso | proveedor | ✓ context |

---

## Base compartida — 3 helpers aterrizados en este PR

Sin tocar ningún caller todavía. Los lotes futuros los importan.

### `lib/supabaseReadQuery.ts` — helper de query

`runReadQuery(query, opts)` — ejecuta, registra Sentry si falla, devuelve `{ data, error }` tipado. Tags Sentry: `subsystem`, `table`, `route`, `errorCode` (usa `'unknown'` cuando `code` viene vacío — consistente con Case 4 error-audit-prod-20260908 §7.4). Nivel warning.

Uso canónico:
```typescript
const { data, error } = await runReadQuery(
    () => supabase.from('favoritos').select('*').eq('user_id', uid),
    { subsystem: 'favoritos', table: 'favoritos', route: '/favoritos' },
);
if (error) return <EstadoError titulo="No pudimos cargar tus favoritos" onRetry={refetch} />;
if (!data || data.length === 0) return <EmptyStateLegitimo />;
```

### `components/Shared/EstadoError.tsx` — componente + variante compacta

**`<EstadoError titulo sublinea onRetry />`** — banner rojo con título + sublínea default `"Revisa tu conexión y vuelve a intentar."` + botón "Reintentar". Estilo consistente con RoleGuard/ClientLayout error del sprint error-audit.

**`<EstadoErrorCompacto tooltip onRetry />`** — muestra `"—"` en vez de `0` para contadores/badges. Con `onRetry` es button clickeable, sin `onRetry` es span de solo lectura. Tooltip default `"No pudimos cargar este dato. Recarga para reintentar."`.

**Regla de diseño**: el estado de error reemplaza al estado vacío **de la sección que depende de esa consulta**, nunca a los children que no dependen. Ejemplo: header de una página sigue renderando aunque una sección interna esté en error.

### `e2e/specs/tipo-b/_helpers.ts` — spec base

`runTipoBSmoke({ route, blockPattern, expectedErrorTitle, expectedPositiveMarker? })` — genera los 3 tests estándar (control positivo, negativo con bloqueo, recuperación) dentro de un `test.describe`. Archivo prefix `_` para excluirlo del testMatch de Playwright.

Uso canónico:
```typescript
import { runTipoBSmoke } from './_helpers';

runTipoBSmoke({
    route: '/favoritos',
    blockPattern: '**/rest/v1/favoritos*',
    expectedErrorTitle: 'No pudimos cargar tus favoritos',
});
```

---

## Copys por caller (para revisión del PO antes de Fase 1)

Todos los copys respetan tuteo consistente (regla del proyecto). Sublínea siempre `"Revisa tu conexión y vuelve a intentar."`. Botón siempre `"Reintentar"`.

**Lote 1 (proveedor dashboard)**:
- Estadísticas 7d/rating: `<EstadoErrorCompacto tooltip="No pudimos cargar tus métricas. Recarga para reintentar." />` en cada card.
- Tab Servicios: `"No pudimos cargar tus servicios"`.
- Tab Evaluaciones: `"No pudimos cargar tus evaluaciones"`.
- Certificaciones: `"No pudimos cargar tus certificaciones"`.

**Lote 2 (tutor panel)**:
- Favoritos servicios: `"No pudimos cargar tus favoritos"`.
- Favoritos proveedores: idem (mismo título — mismo tab-based UX).
- Conversaciones recientes: `"No pudimos cargar tus conversaciones"`.
- Evaluaciones (subyacente): `"No pudimos cargar tu historial de evaluaciones"`.
- Servicios consultados: `"No pudimos cargar los servicios que visitaste"`.
- Reseñas pendientes: `"No pudimos cargar las reseñas pendientes"`.
- UnreadBadge: `<EstadoErrorCompacto />` (badge en header, sin retry — refetch background).

**Lote 3 (ficha servicio)**:
- Preguntas: `"No pudimos cargar las preguntas"`.
- ReviewList fotos: sin cambio visible (fallback silencioso a avatar-inicial es aceptable) — solo Sentry log (deuda menor, no requiere EstadoError).
- ServiceDetailView (contact/chat/eval paths): estos son WRITES post-verify, no listados. Cambio → toast en vez de silent-swallow. Copy toast: `"No pudimos verificar tu historial. Vuelve a intentar."`.

**Lote 4 (admin)**:
- Actividad reciente: `"No pudimos cargar la actividad reciente"`.

**Lote 5 (helpers + context)**:
- authService.fetchProfile: NO tiene UI propia (helper) — la sección que lo consume (Header, RoleGuard, etc.) muestra su propio EstadoError. Deuda: el helper propaga error al caller en vez de silenciar.
- profileUtils.getParticipantProfile: idem — chat header consume, chat header muestra fallback compacto (`—` con tooltip).
- useFavoritos: hook — el toggle heart muestra `<EstadoErrorCompacto />` en el ícono (dash pequeño en vez de heart) — o alternativa: refetch background silente + log Sentry solo. Decidir con PO.
- UserContext.refreshProveedorRow: no visible al user — solo Sentry log + expose en el context para que el caller (dashboard proveedor) muestre EstadoError si el refresh falla post-save.

**Callers con decisión pendiente del PO** (marcados en el listado): `useFavoritos.ts:63` (compacto en heart vs silent+log) y ReviewList fotos (silent fallback vs log).

---

## Ordenamiento de lotes por visibilidad — Fases 1–5

Fase 1 (mayor visibilidad → proveedor dashboard): **Lote 1** — el proveedor abre su panel cada día, ve métricas falsas y decide en base a ellas.
Fase 2 (2ª visibilidad → tutor panel): **Lote 2** — el tutor abre favoritos, dashboard, unread badge.
Fase 3 (ficha pública alta tráfico): **Lote 3** — todo visitante ve preguntas y reviews.
Fase 4 (bajo tráfico, alto valor operativo): **Lote 4** — admin ve actividad reciente para moderación.
Fase 5 (base compartida): **Lote 5** — helpers + context. Se hace último porque su fix informa cambios en callers de lotes 1-4 (algunos consumen estos helpers).

Cada Fase es un PR separado — un archivo por caller o un PR agrupando múltiples callers si el archivo es el mismo. Cada PR incluye:
1. Fix del caller.
2. Spec del caller en `e2e/specs/tipo-b/<caller-name>.spec.ts` usando `runTipoBSmoke()`.
3. Update BACKLOG marcando cada caller cerrado con SHA.
4. Merge FF vía `gh pr merge --merge --delete-branch` cuando los 4 checks estén verdes (autorización pre-aprobada por el PO).

---

## Puntero al BACKLOG

Entrada nueva `chore-tipo-b-ssr-audit` (creada en este PR): política server-side no-audit-friendly para los 9 callers reclassificados. Sprint separado post-launch cuando se defina policy (log Sentry sin retry vs. mostrar "última actualización HH:MM" cuando SSR falla).
