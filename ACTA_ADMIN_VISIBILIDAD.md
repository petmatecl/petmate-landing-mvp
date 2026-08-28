# ACTA — Sprint `admin-visibilidad`

- **Rama**: `admin-visibilidad` (17 chars, subdominio preview DNS-safe).
- **SHA de prod**: `979e693ab547493ec3f36e950d6c2ba4a227ce33` (short `979e693`).
- **Tag anotado**: `admin-visibilidad-prod-20260827` → apunta a `979e693`. Tag object `479e531b25fa44c6ad5ba45e1e8c205d227f35a4`.
- **Fecha creación del tag**: `2026-08-28 10:33:38 -0400` (regla proyecto: fecha del tag ≠ fecha del commit apuntado; extraída con `git for-each-ref --format='%(creatordate:iso)'`).
- **Estado**: **CERRADO**. Migración BD aplicada en prod, código en `main`, tag pusheado, smokes prod verdes.
- **Restricción de alcance respetada**: visibilidad + copy. Cero acciones sobre proveedores. Cero gestión de estados de feedback (leer sí, cambiar `estado` o escribir `notas_admin` va a sprint aparte).

---

## 1. Motivación

Tres pedidos del PO, unificados en un solo sprint por lógica de producto ("van juntas o no van" — cambiar copy para invitar feedback sin poder leerlo sería el patrón "sala de espera / pantalla afirma causa no verificada" que se venía desarmando la semana previa).

- **P1** — `/admin` → tab Proveedores mostraba "N/A" en la columna Contacto para todos, incluida la propia cuenta admin. También "N/A" en comuna. RUT era esperable (opcional, F1b pendiente). Correo y comuna no.
- **P2** — Widget de feedback (`components/Shared/FeedbackWidget.tsx`) escribía correctamente en `feedback_submissions`, pero cero superficie admin lo leía. Patrón "infraestructura sin superficie" — tabla + RLS + trigger completos desde `20260508` sin UI hasta este sprint.
- **P3** — Franja lanzamiento del Header decía "Estamos en lanzamiento — Regístrate como proveedor" a todo guest, incluidos tutores que hoy no pueden buscar nada (cero servicios de terceros publicables al momento). Copy contradice el estado real del producto ("estamos construyendo", no "lanzamos").

Contexto operativo: primer proveedor real orgánico (Juan Bou, 2026-08-27 15:18) llegó sin campaña y completó signup + confirmación + auto-aprobación. Primera evidencia empírica del funnel funcionando para tercero real. Aumenta relevancia de tener visibilidad admin operativa.

---

## 2. Contenido del sprint (5 commits)

| # | SHA | Título |
|---|---|---|
| 1 | `c0838e3` | feat: email real proveedores + tab feedback + copy franja |
| 2 | `14c6c62` | fix: RPC V2 sin columnas fantasma + 4 columnas nuevas por pedido PO |
| 3 | `589d107` | feat: subtítulo Feedback contextual + copy sesión/permisos anotado en BACKLOG |
| 4 | `41c5637` | docs: diagnóstico correcto copy expiración + hallazgo header sesión activa |
| 5 | `979e693` | docs: REVOKE FROM anon explícito en migration + deuda default privileges prod |

### P1 · Contacto admin — email real + copiar + badge confirmación

**Diagnóstico**: `proveedores.email_publico` (opcional, 0/N poblado en staging y prod) leído por el panel; email real vive en `auth.users.email` que PostgREST NO expone al rol `authenticated` (schema fuera de `db-schemas`). Bloqueo estructural, no olvido.

**Solución**: RPC `security definer` `admin_listar_proveedores()` gateado por `is_admin()` en el primer statement (`RAISE EXCEPTION` antes de tocar data). Patrón dominante del proyecto (24 funciones security definer preexistentes).

**Archivos**:
- `migrations/20260827_admin_listar_proveedores_rpc.sql` (nuevo) — RPC + REVOKE + GRANT.
- `components/Admin/ProveedorManagementList.tsx` (editado) — `supabase.rpc('admin_listar_proveedores')` reemplaza al `.from('proveedores').select(...)`, botón Copiar (Lucide `Copy`), badges "Confirmado" verde / "Sin confirmar — no puede entrar" ámbar, teléfono + WhatsApp con iconos `Phone` / `MessageCircle` y copiar propio, indicador "Perfil completo" (`UserCheck` verde) / "Perfil incompleto" (slate gris).

**Nota fuera del repo**: comuna del admin (`canocortes@gmail.com`) en prod era `NULL` — no era bug, era dato faltante en esa fila específica (verificado staging 22/23 pobladas). UPDATE manual entregado al PO en el turno correspondiente.

