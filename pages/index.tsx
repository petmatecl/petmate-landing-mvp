import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { mapJoinToServiceResult } from "../lib/serviceMapper";
import { ServiceResult } from "../components/Explore/ServiceCard";
import { COMUNAS_CHILE } from "../lib/comunas";
import {
  Home, Sun, Footprints, MapPin, Scissors, Award, Stethoscope, Car,
  ShieldCheck, UserCheck, MessageCircle, Search, FileText, UserPlus, PlusCircle, Users, IdCard, ClipboardCheck, Star,
  CheckCircle2, Shield
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

import SearchBar from "../components/Home/SearchBar";
import ServiceCard from "../components/Home/ServiceCard";
import StepCard from "../components/Home/StepCard";
import TestimonialCard from "../components/Home/TestimonialCard";

// ─── PrelaunchDemandCapture ─────────────────────────────────────────────────
function PrelaunchDemandCapture() {
  const [email, setEmail] = useState('');
  const [comuna, setComuna] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const res = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, comuna, rol: 'tutor' }),
      });
      const data = await res.json();

      if (data.ok) {
        setDone(true);
      } else {
        toast.error('No pudimos guardar tu correo, intenta de nuevo');
      }
    } catch (err) {
      toast.error('No pudimos guardar tu correo, intenta de nuevo');
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-y border-slate-200">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-black text-slate-900 mb-4">Sé el primero en enterarte</h2>
        <p className="text-slate-600 max-w-xl mx-auto mb-8">
          Estamos activando proveedores verificados en cada categoría y comuna. Deja tu correo y te avisamos cuando haya opciones disponibles cerca tuyo.
        </p>

        {done ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-10">
            <p className="text-emerald-800 font-bold text-lg">¡Listo! Te avisamos en cuanto haya proveedores en tu zona.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              required
              placeholder="Tu correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 h-12 px-4 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-400 transition-colors"
            />
            <select
              value={comuna}
              onChange={e => setComuna(e.target.value)}
              className="h-12 px-4 border border-slate-200 rounded-xl bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
            >
              <option value="">Mi comuna...</option>
              {COMUNAS_CHILE.slice(0, 20).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors text-sm shrink-0"
            >
              Avisarme
            </button>
          </form>
        )}
        <p className="text-xs text-slate-400 mt-4">Sin spam. Solo te contactamos cuando tengamos proveedores disponibles.</p>
      </div>
    </section>
  );
}

const FALLBACK_HOME: Record<string, string> = {
  hospedaje: "/images/categories/hospedaje.jpg",
  guarderia: "/images/categories/guarderia.jpg",
  paseos: "/images/categories/paseos.jpg",
  domicilio: "/images/categories/domicilio.jpg",
  peluqueria: "/images/categories/peluqueria.jpg",
  adiestramiento: "/images/categories/adiestramiento.jpg",
  veterinario: "/images/categories/veterinario.jpg",
  traslado: "/images/categories/traslado.jpg",
  default: "/images/categories/default.jpg",
};

