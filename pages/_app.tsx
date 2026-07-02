import type { AppProps } from "next/app";
import Head from "next/head";
import { Poppins, Inter } from "next/font/google";
import { UserContextProvider } from "../contexts/UserContext";
import { useRouter } from "next/router";
import "../styles/globals.css";

// Font pairing del sistema visual v2 — self-hosted via next/font/google.
// Poppins → titulos (h1-h6). Personalidad redondeada moderna, con caracter
//           en encabezados. Weights medium/semibold/bold/extrabold que son
//           los que usan realmente los headings del codebase.
// Inter   → cuerpo. Neutra, maxima legibilidad en pantalla. Weights
//           regular/medium/semibold para body copy + botones + labels.
//
// Ventajas next/font vs <link>: self-hosted automaticamente (sin dependencia
// del CDN de Google en runtime), preload optimizado, zero layout shift,
// sin FOUC.
//
// Las variables --font-poppins y --font-inter se exponen en el wrapper del
// layout de abajo. tailwind.config.js las lee via fontFamily.sans (Inter,
// default del body) + fontFamily.heading (Poppins, para h1-h6). globals.css
// aplica font-heading a h1-h6 globalmente.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
import "react-day-picker/dist/style.css"; // GLOBAL CSS IMPORT for Calendar
import "leaflet/dist/leaflet.css"; // Fix Leaflet Map visibility
import Header from "../components/Header";
import Footer from "../components/Footer";
import SessionTimeout from "../components/SessionTimeout";
import PushNotifications from "../components/Shared/PushNotifications";
import { Toaster } from 'sonner';

import { OnlineStatusProvider } from "../components/Shared/OnlineStatusProvider";

import { RoleSelectionInterceptor } from "../components/Auth/RoleSelectionInterceptor";
import ErrorBoundary from "../components/ErrorBoundary";
import FeedbackWidget from "../components/Shared/FeedbackWidget";
import ConsentScripts from "../components/ConsentScripts";
import CookieBanner from "../components/CookieBanner";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const ROUTES_WITHOUT_LAYOUT = [
    '/forgot-password',
    '/reset-password',
    '/registro-exitoso',
    '/email-confirmado',
    '/security-logout',
  ];

  const showLayout = !ROUTES_WITHOUT_LAYOUT.includes(router.pathname);

  return (
    <UserContextProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <OnlineStatusProvider>
        <div className={`${poppins.variable} ${inter.variable} min-h-screen flex flex-col bg-slate-50`}>
          <RoleSelectionInterceptor />
          <ConsentScripts />

          <PushNotifications />
          <SessionTimeout />
          <Toaster position="top-center" richColors />

          {/* Skip link — a11y: permite saltar nav y llegar directo al contenido principal */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-700 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700"
          >
            Saltar al contenido principal
          </a>

          {showLayout && <Header />}

          <main id="main-content" className="flex-1">
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
          </main>

          {showLayout && <Footer />}
          {showLayout && <FeedbackWidget />}
          <CookieBanner />
        </div>
      </OnlineStatusProvider>
    </UserContextProvider>
  );
}
