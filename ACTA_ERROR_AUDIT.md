# ACTA — Sprint `error-audit`

**Rama**: `error-audit` (forkeada de `main` @ `def509e` post-cierre `popup-fix`).
**Estado**: **EN CURSO**. Documento vivo que se completa al cierre del sprint.
**Fecha apertura**: 2026-09-08.
**Tag final** (pendiente al cierre completo): `error-audit-prod-YYYYMMDD`.

---

## 1. Motivación

Auditoría del antipatrón "destructurar respuesta de supabase-js ignorando `.error`" — el SDK devuelve `{ data, error }` y NO lanza excepciones ante fallos de red o RLS. Callers que destructuran solo `{ data }` interpretan la ausencia de fila como "no hay resultado" en vez de "no pude preguntar". Consecuencias en producción documentadas en sprint role-degradation (2026-09-04): admin degradado a tutor silente, gates que expulsan a login por fallo de red, mentiras positivas al user.

## 2. Corrección de cifras (universo vs conteo)

**Reporte inicial (Ronda 1)**: 26 llamadas en 12 archivos.
**Realidad post-grep amplio**: **68 llamadas en 34 archivos**. Casi el triple.

**Causa del error**: el grep inicial se corrió sobre `components/*` y `pages/*.tsx` top-level solamente. No incluyó `pages/api/*`, `lib/*`, ni subrutas de `pages/`. **El conteo era del universo estrecho, no del proyecto**.

**Impacto de la subestimación**: si el sprint se hubiera priorizado con 26 en la memoria y 68 en la realidad, se subestimaba el ancho del problema. **Un 44% del código que destructura respuestas supabase-js ignora `.error`** — no es excepción, es convención rota.

**Lección operativa aterrizada en el sprint**: cuando el auditor reporta un conteo, **decir explícitamente sobre qué universo se corrió**. "26 llamadas en components + pages top-level" ≠ "26 llamadas en el proyecto". El PO priorizó basado en la primera lectura sin la aclaración de universo — el conteo se leyó como "problema del proyecto". Es la 12ª instancia del meta-patrón P8 aplicada a métricas de reporte.

## 3. Caso 5 línea 92 — `handlePhotoUpload` en `ClientLayout.tsx`

**SHA**: `f40f499`. **Aterrizado en `main`**: 2026-09-08 (post-smoke verde del PO).

### 3.1 Bug buscado (motivación del sprint)

Tutora con fallo de red en la query `usuarios_buscadores`: `esBuscador` viene null (indistinguible de "no hay fila"). El código caía al UPDATE de `proveedores` con WHERE que no matcheaba ninguna fila. PostgREST **no reporta UPDATE 0-filas como error** → `updateError` era null → toast verde "¡Foto actualizada!" mientras la BD nunca recibió el cambio. F5 → foto desaparece.

### 3.2 Bug descubierto (más grave — camino cotidiano)

Al mirar el orden de las operaciones para diseñar el fix, apareció un segundo bug **sin condiciones raras**: cada tutor que intentaba subir foto dejaba un archivo **huérfano** en el bucket `avatars`. El upload sucedía ANTES de la verificación de rol; al detectar `esBuscador` truthy, el flujo mostraba "No disponible aún" y hacía return — pero el archivo ya estaba subido. **100% reproducible en cada intento de subida de cualquier tutor** desde que existe la función. Nadie lo notó porque el user ve un mensaje razonable y se va pensando que no pasó nada.

**Reclasificación**: subestimado en la Ronda 2 como "puede corromper datos". Es de otra categoría — **escribe en bucket sin referencia desde BD**. Es data mal guardada, no una afirmación falsa como los otros 4 casos Tipo A.

### 3.3 Fix — reorden de operaciones

Un solo reorden cerró los dos bugs: query rol al principio, upload solo cuando el rol está confirmado como proveedor. Cero cambio de UI, cero cambio en los modales existentes. Comentario in-code extenso explicando POR QUÉ el orden importa + instrucción explícita al futuro dev "NO mover el upload más arriba".

### 3.4 Smoke verde en preview 2026-09-08

**Preview URL**: `https://pawnecta-landing-mvp-git-error-audit-petmatecls-projects.vercel.app` (SHA `f40f499`).

**Setup**: viewport mobile en DevTools (Device toolbar), tutora Camila logueada, ruta `/usuario/mascotas`. Bucket avatars en 1 archivo (positivo conocido: avatar de proveedor real).

- **Parte 2 (sin bloqueo)**: modal "No disponible aún". Network log muestra **2 requests totales** — preflight OPTIONS + fetch a `usuarios_buscadores`, ambos 200. **Cero requests a `storage/v1/object/avatars`**. Bucket sigue en 1.
- **Parte 1 (con bloqueo `*usuarios_buscadores*`)**: modal "No pudimos guardar la foto — Vuelve a intentar." **1 request a `usuarios_buscadores` en (blocked)**. **Cero requests a storage**. Bucket sigue en 1.

