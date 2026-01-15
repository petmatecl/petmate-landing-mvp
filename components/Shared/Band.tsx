import { ReactNode } from "react";

type BandVariant = "brand" | "soft" | "white" | "dark";

interface BandProps {
    children: ReactNode;
    variant?: BandVariant;
    className?: string; // For adding specific padding or margins if absolutely necessary
    id?: string;
    withDivider?: boolean;
    withFade?: boolean;
}

/**
 * FULL WIDTH BAND COMPONENT
 * Enforces the "Striped" layout design.
 * - Wraps content in a full-width background color.
 * - Centers content in a max-w-7xl container.
 * - Includes mandatory visual separators (Divider/Fade) for high-contrast visibility.
 */
export const Band = ({
    children,
    variant = "white",
    className = "",
    id,
    withDivider = true, // Default to true per v6 requirement
    withFade = true     // Default to true per v6 requirement
}: BandProps) => {
    const variantClasses = {
        brand: "band-brand",
        soft: "band-soft",
        white: "band-white",
        dark: "band-dark",
    }[variant];

    // Default padding is py-16 or py-20, can be overridden by className if needed
    const paddingClass = className.includes("py-") ? "" : "py-16 lg:py-24";

    return (
        <section id={id} className={`w-full relative ${variantClasses} ${paddingClass} ${className}`}>
            <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                {children}
            </div>

            {/* Visual Separators (v6) */}
            {withFade && <div className="band-fade" aria-hidden="true" />}
            {withDivider && <div className="band-separator" aria-hidden="true" />}
        </section>
    );
};
