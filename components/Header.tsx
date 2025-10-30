// components/Header.tsx
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur sticky top-0 z-40 border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-emerald-700">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white">🐾</span>
          <span>PetMate</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-2">
          <Link href="/register?role=client" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
            Registrarse
          </Link>
          <Link href="/login" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
            Iniciar sesión
          </Link>
        </nav>

        <button
          aria-label="Abrir menú"
          className="sm:hidden rounded-md p-2 hover:bg-gray-100"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="sm:hidden border-t bg-white">
          <div className="px-4 py-3 flex flex-col gap-2">
            <Link href="/register?role=client" className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
  Registrarse
</Link>
            <Link href="/login" className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
