import React from 'react';
import { Band } from './Shared/Band';
import ServiceCard, { ServiceResult } from './Explore/ServiceCard';

interface Props {
    services: ServiceResult[];
}

export function FeaturedServices({ services }: Props) {
    if (!services || services.length === 0) return null;

    return (
        <Band variant="white">
            <div className="mx-auto max-w-2xl lg:text-center mb-12">
                <h2 className="text-emerald-600 font-bold tracking-wide uppercase text-sm">Servicios Destacados</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-pretty">
                    Profesionales recomendados
                </p>
            </div>

            <div className="mx-auto max-w-7xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service, idx) => (
                        <ServiceCard key={idx} service={service} />
                    ))}
                </div>
            </div>
        </Band>
    );
}

export default FeaturedServices;
