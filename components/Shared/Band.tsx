import { ReactNode } from "react";

type BandVariant = "brand" | "soft" | "white" | "dark";

interface BandProps {
    children: ReactNode;
    variant?: BandVariant;
    className?: string; // For adding specific padding or margins if absolutely necessary
    id?: string;
}

/**
 * FULL WIDTH BAND COMPONENT
 * Enforces the "Striped" layout design.
 * - Wraps content in a full-width background color.
 * - Centers content in a max-w-7xl container.
 */
export const Band = ({ children, variant = "white", className = "", id }: BandProps) => {
    const variantClasses = {
        brand: "band-brand",
        soft: "band-soft",
        white: "band-white",
        dark: "band-dark",
    }[variant];

    // Default padding is py-16 or py-20, can be overridden by className if needed
    const paddingClass = className.includes("py-") ? "" : "py-16 lg:py-24";

    return (
        <section id={id} className={`w-full ${variantClasses} ${paddingClass} ${className}`}>
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {children}
            </div>
        </section>
    );
};
