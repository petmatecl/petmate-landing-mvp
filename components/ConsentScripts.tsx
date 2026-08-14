import Script from 'next/script';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useConsent } from '../lib/useConsent';
import { GA_TRACKING_ID, pageview } from '../lib/gtag';

/**
 * Sprint ga4-fix (2026-08-14) — corregir race entre los dos <Script> que
 * causaba `Sending event "X" to undefined` en prod.
 *
 * PROBLEMA DIAGNOSTICADO por Aldo con GA Debugger + DebugView:
 *   La versión previa tenía DOS <Script strategy="afterInteractive">:
 *     1) <Script src="https://.../gtag/js?id=..."> — script GA externo.
 *     2) <Script id="gtag-init" dangerouslySetInnerHTML={... gtag('config') ...} />
 *   Next 15 con `afterInteractive` no garantiza el orden entre múltiples
 *   scripts. En prod el config quedaba "en algún lado" pero el binding del
 *   measurement ID al `dataLayer` no se completaba antes de que el usuario
 *   disparara eventos. Resultado: gtag('event', ...) devolvía sin error,
 *   entraba al dataLayer, el script GA lo procesaba y lo enviaba a
 *   `undefined` (destino no configurado) — descartado silente en el envío.
 *   `page_view` automático llegaba porque lo emite el script GA por sí solo
 *   como enhanced measurement del property (config a nivel dashboard).
 *
 * FIX: UN SOLO <Script> con el snippet oficial de Google, que:
 *   1) Define dataLayer + gtag + gtag('js') + gtag('config') de manera
 *      SÍNCRONA (todos en el mismo bloque inline, orden garantizado).
 *   2) Inyecta el script GA async programáticamente DESPUÉS del config.
 *      Cuando el script async carga, encuentra dataLayer con el config ya
 *      registrado → binding correcto → eventos ingeridos.
 *
 * Es el snippet oficial de Google (docs.google/analytics/devguides/collection/
 * gtagjs) — mismo patrón que usa cualquier tag manager. Cero race conditions
 * posibles porque el orden es una secuencia estricta dentro de un solo
 * bloque JS ejecutado de manera atómica.
 */
export default function ConsentScripts() {
    const { hasAnalytics } = useConsent();
    const router = useRouter();

    useEffect(() => {
        if (!hasAnalytics) return;
        const handle = (url: string) => pageview(url);
        router.events.on('routeChangeComplete', handle);
        return () => {
            router.events.off('routeChangeComplete', handle);
        };
    }, [hasAnalytics, router.events]);

    return (
        <>
            {hasAnalytics && GA_TRACKING_ID && (
                <Script
                    id="gtag-init"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){ dataLayer.push(arguments); }
                                window.gtag = gtag;
                                gtag('js', new Date());
                                gtag('config', '${GA_TRACKING_ID}', {
                                    page_path: window.location.pathname
                                });
                                var s = document.createElement('script');
                                s.async = true;
                                s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}';
                                document.head.appendChild(s);
                            })();
                        `,
                    }}
                />
            )}
            {/* Marketing pixels (Meta, TikTok) — placeholder for future activation */}
            {/* {hasMarketing && process.env.NEXT_PUBLIC_META_PIXEL_ID && (...) } */}
        </>
    );
}
