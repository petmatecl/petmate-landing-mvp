# Gastos periódicos Pawnecta

Última actualización: 2026-11-25. Tipo de cambio referencial: ~930 CLP/USD. Reconfirmar al revisar.

**Convención de precios**: todos los valores USD declarados en esta tabla son **NETOS** (sin IVA). Chile aplica **IVA 19%** sobre servicios digitales extranjeros (pagados con factura internacional en USD). Las columnas separan "USD/mes neto" vs "USD/mes con IVA (19%)" + "CLP/mes aprox" (= USD con IVA × tipo cambio). Si algún servicio ya incluye IVA en la tarifa internacional, el PO lo marca explícitamente en "Notas".

## Tabla de servicios activos

| Servicio | Plan | USD/mes neto | USD/mes con IVA (19%) | CLP/mes aprox | Facturación | Trigger upgrade | Notas |
|---|---|---|---|---|---|---|---|
| Resend | Pro | $20 | $23.80* | ~22.100* | mensual | 80% del cap 50k emails | Contratado 2026-11-24 (free al 100% por mix staging/prod). Sprint RESEND-STAGING-SPLIT en BACKLOG para separar cuotas. *IVA pendiente confirmación — PO revisa factura real |
| Vercel | Pro | $20 | $23.80* | ~22.100* | mensual | según uso bandwidth / builds | Activo (fecha a confirmar por PO). *IVA pendiente confirmación — PO revisa factura real |
| ElevenLabs | Starter | $6 | $7.14 | ~6.640 | mensual | según uso minutos voice | Contratado 2026-11-25 con promo primer mes $1 neto ($1.19 con IVA ~1.100 CLP). A partir del 2do mes (2026-12-25+), tarifa normal $7.14/mes con IVA. Uso: voice generation para contenido RRSS (narraciones video Instagram/TikTok) |
| Meta Verified Instagram | Individual | monto a confirmar PO (~$12-15 estimado neto) | ~$14.28-17.85 | ~13.300-16.600 | mensual | — | Suscripción activa, PO completa monto exacto |
| CapCut | plan a confirmar | monto a confirmar | — | — | — | — | PO completa |
| RunwayML | plan a confirmar | monto a confirmar | — | — | — | — | PO completa |
| Claude | plan a confirmar (Pro/Max) | monto a confirmar | — | — | — | — | Potencia el trabajo con el auditor + coordinator |
| Dominio pawnecta.com | — | ~$1 (~$10/año neto) | ~$1.19 | ~1.100 | anual | — | Registrador externo a Zoho (Namecheap/Cloudflare/etc., PO completa) |
| Dominios adicionales | — | monto a confirmar | — | — | — | — | PO lista dominios + costo c/u si tiene más |
| Zoho Mail | Free | $0 | $0 | $0 | — | 5 usuarios o 5GB/usuario | Setup 2026-11-24, contacto@pawnecta.com creado, MX ✓, uso en RRSS bios + sitio footer |
| Supabase | Free | $0 | $0 | $0 | — | 500MB BD o 2GB egress | Upgrade a Pro ~$25/mes neto cuando escalen signups |
| Sentry | Free (ciego) | $0 | $0 | $0 | — | n/a | Ya al 100% quota 5k events/mes al 2026-11-24. PO decidió standby indefinido hasta incidente que justifique upgrade a Team $29/mes neto. Mitigación: monitoreo manual Vercel Logs |

*Marcadores con asterisco: IVA calculado como estimación con el supuesto "USD declarado es neto". Pendiente confirmación del PO con factura real — algunos proveedores internacionales ya cobran IVA incluido en la tarifa de la página; otros lo agregan en el checkout.

## Total estimado activo (con datos conocidos)

Base confirmada neta (Resend + Vercel + ElevenLabs promo mes 1 + dominio):
- $20 + $20 + $1 + $1 = **$42 USD/mes neto**
- Con IVA 19% aplicado: **$49.98 USD/mes** (~46.500 CLP/mes)
- A partir del 2do mes de ElevenLabs (2026-12-25): $20 + $20 + $6 + $1 = **$47 USD/mes neto** → con IVA **$55.93 USD/mes** (~52.000 CLP/mes)

Pendientes de completar monto: Meta Verified + CapCut + RunwayML + Claude + dominios adicionales. Estimado total con todos podría estar en rango **$95-180 USD/mes con IVA** (~88.000-168.000 CLP/mes) hasta confirmar.

## Triggers de revisión

- Revisar esta tabla cada 3 meses O al dispararse un trigger de upgrade
- Actualizar inmediatamente al contratar nuevo servicio recurrente
- Documentar decisión de upgrade/downgrade con fecha + motivo en la línea correspondiente

## Deudas relacionadas en BACKLOG

- RESEND-STAGING-SPLIT (MEDIA, post-launch): separar cuota staging de prod para evitar gastar quota prod en tests
- Trigger upgrade Sentry Team ($29/mes neto) → gatillar solo si incidente real post-launch justifica salir del ciego
- Confirmación IVA Resend + Vercel: PO revisa factura real del primer cargo post-contratación (2026-12-24 o similar) y marca "IVA incluido" o "IVA neto + 19%" en la tabla
