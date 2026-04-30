import Head from 'next/head';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function Custom404() {
    return (
        <>
            <Head>
                <title>Página no encontrada | Pawnecta</title>
            </Head>
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <p className="text-7xl font-black text-slate-200 mb-4">404</p>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Página no encontrada</h1>
                    <p className="text-sm text-slate-500 mb-8">
                        Lo sentimos, la página que buscas no existe o fue movida.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/explorar" className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
                            <Search size={16} />
                            Explorar servicios
                        </Link>
                        <Link href="/" className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm">
                            Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
