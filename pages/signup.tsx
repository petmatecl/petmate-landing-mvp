// pages/signup.tsx
import React, { useMemo, useState } from 'react'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)

  // Reglas básicas
  const rules = useMemo(() => {
    return {
      len: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      num: /\d/.test(pass),
    }
  }, [pass])

  const allOk = rules.len && rules.upper && rules.num && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!allOk) return
    alert('Cuenta creada (MVP).')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Crear cuenta</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={(e)=>setPass(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10"
              required
            />
            <button
              type="button"
              onClick={()=>setShow(s=>!s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-zinc-600"
            >{show ? 'Ocultar' : 'Ver'}</button>
          </div>
          <ul className="text-xs mt-2 space-y-1">
            <li className={rules.len ? 'text-emerald-600' : 'text-zinc-500'}>• Al menos 8 caracteres</li>
            <li className={rules.upper ? 'text-emerald-600' : 'text-zinc-500'}>• Al menos 1 mayúscula</li>
            <li className={rules.num ? 'text-emerald-600' : 'text-zinc-500'}>• Al menos 1 número</li>
          </ul>
        </div>
        <button
          disabled={!allOk}
          className="w-full rounded-lg bg-emerald-600 py-3 text-white font-semibold disabled:opacity-50"
        >
          Registrarme
        </button>
        <div className="text-sm text-zinc-600">
          ¿Ya tienes cuenta? <Link href="/signin" className="underline">Inicia sesión</Link>
        </div>
      </form>
    </div>
  )
}
