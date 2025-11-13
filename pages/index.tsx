// pages/index.tsx
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
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

      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />

        <main className="flex-1">
          {/* HERO: con imagen solo en desktop */}
          <Hero />

          {/* ¿Por qué PetMate? */}
          <ValueProps />

          {/* Cómo funciona */}
          <HowItWorks />

          {/* CTA final */}
          <CTASection />
        </main>

        <Footer />
      </div>
    </>
  );
}
