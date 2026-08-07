# Auditoría Integral #2 — plan de scope (jueves post-desfile)

**Fecha objetivo**: jueves 06-ago 2026 post-cierre Fase 8 monitor N15 + desfile de merges completo (`producto-1 → zonab-1 → producto-2 → staging` + eventual promoción a `main`).

**Objetivo**: pasada única de calidad + seguridad sobre **staging consolidado** con los 3 sprints mergeados. Los findings entran a **triage único con score comparable al formato audit del 2026-07-23**.

---

## Revisores del jueves (3 fuentes)

| Revisor | Rol | Superficie primaria |
|---|---|---|
| **Mi canónico** (10-finder xhigh) | Correctness + reuse + simplification + efficiency + altitude + conventions | Diff completo entre `main` pre-desfile y `staging` post-desfile |
| **Plugin `security-guidance`** (estreno aprobado) | Segundo revisor: security-focused con confidence filtering | Mismo diff — foco vulnerabilities (input validation, auth, crypto, injection, data exposure) |
| **Plugin `code-review`** | Tercer revisor (pendiente veredicto: valor incremental vs redundante) | Mismo diff — a decidir tras smoke |

Los 3 outputs convergen al triage único con score 0-100 por finding (formato audit 2026-07-23). Duplicados se colapsan preservando el más específico.

---

## PRECISIÓN DE SCOPE — la superficie de PRODUCTO-1 requiere pasada explícita

**Aclaración crítica**: el diff analizado en el smoke pre-jueves (`origin/main..HEAD` en rama `producto-2`) cubrió **solo zonab-1 + producto-2**. Rama `producto-1` es **paralela** al fork de `zonab-1` — sus commits NO están en la cadena del diff smoke.

**Superficie de PRODUCTO-1 que la Auditoría #2 debe cubrir explícitamente** (además del diff producto-2):

### RPC `buscar_servicios` — superficie interesante

- Migration `migrations/20260731_buscar_servicios_agenda_activa_fix.sql`: agrega columna derivada `tiene_agenda_activa boolean` al output del RPC. Semáforo canónico F1 (`duracion_slot_min IS NOT NULL`) o F2 (`capacidad_estadia IS NOT NULL`).
- **Modificaciones a revisar**:
  - `SECURITY DEFINER` vs `SECURITY INVOKER`: si el RPC corre como definer, cualquier fila pasa el filtro RLS aunque el caller anon no tenga permiso. Riesgo si el RPC lee columnas que RLS oculta a anon.
  - **Input path de búsqueda**: `p_categoria_slug`, `p_comuna`, `p_texto`, `p_precio_min/max`, `p_mascota_tipo`. Los strings entran a `ILIKE` o comparaciones — verificar sanitización + boundaries.
  - **Fix del incidente PR1** (columna `duracion_min` referenciada — no existía; renombrada a `duracion_slot_min`): confirmar que el fix aterrizado no dejó otro nombre-inexistente latente.
  - `tiene_agenda_activa` es booleano derivado — sin surface de injection, pero verificar que la lógica no filtre servicios que RLS de otras vistas oculta.

### Categoría Etología — wizard 12 campos

- `lib/camposPorCategoria.ts` entry `etologia` con 12 campos: `especialidades_conductuales` (multiselect), `enfoque_metodologico`, `trabaja_con_veterinario` (boolean), `duracion_sesion`, `anios_experiencia`, `metodo_evaluacion_inicial`, etc.
- **Superficie a revisar**:
  - Persistencia en `servicios_publicados.detalles` (JSONB) — verificar que no hay fields con XSS renderer downstream sin sanitize (aunque React salva la mayoría).
  - Validación server-side de tipos: si el wizard permite meter cualquier string a un multiselect, verificar si algún consumer downstream asume tipos específicos.

### Categoría "Etología y Conducta" + cross-links

- Migration `migrations/20260731_categoria_etologia.sql`: INSERT idempotente con `slug='etologia'`, `icono='🧠'`, `orden=45`.
- Cross-links bidireccional `adiestramiento ↔ etologia` en `CROSS_LINKS` de `pages/explorar.tsx`.
- **Superficie a revisar**: enlaces cruzados renderean texto de otra categoría — verificar que el label viene de config estática, no de user input.

### Badge "Reserva online" (PR1)

- `components/Explore/ServiceCard.tsx`: badge condicional según `service.tiene_agenda_activa` (viene del RPC).
- `lib/serviceMapper.ts`: `mapRpcToServiceResult` lee `tiene_agenda_activa`, `mapJoinToServiceResult` calcula con paridad semáforo.
- **Superficie a revisar**: si `tiene_agenda_activa` viene falseado (RPC roto o data corrupta), el badge se muestra en servicios sin agenda — UX degrade, no security. Sin risk.

## Módulo "UX Walkthrough Navegado" (habilitado por plugins Playwright + Chrome DevTools)

Corre **después** de la pasada de revisores. 3 recorridos golden path contra **preview staging consolidado** (post-desfile):

- **Proveedor**: registro → perfil → publicar servicio → configurar agenda F1 y F2 → **wizard etología con sus 12 campos** (PRODUCTO-1).
- **Tutora**: búsqueda → ficha (con badge "Reserva online" PRODUCTO-1) → reserva F1 → reserva F2 → cancelación → reseña → **/mis-reservas completa (pestañas + filtros + CTA vencida + chip mascota — PRODUCTO-2)**.
- **Admin**: aprobación de proveedor + moderación (superficie ZONAB-1: modales admin con role/aria + spec s10 ficha proveedor).

**Cosecha por recorrido**: errores de consola, requests fallidos (4xx/5xx en Network), estados visualmente rotos (screenshot), fricciones UX (heurísticas + a11y). Los findings entran al triage único con score comparable.

**Credenciales**: **PROHIBIDO navegar prod loggeado**. Solo staging con las cuentas del setup e2e (Camila tutora / Aldo proveedor+admin). Regla documentada en CLAUDE.md sección "Plugins Playwright + Chrome DevTools".

---

## Bundles del backlog que salen del triage

Los propuestos en `REPORTE_DIAGNOSTICO_ERRORS_PROD.md` entran al triage como findings de partida:

- **Bundle SEO** (307/410/404 + sitemap.estado + log info): ítems A + B1 + C, ~1h implementación.
- **Bundle GA** (gate por entorno + limpiar consent storageState + filtro tráfico interno): ítems E + G, ~25 min implementación.
- **Sprint ANALYTICS-1** (taxonomía 11 eventos aprobados por PO 2026-08-04): ver `BACKLOG.md` sección "Sprint ANALYTICS-1". **Prerequisito**: bundle GA gate por entorno primero.

## Post-triage

- Lista priorizada de findings entra al backlog con severidad + esfuerzo.
- Los High confidence (score >80) van al primer sprint post-Auditoría.
- Los Medium (60-80) al segundo sprint.
- Los Low (<60) al backlog general con trigger.
