# WWW-CANONICAL — Plan ejecutable domingo 2026-11-22

**Fecha preparación**: 2026-11-19 · **Ejecución**: domingo **2026-11-22** · **Entregable task 11** pedido por PO 2026-11-19 PM.
**Alcance**: cerrar la duplicación `www.pawnecta.com` vs `pawnecta.com` (sin www) que infla las páginas duplicadas en Search Console (16 URLs reportadas) + dilue link equity + desconecta sesiones Supabase Auth entre hosts.

## Diagnóstico — estado actual verificado empíricamente

### Ambos hosts responden HTTP 200 sin redirect

```
$ curl -sI https://www.pawnecta.com/
HTTP/1.1 200 OK    (Cache hit edge 544s, size 128477)

$ curl -sI https://pawnecta.com/
HTTP/1.1 200 OK    (Cache hit edge 8s, size 128476)
```

**Ambos hosts sirven el mismo contenido** (deploy único de Vercel, 2 edges distintos). Hoy **no hay redirect de uno al otro**. Google ve ambos como válidos → indexa cada URL 2 veces.

### DNS resuelve ambos

```
$ nslookup www.pawnecta.com   → 66.33.60.34 (Vercel edge CDN)
$ nslookup pawnecta.com       → 76.76.21.21 (Vercel edge CDN distinto)
```

Vercel aloja ambos como dominios válidos del mismo proyecto. Configuración actual Vercel Dashboard → Settings → Domains: ambos "Valid Configuration" sin redirect entre ellos.

### Redirects actuales en `next.config.js`

