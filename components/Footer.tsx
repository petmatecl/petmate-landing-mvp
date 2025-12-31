// components/Footer.tsx
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="relative h-8 w-auto block">
              <Image
                src="/pawnecta_logo_final-trans.png"
                alt="Pawnecta"
                width={150}
                height={50}
                className="h-12 w-auto"
              />
            </Link>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Mascotas sin estrés, en la seguridad de tu hogar — o en casa de un Sitter de confianza.
          </p>
        </div>

        {/* Servicios */}
        <div>
          <h4 className="text-sm font-bold text-slate-900">Servicios</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>
              <Link href="/servicios/domicilio" className="hover:text-emerald-600 transition-colors">
                Pawnecta a domicilio
              </Link>
            </li>
            <li>
              <Link href="/servicios/hospedaje" className="hover:text-emerald-600 transition-colors">
                Estadía en casa del Sitter
              </Link>
            </li>

          </ul>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="text-sm font-bold text-slate-900">Contacto</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>
              <Link href="mailto:contacto@pawnecta.com" className="hover:text-emerald-600 transition-colors">
                contacto@pawnecta.com
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-sm font-bold text-slate-900">Legal</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>
              <Link href="/quienes-somos" className="hover:text-emerald-600 transition-colors">
                Quiénes somos
              </Link>
            </li>
            <li>
              <Link href="/terminos" className="hover:text-emerald-600 transition-colors">
                Términos y Condiciones
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-emerald-600 transition-colors">
                Política de Privacidad
              </Link>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h4 className="text-sm font-bold text-slate-900">Síguenos</h4>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="https://www.instagram.com/pawnecta"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all"
              aria-label="Instagram"
              target="_blank"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <circle cx="17.5" cy="6.5" r="0.8"></circle>
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-medium">
        © {new Date().getFullYear()} Pawnecta. Todos los derechos reservados.
      </div>
    </footer>
  );
}

export default Footer;

