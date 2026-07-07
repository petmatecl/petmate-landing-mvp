import { Html, Head, Main, NextScript } from 'next/document'
import { outfit } from '../lib/fonts'

export default function Document() {
    return (
        <Html lang="es">
            <Head>
                <link rel="icon" href="/favicon_sin_fondo_png.png" type="image/png" />
                <link rel="apple-touch-icon" href="/favicon_sin_fondo_png.png" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#ffffff" />
                {/* Fuente Outfit — cargada via next/font/google en lib/fonts.ts
                    (instancia compartida entre _app.tsx y _document.tsx, self-hosted
                    + preload optimizado). Reemplazo el <link> a Google Fonts que
                    estaba aqui pre-v2. */}
            </Head>
            {/* outfit.variable en el <body> expone --font-outfit al arbol entero,
                incluyendo elementos que se montan por portal a document.body
                (sonner Toaster, AddressAutocomplete dropdown, react-day-picker,
                Leaflet popups). Sin esto, los portales escapan del wrapper
                interno de _app y caen al :root fallback de globals.css que apunta
                a 'Outfit' literal — nombre que next/font NO registra globalmente. */}
            <body className={outfit.variable}>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
