// pages/unsubscribe-ok.tsx
// ---------------------------------------------------------------------------
// Sprint PROVEEDOR-PERFIL-NUDGE-7D Sprint A PR 4 (nudge-unsub). Página
// estática de confirmación mostrada después de que el proveedor hace
// click en el unsubscribe link del email.
//
// Zero auth, zero data mutation — la mutation ocurre en /api/unsubscribe
// que redirige acá al finalizar.
// ---------------------------------------------------------------------------
import Head from 'next/head';
import Link from 'next/link';

export default function UnsubscribeOkPage() {
    return (
        <>
            <Head>
                <title>Preferencia guardada | Pawnecta</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
                    <h1 className="text-2xl font-bold text-emerald-700 mb-4">
                        Preferencia guardada
                    </h1>
                    <p className="text-slate-700 mb-6 leading-relaxed">
                        No te enviaremos más recordatorios sobre tu perfil. Tu
                        cuenta sigue activa — puedes volver a Pawnecta cuando
                        quieras y publicar tu primer servicio.
                    </p>
                    <Link
                        href="/"
                        className="inline-block bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-800 transition-colors"
                    >
                        Volver a Pawnecta
                    </Link>
                    <p className="mt-6 text-sm text-slate-500">
                        ¿Quieres eliminar tu cuenta por completo? Escríbenos a{' '}
                        <a
                            href="mailto:contacto@pawnecta.com"
                            className="text-emerald-700 hover:underline"
                        >
                            contacto@pawnecta.com
                        </a>
                    </p>
                </div>
            </main>
        </>
    );
}
