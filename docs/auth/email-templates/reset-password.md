# Reset password

**Dashboard**: `Authentication → Emails → Reset password`.

**Estado hoy en prod**: **activa** — única plantilla Auth que se dispara
en el proyecto. Trigger productivo:
`pages/forgot-password.tsx:31` `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.

**Es la que originó el hallazgo AUTH-MAIL-PHISH** (banner rojo de Gmail
2026-09-21).

## Variables Supabase usadas

- `{{ .ConfirmationURL }}` — link con token para setear contraseña nueva. Aterriza en `${SITE_URL}/reset-password` (redirect declarado en el caller).

Otras disponibles (no usadas): `{{ .Token }}`, `{{ .TokenHash }}`,
`{{ .SiteURL }}`, `{{ .Email }}`.

## Asunto

```
Restablece tu contraseña de Pawnecta
```

## HTML (pegar en Dashboard, campo Message body)

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #047857; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
        Restablece tu contraseña
    </h1>
    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
        Alguien pidió restablecer la contraseña de tu cuenta en Pawnecta. Si fuiste tú, usa el botón para crear una nueva.
    </p>
    <div style="text-align: center; margin: 24px 0;">
        <a
            href="{{ .ConfirmationURL }}"
            style="display: inline-block; background-color: #047857; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;"
        >
            Restablecer contraseña
        </a>
    </div>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #047857; word-break: break-all; margin-bottom: 24px;">
        {{ .ConfirmationURL }}
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
        Este enlace es válido por 1 hora.
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
        Si no lo pediste, ignora este correo. Tu contraseña seguirá igual.
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

## Nota sobre la vigencia "1 hora"

El valor default de Supabase para `password_recovery` OTP es 3600 segundos
(1 hora). Si el PO cambió la config en `Auth → Settings → Auth Providers
→ Email → Password recovery token expiry`, actualizar el texto de la
plantilla a la ventana real.

Query rápida en Dashboard para confirmar: `Authentication → Providers →
Email → Password reset` (o `Auth → Settings → Sessions → OTP expiry`
según UI vigente).
