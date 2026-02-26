import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StepCardProps {
    paso: number;
    titulo: string;
    descripcion: string;
    Icon: LucideIcon;
    variante?: 'light' | 'dark';
}

export default function StepCard({ paso, titulo, descripcion, Icon, variante = 'light' }: StepCardProps) {
    const isDark = variante === 'dark';

    return (
        <div className={`flex flex-col items-center text-center p-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative ${isDark ? 'bg-white/10' : 'bg-emerald-100'}`}>
                <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-4 ${isDark ? 'bg-emerald-600 border-slate-900 text-white' : 'bg-emerald-700 border-slate-50 text-white'}`}>
                    {paso}
                </div>
                <Icon className={`w-8 h-8 ${isDark ? 'text-white' : 'text-emerald-700'}`} />
            </div>
            <h3 className="text-xl font-bold mb-3">{titulo}</h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                {descripcion}
            </p>
        </div>
    );
}