### P2 · Vista de feedback en `/admin` (lectura)

**Archivos**:
- `components/Admin/FeedbackList.tsx` (nuevo) — query directa `.from('feedback_submissions').select('*').order created_at DESC`. Cero RPC nuevo — RLS `feedback_submissions_select_admin USING (is_admin())` preexistente ya autorizaba. Filtros por estado + categoría + búsqueda texto en mensaje. Empty state amigable.
- `pages/admin.tsx` (editado) — import dinámico `FeedbackList`, `feedbackNuevosCount` HEAD count sobre `estado='nuevo'` (mismo patrón que `aprobacionesPendientesCount`), tab type extendido con `badge?: number` opcional (pill accent-600 desktop + mobile, "99+" cap), nuevo tab con `MessageSquareText` (elección explícita PO: no `MessageSquareWarning`, feedback no es todo problema y warning sesga la lectura antes de abrir). Subtítulo contextual por `activeTab === 'feedback'` → "Sugerencias y reportes enviados por usuarios del sitio." (resto de tabs mantiene el genérico histórico).

### P3 · Copy franja + dispatch programático del widget

**Copy nuevo** aprobado PO:
> "Estamos construyendo Pawnecta. **Regístrate** y **cuéntanos** qué te gustaría encontrar."

**Archivos**:
- `contexts/FeedbackContext.tsx` (nuevo) — `FeedbackProvider` + hook `useFeedback()` → `{ isOpen, open, close }`. Idiomático React con `useCallback` + `useMemo`.
- `pages/_app.tsx` (editado) — wrap del árbol con `<FeedbackProvider>`.
- `components/Shared/FeedbackWidget.tsx` (editado) — `useState(false)` local reemplazado por `useFeedback()`. Cero cambio a la UI del widget.
- `components/Header.tsx` (editado) — copy nuevo con 2 CTAs: "Regístrate" → `<Link href="/register">` **sin `?rol=proveedor`** (decisión PO: si el copy invita a ambos, el destino tiene que hacer exactamente eso — el wizard de `/register` tiene selector de rol); "cuéntanos" → `<button onClick={openFeedback}>` (sin `href`, sin `<Link>` — es acción, no navegación).

---

## 3. Query (A) — verificación empírica del gate en ambos entornos

```sql
SELECT p.proname,
       p.prosecdef                                              AS security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_call,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_can_call
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='admin_listar_proveedores';
```

### Staging (`jmtadvdkicyylcwjcmcl`)

| security_definer | auth_can_call | anon_can_call |
|---|---|---|
| `true` | `true` | `FALSE` |

Con un solo Run del bloque completo (`DROP + CREATE + REVOKE FROM PUBLIC + GRANT`). Sin necesidad de `REVOKE FROM anon` explícito — staging NO tiene default privileges que otorguen EXECUTE a anon.

### Prod (`ouezpeeiwjwawauidrqq`)

| security_definer | auth_can_call | anon_can_call |
|---|---|---|
| `true` | `true` | `FALSE` (post-fix) |

`proacl` post-fix: `{postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}`. Requirió **`REVOKE ALL ON FUNCTION ... FROM anon;` explícito** — ver "Hallazgo default privileges" abajo.

---

## 4. Smokes prod verdes (6, sobre `main @ 979e693` con Production Ready)

Corridos por el PO 2026-08-28. Todos verdes.

| # | Smoke | Resultado |
|---|---|---|
| 1 | Emails reales de `auth.users` en columna Contacto + badges verde/ámbar con datos reales | OK |
| 2 | Botón Copiar (`Copy` Lucide) → clipboard + toast "Correo copiado" | OK |
| 3 | Filas huérfanas ("Sin cuenta en auth") en prod — proveedor con `auth_user_id IS NULL` | CERO — solo semillas con LEFT JOIN retornando NULL, no huérfanos |
| 4 | Teléfono/WhatsApp visibles en Eduardo Cano con iconos `Phone` / `MessageCircle` + Copiar. Badges Perfil completo (verde) / Perfil incompleto (gris) ambos visibles | OK |
| 5 | RUT: Fernanda Hamasaki renderiza `21.894.323-3`. 7 proveedores lo tienen cargado. Reporte inicial PO de "RUT: N/A en todos" fue por ausencia de dato en esas filas puntuales, no bug del panel | OK |
| 6 | Subtítulo contextual `activeTab === 'feedback'` + copy franja superior nueva con 2 CTAs | OK |

