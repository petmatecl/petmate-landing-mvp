# ACTA Sprint badge-f1 (rama `badge-f1`)

**Rama**: `badge-f1` (forkeada de `main @ 0d40d5e`, 2026-08-18).
**SHAs**: `c6b0263` (F1 puro: auto-aprobación + gate opcional + modal + tab admin) → `d0cffb2` (merge `main` que trajo H3 orphan-fix + 13 fixes de copy + scroll + full-nav; resolvió conflict en `VerificationGateModal.tsx`).
**Tag prod**: `badge-f1-prod-20260820` sobre `main @ d0cffb2`, creado **2026-08-20 11:51:11 -0400** (verificado con `git for-each-ref --format='%(creatordate:iso)' refs/tags/badge-f1-prod-20260820` — NO usar `git log --format=%ci -1 <tag>` que devuelve la fecha del commit apuntado, no del tag; ver aditamento CLAUDE.md).
**Fecha ejecución**: sprint 2026-08-18, deploy prod 2026-08-20 (11:51 CLT), smokes prod 2026-08-20 (14:53–15:20 CLT).
**Estado**: **PROMOVIDO A PROD** — verificación de identidad pasa de bloqueante a badge opcional. Migración prod ejecutada por Aldo 2026-08-18 (7 legacy pendientes → aprobado).

---

## 1. Alcance ejecutado

Sprint originado por decisión producto del PO (2026-08-18) tras diagnóstico de embudo: **7 proveedores en `estado='pendiente'` con `verificacion_estado='sin_enviar'`, algunos con hasta 135 días de inactividad**. Análisis del auditor mostró que la fuga estructural era el gate del botón "Publicar servicio" en `pages/proveedor/index.tsx:229` — una guarda de UI que exigía carnet aprobado antes de publicar cualquier servicio. F1 cambia el modelo:

- El registro es auto-aprobado. Sin intervención del admin.
- Verificar identidad pasa a ser incentivo (badge en la ficha), no requisito para publicar.
- El admin verifica el carnet cuando quiere; el badge aparece cuando lo aprueba.
- Los 7 legacy salen del limbo por migration retroactiva.

Con este cambio el vector spam se abre (correo válido ya alcanza para publicar), pero la contención vive en H3 orphan-fix (guard estructural sesión-sin-perfil) + salvaguardas S1+S2+S3 (backlog post-F1) y el propio badge que segmenta confianza.

---

## 2. Ejecución por fase (P5)

### Fase A — Auto-aprobación en signup + gate opcional + modal invitación + tab admin (SHA `c6b0263`)

**Modificados** (5 archivos):

