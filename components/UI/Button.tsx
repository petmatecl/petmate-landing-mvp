// components/UI/Button.tsx
// ---------------------------------------------------------------------------
// Botón canónico compartido — sprint prelaunch D-3 BUTTON-CANON (2026-09-15).
//
// Contexto (BACKLOG.md L1101): el proyecto no tenía un `<Button>` compartido.
// Cada botón definía Tailwind ad-hoc. El sprint popup-fix del 2026-09-04
// descubrió que el CSS agresivo de `.leaflet-popup-content a` sobrescribía
// `text-white` en el botón del popup del mapa. Con un componente canónico, la
// defensa (por ejemplo `!text-white` como bang en el bloque global de
// `styles/globals.css`) vive una sola vez y protege contra el próximo
// contenedor con CSS agresivo — no cada botón nuevo.
//
// Superficie inicial (esta iteración): 4 variantes visuales del sitio.
//   - primary: bg-accent-600 hover:bg-accent-700 text-white (el CTA principal).
//   - secondary: bg-white border border-slate-200 text-slate-700 hover.
//   - ghost: sin fondo, texto slate, hover bg-slate-100.
//   - danger: bg-red-600 hover:bg-red-700 text-white.
//
// Tamaños: sm (compacto, chips), md (default), lg (bloque CTA), xl (huge CTA).
//
// Migración progresiva: solo los CTAs con clases idénticas al patrón canónico
// se refactorean en este PR. Los ~15+ botones restantes con variaciones (focus
// ring, shadow-sm, w-full, disabled:opacity, iconos con gap distinto) siguen
// como deuda light — se van migrando sprint a sprint cuando se toque el
// archivo. Ver BACKLOG entry BUTTON-CANON para el listado y criterio.
// ---------------------------------------------------------------------------
import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary:
        'bg-accent-600 hover:bg-accent-700 text-white',
    secondary:
        'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost:
        'text-slate-700 hover:bg-slate-100',
    danger:
        'bg-red-600 hover:bg-red-700 text-white',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm',
    xl: 'px-4 py-4 text-base',
};

interface BaseProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    // Radio del contenedor. Todo el sitio usa rounded-xl o rounded-lg
    // indistintamente segun proximidad al hero (rounded-xl) vs UI densa
    // (rounded-lg). Se expone opt-in para respetar los patrones existentes
    // sin decidir uno canónico prematuramente.
    radius?: 'lg' | 'xl' | 'full';
    // Focus ring accesible. Off por default para no meter foco visual en
    // botones que no lo tenian y romper el look. On cuando el sitio ya lo
    // tenia (ej. Header primary CTA).
    focusRing?: boolean;
    // Peso de fuente. Los CTAs primarios grandes usan `font-medium tracking-wide`
    // (heredado del hero), los compactos usan `font-semibold`. Opt-in.
    weight?: 'medium' | 'semibold';
    fullWidth?: boolean;
    className?: string;
    children: ReactNode;
}

interface ButtonProps
    extends BaseProps,
        Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
    href?: undefined;
}

interface LinkProps extends BaseProps {
    href: string;
    // Cuando se renderiza como Link, no se aceptan props de <button>.
    onClick?: never;
    type?: never;
    disabled?: never;
}

type Props = ButtonProps | LinkProps;

function baseClasses(
    variant: ButtonVariant,
    size: ButtonSize,
    radius: 'lg' | 'xl' | 'full',
    focusRing: boolean,
    weight: 'medium' | 'semibold',
    fullWidth: boolean,
    extra?: string,
): string {
    const radiusClass =
        radius === 'lg' ? 'rounded-lg' : radius === 'xl' ? 'rounded-xl' : 'rounded-full';
    const weightClass =
        weight === 'medium' ? 'font-medium tracking-wide' : 'font-semibold';
    const focusClass = focusRing
        ? 'focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2'
        : '';
    const widthClass = fullWidth ? 'w-full' : '';
    return [
        'inline-flex items-center justify-center',
        widthClass,
        SIZE_CLASSES[size],
        radiusClass,
        weightClass,
        VARIANT_CLASSES[variant],
        'transition-colors',
        focusClass,
        extra ?? '',
    ]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(props, ref) {
    const {
        variant = 'primary',
        size = 'md',
        radius = 'xl',
        focusRing = false,
        weight = 'semibold',
        fullWidth = false,
        className,
        children,
    } = props;

    const cls = baseClasses(
        variant,
        size,
        radius,
        focusRing,
        weight,
        fullWidth,
        className,
    );

    if ('href' in props && props.href !== undefined) {
        return (
            <Link href={props.href} className={cls}>
                {children}
            </Link>
        );
    }

    const { href: _href, ...buttonProps } = props as ButtonProps;
    return (
        <button ref={ref} className={cls} {...buttonProps}>
            {children}
        </button>
    );
});

export default Button;
