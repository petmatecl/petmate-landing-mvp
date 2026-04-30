import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import ServiceDetailView from '../components/Servicio/ServiceDetailView';
import { ServiceResult } from '../components/Explore/ServiceCard';
import { exampleService, exampleReviews } from '../lib/exampleService';

interface EjemploPageProps {
    service: any;
    reviews: any[];
    otrosServicios: ServiceResult[];
}

export default function EjemploPage({ service, reviews, otrosServicios }: EjemploPageProps) {
    return (
        <>
            <Head>
                <title>Vista de ejemplo | Pawnecta</title>
                <meta name="description" content="Así se ve un perfil completo en Pawnecta. Mirá todo lo que podés ofrecer en tu servicio para mascotas." />
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            {/* Banner ejemplo — sticky superior */}
            <div className="sticky top-0 z-30 bg-emerald-700 text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm sm:text-base font-medium text-center sm:text-left">
                        🐾 Esto es un ejemplo de cómo se verá tu servicio en Pawnecta. ¿Te gusta lo que ves?
                    </p>
                    <Link
                        href="/register?rol=proveedor"
                        className="shrink-0 inline-flex items-center bg-white text-emerald-700 font-bold text-sm px-5 py-2 rounded-xl hover:bg-emerald-50 transition-colors whitespace-nowrap"
                    >
                        Publicá el tuyo gratis →
                    </Link>
                </div>
            </div>

            <ServiceDetailView
                service={service}
                reviews={reviews}
                otrosServicios={otrosServicios}
                isExample={true}
            />
        </>
    );
}

export const getStaticProps: GetStaticProps<EjemploPageProps> = async () => {
    return {
        props: {
            service: exampleService,
            reviews: exampleReviews,
            otrosServicios: [],
        },
    };
};
