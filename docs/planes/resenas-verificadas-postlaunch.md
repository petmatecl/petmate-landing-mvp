# Plan — Reseñas verificadas vs no verificadas (post-launch)

**Audiencia**: PO.
**Alcance**: implementación del esquema de reseñas en dos tiers (verificadas vs no verificadas), cronograma, estimación, verificaciones.
**Decisiones del PO (base, 2026-11-19)**:
1. **Rating promedio principal** cuenta solo reseñas verificadas.
2. **Dejar reseña sin verificar**: basta con estar logueado. Sin gate por contacto/reserva.
3. **Rate limits**: máximo 1 reseña sin verificar por par (tutor, proveedor) + máximo 3 reseñas sin verificar por tutor en sus primeros 30 días desde `usuarios_buscadores.created_at`.
4. **Badge visual**: "Cliente verificado" en verde al lado del autor; reseñas sin verificar sin badge.
5. **Semana 2026-11-26 → 2026-11-30**: sprint ~4-6h.

---

## Qué es "verificada"

Una reseña se considera **verificada** cuando el tutor que la escribió tiene al menos un `agendamiento` **con el mismo `proveedor_id`** (cualquier servicio del proveedor, no exige servicio_id específico) que cumpla:
- `estado = 'confirmada'` o `estado` terminal con fecha pasada (realizada derivada)
- `fecha_preferida < NOW()` (fecha del servicio ya pasó)

Si no cumple ese criterio al momento del INSERT, se guarda como **no verificada** y entra bajo los rate limits.

**Decisión PO confirmada 2026-11-19**:
- **Snapshot**: la columna `verificada` se calcula una vez al INSERT y queda congelada. No se re-evalúa en runs posteriores. Si hay un caso puntual de fraude o corrección (ej. agendamiento cancelado retroactivamente), se interviene manualmente desde el panel admin.
- **Ámbito proveedor**: basta con cualquier agendamiento cumplido con el proveedor; no se exige servicio específico. Rationale PO: un tutor que contrató al proveedor para servicio A puede evaluar también servicios B/C del mismo proveedor de forma informada.

---

## Schema BD

### Migración nueva

`migrations/20261126_evaluaciones_verificada.sql`:

```sql
BEGIN;

-- Columna snapshot: true si al INSERT el tutor cumplía el criterio de verificación.
ALTER TABLE public.evaluaciones
    ADD COLUMN verificada boolean NOT NULL DEFAULT false;

-- Backfill de las reseñas existentes. Criterio aplicado retroactivamente
-- (ámbito proveedor, decisión PO 2026-11-19):
-- la evaluación es verificada si el tutor tenía algún agendamiento con ese
-- proveedor_id (cualquier servicio) en estado 'confirmada' con
-- fecha_preferida < evaluacion.created_at.
UPDATE public.evaluaciones e
   SET verificada = true
  FROM public.agendamientos a
  JOIN public.usuarios_buscadores ub ON a.tutor_id = ub.id
 WHERE e.proveedor_id = a.proveedor_id
   AND e.usuario_id = ub.auth_user_id
   AND a.estado = 'confirmada'
   AND a.fecha_preferida < e.created_at;

-- Índice para queries por verificada (ReviewSummary filtra por verificada=true
-- para calcular promedio principal).
CREATE INDEX IF NOT EXISTS idx_evaluaciones_servicio_verificada
    ON public.evaluaciones (servicio_id, verificada) WHERE estado = 'aprobado';

CREATE INDEX IF NOT EXISTS idx_evaluaciones_proveedor_verificada
    ON public.evaluaciones (proveedor_id, verificada) WHERE estado = 'aprobado';

COMMIT;
```

Verificación post-aplicación:

```sql
-- V1: conteo backfill vs nulos
SELECT
    COUNT(*) FILTER (WHERE verificada = true)  AS verificadas,
    COUNT(*) FILTER (WHERE verificada = false) AS no_verificadas,
    COUNT(*) AS total
  FROM public.evaluaciones
 WHERE estado = 'aprobado';
-- Esperable: verificadas + no_verificadas = total

-- V2: shape de la nueva columna
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'evaluaciones'
   AND column_name = 'verificada';
-- Esperable: boolean / NO / false

-- V3: índices creados
SELECT indexname FROM pg_indexes
 WHERE tablename = 'evaluaciones'
   AND indexname LIKE '%verificada%';
-- Esperable: 2 filas (servicio + proveedor)
```

### Regla CLAUDE.md § P6.2 aplicada

Esta migración **no toca funciones/RPCs**, solo tabla. No requiere GRANT explícito (el ALTER TABLE preserva RLS existente). Pero sí verificar que RLS siga aceptando SELECT para anon (lectura pública) y INSERT para authenticated (tutor dejando reseña). Si una policy filtra por columna específica, agregar `verificada` al allow-list.

---

## Rate limits — enforcement

### Opción A: trigger PL/pgSQL (recomendada)

Un trigger `BEFORE INSERT` que rechaza con `RAISE EXCEPTION` si:
- **Regla 1 (1 por par)**: ya existe una reseña del mismo `usuario_id` para el mismo `proveedor_id` con `verificada = false` Y la nueva también sería `verificada = false`.
- **Regla 2 (3 por tutor/30d)**: el `usuario_id` creó su cuenta hace ≤ 30 días Y ya tiene ≥ 3 reseñas con `verificada = false`.

```sql
CREATE OR REPLACE FUNCTION public.evaluaciones_rate_limit_no_verificada()
RETURNS TRIGGER AS $$
DECLARE
    v_cuenta_dias integer;
    v_count_sin_verif integer;
    v_count_par_sin_verif integer;
    v_tutor_created_at timestamptz;
BEGIN
    IF NEW.verificada = true THEN
        RETURN NEW;  -- las verificadas no tienen rate limit
    END IF;

    -- Edad de la cuenta
    SELECT ub.created_at INTO v_tutor_created_at
      FROM public.usuarios_buscadores ub
     WHERE ub.auth_user_id = NEW.usuario_id;
    v_cuenta_dias := EXTRACT(DAY FROM (NOW() - v_tutor_created_at));

    -- Regla 1: 1 por par
    SELECT COUNT(*) INTO v_count_par_sin_verif
      FROM public.evaluaciones
     WHERE usuario_id = NEW.usuario_id
       AND proveedor_id = NEW.proveedor_id
       AND verificada = false;

    IF v_count_par_sin_verif >= 1 THEN
        RAISE EXCEPTION
          'Ya dejaste una reseña sin verificar para este proveedor. Puedes volver a evaluarlo cuando reserves y el servicio se complete.'
          USING ERRCODE = 'P0001';
    END IF;

    -- Regla 2: 3 por tutor/30d (solo aplica si la cuenta tiene <= 30 días)
    IF v_cuenta_dias <= 30 THEN
        SELECT COUNT(*) INTO v_count_sin_verif
          FROM public.evaluaciones
         WHERE usuario_id = NEW.usuario_id
           AND verificada = false;

        IF v_count_sin_verif >= 3 THEN
            RAISE EXCEPTION
              'Alcanzaste el máximo de 3 reseñas sin verificar en tus primeros 30 días. Puedes seguir evaluando a proveedores con los que hayas reservado.'
              USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER evaluaciones_rate_limit
    BEFORE INSERT ON public.evaluaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.evaluaciones_rate_limit_no_verificada();
```

**Ventajas**:
- Server-side, imposible saltar desde cliente manipulando el JS.
- Mensaje de error estructurado → el frontend lo muestra como toast.
- Cero race condition (el trigger corre dentro de la transacción del INSERT).

**Alternativa Opción B**: validar solo en cliente antes del INSERT. **Rechazada** — cualquier user puede abrir devtools y saltar el gate.

### GRANT