Ambas partes verificadas con conteo de archivos ANTES/DESPUÉS del gesto — cero acumulación.

### 3.5 Investigación paralela — `/usuario` redirige a `/explorar` (NO es regresión del sprint)

Durante la preparación del smoke, PO observó que `/usuario` redirigía a `/explorar` con dos cuentas distintas (tutor genérico y Camila), ya logueadas parada en `/explorar`. Hipótesis inicial del auditor: memoria del post-login. **Falso** — el auditor grepeó `router.push('/explorar')` solo dentro de `pages/usuario.tsx` y concluyó "no hay redirect".

**Realidad**: [next.config.js:206-210](next.config.js#L206-L210) tiene un redirect server-side HTTP 307:

```
{ source: '/usuario', destination: '/explorar', permanent: false }
```

Sin condiciones. Sin gate. Cualquier request a exactamente `/usuario` cae. Match exacto — NO arrastra `/usuario/mascotas`.

**Commit que lo introdujo**: `4d0f42d` (jueves 02-abr-2026, ~5 meses antes de este sprint). Mensaje: `"fix: redirect /usuario to /explorar — user panel not needed for directory"`. **Intencional**. Decisión de producto de abril: la ruta `/usuario` se retiró como destino navegacional porque el dashboard de tutor no tiene propósito en un modelo de directorio. Cero relación con `f40f499` ni con ningún trabajo del sprint.

**Lección P8 de esta ronda (13ª instancia del meta-patrón)**: **un negativo obtenido con grep de universo estrecho no descarta nada — la búsqueda debe cubrir todas las capas que pueden producir el efecto**. Grepear `router.push('/explorar')` solo en `pages/usuario.tsx` era estructuralmente insuficiente porque:

- El redirect puede vivir en capas server (next.config.js redirects/rewrites, middleware.ts, vercel.json).
- El redirect puede vivir en capas cliente globales (_app.tsx, RoleSelectionInterceptor, UserContext, cualquier useEffect que reaccione a rol o perfil).
- El redirect puede usar formas alternativas de navegación (`window.location.href`, `window.location.replace`, `router.replace`, config `redirect { destination }`).

**Regla operativa**: cuando el auditor busca un efecto observado ("URL cambia a X"), enumerar las capas donde ese efecto puede originarse ANTES del grep, y grepear cada una con su patrón específico. Si alguna capa no se cubrió, el negativo no vale como conclusión. Aplicado a la investigación posterior: grep `explorar` amplio sobre `**/*.{ts,tsx,js,mjs,json}` + lectura de `next.config.js`, `middleware.ts`, `vercel.json`, `_app.tsx`, `RoleSelectionInterceptor.tsx`, `UserContext.tsx` — encontró el redirect en 30 segundos.

Mismo antipatrón que motivó el sprint mismo (26 vs 68 llamadas). El auditor lo reprodujo en la investigación de un caso del propio sprint. Aterrizado como lección para no volver a caerlo.

### 3.6 Hallazgos colaterales de la investigación → BACKLOG

Ver `BACKLOG.md > PEDIDOS DIRECTOS DEL PO > Hallazgos colaterales del sprint error-audit`:

- (a) Archivos huérfanos en bucket `avatars` — extendido al segundo caller `pages/proveedor/index.tsx:778-809`.
- (b) Bucket `avatars` con policy SELECT amplia que permite listado.
- (c) Avatar del tutor en `ClientLayout` — mobile-only trigger que siempre termina en "No disponible aún". Decisión de producto pendiente.
- (d) Código muerto por retiro de `/usuario` (`pages/usuario.tsx`, `DashboardContent.tsx`, comentarios stale en `RoleSelectionInterceptor.tsx:29`).
- (e) Caso 6 `signup.ts:220` — server-side, no reproducible con smoke estándar.

## 4. Casos pendientes al momento de esta actualización

En orden de ejecución acordado con el PO:

- **Casos 2 + 1** (RoleGuard admin + RoleGuard proveedor): en curso al momento de este documento. Un solo commit sobre el mismo archivo (`RoleGuard.tsx`). Case 1 sin caller activo hoy (import muerto), pero se arregla por consistencia del archivo — dejar la mitad arreglada sería peor.
- **Caso 3** (`pages/admin.tsx:103`).
- **Caso 4** (`pages/login.tsx:132`).
- **Caso 5 líneas 40+51** (`ClientLayout.tsx` — `fetchClientProfile` ignora `.error`).
- **Caso 6** (`pages/api/auth/signup.ts:220`) — **NO se arregla en este sprint**, va a BACKLOG por no ser reproducible con el smoke estándar (server-side).

## 5. Metadata del tag

**Pendiente**. Se completa al cierre del sprint con todos los casos aterrizados.

---

**Estado del documento**: EN CURSO. Actualizar al aterrizar cada caso adicional.
