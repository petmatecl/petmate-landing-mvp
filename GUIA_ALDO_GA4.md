# Guía Aldo — Configuración GA4 post-Sprint ANALYTICS-1

**Objetivo**: los 5 pasos para marcar los 4 key events en GA4 + verificar el cableado con DebugView + dónde mirar la métrica norte "conexiones semanales".

**Cuándo ejecutar**: post-promoción de `analytics-1 → main`, cuando el bundle nuevo esté sirviendo en `www.pawnecta.com` (verificar con `curl` que el bundle client tenga el string `trackEvent` — o simplemente esperar ~2min post-push).

**Contexto de gate PL2 (crítico entender)**: la instrumentación **YA está sirviendo** en preview y prod, pero **solo dispara en prod** (`NEXT_PUBLIC_APP_ENV === 'production'`). Preview + staging + dev = no-op silencioso por diseño. Cero data contaminada al dashboard.

---

## Parte 1 — Marcar los 4 key events (~5 min)

Los 4 eventos que Google GA4 debe contar como **conversiones** (dashboard destaca, funnels los usa como norte, etc.):

1. `registro_proveedor_completado`
2. `servicio_publicado`
3. `contacto_iniciado`
4. `reserva_confirmada`

**Nota**: los eventos deben haber "existido" al menos una vez antes de aparecer en la lista de GA4. Si acabás de deployar y GA4 dice "no encuentro el evento", esperá 24h post primeros disparos organicos, o forzá el disparo tú mismo desde prod (registrar un proveedor de prueba, publicar servicio, contactar a alguien, hacer reserva) mientras Aldo mira DebugView (parte 2).

**5 pasos por cada uno** (repetir 4 veces):

```
1. Abrir GA4 → seleccionar propiedad Pawnecta (G-SCNG5J67E9).
2. Sidebar izquierda → Admin (engranaje inferior izquierdo).
3. Property column → click "Events".
4. En la tabla de eventos, buscar el nombre (ej. registro_proveedor_completado).
   Si NO aparece → esperá 24h post-primer-disparo o forzá el disparo.
5. En la fila del evento → toggle "Mark as key event" (columna derecha).
   Ícono cambia a estrella dorada; GA4 confirma con toast breve.
```

**Ubicación alternativa (nuevo UI GA4 2025)**: puede que la opción se llame "Mark as conversion" en algunos accounts (Google renombró conversion → key event durante 2024-2025 rollout). Ambos labels apuntan a lo mismo.

---

## Parte 2 — Verificar cableado con DebugView (~10 min)

DebugView permite ver eventos disparándose en **tiempo real**, ideal para confirmar que la instrumentación aterrizó bien post-deploy.

**Setup DebugView** (una sola vez):

```
1. GA4 → Admin → DebugView (columna Property).
2. Instalar extension "Google Analytics Debugger" en Chrome (Chrome Web Store, gratis).
3. Abrir Chrome → click en el ícono de la extension (barra herramientas) → toggle ON.
   La página se recarga y todo el tráfico ahora manda con debug_mode=true.
```

**Verificar los 12 disparos canónicos** (un flujo por cada evento — hacer con tu propio navegador Chrome con la extension activa, en prod):

| # | Evento | Cómo dispararlo desde www.pawnecta.com |
|---|---|---|
| 1 | `registro_proveedor_iniciado` | Home → click "Soy proveedor" (header) o "Publica gratis" (card) → llega a `/register?rol=proveedor` |
| 2 | `registro_proveedor_completado` | Completar el wizard de registro con rol=proveedor + submit final success |
| 3 | `verificacion_enviada` | `/proveedor` → tab Identidad → subir carnet front+dorso + RUT + submit |
| 4 | `servicio_publicado` | `/proveedor` → tab Mis Servicios → botón "+ Publicar nuevo servicio" → completar wizard + submit success |
| 5 | `agenda_activada` | Mismo publish anterior pero con toggle F1 (paseos con horarios) o F2 (cuidado con capacidad) activado |
| 6 | `busqueda_realizada` | Home → SearchBar → categoría + comuna + submit → aterriza en `/explorar?categoria=X&comuna=Y` |
| 7 | `ficha_vista` | `/explorar` → click en cualquier card → llega a `/servicio/{id}` de servicio REAL (no ejemplo — los ejemplo no cuentan por diseño) |
| 8 | `contacto_iniciado` | Ficha real → click "Enviar mensaje" (con user tutor logueado) o WhatsApp o Teléfono |
| 9 | `reserva_confirmada` (F2) | Ficha de servicio Cuidado con F2 activa → picker de noches → confirmar rango → success |
| 10 | `reserva_confirmada` (F1) | Ficha de servicio Paseos con F1 activa → picker de slots → elegir slot → confirmar → success |
| 11 | `solicitud_enviada` | Ficha de servicio SIN picker (V4a/V4b/V1/V2) → completar form → submit → success |
| 12 | `resena_publicada` | `/admin/evaluaciones` → aprobar una evaluación pendiente → toast success |

