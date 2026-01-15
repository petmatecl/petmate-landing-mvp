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
        surface: "surface-card border border-slate-200 shadow-sm", // Standard (keeps surface-card class if needed for other overrides, but ideally surface-card should be its own thing)
        // actually, surface-card in globals has border: 2px. We want to avoid that for elevated.
        // So for elevated, we DO NOT include "surface-card".
        elevated: "bg-white border border-slate-200 shadow-xl shadow-slate-200/50 ring-1 ring-black/5 rounded-3xl",
    }[variant] || "surface-card border border-slate-200 shadow-sm";

    // "surface-card" class in globals.css forces border: 2px. 
    // We only want it if the variant implies it (or if it's the default legacy behavior).
    // The variantClasses logic above handles the separation, assuming we remove "surface-card" from the base string below.

    return (
        <div
            onClick={onClick}
            className={`
        relative overflow-hidden text-slate-900
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
