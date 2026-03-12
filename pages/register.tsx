import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  Search, Briefcase, CheckCircle2, Eye, EyeOff, ArrowLeft, Loader2,
  Stethoscope, Car, Scissors, GraduationCap, Home, Sun, Footprints, MapPin
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { validateRut, formatRut } from "../lib/rutValidation";
import { COMUNAS_CHILE } from "../lib/comunas";

type TipoCampo = 'text' | 'select' | 'boolean' | 'number';

interface CampoDinamico {
  key: string;
  label: string;
  tipo: "text" | "number" | "boolean" | "select" | "textarea" | "info";
  placeholder?: string;
  requerido?: boolean;
  opciones?: { value: string; label: string }[];
  condicionalDe?: string;
  condicionalValor?: string | boolean | number;
}

const CAMPOS_POR_CATEGORIA: Record<string, CampoDinamico[]> = {
  hospedaje: [
    { key: "tipo_vivienda", label: "Tipo de vivienda donde cuidas", tipo: "select", opciones: [{ value: "casa", label: "Casa" }, { value: "departamento", label: "Departamento" }], requerido: true },
    { key: "metros_espacio", label: "Metros cuadrados del espacio disponible para la mascota", tipo: "number", placeholder: "Ej: 30" },
    { key: "capacidad_maxima", label: "Capacidad maxima (mascotas simultaneas)", tipo: "number", placeholder: "Ej: 2", requerido: true },
    { key: "tiene_patio", label: "Tengo patio o jardin con acceso directo", tipo: "boolean" },
    { key: "piso_departamento", label: "Piso del departamento", tipo: "number", placeholder: "Ej: 5", condicionalDe: "tipo_vivienda", condicionalValor: "departamento" },
    { key: "tiene_mallas_seguridad", label: "Tengo mallas de seguridad en ventanas y balcones", tipo: "boolean", condicionalDe: "tipo_vivienda", condicionalValor: "departamento" },
    { key: "otras_mascotas_hogar", label: "Tengo mascotas propias en el hogar", tipo: "boolean" },
    { key: "tipo_mascotas_propias", label: "Que mascotas tienes? (describe)", tipo: "text", placeholder: "Ej: 1 gato castrado tranquilo", condicionalDe: "otras_mascotas_hogar", condicionalValor: true },
    { key: "tiene_ninos", label: "Hay ninos menores de 12 anos en el hogar", tipo: "boolean" },
    { key: "acepta_separacion", label: "Puedo mantener mascotas separadas si es necesario", tipo: "boolean" },
  ],
  domicilio: [
    { key: 'info_domicilio', label: 'Tú vas a la casa del cliente. No necesitas espacio propio para mascotas.', tipo: 'info' },
    { key: 'visitas_por_dia', label: 'Visitas por dia que puedes hacer', tipo: 'number', placeholder: 'Ej: 2', requerido: true },
    { key: 'duracion_visita', label: 'Duracion de cada visita (minutos)', tipo: 'number', placeholder: 'Ej: 45', requerido: true },
    { key: 'servicios_incluidos', label: 'Que incluye cada visita', tipo: 'text', placeholder: 'Ej: Alimentacion, paseo corto, limpieza' },
    { key: 'radio_cobertura_km', label: 'Radio maximo de cobertura (km desde tu comuna)', tipo: 'number', placeholder: 'Ej: 5' },
    { key: 'incluye_medicamentos', label: 'Puedo administrar medicamentos segun instrucciones', tipo: 'boolean' },
    { key: 'incluye_foto_reporte', label: 'Envio foto y reporte de cada visita', tipo: 'boolean' },
  ],
  paseos: [
    { key: "max_perros_simultaneos", label: "Maximo de perros simultaneos", tipo: "number", placeholder: "Ej: 3", requerido: true },
    { key: "duracion_minutos", label: "Duracion estandar del paseo (min)", tipo: "number", placeholder: "Ej: 45" },
    { key: "radio_cobertura_km", label: "Radio de cobertura en km desde tu comuna", tipo: "number", placeholder: "Ej: 3" },
    { key: "comunas_adicionales", label: "Otras comunas donde paseas (opcional)", tipo: "text", placeholder: "Ej: Nunoa, Macul" },
    { key: "acepta_razas_grandes", label: "Acepto razas grandes o de fuerza (rottweiler, pitbull, etc.)", tipo: "boolean" },
    { key: "usa_gps", label: "Uso GPS o app de seguimiento durante el paseo", tipo: "boolean" },
    { key: "envia_reporte_fotos", label: "Envio foto y reporte al dueno tras cada paseo", tipo: "boolean" },
  ],
  veterinario: [
    { key: "universidad", label: "Universidad donde estudio", tipo: "text", placeholder: "Ej: Universidad de Chile", requerido: true },
    { key: "anio_titulacion", label: "Ano de titulacion", tipo: "number", placeholder: "Ej: 2018" },
    { key: "numero_registro", label: "N de registro profesional", tipo: "text", placeholder: "Ej: 12345" },
    { key: "especialidad", label: "Especialidad (opcional)", tipo: "text", placeholder: "Ej: Dermatologia, Cirugia..." },
    { key: "radio_cobertura_km", label: "Radio maximo de cobertura a domicilio (km)", tipo: "number", placeholder: "Ej: 10" },
    { key: "comunas_cobertura", label: "Comunas donde atiendes a domicilio", tipo: "text", placeholder: "Ej: Providencia, Las Condes, Vitacura" },
    { key: "hace_urgencias", label: "Atencion de urgencias / horario extendido", tipo: "boolean" },
  ],
  traslado: [
    { key: "tipo_vehiculo", label: "Tipo de vehiculo", tipo: "select", opciones: [{ value: "auto", label: "Auto" }, { value: "van", label: "Van" }, { value: "furgon", label: "Furgon" }], requerido: true },
    { key: "radio_cobertura_km", label: "Radio maximo de cobertura (km)", tipo: "number", placeholder: "Ej: 20" },
    { key: "comunas_cobertura", label: "Comunas de origen y destino que cubres", tipo: "text", placeholder: "Ej: Todo Santiago, Region Metropolitana" },
    { key: "tiene_jaula", label: "Tengo jaula o transportin para el traslado", tipo: "boolean" },
    { key: "acepta_mascotas_grandes", label: "Acepto mascotas grandes (mas de 30kg)", tipo: "boolean" },
    { key: "capacidad_mascotas", label: "Capacidad maxima de mascotas por viaje", tipo: "number", placeholder: "Ej: 2" },
    { key: "tiene_empresa", label: "Opero con empresa o emito boleta", tipo: "boolean" },
  ],
  peluqueria: [
    { key: "anios_experiencia", label: "Anos de experiencia", tipo: "number", placeholder: "Ej: 5", requerido: true },
    { key: "atiende_en", label: "Donde atiendes", tipo: "select", opciones: [{ value: "local_propio", label: "En mi local propio" }, { value: "domicilio", label: "Voy al domicilio del cliente" }, { value: "ambos", label: "Ambas opciones" }], requerido: true },
    { key: "tiene_mesa_hidraulica", label: "Cuento con mesa hidraulica profesional", tipo: "boolean" },
    { key: "certificaciones", label: "Cursos o certificaciones", tipo: "text", placeholder: "Ej: Curso Groomex 2022, Especialidad Nordic" },
    { key: "razas_especiales", label: "Razas especiales que manejas (opcional)", tipo: "text", placeholder: "Ej: Poodle, Cocker, Schnauzer" },
    { key: "radio_cobertura_km", label: "Radio de cobertura si vas a domicilio (km)", tipo: "number", placeholder: "Ej: 5", condicionalDe: "atiende_en", condicionalValor: "domicilio" },
  ],
  adiestramiento: [
    { key: "metodo", label: "Metodo de adiestramiento", tipo: "select", opciones: [{ value: "positivo", label: "Refuerzo positivo" }, { value: "mixto", label: "Mixto" }, { value: "tradicional", label: "Tradicional" }], requerido: true },
    { key: "anios_experiencia", label: "Anos de experiencia", tipo: "number", placeholder: "Ej: 3" },
    { key: "modalidad", label: "Modalidad de trabajo", tipo: "select", opciones: [{ value: "individual", label: "Sesiones individuales" }, { value: "grupal", label: "Clases grupales" }, { value: "ambas", label: "Ambas modalidades" }], requerido: true },
    { key: "va_domicilio", label: "Puedo ir al domicilio del cliente", tipo: "boolean" },
    { key: "duracion_sesion", label: "Duracion de la sesion (minutos)", tipo: "number", placeholder: "Ej: 60" },
    { key: "certificacion", label: "Certificacion profesional", tipo: "text", placeholder: "Ej: CPDT-KA, IAA" },
    { key: "radio_cobertura_km", label: "Radio de cobertura si vas a domicilio (km)", tipo: "number", condicionalDe: "va_domicilio", condicionalValor: true },
  ],
  guarderia: [
    { key: "capacidad_maxima", label: "Capacidad maxima de mascotas simultaneas", tipo: "number", placeholder: "Ej: 5", requerido: true },
    { key: "horario", label: "Horario de atencion", tipo: "text", placeholder: "Ej: Lunes a viernes 8:00-18:00", requerido: true },
    { key: "tipo_guarderia", label: "Tipo de guarderia", tipo: "select", opciones: [{ value: "diurna", label: "Solo diurna (horas)" }, { value: "nocturna", label: "Incluye quedarse de noche" }, { value: "ambas", label: "Ambas opciones" }], requerido: true },
    { key: "tiene_patio", label: "Tengo patio o jardin con acceso directo", tipo: "boolean" },
    { key: "tiene_camara", label: "Tengo camara para que el dueno vea a su mascota", tipo: "boolean" },
    { key: "envia_fotos", label: "Envio fotos durante el dia al dueno", tipo: "boolean" },
  ],
};

