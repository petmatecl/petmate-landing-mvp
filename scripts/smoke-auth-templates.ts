/**
 * scripts/smoke-auth-templates.ts
 *
 * Sprint AUTH-MAIL-PHISH (2026-09-22) — helper puntual OFF-APP para disparar
 * las 6 plantillas de Supabase Auth contra STAGING y verificar en Mailtrap
 * (inbox 4922101) que el HTML nuevo llega con variables resueltas.
 *
 * NO es un test. NO se importa desde la app. NO agrega superficie productiva.
 * Se corre a mano solo cuando se aplica una plantilla y se necesita verificarla.
 *
 * Guards (mismo espíritu que e2e/fixtures/signupLink.ts):
 * - URL debe contener ref staging `jmtadvdkicyylcwjcmcl` — cero riesgo de disparar
 *   contra prod aunque alguien pase la env var equivocada.
 * - Key debe empezar con `sb_secret_` (formato nuevo Supabase Secret Key).
 * - Cero log del key completo — solo primeros 12 chars + `…`.
 *
 * Uso:
 *   E2E_SUPABASE_URL=https://jmtadvdkicyylcwjcmcl.supabase.co \
 *   E2E_SUPABASE_SERVICE_KEY=sb_secret_... \
 *   npx tsx scripts/smoke-auth-templates.ts <template> [email]
 *
 * Templates soportados:
 *   confirm-signup     — crea user con signUp() → dispara "Confirm signup"
 *   reset-password     — resetPasswordForEmail() → dispara "Reset password"
 *   magic-link         — signInWithOtp() → dispara "Magic link"
 *   invite-user        — admin.inviteUserByEmail() → dispara "Invite user"
 *   change-email       — admin.updateUserById() con nuevo email → dispara "Change email"
 *                          (nota: dispara solo al correo NUEVO desde admin; el correo
 *                           viejo lo dispara el flow client-side updateUser())
 *   reauthentication   — signInWithPassword() + reauthenticate() → dispara "Reauthentication"
 *                          (requiere sesión activa; ver comentario del case)
 *
 * Si <email> no se pasa, usa uno freh `staging-authtmpl-<ts>@pawnecta-test.example`.
 * Mailtrap redirige TODOS los correos de staging a inbox 4922101 (ver lib/resend.ts).
 */
import { createClient } from '@supabase/supabase-js';

const STAGING_PROJECT_REF = 'jmtadvdkicyylcwjcmcl';
const EXPECTED_KEY_PREFIX = 'sb_secret_';

function maskKey(key: string | undefined): string {
    if (!key) return '<empty>';
    if (key.length < 12) return '<short>';
    return `${key.slice(0, 12)}…`;
}

function freshEmail(): string {
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now();
    return `staging-authtmpl-${ts}-${rand}@pawnecta-test.example`;
}