**Control positivo de seguridad** (verificado en staging, no re-corrido en prod): `petmatecl+el1@gmail.com` (proveedor no-admin sin membership admin, verificado empíricamente contra `pg_auth_members`) rebota de `/admin` a login form inline "Acceso restringido". `acanocts@gmail.com` (admin) entra sin problema. Gate discrimina por rol.

---

## 5. Hallazgo default privileges divergentes staging vs prod (post-mortem, PRIORIDAD ALTA)

Durante el apply prod del bloque SQL, el PO detectó que `anon_can_call` daba `TRUE` incluso después del `REVOKE ALL ... FROM PUBLIC`. Investigación empírica en 7 pasos identificó la causa raíz. Dos hipótesis previas del auditor quedaron refutadas por evidencia:

1. **"REVOKE no toma junto al CREATE"** (auditor V1) — refutada por PO con evidencia.
2. **"El bloque entero funciona"** (auditor V2 correctiva) — refutada también por PO: casualmente inofensiva en staging por config divergente entre entornos, incorrecta en prod.

### Las 7 evidencias del PO (orden cronológico)

1. Bloque completo con un solo Run → `anon_can_call = TRUE`.
2. `REVOKE ALL ... FROM PUBLIC` aparte → sigue en `TRUE`.
3. `SELECT proacl FROM pg_proc WHERE proname='admin_listar_proveedores'` → el privilegio estaba como `anon=X/postgres` **DIRECTO en la función**, no vía PUBLIC. `proacl = {postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres, anon=X/postgres}`.
4. `SELECT * FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname='anon')` → CERO filas. `anon` NO es miembro de `authenticated` — descartada esa hipótesis.
5. `SELECT * FROM pg_default_acl WHERE defaclnamespace = 'public'::regnamespace` → el schema `public` en prod tiene **DEFAULT PRIVILEGES que otorgan EXECUTE a `anon` sobre toda función nueva**. Se aplican en el momento del `CREATE FUNCTION`.
6. **Control positivo (P8)**: `has_function_privilege('anon', 'public.is_admin()', 'EXECUTE')` → también `TRUE` en prod. Confirma que el hallazgo es sistémico del schema, no del RPC nuevo.
7. **Fix inmediato**: `REVOKE ALL ON FUNCTION public.admin_listar_proveedores() FROM anon;` — corrió limpio, `anon_can_call = FALSE`.

Migración actualizada en commit `979e693` con `REVOKE FROM anon` explícito después del `REVOKE FROM PUBLIC` — bloque queda correcto para cualquier re-apply futuro.

**Deuda estructural anotada en BACKLOG con prioridad ALTA (bloqueante pre-lanzamiento)**: auditoría `pg_default_acl` prod + `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon` + auditoría de funciones preexistentes con `EXECUTE` a anon. Costo grueso ~2-3 horas.

**Candidato a regla operativa CLAUDE.md** (redacción final la cierra PO): verificar un privilegio con `has_function_privilege` no alcanza para saber DE DÓNDE viene ese privilegio. Ante un resultado inesperado, leer `pg_proc.proacl` + `pg_auth_members` + `pg_default_acl` **antes** de proponer un fix. En este sprint hubo 2 REVOKE al rol equivocado antes de mirar el ACL — pérdida de tiempo evitable con la query correcta al principio.

---

## 6. Hallazgo abierto — cuelgue intermitente de carga (NO investigado, sprint propio próximo)

**IMPORTANTE — hallazgo NO resuelto**, detectado por PO durante smokes prod del sprint pero **preexistente** (no introducido por este sprint):

**Síntoma**:
- Página queda en spinner indefinido, **más de 60 segundos**, sin toast de error, sin nada en consola.
- Se destraba **solo con Ctrl+Shift+R** (hard refresh).
- Ocurre en **PROD y STAGING** — no es específico de un entorno.
- Ocurre en **múltiples rutas**: `/admin`, explorar servicios, ficha de proveedor. **No es específico del panel admin** — el cambio del sprint admin-visibilidad NO es el causante.
- Frecuencia: **"seguido" según el PO**, sin disparador claro identificado.

**Evidencia que descarta al RPC nuevo `admin_listar_proveedores`**:
- Cuando finalmente carga, Network muestra `admin_listar_proveedores` con **status 200 en 81 ms, 2.7 kB** — la llamada RPC es sana.
- En el mismo trace: **"Finish: 5.91 s" con timeline extendido a 80.000 ms** — hay algo colgando fuera de la RPC.

