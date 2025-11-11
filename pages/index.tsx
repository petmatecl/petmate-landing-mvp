import Header from "../components/Header";
import Footer from "../components/Footer";
import { Hero } from "../components/Hero";
import { ValueProps, HowItWorks, CTASection } from "../components/HomeSections";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Hero />
      <ValueProps />
      <HowItWorks />
      <CTASection />
      <Footer />
    </main>
  );
}
