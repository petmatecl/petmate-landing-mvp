// components/Header.tsx
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="header">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="PetMate" width={28} height={28} />
          <span className="font-semibold text-lg">PetMate</span>
        </Link>

        <nav className="hidden md:flex items-center gap-3">
          <Link href="/solicitud" className="btn btn-light">Registrarse</Link>
          <Link href="/login" className="btn btn-primary">Iniciar sesión</Link>
        </nav>

        <button className="md:hidden btn btn-light" onClick={() => setOpen(!open)} aria-label="Menu">
          ☰
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-zinc-100">
          <div className="container py-3 flex flex-col gap-2">
            <Link href="/solicitud" className="btn btn-light">Registrarse</Link>
            <Link href="/login" className="btn btn-primary">Iniciar sesión</Link>
          </div>
        </div>
      )}
    </header>
  );
}
