# ACTA — Sprint `toast-fix`

**Rama**: `toast-fix` (forkeada de `main` @ `9fc7892` post-cierre `z-index-maps`).
**SHA final en `main`**: por completar tras commit del acta (ver §7).
**Tag**: `toast-fix-prod-20260904`.
**Fecha ejecución**: 2026-09-04.
**Estado**: **CERRADO** en producción. Smoke prod verde por PO 2026-09-04.

---

## 1. Lo obvio — bug cerrado en las 5 rutas

Toast duplicado con 2 variantes visuales distintas (verde saturado + blanco/paleta pawnecta) reportado con 3 casos confirmados durante los sprints role-degradation (2026-09-04), carto-key (2026-09-04) y z-index-maps (2026-09-04). Este sprint lo cierra.

**Verificación en producción por PO 2026-09-04** contra `www.pawnecta.com`:

| Ruta | Acción | Antes | Después |
|---|---|---|---|
| `/proveedor` | Toggle activar/pausar servicio | 2 toasts (verde saturado + blanco) | **1 toast** paleta pawnecta |
| `/proveedor` | Guardar perfil | 2 toasts | **1 toast** paleta pawnecta |
| `/admin/proveedores` | Aprobar proveedor | 2 toasts | **1 toast** paleta pawnecta |

Los 3 casos originales del PO cerrados. Los otros 3 lugares afectados según diagnóstico (`/completar-registro`, `/admin/servicios`, `/admin/evaluaciones`) esperablemente también, aunque no fueron verificados individualmente por PO en este smoke.

**Cambio visual acotado a 5 rutas**: paleta richColors saturada de sonner → paleta pawnecta suave del `classNames` global. Alineación con sistema de diseño, no regresión.

## 2. El sprint ya se había hecho a medias en Ola 2 (2026-08-18)

**Historia reconstruida por git blame**:

