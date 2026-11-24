# Gastos periódicos Pawnecta

Última actualización: 2026-11-24. Tipo de cambio referencial: ~930 CLP/USD. Reconfirmar al revisar.

## Tabla de servicios activos

| Servicio | Plan | USD/mes | CLP/mes aprox | Facturación | Trigger upgrade | Notas |
|---|---|---|---|---|---|---|
| Resend | Pro | $20 | ~18.500 | mensual | 80% del cap 50k emails | Contratado 2026-11-24 (free al 100% por mix staging/prod). Sprint RESEND-STAGING-SPLIT en BACKLOG para separar cuotas |
| Vercel | Pro | $20 | ~18.500 | mensual | según uso bandwidth / builds | Activo (fecha a confirmar por PO) |
| Meta Verified Instagram | Individual | monto a confirmar PO (~$12-15 estimado) | ~11.000-14.000 | mensual | — | Suscripción activa, PO completa monto exacto |
| CapCut | plan a confirmar | monto a confirmar | — | — | — | PO completa |
| RunwayML | plan a confirmar | monto a confirmar | — | — | — | PO completa |
| Claude | plan a confirmar (Pro/Max) | monto a confirmar | — | — | — | Potencia el trabajo con el auditor + coordinator |
| Dominio pawnecta.com | — | ~$1 (~$10/año) | ~770 | anual | — | Registrador externo a Zoho (Namecheap/Cloudflare/etc., PO completa) |
| Dominios adicionales | — | monto a confirmar | — | — | — | PO lista dominios + costo c/u si tiene más |
| Zoho Mail | Free | $0 | $0 | — | 5 usuarios o 5GB/usuario | Setup 2026-11-24, contacto@pawnecta.com creado, MX ✓, uso en RRSS bios + sitio footer |
| Supabase | Free | $0 | $0 | — | 500MB BD o 2GB egress | Upgrade a Pro ~$25/mes cuando escalen signups |
| Sentry | Free (ciego) | $0 | $0 | — | n/a | Ya al 100% quota 5k events/mes al 2026-11-24. PO decidió standby indefinido hasta incidente que justifique upgrade a Team $29/mes. Mitigación: monitoreo manual Vercel Logs |

## Total estimado activo (con datos conocidos)

Resend Pro + Vercel Pro + dominio pawnecta.com = $40/mes + ~$1/mes = **$41 USD/mes (~38.000 CLP/mes)**

Pendientes de completar monto: Meta Verified + CapCut + RunwayML + Claude + dominios adicionales. Estimado total con todos podría estar en rango $80-150 USD/mes (~75.000-140.000 CLP/mes) hasta confirmar.

## Triggers de revisión

- Revisar esta tabla cada 3 meses O al dispararse un trigger de upgrade
- Actualizar inmediatamente al contratar nuevo servicio recurrente
- Documentar decisión de upgrade/downgrade con fecha + motivo en la línea correspondiente

## Deudas relacionadas en BACKLOG

- RESEND-STAGING-SPLIT (MEDIA, post-launch): separar cuota staging de prod para evitar gastar quota prod en tests
- Trigger upgrade Sentry Team ($29/mes) → gatillar solo si incidente real post-launch justifica salir del ciego
