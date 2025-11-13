// components/Footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              🐾
            </span>
            <span className="text-lg font-bold text-emerald-800">PetMate</span>
          </div>
          <p className="text-sm text-gray-600">
            Mascotas sin estrés, en la seguridad de tu hogar — o en casa de un PetMate de confianza.
          </p>
        </div>

        {/* Servicios */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Servicios</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>PetMate a domicilio</li>
            <li>Estadía en casa del PetMate</li>
            <li>Paseos y administración de medicamentos</li>
          </ul>
        </div>

        {/* Soporte */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Soporte</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>
              <Link href="/#ayuda" className="hover:text-gray-900">
                Centro de ayuda
              </Link>
            </li>
            <li>
              <Link href="/#seguridad" className="hover:text-gray-900">
                Seguridad y cobertura
              </Link>
            </li>
            <li>
              <Link href="/#contacto" className="hover:text-gray-900">
                Contacto
              </Link>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Síguenos</h4>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="https://instagram.com"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border hover:bg-gray-50"
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

      <div className="border-t py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} PetMate. Todos los derechos reservados.
      </div>
    </footer>
  );
}

export default Footer;
