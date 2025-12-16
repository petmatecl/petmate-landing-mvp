import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const router = useRouter();

  // Estado de sesión real
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<{ nombre: string; apellido_p: string } | null>(null);

  useEffect(() => {
    // 1. Ver sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
    });

    // 2. Escuchar cambios (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("registro_petmate")
        .select("nombre, apellido_p")
        .eq("auth_user_id", userId)
        .single();

      if (data) {
        setProfile({ nombre: data.nombre, apellido_p: data.apellido_p });
      }
    } catch (err) {
      console.error("Error fetching header profile:", err);
    }
  };

  const isLoggedIn = !!session;
  // Nombre a mostrar
  const userName = profile?.nombre || session?.user?.user_metadata?.nombre || "Usuario";

  // Iniciales
  const getInitials = () => {
    if (profile?.nombre && profile?.apellido_p) {
      return (profile.nombre.charAt(0) + profile.apellido_p.charAt(0)).toUpperCase();
    }
    // Fallback si no hay apellido
    return userName.charAt(0).toUpperCase();
  };

  const userInitials = getInitials();

  // Determinamos el dashboard correcto según el rol (si lo guardáramos en metadata sería ideal, 
  // por ahora asumimos cliente o probamos la url, pero para el link "Mi Panel" lo ideal es saber el rol.
  // Como MVP, si está en /petmate o /cliente usamos ese, si está en /explorar usamos el último conocido o cliente por defecto?
  // Simplificación MVP: Si el usuario inició como petmate, debería ir a petmate. 
  // Por ahora, redirigiremos a /cliente por defecto salvo que detectemos lo contrario.
  const dashboardLink = "/cliente"; // En un futuro ideal: session.user.user_metadata.role === 'petmate' ? '/sitter' : '/cliente'

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      {/* Franja superior lanzamiento */}
      {showBanner && (
        <div className="bg-black text-white text-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center justify-center gap-2">
              <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline animate-pulse">
                Exclusivo Lanzamiento
              </span>
              <p className="text-center font-medium tracking-wide">
                ¡Regístrate hoy y aprovecha <span className="font-extrabold text-white underline decoration-emerald-500 underline-offset-2">0% comisión de servicio</span> por tiempo limitado! 🚀
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar aviso"
              className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] text-white hover:bg-white/30"
              onClick={() => setShowBanner(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Barra principal */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand con logo nuevo (solo imagen, sin texto duplicado) */}
        <Link href="/" className="group flex items-center">
          <Image
            src="/logo-pawnecta.svg"
            alt="Pawnecta"
            width={160}
            height={40}
            className="h-9 sm:h-10 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 sm:flex">
          <Link
            href="/explorar"
            className="text-sm font-semibold text-gray-600 hover:text-emerald-600 mr-2"
          >
            Explorar Cuidadores
          </Link>
          {!isLoggedIn ? (
            <>
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl border px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Ingresar
              </Link>
              <Link
                href="/register?role=cliente"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Registrarse
              </Link>
            </>
          ) : (
            <>
              {/* Chip usuario demo */}
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white tracking-widest">
                  {userInitials}
                </span>
                <span className="text-sm font-medium text-emerald-900">{userName}</span>
              </div>
              <Link
                href={dashboardLink}
                className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Mi panel
              </Link>
              <button
                onClick={async () => {
                  setSession(null); // Feedback inmediato visual
                  try {
                    await supabase.auth.signOut();
                  } catch (error) {
                    console.error("Error signing out:", error);
                  } finally {
                    router.push("/");
                  }
                }}
                className="inline-flex items-center rounded-xl border px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 bg-white cursor-pointer"
              >
                Cerrar sesión
              </button>
            </>
          )}
        </nav>

        {/* Botón menú mobile */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-xl border p-2 text-gray-700 sm:hidden"
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Menú mobile */}
      {open && (
        <div id="mobile-menu" className="border-t bg-white sm:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/explorar"
                  className="inline-flex items-center justify-center rounded-xl border border-transparent px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-600"
                  onClick={() => setOpen(false)}
                >
                  Explorar Cuidadores
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  Ingresar
                </Link>
                <Link
                  href="/register?role=cliente"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  onClick={() => setOpen(false)}
                >
                  Registrarse
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/explorar"
                  className="inline-flex items-center justify-center rounded-xl border border-transparent px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-600 mb-2"
                  onClick={() => setOpen(false)}
                >
                  Explorar Cuidadores
                </Link>
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white tracking-widest">
                    {userInitials}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-emerald-900">{userName}</span>
                    <span className="text-[11px] text-emerald-700">Conectado</span>
                  </div>
                </div>
                <Link
                  href={dashboardLink}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  onClick={() => setOpen(false)}
                >
                  Mi panel
                </Link>
                <button
                  onClick={async () => {
                    setSession(null);
                    setOpen(false);
                    try {
                      await supabase.auth.signOut();
                    } catch (error) {
                      console.error("Error logging out", error);
                    } finally {
                      router.push("/");
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 w-full"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
