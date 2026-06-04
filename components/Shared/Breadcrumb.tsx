import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-sm text-slate-500 mb-8 min-w-0">
            {items.map((item, idx) => {
                const isLast = idx === items.length - 1;
                return (
                    <span key={idx} className="flex items-center gap-1 min-w-0">
                        {idx > 0 && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                        {isLast || !item.href ? (
                            // Ultimo nivel: en mobile (titulos largos como
                            // "Peluqueria canina y felina con corte sanitario...")
                            // hace wrap feo o se sale del viewport. Cap a 60vw +
                            // truncate solo en mobile; en sm+ se muestra full.
                            <span
                                aria-current={isLast ? 'page' : undefined}
                                title={isLast ? item.label : undefined}
                                className={`${isLast ? 'text-slate-900 font-medium' : 'text-slate-500'} ${isLast ? 'truncate max-w-[60vw] sm:max-w-none' : ''}`}
                            >
                                {item.label}
                            </span>
                        ) : (
                            <Link href={item.href} className="hover:text-emerald-700 hover:underline transition-colors whitespace-nowrap">
                                {item.label}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
