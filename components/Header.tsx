// components/Header.tsx
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand más grande */}
        <Link href="/" className="group flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white text-xl shadow-sm">
            🐾
          </span>
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-700 group-hover:text-emerald-800 transition-colors">
            PetMate
          </span>
        </Link>

        {/* Desktop CTAs: solo Ingresar y Comenzar */}
        <nav className="hidden sm:flex items-center gap-3">
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
            Comenzar
          </Link>
        </nav>

        {/* Botón menú mobile */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden inline-flex items-center justify-center rounded-xl border p-2 text-gray-700"
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
        <div id="mobile-menu" className="sm:hidden border-t bg-white">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <Link
              href="/login"
              className="flex-1 inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Ingresar
            </Link>
            <Link
              href="/register?role=cliente"
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
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
