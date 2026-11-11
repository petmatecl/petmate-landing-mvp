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
import { Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

// Logo oficial WhatsApp (brand guidelines Meta: forma + color #25D366).
// Mismo path SVG usado en ServiceDetailView L1737 — fuente única.
function WhatsAppIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}
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
    /** Estilo del trigger — "button" (default, con border + bg blanco) o
     *  "link" (texto discreto con icono, sin border; para zonas donde ya
     *  hay CTAs prominentes como la tarjeta de contacto). Ajuste PO
     *  post-smoke 2026-11-11. */
    variant?: 'button' | 'link';
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

/** Appendar UTM params al URL base. Preserva query existente si hay.
 *  Ajuste PO 2026-11-11 post-smoke: quitar utm_campaign para acortar el
 *  enlace compartido (quedan solo utm_source + utm_medium=share, suficiente
 *  para GA4 Enhanced Measurement). */
function withUtm(baseUrl: string, canal: Canal): string {
    try {
        const u = new URL(baseUrl);
        u.searchParams.set('utm_source', canal);
        u.searchParams.set('utm_medium', 'share');
        return u.toString();
    } catch {
        // URL inválida — fallback append simple.
        const sep = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${sep}utm_source=${canal}&utm_medium=share`;
    }
}

export default function ShareButtons({
    shareUrl,
    tipo,
    entidadId,
    label,
    className = '',
    variant = 'button',
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

    // Estilo del trigger según variant:
    //  - button: pill con border + bg blanco + sombra (primario, para zonas
    //    de header o dashboard donde el share es acción destacada).
    //  - link: texto discreto con icono + underline on hover + sin bg;
    //    para zonas con otros CTAs ya prominentes (ej. tarjeta de contacto
    //    de la ficha donde están Enviar mensaje + WhatsApp verde + teléfono).
    const triggerClass = variant === 'link'
        ? 'inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-accent-500 rounded'
        : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-accent-500';

    return (
        <div className={`relative inline-block ${className}`} ref={popoverRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={labelText}
                className={triggerClass}
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
                        <WhatsAppIcon size={16} />
                        <span>WhatsApp</span>
                    </button>
                    <button
                        role="menuitem"
                        type="button"
                        onClick={handleCopy}
                        className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                        <Copy size={16} strokeWidth={2} className="text-slate-500" aria-hidden="true" />
                        <span>Copiar enlace (para Instagram, TikTok…)</span>
                    </button>
                    {canNativeShare && (
                        <button
                            role="menuitem"
                            type="button"
                            onClick={handleNativeShare}
                            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                        >
                            <Share2 size={16} strokeWidth={2} className="text-slate-500" aria-hidden="true" />
                            <span>Otras apps</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
