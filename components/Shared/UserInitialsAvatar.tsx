// components/Shared/UserInitialsAvatar.tsx
// ----------------------------------------------------------------------------
// Avatar circular con iniciales del usuario. Usado en:
//   - Header.tsx (chip "EC Eduardo" en navbar, size="sm")
//   - pages/proveedor/index.tsx (bloque de identidad en sidebar, size="lg")
//
// Si nombre + apellidoP estan disponibles → dos letras (ej. "EC").
// Si solo nombre → primera letra. Si nada → "U".
// ----------------------------------------------------------------------------

interface Props {
    nombre?: string | null;
    apellidoP?: string | null;
    /** sm = 24px (navbar chip), lg = 40px (sidebar bloque identidad) */
    size?: 'sm' | 'lg';
    /** Tailwind bg class. Default emerald-700 (matchea el chip historico del navbar). */
    bgColor?: string;
}

export function getUserInitials(nombre?: string | null, apellidoP?: string | null): string {
    if (nombre && apellidoP) {
        return (nombre.charAt(0) + apellidoP.charAt(0)).toUpperCase();
    }
    return (nombre || 'U').charAt(0).toUpperCase();
}

export default function UserInitialsAvatar({
    nombre,
    apellidoP,
    size = 'sm',
    bgColor = 'bg-emerald-700',
}: Props) {
    const initials = getUserInitials(nombre, apellidoP);
    const sizeClasses = size === 'lg'
        ? 'h-10 w-10 text-sm'
        : 'h-6 w-6 text-[10px]';

    return (
        <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white tracking-wider ${sizeClasses} ${bgColor}`}>
            {initials}
        </span>
    );
}
