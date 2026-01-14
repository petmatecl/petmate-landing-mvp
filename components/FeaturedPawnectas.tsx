import Link from "next/link";
import CaregiverCard from "./Explore/CaregiverCard";
import { SectionContainer } from "./Shared/Section";

interface FeaturedPawnectasProps {
    caregivers: any[];
}

// Datos de demostración visual
const MOCK_CAREGIVERS = [
    {
        id: "mock-1",
        nombre: "Valentina",
        apellido_p: "Mroz",
        comuna: "Providencia",
        rating: 5.0,
        reviews: 24,
        price: 18000,
        verified: true,
        imageUrl: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        id: "mock-2",
        nombre: "Matías",
        apellido_p: "Lagos",
        comuna: "Las Condes",
        rating: 4.9,
        reviews: 15,
        price: 15000,
        verified: true,
        imageUrl: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        id: "mock-3",
        nombre: "Fernanda",
        apellido_p: "Soto",
        comuna: "Ñuñoa",
        rating: 5.0,
        reviews: 32,
        price: 20000,
        verified: true,
        imageUrl: "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=800"
    }
];

export function FeaturedPawnectas({ caregivers }: FeaturedPawnectasProps) {
    // FORZAR MOCK DATA VISUAL (Solicitud del usuario: "hasta que contemos con cuidadores reales")
    // Ignoramos la prop 'caregivers' por ahora para asegurar que se vean las fotos bonitas.
    const displayCaregivers = MOCK_CAREGIVERS;

    return (
        <SectionContainer band="none">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">

                {/* Columna Izquierda: Texto (más compacta) */}
                <div className="lg:col-span-3 flex flex-col gap-6 mb-12 lg:mb-0">
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl text-pretty">
                            Cuidadores destacados <span className="text-emerald-600">en tu sector</span>
                        </h2>
                        <p className="mt-4 text-base text-slate-600 leading-relaxed">
                            Personas reales, verificadas y apasionadas por los animales. Revisa sus perfiles y encuentra el match perfecto cerca de ti. ❤️
                        </p>

                        <div className="mt-6">
                            <Link
                                href="/explorar"
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-base font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
                            >
                                Ver todos los cuidadores
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Grilla de 3 Tarjetas */}
                <div className="lg:col-span-9">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayCaregivers.map((mate) => (
                            <CaregiverCard
                                key={mate.id}
                                id={mate.id.toString()}
                                nombre={mate.nombre}
                                apellido={mate.apellido_p ? `${mate.apellido_p.charAt(0)}.` : ""}
                                comuna={mate.comuna || "Santiago"}
                                rating={mate.rating || 5.0}
                                reviews={mate.reviews || 0}
                                price={mate.price || 15000}
                                verified={mate.verified || false}
                                imageUrl={mate.imageUrl}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </SectionContainer>
    );
}