- **Pre-agosto 2026** (`2026-02-25`, hace ~6 meses): cada página que necesitaba toast agregaba su propio `<Toaster richColors />` local. Patrón inicial de adopción de sonner en el proyecto. 4 Toasters locales de este momento (`pages/proveedor/index.tsx`, `pages/admin/{servicios,evaluaciones,proveedores}.tsx`).
- **Sprint Ola 2 (`2026-08-18`)**: alguien identificó el problema del Toaster duplicado. Agregó el Toaster global en `pages/_app.tsx:80` con `classNames` pawnecta custom. **Removió UN Toaster local** ([components/Proveedor/ServiceFormModal.tsx:2688](components/Proveedor/ServiceFormModal.tsx#L2688)). **Escribió un comentario explicando por qué**. **Y dejó los otros 5 sin remover**.
- **Sprint toast-fix (`2026-09-04`, este acta)**: completa el trabajo. Los 5 Toaster locales restantes eliminados. Comentario histórico de ServiceFormModal actualizado.

**Cadena de commits verificable con git blame de cada Toaster**:
- Global: `fc1258af` (2026-08-18).
- Locales feb 2026: `2105fb4f` + `820d4ebc` (mismo día, 2 SHAs).
- Local completar-registro: `7f4390d0` (2026-08-18 — ver §3).

## 3. El detalle más revelador — el sprint que homologaba sumó una divergencia

Durante el mismo commit `2026-08-18` del sprint Ola 2 que creó el Toaster global canónico, **se agregó un Toaster local nuevo** en `pages/completar-registro.tsx:342` (SHA `7f4390d0`, misma fecha).

O sea: **el sprint que venía a homologar los toasts sumó una divergencia en el mismo día**. Cero indicio de intencionalidad — probable oversight del que hizo el commit del sprint homologación (no revisó el diff completo, no corrió grep post-fix para verificar que el trabajo eliminaba TODOS los Toasters locales, no cero-Toaster + solo el global).

**Es el mismo caso del corolario P8 aplicado a la gestión de sprints**: un sprint declara "problema resuelto" cuando en realidad lo resolvió parcialmente + agregó una regresión. La declaración de éxito quedó en el comentario del código (`ServiceFormModal.tsx:2688`) y sobrevivió 17 días hasta que el PO reportó los 3 casos que expusieron el trabajo incompleto.

**Antídoto operativo aterrizado en este sprint**: **`grep '<Toaster' post-fix` como control positivo obligatorio** — debe devolver exactamente 1 match en `pages/_app.tsx`. Aterrizado en el comentario histórico actualizado como regla del proyecto. Cualquier sprint futuro que toque Toasters debe correr ese grep antes de declarar éxito.

## 4. El comentario histórico afirmaba algo falso

El comentario original de Ola 2 en [components/Proveedor/ServiceFormModal.tsx:2688](components/Proveedor/ServiceFormModal.tsx#L2688) decía literal:

> "Ola 2 fix Toaster duplicado (2026-08-18): el `<Toaster/>` global vive en pages/_app.tsx:48 **con la misma config exacta (position="top-center" richColors)**. Este local era redundante, los toast() de este modal ya se enrutaban al global. Eliminado para evitar el doble mount que puede duplicar el auto-dismiss timer + z-index conflicts al abrir/cerrar el modal."

**Dos afirmaciones falsas en el mismo comentario**:

1. **"config exacta richColors"** — NO era exacta. El global (`_app.tsx:80`) usa **`classNames` custom con paleta pawnecta** (`success: 'bg-success-50 border-success-100 text-success-900'`, etc.), no `richColors`. La divergencia de config **ERA la causa de las 2 variantes visuales distintas** que reportó el PO — global renderea con paleta pawnecta (blanco/check negro), locales con richColors (verde/check verde saturado).
2. **"pages/_app.tsx:48"** — la línea era 48 en 2026-08-18 pero ahora es 80 (movida por cambios posteriores del sprint carto-key + z-index-maps). Detalle menor pero contribuye a que el comentario esté desalineado con la realidad actual.

**Es exactamente el mismo antipatrón que el corolario P8 corrigió en el sprint default-privs** (2026-09-01) con el bloque retractado del "SQL Editor de Supabase NO mantiene transacciones entre ejecuciones separadas": un comentario que **afirma más de lo que hizo**, y queda vivo mintiendo hasta que otro sprint lo detecta.

**Corrección aterrizada por este sprint**: comentario reescrito en `ServiceFormModal.tsx:2688+` con:
- La historia real (trabajo Ola 2 incompleto, 5 locales quedaron activos).
- La corrección de las 2 afirmaciones falsas del comentario original.
- Referencia explícita al corolario P8 (mismo antipatrón).
- **Regla canónica**: "NO agregar Toaster locales. Cualquier `toast()` de sonner se enruta al global automáticamente. Verificable con grep del tag Toaster sobre todo el proyecto = exactamente 1 match en `pages/_app.tsx`".

## 5. El diagnóstico se verificó antes de tocar código

**Método aplicado en ronda 1**: el diagnóstico predijo que **4 rutas más** (`/completar-registro`, `/admin/servicios`, `/admin/evaluaciones`, `/admin/proveedores`) tendrían el mismo duplicado — rutas que el PO nunca había probado. Predicción falsable en 1 minuto.

**Verificación del PO antes de aprobar el código**:
- **Control positivo (predicción de duplicación)**: PO fue a `www.pawnecta.com/admin/proveedores`, aprobó un proveedor, y salió "Proveedor aprobado exitosamente" **2 veces** con las 2 variantes de siempre. **Predicción cumplida**.
- **Control negativo (predicción de NO-duplicación)**: PO probó primero en `/admin` (hub sin subruta), copió un WhatsApp desde el listado. Salió **1 solo toast**. `/admin` no está en la lista de rutas con Toaster local — el diagnóstico predecía que ahí NO debía duplicar. **Predicción cumplida**.

**Caso canónico registrado**: un diagnóstico que predice **dónde SÍ y dónde NO** ocurre un bug es muchísimo más fuerte que uno que solo **explica los casos ya vistos**. El primero es hipótesis falsable, el segundo puede ser rationalización post-hoc de un patrón espurio.

Aterrizable como regla operativa para diagnósticos futuros: **si el diagnóstico predice el comportamiento en rutas/casos NO observados originalmente, verificar 1-2 antes de aterrizar el fix**. Cuesta 1 minuto, agrega dos órdenes de magnitud de confianza al diagnóstico. Este sprint lo hizo naturalmente por decisión del PO — vale registrarlo como método replicable.

## 6. El bug estaba en 4 rutas que el PO nunca había mirado

Los 3 casos originales del PO (toggle servicio + guardar perfil + aprobar proveedor) eran **solo 2 pantallas del sitio** (`/proveedor` + `/admin/proveedores`). El diagnóstico encontró el bug también en **3 rutas adicionales que el PO nunca había probado**:

- `/completar-registro` — flujo de completar perfil post-signup.
- `/admin/servicios` — moderación de servicios.
- `/admin/evaluaciones` — moderación de evaluaciones.

**Escala real del bug era ~2.5x mayor que los reportes**: 5 rutas afectadas vs 2 pantallas visibles al PO. El diagnóstico basado en grep exhaustivo + comparación de configs encontró la superficie completa, no solo los síntomas.

**Lección para reportes de bugs**: **un bug visto en 3 casos en pantallas distintas casi nunca es "en 3 lugares" — es "el sistema entero tiene el mismo defecto y los 3 casos son la parte visible"**. Especialmente cuando el mecanismo detectado (2 Toasters en el árbol) es infraestructural y escala automáticamente a cada ruta con la superficie vulnerable.

## 7. Verificación empírica en producción — smoke visual del PO

Smoke ejecutado por PO 2026-09-04 contra `www.pawnecta.com`:

- ✅ **`/proveedor` guardar perfil**: 1 solo toast paleta pawnecta.
- ✅ **`/proveedor` toggle activar/pausar servicio**: 1 solo toast paleta pawnecta.
- ✅ **`/admin/proveedores` aprobar proveedor**: 1 solo toast paleta pawnecta.
- ✅ **Los 3 casos originales cerrados en producción**. Duplicado desaparecido en las mismas rutas donde lo había visto.

**Cero rollback, cero regresión reportada**.

Rutas adicionales (`/completar-registro`, `/admin/servicios`, `/admin/evaluaciones`) no verificadas explícitamente en este smoke pero cubiertas por el mismo fix — grep post-fix (`grep '<Toaster'` = 1 match en `_app.tsx`) garantiza que ninguna ruta tiene Toaster local residual.

**Grep verificación aterrizado como test canónico del sprint**:
- `<Toaster` en todo el proyecto = **1 match exacto** en `pages/_app.tsx:80`. ✅
- `import { Toaster } from 'sonner'` = **1 match exacto** en `pages/_app.tsx:13`. ✅
- Cero residuos en los 5 archivos removidos.

## 8. Deuda anotada / no anotada

**Cero deuda nueva** aterrizada al BACKLOG por este sprint. El fix cerró el problema completo — todas las rutas afectadas cubiertas.

**Deuda anterior anotada durante el sprint** (no del sprint):
- Auditoría rutas `/admin` (hub vs 4 subrutas separadas) — descubierta al smokear `/admin/proveedores` para verificar predicción. **NO tocada en este sprint** por decisión del PO. Anotada en BACKLOG (commit `9fc7892` en main).

## 9. Metadata del tag

- **Tag anotado**: `toast-fix-prod-20260904`
- **Apunta a**: (SHA del commit final tras merge FF + este acta — completar tras push)
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/toast-fix-prod-20260904`): completar
- **Fecha del commit apuntado**: completar

Fechas separadas por regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

---

**Cierre**: sprint 100% ejecutado en producción, smokes verdes, comentario histórico corregido, regla canónica aterrizada (NO agregar Toaster locales + grep como test post-fix), deuda anotada del sprint anterior no relacionada. Trabajo iniciado en Ola 2 (2026-08-18) completado 17 días después. El próximo sprint queda en cancha del PO — el auditor no arranca nada.
