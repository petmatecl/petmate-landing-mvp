# N4 — audit `fetch()` para el flip de caching default de Next 15

**Rama**: `next15` · **Fecha**: 2026-07-30 · **Sub-entregable**: N4 del tren N15.

## Contexto del flip

Next 15 revierte el comportamiento por default de `fetch()` server-side: en Next
14 dentro de App Router server components los `fetch()` eran cacheados por
default (`cache: 'force-cache'` implícito); en Next 15 el default es `cache:
'no-store'` (sin cache). Doc: [Next 15 upgrade guide](https://nextjs.org/blog/next-15).

**Alcance real del cambio**: la instrumentación de `fetch()` que Next hace para
implementar el caching **existe solo en App Router server components + route
handlers**. En Pages Router (que es nuestro caso 100%), Next nunca envolvió
el `fetch` nativo — ni en 14 ni en 15 — así que el flip **no cambia comportamiento
en nuestro stack**.

Este documento verifica esa hipótesis por inventario exhaustivo.

## Inventario de `fetch(` — pages/ + lib/

Grep con salida completa (file:line):

| # | File:line | Contexto de ejecución | Qué pide | ¿Dependía del cache de Next? |
|---|---|---|---|---|
| 1 | `pages/index.tsx:34` | **Client** (handler `onSubmit` del subscribe waitlist) | `POST /api/waitlist/subscribe` | No — es fetch del navegador |
| 2 | `pages/explorar.tsx:68` | **Client** (mismo handler waitlist) | `POST /api/waitlist/subscribe` | No — navegador |
| 3 | `pages/register.tsx:215` | **Client** (submit del wizard de signup) | `POST /api/auth/signup` | No — navegador |
| 4 | `pages/proveedor/index.tsx:517` | **Client** (event handler post-accept reserva) | `POST /api/agendamientos/notify-tutor` | No — navegador |
| 5 | `pages/proveedor/index.tsx:577` | **Client** (event handler post-reject reserva) | `POST /api/agendamientos/notify-tutor` | No — navegador |
| 6 | `pages/mis-solicitudes.tsx:157` | **Client** (handler cancelar reserva) | `POST /api/agendamientos/cancelar` | No — navegador |
| 7 | `pages/mis-solicitudes.tsx:186` | **Client** (fire-and-forget notify post-cancel) | `POST /api/agendamientos/notify-proveedor-cancel` | No — navegador |
| 8 | `pages/admin/proveedores.tsx:122` | **Client** (handler aprobar proveedor) | `POST /api/admin/notify-provider` | No — navegador |
| 9 | `pages/admin/proveedores.tsx:158` | **Client** (handler rechazar proveedor) | `POST /api/admin/notify-provider` | No — navegador |
| 10 | `pages/api/auth/signup.ts:146` | **Server (Node runtime, API route)** | `POST ${siteUrl}/api/auth/welcome` (server-to-server) | **No** — Pages Router API routes NUNCA fueron instrumentadas por el fetch-cache de Next (feature solo aplica a App Router) |
| 11 | `lib/notifications.ts:37` | **Client** (helper reutilizable llamado desde componentes) | `POST /api/notifications/create` | No — navegador |
| 12 | `lib/visitTracking.ts:29` | **Client** (helper llamado en `useEffect`) | `GET /api/visitor-hash` | No — navegador |

**Total: 12 callsites**. 11 en client (browser), 1 server-to-server dentro de una API route (Node runtime, no instrumentado por Next-cache).

## Verificación complementaria — cero `fetch()` en gSSP/gSP/gSPa

Los 8 hooks de renderizado server-side del proyecto:

- `pages/index.tsx > getStaticProps` (línea 691)
- `pages/blog/[slug].tsx > getStaticPaths + getStaticProps` (238, 246)
- `pages/[categoria]/index.tsx > getStaticPaths + getStaticProps` (130, 143)
- `pages/[categoria]/[comuna].tsx > getStaticPaths + getStaticProps` (201, 219)
- `pages/proveedor/[id].tsx > getServerSideProps` (725)
- `pages/servicio/[id].tsx > getServerSideProps` (25)
- `pages/sitemap.xml.tsx > getServerSideProps` (8)
- `pages/ejemplo.tsx > getStaticProps` (50)

Verificado por `awk` extracción del bloque + `grep -c "fetch("` sobre cada hook.
**Resultado: 0/8 usan `fetch()`**. Los que sí obtienen data server-side lo hacen
con Supabase JS SDK directo (`supabase.from(...)`) — cliente que no participa
del sistema de caching de Next.

Y `grep "fetch(.*https://" pages/`: **0 matches** — cero fetch a URL externa
desde código server-side.

## Veredicto

**CERO edits necesarios**. El flip de caching default de `fetch()` en Next 15
no afecta a Pawnecta por dos razones ortogonales:

1. **100% Pages Router**: la instrumentación de `fetch` para caching no existe
   en Pages Router — ni en 14 ni en 15. Sin cambio de comportamiento en API
   routes o gSSP/gSP.
2. **Cero uso server-side de `fetch`**: los 8 hooks server-side (gSSP/gSP/gSPa)
   obtienen data exclusivamente vía Supabase JS SDK. El único `fetch` server
   del proyecto es un round-trip a nuestra propia `/api/auth/welcome` dentro
   de otra API route — Node fetch puro sin capa Next intermedia.

**El valor de N4 es la confirmación documentada**, no un cambio de código:
elimina la incertidumbre sobre si algún callsite silenciosamente cambió de
comportamiento con el bump.

## Cierre

- Inventario completo: 12/12 callsites clasificados.
- gSSP/gSP/gSPa: 0/8 usan `fetch()`.
- `npm run build` (P1) verde post-verificación.
- Cero edits de código; solo este documento como evidencia.
- Regla P3: branch-guard `next15` OK.
