// components/Shared/FavoritoButton.tsx
// Botón polimórfico para favoritear servicios o proveedores.
//
// - Lucide Heart (vacío = no favorito, fill rose = favorito).
// - Tap target 44x44 (WCAG 2.5.5).
// - Gating: es_ejemplo → ExampleCTAModal | no logueado → LoginRequiredModal.
// - Optimistic update vía hook useFavoritos.

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavoritos, NOT_AUTHENTICATED_ERROR, EntidadTipo } from '../../lib/hooks/useFavoritos';
import LoginRequiredModal from './LoginRequiredModal';
import ExampleCTAModal from '../Servicio/ExampleCTAModal';

interface FavoritoButtonProps {
    entidad_tipo: EntidadTipo;
    entidad_id: string;
    contador_inicial: number;
    es_ejemplo?: boolean;
    variant?: 'icon' | 'icon-with-count';
    size?: 'sm' | 'md';
    className?: string;
}

export default function FavoritoButton({
    entidad_tipo,
    entidad_id,
    contador_inicial,
    es_ejemplo = false,
    variant = 'icon',
    size = 'md',
    className = '',
}: FavoritoButtonProps) {
    const { isFavorito, contador, toggle } = useFavoritos({
        entidad_tipo,
        entidad_id,
        contador_inicial,
    });

    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showExampleModal, setShowExampleModal] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        // El botón suele vivir dentro de <Link> en cards.
        e.preventDefault();
        e.stopPropagation();

        if (es_ejemplo) {
            setShowExampleModal(true);
            return;
        }

        try {
            await toggle();
        } catch (err: any) {
            if (err?.message === NOT_AUTHENTICATED_ERROR) {
                setShowLoginModal(true);
                return;
            }
            console.warn('[FavoritoButton] toggle falló:', err);
            // Silencioso: el hook ya revirtió el state. No mostramos toast
            // para no romper UX en errores transitorios.
        }
    };

    const tapTargetClass = size === 'sm'
        ? 'min-w-[36px] min-h-[36px]'
        : 'min-w-[44px] min-h-[44px]';

    const iconSize = size === 'sm' ? 16 : 20;

    const ariaLabel = isFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos';

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                aria-label={ariaLabel}
                aria-pressed={isFavorito}
                className={`inline-flex items-center justify-center gap-1.5 ${tapTargetClass} rounded-full transition-transform active:scale-110 ${className}`}
            >
                <Heart
                    size={iconSize}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className={`transition-colors ${
                        isFavorito ? 'text-rose-500 fill-rose-500' : 'text-slate-600'
                    }`}
                />
                {variant === 'icon-with-count' && contador > 0 && (
                    <span className="text-sm text-slate-600 tabular-nums">{contador}</span>
                )}
            </button>

            <LoginRequiredModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title="Inicia sesión para guardar favoritos"
                message="Necesitas una cuenta en Pawnecta para guardar servicios y proveedores en tu lista de favoritos."
            />

            <ExampleCTAModal
                isOpen={showExampleModal}
                onClose={() => setShowExampleModal(false)}
                action="favorito"
            />
        </>
    );
}
