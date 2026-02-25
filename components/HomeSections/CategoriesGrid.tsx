import Link from 'next/link';
import { Band } from '../Shared/Band';

export interface CategoriaServicio {
    id: string;
    nombre: string;
    slug: string;
    icono: string;
    descripcion: string;
    orden: number;
    activa: boolean;
}

interface Props {
    categorias: CategoriaServicio[];
}

export function CategoriesGrid({ categorias }: Props) {
    if (!categorias || categorias.length === 0) return null;

    return (
        <Band variant="white">
            <div className="mx-auto max-w-2xl lg:text-center mb-12">
                <h2 className="text-emerald-600 font-bold tracking-wide uppercase text-sm">Todo en un solo lugar</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-pretty">
                    Servicios pensados para su bienestar
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {categorias.map((cat) => (
                    <Link
                        key={cat.id}
                        href={`/explorar?categoria=${cat.slug}`}
                        className="group flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-emerald-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center"
                    >
                        <span className="text-4xl sm:text-5xl mb-4 grayscale opacity-80 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-110">
                            {cat.icono}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">
                            {cat.nombre}
                        </h3>
                        {cat.descripcion && (
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-2 line-clamp-2 px-1">
                                {cat.descripcion}
                            </p>
                        )}
                    </Link>
                ))}
            </div>
        </Band>
    );
}

export default CategoriesGrid;
