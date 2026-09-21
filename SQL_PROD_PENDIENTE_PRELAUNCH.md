# SQL prod pendiente · sprint prelaunch (cadena B→C→D→E)

**Fecha**: 2026-09-15
**Estado**: consolidado tras cierre de Bloques B (tipo-cd), C (higiene), D (explorar/paneles/base-UI) y E (UX).

**✅ CERRADO 2026-09-21** — todos los items de este archivo aplicados en prod por el PO. Ver notas por bloque abajo.

Todo lo que sigue debe ejecutarlo **Aldo** manualmente en Supabase Studio (Project `ouezpeeiwjwawauidrqq`, rol `postgres`) — el auditor no tiene RW en prod. Reglas P2 (evidencia por fase), P5 (evidencia commiteada), P6 (verificación previa contra `information_schema`) aplican.

---

## Bloque D-2 · 404-SEED-FIX

**Sin SQL requerido**. El fix es code-only (redirect 301 en `next.config.js` para `/proveedor/:id(b1000001-.*)` → `/explorar`). Google reindexará gradualmente. Se aterriza con el merge de PR #34 → prod.

## Bloque E-1 · DUP-CAMPOS-CATEGORIA — migración `detalles.comunas_cobertura` → `detalles.notas`

**✅ APLICADO EN PROD 2026-09-21** (verificación PO):
- **1 fila afectada** — servicio `2713b823-6439-49d7-ab03-fe748bda2454`.
- `notas_final` con el sufijo "Cobertura declarada:" correctamente concatenado al `notas` previo.
- Assertion `DO $$` verificó cero remanente de la key `detalles.comunas_cobertura`.
- Migración prod CERRADA.

**Impacto empírico prod** (verificado 2026-09-15 vía MCP `supabase-prod-ro`, previo al apply):
- **1 fila** con la key duplicada: servicio `2713b823-6439-49d7-ab03-fe748bda2454` ("Lo acompaño a sus tramites", categoría `traslado`), con `detalles.comunas_cobertura = "Todo Santiago"`.

**Migración canónica** (idempotente, `RETURNING` para evidencia P5):

```sql
UPDATE servicios_publicados sp
   SET detalles = (
       CASE
         WHEN sp.detalles->>'notas' IS NULL OR btrim(sp.detalles->>'notas') = ''
         THEN (sp.detalles - 'comunas_cobertura')
              || jsonb_build_object('notas', 'Cobertura declarada: ' || (sp.detalles->>'comunas_cobertura'))
         ELSE (sp.detalles - 'comunas_cobertura')
              || jsonb_build_object('notas', (sp.detalles->>'notas') || E'\n\nCobertura declarada: ' || (sp.detalles->>'comunas_cobertura'))
       END
   )
 WHERE sp.detalles ? 'comunas_cobertura'
   AND sp.detalles->>'comunas_cobertura' IS NOT NULL
   AND btrim(sp.detalles->>'comunas_cobertura') <> ''
RETURNING id, titulo, detalles->>'notas' AS notas_final;
```

**Assertion post-migración** (correr en el MISMO bloque para evidencia inmediata):

```sql
DO $$
DECLARE
    remanente int;
BEGIN
    SELECT COUNT(*) INTO remanente
      FROM servicios_publicados
     WHERE detalles ? 'comunas_cobertura';
    IF remanente > 0 THEN
        RAISE EXCEPTION 'DUP-CAMPOS-CATEGORIA: quedan % filas con detalles.comunas_cobertura después de la migración', remanente;
    END IF;
    RAISE NOTICE 'DUP-CAMPOS-CATEGORIA OK: cero remanente de detalles.comunas_cobertura';
END $$;
```

**Verificación previa opcional** (positivo conocido — confirmar que el servicio `2713b823` sigue con la key antes de migrar):

```sql
SELECT id, titulo, detalles->>'comunas_cobertura' AS legacy_cob, detalles->>'notas' AS notas_actual
  FROM servicios_publicados
 WHERE id = '2713b823-6439-49d7-ab03-fe748bda2454';
```

**Verificación post-migración** (que el `RETURNING` no cubre — chequear que el prefijo "Cobertura declarada:" quedó bien concatenado al final del `notas`):

```sql
SELECT detalles->>'notas' AS notas_final
  FROM servicios_publicados
 WHERE id = '2713b823-6439-49d7-ab03-fe748bda2454';
```

El resultado esperado depende de si el servicio ya tenía `notas` previa. Si `notas` estaba vacío, el resultado será `"Cobertura declarada: Todo Santiago"`. Si tenía contenido, quedará `"<notas previas>\n\nCobertura declarada: Todo Santiago"`.

---

## Cierre

Con estos 2 bloques SQL aplicados a prod:
1. Bloque D-2 code-only, sin SQL.
2. Bloque E-1 DUP-CAMPOS-CATEGORIA, 1 fila esperada.

Todo el resto de la cadena B→C→D→E aterriza vía code merge (PRs #29→#36) sin SQL prod adicional.

Verificación cruzada post-merge (Aldo, opcional):
- `curl -sI https://www.pawnecta.com/proveedor/b1000001-0000-4000-8000-000000000001` → esperar `HTTP/2 301 location: /explorar`.
- Ficha pública de un proveedor real en prod → verificar que aparece "Comuna, Región" bajo el título.
- Editor de servicio veterinario o traslado en prod → verificar que el campo "Comunas atendidas a domicilio" texto libre ya NO aparece (chips picker sigue vivo).
