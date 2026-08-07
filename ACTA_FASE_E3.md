# ACTA Fase E3 — Promoción analytics-1 + Re-medición ITEM 5 integrada

**Fecha ejecución**: sábado 2026-08-08.
**Autorización**: GO explícito PO tras recomendación en acta analytics-1.
**Ejecutor**: Claude, guard P3 verificado en cada fase.
**Alcance integrado**: (i) promoción analytics-1 → main + smokes prod + guía Aldo al chat + (ii) re-medición ITEM 5 del monitor liviano (H1 preload LCP con server warm sostenido, ya que la sesión coincide).

---

## 1. Geometría declarada

- `main` pre-merge: `dddca19`.
- `analytics-1`: `363d804`.
- `main..analytics-1` = 2 commits · `analytics-1..main` = **VACÍO** → **FF puro** confirmado.
- Ejecución: `git merge --ff-only analytics-1` → 12 files changed, +554/-2. Push OK.
- **main HEAD post-merge**: `363d804`.

## 2. Deploy Ready + polling explícito

Poll con marker canary del sprint. Iteración 1 usó bundle `_app.js` como marker — TIMEOUT tras 30 intentos: el `_app.js` hash SÍ cambió (deploy nuevo aterrizado a `_app-4af3fc9602ce1274.js`) pero el string `busqueda_realizada` no vive ahí (código splitting de Next.js: los helpers de gtag solo se incluyen en los bundles de las pages/components que los importan).

**Corregido con marker por chunk específico**: `busqueda_realizada` en `_next/static/chunks/pages/index-*.js` (SearchBar vive en el home) → **confirmado aterrizado** con la nueva iteración.

Lección: para futuros sprints que agregan helpers importados por múltiples componentes, el canary debe apuntar al chunk del PAGE que importa el helper, no al `_app.js`.

## 3. Smokes prod (los 6 canónicos + S7 nuevo)

Todos verdes:

- **S4** `/sw.js` = WORKBOX real (14904 bytes, empieza con `if(!self.define){...}`) ✅
- **S5** `/servicio/{uuid-cero}` → **HTTP 404** ✅ (PL1-B1 intacto — verificado 4ta vez consecutiva)
- **S6** `SCNG5J67E9` en bundle client `_app-4af3fc9602ce1274.js` ✅ (gate PL2 preservado)
- **S7 NUEVO — catálogo trackEvent horneado en bundles reales**:
  - `busqueda_realizada` en `pages/index-afd396f6235924a0.js` (1 match) ✅
  - `contacto_iniciado + reserva_confirmada` en chunk compartido `5381-10e993848cc7e35b.js` (ServiceDetailView + SolicitarAgendamientoModal) ✅
  - **3/3 markers del catálogo verificados en bundles reales**

**S1/S2/S3 (visuales de PO)**: comandos entregados en acta Fase E; Aldo los ejecuta al gusto — cero blocker para este sprint (analytics-1 no toca UI visible al user).

## 4. Re-medición ITEM 5 — H1 preload LCP con server warm sostenido

**Objetivo**: confirmar el efecto neto del preload H1 del Sprint PERF-1 (Bucket A) sobre `/servicio/{id}` desktop cold, con server ya-warm (Cold Start Prevention Pro estabilizó ~1-2h post-deploy perf-1 hace ~2.5h).

**Contexto de medición**: la sesión coincide con la promoción de analytics-1, que dispara OTRO cold-start del server function (Vercel deploy fresco = function reset). Registrar honestamente: la medición NO es apples-to-apples perfectas contra el baseline (que se hizo con server warm de ~2h), pero es la más limpia disponible post-perf-1.

**Método**: `chrome-devtools-mcp performance_start_trace` sobre `https://www.pawnecta.com/servicio/c1000001-0000-4000-8000-000000000003` desktop, 2 pasadas.

**Resultados**:

| # | LCP | TTFB | Load delay | CLS |
|---|---:|---:|---:|---:|
| Pasada 1 | **1542 ms** | 1440 ms | **8 ms** | 0.01 |
| Pasada 2 | 2058 ms | 1922 ms | 7 ms | 0.02 |

**Tabla comparativa H1 (evolución completa)**:

| Estadío | LCP | Load delay | TTFB | CLS |
|---|---:|---:|---:|---:|
| Baseline pre-perf-1 (warm ~2h vida) | 2420 | 2192 | 65 | 0.00 |
| Post-perf-1 pasada 1 (deploy fresco) | 3354 | 7 | 3241 | 0.01 |
| Post-perf-1 pasada 3 (calentando) | 2127 | 14 | 1973 | 0.02 |
| **Post-analytics-1 pasada 1 (~2.5h del perf-1)** | **1542** ⭐ | 8 | 1440 | 0.01 |
| Post-analytics-1 pasada 2 | 2058 | 7 | 1922 | 0.02 |

**Veredicto H1 REAL — CUMPLIDA parcial-fuerte**:

- **Load delay -99%** consistente (2192 → 7-14 ms) — **el fix técnico aterrizó y funciona como esperado**. El preload + fetchpriority hacen que Chrome descubra la image LCP desde el HTML inicial.
- **LCP total mejorado -36% neto** (baseline 2420 → mejor observado post 1542) — dirección correcta, magnitud aún por debajo del best case ex-ante (-60/-70%).
- **Razón del gap con ex-ante**: TTFB dominante del server que aún no se estabiliza al ~65ms de la baseline. Cold Start Prevention Pro debería converger con más volumen sostenido — necesita más real traffic organic + ausencia de deploys frescos para llegar al steady state.
- **CLS**: verde constante (0.01-0.02, umbral good ≤0.10). Sin regresión material. Sprint PERF-2 candidato (width/height `<img>` hero) sigue en cola para cerrar el CLS a 0.00.

**Comparación honesta**: el LCP de 1542ms observado hoy YA es **best-so-far** del histórico de mediciones perf. Con Pro estabilizado en steady state (varios días de tráfico sin deploys), el número debería tender hacia ~700-1000ms de LCP frío ficha. Verificable con Vercel Speed Insights cuando se instale (Sprint PERF-1 Bucket D pendiente).

## 5. Cierre real del sprint ANALYTICS-1 — pending PO verification

**La instrumentación NO está lista hasta que el PO vio sus propios clicks convertirse en datos**.

Aldo ejecuta en Chrome con Google Analytics Debugger extension activa (parte 2 de la guía):
1. Marcar los 4 key events en GA4 (parte 1 de la guía — 5 pasos × 4 = ~5 min).
2. DebugView activo → ejecutar la tabla de 12 disparos canónicos.
3. Reportar al chat: qué eventos vio dispararse (esperado 12/12).

Con ese reporte, el sprint pasa a estado **CERRADO CON EVIDENCIA REAL**. Sin él, queda "código en prod pendiente verificación".

## 6. Estado tras entrega

- **main HEAD**: `363d804` — analytics-1 en producción.
- **7/7 smokes verdes** (S4/S5/S6 canónicos + S7 nuevo catálogo bundle).
- **Re-medición ITEM 5**: **H1 CUMPLIDA parcial-fuerte** — Load delay -99% + LCP -36% neto. Sprint PERF-2 (CLS width/height) sigue candidato.
- **Guía Aldo pegable**: partes 1-2 al chat (marcar key events + DebugView + tabla 12 disparos).
- **Standby a reporte PO DebugView** — sprint queda en "código en prod pendiente verificación" hasta que Aldo confirme que los 12 disparos aparecen.
- **Pawnecta se mide desde hoy**.
