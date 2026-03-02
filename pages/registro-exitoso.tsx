import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CheckCircle2 } from 'lucide-react';

export default function RegistroExitosoPage() {
  const router = useRouter();
  const { rol, role, email } = router.query;

  const userRole = String(rol || role || '');
  const userEmail = String(email || 'tu correo');

  const esProveedor = userRole === 'proveedor';

  return (
    <>
      <Head>
        <title>Registro exitoso | Pawnecta</title>
      </Head>

      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-4" />

          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            {esProveedor
              ? 'Tu solicitud está en revisión'
              : 'Revisa tu correo para activar tu cuenta'
            }
          </h1>

          <p className="text-slate-600 mb-8 leading-relaxed">
            {esProveedor
              ? 'Primero confirma tu correo y luego nuestro equipo revisará tu información. Recibirás un aviso en un plazo de 24 a 48 horas hábiles.'
              : `Te enviamos un enlace de confirmación a ${userEmail}. Activa tu cuenta para comenzar a buscar proveedores.`
            }
          </p>

          <div className="flex flex-col gap-3">
            {esProveedor ? (
              <Link
                href="/"
                className="inline-flex items-center justify-center w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors"
              >
                Explorar la plataforma
              </Link>
            ) : (
              <Link
                href="/explorar"
                className="inline-flex items-center justify-center w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors"
              >
                Explorar proveedores
              </Link>
            )}

            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
