// pages/signin.tsx
import React, { useState } from 'react'

export default function SignIn() {
  const [role, setRole] = useState<'usuario' | 'petmate'>('usuario')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Iniciar sesión como ${role} (MVP).`)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-zinc-200 shadow-sm mb-6">
        <button
          onClick={() => setRole('usuario')}
          className={`py-3 font-semibold ${role==='usuario' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
        >Usuario</button>
        <button
          onClick={() => setRole('petmate')}
          className={`py-3 font-semibold ${role==='petmate' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
        >PetMate</button>
      </div>

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
        </div>
        <button className="w-full rounded-lg bg-emerald-600 py-3 text-white font-semibold">
          Iniciar sesión
        </button>
      </form>
    </div>
  )
}
