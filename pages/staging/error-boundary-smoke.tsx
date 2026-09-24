// pages/staging/error-boundary-smoke.tsx
// ---------------------------------------------------------------------------
// Sprint sentry-boundary (2026-09-25) — smoke controlado del ErrorBoundary
// para verificar (a) el fallback UI se renderiza, y (b) el evento se despacha
// al SDK Sentry (verificación end-to-end en dashboard requiere prod porque
// el SDK está gated a IS_PROD en instrumentation-client.ts:60-62).
//
// **REGLA VIGENTE**: cero rutas de prueba en producción. El gate en gSSP
// hace notFound cuando NEXT_PUBLIC_VERCEL_ENV === 'production', así que
// aunque el archivo se deploye, el server responde 404 en prod. En
// preview/staging la ruta renderiza y permite el flow del smoke.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import type { GetServerSideProps } from 'next';

function ThrowOnDemand({ fire }: { fire: boolean }) {
    if (fire) {
        throw new Error('smoke:error-boundary:sentry-integration-verification');
    }
    return null;
}

export default function ErrorBoundarySmokePage() {
    const [fire, setFire] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-2xl w-full">
                <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                    Smoke error boundary
                </h1>
                <p className="text-sm text-slate-500 mb-6">
                    Ruta bloqueada en producción por getServerSideProps (responde 404
                    en pawnecta.com). En staging/preview permite gatillar un render
                    error del componente hijo. Al hacer click, el ErrorBoundary de
                    pages/_app.tsx debe:
                </p>
                <ul className="text-sm text-slate-600 mb-6 space-y-1 list-disc pl-6">
                    <li>mostrar la pantalla &quot;Algo salió mal&quot; con el CTA
                        &quot;Recargar página&quot;;</li>
                    <li>ejecutar componentDidCatch → Sentry.captureException con
                        contexts.react.componentStack y tag subsystem=error-boundary.</li>
                </ul>
                <button
                    onClick={() => setFire(true)}
                    data-testid="fire-boundary"
                    className="h-12 px-6 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-xl transition-colors"
                >
                    Disparar error del boundary
                </button>
                <ThrowOnDemand fire={fire} />
            </div>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async () => {
    // Gate estricto: 404 en producción real, permitido en preview / staging /
    // development. Mismo criterio que sentry.client.config.ts uses para gate
    // del SDK (VERCEL_ENV === 'production' es el marcador de prod real de
    // Vercel para este proyecto).
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
        return { notFound: true };
    }
    return { props: {} };
};
