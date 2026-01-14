import React, { ReactNode } from 'react';

interface SectionProps {
    children: ReactNode;
    variant?: 'default' | 'white' | 'dark' | 'alt';
    className?: string; // Additional layout classes
    container?: boolean; // Whether to wrap in max-w-7xl
}

/**
 * SOURCE OF TRUTH: Page Sections
 * Enforces:
 * - Correct background alternation
 * - Vertical spacing
 * - Container alignment
 */
export const Section = ({
    children,
    variant = 'default',
    className = "",
    container = true
}: SectionProps) => {

    const bgClass = {
        default: "bg-slate-100",     // --page-bg (was 50)
        white: "bg-white",          // --section-alt-bg
        alt: "bg-slate-200",        // Increased contrast
        dark: "bg-slate-900",
    }[variant];

    // Slate-900 sections need text-white usually, handled by children or global context
    const textClass = variant === 'dark' ? 'text-white' : 'text-slate-900';

    return (
        <section className={`${bgClass} ${textClass} py-24 sm:py-32 relative overflow-hidden ${className}`}>
            {container ? (
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                    {children}
                </div>
            ) : (
                children
            )}
        </section>
    );
};
