# Invite user

**Dashboard**: `Authentication → Emails → Invite user`.

**Estado hoy en prod**: inactiva (cero callers de
`admin.inviteUserByEmail`). Se redacta preventivamente para el caso de
invitaciones manuales desde el Dashboard de Supabase (Admin → Users →
Invite user) — flow que un admin de Pawnecta podría usar para pre-crear
cuentas.

## Variables Supabase usadas

- `{{ .ConfirmationURL }}` — link con token para aceptar la invitación y setear contraseña.

Otras disponibles (no usadas): `{{ .Token }}`, `{{ .TokenHash }}`,
`{{ .SiteURL }}`, `{{ .Email }}`, `{{ .Data.<clave> }}` (metadata que
se pase al invite).

## Asunto

```
Te invitamos a Pawnecta
```

## HTML (pegar en Dashboard, campo Message body)

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #047857; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
        Te invitamos a Pawnecta
    </h1>
    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
        El equipo de Pawnecta creó una cuenta para ti. Para activarla, elige una contraseña desde el botón.
    </p>
    <div style="text-align: center; margin: 24px 0;">
        <a
            href="{{ .ConfirmationURL }}"
            style="display: inline-block; background-color: #047857; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;"
        >
            Aceptar invitación
        </a>
    </div>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #047857; word-break: break-all; margin-bottom: 24px;">
        {{ .ConfirmationURL }}
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Este enlace es válido por 7 días.
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
        Si no esperabas esta invitación, ignora este correo. La cuenta quedará sin activar y no podrá usarse.
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
