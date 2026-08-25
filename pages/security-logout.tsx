import Head from 'next/head';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function SecurityLogout() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <Head>
                <title>Sesión Cerrada | Pawnecta</title>
            </Head>

            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border-2 border-slate-300">
                <div className="w-20 h-20 bg-accent-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10 text-accent-600" />
                </div>

                {/* Sprint email-landing session-timeout fix (2026-08-25):
                    copy causa-neutral. Antes afirmaba "inactividad" pero
                    este destino cubre varios paths — inactividad real +
                    fallback catch de errores no-diagnosticados. Copy nuevo
                    describe el EFECTO observable ("cerramos tu sesión") sin
                    inferir la CAUSA. Ver CLAUDE.md > "Pantalla de estado
                    no debe afirmar causa que no verificó". */}
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                    Cerramos tu sesión
                </h1>

                <p className="text-slate-600 mb-8 leading-relaxed">
                    Por seguridad cerramos tu sesión. Vuelve a entrar para continuar.
                </p>

                <Link
                    href="/login"
                    className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-medium tracking-wide py-3.5 px-6 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-slate-900/20"
                >
                    Volver a ingresar
                </Link>

                <p className="mt-6 text-xs text-slate-400">
                    Pawnecta protege tus datos personales.
                </p>
            </div>
        </div>
    );
}
