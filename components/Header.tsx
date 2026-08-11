import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import { useUser } from "../contexts/UserContext"; // Context Unificado
import { supabase } from "../lib/supabaseClient";
import NotificationBell from "./Shared/NotificationBell";
import UserInitialsAvatar from "./Shared/UserInitialsAvatar";
import QuickSearch from "./Header/QuickSearch";
import { ChevronDown, LogOut } from "lucide-react";

export default function Header() {

  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use Unified Context
  const { user, profile, isAuthenticated, hasSeekerProfile, providerStatus, logout } = useUser();

  // Banner "Estamos en lanzamiento" es solo para guests — usuarios autenticados
  // (tutores, proveedores, admins) NO lo ven para evitar invitación redundante.
  const showLaunchBanner = showBanner && !isAuthenticated;

  // Sync --header-height CSS variable for sticky descendants (e.g., banner amber EJEMPLO).
  // 105px when launch banner visible (40 topbar + 65 navbar), 64px when collapsed.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--header-height', showLaunchBanner ? '105px' : '64px');
  }, [showLaunchBanner]);

  // Nombre a mostrar
  const userName = profile?.nombre || user?.user_metadata?.nombre || "Usuario";

  // Estado activo del nav — deriva de router.pathname. Match exacto: cada
  // item se marca solo cuando su ruta coincide con la actual. Simple y
  // predecible; si en el futuro alguna ruta tiene sub-paths que tambien
  // deben mostrar el item activo (ej. /usuario/mascotas/edit/:id), pasar
  // a startsWith en ese item puntual.
  const isRouteActive = (path: string) => router.pathname === path;

  // Items personales del dropdown/menu, derivados por rol real (no por
  // toggle). Dos secciones separadas por rol; se concatenan con separadores
  // en el render.
  //   - Proveedor aprobado -> "Panel de proveedor" (nada mas del panel del tutor).
  //   - Tutor -> Mis favoritos + Mis solicitudes + Mis mascotas.
  //   - Ambos -> las dos secciones apiladas con separator entre medio.
  const isProveedor = providerStatus === 'aprobado';
  const providerNav = isProveedor
    ? [{ href: '/proveedor', label: 'Panel de proveedor' }]
    : [];
  const tutorNav = hasSeekerProfile
    ? [
        { href: '/favoritos', label: 'Mis favoritos' },
        { href: '/mis-reservas', label: 'Mis reservas' },
        { href: '/usuario/mascotas', label: 'Mis mascotas' },
      ]
    : [];
  const personalNav = [...providerNav, ...tutorNav];
  const personalActive = personalNav.some(item => isRouteActive(item.href));

  // Sombra sutil al scrollear — patron estandar de header sticky. Listener
  // pasivo, threshold bajo (4px) para que se active al primer movimiento
  // sin flicker. Sin dependencias.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar dropdown del avatar al click afuera. Solo se attachea el listener
  // cuando el menu esta abierto para no ensuciar el event loop.
  useEffect(() => {
    if (!avatarOpen) return;
    const onDown = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [avatarOpen]);

  return (
    <header className={`sticky top-0 z-40 border-b border-slate-300 bg-white/95 backdrop-blur-md transition-shadow ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      {/* Franja superior lanzamiento — solo para guests no autenticados */}
      {showLaunchBanner && (
        <div className="bg-slate-900 text-white text-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center justify-center gap-2">
              <p className="text-center font-medium tracking-wide">
                <Link href="/register?rol=proveedor" className="hover:underline decoration-accent-500 underline-offset-2">Estamos en lanzamiento — Regístrate como proveedor</Link>
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar aviso"
              className="ml-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white hover:bg-white/30 transition-colors"
              onClick={() => setShowBanner(false)}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px]">×</span>
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
        <nav aria-label="Navegación principal" className="hidden items-center gap-3 sm:flex">
          <Link
            href="/blog"
            className="text-sm font-normal text-slate-500 hover:text-accent-600 mr-4"
          >
            Blog
          </Link>
          <Link
            href="/explorar"
            className="text-sm font-normal text-slate-500 hover:text-accent-600 mr-2"
          >
            Explorar servicios
          </Link>
          {(!isAuthenticated || loggingOut) ? (
            <>
              <Link
                href="/login"
                className="text-sm font-normal text-slate-500 hover:text-accent-600 mr-2"
              >
                Ingresar
              </Link>
              <Link
                href="/register?rol=usuario"
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:border-accent-600 hover:text-accent-600 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2"
              >
                Soy tutor
              </Link>
              <Link
                href="/register?rol=proveedor"
                className="inline-flex items-center rounded-lg px-6 py-2 bg-accent-600 text-white text-sm font-medium tracking-wide hover:bg-accent-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2"
              >
                Soy proveedor
              </Link>
            </>
          ) : (
            <>
              <NotificationBell />

              {/* Menu del avatar — colapsa toda la nav personal en un dropdown.
                  Los items se derivan por rol real (providerNav + tutorNav),
                  con separator entre grupos si el user tiene ambos roles. El
                  chip clickeable se marca con bg-accent-100 + ring cuando
                  estas en alguna seccion personal; el item activo dentro del
                  dropdown recibe el pill verde bg-accent-600. */}
              <div ref={avatarRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAvatarOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={avatarOpen}
                  aria-label="Menu de usuario"
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 transition-colors ${
                    personalActive
                      ? 'bg-accent-100 ring-1 ring-accent-300'
                      : 'bg-accent-50 hover:bg-accent-100'
                  }`}
                >
                  <UserInitialsAvatar nombre={profile?.nombre || userName} apellidoP={profile?.apellido_p} size="sm" />
                  <span className="text-sm font-normal text-accent-900 max-w-[8rem] truncate">{userName}</span>
                  <ChevronDown size={14} className={`text-accent-800 transition-transform ${avatarOpen ? 'rotate-180' : ''}`} />
                </button>

                {avatarOpen && (
                  <div
                    role="menu"
                    aria-label="Menu personal"
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-50"
                  >
                    {providerNav.map(item => {
                      const active = isRouteActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setAvatarOpen(false)}
                          className={`block w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-accent-600 text-white font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                    {providerNav.length > 0 && tutorNav.length > 0 && (
                      <div className="my-1 border-t border-slate-100" />
                    )}
                    {tutorNav.map(item => {
                      const active = isRouteActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setAvatarOpen(false)}
                          className={`block w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-accent-600 text-white font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={async () => {
                        setAvatarOpen(false);
                        setLoggingOut(true);
                        await logout();
                        setLoggingOut(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <LogOut size={14} /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Botón menú mobile */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg border p-2 text-gray-700 sm:hidden"
          aria-label="Abrir menú"
          aria-haspopup="menu"
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
        <div id="mobile-menu" role="menu" aria-label="Menú principal" className="border-t bg-white sm:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
            {(!isAuthenticated || loggingOut) ? (
              <>
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center rounded-lg border border-transparent px-3.5 py-2 text-sm font-normal text-slate-500 hover:text-accent-600"
                  onClick={() => setOpen(false)}
                >
                  Blog
                </Link>
                <Link
                  href="/explorar"
                  className="inline-flex items-center justify-center rounded-lg border border-transparent px-3.5 py-2 text-sm font-normal text-slate-500 hover:text-accent-600"
                  onClick={() => setOpen(false)}
                >
                  Explorar servicios
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg border border-transparent px-3.5 py-2 text-sm font-normal text-slate-500 hover:text-accent-600"
                  onClick={() => setOpen(false)}
                >
                  Ingresar
                </Link>
                <Link
                  href="/register?rol=usuario"
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:border-accent-600 hover:text-accent-600 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2"
                  onClick={() => setOpen(false)}
                >
                  Soy tutor
                </Link>
                <Link
                  href="/register?rol=proveedor"
                  className="inline-flex items-center justify-center rounded-lg px-6 py-2 bg-accent-600 text-white text-sm font-medium tracking-wide hover:bg-accent-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2"
                  onClick={() => setOpen(false)}
                >
                  Soy proveedor
                </Link>
              </>
            ) : (
              <>
                {/* Chip usuario — presencia visual del avatar en mobile, coherente
                    con el chip que abre el dropdown en desktop. Aca solo muestra
                    identidad; los items estan abajo. */}
                <div className="flex items-center gap-2 rounded-lg bg-accent-50 px-3.5 py-2 mb-2">
                  <UserInitialsAvatar nombre={profile?.nombre || userName} apellidoP={profile?.apellido_p} size="sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-normal text-accent-900">{userName}</span>
                    <span className="text-[11px] text-accent-700">Conectado</span>
                  </div>
                </div>
                <div className="flex justify-center mb-2">
                  <NotificationBell />
                </div>

                {/* Publico */}
                <Link
                  href="/explorar"
                  className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm transition-colors ${
                    isRouteActive('/explorar')
                      ? 'bg-accent-600 text-white font-semibold'
                      : 'text-slate-500 font-normal hover:text-accent-600'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  Explorar servicios
                </Link>
                <Link
                  href="/blog"
                  className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm transition-colors ${
                    isRouteActive('/blog')
                      ? 'bg-accent-600 text-white font-semibold'
                      : 'text-slate-500 font-normal hover:text-accent-600'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  Blog
                </Link>

                {/* Personal — mismo orden que el dropdown desktop.
                    Panel de proveedor primero, separador si aplica, luego
                    tutor nav. Sin roles personales -> nada aca (solo se ve
                    el separador previo con Cerrar sesion). */}
                {personalNav.length > 0 && <div className="my-2 border-t border-slate-100" />}
                {providerNav.map(item => {
                  const active = isRouteActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-accent-600 text-white font-semibold'
                          : 'text-slate-500 font-normal hover:text-accent-600'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {providerNav.length > 0 && tutorNav.length > 0 && (
                  <div className="my-2 border-t border-slate-100" />
                )}
                {tutorNav.map(item => {
                  const active = isRouteActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-accent-600 text-white font-semibold'
                          : 'text-slate-500 font-normal hover:text-accent-600'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {personalNav.length > 0 && <div className="my-2 border-t border-slate-100" />}
                <button
                  onClick={async () => {
                    setOpen(false);
                    setLoggingOut(true);
                    await logout();
                    setLoggingOut(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-normal text-slate-600 hover:bg-slate-50 w-full mt-1"
                >
                  <LogOut size={14} /> Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
