import { Resend } from 'resend';

/**
 * Resend client with staging-safe email redirection.
 *
 * In production (NODE_ENV=production AND NEXT_PUBLIC_APP_ENV=production or unset):
 *   emails go to the real recipient.
 *
 * In staging / dev (NEXT_PUBLIC_APP_ENV !== 'production' OR NODE_ENV !== 'production'):
 *   - `to` is replaced by process.env.AUDIT_INBOX (fallback 'audit_inbox@mail.tm')
 *   - subject is prefixed with "[STAGING] (orig: <original_to>)"
 *   - each send is logged to stdout: { original_to, redirected_to, subject }
 *
 * The wrapper is transparent: `resend.emails.send({...})` signature unchanged.
 */

const realResend = new Resend(process.env.RESEND_API_KEY);

const IS_PROD =
    process.env.NEXT_PUBLIC_APP_ENV === 'production' ||
    (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_ENV);

const AUDIT_INBOX = process.env.AUDIT_INBOX || 'audit_inbox@mail.tm';

function normalizeTo(to: string | string[]): string[] {
    return Array.isArray(to) ? to : [to];
}

type SendArgs = Parameters<typeof realResend.emails.send>[0];
type SendResult = Awaited<ReturnType<typeof realResend.emails.send>>;

async function safeSend(args: SendArgs): Promise<SendResult> {
    if (IS_PROD) {
        return realResend.emails.send(args);
    }

    const originalTo = normalizeTo(args.to);
    const redirected: SendArgs = {
        ...args,
        to: AUDIT_INBOX,
        subject: `[STAGING] (orig: ${originalTo.join(',')}) ${args.subject ?? ''}`.slice(0, 250),
    };

    // eslint-disable-next-line no-console
    console.log('[resend-wrapper]', JSON.stringify({
        env: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
        original_to: originalTo,
        redirected_to: AUDIT_INBOX,
        from: args.from,
        subject: args.subject,
        template: (args as any).react ? 'react' : 'html',
    }));

    return realResend.emails.send(redirected);
}

// Export a shape-compatible client. The only method used across the app is
// resend.emails.send(...) so we only proxy that. If other methods are needed
// later (batch, domains, etc.), extend here.
export const resend = {
    emails: {
        send: safeSend,
    },
};

// Also expose the raw client for cases that explicitly want to bypass (none today,
// kept for future diagnostics). DO NOT USE FROM APP CODE.
export const __rawResend = realResend;
