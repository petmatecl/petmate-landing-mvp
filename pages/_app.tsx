import type { AppProps } from "next/app";
import { UserContextProvider } from "../contexts/UserContext";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";
import * as gtag from "../lib/gtag";
import "../styles/globals.css";
import "react-day-picker/dist/style.css"; // GLOBAL CSS IMPORT for Calendar
import "leaflet/dist/leaflet.css"; // Fix Leaflet Map visibility
import Header from "../components/Header";
import Footer from "../components/Footer";
import SessionTimeout from "../components/SessionTimeout";
import { Toaster } from 'sonner';

import { OnlineStatusProvider } from "../components/Shared/OnlineStatusProvider";

import { RoleSelectionInterceptor } from "../components/Auth/RoleSelectionInterceptor";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const ROUTES_WITHOUT_LAYOUT = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/registro-exitoso',
    '/email-confirmado',
    '/security-logout',
  ];

  const showLayout = !ROUTES_WITHOUT_LAYOUT.includes(router.pathname);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <UserContextProvider>
      <OnlineStatusProvider>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <RoleSelectionInterceptor />
          {/* Global Site Tag (gtag.js) - Google Analytics */}
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gtag.GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
            `,
            }}
          />

          <SessionTimeout />
          <Toaster position="top-center" richColors />
          {showLayout && <Header />}

          <main className="flex-1">
            <Component {...pageProps} />
          </main>

          {showLayout && <Footer />}
        </div>
      </OnlineStatusProvider>
    </UserContextProvider>
  );
}
