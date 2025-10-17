// pages/register.tsx
import { useMemo, useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function Register() {
  const [role, setRole] = useState<'usuario' | 'petmate'>('usuario');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const rules = useMemo(() => {
    return {
      len: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      num: /\d/.test(pwd),
    };
  }, [pwd]);

  const allOk = rules.len && rules.upper && rules.lower && rules.num && EMAIL_RE.test(email) && nombre.length > 0;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allOk) return;
    // TODO: integrar con Supabase Auth o tu backend
    alert(`Registro ${role} → ${email}`);
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <a href="/" className="font-semibold">← Volver</a>
          <a href="/login" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">
            Iniciar sesión
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-6 text-2xl font-extrabold">Crear cuenta</h1>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Crear cuenta como</label>
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
            <label className="mb-1 block text-sm text-zinc-300">Nombre</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-300">Email</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

            {/* Reglas de seguridad */}
            <ul className="mt-2 space-y-1 text-xs">
              <li className={rules.len ? 'text-emerald-400' : 'text-zinc-400'}>• Al menos 8 caracteres</li>
              <li className={rules.upper ? 'text-emerald-400' : 'text-zinc-400'}>• Una letra mayúscula (A–Z)</li>
              <li className={rules.lower ? 'text-emerald-400' : 'text-zinc-400'}>• Una letra minúscula (a–z)</li>
              <li className={rules.num ? 'text-emerald-400' : 'text-zinc-400'}>• Un número (0–9)</li>
            </ul>
          </div>

          <button
            disabled={!allOk}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-zinc-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Crear cuenta
          </button>
        </form>
      </main>
    </div>
  );
}
