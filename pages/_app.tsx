// pages/_app.tsx
import type { AppProps } from "next/app";
import "../styles/globals.css"; // o la ruta que ya tenías para los estilos

export default function MyApp({ Component, pageProps }: AppProps) {
  // Ya no renderizamos Header ni Footer aquí
  return <Component {...pageProps} />;
}
