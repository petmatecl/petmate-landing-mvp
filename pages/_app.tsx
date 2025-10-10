// pages/_app.tsx
import '../styles/globals.css';                // ← usa ruta relativa
import 'react-day-picker/dist/style.css';     // ← estilos del calendario

import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
