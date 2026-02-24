import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { useUser } from "../contexts/UserContext"; // Context Unificado
import { supabase } from "../lib/supabaseClient";
import NotificationBell from "./Shared/NotificationBell";
import UnreadBadge from "./Shared/UnreadBadge";

export default function Header() {

  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const router = useRouter();

  // Use Unified Context
  const { user, profile, isAuthenticated, activeRole, logout, switchRole, roles } = useUser();

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

  // Route logic based on ACTIVE ROLE preference
  const isSitterActive = activeRole === 'petmate';
  const isAdminActive = activeRole === 'admin';
  const dashboardLink = isAdminActive ? "/admin" : (isSitterActive ? "/proveedor" : "/usuario");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-300 bg-white/95 backdrop-blur-md transition-all shadow-sm">
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
            src="/pawnecta_logo_final-trans.png"
            alt="Pawnecta"
            width={130}
            height={36}
            className="h-8 sm:h-9 w-auto"
          />
        </Link>

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
          {!isAuthenticated && (
            <Link
              href="/register?rol=proveedor"
              className="text-sm font-semibold text-gray-600 hover:text-emerald-600 mr-4"
            >
              Publicar servicio
            </Link>
          )}
          {!isAuthenticated ? (
            <>
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl border-2 border-emerald-600 bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
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

              {/* Profile Switcher & Unread Badge */}
              <NotificationBell />

              {/* Multi-role Switcher */}
              {(profile?.roles && profile.roles.length > 1) && (
                <div className="relative group">
                  <button className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors uppercase tracking-wide">
                    {activeRole === 'petmate' ? 'Proveedor' : activeRole === 'admin' ? 'Admin' : 'Usuario'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 space-y-1">
                      {profile.roles.map(r => (
                        <button
                          key={r}
                          onClick={() => {
                            if (activeRole !== r) {
                              switchRole(r as any);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeRole === r ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          {r === 'petmate' ? 'Proveedor' : r === 'admin' ? 'Admin' : 'Usuario'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Link
                href="/mensajes"
                className="inline-flex items-center rounded-xl bg-white border-2 border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors gap-2 relative"
              >
                Mensajes
              </Link>
              <Link
                href={dashboardLink}
                className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Mi panel
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
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
            {!isAuthenticated ? (
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
                  className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-600 bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Ingresar
                </Link>
                <Link
                  href="/register"
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
                  href="/mensajes"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 mb-2 relative"
                  onClick={() => setOpen(false)}
                >
                  Mensajes
                </Link>
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
                    await logout();
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
