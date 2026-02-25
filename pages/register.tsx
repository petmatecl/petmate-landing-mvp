import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Card } from "../components/Shared/Card";
import GoogleAuthButton from "../components/GoogleAuthButton";
import LinkedInAuthButton from "../components/LinkedInAuthButton";
import ProviderRegistrationFlow from "../components/Register/ProviderRegistrationFlow";
import ClientRegistrationFlow from "../components/Register/ClientRegistrationFlow";

type Role = "cliente" | "sitter";

const UserIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const PawIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="19" cy="8" r="2.5" />
    <circle cx="5" cy="8" r="2.5" />
    <path d="M12 12c-2.5 0-4.5 2-4.5 4.5S9.5 21 12 21s4.5-2 4.5-4.5S14.5 12 12 12z" />
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);

  React.useEffect(() => {
    if (router.isReady) {
      const { role } = router.query;
      if (role === "petmate" || role === "sitter") {
        setSelectedRole("sitter");
      } else if (role === "usuario" || role === "cliente") {
        setSelectedRole("cliente");
      }
    }
  }, [router.isReady, router.query]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    const queryRole = role === 'cliente' ? 'usuario' : 'sitter';
    router.replace({ pathname: router.pathname, query: { role: queryRole } }, undefined, { shallow: true });
  };

  return (
    <>
      <Head>
        <title>Registro — Pawnecta</title>
      </Head>

      <main className="min-h-[calc(100vh-200px)] flex justify-center p-6 bg-slate-50">
        <div className="w-full max-w-3xl">
          <Card padding="l">
            {/* Si no hay rol seleccionado, mostramos la pantalla inicial */}
            {!selectedRole ? (
              <div className="grid gap-6 animate-fade-in">
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta en Pawnecta</h1>
                  <p className="text-slate-600 mt-2">Selecciona cómo quieres usar la plataforma:</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('sitter')}
                    className="relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-slate-200 bg-white transition-all cursor-pointer group hover:border-[#1A6B4A] hover:bg-emerald-50 hover:shadow-md"
                  >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors bg-slate-100 text-slate-500 group-hover:bg-[#1A6B4A]/10 group-hover:text-[#1A6B4A]">
                      <PawIcon width={40} height={40} />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-slate-700 group-hover:text-[#1A6B4A]">Quiero ofrecer servicios</h3>
                    <p className="text-sm text-center text-slate-500">Únete como proveedor, ofrece tus servicios y administra tu disponibilidad.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect('cliente')}
                    className="relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-slate-200 bg-white transition-all cursor-pointer group hover:border-[#1A6B4A] hover:bg-emerald-50 hover:shadow-md"
                  >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors bg-slate-100 text-slate-500 group-hover:bg-[#1A6B4A]/10 group-hover:text-[#1A6B4A]">
                      <UserIcon width={40} height={40} />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-slate-700 group-hover:text-[#1A6B4A]">Soy usuario</h3>
                    <p className="text-sm text-center text-slate-500">Quiero encontrar servicios para mi mascota.</p>
                  </button>
                </div>
              </div>
            ) : (
              /* Si hay rol, delegamos al componente correspondiente */
              selectedRole === 'sitter' ? (
                <ProviderRegistrationFlow onCancel={() => { setSelectedRole(null); router.replace('/register', undefined, { shallow: true }); }} />
              ) : (
                <ClientRegistrationFlow onCancel={() => { setSelectedRole(null); router.replace('/register', undefined, { shallow: true }); }} />
              )
            )}

            {!selectedRole && (
              <div className="mt-8 border-t border-slate-200 pt-8 animate-fade-in">
                <p className="text-center text-sm text-slate-500 mb-4">O regístrate con tus redes sociales</p>
                <div className="space-y-3 max-w-xs mx-auto">
                  <GoogleAuthButton role={selectedRole} text="Continuar con Google" source="register" />
                  <LinkedInAuthButton role={selectedRole} text="Continuar con LinkedIn" source="register" />
                </div>
              </div>
            )}

            <p className="text-center mt-8 text-slate-500 text-sm">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-[#1A6B4A] font-bold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
