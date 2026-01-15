import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`}
            {...props}
        />
    );
}

export function TripCardSkeleton() {
    return (
        <div className="rounded-3xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-xl" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>
        </div>
    );
}

export function ItemsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
    );
}
