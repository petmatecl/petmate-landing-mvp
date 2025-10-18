// pages/login.tsx
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="container my-10">
      <h1 className="text-2xl font-semibold mb-4">Iniciar sesión</h1>
      <p className="text-zinc-600 mb-6">
        Próximamente: tab de Usuario / PetMate para pedir credenciales.
      </p>
      <Link className="btn btn-light" href="/solicitud">Ir a registro</Link>
    </div>
  );
}
