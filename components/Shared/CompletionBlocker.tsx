import React from 'react';
import Link from 'next/link';
import { Lock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface CompletionBlockerProps {
    title?: string;
    message?: string;
    missingFields?: string[];
    redirectUrl: string;
    redirectText: string;
    isApproved?: boolean; // Specific for sitters
}

export default function CompletionBlocker({
    title = "Acceso Restringido",
    message = "Para acceder a esta sección, necesitas completar tu perfil.",
    missingFields = [],
    redirectUrl,
    redirectText,
    isApproved = true
}: CompletionBlockerProps) {

    // If not approved, show pending message
    if (!isApproved) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white border border-yellow-200 rounded-2xl shadow-sm text-center max-w-2xl mx-auto mt-10">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Perfil en Verificación ⏳</h2>
                <p className="text-slate-600 mb-6">
                    Tu perfil está siendo revisado por nuestro equipo. Una vez aprobado, podrás acceder a esta sección y recibir solicitudes.
                </p>
                <Link href={redirectUrl} className="btn-secondary flex items-center gap-2">
                    Volver al Perfil <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-300 rounded-2xl shadow-sm text-center max-w-2xl mx-auto mt-10">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
            <p className="text-slate-600 mb-6">{message}</p>

            {missingFields.length > 0 && (
                <div className="w-full bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-left">
                    <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Te falta completar:
                    </h3>
                    <ul className="space-y-2">
                        {missingFields.map((field, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-red-700">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {field}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <Link href={redirectUrl} className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
                {redirectText} <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
        </div>
    );
}
