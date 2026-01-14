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
 */
export const SectionContainer = ({
    children,
    className = "",
    id,
    // Deprecated props consumed to prevent spreading
    variant,
    container
}: SectionContainerProps) => {
    return (
        <section
            id={id}
            className={`section-container mx-auto max-w-7xl ${className}`}
        >
            {children}
        </section>
    );
};

// Backwards compatibility alias
export const Section = SectionContainer;
