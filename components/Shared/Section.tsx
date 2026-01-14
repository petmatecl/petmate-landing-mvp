import React, { ReactNode } from 'react';

interface SectionContainerProps {
    children: ReactNode;
    className?: string; // Additional layout classes
    id?: string;
    /**
     * @deprecated Variants are removed in favor of strict SectionContainer styling.
     */
    variant?: any;
    /**
     * @deprecated Container prop is now implicit or handled by layout. 
     * SectionContainer IS the container.
     */
    container?: boolean;
}

/**
 * SOURCE OF TRUTH: Section Container (Visual Block)
 * Wraps main page sections in a consistent "Surface" block.
 * - Style: Soft Modern SaaS
 * - Bg: White
 * - Border: None (Ring 1px 5%)
 * - Radius: 24px
 * - Shadow: Soft
 * 
 * @param band - Optional visual band (full width background) around the container
 */
export const SectionContainer = ({
    children,
    className = "",
    id,
    band = "none",
    // Deprecated props consumed
    variant,
    container
}: SectionContainerProps & { band?: "none" | "slate" | "mint" }) => {

    // Determine Band Class
    const bandClass = {
        none: "band-none",
        slate: "band-slate py-12", // Add vertical padding to bands to let the box "float"
        mint: "band-mint py-12"
    }[band];

    return (
        <div className={`w-full ${bandClass}`}>
            <section
                id={id}
                className={`section-container mx-auto max-w-7xl ${className} ${band !== 'none' ? '!mb-0' : ''}`}
            >
                {children}
            </section>
        </div>
    );
};

// Backwards compatibility alias
export const Section = SectionContainer;
