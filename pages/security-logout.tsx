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
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10 text-emerald-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    Sesión cerrada por seguridad
                </h1>

                <p className="text-slate-600 mb-8 leading-relaxed">
                    Para proteger tu cuenta, hemos cerrado tu sesión automáticamente debido a un periodo de inactividad.
                </p>

                <Link
                    href="/login"
                    className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-slate-900/20"
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