**Qué esperar en DebugView**: cada disparo aparece en el timeline con nombre + params. Verificar:
- Nombre exactamente igual al catálogo (snake_case español).
- Params correctos: `busqueda_realizada` con `{categoria, comuna}`; `ficha_vista` con `{servicio_id, categoria}`; `contacto_iniciado` con `{canal}`; `reserva_confirmada` con `{familia: F1|F2}`.

**Si algún evento NO aparece**:
- Verificar que `NEXT_PUBLIC_APP_ENV === 'production'` en Vercel (ya creado 2026-08-04). Si no está, gate PL2 apaga el ID → nada se envía.
- Verificar que el user aceptó cookies (consent banner). Si rechazó, `ConsentScripts` NO carga gtag → nada se envía. Es comportamiento correcto — user opted out.
- Ver Console del browser: si el `<script src="https://www.googletagmanager.com/gtag/js?...">` NO aparece en el `<head>`, es lo mismo que arriba.

---

## Parte 3 — Métrica norte "conexiones semanales" (~2 min setup)

**Definición**: `conexiones_semanales = contacto_iniciado + reserva_confirmada` sumados por semana.

**Dónde mirarla**:

**Opción A — Report canned de eventos** (rápido, ~30 seg):
```
1. GA4 → Reports (sidebar izquierda) → Engagement → Events.
2. En la tabla, sumar mentalmente los 2 eventos de la última semana:
   contacto_iniciado (count 7d) + reserva_confirmada (count 7d) = conexiones semanales.
```

**Opción B — Exploration custom** (mejor para tracking semanal recurrente, ~10 min setup una vez):
```
1. GA4 → Explore → Blank exploration.
2. Nombre: "Conexiones semanales Pawnecta".
3. Rows: "Event name" filtrado a { contacto_iniciado, reserva_confirmada }.
4. Cols: "Week" (o "Date" agrupado por semana ISO).
5. Values: "Event count".
6. Guardar. La suma de las 2 filas por semana es la métrica norte.
```

**Opción C — Custom metric derivada** (más avanzado, requiere GA4 Admin BigQuery export):
Fuera del scope del sprint; anotable para post-launch si el volumen justifica dashboard dedicado.

---

## Parte 4 — Troubleshooting rápido

| Problema | Solución |
|---|---|
| DebugView muestra "no debug data" tras 30s | Verificar extension Chrome activa + página recargada + user en prod (no staging) |
| Evento aparece pero sin params | Verificar que estás disparando el path correcto (ej. `busqueda_realizada` requiere submit con categoría o comuna) |
| Todos los eventos disparados 2× | Doble ejecución del useEffect en dev (React strict mode). En prod es 1×. No fix. |
| Nombre evento mal (typo) | Imposible — el union type TS `EventoTracking` rechaza typos en compile-time. Si aparece uno, mirar si el bundle client está atrasado (Vercel cache); hacer redeploy manual |
| KeyEvent no aparece en lista | Esperar 24h post-primer-disparo, o forzar el disparo desde prod con browser + DebugView |

---

## Parte 5 — Post-launch: ajustes al catálogo (si aparecen)

El catálogo de 11 eventos está declarado como union type en `lib/gtag.ts`. Para agregar/renombrar eventos post-launch:

1. Editar `EventoOferta` o `EventoDemanda` en `lib/gtag.ts`.
2. Agregar la llamada `trackEvent(nuevoEvento, params)` en el punto de UI.
3. Actualizar `lib/gtag.test.ts` catálogo esperado (test #5).
4. Actualizar esta guía con el paso Debug/Key event si aplica.
5. Sprint chico dedicado, no requiere el proceso completo del ANALYTICS-1.

---

## Estado tras entrega

- **Instrumentación aterrizada**: 12 llamadas trackEvent (11 eventos + reserva_confirmada F1/F2) cableadas en 8 archivos.
- **Gate PL2 preservado**: preview/staging/dev silenciosos por diseño.
- **4 key events**: pendiente que Aldo los marque en dashboard GA4 (5 pasos × 4 = ~5 min).
- **Métrica norte**: fórmula documentada, dashboard opciones A/B/C.
- **DebugView guide**: workflow completo para verificar cableado end-to-end post-promoción.
