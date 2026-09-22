# Change email address

**Dashboard**: `Authentication → Emails → Change Email Address`.

**Estado hoy en prod**: inactiva (cero callers de `updateUser({ email })`).
Se redacta preventivamente por si el proyecto agrega UI de cambio de
correo en el futuro.

## Cómo funciona el flujo de cambio de correo

Supabase envía **dos correos**:

1. Al correo **actual** (viejo), pidiendo confirmar el cambio.
2. Al correo **nuevo**, pidiendo confirmar que le pertenece.

**Ambos** usan la misma plantilla del Dashboard. Los distingue por
contexto: la plantilla debe leer bien tanto para el destinatario del
correo viejo como del nuevo.

## Variables Supabase usadas

- `{{ .ConfirmationURL }}` — link con token para confirmar el cambio (uno distinto por cada correo).
- `{{ .Email }}` — correo actual (destinatario o referencia).
- `{{ .NewEmail }}` — correo nuevo (referencia o destinatario).

Otras disponibles (no usadas): `{{ .Token }}`, `{{ .TokenHash }}`,
`{{ .SiteURL }}`.

## Asunto

```
Confirma el cambio de correo en Pawnecta
```

## HTML (pegar en Dashboard, campo Message body)

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #047857; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
        Confirma el cambio de correo
    </h1>
    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
        Pediste cambiar el correo de tu cuenta en Pawnecta de <strong>{{ .Email }}</strong> a <strong>{{ .NewEmail }}</strong>. Para completar el cambio, confirma desde este correo.
    </p>
    <div style="text-align: center; margin: 24px 0;">
        <a
            href="{{ .ConfirmationURL }}"
            style="display: inline-block; background-color: #047857; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;"
        >
            Confirmar cambio de correo
        </a>
    </div>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #047857; word-break: break-all; margin-bottom: 24px;">
        {{ .ConfirmationURL }}
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Necesitas confirmar desde ambos correos (el actual y el nuevo) para que el cambio se aplique. Este enlace es válido por 1 hora.
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
        Si no pediste este cambio, ignora este correo. Tu cuenta seguirá con el correo actual.
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
