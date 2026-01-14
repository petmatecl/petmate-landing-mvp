import Head from "next/head";
import { Hero } from "../components/Hero";
import { HowItWorks, CTASection, TrustSection, SitterCTA, FAQSection } from "../components/HomeSections";
import { FeaturedPawnectas } from "../components/FeaturedPawnectas";
import { supabase } from "../lib/supabaseClient";

interface HomePageProps {
  caregivers: any[];
}

export default function HomePage({ caregivers }: HomePageProps) {
  return (
    <>
      <Head>
        <title>Pawnecta | Cuidadores de confianza cerca de ti, en tu comuna</title>
        <meta
          name="description"
          content="Encuentra el match perfecto: revisa reseñas, experiencia y disponibilidad, y elige tu sitter con tranquilidad. Cuidadores verificados en todo Chile."
        />
        <meta property="og:title" content="Pawnecta | Cuidadores de confianza cerca de ti" />
        <meta property="og:description" content="Encuentra el match perfecto: revisa reseñas, experiencia y disponibilidad, y elige tu sitter con tranquilidad." />
        <meta property="og:image" content="https://www.pawnecta.cl/favicon_sin_fondo_png.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "Pawnecta",
              "image": "https://www.pawnecta.cl/favicon_sin_fondo_png.png",
              "description": "Plataforma para encontrar cuidadores de mascotas verificados en Chile.",
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

      {/* BLOQUE 2: Cómo Funciona (Band: None) */}
      <HowItWorks />

      {/* BLOQUE 3: Confianza / Value Props (Band: Slate) */}
      <TrustSection />

      {/* BLOQUE 4: Cuidadores Destacados (Band: Slate -> FeaturedPawnectas defined internal band='slate' but wait, let's check. 
          FeaturedPawnectas has band='slate'. 
          TrustSection has band='slate'.
          We need rhythm. 
          Hero (Mint) -> HowItWorks (None) -> Trust (Slate) -> Featured (??) -> Sitter (Mint) -> FAQ (Slate) -> CTA (None)
          
          Let's adjust Bands in Component calls? No, styles are internal.
          TrustSection is 'slate'.
          FeaturedPawnectas is 'slate'. Two slates together?
          Let's change FeaturedPawnectas to 'none' to break it up.
      */}
      <FeaturedPawnectas caregivers={caregivers} />

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
  const { data } = await supabase
    .from("registro_petmate")
    .select("id, nombre, apellido_p, comuna, foto_perfil, promedio_calificacion")
    .limit(3);

  return {
    props: {
      caregivers: data || [],
    },
    revalidate: 60, // Revalidar cada minuto
  };
}