async function main() {
    const template = process.argv[2];
    const emailArg = process.argv[3];

    if (!template) {
        console.error('Usage: npx tsx scripts/smoke-auth-templates.ts <template> [email]');
        console.error('Templates: confirm-signup | reset-password | magic-link | invite-user | change-email | reauthentication');
        process.exit(2);
    }

    const url = process.env.E2E_SUPABASE_URL;
    const key = process.env.E2E_SUPABASE_SERVICE_KEY;

    if (!url) throw new Error('[smoke-auth-templates] E2E_SUPABASE_URL no seteado.');
    if (!url.includes(STAGING_PROJECT_REF)) {
        throw new Error(
            `[smoke-auth-templates] URL "${url}" no contiene el ref staging '${STAGING_PROJECT_REF}'. ` +
            'Este helper es EXCLUSIVAMENTE staging.',
        );
    }
    if (!key) throw new Error('[smoke-auth-templates] E2E_SUPABASE_SERVICE_KEY no seteado.');
    if (!key.startsWith(EXPECTED_KEY_PREFIX)) {
        throw new Error(
            `[smoke-auth-templates] Key ${maskKey(key)} no matchea prefix '${EXPECTED_KEY_PREFIX}'.`,
        );
    }

    const email = emailArg || freshEmail();
    console.log(`[smoke-auth-templates] template=${template} email=${email} key=${maskKey(key)}`);

    const admin = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Anon client (usa la publishable key derivada del proyecto — permitido
    // en helpers off-app; no toca nada productivo).
    // Alternativa: reusar el mismo `admin` client para signInWithOtp y
    // resetPasswordForEmail, que también son endpoints Auth públicos que
    // aceptan header con service key sin problema (solo respetan la ruta
    // pública de OTP, no cambian permisos).
    const anon = admin; // service_role client también dispara los mismos emails.

    switch (template) {
        case 'confirm-signup': {
            // signUp() dispara "Confirm signup" cuando Auth email confirmation
            // está enabled (default). Auth manda el correo automático — este
            // helper solo hace el signUp() y sale.
            const { data, error } = await anon.auth.signUp({
                email,
                password: `TmplSmoke-${Date.now()}!`,
            });
            if (error) throw new Error(`signUp fail: ${error.message}`);
            console.log('[OK] Confirm signup disparado. userId:', data.user?.id ?? '<no-id>');
            break;
        }

        case 'reset-password': {
            // resetPasswordForEmail() dispara "Reset password". Requiere que
            // el user exista; si no, Supabase responde 200 igual por seguridad
            // (para no leakear existencia) pero no manda correo. Usar un email
            // que sabés existe en staging (Aldo/Camila).
            const { error } = await anon.auth.resetPasswordForEmail(email, {
                redirectTo: `https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app/reset-password`,
            });
            if (error) throw new Error(`resetPasswordForEmail fail: ${error.message}`);
            console.log('[OK] Reset password disparado (correo solo llega si el email existe en Auth staging).');
            break;
        }

        case 'magic-link': {
            // signInWithOtp() con shouldCreateUser:true dispara "Magic link"
            // para user existente. Si el user no existe, dispara "Confirm signup".
            // Usamos shouldCreateUser:false para forzar Magic link path.
            const { error } = await anon.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                    emailRedirectTo: `https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app/`,
                },
            });
            if (error) throw new Error(`signInWithOtp fail: ${error.message}`);
            console.log('[OK] Magic link disparado (correo solo llega si el email existe en Auth staging).');
            break;
        }

        case 'invite-user': {
            // admin.inviteUserByEmail() dispara "Invite user" template.
            const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
                redirectTo: `https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app/`,
            });
            if (error) throw new Error(`inviteUserByEmail fail: ${error.message}`);
            console.log('[OK] Invite user disparado. userId:', data.user?.id ?? '<no-id>');
            break;
        }

        case 'change-email': {
            // Dos pasos: (1) crear user con email A (auto-confirmed para
            // saltarnos Confirm signup); (2) admin.updateUserById cambiando
            // email a B — dispara "Change email address" al email nuevo B.
            // El correo al viejo A lo dispara el flow client-side
            // updateUser({email}); admin.updateUserById solo dispara al nuevo.
            const emailNew = `staging-authtmpl-new-${Date.now()}@pawnecta-test.example`;
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
                email,
                password: `TmplSmoke-${Date.now()}!`,
                email_confirm: true,
            });
            if (createErr) throw new Error(`createUser fail: ${createErr.message}`);
            const userId = created.user?.id;
            if (!userId) throw new Error('createUser: no userId');

            const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
                email: emailNew,
            });
            if (updateErr) throw new Error(`updateUserById fail: ${updateErr.message}`);
            console.log(`[OK] Change email disparado. userId=${userId} email_new=${emailNew}`);
            console.log('    Nota: admin.updateUserById dispara solo al email NUEVO. Para probar la variante');
            console.log('    del email viejo, hacer signInWithPassword como el user + updateUser({email}) client-side.');
            break;
        }

        case 'reauthentication': {
            // reauthenticate() requiere sesión activa. Bootstrap: crear user
            // auto-confirmed → signInWithPassword() → reauthenticate() → dispara
            // "Reauthentication" template al email actual.
            const password = `TmplSmoke-${Date.now()}!`;
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });
            if (createErr) throw new Error(`createUser fail: ${createErr.message}`);
            const userId = created.user?.id;
            if (!userId) throw new Error('createUser: no userId');

            // Cliente separado con sesión propia (no compartir con admin).
            const userClient = createClient(url, key);
            const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
            if (signInErr) throw new Error(`signInWithPassword fail: ${signInErr.message}`);

            const { error: reauthErr } = await userClient.auth.reauthenticate();
            if (reauthErr) throw new Error(`reauthenticate fail: ${reauthErr.message}`);
            console.log(`[OK] Reauthentication disparado. userId=${userId}`);
            break;
        }

        default:
            console.error(`Unknown template: ${template}`);
            process.exit(2);
    }

    console.log('');
    console.log('Verificar en Mailtrap: https://mailtrap.io/inboxes/4922101/messages');
    console.log('Chequeos: HTML nuevo (marca Pawnecta), variables resueltas (cero {{ .X }} raw), asunto en español.');
}

main().catch((err) => {
    console.error('[smoke-auth-templates] FATAL:', err instanceof Error ? err.message : err);
    process.exit(1);
});
