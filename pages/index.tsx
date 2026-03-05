import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/router";
import { GetStaticProps } from "next";
import { mapJoinToServiceResult } from "../lib/serviceMapper";
import { ServiceResult } from "../components/Explore/ServiceCard";
import {
  Home, Sun, Footprints, MapPin, Scissors, Award, Stethoscope, Car,
  ShieldCheck, UserCheck, MessageCircle, Search, FileText, UserPlus, PlusCircle, Users, IdCard, ClipboardCheck, Star,
  CheckCircle2, Shield
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

import SearchBar from "../components/Home/SearchBar";
import CategoryCard from "../components/Home/CategoryCard";
import ServiceCard from "../components/Home/ServiceCard";
import StepCard from "../components/Home/StepCard";
import TestimonialCard from "../components/Home/TestimonialCard";

interface HomePageProps {
  featuredServices: any[];
  stats: {
    servicios: number;
    proveedores: number;
    comunas: number;
  };
}

export default function HomePage({ featuredServices, stats }: HomePageProps) {
  const router = useRouter();

  // Hero image hover tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -8, y: dx * 8 }); // max 8deg tilt
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const categoriasEstaticas = [
    { slug: 'hospedaje', nombre: 'Hospedaje', descripcion: 'Tu mascota en un hogar de confianza', Icon: Home },
    { slug: 'guarderia', nombre: 'Guardería diurna', descripcion: 'Cuidado profesional durante el día', Icon: Sun },
    { slug: 'paseos', nombre: 'Paseo', descripcion: 'Paseos individuales o grupales cerca', Icon: Footprints },
    { slug: 'domicilio', nombre: 'Visita a domicilio', descripcion: 'El proveedor va a tu casa', Icon: MapPin },
    { slug: 'peluqueria', nombre: 'Peluquería', descripcion: 'Baño, corte y estética especializada', Icon: Scissors },
    { slug: 'adiestramiento', nombre: 'Adiestramiento', descripcion: 'Entrenamiento y corrección conductual', Icon: Award },
    { slug: 'veterinario', nombre: 'Veterinaria', descripcion: 'Consultas y atención médica cercana', Icon: Stethoscope },
    { slug: 'traslado', nombre: 'Traslado', descripcion: 'Transporte seguro para tu mascota', Icon: Car },
  ];

  const testimonios = [
    { nombre: "Valentina M.", ciudad: "Providencia, Santiago", mascota: "Border Collie", verificado: true, texto: "Encontré a la cuidadora de Nico en menos de diez minutos. Lo que más me convenció fue poder ver las reseñas y hablar directamente con ella antes de dejar a mi perro." },
    { nombre: "Rodrigo F.", ciudad: "Ñuñoa, Santiago", mascota: "Gato Maine Coon", verificado: true, texto: "Necesitaba alguien de confianza para Miso mientras viajaba. Pawnecta me permitió comparar opciones en mi comuna y elegir con calma. La comunicación fue directa y sin complicaciones." },
    { nombre: "Catalina R.", ciudad: "Las Condes, Santiago", mascota: "Golden Retriever", verificado: true, texto: "Me tranquiliza saber que los proveedores están verificados. Encontré paseador para Luna en el mismo barrio y quedé muy conforme con el servicio." },
    { nombre: "Ignacio V.", ciudad: "Maipú, Santiago", rol: "Paseador y cuidador", verificado: true, texto: "Publiqué mi servicio en menos de 20 minutos. Desde el primer día empecé a recibir consultas de dueños de mi misma comuna. Es la forma más simple que he encontrado de crecer." }
  ];

  return (
    <div className="bg-white">
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

      {/* SECCIÓN 1: HERO + BUSCADOR */}
      <section aria-label="Buscador de servicios" className="bg-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

          {/* Columna izquierda: texto + búsqueda */}
          <div className="space-y-6">
            <div className="border-l-4 border-emerald-600 pl-5">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                Servicios para tu mascota, cerca de ti
              </h1>
            </div>
            <p className="text-lg text-slate-600 max-w-xl">
              Encuentra proveedores verificados en tu comuna. Compara, contacta y coordina directamente.
            </p>

            <SearchBar />

            {/* Badges de confianza */}
            <div className="inline-flex flex-wrap gap-4 bg-emerald-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Proveedores verificados
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                Aprobación manual
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                Contacto directo
              </div>
            </div>
          </div>

          {/* Columna derecha: imagen — solo desktop */}
          <div className="hidden lg:block">
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1})`,
                transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.6s ease' : 'transform 0.12s ease',
              }}
              className="relative aspect-[4/5] ring-4 ring-emerald-600/20 rounded-3xl overflow-hidden shadow-2xl cursor-default"
            >
              <Image
                src="/images/hero-pets.png"
                alt="Perro y gato felices recibiendo cuidado profesional en Pawnecta"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 0px, 45vw"
              />
            </div>
          </div>

        </div>
      </section>

      {/* SECCIÓN 2: CATEGORÍAS */}
      <section aria-label="Categorias de servicio" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900">¿Qué servicio necesitas?</h2>
          <p className="text-slate-600 mt-3 text-lg">Explora todas las categorías disponibles en tu zona</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categoriasEstaticas.map((cat) => (
            <button
              key={`chip-${cat.slug}`}
              onClick={() => router.push(`/explorar?categoria=${cat.slug}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-colors text-sm font-bold shadow-sm"
            >
              <cat.Icon className="w-4 h-4" />
              {cat.nombre}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoriasEstaticas.map((cat) => (
            <CategoryCard key={`card-${cat.slug}`} {...cat} />
          ))}
        </div>
      </section>

      {/* SECCIÓN 3: SERVICIOS DESTACADOS — solo si hay 3 o más servicios */}
      {featuredServices && featuredServices.length >= 3 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900">Servicios disponibles</h2>
              <p className="text-slate-600 mt-3 text-lg">Proveedores verificados listos para ayudarte</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {featuredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN 4: CÓMO FUNCIONA (DUEÑOS) */}
      <section aria-label="Como funciona para duenos de mascotas" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center border-b border-slate-100">
        <div className="mb-16">
          <p className="text-emerald-700 font-bold uppercase tracking-widest text-sm mb-3">Para dueños de mascotas</p>
          <h2 className="text-3xl font-black text-slate-900">Encuentra al proveedor ideal en minutos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            paso={1}
            titulo="Busca por servicio y comuna"
            descripcion="Filtra por el servicio que necesitas y encuentra proveedores cerca de ti"
            Icon={Search}
            variante="light"
          />
          <StepCard
            paso={2}
            titulo="Compara perfiles y reseñas"
            descripcion="Revisa la experiencia, fotos y evaluaciones de cada proveedor"
            Icon={FileText}
            variante="light"
          />
          <StepCard
            paso={3}
            titulo="Contacta y coordina directo"
            descripcion="Escribe al proveedor por el chat interno y coordina los detalles"
            Icon={MessageCircle}
            variante="light"
          />
        </div>
      </section>

      {/* SECCIÓN 5: CONFIANZA — solo si hay 3+ proveedores activos */}
      {stats.proveedores >= 3 ? (
        <section aria-label="Verificacion de proveedores y testimonios" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-slate-900 mb-10">Proveedores que puedes conocer</h2>

              <div className="flex flex-col md:flex-row justify-center items-start md:items-center gap-8 md:gap-12 bg-slate-900 p-8 md:px-12 rounded-3xl mb-12 max-w-5xl mx-auto text-left md:text-center">
                <div className="flex flex-col items-start md:items-center md:flex-1">
                  <IdCard className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-white mb-2">Verificación de RUT</h4>
                  <p className="text-sm text-slate-300">Validamos la identidad de cada proveedor antes de activar su perfil</p>
                </div>
                <div className="hidden md:block w-px h-24 bg-slate-700"></div>
                <div className="flex flex-col items-start md:items-center md:flex-1">
                  <ClipboardCheck className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-white mb-2">Aprobación manual</h4>
                  <p className="text-sm text-slate-300">El equipo de Pawnecta revisa y aprueba cada solicitud</p>
                </div>
                <div className="hidden md:block w-px h-24 bg-slate-700"></div>
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
            <h2 className="text-2xl font-black text-slate-900 mb-4">
              Únete a nuestra red de proveedores
            </h2>
            <p className="text-slate-600 mb-8">
              Sé de los primeros cuidadores en ofrecer tus servicios en tu comuna
            </p>
            <Link
              href="/register?rol=proveedor"
              className="inline-flex items-center justify-center h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-8 text-base font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Registrarse como proveedor
            </Link>
          </div>
        </section>
      )}

      {/* SECCIÓN 6: CÓMO FUNCIONA (PROVEEDORES) */}
      <section aria-label="Como funciona para proveedores" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm mb-3">Para proveedores</p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Ofrece tus servicios en Pawnecta</h2>
            <p className="text-slate-300 mt-4 text-lg">Sin comisiones durante el lanzamiento</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <StepCard
              paso={1}
              titulo="Crea tu perfil"
              descripcion="Regístrate, verifica tu identidad y completa tu información profesional"
              Icon={UserPlus}
              variante="dark"
            />
            <StepCard
              paso={2}
              titulo="Publica tus servicios"
              descripcion="Describe lo que ofreces, define tu precio y activa tu vitrina"
              Icon={PlusCircle}
              variante="dark"
            />
            <StepCard
              paso={3}
              titulo="Recibe consultas directo"
              descripcion="Los dueños te contactan por el chat interno y tú coordinas todo"
              Icon={Users}
              variante="dark"
            />
          </div>

          <div className="text-center flex flex-col items-center">
            <Link
              href="/register?rol=proveedor"
              className="inline-flex items-center justify-center h-14 rounded-2xl border-2 border-white px-8 text-base font-semibold text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg shadow-black/20"
            >
              Publicar mi servicio
            </Link>
            <p className="mt-4 text-slate-400 text-sm">Gratis durante el lanzamiento.</p>
          </div>
        </div>
      </section>

      {/* SECCIÓN 7: CTA FINAL + STATS */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">¿Buscas un servicio para tu mascota?</h2>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">Explora proveedores verificados en tu comuna ahora.</p>

          <button
            onClick={() => router.push('/explorar')}
            className="inline-flex items-center justify-center h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-10 text-lg font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 mb-4"
          >
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
  // Query desde Supabase para servicios destacados
  let featuredServices: ServiceResult[] = [];
  try {
    const { data } = await supabase
      .from('servicios_publicados')
      .select('*, proveedor:proveedores(nombre, apellido_p, foto_perfil, comuna), categoria:categorias_servicio(nombre, icono, slug)')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(6);
    if (data) featuredServices = data.map(mapJoinToServiceResult);
  } catch (error) {
    console.error("Error fetching featured services:", error);
  }

  let countServicios = 0;
  let countProveedores = 0;
  let comunasUnicas = new Set<string>();

  try {
    // 1. Total servicios activos
    const { count: sCount } = await supabase
      .from("servicios_publicados")
      .select("*", { count: "exact", head: true })
      .eq("activo", true);

    countServicios = sCount || 0;

    // 2. Total proveedores verificados
    const { count: pCount } = await supabase
      .from("proveedores")
      .select("*", { count: "exact", head: true })
      .eq("estado", "aprobado");

    countProveedores = pCount || 0;

    // 3. Comunas cubiertas únicas
    const { data: comunasData } = await supabase
      .from("proveedores")
      .select("comunas_cobertura, comuna")
      .eq("estado", "aprobado");

    if (comunasData) {
      comunasData.forEach(p => {
        // Prefer comunas_cobertura array; fallback to single comuna field
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

  return {
    props: {
      featuredServices,
      stats: statsObj,
    },
    revalidate: 60,
  };
}
