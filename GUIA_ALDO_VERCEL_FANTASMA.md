# Guía Aldo — Borrar proyecto Vercel fantasma `pawnecta-web-mvp`

**Contexto**: en la consola Vercel del team `petmatecls-projects` aparece un proyecto duplicado `pawnecta-web-mvp` (nombre similar al real `pawnecta-landing-mvp`). Este documento es la instrucción operativa para que Aldo lo elimine con verificación previa. Sigue los 3 pasos en orden — el paso 1 es obligatorio antes de tocar cualquier botón de borrar.

---

## Paso 1 — Verificar que el proyecto fantasma está vacío (obligatorio)

Antes de borrar, chequear que **no tiene tráfico ni dominios activos**. Un click de más en un proyecto equivocado es irreversible.

1. Abrir https://vercel.com/petmatecls-projects.
2. Click en el proyecto `pawnecta-web-mvp` (el fantasma — el real es `pawnecta-landing-mvp`).
3. Verificar los 3 chequeos:

   **a) Tab `Deployments`** — la lista está vacía **O** solo tiene deployments con estado `Error` / `Canceled` sin promoción a Production. Si aparece algún deployment `Ready` reciente (< 7 días) → **STOP, no borrar** y consultá antes.

   **b) Tab `Settings → Domains`** — la lista de dominios está vacía. Si aparece cualquier dominio (especialmente `pawnecta.com`, `www.pawnecta.com` o cualquier `*.pawnecta.com`) → **STOP, no borrar** y consultá antes.

   **c) Tab `Settings → Git`** — o no hay repo conectado, o si lo hay es el mismo `petmatecl/petmate-landing-mvp` (el legítimo). Cualquier otro repo conectado → **STOP, no borrar** y consultá antes.

Si los 3 chequeos pasan → seguir al paso 2. Si alguno falla → parar y avisar en el chat con captura de pantalla.

---

## Paso 2 — Borrar el proyecto

1. Estando en el proyecto fantasma, ir a `Settings → General` → scrollear al fondo hasta la sección `Delete Project` (fondo rojo).
2. Click en el botón `Delete`.
3. Vercel pide confirmación tipeando el nombre del proyecto — tipear exactamente `pawnecta-web-mvp` (no `pawnecta-landing-mvp` — ese es el bueno).
4. Confirmar. Vercel muestra toast `Project deleted`.

---

## Paso 3 — Confirmar que quedó borrado

1. Volver a https://vercel.com/petmatecls-projects.
2. Verificar que en la grilla ya **no aparece** `pawnecta-web-mvp` y **sí sigue apareciendo** `pawnecta-landing-mvp` (con sus últimos deployments verdes).
3. Opcional: hit rápido a https://www.pawnecta.com/ desde otra pestaña — debe responder `200 OK` normal (el proyecto real nunca se tocó).

---

## Rollback

Vercel **no permite** deshacer un delete de proyecto. Por eso el paso 1 es obligatorio. Si tras borrar aparece algún problema (improbable dado que el fantasma no tiene tráfico), avisar en el chat y evaluamos re-crear un proyecto nuevo apuntando al mismo repo — pero eso sería un proyecto **distinto**, no una recuperación del borrado.
