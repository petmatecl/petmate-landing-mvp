'use client'

import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

type Role = 'client' | 'petmate'

/**
 * /pages/login.tsx — Tabs Cliente / PetMate (sin dependencias externas)
 * - 100% self-contained: sin shadcn/ui, sin lucide.
 * - Compatible con Pages Router (import from 'next/router').
 * - Estilos mínimos con styled-jsx.
 */
export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = React.useState<Role>('client')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = (role: Role) => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '')
    const password = String(form.get('password') || '')

    if (!email || !password) {
      setError('Completa tu correo y contraseña.')
      return
    }

    try {
      setLoading(true)
      // TODO: Reemplaza por tu lógica real (NextAuth, Supabase, API propia, etc.)
      await new Promise((r) => setTimeout(r, 500))
      router.push(role === 'client' ? '/cliente' : '/petmate')
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Iniciar sesión — PetMate</title>
      </Head>

      <main className="page">
        <div className="wrap">
          <div className="card">
            <div className="tabs" role="tablist" aria-label="Selecciona tipo de cuenta">
              <button
                role="tab"
                aria-selected={tab === 'client'}
                className={`tab ${tab === 'client' ? 'active' : ''}`}
                onClick={() => setTab('client')}
              >
                Cliente
              </button>
              <button
                role="tab"
                aria-selected={tab === 'petmate'}
                className={`tab ${tab === 'petmate' ? 'active' : ''}`}
                onClick={() => setTab('petmate')}
              >
                PetMate
              </button>
            </div>

            {tab === 'client' ? (
              <AuthForm
                key="client"
                title="Iniciar sesión"
                subtitle="Accede como cliente para reservar y gestionar servicios."
                onSubmit={handleSubmit('client')}
                registerHref="/register?role=client"
              />
            ) : (
              <AuthForm
                key="petmate"
                title="Iniciar sesión"
                subtitle="Accede como PetMate para gestionar reservas y tu perfil."
                onSubmit={handleSubmit('petmate')}
                registerHref="/register?role=petmate"
              />
            )}

            {error && <p className="error" role="alert">{error}</p>}

            <div className="footerLinks">
              <Link href="/forgot-password" className="a">¿Olvidaste tu contraseña?</Link>
            </div>

            <button className="btnPrimary" disabled={loading} form={tab === 'client' ? 'form-client' : 'form-petmate'}>
              {loading ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        .page { min-height: calc(100vh - 200px); display:flex; align-items:center; justify-content:center; padding:2rem; }
        .wrap { width:100%; max-width: 420px; }
        .card { background: var(--card, #fff); border: 1px solid rgba(0,0,0,.08); border-radius: 14px; padding: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,.04); }
        .tabs { display:grid; grid-template-columns:1fr 1fr; gap:.5rem; background: var(--muted,#f6f7f9); padding:.5rem; border-radius: 10px; }
        .tab { appearance:none; border:0; padding:.6rem 1rem; border-radius:8px; background:transparent; font-weight:600; cursor:pointer; }
        .tab.active { background:#fff; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.08) inset; }
        .title { font-size: 1.5rem; font-weight:700; margin:.5rem 0 0; }
        .subtitle { color:#6b7280; margin:.25rem 0 1rem; }
        .grid { display:grid; gap:.75rem; }
        .field { display:grid; gap:.35rem; }
        label { font-size:.9rem; font-weight:600; }
        input { height:42px; padding:0 .8rem; border:1px solid #e5e7eb; border-radius:8px; }
        input:focus { outline:none; border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08); }
        .btnPrimary { width:100%; height:44px; margin-top:.5rem; border-radius:10px; font-weight:700; background:#111827; color:#fff; border:none; cursor:pointer; }
        .btnPrimary[disabled] { opacity:.7; cursor:default; }
        .helper { display:flex; gap:.5rem; align-items:center; justify-content:space-between; font-size:.9rem; }
        .a { color:#111827; text-decoration:underline; }
        .error { color:#b91c1c; font-size:.9rem; margin-top:.5rem; }
        .footerLinks { margin-top:.5rem; text-align:center; }
      `}</style>
    </>
  )
}

function AuthForm({
  title,
  subtitle,
  onSubmit,
  registerHref,
}: {
  title: string
  subtitle: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  registerHref: string
}) {
  // id único por accesibilidad/submit externo
  const formId = React.useId()
  return (
    <form id={formId} className="grid" onSubmit={onSubmit}>
      <h1 className="title">{title}</h1>
      <p className="subtitle">{subtitle}</p>

      <div className="field">
        <label htmlFor={`${formId}-email`}>Correo</label>
        <input id={`${formId}-email`} name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required />
      </div>

      <div className="field">
        <label htmlFor={`${formId}-password`}>Contraseña</label>
        <input id={`${formId}-password`} name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
      </div>

      <div className="helper">
        <div />
        <Link href={registerHref} className="a">¿No tienes cuenta? Regístrate</Link>
      </div>
    </form>
  )
}
