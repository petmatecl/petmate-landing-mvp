// components/Header.tsx
import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-zinc-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block h-6 w-6 rounded bg-emerald-600" />
          PetMate
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/signup" className="hover:underline">Registrarse</Link>
          <Link href="/signin" className="hover:underline">Iniciar sesión</Link>
        </nav>

        <button
          onClick={() => setOpen(s => !s)}
          className="md:hidden h-9 w-9 rounded-lg border flex items-center justify-center"
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-zinc-200 px-4 py-3 space-y-3">
          <Link href="/signup" className="block">Registrarse</Link>
          <Link href="/signin" className="block">Iniciar sesión</Link>
          <Link href="/" className="block">¿Cómo funciona?</Link>
        </div>
      )}
    </header>
  )
}
