// pages/_app.tsx
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import 'react-day-picker/dist/style.css';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Header />
      <main className="min-h-[70vh]">
        <Component {...pageProps} />
      </main>
      <Footer />
    </>
  );
}
