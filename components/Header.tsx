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
  const [profile, setProfile] = useState<{ nombre: string; apellido_p: string; roles?: string[] } | null>(null);

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

    // 3. Force check on route change (fixes header lag)
    const handleRouteChange = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      subscription.unsubscribe();
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.asPath]); // Re-run if path changes significantly if needed, but event listener covers it.
  // Actually, keeping [] is fine if we use event listener.
  // But let's add [router.asPath] to be safe if event listener misses edge cases? 
  // No, event listener is better. dependency [] is standard for mount.
  // Let's stick to [] and just event listener.


  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("registro_petmate")
        .select("nombre, apellido_p, roles")
        .eq("auth_user_id", userId)
        .single();

      if (data) {
        setProfile({ nombre: data.nombre, apellido_p: data.apellido_p, roles: data.roles });
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

  // Route logic: If user has 'petmate' role, prefer Sitter Dashboard.
  // Dual role users can navigate to client dashboard from sitter dashboard (usually).
  const isSitter = profile?.roles?.includes('petmate');
  const dashboardLink = isSitter ? "/sitter" : "/cliente";

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
                className="inline-flex items-center rounded-xl border-2 border-emerald-600 bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
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
                  // Clear local roles to prevent ghost access
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem("activeRole");
                    window.localStorage.removeItem("pm_auth_role_pending");
                  }
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
                  className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-600 bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
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
                    // Clear local roles to prevent ghost access
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem("activeRole");
                      window.localStorage.removeItem("pm_auth_role_pending");
                    }
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
