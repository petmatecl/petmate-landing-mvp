import { useCallback, useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { X, BellRing } from 'lucide-react';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushNotifications() {
    const { user } = useUser();
    const [showPrompt, setShowPrompt] = useState(false);

    const subscribeToPush = useCallback(async () => {
        try {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    setShowPrompt(false);
                    return;
                }
            }

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                if (!publicVapidKey) return;
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                });
            }

            if (user?.id) {
                await fetch('/api/push/subscribe', {
                    method: 'POST',
                    body: JSON.stringify({ subscription, userId: user.id }),
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            setShowPrompt(false);

        } catch (err) {
            console.error('Push error', err);
        }
    }, [user]);

    useEffect(() => {
        if (!user || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

        if (Notification.permission === 'default') {
            // Delay prompt a bit so it's not super aggressive
            const t = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(t);
        } else if (Notification.permission === 'granted') {
            subscribeToPush();
        }
    }, [user, subscribeToPush]);

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-xl shadow-xl border border-slate-200 z-50 flex flex-col gap-3 w-80 animate-in slide-in-from-bottom">
            <button onClick={() => setShowPrompt(false)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X size={16} />
            </button>
            <div className="flex items-start gap-3 mt-1">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                    <BellRing size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">Notificaciones</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Activa las alertas para enterarte inmediatamente cuando recibas nuevos mensajes o solicitudes.
                    </p>
                </div>
            </div>
            <button
                onClick={subscribeToPush}
                className="w-full mt-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm"
            >
                Activar notificaciones
            </button>
        </div>
    );
}
