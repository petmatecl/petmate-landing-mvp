import { Outfit } from "next/font/google";

// Instancia compartida entre _app.tsx y _document.tsx. Necesita vivir en un
// modulo aparte porque:
//  1. next/font hashea el nombre de la font-family en build-time. Si _app y
//     _document definieran su propia instancia por separado, cada una podria
//     generar un hash distinto → mismatch SSR vs CSR → hydration warning +
//     doble @font-face en el HTML.
//  2. La variable --font-outfit debe aplicarse al <body> en _document.tsx
//     para cubrir elementos que se renderizan por portal a document.body
//     (sonner Toaster, AddressAutocomplete dropdown, react-day-picker,
//     Leaflet popups). Sin esto, escapan del wrapper interno de _app y
//     caen a fuente del sistema (via el :root fallback en globals.css que
//     apunta a 'Outfit' literal — nombre que next/font NO registra
//     globalmente, usa un hash como __Outfit_xxx).
//
// IMPORTANTE — sin prop `weight`: al omitirlo, next/font descarga la
// VARIABLE FONT de Outfit (un solo archivo .woff2 con eje wght continuo
// 100-900). Con `weight: [...]` next/font descarga versiones estaticas
// separadas por peso, cuya metrica no siempre coincide con la variable
// font que Google Fonts sirve — letras se veian mas estrechas/condensadas
// en font-semibold/bold. Con la variable font el render matchea.
export const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
    display: "swap",
});