El trigger es `SECURITY DEFINER` y no requiere grants adicionales. Pero si el ALTER TABLE/CREATE TRIGGER se reinicializa, aplicar regla CLAUDE.md § P6.2 — adjuntar grants solo si re-creas la RPC `buscar_servicios` o afines. Este trigger no afecta eso.

---

## Lógica del tutor side (frontend)

### `components/Service/ReviewForm.tsx`

- **Gate actual** (línea 67-97): `conversation` OR `agendamiento confirmado + fecha pasada`. **Cambiar a**: solo `user !== null` (logueado). Remover el `useEffect` del gate completo — o conservarlo pero usarlo para **computar `verificada` en el INSERT**, no para gatear.
- **Lógica nueva al submit** (ámbito proveedor, decisión PO):
  1. Chequear si `agendamiento confirmado + fecha pasada` existe para `user.id + proveedor_id` (cualquier servicio del proveedor).
  2. Si sí → `verificada = true`.
  3. Si no → `verificada = false`.
  4. INSERT con el flag correcto. El trigger valida rate limits si `verificada = false`.
- **UX del form**:
  - Hint visible si va a ser no verificada: *"Esta reseña se marcará sin verificar porque aún no has contratado a este proveedor. Se publica pero el promedio principal deja de contarla cuando aparezca al menos una reseña verificada."*
  - Captura del error del trigger (ERRCODE P0001) → toast con el mensaje.

### `components/Service/ReviewModal.tsx`

- **Gate actual** (línea 53-59): `contactos.count > 0`. **Cambiar a**: solo `user !== null`. Si no hay contactos previos, aún así permite reseña (no verificada).

### `components/Service/ReviewList.tsx`

- Renderizar badge **"Cliente verificado"** verde al lado del autor si `evaluacion.verificada = true`. Sin badge si `verificada = false`.
- Las no verificadas **sí** aparecen en la lista (orden: verificadas primero, luego no verificadas, ambas por fecha desc).

### `components/Service/ReviewSummary.tsx`

**Lógica del promedio según decisión PO 2026-11-19 (cero esconder datos, todo contextualizar)**:

- **Si hay ≥ 1 verificada**: promedio principal = `AVG(rating) WHERE verificada = true AND estado = 'aprobado'`.
  - Nota de contexto abajo/al costado: *"basado en N reseñas verificadas"*.
  - Si además hay no verificadas, sublínea secundaria: *"Además M reseñas sin verificar"*.
- **Si solo hay no verificadas**: promedio principal = `AVG(rating) WHERE estado = 'aprobado'` (todas las no verificadas).
  - Nota de contexto abajo/al costado: *"basado en N reseñas sin verificar"* (en gris, más chico, explicativa).
- **Si no hay reseñas**: placeholder actual (sin cambio).

Consulta canónica (una sola query, computes both counts):

```sql
SELECT
    COUNT(*) FILTER (WHERE verificada = true)  AS count_verif,
    COUNT(*) FILTER (WHERE verificada = false) AS count_no_verif,
    AVG(rating) FILTER (WHERE verificada = true)  AS avg_verif,
    AVG(rating) FILTER (WHERE verificada = false) AS avg_no_verif
  FROM public.evaluaciones
 WHERE (servicio_id = $1 OR proveedor_id = $2)
   AND estado = 'aprobado';
```

Cliente decide qué promedio mostrar y qué nota basado en `count_verif` vs `count_no_verif`.

---

## Spec e2e

`e2e/specs/resenas-verif/no-verif-flow.spec.ts`:

1. **R1 — tutor sin agendamiento previo deja reseña → verificada=false en BD** (fixture: usuario_buscadores.created_at > 30d para evitar rate limit).
2. **R2 — tutor con agendamiento confirmado+fecha pasada deja reseña → verificada=true**.
3. **R3 — tutor intenta 2ª reseña sin verificar al mismo proveedor → trigger rechaza con mensaje**.
4. **R4 — tutor nuevo (<30d) intenta 4ª reseña sin verificar → trigger rechaza por max 3**.
5. **R5 — ReviewSummary muestra promedio solo con verificadas** (fixture: 3 evaluaciones mix verificadas+no, verificar que `{rating_promedio}` matches solo las verificadas).
6. **R6 — badge "Cliente verificado" verde solo al lado de verificadas**.

