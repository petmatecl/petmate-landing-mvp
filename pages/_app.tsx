// pages/_app.tsx
import '../styles/globals.css';
import 'react-day-picker/dist/style.css';
import type { AppProps } from 'next/app';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Header />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
