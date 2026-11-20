# SEO-EXPLORAR-DUPLICATE — Propuesta canonical para /explorar

**Autor**: auditor · **Fecha**: 2026-11-19 · **Estado**: propuesta sin código.
**Trigger**: 16 URLs de `/explorar` con filtros marcadas "duplicada sin canonical" en Search Console (reporte PO 2026-11-19).

## Hallazgo correctivo — canonical SÍ existe hoy

Primera verificación (`grep canonical pages/explorar.tsx`):

```
pages/explorar.tsx:550:
    <link rel="canonical" href="https://www.pawnecta.com/explorar" />
```

El canonical **ya está hardcoded** apuntando a `https://www.pawnecta.com/explorar` (sin query params), para TODAS las variantes.

**Pregunta**: si el canonical existe y es consistente, ¿por qué Search Console marca 16 URLs como "duplicada sin canonical"?

## Diagnóstico de la causa

Tres hipótesis ordenadas por probabilidad:

### Hipótesis 1 — Mezcla www / no-www (confirmado por PO 2026-11-19)

El canonical emite `https://www.pawnecta.com/explorar` pero Google crawlea también `https://pawnecta.com/explorar` (sin www, si DNS resuelve ambos). Cuando el canonical apunta a un **host distinto** al del crawl, Google lo marca como "duplicada sin canonical" porque el canonical no es self-referential para ese host.

**Fix**: resolver primero **WWW-CANONICAL** (ya en BACKLOG). Redirect 301 permanente `pawnecta.com/*` → `www.pawnecta.com/*` o viceversa, según decisión PO. Una vez consolidado el host, el canonical actual funciona sin cambios adicionales.

**Confirmación**: PO lo mencionó explícitamente en el mensaje: "Google ve cada combinación de ?categoria=X&comuna=Y como página distinta, y encima mezcla www y no-www, inflando el conteo".

### Hipótesis 2 — El canonical no diferencia filtros con landing propia

Hoy `/explorar?categoria=cuidado&comuna=Providencia` canonical → `/explorar`. Pero existe **también** la landing dedicada `/cuidado/Providencia` ([pages/[categoria]/[comuna].tsx](../../pages/[categoria]/[comuna].tsx)) que es la URL **más específica y SEO-friendly**.

Google prefiere la URL más específica como canonical. Si Google indexa tanto `/explorar?categoria=cuidado&comuna=Providencia` como `/cuidado/Providencia`, y los contenidos son similares, puede decidir que **ninguno es canonical de la otra** y ambas quedan "duplicada sin canonical".

**Fix**: canonical dinámico en `/explorar` que apunte a la landing específica cuando existe:

- `?categoria=X&comuna=Y` → canonical `/X/Y` (siempre existe por `getStaticPaths` del `[comuna].tsx`).
- `?categoria=X` (sin comuna) → canonical `/X`.
- Sin filtros, o con solo `texto`/`precio`/`mascota`/`modalidad` → canonical `/explorar`.

### Hipótesis 3 — Filtros no-landing (precio, mascota, texto, modalidad, inclusiones) multiplican variantes

`/explorar?precio_max=20000&mascota=perro` no tiene landing propia. Google ve estas combinaciones como páginas distintas aunque el contenido real es "subset filtrado del listado completo".

**Fix**: el canonical hacia `/explorar` sin query params (estado actual) ya lo resuelve, **si Google respeta el canonical**. Combinado con el fix de la Hipótesis 1 (www), debería funcionar.

## Las 16 URLs reportadas por Search Console (sin acceso al dashboard)

**No tengo acceso directo al Search Console** para listar las 16 URLs exactas. Propongo mapping teórico basado en las 10 categorías + comunas más visitadas:

| Patrón URL duplicada (teórica) | Canonical propuesto | Lógica |
|---|---|---|
| `?categoria=cuidado&comuna=Providencia` | `/cuidado/Providencia` | landing dedicada |
| `?categoria=cuidado&comuna=Ñuñoa` | `/cuidado/Ñuñoa` | landing dedicada |
| `?categoria=cuidado&comuna=Vitacura` | `/cuidado/Vitacura` | landing dedicada |
| `?categoria=paseos&comuna=Providencia` | `/paseos/Providencia` | landing dedicada |
| `?categoria=paseos&comuna=Ñuñoa` | `/paseos/Ñuñoa` | landing dedicada |
| `?categoria=peluqueria&comuna=...` | `/peluqueria/[comuna]` | landing dedicada |
| `?categoria=veterinario&comuna=...` | `/veterinario/[comuna]` | landing dedicada |
| `?categoria=guarderia&comuna=...` | `/guarderia/[comuna]` | landing dedicada |
| `?categoria=cuidado` (sin comuna) | `/cuidado` | landing categoría |
| `?categoria=paseos` (sin comuna) | `/paseos` | landing categoría |
| `?categoria=peluqueria` (sin comuna) | `/peluqueria` | landing categoría |
| `?categoria=veterinario` (sin comuna) | `/veterinario` | landing categoría |
| `?precio_max=X` (sin categoría) | `/explorar` | sin landing, canonical raíz |
| `?mascota=perro` (sin categoría) | `/explorar` | sin landing, canonical raíz |
| `?texto=X` | `/explorar` | sin landing, canonical raíz |
| `?comuna=X` (sin categoría) | `/explorar` | sin landing, canonical raíz |

**Verificación empírica necesaria pre-apply**: pedirte al PO que extraiga las 16 URLs reales de Search Console → Coverage → "Duplicada sin canonical" → export CSV. Yo las clasifico según el mapping y confirmo canonical para cada una.

## Fix propuesto — pseudo-código

En `pages/explorar.tsx` (hoy L550), reemplazar el canonical hardcoded por:

```tsx
// Pseudo — el fix real implementa esto en el Head de /explorar.
const router = useRouter();
const { categoria, comuna } = router.query;
const CATEGORIAS_CON_LANDING = ['adiestramiento','cuidado','etologia','fotografia','guarderia','paseos','peluqueria','retratos','traslado','veterinario'];

function canonicalFor(categoria?: string, comuna?: string): string {
    const base = 'https://www.pawnecta.com';  // tras resolver WWW-CANONICAL
    if (categoria && CATEGORIAS_CON_LANDING.includes(categoria)) {
        if (comuna) return `${base}/${categoria}/${encodeURIComponent(comuna)}`;
        return `${base}/${categoria}`;
    }
    return `${base}/explorar`;
}

<link rel="canonical" href={canonicalFor(categoria as string, comuna as string)} />
```

**Trade-off aceptado**: si el user navega a `/explorar?categoria=cuidado&comuna=Providencia`, el canonical apunta a `/cuidado/Providencia` aunque la URL activa sea `/explorar?...`. Google eventualmente consolida y la URL `/explorar?...` deja de aparecer en resultados; aparece solo `/cuidado/Providencia`. Esto **mejora** el SEO (landing dedicada tiene mejor contenido optimizado), no lo empeora.

## Pre-requisitos y orden

1. **WWW-CANONICAL primero** (ya en BACKLOG). Sin esto, el canonical sigue dividido entre hosts.
2. **Fix canonical dinámico en `/explorar`** (este ítem). Requiere lista de categorías + estimar ~1 h código + 1 h validación en Search Console (indexación demora semanas en reflejar).
3. **Validación empírica post-apply**: pedirle al PO extraer las 16 URLs de Search Console pre-fix + volver a verificar 4-8 semanas post-fix → conteo debería bajar a 0 o cerca.

## Estimación

- Fix WWW-CANONICAL: ya anotado en BACKLOG (~1 h código + test + smoke).
- Fix canonical dinámico `/explorar`: **1-1.5 h** código + 30 min smoke.
- Validación Search Console post-deploy: **semanas** (indexación Google).

**Total código**: ~2-2.5 h. **Prioridad**: post-lanzamiento (SEO no es bloqueante del 25-11).

## Caso borde

- Query `?categoria=domicilio` (slug deprecado, fusionado en `cuidado`): canonical debe apuntar a `/cuidado` (y no `/domicilio`). Añadir mapping explícito al array o tener lista de aliases.
- Query `?categoria=hospedaje` (slug deprecado, también en `cuidado`): idem.
- Query con comuna no reconocida (`?categoria=cuidado&comuna=UnaComunaRara`): la landing `/cuidado/UnaComunaRara` responde 200 (listado filtrado por comuna match insensitive) o 404 si la comuna no existe. Si 404, canonical debería caer a `/cuidado` (fallback). Verificar comportamiento de `getStaticPaths` con `fallback: 'blocking
