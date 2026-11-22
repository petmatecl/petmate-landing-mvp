# Auditoría del flow completo de signup del proveedor — 2026-11-22

Written for: el PO (Aldo), para identificar fricciones que impidan llegar a los 100 proveedores activos (gating para arrancar campañas). Cada proveedor registrado que no publica servicio o abandona en el wizard es una inversión perdida en adquisición.

**Alcance**: flow completo desde click en "Soy proveedor" o CTA equivalente hasta primer servicio publicado activo. Audit sobre código real en `main @ 4bdf66f`: `pages/register.tsx`, `pages/api/auth/signup.ts`, `pages/email-confirmado.tsx`, `pages/proveedor/index.tsx`, `components/Proveedor/ServiceFormModal.tsx` + nuevo `FormSidebarNav.tsx` (aterrizado en #137).

**Diferencia clave vs tutor** (ver [`signup-tutor-20261122.md`](signup-tutor-20261122.md)): el proveedor tiene Step 3 adicional (comuna + categoría + descripción + aceptar T&C) + publicar primer servicio = flow ~3x más largo.

---

## Resumen ejecutivo

**El flow proveedor es el más largo y con más abandono potencial** del producto:

- 3 steps del wizard de registro + email confirmation + dashboard + publicar primer servicio (otro mini-wizard con 7-10 secciones).
- **Benchmark industria** para flow equivalente (Rover, DOGIN): drop típico 50-70% entre "inicia registro" y "publica primer servicio activo". Pawnecta probablemente similar.
- Hoy en prod: **42% de los proveedores que publican NO activan agenda** (dato del doc funnel registro proveedor 20-11, 5 de 12). Opción "sin agenda" default invisible agrega fricción.

**Top 5 fricciones identificadas** (ranking por impacto para llegar a 100 proveedores):

1. **Sin indicador de progreso visible entre Step 2 y Step 3** → user no sabe si le falta mucho.
2. **Pide RUT + razón social + nombre fantasía + giro para empresas** → fricción fuerte si quiere registrarse rápido.
3. **Descripción min 50 chars en Step 3** si decide completarla → barrera para proveedor que no sabe qué escribir.
4. **Email confirmation + auto-aprobación** (badge-f1 2026-08-18) ya activa, pero no se refleja claramente en el UX post-confirm. El user no sabe si puede publicar YA o si tiene que esperar algo.
5. **El wizard de primer servicio es largo** (ServiceFormModal + nuevo FormSidebarNav mitigado #137 pero sigue tomando 10-20 min la primera vez).

**Tiempo total estimado** del flow completo (desde "Soy proveedor" hasta "servicio publicado y activo"):
- **Rápido con todo a mano**: 12-18 minutos.
- **Con fricciones típicas** (dudas en categoría, tipo de entidad, descripción, agenda, fotos): 25-45 minutos.
- **Abandono probable** antes del primer servicio: 40-60%.

**Objetivo pre-campañas**: reducir a 8-15 min con zero fricción + abandono < 30%.

---

## Diagrama del flow

```
VISITA (anónimo)
   │
   ├──► CTA "Soy proveedor" en Header (prod)
   │  O
   ├──► CTA "Publica gratis →" en home hero
   │  O
   ├──► Footer "Publicar mi servicio"
   │
   ▼
/register?rol=proveedor (skip Step 1)
   │
   ▼
STEP 2: nombre + apellido_p + apellido_m + email + password + confirm
          + tipo_entidad (persona / empresa)
          │
          ├── si empresa: razon_social + rut_empresa + nombre_fantasia + giro
          │   (4 campos extra)
          │
          ▼
STEP 3: comuna (autocomplete) + categoría (dropdown) + descripción (opcional min 50) + aceptaPolitica (checkbox T&C)
          │
          ▼
SUBMIT ──► POST /api/auth/signup
             │
             ├── Zod validate
             ├── auth.admin.createUser (email_confirm=false)
             ├── INSERT proveedores (estado='aprobado' auto-aprobado sprint badge-f1)
             ├── auth.admin.generateLink type=signup → URL
             ├── POST /api/auth/welcome
             └── POST notify NuevoProveedorPendiente a contacto@pawnecta.com (admin)
   │
   ▼
STEP 4: "¡Listo! Revisa tu email"
   │
   ▼
USER ABRE INBOX → click confirmación
   │
   ▼
/email-confirmado → user queda logueado
   │
   ▼
Debería ir a /proveedor (dashboard) directo. Hoy va a home.
   │
   ▼
Dashboard /proveedor
   │
   ├── Ve sidebar con tabs: Inicio / Servicios / Solicitudes / Perfil / Mi cuenta
   │
   └── Modal "Publica tu primer servicio" o CTA destacado
          │
          ▼
    ServiceFormModal (wizard interno)
          │
          ├── Sección 1: Información básica (título + categoría + mascotas)
          ├── Sección 2: Precio (desde + unidad)
          ├── Sección 3: Descripción
          ├── Sección 4: Zona de cobertura (comunas)
          ├── Sección 5: Disponibilidad (semanal — 7 switches + 14 inputs)
          ├── Sección 6: Agenda F1/F2 (opcional, pero fuerte UX impact)
          ├── Sección 7: Fotos del servicio (upload)
          └── Sección 8: Campos dinámicos por categoría (algunos)
          │
          ▼
    SUBMIT → INSERT en servicios_publicados (activo=true default)
          │
          ▼
    PRIMER SERVICIO PUBLICADO ACTIVO (fin del flow crítico)
```

---

## Análisis paso a paso (sumario, no repite tutor)

### Step 2 — Fricciones extras proveedor (vs tutor)

**Lo igual al tutor**: nombre, apellido_p, apellido_m, email, password + confirm.
**Fricciones heredadas**: F-TR-4 (password sin meter visual), F-TR-5 (sin OAuth), F-TR-6 (sin autocomplete) — aplican igual.

**Lo específico del proveedor**:

| Campo extra | Required | Validación | Fricción |
|---|---|---|---|
| tipo_entidad (persona/empresa) | sí (radio) | enum | Decisión inmediata. Freelance / MVP sin RUT empresa = elige persona. |
| razon_social (si empresa) | sí | max 200 | Fricción si no la tiene presente |
| rut_empresa (si empresa) | sí | validateRut() | Mismo problema de formato |
| nombre_fantasia (si empresa) | sí | max 200 | Fricción extra |
| giro (si empresa) | sí | max 200 | Fricción extra |

**Fricciones específicas proveedor Step 2**:

- **F-PR-1 (ALTA)**: **Los 4 campos extra de "empresa" son barrera** — un proveedor pyme típicamente sí tiene razón social + RUT + giro, pero sacarlos de la memoria + tipearlos correctamente lleva 1-2 min extra. Decisión de producto: ¿son realmente obligatorios para publicar servicio o pueden diferirse?
  - **Fix**: hacer todos los campos empresa OPCIONALES en Step 2 → mover a "Configuración de factura" post-publicar (sección en Perfil). ~2h.

- **F-PR-2 (MEDIA)**: **Toggle persona/empresa confuso para solopreneurs** — "soy una persona que trabajo como paseador ¿o soy empresa porque facturo?". Sin microcopy explicativo.
  - **Fix**: tooltip o ayuda contextual sobre el toggle: "Elige 'Persona natural' si trabajas con boleta de honorarios. 'Empresa' si tienes RUT de empresa y facturas con razón social." ~15 min.

### Step 3 — Comuna + Categoría + Descripción + T&C

**Archivos**: `pages/register.tsx:580-700` (approx — Step 3 renderiza condicional).

**Fricciones específicas**:

- **F-PR-3 (ALTA)**: **Descripción opcional PERO con min 50 chars si la completa** — el user empieza a escribir, se arrepiente, deja 30 chars → submit falla con "Si describes tu experiencia debe tener al menos 50 caracteres". User frustrado. Opción "dejar vacío" visible pero no destacada.
  - **Fix**: destacar visualmente "Puedes completar tu descripción después desde tu panel" + contador live "Llevas N/50 caracteres" + permitir borrar el campo con 1 click. ~30 min.

- **F-PR-4 (MEDIA)**: **Categoría es dropdown con 10 opciones** — una sola categoría elegible al registrarse. Un proveedor que ofrece paseos + cuidado + guardería debe elegir solo una → pierde decisión (y el servicio efectivo lo configurará después, pero psicológicamente se "casa" con una).
  - **Fix**: microcopy "Elige tu categoría principal. Puedes agregar más servicios después desde tu panel." + validar que esto efectivamente funciona en el wizard de primer servicio (donde se elige categoría por servicio, no por proveedor). ~15 min.

- **F-PR-5 (BAJA)**: **Comuna autocomplete con 346 opciones** — ya refactoreado en Ola 1 para match por prefijo. OK.

- **F-PR-6 (MEDIA)**: **Aceptar T&C es checkbox con texto plano "Acepto los Términos y Condiciones"** — sin link al documento visible. User no puede leer T&C sin navegar fuera del form (pierde state).
  - **Fix**: "Acepto los [Términos y Condiciones](/terminos)" con link que abra en nueva tab. ~10 min.

### Step 3 → Submit

**Submit validaciones** (según grep):
- Comuna obligatoria.
- Categoría obligatoria.
- Descripción con min 50 (si no está vacía).
- aceptaPolitica = true obligatorio.

**Fricciones extras post-submit**:

- **F-PR-7 (ALTA)**: **Tiempo total Step 1+2+3 = 3-6 min** para un proveedor que sabe qué pone. Sin indicador visual de progreso ("Paso 2 de 3" simple no alcanza — mejor barra con % o chips numerados).
  - **Fix**: ya existe indicador básico. Mejorar con chip highlighted "✓ Paso 1 completado" + mini-breadcrumb "Datos personales → Información profesional → ¡Listo!". ~1h.

### Paso 4 — API signup proveedor específico

**Diff vs tutor** en `pages/api/auth/signup.ts`:
- Mismo endpoint, mismo schema (Zod) con campos opcionales de empresa.
- INSERT en `proveedores` (en vez de `usuarios_buscadores`).
- **Auto-aprobación** (sprint badge-f1 2026-08-18): `estado='aprobado'` automático. El viejo flow pendiente → admin aprueba YA NO EXISTE en el default — el proveedor publica desde el día 1.
- Envía email notif al admin `contacto@pawnecta.com` (`NuevoProveedorPendienteEmail`) → el admin se entera pero NO necesita aprobar.
- Rate limit 5/min/IP (compartido con tutor).

**Fricciones**:

- **F-PR-8 (MEDIA)**: **Nombre del email interno al admin es "NuevoProveedorPendiente"** (`NuevoProveedorPendienteEmail.tsx`) — pero ya NO hay pendientes en el flow nuevo. Confunde al admin (reporta algo que ya está resuelto).
  - **Fix cosmético**: renombrar template a `NuevoProveedorAltaEmail` + copy "Un proveedor se registró y ya está activo publicando." Zero impacto al user final. ~30 min.

### Paso 5 — Email confirmation (mismo que tutor)

Las fricciones F-TR-10 a F-TR-16 del doc signup-tutor aplican igual al proveedor. No repito.

**Específico proveedor**:

- **F-PR-9 (MEDIA)**: **Al confirmar email, user va a home** (no al dashboard proveedor). Para un proveedor que viene a publicar servicio, "home" es la página equivocada — debería ir directo a `/proveedor` dashboard.
  - **Fix**: en `/email-confirmado` leer rol del user + redirect:
    - rol='proveedor' → `/proveedor`.
    - rol='usuario' → URL origen guardada en localStorage o `/explorar`.
  - ~1h.

### Paso 6 — Dashboard /proveedor (primera carga)

**Archivo**: `pages/proveedor/index.tsx`.

**Comportamiento**: tabs con Inicio / Servicios / Solicitudes / Perfil / Mi cuenta.

**Fricciones**:

- **F-PR-10 (ALTA)**: **Sin modal de onboarding** ni CTA grande destacado "Publica tu primer servicio". El proveedor nuevo aterriza al dashboard y debe descubrir qué hacer. Si no hay guía visible, abandono ~20-30%.
  - **Fix**: modal welcome en primer login del proveedor:
    - Heading: "¡Bienvenido, {nombre}! Dos pasos para empezar a recibir solicitudes."
    - CTA: "Publicar mi primer servicio" + "Completar mi perfil".
    - localStorage flag para no mostrarlo segunda vez.
  - ~3-4h.

- **F-PR-11 (MEDIA)**: **Botón "Nuevo servicio" visible pero no destacado** vs navegación de tabs. Debería tener peso visual máximo en el dashboard vacío.

### Paso 7 — ServiceFormModal (publicar primer servicio)

**Archivo**: `components/Proveedor/ServiceFormModal.tsx` + nuevo `FormSidebarNav.tsx` (post-#137).

**El wizard más denso del producto**. 7-8 secciones:

| Sección | Campos | Fricción |
|---|---|---|
| Información básica | título + categoría + mascotas aceptadas | OK (nombres claros) |
| Precio | precio_desde + precio_hasta + unidad_precio | OK |
| Descripción | textarea | min chars no estricto |
| Zona de cobertura | comunas (multi-select) | **OBLIGATORIO** — bloqueante para servicios remotos (ver deuda `CATEGORIAS-POR-MODALIDAD`). |
| Disponibilidad semanal | 7 switches + 14 inputs | Ruidoso, 15-20 interacciones |
| Agenda F1 o F2 | opcional, toggle + config | Confuso sin tour |
| Fotos | upload 1-N fotos | **Bloqueante visual** si proveedor no tiene fotos listas |
| Campos dinámicos | varían por categoría (ver `lib/camposPorCategoria.ts`) | Confuso si no se expone bien |

**Fricciones**:

- **F-PR-12 (ALTA)**: **Disponibilidad semanal con 7 switches + 14 inputs** = 21 micro-interacciones solo para cuándo trabajo. Para proveedores que trabajan lun-vie 9-18 hay que tocar TODO el form.
  - **Fix**: presets "Lun a Vie 9-18" / "Lun a Dom 10-20" / "Fines de semana" + "Personalizado" como botones rápidos. Un click = pre-llena los 14 inputs. ~2-3h.

- **F-PR-13 (ALTA)**: **Fotos obligatorias** (si el flow las requiere) — un proveedor que recién arranca puede no tener fotos listas. Abandona Step 7 o sube foto de baja calidad.
  - **Fix**: permitir publicar SIN fotos pero marcar servicio como "incompleto" con banner "Agrega fotos para aparecer mejor rankeado" + email recordatorio N horas después. ~2h.

- **F-PR-14 (MEDIA)**: **Toggle agenda F1/F2 confuso** — nombres "F1 slots horarios" vs "F2 rango de noches" son técnicos. Un proveedor de peluquería no sabe cuál elegir sin leer.
  - **Fix**: renombrar con copy claro:
    - "Agenda con horarios específicos" (F1).
    - "Agenda por noches de estadía" (F2).
    - Sin agenda / coordinamos por chat (opción sin agenda).
  - ~30 min.

- **F-PR-15 (BAJA)**: **FormSidebarNav aterrizado #137** mitiga la navegación larga — proveedor puede saltar entre secciones sin scroll. **Buena mejora**. Zero fix pending acá.

- **F-PR-16 (MEDIA)**: **Comunas de cobertura obligatorias** rompen el flow para servicios remotos (retratos, fotografía digital, consulta online). Deuda estructural `CATEGORIAS-POR-MODALIDAD` (ya en BACKLOG). Sin fix hoy, servicios remotos tienen que elegir "Santiago" como workaround — data falsa.

---

## Top 5 fricciones a reducir ANTES de llegar a 100 proveedores

Ranking por impacto/esfuerzo:

| # | Fricción | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|---|
| **1** | **F-PR-10** — Modal onboarding en primer login del proveedor | +15-25% publican primer servicio | 3-4h | **ALTA (gating)** |
| **2** | **F-PR-12** — Presets de disponibilidad semanal | +10-20% completan wizard sin abandonar | 2-3h | ALTA |
| **3** | **F-PR-9** — Redirect post-confirm según rol (proveedor → /proveedor) | +5-10% llegan al dashboard | 1h | ALTA |
| **4** | **F-PR-1** — Campos empresa opcionales + diferidos | +5-10% completan Step 2 | 2h | MEDIA |
| **5** | **F-PR-14** — Copy "Agenda con horarios" vs "por noches" | +5% activan agenda | 30 min | MEDIA (gratis) |

**Esfuerzo total top 5**: ~9-11h. Sprint propio `PROVEEDOR-FUNNEL-PRE-CAMPAÑA` (idealmente arrancado post-tutor-sprint para no dividir foco).

---

## Decisiones pendientes del PO

### D1. GO sprint PROVEEDOR-FUNNEL-PRE-CAMPAÑA

**Pregunta**: ¿autorizás los top 5 fixes como sprint pre-campañas?

**Recomendación**: sí. Son los fixes que mueven la aguja para llegar a 100 proveedores en 2-3 meses post-launch sin invertir en ads para proveedores.

### D2. Priorizar sprint tutor vs proveedor pre-campañas

**Pregunta**: tutor-funnel (doc B1) y proveedor-funnel ambos tienen ~9-12h. ¿Cuál primero?

**Recomendación**: **tutor primero**. Lógica: campañas pagadas traen tutores; necesitamos que la conversion tutor sea top-notch cuando lleguen. Proveedores llegan orgánicamente o por outreach manual del PO, con ritmo más lento — pueden mejorar en paralelo o inmediatamente después.

### D3. Diferir campos empresa a post-publicar servicio

**Pregunta**: ¿autorizás F-PR-1 (empresa opcional + diferido)?

**Recomendación**: sí. Simplifica Step 2 significativamente. Los campos empresa pueden pedirse en "Perfil → Configuración de factura" cuando el proveedor empiece a cobrar.

### D4. Fotos obligatorias en el wizard primer servicio

**Pregunta**: ¿permitir publicar SIN fotos (F-PR-13) con flag "incompleto"?

**Recomendación**: **sí, pero con señal visual clara**. Un servicio sin fotos ranking bajo = incentivo a completar; marcar con "Agrega fotos" banner permanente + email recordatorio 24h después. Zero bloqueo del flow.

### D5. OAuth Google específico para proveedores

**Pregunta**: ¿proveedor también debería tener OAuth Google (si se implementa para tutor)?

**Recomendación**: sí. Mismo OAuth, mismo botón. Los proveedores pymes con Gmail Business se benefician igual.

---

## Firma

Esta auditoría es base para el sprint `PROVEEDOR-FUNNEL-PRE-CAMPAÑA`. Reducir fricción en el signup proveedor es inversión multiplicada: cada 10% menos abandono = ~10 proveedores menos que perseguir con outreach del PO para llegar a 100.
