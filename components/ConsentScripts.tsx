import Script from 'next/script';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useConsent } from '../lib/useConsent';
import { GA_TRACKING_ID, pageview } from '../lib/gtag';

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
