// components/Header.tsx
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const router = useRouter();

  // Mientras no tengamos auth real, tratamos /cliente como "área privada"
  const isClientArea = router.pathname.startsWith("/cliente");

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      {/* Franja superior lanzamiento */}
      {showBanner && (
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white text-xs sm:text-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center justify-center gap-2">
              <span className="hidden rounded-full border border-emerald-300/60 bg-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline">
                Lanzamiento
              </span>
              <p className="text-center text-[11px] font-medium sm:text-xs">
                <span className="font-semibold">PetMate</span> es
                <span className="font-bold"> 100% gratuito</span> por lanzamiento. ¡Regístrate y aprovecha! 🎉
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar aviso"
              className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/70 text-[10px] text-emerald-50 hover:bg-emerald-700"
              onClick={() => setShowBanner(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Barra principal */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand con nuevo logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-9 w-9 sm:h-10 sm:w-10">
            <Image
              src="/logo-petmate.png"
              alt="PetMate"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-700 transition-colors group-hover:text-emerald-800">
            PetMate
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 sm:flex">
          {!isClientArea ? (
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
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  A
                </span>
                <span className="text-sm font-medium text-emerald-900">Aldo</span>
              </div>
              <Link
                href="/cliente"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Mi panel
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl border px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cerrar sesión
              </Link>
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
            {!isClientArea ? (
              <>
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
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    A
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-emerald-900">Aldo</span>
                    <span className="text-[11px] text-emerald-700">Cliente PetMate</span>
                  </div>
                </div>
                <Link
                  href="/cliente"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  onClick={() => setOpen(false)}
                >
                  Mi panel
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  Cerrar sesión
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
