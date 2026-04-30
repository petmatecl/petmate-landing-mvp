import Head from "next/head";

export default function OfflinePage() {
  return (
    <>
      <Head>
        <title>Sin conexión — Pawnecta</title>
      </Head>
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Sin conexión</h1>
          <p className="text-sm text-slate-500 mb-6">
            No tienes conexión a internet. Verifica tu WiFi o datos móviles e intenta nuevamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors"
          >
            Reintentar
          </button>
        </div>
      </main>
    </>
  );
}
