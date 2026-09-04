# ACTA — Sprint `role-degradation`

**Rama**: `role-degradation` (forkeada de `main` @ `b77c342` post-cierre `default-privs`).
**SHA final en `main`**: por completar tras merge FF de acta (ver §11).
**Tag**: `role-degradation-prod-20260904`.
**Fecha ejecución**: 2026-08-28 (diagnóstico) → 2026-09-04 (cierre).
**Estado**: **CERRADO** en producción. Smoke prod verde por PO 2026-09-04.

---

## 1. Lo que el sprint venía a arreglar

Descubierto durante el sprint `deadlock-fix` (2026-08-28): cuando falla la carga del perfil en `hydrateFromSession` del UserContext, el código mantenía al usuario logueado a propósito pero seteaba `profile=null` y `capabilities=GUEST_CAPABILITIES`. Consecuencia observada por el PO en vivo: el header pasó de mostrar "Admin" a mostrar "Usuario" durante el episodio del cuelgue.

**Un admin podía quedar navegando sin sus permisos, con sesión activa, y sin ningún aviso de que algo falló.** No había error, no había toast, no había nada. Ni forma automática de recuperarse: el estado quedaba pegado hasta reload manual, y el usuario no tenía forma de saber que debía recargar.

## 2. Lo que encontró en el camino, y vale más

Durante el smoke del C2 (2026-09-03), el PO reprodujo el estado bloqueando las 2 queries del hydrate con Request conditions de DevTools. Observación:

> La app me redirigió a `/completar-registro` con este texto: **"Falta un paso para activar tu cuenta. Detectamos que tienes cuenta pero no completaste tu perfil. Elige tu rol y confirma tus datos para empezar."**
>
> No es perder menús: es una pantalla que AFIRMA ALGO FALSO sobre mi cuenta y me empuja a una acción incorrecta. Si un proveedor real cae ahí por un corte de red de dos segundos, puede terminar creando datos duplicados o creyendo que perdió su cuenta.

**El bug existía desde el sprint `orphan-fix` del 2026-08-18** — vivió en producción todo ese tiempo. Cualquier proveedor real con un corte de red de 2 segundos durante el login pudo haber visto una pantalla afirmando falsamente que no tenía perfil, y ser empujado a registrarse de nuevo. **No lo introdujimos: lo hizo visible el smoke.**

## 3. La causa de fondo

