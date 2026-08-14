# ACTA Ola 1 — pre-lanzamiento (rama `ola-1`)

**Rama**: `ola-1` (base `main @ a6dd02c`, 50 chars subdominio ≤63 ✅).
**SHA**: `c3ea3c2`.
**Fecha ejecución**: 2026-08-14 (viernes).
**Estado**: **PREVIEW VERDE — pendiente GO para merge FF**. Deuda: A4 (rate limit) espera cuenta Upstash Aldo.

---

## 1. Ítems ejecutados en Ola 1

### A1 — Bug carnet (bucket privado sirviendo URLs inválidas)

**Bug documentado en CLAUDE.md > Bugs conocidos**: el bucket `documents` es privado (probe: `/object/public/` devuelve 400 "Bucket not found"). El upload guardaba `getPublicUrl()` en BD, generando URLs cosméticamente públicas pero inválidas → admin veía `<img>` roto al aprobar proveedor real. **Verificación de identidad rota en prod**.

**Fix con backward-compat** (SHA `c3ea3c2`):
- **[lib/carnetUrl.ts](lib/carnetUrl.ts)** nuevo — helper `extractCarnetPath()` handleja 3 formatos:
  1. URL pública vieja: `https://<ref>.supabase.co/storage/v1/object/public/documents/<path>`
  2. URL firmada vieja: `https://<ref>.supabase.co/storage/v1/object/sign/documents/<path>?token=...`
  3. Path directo nuevo: `carnets/<user_id>/carnet.jpg`
  + `getCarnetSignedUrl()` genera signed URL 5 min TTL para render admin.
