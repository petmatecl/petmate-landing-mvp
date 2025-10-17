// pages/login.tsx
import { useState } from 'react';

export default function Login() {
  const [role, setRole] = useState<'usuario' | 'petmate'>('usuario');
  const [email, setEmail] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: integrar con Supabase Auth o tu backend
    alert(`Login ${role} → ${email}`);
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <a href="/" className="font-semibold">← Volver</a>
          <a href="/register" className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-400">
            Crear cuenta
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-6 text-2xl font-extrabold">Iniciar sesión</h1>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Ingresar como</label>
            <div className="flex gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  className="accent-emerald-500"
                  checked={role === 'usuario'}
                  onChange={() => setRole('usuario')}
                />
                Usuario
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  className="accent-emerald-500"
                  checked={role === 'petmate'}
                  onChange={() => setRole('petmate')}
                />
                PetMate
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-300">Email</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-300">Contraseña</label>
            <div className="flex">
              <input
                className="w-full rounded-l-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="rounded-r-lg border border-l-0 border-zinc-700 px-3 text-sm hover:bg-zinc-800"
                aria-label="Mostrar/Ocultar contraseña"
              >
                {showPwd ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <button className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-zinc-900 hover:bg-emerald-400">
            Entrar
          </button>
        </form>
      </main>
    </div>
  );
}
