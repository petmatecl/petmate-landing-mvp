import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface OwnerCTA {
    text: string;
    href: string;
}

interface EmptyFieldStateProps {
    label: string;
    isOwner: boolean;
    ownerCTA?: OwnerCTA;
    tutorMessage?: string;
    variant?: 'block' | 'inline';
}

export default function EmptyFieldState({
    label,
    isOwner,
    ownerCTA,
    tutorMessage,
    variant = 'block',
}: EmptyFieldStateProps) {
    const tutorText = tutorMessage ?? `Sin ${label} agregada`;

    if (variant === 'inline') {
        if (isOwner && ownerCTA) {
            return (
                <span className="text-sm text-slate-400 italic">
                    Sin {label} ·{' '}
                    <Link href={ownerCTA.href} className="text-emerald-700 hover:text-emerald-800 not-italic font-medium underline underline-offset-2">
                        {ownerCTA.text} →
                    </Link>
                </span>
            );
        }
        return <span className="text-sm text-slate-400 italic">{tutorText}</span>;
    }

    return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            {isOwner && ownerCTA ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm text-slate-600">Falta agregar {label}</span>
                    <Link
                        href={ownerCTA.href}
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                    >
                        {ownerCTA.text}
                        <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                </div>
            ) : (
                <span className="text-sm text-slate-500 italic">{tutorText}</span>
            )}
        </div>
    );
}
