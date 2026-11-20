# Checklist de calidad — pre-campañas (meta 100 proveedores)

**Contexto**: documento previamente conocido como `lanzamiento-20261125.md`. Reset del 2026-11-20 PM: NO hay lanzamiento oficial 25-11. El sitio ya opera, los proveedores se registran orgánicamente. La nueva meta es **100 proveedores activos** antes de activar campañas pagadas para tutores.

**Audiencia**: PO + auditor · **Alcance**: estándar de calidad del producto como referencia general sin deadline. Cuando el PO decida activar campañas, este checklist debe estar razonablemente cerrado antes.

**Reglas vigentes**: CLAUDE.md § P2 (evidencia por fase pegada en el mismo archivo), P5 (checklist committeado al repo), P11 (cero merge con rojo sin GO + override documentado).

---

## Estándar de calidad para activar campañas

Cuando se decida arrancar campañas pagadas para atraer tutores, estos ítems deben estar en verde. No hay deadline fijo — se cierran a ritmo del equipo.

### 1. Código mergeado a prod + verificado empíricamente

- [ ] PR #120 PII-CHAT-NOMBRE mergeado + smoke tutor /mensajes muestra `"Nombre I."` (no apellido completo).
- [ ] PR #121 docs-only mergeado.
- [ ] PR CHAT-LAZY-CREATE mergeado + smoke: click "Contactar" sin enviar → conv NO aparece en `/mensajes` tras recarga.
- [ ] PR #125 fix-explorar-ux mergeado + smoke `/explorar` no muestra error + 0-resultados simultáneos.
- [ ] BLOG-IMG-REMOVAL + CLAUDE.md regla + entradas publicadas con placeholder o ilustración vectorial.
- [ ] SQL PII-VIEW-TIGHT prod ejecutado (según `docs/planes/pii-view-tight-sabado.md`) + verificación empírica: `curl` a `/rest/v1/proveedores_publicos?select=*` desde anon NO contiene `nombre`/`apellido_p`/`apellido_m` en response JSON.
- [ ] Backfill `conversations.proveedor_auth_id` ejecutado + 0 NULL restantes.
- [ ] WWW-CANONICAL ejecutado (ver `docs/planes/www-canonical-domingo.md`): decidir redirect `pawnecta.com` → `www.pawnecta.com` o viceversa.

### 2. Suites de tests (CI prod main verde)

- [ ] `typecheck-and-build` ✓ sobre SHA prod actual.
- [ ] `Playwright suite error-audit` ✓ sobre SHA prod actual.
- [ ] `Playwright suite F2` ✓ sobre SHA prod actual.

### 3. Datos staging limpios

- [ ] Cero servicios efímeros huérfanos de fixtures e2e (query: `SELECT COUNT(*) FROM servicios_publicados WHERE titulo LIKE 'e2e-%' OR titulo LIKE 'Cuidado de mascota (test F2-3)%' OR titulo LIKE 'SMOKE%'`).
- [ ] Cero reservas huérfanas de la cuenta tutor E2E Camila (threshold ≤50).

### 4. Configuración Vercel + Supabase

- [ ] `EMAIL_FROM='Pawnecta <hola@send.pawnecta.com>'` set en Vercel env vars scope Production.
- [ ] `CRON_SECRET` rotado o validado para prod.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `NEXT_PUBLIC_SUPABASE_URL` correctos en Vercel Production.
- [ ] Supabase Pro plan activo.

### 5. Observabilidad activa

- [ ] Sentry configurado en 3 runtimes (client, server, edge) + gate `VERCEL_ENV === 'production'` + Sentry.setUser(id) activo. Smoke: error sintético desde `/api/admin/sentry-smoke` → aparece en Sentry Issues en <2 min.
- [ ] Vercel runtime logs retenidos (Pro plan ~30 días).
- [ ] GA4 recibe events `ficha_vista`, `reserva_confirmada`, `contacto_iniciado` (validar via GA4 Realtime → Events).

### 6. DNS + SSL + redirects

- [ ] `www.pawnecta.com` responde HTTP 200.
- [ ] `pawnecta.com` responde HTTP 200 o 301→www (decidir con sprint WWW-CANONICAL).
- [ ] SSL cert válido.
- [ ] Sitemap accesible: `https://www.pawnecta.com/sitemap.xml` → XML válido.

### 7. Smokes manuales golden path (PO ejecuta en prod)

