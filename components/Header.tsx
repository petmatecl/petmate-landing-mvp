// components/Header.tsx
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Header() {
  const [open, setOpen] = React.useState(false);
  const { pathname, query } = useRouter();

  // helper para “resaltar” el ítem activo
  const isActive = (href: string) => {
    // resalta / en home
    if (href === "/" && pathname === "/") return true;
    // resalta cada tab del registro por query ?role=
    if (href.startsWith("/register")) {
      const url = new URL(href, "http://dummy");
      const role = url.searchParams.get("role");
      return pathname === "/register" && query.role === role;
    }
    return pathname === href;
  };

  return (
    <header className="bg-white/80 backdrop-blur sticky top-0 z-40 border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-emerald-700">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white"
          >
            🐾
          </span>
          <span>PetMate</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink href="/" active={isActive("/")}>Inicio</NavLink>
          <NavLink href="/register?role=cliente" active={isActive("/register?role=cliente")}>
            Solicitar
          </NavLink>
          <NavLink href="/register?role=petmate" active={isActive("/register?role=petmate")}>
            Ser PetMate
          </NavLink>
          <Link
            href="/login"
            className="ml-1 px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Ingresar
          </Link>
          <Link
            href="/register?role=cliente"
            className="ml-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Comenzar
          </Link>
        </nav>

        {/* Mobile burger */}
        <button
          className="sm:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            {open ? (
              <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeWidth="2" strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t bg-white">
          <div className="mx-auto max-w-7xl px-4 py-2 grid gap-1">
            <MobileLink href="/" onClick={() => setOpen(false)} active={isActive("/")}>
              Inicio
            </MobileLink>
            <MobileLink
              href="/register?role=cliente"
              onClick={() => setOpen(false)}
              active={isActive("/register?role=cliente")}
            >
              Solicitar
            </MobileLink>
            <MobileLink
              href="/register?role=petmate"
              onClick={() => setOpen(false)}
              active={isActive("/register?role=petmate")}
            >
              Ser PetMate
            </MobileLink>
            <MobileLink href="/login" onClick={() => setOpen(false)} active={isActive("/login")}>
              Ingresar
            </MobileLink>
            <Link
              href="/register?role=cliente"
              className="mt-1 px-3 py-2 rounded-md bg-emerald-600 text-white text-center font-medium"
              onClick={() => setOpen(false)}
            >
              Comenzar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* --- Subcomponentes --- */

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md hover:bg-gray-100 ${
        active ? "text-emerald-700 font-semibold" : ""
      }`}
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-2 rounded-md ${
        active ? "bg-gray-100 text-emerald-700 font-semibold" : "hover:bg-gray-50"
      }`}
    >
      {children}
    </Link>
  );
}
