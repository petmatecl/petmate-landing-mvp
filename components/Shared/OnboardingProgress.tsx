import React from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export type OnboardingStep = {
    label: string;
    completed: boolean;
    href?: string; // Link to fix the step
    actionLabel?: string;
};

type Props = {
    steps: OnboardingStep[];
    title?: string;
    role: 'cliente' | 'sitter';
};

export default function OnboardingProgress({ steps, title = "Completa tu perfil", role }: Props) {
    const total = steps.length;
    const completedCount = steps.filter(s => s.completed).length;
    const progress = Math.round((completedCount / total) * 100);

    if (progress === 100) return null; // Hide if complete

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm overflow-hidden relative">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

            <div className="flex justify-between items-end mb-3 relative z-10">
                <div>
                    <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {role === 'sitter'
                            ? "Mejora tu visibilidad completando estos pasos."
                            : "Completa tu información para reservar más rápido."}
                    </p>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{progress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 mb-5 overflow-hidden">
                <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                </div>
            </div>

            {/* Steps List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {steps.map((step, idx) => (
                    <div
                        key={idx}
                        className={`
                            flex items-center justify-between p-3 rounded-xl border transition-all
                            ${step.completed
                                ? 'bg-emerald-50/50 border-emerald-100 text-slate-700'
                                : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-emerald-200'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            {step.completed ? (
                                <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                            ) : (
                                <Circle className="text-slate-300 shrink-0" size={18} />
                            )}
                            <span className={`text-sm font-medium ${step.completed ? 'opacity-80' : ''}`}>
                                {step.label}
                            </span>
                        </div>

                        {!step.completed && step.href && (
                            <Link href={step.href} className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline">
                                {step.actionLabel || "Completar"} <ChevronRight size={12} />
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
