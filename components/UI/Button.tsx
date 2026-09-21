// components/UI/Button.tsx
// ---------------------------------------------------------------------------
// Botón canónico compartido — sprint prelaunch D-3 BUTTON-CANON (2026-09-15),
// expandido en sprint J-2 prep (2026-09-21) para absorber los tamaños que
// existen de verdad en el proyecto sin dilución del concepto canónico.
//
// ═══════════════════════════════════════════════════════════════════════════
// FILOSOFÍA — CANÓNICO OBJETIVO vs LEGACY, A UNIFICAR EN SPRINT VISUAL
// ═══════════════════════════════════════════════════════════════════════════
//
// El componente expone **6 tamaños y 4 variantes** (cap PO 2026-09-21 J-2).
// Los tamaños se dividen en 2 grupos según objetivo:
//
// **CANÓNICOS OBJETIVO** (4) — la escala futura del design system:
//   - `sm`: chips, filter buttons, iconos con label chico. `px-3 py-1.5 text-xs`.
//   - `md`: densos, tables + panels. `px-4 py-2 text-sm`.
//   - `lg`: nav header CTAs. `px-6 py-2.5 text-sm`.
//   - `xl`: hero CTAs / mobile large. `px-4 py-4 text-base`.
//
// **LEGACY, A UNIFICAR EN SPRINT VISUAL** (2) — reflejan botones que ya
// existen en el codebase con clases ad-hoc que no matchean la escala
// canónica. Se agregan aquí para que la migración BUTTON-CANON incremental
// (J-2 batch N+1) pueda mover botones al componente **sin cambio visual**
// mientras el sprint visual dedicado (post-J) decide la unificación:
//   - `modal-cta`: modales + register + formularios full-width. `px-4 py-3 text-sm`.
//     Callers legacy: LoginRequiredModal L61+L67, register.tsx L578+L680.
//   - `cta-hero`: CTAs sección hero de landing + gap con icono. `px-6 py-3 text-base`.
//     Callers legacy: [categoria]/[comuna].tsx L88, styleguide L393+L515.
//
// **Regla del sprint visual (candidato post-J)**: mirar cada componente y
// decidir si `modal-cta` unifica hacia `xl` (más aire), `md` (más denso),
// o queda como shape propio. Igual `cta-hero` vs `lg`. Esa decisión cambia
// píxeles y va con revisión visual manual, no con el umbral.
//
// ═══════════════════════════════════════════════════════════════════════════
// HISTÓRICO (contexto que originó el componente)
// ═══════════════════════════════════════════════════════════════════════════
//
// Sprint popup-fix (2026-09-04) descubrió que el CSS agresivo de
// `.leaflet-popup-content a` sobrescribía `text-white` en el botón del popup
// del mapa. Con un componente canónico, la defensa (por ejemplo `!text-white`
// en `styles/globals.css`) vive una sola vez y protege contra el próximo
// contenedor con CSS agresivo — no cada botón nuevo.
//
// Sprint D-3 (2026-09-15) aterrizó las 4 variants (primary/secondary/ghost/
// danger) + 4 sizes canónicos + refactor de 2 CTAs de CookieBanner como seed.
// Los ~25 botones restantes con variaciones legacy quedaron como deuda light
// "migrar cuando se toque el archivo".
//
// Sprint bloque-g G-3 (2026-09-15) agregó infra de regresión visual
// (playwright toHaveScreenshot + baselines Linux CI). La puerta visual se
// activó como criterio de merge de BUTTON-CANON incremental.
//
// Sprint J-1 (2026-09-21) reveló drift dashboard en 6/14 baselines →
// baselines efectivas = 8 páginas públicas (home, explorar, login,
// ficha-servicio × 2 vp). Los 6 baselines auth queda pendiente J-4.
//
// Sprint J-2 prep (este) — expansión a 6 sizes + doc canonical/legacy para
// habilitar migración incremental sin diff visual.
// ---------------------------------------------------------------------------
import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
/**
 * Tamaños del botón canónico. Ver bloque header de este archivo para la
 * distinción canónico-objetivo (sm/md/lg/xl) vs legacy (modal-cta, cta-hero).
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'modal-cta' | 'cta-hero';

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
    // Canónicos objetivo (4).
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm',
    xl: 'px-4 py-4 text-base',
    // Legacy, a unificar en sprint visual (2). Ver header del archivo.
    'modal-cta': 'px-4 py-3 text-sm',
    'cta-hero': 'px-6 py-3 text-base',
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
