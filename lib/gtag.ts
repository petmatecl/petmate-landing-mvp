// PL2 (Sprint PRELAUNCH-1): gate por entorno para no contaminar GA con
// tracking de staging/preview. Solo en producción real (NEXT_PUBLIC_APP_ENV
// === 'production' — única env var que llega al bundle client, VERCEL_ENV NO
// tiene prefix NEXT_PUBLIC_ y queda undefined en browser) exponemos el
// tracking ID. En cualquier otro entorno GA_TRACKING_ID es null → el
// condicional `hasAnalytics && GA_TRACKING_ID` en components/ConsentScripts.tsx
// impide inyectar el script de gtag → cero data enviada a GA.
// Los helpers pageview()/event() abajo tienen guarda adicional (`!window.gtag`)
// como doble candado.
const IS_PROD_CLIENT = process.env.NEXT_PUBLIC_APP_ENV === 'production';
export const GA_TRACKING_ID: string | null = IS_PROD_CLIENT
    ? (process.env.NEXT_PUBLIC_GA_ID || "G-SCNG5J67E9")
    : null;

declare global {
    interface Window {
        gtag: any;
    }
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.gtag("config", GA_TRACKING_ID, {
        page_path: url,
    });
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: any) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.gtag("event", action, {
        event_category: category,
        event_label: label,
        value: value,
    });
};