Usar fixtures de `e2e/fixtures/supabaseAdmin.ts` con `getSupabaseAdmin()` para setup.

---

## Cronograma estimado (sprint reseñas-verificadas)

| Bloque | Esfuerzo | Entregable |
|---|---|---|
| 1. Migración BD + trigger + GRANTS | 1h | `migrations/20261126_evaluaciones_verificada.sql` aplicada staging + prod |
| 2. Lógica tutor side (ReviewForm/Modal/List/Summary) | 1.5h | 4 componentes editados + hint UX visible |
| 3. Badge "Cliente verificado" + estilos | 0.5h | Visualización consistente en ReviewList + ReviewSummary |
| 4. Spec e2e R1-R6 | 1.5h | `resenas-verif/no-verif-flow.spec.ts` con 6 tests verdes en preview |
| 5. Smoke staging + prod post-merge | 0.5h | 2-3 reseñas smoke, verificar promedio + badge + rate limit |
| **Total** | **~5h** | Dentro del rango 4-6h estimado por PO |

**Ventana sugerida**: miércoles 2026-11-26 o jueves 2026-11-27 (lanzamiento 2026-11-25 + día de soak + sprint).

---

## Dependencias

- **Pre-requisito**: que el launch del 2026-11-25 esté estable 24h+ antes de iniciar.
- **Decisiones PO confirmadas 2026-11-19** (ver arriba):
  1. Snapshot (al INSERT, no re-evalúa).
  2. Ámbito proveedor (no servicio_id).
  3. UI con solo no verificadas: muestra promedio con nota "basado en N reseñas sin verificar"; al aparecer 1 verificada, promedio pasa a solo verificadas con nota "basado en N reseñas verificadas". Cero esconder datos, todo contextualizar.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Backfill mal calcula verificadas históricas | Testing en staging primero + V1 contrasta conteos antes de prod |
| Rate limit rechaza INSERT desde una UI que no captura bien el P0001 | ReviewForm catch específico para ERRCODE P0001 → toast con `error.message`; tests e2e R3+R4 validan |
| Trigger agrega latencia al INSERT | Muy bajo — queries indexadas sobre `(usuario_id, proveedor_id)` + `(usuario_id)`. Cada chequeo <5ms |
| Proveedor acumula muchas no verificadas (spam) | Rate limit 1 por par ya lo frena. Si aparece abuso: endpoint admin para moderar + opción de admin para marcar `verificada` manualmente (fase 2 si se necesita) |

---

## Entregables del sprint

1. `migrations/20261126_evaluaciones_verificada.sql` — migración + trigger + índices.
2. `migrations/20261126_evaluaciones_verificada_grants.sql` (si el trigger es RPC) — grants (según P6.2).
3. 4 componentes editados en `components/Service/*`.
4. 1 spec e2e nuevo con 6 tests.
5. Smoke doc en `docs/sprints/resenas-verificadas-20261126.md` tras merge.
6. Entrada en BACKLOG post-sprint: moderación admin de no verificadas (fase 2 si se necesita).

---

## Estado del plan — 2026-11-19

Las 3 decisiones de diseño confirmadas por PO el 2026-11-19 (ver sección "Qué es verificada" + "ReviewSummary" + "Dependencias"). Plan **listo para ejecutar** — sprint de ~5h cabe en martes 2026-11-26 o miércoles 2026-11-27 post-launch.

Antes del arranque del sprint: verificar que el launch del 2026-11-25 está estable (24h+ sin incidentes). Si aparece algo que exija foco, posponer el sprint a jueves 27 o viernes 28.
