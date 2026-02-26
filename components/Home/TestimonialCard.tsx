import React from 'react';

interface TestimonialCardProps {
    nombre: string;
    ciudad: string;
    rol?: string;
    mascota?: string;
    texto: string;
}

export default function TestimonialCard({ nombre, ciudad, rol, mascota, texto }: TestimonialCardProps) {
    const initials = nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col h-full hover:shadow-md hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-700 shrink-0">
                    {initials}
                </div>
                <div>
                    <h4 className="font-bold text-slate-900">{nombre}</h4>
                    <p className="text-xs text-slate-500">{ciudad}</p>
                    {(rol || mascota) && (
                        <p className="text-xs font-bold text-emerald-700 mt-0.5">
                            {rol || mascota}
                        </p>
                    )}
                </div>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed italic flex-1">
                &quot;{texto}&quot;
            </p>
        </div>
    );
}