- [pages/api/auth/signup.ts](pages/api/auth/signup.ts#L140-L160) — post-RPC `registrar_proveedor`, UPDATE inmediato a `estado='aprobado', aprobado_at=NOW(), aprobado_por=NULL`. El default del RPC insertaba `pendiente`; el UPDATE en el mismo try/catch inmediatamente después lo mueve a `aprobado` server-side con service_role. `verificacion_estado` sigue `sin_enviar` — es el eje independiente del badge. `aprobado_por=NULL` distingue auto-aprobación de la humana histórica.

- [pages/proveedor/index.tsx](pages/proveedor/index.tsx#L228-L239) — `handlePublishClick` pierde el `if (verificacionEstado !== 'aprobado') { setShowVerificationGate(true); return; }`. El botón abre `ServiceFormModal` directo. Se agrega **CTA sidebar "Verificar identidad"** (visible cuando `sin_enviar` o `rechazado`, accent-50 con ShieldCheck icon) — trigger manual del modal invitación. Se agrega **auto-abrir 1 vez por proveedor** con marker `localStorage['pawnecta.proveedor.verifPromptShown.<proveedor.id>']` — descartar con "Más tarde" persiste cross-session (verificado en smoke S5).

- [components/Proveedor/VerificationGateModal.tsx](components/Proveedor/VerificationGateModal.tsx) — copy `sin_enviar` reescrito de bloqueante ("Verifica tu identidad para publicar") a invitación descartable ("Verifica tu identidad y gana el badge"). Botón secundario cambia de "Cancelar" a "Más tarde" solo para `sin_enviar`. Copy `pendiente` acepta el nuevo mensaje del sprint orphan-fix ("puedes seguir publicando servicios y recibiendo consultas normalmente" — conflict resuelto en el merge de la Fase B).

- [pages/admin.tsx](pages/admin.tsx#L43-L62) — fetch count al mount de `isAdmin=true` sobre `proveedores WHERE estado='pendiente' AND (es_ejemplo=false OR es_ejemplo IS NULL)`. Guarda en `aprobacionesPendientesCount`. Tab "Aprobaciones" se oculta con `aprobacionesPendientesCount === 0`. Guard adicional: si `activeTab === 'aprobaciones'` y count llega a 0, cae a `dashboard` para no dejar contenido colgando.

**Migration para los 7 legacy**: [migrations/20260818_auto_aprobar_7_pendientes.sql](migrations/20260818_auto_aprobar_7_pendientes.sql) — UPDATE los 7 pendientes actuales a `estado='aprobado'` con `RETURNING` + DO $$ de verificación embebida (test negativo P8 5ª: valida que las 2 cuentas Admin Pawnecta no fueron tocadas por error del filtro). Bloque único BEGIN/COMMIT (corolario P8 6ª). **Ejecución manual Aldo en Studio Prod 2026-08-18** — falló primero con `ERROR 42501: proveedores.estado can only be changed by admin or service role`, resuelto con `SET LOCAL role = 'service_role';` dentro de la transacción. Los 7 aterrizaron: Veronica Gonzalez, Fernanda Hamasaki, Laura Marlenet Criado, Francisca Polette Orellana, Nicole Novion, Isidora Maciel, Ignacia Mellado. Post-migration: `pendientes_restantes: 0` para no-ejemplo.

**Documentación**: nueva sección [CLAUDE.md > Roles de usuario > Ejes independientes: estado vs verificacion_estado](CLAUDE.md) — documenta que `estado`=cuenta activa/suspendida (eje moderación) y `verificacion_estado`=identidad verificada (eje badge). Regla explícita: nunca inferir una de otra.

### Fase B — Merge `main` con H3 orphan-fix + 13 fixes de copy + scroll + full-nav (SHA `d0cffb2`)

Cuando `orphan-fix @ ef1413a` aterrizó en `main`, `badge-f1` estaba rezagada. Merge `main → badge-f1` para heredar toda la infraestructura de rescate + copy corregido antes de promover F1. Un conflict resuelto:

- [components/Proveedor/VerificationGateModal.tsx](components/Proveedor/VerificationGateModal.tsx) — HEAD (badge-f1) decía "puedes seguir publicando" (correcto post-F1, gate quitado); main (orphan-fix) decía "no puedes publicar" (correcto pre-F1 con gate vivo). Resuelto tomando HEAD porque F1 es lo que aterriza — comentario in-line documenta la razón para trazabilidad.

Build P1.1 exit 0 post-merge. Cero warnings SDK (@supabase, @sentry, resend, next-pwa). Bundle rutas críticas post-F1:

| Ruta | Tamaño |
|---|---|
| `/proveedor` | 43.4 kB (+200B por CTA sidebar) |
| `/admin` | 8.38 kB (con tab dinámico) |
| `/completar-registro` | 3.11 kB (heredado H3) |
| `/register` | 7.55 kB (heredado con scroll + validación) |
| `/api/auth/complete-registration` | endpoint API |

### Fase C — Merge FF `badge-f1 → main` + tag + deploy prod (2026-08-20 11:51 CLT)

Pre-merge checks:
- SHA `badge-f1` local + remoto en `d0cffb28d611ee7a9b5c720f7a13866106f8ee74` — mismo que había pasado los smokes en preview.
- `git merge-base --is-ancestor origin/main badge-f1` → OK, FF posible.
- 2 commits que main hereda: `c6b0263` (F1 puro) + `d0cffb2` (merge inverso).

Ejecución:
```bash
git checkout main
git merge --ff-only badge-f1
git tag -a badge-f1-prod-20260820 -m "..."
git push origin main
git push origin badge-f1-prod-20260820
```

Post-push:
- `origin/main` = `d0cffb28d611ee7a9b5c720f7a13866106f8ee74` ✓
- Tag `badge-f1-prod-20260820` = `3fc97a9ee9176f92101b87705d38069c2fca4cef` ✓ creado 2026-08-20 11:51:11 -0400.
- Vercel deploy prod auto-disparado por push a main.

---

## 3. Smokes prod (2026-08-20, 14:53–15:20 CLT)

**S1 — Home + Explorar públicos**: PASA. `www.pawnecta.com` y `/explorar` cargan sin login. `SELECT COUNT(*) FROM servicios_publicados` → 4, y 4 cards en pantalla. Sin regresión visual, cero 5xx.

**S2 — Login admin prod**: PASA. Cuenta admin prod identificada vía query (P8 antídoto: método verificado, no inferido): `canocortes@gmail.com`, `proveedores.id=47ba31f9-2835-4259-9bde-de733ae19c8a`, `nombre='Admin Pawnecta'`, `roles=['admin']`, `estado='aprobado'`. **Corrección importante**: NO es `acanocts@gmail.com` — esa es la cuenta admin de staging documentada en CLAUDE.md § Testing. La cuenta admin de prod es `canocortes@`.

**S3 — Tab "Aprobaciones" oculto**: PASA. En `/admin` de prod el tab NO aparece en el sidebar. Contador post-migration = 0 filas con `estado='pendiente' AND (es_ejemplo=false OR es_ejemplo IS NULL)`.

**S4 — Signup nuevo proveedor con auto-aprobación**: PASA. Registrado `petmatecl+f1prod@gmail.com` (nombre "Mateo"). Verificación en Studio Prod:
```
estado                = aprobado
aprobado_at           = 2026-08-20 18:53:10.366+00
aprobado_por          = NULL
verificacion_estado   = sin_enviar
created_at            = 2026-08-20 18:53:09.636+00
```
Aprobación automática 730 ms post-registro, cero intervención humana. Corolario P8: verificación medida contra efecto observable en BD, no señal del emisor.

**S5 — Modal invitación auto-abre 1 vez**: PASA. Login del nuevo → modal auto-abre. "Más tarde" persiste tras reload Y tras cerrar sesión y volver a entrar (marker `localStorage['pawnecta.proveedor.verifPromptShown.<id>']` sobrevive al logout). CTA sidebar "Verificar identidad" sigue visible como trigger manual permanente.

**S6 — Publicar sin gate**: PASA. Click "Publicar servicio" → `ServiceFormModal` abre directo. Cero `VerificationGateModal` interponiéndose. Cerrado sin publicar (borrador descartado, cero servicio spam en catálogo prod).

**S7 — Verificación empírica antes/después en STAGING**: PASA. Reemplazo de la "verificación indirecta" original (que era P8 puro: leía la misma señal que S3 en admin.tsx). Método real: con Smoke X en `estado='pendiente'` aparece la pantalla "Tu solicitud está en revisión" (sala de espera de `pages/proveedor/index.tsx:1128-1210`); tras UPDATE a `'aprobado'` y reload de la misma pestaña aparece el dashboard normal con sidebar y "Mis Servicios". Rollback aplicado. Cierre empírico de la premisa "los 7 legacy ven dashboard funcional post-migration".

**S4-bis — Cleanup del proveedor smoke**: EJECUTADO. Counts previos de Mateo todos en cero (agendamientos, servicios, contactos, evaluaciones). **Nota de método detectada**: el DELETE sobre `auth.users` con `SET LOCAL role='service_role'` **FALLÓ** con `42501: permission denied for table users`. Root cause: el SQL Editor de Supabase Studio corre como `postgres` (superuser), que tiene DELETE sobre `auth.users`; `service_role` tiene menos privilegios sobre el schema `auth`. Bajar de rol quita el permiso. Ejecutado SIN el `SET LOCAL`: OK. CASCADE verificado, cero filas huérfanas en `proveedores`, `certificaciones`, `contactos`, `evaluaciones`, `planes_visibilidad`, `preguntas`, `servicios_publicados`. Ver aditamento CLAUDE.md.

---

## 4. Snapshot de estado prod post-F1

Query de verificación (2026-08-20 15:20 CLT, post-smokes + post-cleanup S4-bis):

```
SELECT estado, verificacion_estado, es_ejemplo, COUNT(*)
  FROM public.proveedores
 GROUP BY estado, verificacion_estado, es_ejemplo
 ORDER BY estado, verificacion_estado;
```

Resultado esperado (12 filas totales):
- 10 proveedores reales con `es_ejemplo=false, estado='aprobado'`, `verificacion_estado` variado.
- 2 proveedores ejemplo con `es_ejemplo=true, estado='pendiente'` (Lucia Espinoza y Diego Rojas, creados marzo 2026 — cuentas seed nunca aprobadas).

**Corrección importante a la expectativa del acta previa (orphan-fix)**: el número real post-F1 es **12 filas totales = 10 no-ejemplo aprobados + 2 ejemplo pendientes**, no 11. El contador del tab admin ("Aprobaciones") filtra `AND (es_ejemplo IS DISTINCT FROM true)` y por eso queda en 0 aunque haya 2 pendientes en la tabla — S3 pasa correctamente. Cualquier futuro smoke debe usar el filtro completo, no solo `estado='pendiente'`.

---

## 5. Hallazgos NO bloqueantes detectados durante smokes

**Del smoke (e) en preview badge-f1**, ambos preexistentes en main (verificado con `git log main..badge-f1 -- components/Proveedor/ServiceFormModal.tsx` → cero commits):

- **Campo descripción del servicio sin validación de largo mínimo** — [components/Proveedor/ServiceFormModal.tsx](components/Proveedor/ServiceFormModal.tsx) permite publicar con menos de 50 caracteres. La validación 50 chars que aterrizó en orphan-fix vive en [pages/register.tsx](pages/register.tsx#L232-L236) y aplica al campo `descripcion` del **wizard de signup**, no al campo descripción del **servicio**. Son dos campos distintos.
- **Race en select de Categoría del `ServiceFormModal`** — [components/Proveedor/ServiceFormModal.tsx:282-287](components/Proveedor/ServiceFormModal.tsx#L282-L287) hace fetch al abrir el modal; el select renderiza inmediatamente con `categorias=[]` durante los ~100-300 ms del round-trip. Sin loading state ni skeleton. Segunda apertura funciona por state preservation (React no desmonta con `return null` en L1345).

Ambos son deuda del sprint que corresponda arreglarlos. Ninguno es regresión de F1. Sprint chico ~30 min total.

**Hallazgo lateral positivo**: AUTH-EMAIL-1 (Custom SMTP en Supabase Auth) **ya está resuelto en prod**. El correo de confirmación llega desde `hola@pawnecta.com` (no genérico Supabase), template propio en español con copy alineado a F1 ("Tu cuenta ya está activa", "Sube tu carnet cuando quieras"). Pendientes menores: display name "hola" en vez de "Pawnecta", asunto "Recibimos tu solicitud" residuo del modelo viejo. Anotados como deuda chica en BACKLOG (~5 min config Dashboard).

---

## 6. Notas de método (aditamentos operativos)

1. **Fecha del tag ≠ fecha del commit apuntado**. Para timestamps de deploy en actas, usar `git for-each-ref --format='%(creatordate:iso)' refs/tags/<tag>` (fecha del objeto tag), NO `git log --format=%ci -1 <tag>` (fecha del commit apuntado — puede ser días antes si hay ventana entre commit final y merge+push). Documentado en CLAUDE.md aditamento.

2. **`SET LOCAL role='service_role'` NO se propaga al schema `auth`**. La regla que documenté tras la migration de los 7 (aplicar `SET LOCAL role='service_role'` para bypass del `proveedores_guard_fn`) es correcta para tablas de `public.*` con triggers guard, pero **contraproducente para DELETE/UPDATE sobre `auth.users`** — `postgres` (rol default del SQL Editor) tiene más privilegios que `service_role` en el schema `auth`; bajar de rol quita el permiso. Documentado en CLAUDE.md aditamento con matriz de decisión.

3. **Prod tiene proveedores ejemplo (`es_ejemplo=true`) con estados no-terminales** — los contadores operativos deben filtrar `(es_ejemplo IS DISTINCT FROM true)` para no inflar métricas con cuentas seed. El contador del tab Aprobaciones ya lo hace correctamente.

---

## 7. Deuda / próximos pasos

Post-F1 en prod, alcance decidido por el PO:

- **PANEL-PROV-1** — Reescribir pantalla `estado='pendiente'` de sala de espera a "estado especial, contactanos". Post-F1 el estado `pendiente` casi nunca ocurre (solo si admin re-active manual desde suspendido). Fix chico ~15 min.
- **H4 — Email a las 92 huérfanas históricas** — email honesto de recuperación, filtrando dominios de prueba (`@pawnecta-test.com`), aterrizando al guard estructural de orphan-fix (`/completar-registro`). Sprint estimado ~4 h.
- **Funnel /admin** — herramienta visual de proveedores por etapa + tiempo en cada una, con CTA `mailto:` por etapa. Preview aprobado por PO (Artifact `030a8548-...`). Estimado 4-6 h.
- **F1b — RUT-gate al publicar** — como capa 4 anti-spam (con S1+S2+S3). Rama propia post-F1. Estimado ~5 h.
- **Salvaguardas S1+S2+S3** — cap servicios primer semana + botón reporte + panel admin recientes. Sprint dedicado.
- **AUTH-EMAIL-1 residuos** — display name "hola" → "Pawnecta"; asunto "Recibimos tu solicitud" → alineado a modelo activo-al-registrar. Config Dashboard, ~5 min.
- **Deuda chica preexistente**: validación 50 chars en descripción de servicio + loading state select Categoría en `ServiceFormModal`. Sprint chico ~30 min.

Priorización queda en cancha del PO.
