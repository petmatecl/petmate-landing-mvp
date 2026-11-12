// components/Share/ShareButtons.tsx
// ---------------------------------------------------------------------------
// Sprint share-mobile (2026-11-12) — rediseño sin menú desplegable.
//
// Variants:
//   - 'inline' (default): texto "Compartir:" (o custom) + fila de íconos
//     [WhatsApp] [Copiar] + [ShareNativo si navigator.share existe]. Para
//     tarjeta contacto desktop, /proveedor/[id] header, dashboard proveedor.
//   - 'icon-only': un único botón redondo de ícono para el hero mobile
//     junto al corazón de favoritos. Click → navigator.share si existe;
//     fallback a copiar al clipboard con toast.
//
// Cambio PO 2026-11-12 (smoke mobile anterior):
//   - Sin popover/dropdown: íconos siempre visibles.
//   - "Copiar enlace (para Instagram, TikTok…)" y "Otras apps" removidos.
//   - Cada ícono con aria-label + title (tooltip HTML nativo).
//
// Mantiene de la versión previa:
//   - Textos prellenados según tipo.
//   - UTM: utm_source={canal}&utm_medium=share (sin campaign).
//   - Tracking GA4 `share_click`.
// ---------------------------------------------------------------------------
import { Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent } from '../../lib/gtag';
import { useEffect, useState } from 'react';

type Tipo = 'servicio' | 'proveedor_publico' | 'proveedor_dashboard';
type Canal = 'whatsapp' | 'copiar' | 'share_nativo';

function WhatsAppIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

interface ShareButtonsProps {
    /** URL absoluta base (sin UTM) a compartir. */
    shareUrl: string;
    /** Origen del share — define el texto prellenado y el prop de evento. */
    tipo: Tipo;
    /** UUID de la entidad (servicio_id o proveedor_id) para el evento GA. */
    entidadId: string;
    /** Clases extra para el contenedor (layout, spacing). */
    className?: string;
    /** Variante de layout — 'inline' (texto + íconos en fila) o 'icon-only'
     *  (un solo botón redondo para el hero mobile). Default 'inline'. */
    variant?: 'inline' | 'icon-only';
    /** Texto del label en variant='inline'. Default según tipo. Ignorado en
     *  variant='icon-only'. */
    labelText?: string;
}

const TEXTOS: Record<Tipo, (url: string) => string> = {
    servicio: (url) => `Mira este servicio en Pawnecta: ${url}`,
    proveedor_publico: (url) => `Mira este perfil en Pawnecta: ${url}`,
    proveedor_dashboard: (url) =>
        `Te comparto mi perfil en Pawnecta, ahí puedes ver mis servicios y contactarme directo: ${url}`,
};

const LABEL_DEFAULT: Record<Tipo, string> = {
    servicio: 'Compartir:',
    proveedor_publico: 'Compartir:',
    proveedor_dashboard: 'Compartir mi perfil:',
};

function withUtm(baseUrl: string, canal: Canal): string {
    try {
        const u = new URL(baseUrl);
        u.searchParams.set('utm_source', canal);
        u.searchParams.set('utm_medium', 'share');
        return u.toString();
    } catch {
        const sep = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${sep}utm_source=${canal}&utm_medium=share`;
    }
}

export default function ShareButtons({
    shareUrl,
    tipo,
    entidadId,
    className = '',
    variant = 'inline',
    labelText,
}: ShareButtonsProps) {
    const [canNativeShare, setCanNativeShare] = useState(false);

    useEffect(() => {
        setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    const trackShare = (canal: Canal) => {
        trackEvent('share_click', { canal, entidad: tipo, entidad_id: entidadId });
    };

    const copyToClipboard = async (canal: Canal): Promise<boolean> => {
        const urlWithUtm = withUtm(shareUrl, canal);
        try {
            await navigator.clipboard.writeText(urlWithUtm);
            return true;
        } catch {
            return false;
        }
    };

    const handleWhatsapp = () => {
        const urlWithUtm = withUtm(shareUrl, 'whatsapp');
        const texto = TEXTOS[tipo](urlWithUtm);
        trackShare('whatsapp');
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
    };

    const handleCopy = async () => {
        const ok = await copyToClipboard('copiar');
        if (ok) {
            trackShare('copiar');
            toast.success('Enlace copiado');
        } else {
            toast.error('No se pudo copiar el enlace. Inténtalo de nuevo.');
        }
    };

    const handleNativeShare = async () => {
        const urlWithUtm = withUtm(shareUrl, 'share_nativo');
        const texto = TEXTOS[tipo](urlWithUtm);
        try {
            await navigator.share({ title: 'Pawnecta', text: texto, url: urlWithUtm });
            trackShare('share_nativo');
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                toast.error('No se pudo abrir el menú de compartir.');
            }
        }
    };

    // Variant: icon-only — botón redondo único (para hero mobile). Click
    // gatilla navigator.share si existe; fallback = copiar al clipboard con
    // toast. Sin menú, sin popover, 1 tap.
    if (variant === 'icon-only') {
        const handleIconOnly = async () => {
            if (canNativeShare) {
                await handleNativeShare();
            } else {
                await handleCopy();
            }
        };
        return (
            <button
                type="button"
                onClick={handleIconOnly}
                aria-label="Compartir"
                title="Compartir"
                className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md text-slate-700 hover:text-accent-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${className}`}
                data-testid="share-icon-only"
            >
                <Share2 size={18} strokeWidth={2} aria-hidden="true" />
            </button>
        );
    }

    // Variant: inline — label + íconos en fila.
    const label = labelText ?? LABEL_DEFAULT[tipo];
    const iconBtn = 'inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500';

    return (
        <div
            className={`inline-flex items-center gap-2 flex-wrap ${className}`}
            data-testid="share-inline"
        >
            <span className="text-sm font-medium text-slate-600">{label}</span>
            <button
                type="button"
                onClick={handleWhatsapp}
                aria-label="Compartir por WhatsApp"
                title="Compartir por WhatsApp"
                className={iconBtn}
                data-testid="share-whatsapp"
            >
                <WhatsAppIcon size={18} />
            </button>
            <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar enlace"
                title="Copiar enlace"
                className={iconBtn}
                data-testid="share-copy"
            >
                <Copy size={16} strokeWidth={2} className="text-slate-600" aria-hidden="true" />
            </button>
            {canNativeShare && (
                <button
                    type="button"
                    onClick={handleNativeShare}
                    aria-label="Compartir con otra app"
                    title="Compartir con otra app"
                    className={iconBtn}
                    data-testid="share-native"
                >
                    <Share2 size={16} strokeWidth={2} className="text-slate-600" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
