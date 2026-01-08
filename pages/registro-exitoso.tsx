// pages/registro-exitoso.tsx
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

export default function RegistroExitosoPage() {
  const router = useRouter();
  const role = String(router.query.role || "");
  const esPetmate = role === "sitter";

  return (
    <>
      <Head>
        <title>Registro exitoso — Pawnecta</title>
      </Head>

      <main className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-gradient-to-b from-zinc-50 to-white">
        <div className="w-full max-w-[520px] bg-white rounded-2xl p-7 shadow-xl border border-zinc-200 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center bg-emerald-50 text-emerald-600 text-3xl">
            ✅
          </div>

          <h1 className="text-2xl font-bold text-gray-900 m-0">¡Registro enviado!</h1>

          <p className="mt-1.5 mb-3 text-gray-600">
            Ya creamos tu cuenta {esPetmate ? "de Sitter" : "de usuario"}.
          </p>

          <p className="mb-2 text-gray-500 text-sm">
            Te enviamos un correo de confirmación desde{" "}
            <strong>Supabase Auth</strong>. Abre ese correo y haz clic en{" "}
            <strong>“Confirm your mail”</strong> para activar tu cuenta.
          </p>

          <p className="mb-2 text-gray-500 text-sm">
            Gracias por unirte. Hemos enviado un enlace de confirmación a tu correo. Por favor revísalo para activar tu cuenta y establecer tu
            contraseña en Pawnecta.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 rounded-xl font-bold bg-gray-900 text-white w-full hover:bg-black transition-colors"
            >
              Ya confirmé mi correo
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-12 rounded-xl font-bold bg-white text-gray-900 border border-gray-300 w-full hover:bg-gray-50 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
