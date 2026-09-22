# Plan de lanzamiento — noviembre 2026

**Decisión PO**: 2026-09-22.
**Fecha tentativa lanzamiento**: **martes 2026-11-11**.
**Respaldo**: martes 2026-11-18.

---

## Tramo 1 — hasta 2026-09-28 (PO en Chile, trabajo normal)

**PO**:
- Responder DEL-CUENTA-LEY (las 10 preguntas).
- Decidir botones con el informe de J-2.
- Aprobar alcance de SHARE-PROV.

**Auditor**:
- J-4 con el orden acordado: **F2-3-CLEANUP → BELL-150 → cue-1 (P8 forzado) → conviene → resto**.
- **cue-1 es el reporte prioritario** — apenas se tenga, PO decide si CUE-1 sigue monitoreado o pasa a BLOQUEA.

Entregable al PO el 2026-09-28:
- Estado de J-4 (qué queda, qué merge-able, qué en hold).
- Resultado de cue-1 (con evidencia P8).
- Lista exacta de PRs que quedarán abiertos durante el viaje + dependencias entre sí.

---

## Tramo 2 — 2026-09-29 al 2026-10-27 (viaje del PO)

**CONGELAMIENTO DE PROD.** Ningún merge a `main` en este período. Cero
excepción por conveniencia operativa. Aplica a todos los PRs sin
distinción de tamaño ni urgencia percibida.

**Trabajo del auditor**:
- Ramas con preview de Vercel + checks verdes.
- Cada PR queda abierto con su acta.
- PO los revisa cuando puede; no se apura la review.
- Kickoff en `docs/sprints/` **antes de partir** por cada uno.

**Orden de trabajo**:

1. **J-4** (si queda algo del Tramo 1).
2. **DEL-CUENTA-LEY**.
3. **AUTH-LINK-PROPIO**.
4. **Sprint visual de botones** (nombre exacto a definir tras la decisión PO de Tramo 1 sobre el informe J-2).
5. **SHARE-PROV**.

**Reglas del tramo**:
- **PR desactualizado respecto a otro** → rebase en orden (nunca merges
  cruzados de PRs abiertos).
- **Única excepción al congelamiento**: hotfix por incidente real en
  prod detectado por Sentry. Requiere:
  - OK explícito del PO por chat, en el turno vigente.
  - Rama `hf-<slug>` de vida corta.
  - Post-hotfix: reanudar congelamiento inmediato.

Ejemplos que NO son excepción: flake CI, warnings de dependencias, deuda
técnica descubierta, mejora "que conviene aterrizar ya", propuesta del
auditor sin request específico del PO, etc. Cero merge a main sin OK
literal del PO en el mismo turno.

---

## Tramo 3 — desde 2026-10-28 (regreso del PO, ejecución pre-launch)

**Merges de los PRs del Tramo 2 en orden** con QA del PO sobre cada uno.

**Pendientes operativos pre-lanzamiento**:
- SQL prod pendientes (RPC-C lote 3 tras vistas-doble).
- Supabase Pro (upgrade).
- Lighthouse (audit + fixes prioritarios).
- CARTO (API key aplicada — ver `PEDIDOS DIRECTOS DEL PO` de BACKLOG).
- Teléfono de Eduardo (dato operativo, no código).
- Reactivar cinco proveedoras.
- Cuenta vieja de Nicole (gestión de datos).
- Smokes completos (golden path proveedor / tutor / admin).
- DMARC-2 (subir a `p=reject`) si el mes de reportes viene limpio.

**Lanzamiento**: martes 2026-11-11 (o respaldo 2026-11-18).

---

## Regla operativa de este plan

Toda decisión que aparezca durante Tramo 2 que empuje a merge autónomo o
"solo esto", queda anotada como sprint separado en `docs/sprints/` con
kickoff — se ejecuta con PR abierto sin merge y se revisa post-regreso.
Bajar el umbral del "solo esto" es donde se rompen los congelamientos
reales.

## Trazabilidad

Este plan se refleja también al tope de `BACKLOG.md > PEDIDOS DIRECTOS
DEL PO` para que sea lo primero visible al abrir cualquier menú de "¿con
qué seguimos?".
