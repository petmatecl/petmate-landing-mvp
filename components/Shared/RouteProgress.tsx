import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

const SHOW_DELAY_MS = 100;
const HIDE_DELAY_MS = 200;
const BRAND_COLOR = '#047857';

export default function RouteProgress() {
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReducedMotion(mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);

    useEffect(() => {
        const clearShow = () => {
            if (showTimerRef.current) {
                clearTimeout(showTimerRef.current);
                showTimerRef.current = null;
            }
        };
        const clearHide = () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };

        const handleStart = (url: string) => {
            if (url === router.asPath) return;
            clearHide();
            showTimerRef.current = setTimeout(() => {
                setVisible(true);
                showTimerRef.current = null;
            }, SHOW_DELAY_MS);
        };
        const handleDone = () => {
            clearShow();
            hideTimerRef.current = setTimeout(() => {
                setVisible(false);
                hideTimerRef.current = null;
            }, HIDE_DELAY_MS);
        };

        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleDone);
        router.events.on('routeChangeError', handleDone);

        return () => {
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleDone);
            router.events.off('routeChangeError', handleDone);
            clearShow();
            clearHide();
        };
    }, [router.events, router.asPath]);

    if (!visible) return null;

    return (
        <>
            <div
                aria-hidden="true"
                role="presentation"
                className="fixed top-0 left-0 right-0 z-[70] h-[2px] overflow-hidden pointer-events-none"
            >
                <div
                    className={reducedMotion ? 'route-progress-static' : 'route-progress-anim'}
                    style={{ height: '100%', background: BRAND_COLOR }}
                />
            </div>
            <style jsx>{`
                .route-progress-static {
                    width: 60%;
                }
                .route-progress-anim {
                    width: 30%;
                    animation: route-progress-slide 1.2s ease-in-out infinite;
                }
                @keyframes route-progress-slide {
                    0% { transform: translateX(-100%); width: 30%; }
                    50% { transform: translateX(150%); width: 50%; }
                    100% { transform: translateX(400%); width: 30%; }
                }
            `}</style>
        </>
    );
}
