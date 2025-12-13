import Head from "next/head";
import { Hero } from "../components/Hero";
import { ValueProps, HowItWorks, CTASection } from "../components/HomeSections";
import { FeaturedPetMates } from "../components/FeaturedPetMates";
import { supabase } from "../lib/supabaseClient";

interface HomePageProps {
  caregivers: any[];
}

export default function HomePage({ caregivers }: HomePageProps) {
  return (
    <>
      <Head>
        <title>PetMate | Cuidadores para tus mascotas en casa</title>
        <meta
          name="description"
          content="Conecta con PetMates de confianza para que cuiden a tus mascotas en la comodidad de tu hogar."
        />
      </Head>

      <Hero />
      <FeaturedPetMates caregivers={caregivers} />
      <ValueProps />
      <HowItWorks />
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
    .select("id, nombre, apellido_p, comuna")
    .limit(3);

  return {
    props: {
      caregivers: data || [],
    },
    revalidate: 60, // Revalidar cada minuto
  };
}
