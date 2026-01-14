import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string; // Layout only!
    hoverable?: boolean;
    padding?: 'none' | 's' | 'm' | 'l';
    onClick?: () => void;
    as?: any; // Allow polymorphic "as" (e.g. Link, div) - for advanced usage, usually just div
}

/**
 * SOURCE OF TRUTH: High Contrast Surface Card
 * Enforces:
 * - Solid Border (Slate-400) via --surface-border
 * - Ring (Slate-900/8%)
 * - Shadow
 * - Clean white background
 */
export const Card = ({
    children,
    className = "",
    hoverable = false,
    padding = "m",
    onClick
}: CardProps) => {

    const paddingClass = {
        none: "",
        s: "p-4",
        m: "p-6",
        l: "p-8",
    }[padding];

    return (
        <div
            onClick={onClick}
            className={`
        surface-card relative overflow-hidden
        ${paddingClass}
        ${hoverable ? 'cursor-pointer hover:-translate-y-1 transition-transform duration-300' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
};
