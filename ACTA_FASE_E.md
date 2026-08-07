# ACTA FASE E — Desfile `staging → main` en producción

**Fecha ejecución**: viernes 2026-08-07.
**Autorización**: GO explícito PO tras cierre Sweep #1 (5 blockers Auditoría #2 verdes) con instrucciones para geometría, 6 smokes ampliados, tags de cierre y monitor liviano de finde.
**Ejecutor**: Claude, guard P3 verificado en cada fase.

---

## 1. Geometría declarada

| Rama | SHA pre-merge |
|---|---|
| `main` | `8977380` (con `8e17ef6` P7 docs + `8977380` cierre Fase 8) |
| `staging` | `1127400` (desfile completo + Auditoría #2 + Sweep #1) |

- `main..staging` = **21 commits** (todo el trabajo de dos semanas: 4 sprints + auditoría + sweep).
- `staging..main` = **2 commits** (`8e17ef6` regla P7 + `8977380` cierre Fase 8 monitor N15) — commits directos a main que staging NO tenía.

**Naturaleza declarada**: **merge commit no-FF esperado** (no FF puro porque los 2 commits de main no están en staging).

## 2. Merge staging → main

- **Comando**: `git merge staging --no-edit` (dirección canónica del mini-checklist).
- **1 conflicto** en `CLAUDE.md` — bloque regla P6 (staging, sprint producto-1 27-jul) vs regla P7 (main, 04-ago). Ambos legítimos, cero overlap. **Resolución**: aceptar ambos bloques ordenados cronológicamente (P6 → P7).
- **Build P1 local** post-conflict-resolve: **exit 0**.
- **Merge commit final**: `8e79cc3` (`Merge branch 'staging'`).
- **Push a origin/main**: exitoso, sin drift.

```
$ git rev-parse HEAD
8e79cc3dc089783ffc58109ecdef79bdcc0d4084
```

## 3. Deploy Vercel prod

- **Poll a `https://www.pawnecta.com/explorar`**: 200 OK al primer intento (attempt 1).
- **Delivery del SHA nuevo**: 
  - Primer trigger de smokes: S5 devolvió 307 (deploy previo `8977380` seguía siendo servido durante build del nuevo).
  - Poll adicional cada 20s buscando S5=404 como señal de aterrizaje.
  - **Aterrizaje del bundle nuevo (SHA `8e79cc3`) confirmado al primer intento** (`14:55:18 attempt=1 S5=404`).

## 4. Smokes prod (6)

### Los 3 automatizados ejecutados y verificados

**S4 — `/sw.js` = WORKBOX real** ✅
```
Content-Length: 14820 bytes
Head: if(!self.define){let e,s={};const a=(a,n)=>...
```
No demolisher — `next-pwa` generó el workbox real para VERCEL_ENV=production, tal como se espera.

**S5 — GET `/servicio/00000000-0000-4000-8000-000000000000` → 404** ✅ NUEVO PL1-B1
```
HTTP status: 404
```
Fix PL1-B1 aterrizado en prod. Google recibirá 404 para servicios inexistentes/inactivos → dropea del index → **rompe el ciclo de 307-fantasmas medido en la baseline pre-N15**. Fix cerrado.

**S6 — Gate PL2 GA lado positivo (GA vive en prod)** ✅ NUEVO PL2
```
HTML SSR /explorar:
  googletagmanager.com/gtag/js matches: 0
  SCNG5J67E9 matches:                     0
Bundle client _next/static/chunks/pages/_app-9da3dc044939dc06.js:
  SCNG5J67E9 en bundle client: 1  ✅
```
**Comportamiento correcto verificado**: `ConsentScripts` es client-side y solo inyecta `<Script src="https://www.googletagmanager.com/gtag/js?...">` cuando `hasAnalytics && GA_TRACKING_ID`. En SSR `hasAnalytics = false` (no hay localStorage) → HTML no trae los scripts.

**El check REAL del gate PL2**: ¿el ID horneó al bundle client en el build de prod? → **SÍ** (`SCNG5J67E9` presente 1 vez en `_app-*.js`). Confirma que `NEXT_PUBLIC_APP_ENV=production` creada 2026-08-04 aterrizó al build. **Al aceptar cookies, ConsentScripts inyecta gtag → GA vive en prod**.

### Los 3 comandos exactos para Aldo (verificación PO)

**S1 — Proxy imágenes Supabase Storage funciona**:
Abrir `https://www.pawnecta.com/explorar` en navegador → cualquier card con foto de servicio (proveedor no-ejemplo) debería mostrar la imagen. DevTools Network → filtrar por `/api/image-proxy/` o `/_next/image` → verificar 200 OK. Si aparecen imágenes rotas, especialmente con AdBlock activado, revisar `getProxyImageUrl` (finding M7 pendiente para Sweep #2).

**S2 — Visual home + explorar + ficha**:
- `https://www.pawnecta.com/` — hero, categorías, home stats.
- `https://www.pawnecta.com/explorar` — cards renderizadas con badges (Reserva online, Verificado, EJEMPLO), filtros sidebar, contadores.
- `https://www.pawnecta.com/servicio/c1000001-0000-4000-8000-000000000006` (u otro servicio real vivo) — hero, fotos, CTA contactar, otros servicios.

**S3 — ISR /[categoria]/[comuna]**:
```bash
curl -sI https://www.pawnecta.com/hospedaje/las-condes | grep -iE "x-vercel-cache|content-type|x-nextjs-cache"
```
Esperado: `X-Vercel-Cache: HIT` (o `STALE` seguido de `HIT` en la 2ª request → ISR cache warmup). Content-Type text/html. Renderiza el listado de servicios de esa combinación con badges consistentes (fix B4 verifica badge "Reserva online" ahora aparece en landings — mismo que en /explorar).

### Bonus opcional para Aldo (verificación pasiva)

Abrir Google Analytics → **Tiempo Real** → esperar la primera visita post-deploy. Debe aparecer limpio de ruido — con el gate PL2 en su lado positivo GA solo vive en prod real (staging/preview con `NEXT_PUBLIC_APP_ENV != 'production'` no envían nada). Si aparece ruido de staging → revisar env var scope en Vercel.

## 5. Tags de cierre (5 anotados + push origin)

| Fase | Tag | SHA | Descripción |
|---|---|---|---|
| B | `producto-1-staging-20260807` | `f971ee3` | Merge producto-1 → staging |
| C | `zonab-1-staging-20260807` | `d730801` | Merge zonab-1 → staging |
| D | `producto-2-staging-20260807` | `58e89dd` | Merge producto-2 → staging |
| D-bis | `prelaunch-1-staging-20260807` | `fa7006c` | Merge prelaunch-1 → staging (Cabo #1 resuelto) |
| E | `desfile-prod-20260807` | `8e79cc3` | Fase E: staging → main promoción. 4 sprints + Auditoría #2 + Sweep #1 en producción |

## 6. Sección "RESUMEN DEL DESFILE" (salda deuda P5 de coordinación)

**Los 4 carros (viernes 2026-08-07, ~2h contra ventana ~66h post-monitor N15)**:

| Fase | Merge | SHA pre → post | Suite | Notas clave |
|---|---|---|---|---|
| **A** | Snapshot inicial | `main=8e17ef6` · `staging=c342b74` · `producto-1=ab51664` · `zonab-1=af0b6d7` · `producto-2=200d8ce` · `prelaunch-1=f518cec`. Cero drift local vs origin. | — | FF-checks: producto-1/zonab-1/producto-2 no-FF esperados; prelaunch-1 FF posible pero Cabo #1 pre-declarado forzaba conflict `playwright.config.ts`. |
| **B** | `producto-1 → staging` | `c342b74 → f971ee3` | Corrida 1: 42 passed + 3 flaky (retry verde). Exit 0. | Cero conflicts merge. 15 archivos + 3 migrations verificadas aplicadas en Supabase staging via MCP. Acta P5 `d5e389c`. |
| **C** | `zonab-1 → staging` | `d5e389c → d730801` | Corrida 1: 46p+4 failed (fails en zonab-1 a11y specs). Diagnóstico aislado: 6/6 verde. Corrida 2: 49p+1 flaky (retry verde). Exit 0. | 1 conflict `BACKLOG.md` (P3 crons Pro + P2 advisory lock) resuelto aceptando ambos. Acta P5 `4deaac5`. |
| **D** | `producto-2 → staging` | `4deaac5 → 58e89dd → f32785c` | Corrida 1: 55p+1f+2 flaky+4 did not run. Aislado 13/13 verde 11.3s. Corrida 2: **62 passed exit 0 en 32.3s CERO flaky**. | Cero conflicts (BACKLOG.md auto-merge limpio, EMAIL-CONTACTO-1 en zona diferente). 21 archivos incluye `lib/estadoDerivado` + 3 specs producto-2 + `mis-solicitudes` +420 líneas. Acta P5 `f32785c`. |
| **D-bis** | `prelaunch-1 → staging` | `f32785c → fa7006c → 0292fe2` | Corrida 1: 62p+1f (known-flaky producto-1 s1-badge). Aislado 2/2 verde 6.9s. Corrida 2: **62 passed + 1 flaky (retry verde) exit 0** en 43.5s. | **Cabo #1 disparado como pre-declarado** — conflict `playwright.config.ts` resuelto `git checkout staging -- playwright.config.ts` (deny-list PR0 ganó). **Cabo #2 ya cerrado** (env var creada 04-ago). Smokes runtime staging con cookie jar: PL1-B1 uuid-cero=**404**, PL1-C sitemap XML **32 `<loc>`** (15 servicios + 17 proveedores), PL2 explorar sin gtag. Acta P5 `0292fe2`. |

**Ready checks**: **medios propios via curl con bypass query** (MCP Vercel + CLI ambos indisponibles). Todos los previews respondieron **200 OK al primer intento** (attempt 1) — Vercel pre-buildeó rápido.

**SHA staging consolidado base de la Auditoría #2**: **`0292fe2`** (Fase D-bis final antes de docs de auditoría).

**Cleanup MCP staging post-cada carro**: `0 [TEST-%` + `0 e2e-%` verificado.

**Post-desfile staging avanzó**: `0292fe2 → b95e561` (docs triage Auditoría #2) → `8c35692` (Sweep #1 fixes) → `1127400` (docs Sweep #1 P5). Fase E promocionó `1127400 → 8e79cc3` (merge commit no-FF a main).

**Timeline cronológico completo del viernes 2026-08-07**:
1. ~09:16 CLT — Ancla P7 confirmada.
2. ~13:00 — Cierre Fase 8 monitor N15 (4/4 ratificado).
3. ~13:30-15:50 — Desfile 4 carros staging.
4. ~13:50 (paralelo) — Auditoría #2 arrancó (canónico xhigh + security + UX walkthrough + módulo perf).
5. Post-auditoría — Triage único consolidado (5 blockers + 15 mediums + 14 lows).
6. Sweep #1 — 5 blockers fixed + suite 63 verde + merge FF a staging.
7. Fase E — Merge staging → main + tags + smokes prod.

## 7. Monitor liviano de finde

**Ventana**: sábado 2026-08-08 → domingo 2026-08-09. **Revisión**: lunes 2026-08-10 mañana.

**Mismos 4 items del patrón N15** (versión liviana — sin ventana estricta 48h, checkeo pasivo):

- [ ] **ITEM 1 — Vercel Logs prod**: cero **500 nuevos** sobre baseline. El patrón conocido "307 fantasmas" debe **desaparecer o disminuir dramáticamente** post-desfile — PL1-B1 rompe el ciclo (404 → Google saca de index). Métrica de mejora: si al lunes los 307-fantasmas caen a <5% del volumen histórico, PL1-B1 confirmado en producción real.
- [ ] **ITEM 2 — Crons**: los 6 crons ejecutan sáb/dom sin regresión. Especial atención a `/api/cron/recordatorio-reserva` (refactor claim-then-send del Sweep #1) — `[cron-drift-summary]` en logs debe mostrar `claimsPerdidosTutor: 0` + `claimsPerdidosProveedor: 0` (o valores bajos si algún race real ocurre, sin duplicates enviados).
- [ ] **ITEM 3 — Resend Dashboard**: delivery + bounce sin cambios vs baseline. Especial: cero duplicate emails de recordatorio (prevención del claim-then-send).
- [ ] **ITEM 4 — Bandeja soporte** (`petmatecl@gmail.com`, canal real hoy): cero tickets nuevos "no puedo entrar" / "página rota" / "recibí email raro". BONUS: primera visita real en GA Tiempo Real (gate PL2 lado positivo).

**Sweep #2 (~2h, 10 mediums quirúrgicos)**: se agenda **post-monitor lunes** o **sábado si el PO lo gatilla antes**. Prioridad de M1 (focus regresión zonab-1 modales) y M2 (ReviewModal X sin disabled) como quick wins del batch.

## 8. Estado final

- **Main HEAD**: `8e79cc3` — 4 sprints + Auditoría #2 + Sweep #1 en producción.
- **Bundle deploy prod**: sirviendo desde ~14:55 CLT del 2026-08-07.
- **Los 3 smokes automatizados (S4, S5, S6)**: ✅ verificados.
- **Los 3 smokes visuales (S1, S2, S3)**: comandos exactos entregados a Aldo.
- **5 tags anotados**: emitidos + pushed a origin.
- **Semana completa** (2 semanas de trabajo): **producto-1 (PR0+PR1+PR2) + zonab-1 (ZB1+ZB2+ZB3+ZB4) + producto-2 (PD1+PD2+PD3+PD4-bis) + prelaunch-1 (PL1+PL2) + Auditoría #2 + Sweep #1 = SIRVIENDO EN PRODUCCIÓN**.
