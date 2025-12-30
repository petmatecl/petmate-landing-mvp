import type { AppProps } from "next/app";
import "../styles/globals.css"; // deja la ruta que ya tenías
import Header from "../components/Header";
import Footer from "../components/Footer";
import SessionTimeout from "../components/SessionTimeout";
import { Toaster } from 'sonner';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SessionTimeout />
      <Toaster position="top-center" richColors />
      <Header />

      <main className="flex-1">
        <Component {...pageProps} />
      </main>

      <Footer />
    </div>
  );
}
