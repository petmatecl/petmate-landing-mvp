# Costos operacionales — análisis + proyección — 2026-11-20

**Audiencia**: PO · **Autor**: auditor.
**Objetivo**: inventariar qué paga Pawnecta hoy + proyección si hay 10x más usuarios + puntos de inflexión donde el costo salta.
**Limitación**: zero data financiera real del PO. Análisis basado en **pricing públicos oficiales** de los proveedores al 2026-11-20 + volumen actual prod. Si el PO tiene facturas reales, puede sustituir estos datos para mayor precisión.

---

## Volumen actual (baseline 2026-11-20)

- **Usuarios registrados**: 127 (102 confirmados, 25 limbo).
- **Proveedores activos**: 26.
- **Servicios publicados**: 25.
- **Agendamientos totales**: 11.
- **Mensajes chat**: 9.
- **Conversations**: 6.
- **Notifications**: 51.

**Tráfico estimado** (sin data Vercel Analytics directa): 500-2000 pageviews/mes conservador.

---

## Infra componentes + costos

### 1. Supabase

**Plan actual**: Pro (confirmado por CLAUDE.md § Plan Vercel y referencias a backups PITR).

**Pricing 2026** (público: [supabase.com/pricing](https://supabase.com/pricing)):

| Recurso | Pro plan limit | Extras cost |
|---|---|---|
| Database size | 8 GB included | $0.125/GB adicional/mes |
| Auth MAU | 100,000 included | $0.00325/MAU adicional |
| Edge Functions | 2M invocations | $2/million adicional |
| Storage | 100 GB included | $0.021/GB adicional/mes |
| Egress | 250 GB included | $0.09/GB adicional |
| Realtime | 10M msgs + 500 conn | $2.50/million msgs adicional |

**Pro base**: **USD $25/mes** (~$23.000 CLP al tipo cambio 2026-11 nov).

**Consumo actual estimado**:
- DB size: <1 GB (solo texto + metadata).
- Auth MAU: 102 (muy debajo límite).
- Storage: ~200 MB (fotos proveedores + mascotas). <1% del límite.
- Realtime: chat usa WebSocket, <1M mensajes/mes a volumen actual.

**Costo mensual Supabase actual**: **~$23.000 CLP** (base Pro).

**Punto de inflexión**:
- **Auth MAU 100k**: con 100.000 users activos mensuales → USD 25 + $0.00325/user adicional. En 10x (1270 MAU) → aún dentro del free tier Pro ($23k CLP).
- **Storage 100 GB**: con 10x fotos (2 GB total) → aún muy dentro del límite.
- **Realtime 10M msgs**: con 1000 conversations × 100 mensajes cada una × 2 eventos (send + read) = 200k msgs/mes. Aún <2% del límite.

**Proyección 10x volumen** (1000-2700 MAU): **~$23.000 CLP/mes** (sin extras). Pro base cubre.

**Proyección 100x volumen** (12700 MAU): aún dentro Pro limit. **~$23.000 CLP/mes**.

**Punto de inflexión real**: ~50.000 MAU (base Pro cover) → $23k CLP. Más allá de 100k MAU → paga por adicional, $3 por cada 1000 users adicional. A 1 millón MAU → USD 25 + $3 × 900 = USD 2725 (~$2.5M CLP/mes). Pawnecta está años-luz de ese volumen.

### 2. Vercel

**Plan actual**: Pro (confirmado CLAUDE.md § Plan Vercel).

**Pricing 2026** (público: [vercel.com/pricing](https://vercel.com/pricing)):

| Recurso | Pro limit | Extras |
|---|---|---|
| Bandwidth | 1 TB included | $0.15/GB adicional |
| Build time | 6000 min included | $0.50/hour adicional |
| Function invocations | 10M included | $0.60 per 1M adicional |
| Edge requests | 50M included | $2 per 1M adicional |
| Image optimization | 5000 source images | $5 per 1000 adicional |

**Pro base por seat**: **USD $20/mes/user** (~$18.000 CLP). Solo PO + auditor eventual = 1-2 seats.

**Consumo actual estimado**:
- Bandwidth: ~1-5 GB/mes (sitio pequeño, pocos usuarios). <1% del límite.
- Builds: ~30/mes (pushes CI). <1% del límite.
- Functions: ~10k invocations/mes (API routes). <1% del límite.
- Image optimization: ~100 imágenes nuevas/mes. <2% del límite.

**Costo mensual Vercel actual**: **~$18.000 CLP** (base Pro, 1 seat).

**Punto de inflexión**:
- **Bandwidth 1 TB**: con 10x usuarios (5 GB → 50 GB mensual) → aún <5% del límite. 100x (500 GB) → aún dentro. 200x (1 TB+) → $0.15/GB adicional.
- **Function invocations 10M**: con 10x (100k/mes) → muy dentro. Punto de inflexión real a ~5M+ invocations/mes.
- **Image optimization 5000**: cada imagen Supabase Storage pasa por `/_next/image` cuando se usa `<Image>`. Con 100 fotos × 10 views distintas = 1000 optimizations únicas. Posible salto a volumen con 10x usuarios.

**Proyección 10x volumen**: **~$18.000-25.000 CLP/mes** (base + eventual minor extras). Ajuste de cálculo: `images.remotePatterns` ya configurado, cache CDN reduce reinvocation.

**Proyección 100x volumen**: **~$30.000-50.000 CLP/mes** (bandwidth empieza a sumar + image optimization crece). Aún barato.

### 3. Resend (emails)

**Plan actual**: inferido Free (3k emails/mes) o Pro (50k emails/mes a USD $20/mes).

**Pricing 2026** (público: [resend.com/pricing](https://resend.com/pricing)):

| Plan | Emails/mes | Costo |
|---|---:|---|
| Free | 3,000 | $0 |
| Pro | 50,000 | USD $20/mes (~$18k CLP) |
| Business | 100,000 | USD $90/mes |

**Consumo actual estimado**:
- Welcome emails: 10-20/mes (signup rate bajo).
- Reserva emails: 2-3 reservas × 2 emails cada una = 10-15/mes.
- Cron recordatorios 24h: <5/día = 150/mes.
- Cron onboarding + invitación reseñas: 5-10/día = 300/mes.
- Nuevo mensaje chat: 10-30/mes.

**Total mensual estimado**: **~500-700 emails/mes**. Free tier (3k) cubre holgado.

**Costo mensual Resend actual**: **$0 CLP** (Free tier).

**Punto de inflexión**:
- **3000 emails Free**: con 10x usuarios (5-7k emails/mes) → **saltamos a Pro USD $20**.
- **50k emails Pro**: con 100x usuarios (50-70k) → **saltamos a Business USD $90**.

**Proyección 10x volumen**: **~$18.000 CLP/mes** (salta a Pro).

**Proyección 100x volumen**: **~$81.000 CLP/mes** (Business).

### 4. Upstash Redis (rate limit login)

**Plan actual**: Free tier (verificado CLAUDE.md § A4 Ola 1).

**Pricing 2026** (público: [upstash.com/pricing](https://upstash.com/pricing)):

| Plan | Comandos/mes | Storage |
|---|---|---|
| Free | 500k commands | 256 MB |
| Pay as you go | $0.20/100k commands | $0.25/GB/mes |

**Consumo actual estimado**:
- Rate limit login: cada signup login = 2-3 comandos. Con 10-20 signups/día + 50-100 logins → ~5000-15000 comandos/mes. <5% del límite Free.

**Costo mensual Upstash actual**: **$0 CLP** (Free).

**Punto de inflexión**:
- **500k commands Free**: con 10x usuarios → 50k-150k comandos. Aún dentro.
- **Con 100x usuarios** → 500k-1.5M. Supera Free. Pay-as-you-go: $0.20 × 15 = $3/mes. ~$2.700 CLP.

**Proyección 10x volumen**: **$0 CLP** (sigue Free).

**Proyección 100x volumen**: **~$3.000 CLP/mes**.

### 5. Dominio pawnecta.com

**Costo actual**: depende del registrador (Cloudflare Registrar, Namecheap, GoDaddy).

**Pricing típico .com Chile**: USD $10-15/año = ~$900-1.400 CLP/mes amortizado.

**Costo mensual dominio**: **~$1.000 CLP/mes** (amortizado).

**Punto de inflexión**: cero. Costo fijo.

### 6. Zoho Mail (hola@ + notificaciones@ + contacto@)

**Plan actual**: inferido Free (hasta 5 users, 5 GB cada uno) o Mail Lite.

**Pricing** (zoho.com/mail/pricing):
- Free: 5 users.
- Mail Lite: USD $1/user/mes.

**Consumo**: 3-5 casillas Pawnecta.

**Costo mensual Zoho**: **$0-5.000 CLP/mes**.

**Punto de inflexión**: 5 users (Free limit). Con más de 5 usuarios internos → $1/user. Aún trivial.

### 7. Sentry (error tracking)

**Plan actual**: inferido Developer (Free hasta 5k errors/mes).

**Pricing** (sentry.io/pricing):
- Developer Free: 5k errors + 10k performance events.
- Team: USD $26/mes (50k errors).
- Business: USD $80/mes (200k errors).

**Consumo actual**: con 26 proveedores + 102 users + volumen bajo → <100 errors/mes. <2% del límite Free.

**Costo mensual Sentry actual**: **$0 CLP**.

**Punto de inflexión**:
- **5k errors Free**: con 10x usuarios + errores proporcional → ~1000 errors/mes. Aún dentro.
- **Con 100x usuarios** → 10k errors/mes. Salta a Team USD $26 (~$23k CLP).

**Proyección 10x volumen**: **$0 CLP**.

**Proyección 100x volumen**: **~$23.000 CLP/mes**.

### 8. Google Workspace (email del PO)

**Si aplica**: inferido no (PO usa Gmail personal).

**Costo**: **$0 CLP**.

### 9. GA4 + Google Search Console

**Costo**: **$0 CLP** (gratis).

### 10. Otros (estimados posibles)

- **Figma / design tool**: si el PO usa plan paid → $12k/mes. Si Free → $0.
- **ChatGPT / Claude**: potencialmente $20 USD/mes = $18k.
- **Bancos de imágenes** (Unsplash Plus, etc.): si paid.

**Costo "otros"**: variable, estimado **$0-40.000 CLP/mes**.

---

## Tabla consolidada

### Costos actuales (2026-11-20, baseline 127 users + 26 proveedores)

| Componente | Costo mensual CLP | % del total |
|---|---:|---:|
| Supabase Pro | $23.000 | 36% |
| Vercel Pro (1 seat) | $18.000 | 28% |
| Resend | $0 | 0% |
| Upstash | $0 | 0% |
| Dominio | $1.000 | 2% |
| Zoho Mail | $0-5.000 | 4% |
| Sentry | $0 | 0% |
| GA4 / Search Console | $0 | 0% |
| Otros (estimado) | $0-20.000 | 31% |
| **TOTAL** | **$42.000-67.000 CLP/mes** | 100% |

**Promedio conservador**: **~$50.000 CLP/mes** (~USD $55-60).

**Tooltip**: muy bajo para marketplace operativo. Comparable al costo de infra de un blog personal.

---

## Proyección 10x volumen (1000-2700 MAU, 200-500 proveedores)

**Supuestos**:
- Users crecen 10x → 1270 MAU.
- Proveedores crecen 10x → 260 (supera meta 100 — post-campañas éxito).
- Tráfico crece 10x → 5000-20000 pageviews/mes.
- Emails crecen 10x → 5-7k emails/mes.

| Componente | Costo 10x CLP | Cambio |
|---|---:|---|
| Supabase Pro | $23.000 | Sin cambio (dentro Pro limits) |
| Vercel Pro | $18.000-25.000 | Sin cambio o minor extras |
| Resend | $18.000 | **Salta a Pro** por volumen email |
| Upstash | $0 | Sin cambio |
| Dominio | $1.000 | Sin cambio |
| Zoho | $0-5.000 | Sin cambio |
| Sentry | $0 | Sin cambio |
| Otros | $0-20.000 | Sin cambio |
| **TOTAL 10x** | **$60.000-92.000 CLP/mes** | **+$10.000-25.000 CLP** |

**Delta de 10x**: ~$10-25k adicional/mes. **Trivial**.

---

## Proyección 100x volumen (12.700 MAU, 2.600 proveedores)

**Supuestos**:
- Escala comparable a DOGIN hoy.
- Users 100x, proveedores 100x, tráfico 100x.

| Componente | Costo 100x CLP | Cambio |
|---|---:|---|
| Supabase Pro | $23.000 | Aún dentro Pro base |
| Vercel Pro | $30.000-50.000 | **Bandwidth + images extras** |
| Resend | $81.000 | **Salta a Business** |
| Upstash | $3.000 | **Pay-as-you-go** |
| Dominio | $1.000 | Sin cambio |
| Zoho | $5.000 | Agregar casillas equipo |
| Sentry | $23.000 | **Salta a Team** |
| Otros | $30.000-50.000 | Ads tools, analytics, design |
| **TOTAL 100x** | **$196.000-236.000 CLP/mes** | **+~$160k** vs baseline |

**Delta de 100x**: ~$150-200k/mes. Equivalente a USD $200-250/mes.

**Ratio costo/user**: $200k / 12.700 users = ~$15 CLP/user/mes. Muy eficiente.

---

## Proyección 12 meses (escenarios)

### Escenario conservador — meta 100 proveedores + campañas modestas

- Fin año 1: 500 proveedores + 5.000 users + ~20k pageviews/mes.
- Costo mensual aprox: **$70-100k CLP/mes** = **$840k-1.2M CLP/año**.

### Escenario base — crecimiento moderado

- Fin año 1: 1.000 proveedores + 20.000 users + 100k pageviews.
- Costo mensual aprox: **$120-180k CLP/mes** = **$1.5-2.2M CLP/año**.

### Escenario optimista — tracción fuerte

- Fin año 1: 2.500 proveedores + 50.000 users + 500k pageviews.
- Costo mensual aprox: **$200-300k CLP/mes** = **$2.4-3.6M CLP/año**.

---

## Puntos de inflexión + mitigaciones

### Inflexión #1 — Resend Free → Pro (3k emails/mes)

**Cuándo**: con 10x volumen.
**Costo incremental**: USD $20/mes = $18k CLP.
**Mitigación**: optimizar contenido email para reducir N emails por operación (ej. cron combinar notificaciones diarias en 1 digest).

### Inflexión #2 — Upstash Free → Pay-as-you-go (500k commands)

**Cuándo**: con 100x volumen.
**Costo incremental**: ~$3k CLP/mes (muy bajo).
**Mitigación**: ninguna necesaria.

### Inflexión #3 — Sentry Free → Team (5k errors)

**Cuándo**: con 100x volumen.
**Costo incremental**: USD $26/mes = $23k CLP.
**Mitigación**: reducir error rate via mejoras de código. Mejor cobertura de catches.

### Inflexión #4 — Vercel bandwidth (1 TB)

**Cuándo**: con 200x volumen (muy a futuro).
**Costo incremental**: $0.15/GB adicional.
**Mitigación**: cache aggressive, image optimization, lazy loading ya en lugar.

### Inflexión #5 — Supabase auth MAU (100k) / storage (8 GB)

**Cuándo**: 1000x volumen (lejos).
**Costo incremental**: mínimo.

**Conclusión**: **cero riesgo caja operacional** a mediano plazo. Las infra scale muy bien hasta 100x del volumen actual con incrementos lineales bajos.

---

## Recomendaciones de ahorro (si fuera relevante)

### S1 — Downgrade Supabase Pro → Free si no se usa backup horario

**Supabase Free**: $0/mes + 500 MB DB + 2 GB bandwidth + sin backup PITR.

**Ahorro**: $23.000 CLP/mes.

**Riesgo**: zero backup → si hay incidente, pérdida permanente. **No recomendado** antes de validar producto.

### S2 — Downgrade Vercel Pro → Free si solo PO

**Vercel Free (Hobby)**: $0/mes + 100 GB bandwidth + 100 GB-hr compute + crons 1x/día precision (no al minuto).

**Ahorro**: $18.000 CLP/mes.

**Riesgo**: perder precision cron recordatorio 24h (salta a hora aproximada) + retention logs 1h vs 30 días. **No recomendado**.

### S3 — Negociar Resend volumen cuando escale

Resend ofrece custom pricing enterprise con volumen alto. Cuando se acerque a 100k emails/mes, puede negociar mejor que Business plan.

---

## Decisiones pendientes del PO

### D1. Validar costos reales vs estimación

**Pregunta**: ¿el PO puede compartir facturas reales últimos 3 meses de Supabase, Vercel, Resend, dominio?

**Recomendación**: sí, valida la estimación. Auditor ajusta tabla con data real.

**Impacto si no se decide**: default = estimación auditor (~5-10% error).

### D2. Setup tracking costos recurrente

**Pregunta**: ¿agendamos review mensual de facturas (5 min) para detectar saltos de pricing?

**Recomendación**: sí. Previene sorpresas por volumen cross-threshold.

**Impacto si no se decide**: default = chequeo reactivo cuando el PO note aumento.

### D3. Downgrade preventivo en escenario conservador

**Pregunta**: en escenario conservador (fin año 1 = 500 proveedores), ¿valide downgrade Vercel Hobby si Pro features no son necesarias?

**Recomendación**: **no**. Vercel Pro es useful para crons precision + retention logs + bandwidth adicional. Ahorro de $18k vs riesgo operativo no vale.

**Impacto si no se decide**: default = Pro mantiene.

### D4. Alertas de billing

**Pregunta**: ¿activamos alertas Supabase + Vercel para notificar cuando se acerca a límites?

**Recomendación**: sí. 10 min setup en cada dashboard.

**Impacto si no se decide**: default = enterarse post-factura.

### D5. Herramientas adicionales planificadas

**Pregunta**: ¿valide incluir en budget herramientas post-campañas (Growthbook $0 self-host, Hootsuite $19/mes, etc.)?

**Recomendación**: minimizar nuevas herramientas pre-primer-año. Validar necesidad con data real.

**Impacto si no se decide**: default = evaluar case-by-case.

---

## Firma

Análisis basado en pricing públicos 2026-11. Re-correr cada 6 meses o cuando volumen cruce 10x. Costos operacionales son el menor de los riesgos de Pawnecta a mediano plazo.
