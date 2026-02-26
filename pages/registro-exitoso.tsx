// pages/registro-exitoso.tsx
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle } from "lucide-react";

export default function RegistroExitosoPage() {
  const router = useRouter();
  const role = String(router.query.role || "");
  const esProveedor = role === "proveedor";

  return (
    <>
      <Head>
        <title>Registro exitoso — Pawnecta</title>
      </Head>

      <main className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <CheckCircle size={48} className="text-emerald-600 mx-auto mb-4" />

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {esProveedor ? "Solicitud enviada" : "Revisa tu correo"}
          </h1>

          <p className="text-slate-600 mb-6">
            {esProveedor
              ? "Revisaremos tu información en 24 a 48 horas. Te avisaremos por correo cuando tu perfil esté activo."
              : "Te enviamos un enlace de confirmación. Ábrelo y haz clic para activar tu cuenta."}
          </p>

          <p className="text-sm text-slate-500 mb-8">
            {esProveedor
              ? "Mientras esperas, confirma tu correo desde el enlace que te enviamos."
              : "Si no lo ves en unos minutos, revisa la carpeta de spam."}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-12 rounded-xl font-medium bg-emerald-600 text-white w-full hover:bg-emerald-700 transition-colors"
            >
              Ir al inicio
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 rounded-xl font-medium bg-transparent text-slate-700 border border-slate-300 w-full hover:bg-slate-50 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
