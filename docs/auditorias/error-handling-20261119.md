# Auditoría de errores no manejados en el frontend — 2026-11-19

**Audiencia**: PO (preparación lanzamiento 2026-11-25).
**Alcance**: catches que solo loguean, mensajes genéricos, estados de carga sin kill-switch, discrepancias de naming. Cero cambios aplicados — este doc es inventario + priorización.
**Método**: grep sobre `pages/**/*.tsx` + `components/**/*.tsx` + `components/Chat/MessageThread.tsx` por patrones `catch`, `setFetchError`, `toast.error`, `No pudimos`, `Reintentar`, `Cargando...`. Verificado contra el fuente en `main @ 7bc6e29`.
**Nota**: dos hallazgos ya documentados en el turno del PO (bug `/explorar` con mensaje de error + "0 resultados" simultáneos, chip "cuidado" vs URL "Cuidado y Hospedaje") se incluyen abajo para unificar la lista.

---

## Tabla de hallazgos

Convenciones:
- **Severidad**: `BLOQUEA` (debe arreglarse pre-25), `CONVIENE` (post-launch cercano), `MENOR` (deuda mantenible).
- **Tipo**: `CATCH-MUDO` (catch que solo loguea sin feedback al user), `MENSAJE-GENÉRICO` (copy que no da contexto), `CARGA-INFINITA` (estado de loading sin kill-switch), `EXCLUSIÓN-ROTA` (dos estados mutuamente excluyentes renderizan a la vez), `NAMING-INCONSISTENTE` (misma cosa con 2 nombres), `UX-POBRE` (patrón que impide al user avanzar).