function FranjaCategoria({
  categoria,
  servicios,
  onVerTodos,
}: {
  categoria: { slug: string; nombre: string; Icon: any };
  servicios: any[];
  onVerTodos: () => void;
}) {
  if (servicios.length === 0) return null;
  return (
    <div className="border-b border-slate-100">
      {/* Header de la franja */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <categoria.Icon className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">{categoria.nombre}</h2>
          <span className="text-xs text-slate-400 font-medium ml-1">
            {servicios.length} disponible{servicios.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onVerTodos}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
        >
          Ver todos →
        </button>
      </div>

      {/* Carrusel horizontal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {servicios.map((s: any) => {
            const foto = (s.fotos && s.fotos.length > 0) ? s.fotos[0]
              : s.proveedor_foto || FALLBACK_HOME[s.categoria_slug] || FALLBACK_HOME["default"];
            return (
              <a
                key={s.servicio_id ?? s.id}
                href={`/servicio/${s.servicio_id ?? s.id}`}
                className="shrink-0 w-44 snap-start group cursor-pointer"
              >
                <div className="w-44 h-44 rounded-xl overflow-hidden bg-slate-100 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto}
                    alt={s.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      const fallback = FALLBACK_HOME[s.categoria_slug] || FALLBACK_HOME["default"];
                      if (!img.src.endsWith(fallback)) {
                        img.src = fallback;
                      }
                    }}
                  />
                </div>
                <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                  {s.titulo}
                </p>
                {s.proveedor_comuna && (
                  <p className="text-xs text-slate-500 mt-0.5">{s.proveedor_comuna}</p>
                )}
                {s.precio_desde > 0 && (
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    ${s.precio_desde.toLocaleString("es-CL")}
                    <span className="text-xs font-normal text-slate-400"> /{s.unidad_precio}</span>
                  </p>
                )}
              </a>
            );
          })}

          {/* Card "Ver todos" al final */}
          <button
            onClick={onVerTodos}
            className="shrink-0 w-44 h-44 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors group snap-start"
          >
            <span className="text-3xl font-black group-hover:scale-110 transition-transform">→</span>
            <span className="text-xs font-semibold text-center px-3 leading-snug">
              Ver todos los {categoria.nombre.toLowerCase()}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface HomePageProps {
  featuredServices: any[];
  stats: {
    servicios: number;
    proveedores: number;
    comunas: number;
  };
  categoryCounts: Record<string, number>;
}

export default function HomePage({ featuredServices, stats, categoryCounts }: HomePageProps) {
  const router = useRouter();

  const categoriasEstaticas = [
    { slug: 'hospedaje', nombre: 'Hospedaje', descripcion: 'Tu mascota en un hogar de confianza', Icon: Home },
    { slug: 'guarderia', nombre: 'Guardería diurna', descripcion: 'Cuidado profesional durante el día', Icon: Sun },
    { slug: 'paseos', nombre: 'Paseo', descripcion: 'Paseos individuales o grupales cerca', Icon: Footprints },
    { slug: 'domicilio', nombre: 'Visita a domicilio', descripcion: 'El proveedor va a tu casa', Icon: MapPin },
    { slug: 'peluqueria', nombre: 'Peluquería', descripcion: 'Baño, corte y estética especializada', Icon: Scissors },
    { slug: 'adiestramiento', nombre: 'Adiestramiento', descripcion: 'Entrenamiento y corrección conductual', Icon: Award },
    { slug: 'veterinario', nombre: 'Veterinaria', descripcion: 'Consultas y atención médica cercana', Icon: Stethoscope },
    { slug: 'traslado', nombre: 'Traslado', descripcion: 'Transporte seguro para tu mascota', Icon: Car },
  ].map(cat => ({
    ...cat,
    count: categoryCounts[cat.slug] ?? 0,
    estado: ((categoryCounts[cat.slug] ?? 0) > 0 ? 'activa' : 'proxima') as 'activa' | 'proxima',
  }));

  const testimonios = [
    { nombre: "Valentina M.", ciudad: "Providencia, Santiago", mascota: "Border Collie", verificado: true, texto: "Encontré a la cuidadora de Nico en menos de diez minutos. Lo que más me convenció fue poder ver las reseñas y hablar directamente con ella antes de dejar a mi perro." },
    { nombre: "Rodrigo F.", ciudad: "Ñuñoa, Santiago", mascota: "Gato Maine Coon", verificado: true, texto: "Necesitaba alguien de confianza para Miso mientras viajaba. Pawnecta me permitió comparar opciones en mi comuna y elegir con calma. La comunicación fue directa y sin complicaciones." },
    { nombre: "Catalina R.", ciudad: "Las Condes, Santiago", mascota: "Golden Retriever", verificado: true, texto: "Me tranquiliza saber que los proveedores están verificados. Encontré paseador para Luna en el mismo barrio y quedé muy conforme con el servicio." },
    { nombre: "Ignacio V.", ciudad: "Maipú, Santiago", rol: "Paseador y proveedor", verificado: true, texto: "Publiqué mi servicio en menos de 20 minutos. Desde el primer día empecé a recibir consultas de dueños de mi misma comuna. Es la forma más simple que he encontrado de crecer." }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Pawnecta — Servicios para mascotas en Chile | Proveedores verificados</title>
        <meta name="description" content="Encuentra cuidadores, paseadores, peluqueros y veterinarios verificados cerca de ti. Busca por comuna, compara perfiles y contacta directo. Gratis en lanzamiento." />
        <link rel="canonical" href="https://pawnecta.com" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pawnecta.com" />
        <meta property="og:title" content="Pawnecta — Servicios para mascotas en Chile" />
        <meta property="og:description" content="Encuentra cuidadores, paseadores y veterinarios verificados cerca de ti." />
        <meta property="og:image" content="https://pawnecta.com/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pawnecta — Servicios para mascotas en Chile" />
        <meta name="twitter:description" content="Proveedores verificados en tu comuna." />
        <meta name="twitter:image" content="https://pawnecta.com/og-image.jpg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Pawnecta",
              "url": "https://pawnecta.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://pawnecta.com/explorar?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </Head>

      {/* ═══════════════════════════════════════════
          SECCIÓN 1 — HERO
          fondo slate-50, dos columnas
      ═══════════════════════════════════════════ */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20
                        flex flex-col lg:flex-row items-center gap-10">

          {/* Texto + buscador */}
          <div className="flex-1 max-w-xl w-full">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900
                           leading-tight mb-4">
              Servicios para tu mascota,{" "}
              <span className="text-emerald-600">cerca de ti</span>
            </h1>
            <p className="text-lg text-slate-500 mb-8">
              Proveedores verificados en tu comuna. Compara, contacta y coordina directo.
            </p>
            <SearchBar variant="hero" />
            <p className="text-sm text-slate-400 mt-4">
              ¿Ofreces servicios para mascotas?{" "}
              <Link href="/register?rol=proveedor"
                className="text-emerald-600 font-semibold hover:underline">
                Publica gratis →
              </Link>
            </p>
            <div className="flex flex-wrap gap-4 mt-6">
              {[
                { Icon: CheckCircle2, label: "Proveedores verificados" },
                { Icon: Shield, label: "Revisión por Pawnecta" },
                { Icon: MessageCircle, label: "Contacto directo" },
              ].map(({ Icon, label }) => (
                <div key={label}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  <Icon className="w-4 h-4 text-emerald-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Imagen */}
          <div className="flex-1 w-full max-w-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-perro.jpg"
              alt="Mascota con su dueña"
              className="w-full h-64 lg:h-[400px] object-cover rounded-3xl shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECCIÓN 2 — FRANJAS POR CATEGORÍA (cuerpo principal)
          Una franja por cada categoría con servicios activos.
          Patrón idéntico a MercadoLibre.
      ═══════════════════════════════════════════ */}
      {(() => {
        if (!featuredServices || featuredServices.length === 0) return <PrelaunchDemandCapture />;
        const porCategoria: Record<string, any[]> = {};
        featuredServices.forEach((s: any) => {
          const slug = s.categoria_slug || 'default';
          if (!porCategoria[slug]) porCategoria[slug] = [];
          if (porCategoria[slug].length < 10) porCategoria[slug].push(s);
        });
        const categoriasConServicios = categoriasEstaticas.filter(
          (c) => (porCategoria[c.slug] || []).length > 0
        );
        if (categoriasConServicios.length === 0) return <PrelaunchDemandCapture />;
        return (
          <div className="bg-white">
            {categoriasConServicios.map((cat) => (
              <FranjaCategoria
                key={cat.slug}
                categoria={cat}
                servicios={porCategoria[cat.slug] || []}
                onVerTodos={() => router.push(`/explorar?categoria=${cat.slug}`)}
              />
            ))}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════
          SECCIÓN 3 — GRID DE CATEGORÍAS (acceso secundario)
          Compacto, cerca del final — patrón ML
      ═══════════════════════════════════════════ */}
      <section className="bg-slate-50 border-y border-slate-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Explorar por categoría</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categoriasEstaticas.map((cat) => {
              const isProxima = cat.estado === 'proxima';
              return (
                <button
                  key={cat.slug}
                  onClick={() => !isProxima && router.push(`/explorar?categoria=${cat.slug}`)}
                  disabled={isProxima}
                  className={`
                    group flex flex-col items-center gap-2 p-4 rounded-2xl border
                    transition-all duration-200 text-center
                    ${isProxima
                      ? 'bg-white border-slate-100 opacity-50 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                    }
                  `}
                >
                  <div className={`
                    w-11 h-11 rounded-xl flex items-center justify-center
                    ${isProxima ? 'bg-slate-100' : 'bg-emerald-50 group-hover:bg-emerald-100'}
                    transition-colors
                  `}>
                    <cat.Icon className={`w-5 h-5 ${isProxima ? 'text-slate-400' : 'text-emerald-600'}`} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 leading-tight">
                    {cat.nombre}
                  </span>
                  {!isProxima && cat.count > 0 && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700
                                     px-1.5 py-0.5 rounded-full">
                      {cat.count}
                    </span>
                  )}
                  {isProxima && (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-400
                                     px-1.5 py-0.5 rounded-full">
                      Pronto
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECCIÓN 4 — CÓMO FUNCIONA (DUEÑOS) — sin cambios
      ═══════════════════════════════════════════ */}
      <section aria-label="Como funciona para duenos de mascotas" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center border-b border-slate-100">
        <div className="mb-16">
          <p className="text-emerald-700 font-bold uppercase tracking-widest text-sm mb-3">Para dueños de mascotas</p>
          <h2 className="text-3xl font-black text-slate-900">Encuentra al proveedor ideal en minutos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard paso={1} titulo="Busca por servicio y comuna" descripcion="Filtra por el servicio que necesitas y encuentra proveedores cerca de ti" Icon={Search} variante="light" />
          <StepCard paso={2} titulo="Compara perfiles y reseñas" descripcion="Revisa la experiencia, fotos y evaluaciones de cada proveedor" Icon={FileText} variante="light" />
          <StepCard paso={3} titulo="Contacta y coordina directo" descripcion="Escribe al proveedor por el chat interno y coordina los detalles" Icon={MessageCircle} variante="light" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECCIÓN 5 — CONFIANZA / TESTIMONIOS — sin cambios
      ═══════════════════════════════════════════ */}
      {stats.proveedores >= 1 ? (
        <section aria-label="Verificacion de proveedores y testimonios" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-slate-900 mb-10">Proveedores que puedes conocer</h2>
              <div className="flex flex-col md:flex-row justify-center items-start md:items-center gap-8 md:gap-12 bg-slate-900 p-8 md:px-12 rounded-3xl mb-12 max-w-5xl mx-auto text-left md:text-center">
                <div className="flex flex-col items-start md:items-center md:flex-1">
                  <IdCard className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-white mb-2">Verificación de identidad</h4>
                  <p className="text-sm text-slate-300">RUT validado y revisión manual del equipo Pawnecta antes de activar cada perfil</p>
                </div>
                <div className="hidden md:block w-px h-24 bg-slate-700" />
                <div className="flex flex-col items-start md:items-center md:flex-1">
                  <ClipboardCheck className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-white mb-2">Revisión del equipo</h4>
                  <p className="text-sm text-slate-300">El equipo de Pawnecta revisa y aprueba cada solicitud</p>
                </div>
                <div className="hidden md:block w-px h-24 bg-slate-700" />
                <div className="flex flex-col items-start md:items-center md:flex-1">
                  <Star className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-white mb-2">Reseñas reales</h4>
                  <p className="text-sm text-slate-300">Solo dueños que contactaron al proveedor pueden dejar evaluaciones</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {testimonios.map((testimonio, idx) => (
                <TestimonialCard key={`testimonio-${idx}`} {...testimonio} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-4">Únete a nuestra red de proveedores</h2>
            <p className="text-slate-600 mb-8">Sé de los primeros proveedores en ofrecer tus servicios en tu comuna</p>
            <Link href="/register?rol=proveedor"
              className="inline-flex items-center justify-center h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-8 text-base font-semibold text-white shadow-sm transition-colors">
              Registrarse como proveedor
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          SECCIÓN 6 — CÓMO FUNCIONA (PROVEEDORES) — sin cambios
      ═══════════════════════════════════════════ */}
      <section aria-label="Como funciona para proveedores" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm mb-3">Para proveedores</p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Ofrece tus servicios en Pawnecta</h2>
            <p className="text-slate-300 mt-4 text-lg">Sin comisiones durante el lanzamiento</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <StepCard paso={1} titulo="Crea tu perfil" descripcion="Regístrate, verifica tu identidad y completa tu información profesional" Icon={UserPlus} variante="dark" />
            <StepCard paso={2} titulo="Publica tus servicios" descripcion="Describe lo que ofreces, define tu precio y activa tu vitrina" Icon={PlusCircle} variante="dark" />
            <StepCard paso={3} titulo="Recibe consultas directo" descripcion="Los dueños te contactan por el chat interno y tú coordinas todo" Icon={Users} variante="dark" />
          </div>
          <div className="text-center flex flex-col items-center">
            <Link href="/register?rol=proveedor"
              className="inline-flex items-center justify-center h-14 rounded-2xl border-2 border-white px-8 text-base font-semibold text-white hover:bg-white/10 transition-colors shadow-lg shadow-black/20">
              Publicar mi servicio
            </Link>
            <p className="mt-4 text-slate-400 text-sm">Gratis durante el lanzamiento.</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECCIÓN 7 — CTA FINAL + STATS — sin cambios
      ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">¿Buscas un servicio para tu mascota?</h2>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">Explora proveedores verificados en tu comuna ahora.</p>
          <button
            onClick={() => router.push('/explorar')}
            className="inline-flex items-center justify-center h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-10 text-lg font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all mb-4">
            Buscar servicios
          </button>
          <p className="text-slate-500 font-medium mb-16">Sin registro. Sin costo.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto border-t border-slate-200 pt-16">
            <div className="flex flex-col items-center justify-center p-4">
              <div className="text-5xl font-black text-emerald-700 mb-3 tracking-tighter">{stats.proveedores}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Proveedores activos</div>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <div className="text-5xl font-black text-emerald-700 mb-3 tracking-tighter">{stats.comunas}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Comunas disponibles</div>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <div className="text-5xl font-black text-emerald-700 mb-3 tracking-tighter">8</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Categorías de servicio</div>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <div className="text-2xl font-black text-emerald-700 mb-3 tracking-tight leading-tight">Sin comisiones</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Durante el lanzamiento</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export async function getStaticProps() {
  let featuredServices: ServiceResult[] = [];
  try {
    const { data } = await supabase
      .from('servicios_publicados')
      .select(`
        *,
        proveedor:proveedores(nombre, apellido_p, foto_perfil, comuna),
        categoria:categorias_servicio(nombre, icono, slug)
      `)
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(120);
    if (data) {
      const mapped = data.map(mapJoinToServiceResult);
      featuredServices = [
        ...mapped.filter(s => s.fotos && s.fotos.length > 0),
        ...mapped.filter(s => !s.fotos || s.fotos.length === 0),
      ];
    }
  } catch (error) {
    console.error("Error fetching featured services:", error);
  }

  let countServicios = 0;
  let countProveedores = 0;
  let comunasUnicas = new Set<string>();

  try {
    const { count: sCount } = await supabase
      .from("servicios_publicados")
      .select("*", { count: "exact", head: true })
      .eq("activo", true);
    countServicios = sCount || 0;

    const { count: pCount } = await supabase
      .from("proveedores")
      .select("*", { count: "exact", head: true })
      .eq("estado", "aprobado");
    countProveedores = pCount || 0;

    const { data: comunasData } = await supabase
      .from("proveedores")
      .select("comunas_cobertura, comuna")
      .eq("estado", "aprobado");

    if (comunasData) {
      comunasData.forEach(p => {
        const comunas = (Array.isArray(p.comunas_cobertura) && p.comunas_cobertura.length > 0)
          ? p.comunas_cobertura
          : (p.comuna ? [p.comuna] : []);
        comunas.forEach((c: string) => comunasUnicas.add(c));
      });
    }
  } catch (err) {
    console.error("Error fetching stats:", err);
  }

  const statsObj = {
    servicios: countServicios || 0,
    proveedores: countProveedores || 0,
    comunas: comunasUnicas.size || 0,
  };

  let categoryCounts: Record<string, number> = {};
  try {
    const { data: catData } = await supabase
      .from('servicios_publicados')
      .select('categoria:categorias_servicio(slug)')
      .eq('activo', true);
    if (catData) {
      catData.forEach((row: any) => {
        const slug = row.categoria?.slug;
        if (slug) categoryCounts[slug] = (categoryCounts[slug] ?? 0) + 1;
      });
    }
  } catch (err) {
    console.error('Error fetching category counts:', err);
  }

  return {
    props: {
      featuredServices,
      stats: statsObj,
      categoryCounts,
    },
    revalidate: 30,
  };
}
