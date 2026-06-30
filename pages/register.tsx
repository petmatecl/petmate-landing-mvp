import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  Search, Briefcase, CheckCircle2, Eye, EyeOff, ArrowLeft, Loader2,
  Stethoscope, Car, Scissors, GraduationCap, Home, Sun, Footprints, MapPin, Camera
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { validateRut, formatRut } from "../lib/rutValidation";
import { COMUNAS_CHILE, filtrarComunasPorTermino } from "../lib/comunas";

const CATEGORIA_ICONS: Record<string, React.ElementType> = {
  veterinario: Stethoscope,
  traslado: Car,
  peluqueria: Scissors,
  adiestramiento: GraduationCap,
  hospedaje: Home,
  guarderia: Sun,
  paseos: Footprints,
  domicilio: MapPin,
  fotografia: Camera,
};

type Role = "usuario" | "proveedor";

const CATEGORIES = [
  { value: 'cuidado', label: 'Cuidado y Hospedaje' },
  { value: 'guarderia', label: 'Guardería Diurna' },
  { value: 'paseos', label: 'Paseo de Perros' },
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'adiestramiento', label: 'Adiestramiento' },
  { value: 'veterinario', label: 'Veterinario a Domicilio' },
  { value: 'traslado', label: 'Traslado' },
  { value: 'fotografia', label: 'Fotografía de Mascotas' },
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
  const [tipoEntidad, setTipoEntidad] = useState<'persona_natural' | 'empresa'>('persona_natural');
  const [razonSocial, setRazonSocial] = useState('');
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [nombreFantasia, setNombreFantasia] = useState('');
  const [giro, setGiro] = useState('');
  const [apellidoP, setApellidoP] = useState('');
  const [apellidoM, setApellidoM] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [passwordConfirmError, setPasswordConfirmError] = useState('');

  // Step 3: Provider Info
  const [comunaQuery, setComunaQuery] = useState('');
  const [showComunaList, setShowComunaList] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [aceptaPolitica, setAceptaPolitica] = useState(false);

  // Sprint 4 Fase 1 / Commit 3: los datos dinamicos por categoria se
  // capturan al crear el primer servicio (campos en servicios_publicados.detalles),
  // no en el wizard de registro. Antes esto poblaba proveedores.datos_especificos
  // — ahora deprecado.
  const comunaRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // Ola 1 feat direcciones: match por "palabra empieza con" (no substring
  // "contiene") + normalizacion de tildes. Antes con 65 comunas no se
  // notaba; con 346 saltaban falsos positivos como "Vitacura" / "Quilicura"
  // al tipear "cur". Helper centralizado en lib/comunas.ts.
  const comunasFiltradas = filtrarComunasPorTermino(comunaQuery, COMUNAS_CHILE).slice(0, 8);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comunaRef.current && !comunaRef.current.contains(e.target as Node)) {
        setShowComunaList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-seleccionar rol desde query param ?rol=proveedor o ?rol=usuario
  useEffect(() => {
    if (!router.isReady) return;
    const queryRol = router.query.rol as string | undefined;
    if (queryRol === 'proveedor' || queryRol === 'usuario') {
      setRol(queryRol as Role);
      // Skip step 1 and go directly to step 2
      setStep(2);
    }
  }, [router.isReady, router.query.rol]);

  // Pre-fill categoría y comuna desde query params (placeholder cards link aquí
  // con /register?rol=proveedor&categoria=hospedaje&comuna=Las%20Condes)
  useEffect(() => {
    if (!router.isReady) return;
    const queryCategoria = router.query.categoria as string | undefined;
    const queryComuna = router.query.comuna as string | undefined;
    if (queryCategoria) setCategoria(queryCategoria);
    if (queryComuna) setComunaQuery(queryComuna);
  }, [router.isReady, router.query.categoria, router.query.comuna]);

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
    if (!nombre || !apellidoP || !apellidoM || !email || !password || !passwordConfirm) {
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

    if (rol === "proveedor" && tipoEntidad === "empresa") {
      if (!razonSocial || !rutEmpresa) {
        setError("Por favor completa los campos obligatorios de tu empresa.");
        return;
      }
      if (!validateRut(rutEmpresa)) {
        setError("El RUT de la empresa no es válido.");
        return;
      }
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
      if (!categoria) {
        setError('Por favor selecciona tu categoría principal de servicio.');
        return;
      }
    }

    if (rol === 'proveedor') {
      if (!comunaQuery.trim()) {
        setError('Por favor completa los campos obligatorios (Comuna).');
        return;
      }
      // Datos dinamicos por categoria ya no se validan en registro — se
      // llenaran cuando el proveedor cree su primer servicio (Sprint 4 Fase 1).
      if (!aceptaPolitica) {
        setError('Debes aceptar las políticas de publicación para continuar.');
        return;
      }
    }

    setLoading(true);

    // Timeout de seguridad: si el proceso tarda más de 30 segundos, resetea
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setError("La operación tardó demasiado. Verifica tu conexión e intenta nuevamente.");
    }, 30000);

    try {
      // 1. Call server-side signup API (rate-limited)
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          rol,
          nombre: nombre.trim(),
          apellido_p: apellidoP.trim(),
          apellido_m: apellidoM.trim() || undefined,
          ...(rol === 'proveedor' ? {
            comuna: comunaQuery.trim(),
            tipo_entidad: tipoEntidad,
            razon_social: tipoEntidad === 'empresa' ? razonSocial.trim() : undefined,
            rut_empresa: tipoEntidad === 'empresa' ? formatRut(rutEmpresa) : undefined,
            nombre_fantasia: tipoEntidad === 'empresa' ? nombreFantasia.trim() : undefined,
            giro: tipoEntidad === 'empresa' ? giro.trim() : undefined,
            // datos_especificos ya no se envia desde registro (Sprint 4 Fase 1
            // Commit 3: deprecado). Los detalles del rubro se llenan al crear
            // el primer servicio.
            descripcion: descripcion.trim() || undefined,
          } : {}),
        }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        if (signupRes.status === 429) {
          throw new Error('Demasiados intentos. Espera un momento antes de intentar nuevamente.');
        }
        throw new Error(signupData.error || 'Error al crear la cuenta.');
      }

      // 2. Move to Success Screen (welcome email is sent server-side)
      clearTimeout(safetyTimer);
      setStep(4);
    } catch (err: any) {
      clearTimeout(safetyTimer);
      console.error('Registration error:', err);
      setError(err.message || 'Error al completar el registro. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getTotalSteps = () => rol === 'proveedor' ? 4 : 3;

  const inputClass = "w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors";

  return (
    <>
      <Head>
        <title>Crear cuenta — Pawnecta</title>
        <meta name="description" content="Regístrate en Pawnecta. Crea tu cuenta gratis para encontrar o publicar servicios para mascotas en Chile." />
      </Head>

      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-10">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Progress header */}
          <div className="bg-slate-50 border-b border-slate-100 p-6 sm:px-10 flex flex-col items-center">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Crea tu cuenta en Pawnecta</h1>
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
              <div ref={errorRef} className="p-4 mb-6 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="animate-fade-in space-y-4">
                <div className="text-center mb-8">
                  <h2 className="text-lg font-semibold text-slate-700">¿Cómo quieres usar Pawnecta?</h2>
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
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Busco servicios</h3>
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
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Ofrezco servicios</h3>
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
                <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-100 pb-2">Tus datos personales</h2>

                {rol === 'proveedor' && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tipo de cuenta de proveedor
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button type="button"
                        onClick={() => setTipoEntidad("persona_natural")}
                        className={`p-4 rounded-xl border-2 text-left transition-colors ${tipoEntidad === "persona_natural"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <p className="font-semibold text-slate-900 text-sm">Persona Natural</p>
                        <p className="text-xs text-slate-500 mt-0.5">Actúas como individuo, con tu RUT personal</p>
                      </button>
                      <button type="button"
                        onClick={() => setTipoEntidad("empresa")}
                        className={`p-4 rounded-xl border-2 text-left transition-colors ${tipoEntidad === "empresa"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <p className="font-semibold text-slate-900 text-sm">Empresa o Emprendimiento</p>
                        <p className="text-xs text-slate-500 mt-0.5">SpA, EIRL, sociedad o marca registrada</p>
                      </button>
                    </div>
                  </div>
                )}

                {rol === 'proveedor' && tipoEntidad === 'empresa' && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                    <div>
                      <label htmlFor="razon-social" className="block text-sm font-medium text-slate-700 mb-1">Razón social *</label>
                      <input id="razon-social" name="razon-social" autoComplete="organization" type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Ej: Patitas Felices SpA" required className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="rut-empresa" className="block text-sm font-medium text-slate-700 mb-1">RUT de la empresa *</label>
                      <input id="rut-empresa" name="rut-empresa" autoComplete="off" type="text" value={rutEmpresa} onChange={e => setRutEmpresa(formatRut(e.target.value))} placeholder="Ej: 76.123.456-7" required maxLength={12} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="nombre-fantasia" className="block text-sm font-medium text-slate-700 mb-1">Nombre fantasía (marca)</label>
                      <input id="nombre-fantasia" name="nombre-fantasia" autoComplete="organization" type="text" value={nombreFantasia} onChange={e => setNombreFantasia(e.target.value)} placeholder="Ej: Patitas Felices" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="giro" className="block text-sm font-medium text-slate-700 mb-1">Giro o rubro</label>
                      <input id="giro" name="giro" autoComplete="off" type="text" value={giro} onChange={e => setGiro(e.target.value)} placeholder="Ej: Servicios de cuidado de mascotas" className={inputClass} />
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                    <input id="nombre" name="nombre" autoComplete="given-name" type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="apellido-p" className="block text-sm font-medium text-slate-700 mb-1">Apellido Paterno *</label>
                    <input id="apellido-p" name="apellido-p" autoComplete="family-name" type="text" value={apellidoP} onChange={e => setApellidoP(e.target.value)} required className={inputClass} />
                  </div>
                </div>

                <div>
                  <label htmlFor="apellido-m" className="block text-sm font-medium text-slate-700 mb-1">Apellido Materno *</label>
                  <input id="apellido-m" name="apellido-m" autoComplete="family-name" type="text" value={apellidoM} onChange={e => setApellidoM(e.target.value)} required className={inputClass} />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico *</label>
                  <input id="email" name="email" autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className={`${inputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">Mínimo 8 caracteres</span>
                  </div>
                  <div>
                    <label htmlFor="password-confirm" className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña *</label>
                    <div className="relative">
                      <input
                        id="password-confirm"
                        name="password-confirm"
                        autoComplete="new-password"
                        type={showPasswordConfirm ? "text" : "password"}
                        value={passwordConfirm}
                        onChange={e => { setPasswordConfirm(e.target.value); if (passwordConfirmError) setPasswordConfirmError(''); }}
                        onBlur={() => {
                          if (passwordConfirm && password !== passwordConfirm) {
                            setPasswordConfirmError('Las contraseñas no coinciden.');
                          } else {
                            setPasswordConfirmError('');
                          }
                        }}
                        required
                        minLength={8}
                        className={`${inputClass} pr-12 ${passwordConfirmError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showPasswordConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordConfirmError && (
                      <p className="text-xs text-red-600 mt-1 font-medium">{passwordConfirmError}</p>
                    )}
                  </div>
                </div>

                {/* Categoría — solo proveedores */}
                {rol === 'proveedor' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría principal de servicio *</label>
                    <select
                      value={categoria}
                      onChange={e => setCategoria(e.target.value)}
                      required
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="" disabled>Selecciona una categoría</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Podrás agregar más categorías desde tu panel después de ser aprobado.</p>
                  </div>
                )}

                <div className="pt-6 flex gap-3">
                  <button onClick={() => setStep(1)} className="w-1/3 border border-slate-300 text-slate-700 font-semibold py-4 rounded-xl hover:bg-slate-50 transition-colors">Atrás</button>
                  <button onClick={proceedToNextStep} disabled={loading} className="w-2/3 bg-emerald-700 text-white font-semibold py-4 rounded-xl hover:bg-emerald-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> Procesando...</>
                    ) : rol === "proveedor" ? "Siguiente" : "Crear Cuenta"}
                  </button>
                </div>
                {rol === 'usuario' && (
                  <p className="text-xs text-slate-500 text-center mt-3">
                    Al crear tu cuenta aceptas los{' '}
                    <Link href="/terminos" target="_blank" className="text-emerald-700 hover:underline">Términos y Condiciones</Link>
                    {' '}y la{' '}
                    <Link href="/privacidad" target="_blank" className="text-emerald-700 hover:underline">Política de Privacidad</Link>.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Provider Info (Only if Provider) */}
            {step === 3 && rol === 'proveedor' && (
              <div className="animate-fade-in space-y-5">
                <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-100 pb-2">Cuéntanos sobre tu servicio</h2>

                {/* Combobox de comunas */}
                <div ref={comunaRef}>
                  <label htmlFor="comuna" className="block text-sm font-medium text-slate-700 mb-1">¿Dónde ofreces tus servicios? *</label>
                  <div className="relative">
                    <input
                      id="comuna"
                      name="comuna"
                      type="text"
                      value={comunaQuery}
                      onChange={e => { setComunaQuery(e.target.value); setShowComunaList(true); }}
                      onFocus={() => setShowComunaList(true)}
                      placeholder="Escribe tu comuna..."
                      autoComplete="off"
                      className={inputClass}
                    />
                    {showComunaList && comunasFiltradas.length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {comunasFiltradas.map(c => (
                          <li key={c}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                              onMouseDown={() => { setComunaQuery(c); setShowComunaList(false); }}
                            >
                              {c}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Sprint 4 Fase 1: la captura de campos categoria-especificos se
                    movio al flujo de creacion de servicio (ServiceFormModal).
                    El proveedor define su rubro aqui en el wizard, pero los
                    detalles concretos (capacidad, certificaciones, etc.) viven
                    en servicios_publicados.detalles. */}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cuéntanos sobre tu experiencia (opcional)</label>
                  <textarea
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Ej: Tengo 5 años cuidando perros y gatos de raza..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors resize-none"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-slate-500">Mínimo 50 caracteres. Una buena descripción aumenta tus consultas.</p>
                    <span className="text-xs text-slate-400">{descripcion.length} / 500</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="politica"
                    checked={aceptaPolitica}
                    onChange={e => setAceptaPolitica(e.target.checked)}
                    className="mt-1 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="politica" className="text-sm text-slate-600 cursor-pointer">
                    Acepto los{' '}
                    <Link href="/terminos" target="_blank" className="text-emerald-700 hover:underline">
                      Términos y Condiciones
                    </Link>
                    {' '}y la{' '}
                    <Link href="/privacidad" target="_blank" className="text-emerald-700 hover:underline">
                      Política de Privacidad
                    </Link>
                    . Entiendo que mi perfil será revisado por el equipo de Pawnecta antes de ser publicado.
                  </label>
                </div>

                <div className="pt-2 flex gap-3">
                  <button onClick={() => setStep(2)} disabled={loading} className="w-1/3 border border-slate-300 text-slate-700 font-semibold py-4 rounded-xl hover:bg-slate-50 transition-colors">Atrás</button>
                  <button onClick={handleFinalSubmit} disabled={loading} className="w-2/3 bg-emerald-700 text-white font-semibold py-4 rounded-xl hover:bg-emerald-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> Creando cuenta...</>
                    ) : "Enviar Solicitud"}
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
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-4">¡Registro Exitoso!</h2>

                <p className="text-slate-600 mb-4 max-w-md mx-auto">
                  <strong>Revisa tu correo electrónico</strong> ({email}) y haz clic en el enlace de confirmación para activar tu cuenta.
                </p>
                {rol === 'usuario' ? (
                  <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm">
                    Una vez confirmado tu correo, podrás iniciar sesión y explorar servicios para tu mascota.
                  </p>
                ) : (
                  <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm">
                    Una vez confirmado tu correo, nuestro equipo revisará tus datos en las próximas 24-48 horas y te notificaremos cuando tu perfil esté aprobado.
                  </p>
                )}
                <p className="text-xs text-slate-400 mb-8 max-w-md mx-auto">
                  ¿No lo encuentras? Revisa tu carpeta de spam o correo no deseado.
                </p>

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
          <div className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-emerald-700 font-semibold hover:underline">
              Ingresa aquí
            </Link>
          </div>
        )}
      </div>


    </>
  );
}
