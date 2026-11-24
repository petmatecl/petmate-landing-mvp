// Sprint RRSS-ICONS (2026-11-24) — TikTok brand icon.
// Lucide-react NO incluye TikTok por restricciones de brand (SimpleIcons
// sí lo tiene libre). SVG inline mínimo con viewBox cuadrado para
// matchear el sizing de los lucide icons del footer/header.
//
// Signature compatible con los demás icons: `{ size, className }` para
// que `SOCIAL_LINKS` en lib/socialLinks.ts pueda intercalarlo con los
// lucide-react sin branching.

import React from 'react';

interface Props {
    size?: number;
    className?: string;
}

export default function TikTokIcon({ size = 24, className }: Props) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {/* Silueta simple de TikTok brand: nota musical + badge */}
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
    );
}