Cita literal docs oficiales Supabase ([handling-errors-in-supabase-js](https://supabase.com/docs/guides/api/handling-errors-in-supabase-js)):

> "Every supabase-js call returns a `{ data, error }` pair instead of throwing. This is a key distinction — by default, supabase-js doesn't throw errors or reject promises; instead, it returns errors as part of the response object."

`UserContext.hydrateFromSession` leía `.data` e **ignoraba `.error`**. Era el **único archivo** de 15+ del proyecto fuera de esa convención (verificado por grep de `{ data, error } = await supabase`). Sin ese chequeo, un fallo de red se veía idéntico a "no hay perfil" → guard huérfano disparaba → redirect a `/completar-registro`.

Los otros 14+ archivos ya usaban el patrón correcto (`const { data, error } = await ...; if (error) ...`). No inventamos algo nuevo — restauramos la convención del propio proyecto en el archivo que estaba fuera.

## 4. El C2 no funcionó a la primera — segundo sprint seguido

**El C2 (retry in-place con backoff)** aterrizó primero como `07d3098` con la lógica del retry colgada del `catch` del try/await. En el smoke del PO (2026-09-03):

- 2 requests bloqueadas con DevTools.
- **Cero logs** `[UserContext hydrate]`.
- **Cero retries**.
- App redirigida a `/completar-registro` (el bug del §2 reproducido).

**El `catch` nunca disparó** porque `supabase-js` no throw — el retry construido sobre esa premisa era inútil. Fix aterrizado como `C2b` (`86c512a`): chequeo explícito `if (proveedorRes.error || seekerRes.error) throw err;` post-Promise.all. Con eso, el `catch` sí dispara y el retry se activa.

**Registrable como patrón meta**: es el segundo sprint seguido donde el smoke encuentra algo que la revisión de código no vio.
- Sprint anterior `default-privs` (2026-09-01): C1 con REVOKE enumerado dejó residuos TRUNCATE/REFERENCES/TRIGGER/MAINTAIN + statement con `IN SCHEMA` que era no-op silente. Solo el smoke con creación de objetos post-alter los expuso.
- Sprint actual `role-degradation` (2026-09-03): C2 con retry colgado de un catch que nunca disparaba. Solo el smoke con bloqueo Request conditions expuso que `supabase-js` no throw.

La lectura de código en ambos casos daba resultado plausible. El gesto real (crear objeto y medir grants; bloquear red y contar reintentos) reveló que la premisa estructural era otra. Es la aplicación viva del corolario P8 10ª de CLAUDE.md ("antes de aceptar un resultado, probar el método con positivo conocido"): el smoke antes-y-después con control positivo es lo que atrapa estos casos.

## 5. El hallazgo más grande queda abierto — 26 lugares en 12 files

De 329 llamadas `await supabase` en el proyecto, ~26 sitios en 12 archivos destructuran `{ data }` **sin** manejar `.error`:

| File | Sitios |
|---|---|
| `components/Servicio/ServiceDetailView.tsx` | 6 |
| `components/Client/DashboardContent.tsx` | 4 |
| `components/Client/ClientLayout.tsx` | 3 |
| `components/Admin/ConversionMetrics.tsx` | 2 |
| `components/Shared/RoleGuard.tsx` | 2 |
| `contexts/UserContext.tsx` | 2 (`refreshProfile` + `refreshProveedorRow` — NO el hydrate, ya cubierto) |
| `lib/authService.ts` | 2 (dead code confirmado en C1) |
| `components/Proveedor/CertificacionesSection.tsx` | 1 |
| `components/Service/PreguntasSection.tsx` | 1 |
| `components/Service/ReviewList.tsx` | 1 |
| `components/Shared/UnreadBadge.tsx` | 1 |
| `lib/apiAuth.ts` | **1 (`isAdmin` server-side — ver §6, marcado aparte)** |

UserContext hydrate era el más grave por impacto sistémico. Los demás son operaciones específicas con blast radius acotado a su componente. **A BACKLOG como sprint dedicado post-viaje del PO** — cada caso amerita decisión propia: retry, `.error` handling defensivo, o aceptar el comportamiento actual.

## 6. `lib/apiAuth.ts:isAdmin` — marcado aparte, fail-closed

Revisado a pedido del PO en el turno de cierre. El código:

```typescript
export async function isAdmin(userId: string): Promise<boolean> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
        .from('proveedores')
        .select('roles, estado')
        .eq('auth_user_id', userId)
        .maybeSingle();
    if (!data) return false;
    ...
}
```

**Sí ignora `.error`** (mismo patrón que UserContext pre-sprint). Pero el modo de falla es distinto:

**Análisis del flujo con error**: query falla (red, PostgREST, RLS glitch) → `.error` viene, `.data === null` → código ignora `.error` → `if (!data) return false` → retorna `false` → endpoint que gatea con `isAdmin(userId)` rechaza con 401/403 → admin real recibe error espurio.

**Es fail-CLOSED, no fail-open**:
- Con error → devuelve `false` → admin real tratado como no-admin (permisos cerrados).
- **NO existe camino donde un no-admin sea tratado como admin por este bug**. El error solo cierra permisos, nunca los abre.
- Cero riesgo de escalación de privilegios. Cero data breach.

**Diferencia con UserContext hydrate** (el que sí arreglamos):
- UserContext ignorando error → guard huérfano dispara → redirect a `/completar-registro` → **afirma algo falso** sobre la cuenta + navegación sticky. Es misinformación activa + acción.
- isAdmin ignorando error → devuelve `false` → endpoint 401 → **no afirma nada falso**, solo rechaza. El admin ve el error, entiende que falló, puede reintentar.

**Recomendación aterrizada**: NO sale del BACKLOG a P0. Va en el sprint dedicado de auditoría .error como **P2** (por encima de los otros 25 que son P3), con la nota "fail-closed, no es escalación de privilegios". Sprint futuro empieza por acá — mismo riesgo estructural pero con la tranquilidad de que si aparece en prod, el peor caso es UX molesta, no incidente de seguridad.

## 7. Dead code eliminado — capabilities

En C1 se removió el sistema entero de `capabilities` del UserContext (state + interface + `GUEST_CAPABILITIES` + `deriveCapabilities()` + 4 `setCapabilities` + field del value). Verificado sin consumidores por 3 vías:

- **(a)** Grep `capabilities` en `**/*.{ts,tsx}` = 1 solo file (UserContext mismo).
- **(b)** Grep `UserCapabilities|GUEST_CAPABILITIES|canBook|...` = 2 files (UserContext + `lib/authService.ts`). Ambos DEFINEN, ninguno IMPORTA del otro.
- **(c)** Grep destructuring de `useUser()` = 20 sitios enumerados. Cero destructura `capabilities`.

**`lib/authService.ts` completo es dead code por relación** (duplica lo mismo sin consumidor). Anotable a BACKLOG como sprint chico separado.

## 8. Pedidos del PO revisados durante el sprint

**Ajuste B del smoke C3 (bajar el toast que tapaba título en /explorar) — RETIRADO**. Del PO en turno de cierre:

> "El toast sigue tapando parte del título, pero es un toast — siempre va a superponerse a algo, para eso está. Y el título vuelve apenas se cierra o se va solo. Mi pedido anterior de bajarlo fue innecesario."

El ajuste alcanzó a aterrizar en C4 (`304c897`) como `offset={80}` en el Toaster global. El PO ratificó post-hoc que no era necesario pero decidió mantenerlo (efecto positivo secundario aunque el motivo original no aplicara). Anotable como caso: pedido → revisado → retirado, con el mecanismo aterrizado igual por bajo costo.

## 9. Sentry sin verificación empírica en este sprint

El C4 (`304c897`) agregó `Sentry.addBreadcrumb` por attempt fallido + `Sentry.captureMessage` al exhausted con tag `role_degradation:true` (filtrable en dashboard prod). **No se verificó empíricamente en este sprint**. Motivo del PO en el turno de cierre:

> "Está gateado a producción, y reproducir el agotamiento en prod con mi sesión real es incómodo. Lo damos por correcto por revisión de código y lo confirmamos cuando aparezca el primer evento real, que es justamente lo que el commit viene a medir."

**Registrado como no-verificado, no maquillado como verde**. La confirmación empírica llegará con el primer evento real que agote reintentos en producción — evento que aparecerá en el dashboard Sentry con el tag `role_degradation:true` + los contextos configurados (`attempts_total`, `last_error`, `error_name`, `user_id_masked`, `route`).

Riesgo residual: si el captureMessage no aterrizara correctamente (envío async buffered — precedente Sentry-flush del sprint sentry-1 de 2026-08-11), el primer evento real se perdería silente y no lo sabríamos hasta que un caso más grave se acumulara. Mitigable con `Sentry.flush()` explícito post-captureMessage — no aplicado en este sprint por ser client-side (menos crítico que server-side donde la función termina). Anotable para revisión si el dashboard sigue mostrando cero eventos después de tiempo razonable.

## 10. Toast duplicado detectado durante el smoke de cierre — falsa alarma bien resuelta

Durante el smoke visual final en `/proveedor`, el PO observó **dos toasts saliendo por una sola acción** al pausar/activar un servicio: uno verde con check verde arriba, uno blanco con check negro abajo. Ambas variantes distintas, mismo patrón en "Servicio pausado" y "Servicio activado".

**Hipótesis inicial**: regresión del sprint (posiblemente por los ajustes UI del Toaster en C4 — `offset={80}` + `closeButton` overrides).

**Método de descarte**: el PO reprodujo el fenómeno en **producción `www.pawnecta.com/proveedor`** (donde el código del sprint aún NO estaba desplegado). Los 2 toasts salieron igual, con las mismas 2 variantes. Bug **preexistente** al sprint, no introducido por él.

**Registro del método**: la falsa alarma se descartó ejerciendo el gesto en un entorno donde el código sospechoso no estaba. Es la aplicación del corolario P8 10ª aplicada a diagnóstico: antes de aceptar "esto es una regresión de mi sprint", verificar contra un entorno de control donde el sprint no aplica. Si el fenómeno aparece igual, el sprint no es la causa. **Toma 30 segundos y elimina el falso positivo**. El método vale más que el bug — es replicable para cualquier futura sospecha de regresión durante smoke de cierre.

Bug preexistente anotado a BACKLOG en este mismo commit (§11) con lo que se sabe: 2 toasts distintos por acción única en el toggle activar/pausar del panel de proveedor, hipótesis viva "caller llama a `toast()` dos veces" a verificar cuando se abra.

## 11. Verificación en producción — smoke visual del PO

Smokes ejecutados por PO 2026-09-04 contra `www.pawnecta.com`:

- ✅ Header dice "Admin".
- ✅ Panel de proveedor carga con sus servicios.
- ✅ `/explorar` carga con 9 resultados.
- ✅ Cero toast espurio en condiciones normales — `HydrationToast` no aparece cuando no hay fallo.
- ✅ Sprint anterior (C4 en preview `304c897`): consola limpia (cero logs `[UserContext hydrate]`, cero console.error), ajustes A/B aplicados, móvil 400px verificado (toast entra completo, no choca con Header ni CookieBanner).

**Dato del acta**: `/explorar` de producción ya tiene **9 servicios de proveedores reales** (anllely letelier de Pudahuel, Constanza de Santiago, Eduardo de Las Condes, entre otros). El sitio tiene contenido de terceros creciendo — el fix del sprint aplica a gente real, no solo a cuentas de prueba. Un proveedor orgánico con corte de red de 2s durante login ya no ve la pantalla afirmando falsamente que "no completaste tu perfil".

## 12. Deuda anotada al cierre

Migrada a `BACKLOG.md` en este commit:

- **Auditoría de callers `.data` sin `.error`** — sprint dedicado post-viaje del PO. 26 lugares en 12 files. Con `lib/apiAuth.ts:isAdmin` marcado **P2** aparte (fail-closed, no seguridad).
- **`lib/authService.ts` completo es dead code** — duplica `capabilities` sin consumidor. Sprint chico separado.
- **`SessionTimeout.tsx:104`** — mismo patrón silente (catch NO expulsivo intencional que también es silente — si `getSession()` falla ahí, el guard de inactividad queda inservible para esa sesión y nadie se entera).
- **Toast duplicado en `/proveedor` toggle activar/pausar** — bug preexistente detectado en smoke de cierre. 2 toasts distintos por acción única. Hipótesis viva "caller llama a `toast()` dos veces" a verificar al abrir. Revisar si pasa en otros toasts del sitio.
- **Mapa en modo degradado por falta de API key** (PRIORIDAD ALTA) — pedido PO 2026-09-04. Marca de agua "API KEY REQUIRED" + link `carto.com/basemaps/apikey` en fondo del mapa en `/proveedor/*`. Anotado en `PEDIDOS DIRECTOS DEL PO`.
- **Ubicación legible del proveedor en perfil** (PRIORIDAD MEDIA) — pedido PO 2026-09-04. Mostrar `comuna` + `region` (columnas ya existentes en `proveedores`) en el bloque Ubicación. Anotado en `PEDIDOS DIRECTOS DEL PO`.

## 13. Metadata del tag

- **Tag anotado**: `role-degradation-prod-20260904`
- **Apunta a**: (SHA del commit final tras merge FF + este acta — completar tras push)
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/role-degradation-prod-20260904`): completar
- **Fecha del commit apuntado**: completar

Fechas separadas por regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

---

**Cierre**: sprint 100% ejecutado, en prod, smokes verdes, docs actualizadas, deuda anotada. El próximo sprint queda en cancha del PO — el auditor no arranca nada.
