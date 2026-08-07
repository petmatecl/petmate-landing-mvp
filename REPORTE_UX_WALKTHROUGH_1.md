# UX Walkthrough Navegado #1 — Ensayo pre-Auditoría #2

**Fecha**: 2026-08-04 tarde-noche.
**Target**: preview staging `pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app` (SHA `c342b74`).
**Estado del desfile**: preview PRE-desfile (staging aún NO tiene los merges de `producto-1 → zonab-1 → producto-2` que aterrizarán el jueves 06-ago post-monitor).
**Método**: Playwright MCP plugin + Chrome DevTools MCP plugin (estreno operativo).
**Autorización**: GO explícito del PO 2026-08-04 tarde — ensayo del módulo UX de la Auditoría Integral #2.
**Cleanup**: verificado MCP staging, `0` residuos test post-walkthrough (no se completaron submits).

---

## Smoke tooling (0/0)

- ✅ **Playwright plugin** (`@claude-plugins-official/playwright`): los 5 tools primarios operan (browser_navigate + browser_take_screenshot + browser_console_messages + browser_network_requests + browser_snapshot + browser_click + browser_type + browser_close). Test smoke: navigate `/explorar` con bypass query → cookie `_vercel_jwt` seteada → navegación posterior sin query.
- ✅ **Chrome DevTools plugin**: no ejercitado en este ensayo (Playwright cubrió los recorridos). Reservado para perf/heap/lighthouse audits del jueves si aparecen findings de perf.
- **Noise conocido descartado**: 3 CSP errors en TODAS las páginas de preview (`vercel.com/sso-api?url=...manifest.json` × 2 + `vercel.live/_next-live/feedback/feedback.js`). Son del **bypass mechanism de Vercel Deployment Protection** — CSP del proyecto es correcta, Vercel Live intenta cargar scripts fuera de whitelist. **En prod real (sin protection) NO aparecen**.

---

## Recorrido 1 — PÚBLICO sin login

**Path**: `/` → `/explorar?categoria=cuidado` → `/servicio/{id-ejemplo}` → gate ExampleCTAModal → `/servicio/{id-real}` → gate LoginRequiredModal.

### Findings

**[UX-1] Filler cards spam en `/explorar` con pocos resultados** — severidad **ALTA** (80)
- `/explorar?categoria=cuidado` tiene 4 servicios reales + **8 tarjetas duplicadas "¿Tienes un servicio para mascotas? Publica gratis"** insertadas en el grid como filler. Todas apuntan al MISMO link `/register?rol=proveedor&categoria=cuidado`.
- Sumado a: banner top "Estamos en lanzamiento — Regístrate como proveedor" + link header "Soy proveedor" + CTA lateral "¿Ofreces servicios para mascotas?" + link footer "Publicar mi servicio" = **~12 apariciones del mismo destino** en una sola vista.
- Efecto: parece spam intrusivo; el user siente que la página está vacía y Pawnecta está desesperado por proveedores. Antipatrón vs. transmitir "17 servicios disponibles" (stats del home).
- **Aclaración clave (pre-triage)**: los filler cards **NO son servicios Ejemplo** (esos son filas reales en BD con badge "EJEMPLO Verificado" — Carolina M., Sebastián C., etc., que se retiran con el phase-out gradual de producto). Los filler son un **componente que renderiza N placeholders en el `map` del grid** cuando hay pocos resultados. Ortogonales al phase-out de ejemplos, aunque interactúan: cuando el phase-out madure una categoría, los filler se vuelven aún más ruidosos porque el grid queda mixto (reales + 8 filler).
- **Pre-clasificación PO 2026-08-04 (triage jueves)**:
  - Severidad Alta ratificada (8 CTAs duplicadas junto a 4 reales hace ver el explorador vacío/spammy — daño directo a la vitrina pre-lanzamiento).
  - Owner: **código** frontend `/explorar` (no producto/data).
  - Esfuerzo estimado: **~30 min**.
  - Fix direccional aprobado: **cap de filler a máximo 1 por grid** + **condicional de retiro cuando la categoría tenga ≥N servicios reales** (N a definir en el fix, sugerido **3**). Copy más orgánico ("¿No encontraste? Publica tu servicio para completar la categoría").
  - Slot: sweep post-Auditoría #2 junto a los demás fixes del triage.
  - Interacción con phase-out de Ejemplos: registrada como **agravante futuro, NO como dependencia**.
