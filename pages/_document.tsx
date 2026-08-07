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
                {/* Sprint PERF-1 Bucket A (2026-08-07) — preconnect a los 2
                    hosts de imágenes que aparecen en el hero de fichas y en
                    cards del explorador:
                    - Supabase Storage: donde los proveedores reales suben las
                      fotos de sus servicios y sus avatares.
                    - Unsplash: usado por los servicios "Ejemplo" del catálogo
                      demo (Carolina M., Sebastián C., Felipe N., etc.).
                    Cada preconnect ahorra ~200-300ms del handshake TCP+TLS de
                    la primera request al host por sesión — impacto directo en
                    el LCP cold de la ficha (image hero es el LCP element). El
                    crossOrigin=anonymous es necesario para que el warmup del
                    connection sirva para imágenes (que se sirven sin cookies).
                    dns-prefetch como fallback para browsers viejos que ignoran
                    preconnect. */}
                <link rel="preconnect" href="https://vubmjguwzpesxcgenkxo.supabase.co" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://vubmjguwzpesxcgenkxo.supabase.co" />
                <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://images.unsplash.com" />
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