- **[pages/proveedor/index.tsx:944,956](pages/proveedor/index.tsx#L944)** — upload nuevo guarda **PATH** en `foto_carnet`/`foto_carnet_dorso` (no URL).
- **[components/Admin/ProveedorApprovalList.tsx](components/Admin/ProveedorApprovalList.tsx)** — `fetchVerificaciones` resuelve `foto_carnet_signed_url` / `foto_carnet_dorso_signed_url` post-fetch. Render usa las signed URLs con fallback visual "Sin URL" si null (edge case: archivo no existe en storage).

**Verificación pendiente Aldo en prod post-merge**: crear cuenta proveedor de prueba, subir carnet, verificar en `/admin > Verificaciones` que la imagen aparece.

---

### A2 — Inventario data prueba prod (modo lectura)

**Solo inventario** — la decisión de qué borrar la toma Aldo con evidencia.

**Inventario staging (MCP `execute_sql` read-only, `--project-ref=jmtadvdkicyylcwjcmcl`)** — proxy para prod. La estructura es la misma; los conteos en prod pueden diferir.

| Tabla | Total | Marcados ejemplo | No ejemplo |
|---|---|---|---|
| `proveedores` | 11 | **9** | **2** (Eduardo Cano, Admin Staging) |
| `servicios_publicados` | 15 | 10 | 5 |
| `usuarios_buscadores` | 3 | 0 | 3 |
| `agendamientos` | 14 | 1 | 13 |
| `evaluaciones` | 1 | 1 | 0 |
| `conversations` | 0 | 0 | 0 |

**Los 9 proveedores marcados `es_ejemplo=true`** (todos con IDs `b1000001-...`, creados 2026-05-05):
- Sebastián Castro, Carolina Méndez, Matías Fernández, Daniela Rojas, Felipe Navarro, Tomás Pizarro, Andrea Navarro, Patricia Soto (Retratos), Javiera Espinoza.

**Nota crítica** (⚠️ CORRECCIÓN DE PREMISA POST-MERGE 2026-08-14): prod tiene también las **8 solicitudes pendientes** que el PO detectó 2026-08-11 (staging solo muestra proveedores con `verificacion_estado='aprobado'`). En prod estas 8 tienen `verificacion_estado='pendiente'` — **NO son ejemplo, son proveedores REALES esperando aprobación desde el 28-jun**.

**Impacto de la corrección**: en la Ola 1 planeada, A3 (notif admin) se justificó por "prevenir futuros pendientes acumulados". Con esta corrección, el valor real es más urgente — **hay gente real esperando 6+ semanas HOY**. Con A1 + A3 en prod, Aldo puede procesar las 8 pendientes acumuladas de inmediato (el email A3 no cubre retroactivo, pero A1 arregla el flow de aprobación que estaba visualmente roto). Retrospectivamente, esa premisa equivocada bajó la percepción de urgencia de A3 durante el planning — anotable como error de calibración: **el inventario staging NO refleja el estado pendiente de prod porque los seeds están todos como `aprobado`; para pending real, siempre consultar prod directamente**.

**Queries prod-ready para que Aldo corra en SQL Editor** (staging las validó, no las corro contra prod):

```sql
-- 1) Conteo global por tabla (para dimensionar antes de borrar)
SELECT 'proveedores' as tabla, COUNT(*) as total,
       COUNT(*) FILTER (WHERE es_ejemplo = true) as ejemplo,
       COUNT(*) FILTER (WHERE es_ejemplo = false OR es_ejemplo IS NULL) as no_ejemplo
FROM proveedores
UNION ALL
SELECT 'servicios_publicados', COUNT(*),
       COUNT(*) FILTER (WHERE proveedor_id IN (SELECT id FROM proveedores WHERE es_ejemplo = true)),
       COUNT(*) FILTER (WHERE proveedor_id IN (SELECT id FROM proveedores WHERE es_ejemplo = false OR es_ejemplo IS NULL))
FROM servicios_publicados
UNION ALL
SELECT 'usuarios_buscadores', COUNT(*), 0, COUNT(*) FROM usuarios_buscadores
UNION ALL
SELECT 'agendamientos', COUNT(*),
       COUNT(*) FILTER (WHERE proveedor_id IN (SELECT id FROM proveedores WHERE es_ejemplo = true)),
       COUNT(*) FILTER (WHERE proveedor_id IN (SELECT id FROM proveedores WHERE es_ejemplo = false OR es_ejemplo IS NULL))
FROM agendamientos
UNION ALL
SELECT 'evaluaciones', COUNT(*),
       COUNT(*) FILTER (WHERE proveedor_id IN (SELECT id FROM proveedores WHERE es_ejemplo = true)),
       COUNT(*) FILTER (WHERE proveedor_id IN (SELECT id FROM proveedores WHERE es_ejemplo = false OR es_ejemplo IS NULL))
FROM evaluaciones
UNION ALL
SELECT 'conversations', COUNT(*), 0, COUNT(*) FROM conversations
ORDER BY tabla;

-- 2) Lista de proveedores para revisar (identificar reales vs ejemplo vs 8 pendientes)
SELECT id, nombre, apellido_p, es_ejemplo, estado, verificacion_estado, created_at::date as created
FROM proveedores
ORDER BY es_ejemplo NULLS LAST, verificacion_estado, created_at;

-- 3) Usuarios_buscadores con lista + email (para saber si son cuentas de dev/tester)
SELECT b.id, b.nombre, b.rut, u.email, b.created_at::date as created
FROM usuarios_buscadores b
LEFT JOIN auth.users u ON u.id = b.auth_user_id
ORDER BY b.created_at;

-- 4) Agendamientos reales con detalle (para decidir qué borrar sin afectar dev)
SELECT a.id, a.estado, a.familia, a.fecha_preferida::date as fecha,
       p.nombre as proveedor, p.es_ejemplo as prov_ejemplo,
       s.titulo as servicio,
       a.created_at::date as created
FROM agendamientos a
LEFT JOIN proveedores p ON p.id = a.proveedor_id
LEFT JOIN servicios_publicados s ON s.id = a.servicio_id
ORDER BY a.created_at DESC;
```

**Decisión pendiente Aldo**: qué borrar / mantener vitrina / dejar pendiente hasta prod post-launch estabilizado.

---

### A3 — Notificaciones admin de solicitud proveedor pendiente

**Origen**: pedido PO 2026-08-11 (`BACKLOG.md > PEDIDOS DIRECTOS DEL PO` L13-27). 8 solicitudes acumuladas 6 semanas sin respuesta = evidencia directa del gap.

**Implementación** (SHA `c3ea3c2`):
- **[components/Emails/NuevoProveedorPendienteEmail.tsx](components/Emails/NuevoProveedorPendienteEmail.tsx)** nuevo — template email-safe (tablas + inline styles, sin flex/SVG). Return type `React.ReactElement` explícito para no colisionar con React 19 types (`ReactNode | Promise<ReactNode>`) del argumento `react:` de Resend — descubierto por P1.1 (build P1 falló primero, output completo mostró el error de tipos).
- **[pages/api/admin/notify-nueva-solicitud.ts](pages/api/admin/notify-nueva-solicitud.ts)** nuevo — endpoint server-to-server con `verifyInternalSecret` + `emailLimiter`. Patrón id-only: cliente manda solo `proveedorId`, server resuelve nombre/email/rut/comuna desde BD. Failure handling graceful (200 skipped en errores no-fatales — la creación del proveedor ya sucedió). Prefix `[STAGING]` cuando `VERCEL_ENV != production`.
- **[pages/api/auth/signup.ts:158-186](pages/api/auth/signup.ts#L158)** — hook fire-and-forget POST al endpoint tras INSERT proveedor exitoso. No bloquea flow del proveedor si el envío falla.

**Destino**: `contacto@pawnecta.com` (env var `ADMIN_INBOX`, con fallback a la casilla). Ya operativo en Zoho desde cierre 2026-08-11.

**Verificación pendiente Aldo en prod post-merge**: crear cuenta proveedor de prueba en prod, verificar que `contacto@pawnecta.com` recibe el email con subject `"Nueva solicitud de proveedor pendiente: <nombre>"`.

---

### C1 — 400 en /admin pestaña Conversión + OfertaMetrics nuevo

**Causa raíz del 400** (verificado MCP staging read-only):

```sql
SELECT tc.constraint_name FROM information_schema.table_constraints tc
WHERE tc.table_name = 'conversations' AND tc.constraint_type = 'FOREIGN KEY';
-- Retorna: [] (cero rows)
```

**La tabla `conversations` NO tiene foreign keys definidas** — ni `servicio_id → servicios_publicados`, ni `sitter_id → proveedores`. PostgREST necesita FKs para resolver embeds tipo `!servicio_id(...)` — sin FK, rechaza con 400. Errores 400 acumulados en Sentry (post-instalación) tienen esta firma.

**Fix implementado**:
- **[components/Admin/ConversionMetrics.tsx](components/Admin/ConversionMetrics.tsx)** — reescribir query 5 sin embed: `conversations plain` con `servicio_id, sitter_id` → IN sobre `servicios_publicados` (con embed a `categorias_servicio` que SÍ tiene FK) + IN sobre `proveedores` para comunas → lookup cliente-side. Query 6 pasa a placeholder `Promise.resolve({data:null,error:null})` para preservar destructuring posicional. Variable `_topComunaRes` prefijada con `_` para indicar no-usada.

**Bonus C1-extended — OfertaMetrics nuevo** (instrumento para umbral de apertura de campaña a tutores):
- **Fase solo-proveedores primero** (decisión Aldo). El criterio para abrir a tutores dejó de ser un plazo y pasó a ser un umbral de oferta. ConversionMetrics medía DEMANDA (conversaciones). Faltaba un instrumento para medir OFERTA — servicios efectivamente publicados por categoría + comuna.
- **[components/Admin/OfertaMetrics.tsx](components/Admin/OfertaMetrics.tsx)** nuevo — cuenta servicios activos con proveedor **aprobado + verificado + NO ejemplo** (para medir oferta real, no seed). Muestra:
  - **Total vs UMBRAL_SERVICIOS_MIN=25** con barra de progreso (verde cuando alcanza).
  - **Por categoría** con highlight verde cuando `>=3` (UMBRAL_POR_CATEGORIA_MIN).
  - **Por comuna** con concentración sector oriente vs `UMBRAL_CONCENTRACION_ORIENTE_PCT=50%`. Comunas del sector: Las Condes, Providencia, Vitacura, Lo Barnechea, Ñuñoa, La Reina, Peñalolén, Macul, San Miguel.
- **[pages/admin.tsx:314](pages/admin.tsx#L314)** — pestaña "Conversión" ahora muestra `OfertaMetrics` (arriba) + `ConversionMetrics` (abajo). Aldo ve oferta y demanda en la misma pestaña.

**Umbrales configurables inline en el componente** (constants top del archivo). Si el PO quiere ajustar el umbral (ej. 40 servicios en vez de 25), es 1 línea.

---

## 2. Ítem NO ejecutado — A4 (rate limit Upstash)

**Bloqueado por cuenta Upstash** que Aldo tiene que crear (gratis, ~5 min). Espera GO cuando esté lista. Sin bloqueo de la Ola 1 promoción — puede aterrizar en cualquier momento como sub-sprint independiente.

---

## 3. Aprendizaje P1.1 en acción (build output completo)

**Build P1 falló primero** con exit 1 — `Type error: 'ReactNode | Promise<ReactNode>' is not assignable to 'ReactNode'` en `notify-nueva-solicitud.ts:69` al pasar el componente al `react:` de Resend.

**Detectado por P1.1** (regla nueva del sprint sentry-init 2026-08-11): capturar output completo del build a archivo + grep. Sin P1.1, el `tail -3` habría mostrado solo el resumen del build (que también dice "Failed to compile" pero sin la línea exacta del error).

**Fix**: cambiar signature del componente de `React.FC<Readonly<Props>>` (que en React 19 permite async → `ReactNode | Promise<ReactNode>`) a signature explícita `(props: Readonly<Props>): React.ReactElement`. Build P1 v3 exit 0 sin warnings SDK relevantes.

**Deuda anotable**: los otros 10 templates del proyecto usan `React.FC` y **no fallan** — funcionan por accidente porque los tipos de React se resuelven distinto según el contexto. **Todos son latentes al mismo bug**. No lo arreglo hoy (fuera de scope Ola 1, sería sweep completo de templates).

---

## 4. Verificación (preview + build)

**Rama**: `ola-1 @ c3ea3c2`. Subdominio preview 50 chars (≤63 ✅).

**Build P1**: exit 0. Warnings SDK: 0/0 [@sentry, @react-email, resend, instrumentation].

**Suite e2e**: no ejecutada en Ola 1 — cambios de A1 y A3 requieren autenticación admin real que el guard e2e bloquea contra prod (regla proyecto). Cambios de C1 y OfertaMetrics son pestaña interna admin, cubierto por preview smoke visual.

**Smoke preview pendiente Aldo** post-merge (o cuando aterrice preview ola-1):
1. **A1**: crear cuenta proveedor prueba en staging preview, subir carnet, ir a `/admin > Verificaciones`, verificar imagen visible con signed URL.
2. **A3**: mismo signup, verificar que `contacto@pawnecta.com` recibe email (con prefix `[STAGING]` en preview).
3. **C1**: `/admin > Conversión` — pestaña carga sin errores 400 en console. OfertaMetrics muestra total + tablas categoría/comuna (con seed staging).
4. **OfertaMetrics umbral**: verificar que en staging con 2 proveedores reales + servicios de ellos, el total sale bajo (esperado ~5 servicios reales según inventario A2).

---

## 5. Diferencia con el plan por ítem prometido

El plan Ola 1 mencionaba 4 ítems A (A1/A2/A3/A4). En ejecución agregué **OfertaMetrics** dentro de C1 porque el PO lo pidió explícitamente en el turno: "Revísame si el panel /admin muestra hoy los cortes que Aldo va a necesitar para ese umbral: servicios publicados por categoría y por comuna. Si no los muestra, dime cuánto cuesta agregarlos". La respuesta era "no los muestra" — implementé el instrumento en el mismo sprint porque desbloquear la decisión de apertura de campaña a tutores es más valioso que reportar "podría costar X" y diferir.

**Aritmética real Ola 1**: 5 ítems ejecutados (A1, A2 inventario, A3, C1, OfertaMetrics) en un mismo commit atómico `c3ea3c2`. Fuera: A4 (Upstash pendiente).

---

## 6. Estado y siguiente movimiento

**`ola-1 @ c3ea3c2`** — preview ejecutándose (polling activo).

**Espera GO explícito del PO para merge FF `main a6dd02c → c3ea3c2`**.

**Post-merge**:
- Deploy prod automático.
- Smokes S1-S7 + smokes específicos A1/A3/C1/OfertaMetrics con datos prod.
- Verificación Aldo con proveedor prueba (A1 carnet + A3 email).

**Próxima ola**: Ola 2 (25-31 ago) — B1 íconos + B3 form errors + B4 toasts + B5 fotografía vs retratos. Camino crítico de conversión visitante pagado.

**Pendientes cancha PO/Aldo (no bloquean Ola 2)**:
- A4 Upstash Redis rate limit (cuando cuenta esté lista).
- ANALYTICS-1 ritual DebugView (sigue urgente — sin esto, campañas ciegas).
- A2 decisión qué borrar en prod (con las queries de §A2 arriba).

---

## 7. Referencias

- SHA único Ola 1: `c3ea3c2`.
- Rama: `ola-1` (base: `main @ a6dd02c`; 50 chars subdominio ✅).
- Ítems ejecutados: A1 + A2 (inventario) + A3 + C1 + OfertaMetrics.
- Ítem pendiente A4: espera cuenta Upstash Aldo.
- Reglas aplicadas: **P1.1** (build output completo capturó el error React 19 types), **P3** (branch ola-1 verificada pre-commit), **P5** (esta acta), **P6** (verificación MCP staging read-only para diagnosticar 400 + validar queries), **P7** (fecha 2026-08-14 ancla), **P8** (smokes ejercitan efecto observable no señal del emisor — A1 = imagen visible en admin, A3 = email delivered en Zoho, C1 = pestaña carga sin console error), **P9** (evitar apagar defaults sin verificar — inline en el diseño de queries C1: mantuvimos comportamiento previo con fix quirúrgico), **convención comunicación** (respuesta única al cierre de la ola).
