import { TrendingUp } from 'lucide-react';

interface HomeVisitorCounterProps {
    totalVisitasMes: number;
}

const THRESHOLD = 5_000;

/**
 * Redondea hacia abajo al múltiplo "limpio" más cercano según magnitud:
 *   5.000-9.999      → 5.000
 *   10.000-49.999    → al múltiplo de 10.000 más cercano hacia abajo
 *   50.000+          → al múltiplo de 50.000 más cercano hacia abajo
 *   100.000+         → al múltiplo de 100.000
 *   1M+              → al múltiplo de 100.000
 */
function formatThreshold(n: number): number {
    if (n < 10_000) return 5_000;
    if (n < 50_000) return Math.floor(n / 10_000) * 10_000;
    if (n < 100_000) return Math.floor(n / 50_000) * 50_000;
    return Math.floor(n / 100_000) * 100_000;
}

/**
 * Banner de social proof: "Más de N personas usan Pawnecta este mes".
 *
 * - Bajo el threshold de 5.000 visitas/mes: NO renderiza nada (mejor silencio
 *   que un número débil).
 * - Sobre el threshold: muestra el número redondeado hacia abajo + CTA suave.
 * - Lucide TrendingUp (sin emojis), estilo emerald discreto.
 *
 * El total se calcula en getStaticProps (revalidate 30s) sumando
 * servicios_publicados.visitas_mes — se actualiza orgánicamente sin deploy.
 */
export default function HomeVisitorCounter({ totalVisitasMes }: HomeVisitorCounterProps) {
    if (totalVisitasMes < THRESHOLD) return null;

    const display = formatThreshold(totalVisitasMes);

    return (
        <div className="max-w-2xl mx-auto mb-12 bg-emerald-50/60 border border-emerald-100 rounded-2xl px-6 py-5 flex items-center gap-4">
            <div className="shrink-0 text-emerald-700">
                <TrendingUp size={28} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="text-left">
                <p className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                    Más de {display.toLocaleString('es-CL')} personas usan Pawnecta este mes
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                    Únete a la red de tutores que confían en Pawnecta
                </p>
            </div>
        </div>
    );
}
