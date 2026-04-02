import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { useUser } from "../contexts/UserContext"; // Context Unificado
import { supabase } from "../lib/supabaseClient";
import NotificationBell from "./Shared/NotificationBell";
import QuickSearch from "./Header/QuickSearch";
import { Search, Briefcase } from "lucide-react";

export default function Header() {

  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  // Use Unified Context
  const { user, profile, isAuthenticated, activeRole, activeMode, canSwitchMode, switchMode, logout, switchRole, roles } = useUser();

  // Nombre a mostrar
  const userName = profile?.nombre || user?.user_metadata?.nombre || "Usuario";

  // Iniciales
  const getInitials = () => {
    if (profile?.nombre && profile?.apellido_p) {
      return (profile.nombre.charAt(0) + profile.apellido_p.charAt(0)).toUpperCase();
    }
    // Fallback si no hay apellido
    return userName.charAt(0).toUpperCase();
  };

  const userInitials = getInitials();

  // Route logic based on ACTIVE MODE preference
  const isSitterActive = activeMode === 'proveedor';
  const dashboardLink = isSitterActive ? "/proveedor" : "/explorar";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-300 bg-white/95 backdrop-blur-md transition-all shadow-sm">
      {/* Franja superior lanzamiento */}
      {showBanner && (
        <div className="bg-slate-900 text-white text-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center justify-center gap-2">
              <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline">
                Exclusivo Lanzamiento
              </span>
              <p className="text-center font-medium tracking-wide">
                <Link href="/register?rol=proveedor" className="hover:underline decoration-emerald-500 underline-offset-2">Sin comisión en el lanzamiento — Regístrate como proveedor</Link>
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
            src="/pawnecta_logo_final-trans.png"
            alt="Pawnecta"
            width={130}
            height={36}
            className="h-8 sm:h-9 w-auto"
          />
        </Link>

        {/* Buscador Compacto Central */}
        <div className="flex-1 flex justify-center px-4">
          <QuickSearch />
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 sm:flex">
          <Link
            href="/blog"
            className="text-sm font-semibold text-gray-600 hover:text-emerald-600 mr-4"
          >
            Blog
          </Link>
          <Link
            href="/explorar"
            className="text-sm font-semibold text-gray-600 hover:text-emerald-600 mr-2"
          >
            Explorar servicios
          </Link>
          {(!isAuthenticated || loggingOut) && (
            <Link
              href="/register?rol=proveedor"
              className="text-sm font-semibold text-gray-600 hover:text-emerald-600 mr-4"
            >
              Publicar servicio
            </Link>
          )}
          {(!isAuthenticated || loggingOut) ? (
            <>
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:border-emerald-500 hover:text-emerald-600 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center rounded-lg px-6 py-2 bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
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

              {/* Profile Switcher & Unread Badge */}
              <NotificationBell />

              {/* Multi-mode Switcher */}
              {canSwitchMode && (
                <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200 shadow-inner">
                  <button
                    onClick={() => switchMode('buscador')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeMode === 'buscador'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                  >
                    <span><Search size={18} /></span>
                    <span>Usuario</span>
                  </button>
                  <button
                    onClick={() => switchMode('proveedor')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeMode === 'proveedor'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                  >
                    <Briefcase size={14} />
                    <span>Ofreciendo</span>
                  </button>
                </div>
              )}

              {/* Admin link — directo sin dropdown */}
              {(!canSwitchMode && profile?.roles && profile.roles.includes('admin')) && (
                <Link
                  href="/admin"
                  className="inline-flex items-center rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors uppercase tracking-wide"
                >
                  Admin
                </Link>
              )}

              <Link
                href={dashboardLink}
                className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Mi panel
              </Link>
              <button
                onClick={async () => {
                  setOpen(false);
                  setLoggingOut(true);
                  await logout();
                  setLoggingOut(false);
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
            {(!isAuthenticated || loggingOut) ? (
              <>
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center rounded-xl border border-transparent px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-600"
                  onClick={() => setOpen(false)}
                >
                  Blog
                </Link>
                <Link
                  href="/explorar"
                  className="inline-flex items-center justify-center rounded-xl border border-transparent px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-600"
                  onClick={() => setOpen(false)}
                >
                  Explorar servicios
                </Link>
                <Link
                  href="/register?rol=proveedor"
                  className="inline-flex items-center justify-center rounded-xl border border-transparent px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-600"
                  onClick={() => setOpen(false)}
                >
                  Publicar servicio
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:border-emerald-500 hover:text-emerald-600 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                  onClick={() => setOpen(false)}
                >
                  Ingresar
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg px-6 py-2 bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
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
                  Explorar servicios
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
                <div className="flex justify-center my-2">
                  <NotificationBell />
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
                    setOpen(false);
                    setLoggingOut(true);
                    await logout();
                    setLoggingOut(false);
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
