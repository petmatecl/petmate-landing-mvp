// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-semibold text-emerald-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white">🐾</span>
            <span>PetMate</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Tu casa y tus mascotas, en buenas manos.
          </p>
        </div>

        <div>
          <h3 className="font-medium">Explorar</h3>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link href="/#como-funciona" className="hover:underline">Cómo funciona</Link></li>
            <li><Link href="/#beneficios" className="hover:underline">Beneficios</Link></li>
            <li><Link href="/#seguridad" className="hover:underline">Seguridad</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-medium">Compañía</h3>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link href="/#quienes-somos" className="hover:underline">Quiénes somos</Link></li>
            <li><Link href="/register?role=client" className="hover:underline">Registrarse</Link></li>
            <li><Link href="/login" className="hover:underline">Iniciar sesión</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-medium">Redes</h3>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:underline"
              >
                <span className="text-xl">📷</span> Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} PetMate.
      </div>
    </footer>
  );
}
