# Auditoría performance post-fixes del viernes — 2026-11-22

Written for: el PO (Aldo), seguimiento comparativo a [`perf-core-20261119.md`](perf-core-20261119.md).

## Estado de las mediciones

**Mediciones remotas vía PageSpeed Insights API hoy (2026-11-22)**: bloqueadas por **HTTP 429 Too Many Requests** en las 5 llamadas intentadas (home, explorar, ficha, perfil, cualquier intento repetido 20 min después). PSI free tier sin API key tiene rate limit diario muy bajo que se agotó rápido.

**Consecuencia**: no se pudo generar tabla antes/después con datos nuevos hoy. Entregable queda incompleto — propuesta para completarlo con mediciones locales del PO el lunes AM (sección §Acción PO abajo).

## Qué aterrizó entre 2026-11-19 (baseline) y 2026-11-22

Grep sobre commits a main en la ventana (~15 commits relevantes):

| Commit | Qué toca perf | Relación con baseline |
|--------|----------------|------------------------|
| `ab12c56` `perf · min-h wrapper ReviewList evita CLS en ficha sin reviews` | **P3 del baseline** (ReviewList skeleton min-h) | ✅ **Fix aterrizado** |
| `db72a83` `a11y · contraste sistémico text-slate-400→500 + text-accent-500→600` | No-op perf (puro a11y) | Neutral |
| `315cb08` `admin · dashboard /admin/metricas-proveedores (Opción B meta 100)` | No afecta superficie pública | Neutral |
| `aad2a78` `admin · columna Registrado en /admin/proveedores con sort toggle` | No afecta superficie pública | Neutral |
| `aa222a3` `fix · Footer slugs obsoletos → ~14 links rotos en prod cerrados` | SEO (indirecto perf) | Neutral |
| `397ba72` `blog · reemplazar placeholders por fotos Unsplash + screenshot /explorar` | Blog imágenes (reducción tamaño si Unsplash tiene URLs optimizadas) | Posible pequeño impacto en blog |
| Resto (`docs`, `backlog`, etc.) | Zero código productivo | Neutral |

**Observación**: el único fix de perf real del ciclo fue **P3** (min-h ReviewList → esperado CLS mobile ficha baja ~0.02-0.05). P1 (diagnóstico CLS mobile ficha con rootCauses) + P2 (sizes ServiceCard explorar) + P4 (LCP home-mobile) + P5 (priority 1er slide carrusel) **no se aterrizaron en la ventana**. El PO los priorizó para "post-launch oportunista" (ver `perf-core-20261119.md > D1`).

## Qué cambió en el período que PUDE verificar sin PSI

### 1. P3 ReviewList skeleton min-h (commit ab12c56)

Lectura del diff en `components/Service/ReviewList.tsx` + posicionamiento del wrapper: fix correcto, aterrizado como se propuso.

**Esperado**: CLS mobile ficha baja de 0.187 → ~0.15-0.17 (reducción ~0.02-0.05 según baseline). No alcanza umbral verde (<0.1) pero avanza en la dirección correcta.

**No verificable sin PSI**: necesito medición real para confirmar.

### 2. Cambios a11y de contraste (commit db72a83)

El sprint `a11y-contraste` cambió múltiples `text-slate-400 → text-slate-500` + `text-accent-500 → text-accent-600` across varios archivos. Impacto en perf: cero (misma clase CSS, mismo bundle, mismo DOM). Solo cambia la paleta renderizada.

### 3. Blog Unsplash (commit 397ba72)

Si las URLs de Unsplash usan parámetros de tamaño (`?w=800&q=80`) en vez de full-res, el blog debería tener bundle de imagen más chico vs el placeholder genérico previo. **No es superficie high-traffic**, el impacto es marginal en la métrica global.

## Hipótesis sin medir

Por qué el PO vale la pena correr la medición completa el lunes AM:

- **H1**: CLS mobile ficha probablemente bajó ~0.02-0.04 por P3. Si está ahora en ~0.15, todavía está en "POBRE marginal" (umbral verde <0.1).
- **H2**: LCP mobile de las demás páginas sin cambio — baseline sigue válido.
- **H3**: Score global Perf probablemente igual o marginalmente mejor (~1-3 puntos arriba).
- **H4**: No hay regresión obvia por los cambios de a11y ni blog.

## Acción propuesta para el PO (lunes AM)

**Opción A (recomendada, 10 min)**: correr Lighthouse local desde CLI.

```bash
# Instalar si no está:
npm install -g lighthouse

# Medir 4 URLs clave (mobile throttled):
lighthouse https://www.pawnecta.com --form-factor=mobile --output=json --output=html --output-path=./tmp/lh-home --quiet
lighthouse https://www.pawnecta.com/explorar --form-factor=mobile --output=json --output=html --output-path=./tmp/lh-explorar --quiet
lighthouse https://www.pawnecta.com/servicio/52a6e060-14f2-491d-900e-76240318aadc --form-factor=mobile --output=json --output=html --output-path=./tmp/lh-ficha --quiet
lighthouse https://www.pawnecta.com/proveedor/ad258d35-9081-4dbd-8dd0-9a13b9ee7e89 --form-factor=mobile --output=json --output=html --output-path=./tmp/lh-prov --quiet
```

Los .html abren en browser; los .json tienen todos los detalles (incluye `layout-shifts > rootCauses` para diagnóstico CLS).

Luego: compartir los 4 scores + CLS en chat → el auditor arma la tabla antes/después con la data real y actualiza este documento.

**Opción B (desde web, ~5 min)**: usar `https://pagespeed.web.dev/analysis?url=...` directamente en el browser (sin CLI). Mismo resultado, UI más amigable, requiere 4 clicks separados.

**Opción C (defer al post-launch)**: dejar las mediciones para el primer sprint post-launch cuando ya hay tráfico real (más representativo).

## Métricas baseline para comparar (del 2026-11-19)

| URL | Perf mobile | LCP mobile | CLS mobile |
|-----|---:|---:|---:|
| `/` | 90 | 3.5s | 0 |
| `/explorar` | 77 | 5.8s | 0 |
| `/servicio/{id}` | 71 | 4.4s | **0.187** |
| `/proveedor/{id}` | sin baseline | — | — |

Objetivo verde mobile: Perf ≥90, LCP <2.5s, CLS <0.1. Hoy: 1 de 3 URLs está verde (home en perf, pero no en LCP).

## Recomendación final

**No hay data nueva para decidir sprints perf hoy**. Las 4 P pendientes del baseline (P1, P2, P4, P5) siguen válidas en priorización. Nada en el ciclo 19→22 cambia esa conclusión.

El PO decide si:
- Aterrizar Opción A el lunes AM + completar este documento.
- O ir directo a post-launch oportunista como quedó fijado en `perf-core-20261119.md > D1`.

---

**Registro meta**: esta auditoría fue bloqueada parcialmente por rate limit de PSI free tier. Para evitar en futuras auditorías remotas, el proyecto podría conseguir una [API key de PSI](https://developers.google.com/speed/docs/insights/v5/get-started) (gratis, cuota mayor) + guardarla en env del PO para el CLI. 5 minutos de setup para auditor autónomo futuro. Candidato BACKLOG: `PSI-API-KEY-SETUP`.
