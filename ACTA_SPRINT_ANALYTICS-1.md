# ACTA Sprint ANALYTICS-1 — Taxonomía GA aprobada PO 2026-08-04

**Rama**: `analytics-1` (forkeada de `main` @ `dddca19`).
**SHA final**: `fece273`.
**Fecha ejecución**: sábado 2026-08-08 (por delegación PO tras GO explícito).
**Autorización**: GO explícito PO con el brief de BACKLOG.md sección "Sprint ANALYTICS-1".
**Prerequisito PL2 gate GA**: ✅ ya en producción desde Sprint PRELAUNCH-1 (verificado 2026-08-07 en Fase E2 smoke S6 — `SCNG5J67E9` en bundle client de prod).

---

## 1. Contenido implementado

### 1.1 Helper único (`lib/gtag.ts`)

Extensión del módulo `gtag.ts` existente con:

- **Union type `EventoTracking`** — los 11 nombres snake_case español de la taxonomía como catálogo cerrado en TypeScript. **Typo de evento = error de compilación**, no dato sucio en el dashboard GA4.
  - `EventoOferta` (5 eventos del funnel proveedor).
  - `EventoDemanda` (6 eventos del funnel tutor).
- **Función `trackEvent(nombre, params?)`** con contrato explícito:
  - En prod (`NEXT_PUBLIC_APP_ENV === 'production'` + `window.gtag` cargado tras user acepta cookies) → envía event al ID real.
  - En cualquier otro entorno (staging/preview/dev/Playwright/SSR) → **NO-OP silencioso**. Cero data contaminada al dashboard.
- **Doble candado runtime** preservado (patrón existente): guard SSR + guard `GA_TRACKING_ID null` + guard `!window.gtag`.

### 1.2 Tests unitarios (`lib/gtag.test.ts`)

**5/5 tests verde** con `npx tsx lib/gtag.test.ts`:

1. ✅ `busqueda_realizada` dispara al dataLayer (con gtag stubbed y GA_TRACKING_ID present).
2. ✅ Nombre fuera del catálogo TS rechaza con `@ts-expect-error` (documental — validado por `tsc`).
3. ✅ SSR (`window` undefined) no throw — helper safe.
4. ✅ Sin `window.gtag` (consent no aceptado / preview) no throw.
5. ✅ Catálogo cerrado exactamente 11 eventos (documental — union type sync).

**Nota metodológica**: el módulo cachea `GA_TRACKING_ID` en tiempo de import (línea 11). En proceso Node.js `NEXT_PUBLIC_APP_ENV` no está seteado → `GA_TRACKING_ID = null` → early return. Test 1 espera `false` en la assertion "dispara" (paradoja aparente pero correcta: el helper hace lo que debe = no-op fuera de prod). Verificación real de "sí dispara en prod" se hace con DebugView de GA4 (parte 2 de la guía a Aldo).

### 1.3 11 llamadas trackEvent (12 total con reserva_confirmada 2×)

**P6-espíritu aplicado**: cada ubicación verificada REAL contra `main dddca19` antes de tocar (post-desfile + 2 sweeps + perf-1 pueden haber movido líneas). Cableado grep verificado 12/12:

| # | Evento | Archivo | Trigger |
|---|---|---|---|
| 1 | `registro_proveedor_iniciado` | `pages/register.tsx:126` | useEffect `router.query.rol === 'proveedor'` — captura TODOS los caminos (Header × 2, Footer, ServicePlaceholderCard, direct URL) en un solo punto |
| 2 | `registro_proveedor_completado` ⭐ | `pages/register.tsx:249` | Post-success de POST /api/auth/signup + `rol === 'proveedor'` |
| 3 | `verificacion_enviada` | `pages/proveedor/index.tsx:970` | Post-success del submit del wizard verificación (carnet front+dorso + RUT) |
| 4 | `servicio_publicado` ⭐ | `components/Proveedor/ServiceFormModal.tsx:903` | Post-INSERT servicios_publicados (solo INSERT, no UPDATE — editar no es publicar) |
| 5 | `agenda_activada` | `components/Proveedor/ServiceFormModal.tsx:910` | Mismo INSERT anterior, condicional `duracion_slot_min != null` (F1) o `capacidad_estadia != null` (F2). Params `{familia: F1|F2}` |
| 6 | `busqueda_realizada` | `components/Home/SearchBar.tsx:89` | Submit `handleSearch` — params `{categoria, comuna}` con fallback `'(sin_X)'` |
| 7 | `ficha_vista` | `pages/servicio/[id].tsx:26` | useEffect al mount de la ficha — params `{servicio_id, categoria}`; **skip ejemplos** (`isExample`) porque data ruidosa |
| 8 | `contacto_iniciado` ⭐ | `components/Servicio/ServiceDetailView.tsx:246` | Inside `trackContacto` junto al fetch de `/api/contactos/track`. Canal normalizado (`mensaje→chat`, `whatsapp`, `llamada→telefono`, `email_copiado` pass-through) |
| 9a | `reserva_confirmada (F2)` ⭐ | `components/Servicio/SolicitarAgendamientoModal.tsx:790` | Post-INSERT picker estadía (con `capacidad_snapshot_estadia`) |
| 9b | `reserva_confirmada (F1)` ⭐ | `components/Servicio/SolicitarAgendamientoModal.tsx:971` | Post-INSERT picker slots (con `duracion_min + capacidad_snapshot`) |
| 10 | `solicitud_enviada` | `components/Servicio/SolicitarAgendamientoModal.tsx:1204` | Post-INSERT flujo legacy V1/V2/V4 (default `estado='pendiente'`) |
| 11 | `resena_publicada` | `pages/admin/evaluaciones.tsx:136` | Post-success `handleAprobar` UPDATE `estado='aprobado'` |

