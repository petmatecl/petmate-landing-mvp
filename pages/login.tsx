// pages/login.tsx
import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { resetInactivityTimer } from "../lib/sessionTimeout";

const inputClass =
  "w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white placeholder:text-slate-400 transition-colors";

// Mapea el redirect path al copy contextual del banner. Mostrar "continuar
// donde estabas" generico cuando no matchea ningun prefijo conocido.
//
// Caso especial /proveedor: hay que diferenciar el panel propio (redirect
// exacto "/proveedor") de la ficha publica de OTRO proveedor (redirect
// "/proveedor/{id}") — antes ambos caian en startsWith('/proveedor') y
// mostraban "tu panel", lo cual era incorrecto en la ficha publica.
function getRedirectMessage(redirect: string): string {
  if (redirect === '/proveedor' || redirect === '/proveedor/') return 'Ingresa para continuar a tu panel.';
  if (redirect.startsWith('/proveedor/')) return 'Ingresa para continuar.';
  if (redirect.startsWith('/favoritos')) return 'Ingresa para ver tus favoritos.';
  if (redirect.startsWith('/explorar')) return 'Ingresa para retomar tu busqueda.';
  if (redirect.startsWith('/mensajes')) return 'Ingresa para ver tus mensajes.';
  if (redirect.startsWith('/admin')) return 'Ingresa para acceder al panel admin.';
  if (redirect.startsWith('/servicio/')) return 'Ingresa para continuar con este servicio.';
  return 'Ingresa para continuar donde estabas.';
}

// Sweep #1 finding [78]: valida redirect estricto contra el origen actual
// vía `new URL()` — cierra open-redirect en variantes que el guard viejo
// dejaba pasar: `/\evil.com`, `/%2F%2Fevil.com`, y cualquier otro path que
// se resuelva a otro origen. Devuelve solo path+search+hash relativos.
function safeRedirectFromQuery(raw: string | null): string | null {
  if (!raw) return null;
  if (typeof window === "undefined") return null;   // SSR: se re-evalúa al hidratar
  try {
    const target = new URL(raw, window.location.origin);
    if (target.origin !== window.location.origin) return null;
    if (!target.pathname.startsWith("/") || target.pathname.startsWith("//")) return null;
    return target.pathname + target.search + target.hash;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const rawRedirect = typeof router.query.redirect === "string" ? router.query.redirect : null;
  const redirect = safeRedirectFromQuery(rawRedirect);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Detecta el flag ?error=registro_fallido (viene de /email-confirmado tras
  // rollback de auth.users si el insert del perfil OAuth falla).
  const registroFallido = router.query.error === 'registro_fallido';

  // Detecta el flag ?reason=expired — viene del UserContext cuando la sesion
  // se cerro sin que el usuario haya hecho logout (token expiro o otra tab
  // cambio de cuenta), o de los 5 sitios de submit que capturan el 401 al
  // vuelo. Copy amable en tuteo, sin jerga. La ruta origen viaja en
  // `?redirect=` y el submit del login la retoma post-login.
  const sesionExpirada = router.query.reason === 'expired';

  React.useEffect(() => {
    if (router.query.timeout === "true") {
      setError("Por seguridad, tu sesión se cerró tras 10 minutos de inactividad.");
    }
  }, [router.query.timeout]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      setError("Ingresa tu correo y contraseña para continuar.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("activeRole");
      window.localStorage.removeItem("pawnecta_pending_role");
    }

    setLoading(true);
    setError(null);

    try {
      // Timeout de 8 segundos — si Supabase no responde, mostramos error inmediato
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 8000)
      );

      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]);

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError("Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada o carpeta de spam.");
        } else {
          setError("El correo o la contraseña no son correctos. Inténtalo de nuevo.");
        }
        return;
      }

      if (!data?.user) {
        setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
        return;
      }

      // Sprint session-timeout fix-de-fix (2026-08-25) — reset del
      // marker de inactividad post-login exitoso. Intención explícita
      // del user (submit del form con credenciales válidas). Cero
      // dependencia de events del SDK. Ver `lib/sessionTimeout.ts`.
      resetInactivityTimer();

      // Determinar destino según rol
      if (redirect) {
        window.location.replace(redirect);
      } else {
        // Check if user is a provider
        const { data: provData } = await supabase
          .from('proveedores')
          .select('id, estado')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();

        if (provData) {
          window.location.replace('/proveedor');
        } else {
          window.location.replace('/explorar');
        }
      }
    } catch (err: any) {
      if (err?.message === "TIMEOUT") {
        setError("La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.");
      } else {
        setError("No pudimos conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Iniciar sesión — Pawnecta</title>
        <meta name="description" content="Ingresa a tu cuenta de Pawnecta y accede a proveedores verificados para el cuidado de tu mascota." />
      </Head>

      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Banner cuando la sesion caduco — priorizado sobre el context
              banner de `redirect` porque comunica AQUE paso, no adonde vas. */}
          {sesionExpirada && (
            <div className="mb-5 px-4 py-3 bg-warning-50 border border-warning-200 rounded-xl text-sm text-warning-800">
              Tu sesión expiró. Vuelve a ingresar y te llevamos de nuevo a donde estabas.
            </div>
          )}

          {/* Context banner when coming from protected action.
              Ocultamos este cuando ya mostramos el de sesion expirada — el
              redirect_message quedaria redundante. */}
          {redirect && !sesionExpirada && (
            <div className="mb-5 px-4 py-3 bg-accent-50 border border-accent-200 rounded-xl text-sm text-accent-800">
              {getRedirectMessage(redirect)}
            </div>
          )}

          {/* Banner cuando OAuth registro falló y se hizo rollback de la sesión */}
          {registroFallido && (
            <div className="mb-5 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-800">
              Hubo un problema al completar tu registro. Por favor intenta de nuevo.
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Ingresa a tu cuenta</h1>
            <p className="text-sm text-slate-500 mb-7">
              Accede a tu red de proveedores verificados
            </p>

            {/* Config warning */}
            {process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") && (
              <div className="bg-warning-50 text-warning-800 p-4 rounded-xl mb-5 text-sm border border-warning-200">
                Advertencia: la base de datos no está configurada. Faltan variables de entorno de Supabase.
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail size={15} className="text-slate-400" />
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={inputClass}
                  placeholder="tu@correo.cl"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Lock size={15} className="text-slate-400" />
                    Contraseña
                  </label>
                  <Link href="/forgot-password" className="text-xs text-accent-700 hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    className={`${inputClass} pr-12`}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-danger-600 -mt-1" role="alert" aria-live="polite">
                  {error}
                </p>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              {/* Secondary link */}
              <p className="text-sm text-center text-slate-500 mt-1">
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="text-accent-700 font-semibold hover:underline">
                  Regístrate gratis
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>


    </>
  );
}
