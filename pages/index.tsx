// pages/index.tsx
import Head from "next/head";
import { Hero } from "../components/Hero";
import { ValueProps, HowItWorks, CTASection } from "../components/HomeSections";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>PetMate | Cuidadores para tus mascotas en casa</title>
        <meta
          name="description"
          content="Conecta con PetMates de confianza para que cuiden a tus mascotas en la comodidad de tu hogar."
        />
      </Head>

      {/* Contenido de la landing, sin Header/Footer */}
      <Hero />
      <ValueProps />
      <HowItWorks />
      <CTASection />
    </>
  );
}
