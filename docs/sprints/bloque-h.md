# Bloque H — sprint autónomo · lock, RPCs, DEL-CUENTA-LEY, SEO+A11y

**Fecha kickoff**: 2026-09-17
**Rama madre**: `main` (tag anterior `deuda-g-prod-20260915`)
**Orden PO**: H-3 → H-4 → H-1 → H-2
**Condición de parada general**: cualquier cambio de comportamiento observable por usuario sin GO explícito.

---

## Kickoff literal (PO 2026-09-17)

> Bloque autónomo H. Guarda este kickoff en docs/sprints/bloque-h.md y trabaja contra el archivo. Dos partes de código con red de seguridad y dos informes que preparan decisiones mías.
>
> H-1 LOCK-LINUX, estrategia (c) aceptar el bump con auditoría: workflow de un solo uso en ubuntu-latest que borre package-lock.json y corra npm install completo; descarga el lock; en el PR lista los paquetes cuya versión MAYOR cambia (semver major) con enlace al changelog de cada uno. Condición de parada: cualquier major en next, react, @supabase/*, @sentry/*, leaflet, react-day-picker o playwright; ahí reportas y no mergeas. Sin majors críticos: restaurar npm ci en los dos workflows, borrar los workflows de un solo uso, suite completa verde (rápida, F2 y unit) y merge autónomo. Tag chore-lock-prod-YYYYMMDD.
>
> H-2 RPC-C, solo lectura con supabase-prod-ro: para las 204 funciones con EXECUTE a anon, tabla con nombre, qué hace en una frase, quién la llama (grep en el código: cliente anónimo, cliente autenticado, servidor con service role, trigger, nadie), y veredicto propuesto: necesita anon, solo authenticated, solo service role, o sin callers (candidata a REVOKE). Sin aplicar nada. Informe en docs/auditorias/rpc-c-YYYYMMDD.md con el SQL de REVOKE agrupado por veredicto para que yo decida por lotes.
>
> H-3 Descubrimiento técnico para DEL-CUENTA-LEY (Ley 21.719, vigencia diciembre 2026), solo lectura: mapa de datos por tabla que referencia a un tutor o proveedor (FK, columnas con datos personales, si hay RESTRICT o CASCADE, si el dato es necesario para terceros como una reserva pasada de un proveedor). Para cada tabla, propuesta binaria: borrar o anonimizar in-place, con el motivo. Estimación de la migración, del endpoint y de la UI. Preguntas concretas que necesito responder yo, numeradas, con tu recomendación por defecto en cada una. Informe en docs/producto/del-cuenta-ley-descubrimiento.md. Es el insumo de una sesión de 30 minutos conmigo.
>
> H-4 Auditoría pre-lanzamiento de SEO y accesibilidad, solo informe con Playwright y lectura: metadatos y Open Graph por página pública, sitemap y robots, imágenes sin alt, contraste y foco en las páginas clave, Lighthouse en home, explorar y una ficha (móvil y escritorio) con puntajes. Hallazgos ordenados por impacto con esfuerzo estimado; los de menos de 30 minutos y sin decisión (alt faltantes, meta description ausente, título duplicado) corrígelos en un PR aparte con merge autónomo; el resto queda en el informe.
>
> Orden: H-3 primero (es el que más me sirve), luego H-4, H-1 y H-2. Al cerrar: acta breve y BACKLOG conciliado.

---

## Plan operativo por item

### H-3 · DEL-CUENTA-LEY descubrimiento técnico

- **Modo**: solo lectura (MCP `supabase-prod-ro` + grep de código).
- **Insumo Ley 21.719**: derecho de supresión (art. 8), entra en vigencia **diciembre 2026**.
- **Salida**: `docs/producto/del-cuenta-ley-descubrimiento.md`.
- **Estructura**:
  1. Mapa de datos: por cada tabla con FK a `usuarios_buscadores` (tutor) o `proveedores` (proveedor), listar columnas PII, delete rule, si el dato es necesario para terceros.
  2. Propuesta binaria por tabla: borrar vs anonimizar in-place, con motivo.
  3. Estimación migración + endpoint + UI.
  4. Preguntas para el PO numeradas, con recomendación por defecto.

### H-4 · Auditoría SEO + A11y

- **Modo**: Playwright + Lighthouse + lectura estática.
- **Alcance**:
  1. Metadatos + Open Graph por página pública (`/`, `/explorar`, `/servicio/[id]`, `/[categoria]/index`, `/[categoria]/[comuna]`).
  2. Sitemap + robots.
  3. Alt en imágenes (grep + Playwright DOM scan).
  4. Contraste y foco (Playwright a11y).
  5. Lighthouse: home, explorar, ficha × (mobile + desktop) = 6 corridas.
- **Salidas**:
  - PR chico con fixes triviales (< 30 min, sin decisión): alt faltantes, meta description ausente, título duplicado.
  - Informe `docs/auditorias/seo-a11y-<fecha>.md` con hallazgos > 30 min o con decisión.

### H-1 · LOCK-LINUX bump con auditoría

- **Modo**: workflow one-shot ubuntu-latest.
- **Estrategia (c) aceptar el bump con auditoría**:
  1. Workflow `.github/workflows/lock-regen.yml` (workflow_dispatch): borra `package-lock.json` + corre `npm install` completo en Ubuntu.
  2. Sube el nuevo lock como artifact.
  3. Auditor descarga el artifact, compara vs current, lista majors.
- **Condición de parada**: cualquier major en `next`, `react`, `@supabase/*`, `@sentry/*`, `leaflet`, `react-day-picker`, `playwright` → reportar sin mergear.
- **Sin majors críticos**:
  1. Restaurar `npm ci` en los 2 workflows (`ci.yml` + `e2e-error-audit.yml`).
  2. Borrar los workflows one-shot.
  3. Suite completa verde (rápida + F2 + unit).
  4. Merge autónomo.
- **Tag**: `chore-lock-prod-YYYYMMDD`.

### H-2 · RPC-C informe (solo lectura)

- **Modo**: MCP `supabase-prod-ro` para inventario + grep de código para caller usage.
- **Alcance**: las **204 funciones con EXECUTE a anon** (número que da el PO — verifico primero).
- **Por cada función**: nombre + qué hace en una frase + quién la llama (anon / authenticated / service_role / trigger / nadie) + veredicto propuesto (necesita anon / solo authenticated / solo service_role / sin callers → candidata a REVOKE).
- **Salida**: `docs/auditorias/rpc-c-<fecha>.md` con SQL de REVOKE agrupado por veredicto.
- **Sin aplicar nada**.

---

## Foto de arranque (2026-09-17)

- **`main` tip**: `dc33323` (PR #54 G-CIERRE merge).
- **Tag anterior**: `deuda-g-prod-20260915`.
- **PRs abiertos**: 0.
- **BACKLOG top items relevantes**:
  - L1160 DEL-CUENTA-LEY con formulación previa + trigger diciembre 2026 (input para H-3).
  - RPC anon exposure (por identificar entrada en BACKLOG en H-2).

Kickoff cerrado. Arranca H-3.