**Hipótesis SIN CONFIRMAR (explícitamente marcada por el PO como no darse por buena)**:
- **Service Worker en juego**: `StrategyHandler.js` aparece como `initiator` de múltiples requests en el trace observado por el PO. Sería consistente con que el hard refresh destrabe. Pero es hipótesis — el patrón puede tener otros mecanismos consistentes con la misma sintomatología.

**Datos faltantes para confirmar/refutar hipótesis SW**:
- Captura de **DevTools > Application > Service Workers durante un cuelgue** (no post-mortem — con el cuelgue activo).
- Captura de **Network con "Preserve log" durante el cuelgue** — para ver requests pending y desde qué initiator.
- **Repro controlado con timestamps** — anotar hora exacta del cuelgue, ruta, si venía de navegación previa o aterrizaje directo.

**Estado**: **anotado en BACKLOG con prioridad ALTA, por encima de session-timeout-fix**. Sprint propio próximo — el PO abre y manda prompt de investigación separado.

---

## 7. Otros hallazgos aterrizados al BACKLOG durante el sprint

- **Copy "sesión expiró" mostrado a personas que nunca tuvieron sesión** (PRIORIDAD MEDIA) — el mensaje del banner de login se dispara para guests que entran directo a rutas protegidas, cuando nunca tuvieron sesión. Misma familia del patrón "pantalla afirma causa no verificada". Fix ~30-45 min (UserContext L328-333 solo dispara `?reason=expired` si hubo user poblado que se cerró). Hipótesis inicial del auditor (rebote de no-admin) refutada por PO con repro empírico paso a paso.
- **Header con sesión activa en pantalla "Acceso restringido" de `/admin`** — piggyback natural del fix del copy o standalone ~15 min.
- **Vista unificada de personas en `/admin`** (PRIORIDAD ALTA) — preferencia PO explícita: proveedores + tutores con filtro por rol, no dos listas separadas. El RPC de este sprint no se puede extender trivialmente (shape específico proveedor). Sprint propio post-launch ~4-6h.
- **Paginación de `FeedbackList`** (PRIORIDAD BAJA) — cuando supere ~50 filas. Hoy 0.
- **Dos listas de proveedores duplicadas** (`ProveedorManagementList` canónico vs `pages/admin/proveedores.tsx` fork 652 líneas) — se resuelve solo si se aterriza la vista unificada de personas.
- **Scroll no vuelve al tope al cambiar de tab en `/admin`** (BAJA) — fix ~10 min con `useEffect [activeTab]` + `window.scrollTo(0,0)`.
- **Primer proveedor real orgánico Juan Bou** (2026-08-27 15:18, confirmó correo 17s después, aprobado automático) — anotado como dato de valor, cero acción hoy.
- **Patrón "infraestructura sin superficie"** — reconocido durante P2. `feedback_submissions` es el caso canónico (tabla + RLS + trigger desde `20260508` sin UI hasta este sprint). Regla candidata para CLAUDE.md pendiente decisión PO.

---

## 8. Evidencia P5 completa (por fase)

- **Ramas**: `admin-visibilidad` (17 chars, DNS-safe). Rama previa `admin-contacto` descartada (virgen, sin commits).
- **Commits del sprint**: 5 (ver tabla en §2).
- **Migración BD**:
  - Staging: aplicada durante smokes por PO 2026-08-27 con un solo Run del bloque original (`REVOKE FROM PUBLIC` alcanzó por ausencia de default privileges).
  - Prod: aplicada por PO 2026-08-27 con bloque original + fix inmediato del `REVOKE FROM anon` en corrida siguiente. Migración archivo repo actualizada en commit `979e693` con ambos REVOKE — cualquier re-apply futuro ya trae la corrección.
- **Merge**: FF de `admin-visibilidad` (`979e693`) → `main`. `origin/main` remoto post-push = `979e693`, verificado empíricamente con `git ls-remote origin refs/heads/main`.
- **Tag**: `admin-visibilidad-prod-20260827` (anotado) → apunta a `979e693`.
  - Tag object: `479e531b25fa44c6ad5ba45e1e8c205d227f35a4`.
  - Fecha del tag: `2026-08-28 10:33:38 -0400` (extraída con `git for-each-ref --format='%(creatordate:iso)'`, no confundida con la fecha del commit).
  - `git rev-parse admin-visibilidad-prod-20260827^{commit}` = `979e693ab547493ec3f36e950d6c2ba4a227ce33` — desreferencia correcta.
  - Push remoto verificado: `git ls-remote origin refs/tags/admin-visibilidad-prod-20260827` = tag object idéntico.
- **Vercel prod**: Ready confirmado por PO en dashboard sobre `main @ 979e693` antes de smokes.
