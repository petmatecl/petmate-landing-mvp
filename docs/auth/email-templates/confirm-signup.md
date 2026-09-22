# Confirm signup

**Dashboard**: `Authentication → Emails → Confirm signup`.

**Estado hoy en prod**: inactiva (ver `00-inventario.md` — signup usa
Resend welcome con `confirmationUrl` embebido). Se redacta preventivamente
para cubrir cualquier flujo futuro que dispare `supabase.auth.signUp`
client-side o desde otro endpoint.

## Variables Supabase usadas

- `{{ .ConfirmationURL }}` — link con token para confirmar el correo.

Otras disponibles (no usadas por esta redacción): `{{ .Token }}`,
`{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`.

## Asunto

```
Confirma tu correo en Pawnecta
```

## HTML (pegar en Dashboard, campo Message body)

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #047857; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
        Confirma tu correo en Pawnecta
    </h1>
    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
        Recibimos tu registro en Pawnecta. Para activar tu cuenta y empezar a usar la plataforma, confirma que este correo es tuyo.
    </p>
    <div style="text-align: center; margin: 24px 0;">
        <a
            href="{{ .ConfirmationURL }}"
            style="display: inline-block; background-color: #047857; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;"
        >
            Confirmar mi correo
        </a>
    </div>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #047857; word-break: break-all; margin-bottom: 24px;">
        {{ .ConfirmationURL }}
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Este enlace es válido por 24 horas.
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
        Si no te registraste en Pawnecta, ignora este correo y no compartas el enlace con nadie.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 4px;">
        Saludos,<br/>El equipo de Pawnecta
    </p>
    <p style="font-size: 12px; line-height: 1.5; color: #94a3b8;">
        ¿Dudas? Escríbenos a <a href="mailto:hola@pawnecta.com" style="color: #047857; text-decoration: none;">hola@pawnecta.com</a>
    </p>
</div>
```

## Texto plano (Supabase Auth no expone campo separado hoy — dejar solo HTML)

Supabase Auth Emails no permite editar la versión texto plano — genera
una automática desde el HTML. El HTML anterior degrada correcto (links
visibles como texto). No hay acción adicional.
