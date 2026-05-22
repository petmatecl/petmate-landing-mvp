# Pawnecta — Claude Code Context

## Qué es este proyecto

Pawnecta es un directorio/catálogo de servicios para mascotas en Chile. Conecta tutores con proveedores de servicios. NO gestiona pagos, reservas ni calendarización — el contacto es directo (chat interno, WhatsApp, teléfono).

- URL producción: https://www.pawnecta.com
- GitHub: petmatecl/petmate-landing-mvp
- Deploy: Vercel (auto-deploy en push a main)
- Base de datos: Supabase (proyecto: ouezpeeiwjwawauidrqq)
- Framework: Next.js 14 con Pages Router
- Lenguaje: TypeScript
- Estilos: Tailwind CSS
- Iconos: Lucide React (NO emojis — el usuario los detesta)
- Auth: Supabase Auth
- Storage: Supabase Storage (buckets: avatars, servicios-fotos, documents)

## Roles de usuario

**Tutor (usuario)** — explora sin registro. Necesita cuenta para contactar o evaluar. Tabla: `usuarios_buscadores` (solo tiene: id, auth_user_id, nombre, email, rut, created_at).

**Proveedor** — se registra con RUT + foto carnet (frontal + dorso), revisión manual admin 24-48h. Publica servicios con precio y disponibilidad. Tabla: `proveedores` (tiene nombre_publico para display, nombre/apellido_p/apellido_m para datos legales).

**Admin** — rol en array `proveedores.roles`, verificado por `is_admin()` function. Panel en /admin con sidebar sticky.

## Tablas principales (Supabase)

- `proveedores` — perfil del proveedor (nombre, apellido_p, apellido_m, nombre_publico, rut, foto_perfil, foto_carnet, foto_carnet_dorso, bio, comuna, tipo_entidad, genero, ocupacion, fecha_nacimiento, galeria[], estado, verificacion_estado, etc.)
- `usuarios_buscadores` — perfil del tutor (nombre, email, rut). NO tiene apellido_p ni foto_perfil.
- `servicios_publicados` — servicios del proveedor (titulo, descripcion, precio_desde, precio_hasta, unidad_precio, fotos[], detalles jsonb, comunas_cobertura text[], disponibilidad, activo)
- `categorias_servicio` — categorías (hospedaje, guarderia, paseos, domicilio, peluqueria, adiestramiento, veterinario, traslado)
- `evaluaciones` — reviews (servicio_id, proveedor_id, usuario_id→auth.users.id, rating, comentario, estado, respuesta_proveedor)
- `conversations` / `messages` — chat interno
- `contactos` — tracking de contactos (canal: mensaje/whatsapp/llamada/email_copiado)
- `favoritos` — servicios favoritos del usuario

## RPCs importantes

- `buscar_servicios` — búsqueda principal en /explorar. Filtra por categoría, comuna, mascota, precio, texto. Retorna proveedor_verificado y proveedor_primera_ayuda para badges.
- `registrar_proveedor` — signup de proveedor (server-side via service role key)

## Estructura de archivos clave

```
pages/
  index.tsx          — Landing/home
  explorar.tsx       — Catálogo con filtros
  login.tsx          — Login (redirige a /proveedor o /explorar según rol)
  register.tsx       — Registro wizard multi-step
  admin.tsx          — Panel admin con sidebar
  servicio/[id].tsx  — Ficha de servicio
  proveedor/index.tsx — Dashboard del proveedor
  proveedor/[id].tsx  — Perfil público del proveedor
  api/auth/signup.ts  — API de registro (rate-limited, rollback on failure)
  api/contactos/track.ts — Tracking de contactos
components/
  Explore/ServiceCard.tsx — Card de servicio (con trust badges)
  Explore/SidebarFiltros.tsx — Filtros laterales
  Proveedor/ServiceFormModal.tsx — Crear/editar servicio
  Service/ReviewList.tsx — Lista de evaluaciones
  Service/ReviewForm.tsx — Formulario de evaluación
  Shared/ConfirmDialog.tsx — Modal de confirmación estilizado (compartido admin + proveedor)
  Home/SearchBar.tsx — Buscador del hero (dropdown custom, no select nativo)
contexts/
  UserContext.tsx — Auth state global (5s timeout, anti-race condition)
lib/
  supabaseClient.ts — Cliente Supabase
  serviceMapper.ts — Mapeo RPC → ServiceResult
  comunas.ts — Lista de comunas de Chile
```

## Convenciones de código

- NO emojis en la UI — solo iconos Lucide monocromaticos
- NO `type="url"` en inputs — usar `type="text"` (acepta www. sin https://)
- Precios siempre con separador de miles (toLocaleString('es-CL'))
- Precios siempre dicen "Desde" antes del monto
- `getProxyImageUrl()` para URLs de Supabase Storage (bypass AdBlock)
- Autonomía total: no pedir permiso para editar, commitear o pushear
- Commits incluyen `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

## Bugs conocidos / precauciones

- `usuarios_buscadores` NO tiene `apellido_p` ni `foto_perfil` — no hacer joins o inserts con esas columnas
- `evaluaciones.usuario_id` referencia `auth.users.id`, NO `usuarios_buscadores.id`
- `buscar_servicios` RPC: p_comuna debe aceptar NULL (no solo string vacío)
- El header tiene banner "EXCLUSIVO LANZAMIENTO" que agrega altura variable — no hardcodear px para sidebars

## Lo que NO hace Pawnecta — no implementar sin confirmación

- Procesamiento de pagos
- Calendarización o reservas
- Sistema de booking/transacciones
- Monetización (será post-lanzamiento: plan destacado para proveedores)

## Workflow

Claude Code (VS Code) → commit + push a main → Vercel deploy automático
Rama principal: main
Supabase Management API con PAT para migraciones directas
