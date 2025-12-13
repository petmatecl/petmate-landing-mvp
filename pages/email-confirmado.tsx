import Head from "next/head";
import Link from "next/link";

export default function EmailConfirmadoPage() {
    return (
        <>
            <Head>
                <title>¡Correo confirmado! — PetMate</title>
            </Head>

            <main className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-gradient-to-b from-emerald-50 to-white">
                <div className="w-full max-w-[520px] bg-white rounded-2xl p-8 shadow-xl border border-emerald-100 text-center relative overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />

                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-emerald-100 text-emerald-600 text-4xl shadow-sm">
                        🎉
                    </div>

                    <h1 className="text-3xl font-extrabold text-gray-900 m-0 mb-2">
                        ¡Correo confirmado!
                    </h1>

                    <p className="text-lg text-gray-600 mb-6">
                        Tu cuenta ha sido activada correctamente. Ya eres parte oficial de la comunidad PetMate.
                    </p>

                    <div className="space-y-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center h-14 rounded-xl font-bold bg-emerald-600 text-white w-full text-lg shadow-emerald-200 shadow-lg hover:bg-emerald-700 hover:scale-[1.02] transition-all"
                        >
                            Iniciar sesión
                        </Link>

                        <Link
                            href="/"
                            className="inline-flex items-center justify-center h-12 rounded-xl font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900 w-full transition-colors"
                        >
                            Volver al inicio
                        </Link>
                    </div>
                </div>
            </main>
        </>
    );
}
