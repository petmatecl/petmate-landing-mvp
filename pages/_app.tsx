// pages/_app.tsx
import type { AppProps } from 'next/app'
import '../styles/globals.css'
import 'react-day-picker/dist/style.css'

import Header from '../components/Header'
import Footer from '../components/Footer'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900">
      <Header />
      <main className="flex-1">
        <Component {...pageProps} />
      </main>
      <Footer />
    </div>
  )
}
