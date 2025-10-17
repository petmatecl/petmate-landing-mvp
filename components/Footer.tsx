// components/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200">
      <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="font-semibold mb-2">PetMate</div>
          <div className="text-zinc-500">© {new Date().getFullYear()}</div>
        </div>

        <div>
          <div className="font-semibold mb-2">Empresa</div>
          <ul className="space-y-1">
            <li><Link href="/about" className="hover:underline">Quiénes somos</Link></li>
            <li><Link href="/how" className="hover:underline">Cómo funciona</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-semibold mb-2">Redes</div>
          <ul className="space-y-1">
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:underline"
              >
                {/* Instagram simple */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm11 1a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z"/></svg>
                Instagram
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-semibold mb-2">Acceso</div>
          <ul className="space-y-1">
            <li><Link href="/signup" className="hover:underline">Registrarse</Link></li>
            <li><Link href="/signin" className="hover:underline">Iniciar sesión</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
