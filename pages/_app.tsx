import type { AppProps } from "next/app";
import Head from "next/head";
import { UserContextProvider } from "../contexts/UserContext";
import { useRouter } from "next/router";
import "../styles/globals.css";
import { outfit } from "../lib/fonts";
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
import { FeedbackProvider } from "../contexts/FeedbackContext";
import ConsentScripts from "../components/ConsentScripts";
import CookieBanner from "../components/CookieBanner";
import HydrationToast from "../components/Shared/HydrationToast";

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
      {/* Sprint admin-visibilidad (2026-08-27) — FeedbackProvider dentro del
          árbol para que Header (franja lanzamiento) y FeedbackWidget compartan
          el estado `isOpen`. Ver contexts/FeedbackContext.tsx. */}
      <FeedbackProvider>
      <OnlineStatusProvider>
        <div className={`${outfit.className} ${outfit.variable} min-h-screen flex flex-col bg-slate-50`}>
          <RoleSelectionInterceptor />
          <ConsentScripts />

          <PushNotifications />
          <SessionTimeout />
          {/* Ola 2 B4 (2026-08-18) — sistema de toasts unificado con paleta
              Pawnecta. Elimina `richColors` (que traía emerald/rose default
              de sonner) y enruta cada variante (success/info/warning/error)
              a los tokens semánticos del sistema visual v3
              (success/info/warning/danger). Cero color nuevo — solo mapea
              los tokens preexistentes de tailwind.config.js a sonner via
              classNames. Ratios WCAG AA verificados: texto vs bg 8.7-9.2:1
              (pasan AAA con holgura); border vs ground compensado por
              shadow + ícono + título dark que dan la separación visual.
              Ver acta ACTA_OLA_2_B4.md para detalles. */}
          <Toaster
            position="top-center"
            toastOptions={{
              classNames: {
                toast:        'group rounded-xl border shadow-md',
                title:        'font-semibold text-sm',
                description:  'text-xs opacity-90 mt-1',
                actionButton: 'font-semibold text-xs px-3 py-1.5 rounded-lg',
                cancelButton: 'text-xs px-3 py-1.5 rounded-lg border',
                closeButton:  'text-slate-400 hover:text-slate-600',
                success: 'bg-success-50 border-success-100 text-success-900',
                info:    'bg-info-50 border-info-100 text-info-900',
                warning: 'bg-warning-50 border-warning-100 text-warning-900',
                error:   'bg-danger-50 border-danger-100 text-danger-900',
              },
            }}
          />

          {/* Skip link — a11y: permite saltar nav y llegar directo al contenido principal */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-600"
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
          {/* Sprint role-degradation C3 — observa hydrationState del
              UserContext y dispara toast sonner cuando queries de perfil
              fallan sostenidamente. Sin UI propia — solo efectos. Fuera
              del showLayout guard: el aviso importa incluso en rutas que
              no tienen Header/Footer (ej. /completar-registro), porque
              esas rutas también dependen del hydrate. */}
          <HydrationToast />
        </div>
      </OnlineStatusProvider>
      </FeedbackProvider>
    </UserContextProvider>
  );
}
