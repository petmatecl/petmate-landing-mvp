// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-100 mt-16">
      <div className="container py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h5 className="font-semibold mb-2">PetMate</h5>
          <p className="text-sm text-zinc-600">Tu casa y tus mascotas, en buenas manos.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Link className="footer-link" href="/#quienes-somos">Quiénes somos</Link>
          <Link className="footer-link" href="/#como-funciona">Cómo funciona</Link>
          <Link className="footer-link" href="/#beneficios">Beneficios</Link>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="footer-link text-xl"
            title="Instagram"
          >
            {/* simple icono IG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2C4.239 2 2 4.239 2 7v10c0 2.761 2.239 5 5 5h10c2.761 0 5-2.239 5-5V7c0-2.761-2.239-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm11 2a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
            </svg>
          </a>
        </div>
      </div>
      <div className="text-center text-xs text-zinc-500 pb-6">© {new Date().getFullYear()} PetMate</div>
    </footer>
  );
}