[next.config.js:188-211](../../next.config.js#L188-L211) configura **solo**:
- `www.pawnecta.cl` → `https://www.pawnecta.com/:path*` (301)
- `pawnecta.cl` → `https://www.pawnecta.com/:path*` (301)

**NO HAY redirect `pawnecta.com` (sin www) → `www.pawnecta.com`**. Esto es la causa raíz.

### Inconsistencia interna del código

El repo tiene **mezcla hardcoded**:

| Tipo | Host usado | Ejemplos |
|---|---|---|
| Emails (10 templates) | `www.pawnecta.com` | Logo src, botones CTA, links a dashboard |
| Ficha `/servicio/[id]` | `www.pawnecta.com` | canonical, og:url, ld+json breadcrumbs |
| Home `/` | `pawnecta.com` (sin www) | canonical L501, og:url L503, og:image L506, twitter:image L510, ld+json url L518, searchAction L521 |
| Sitemap XML | `pawnecta.com` (sin www) | Las 3 funciones generadoras L60, L65, L70 |
| Email `AprobacionProveedorEmail` | `pawnecta.com` (sin www) | 1 link L23 |
| Email admin `notify-provider.ts` | `pawnecta.com` (sin www) | 1 link L80 |

Esta inconsistencia **agrava el problema**: Google ve referencias cruzadas entre los hosts dentro del propio código del sitio → confirma que "ambos son válidos" y perpetúa la duplicación.

### Impacto estimado en Search Console

- **16 URLs** reportadas por Search Console como "duplicada sin canonical" (dato del PO del 2026-11-19).
- Patrón típico: para cada `/<path>`, Google tiene 2 entries (`https://www.pawnecta.com/<path>` + `https://pawnecta.com/<path>`).
- Resultado: link equity dividido 50/50 entre hosts → nunguno acumula ranking suficiente.
- Combinado con `SEO-EXPLORAR-DUPLICATE`, el ruido SEO se multiplica (16 duplicadas × 2 hosts = potencial 32 duplicadas si `/explorar?filters` también se duplica cross-host).

### Impacto secundario — sesiones Supabase Auth cruzadas

Documentado en CLAUDE.md § "Auth flow" + BACKLOG `WWW-CANONICAL`: user con 2 pestañas en `https://www.pawnecta.com` y `https://pawnecta.com` tiene 2 `localStorage` distintos (uno por origin) → 2 sesiones paralelas → logout de una puede revocar la otra via scope global del SDK v2.

## Decisión — host canónico: **`www.pawnecta.com`**

### Razones (ordenadas por peso)

1. **126 referencias hardcoded** al host `www.pawnecta.com` vs ~11 al sin-www → cambiar a sin-www requiere 11× más trabajo de reemplazo y más superficie de error. La mayoría del código ya asume www.
2. **Los redirects existentes `.cl` apuntan a `www.pawnecta.com`** ([next.config.js:198, 209](../../next.config.js#L198-L209)) — invertir ahora rompe consistencia.
3. **Estándar industrial para sitios consumer-facing**: `www.` sigue siendo el default para dominios que esperan tráfico generalista sin tech-savvy (usuarios mayores, SEO histórico, compartidos por WhatsApp sin protocol prefix, etc.). Dominios `apex` (sin www) son más comunes en tech/SaaS, cosa que Pawnecta NO es.
4. **Vercel sugiere `www.` como primary** cuando se agrega un custom domain con subdomain `www` + apex — el bouncer natural es `apex → www`.
5. **Marketing + redes sociales** probablemente ya comunicaron `www.pawnecta.com` (verificar — si solo comunicaron el apex, revisitar).
6. **Email + logos hardcodedos a `www.pawnecta.com`** ya enviados a inboxes de users → cambiar la canónica rompería las imagenes de los correos ya recibidos (si el redirect apex → www no funciona del lado del cliente).

### Lo que esto implica

- `www.pawnecta.com` es canonical: todos los crawlers + humanos aterrizan ahí.
- `pawnecta.com` (apex) redirige 301 permanente → `www.pawnecta.com`.
- Las 11 referencias hardcoded al apex se corrigen a `www` (hoy son inconsistencia, deben alinearse).

## Implementación — 3 piezas

### Pieza 1 — Redirect apex → www en Vercel Dashboard (el PO ejecuta en UI)

**Ubicación**: Vercel Dashboard → `pawnecta-landing-mvp` → Settings → Domains.

**Estado actual esperado**:
- `www.pawnecta.com` → Primary (si no, marcar como primary).
- `pawnecta.com` → Valid pero SIN redirect configurado.

**Acción**:
1. Seleccionar `pawnecta.com` (apex).
2. Click "Edit" o "Configure" → Redirect to → seleccionar `www.pawnecta.com`.
3. Tipo: 301 Permanent Redirect (Vercel lo marca por default — verificar).
4. Save.

**Verificación inmediata post-apply**:
```
$ curl -sI https://pawnecta.com/
HTTP/1.1 301 Moved Permanently
Location: https://www.pawnecta.com/

$ curl -sI https://pawnecta.com/explorar?categoria=cuidado
HTTP/1.1 301 Moved Permanently
Location: https://www.pawnecta.com/explorar?categoria=cuidado
```

**Tiempo estimado**: 2 min + 1 min smoke.

### Pieza 2 — Redirect apex → www en `next.config.js` (defensa en profundidad)

**Archivo**: `next.config.js` → función `redirects()` L188+.

```diff
 async redirects() {
   return [
+    // Canonical: pawnecta.com (apex) → www.pawnecta.com.
+    // Cinturón al redirect de Vercel Dashboard; si alguna vez se deshabilita
+    // en UI, este fallback mantiene la canónica single-host.
+    {
+      source: '/:path*',
+      has: [{ type: 'host', value: 'pawnecta.com' }],
+      destination: 'https://www.pawnecta.com/:path*',
+      permanent: true,
+    },
     {
       source: '/:path*',
       has: [{ type: 'host', value: 'www.pawnecta.cl' }],
       destination: 'https://www.pawnecta.com/:path*',
       permanent: true,
     },
     // ... resto igual
   ];
 }
```

**Nota**: este redirect server-side solo activa si el request llega al deploy de Next (es decir, ANTES Vercel ya hizo su redirect del Dashboard). En práctica, el Vercel Dashboard redirect intercepta primero; este sirve solo como fallback por si alguien deshabilita el Dashboard redirect por accidente.

**Tiempo**: 5 min código + commit.

### Pieza 3 — Alinear referencias hardcoded del apex al www

Los 11 call sites a corregir (grep verificado 2026-11-19):

| Archivo | Línea | Cambio |
|---|---|---|
| `pages/index.tsx` | 501 | `canonical` apunta al host canónico → **cambiar a www** |
| `pages/index.tsx` | 503 | `og:url` → cambiar a www |
| `pages/index.tsx` | 506 | `og:image` → cambiar a www |
| `pages/index.tsx` | 510 | `twitter:image` → cambiar a www |
| `pages/index.tsx` | 518 | json-ld `url` → cambiar a www |
| `pages/index.tsx` | 521 | json-ld `searchAction.target` → cambiar a www |
| `pages/sitemap.xml.tsx` | 60 | URL generada para páginas estáticas → cambiar a www |
| `pages/sitemap.xml.tsx` | 65 | URL proveedor → cambiar a www |
| `pages/sitemap.xml.tsx` | 70 | URL servicio → cambiar a www |
| `components/Emails/AprobacionProveedorEmail.tsx` | 23 | CTA email → cambiar a www |
| `pages/api/admin/notify-provider.ts` | 80 | CTA email admin → cambiar a www |

Reemplazo trivial: `https://pawnecta.com` → `https://www.pawnecta.com` en los 11 call sites.

**Tiempo**: 30 min código + commit + smoke render-diff de la home + sitemap + emails.

## PR único o 2 PRs

**Recomendación**: 1 PR único `www-canonical-domingo` que combina Pieza 2 + Pieza 3 (Pieza 1 es en Vercel UI, no es commit). Sprint chico, 1 h total.

**Orden ejecución del domingo**:
1. **AM**: PO hace Pieza 1 en Vercel Dashboard (2 min) + verifica con curl.
2. **AM**: auditor abre PR con Pieza 2 + Pieza 3 (combinadas, 30-45 min).
3. **AM**: PO QA del preview + merge.
4. **AM**: verificación empírica post-deploy (home/sitemap/emails sirven www).
5. **AM**: cierre, acta corta en `docs/sprints/www-canonical-20261122.md`.

**Tiempo total estimado**: 1-1.5 h.

## Verificación en Search Console post-deploy

### Checks inmediatos (día del deploy)

```bash
# Redirect activo
curl -sI https://pawnecta.com/                     # → 301 Location: https://www.pawnecta.com/
curl -sI https://pawnecta.com/explorar             # → 301
curl -sI https://pawnecta.com/servicio/<id>        # → 301 (preserva path)
curl -sI https://pawnecta.com/cuidado/Providencia  # → 301

# Canonical de la home consistente
curl -s https://www.pawnecta.com/ | grep -E 'canonical|og:url'
# Esperado: todos con https://www.pawnecta.com
```

### Checks Search Console (semanas de latencia)

1. **Request re-indexing** de las 16 URLs reportadas duplicadas:
   - Search Console → "URL Inspection" → ingresar cada URL duplicada → "Test live URL" → "Request indexing".
   - Hacerlo en batches de 10 por día (Search Console tiene cuota).
2. **Monitor "Coverage" tab** semanalmente las primeras 4 semanas:
   - Métrica clave: "Duplicate, submitted URL not selected as canonical" → debería bajar de 16 a 0 en 2-4 semanas.
   - Métrica secundaria: "Pages crawled per day" → debería bajar (menos hosts duplicados que crawlear).
3. **Ver "Sitemaps" tab**:
   - Verificar que `sitemap.xml` tiene URLs con `https://www.pawnecta.com/<path>` (no apex).
   - Si Google ve el sitemap con el host nuevo + los redirects del host viejo, consolida automáticamente.

### Enlaces externos que ya apuntan al host "muerto" (apex)

**Problema**: redes sociales, directorio de proveedores, backlinks de blogs externos pueden haber usado `https://pawnecta.com/<path>` antes del fix.

**Comportamiento post-redirect**:
- Usuario clickea backlink apex → Vercel sirve 301 → navegador sigue a `https://www.pawnecta.com/<path>` sin pérdida de UX.
- Google crawler ve la 301 → actualiza su índice gradualmente (semanas).
- **Zero link equity perdido** porque un 301 permanente **transfiere el ranking** del URL viejo al nuevo (regla canónica de Google desde 2016).

**Lo que SÍ puede romper**:
- Enlaces que usan el apex con un path que post-redirect cambia (ej. si en el proceso cambiamos la estructura de URLs, el redirect a www preserva el path, pero si el path ya no existe sería 404). **Hoy no estamos cambiando paths, solo host** → zero riesgo.
- Botones "Continuar con Google" OAuth configurados con el apex como Authorized Origin: si Supabase Auth OAuth está configurado solo para `www.pawnecta.com`, un user que llegó desde apex antes del redirect no completa el flow. **Verificar Supabase Auth → URL Configuration que `www.pawnecta.com` esté en Site URL + Redirect URLs**.
- Compartidos en WhatsApp con el apex: WhatsApp cachea el OG preview del URL original. Si el user comparte `https://pawnecta.com/servicio/<id>`, el preview mostrará la imagen del redirect (post-fix, al cabo de 7 días cuando Meta refreshe su cache).

### Supabase Auth URL Configuration

**Checkpoint obligatorio pre-deploy**:

- Supabase Dashboard → Authentication → URL Configuration.
- Site URL: debe ser `https://www.pawnecta.com` (confirmar).
- Redirect URLs allowlist: debe incluir `https://www.pawnecta.com/**` + opcional `https://pawnecta.com/**` (para que el flow de auth pre-redirect no rompa antes de que Vercel 301 lo mande).

Si el Site URL hoy está como `https://pawnecta.com` o mezcla ambos hosts, actualizar a `https://www.pawnecta.com` **antes** de la Pieza 1 (sino el OAuth flow puede dar 400 "redirect_uri not allowed" en el momento del 301).

## Estimación realista total

| Fase | Actor | Tiempo |
|---|---|---|
| Pre-check Supabase Auth URL Configuration | PO (UI) | 5 min |
| Pieza 1 — redirect Vercel Dashboard | PO (UI) | 2 min + 1 min smoke |
| Pieza 2 + 3 — PR con next.config.js redirect + alinear 11 call sites | auditor (código) | 30-45 min |
| CI verde + preview Ready | auto | 10 min |
| QA PO del preview | PO | 10 min |
| Merge + deploy prod | auditor | 5 min |
| Verificación empírica post-deploy (curl + home/sitemap/emails smoke) | auditor | 15 min |
| Request re-indexing 10 URLs iniciales en Search Console | PO (UI) | 10 min |
| Acta cierre | auditor | 15 min |
| **Total ventana** | | **~1h 45min** |

**Horizonte de impacto SEO visible**: 2-4 semanas (Google indexa + consolida gradualmente). El fix técnico queda cerrado el domingo; la mejora en SEO ranking es gradual.

## Criterios GO del domingo

- Supabase Auth URL Configuration actualizado + validado (login desde `https://www.pawnecta.com` funciona OK pre-redirect).
- Vercel Dashboard redirect apex → www activo + `curl` responde 301 sin error.
- PR de código mergeado + deploy prod Ready + home/sitemap/emails emiten www consistente.
- Zero error 500 / 4xx en runtime logs de las primeras 2 horas post-deploy.

## Criterios NO-GO

- Supabase Auth rompe el login si `Site URL` ≠ host efectivo post-redirect.
- Algún email crítico (`AgendamientoProveedorEmail`, `ReservaConfirmadaTutorEmail`) deja de renderizar correctamente (test render-diff fail).
- Spike 5xx en Vercel runtime logs post-deploy (señal de que algún path se rompe con el nuevo redirect).

**Rollback** (si NO-GO):
1. Deshabilitar redirect en Vercel Dashboard (Settings → Domains → `pawnecta.com` → remove redirect, volver a "Valid" sin forward).
2. Vercel Instant Rollback del PR mergeado (revierte el `next.config.js` redirect + alineación hardcoded).
3. Supabase Auth URL Configuration queda con ambos hosts en allowlist (no revertir, es tolerante).

## Qué NO se cierra con este sprint

- **SEO-EXPLORAR-DUPLICATE** (los 16 URLs duplicadas por filtros `?categoria=X&comuna=Y`) sigue abierto como sprint propio tras este — ver `docs/planes/seo-explorar-canonical.md`. El fix WWW-CANONICAL reduce el ruido a la mitad (deja de duplicar cross-host), pero cerrar las 16 duplicadas por filtros requiere canonical dinámico en `/explorar`.
- **Email templates** hardcoded a www siguen igual (ya correctos). Alineación de los 11 apex-sin-www es defensiva.
- **Dominios `.cl`** redirects no se tocan (siguen funcionando igual).

## Dependencias

- **Pre-requisito**: tiempo de dedicación PO para hacer la Pieza 1 (Vercel UI).
- **Pre-requisito blando**: horizonte semana pre-lanzamiento 25-11 → domingo 22-11 es la ventana natural (ya anotado en `plan-lanzamiento-nov-2026.md`).
