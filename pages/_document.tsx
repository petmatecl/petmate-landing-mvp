import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html lang="es">
            <Head>
                <link rel="icon" href="/favicon_sin_fondo_png.png" type="image/png" />
                <link rel="apple-touch-icon" href="/favicon_sin_fondo_png.png" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#ffffff" />
                {/* Fuente Nunito — se carga via next/font/google en pages/_app.tsx
                    (self-hosted + preload optimizado). Ya no se necesita el
                    <link href="fonts.googleapis.com/...Outfit..."> que estaba
                    aca antes del cambio de sistema visual (v2). */}
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