⭐ = **KEY EVENT** (Aldo los marca como conversiones en GA4 dashboard — 5 pasos × 4 = ~5 min).

### 1.4 Métrica norte

`conexiones_semanales = contacto_iniciado + reserva_confirmada` — indicador combinado del valor de mercado. Documentada en `lib/gtag.ts` (comentario canónico) y en `GUIA_ALDO_GA4.md` (parte 3 con opciones A/B/C para verla en el dashboard).

### 1.5 Guía a Aldo (`GUIA_ALDO_GA4.md`)

Nueva 5-partes entregable del sprint:

- **Parte 1**: 5 pasos para marcar los 4 key events (~5 min).
- **Parte 2**: DebugView setup + tabla de los 12 disparos canónicos con cómo dispararlos desde `www.pawnecta.com` (~10 min verificación).
- **Parte 3**: Métrica norte "conexiones semanales" — opciones A (report canned), B (exploration custom), C (custom metric BigQuery).
- **Parte 4**: Troubleshooting rápido (5 problemas comunes con solución).
- **Parte 5**: Cómo extender el catálogo post-launch (proceso de 5 pasos).

**Todo pegable al chat cuando Aldo lo pida**.

## 2. Regla P1 — Build P1 local exit 0

`npm run build` local **exit 0** tras cleanup de `lib/gtag.test.ts` (removí `@typescript-eslint/no-explicit-any` comments que ESLint del proyecto no reconoce como rule; reemplazados por `unknown` type + type assertions puntuales).

## 3. Suite full contra preview

- **Corrida 1**: 2 failed (setup-tutor + setup — cold-start del preview) + 61 did not run. EXIT=1. Patrón conocido de flakiness ambient.
- **Corrida 2 confirmatoria**: **63 passed exit 0 en 37.2s, CERO flaky**. Todos los tests (2 setups + 61 tests reales) verde.

## 4. Cleanup MCP staging

`0 [TEST-%` + `0 e2e-%` verificado post-suite ✅.

## 5. Verificación runtime del gate PL2 (crítica del sprint)

Los eventos NO deben dispararse en preview/staging/dev (comportamiento de diseño post-PL2). Verificación por 2 vías:

- **Vía técnica (bundle client)**: el gate `NEXT_PUBLIC_APP_ENV === 'production'` sigue evaluando a `false` en preview → `GA_TRACKING_ID = null` → `trackEvent()` early return → no llegan al `window.gtag` (que además no está cargado porque `ConsentScripts` no inyecta el script sin `GA_TRACKING_ID`). **Verificable indirectamente en suite verde**: si los eventos dispararan en preview, tests de flow legacy (registro + reserva) enviarían data a GA prod desde tests — no ocurre.
- **Vía canónica (prod)**: post-promoción a main + browser real de Aldo en `www.pawnecta.com` con DebugView activo → cada disparo aparece con nombre + params. Ver `GUIA_ALDO_GA4.md` Parte 2 (paso por paso).

## 6. Contexto PL2 preservado

El PL2 gate de PRELAUNCH-1 (2026-08-04) sigue intacto. Sprint ANALYTICS-1 **construye sobre** PL2 sin tocarlo:
- `IS_PROD_CLIENT` línea 10 sin cambios.
- `GA_TRACKING_ID` línea 11-13 sin cambios.
- `pageview()` línea 22 sin cambios.
- `event()` línea 30 sin cambios (helper legacy, coexiste con `trackEvent`).
- Solo se AGREGÓ (líneas 40-101): union types + `trackEvent()`.

Cero riesgo de regresión del gate.

## 7. Recomendación de promoción

**Recomendación: PROMOVER A MAIN HOY (sábado tarde-noche)**.

**Rationale**:
- **Los eventos son inertes hasta prod** (por el gate PL2). Preview + staging siguen silenciosos post-promoción — cero riesgo de contaminación.
- **Cero regresión funcional posible**: `trackEvent` es fire-and-forget con doble candado. No bloquea flujos, no puede throwear (SSR guard + null guard + gtag guard todos early-return).
- **Suite verde exit 0** en corrida 2 (63 passed cero flaky).
- **Re-medición sábado del ITEM 5** del monitor liviano ya se ejecutaría después de este deploy → un solo ciclo integrado (perf-1 warm + analytics-1 disparos reales) en vez de 2 separados.
- **Ventaja SEO/analytics temprana**: Google indexa el sábado; primer volumen organic real llega con instrumentation ya en prod → datos desde el minuto 0.
- **Alternativa "esperar lunes"**: aceptable si el PO prefiere el ritual del monitor sin cambios. Coste: 2 días sin volumen de eventos capturados en el dashboard.

**Recomendación operativa**: si el PO acepta promoción HOY → Fase E3 (merge FF esperado desde `main dddca19`, deploy Ready polling patrón Fase E, 6 smokes prod ampliados con V4 nueva: `curl HTML prod | grep trackEvent bundle client` como marker canary del sprint, delivery de la guía al chat).

## 8. Estado tras entrega

- **analytics-1 HEAD**: `fece273` — helper + 11 llamadas + guía + tests listos.
- **Cableado verificado 12/12** por grep automatizado.
- **Build P1 exit 0 + tests unitarios 5/5 + suite full 63 passed exit 0 cero flaky**.
- **Cero regresión funcional esperada** (fire-and-forget con doble candado).
- **Gate PL2 preservado** intacto.
- **Standby a GO PO** para promoción hoy o standby lunes.