| # | Archivo:línea | Tipo | Severidad | Resumen |
|---|---|---|---|---|
| 1 | [pages/explorar.tsx:758-768](../../pages/explorar.tsx#L758-L768) | EXCLUSIÓN-ROTA | BLOQUEA | "No se pudieron cargar los servicios" + "0 resultados" en simultáneo. **PR #125 lo cierra** (iter 3 fail escalada al PO). |
| 2 | [pages/mis-reservas.tsx:120-124](../../pages/mis-reservas.tsx#L120-L124) | CATCH-MUDO | BLOQUEA | Error en query `agendamientos` → setea `agendamientos: []` → tutor ve "No tienes reservas" (empty state engañoso). No loguea a Sentry ni avisa. |
| 3 | [pages/mis-reservas.tsx:349-352](../../pages/mis-reservas.tsx#L349-L352) | CARGA-INFINITA | BLOQUEA | `userLoading` / `!router.isReady` / `!isAuthenticated` muestran "Cargando..." sin timeout. Incidente real citado en CLAUDE.md § P11 ampliación 2026-09-11 (PR #20 stall). |
| 4 | [components/Chat/MessageThread.tsx:299-305](../../components/Chat/MessageThread.tsx#L299-L305) | CARGA-INFINITA | CONVIENE | "Cargando..." sin kill-switch si el fetch cliente se cuelga. Mismo patrón de PR #20. |
| 5 | Ficha /explorar (chip vs URL) | NAMING-INCONSISTENTE | BLOQUEA | Chip filtro muestra "cuidado" (slug) mientras breadcrumb/landing muestra "Cuidado y Hospedaje" (nombre). User ve dos nombres distintos para el mismo filtro. |
| 6 | [components/GoogleAuthButton.tsx:47](../../components/GoogleAuthButton.tsx#L47) | UX-POBRE | CONVIENE | `alert()` nativo "Error al iniciar con Google. Verifica la configuración o intenta más tarde." — alert bloqueante + copy expone jerga técnica. |
| 7 | [components/Shared/PushNotifications.tsx:60-62](../../components/Shared/PushNotifications.tsx#L60-L62) | CATCH-MUDO | MENOR | `catch (err) { console.error('Push error', err); }` — fallo de subscribe push cae silente, ni toast ni Sentry. Impacto bajo (feature opcional). |
| 8 | [components/Servicio/SolicitarAgendamientoModal.tsx:502-504](../../components/Servicio/SolicitarAgendamientoModal.tsx#L502-L504) | CATCH-MUDO | CONVIENE | Fetch F2 disponibilidad falla → `console.error` + estado no cambia → user ve skeleton infinito del picker. Sin fallback ni retry. |
| 9 | [components/Servicio/SolicitarAgendamientoModal.tsx:450-452](../../components/Servicio/SolicitarAgendamientoModal.tsx#L450-L452) | CATCH-MUDO | CONVIENE | Idem para fetch F1 slots. Usuario abre modal, picker queda cargando sin feedback. |
| 10 | [components/Servicio/SolicitarAgendamientoModal.tsx:826,835,1006,1018,1256](../../components/Servicio/SolicitarAgendamientoModal.tsx#L820-L840) | CATCH-MUDO | MENOR | `fetch('/api/agendamientos/notify-*').catch(err => console.warn(...))` — si notify al proveedor/tutor falla, user ve "Reserva confirmada" pero la contraparte no recibe email. Sin alerta ni retry. |
| 11 | [pages/completar-registro.tsx:132,162](../../pages/completar-registro.tsx#L120-L170) | MENSAJE-GENÉRICO | CONVIENE | "Error de conexión" / "No pudimos completar tu registro. Intenta de nuevo." sin distinguir rate-limit / password-weak / email-ya-existe / network. User no sabe si reintentar sirve. |
| 12 | [pages/login.tsx:118,173](../../pages/login.tsx#L110-L180) | MENSAJE-GENÉRICO | CONVIENE | "No se pudo iniciar sesión. Inténtalo de nuevo." (L118) — colapsa credencial incorrecta, cuenta no confirmada, cuenta bloqueada, Supabase caído. "No pudimos conectar con el servidor" (L173) sin diagnóstico. |
| 13 | [pages/_offline.tsx:30](../../pages/_offline.tsx#L25-L35) | MENSAJE-GENÉRICO | MENOR | "Reintentar" sin más contexto en pantalla offline. Impacto bajo (es PWA fallback cuando hay cero red, user entiende). |
| 14 | [pages/500.tsx:14](../../pages/500.tsx#L10-L25) | MENSAJE-GENÉRICO | MENOR | "Algo salió mal" con botón Reintentar. Página 500 default de Next.js. Impacto bajo (cae raro con Sentry en prod). |
| 15 | [components/Admin/ProveedorApprovalList.tsx:71,187](../../components/Admin/ProveedorApprovalList.tsx) + [ProveedorManagementList.tsx:52](../../components/Admin/ProveedorManagementList.tsx#L50) + [EvaluacionModerationList.tsx:53](../../components/Admin/EvaluacionModerationList.tsx#L50) + [admin/evaluaciones.tsx:81](../../pages/admin/evaluaciones.tsx#L80) + [admin/servicios.tsx:91-92](../../pages/admin/servicios.tsx#L85-L95) | CATCH-MUDO + MENSAJE-GENÉRICO | MENOR | `toast.error('Error al cargar X')` — admins ven toast transient, list vacía. Impacto bajo (solo admin interno). |
| 16 | [components/Admin/FeedbackList.tsx:105](../../components/Admin/FeedbackList.tsx#L100-L110) | MENSAJE-GENÉRICO | MENOR | "No se pudo cargar el feedback" sin reintentar. Idem punto 15. |
| 17 | [pages/explorar.tsx:103,106](../../pages/explorar.tsx#L95-L110) + [pages/index.tsx:46,49](../../pages/index.tsx#L40-L55) | MENSAJE-GENÉRICO | MENOR | Suscripción al newsletter: "No pudimos guardar tu correo, intenta de nuevo" — colapsa duplicado, email mal formato, rate-limit, Resend caído. |
| 18 | [pages/forgot-password.tsx:37](../../pages/forgot-password.tsx#L30-L45) | MENSAJE-GENÉRICO | MENOR | "No se pudo enviar el correo. Intenta nuevamente." colapsa email no existe, rate-limit, Supabase Auth error. |
| 19 | [pages/reset-password.tsx:70](../../pages/reset-password.tsx#L65-L75) | MENSAJE-GENÉRICO | MENOR | "No se pudo actualizar la contraseña. El token puede haber expirado." — menciona la hipótesis más común pero sin diagnóstico real. |
| 20 | [pages/usuario/mascotas/index.tsx:228](../../pages/usuario/mascotas/index.tsx#L220-L235) | MENSAJE-GENÉRICO | CONVIENE | "No pudimos cargar tus mascotas. Recarga la página." — pide al user recargar en vez de ofrecer retry in-situ. UX subóptimo. |
| 21 | [pages/admin/notificaciones.tsx:94](../../pages/admin/notificaciones.tsx#L85-L100) | MENSAJE-GENÉRICO | MENOR | "No pudimos cargar la actividad reciente" sin retry. Admin interno. |
| 22 | [pages/proveedor/index.tsx:475,490](../../pages/proveedor/index.tsx#L470-L500) | MENSAJE-GENÉRICO | CONVIENE | "No pudimos cargar tus servicios" / "No pudimos cargar tus evaluaciones" en dashboard proveedor. Setea estado de error, pero fallback no permite distinguir network vs 500. |
| 23 | [pages/proveedor/index.tsx:2450-2525](../../pages/proveedor/index.tsx#L2450-L2525) | UX-POBRE | MENOR | `EstadoErrorCompacto` muestra tooltip "No se pudo cargar" sobre cada métrica si statsError. Patrón OK pero tooltip solo visible al hover. Impacto bajo. |
| 24 | [components/SessionTimeout.tsx:111-120](../../components/SessionTimeout.tsx#L105-L125) | UX-POBRE | MENOR | Catch no-expulsivo documentado (correcto post-fix 2026-08-25) — pero cualquier otro throw en el flow de `/security-logout` queda silencioso. Impacto bajo, está intencional. |

---

## Hallazgos con más detalle (los que requieren más contexto)

### #2 — mis-reservas: error → empty state engañoso [BLOQUEA]

```tsx
// pages/mis-reservas.tsx:120-124
if (error) {
    console.error('[mis-solicitudes] agendamientos fetch error:', error);
    setState({ kind: 'ready', agendamientos: [] });
    return;
}
```

**Síntoma para el user**: tras fetch fallido, ve "No tienes reservas" en vez de un mensaje de error.

**Impacto**: usuarios con reservas reales pueden creer que "perdieron" sus reservas durante un fallo transient de red → abandonar o enviar ticket de soporte confundidos.

**Fix propuesto**:
```tsx
if (error) {
    console.error('[mis-reservas] fetch error:', error);
    try { Sentry.captureException(error); } catch {}
    setState({ kind: 'error', message: 'No pudimos cargar tus reservas. Reintentar.' });
    return;
}
```
+ nuevo discriminated union state `'error'` + render con `EstadoError` + botón retry → `fetchSolicitudes()`.

**Esfuerzo**: 20 min + spec e2e para proteger regresión.

### #3 — mis-reservas: Cargando sin kill-switch [BLOQUEA]

```tsx
// pages/mis-reservas.tsx:347-353
if (userLoading || !router.isReady || !isAuthenticated) {
    return (<p>Cargando...</p>);
}
```

**Síntoma para el user**: si UserContext queda colgado (visto en PR #20 pan-1-def3), la pantalla queda en "Cargando..." indefinidamente.

**Impacto**: user con cookie semi-válida ve pantalla congelada en una ruta crítica (ver sus reservas). Abandono o soporte.

**Fix propuesto** (regla ya aterrizada en CLAUDE.md "Pantallas de tránsito async llevan kill-switch temporal"):
```tsx
const [timedOut, setTimedOut] = useState(false);
useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
}, []);

if ((userLoading || !router.isReady) && !timedOut) return <p>Cargando...</p>;
if ((userLoading || !isAuthenticated) && timedOut) {
    return <EstadoError titulo="Hubo un problema al cargar tu sesión" cta="Volver a /login" href="/login" />;
}
```

**Esfuerzo**: 30 min + spec e2e que bloquea Supabase Auth con Network→Request Blocking y verifica que aparece el fallback en 5s.

### #5 — Naming inconsistente "cuidado" vs "Cuidado y Hospedaje" [BLOQUEA]

**Síntoma**: en URL `/explorar?categoria=cuidado` el chip del filtro aplica "cuidado" (slug lowercase), pero en la landing `/cuidado` o en el breadcrumb de proveedor, aparece "Cuidado y Hospedaje" (nombre display).

**Fuente del conflicto**: en `categorias_servicio` el slug es `cuidado` y el nombre es `Cuidado y Hospedaje`. El renderer del chip en `/explorar` usa `categoria_slug` crudo; el breadcrumb usa `categoria_nombre`.

**Fix propuesto**: en el chip de filtro de `/explorar`, mapear `slug → nombre` usando el mismo catálogo que usa el breadcrumb (`lib/catalogoCategorias.ts` ya tiene esta info, verificar que esté siendo importado). Resultado: chip dice "Cuidado y Hospedaje" en vez de "cuidado".

**Esfuerzo**: 15 min + verificación visual.

### #10 — notify-* catch mudo (impacto cruzado tutor↔proveedor) [MENOR]

```tsx
// SolicitarAgendamientoModal.tsx:826
fetch('/api/agendamientos/notify-proveedor', {...})
  .catch(err => console.warn('[picker-estadia] notify-proveedor fallo:', err));
```

**Síntoma**: tutor confirma reserva, UI dice "Reserva confirmada", pero el proveedor NO recibe email (fetch falló silente). El proveedor se entera cuando abre la plataforma (panel refetch).

**Impacto**: coordinación demorada, no es crítico porque el panel proveedor igual muestra la reserva, pero el email recordatorio 24h antes sí dispara.

**Fix propuesto**: agregar `Sentry.captureException` dentro del catch + telemetría de envíos fallidos. No bloquear al user (correcto no interrumpir el success flow), pero sí dejar rastro para diagnóstico.

**Esfuerzo**: 15 min.

---

## 5 más prioritarios a arreglar antes del 25-11

Ranking por severidad + frecuencia + cost/benefit:

### Prioridad 1 — [#1] `/explorar` exclusión mutua error ↔ 0-resultados

**Estado**: **YA FIXEADO EN PR #125**, pendiente CI verde + merge. Rerun manual con GO del PO autorizado.

Si #125 no mergea antes del freeze (24-11 16:00 CLT), es BLOQUEANTE — debe fixearse en hotfix rápido. El fix son 4 líneas (`fetchError ? null : (...)` en el else del grid, y el botón "Cerrar" en vez de "Ver 0 resultados" cuando hay fetchError).

### Prioridad 2 — [#2] `mis-reservas` error → empty state engañoso

**Fix**: 20 min + spec. Descripción arriba.

### Prioridad 3 — [#3] `mis-reservas` Cargando sin kill-switch

**Fix**: 30 min + spec. Descripción arriba.

### Prioridad 4 — [#5] Chip "cuidado" vs breadcrumb "Cuidado y Hospedaje"

**Fix**: 15 min + verificación visual. Descripción arriba.

### Prioridad 5 — [#12] `pages/login.tsx` colapsa 4 errores en 1 mensaje

```tsx
// pages/login.tsx:118
setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
```

**Fix propuesto**: diferenciar al menos 3 casos:
- `AuthApiError` con `status: 400` + `message: "Invalid login credentials"` → "Email o contraseña incorrectos."
- `AuthApiError` con `message: "Email not confirmed"` → "Tu correo no está confirmado. Revisa tu bandeja de entrada o [reenviar email]."
- Resto (network, Supabase caído) → "No pudimos conectar. Verifica tu conexión e inténtalo de nuevo."

**Esfuerzo**: 25 min + spec con mock Supabase en 3 escenarios.

**Justificación de prioridad**: login es el gate del 100% de los user flows. Un user que recibe credenciales incorrectas pero ve "No se pudo iniciar sesión" puede pensar que el sitio está roto y abandonar. Impacto proporcional a la tasa de errores de login (típicamente 5-10% en apps nuevas).

---

## Patrón repetido (sugerencia estructural post-launch)

12 de los 24 hallazgos son variantes del mismo patrón: "catch que setea `error: true` y renderiza `<p>No pudimos cargar X</p>` + botón Reintentar". El codebase ya tiene [components/Shared/EstadoError.tsx](../../components/Shared/EstadoError.tsx) para esto, pero no todos los call sites lo usan.

**Propuesta**: sprint post-launch (~2-3h) que:
1. Migra los 12 call sites a `EstadoError` con `titulo` + `descripcion` + `onRetry` consistente.
2. Agrega variante `EstadoErrorConSentry` que loguee automáticamente a Sentry + telemetría del retry success/fail.
3. Spec e2e que inyecta error en cada superficie y verifica el fallback.

---

## Decisiones pendientes del PO

### D1. Prioridad 1 si PR #125 no mergea antes del freeze

**Pregunta**: si el rerun manual del PR #125 falla otra vez el viernes 20-11, ¿preferís (a) hotfix independiente del fix de exclusión mutua (10 min, código ya probado), (b) override P11 con documentación, o (c) seguir con el rerun?

**Recomendación del auditor**: (a). El fix son 4 líneas ya probadas en el PR actual + preview smoke verde. Aterrizarlo como PR separado sin la suite completa + reviews express. Riesgo mínimo + no bloquea el freeze.

**Impacto si no se decide**: default será pausar #125 y arrancar la mañana del lunes 24-11 con el diagnóstico — demasiado tarde contra el freeze.

### D2. Prioridad 3 (kill-switch mis-reservas) vs otras opciones

**Pregunta**: el kill-switch de 5s es una regla ya aterrizada en CLAUDE.md. Pero CLAUDE.md no obliga a aplicar la regla retroactivamente. ¿Aterrizás esto pre-25 o lo dejás como deuda post-launch?

**Recomendación del auditor**: aterrizar pre-25. El incidente del PR #20 está documentado como real; es inconsistencia visible saber de la regla y dejar la superficie sin ella. 30 min no mueve el calendario.

**Impacto si no se decide**: queda como deuda aceptada en `docs/sprints/deuda-aceptada-25-11.md`.

### D3. Sprint estructural migración a `EstadoError`

**Pregunta**: ¿agregás el sprint post-launch como ítem BACKLOG propio, o lo consolido con otro sprint de polish ya planeado?

**Recomendación del auditor**: ítem BACKLOG propio con label `MENOR` y `~3h`. Está bien aislado, no bloquea nada, y es un sprint ideal para un día tranquilo post-estabilización.

**Impacto si no se decide**: se queda como nota en este doc y se olvida. Post-lanzamiento agrego ítem al BACKLOG.

### D4. Error logging a Sentry en catches mudos (#7, #10, #15, #16, #21)

**Pregunta**: el patrón canónico sería agregar `try { Sentry.captureException(err) } catch {}` en los catches productivos que solo loguean. ¿Autorizás una pasada pre-25 para los 5-6 catches más visibles, o mejor sprint propio post-launch?

**Recomendación del auditor**: sprint propio post-launch. Sentry ya recoge todo lo que escapa a componentDidCatch via ErrorBoundary (patrón sentry-boundary PR del 2026-09-25). Lo que se pierde ahora es diagnóstico de fallos silentes de endpoints internos — útil pero no bloqueante.

**Impacto si no se decide**: default post-launch. Ventana de visibilidad limitada en primeros días es aceptable con gates ya en lugar.

---

## Firma

Este doc es registro del estado de error handling al 2026-11-19 noche, pre-freeze del lanzamiento 25-11. No implica cambios aplicados — lo que se aterrice pre-25 referenciará esta auditoría con el sprint correspondiente.