- Evidencia: `walkthrough-2-explorar-cuidado-fillers.png` (fullPage).

**[UX-2] Duplicación excesiva CTA "Registro proveedor"** — severidad **MEDIA** (70)
- Global (todas las páginas públicas): banner top + nav "Soy proveedor" + footer "Publicar mi servicio" = 3 apariciones fijas.
- Más en `/explorar`: CTA lateral "¿Ofreces servicios para mascotas?" (4to) + filler cards (5+ apariciones).
- Total en `/explorar?categoria=cuidado` = **~12 apariciones** del mismo link `/register?rol=proveedor`.
- **Fix propuesto**: elegir 1 canal por página, no 4 a la vez. Recomendado: nav + footer siempre + banner solo hasta N proveedores reales por categoría (retirar cuando categoría "madura").
- Interacción con phase-out ejemplos (ya en BACKLOG): cuando una categoría alcance ≥2 proveedores reales, retirar filler cards de esa categoría automáticamente.

**[a11y-1] `LoginRequiredModal` sin `role="dialog"`/`aria-modal` en staging pre-desfile** — severidad **MEDIA** (75)
- `/servicio/{eduardo-real}` → click "Enviar Mensaje" → snapshot muestra `generic [ref=f2e444]` con `heading "Inicia sesión para continuar" [level=2]` + `paragraph` + 2 buttons.
- Falta `role="dialog"` + `aria-modal="true"` + `aria-labelledby`. Screen readers no lo anuncian como modal.
- **INCONSISTENTE** con `ExampleCTAModal` (mismo cliente, `/servicio/{carolina-ejemplo}`) que SÍ es `dialog "Esta es una vista de ejemplo"` con role correcto.
- **YA RESUELTO en `zonab-1`** (ZB1 sprint): `git show zonab-1:components/Shared/LoginRequiredModal.tsx` incluye `useModalDialog` + `role="dialog"` + `aria-modal="true"`. **El merge del jueves cierra este finding automáticamente**. Anotado como baseline pre-desfile.

**[UX-3] Copy L1592 `ExampleCTAModal`** — severidad **BAJA** (60)
- Texto: `"Para enviar un mensaje con un proveedor real necesitas registrarte..."`. "Con" es preposición extraña — normalmente "a un proveedor" o "para un proveedor". Micro-fricción de lectura.
- **Fix propuesto**: `"Para enviar un mensaje a un proveedor real, regístrate en Pawnecta..."`.

**[a11y-2] Botón cerrar de `LoginRequiredModal` sin nombre accesible** — severidad **MEDIA** (75)
- El botón `X` de cerrar el modal aparece en el snapshot como `button [ref=f2e445] [cursor=pointer]` **sin `aria-label` ni texto visible**. Screen readers dicen "botón" sin más contexto.
- **Fix propuesto**: `aria-label="Cerrar"` explícito.
- **Verificar en zonab-1 si el ZB1 refactor lo cerró junto con role="dialog"** — probable que sí (mismo componente + `useModalDialog`).

---

## Recorrido 2 — TUTORA (Camila `acanocts+tutor@gmail.com`)

**Path**: `/login` → login exitoso → redirect `/explorar` → `/mis-solicitudes` (baseline pre-pestañas).

### Findings

**[BASELINE-1] `/mis-solicitudes` pre-desfile en scroll infinito** — expected, anotado como baseline
- 9 cards en scroll único sin partición (2 "Cancelada por ti" + 5 "Confirmada" + 1 "Cancelada por ti" adicional + 1 "Cancelada por el proveedor").
- 5 botones "Cancelar reserva" en las confirmadas. Algunas confirmadas tienen `fecha_preferida` pasada → el bug UX original (ofrecer "Cancelar reserva" sobre una realizada) que PRODUCTO-2 corrige con estado derivado REALIZADA/VENCIDA + acciones gateadas + pestañas.
- **POST-DESFILE (PRODUCTO-2 mergeado)**: cards se dividirán en 3 pestañas Próximas/Pendientes/Historial + badges REALIZADA/VENCIDA + acciones gateadas por construction + filtros proveedor+mascota + chip mascota + CTA "Volver a solicitar" en vencidas con cancel-then-navigate.
- **Comparación jueves**: `walkthrough-4-mis-reservas-baseline.png` (fullPage) es el before. El after será el mismo camino sobre staging post-desfile.

