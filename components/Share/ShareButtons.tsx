// components/Share/ShareButtons.tsx
// ---------------------------------------------------------------------------
// Sprint share-prov (2026-11-12) — componente reutilizable de compartir
// una URL via WhatsApp, Copiar enlace, y Share nativo móvil cuando está
// disponible.
//
// Alcance aprobado PO 2026-11-11:
//   - 3 variantes de texto prellenado según origen (servicio / perfil
//     público / dashboard proveedor).
//   - UTM params agregados al URL compartido:
//       utm_source={whatsapp|copiar|share_nativo}
//       utm_medium=share
//       utm_campaign=share_prov
//   - Evento GA4 `share_click` con {canal, entidad, entidad_id}.
//   - Botón "Share nativo" solo visible si `navigator.share` existe
//     (típicamente móvil + algunos navegadores desktop recientes).
//
// Sin dependencias nuevas: usa Lucide (ya en deps) + sonner (ya en deps).
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { Share2, MessageCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent } from '../../lib/gtag';

type Tipo = 'servicio' | 'proveedor_publico' | 'proveedor_dashboard';
type Canal = 'whatsapp' | 'copiar' | 'share_nativo';

interface ShareButtonsProps {
    /** URL absoluta base (sin UTM) a compartir. Ej: https://www.pawnecta.com/servicio/<uuid>. */
    shareUrl: string;
    /** Origen del share — define el texto prellenado y el prop de evento. */
    tipo: Tipo;
    /** UUID de la entidad (servicio_id o proveedor_id) para el evento GA. */
    entidadId: string;
    /** Label del botón primario. Default según tipo. */
    label?: string;
    /** Clases extra para el botón trigger (layout, spacing). */
    className?: string;
}

/** Texto prellenado según origen (aprobado PO 2026-11-11). Sin emojis. */
const TEXTOS: Record<Tipo, (url: string) => string> = {
    servicio: (url) => `Mira este servicio en Pawnecta: ${url}`,
    proveedor_publico: (url) => `Mira este perfil en Pawnecta: ${url}`,
    proveedor_dashboard: (url) =>
        `Te comparto mi perfil en Pawnecta, ahí puedes ver mis servicios y contactarme directo: ${url}`,
};

/** Label default del botón primario según tipo. */
const LABELS_DEFAULT: Record<Tipo, string> = {
    servicio: 'Compartir',
    proveedor_publico: 'Compartir',
    proveedor_dashboard: 'Compartir mi perfil',
};

/** Appendar UTM params al URL base. Preserva query existente si hay. */
function withUtm(baseUrl: string, canal: Canal): string {
    try {
        const u = new URL(baseUrl);
        u.searchParams.set('utm_source', canal);
        u.searchParams.set('utm_medium', 'share');
        u.searchParams.set('utm_campaign', 'share_prov');
        return u.toString();
    } catch {
        // URL inválida — fallback append simple.
        const sep = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${sep}utm_source=${canal}&utm_medium=share&utm_campaign=share_prov`;
    }
}

export default function ShareButtons({
    shareUrl,
    tipo,
    entidadId,
    label,
    className = '',
}: ShareButtonsProps) {
    const [open, setOpen] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // navigator.share solo existe en browsers con Web Share API (mayoría
        // móviles, Chrome/Edge desktop recientes). En SSR y en navegadores
        // sin soporte, ocultamos esa opción.
        setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    // Click fuera cierra el popover.
    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    const trackShare = (canal: Canal) => {
        trackEvent('share_click', { canal, entidad: tipo, entidad_id: entidadId });
    };

    const handleWhatsapp = () => {
        const urlWithUtm = withUtm(shareUrl, 'whatsapp');
        const texto = TEXTOS[tipo](urlWithUtm);
        trackShare('whatsapp');
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
        setOpen(false);
    };

    const handleCopy = async () => {
        const urlWithUtm = withUtm(shareUrl, 'copiar');
        try {
            await navigator.clipboard.writeText(urlWithUtm);
            trackShare('copiar');
            toast.success('Enlace copiado', { icon: <Check size={16} /> });
        } catch {
            toast.error('No se pudo copiar el enlace. Inténtalo de nuevo.');
        }
        setOpen(false);
    };

    const handleNativeShare = async () => {
        const urlWithUtm = withUtm(shareUrl, 'share_nativo');
        const texto = TEXTOS[tipo](urlWithUtm);
        try {
            await navigator.share({ title: 'Pawnecta', text: texto, url: urlWithUtm });
            trackShare('share_nativo');
        } catch (err: any) {
            // AbortError es el user cancelando el share sheet — no es error real.
            if (err?.name !== 'AbortError') {
                toast.error('No se pudo abrir el menú de compartir.');
            }
        }
        setOpen(false);
    };

    const labelText = label ?? LABELS_DEFAULT[tipo];

    return (
        <div className={`relative inline-block ${className}`} ref={popoverRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={labelText}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
                <Share2 size={16} strokeWidth={2} aria-hidden="true" />
                <span>{labelText}</span>
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="Opciones de compartir"
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                    <button
                        role="menuitem"
                        type="button"
                        onClick={handleWhatsapp}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                        <MessageCircle size={16} strokeWidth={2} className="text-slate-500" aria-hidden="true" />
                        <span>WhatsApp</span>
                    </button>
                    <button
                        role="menuitem"
                        type="button"
                        onClick={handleCopy}
                        className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                        <Copy size={16} strokeWidth={2} className="text-slate-500" aria-hidden="true" />
                        <span>Copiar enlace</span>
                    </button>
                    {canNativeShare && (
                        <button
                            role="menuitem"
                            type="button"
                            onClick={handleNativeShare}
                            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                        >
                            <Share2 size={16} strokeWidth={2} className="text-slate-500" aria-hidden="true" />
                            <span>Más opciones</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
