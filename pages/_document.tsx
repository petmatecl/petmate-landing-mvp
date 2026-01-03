import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html lang="es">
            <Head>
                <link rel="icon" href="/favicon_sin_fondo_png.png" type="image/png" />
                <link rel="apple-touch-icon" href="/favicon_sin_fondo_png.png" />
                <meta name="theme-color" content="#10b981" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
