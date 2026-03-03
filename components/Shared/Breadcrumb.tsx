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
        <nav className="flex items-center flex-wrap gap-1 text-sm text-slate-500 mb-8">
            {items.map((item, idx) => {
                const isLast = idx === items.length - 1;
                return (
                    <span key={idx} className="flex items-center gap-1">
                        {idx > 0 && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                        {isLast || !item.href ? (
                            <span className={isLast ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                                {item.label}
                            </span>
                        ) : (
                            <Link href={item.href} className="hover:text-emerald-700 hover:underline transition-colors">
                                {item.label}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
