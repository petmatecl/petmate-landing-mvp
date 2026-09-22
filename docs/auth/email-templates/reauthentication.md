# Reauthentication

**Dashboard**: `Authentication → Emails → Reauthentication`.

**Estado hoy en prod**: inactiva (cero callers de
`supabase.auth.reauthenticate()`). Se redacta preventivamente para
operaciones sensibles futuras (cambio de contraseña sin conocer la
actual, borrado de cuenta, etc.).

## Diferencia clave con las otras plantillas

Reauthentication **NO envía un link**, envía un **código OTP** de 6
dígitos que el usuario pega en la app para probar que sigue siendo él.
No hay `{{ .ConfirmationURL }}` porque no hay redirect.

## Variables Supabase usadas

- `{{ .Token }}` — código OTP de 6 dígitos.

Otras disponibles (no usadas): `{{ .SiteURL }}`, `{{ .Email }}`.

## Asunto

```
Tu código de verificación de Pawnecta
```

## HTML (pegar en Dashboard, campo Message body)

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #047857; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
        Tu código de verificación
    </h1>
    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
        Para completar una acción en tu cuenta de Pawnecta, ingresa este código en la pantalla que te lo pide:
    </p>
    <div style="text-align: center; margin: 24px 0;">
        <div
            style="display: inline-block; background-color: #f1f5f9; color: #047857; padding: 20px 32px; border-radius: 12px; font-family: 'Menlo', 'Monaco', monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px;"
        >
            {{ .Token }}
        </div>
    </div>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Este código es válido por 10 minutos y se puede usar una sola vez.
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
        Si no pediste este código, ignora este correo y considera cambiar tu contraseña por precaución.
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