const CATEGORIA_ICONS: Record<string, React.ElementType> = {
  veterinario: Stethoscope,
  traslado: Car,
  peluqueria: Scissors,
  adiestramiento: GraduationCap,
  hospedaje: Home,
  guarderia: Sun,
  paseos: Footprints,
  domicilio: MapPin,
};

type Role = "usuario" | "proveedor";

const CATEGORIES = [
  { value: 'hospedaje', label: 'Hospedaje' },
  { value: 'guarderia', label: 'Guardería Diurna' },
  { value: 'paseos', label: 'Paseo de Perros' },
  { value: 'domicilio', label: 'Cuidado en Casa del Cliente' },
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'adiestramiento', label: 'Adiestramiento' },
  { value: 'veterinario', label: 'Veterinario a Domicilio' },
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

  // Step 2+3: RUT (common)
  const [rut, setRut] = useState('');
  const [rutError, setRutError] = useState('');

  // Step 3: Provider Info
  const [comunaQuery, setComunaQuery] = useState('');
  const [showComunaList, setShowComunaList] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [aceptaPolitica, setAceptaPolitica] = useState(false);

  // Step 3: Datos dinámicos por categoría
  const [datosDinamicos, setDatosDinamicos] = useState<Record<string, any>>({});
  const setDatoDinamico = (key: string, value: any) =>
    setDatosDinamicos(prev => ({ ...prev, [key]: value }));
  const comunaRef = useRef<HTMLDivElement>(null);

  const comunasFiltradas = COMUNAS_CHILE.filter(c =>
    c.toLowerCase().includes(comunaQuery.toLowerCase())
  ).slice(0, 8);

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
    if (!rut) {
      setError("El RUT es obligatorio para registrarse.");
      return;
    }
    if (!validateRut(rut)) {
      setError("El RUT ingresado no es válido. Verifica el número y dígito verificador.");
      setRutError("RUT inválido — verifica el número y dígito verificador.");
      return;
    }
    setRutError('');

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
      // Validate required dynamic fields
      const campos = CAMPOS_POR_CATEGORIA[categoria] || [];
      for (const campo of campos) {
        if (campo.requerido && !datosDinamicos[campo.key]) {
          setError(`El campo «${campo.label}» es obligatorio.`);
          return;
        }
      }
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
          rut: formatRut(rut),
          ...(rol === 'proveedor' ? {
            comuna: comunaQuery.trim(),
            tipo_entidad: tipoEntidad,
            razon_social: tipoEntidad === 'empresa' ? razonSocial.trim() : undefined,
            rut_empresa: tipoEntidad === 'empresa' ? formatRut(rutEmpresa) : undefined,
            nombre_fantasia: tipoEntidad === 'empresa' ? nombreFantasia.trim() : undefined,
            giro: tipoEntidad === 'empresa' ? giro.trim() : undefined,
            datos_especificos: Object.keys(datosDinamicos).length > 0 ? datosDinamicos : undefined,
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

      <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-10">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Progress header */}
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

                {rol === 'proveedor' && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tipo de cuenta de proveedor
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button"
                        onClick={() => setTipoEntidad("persona_natural")}
                        className={`p-4 rounded-xl border-2 text-left transition-colors ${tipoEntidad === "persona_natural"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <p className="font-bold text-slate-900 text-sm">Persona Natural</p>
                        <p className="text-xs text-slate-500 mt-0.5">Actúas como individuo, con tu RUT personal</p>
                      </button>
                      <button type="button"
                        onClick={() => setTipoEntidad("empresa")}
                        className={`p-4 rounded-xl border-2 text-left transition-colors ${tipoEntidad === "empresa"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <p className="font-bold text-slate-900 text-sm">Empresa o Emprendimiento</p>
                        <p className="text-xs text-slate-500 mt-0.5">SpA, EIRL, sociedad o marca registrada</p>
                      </button>
                    </div>
                  </div>
                )}

                {rol === 'proveedor' && tipoEntidad === 'empresa' && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Razón social *</label>
                      <input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Ej: Patitas Felices SpA" required className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">RUT de la empresa *</label>
                      <input type="text" value={rutEmpresa} onChange={e => setRutEmpresa(formatRut(e.target.value))} placeholder="Ej: 76.123.456-7" required maxLength={12} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre fantasía (marca)</label>
                      <input type="text" value={nombreFantasia} onChange={e => setNombreFantasia(e.target.value)} placeholder="Ej: Patitas Felices" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Giro o rubro</label>
                      <input type="text" value={giro} onChange={e => setGiro(e.target.value)} placeholder="Ej: Servicios de cuidado de mascotas" className={inputClass} />
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Paterno *</label>
                    <input type="text" value={apellidoP} onChange={e => setApellidoP(e.target.value)} required className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Apellido Materno
                    <span className="ml-1.5 text-xs font-normal text-slate-400">(Opcional)</span>
                  </label>
                  <input type="text" value={apellidoM} onChange={e => setApellidoM(e.target.value)} className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">RUT *</label>
                  <input
                    type="text"
                    value={rut}
                    onChange={e => {
                      setRut(formatRut(e.target.value));
                      if (rutError) setRutError('');
                    }}
                    onBlur={() => {
                      if (rut && !validateRut(rut)) {
                        setRutError('RUT inválido — verifica el número y dígito verificador.');
                      } else {
                        setRutError('');
                      }
                    }}
                    required
                    placeholder="12.345.678-9"
                    maxLength={12}
                    className={`${inputClass} ${rutError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
                  />
                  {rutError ? (
                    <p className="text-xs text-red-600 mt-1 font-medium">{rutError}</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">Solo lo usamos para verificar tu identidad. No se muestra públicamente.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
                    <div className="relative">
                      <input
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña *</label>
                    <div className="relative">
                      <input
                        type={showPasswordConfirm ? "text" : "password"}
                        value={passwordConfirm}
                        onChange={e => setPasswordConfirm(e.target.value)}
                        required
                        minLength={8}
                        className={`${inputClass} pr-12`}
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
                  </div>
                </div>

                {/* Categoría — solo proveedores */}
                {rol === 'proveedor' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría principal de servicio *</label>
                    <select
                      value={categoria}
                      onChange={e => { setCategoria(e.target.value); setDatosDinamicos({}); }}
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
              </div>
            )}

            {/* Step 3: Provider Info (Only if Provider) */}
            {step === 3 && rol === 'proveedor' && (
              <div className="animate-fade-in space-y-5">
                <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Cuéntanos sobre tu servicio</h2>

                {/* Combobox de comunas */}
                <div ref={comunaRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">¿Dónde ofreces tus servicios? *</label>
                  <div className="relative">
                    <input
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
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
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

                {/* Campos dinámicos por categoría */}
                {categoria && CAMPOS_POR_CATEGORIA[categoria] && (() => {
                  const CatIcon = CATEGORIA_ICONS[categoria] ?? Briefcase;
                  return (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CatIcon size={16} className="text-emerald-600" />
                        Información específica de tu servicio
                      </h3>
                      {(() => {
                        const camposVisibles = CAMPOS_POR_CATEGORIA[categoria].filter(function (campo) {
                          if (!campo.condicionalDe) return true;
                          var valorActual = datosDinamicos[campo.condicionalDe];
                          return valorActual === campo.condicionalValor;
                        });

                        return camposVisibles.map(campo => (
                          <div key={campo.key}>
                            {campo.tipo === 'info' ? (
                              <p className="text-sm text-slate-600 mb-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 italic">
                                {campo.label}
                              </p>
                            ) : (
                              <>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  {campo.label}{campo.requerido && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {campo.tipo === 'boolean' ? (
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!datosDinamicos[campo.key]}
                                      onChange={e => setDatoDinamico(campo.key, e.target.checked)}
                                      className="w-5 h-5 rounded border-slate-300 accent-emerald-600"
                                    />
                                    <span className="text-sm text-slate-600">Sí</span>
                                  </label>
                                ) : campo.tipo === 'select' ? (
                                  <select
                                    value={datosDinamicos[campo.key] || ''}
                                    onChange={e => setDatoDinamico(campo.key, e.target.value)}
                                    className={`${inputClass} cursor-pointer`}
                                  >
                                    <option value="" disabled>Selecciona...</option>
                                    {campo.opciones?.map(op => (
                                      <option key={op.value} value={op.value}>{op.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={campo.tipo === 'number' ? 'number' : 'text'}
                                    value={datosDinamicos[campo.key] || ''}
                                    onChange={e => setDatoDinamico(campo.key, e.target.value)}
                                    placeholder={campo.placeholder}
                                    className={inputClass}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        ))
                      })()}
                    </div>
                  );
                })()}

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
                    Entiendo que mi perfil será revisado por el equipo de Pawnecta y que debo cumplir con las{' '}
                    <Link href="/terminos" target="_blank" className="text-emerald-700 hover:underline">
                      políticas de publicación
                    </Link>
                    {' '}para mantener mi cuenta activa.
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
                <h2 className="text-2xl font-bold text-slate-800 mb-4">¡Registro Exitoso!</h2>

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
      </main>


    </>
  );
}