- [ ] **Tutor registro + login + explorar + reservar**.
- [ ] **Proveedor login + crear servicio + aprobar reserva**.
- [ ] **Chat funciona**.
- [ ] **Cancelación bilateral** (proveedor + tutor).
- [ ] **Admin aprueba proveedor**.
- [ ] Cleanup smoke manual al cerrar.

### 8. Documentación operativa lista

- [ ] `BACKLOG.md` sección "PEDIDOS DIRECTOS DEL PO" al día.
- [ ] `CLAUDE.md` con reglas recientes aterrizadas (ampliación P11, service_role, meta-regla, imágenes blog).
- [ ] Este doc con todos los `[x]` marcados + SHA prod al momento + evidencia pegada.
- [ ] Acta del sprint PII-VIEW-TIGHT cerrada.

### 9. Preparación comunicación (para activar al momento de campañas)

- [ ] Post anuncio redes sociales redactado (ver `docs/planes/comunicacion-25-11.md` reinterpretado como "comunicación al activar campañas").
- [ ] Email a lista de users redactado.
- [ ] PO disponible ventana de activación con la cadencia habitual.

### 10. Rollback preparado

- [ ] SHA del commit "estable" anotado cada vez que se abra una ventana de alto riesgo. Vercel Instant Rollback a ese SHA si algo sale mal.
- [ ] Bloque SQL de rollback PII-VIEW-TIGHT guardado.
- [ ] Plan N1/N2/N3 revisado en `docs/planes/rollback-25-11.md` (reinterpretar sin fechas).

---

## Protocolo de activación de campañas (cuando se alcancen los ~100 proveedores)

**Pre-chequeo** (día anterior):

- Checklist §1-10 arriba en verde (o con deuda documentada como "override explícito PO").
- Baseline Q1-Q5 Supabase ejecutado para comparar deltas (ver `docs/planes/monitoreo-24h-post-launch.md` reinterpretado como monitoreo-campañas).
- Equipo disponible en la ventana primeras 24h.

**Activación**:

- Publicar post IG anuncio + enviar primer correo masivo (ver `docs/planes/comunicacion-25-11.md`).
- Setup A/B E1 + E3 + E4 (ver `docs/planes/experimentos-postlaunch.md`).
- Monitoreo intensivo primeras 24h (ver `docs/planes/monitoreo-24h-post-launch.md`).
- Reportes parciales cada 4h primeras 12h, cada 6h segundas 12h.

**Post-activación**:

- Reporte T+24h con números acumulados (registros, reservas, contactos, mensajes, errores).
- Decisión GO / NO-GO para seguir inversión en campañas: si volumen alcanzable, continuar; si no, pausa + diagnóstico.

---

## GO / NO-GO campañas — criterios

**GO si**:
- Todos los `[x]` de §1-10 están ejecutados + evidenciados (o con override explícito PO documentado).
- Suite CI verde sobre SHA prod actual.
- Cero `JAVASCRIPT-NEXTJS-*` critical open en Sentry.
- Smoke tutor + smoke proveedor + smoke admin funcionan en prod sin regresiones.
- PO disponible.

**NO-GO (posponer activación campañas 1-2 semanas)** si:
- Algún check de §1-6 falla y no se puede fix en ventana limitada.
- Sentry muestra incidente activo con `userCount > 3`.
- SQL PII-VIEW-TIGHT no cerró + hay PII leak vigente.
- Supabase Database Health reporta anomalías no diagnosticadas.

**Procedimiento si NO-GO**:
1. Documentar motivo en acta de la activación (nueva).
2. Ejecutar fixes en orden de criticidad.
3. Re-correr checklist cuando los bloqueantes estén resueltos.

---

## Plan de reversión (si incidente post-activación campañas)

Reinterpretar directamente `docs/planes/rollback-25-11.md`. Niveles N1 (código), N2 (código + SQL), N3 (PITR Supabase) aplican igual.

---

## Monitoreo primeras 24h de campaña

Reinterpretar `docs/planes/monitoreo-24h-post-launch.md`. 14 herramientas + 9 queries SQL + cronograma T+0→T+24 aplicable a cualquier ventana de activación de campaña, no solo lanzamiento del 25-11.

---

## SHAs clave (completar al activar campañas)

- **SHA estable pre-activación**: ____
- **SHA del día de activación**: ____ (= estable salvo cambio)
- **SHA de rollback de emergencia si aplica**: ____

---

## Firma

Este doc es checklist de calidad vigente mientras no se activen campañas. Se cierra cuando el PO declare "100 proveedores alcanzados, activando campañas" y los ítems §1-10 estén en verde.
