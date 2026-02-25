import Head from "next/head";
import { Hero } from "../components/Hero";
import { HowItWorks, CTASection, TrustSection, SitterCTA, FAQSection } from "../components/HomeSections";
import FeaturedServices from "../components/FeaturedServices";
import { supabase } from "../lib/supabaseClient";

import { CategoriesGrid, CategoriaServicio } from "../components/HomeSections/CategoriesGrid";

interface HomePageProps {
  caregivers: any[];
  categorias: CategoriaServicio[];
  stats: {
    servicios: number;
    proveedores: number;
    comunas: number;
  };
  featuredServices: any[];
}

export default function HomePage({ caregivers, categorias, stats, featuredServices }: HomePageProps) {
  return (
    <>
      <Head>
        <title>Pawnecta | Todos los servicios para tu mascota cerca de ti</title>
        <meta
          name="description"
          content="Encuentra cuidadores, paseadores, peluqueros y veterinarios verificados en Chile. Lee reseñas reales y elige el mejor servicio para tu mascota."
        />
        <meta property="og:title" content="Pawnecta | Todos los servicios para tu mascota" />
        <meta property="og:description" content="Encuentra cuidadores, paseadores, peluqueros y veterinarios verificados en Chile." />
        <meta property="og:image" content="https://www.pawnecta.cl/favicon_sin_fondo_png.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "Pawnecta",
              "image": "https://www.pawnecta.cl/favicon_sin_fondo_png.png",
              "description": "Plataforma para encontrar servicios verificados para mascotas en Chile, incluyendo cuidadores, paseadores y más.",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Santiago",
                "addressRegion": "RM",
                "addressCountry": "CL"
              },
              "priceRange": "$$",
              "telephone": "+56912345678"
            })
          }}
        />
      </Head>

      {/* BLOQUE 1: Hero (Band: Mint) */}
      <Hero />

      {/* BLOQUE 1.5: Categorias Grid */}
      <CategoriesGrid categorias={categorias} />

      {/* BLOQUE 2: Cómo Funciona (Band: None) */}
      <HowItWorks />

      {/* BLOQUE 3: Confianza / Value Props (Band: Slate) */}
      <TrustSection stats={stats} />

      {/* BLOQUE 4: Servicios Destacados (Band: None) */}
      <FeaturedServices services={featuredServices} />

      {/* BLOQUE 5: Sitter CTA (Band: Mint) */}
      <SitterCTA />

      {/* BLOQUE 6: FAQ (Band: Slate) */}
      <FAQSection />

      {/* BLOQUE 7: CTA Final (Band: None) */}
      <CTASection />
    </>
  );
}

// Usamos getServerSideProps o getStaticProps (con revalidate) para traer datos
export async function getStaticProps() {
  // Traer 3 petmates aleatorios o recientes que tengan nombre
  // Filtramos por rol='petmate' si tu tabla mezcla usuarios, pero aqui es registro_petmate
  const { data: caregiversData } = await supabase
    .from("registro_petmate")
    .select("id, nombre, apellido_p, comuna, foto_perfil, promedio_calificacion")
    .limit(3);

  // Obtener las categorías de servicio activas
  const { data: categoriasData } = await supabase
    .from("categorias_servicio")
    .select("id, nombre, slug, icono, descripcion, orden, activa")
    .eq("activa", true)
    .order("orden", { ascending: true });

  // --- STATS DINÁMICOS ---
  // 1. Total servicios activos
  const { count: countServicios } = await supabase
    .from("servicios_publicados")
    .select("*", { count: "exact", head: true })
    .eq("activo", true);

  // 2. Total proveedores verificados
  const { count: countProveedores } = await supabase
    .from("proveedores")
    .select("*", { count: "exact", head: true })
    .eq("estado", "aprobado");

  // 3. Comunas cubiertas únicas
  const { data: comunasData } = await supabase
    .from("proveedores")
    .select("comunas_cobertura")
    .eq("estado", "aprobado");

  let comunasUnicas = new Set<string>();
  if (comunasData) {
    comunasData.forEach(p => {
      if (Array.isArray(p.comunas_cobertura)) {
        p.comunas_cobertura.forEach((c: string) => comunasUnicas.add(c));
      }
    });
  }

  const statsObj = {
    servicios: countServicios || 0,
    proveedores: countProveedores || 0,
    comunas: comunasUnicas.size || 0,
  };

  return {
    props: {
      caregivers: caregiversData || [],
      categorias: categoriasData || [],
      stats: statsObj,
    },
    revalidate: 60, // Revalidar cada minuto
  };
}
