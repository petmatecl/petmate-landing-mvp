import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Search, Briefcase, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { validateRut, formatRut } from "../lib/rutValidation";

type Role = "usuario" | "proveedor";

const CATEGORIES = [
  { value: 'hospedaje', label: 'Hospedaje' },
  { value: 'guarderia-diurna', label: 'Guardería Diurna' },
  { value: 'paseo', label: 'Paseo de Perros' },
  { value: 'visita-domicilio', label: 'Visita a Domicilio' },
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'adiestramiento', label: 'Adiestramiento' },
  { value: 'veterinaria', label: 'Veterinaria' },
  { value: 'traslado', label: 'Traslado' },
];

export default function RegisterWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Role
  const [rol, setRol] = useState<Role | null>(null);

  // Step 2: Personal Info
  const [nombre, setNombre] = useState('');
  const [apellidoP, setApellidoP] = useState('');
  const [apellidoM, setApellidoM] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Step 3: Provider Info
  const [rut, setRut] = useState('');
  const [comuna, setComuna] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const proceedToStep2 = () => {
    if (!rol) {
      setError("Por favor, selecciona el tipo de cuenta que quieres crear.");
      return;
    }
    setError("");
    setStep(2);
  };

  const proceedToNextStep = () => {
    setError("");
    if (!nombre || !apellidoP || !email || !password || !passwordConfirm) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (rol === "proveedor") {
      setStep(3);
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setError("");

    if (rol === 'proveedor') {
      if (!rut || !comuna || !categoria) {
        setError("Por favor completa los campos obligatorios (RUT, Comuna y Categoría).");
        return;
      }
      if (!validateRut(rut)) {
        setError("El RUT ingresado no es válido.");
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("No se pudo obtener el ID del usuario.");

      // 2. Insert into respective tables
      if (rol === 'usuario') {
        const { error: insertError } = await supabase.from('usuarios_buscadores').insert([{
          auth_user_id: userId,
          nombre: nombre.trim(),
          apellido_p: apellidoP.trim(),
          apellido_m: apellidoM.trim() || null,
        }]);
        if (insertError) {
          console.error("Insert error in usuarios_buscadores:", insertError);
          throw new Error("Error guardando datos de usuario");
        }
      } else if (rol === 'proveedor') {
        const { error: insertError } = await supabase.from('proveedores').insert([{
          auth_user_id: userId,
          nombre: nombre.trim(),
          apellido_p: apellidoP.trim(),
          apellido_m: apellidoM.trim() || null,
          rut: formatRut(rut),
          comuna: comuna.trim(),
          roles: ['proveedor'],
          estado: 'pendiente'
        }]);
        if (insertError) {
          console.error("Insert error in proveedores:", insertError);
          throw new Error("Error guardando datos de proveedor");
        }
      }

      // 3. Trigger Welcome Email API
      await fetch('/api/auth/welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          nombre: nombre.trim(),
          rol
        }),
      });

      // 4. Move to Success Screen
      setStep(4);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || 'Error al completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const getTotalSteps = () => rol === 'proveedor' ? 4 : 3;

  return (
    <>
      <Head>
        <title>Crear Cuenta — Pawnecta</title>
        <meta name="description" content="Únete a Pawnecta. Encuentra o publica servicios para mascotas en tu comuna." />
      </Head>

      <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-100 p-6 sm:px-10 flex flex-col items-center">
            <h1 className="text-2xl font-bold text-slate-800">Crea tu cuenta en Pawnecta</h1>
            {step < 4 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full ${step >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>1</span>
                <div className={`w-10 h-[2px] ${step >= 2 ? 'bg-emerald-200' : 'bg-slate-200'}`}></div>
                <span className={`w-8 h-8 flex items-center justify-center rounded-full ${step >= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>2</span>

                {rol === 'proveedor' && (
                  <>
                    <div className={`w-10 h-[2px] ${step >= 3 ? 'bg-emerald-200' : 'bg-slate-200'}`}></div>
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full ${step >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>3</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-6 sm:px-10 sm:py-8">
            {error && (
              <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="animate-fade-in space-y-4">
                <div className="text-center mb-8">
                  <h2 className="text-lg font-semibold text-slate-800">¿Cómo quieres usar Pawnecta?</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRol('usuario')}
                    className={`flex flex-col items-center text-center p-6 border-2 rounded-2xl transition-all ${rol === 'usuario' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}
                  >
                    <div className={`p-4 rounded-full mb-4 ${rol === 'usuario' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <Search size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Busco servicios</h3>
                    <p className="text-sm text-slate-600">Encuentra proveedores verificados en tu comuna</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRol('proveedor')}
                    className={`flex flex-col items-center text-center p-6 border-2 rounded-2xl transition-all ${rol === 'proveedor' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}
                  >
                    <div className={`p-4 rounded-full mb-4 ${rol === 'proveedor' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <Briefcase size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Ofrezco servicios</h3>
                    <p className="text-sm text-slate-600">Publica tus servicios y recibe consultas directo</p>
                  </button>
                </div>

                <div className="pt-6">
                  <button
                    onClick={proceedToStep2}
                    className="w-full bg-emerald-700 text-white font-semibold py-4 rounded-xl hover:bg-emerald-800 transition-colors"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Personal Info (Both Roles) */}
            {step === 2 && (
              <div className="animate-fade-in space-y-5">
                <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Tus datos personales</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Paterno *</label>
                    <input type="text" value={apellidoP} onChange={e => setApellidoP(e.target.value)} required className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Materno (Opcional)</label>
                  <input type="text" value={apellidoM} onChange={e => setApellidoM(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <span className="text-xs text-slate-500 mt-1 block">Mínimo 8 caracteres</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña *</label>
                    <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required minLength={8} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button onClick={() => setStep(1)} className="w-1/3 border border-slate-300 text-slate-700 font-semibold py-4 rounded-xl hover:bg-slate-50 transition-colors">Atrás</button>
                  <button onClick={proceedToNextStep} disabled={loading} className="w-2/3 bg-emerald-700 text-white font-semibold py-4 rounded-xl hover:bg-emerald-800 transition-colors disabled:opacity-50">
                    {loading ? "Procesando..." : rol === "proveedor" ? "Siguiente" : "Crear Cuenta"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Provider Info (Only if Provider) */}
            {step === 3 && rol === 'proveedor' && (
              <div className="animate-fade-in space-y-5">
                <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Información del Proveedor</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RUT *</label>
                    <input type="text" value={rut} onChange={e => setRut(formatRut(e.target.value))} required placeholder="12.345.678-9" className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Comuna donde operas *</label>
                    <input type="text" value={comuna} onChange={e => setComuna(e.target.value)} required placeholder="Ej: Providencia" className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría Principal *</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} required className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="" disabled>Selecciona una categoría</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción breve (Opcional)</label>
                  <textarea
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    maxLength={200}
                    rows={3}
                    placeholder="Cuéntanos brevemente sobre tu experiencia (max 200 caracteres)"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                  <div className="text-right text-xs text-slate-400 mt-1">{descripcion.length}/200</div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button onClick={() => setStep(2)} disabled={loading} className="w-1/3 border border-slate-300 text-slate-700 font-semibold py-4 rounded-xl hover:bg-slate-50 transition-colors">Atrás</button>
                  <button onClick={handleFinalSubmit} disabled={loading} className="w-2/3 bg-emerald-700 text-white font-semibold py-4 rounded-xl hover:bg-emerald-800 transition-colors disabled:opacity-50">
                    {loading ? "Creando cuenta..." : "Enviar Solicitud"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Success Message */}
            {step === 4 && (
              <div className="animate-fade-in text-center py-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">¡Registro Exitoso!</h2>

                {rol === 'usuario' ? (
                  <p className="text-slate-600 mb-8 max-w-md mx-auto">
                    Hemos enviado un mensaje de bienvenida a tu correo. Revisa tu bandeja de entrada o carpeta de spam para verificar tu cuenta y comenzar a explorar servicios.
                  </p>
                ) : (
                  <p className="text-slate-600 mb-8 max-w-md mx-auto">
                    Hemos recibido tu solicitud. Nuestro equipo revisará tus datos en las próximas 24-48 horas y te notificaremos por correo electrónico cuando tu perfil esté aprobado.
                  </p>
                )}

                <button
                  onClick={() => router.push('/')}
                  className="bg-emerald-700 text-white font-semibold py-3 px-8 rounded-xl hover:bg-emerald-800 transition-colors inline-block"
                >
                  Volver al Inicio
                </button>
              </div>
            )}

          </div>
        </div>

        {step < 4 && (
          <div className="mt-8 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta? <Link href="/login" className="text-emerald-700 font-semibold hover:underline">Inicia sesión aquí</Link>
          </div>
        )}
      </main>
    </>
  );
}
