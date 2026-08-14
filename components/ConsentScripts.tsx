import Script from 'next/script';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useConsent } from '../lib/useConsent';
import { GA_TRACKING_ID, pageview } from '../lib/gtag';

/**
 * Sprint ga4-revert (2026-08-14) — REVERT del patrón atómico del sprint
 * ga4-fix (`createElement + appendChild`) al **patrón oficial Google**
 * de 2 <Script>.
 *
 * HISTORIA:
 *   1) ga4-fix cambió a IIFE + createElement porque hipotetizamos race
 *      entre 2 <Script> hermanos con `strategy="afterInteractive"` como
 *      causa del bug "Sending event to undefined".
 *   2) Post-fix el bug persistió → nueva ronda de diagnóstico.
 *   3) Descubrimiento: el bug NUNCA existió. "Sending event to
 *      undefined" es un log de la EXTENSIÓN Chrome GA Debugger que
 *      inspecciona una estructura interna del gtag (destinationId),
 *      distinta del `tid` que se envía. Aldo verificó Realtime del
 *      dashboard GA4: los eventos custom llegan y se procesan (5 hits
 *      de `registro_proveedor_iniciado` en 24h). GA4 siempre funcionó.
 *
 * Consecuencia: el fix atómico del ga4-fix arreglaba un problema
 * inexistente. Se aleja del patrón oficial Google + agrega complejidad
 * innecesaria (IIFE + createElement + appendChild + append manual del
 * script async). El patrón oficial (2 <Script> separados, src ANTES,
 * inline DESPUÉS) es más simple, mejor probado, y funciona igual.
 *
 * Patrón oficial Google (docs.google.com/analytics/devguides/collection/
 * gtagjs): async src PRIMERO en el DOM (bootstrap del ID URL empieza
 * antes), inline DESPUÉS (dataLayer + gtag + config van al dataLayer
 * que el script async consume post-bootstrap). Aunque el "race" teórico
 * entre los 2 scripts existe, la práctica de millones de sitios en
 * producción demuestra que no importa: dataLayer es un array, todos
 * los pushes se preservan, el script async drena en orden cuando
 * carga. Simple y probado.
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
                <>
                    <Script
                        strategy="afterInteractive"
                        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
                    />
                    <Script
                        id="gtag-init"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${GA_TRACKING_ID}', {
                                    page_path: window.location.pathname,
                                });
                            `,
                        }}
                    />
                </>
            )}
            {/* Marketing pixels (Meta, TikTok) — placeholder for future activation */}
            {/* {hasMarketing && process.env.NEXT_PUBLIC_META_PIXEL_ID && (...) } */}
        </>
    );
}
