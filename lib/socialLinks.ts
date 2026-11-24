// Sprint RRSS-ICONS (2026-11-24) — fuente única de los links RRSS del
// brand Pawnecta. Compartido entre Footer (banda inferior) + Header
// (iconos desktop + sección mobile menu "Síguenos"). Si alguna URL
// cambia o se agrega una red nueva, se actualiza SOLO acá.

import type { ComponentType } from 'react';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import TikTokIcon from '../components/icons/TikTokIcon';

export interface SocialLink {
    name: string;
    href: string;
    Icon: ComponentType<{ size?: number; className?: string }>;
}

export const SOCIAL_LINKS: SocialLink[] = [
    { name: 'Instagram', href: 'https://instagram.com/pawnecta', Icon: Instagram },
    { name: 'Facebook', href: 'https://facebook.com/pawnecta', Icon: Facebook },
    { name: 'YouTube', href: 'https://youtube.com/@pawnecta', Icon: Youtube },
    { name: 'TikTok', href: 'https://tiktok.com/@pawnecta', Icon: TikTokIcon },
];
