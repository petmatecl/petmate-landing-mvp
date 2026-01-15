import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string; // Layout only!
    hoverable?: boolean;
    padding?: 'none' | 's' | 'm' | 'l';
    variant?: 'surface' | 'elevated';
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
    variant = "surface",
    onClick
}: CardProps) => {

    const paddingClass = {
        none: "",
        s: "p-4",
        m: "p-6",
        l: "p-8",
    }[padding];

    const variantClasses = {
        surface: "border border-slate-200 shadow-sm", // Standard
        elevated: "border border-slate-200 shadow-xl shadow-slate-200/50 ring-1 ring-black/5 rounded-3xl", // Premium Login Look
    }[variant] || "border border-slate-200 shadow-sm"; // Fallback

    return (
        <div
            onClick={onClick}
            className={`
        surface-card relative overflow-hidden text-slate-900
        bg-white rounded-2xl
        ${variantClasses}
        ${paddingClass}
        ${hoverable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all duration-300' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
};
