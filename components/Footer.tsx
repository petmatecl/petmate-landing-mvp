// components/Footer.tsx
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-300 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="relative block">
              <Image
                src="/pawnecta_logo_final-trans.png"
                alt="Pawnecta"
                width={130}
                height={36}
                className="h-8 sm:h-9 w-auto"
              />
            </Link>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            El marketplace de servicios para mascotas más confiable de Chile.
          </p>
        </div>

        {/* Servicios */}
        <div>
          <h4 className="text-sm font-bold text-slate-900">Servicios</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>
              <Link href="/explorar?categoria=hospedaje" className="hover:text-emerald-600 transition-colors">
                Hospedaje en casa del sitter
              </Link>
            </li>
            <li>
              <Link href="/explorar?categoria=domicilio" className="hover:text-emerald-600 transition-colors">
                Cuidado a domicilio
              </Link>
            </li>
            <li>
              <Link href="/explorar?categoria=paseos" className="hover:text-emerald-600 transition-colors">
                Paseo de perros
              </Link>
            </li>
            <li>
              <Link href="/explorar?categoria=peluqueria" className="hover:text-emerald-600 transition-colors">
                Peluquería
              </Link>
            </li>
            <li>
              <Link href="/explorar?categoria=veterinario" className="hover:text-emerald-600 transition-colors">
                Veterinario a domicilio
              </Link>
            </li>
            <li>
              <Link href="/explorar?categoria=adiestramiento" className="hover:text-emerald-600 transition-colors">
                Adiestramiento
              </Link>
            </li>
          </ul>
        </div>

        {/* Pawnecta */}
        <div>
          <h4 className="text-sm font-bold text-slate-900">Pawnecta</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>
              <Link href="/quienes-somos" className="hover:text-emerald-600 transition-colors">
                Quiénes somos
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-emerald-600 transition-colors">
                Preguntas frecuentes
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-emerald-600 transition-colors">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/register?rol=proveedor" className="hover:text-emerald-600 transition-colors">
                Publicar mi servicio
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-300 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all"
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

      <div className="border-t border-slate-300 py-6 text-center text-xs text-slate-400 font-medium">
        © 2026 Pawnecta. Todos los derechos reservados.
      </div>
    </footer>
  );
}

export default Footer;

