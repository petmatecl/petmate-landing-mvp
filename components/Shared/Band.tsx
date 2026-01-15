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
    withDivider = false, // Default to false (Clean Look v11)
    withFade = false     // Default to false (Clean Look v11) - Optional per usage
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

            {/* Visual Separators (v11: Clean Look - Divider line removed) */}
            {withFade && <div className="band-fade" aria-hidden="true" />}
        </section>
    );
};