**[UX-4] Título en el header dice "Mis reservas" pero URL es `/mis-solicitudes`** — severidad **BAJA** (65)
- Página title: `Mis reservas | Pawnecta`. Path URL: `/mis-solicitudes`. Discrepancia de taxonomía user-visible.
- Ya en BACKLOG como "rename ruta `/mis-solicitudes` → `/mis-reservas` + redirect permanente" (deuda cerrada del sweep #3 taxonomía). Confirmado que el gap sigue vivo en staging pre-desfile.

---

## Recorrido 3 — PROVEEDOR (Aldo `acanocts@gmail.com`, rol proveedor + admin)

**Path**: logout via `/security-logout` → `/login` → login exitoso → redirect `/proveedor` → sidebar 6 tabs.

### Findings

**[a11y-3] Sidebar tabs proveedor sin `role="tab"` ni `aria-selected`** — severidad **MEDIA** (75)
- Panel `/proveedor` sidebar tiene 6 `button` (Mis Servicios / Mi Perfil / Evaluaciones / Mensajes / Estadísticas / Solicitudes) que actúan como tabs (cambian el contenido del panel).
- Son `button` puros, sin `role="tab"`, sin `aria-selected`, sin wrapper `role="tablist"`.
- **INCONSISTENTE** con `/mis-solicitudes` PD2 que sí usa `role="tablist"` + `role="tab"` + `aria-selected`.
- **Fix propuesto**: aplicar el mismo patrón que PD2 al `/proveedor` — 5 min por tab, similar a ZB2 Dim 3.
- **NO se resuelve con el desfile** — es superficie propia de `/proveedor` que ningún sprint del desfile toca. Registrar como deuda P3 nueva.

**[UX-5] Barra "Completitud del perfil 15%"** — nota positiva
- Panel `/proveedor` muestra barra prominente con "15%" + botón "Ocultar completitud del perfil". UX gamificado sano. Sin acción.

**[UX-6] Menú usuario del header dice "AS Admin"** — severidad **BAJA** (65)
- El menu de usuario en el header muestra "AS" (avatar iniciales) + "Admin" — pero Aldo es proveedor CON rol admin. El label "Admin" oculta el rol proveedor primario que usa la mayoría del tiempo.
- **Fix propuesto**: mostrar nombre real ("Aldo Cano") o rol primario ("Proveedor") en vez del array `roles`. Investigar cómo se calcula el string display.
- Marginal — solo se ve al hacer hover sobre el menú.

---

## Findings consolidados por severidad

| ID | Severidad | Score | Ubicación | Fix estimado | Cerrado por desfile? |
|---|---|---|---|---|---|
| UX-1 | Alta | 80 | `/explorar` filler cards | 30 min | No |
| UX-2 | Media | 70 | Duplicación CTA proveedor global | 1h | Parcial (phase-out ejemplos ayuda) |
| a11y-1 | Media | 75 | LoginRequiredModal sin role="dialog" | — | ✅ YES (zonab-1 fase C) |
| UX-3 | Baja | 60 | Copy "con un proveedor" | 5 min | No |
| a11y-2 | Media | 75 | Botón cerrar sin aria-label | — | Probable YES (zonab-1 useModalDialog) |
| BASELINE-1 | N/A | — | `/mis-solicitudes` scroll infinito | — | ✅ YES (producto-2 fase D) |
| UX-4 | Baja | 65 | URL vs título "mis-solicitudes / mis-reservas" | 30 min | No (ya en BACKLOG) |
| a11y-3 | Media | 75 | `/proveedor` sidebar sin role="tab" | 30 min | No |
| UX-5 | — | — | Barra completitud proveedor | — | — |
| UX-6 | Baja | 65 | Header dice "Admin" en vez de nombre/rol | 15 min | No |

**Totales**: 1 alta (UX-1) · 4 medias (UX-2, a11y-1, a11y-2, a11y-3) · 3 bajas (UX-3, UX-4, UX-6) · 2 baseline/notas (BASELINE-1, UX-5).

**Cerrados por desfile automático**: 2 (a11y-1, BASELINE-1) + 1 probable (a11y-2).

**Nuevos a entrar al triage jueves (no cerrados por desfile)**: 6 (UX-1, UX-2, UX-3, UX-4, a11y-3, UX-6).

---

## Estreno operativo — evaluación de plugins

**Playwright plugin**: **✅ EXCELENTE**. Los 8 tools primarios responden confiablemente. Snapshot semántico + accessible names + refs estables → navegar con precisión. Screenshot fullPage + viewport para evidencia visual. `browser_type` con `submit:true` acelera forms (Enter automático). Console + Network requests filtered → cosecha limpia sin ruido de assets estáticos. Recomendado como base del módulo UX Walkthrough del jueves.

**Chrome DevTools plugin**: no ejercitado en este ensayo. Reservado on-demand para perf/heap/lighthouse cuando aparezca finding de performance en el jueves.

**Limitación detectada**: el bypass query `?x-vercel-protection-bypass=<token>&x-vercel-set-bypass-cookie=samesitenone` funciona en el navigate inicial → cookie `_vercel_jwt` sesión-persistente en el context. **Preservar cookie entre navigates** requiere no llamar `browser_close` hasta terminar la sesión (verificado: session cerró al final del recorrido proveedor, próxima corrida necesita bypass query nuevo).

---

## Comparación pre-Auditoría #2 (jueves)

Este ensayo cosechó **10 findings** sobre staging **PRE-desfile**. La pasada del jueves será sobre staging **POST-desfile consolidado** (producto-1 + zonab-1 + producto-2 mergeados). Diferencias esperadas:

- **Cerrados automáticamente por el desfile** (3): a11y-1, a11y-2 (zonab-1 ZB1 hook `useModalDialog`), BASELINE-1 (producto-2 pestañas + badges + gateo).
- **Sobreviven al desfile** (6-7): UX-1, UX-2, UX-3, UX-4, a11y-3, UX-6 — entran al triage del jueves junto a los findings del canónico xhigh + security-guidance + walkthrough re-navegado del jueves.
- **Nueva superficie del desfile** (a auditar el jueves, no cubierta en este ensayo):
  - Badge "Reserva online" en ficha (producto-1 PR1).
  - Categoría Etología + wizard 12 campos (producto-1 PR2).
  - Cross-links adiestramiento ↔ etología (producto-1 PR2).
  - Pestañas Próximas/Pendientes/Historial + chip mascota + CTA "Volver a solicitar" (producto-2).
  - RPC `buscar_servicios` con fix `duracion_slot_min` (SECURITY DEFINER — superficie interesante para security-guidance).

## Screenshots referenciados

- `walkthrough-1-home.png` — home viewport (baseline hero + banner + nav).
- `walkthrough-2-explorar-cuidado-fillers.png` — fullPage con 8 filler cards visible.
- `walkthrough-3-ficha-ejemplo-gate.png` — `ExampleCTAModal` dialog.
- `walkthrough-4-mis-reservas-baseline.png` — `/mis-solicitudes` pre-pestañas fullPage.
- `walkthrough-5-panel-proveedor.png` — `/proveedor` viewport con sidebar 6 tabs.

Todos guardados en `.playwright-mcp/` (gitignored — no van al commit).

## Cleanup post-walkthrough

MCP staging query: `0 residuos [TEST-%` + `0 servicios e2e-%`. Cero submits completados durante el ensayo → cero data creada.

## Estado tras entrega

- **Reporte listo** para triage jueves junto al canónico xhigh + security-guidance + walkthrough re-navegado del jueves.
- **10 findings entrarán al triage único** con score comparable formato audit 2026-07-23.
- **Standby real hasta jueves ~15:00 CLT** (~44h). Nada más se mueve.
