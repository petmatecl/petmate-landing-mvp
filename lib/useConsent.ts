import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pawnecta-cookie-consent';
const CONSENT_VERSION = 1;

export interface ConsentPrefs {
    analytics: boolean;
    marketing: boolean;
}

interface StoredConsent extends ConsentPrefs {
    timestamp: string;
    version: number;
}

function read(): StoredConsent | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed: StoredConsent = JSON.parse(raw);
        if (parsed.version !== CONSENT_VERSION) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function useConsent() {
    const [stored, setStored] = useState<StoredConsent | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setStored(read());
        setHydrated(true);
        const handler = () => setStored(read());
        window.addEventListener('consent-changed', handler);
        return () => window.removeEventListener('consent-changed', handler);
    }, []);

    const accept = useCallback((prefs: ConsentPrefs) => {
        const data: StoredConsent = {
            ...prefs,
            timestamp: new Date().toISOString(),
            version: CONSENT_VERSION,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('consent-changed'));
    }, []);

    const rejectAll = useCallback(() => {
        accept({ analytics: false, marketing: false });
    }, [accept]);

    const acceptAll = useCallback(() => {
        accept({ analytics: true, marketing: true });
    }, [accept]);

    const openSettings = useCallback(() => {
        window.dispatchEvent(new CustomEvent('open-cookie-settings'));
    }, []);

    const reset = useCallback(() => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('consent-changed'));
    }, []);

    return {
        hasAnalytics: hydrated && stored?.analytics === true,
        hasMarketing: hydrated && stored?.marketing === true,
        isSet: hydrated && stored !== null,
        hydrated,
        accept,
        rejectAll,
        acceptAll,
        openSettings,
        reset,
    };
}
